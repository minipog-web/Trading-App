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
const dailyCandles = engine.priceData['BTC'];
const weeklyCandles = aggregateToWeekly(dailyCandles);

const closes = weeklyCandles.map(c => c.close);
const n = weeklyCandles.length;
const currentCandle = weeklyCandles[n - 1];

const rsi = Technicals.RSI(closes, 14);
const macdData = Technicals.MACD(closes);
const atr = Technicals.ATR(weeklyCandles, 14);
const bb = Technicals.BollingerBands(closes, 20, 2);

const currentFeatures = [
  rsi[n - 1],
  macdData.macd[n - 1] - macdData.signalLine[n - 1],
  bb.width[n - 1],
  atr[n - 1] / currentCandle.close
];
const currentMacro = [
  engine.macroData[n - 1].vix,
  engine.macroData[n - 1].dxy,
  engine.macroData[n - 1].liquidity
];

console.log('n weekly:', n);
console.log('weeklyCandles[0]:', weeklyCandles[0]);
console.log('weeklyCandles[last]:', weeklyCandles[n - 1]);

const output = PredictiveEnsemble.trainAndPredict(
  weeklyCandles,
  currentFeatures,
  engine.macroData,
  currentMacro,
  'BTC'
);

console.log('SHAP Keys:', Object.keys(output.shapAttribution));
console.log('SHAP values:', output.shapAttribution);
