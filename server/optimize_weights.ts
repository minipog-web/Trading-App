import { MarketDataEngine, Candle } from './dataEngine.js';
import { Technicals, ChartPatternDetector, PredictiveEnsemble, RegimeDetector, VectorAutoregression, AnomalyDetector } from './analyticsEngine.js';
import { RecommendationEngine } from './recommendationEngine.js';
import * as fs from 'fs';

interface PrecomputedDay {
  date: string;
  regimeName: string;
  activeRegime: string;
  macroVix: number;
  macroDxy: number;
  macroLiquidity: number;
  btcPrice: number;
  spxPrice: number;
  assetScores: {
    assetId: string;
    category: string;
    close: number;
    high: number;
    low: number;
    techScore: number;
    mlScore: number;
    macroScore: number;
    newsScore: number;
    crossAssetScore: number;
    whaleScore: number;
    anomalyScore: number;
    suggestedEntry: number;
    takeProfit: number;
    stopLoss: number;
  }[];
}

console.log('🚀 Initializing Market Data Engine for optimization...');
const engine = new MarketDataEngine(42);

async function runOptimization() {
  await engine.initialize();
  PredictiveEnsemble.clearCache();

  const assets = engine.assets;
  const priceData = engine.priceData;
  const macroData = engine.macroData;
  const newsData = engine.newsData;

  const startDay = 200;
  const totalDays = macroData.length;
  const dates = macroData.map(m => m.date);

  console.log(`📦 Precomputing scores for ${totalDays - startDay} days...`);
  const precomputed: PrecomputedDay[] = [];

  for (let t = startDay; t < totalDays; t++) {
    const date = dates[t];
    const activeRegimeInfo = RegimeDetector.classifyRegime(macroData[t]);
    const regimeName = activeRegimeInfo.name;

    const btcPrice = priceData['BTC'][t].close;
    const spxPrice = priceData['SPX'][t].close;

    const dayData: PrecomputedDay = {
      date,
      regimeName,
      activeRegime: regimeName,
      macroVix: macroData[t].vix,
      macroDxy: macroData[t].dxy,
      macroLiquidity: macroData[t].liquidity,
      btcPrice,
      spxPrice,
      assetScores: []
    };

    const isMonday = t % 7 === 0;

    if (isMonday) {
      const newsUpToDate = newsData.filter(n => n.date <= date);

      for (const asset of assets) {
        const candlesSlice = priceData[asset.id].slice(0, t + 1);
        if (candlesSlice.length < 50) continue;

        const closes = candlesSlice.map(c => c.close);
        const idx = candlesSlice.length - 1;
        const rsi = Technicals.RSI(closes, 14)[idx];
        const { macd, signalLine } = Technicals.MACD(closes);
        const macdHist = macd[idx] - signalLine[idx];
        const bb = Technicals.BollingerBands(closes);
        const atr = Technicals.ATR(candlesSlice);
        const normAtr = atr[idx] / closes[idx];

        const currentFeatures = [rsi, macdHist, bb.width[idx], normAtr];
        const currentMacro = [macroData[t].vix, macroData[t].dxy, macroData[t].liquidity];

        const mlOutput = PredictiveEnsemble.trainAndPredict(
          candlesSlice,
          currentFeatures,
          macroData.slice(0, t + 1),
          currentMacro,
          asset.id
        );

        const patterns = ChartPatternDetector.detect(candlesSlice);

        let grangerInfluence = 0;
        if (asset.parentIndex) {
          const parentSlice = priceData[asset.parentIndex].slice(0, t + 1);
          if (parentSlice.length > 5) {
            const parentCloses = parentSlice.map(c => c.close);
            const parentRet = parentCloses.map((c, i) => i === 0 ? 0 : (c - parentCloses[i - 1]) / parentCloses[i - 1]);
            const assetRet = closes.map((c, i) => i === 0 ? 0 : (c - closes[i - 1]) / closes[i - 1]);
            const granger = VectorAutoregression.grangerCausality(parentRet, assetRet, asset.parentIndex, asset.id, 2);
            if (granger.causalLink) {
              grangerInfluence = granger.fStat * 8;
            }
          }
        } else if (asset.category === 'crypto') {
          const nasdaqSlice = priceData['NASDAQ'].slice(0, t + 1);
          if (nasdaqSlice.length > 5) {
            const ndxClose = nasdaqSlice.map(c => c.close);
            const ndxRet = ndxClose.map((c, i) => i === 0 ? 0 : (c - ndxClose[i - 1]) / ndxClose[i - 1]);
            const assetRet = closes.map((c, i) => i === 0 ? 0 : (c - closes[i - 1]) / closes[i - 1]);
            const granger = VectorAutoregression.grangerCausality(ndxRet, assetRet, 'NASDAQ', asset.id, 2);
            if (granger.causalLink) {
              grangerInfluence = granger.fStat * 8;
            }
          }
        }

        const anomalies = AnomalyDetector.detectAnomalies(candlesSlice, asset.category, 30);
        
        // Generate recommendation once to harvest scores
        const rec = RecommendationEngine.generateRecommendation(
          asset.id,
          asset.category,
          candlesSlice,
          patterns,
          mlOutput,
          regimeName as any,
          newsUpToDate,
          grangerInfluence,
          anomalies
        );

        dayData.assetScores.push({
          assetId: asset.id,
          category: asset.category,
          close: priceData[asset.id][t].close,
          high: priceData[asset.id][t].high,
          low: priceData[asset.id][t].low,
          techScore: rec.technicalScore,
          mlScore: rec.mlScore,
          macroScore: rec.macroScore,
          newsScore: rec.newsScore,
          crossAssetScore: rec.crossAssetScore,
          whaleScore: rec.whaleScore,
          anomalyScore: rec.anomalyScore,
          suggestedEntry: rec.suggestedEntry,
          takeProfit: rec.takeProfit,
          stopLoss: rec.stopLoss
        });
      }
    }

    precomputed.push(dayData);
  }
  console.log('✅ Precomputation complete!');

  // Fast Backtest Simulator using precomputed scores
  function fastBacktest(
    baseWeights: typeof RecommendationEngine.baseWeights,
    regimeWeights: typeof RecommendationEngine.regimeWeights,
    thresholds: typeof RecommendationEngine.thresholds
  ): { sharpeRatio: number; cumulativeReturn: number } {
    let activeTrades: {
      assetId: string;
      entryPrice: number;
      shares: number;
      amount: number;
      stopLoss: number;
      takeProfit: number;
    }[] = [];

    let cash = 10000;
    const totalInvested = 10000;
    const strategyEquityHistory: number[] = [];

    for (let i = 0; i < precomputed.length; i++) {
      const day = precomputed[i];
      const t = startDay + i;
      const date = day.date;
      const regimeName = day.regimeName;

      // 1. Check SL/TP
      let remainingTrades: typeof activeTrades = [];
      for (const trade of activeTrades) {
        // Find today's candle values from precomputed if possible, otherwise lookup
        const assetScore = day.assetScores.find(s => s.assetId === trade.assetId) || 
                           { close: priceData[trade.assetId][t].close, high: priceData[trade.assetId][t].high, low: priceData[trade.assetId][t].low };

        const assetInfo = assets.find(a => a.id === trade.assetId)!;
        const feePercent = assetInfo.category === 'crypto' ? 0.001 : 0.0005;

        if (assetScore.low <= trade.stopLoss) {
          const exitPrice = trade.stopLoss;
          const exitValue = trade.shares * exitPrice;
          cash += exitValue - (exitValue * feePercent);
        } else if (assetScore.high >= trade.takeProfit) {
          const exitPrice = trade.takeProfit;
          const exitValue = trade.shares * exitPrice;
          cash += exitValue - (exitValue * feePercent);
        } else if (i === precomputed.length - 1) {
          // force exit at end
          const exitPrice = assetScore.close;
          const exitValue = trade.shares * exitPrice;
          cash += exitValue - (exitValue * feePercent);
        } else {
          remainingTrades.push(trade);
        }
      }
      activeTrades = remainingTrades;

      // 2. Weekly Execution (Mondays)
      const isMonday = t % 7 === 0;
      if (isMonday && day.assetScores.length > 0) {
        const rated: { assetId: string; score: number; rating: string; suggestedEntry: number; takeProfit: number; stopLoss: number }[] = [];

        for (const assetScore of day.assetScores) {
          const base = baseWeights;
          const overrides = regimeWeights[regimeName] || {};

          const wTech = overrides.tech ?? base.tech;
          const wML = overrides.ml ?? base.ml;
          const wMacro = overrides.macro ?? base.macro;
          const wNews = overrides.news ?? base.news;
          const wCross = overrides.cross ?? base.cross;
          const wWhale = overrides.whale ?? base.whale;
          const wAnomaly = overrides.anomaly ?? base.anomaly;

          const finalScore = Math.round(
            assetScore.techScore * wTech +
            assetScore.mlScore * wML +
            assetScore.macroScore * wMacro +
            assetScore.newsScore * wNews +
            assetScore.crossAssetScore * wCross +
            assetScore.whaleScore * wWhale +
            assetScore.anomalyScore * wAnomaly
          );

          let rating = 'Hold';
          if (finalScore >= thresholds.strongBuy) rating = 'Strong Buy';
          else if (finalScore >= thresholds.buy) rating = 'Buy';
          else if (finalScore >= thresholds.hold) rating = 'Hold';
          else rating = 'Sell';

          if (regimeName === 'Crisis' && (assetScore.category === 'crypto' || assetScore.assetId === 'NASDAQ')) {
            if (rating === 'Strong Buy') rating = 'Buy';
            else if (rating === 'Buy') rating = 'Hold';
          }

          rated.push({
            assetId: assetScore.assetId,
            score: finalScore,
            rating,
            suggestedEntry: assetScore.suggestedEntry,
            takeProfit: assetScore.takeProfit,
            stopLoss: assetScore.stopLoss
          });
        }

        rated.sort((a, b) => b.score - a.score);
        const bestRec = rated[0];

        if (bestRec && (bestRec.rating === 'Strong Buy' || bestRec.rating === 'Buy')) {
          const assetInfo = assets.find(a => a.id === bestRec.assetId)!;
          const assetScore = day.assetScores.find(s => s.assetId === bestRec.assetId)!;
          const currentPrice = assetScore.close;

          if (!(regimeName === 'Crisis' && (assetInfo.category === 'crypto' || assetInfo.category === 'equity'))) {
            // Sizing calculation
            const candlesSlice = priceData[bestRec.assetId].slice(0, t + 1);
            const atrArray = Technicals.ATR(candlesSlice);
            const atr = atrArray[atrArray.length - 1] || (currentPrice * 0.02);
            const relativeVol = atr / currentPrice;

            let volSizeScale = 0.015 / (relativeVol || 0.015);
            volSizeScale = Math.min(1.0, Math.max(0.3, volSizeScale));
            const size = 100 * volSizeScale;
            const remainingCash = 100 - size;

            const feePercent = assetInfo.category === 'crypto' ? 0.001 : 0.0005;
            const fee = size * feePercent;

            const slippageScale = regimeName === 'Crisis' ? 3.0 : 1.0;
            const slipPercent = 0.0005 * slippageScale * (assetInfo.category === 'crypto' ? 2.0 : 1.0);
            const slippagePrice = currentPrice * (1 + slipPercent);

            const buyAmount = size - fee;
            const sharesBought = buyAmount / slippagePrice;

            cash -= size;
            cash += remainingCash;

            const tradeTakeProfit = parseFloat(Math.max(slippagePrice * 1.03, slippagePrice + (bestRec.takeProfit - bestRec.suggestedEntry)).toFixed(2));
            const tradeStopLoss = parseFloat(Math.min(slippagePrice * 0.995, slippagePrice - (bestRec.suggestedEntry - bestRec.stopLoss)).toFixed(2));

            activeTrades.push({
              assetId: bestRec.assetId,
              entryPrice: slippagePrice,
              shares: sharesBought,
              amount: size,
              stopLoss: tradeStopLoss,
              takeProfit: tradeTakeProfit
            });
          }
        }
      }

      // Valuation
      let strategyValue = cash;
      for (const trade of activeTrades) {
        const assetScore = day.assetScores.find(s => s.assetId === trade.assetId) || 
                           { close: priceData[trade.assetId][t].close };
        strategyValue += trade.shares * assetScore.close;
      }
      strategyEquityHistory.push(strategyValue);
    }

    const finalValue = strategyEquityHistory[strategyEquityHistory.length - 1];
    const cumulativeReturn = ((finalValue - totalInvested) / totalInvested) * 100;

    const weeklyReturns: number[] = [];
    for (let i = 7; i < strategyEquityHistory.length; i += 7) {
      const prev = strategyEquityHistory[i - 7];
      weeklyReturns.push((strategyEquityHistory[i] - prev) / prev);
    }

    const avgWeeklyReturn = weeklyReturns.reduce((sum, v) => sum + v, 0) / (weeklyReturns.length || 1);
    const varWeeklyReturn = weeklyReturns.reduce((sum, v) => sum + Math.pow(v - avgWeeklyReturn, 2), 0) / (weeklyReturns.length || 1);
    const stdWeeklyReturn = Math.sqrt(varWeeklyReturn) || 0.0001;

    const riskFreeWeekly = 0.02 / 52;
    const sharpeRatio = ((avgWeeklyReturn - riskFreeWeekly) / stdWeeklyReturn) * Math.sqrt(52);

    return { sharpeRatio, cumulativeReturn };
  }

  // --- Optimization Search Block ---
  let bestSharpe = -999;
  let bestReturn = -999;
  let bestParams = {
    baseWeights: { ...RecommendationEngine.baseWeights },
    regimeWeights: JSON.parse(JSON.stringify(RecommendationEngine.regimeWeights)),
    thresholds: { ...RecommendationEngine.thresholds }
  };

  console.log('\n🔍 Running baseline backtest...');
  const baseline = fastBacktest(bestParams.baseWeights, bestParams.regimeWeights, bestParams.thresholds);
  console.log(`Baseline Sharpe: ${baseline.sharpeRatio.toFixed(3)}, Baseline Return: ${baseline.cumulativeReturn.toFixed(2)}%`);

  bestSharpe = baseline.sharpeRatio;
  bestReturn = baseline.cumulativeReturn;

  console.log('\n🧬 Starting weight search (Coordinate Descent & Grid Search)...');

  // We optimize baseWeights first
  // Constraint: weights must sum to 1.0. We adjust pairs of weights.
  const components: (keyof typeof RecommendationEngine.baseWeights)[] = ['tech', 'ml', 'macro', 'news', 'cross', 'whale', 'anomaly'];
  let improved = true;
  let iteration = 0;

  while (improved && iteration < 15) {
    improved = false;
    iteration++;
    console.log(`Iteration ${iteration}...`);

    for (let i = 0; i < components.length; i++) {
      for (let j = 0; j < components.length; j++) {
        if (i === j) continue;
        const c1 = components[i];
        const c2 = components[j];

        // Try shifting 0.02 from c2 to c1
        const tempWeights = { ...bestParams.baseWeights };
        if (tempWeights[c2] >= 0.02) {
          tempWeights[c2] = parseFloat((tempWeights[c2] - 0.02).toFixed(2));
          tempWeights[c1] = parseFloat((tempWeights[c1] + 0.02).toFixed(2));

          const res = fastBacktest(tempWeights, bestParams.regimeWeights, bestParams.thresholds);
          if (res.sharpeRatio > bestSharpe + 0.001) {
            bestSharpe = res.sharpeRatio;
            bestReturn = res.cumulativeReturn;
            bestParams.baseWeights = tempWeights;
            improved = true;
            console.log(`  Improved base weights: Sharpe -> ${bestSharpe.toFixed(3)}, Return -> ${bestReturn.toFixed(2)}% [Shifted 0.02 from ${c2} to ${c1}]`);
          }
        }
      }
    }
  }

  // Optimize Thresholds
  console.log('\n⚙️ Optimizing buy thresholds...');
  const testBuyThresholds = [50, 52, 54, 56, 58, 60, 62, 64];
  const testStrongBuyThresholds = [70, 72, 74, 76, 78, 80];

  for (const bThresh of testBuyThresholds) {
    for (const sbThresh of testStrongBuyThresholds) {
      if (sbThresh <= bThresh) continue;
      const tempThresholds = {
        strongBuy: sbThresh,
        buy: bThresh,
        hold: 42
      };

      const res = fastBacktest(bestParams.baseWeights, bestParams.regimeWeights, tempThresholds);
      if (res.sharpeRatio > bestSharpe + 0.001) {
        bestSharpe = res.sharpeRatio;
        bestReturn = res.cumulativeReturn;
        bestParams.thresholds = tempThresholds;
        console.log(`  Improved thresholds: Buy >= ${bThresh}, Strong Buy >= ${sbThresh} | Sharpe -> ${bestSharpe.toFixed(3)}, Return -> ${bestReturn.toFixed(2)}%`);
      }
    }
  }

  // Optimize Regime Weights
  console.log('\n⛈️ Optimizing Crisis regime weights specifically...');
  const crisisComponents: (keyof typeof RecommendationEngine.baseWeights)[] = ['tech', 'ml', 'macro', 'news', 'cross', 'whale', 'anomaly'];
  
  improved = true;
  let regimeIteration = 0;
  while (improved && regimeIteration < 5) {
    improved = false;
    regimeIteration++;

    for (const c1 of crisisComponents) {
      for (const c2 of crisisComponents) {
        if (c1 === c2) continue;
        const tempRegimeWeights = JSON.parse(JSON.stringify(bestParams.regimeWeights));
        const c1Val = tempRegimeWeights['Crisis'][c1] || 0;
        const c2Val = tempRegimeWeights['Crisis'][c2] || 0;

        if (c2Val >= 0.05) {
          tempRegimeWeights['Crisis'][c2] = parseFloat((c2Val - 0.05).toFixed(2));
          tempRegimeWeights['Crisis'][c1] = parseFloat((c1Val + 0.05).toFixed(2));

          const res = fastBacktest(bestParams.baseWeights, tempRegimeWeights, bestParams.thresholds);
          if (res.sharpeRatio > bestSharpe + 0.001) {
            bestSharpe = res.sharpeRatio;
            bestReturn = res.cumulativeReturn;
            bestParams.regimeWeights = tempRegimeWeights;
            improved = true;
            console.log(`  Improved Crisis weights: Sharpe -> ${bestSharpe.toFixed(3)}, Return -> ${bestReturn.toFixed(2)}% [Shifted 0.05 from ${c2} to ${c1} in Crisis]`);
          }
        }
      }
    }
  }

  console.log('\n🏆 Optimization Process Finished!');
  console.log(`Final Optimized Sharpe Ratio: ${bestSharpe.toFixed(3)} (from ${baseline.sharpeRatio.toFixed(3)})`);
  console.log(`Final Optimized Cumulative Return: ${bestReturn.toFixed(2)}% (from ${baseline.cumulativeReturn.toFixed(2)}%)`);
  
  console.log('\nOptimal Blending Weights:');
  console.log(JSON.stringify(bestParams.baseWeights, null, 2));

  console.log('\nOptimal Regime Weights:');
  console.log(JSON.stringify(bestParams.regimeWeights, null, 2));

  console.log('\nOptimal Thresholds:');
  console.log(JSON.stringify(bestParams.thresholds, null, 2));

  // Write optimal configuration to a temporary results file so we can manually update recommendationEngine.ts
  fs.writeFileSync('optimization_results.json', JSON.stringify({
    bestSharpe,
    bestReturn,
    optimalWeights: bestParams.baseWeights,
    optimalRegimeWeights: bestParams.regimeWeights,
    optimalThresholds: bestParams.thresholds
  }, null, 2));
  console.log('\nSaved optimization_results.json successfully!');
}

runOptimization().catch(e => {
  console.error('Optimization error:', e);
});
