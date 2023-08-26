import config from './config.json';
import axios from 'axios';
const token = 'REDACTED_ROTATE_ME';
const indexServer = 'https://mainnet-algorand.api.purestake.io/idx2';

const port = 443;
import * as algosdk from 'algosdk';
const tokenToSend = {
  'X-API-Key': token
}
const capKey = "REDACTED_ROTATE_ME"
const FRYCapID = 24874;
const indexer = new algosdk.Indexer(tokenToSend, indexServer, port);
const main = async () => {
    const lastTransactions = await indexer.lookupAccountTransactions("L42H5HHLHWYY55PP3JHNGP35TT727WVXU5GVSAOHTSXBECKPVULDHNDSJY").limit(500).do();
    console.log(lastTransactions.transactions.length);

}
main();
