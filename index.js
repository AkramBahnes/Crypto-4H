import axios from 'axios';
import ccxt from 'ccxt';
import cron from 'node-cron';

const TELEGRAM_TOKEN = 'توكن_البوت';
const CHAT_ID = 'معرف_الشات';
const exchange = new ccxt.binance();

const coins = [
  "BTC/USDT", "ETH/USDT", "BNB/USDT", "SOL/USDT", "XRP/USDT",
  "DOGE/USDT", "ADA/USDT", "AVAX/USDT", "DOT/USDT", "LINK/USDT"
];

const state = {};

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function calculateIndicators(closes) {
  const rsiPeriod = 14;
  const bbLength = 20;
  const bbMult = 2;

  const gains = [];
  const losses = [];

  for (let i = 1; i <= rsiPeriod; i++) {
    const change = closes[closes.length - i] - closes[closes.length - i - 1];
    if (change >= 0) gains.push(change);
    else losses.push(Math.abs(change));
  }

  const avgGain = gains.reduce((a, b) => a + b, 0) / rsiPeriod;
  const avgLoss = losses.reduce((a, b) => a + b, 0) / rsiPeriod;
  const rs = avgGain / (avgLoss || 1);
  const rsi = 100 - (100 / (1 + rs));

  const bbSlice = closes.slice(-bbLength);
  const mean = bbSlice.reduce((a, b) => a + b, 0) / bbLength;
  const std = Math.sqrt(bbSlice.map(c => Math.pow(c - mean, 2)).reduce((a, b) => a + b) / bbLength);
  const upper = mean + bbMult * std;
  const lower = mean - bbMult * std;
  const lastClose = closes[closes.length - 1];
  const percentB = (lastClose - lower) / (upper - lower);

  return { rsi, percentB };
}

function calculateMACD(closes, fast, slow, signal) {
  const ema = (data, period) => {
    const k = 2 / (period + 1);
    let emaArray = [data[0]];
    for (let i = 1; i < data.length; i++) {
      emaArray.push(data[i] * k + emaArray[i - 1] * (1 - k));
    }
    return emaArray;
  };

  const fastEMA = ema(closes, fast);
  const slowEMA = ema(closes, slow);
  const macdLine = fastEMA.map((v, i) => v - (slowEMA[i] || 0));
  const signalLine = ema(macdLine.slice(-signal), signal);
  const macdHist = macdLine.slice(-signalLine.length).map((v, i) => v - signalLine[i]);

  const latestHist = macdHist[macdHist.length - 1];
  const previousHist = macdHist[macdHist.length - 2];

  return {
    crossUp: previousHist < 0 && latestHist > 0,
    crossDown: previousHist > 0 && latestHist < 0
  };
}

async function sendTelegram(msg) {
  await axios.post(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`, {
    chat_id: CHAT_ID,
    text: msg,
    parse_mode: 'HTML'
  });
}

async function analyzeCoin(symbol) {
  try {
    const market = symbol.replace('/', '');
    const ohlcv = await exchange.fetchOHLCV(symbol, '4h', undefined, 200);
    const closes = ohlcv.map(c => c[4]);
    const lastPrice = closes[closes.length - 1];
    const time = new Date().toLocaleString();

    const { rsi, percentB } = calculateIndicators(closes);
    const macdBuy = calculateMACD(closes, 1, 50, 20);
    const macdSell = calculateMACD(closes, 1, 100, 8);

    if (!state[market]) state[market] = { bought: false };

    if (!state[market].bought) {
      if (rsi < 45 && percentB < 0.4 && macdBuy.crossUp) {
        state[market] = { bought: true, buyPrice: lastPrice };
        await sendTelegram(`✅ <b>شراء ${symbol}</b>\n🕒 ${time}\n💰 السعر: <b>${lastPrice.toFixed(4)}</b>`);
      }
    } else {
      if (macdSell.crossDown) {
        const buyPrice = state[market].buyPrice;
        const profit = ((lastPrice - buyPrice) / buyPrice) * 100;
        await sendTelegram(`📤 <b>بيع ${symbol}</b>\n🕒 ${time}\n💰 السعر: <b>${lastPrice.toFixed(4)}</b>\n📊 الربح: <b>${profit.toFixed(2)}%</b>`);
        state[market] = { bought: false };
      }
    }
  } catch (err) {
    console.log(`⚠️ خطأ في تحليل ${symbol}:`, err.message);
  }
}

cron.schedule('*/5 * * * *', async () => {
  for (const symbol of coins) {
    await analyzeCoin(symbol);
    await sleep(1000);
  }
});
