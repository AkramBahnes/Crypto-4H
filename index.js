import axios from 'axios';
import ccxt from 'ccxt';
import cron from 'node-cron';

const TELEGRAM_TOKEN = '7844382420:AAE8HA_-YmxlTYA24E2ff82gkFv2pLlJ7m4';
const CHAT_ID = '1055739217';
const exchange = new ccxt.binance();

const coins = [ "1000CHEEMS/USDT", "1000SATS/USDT", "1INCH/USDT", "1MBABYDOGE/USDT", "A/USDT", "AAVE/USDT", "ACH/USDT", "ACX/USDT", "ADA/USDT", "AEVO/USDT", "AIXBT/USDT", "ALGO/USDT", "ALICE/USDT", "ALPINE/USDT", "ALT/USDT", "AMP/USDT", "ANIME/USDT", "ANKR/USDT", "APE/USDT", "API3/USDT", "APT/USDT", "ARB/USDT", "ARDR/USDT", "ARKM/USDT", "ARPA/USDT", "AR/USDT", "ASR/USDT", "ASTR/USDT", "ATA/USDT", "ATOM/USDT", "AUCTION/USDT", "AUDIO/USDT", "AVA/USDT", "AVAX/USDT", "AWE/USDT", "AXL/USDT", "AXS/USDT", "BABY/USDT", "BAKE/USDT", "BAND/USDT", "BAR/USDT", "BAT/USDT", "BEAMX/USDT", "BEL/USDT", "BERA/USDT", "BCH/USDT", "BICO/USDT", "BIF/USDT", "BIGTIME/USDT", "BIO/USDT", "BLUR/USDT", "BNB/USDT", "BONK/USDT", "BOME/USDT", "BTC/USDT", "BTTC/USDT", "CAKE/USDT", "CELER/USDT", "CELO/USDT", "CFX/USDT", "CHESS/USDT", "CHR/USDT", "CHZ/USDT", "CITY/USDT", "CKB/USDT", "COMP/USDT", "COOKIE/USDT", "COS/USDT", "COTI/USDT", "COW/USDT", "CRV/USDT", "CTK/USDT", "CTSI/USDT", "CVC/USDT", "CVX/USDT", "CYBER/USDT", "DASH/USDT", "DATA/USDT", "DCR/USDT", "DEGO/USDT", "DENT/USDT", "DEXE/USDT", "DF/USDT", "DGB/USDT", "DIA/USDT", "DODO/USDT", "DOGE/USDT", "DOT/USDT", "DUSK/USDT", "DYDX/USDT", "DYM/USDT", "EDU/USDT", "EGLD/USDT", "EIGEN/USDT", "ENA/USDT", "ENJ/USDT", "ENS/USDT", "ETHFI/USDT", "ETH/USDT", "ETH/USDC", "ETC/USDT", "EUR/USDT", "FARMB/USDT", "FDUSD/USDT", "FET/USDT", "FIDA/USDT", "FIL/USDT", "FIO/USDT", "FIRO/USDT", "FIS/USDT", "FLM/USDT", "FLOKI/USDT", "FLOW/USDT", "FLUX/USDT", "FORM/USDT", "FORTH/USDT", "FUN/USDT", "FUNFAIR/USDT", "FXS/USDT", "GALA/USDT", "GAS/USDT", "GHST/USDT", "GLM/USDT", "GLMR/USDT", "GMX/USDT", "GNS/USDT", "GNO/USDT", "GMT/USDT", "GRT/USDT", "GTC/USDT", "HBAR/USDT", "HIGH/USDT", "HIVE/USDT", "HOOK/USDT", "HOT/USDT", "ICI/USDT", "ICP/USDT", "ICX/USDT", "IDEX/USDT", "ID/USDT", "ILV/USDT", "IMX/USDT", "INJ/USDT", "IOST/USDT", "IOTX/USDT", "IO/USDT", "IOTA/USDT", "JASMY/USDT", "JOEB/USDT", "JST/USDT", "JTO/USDT", "JUV/USDT", "KAIA/USDT", "KAITO/USDT", "KASPA/USDT", "KAVA/USDT", "KDA/USDT", "KNC/USDT", "KSM/USDT", "LAZIO/USDT", "LAYER/USDT", "LDO/USDT", "LILPEPE/USDT", "LINK/USDT", "LOKAUSDT", "LQTY/USDT", "LRC/USDT", "LSK/USDT", "LTC/USDT", "LUNA/USDT", "LUNC/USDT", "MAGIC/USDT", "MANA/USDT", "MANTA/USDT", "MASK/USDT", "MAV/USDT", "MBL/USDT", "MBOX/USDT", "MDT/USDT", "ME/USDT", "MEME/USDT", "METIS/USDT", "MINA/USDT", "MKR/USDT", "MLN/USDT", "MOVR/USDT", "MOVE/USDT", "MTL/USDT", "NEAR/USDT", "NEIRO/USDT", "NEO/USDT", "NEXO/USDT", "NFP/USDT", "NKN/USDT", "NOT/USDT", "NTRN/USDT", "NXR/USDT", "OGN/USDT", "OG/USDT", "OMNI/USDT", "OM/USDT", "ONE/USDT", "ONG/USDT", "ONDO/USDT", "ONT/USDT", "OP/USDT", "ORCA/USDT", "ORDI/USDT", "OSMO/USDT", "PAXG/USDT", "PEPE/USDT", "PENDLE/USDT", "PEOPLE/USDT", "PERP/USDT", "PHA/USDT", "PHB/USDT", "PIXEL/USDT", "PNUT/USDT", "POL/USDT", "POLY/USDT", "POND/USDT", "PORTO/USDT", "POWR/USDT", "PROM/USDT", "PSG/USDT", "PUNDIX/USDT", "PYR/USDT", "PYTH/USDT", "QKC/USDT", "QNT/USDT", "QTUM/USDT", "QUICK/USDT", "QI/USDT", "QIXT/USDT", "RAD/USDT", "RARE/USDT", "RAY/USDT", "RDNT/USDT", "REI/USDT", "RENDER/USDT", "REQ/USDT", "RIF/USDT", "RLC/USDT", "RONIN/USDT", "ROSE/USDT", "RPL/USDT", "RSR/USDT", "RUNE/USDT", "RVN/USDT", "SAGA/USDT", "SAHARA/USDT", "SAND/USDT", "SANTOS/USDT", "SC/USDT", "SCRT/USDT", "SEI/USDT", "SFP/USDT", "SHIB/USDT", "SIGN/USDT", "SKL/USDT", "SLP/USDT", "SNX/USDT", "SOL/USDT", "SPELL/USDT", "SSV/USDT", "STG/USDT", "STORJ/USDT", "STRAX/USDT", "STRK/USDT", "STX/USDT", "SUI/USDT", "SUN/USDT", "SUPER/USDT", "SUSHI/USDT", "S/USDT", "SXP/USDT", "SYN/USDT", "SYS/USDT", "T/USDT", "TAO/USDT", "TFUEL/USDT", "THETA/USDT", "TIA/USDT", "TKO/USDT", "TLM/USDT", "TRB/USDT", "TRU/USDT", "TRUMP/USDT", "TRX/USDT", "TUSD/USDT", "TWT/USDT", "UMA/USDT", "UNI/USDT", "USTC/USDT", "UTK/USDT", "VANA/USDT", "VANY/USDT", "VET/USDT", "VOXEL/USDT", "VTHO/USDT", "W/USDT", "WAN/USDT", "WAXP/USDT", "WIF/USDT", "WINKS/USDT", "WLD/USDT", "WOO/USDT", "XAI/USDT", "XDC/USDT", "XEC/USDT", "XLM/USDT", "XNO/USDT", "XRP/USDT", "XTZ/USDT", "XVG/USDT", "XVS/USDT", "YFI/USDT", "YGG/USDT", "ZEC/USDT", "ZEN/USDT", "ZETA/USDT", "ZIL/USDT", "ZK/USDT", "ZRX/USDT" ];

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
