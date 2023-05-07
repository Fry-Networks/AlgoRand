const token = 'REDACTED_ROTATE_ME';
const server = 'https://mainnet-algorand.api.purestake.io/ps2';
const indexServer = 'https://mainnet-algorand.api.purestake.io/idx2';

const port = 443;
import * as algosdk from 'algosdk';
const tokenToSend = {
  'X-API-Key': token
}
import {
  filterMacAddresses
} from './mac'

const client = new algosdk.Algodv2(tokenToSend, server, port);

const indexer = new algosdk.Indexer(tokenToSend, indexServer, port);

import config from './config.json';
//open the xlsx file and read the data
import * as XLSX from 'xlsx';
import { filterEmailAddresses } from './email';


const main = async () => {

  await filterMacAddresses(config.excel_file_name);
  await filterEmailAddresses('updated.xlsx');
  const workbook = XLSX.readFile('updated.xlsx');
  const sheet_name_list = workbook.SheetNames;
  const xlData = XLSX.utils.sheet_to_json(workbook.Sheets[sheet_name_list[0]]);
  //get the addresses from the xlsx file
  //get the name of the highest row of the 3rd column
  const addresses: string[] = [];
  xlData.forEach((row: any) => {
    addresses.push(row[config.addresses_column_name]);
  });


  console.log(await client.status().do());
  const account = algosdk.mnemonicToSecretKey(config.main_account_mnemonic);
  //send the same amount to each address of FrysCrypto (FRY) which has a contract number: 924268058
  const FRYamount = config.amount_in_FRY;
  const enc = new TextEncoder();
  const note = enc.encode(config.note_to_send);
  const params = await client.getTransactionParams().do();
  for (const address of addresses) {
    try {
      const lastTransactions = await indexer.lookupAccountTransactions(address).limit(100).do();
      //get all the transactions of the address that were done in the last 25 hours
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const lastTransactionsInLast25Hours: Array<any> = lastTransactions.transactions.filter((transaction: Transaction) => {
        const transactionDate = new Date(transaction['round-time'] * 1000);
        const isTheSender = transaction.sender === address;
        const isAmountZero = !transaction['asset-transfer-transaction'] || transaction['asset-transfer-transaction'].amount === 0;
        const isFRY = transaction['asset-transfer-transaction'] && transaction['asset-transfer-transaction']['asset-id'] === config.asset_index;
        return (transactionDate > oneDayAgo && isTheSender && isAmountZero && isFRY)
      });
      //if there is at least 24 transactions in the last 25 hours, with 0 amount, then send the FRY
      let mult = 1;
      if (lastTransactionsInLast25Hours.length >= 24) {
        mult = 1;
      } else {
        mult = lastTransactionsInLast25Hours.length / 24;
      }

      //calculate the amount to send and round it to two numbers after the dot
      const amountToSend = Math.floor(Math.round(FRYamount * mult * 100) / 100)
      console.log(`amount for ${address} is ${amountToSend} -- ${lastTransactionsInLast25Hours.length} transactions in the last 25 hours}`)
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
        console.log('The address: ' + address + ' has no transactions in the last 25 hours');
      }
    } catch (e) {
      console.log(e);
      console.log('Error for address: ' + address);
      console.log('-------------------------------------');
    }
  }
};

main().catch((e) => {
  console.log(e);
});


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