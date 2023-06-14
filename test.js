"use strict";
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
const config_json_1 = __importDefault(require("./config.json"));
const axios_1 = __importDefault(require("axios"));
const capKey = "REDACTED_ROTATE_ME";
const FRYCapID = 24874;
const main = () => __awaiter(void 0, void 0, void 0, function* () {
    const currentFRYPrice = yield fetchCryptoPrice();
    let FRYamount = config_json_1.default.amount_in_FRY;
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
    console.log(FRYamount);
});
main();
function fetchCryptoPrice() {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const response = yield axios_1.default.get('https://pro-api.coinmarketcap.com/v2/cryptocurrency/quotes/latest', {
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
        }
        catch (error) {
            console.error(error);
        }
    });
}
