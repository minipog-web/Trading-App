import { MarketDataEngine } from './dataEngine.js';
import { PredictiveEnsemble, Technicals } from './analyticsEngine.js';

function aggregateToWeekly(candles: any[]): any[] {
  if (candles.length === 0) return [];
  const weeklyCandles: any[] = [];
  let currentWeekCandles: any[] = [];
  const getWeekKey = (dateStr: string) => {
    const date = new Date(dateStr);
    const day = date.getDay();
    const diff = date.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(date.setDate(diff));
    return monday.toISOString().split('T')[0];
  };
  let currentWeekKey = '';
  for (const candle of candles) {
    const weekKey = getWeekKey(candle.date);
    if (weekKey !== currentWeekKey) {
      if (currentWeekCandles.length > 0) {
        weeklyCandles.push(mergeCandles(currentWeekCandles, currentWeekKey));
      }
      currentWeekCandles = [];
      currentWeekKey = weekKey;
    }
    currentWeekCandles.push(candle);
  }
  if (currentWeekCandles.length > 0) {
    weeklyCandles.push(mergeCandles(currentWeekCandles, currentWeekKey));
  }
  return weeklyCandles;
}

function mergeCandles(group: any[], dateStr: string): any {
  const open = group[0].open;
  const close = group[group.length - 1].close;
  const high = Math.max(...group.map(c => c.high));
  const low = Math.min(...group.map(c => c.low));
  const volume = group.reduce((sum, c) => sum + c.volume, 0);
  const merged: any = { date: dateStr, open, high, low, close, volume };
  const hasFunding = group.some(c => c.fundingRate !== undefined);
  if (hasFunding) {
    const avgFunding = group.reduce((sum, c) => sum + (c.fundingRate || 0), 0) / group.length;
    merged.fundingRate = parseFloat(avgFunding.toFixed(6));
  }
  const hasLiquidations = group.some(c => c.liquidations !== undefined);
  if (hasLiquidations) {
    const totalLiq = group.reduce((sum, c) => sum + (c.liquidations || 0), 0);
    merged.liquidations = totalLiq;
  }
  return merged;
}

const engine = new MarketDataEngine(42);

// 1. Train on Daily (simulates startup recommendation precomputation)
const dailyCandles = engine.priceData['BTC'];
const dailyCloses = dailyCandles.map(c => c.close);
const dailyRsi = Technicals.RSI(dailyCloses, 14);
const dailyMacd = Technicals.MACD(dailyCloses);
const dailyAtr = Technicals.ATR(dailyCandles, 14);
const dailyBb = Technicals.BollingerBands(dailyCloses, 20, 2);
const nDaily = dailyCandles.length;

const dailyFeatures = [
  dailyRsi[nDaily - 1],
  dailyMacd.macd[nDaily - 1] - dailyMacd.signalLine[nDaily - 1],
  dailyBb.width[nDaily - 1],
  dailyAtr[nDaily - 1] / dailyCandles[nDaily - 1].close
];
const currentMacroDaily = [
  engine.macroData[nDaily - 1].vix,
  engine.macroData[nDaily - 1].dxy,
  engine.macroData[nDaily - 1].liquidity
];

PredictiveEnsemble.trainAndPredict(
  dailyCandles,
  dailyFeatures,
  engine.macroData,
  currentMacroDaily,
  'BTC'
);

// 2. Perform inference on Weekly using cached daily model
const weeklyCandles = aggregateToWeekly(dailyCandles);
const weeklyCloses = weeklyCandles.map(c => c.close);
const nWeekly = weeklyCandles.length;

const weeklyRsi = Technicals.RSI(weeklyCloses, 14);
const weeklyMacd = Technicals.MACD(weeklyCloses);
const weeklyAtr = Technicals.ATR(weeklyCandles, 14);
const weeklyBb = Technicals.BollingerBands(weeklyCloses, 20, 2);

const weeklyFeatures = [
  weeklyRsi[nWeekly - 1],
  weeklyMacd.macd[nWeekly - 1] - weeklyMacd.signalLine[nWeekly - 1],
  weeklyBb.width[nWeekly - 1],
  weeklyAtr[nWeekly - 1] / weeklyCandles[nWeekly - 1].close
];
const currentMacroWeekly = [
  engine.macroData[nWeekly - 1].vix,
  engine.macroData[nWeekly - 1].dxy,
  engine.macroData[nWeekly - 1].liquidity
];

const outputWeekly = PredictiveEnsemble.trainAndPredict(
  weeklyCandles,
  weeklyFeatures,
  engine.macroData,
  currentMacroWeekly,
  'BTC'
);

console.log('Weekly SHAP values (with cached daily model):', outputWeekly.shapAttribution);
