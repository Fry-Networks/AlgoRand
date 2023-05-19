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
const tokenToSend = {
    'X-API-Key': token
};
const port = 443;
const algosdk = __importStar(require("algosdk"));
const client = new algosdk.Algodv2(tokenToSend, server, port);
const config_json_1 = __importDefault(require("./config.json"));
//open the xlsx file and read the data
const XLSX = __importStar(require("xlsx"));
const workbook = XLSX.readFile(config_json_1.default.excel_file_name);
const sheet_name_list = workbook.SheetNames;
const xlData = XLSX.utils.sheet_to_json(workbook.Sheets[sheet_name_list[0]]);
//get the addresses from the xlsx file
//get the name of the highest row of the 3rd column
const addresses = [];
xlData.forEach((row) => {
    addresses.push(row[config_json_1.default.addresses_column_name]);
});
(() => __awaiter(void 0, void 0, void 0, function* () {
    console.log(yield client.status().do());
    const account = algosdk.mnemonicToSecretKey(config_json_1.default.main_account_mnemonic);
    //send the same amount to each address of FrysCrypto (FRY) which has a contract number: 924268058
    const FRYamount = config_json_1.default.amount_in_FRY;
    const enc = new TextEncoder();
    const note = enc.encode(config_json_1.default.note_to_send);
    const params = yield client.getTransactionParams().do();
    for (const address of addresses) {
        try {
            const txn = algosdk.makeAssetTransferTxnWithSuggestedParamsFromObject({
                from: account.addr,
                to: address,
                amount: FRYamount,
                assetIndex: config_json_1.default.asset_index,
                note: note,
                suggestedParams: params,
            });
            //convert the account sk object to Uint8Array
            const signedTxn = txn.signTxn(account.sk);
            const tx = (yield client.sendRawTransaction(signedTxn).do());
            console.log("Transaction : " + tx.txId);
        }
        catch (error) {
            console.error(`Error sending transaction to ${address}:`, error.message);
        }
    }
}))().catch((e) => {
    console.log(e);
});
