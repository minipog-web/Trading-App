import { MarketDataEngine } from './dataEngine.js';
import { Technicals, RegimeDetector, VectorAutoregression, PredictiveEnsemble, AnomalyDetector } from './analyticsEngine.js';
import { BacktestEngine } from './backtestEngine.js';

console.log('🧪 Starting MacroSignal Radar Pro Analytics Unit Tests...');

try {
  // 1. Data Generation Test
  const engine = new MarketDataEngine(42);
  const btcCandles = engine.priceData['BTC'];
  console.log(`✅ Data Generator test: Loaded ${btcCandles.length} candles for BTC.`);
  if (btcCandles.length !== 500) throw new Error('Data generator failed to create 500 candles');

  // 2. Technical Analysis Math Tests
  const closes = btcCandles.map(c => c.close);
  const rsi = Technicals.RSI(closes, 14);
  const macdData = Technicals.MACD(closes);
  const atr = Technicals.ATR(btcCandles, 14);
  const bb = Technicals.BollingerBands(closes, 20, 2);

  console.log(`✅ Technical indicators computed: RSI (last: ${rsi[rsi.length - 1].toFixed(2)}), MACD (last: ${macdData.macd[macdData.macd.length - 1].toFixed(4)}), ATR (last: ${atr[atr.length - 1].toFixed(2)}).`);

  if (rsi.some(isNaN) || macdData.macd.some(isNaN) || atr.some(isNaN) || bb.upper.some(isNaN)) {
    throw new Error('NaN values found in technical indicators');
  }
  console.log('✅ Technical indicator math check: OK.');

  // 3. Regime Detector Test
  const currentMacro = engine.macroData[engine.macroData.length - 1];
  const regimeInfo = RegimeDetector.classifyRegime(currentMacro);
  console.log(`✅ Market Regime Classified: ${regimeInfo.name} (Scores: ${JSON.stringify(regimeInfo.scores)}).`);
  if (!regimeInfo.name) throw new Error('Regime classification returned empty name');

  // 4. ML Ensemble Training & Inference Test
  const currentFeatures = [
    rsi[rsi.length - 1],
    macdData.macd[macdData.macd.length - 1] - macdData.signalLine[macdData.signalLine.length - 1],
    bb.width[bb.width.length - 1],
    atr[atr.length - 1] / closes[closes.length - 1]
  ];
  const currentMacroFeats = [currentMacro.vix, currentMacro.dxy, currentMacro.liquidity];

  const mlOutput = PredictiveEnsemble.trainAndPredict(
    btcCandles,
    currentFeatures,
    engine.macroData,
    currentMacroFeats,
    'BTC'
  );
  
  // Debug prediction outputs
  console.log(`🔍 Model component check:`);
  const closes_slice = btcCandles.map(c => c.close);
  const rsi_slice = Technicals.RSI(closes_slice, 14);
  const { macd: macd_s, signalLine: sig_s } = Technicals.MACD(closes_slice);
  const bb_s = Technicals.BollingerBands(closes_slice);
  const atr_s = Technicals.ATR(btcCandles);
  const idx_s = btcCandles.length - 1;
  const currentFeat_s = [
    rsi_slice[idx_s] / 100,
    macd_s[idx_s] - sig_s[idx_s],
    bb_s.width[idx_s],
    atr_s[idx_s] / closes_slice[idx_s],
    currentMacro.vix / 50,
    (currentMacro.dxy - 90) / 20,
    currentMacro.liquidity / 150
  ];
  
  console.log(`   - Features: ${JSON.stringify(currentFeat_s)}`);

  console.log(`✅ ML Ensemble Inference: Prob of Up: ${(mlOutput.nextWeekDirectionProb * 100).toFixed(1)}%, Confidence: ${mlOutput.confidence}%, Return Range: [${mlOutput.expectedReturnMin}%, ${mlOutput.expectedReturnMax}%].`);
  if (isNaN(mlOutput.nextWeekDirectionProb) || isNaN(mlOutput.confidence)) {
    throw new Error('NaN values found in ML output');
  }
  console.log('✅ Machine Learning Ensemble check: OK.');

  // 5. VAR & Granger Causality Math Test
  const ndxCloses = engine.priceData['NASDAQ'].map(c => c.close);
  const ndxRet = ndxCloses.map((c, i) => i === 0 ? 0 : (c - ndxCloses[i - 1]) / ndxCloses[i - 1]);
  const btcRet = closes.map((c, i) => i === 0 ? 0 : (c - closes[i - 1]) / closes[i - 1]);

  const grangerResult = VectorAutoregression.grangerCausality(ndxRet, btcRet, 'NASDAQ', 'BTC', 2);
  console.log(`✅ Vector Autoregression check: NASDAQ leads BTC: causalLink = ${grangerResult.causalLink} (F-stat: ${grangerResult.fStat}, p-value: ${grangerResult.pValue}).`);
  if (isNaN(grangerResult.fStat)) {
    throw new Error('NaN found in Granger Causality calculation');
  }

  // 6. Anomaly Detection Test
  const anomalies = AnomalyDetector.detectAnomalies(btcCandles, 'crypto', 30);
  console.log(`✅ Anomaly Detector check: Identified ${anomalies.length} anomalies in BTC history.`);

  // 7. Strategy Backtest Test
  const backtest = BacktestEngine.runBacktest(engine, 200);
  console.log(`✅ Backtest Simulation run successfully:`);
  console.log(`   - Total Invested: $${backtest.totalInvested}`);
  console.log(`   - Final value: $${backtest.finalValue.toFixed(2)}`);
  console.log(`   - Cumulative Return: +${backtest.cumulativeReturn}%`);
  console.log(`   - Max Drawdown: ${backtest.maxDrawdown}%`);
  console.log(`   - Sharpe Ratio: ${backtest.sharpeRatio}`);
  console.log(`   - Total Trades executed: ${backtest.totalTrades}`);

  if (isNaN(backtest.cumulativeReturn) || isNaN(backtest.maxDrawdown) || isNaN(backtest.sharpeRatio)) {
    throw new Error('NaN values found in backtest results');
  }
  console.log('✅ Backtester calculations check: OK.');

  console.log('\n🎉 ALL QUANTITATIVE ANALYTICS TESTS PASSED SUCCESSFULLY! 🎉');
  process.exit(0);
} catch (err: any) {
  console.error('\n❌ UNIT TEST FAILED:', err.message);
  process.exit(1);
}
