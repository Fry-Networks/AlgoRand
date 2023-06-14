import * as algosdk from 'algosdk';
import * as XLSX from 'xlsx';
import config from './config.json';
import axios from 'axios';
const capKey = "REDACTED_ROTATE_ME"
const FRYCapID = 24874;
const token = 'REDACTED_ROTATE_ME';
const server = 'https://mainnet-algorand.api.purestake.io/ps2';
const tokenToSend = {
    'X-API-Key': token
}
const port = 443;
const client = new algosdk.Algodv2(tokenToSend, server, port);
const workbook = XLSX.readFile(config.excel_file_name);
const sheet_name_list = workbook.SheetNames;
const xlData = XLSX.utils.sheet_to_json(workbook.Sheets[sheet_name_list[0]]);
const addresses: string[] = [];
const addressesCount = new Map<string, number>();


xlData.forEach((row: any) => {
    const address = row[config.addresses_column_name];
    addresses.push(address);
    if (addressesCount.has(address)) {
        const currentCount = addressesCount.get(address) as number;
        addressesCount.set(address, currentCount + 1);
    }
    else {
        addressesCount.set(address, 1);
    }
});
(async () => {
    console.log(await client.status().do());
    const account = algosdk.mnemonicToSecretKey(config.main_account_mnemonic);
    //send the same amount to each address of FrysCrypto (FRY) which has a contract number: 924268058
    const currentFRYPrice = await fetchCryptoPrice();
    let FRYamount = config.amount_in_FRY;
    if (currentFRYPrice) {
        //if price is below 1 cent, double reward
        if (currentFRYPrice < 0.01) {
            FRYamount = FRYamount * 2;
        }
        //for each zero after the decimal point and after the first 2 zeros (1 cent), multiply the reward by 1.5
        const zeroCount = (currentFRYPrice.toString().split('.')[1].match(/0/g) || []).length;
        for (let i = 2; i < zeroCount; i++) {
            FRYamount = FRYamount * 1.5;
        }
    }
    const enc = new TextEncoder();
    const note = enc.encode(config.note_to_send);
    const params = await client.getTransactionParams().do();
    for (const address of addresses) {
        const count = addressesCount.get(address) as number;
        const amountToSend = +(FRYamount * count).toFixed(5)
        try {
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
        } catch (error: any) {
            console.error(`Error sending transaction to ${address}:`, error.message);
        }

    }
})().catch((e) => {
    console.log(e);
});



async function fetchCryptoPrice(): Promise<number | undefined> {
    try {
        const response = await axios.get('https://pro-api.coinmarketcap.com/v2/cryptocurrency/quotes/latest', {
            params: {
                id: FRYCapID,
                convert: 'USD'
            },
            headers: {
                'X-CMC_PRO_API_KEY': capKey
            }
        });
        const price = response.data.data[FRYCapID].quote.USD.price;
        return price;
    } catch (error) {
        console.error(error);
    }
}
