import axios from 'axios';
import ccxt from 'ccxt';
import cron from 'node-cron';

const TELEGRAM_TOKEN = '7844382420:AAE8HA_-YmxlTYA24E2ff82gkFv2pLlJ7m4';
const CHAT_ID = '1055739217';
const exchange = new ccxt.binance();

const coins = [
  "ETH/USDT","BTC/USDT","XRP/USDT","BNB/USDT","SOL/USDT", "DOGE/USDT", "AAVE/USDT","WLD/USDT", "TAO/USDT", "ETC/USDT", "ARB/USDT", "NEAR/USDT", "APT/USDT", "TRUMP/USDT", "ICP/USDT", "FIL/USDT", "OP/USDT",
  "ENA/USDT", "BONK/USDT", "RAY/USDT", "CRV/USDT", "FDUSD/USDT", "INJ/USDT", "QNT/USDT", "FORM/USDT", "STX/USDT", "FLOKI/USDT", "PENDLE/USDT", "IMX/USDT", "LDO/USDT", "S/USDT","GRT/USDT",
  "WIF/USDT",
  "XTZ/USDT",
  "KAIA/USDT",
  "SAND/USDT",
  "A/USDT",
  "PYTH/USDT",
  "PAXG/USDT",
  "CAKE/USDT",
  "IOTA/USDT",
  "THETA/USDT",
  "GALA/USDT",
  "NEXO/USDT",
  "JASMY/USDT",
  "ETHFI/USDT",
  "ZEC/USDT",
  "AXS/USDT",
  "NEO/USDT",
  "BTTC/USDT",
  "RUNE/USDT",
  "FLOW/USDT",
  "DEXE/USDT",
  "MANA/USDT",
  "APE/USDT",
  "RSR/USDT",
  "ZRO/USDT",
  "STRK/USDT",
  "CFX/USDT",
  "SUPER/USDT",
  "SYRUP/USDT",
  "DYDX/USDT",
  "TUSD/USDT",
  "AR/USDT",
  "EIGEN/USDT",
  "COMP/USDT",
  "ZK/USDT",
  "EGLD/USDT",
  "1INCH/USDT",
  "XEC/USDT",
  "W/USDT",
  "KAVA/USDT",
  "CVX/USDT",
  "CHZ/USDT",
  "MOVE/USDT",
  "KAITO/USDT",
  "RONIN/USDT",
  "GNO/USDT",
  "FXS/USDT",
  "TURBO/USDT",
  "AXL/USDT",
  "SUN/USDT",
  "LUNC/USDT",
  "BEAMX/USDT",
  "JST/USDT",
  "FTT/USDT",
  "AMP/USDT",
  "TWT/USDT",
  "KMNO/USDT",
  "LPT/USDT",
  "DASH/USDT",
  "DCR/USDT",
  "PNUT/USDT",
  "ROSE/USDT",
  "GLM/USDT",
  "KSM/USDT",
  "TFUEL/USDT",
  "1MBABYDOGE/USDT",
  "SUSHI/USDT",
  "BERA/USDT",
  "ME/USDT",
  "1000CHEEMS/USDT",
  "ZIL/USDT",
  "MINA/USDT",
  "QTUM/USDT",
  "SFP/USDT",
  "ARKM/USDT",
  "SNX/USDT",
  "BAT/USDT",
  "ZRX/USDT",
  "CELO/USDT",
  "RVN/USDT",
  "NOT/USDT",
  "NEIRO/USDT",
  "OM/USDT",
  "DYM/USDT",
  "ORDI/USDT",
  "IOTX/USDT",
  "ASTR/USDT",
  "BLUR/USDT",
  "COW/USDT",
  "GAS/USDT",
  "SAGA/USDT",
  "FUN/USDT",
  "ACH/USDT",
  "LUNA/USDT",
  "CKB/USDT",
  "YFI/USDT",
  "VANA/USDT",
  "VTHO/USDT",
  "LAYER/USDT",
  "ID/USDT",
  "NXPC/USDT",
  "HOT/USDT",
  "KDA/USDT",
  "POWR/USDT",
  "T/USDT",
  "SC/USDT",
  "ONE/USDT",
  
  "ANKR/USDT",
  "PROM/USDT",
  "ACX/USDT",
  "YGG/USDT",
  "STG/USDT",
  "ALT/USDT",
  "WOO/USDT",
  "DGB/USDT",
  "SAHARA/USDT",
  "RPL/USDT",
  "AIXBT/USDT",
  "GMT/USDT",
  "UMA/USDT",
  "POLYX/USDT",
  "ENJ/USDT",
  "MASK/USDT",
  "ONT/USDT",
  "BOME/USDT",
  "BIGTIME/USDT",
  "ICX/USDT",
  "ZEN/USDT",
  "ORCA/USDT",
  "SSV/USDT",
  "REQ/USDT",
  "OSMO/USDT",
  "GMX/USDT",
  "COTI/USDT",
  "SKL/USDT",
  "IO/USDT",
  "SXP/USDT",
  "LRC/USDT",
  "XNO/USDT",
  "PIXEL/USDT",
  "G/USDT",
  "LQTY/USDT",
  "STORJ/USDT",
  "BIO/USDT",
  "ILV/USDT",
  "XVG/USDT",
  "SXT/USDT",
  "COOKIE/USDT",
  "METIS/USDT",
  "BAND/USDT",
  "BABY/USDT",
  "AEVO/USDT",
  "MANTA/USDT",
  "HIVE/USDT",
  "PEOPLE/USDT",
  "TRB/USDT",
  "AWE/USDT",
  "LSK/USDT",
  "XVS/USDT",
  "MEME/USDT",
  "BICO/USDT",
  "XAI/USDT",
  "ANIME/USDT",
  "CVC/USDT",
  "WAXP/USDT",
  "FLUX/USDT",
  "API3/USDT",
  "1000SATS/USDT",
  "STRAX/USDT",
  "SIGN/USDT",
  "IOST/USDT",
  "OMNI/USDT","ADA/USDT", "LINK/USDT", "DOT/USDT", "AVAX/USDT", "LTC/USDT", "XLM/USDT", "TRX/USDT", "ALGO/USDT", "VET/USDT" , "SUI/USDT", "HBAR/USDT", "BCH/USDT", "UNI/USDT", "POL/USDT", "RENDER/USDT"

,"LILPEPE/USDT", "ONDO/USDT", "FIRO/USDT", "XDC/USDT"


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
