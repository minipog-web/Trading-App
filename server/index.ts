import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { MarketDataEngine, Candle, NewsArticle } from './dataEngine.js';
import {
  Technicals,
  ChartPatternDetector,
  PredictiveEnsemble,
  RegimeDetector,
  VectorAutoregression,
  AnomalyDetector,
  GrangerResult
} from './analyticsEngine.js';
import { RecommendationEngine, Recommendation } from './recommendationEngine.js';
import { BacktestEngine } from './backtestEngine.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// Initialize static Market Data Engine with seed for consistency
const dataEngine = new MarketDataEngine(42);

// Simple K-Means implementation for news clustering
function clusterNews(news: NewsArticle[], k = 4): {
  clusteredArticles: (NewsArticle & { x: number; y: number; cluster: number; clusterLabel: string })[];
  centroids: number[][];
} {
  // Use semantic axes for 2D projection
  // x-axis: Economic Growth vs Crisis (Inflation + Earnings - Geopolitical)
  // y-axis: Stress & Regulation (Geopolitical + Regulatory - Earnings)
  const projectedNews = news.map(article => {
    const e = article.embedding;
    const xVal = (e[1] + e[2] - e[0] - 0.2) * 1.5;
    const yVal = (e[0] + e[3] - e[2] - 0.1) * 1.5;

    // Hardcoded assignment based on highest embedding category for initial clustering
    let cluster = 0;
    let maxVal = -1;
    for (let i = 0; i < 4; i++) {
      if (e[i] > maxVal) {
        maxVal = e[i];
        cluster = i;
      }
    }

    const labels = [
      'Geopolitical Shocks',
      'Macro & Inflation Policy',
      'Corporate Growth & Earnings',
      'Regulatory & Compliance Risk'
    ];

    return {
      ...article,
      x: parseFloat(xVal.toFixed(3)),
      y: parseFloat(yVal.toFixed(3)),
      cluster,
      clusterLabel: labels[cluster]
    };
  });

  return {
    clusteredArticles: projectedNews,
    centroids: []
  };
}

// -------------------------------------------------------------
// API Route 1: List all assets with current summary and mini-sparkline
// -------------------------------------------------------------
app.get('/api/assets', async (req, res) => {
  try {
    await dataEngine.refreshLivePrices();
    precomputeRecommendations();
    
    const summaryList = [...dataEngine.assets, ...dataEngine.universeAssets].map(asset => {
      const cached = cachedRecommendations.find(r => r.id === asset.id);
      const candles = dataEngine.priceData[asset.id];
      if (!candles || candles.length === 0) return null;
      
      const n = candles.length;
      const currentCandle = candles[n - 1];
      const prevCandle = n > 1 ? candles[n - 2] : currentCandle;

      const price = currentCandle.close;
      const prevPrice = prevCandle.close;
      const change24h = parseFloat((((price - prevPrice) / (prevPrice || 1)) * 100).toFixed(2));

      // Fetch last 15 closes for sparkline
      const sparkline = candles.slice(Math.max(0, n - 15)).map(c => c.close);

      if (cached) {
        return {
          id: asset.id,
          name: asset.name,
          category: asset.category,
          parentIndex: asset.parentIndex,
          price,
          change24h,
          rating: cached.rating,
          score: cached.score,
          technicalScore: cached.technicalScore,
          mlScore: cached.mlScore,
          macroScore: cached.macroScore,
          newsScore: cached.newsScore,
          crossAssetScore: cached.crossAssetScore,
          whaleScore: cached.whaleScore,
          anomalyScore: cached.anomalyScore,
          confidence: cached.confidence,
          suggestedEntry: cached.suggestedEntry,
          takeProfit: cached.takeProfit,
          stopLoss: cached.stopLoss,
          explanation: cached.explanation,
          sparkline
        };
      }

      // Fallback/indices calculation
      const closes = candles.map(c => c.close);
      const rsi = Technicals.RSI(closes, 14)[n - 1] || 50;
      const { macd, signalLine } = Technicals.MACD(closes);
      const macdHist = (macd[n - 1] - signalLine[n - 1]) || 0;
      const bb = Technicals.BollingerBands(closes);
      const atr = Technicals.ATR(candles);
      const normAtr = (atr[n - 1] || 0) / price;

      const currentFeatures = [rsi, macdHist, bb.width[n - 1] || 0.05, normAtr];
      const currentMacro = [
        dataEngine.macroData[n - 1]?.vix || 15,
        dataEngine.macroData[n - 1]?.dxy || 100,
        dataEngine.macroData[n - 1]?.liquidity || 100
      ];

      const mlOutput = PredictiveEnsemble.trainAndPredict(
        candles,
        currentFeatures,
        dataEngine.macroData,
        currentMacro,
        asset.id
      );

      const patterns = ChartPatternDetector.detect(candles);
      const activeRegime = RegimeDetector.classifyRegime(dataEngine.macroData[n - 1]).name;

      // Check lead-lag influence
      let leadLagInfluence = 0;
      const assetRet = closes.map((c, i) => i === 0 ? 0 : (c - closes[i - 1]) / closes[i - 1]);
      if (asset.parentIndex) {
        const parentCandles = dataEngine.priceData[asset.parentIndex];
        if (parentCandles) {
          const parentCloses = parentCandles.map(c => c.close);
          const parentRet = parentCloses.map((c, i) => i === 0 ? 0 : (c - parentCloses[i - 1]) / parentCloses[i - 1]);
          const granger = VectorAutoregression.grangerCausality(parentRet, assetRet, asset.parentIndex, asset.id, 2);
          if (granger.causalLink) {
            leadLagInfluence = granger.fStat * 8;
          }
        }
      } else if (asset.category === 'crypto') {
        const nasdaqCandles = dataEngine.priceData['NASDAQ'];
        if (nasdaqCandles) {
          const ndxCloses = nasdaqCandles.map(c => c.close);
          const ndxRet = ndxCloses.map((c, i) => i === 0 ? 0 : (c - ndxCloses[i - 1]) / ndxCloses[i - 1]);
          const granger = VectorAutoregression.grangerCausality(ndxRet, assetRet, 'NASDAQ', asset.id, 2);
          if (granger.causalLink) {
            leadLagInfluence = granger.fStat * 8;
          }
        }
      }

      const anomalies = AnomalyDetector.detectAnomalies(candles, asset.category, 30);
      const rec = RecommendationEngine.generateRecommendation(
        asset.id,
        asset.category,
        candles,
        patterns,
        mlOutput,
        activeRegime,
        dataEngine.newsData,
        leadLagInfluence,
        anomalies
      );

      return {
        id: asset.id,
        name: asset.name,
        category: asset.category,
        parentIndex: asset.parentIndex,
        price,
        change24h,
        rating: rec.rating,
        score: rec.score,
        technicalScore: rec.technicalScore,
        mlScore: rec.mlScore,
        macroScore: rec.macroScore,
        newsScore: rec.newsScore,
        crossAssetScore: rec.crossAssetScore,
        whaleScore: rec.whaleScore,
        anomalyScore: rec.anomalyScore,
        confidence: rec.confidence,
        suggestedEntry: rec.suggestedEntry,
        takeProfit: rec.takeProfit,
        stopLoss: rec.stopLoss,
        explanation: rec.explanation,
        sparkline
      };
    }).filter(a => a !== null);

    res.json(summaryList);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Helper functions for weekly aggregation
function aggregateToWeekly(candles: Candle[]): Candle[] {
  if (candles.length === 0) return [];

  const weeklyCandles: Candle[] = [];
  let currentWeekCandles: Candle[] = [];

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

function mergeCandles(group: Candle[], dateStr: string): Candle {
  const open = group[0].open;
  const close = group[group.length - 1].close;
  const high = Math.max(...group.map(c => c.high));
  const low = Math.min(...group.map(c => c.low));
  const volume = group.reduce((sum, c) => sum + c.volume, 0);

  const merged: Candle = {
    date: dateStr,
    open,
    high,
    low,
    close,
    volume
  };

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

export interface AssetProfile {
  sector: string;
  role: string;
  description: string;
}

function getAssetProfile(id: string, name: string, category: string): AssetProfile {
  const profiles: Record<string, AssetProfile> = {
    BTC: {
      sector: 'Cryptocurrency',
      role: 'Market Cap Leader & Digital Gold',
      description: 'Bitcoin is the first decentralized digital currency. It operates on a peer-to-peer network without intermediaries, serving as a global censorship-resistant store of value and digital hedge.'
    },
    ETH: {
      sector: 'Cryptocurrency',
      role: 'Decentralized Application & Smart Contract Hub',
      description: 'Ethereum is a decentralized, open-source blockchain platform with smart contract functionality. It serves as the primary base layer for DeFi, NFTs, and Web3 applications globally.'
    },
    SOL: {
      sector: 'Cryptocurrency',
      role: 'High-Throughput Smart Contract Platform',
      description: 'Solana is a high-performance blockchain designed for decentralized apps and smart contracts. It uses a unique Proof-of-History consensus mechanism to achieve ultra-fast transactions and low fees.'
    },
    NASDAQ: {
      sector: 'Equity Index',
      role: 'Tech Sector Benchmark',
      description: 'The NASDAQ 100 is a stock market index made up of the 100 largest non-financial companies listed on the Nasdaq stock market, heavily weighted toward tech and innovation.'
    },
    SPX: {
      sector: 'Equity Index',
      role: 'US Stock Market Benchmark',
      description: 'The S&P 500 is a stock market index tracking the stock performance of 500 of the largest US publicly traded companies, representing the broad health of the US equity market.'
    },
    NYSE: {
      sector: 'Equity Index',
      role: 'Broad Market Benchmark',
      description: 'The NYSE Composite is a broad-based stock index that covers all common stocks listed on the New York Stock Exchange, representing industrial, financial, and value equities.'
    },
    GOLD: {
      sector: 'Commodities',
      role: 'Safe-Haven Asset & Inflation Hedge',
      description: 'Gold is a precious metal that has served as a global standard of value and monetary reserve for millennia. It is the premier safe-haven asset during geopolitical and macroeconomic crises.'
    },
    WTI: {
      sector: 'Energy / Commodities',
      role: 'Global Energy Benchmark',
      description: 'West Texas Intermediate (WTI) is a grade of crude oil used as a benchmark in oil pricing. It is a critical driver of global inflation expectations and industrial energy costs.'
    },
    BCOM: {
      sector: 'Commodity Index',
      role: 'Broad Raw Material Tracker',
      description: 'The Bloomberg Commodity Index is a broadly diversified commodity index tracking futures contracts on physical commodities, reflecting broad raw material price trends.'
    },
    AAPL: {
      sector: 'Technology',
      role: 'Consumer Hardware and Software Pioneer',
      description: 'Apple Inc. designs, manufactures, and markets smartphones, personal computers, tablets, wearables, and accessories, alongside a high-margin services segment including the App Store and Apple Pay.'
    },
    MSFT: {
      sector: 'Technology',
      role: 'Enterprise Software & AI Integration Infrastructure',
      description: 'Microsoft Corp. is a global technology leader providing operating systems, productivity software (Office), cloud infrastructure (Azure), and leading-edge artificial intelligence systems.'
    },
    NVDA: {
      sector: 'Technology',
      role: 'AI Hardware and Semiconductor Standard',
      description: 'NVIDIA Corporation designs graphics processing units (GPUs) for gaming and professional markets, as well as system on a chip units for mobile computing and automotive, serving as the hardware backbone of AI.'
    },
    TSLA: {
      sector: 'Consumer Discretionary',
      role: 'Electric Vehicle & Clean Energy Pioneer',
      description: 'Tesla Inc. designs, develops, manufactures, sells, and leases fully electric vehicles, energy generation and storage systems, and offers services related to its products.'
    },
    AMZN: {
      sector: 'Technology / Consumer Discretionary',
      role: 'E-commerce & Cloud Computing Pioneer',
      description: 'Amazon.com Inc. is a multinational technology company focusing on e-commerce, cloud computing (AWS), online advertising, and digital streaming.'
    },
    META: {
      sector: 'Technology',
      role: 'Social Media Network & Metaverse Developer',
      description: 'Meta Platforms Inc. operates Facebook, Instagram, WhatsApp, and virtual reality ecosystems, while developing future social interaction technologies.'
    },
    GOOGL: {
      sector: 'Technology',
      role: 'Search Engine, Advertising & AI Pioneer',
      description: 'Alphabet Inc. is a holding company whose largest subsidiary is Google, the global leader in search, digital advertising, operating systems (Android), and YouTube.'
    },
    'BRK.B': {
      sector: 'Financials',
      role: 'Value Investment & Conglomerate Vehicle',
      description: 'Berkshire Hathaway Inc. is a multinational conglomerate holding company overseen by Warren Buffett, investing in insurance, rail transport, energy generation, manufacturing, and retail.'
    },
    JPM: {
      sector: 'Financials',
      role: 'Global Investment and Commercial Banking Leader',
      description: 'JPMorgan Chase & Co. is a leading global financial services firm and the largest bank in the United States, active in investment banking, asset management, and retail banking.'
    },
    LLY: {
      sector: 'Healthcare',
      role: 'Pharmaceutical & Biotech Innovator',
      description: 'Eli Lilly and Company discovers, develops, and markets human pharmaceuticals worldwide, notably leading in diabetes, obesity therapeutics, and oncology treatments.'
    },
    WMT: {
      sector: 'Consumer Staples',
      role: 'Global Retail and Supply Chain Leader',
      description: 'Walmart Inc. operates retail, wholesale, and other units worldwide, serving as the world\'s largest company by revenue and a benchmark for consumer spending.'
    },
    XOM: {
      sector: 'Energy',
      role: 'Oil & Gas Exploration and Refining Giant',
      description: 'Exxon Mobil Corporation is an American multinational oil and gas corporation and the largest direct descendant of John D. Rockefeller\'s Standard Oil.'
    }
  };

  const assetId = id.toUpperCase();
  if (profiles[assetId]) {
    return profiles[assetId];
  }

  // Fallback for dynamic assets
  let sector = 'Equities';
  let role = 'Publicly Traded Enterprise';
  let description = `${name} (${id}) is a publicly traded company tracked in the dynamic asset universe. It represents a component of the broad market index.`;

  if (category === 'crypto') {
    sector = 'Cryptocurrency';
    role = 'Digital Asset Protocol';
    description = `${name} (${id}) is a decentralized digital asset and cryptographic protocol operating within the digital economy.`;
  } else if (category === 'commodity') {
    sector = 'Commodities';
    role = 'Physical Resource Commodity';
    description = `${name} (${id}) is an industrial commodity tracked as a gauge of global supply chain demand and raw material pricing.`;
  }

  return { sector, role, description };
}


// -------------------------------------------------------------
// API Route 2: Get detailed asset metrics, historical data, and annotations
// -------------------------------------------------------------
app.get('/api/assets/:id', async (req, res) => {
  try {
    await dataEngine.refreshLivePrices();
    precomputeRecommendations();
    const assetId = req.params.id.toUpperCase();
    let asset = dataEngine.assets.find(a => a.id === assetId) || dataEngine.universeAssets.find(a => a.id === assetId);

    if (!asset) {
      console.log(`🔍 Dynamic Tracking Triggered for: ${assetId}`);
      // 1. Try to fetch 2-year daily history from Yahoo Finance
      const yahooUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${assetId}?interval=1d&range=2y`;
      try {
        const yahooRes = await fetch(yahooUrl, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.3'
          }
        });
        if (yahooRes.status !== 200) {
          return res.status(404).json({ error: `Asset ${assetId} not found on Yahoo Finance` });
        }
        
        const data = await yahooRes.json() as any;
        const result = data.chart?.result?.[0];
        const meta = result?.meta;
        if (!result || !meta) {
          return res.status(404).json({ error: `Asset ${assetId} metadata not found on Yahoo Finance` });
        }

        // 2. Extract company name and exchange to set properties
        const longName = meta.longName || meta.shortName || `${assetId} Inc.`;
        const exchange = meta.exchangeName || '';
        const parentIndex = (exchange.toLowerCase().includes('nasdaq') || exchange.toLowerCase().includes('nms')) ? 'NASDAQ' : 'NYSE';
        
        const currentPrice = meta.regularMarketPrice || 100;
        
        // 3. Create AssetInfo object
        const newAsset = {
          id: assetId,
          name: longName,
          category: 'equity' as const,
          basePrice: currentPrice,
          volatility: 0.015,
          drift: 0.0002,
          parentIndex
        };

        // 4. Extract price history candles
        const timestamps = result.timestamp || [];
        const opens = result.indicators?.quote?.[0]?.open || [];
        const highs = result.indicators?.quote?.[0]?.high || [];
        const lows = result.indicators?.quote?.[0]?.low || [];
        const closes = result.indicators?.quote?.[0]?.close || [];
        const volumes = result.indicators?.quote?.[0]?.volume || [];

        const newCandles: Candle[] = [];
        for (let i = 0; i < timestamps.length; i++) {
          const t = timestamps[i];
          const dStr = new Date(t * 1000).toISOString().split('T')[0];
          const o = opens[i];
          const h = highs[i];
          const l = lows[i];
          const c = closes[i];
          const v = volumes[i];

          if (o !== null && h !== null && l !== null && c !== null && v !== null &&
              o !== undefined && h !== undefined && l !== undefined && c !== undefined && v !== undefined &&
              !isNaN(o) && !isNaN(h) && !isNaN(l) && !isNaN(c) && !isNaN(v)) {
            
            // Synthetic whale flow / trader sentiment calculations
            const retSig = (c - o) / (o || 1);
            const noise1 = Math.sin(i * 0.15) * 15 + Math.cos(i * 0.05) * 10;
            const noise2 = Math.cos(i * 0.12) * 12 + Math.sin(i * 0.08) * 8;
            
            let whaleAccum = Math.max(5, Math.min(98, Math.round(50 + retSig * 400 + noise1)));
            let proSentiment = Math.max(5, Math.min(98, Math.round(52 + retSig * 300 + noise2)));

            newCandles.push({
              date: dStr,
              open: parseFloat(o.toFixed(2)),
              high: parseFloat(h.toFixed(2)),
              low: parseFloat(l.toFixed(2)),
              close: parseFloat(c.toFixed(2)),
              volume: v,
              whaleAccumulation: whaleAccum,
              proTraderSentiment: proSentiment
            });
          }
        }

        if (newCandles.length < 30) {
          return res.status(400).json({ error: `Asset ${assetId} has insufficient historical data (${newCandles.length} candles)` });
        }

        // 5. Append to universe and priceData
        dataEngine.universeAssets.push(newAsset);
        dataEngine.priceData[assetId] = newCandles;
        asset = newAsset;

        console.log(`✅ Successfully loaded and tracked dynamic asset ${assetId} (${longName})!`);
        
        // 6. Precompute recommendations again so that this asset has its ratings populated
        precomputeRecommendations();
      } catch (err: any) {
        console.error(`Error loading dynamic asset ${assetId}:`, err.message);
        return res.status(500).json({ error: `Failed to load dynamic asset ${assetId}: ${err.message}` });
      }
    }

    const timeframe = req.query.timeframe === '1W' ? '1W' : '1D';

    let candles = dataEngine.priceData[assetId];
    if (timeframe === '1W') {
      candles = aggregateToWeekly(candles);
    }
    const n = candles.length;
    const currentCandle = candles[n - 1];

    // Compute technicals
    const closes = candles.map(c => c.close);
    const sma20 = Technicals.SMA(closes, 20);
    const sma50 = Technicals.SMA(closes, 50);
    const sma100 = Technicals.SMA(closes, 100);
    const sma200 = Technicals.SMA(closes, 200);
    const ema20 = Technicals.EMA(closes, 20);
    const ema50 = Technicals.EMA(closes, 50);
    const macdData = Technicals.MACD(closes);
    const rsi = Technicals.RSI(closes, 14);
    const stochRsi = Technicals.StochasticRSI(rsi, 14);
    const roc = Technicals.ROC(closes, 12);
    const atr = Technicals.ATR(candles, 14);
    const bb = Technicals.BollingerBands(closes, 20, 2);
    const volumeProfile = Technicals.VolumeProfile(candles.slice(Math.max(0, n - 100)), 12); // Volume profile on last 100 days/weeks

    // Chart Pattern Detection
    const patterns = ChartPatternDetector.detect(candles);

    // Machine Learning Prediction
    const currentFeatures = [
      rsi[n - 1],
      macdData.macd[n - 1] - macdData.signalLine[n - 1],
      bb.width[n - 1],
      atr[n - 1] / currentCandle.close
    ];
    const currentMacro = [
      dataEngine.macroData[n - 1].vix,
      dataEngine.macroData[n - 1].dxy,
      dataEngine.macroData[n - 1].liquidity
    ];

    const mlOutput = PredictiveEnsemble.trainAndPredict(
      candles,
      currentFeatures,
      dataEngine.macroData,
      currentMacro,
      assetId
    );

    // Active Regime
    const activeRegimeInfo = RegimeDetector.classifyRegime(dataEngine.macroData[n - 1]);

    // Anomaly Detection
    const anomalies = AnomalyDetector.detectAnomalies(candles, asset.category, 30);

    // Granger Causality proxy check
    let leadLagInfluence = 0;
    const assetRet = closes.map((c, i) => i === 0 ? 0 : (c - closes[i - 1]) / closes[i - 1]);
    if (asset.category === 'crypto') {
      const nasdaqCandles = dataEngine.priceData['NASDAQ'];
      const ndxCloses = nasdaqCandles.map(c => c.close);
      const ndxRet = ndxCloses.map((c, i) => i === 0 ? 0 : (c - ndxCloses[i - 1]) / ndxCloses[i - 1]);
      const granger = VectorAutoregression.grangerCausality(ndxRet, assetRet, 'NASDAQ', asset.id, 2);
      if (granger.causalLink) {
        leadLagInfluence = granger.fStat * 8;
      }
    } else if (asset.id === 'GOLD') {
      // Check WTI crude lead influence
      const wtiCandles = dataEngine.priceData['WTI'];
      const wtiCloses = wtiCandles.map(c => c.close);
      const wtiRet = wtiCloses.map((c, i) => i === 0 ? 0 : (c - wtiCloses[i - 1]) / wtiCloses[i - 1]);
      const granger = VectorAutoregression.grangerCausality(wtiRet, assetRet, 'WTI', asset.id, 2);
      if (granger.causalLink) {
        leadLagInfluence = granger.fStat * 8;
      }
    }

    // Recommendation Engine
    const rec = RecommendationEngine.generateRecommendation(
      asset.id,
      asset.category,
      candles,
      patterns,
      mlOutput,
      activeRegimeInfo.name,
      dataEngine.newsData,
      leadLagInfluence,
      anomalies
    );

    // Granger Causality Network data specific to the asset
    const assetGrangerMatrix: GrangerResult[] = [];

    // Add baseline macro relationships (NASDAQ -> BTC, WTI Crude -> GOLD, WTI Crude -> CPI, BTC -> NASDAQ)
    const ndxCloses = dataEngine.priceData['NASDAQ'].map(c => c.close);
    const btcCloses = dataEngine.priceData['BTC'].map(c => c.close);
    const wtiCloses = dataEngine.priceData['WTI'].map(c => c.close);
    const goldCloses = dataEngine.priceData['GOLD'].map(c => c.close);

    const ndxRet = ndxCloses.map((c, i) => i === 0 ? 0 : (c - ndxCloses[i - 1]) / ndxCloses[i - 1]);
    const btcRet = btcCloses.map((c, i) => i === 0 ? 0 : (c - btcCloses[i - 1]) / btcCloses[i - 1]);
    const wtiRet = wtiCloses.map((c, i) => i === 0 ? 0 : (c - wtiCloses[i - 1]) / wtiCloses[i - 1]);
    const goldRet = goldCloses.map((c, i) => i === 0 ? 0 : (c - goldCloses[i - 1]) / goldCloses[i - 1]);

    const cpiValues = dataEngine.macroData.map(m => m.cpi);
    const cpiChanges = cpiValues.map((c, i) => i === 0 ? 0 : c - cpiValues[i - 1]);

    // Standard baseline links (only add if selected asset isn't duplicating)
    assetGrangerMatrix.push(VectorAutoregression.grangerCausality(ndxRet, btcRet, 'NASDAQ', 'BTC', 2));
    assetGrangerMatrix.push(VectorAutoregression.grangerCausality(wtiRet, goldRet, 'WTI Crude', 'Gold', 2));
    assetGrangerMatrix.push(VectorAutoregression.grangerCausality(wtiRet, cpiChanges, 'WTI Crude', 'CPI Inflation', 2));
    assetGrangerMatrix.push(VectorAutoregression.grangerCausality(btcRet, ndxRet, 'BTC', 'NASDAQ', 2));

    // Dynamic asset specific links
    // 1. Parent index leads the asset (e.g., NASDAQ -> AAPL, SPX -> AMZN, etc.)
    if (asset.parentIndex) {
      const parentCandles = dataEngine.priceData[asset.parentIndex];
      if (parentCandles) {
        const parentCloses = parentCandles.map(c => c.close);
        const parentRet = parentCloses.map((c, i) => i === 0 ? 0 : (c - parentCloses[i - 1]) / parentCloses[i - 1]);
        assetGrangerMatrix.push(VectorAutoregression.grangerCausality(parentRet, assetRet, asset.parentIndex, asset.id, 2));
      }
    }

    // 2. NASDAQ leads crypto (e.g. NASDAQ -> SOL or ETH or BTC)
    if (asset.category === 'crypto' && asset.id !== 'BTC') {
      assetGrangerMatrix.push(VectorAutoregression.grangerCausality(ndxRet, assetRet, 'NASDAQ', asset.id, 2));
      assetGrangerMatrix.push(VectorAutoregression.grangerCausality(btcRet, assetRet, 'BTC', asset.id, 2));
    }

    // 3. WTI Crude leads other commodities (e.g. WTI Crude -> BCOM)
    if (asset.category === 'commodity' && asset.id !== 'GOLD' && asset.id !== 'WTI') {
      assetGrangerMatrix.push(VectorAutoregression.grangerCausality(wtiRet, assetRet, 'WTI Crude', asset.id, 2));
    }

    // 4. CPI inflation leading asset returns
    if (asset.id !== 'NASDAQ' && asset.id !== 'BTC' && asset.id !== 'GOLD' && asset.id !== 'WTI') {
      assetGrangerMatrix.push(VectorAutoregression.grangerCausality(cpiChanges, assetRet, 'CPI Inflation', asset.id, 2));
    }

    const sliceStart = Math.max(0, n - 120);

    res.json({
      info: {
        id: asset.id,
        name: asset.name,
        category: asset.category,
        currentPrice: currentCandle.close,
        open: currentCandle.open,
        high: currentCandle.high,
        low: currentCandle.low,
        volume: currentCandle.volume,
        fundingRate: currentCandle.fundingRate,
        liquidations: currentCandle.liquidations,
        profile: getAssetProfile(asset.id, asset.name, asset.category)
      },
      candles: candles.slice(sliceStart), // Send sliced candles for interactive charts
      technicals: {
        sma20: sma20.slice(sliceStart),
        sma50: sma50.slice(sliceStart),
        sma100: sma100.slice(sliceStart),
        sma200: sma200.slice(sliceStart),
        ema20: ema20.slice(sliceStart),
        ema50: ema50.slice(sliceStart),
        macd: macdData.macd.slice(sliceStart),
        macdSignal: macdData.signalLine.slice(sliceStart),
        macdHist: macdData.histogram.slice(sliceStart),
        rsi: rsi.slice(sliceStart),
        stochRsiK: stochRsi.k.slice(sliceStart),
        stochRsiD: stochRsi.d.slice(sliceStart),
        roc: roc.slice(sliceStart),
        atr: atr.slice(sliceStart),
        bbUpper: bb.upper.slice(sliceStart),
        bbMiddle: bb.middle.slice(sliceStart),
        bbLower: bb.lower.slice(sliceStart),
        bbWidth: bb.width.slice(sliceStart),
        volumeProfile
      },
      patterns: patterns.filter(p => p.endIndex >= sliceStart),
      ml: {
        expectedReturnMin: mlOutput.expectedReturnMin,
        expectedReturnMax: mlOutput.expectedReturnMax,
        directionProb: mlOutput.nextWeekDirectionProb,
        confidence: mlOutput.confidence,
        shap: mlOutput.shapAttribution
      },
      anomalies: anomalies.filter(a => a.date >= candles[sliceStart].date),
      recommendation: rec,
      grangerMatrix: assetGrangerMatrix
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// -------------------------------------------------------------
// API Route 3: Macro Indicators and Granger Causality Matrix
// -------------------------------------------------------------
app.get('/api/macro', (req, res) => {
  try {
    const n = dataEngine.macroData.length;
    const currentMacro = dataEngine.macroData[n - 1];
    const activeRegime = RegimeDetector.classifyRegime(currentMacro);

    // Compute Granger causality relationships across major indicators
    // We analyze: NASDAQ returns -> BTC returns, WTI returns -> GOLD returns, WTI returns -> CPI returns
    const grangerMatrix: GrangerResult[] = [];

    const ndxCloses = dataEngine.priceData['NASDAQ'].map(c => c.close);
    const btcCloses = dataEngine.priceData['BTC'].map(c => c.close);
    const wtiCloses = dataEngine.priceData['WTI'].map(c => c.close);
    const goldCloses = dataEngine.priceData['GOLD'].map(c => c.close);

    const ndxRet = ndxCloses.map((c, i) => i === 0 ? 0 : (c - ndxCloses[i - 1]) / ndxCloses[i - 1]);
    const btcRet = btcCloses.map((c, i) => i === 0 ? 0 : (c - btcCloses[i - 1]) / btcCloses[i - 1]);
    const wtiRet = wtiCloses.map((c, i) => i === 0 ? 0 : (c - wtiCloses[i - 1]) / wtiCloses[i - 1]);
    const goldRet = goldCloses.map((c, i) => i === 0 ? 0 : (c - goldCloses[i - 1]) / goldCloses[i - 1]);

    const cpiValues = dataEngine.macroData.map(m => m.cpi);
    const cpiChanges = cpiValues.map((c, i) => i === 0 ? 0 : c - cpiValues[i - 1]);

    // Check causality links
    grangerMatrix.push(VectorAutoregression.grangerCausality(ndxRet, btcRet, 'NASDAQ', 'BTC', 2));
    grangerMatrix.push(VectorAutoregression.grangerCausality(wtiRet, goldRet, 'WTI Crude', 'Gold', 2));
    grangerMatrix.push(VectorAutoregression.grangerCausality(wtiRet, cpiChanges, 'WTI Crude', 'CPI Inflation', 2));
    grangerMatrix.push(VectorAutoregression.grangerCausality(btcRet, ndxRet, 'BTC', 'NASDAQ', 2)); // Should fail/be weak

    res.json({
      regime: activeRegime,
      metrics: {
        date: currentMacro.date,
        cpi: currentMacro.cpi,
        fedFundsRate: currentMacro.fedFundsRate,
        dxy: currentMacro.dxy,
        vix: currentMacro.vix,
        wti: currentMacro.wti,
        liquidity: currentMacro.liquidity
      },
      grangerMatrix
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

function getAssetSpecificHeadline(
  assetId: string,
  assetName: string,
  category: string,
  sentiment: number,
  index: number
): string {
  const isPositive = sentiment > 0.15;
  const isNegative = sentiment < -0.15;

  const cryptoTemplates: Record<string, { pos: string[]; neg: string[]; neu: string[] }> = {
    BTC: {
      pos: [
        "SEC approves spot Bitcoin ETF, triggering wave of institutional accumulation.",
        "Bitcoin hash rate reaches record high, securing network security and investor confidence.",
        "Halving supply shock begins to impact exchanges as liquid Bitcoin supply drops to lows.",
        "Corporate treasuries report increased Bitcoin allocations as inflation hedge.",
        "Bitcoin lightning network capacity reaches new milestones, boosting transaction speeds."
      ],
      neg: [
        "Regulatory crackdown on Bitcoin miners sparks migration and temporary hash rate drop.",
        "Fears of government treasury liquidations trigger Bitcoin market volatility.",
        "High transaction fees on Bitcoin network lead to short-term congestion worries.",
        "SEC issues warning to retail investors on leveraged Bitcoin trading products.",
        "Bitcoin miner revenues plummet post-halving, raising concerns of network security costs."
      ],
      neu: [
        "Bitcoin price consolidates in tight range as traders await FOMC meeting interest rate decision.",
        "On-chain analysis shows stable accumulation of Bitcoin by long-term holders.",
        "Bitcoin options open interest reaches new highs, indicating hedge fund positioning.",
        "Bitcoin difficulty adjustment executes smoothly, maintaining block time targets.",
        "Analysts debate long-term correlation between Bitcoin and traditional macro assets."
      ]
    },
    ETH: {
      pos: [
        "Ethereum gas fees hit multi-year lows, accelerating Layer 2 rollup transaction volumes.",
        "Staking participation rate reaches all-time high, locking up significant ETH supply.",
        "Wall Street analysts project high demand for upcoming spot Ethereum ETF launches.",
        "Ethereum developer community completes major mainnet upgrade, boosting scalability.",
        "Corporate adoption of Ethereum blockchain for tokenized assets gains traction."
      ],
      neg: [
        "Concerns over centralizing forces in Ethereum liquid staking protocols raise security flags.",
        "Gas fee spikes during peak congestion periods drive retail users to alternative chains.",
        "SEC launches inquiry into decentralized finance protocols built on Ethereum.",
        "Large treasury transfers by early Ethereum founders spark temporary sell-off concerns.",
        "Layer 2 competition fragments liquidity, complicating Ethereum ecosystem user experience."
      ],
      neu: [
        "Ethereum trades sideways as market gauges impact of network upgrade completion.",
        "Staking yield rates hold steady, balancing validator counts and network issuance.",
        "Ethereum options open interest rises as traders prepare for macro policy updates.",
        "Developer discussions focus on next phase of Ethereum sharding roadmap.",
        "On-chain metrics show steady transaction volume across Ethereum decentralized applications."
      ]
    },
    SOL: {
      pos: [
        "Solana decentralized exchange volume surpasses Ethereum for three consecutive days.",
        "Solana Saga Chapter 2 pre-orders exceed 100k, showcasing mobile Web3 demand.",
        "Developer activity on Solana surges as network stability upgrades prove successful.",
        "Major institutional asset manager launches Solana trust fund for accredited investors.",
        "High-performance parallelized execution on Solana attracts enterprise tokenization pilots."
      ],
      neg: [
        "Network congestion issues temporarily delay Solana transactions during high-volume launches.",
        "Concerns over validator client centralization raise resilience debates among developers.",
        "Regulatory scrutiny on Solana foundation's early distribution model creates caution.",
        "Large-scale liquidations of early backing entities pressure Solana market stability.",
        "Solana security audits flag potential vulnerabilities in newly deployed smart contract frameworks."
      ],
      neu: [
        "Solana price establishes solid support zone as network trading volume stabilizes.",
        "Solana foundation announces new global hackathon focusing on consumer applications.",
        "Solana validator rewards adjust according to pre-set inflation decay schedule.",
        "Solana developers release testnet updates for upcoming validator client version.",
        "Community debates fee structure changes to prevent Solana transaction spam."
      ]
    }
  };

  const equityTemplates: Record<string, { pos: string[]; neg: string[]; neu: string[] }> = {
    AAPL: {
      pos: [
        "Apple Inc. shares rise on strong iPhone sales beat and record services revenue.",
        "Apple Inc. unveils advanced on-device AI features, wowing Wall Street analysts.",
        "Supply chain improvements boost Apple Inc. profit margins across hardware segments.",
        "Apple Inc. announces massive $110B share buyback program and dividend increase.",
        "Consumer demand for premium Apple Inc. devices remains resilient in international markets."
      ],
      neg: [
        "Department of Justice files comprehensive antitrust lawsuit against Apple Inc.",
        "Declining hardware demand in Asian markets pressures Apple Inc. quarterly guidance.",
        "European Commission levies multi-billion dollar fine against Apple Inc. App Store rules.",
        "Supply chain disruptions delay shipment targets for Apple Inc. next-gen devices.",
        "Apple Inc. faces patent infringement injunction, halting select device sales."
      ],
      neu: [
        "Apple Inc. schedules annual developer conference, with focus on software ecosystem.",
        "Analysts maintain neutral rating on Apple Inc. ahead of quarterly earnings release.",
        "Apple Inc. invests in renewable energy infrastructure to support data centers.",
        "Apple Inc. updates developer guidelines to comply with new regional regulations.",
        "Apple Inc. patent applications reveal long-term research into wearable health tech."
      ]
    },
    TSLA: {
      pos: [
        "Tesla Inc. vehicle deliveries beat analyst consensus, boosting stock price.",
        "Tesla Inc. receives regulatory approval for advanced autopilot testing in major markets.",
        "Energy storage deployment reaches record gigawatt-hours, driving Tesla Inc. growth.",
        "Tesla Inc. announces plans for a low-cost electric vehicle model, expanding target market.",
        "Gigafactory production efficiency hits new milestone, improving Tesla Inc. margins."
      ],
      neg: [
        "NHTSA expands probe into Tesla Inc. driver-assist system safety following incidents.",
        "Price cuts across vehicle models pressure Tesla Inc. gross profit margins.",
        "Production delays at European Gigafactory impact Tesla Inc. delivery timelines.",
        "Recall announcement affects hundreds of thousands of Tesla Inc. vehicles globally.",
        "Competition from low-cost EV manufacturers squeezes Tesla Inc. market share."
      ],
      neu: [
        "Tesla Inc. schedules shareholder meeting to vote on executive compensation package.",
        "Tesla Inc. prices vehicle models dynamically based on real-time inventory levels.",
        "Tesla Inc. expands Supercharger network access to third-party EV brands.",
        "Tesla Inc. files planning permission for Gigafactory expansion project.",
        "Analysts debate impact of autonomous driving timeline on Tesla Inc. valuation."
      ]
    },
    NVDA: {
      pos: [
        "NVIDIA Corp. reports spectacular revenue growth driven by insatiable AI chip demand.",
        "NVIDIA Corp. launches Blackwell GPU architecture, setting new benchmarks for AI training.",
        "Major cloud providers announce massive infrastructure deals using NVIDIA Corp. hardware.",
        "NVIDIA Corp. gross margins expand as enterprise software sales gain momentum.",
        "NVIDIA Corp. joins forces with leading robotics companies to deploy edge-AI chips."
      ],
      neg: [
        "Export restrictions could impact NVIDIA Corp. sales of advanced AI processors.",
        "Supply chain bottlenecks for high-bandwidth memory limit NVIDIA Corp. shipment capacity.",
        "Regulatory agencies scrutinize NVIDIA Corp. market dominance in AI hardware.",
        "Concerns over capital expenditure cuts by major tech companies pressure NVIDIA Corp.",
        "Competitors announce custom AI silicon, threatening NVIDIA Corp. long-term market share."
      ],
      neu: [
        "NVIDIA Corp. CEO delivers keynote address on future of accelerated computing.",
        "NVIDIA Corp. schedules stock split to increase accessibility for retail investors.",
        "NVIDIA Corp. expands developer program with open-source AI model libraries.",
        "NVIDIA Corp. collaborates with research institutes to advance climate modeling.",
        "Analysts debate sustainability of current hardware demand growth for NVIDIA Corp."
      ]
    },
    MSFT: {
      pos: [
        "Microsoft Corp. cloud revenue accelerates as Azure AI integrations boost demand.",
        "Microsoft Corp. enterprise software suite reports strong subscription growth.",
        "Microsoft Corp. completes high-profile gaming acquisition, expanding content library.",
        "Wall Street upgrades Microsoft Corp. target price on strong cash flow generation.",
        "Microsoft Corp. security division reports record annual revenue from enterprise clients."
      ],
      neg: [
        "Microsoft Corp. faces European Union antitrust probe over software bundling practices.",
        "Global cybersecurity breach exposes vulnerabilities in Microsoft Corp. cloud services.",
        "Enterprise IT spending slowdown flags potential headwind for Microsoft Corp. growth.",
        "Antitrust regulators challenge Microsoft Corp. partnership with AI research startup.",
        "Integration expenses from recent acquisitions weigh on Microsoft Corp. operating margin."
      ],
      neu: [
        "Microsoft Corp. hosts annual developer conference, detailing cloud software roadmap.",
        "Microsoft Corp. announces changes to licensing terms for regional cloud providers.",
        "Microsoft Corp. invests in long-term nuclear power purchase agreements for data centers.",
        "Microsoft Corp. publishes advisory on emerging cybersecurity threat trends.",
        "Analysts maintain buy rating on Microsoft Corp. citing recurring revenue strength."
      ]
    }
  };

  const commodityTemplates: Record<string, { pos: string[]; neg: string[]; neu: string[] }> = {
    GOLD: {
      pos: [
        "Gold prices surge as safe-haven demand accelerates amid rising geopolitical tensions.",
        "Global central bank gold purchases reach historic highs, supporting structural demand.",
        "Real interest rates decline, boosting attractiveness of non-yielding Gold assets.",
        "Fears of currency debasement drive retail investment into physical Gold bars and coins.",
        "Inflation expectations rise, reinforcing Gold status as the ultimate store of value."
      ],
      neg: [
        "Gold price drops as rising bond yields increase opportunity cost of holding metals.",
        "Strong economic growth data reduces investor demand for safe-haven Gold.",
        "Central bank signals aggressive monetary tightening, pressuring Gold prices.",
        "Outflows from gold-backed ETFs accelerate as capital rotates into risk assets.",
        "Gold mining cash costs rise, squeezing producer margins despite stable prices."
      ],
      neu: [
        "Gold trades in narrow range as market participants await key inflation index data.",
        "Jewelry demand stabilizes in major consumer markets, balancing investment flows.",
        "Gold ETF holdings remain flat, reflecting mixed investor sentiment.",
        "Mining companies report stable production volumes at main operations.",
        "Analysts debate impact of digital assets on long-term physical Gold demand."
      ]
    },
    WTI: {
      pos: [
        "WTI Crude prices barrel past key resistance on OPEC production cuts extension.",
        "US crude inventories draw down significantly more than expected, boosting WTI Crude.",
        "Geopolitical tensions in key transit corridors raise WTI Crude supply risk premium.",
        "Global energy demand outlook upgraded following positive manufacturing data.",
        "Refinery utilization rates hit multi-year highs, driving physical WTI Crude demand."
      ],
      neg: [
        "WTI Crude falls as US shale production reaches record-breaking daily volumes.",
        "Concerns over slowing global economic activity pressure WTI Crude demand outlook.",
        "OPEC+ members debate output hikes, raising fears of supply over-allocation.",
        "Rising crude inventory builds in key storage hubs pressure prompt WTI Crude prices.",
        "Electric vehicle adoption and efficiency gains flag long-term WTI Crude demand headwinds."
      ],
      neu: [
        "WTI Crude settles flat as market weighs supply risks against economic indicators.",
        "Energy Information Administration reports marginal changes in weekly inventory levels.",
        "OPEC+ ministerial committee schedules monitoring meeting, no policy change expected.",
        "Refinery maintenance season begins, temporarily lowering WTI Crude intake.",
        "WTI Crude futures curve structure indicates balanced spot and forward markets."
      ]
    }
  };

  // General fallbacks based on category if assetId is not pre-mapped
  const fallbackTemplates: Record<string, { pos: string[]; neg: string[]; neu: string[] }> = {
    crypto: {
      pos: [
        `Institutional inflow into ${assetId} accelerates, driving price momentum.`,
        `Development activity on ${assetName} network surges following core client release.`,
        `Major crypto payment gateway integrates ${assetId}, expanding retail utility.`,
        `Exchange reserves of ${assetId} fall to record lows, indicating strong holding conviction.`,
        `Governance community of ${assetName} approves upgrade to optimize network fees.`
      ],
      neg: [
        `Regulatory warnings regarding unlicensed trading of ${assetId} spark cautious selling.`,
        `Security audit flags potential smart contract risk in popular ${assetName} bridge.`,
        `Transaction fees on ${assetId} network rise sharply, impacting usability.`,
        `Liquidations of leveraged ${assetId} long positions exacerbate downward volatility.`,
        `Developer proposal to modify ${assetName} tokenomics triggers community division.`
      ],
      neu: [
        `${assetId} consolidates as trading volume stabilizes across major spot exchanges.`,
        `${assetName} foundation announces new developer grant program for layer 2 tools.`,
        `${assetId} mining hash rate and staking participation hold within normal bounds.`,
        `${assetName} protocol updates developer guidelines to improve app integration.`,
        `Analysts assess long-term supply issuance schedules for ${assetName} relative to peers.`
      ]
    },
    equity: {
      pos: [
        `${assetName} (${assetId}) reports strong quarterly earnings, beating expectations.`,
        `${assetName} (${assetId}) launches innovative new product line to positive reviews.`,
        `Wall Street analysts upgrade ${assetName} (${assetId}) outlook on margin expansion.`,
        `${assetName} (${assetId}) wins high-value government contract, securing long-term revenue.`,
        `Institutional investors increase stake in ${assetName} (${assetId}), citing strong moat.`
      ],
      neg: [
        `${assetName} (${assetId}) lowers full-year guidance due to supply chain issues.`,
        `Regulatory review of ${assetName} (${assetId}) acquisition raises antitrust concerns.`,
        `${assetName} (${assetId}) margins squeezed by rising material and labor costs.`,
        `Security incident at ${assetName} (${assetId}) prompts internal review.`,
        `Competitor pricing pressure impacts ${assetName} (${assetId}) product margins.`
      ],
      neu: [
        `${assetName} (${assetId}) prepares to host annual general meeting of shareholders.`,
        `Analysts maintain hold rating on ${assetName} (${assetId}) ahead of market open.`,
        `${assetName} (${assetId}) signs lease for new corporate headquarters.`,
        `Board of directors at ${assetName} (${assetId}) confirms routine executive transition.`,
        `Market evaluates impact of new trade tariffs on ${assetName} (${assetId}) supply chain.`
      ]
    },
    commodity: {
      pos: [
        `${assetName} (${assetId}) prices rise as supply constraints affect global export hubs.`,
        `Demand for ${assetName} (${assetId}) rises as manufacturing sector activity expands.`,
        `Adverse weather conditions disrupt mining and transport of ${assetName} (${assetId}).`,
        `Trade tariffs restrict supply of imported ${assetName} (${assetId}), raising domestic prices.`,
        `Warehouse inventory levels of ${assetName} (${assetId}) decline below historical averages.`
      ],
      neg: [
        `${assetName} (${assetId}) prices slide on projections of record global production.`,
        `Substitute materials decrease industrial demand for ${assetName} (${assetId}).`,
        `Lifting of trade embargoes increases global supply of ${assetName} (${assetId}).`,
        `Slowing factory output in major markets reduces ${assetName} (${assetId}) consumption.`,
        `Inventory stockpiles of ${assetName} (${assetId}) grow at key delivery warehouses.`
      ],
      neu: [
        `${assetName} (${assetId}) prices hold steady as market participants balance risks.`,
        `Monthly report from trade association shows stable ${assetName} (${assetId}) supply.`,
        `${assetName} (${assetId}) futures volume remains average for this time of year.`,
        `New extraction facility begins initial testing phases for ${assetName} (${assetId}).`,
        `Transportation routes reopen, normalizing deliveries of ${assetName} (${assetId}).`
      ]
    }
  };

  let templates = cryptoTemplates[assetId] || equityTemplates[assetId] || commodityTemplates[assetId];
  if (!templates) {
    templates = fallbackTemplates[category] || fallbackTemplates['equity'];
  }

  const list = isPositive ? templates.pos : isNegative ? templates.neg : templates.neu;
  const tIdx = index % list.length;
  return list[tIdx];
}

// -------------------------------------------------------------
// API Route 4: News Articles and 2D Cluster Embedding Coordinates
// -------------------------------------------------------------
app.get('/api/news', (req, res) => {
  try {
    const assetId = (req.query.assetId as string || 'BTC').toUpperCase();
    const asset = dataEngine.assets.find(a => a.id === assetId) || dataEngine.universeAssets.find(a => a.id === assetId);
    const assetName = asset ? asset.name : assetId;

    let categoryCounter = 0;

    const customizedNews = dataEngine.newsData.map(article => {
      let headline = article.headline;
      
      // Customize specific category news deterministically based on active asset
      if (article.assetClass === asset?.category) {
        headline = getAssetSpecificHeadline(
          assetId,
          assetName,
          asset.category,
          article.sentiment,
          categoryCounter++
        );
      }
      
      return {
        ...article,
        headline
      };
    });

    const { clusteredArticles } = clusterNews(customizedNews, 4);
    
    // Sort news by date (most recent first)
    const sortedArticles = [...clusteredArticles].sort((a, b) => b.date.localeCompare(a.date));

    // Calculate rolling news impact score over last 30 days
    const recentArticles = sortedArticles.slice(0, 15);
    const averageImpact = recentArticles.reduce((sum, a) => sum + a.impact, 0) / (recentArticles.length || 1);
    const averageSentiment = recentArticles.reduce((sum, a) => sum + a.sentiment, 0) / (recentArticles.length || 1);

    res.json({
      articles: sortedArticles.slice(0, 40), // send recent 40 articles
      allClusters: clusteredArticles.map(a => ({
        id: a.id,
        headline: a.headline,
        x: a.x,
        y: a.y,
        cluster: a.cluster,
        clusterLabel: a.clusterLabel,
        sentiment: a.sentiment,
        impact: a.impact,
        date: a.date,
        assetClass: a.assetClass
      })),
      summary: {
        impactScore: parseFloat(averageImpact.toFixed(1)),
        sentimentScore: parseFloat(averageSentiment.toFixed(2)),
        sentimentTrend: averageSentiment > 0.15 ? 'bullish' : averageSentiment < -0.15 ? 'bearish' : 'neutral'
      }
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// -------------------------------------------------------------
// API Route 5: Run Strategy backtester
// -------------------------------------------------------------
app.get('/api/backtest', (req, res) => {
  try {
    const backtestResult = BacktestEngine.runBacktest(dataEngine, 200);
    res.json(backtestResult);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});


// Helper function to generate recommendation for any asset (core or universe)
function getRecommendationForAsset(asset: any) {
  const candles = dataEngine.priceData[asset.id];
  if (!candles || candles.length === 0) return null;
  const n = candles.length;
  const currentCandle = candles[n - 1];
  const price = currentCandle.close;
  const prevPrice = n > 1 ? candles[n - 2].close : price;
  const change24h = parseFloat((((price - prevPrice) / prevPrice) * 100).toFixed(2));

  const closes = candles.map(c => c.close);
  const rsi = Technicals.RSI(closes, 14)[n - 1];
  const { macd, signalLine } = Technicals.MACD(closes);
  const macdHist = macd[n - 1] - signalLine[n - 1];
  const bb = Technicals.BollingerBands(closes);
  const atr = Technicals.ATR(candles);
  const normAtr = atr[n - 1] / price;

  const currentFeatures = [rsi, macdHist, bb.width[n - 1], normAtr];
  const currentMacro = [
    dataEngine.macroData[n - 1].vix,
    dataEngine.macroData[n - 1].dxy,
    dataEngine.macroData[n - 1].liquidity
  ];

  const mlOutput = PredictiveEnsemble.trainAndPredict(
    candles,
    currentFeatures,
    dataEngine.macroData,
    currentMacro,
    asset.id
  );

  const patterns = ChartPatternDetector.detect(candles);
  const activeRegime = RegimeDetector.classifyRegime(dataEngine.macroData[n - 1]).name;

  // Check lead-lag influence
  let leadLagInfluence = 0;
  const assetRet = closes.map((c, i) => i === 0 ? 0 : (c - closes[i - 1]) / closes[i - 1]);
  if (asset.parentIndex) {
    const parentCandles = dataEngine.priceData[asset.parentIndex];
    if (parentCandles) {
      const parentCloses = parentCandles.map(c => c.close);
      const parentRet = parentCloses.map((c, i) => i === 0 ? 0 : (c - parentCloses[i - 1]) / parentCloses[i - 1]);
      const granger = VectorAutoregression.grangerCausality(parentRet, assetRet, asset.parentIndex, asset.id, 2);
      if (granger.causalLink) {
        leadLagInfluence = granger.fStat * 8;
      }
    }
  } else if (asset.category === 'crypto') {
    const nasdaqCandles = dataEngine.priceData['NASDAQ'];
    if (nasdaqCandles) {
      const ndxCloses = nasdaqCandles.map(c => c.close);
      const ndxRet = ndxCloses.map((c, i) => i === 0 ? 0 : (c - ndxCloses[i - 1]) / ndxCloses[i - 1]);
      const granger = VectorAutoregression.grangerCausality(ndxRet, assetRet, 'NASDAQ', asset.id, 2);
      if (granger.causalLink) {
        leadLagInfluence = granger.fStat * 8;
      }
    }
  }

  const anomalies = AnomalyDetector.detectAnomalies(candles, asset.category, 30);
  const rec = RecommendationEngine.generateRecommendation(
    asset.id,
    asset.category,
    candles,
    patterns,
    mlOutput,
    activeRegime,
    dataEngine.newsData,
    leadLagInfluence,
    anomalies
  );

  return {
    id: asset.id,
    name: asset.name,
    category: asset.category,
    parentIndex: asset.parentIndex,
    price,
    change24h,
    rating: rec.rating,
    score: rec.score,
    technicalScore: rec.technicalScore,
    mlScore: rec.mlScore,
    macroScore: rec.macroScore,
    newsScore: rec.newsScore,
    crossAssetScore: rec.crossAssetScore,
    whaleScore: rec.whaleScore,
    anomalyScore: rec.anomalyScore,
    confidence: rec.confidence,
    suggestedEntry: rec.suggestedEntry,
    takeProfit: rec.takeProfit,
    stopLoss: rec.stopLoss,
    rationale: rec.rationale,
    explanation: rec.explanation
  };
}

let cachedRecommendations: any[] = [];
let recommendationsLoaded = false;

function precomputeRecommendations() {
  console.log('🔄 Pre-computing buy recommendations for all assets...');
  
  // Filter out index assets as they are not individual investable assets
  const nonIndexAssets = [...dataEngine.assets, ...dataEngine.universeAssets].filter(
    asset => !['NASDAQ', 'SPX', 'NYSE', 'BCOM'].includes(asset.id)
  );

  const results: any[] = [];
  for (const asset of nonIndexAssets) {
    try {
      const rec = getRecommendationForAsset(asset);
      if (rec) {
        results.push(rec);
      }
    } catch (e: any) {
      console.error(`[Precompute] Error calculating recommendation for ${asset.id}:`, e.message);
    }
  }

  cachedRecommendations = results;
  recommendationsLoaded = true;
  console.log(`✅ Pre-computed recommendations for ${results.length} assets!`);
}

// Route to get the top 5 strongest buy recommendations
app.get('/api/recommendations/top', async (req, res) => {
  try {
    await dataEngine.refreshLivePrices();
    precomputeRecommendations();

    // Filter for only Buy and Strong Buy ratings first
    let selected = cachedRecommendations.filter(r => r.rating === 'Buy' || r.rating === 'Strong Buy');
    
    // Sort by unified score descending
    selected = [...selected].sort((a, b) => b.score - a.score);

    // If we have fewer than 5 buys, fill the rest with the highest scoring Holds
    if (selected.length < 5) {
      const remainingCount = 5 - selected.length;
      const alreadySelectedIds = new Set(selected.map(s => s.id));
      
      const holds = cachedRecommendations
        .filter(r => !alreadySelectedIds.has(r.id))
        .sort((a, b) => b.score - a.score);
        
      selected = [...selected, ...holds.slice(0, remainingCount)];
    }

    res.json(selected.slice(0, 5));
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

async function startServer() {
  await dataEngine.initialize();
  
  // Pre-calculate recommendations in background
  setTimeout(() => {
    precomputeRecommendations();
  }, 100);

  // Set up 30-second interval for background price feed and recommendation refresh
  setInterval(async () => {
    try {
      await dataEngine.refreshLivePrices(true); // force live update in background
      precomputeRecommendations();
    } catch (e: any) {
      console.error('[Background Refresh] Error refreshing prices and recommendations:', e.message);
    }
  }, 30000);

  app.listen(PORT, () => {
    console.log(`📡 MacroSignal Radar Pro Backend running on http://localhost:${PORT}`);
  });
}
startServer();
