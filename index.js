import fs from 'fs';
import axios from 'axios';
import cron from 'node-cron';
import ccxt from 'ccxt';

const TELEGRAM_TOKEN = '7844382420:AAE8HA_-YmxlTYA24E2ff82gkFv2pLlJ7m4';
const CHAT_ID = '1055739217';
const exchange = new ccxt.binance();

const coins = JSON.parse(fs.readFileSync('./coins.json'));
let state = {};
const stateFile = './state.json';

if (fs.existsSync(stateFile)) {
    state = JSON.parse(fs.readFileSync(stateFile));
}

function saveState() {
    fs.writeFileSync(stateFile, JSON.stringify(state));
}

function calculateIndicators(candles) {
    const closes = candles.map(c => c[4]);
    const highs = candles.map(c => c[2]);
    const lows = candles.map(c => c[3]);

    const rsiPeriod = 10;
    const bbPeriod = 10;
    const bbMultiplier = 2;
    const macdBuy = { fast: 1, slow: 5, signal: 30 };
    const macdSell = { fast: 2, slow: 10, signal: 15 };

    function calcSMA(data, period) {
        return data.slice(-period).reduce((a, b) => a + b, 0) / period;
    }

    function calcRSI(closes, period) {
        let gains = 0, losses = 0;
        for (let i = closes.length - period; i < closes.length - 1; i++) {
            const diff = closes[i + 1] - closes[i];
            if (diff >= 0) gains += diff;
            else losses -= diff;
        }
        const avgGain = gains / period;
        const avgLoss = losses / period;
        const rs = avgGain / avgLoss;
        return 100 - (100 / (1 + rs));
    }

    function calcMACD(closes, fastLen, slowLen, signalLen) {
        function ema(values, length) {
            const k = 2 / (length + 1);
            let emaArray = [values[0]];
            for (let i = 1; i < values.length; i++) {
                emaArray.push(values[i] * k + emaArray[i - 1] * (1 - k));
            }
            return emaArray;
        }
        const fastEMA = ema(closes, fastLen);
        const slowEMA = ema(closes, slowLen);
        const macdLine = fastEMA.map((v, i) => v - slowEMA[i]);
        const signalLine = ema(macdLine.slice(-signalLen * 2), signalLen);
        return { macd: macdLine[macdLine.length - 1], signal: signalLine[signalLine.length - 1] };
    }

    function calcPercentB(closes, highs, lows, period, multiplier) {
        const lastClose = closes[closes.length - 1];
        const sma = calcSMA(closes, period);
        const std = Math.sqrt(closes.slice(-period).reduce((acc, val) => acc + Math.pow(val - sma, 2), 0) / period);
        const upper = sma + (multiplier * std);
        const lower = sma - (multiplier * std);
        return (lastClose - lower) / (upper - lower);
    }

    const rsi = calcRSI(closes, rsiPeriod);
    const percentB = calcPercentB(closes, highs, lows, bbPeriod, bbMultiplier);
    const macdB = calcMACD(closes, macdBuy.fast, macdBuy.slow, macdBuy.signal);
    const macdS = calcMACD(closes, macdSell.fast, macdSell.slow, macdSell.signal);

    return { rsi, percentB, macdB, macdS };
}

function sendTelegramMessage(message) {
    axios.post(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`, {
        chat_id: CHAT_ID,
        text: message,
        parse_mode: 'Markdown'
    });
}

async function analyzeCoin(symbol) {
    try {
        const ohlcv = await exchange.fetchOHLCV(symbol, '4h', undefined, 200);
        const indicators = calculateIndicators(ohlcv);
        const lastClose = ohlcv[ohlcv.length - 1][4];
        const now = new Date().toLocaleString('en-GB', { timeZone: 'UTC' });

        if (!state[symbol]) state[symbol] = { bought: false, buyPrice: 0 };

        if (!state[symbol].bought) {
            if (indicators.rsi < 45 && indicators.percentB < 0.2 && indicators.macdB.macd > indicators.macdB.signal) {
                state[symbol] = { bought: true, buyPrice: lastClose };
                sendTelegramMessage(`🔔 *شراء ${symbol}*
📈 السعر: ${lastClose}
⏰ الوقت: ${now}`);
                saveState();
            }
        } else {
            if (indicators.rsi > 60 && indicators.macdS.macd < indicators.macdS.signal) {
                const profit = ((lastClose - state[symbol].buyPrice) / state[symbol].buyPrice) * 100;
                sendTelegramMessage(`💰 *بيع ${symbol}*
📉 السعر: ${lastClose}
⏰ الوقت: ${now}
📊 نسبة الربح: ${profit.toFixed(2)}%`);
                state[symbol] = { bought: false, buyPrice: 0 };
                saveState();
            }
        }
    } catch (err) {
        console.error(`⚠️ خطأ في تحليل ${symbol}:`, err.message);
    }
}

cron.schedule('*/5 * * * *', async () => {
    console.log('تحليل العملات...');
    for (const symbol of coins) {
        await analyzeCoin(symbol);
    }
});
