"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const token = 'REDACTED_ROTATE_ME';
const server = 'https://mainnet-algorand.api.purestake.io/ps2';
const indexServer = 'https://mainnet-algorand.api.purestake.io/idx2';
const port = 443;
const algosdk = __importStar(require("algosdk"));
const tokenToSend = {
    'X-API-Key': token
};
const client = new algosdk.Algodv2(tokenToSend, server, port);
const indexer = new algosdk.Indexer(tokenToSend, indexServer, port);
const config_json_1 = __importDefault(require("./config.json"));
//open the xlsx file and read the data
const XLSX = __importStar(require("xlsx"));
const main = () => __awaiter(void 0, void 0, void 0, function* () {
    const workbook = XLSX.readFile(config_json_1.default.excel_file_name);
    const sheet_name_list = workbook.SheetNames;
    const xlData = XLSX.utils.sheet_to_json(workbook.Sheets[sheet_name_list[0]]);
    //get the addresses from the xlsx file
    //get the name of the highest row of the 3rd column
    const addresses = [];
    const addressesCount = new Map();
    xlData.forEach((row) => {
        addresses.push(row[config_json_1.default.addresses_column_name]);
        if (addressesCount.has(row[config_json_1.default.addresses_column_name])) {
            const currentCount = addressesCount.get(row[config_json_1.default.addresses_column_name]);
            addressesCount.set(row[config_json_1.default.addresses_column_name], currentCount + 1);
        }
        else {
            addressesCount.set(row[config_json_1.default.addresses_column_name], 1);
        }
    });
    console.log(yield client.status().do());
    const account = algosdk.mnemonicToSecretKey(config_json_1.default.main_account_mnemonic);
    //send the same amount to each address of FrysCrypto (FRY) which has a contract number: 924268058
    const FRYamount = config_json_1.default.amount_in_FRY;
    const enc = new TextEncoder();
    const note = enc.encode(config_json_1.default.note_to_send);
    const params = yield client.getTransactionParams().do();
    for (const address of addresses) {
        try {
            const lastTransactions = yield indexer.lookupAccountTransactions(address).limit(100).do();
            //get all the transactions of the address that were done in the last 25 hours
            const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
            const lastTransactionsInLast25Hours = lastTransactions.transactions.filter((transaction) => {
                const transactionDate = new Date(transaction['round-time'] * 1000);
                const isTheSender = transaction.sender === address;
                const isAmountZero = !transaction['asset-transfer-transaction'] || transaction['asset-transfer-transaction'].amount === 0;
                const isFRY = transaction['asset-transfer-transaction'] && transaction['asset-transfer-transaction']['asset-id'] === config_json_1.default.asset_index;
                return (transactionDate > oneDayAgo && isTheSender && isAmountZero && isFRY);
            });
            //if there is at least 24 transactions in the last 25 hours, with 0 amount, then send the FRY
            const count = addressesCount.get(address);
            const transactionsNeeded = 25 * count;
            let mult = 1;
            if (lastTransactionsInLast25Hours.length >= transactionsNeeded) {
                mult = 1;
            }
            else {
                mult = lastTransactionsInLast25Hours.length / transactionsNeeded;
            }
            //calculate the amount to send and round it to two numbers after the dot
            const amountToSend = Math.floor(Math.round(FRYamount * mult * 100) / 100);
            console.log(`amount for ${address} is ${amountToSend} -- ${lastTransactionsInLast25Hours.length} transactions in the last 25 hours}`);
            if (amountToSend > 0) {
                if (!(yield hasOptedInForAsset(address, config_json_1.default.asset_index))) {
                    console.log(`Address ${address} has not opted in for asset ${config_json_1.default.asset_index}. Sending opt-in transaction.`);
                    yield optInForAsset(account, address, config_json_1.default.asset_index);
                }
                const txn = algosdk.makeAssetTransferTxnWithSuggestedParamsFromObject({
                    from: account.addr,
                    to: address,
                    amount: amountToSend,
                    assetIndex: config_json_1.default.asset_index,
                    note: note,
                    suggestedParams: params,
                });
                //convert the account sk object to Uint8Array
                const signedTxn = txn.signTxn(account.sk);
                const tx = (yield client.sendRawTransaction(signedTxn).do());
                console.log("Transaction : " + tx.txId);
            }
            else {
                console.log('The address: ' + address + ' has no transactions in the last 25 hours');
            }
        }
        catch (e) {
            console.log(e);
            console.log('Error for address: ' + address);
            console.log('-------------------------------------');
        }
    }
});
main().catch((e) => {
    console.log(e);
});
function hasOptedInForAsset(address, assetId) {
    return __awaiter(this, void 0, void 0, function* () {
        const accountInfo = yield client.accountInformation(address).do();
        const assets = accountInfo['assets'] || [];
        return assets.some((asset) => asset['asset-id'] === assetId);
    });
}
function optInForAsset(fromAccount, toAddress, assetId) {
    return __awaiter(this, void 0, void 0, function* () {
        const params = yield client.getTransactionParams().do();
        const optInTxn = algosdk.makeAssetTransferTxnWithSuggestedParamsFromObject({
            from: fromAccount.addr,
            to: toAddress,
            amount: 0,
            assetIndex: assetId,
            suggestedParams: params,
        });
        const signedOptInTxn = optInTxn.signTxn(fromAccount.sk);
        yield client.sendRawTransaction(signedOptInTxn).do();
    });
}
