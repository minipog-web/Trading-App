import { MarketDataEngine } from './dataEngine.js';
import { BacktestEngine } from './backtestEngine.js';
import * as fs from 'fs';

console.log('Test start');
try {
  const engine = new MarketDataEngine(42);
  console.log('Engine created');
  const res = BacktestEngine.runBacktest(engine, 200);
  console.log('Backtest finished');
  fs.writeFileSync('backtest_result.json', JSON.stringify({
    cumulativeReturn: res.cumulativeReturn,
    maxDrawdown: res.maxDrawdown,
    sharpeRatio: res.sharpeRatio,
    totalTrades: res.totalTrades,
    finalValue: res.finalValue
  }, null, 2));
  console.log('File written successfully');
} catch (e: any) {
  console.error('Error occurred:', e.message);
  fs.writeFileSync('backtest_error.txt', e.stack);
}
