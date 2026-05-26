import { Candle, MacroDataPoint, NewsArticle, MarketDataEngine } from './dataEngine.js';
import { Technicals, ChartPatternDetector, PredictiveEnsemble, RegimeDetector, VectorAutoregression } from './analyticsEngine.js';
import { RecommendationEngine } from './recommendationEngine.js';

export interface BacktestTrade {
  date: string;
  assetId: string;
  action: 'BUY' | 'SKIP (CRISIS)' | 'HOLD CASH' | 'SELL (SL)' | 'SELL (TP)' | 'SELL (END)';
  amount: number;
  price: number;
  shares: number;
  fee: number;
  slippage: number;
  regime: string;
  portfolioValue: number;
  pnl?: number;
  pnlPercent?: number;
  stopLoss?: number;
  takeProfit?: number;
}

export interface EquityCurvePoint {
  date: string;
  strategy: number;
  btc: number;
  spx: number;
}

export interface BacktestResult {
  cumulativeReturn: number;
  maxDrawdown: number;
  sharpeRatio: number;
  totalTrades: number;
  totalInvested: number;
  finalValue: number;
  tradeLog: BacktestTrade[];
  equityCurve: EquityCurvePoint[];
  benchmarkReturns: {
    btc: number;
    spx: number;
  };
}

interface OpenTrade {
  assetId: string;
  entryDate: string;
  entryPrice: number;
  shares: number;
  amount: number;
  stopLoss: number;
  takeProfit: number;
  fee: number;
  slippage: number;
}

export class BacktestEngine {
  static runBacktest(
    engine: MarketDataEngine,
    startDay = 200
  ): BacktestResult {
    PredictiveEnsemble.clearCache();
    const assets = engine.assets;
    const priceData = engine.priceData;
    const macroData = engine.macroData;
    const newsData = engine.newsData;

    const totalDays = macroData.length;
    const dates = macroData.map(m => m.date);

    // Track active trades
    let activeTrades: OpenTrade[] = [];
    
    // Benchmark holdings
    const btcHoldings: Record<string, number> = { BTC: 0 };
    const spxHoldings: Record<string, number> = { SPX: 0 };

    let cash = 10000;
    let btcCash = 10000;
    let spxCash = 10000;
    const totalInvested = 10000;

    const tradeLog: BacktestTrade[] = [];
    const equityCurve: EquityCurvePoint[] = [];

    // Daily equity tracking for statistics
    const strategyEquityHistory: number[] = [];
    const btcEquityHistory: number[] = [];
    const spxEquityHistory: number[] = [];

    // Run day-by-day simulation starting from startDay
    for (let t = startDay; t < totalDays; t++) {
      const date = dates[t];
      const activeRegimeInfo = RegimeDetector.classifyRegime(macroData[t]);
      const regimeName = activeRegimeInfo.name;

      // 1. Check Stop Losses / Take Profits for Open Trades (runs daily at start of day)
      let remainingTrades: OpenTrade[] = [];
      for (const trade of activeTrades) {
        const candle = priceData[trade.assetId]?.[t];
        if (!candle) {
          remainingTrades.push(trade);
          continue;
        }

        const assetInfo = assets.find(a => a.id === trade.assetId)!;
        const feePercent = assetInfo.category === 'crypto' ? 0.001 : 0.0005;

        // Check if Stop Loss was hit
        if (candle.low <= trade.stopLoss) {
          const exitPrice = trade.stopLoss;
          const exitValue = trade.shares * exitPrice;
          const exitFee = exitValue * feePercent;
          const netExitValue = exitValue - exitFee;

          cash += netExitValue;

          const pnl = netExitValue - trade.amount;
          const pnlPercent = ((exitPrice - trade.entryPrice) / trade.entryPrice) * 100;

          tradeLog.push({
            date,
            assetId: trade.assetId,
            action: 'SELL (SL)',
            amount: parseFloat(trade.amount.toFixed(2)),
            price: parseFloat(exitPrice.toFixed(2)),
            shares: parseFloat(trade.shares.toFixed(6)),
            fee: parseFloat(exitFee.toFixed(2)),
            slippage: 0,
            regime: regimeName,
            portfolioValue: 0, // Filled below
            pnl: parseFloat(pnl.toFixed(2)),
            pnlPercent: parseFloat(pnlPercent.toFixed(2)),
            stopLoss: trade.stopLoss,
            takeProfit: trade.takeProfit
          });
        } else if (candle.high >= trade.takeProfit) {
          // Check if Take Profit was hit
          const exitPrice = trade.takeProfit;
          const exitValue = trade.shares * exitPrice;
          const exitFee = exitValue * feePercent;
          const netExitValue = exitValue - exitFee;

          cash += netExitValue;

          const pnl = netExitValue - trade.amount;
          const pnlPercent = ((exitPrice - trade.entryPrice) / trade.entryPrice) * 100;

          tradeLog.push({
            date,
            assetId: trade.assetId,
            action: 'SELL (TP)',
            amount: parseFloat(trade.amount.toFixed(2)),
            price: parseFloat(exitPrice.toFixed(2)),
            shares: parseFloat(trade.shares.toFixed(6)),
            fee: parseFloat(exitFee.toFixed(2)),
            slippage: 0,
            regime: regimeName,
            portfolioValue: 0, // Filled below
            pnl: parseFloat(pnl.toFixed(2)),
            pnlPercent: parseFloat(pnlPercent.toFixed(2)),
            stopLoss: trade.stopLoss,
            takeProfit: trade.takeProfit
          });
        } else if (t === totalDays - 1) {
          // Force close trades on the final day of the backtest
          const exitPrice = candle.close;
          const exitValue = trade.shares * exitPrice;
          const exitFee = exitValue * feePercent;
          const netExitValue = exitValue - exitFee;

          cash += netExitValue;

          const pnl = netExitValue - trade.amount;
          const pnlPercent = ((exitPrice - trade.entryPrice) / trade.entryPrice) * 100;

          tradeLog.push({
            date,
            assetId: trade.assetId,
            action: 'SELL (END)',
            amount: parseFloat(trade.amount.toFixed(2)),
            price: parseFloat(exitPrice.toFixed(2)),
            shares: parseFloat(trade.shares.toFixed(6)),
            fee: parseFloat(exitFee.toFixed(2)),
            slippage: 0,
            regime: regimeName,
            portfolioValue: 0, // Filled below
            pnl: parseFloat(pnl.toFixed(2)),
            pnlPercent: parseFloat(pnlPercent.toFixed(2)),
            stopLoss: trade.stopLoss,
            takeProfit: trade.takeProfit
          });
        } else {
          remainingTrades.push(trade);
        }
      }
      activeTrades = remainingTrades;

      // 2. Weekly Trade Execution (On Mondays)
      const isMonday = t % 7 === 0;

      if (isMonday) {
        const recommendations: any[] = [];
        const newsUpToDate = newsData.filter(n => n.date <= date);

        for (const asset of assets) {
          const candlesSlice = priceData[asset.id].slice(0, t + 1);
          if (candlesSlice.length < 50) continue;

          // Technicals
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

          // ML output
          const mlOutput = PredictiveEnsemble.trainAndPredict(
            candlesSlice,
            currentFeatures,
            macroData.slice(0, t + 1),
            currentMacro,
            asset.id
          );

          // Patterns
          const patterns = ChartPatternDetector.detect(candlesSlice);

          // Granger Causality proxy
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

          const rec = RecommendationEngine.generateRecommendation(
            asset.id,
            asset.category,
            candlesSlice,
            patterns,
            mlOutput,
            regimeName,
            newsUpToDate,
            grangerInfluence
          );

          recommendations.push(rec);
        }

        recommendations.sort((a, b) => b.score - a.score);
        const bestRec = recommendations[0];

        if (bestRec && (bestRec.rating === 'Strong Buy' || bestRec.rating === 'Buy')) {
          const assetInfo = assets.find(a => a.id === bestRec.assetId)!;
          const currentPrice = priceData[bestRec.assetId][t].close;

          if (regimeName === 'Crisis' && (assetInfo.category === 'crypto' || assetInfo.category === 'equity')) {
            tradeLog.push({
              date,
              assetId: bestRec.assetId,
              action: 'SKIP (CRISIS)',
              amount: 100,
              price: currentPrice,
              shares: 0,
              fee: 0,
              slippage: 0,
              regime: regimeName,
              portfolioValue: 0
            });
          } else {
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
            const slippage = size * slipPercent;

            const buyAmount = size - fee;
            const sharesBought = buyAmount / slippagePrice;

            cash -= size;
            cash += remainingCash;

            const tradeTakeProfit = parseFloat(Math.max(slippagePrice * 1.03, slippagePrice + (bestRec.takeProfit - bestRec.suggestedEntry)).toFixed(2));
            const tradeStopLoss = parseFloat(Math.min(slippagePrice * 0.995, slippagePrice - (bestRec.suggestedEntry - bestRec.stopLoss)).toFixed(2));

            activeTrades.push({
              assetId: bestRec.assetId,
              entryDate: date,
              entryPrice: slippagePrice,
              shares: sharesBought,
              amount: size,
              stopLoss: tradeStopLoss,
              takeProfit: tradeTakeProfit,
              fee,
              slippage
            });

            tradeLog.push({
              date,
              assetId: bestRec.assetId,
              action: 'BUY',
              amount: parseFloat(size.toFixed(2)),
              price: parseFloat(slippagePrice.toFixed(2)),
              shares: parseFloat(sharesBought.toFixed(6)),
              fee: parseFloat(fee.toFixed(2)),
              slippage: parseFloat(slippage.toFixed(2)),
              regime: regimeName,
              portfolioValue: 0,
              stopLoss: tradeStopLoss,
              takeProfit: tradeTakeProfit
            });
          }
        } else {
          tradeLog.push({
            date,
            assetId: 'CASH',
            action: 'HOLD CASH',
            amount: 100,
            price: 0,
            shares: 0,
            fee: 0,
            slippage: 0,
            regime: regimeName,
            portfolioValue: 0
          });
        }

        // DCA Benchmark - BTC
        const btcPrice = priceData['BTC'][t].close;
        const btcFee = 100 * 0.001;
        const btcSlip = btcPrice * 0.0005;
        const btcShares = (100 - btcFee) / (btcPrice + btcSlip);
        btcHoldings['BTC'] += btcShares;
        btcCash -= 100;

        // DCA Benchmark - SPX
        const spxPrice = priceData['SPX'][t].close;
        const spxFee = 100 * 0.0005;
        const spxSlip = spxPrice * 0.0002;
        const spxShares = (100 - spxFee) / (spxPrice + spxSlip);
        spxHoldings['SPX'] += spxShares;
        spxCash -= 100;
      }

      // 3. Daily Portfolio Valuation
      let strategyValue = cash;
      for (const trade of activeTrades) {
        strategyValue += trade.shares * priceData[trade.assetId][t].close;
      }

      const btcValue = btcCash + btcHoldings['BTC'] * priceData['BTC'][t].close;
      const spxValue = spxCash + spxHoldings['SPX'] * priceData['SPX'][t].close;

      strategyEquityHistory.push(strategyValue);
      btcEquityHistory.push(btcValue);
      spxEquityHistory.push(spxValue);

      // Fill tradeLog portfolio values for any trades generated/exited today
      for (const trade of tradeLog) {
        if (trade.date === date) {
          trade.portfolioValue = parseFloat(strategyValue.toFixed(2));
        }
      }

      // Record weekly plot point
      if (t % 7 === 0) {
        equityCurve.push({
          date,
          strategy: parseFloat(strategyValue.toFixed(2)),
          btc: parseFloat(btcValue.toFixed(2)),
          spx: parseFloat(spxValue.toFixed(2))
        });
      }
    }

    // 4. Compute Metrics
    const finalValue = strategyEquityHistory[strategyEquityHistory.length - 1];
    const btcFinalValue = btcEquityHistory[btcEquityHistory.length - 1];
    const spxFinalValue = spxEquityHistory[spxEquityHistory.length - 1];

    const cumulativeReturn = ((finalValue - totalInvested) / totalInvested) * 100;
    const btcReturn = ((btcFinalValue - totalInvested) / totalInvested) * 100;
    const spxReturn = ((spxFinalValue - totalInvested) / totalInvested) * 100;

    // A. Max Drawdown
    let peak = -1;
    let maxDrawdown = 0;
    for (const val of strategyEquityHistory) {
      if (val > peak) peak = val;
      const dd = ((val - peak) / peak) * 100;
      if (dd < maxDrawdown) maxDrawdown = dd;
    }

    // B. Sharpe Ratio (using weekly returns)
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

    return {
      cumulativeReturn: parseFloat(cumulativeReturn.toFixed(2)),
      maxDrawdown: parseFloat(maxDrawdown.toFixed(2)),
      sharpeRatio: parseFloat(sharpeRatio.toFixed(3)),
      totalTrades: tradeLog.filter(t => t.action === 'BUY').length,
      totalInvested,
      finalValue: parseFloat(finalValue.toFixed(2)),
      tradeLog,
      equityCurve,
      benchmarkReturns: {
        btc: parseFloat(btcReturn.toFixed(2)),
        spx: parseFloat(spxReturn.toFixed(2))
      }
    };
  }
}
