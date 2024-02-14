const token = '';
const server = 'https://xna-mainnet-api.algonode.cloud/';
const indexServer = 'https://mainnet-idx.algonode.cloud/';

const port = 443;
import * as algosdk from 'algosdk';
const tokenToSend = {
    'X-API-Key': token
}

const client = new algosdk.Algodv2(tokenToSend, server, port);

const indexer = new algosdk.Indexer(tokenToSend, indexServer, port);

import config from './config.json'
//open the xlsx file and read the data
import * as XLSX from 'xlsx';
import { connect } from './db/connect';
import { Device, DeviceModel } from './db/devices-schema';
import UserModel from './db/users-schema';
import { ProductModel } from './db/products-schema';

const main = async () => {
    //await filterDuplicates(config.excel_file_name);
    await connect();
    //get the addresses from the xlsx file
    //get the name of the highest row of the 3rd column
    const addresses: string[] = [];
    const addressesCount = new Map<string, {
        devices_info: Array<{
            type: string,
            verified: boolean
        }>
    }>();

    const allDevices = await DeviceModel.find({ is_registered: true });
    const users = new Map<string, Device[]>(); //key: address, value: array of devices
    allDevices.map((device) => {
        const stringifiedId = device.user_id.toString();
        if (users.has(stringifiedId)) {
            const devicesArray = users.get(stringifiedId) as any[];
            devicesArray.push(device);
            users.set(stringifiedId, devicesArray);
        } else {
            users.set(stringifiedId, [device]);
        }
    });

    const userPromises = Array.from(users.entries()).map(async ([userId, devices]) => {
        const user = await UserModel.findById(userId);
        if (!user.address) return;
        const numberOfDevices = devices.length;
    
        // Prepare data for each device, including its type and verified status
        const deviceData = devices.map(device => ({
            type: device.miner_key.split('-')[0],
            verified: device.verified // Assuming 'verified' is a boolean property of each device
        }));
    
        if (addressesCount.has(user.address)) {
            const currentData = addressesCount.get(user.address)!;
            addressesCount.set(user.address, {
                // Spread the existing devices and add the new device data
                devices_info: [...currentData.devices_info, ...deviceData]
            });
    
        } else {
            addressesCount.set(user.address, {
                devices_info: deviceData // Set the new device data
            });
        }
        if (!addresses.includes(user.address)) {
            addresses.push(user.address);
        }
    });
    

    // This will wait for all the user promises to finish before continuing to the next row
    await Promise.all(userPromises);
    console.log(addressesCount);
    if (addresses.length === 0) {
        console.log("No addresses found");
        return;
    }
    console.log(await client.status().do());
    const account = algosdk.mnemonicToSecretKey(config.main_account_mnemonic);
    //send the same amount to each address of FrysCrypto (FRY) which has a contract number: 924268058
    const enc = new TextEncoder();
    const note = enc.encode(config.note_to_send);
    const params = await client.getTransactionParams().do();
    const products = await ProductModel.find({});
    for (const address of addresses) {
        try {
            const devices = addressesCount.get(address)?.devices_info || [];
            const count = devices.length;
            const transactionsNeeded = 24 * count;
            console.log(devices)
            const FRYamount = devices.reduce((acc, device) => {
                const associatedProduct = products.find((product) => product.key === device.type);
                const reward = (device.verified ? associatedProduct?.reward?.verified : associatedProduct?.reward?.unverified) || 0;
                return acc + reward;
            }, 0);
            const lastTransactions = await indexer.lookupAccountTransactions(address).limit(transactionsNeeded + 10).do();
            //get all the transactions of the address that were done in the last 24 hours
            const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

            const lastTransactionsInLast24Hours: Array<any> = lastTransactions.transactions.filter((transaction: Transaction) => {
                const transactionDate = new Date(transaction['round-time'] * 1000);
                const isTheSender = transaction.sender === address;
                const isAmountZero = !transaction['asset-transfer-transaction'] || transaction['asset-transfer-transaction'].amount === 0;
                const isFRY = transaction['asset-transfer-transaction'] && transaction['asset-transfer-transaction']['asset-id'] === config.asset_index;
                return (transactionDate > oneDayAgo && isTheSender && isAmountZero && isFRY)
            });

            //if there is at least 24 transactions in the last 24 hours, with 0 amount, then send the FRY

            let mult = 1;
            if (lastTransactionsInLast24Hours.length >= transactionsNeeded) {
                mult = 1;
            } else {
                mult = lastTransactionsInLast24Hours.length / transactionsNeeded;
            }

            //calculate the amount to send and round it to two numbers after the dot
            console.log(FRYamount)
            const amountToSend = Math.floor(Math.round(FRYamount * mult * 100) / 100)
            console.log(`amount for ${address} is ${amountToSend} -- ${lastTransactionsInLast24Hours.length} transactions in the last 24 hours}`)

            if (amountToSend > 0) {

                if (!(await hasOptedInForAsset(address, config.asset_index))) {
                    console.log(`Address ${address} has not opted in for asset ${config.asset_index}. Sending opt-in transaction.`);
                    await optInForAsset(account, address, config.asset_index);
                }
                const txn = algosdk.makeAssetTransferTxnWithSuggestedParamsFromObject({
                    from: account.addr,
                    to: address,
                    amount: amountToSend,
                    assetIndex: config.asset_index,
                    note: note,
                    suggestedParams: params,
                }
                );
                //convert the account sk object to Uint8Array
                const signedTxn = txn.signTxn(account.sk);
                const tx = (await client.sendRawTransaction(signedTxn).do());
                console.log("Transaction : " + tx.txId);
            } else {
                console.log('The address: ' + address + ' has no transactions in the last 24 hours');
            }
        } catch (e) {
            console.log(e);
            console.log('Error for address: ' + address);
            console.log('-------------------------------------');
        }
    }
};

main()

setInterval(main, 24 * 60 * 60 * 1000);

async function hasOptedInForAsset(address: string, assetId: number): Promise<boolean> {
    const accountInfo = await client.accountInformation(address).do();
    const assets = accountInfo['assets'] || [];
    return assets.some((asset: any) => asset['asset-id'] === assetId);
}
async function optInForAsset(fromAccount: algosdk.Account, toAddress: string, assetId: number): Promise<void> {
    const params = await client.getTransactionParams().do();
    const optInTxn = algosdk.makeAssetTransferTxnWithSuggestedParamsFromObject({
        from: fromAccount.addr,
        to: toAddress,
        amount: 0,
        assetIndex: assetId,
        suggestedParams: params,
    });
    const signedOptInTxn = optInTxn.signTxn(fromAccount.sk);
    await client.sendRawTransaction(signedOptInTxn).do();
}

interface Transaction {
    'close-rewards': number;
    'closing-amount': number;
    'asset-transfer-transaction': {
        'amount': number;
        'asset-id': number;
    }
    'confirmed-round': number;
    fee: number;
    'first-valid': number;
    'genesis-hash': string;
    'genesis-id': string;
    id: string;
    'intra-round-offset': number;
    'last-valid': number;
    note: string;
    'payment-transaction': Object;
    'receiver-rewards': number;
    'round-time': number;
    sender: string;
    'sender-rewards': number;
    signature: Object;
    'tx-type': string;
}
