
import fs from 'fs';
import axios from 'axios';
import cron from 'node-cron';
import ccxt from 'ccxt';

const TELEGRAM_TOKEN = '7844382420:AAE8HA_-YmxlTYA24E2ff82gkFv2pLlJ7m4';
const CHAT_ID = '1055739217';
const exchange = new ccxt.binance();

// Load coins from coins.json
const coins = JSON.parse(fs.readFileSync('./coins.json'));

// State tracking for positions
let tradeState = {};

// Load previous state if available
const stateFile = './state.json';
if (fs.existsSync(stateFile)) {
  tradeState = JSON.parse(fs.readFileSync(stateFile));
}

// Save trade state
function saveTradeState() {
  fs.writeFileSync(stateFile, JSON.stringify(tradeState, null, 2));
}

// Send Telegram message
async function sendTelegramMessage(message) {
  const url = `https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`;
  await axios.post(url, {
    chat_id: CHAT_ID,
    text: message,
    parse_mode: 'Markdown'
  });
}

// Indicator logic (based on your TradingView script)
function calculateIndicators(ohlcv) {
  const closes = ohlcv.map(c => c[4]);
  const rsiPeriod = 14;
  const bbPeriod = 20;
  const bbMult = 2.0;

  const rsi = (closes) => {
    let gains = 0, losses = 0;
    for (let i = 1; i < rsiPeriod; i++) {
      const diff = closes[closes.length - i] - closes[closes.length - i - 1];
      if (diff >= 0) gains += diff; else losses -= diff;
    }
    const rs = gains / (losses || 1);
    return 100 - 100 / (1 + rs);
  };

  const mean = closes.slice(-bbPeriod).reduce((a, b) => a + b) / bbPeriod;
  const stdev = Math.sqrt(closes.slice(-bbPeriod).map(x => Math.pow(x - mean, 2)).reduce((a, b) => a + b) / bbPeriod);
  const upper = mean + bbMult * stdev;
  const lower = mean - bbMult * stdev;
  const percentB = (closes[closes.length - 1] - lower) / (upper - lower);

  return { rsi: rsi(closes), percentB };
}

// Check for signals
async function checkSignals() {
  for (const symbol of coins) {
    try {
      const ohlcv = await exchange.fetchOHLCV(symbol, '4h');
      const { rsi, percentB } = calculateIndicators(ohlcv);

      const macdLine = ohlcv.map(c => c[4]).slice(-50).reduce((a, b) => a + b) / 50;
      const macdSignal = ohlcv.map(c => c[4]).slice(-20).reduce((a, b) => a + b) / 20;
      const macdBuy = macdLine > macdSignal;

      const macdSellLine = ohlcv.map(c => c[4]).slice(-100).reduce((a, b) => a + b) / 100;
      const macdSellSignal = ohlcv.map(c => c[4]).slice(-8).reduce((a, b) => a + b) / 8;
      const macdSell = macdSellLine < macdSellSignal;

      const lastPrice = ohlcv[ohlcv.length - 1][4];
      const now = new Date().toLocaleString();

      if (!tradeState[symbol]) tradeState[symbol] = { inTrade: false };

      if (!tradeState[symbol].inTrade && rsi < 45 && percentB < 0.4 && macdBuy) {
        tradeState[symbol] = { inTrade: true, buyPrice: lastPrice, buyTime: now };
        sendTelegramMessage(`🟢 *شراء*
زوج: ${symbol}
السعر: ${lastPrice}
الوقت: ${now}`);
      } else if (tradeState[symbol].inTrade && macdSell) {
        const { buyPrice, buyTime } = tradeState[symbol];
        const profit = ((lastPrice - buyPrice) / buyPrice * 100).toFixed(2);
        sendTelegramMessage(`🔴 *بيع*
زوج: ${symbol}
الشراء: ${buyPrice} (${buyTime})
البيع: ${lastPrice} (${now})
النتيجة: ${profit}%`);
        tradeState[symbol] = { inTrade: false };
      }
    } catch (e) {
      console.log(`⚠️ خطأ في تحليل ${symbol}: ${e.message}`);
    }
  }
  saveTradeState();
}

// Schedule every 5 minutes
cron.schedule('*/5 * * * *', checkSignals);
