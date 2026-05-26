import { MarketDataEngine } from './dataEngine.js';
import { PredictiveEnsemble, Technicals } from './analyticsEngine.js';

const engine = new MarketDataEngine(42);

// Test BTC (Crypto)
const btcCandles = engine.priceData['BTC'];
const btcCloses = btcCandles.map(c => c.close);
const btcRsi = Technicals.RSI(btcCloses, 14);
const btcMacd = Technicals.MACD(btcCloses);
const btcAtr = Technicals.ATR(btcCandles, 14);
const btcBb = Technicals.BollingerBands(btcCloses, 20, 2);

const btcFeatures = [
  btcRsi[btcRsi.length - 1],
  btcMacd.macd[btcMacd.macd.length - 1] - btcMacd.signalLine[btcMacd.signalLine.length - 1],
  btcBb.width[btcBb.width.length - 1],
  btcAtr[btcAtr.length - 1] / btcCloses[btcCloses.length - 1]
];
const currentMacro = engine.macroData[engine.macroData.length - 1];
const macroFeats = [currentMacro.vix, currentMacro.dxy, currentMacro.liquidity];

console.log('--- Testing BTC (Crypto) ---');
const btcOutput = PredictiveEnsemble.trainAndPredict(
  btcCandles,
  btcFeatures,
  engine.macroData,
  macroFeats,
  'BTC'
);
console.log('BTC SHAP Keys:', Object.keys(btcOutput.shapAttribution));
console.log('BTC SHAP Values:', btcOutput.shapAttribution);

// Test AAPL (Equity)
const aaplCandles = engine.priceData['AAPL'];
const aaplCloses = aaplCandles.map(c => c.close);
const aaplRsi = Technicals.RSI(aaplCloses, 14);
const aaplMacd = Technicals.MACD(aaplCloses);
const aaplAtr = Technicals.ATR(aaplCandles, 14);
const aaplBb = Technicals.BollingerBands(aaplCloses, 20, 2);

const aaplFeatures = [
  aaplRsi[aaplRsi.length - 1],
  aaplMacd.macd[aaplMacd.macd.length - 1] - aaplMacd.signalLine[aaplMacd.signalLine.length - 1],
  aaplBb.width[aaplBb.width.length - 1],
  aaplAtr[aaplAtr.length - 1] / aaplCloses[aaplCloses.length - 1]
];

console.log('\n--- Testing AAPL (Equity) ---');
const aaplOutput = PredictiveEnsemble.trainAndPredict(
  aaplCandles,
  aaplFeatures,
  engine.macroData,
  macroFeats,
  'AAPL'
);
console.log('AAPL SHAP Keys:', Object.keys(aaplOutput.shapAttribution));
console.log('AAPL SHAP Values:', aaplOutput.shapAttribution);
