// 📁 index.js
import fs from 'fs';
import axios from 'axios';
import cron from 'node-cron';
import ccxt from 'ccxt';
import technicalindicators from 'technicalindicators';

const TELEGRAM_TOKEN = '7844382420:AAE8HA_-YmxlTYA24E2ff82gkFv2pLlJ7m4';
const CHAT_ID = '1055739217';
const exchange = new ccxt.binance();
const coins = JSON.parse(fs.readFileSync('./coins.json'));
const stateFile = './state.json';

let state = fs.existsSync(stateFile) ? JSON.parse(fs.readFileSync(stateFile)) : {};

const sendTelegramMessage = async (message) => {
  await axios.get(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`, {
    params: {
      chat_id: CHAT_ID,
      text: message,
      parse_mode: 'HTML',
    },
  });
};

const calculateIndicators = (closes) => {
  const rsi = technicalindicators.RSI.calculate({ period: 14, values: closes });
  const bb = technicalindicators.BollingerBands.calculate({ period: 20, stdDev: 2, values: closes });
  const macdBuy = technicalindicators.MACD.calculate({
    fastPeriod: 1,
    slowPeriod: 5,
    signalPeriod: 30,
    SimpleMAOscillator: false,
    SimpleMASignal: false,
    values: closes,
  });
  const macdSell = technicalindicators.MACD.calculate({
    fastPeriod: 2,
    slowPeriod: 10,
    signalPeriod: 15,
    SimpleMAOscillator: false,
    SimpleMASignal: false,
    values: closes,
  });
  return { rsi, bb, macdBuy, macdSell };
};

const analyzeCoin = async (symbol) => {
  try {
    const ohlcv = await exchange.fetchOHLCV(symbol, '4h');
    const closes = ohlcv.map(candle => candle[4]);
    const times = ohlcv.map(c => c[0]);

    const { rsi, bb, macdBuy, macdSell } = calculateIndicators(closes);
    const lastClose = closes[closes.length - 1];
    const coinState = state[symbol] || { inTrade: false, entries: [] };

    const lastRSI = rsi.at(-1);
    const lastBB = bb.at(-1);
    const lastMACDBuy = macdBuy.at(-1);
    const prevMACDBuy = macdBuy.at(-2);
    const lastMACDSell = macdSell.at(-1);
    const prevMACDSell = macdSell.at(-2);

    const now = new Date(times[times.length - 1]);
    const formatDate = (d) => `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth()+1).toString().padStart(2, '0')}/${d.getFullYear()} - ${d.getHours().toString().padStart(2,'0')}:${d.getMinutes().toString().padStart(2,'0')}`;

    const averageEntry = coinState.entries.length > 0 ? coinState.entries.reduce((sum, e) => sum + e.price, 0) / coinState.entries.length : 0;

    // ✅ شراء أساسي أو تدعيم
    const canSupport = coinState.inTrade && lastClose <= coinState.entries[coinState.entries.length - 1].price * 0.95;
    const shouldBuy = lastRSI < 25 && lastBB && lastBB.percentB < 0 && prevMACDBuy.MACD < prevMACDBuy.signal && lastMACDBuy.MACD > lastMACDBuy.signal;

    if (!coinState.inTrade && shouldBuy) {
      coinState.inTrade = true;
      coinState.entries = [{ price: lastClose, time: formatDate(now) }];
      await sendTelegramMessage(`🟢 <b>شراء ${symbol}</b>\nالسعر: <b>${lastClose.toFixed(4)}</b>\nالوقت: <b>${formatDate(now)}</b>`);
    } else if (coinState.inTrade && canSupport && shouldBuy) {
      coinState.entries.push({ price: lastClose, time: formatDate(now) });
      await sendTelegramMessage(`🔄 <b>تدعيم ${symbol}</b>\nالسعر: <b>${lastClose.toFixed(4)}</b>\nالوقت: <b>${formatDate(now)}</b>`);
    }

    // 🔴 بيع
    const shouldSell = coinState.inTrade && lastRSI > 50 && prevMACDSell.MACD > prevMACDSell.signal && lastMACDSell.MACD < lastMACDSell.signal;

    if (shouldSell) {
      const profit = ((lastClose - averageEntry) / averageEntry) * 100;
      const entryDetails = coinState.entries.map(e => `• ${e.time}`).join('\n');
      await sendTelegramMessage(`🔴 <b>بيع ${symbol}</b>\nالسعر: <b>${lastClose.toFixed(4)}</b>\nالربح/الخسارة: <b>${profit.toFixed(2)}%</b>\nتواريخ الشراء:\n${entryDetails}`);
      coinState.inTrade = false;
      coinState.entries = [];
    }

    state[symbol] = coinState;
  } catch (err) {
    console.error(`❌ خطأ في ${symbol}: ${err.message}`);
  }
};

cron.schedule('*/2 * * * *', async () => {
  for (const symbol of coins) {
    await analyzeCoin(symbol);
  }
  fs.writeFileSync(stateFile, JSON.stringify(state, null, 2));
});
