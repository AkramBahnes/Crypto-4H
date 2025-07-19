import fs from 'fs';
import axios from 'axios';
import cron from 'node-cron';
import ccxt from 'ccxt';

const TELEGRAM_TOKEN = 'توكن_البوت';
const CHAT_ID = 'معرف_التليجرام';
const INTERVAL = '4h'; // كل 15 دقيقة

const exchange = new ccxt.binance();
const coins = JSON.parse(fs.readFileSync('./coins.json'));
const stateFile = './state.json';
let state = fs.existsSync(stateFile) ? JSON.parse(fs.readFileSync(stateFile)) : {};

function saveState() {
  fs.writeFileSync(stateFile, JSON.stringify(state, null, 2));
}

function formatDate() {
  return new Date().toLocaleString('ar-DZ', { timeZone: 'Africa/Algiers' });
}

function calculatePnL(buyPrice, sellPrice) {
  return ((sellPrice - buyPrice) / buyPrice * 100).toFixed(2);
}

async function sendTelegramMessage(symbol, type, price, pnl = null) {
  const emoji = type === 'buy' ? '✅' : '🔻';
  const action = type === 'buy' ? 'شراء' : 'بيع';
  const date = formatDate();

  let message = `${emoji} <b>${action}:</b> <b>${symbol}</b>\n`;
  message += `🕒 <b>الوقت:</b> ${date}\n`;
  message += `💰 <b>السعر:</b> ${price.toFixed(4)}$\n`;

  if (pnl !== null) {
    message += `📊 <b>الربح/الخسارة:</b> ${pnl}%\n`;
  }

  await axios.post(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`, {
    chat_id: CHAT_ID,
    text: message,
    parse_mode: 'HTML'
  });
}

async function runAnalysis() {
  for (const symbol of coins) {
    try {
      const ohlcv = await exchange.fetchOHLCV(symbol, '4h');
      const closes = ohlcv.map(c => c[4]);
      const rsi = getRSI(closes);
      const bb = getBB(closes);
      const macd = getMACD(closes);
      const coinState = state[symbol] || { status: 'waiting' };

      // إشارة شراء
      if (rsi < 45 && bb < 0.4 && macd.crossover === 'bullish' && coinState.status !== 'bought') {
        const buyPrice = closes[closes.length - 1];
        await sendTelegramMessage(symbol, 'buy', buyPrice);
        state[symbol] = {
          status: 'bought',
          buy_price: buyPrice,
          buy_time: new Date().toISOString()
        };
      }

      // إشارة بيع
      else if (coinState.status === 'bought' && macd.crossover === 'bearish') {
        const sellPrice = closes[closes.length - 1];
        const pnl = calculatePnL(coinState.buy_price, sellPrice);
        await sendTelegramMessage(symbol, 'sell', sellPrice, pnl);
        state[symbol] = { status: 'waiting' };
      }

    } catch (e) {
      console.log(`❌ خطأ في تحليل ${symbol}: ${e.message}`);
    }
  }

  saveState();
}

// ===== المؤشرات ===== //
function getRSI(closes) {
  const period = 14;
  const gains = [], losses = [];
  for (let i = 1; i <= period; i++) {
    const diff = closes[closes.length - i] - closes[closes.length - i - 1];
    diff >= 0 ? gains.push(diff) : losses.push(-diff);
  }
  const avgGain = gains.reduce((a, b) => a + b, 0) / period;
  const avgLoss = losses.reduce((a, b) => a + b, 0) / period;
  const rs = avgGain / avgLoss;
  return 100 - (100 / (1 + rs));
}

function getBB(closes) {
  const period = 20;
  const slice = closes.slice(-period);
  const mean = slice.reduce((a, b) => a + b, 0) / period;
  const stdDev = Math.sqrt(slice.map(c => (c - mean) ** 2).reduce((a, b) => a + b) / period);
  const lastClose = closes[closes.length - 1];
  return (lastClose - (mean - 2 * stdDev)) / (4 * stdDev); // نسبة مئوية داخل البولنجر
}

function getMACD(closes) {
  const ema = (data, period) => {
    const k = 2 / (period + 1);
    return data.reduce((acc, val, i) => {
      if (i === 0) return [val];
      acc.push(val * k + acc[i - 1] * (1 - k));
      return acc;
    }, []);
  };
  const ema12 = ema(closes, 12);
  const ema26 = ema(closes, 26);
  const macdLine = ema12.map((v, i) => v - ema26[i]);
  const signalLine = ema(macdLine, 9);
  const crossover =
    macdLine[macdLine.length - 2] < signalLine[signalLine.length - 2] &&
    macdLine[macdLine.length - 1] > signalLine[signalLine.length - 1]
      ? 'bullish'
      : macdLine[macdLine.length - 2] > signalLine[signalLine.length - 2] &&
        macdLine[macdLine.length - 1] < signalLine[signalLine.length - 1]
      ? 'bearish'
      : null;
  return { macd: macdLine, signal: signalLine, crossover };
}

// تشغيل التحليل كل 15 دقيقة
cron.schedule(INTERVAL, runAnalysis);
console.log('📡 البوت يعمل الآن ويحلل كل 15 دقيقة...');
