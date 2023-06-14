import config from './config.json';
import axios from 'axios';
const capKey = "REDACTED_ROTATE_ME"
const FRYCapID = 24874;
const main = async () => {
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
    console.log(FRYamount);
}
main();
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
