const token = '';
const server = 'https://mainnet-api.algonode.network';
const port = 443;
import * as algosdk from 'algosdk';
const client = new algosdk.Algodv2(token, server, port);
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
(async () => {
  console.log(await client.status().do());
  const account = algosdk.mnemonicToSecretKey(config.main_account_mnemonic);
  //send the same amount to each address of FrysCrypto (FRY) which has a contract number: 924268058
  const amount = config.amount_in_microAlgos;
  const enc = new TextEncoder();
  const note = enc.encode(config.note_to_send);
  const params = await client.getTransactionParams().do();
  for (const address of addresses) {
  const txn = algosdk.makeAssetTransferTxnWithSuggestedParamsFromObject({
      from: account.addr,
      to: address,
      amount: amount,
      assetIndex: config.asset_index,
      note: note,
      suggestedParams: params,
    }
  );
  //convert the account sk object to Uint8Array
  const signedTxn = txn.signTxn(account.sk);
  const tx = (await client.sendRawTransaction(signedTxn).do());
  console.log("Transaction : " + tx.txId);
  }
})().catch((e) => {
  console.log(e);
});
