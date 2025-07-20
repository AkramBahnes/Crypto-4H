import fs from 'fs';
import axios from 'axios';
import cron from 'node-cron';
import ccxt from 'ccxt';

const TELEGRAM_TOKEN = '7844382420:AAE8HA_-YmxlTYA24E2ff82gkFv2pLlJ7m4';
const CHAT_ID = '1055739217';
const exchange = new ccxt.binance();
const coins = JSON.parse(fs.readFileSync('./coins.json'));
const stateFile = './state.json';

let state = {};
if (fs.existsSync(stateFile)) {
  state = JSON.parse(fs.readFileSync(stateFile));
}

function saveState() {
  fs.writeFileSync(stateFile, JSON.stringify(state, null, 2));
}

function sendTelegramMessage(message) {
  axios.post(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`, {
    chat_id: CHAT_ID,
    text: message,
    parse_mode: 'HTML'
  });
}

function calculateIndicators(candles) {
  const closes = candles.map(c => c.close);

  // RSI
  const rsiPeriod = 14;
  const gains = [], losses = [];
  for (let i = 1; i <= rsiPeriod; i++) {
    const change = closes[closes.length - i] - closes[closes.length - i - 1];
    gains.push(Math.max(0, change));
    losses.push(Math.max(0, -change));
  }
  const avgGain = gains.reduce((a, b) => a + b) / rsiPeriod;
  const avgLoss = losses.reduce((a, b) => a + b) / rsiPeriod;
  const rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
  const rsi = 100 - 100 / (1 + rs);

  // Bollinger Bands
  const bbPeriod = 20;
  const bbMult = 2;
  const bbSlice = closes.slice(-bbPeriod);
  const sma = bbSlice.reduce((a, b) => a + b) / bbPeriod;
  const std = Math.sqrt(bbSlice.reduce((a, b) => a + (b - sma) ** 2, 0) / bbPeriod);
  const lowerBB = sma - bbMult * std;
  const upperBB = sma + bbMult * std;
  const lastClose = closes[closes.length - 1];
  const percentB = (lastClose - lowerBB) / (upperBB - lowerBB);

  // MACD
  function EMA(data, length) {
    const k = 2 / (length + 1);
    let ema = data[0];
    return data.map(price => {
      ema = price * k + ema * (1 - k);
      return ema;
    });
  }

  const macdBuyFast = EMA(closes, 1);
  const macdBuySlow = EMA(closes, 50);
  const macdBuy = macdBuyFast.map((val, i) => val - macdBuySlow[i]);
  const signalBuy = EMA(macdBuy, 20);
  const macdSellFast = EMA(closes, 1);
  const macdSellSlow = EMA(closes, 100);
  const macdSell = macdSellFast.map((val, i) => val - macdSellSlow[i]);
  const signalSell = EMA(macdSell, 8);

  const prevBuyMACD = macdBuy[macdBuy.length - 2];
  const currBuyMACD = macdBuy[macdBuy.length - 1];
  const prevBuySignal = signalBuy[signalBuy.length - 2];
  const currBuySignal = signalBuy[signalBuy.length - 1];

  const prevSellMACD = macdSell[macdSell.length - 2];
  const currSellMACD = macdSell[macdSell.length - 1];
  const prevSellSignal = signalSell[signalSell.length - 2];
  const currSellSignal = signalSell[signalSell.length - 1];

  const buyCross = prevBuyMACD < prevBuySignal && currBuyMACD > currBuySignal;
  const sellCross = prevSellMACD > prevSellSignal && currSellMACD < currSellSignal;

  return { rsi, percentB, buyCross, sellCross };
}

async function analyzeSymbol(symbol) {
  try {
    const market = symbol.replace('/', '');
    const candles = await exchange.fetchOHLCV(symbol, '4h');
    const formatted = candles.map(c => ({
      time: c[0],
      open: c[1],
      high: c[2],
      low: c[3],
      close: c[4],
      volume: c[5]
    }));

    const { rsi, percentB, buyCross, sellCross } = calculateIndicators(formatted);
    const lastClose = formatted[formatted.length - 1].close;
    const timeNow = new Date().toLocaleString();

    if (!state[market]) state[market] = { bought: false };

    if (!state[market].bought && rsi < 45 && percentB < 0.4 && buyCross) {
      state[market] = {
        bought: true,
        buyPrice: lastClose,
        buyTime: timeNow
      };
      sendTelegramMessage(`🟢 <b>شراء</b> ${symbol}\n📈 <b>السعر</b>: ${lastClose}\n🕒 <b>الوقت</b>: ${timeNow}`);
    }

    if (state[market].bought && sellCross) {
      const profit = ((lastClose - state[market].buyPrice) / state[market].buyPrice * 100).toFixed(2);
      const msg = `🔴 <b>بيع</b> ${symbol}
📉 <b>السعر</b>: ${lastClose}
🕒 <b>الوقت</b>: ${timeNow}
💰 <b>تم الشراء</b> بسعر ${state[market].buyPrice} في ${state[market].buyTime}
📊 <b>الربح/الخسارة</b>: ${profit}%`;
      sendTelegramMessage(msg);
      state[market].bought = false;
    }

    saveState();
  } catch (err) {
    console.log(`⚠️ خطأ في تحليل ${symbol}: ${err.message}`);
  }
}

cron.schedule('*/5 * * * *', async () => {
  for (const symbol of coins) {
    await analyzeSymbol(symbol);
  }
});
