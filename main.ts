const token = '';
const server = 'https://mainnet-api.algonode.network';
const indexServer = 'https://algoindexer.mainnet.algoexplorerapi.io/';
const port = 443;
import * as algosdk from 'algosdk';
const client = new algosdk.Algodv2(token, server, port);
const indexer = new algosdk.Indexer(token, indexServer, port);
import config from './config.json';
//open the xlsx file and read the data
import * as XLSX from 'xlsx';
const workbook = XLSX.readFile(config.excel_file_name);
const sheet_name_list = workbook.SheetNames;
const xlData = XLSX.utils.sheet_to_json(workbook.Sheets[sheet_name_list[0]]);
//get the addresses from the xlsx file
//get the name of the highest row of the 3rd column
const addresses: string[] = [];
xlData.forEach((row: any) => {
  addresses.push(row[config.addresses_column_name]);
});

interface Transaction {
  'close-rewards': number;
  'closing-amount': number;
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


(async () => {
  console.log(await client.status().do());
  const account = algosdk.mnemonicToSecretKey(config.main_account_mnemonic);
  //send the same amount to each address of FrysCrypto (FRY) which has a contract number: 924268058
  const FRYamount = config.amount_in_FRY;
  const enc = new TextEncoder();
  const note = enc.encode(config.note_to_send);
  const params = await client.getTransactionParams().do();
  for (const address of addresses) {
    const lastTransactions = await indexer.lookupAccountTransactions(address).limit(100).do();
    //get all the transactions of the address that were done in the last 25 hours
    const lastTransactionsInLast25Hours = lastTransactions.transactions.filter((transaction: Transaction) => {
      const transactionDate = new Date(transaction['round-time'] * 1000);
      const currentDate = new Date();
      const diff = currentDate.getTime() - transactionDate.getTime();
      const diffHours = diff / 1000 / 60 / 60;
      return diffHours < 25;
    });
    //if there is at least 24 transactions in the last 25 hours, with 0 amount, then send the FRY
    if (lastTransactionsInLast25Hours.length >= 24) {


      const txn = algosdk.makeAssetTransferTxnWithSuggestedParamsFromObject({
        from: account.addr,
        to: address,
        amount: FRYamount,
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
      console.log('The address: ' + address + ' has less than 24 transactions in the last 25 hours');
    }
  }
})().catch((e) => {
  console.log(e);
});
