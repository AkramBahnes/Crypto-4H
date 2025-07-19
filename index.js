import axios from 'axios';
import ccxt from 'ccxt';
import TelegramBot from 'node-telegram-bot-api';
import { macd, rsi, bollingerbands } from 'technicalindicators';
import coins from './coins.json' assert { type: 'json' };

const token = '7844382420:AAE8HA_-YmxlTYA24E2ff82gkFv2pLlJ7m4';
const chatId = '1055739217';
const bot = new TelegramBot(token);

const INTERVAL = '4h';
const RUN_EVERY_MINUTES = 15;
const LIMIT = 200;

const MACD_BUY_SETTINGS = { fastPeriod: 1, slowPeriod: 50, signalPeriod: 20, SimpleMAOscillator: false, SimpleMASignal: false };
const MACD_SELL_SETTINGS = { fastPeriod: 1, slowPeriod: 100, signalPeriod: 8, SimpleMAOscillator: false, SimpleMASignal: false };

const exchange = new ccxt.binance();

async function fetchOHLCV(symbol) {
    try {
        const ohlcv = await exchange.fetchOHLCV(symbol, INTERVAL, undefined, LIMIT);
        return ohlcv.map(candle => ({
            time: candle[0],
            close: candle[4]
        }));
    } catch (err) {
        console.error(`❌ خطأ في جلب البيانات لـ ${symbol}:`, err.message);
        return [];
    }
}

function checkBuySignal(data) {
    const closes = data.map(d => d.close);

    const rsiValues = rsi({ values: closes, period: 14 });
    const bb = bollingerbands({ period: 20, stdDev: 2, values: closes });
    const lastRSI = rsiValues.at(-1);
    const lastBB = bb.at(-1);
    const percentB = lastBB ? (closes.at(-1) - lastBB.lower) / (lastBB.upper - lastBB.lower) : null;

    if (lastRSI >= 45 || percentB >= 0.4) return false;

    const macdInput = { values: closes, ...MACD_BUY_SETTINGS };
    const macdResult = macd(macdInput);
    const len = macdResult.length;
    if (len < 2) return false;

    const prev = macdResult[len - 2];
    const curr = macdResult[len - 1];
    return prev.MACD < prev.signal && curr.MACD > curr.signal;
}

function checkSellSignal(data) {
    const closes = data.map(d => d.close);
    const macdInput = { values: closes, ...MACD_SELL_SETTINGS };
    const macdResult = macd(macdInput);
    const len = macdResult.length;
    if (len < 2) return false;

    const prev = macdResult[len - 2];
    const curr = macdResult[len - 1];
    return prev.MACD > prev.signal && curr.MACD < curr.signal;
}

let boughtCoins = {};

async function analyzeCoin(symbol) {
    const data = await fetchOHLCV(symbol);
    if (data.length < 50) return;

    const price = data.at(-1).close;

    if (!boughtCoins[symbol] && checkBuySignal(data)) {
        boughtCoins[symbol] = price;
        bot.sendMessage(chatId, `📈 تم شراء ${symbol}
السعر: ${price.toFixed(4)} 💰`);
    } else if (boughtCoins[symbol] && checkSellSignal(data)) {
        bot.sendMessage(chatId, `📉 تم بيع ${symbol}
السعر: ${price.toFixed(4)} 💰`);
        delete boughtCoins[symbol];
    }
}

async function runAnalysis() {
    console.log("✅ بدأ التحليل...");
    for (const symbol of coins) {
        await analyzeCoin(symbol);
    }
}

setInterval(runAnalysis, RUN_EVERY_MINUTES * 60 * 1000);
runAnalysis();
