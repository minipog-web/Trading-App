import { Candle, NewsArticle } from './dataEngine.js';
import { ChartPattern, Technicals } from './analyticsEngine.js';

export interface TechnicalIndicatorDetail {
  name: string;
  value: string;
  signal: 'Bullish' | 'Bearish' | 'Neutral';
  contribution: number;
}

export interface TechnicalBreakdown {
  indicators: Record<string, TechnicalIndicatorDetail>;
  patterns: {
    name: string;
    type: 'bullish' | 'bearish' | 'neutral';
    age: number;
  }[];
  confluenceBonus: number;
  totalScore: number;
}

export interface WhaleBreakdown {
  whaleScore: number;
  whaleAccumulation: number;
  proTraderSentiment: number;
  fiveDayTrend: 'Accumulating' | 'Distributing' | 'Flat';
  divergenceDetected: boolean;
  divergenceType: 'Bullish' | 'Bearish' | 'None';
  volumeConfirmation: boolean;
}

export interface AnomalyDetail {
  anomalyScore: number;
  activeAnomaliesCount: number;
  recentAnomalies: {
    date: string;
    type: string;
    severity: number;
    message: string;
    condition: string;
  }[];
}

export interface NewsBreakdown {
  newsScore: number;
  articleCount: number;
  averageSentiment: number;
  weightedImpact: number;
  recentCatalysts: {
    title: string;
    sentiment: number;
    impact: number;
    date: string;
  }[];
}

export interface RecommendationExplanation {
  weights: {
    technical: number;
    ml: number;
    macro: number;
    news: number;
    crossAsset: number;
    whale: number;
    anomaly: number;
  };
  scores: {
    technical: number;
    ml: number;
    macro: number;
    news: number;
    crossAsset: number;
    whale: number;
    anomaly: number;
  };
  technicalBreakdown: TechnicalBreakdown;
  whaleBreakdown: WhaleBreakdown;
  anomalyDetail: AnomalyDetail;
  newsBreakdown: NewsBreakdown;
  macroRegime: string;
  crossAssetInfluence: number;
}

export interface Recommendation {
  assetId: string;
  rating: 'Strong Buy' | 'Buy' | 'Hold' | 'Sell';
  score: number; // 0 - 100
  confidence: number; // 0 - 100
  technicalScore: number;
  mlScore: number;
  macroScore: number;
  newsScore: number;
  crossAssetScore: number;
  whaleScore: number;
  anomalyScore: number;
  suggestedEntry: number;
  takeProfit: number;
  stopLoss: number;
  expectedError: string; // Range e.g. "+/- 4.2%"
  rationale: string[];
  explanation?: RecommendationExplanation;
}

export class RecommendationEngine {
  static generateRecommendation(
    assetId: string,
    category: 'crypto' | 'equity' | 'commodity',
    candles: Candle[],
    patterns: ChartPattern[],
    mlOutput: {
      nextWeekDirectionProb: number;
      expectedReturnMin: number;
      expectedReturnMax: number;
      confidence: number;
    },
    activeRegime: 'High-inflation' | 'Low-volatility' | 'Liquidity-expansion' | 'Crisis' | 'Rate-hiking' | 'Risk-on/off',
    recentNews: NewsArticle[],
    leadLagInfluence: number, // Score representing lead-lag support (-100 to 100)
    anomalies: any[] = [] // Default to empty array for backwards compatibility
  ): Recommendation {
    const n = candles.length;
    const lastCandle = candles[n - 1];
    const close = lastCandle.close;

    // 1. Calculate Technical Score and Breakdown
    const techBreakdown = this.calculateTechnicalScore(candles, patterns, activeRegime);
    const techScore = techBreakdown.totalScore;

    // 2. Calculate ML Score (0 to 100)
    const mlScore = Math.round(mlOutput.nextWeekDirectionProb * 100);

    // 3. Calculate Macro Score (0 to 100)
    const macroScore = this.calculateMacroScore(category, activeRegime);

    // 4. Calculate News Score and Breakdown
    const newsBreakdown = this.calculateNewsScore(assetId, category, recentNews, lastCandle.date);
    const newsScore = newsBreakdown.newsScore;

    // 5. Calculate Cross-Asset Score (0 to 100)
    const crossAssetScore = Math.round((leadLagInfluence + 100) / 2);

    // 6. Calculate Whale Score and Breakdown
    const whaleBreakdown = this.calculateWhaleScore(candles);
    const whaleScore = whaleBreakdown.whaleScore;

    // 7. Calculate Anomaly Score
    const anomalyBreakdown = this.calculateAnomalyScore(anomalies, lastCandle.date);
    const anomalyScore = anomalyBreakdown.anomalyScore;

    // 8. Dynamic Regime-Aware Blending Weights (7 components, total = 1.0)
    let wTech = 0.20;
    let wML = 0.15;
    let wMacro = 0.15;
    let wNews = 0.15;
    let wCross = 0.10;
    let wWhale = 0.15;
    let wAnomaly = 0.10;

    switch (activeRegime) {
      case 'Crisis':
        wMacro = 0.30;
        wNews = 0.15;
        wTech = 0.10;
        wML = 0.10;
        wCross = 0.10;
        wWhale = 0.10;
        wAnomaly = 0.15;
        break;
      case 'Low-volatility':
        wTech = 0.30;
        wML = 0.15;
        wMacro = 0.10;
        wNews = 0.10;
        wCross = 0.10;
        wWhale = 0.15;
        wAnomaly = 0.10;
        break;
      case 'Liquidity-expansion':
        wML = 0.25;
        wTech = 0.20;
        wMacro = 0.10;
        wNews = 0.10;
        wCross = 0.10;
        wWhale = 0.15;
        wAnomaly = 0.10;
        break;
      case 'High-inflation':
        wMacro = 0.25;
        wTech = 0.15;
        wML = 0.15;
        wNews = 0.15;
        wCross = 0.10;
        wWhale = 0.10;
        wAnomaly = 0.10;
        break;
      case 'Rate-hiking':
        wMacro = 0.25;
        wTech = 0.15;
        wML = 0.10;
        wNews = 0.15;
        wCross = 0.10;
        wWhale = 0.15;
        wAnomaly = 0.10;
        break;
    }

    // Weighted Score
    const finalScore = Math.round(
      techScore * wTech +
      mlScore * wML +
      macroScore * wMacro +
      newsScore * wNews +
      crossAssetScore * wCross +
      whaleScore * wWhale +
      anomalyScore * wAnomaly
    );

    // Determine Final Rating
    let rating: 'Strong Buy' | 'Buy' | 'Hold' | 'Sell' = 'Hold';
    if (finalScore >= 74) {
      rating = 'Strong Buy';
    } else if (finalScore >= 58) {
      rating = 'Buy';
    } else if (finalScore >= 42) {
      rating = 'Hold';
    } else {
      rating = 'Sell';
    }

    // Override risk assets in Crisis regimes
    if (activeRegime === 'Crisis' && (category === 'crypto' || assetId === 'NASDAQ')) {
      if (rating === 'Strong Buy') rating = 'Buy';
      else if (rating === 'Buy') rating = 'Hold';
    }

    // 9. Calculate Suggested Entry, Take-Profit, and Stop-Loss (Volatility-adjusted)
    const atrArray = Technicals.ATR(candles);
    const atr = atrArray[atrArray.length - 1] || (close * 0.02);

    let suggestedEntry = close;
    let takeProfit = close;
    let stopLoss = close;

    // Find support & resistance prices from recent patterns
    const resistancePatterns = patterns.filter(p => p.name.includes('Breakout') || p.name.includes('resistance') || p.name.includes('Top'));
    const supportPatterns = patterns.filter(p => p.name.includes('Breakdown') || p.name.includes('support') || p.name.includes('Bottom'));

    const nearestResistance = resistancePatterns.length > 0
      ? resistancePatterns[resistancePatterns.length - 1].meta?.price || (close * 1.05)
      : (close + 2.0 * atr);
    const nearestSupport = supportPatterns.length > 0
      ? supportPatterns[supportPatterns.length - 1].meta?.price || (close * 0.95)
      : (close - 2.0 * atr);

    if (rating === 'Strong Buy' || rating === 'Buy') {
      // Limit order entry below current close (bid matching support or ATR delta)
      suggestedEntry = parseFloat(Math.min(close, (nearestSupport + close) / 2).toFixed(2));
      takeProfit = parseFloat((suggestedEntry + 3.8 * atr).toFixed(2));
      stopLoss = parseFloat((suggestedEntry - 1.6 * atr).toFixed(2));
    } else if (rating === 'Sell') {
      // Suggested short entry or limit sell order above current close
      suggestedEntry = parseFloat(Math.max(close, (nearestResistance + close) / 2).toFixed(2));
      takeProfit = parseFloat((suggestedEntry - 3.8 * atr).toFixed(2));
      stopLoss = parseFloat((suggestedEntry + 1.6 * atr).toFixed(2));
    } else {
      // Hold
      suggestedEntry = close;
      takeProfit = parseFloat((close + 2.8 * atr).toFixed(2));
      stopLoss = parseFloat((close - 1.4 * atr).toFixed(2));
    }

    // Volatility-adjusted confidence score
    let confidence = Math.round(mlOutput.confidence * 0.8 + (100 - Math.abs(finalScore - 50) * 2) * 0.2);
    if (activeRegime === 'Crisis') {
      confidence = Math.round(confidence * 0.85); // prediction confidence drops during crises
    }

    const errorMargin = (mlOutput.expectedReturnMax - mlOutput.expectedReturnMin) / 4;
    const expectedError = `±${errorMargin.toFixed(2)}%`;

    // 10. Generate Plain-Language Rationale (3-7 bullet points)
    const rationale = this.generateRationale(
      assetId,
      category,
      rating,
      finalScore,
      techScore,
      mlScore,
      macroScore,
      newsScore,
      activeRegime,
      patterns,
      leadLagInfluence,
      whaleScore,
      anomalyScore
    );

    // 11. Create full explanation object
    const explanation: RecommendationExplanation = {
      weights: {
        technical: wTech,
        ml: wML,
        macro: wMacro,
        news: wNews,
        crossAsset: wCross,
        whale: wWhale,
        anomaly: wAnomaly
      },
      scores: {
        technical: Math.round(techScore),
        ml: Math.round(mlScore),
        macro: Math.round(macroScore),
        news: Math.round(newsScore),
        crossAsset: Math.round(crossAssetScore),
        whale: Math.round(whaleScore),
        anomaly: Math.round(anomalyScore)
      },
      technicalBreakdown: techBreakdown,
      whaleBreakdown,
      anomalyDetail: anomalyBreakdown,
      newsBreakdown,
      macroRegime: activeRegime,
      crossAssetInfluence: leadLagInfluence
    };

    return {
      assetId,
      rating,
      score: finalScore,
      confidence,
      technicalScore: Math.round(techScore),
      mlScore: Math.round(mlScore),
      macroScore: Math.round(macroScore),
      newsScore: Math.round(newsScore),
      crossAssetScore: Math.round(crossAssetScore),
      whaleScore: Math.round(whaleScore),
      anomalyScore: Math.round(anomalyScore),
      suggestedEntry,
      takeProfit,
      stopLoss,
      expectedError,
      rationale,
      explanation
    };
  }

  private static calculateTechnicalScore(candles: Candle[], patterns: ChartPattern[], regime: string): TechnicalBreakdown {
    const closes = candles.map(c => c.close);
    const n = closes.length;
    
    // Default fallback
    if (n < 50) {
      return {
        indicators: {},
        patterns: [],
        confluenceBonus: 0,
        totalScore: 50
      };
    }

    const lastClose = closes[n - 1];

    // Technical indicator values
    const sma20Array = Technicals.SMA(closes, 20);
    const sma50Array = Technicals.SMA(closes, 50);
    const sma200Array = Technicals.SMA(closes, 200);

    const sma20 = sma20Array[n - 1];
    const sma50 = sma50Array[n - 1];
    const sma200 = sma200Array[n - 1] || sma50; // fallback if history too short

    const rsiArray = Technicals.RSI(closes, 14);
    const rsi = rsiArray[n - 1];

    const { macd, signalLine } = Technicals.MACD(closes);
    const macdVal = macd[n - 1];
    const macdSig = signalLine[n - 1];

    const stochRsi = Technicals.StochasticRSI(rsiArray, 14);
    const stochK = stochRsi.k[n - 1] || 50;
    const stochD = stochRsi.d[n - 1] || 50;

    const adxVal = Technicals.ADX(candles, 14)[n - 1] || 20;

    const bb = Technicals.BollingerBands(closes, 20, 2);
    const bbUpper = bb.upper[n - 1];
    const bbMiddle = bb.middle[n - 1];
    const bbLower = bb.lower[n - 1];
    const bbWidth = bb.width[n - 1];

    const mfiVal = Technicals.MFI(candles, 14)[n - 1] || 50;
    const obvArray = Technicals.OBV(candles);
    const obvVal = obvArray[n - 1] || 0;
    const obvChange = obvVal - (obvArray[n - 6] || obvArray[0] || 0);

    const rocVal = Technicals.ROC(closes, 12)[n - 1] || 0;

    // Calculate rolling average width for Squeeze
    const avgWidth = bb.width.slice(-20).reduce((s, w) => s + w, 0) / Math.min(20, bb.width.length) || 0.1;

    const indicators: Record<string, TechnicalIndicatorDetail> = {};

    // 1. SMA 20/50 Crossover
    const sma20_50_bull = sma20 > sma50;
    indicators['sma20_50_cross'] = {
      name: 'SMA 20/50 Cross',
      value: `SMA20: ${sma20.toFixed(2)}, SMA50: ${sma50.toFixed(2)}`,
      signal: sma20_50_bull ? 'Bullish' : 'Bearish',
      contribution: sma20_50_bull ? 8 : -8
    };

    // 2. SMA 50/200 Crossover
    const sma50_200_bull = sma50 > sma200;
    indicators['sma50_200_cross'] = {
      name: 'SMA 50/200 Cross',
      value: `SMA50: ${sma50.toFixed(2)}, SMA200: ${sma200.toFixed(2)}`,
      signal: sma50_200_bull ? 'Bullish' : 'Bearish',
      contribution: sma50_200_bull ? 7 : -7
    };

    // 3. Price vs SMA50
    const price_sma50_bull = lastClose > sma50;
    indicators['price_vs_sma50'] = {
      name: 'Price vs SMA 50',
      value: `Close: ${lastClose.toFixed(2)}, SMA50: ${sma50.toFixed(2)}`,
      signal: price_sma50_bull ? 'Bullish' : 'Bearish',
      contribution: price_sma50_bull ? 8 : -8
    };

    // 4. Price vs SMA200
    const price_sma200_bull = lastClose > sma200;
    indicators['price_vs_sma200'] = {
      name: 'Price vs SMA 200',
      value: `Close: ${lastClose.toFixed(2)}, SMA200: ${sma200.toFixed(2)}`,
      signal: price_sma200_bull ? 'Bullish' : 'Bearish',
      contribution: price_sma200_bull ? 7 : -7
    };

    // 5. RSI (14)
    let rsiSignal: 'Bullish' | 'Bearish' | 'Neutral' = 'Neutral';
    let rsiContrib = 0;
    if (rsi > 70) {
      rsiSignal = regime === 'Liquidity-expansion' ? 'Bullish' : 'Bearish';
      rsiContrib = regime === 'Liquidity-expansion' ? 5 : -10;
    } else if (rsi < 30) {
      rsiSignal = regime === 'Crisis' ? 'Bearish' : 'Bullish';
      rsiContrib = regime === 'Crisis' ? -5 : 12;
    } else if (rsi > 50) {
      rsiSignal = 'Bullish';
      rsiContrib = 5;
    } else {
      rsiSignal = 'Bearish';
      rsiContrib = -5;
    }
    indicators['rsi'] = {
      name: 'RSI (14)',
      value: rsi.toFixed(1),
      signal: rsiSignal,
      contribution: rsiContrib
    };

    // 6. Stochastic RSI
    let stochSignal: 'Bullish' | 'Bearish' | 'Neutral' = 'Neutral';
    let stochContrib = 0;
    if (stochK > stochD && stochK < 20) {
      stochSignal = 'Bullish';
      stochContrib = 10;
    } else if (stochK < stochD && stochK > 80) {
      stochSignal = 'Bearish';
      stochContrib = -10;
    } else if (stochK > stochD) {
      stochSignal = 'Bullish';
      stochContrib = 5;
    } else {
      stochSignal = 'Bearish';
      stochContrib = -5;
    }
    indicators['stoch_rsi'] = {
      name: 'Stochastic RSI',
      value: `K: ${stochK.toFixed(1)}, D: ${stochD.toFixed(1)}`,
      signal: stochSignal,
      contribution: stochContrib
    };

    // 7. MACD
    const macd_bull = macdVal > macdSig;
    indicators['macd'] = {
      name: 'MACD',
      value: `MACD: ${macdVal.toFixed(4)}, Sig: ${macdSig.toFixed(4)}`,
      signal: macd_bull ? 'Bullish' : 'Bearish',
      contribution: macd_bull ? 10 : -10
    };

    // 8. ADX
    let adxSignal: 'Bullish' | 'Bearish' | 'Neutral' = 'Neutral';
    let adxContrib = 0;
    if (adxVal > 25) {
      adxSignal = lastClose > sma50 ? 'Bullish' : 'Bearish';
      adxContrib = lastClose > sma50 ? 10 : -10;
    } else {
      adxSignal = 'Neutral';
      adxContrib = 0;
    }
    indicators['adx'] = {
      name: 'ADX Trend Strength',
      value: adxVal.toFixed(1),
      signal: adxSignal,
      contribution: adxContrib
    };

    // 9. Bollinger Bands
    let bbSignal: 'Bullish' | 'Bearish' | 'Neutral' = 'Neutral';
    let bbContrib = 0;
    if (lastClose < bbLower) {
      bbSignal = 'Bullish';
      bbContrib = 12;
    } else if (lastClose > bbUpper) {
      bbSignal = 'Bearish';
      bbContrib = -12;
    } else if (lastClose > bbMiddle) {
      bbSignal = 'Bullish';
      bbContrib = 5;
    } else {
      bbSignal = 'Bearish';
      bbContrib = -5;
    }
    indicators['bollinger_bands'] = {
      name: 'Bollinger Bands',
      value: `Price: ${lastClose.toFixed(2)} (Bands: ${bbLower.toFixed(2)} - ${bbUpper.toFixed(2)})`,
      signal: bbSignal,
      contribution: bbContrib
    };

    // 10. Money Flow Index (MFI)
    let mfiSignal: 'Bullish' | 'Bearish' | 'Neutral' = 'Neutral';
    let mfiContrib = 0;
    if (mfiVal < 20) {
      mfiSignal = 'Bullish';
      mfiContrib = 10;
    } else if (mfiVal > 80) {
      mfiSignal = 'Bearish';
      mfiContrib = -10;
    } else if (mfiVal > 50) {
      mfiSignal = 'Bullish';
      mfiContrib = 5;
    } else {
      mfiSignal = 'Bearish';
      mfiContrib = -5;
    }
    indicators['mfi'] = {
      name: 'MFI',
      value: mfiVal.toFixed(1),
      signal: mfiSignal,
      contribution: mfiContrib
    };

    // 11. On-Balance Volume (OBV)
    const obv_bull = obvChange > 0;
    indicators['obv'] = {
      name: 'OBV Direction',
      value: `OBV: ${obvVal.toLocaleString()} (5d Chg: ${obvChange > 0 ? '+' : ''}${obvChange.toLocaleString()})`,
      signal: obv_bull ? 'Bullish' : 'Bearish',
      contribution: obv_bull ? 8 : -8
    };

    // 12. Rate of Change (ROC)
    const roc_bull = rocVal > 0;
    indicators['roc'] = {
      name: 'ROC (12)',
      value: `${rocVal.toFixed(2)}%`,
      signal: roc_bull ? 'Bullish' : 'Bearish',
      contribution: roc_bull ? 8 : -8
    };

    // 13. BB Squeeze
    const isSqueeze = bbWidth < avgWidth * 0.95;
    let squeezeSignal: 'Bullish' | 'Bearish' | 'Neutral' = 'Neutral';
    let squeezeContrib = 0;
    if (isSqueeze) {
      squeezeSignal = 'Neutral';
      squeezeContrib = 0;
    } else {
      squeezeSignal = lastClose > bbUpper ? 'Bullish' : (lastClose < bbLower ? 'Bearish' : 'Neutral');
      squeezeContrib = lastClose > bbUpper ? 5 : (lastClose < bbLower ? -5 : 0);
    }
    indicators['bb_squeeze'] = {
      name: 'Volatility Squeeze',
      value: `Width: ${(bbWidth * 100).toFixed(1)}% (Avg: ${(avgWidth * 100).toFixed(1)}%)`,
      signal: squeezeSignal,
      contribution: squeezeContrib
    };

    // Confluence Bonus calculation
    const bullishCount = Object.values(indicators).filter(ind => ind.signal === 'Bullish').length;
    const bearishCount = Object.values(indicators).filter(ind => ind.signal === 'Bearish').length;
    let confluenceBonus = 0;
    if (bullishCount >= 8) confluenceBonus = 10;
    else if (bearishCount >= 8) confluenceBonus = -10;

    // Base score calculation
    let totalScore = 50;
    for (const key in indicators) {
      totalScore += indicators[key].contribution;
    }
    totalScore += confluenceBonus;

    // Pattern impact
    const latestPatterns = patterns.map(pat => {
      // Find matching pattern index in candles
      const age = n - 1 - pat.endIndex;
      return {
        name: pat.name,
        type: pat.type,
        age: age >= 0 ? age : 0
      };
    });

    if (patterns.length > 0) {
      const lastPat = patterns[patterns.length - 1];
      if (lastPat.type === 'bullish') totalScore += 12;
      if (lastPat.type === 'bearish') totalScore -= 12;
    }

    const finalScore = Math.min(100, Math.max(0, totalScore));

    return {
      indicators,
      patterns: latestPatterns.slice(-5),
      confluenceBonus,
      totalScore: finalScore
    };
  }

  private static calculateMacroScore(category: 'crypto' | 'equity' | 'commodity', regime: string): number {
    switch (regime) {
      case 'Crisis':
        if (category === 'commodity') return 65; // Gold acts as hedge
        if (category === 'equity') return 20; // Panic sell equities
        if (category === 'crypto') return 15; // De-risk crypto
        return 30;
      case 'High-inflation':
        if (category === 'commodity') return 90; // Commodities outperform
        if (category === 'equity') return 45;    // Value/Energy stocks positive, tech under pressure
        if (category === 'crypto') return 40;    // Crypto considered highly volatile
        return 50;
      case 'Rate-hiking':
        if (category === 'commodity') return 55;
        if (category === 'equity') return 40;    // Rising cost of capital pressure
        if (category === 'crypto') return 30;    // Rate hikes contract liquidity
        return 45;
      case 'Liquidity-expansion':
        if (category === 'crypto') return 95;    // Crypto leads liquidity inflows
        if (category === 'equity') return 88;    // Tech/Growth stocks rally hard
        if (category === 'commodity') return 60; // Moderate positive drift
        return 80;
      default: // Low volatility / Stable
        if (category === 'equity') return 70;
        if (category === 'crypto') return 60;
        if (category === 'commodity') return 50;
        return 60;
    }
  }

  private static calculateWhaleScore(candles: Candle[]): WhaleBreakdown {
    const n = candles.length;
    const lastCandle = candles[n - 1];
    const whaleAccum = lastCandle.whaleAccumulation ?? 50;
    const proTrader = lastCandle.proTraderSentiment ?? 50;

    // 1. 5-day trend
    let accumTrend = 0;
    for (let i = Math.max(1, n - 5); i < n; i++) {
      accumTrend += (candles[i].whaleAccumulation ?? 50) - (candles[i - 1].whaleAccumulation ?? 50);
    }
    const fiveDayTrend: 'Accumulating' | 'Distributing' | 'Flat' = 
      accumTrend > 2 ? 'Accumulating' : accumTrend < -2 ? 'Distributing' : 'Flat';

    // 2. Divergence detection
    const priceChange = lastCandle.close - (candles[Math.max(0, n - 5)].close ?? lastCandle.close);
    let divergenceType: 'Bullish' | 'Bearish' | 'None' = 'None';
    if (accumTrend > 2 && priceChange < 0) {
      divergenceType = 'Bullish';
    } else if (accumTrend < -2 && priceChange > 0) {
      divergenceType = 'Bearish';
    }
    const divergenceDetected = divergenceType !== 'None';

    // 3. Volume confirmation
    const volumeChange = lastCandle.volume - (candles[Math.max(0, n - 5)].volume ?? lastCandle.volume);
    const volumeConfirmation = volumeChange > 0 && Math.abs(accumTrend) > 1;

    // Score calculation
    let baseWhaleScore = Math.round((whaleAccum + proTrader) / 2);
    if (divergenceType === 'Bullish') baseWhaleScore += 15;
    if (divergenceType === 'Bearish') baseWhaleScore -= 15;
    if (volumeConfirmation) {
      baseWhaleScore += accumTrend > 0 ? 5 : -5;
    }
    const whaleScore = Math.min(100, Math.max(0, baseWhaleScore));

    return {
      whaleScore,
      whaleAccumulation: whaleAccum,
      proTraderSentiment: proTrader,
      fiveDayTrend,
      divergenceDetected,
      divergenceType,
      volumeConfirmation
    };
  }

  private static calculateNewsScore(
    assetId: string,
    category: string,
    news: NewsArticle[],
    referenceDateStr?: string
  ): NewsBreakdown {
    // Filter news specific to the asset or general macro
    const relevantNews = news.filter(n => 
      n.assetClass === category || 
      n.assetClass === 'macro' || 
      (n.headline && n.headline.toLowerCase().includes(assetId.toLowerCase()))
    );

    if (relevantNews.length === 0) {
      return {
        newsScore: 50,
        articleCount: 0,
        averageSentiment: 0,
        weightedImpact: 0,
        recentCatalysts: []
      };
    }

    let totalWeight = 0;
    let weightedSentiment = 0;
    const catalysts: any[] = [];

    // Sort by date desc
    const sortedNews = [...relevantNews].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    const referenceTime = referenceDateStr ? new Date(referenceDateStr).getTime() : Date.now();

    for (const article of sortedNews) {
      const articleTime = new Date(article.date).getTime();
      const daysAgo = Math.max(0, (referenceTime - articleTime) / (1000 * 60 * 60 * 24));
      // exponential decay factor: half life of 3 days
      const recencyDecay = Math.exp(-daysAgo / 3);
      const impactWeight = article.impact * recencyDecay;

      weightedSentiment += article.sentiment * impactWeight;
      totalWeight += impactWeight;

      catalysts.push({
        title: article.headline,
        sentiment: article.sentiment,
        impact: article.impact,
        date: article.date
      });
    }

    const avgSentiment = relevantNews.reduce((s, a) => s + a.sentiment, 0) / relevantNews.length;
    const scoreVal = totalWeight === 0 ? 50 : Math.round((weightedSentiment / totalWeight + 1) * 50);

    return {
      newsScore: Math.min(100, Math.max(0, scoreVal)),
      articleCount: relevantNews.length,
      averageSentiment: avgSentiment,
      weightedImpact: totalWeight / relevantNews.length,
      recentCatalysts: catalysts.slice(0, 5)
    };
  }

  private static calculateAnomalyScore(anomalies: any[], referenceDateStr?: string): AnomalyDetail {
    const referenceTime = referenceDateStr ? new Date(referenceDateStr).getTime() : Date.now();
    const fiveDaysMs = 5 * 24 * 60 * 60 * 1000;

    // Filter anomalies to only those that occurred in the last 5 days relative to reference date
    const recentAnomalies = anomalies.filter(anomaly => {
      const anomalyTime = new Date(anomaly.date).getTime();
      const age = referenceTime - anomalyTime;
      return age >= 0 && age <= fiveDaysMs;
    });

    let baseScore = 50;
    for (const anomaly of recentAnomalies) {
      if (anomaly.condition === 'buy') {
        baseScore += Math.round(anomaly.severity * 4);
      } else if (anomaly.condition === 'sell') {
        baseScore -= Math.round(anomaly.severity * 4);
      }
    }

    const anomalyScore = Math.min(100, Math.max(0, baseScore));

    return {
      anomalyScore,
      activeAnomaliesCount: recentAnomalies.length,
      recentAnomalies: recentAnomalies.slice(0, 5).map(a => ({
        date: a.date,
        type: a.type,
        severity: a.severity,
        message: a.message,
        condition: a.condition
      }))
    };
  }

  private static generateRationale(
    assetId: string,
    category: string,
    rating: string,
    finalScore: number,
    techScore: number,
    mlScore: number,
    macroScore: number,
    newsScore: number,
    regime: string,
    patterns: ChartPattern[],
    influence: number,
    whaleScore: number,
    anomalyScore: number
  ): string[] {
    const bullets: string[] = [];

    // Bullet 1: Rating summary and active Regime
    bullets.push(
      `Recommendation is **${rating}** (Score ${finalScore}/100) driven by a **${regime}** market regime.`
    );

    // Bullet 2: Technical Engine status
    const techStatus = techScore > 65 ? 'strong bullish momentum' : techScore < 35 ? 'extreme bearish structure' : 'consolidating sideways trend';
    bullets.push(
      `Technical indicator analysis suggests a **${techStatus}** (Technical Score: ${techScore}/100).`
    );

    // Bullet 3: Chart Patterns detected
    const recentPatterns = patterns.filter(p => p.startIndex > p.startIndex - 15);
    if (recentPatterns.length > 0) {
      const lastPat = recentPatterns[recentPatterns.length - 1];
      bullets.push(
        `Pattern Engine flagged a recent **${lastPat.name}** pattern confirming this bias.`
      );
    } else {
      bullets.push(
        `No major breakouts or reversals detected; price is trading within established support/resistance zones.`
      );
    }

    // Bullet 4: ML predictive ensemble
    bullets.push(
      `Machine Learning models predict a **${mlScore > 50 ? 'positive' : 'negative'}** drift next-week (Model Directional Probability: ${mlScore}%).`
    );

    // Bullet 5: Macro & News alignment
    const macroDirection = macroScore > 65 ? 'highly supportive allocation tailwinds' : macroScore < 35 ? 'significant contraction headwinds' : 'neutral economic factors';
    bullets.push(
      `Macro Regime Analysis indicates **${macroDirection}** under current ${regime} conditions.`
    );

    // Bullet 6: Cross-asset influence (VAR Granger Causality)
    if (influence > 25) {
      bullets.push(
        `Cross-Asset Lead-Lag indicators detect a positive Granger causality flow leading this asset.`
      );
    } else if (influence < -25) {
      bullets.push(
        `Cross-Asset Lead-Lag indicators flag negative pressure leading from correlated assets.`
      );
    }

    // Bullet 7: Whale Positioning tracking
    if (whaleScore > 70) {
      bullets.push(
        `Whale movement trackers identify **substantial accumulation** (Whale Score: ${whaleScore}/100) by top tier traders.`
      );
    } else if (whaleScore < 30) {
      bullets.push(
        `Whale movement trackers signal **distribution** (Whale Score: ${whaleScore}/100) as dominant wallets decrease size.`
      );
    } else {
      bullets.push(
        `Whale flow tracking reports **neutral positioning** (Whale Score: ${whaleScore}/100) with stable inventory.`
      );
    }

    // Bullet 8: Anomalies detected
    if (anomalyScore > 65) {
      bullets.push(
        `Volatility and volume anomaly detectors report strong **buying pressure spikes** (Anomaly Score: ${anomalyScore}/100).`
      );
    } else if (anomalyScore < 35) {
      bullets.push(
        `Volatility and volume anomaly detectors report strong **selling pressure spikes** (Anomaly Score: ${anomalyScore}/100).`
      );
    }

    return bullets;
  }
}
