import fs from 'fs';
import axios from 'axios';
import cron from 'node-cron';
import ccxt from 'ccxt';

const TELEGRAM_TOKEN = '7844382420:AAE8HA_-YmxlTYA24E2ff82gkFv2pLlJ7m4';
const CHAT_ID = '1055739217';
const exchange = new ccxt.binance();

const coins = JSON.parse(fs.readFileSync('./coins.json'));
const statePath = './state.json';

let state = fs.existsSync(statePath) ? JSON.parse(fs.readFileSync(statePath)) : {};

function saveState() {
  fs.writeFileSync(statePath, JSON.stringify(state, null, 2));
}

function sendTelegramMessage(message) {
  const url = `https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`;
  return axios.post(url, {
    chat_id: CHAT_ID,
    text: message,
    parse_mode: 'Markdown'
  });
}

function calculateIndicators(data) {
  const close = data.map(c => c.close);
  const high = data.map(c => c.high);
  const low = data.map(c => c.low);

  const rsiPeriod = 14;
  const bbPeriod = 20;
  const bbMult = 2;

  const rsi = (i) => {
    if (i < rsiPeriod) return null;
    let gains = 0, losses = 0;
    for (let j = i - rsiPeriod + 1; j <= i; j++) {
      const diff = close[j] - close[j - 1];
      if (diff > 0) gains += diff;
      else losses -= diff;
    }
    const rs = gains / (losses || 1e-10);
    return 100 - (100 / (1 + rs));
  };

  const sma = (arr, i, len) => {
    if (i < len - 1) return null;
    return arr.slice(i - len + 1, i + 1).reduce((a, b) => a + b, 0) / len;
  };

  const stdev = (arr, i, len) => {
    if (i < len - 1) return null;
    const mean = sma(arr, i, len);
    const variance = arr.slice(i - len + 1, i + 1).reduce((a, b) => a + (b - mean) ** 2, 0) / len;
    return Math.sqrt(variance);
  };

  const macd = (data, fastLen, slowLen, signalLen) => {
    const ema = (arr, len) => {
      const k = 2 / (len + 1);
      const emaArr = [];
      emaArr[0] = arr[0];
      for (let i = 1; i < arr.length; i++) {
        emaArr[i] = arr[i] * k + emaArr[i - 1] * (1 - k);
      }
      return emaArr;
    };

    const fastEma = ema(data, fastLen);
    const slowEma = ema(data, slowLen);
    const macdLine = fastEma.map((val, i) => val - slowEma[i]);
    const signalLine = ema(macdLine, signalLen);
    return [macdLine, signalLine];
  };

  const results = [];

  for (let i = 1; i < close.length; i++) {
    const rsiVal = rsi(i);
    const basis = sma(close, i, bbPeriod);
    const dev = stdev(close, i, bbPeriod);
    const bbUpper = basis + bbMult * dev;
    const bbLower = basis - bbMult * dev;
    const percentB = (close[i] - bbLower) / (bbUpper - bbLower);

    results.push({ rsi: rsiVal, percentB });
  }

  const [macdBuyLine, macdBuySignal] = macd(close, 1, 5, 30);
  const [macdSellLine, macdSellSignal] = macd(close, 2, 10, 15);

  return results.map((r, i) => ({
    ...r,
    macdBuy: macdBuyLine[i],
    macdBuySig: macdBuySignal[i],
    macdSell: macdSellLine[i],
    macdSellSig: macdSellSignal[i]
  }));
}

async function analyze(symbol) {
  try {
    const ohlcv = await exchange.fetchOHLCV(symbol, '4h', undefined, 100);
    const candles = ohlcv.map(([time, open, high, low, close]) => ({ time, open, high, low, close }));
    const last = candles[candles.length - 1];
    const indicators = calculateIndicators(candles);
    const d = indicators[indicators.length - 1];
    const prev = indicators[indicators.length - 2];
    if (!d) return;

    const now = new Date().toLocaleString('ar-DZ');
    const price = last.close.toFixed(4);
    const id = symbol.replace('/', '');

    state[id] = state[id] || { inTrade: false, entry: 0, canSell: false };

    if (!state[id].inTrade && d.rsi < 25 && d.percentB < 0 && d.macdBuy > d.macdBuySig && prev.macdBuy < prev.macdBuySig) {
      state[id] = { inTrade: true, entry: last.close, canSell: false };
      sendTelegramMessage(`🟢 *إشارة شراء*\nالعملة: ${symbol}\nالسعر: $${price}\nالوقت: ${now}`);
    }

    if (state[id].inTrade && !state[id].canSell && d.rsi > 50) {
      state[id].canSell = true;
    }

    if (state[id].inTrade && state[id].canSell && d.macdSell < d.macdSellSig && prev.macdSell > prev.macdSellSig) {
      const entry = state[id].entry;
      const profit = ((last.close - entry) / entry * 100).toFixed(2);
      sendTelegramMessage(`🔴 *إشارة بيع*\nالعملة: ${symbol}\nسعر الشراء: $${entry.toFixed(4)}\nسعر البيع: $${price}\nالربح: ${profit}%\nالوقت: ${now}`);
      state[id] = { inTrade: false, entry: 0, canSell: false };
    }

    saveState();
  } catch (e) {
    console.log(`⚠️ خطأ في تحليل ${symbol}: ${e.message}`);
  }
}

cron.schedule('*/2 * * * *', async () => {
  for (let symbol of coins) await analyze(symbol);
});
