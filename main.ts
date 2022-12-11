const token = '';
const server = 'https://testnet-api.algonode.cloud';
const port = 443;
import * as algosdk from 'algosdk';
const client = new algosdk.Algodv2(token, server, port);
import fs from 'fs';

(async () => {
  console.log(await client.status().do());
  //const account = algosdk.mnemonicToSecretKey("Your mnemonic");
  //if there is no account.json file, create one with 2 accounts
  let addresses: string[] = [];
  let accounts: algosdk.Account[] | { addr: string, sk: Object }[] = [];
  if (!fs.existsSync('accounts.json')) {
    const testAccount = algosdk.generateAccount();
    console.log(testAccount);
    const testAccount2 = algosdk.generateAccount();
    //store the accounts in a json file
    const accountsToSave = [testAccount, testAccount2];

    fs.writeFile('accounts.json', JSON.stringify(accountsToSave), function (err: any) {
      if (err) throw err;
      console.log('Saved!');
    });
    addresses = [testAccount.addr, testAccount2.addr];
    accounts = [testAccount, testAccount2];
  } else {
    const accountsRead: { addr: string, sk: Object }[] = JSON.parse(fs.readFileSync('accounts.json', 'utf8'));
    addresses = [accountsRead[0].addr, accountsRead[1].addr];
    //update the accounts array with valid accounts from accountsRead
    //convert the secret keys to Uint8Array
    accountsRead[0].sk = Uint8Array.from(Object.values(accountsRead[0].sk));
    accountsRead[1].sk = Uint8Array.from(Object.values(accountsRead[1].sk));
    accounts = accountsRead;
  }
  console.log(addresses, accounts);
  //addresses is an array of addresses, send the same amount to each address of FrysCrypto (FRY) which has a contract number: 924268058
  //the amount is 1 Algo
  const amount = 1000000;
  const enc = new TextEncoder();
  const note = enc.encode("FrysCrypto reward");
  const params = await client.getTransactionParams().do();
  const txn = algosdk.makePaymentTxnWithSuggestedParams(
    addresses[0],
    addresses[1],
    amount,
    undefined,
    note,
    params,
  );
  //convert the account sk object to Uint8Array
  //@ts-ignore
  const signedTxn = txn.signTxn(accounts[0].sk);
  const tx = (await client.sendRawTransaction(signedTxn).do());
  console.log("Transaction : " + tx.txId);
  console.log(tx)

})().catch((e) => {
  console.log(e);
});