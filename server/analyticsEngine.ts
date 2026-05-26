import { Candle, MacroDataPoint, NewsArticle } from './dataEngine.js';

// ==========================================
// 1. Matrix Math Utility Functions (for OLS/VAR)
// ==========================================
export class MatrixMath {
  static transpose(matrix: number[][]): number[][] {
    const rows = matrix.length;
    const cols = matrix[0].length;
    const result: number[][] = Array(cols).fill(0).map(() => Array(rows).fill(0));
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        result[c][r] = matrix[r][c];
      }
    }
    return result;
  }

  static multiply(A: number[][], B: number[][]): number[][] {
    const rA = A.length;
    const cA = A[0].length;
    const cB = B[0].length;
    const result: number[][] = Array(rA).fill(0).map(() => Array(cB).fill(0));
    for (let i = 0; i < rA; i++) {
      for (let j = 0; j < cB; j++) {
        let sum = 0;
        for (let k = 0; k < cA; k++) {
          sum += A[i][k] * B[k][j];
        }
        result[i][j] = sum;
      }
    }
    return result;
  }

  static multiplyVector(A: number[][], x: number[]): number[] {
    const rows = A.length;
    const cols = A[0].length;
    const result: number[] = Array(rows).fill(0);
    for (let i = 0; i < rows; i++) {
      let sum = 0;
      for (let j = 0; j < cols; j++) {
        sum += A[i][j] * x[j];
      }
      result[i] = sum;
    }
    return result;
  }

  // Gauss-Jordan elimination to compute inverse matrix
  static invert(matrix: number[][]): number[][] | null {
    const n = matrix.length;
    // Create augmented matrix [A | I]
    const aug = matrix.map((row, i) => {
      const augRow = [...row];
      for (let j = 0; j < n; j++) {
        augRow.push(i === j ? 1 : 0);
      }
      return augRow;
    });

    for (let i = 0; i < n; i++) {
      // Find pivot
      let maxRow = i;
      for (let r = i + 1; r < n; r++) {
        if (Math.abs(aug[r][i]) > Math.abs(aug[maxRow][i])) {
          maxRow = r;
        }
      }

      // Swap rows
      const temp = aug[i];
      aug[i] = aug[maxRow];
      aug[maxRow] = temp;

      // Pivot element
      const pivot = aug[i][i];
      if (Math.abs(pivot) < 1e-10) return null; // Singular matrix

      // Divide row by pivot
      for (let j = i; j < 2 * n; j++) {
        aug[i][j] /= pivot;
      }

      // Eliminate pivot in other rows
      for (let r = 0; r < n; r++) {
        if (r !== i) {
          const factor = aug[r][i];
          for (let j = i; j < 2 * n; j++) {
            aug[r][j] -= factor * aug[i][j];
          }
        }
      }
    }

    // Extract inverse part
    return aug.map(row => row.slice(n));
  }

  // Solves OLS equation: beta = (X^T * X)^-1 * X^T * y
  static solveOLS(X: number[][], y: number[]): number[] | null {
    const Xt = this.transpose(X);
    const XtX = this.multiply(Xt, X);
    const invXtX = this.invert(XtX);
    if (!invXtX) return null;

    // Convert y to a column matrix
    const yCol = y.map(val => [val]);
    const Xty = this.multiply(Xt, yCol);
    const betaCol = this.multiply(invXtX, Xty);

    return betaCol.map(row => row[0]);
  }
}

// ==========================================
// 2. Technical Analysis Calculations
// ==========================================
export class Technicals {
  static SMA(data: number[], period: number): number[] {
    const result: number[] = Array(data.length).fill(0);
    let sum = 0;
    for (let i = 0; i < data.length; i++) {
      sum += data[i];
      if (i >= period) {
        sum -= data[i - period];
        result[i] = sum / period;
      } else {
        result[i] = sum / (i + 1);
      }
    }
    return result;
  }

  static EMA(data: number[], period: number): number[] {
    const result: number[] = Array(data.length).fill(0);
    if (data.length === 0) return result;
    const k = 2 / (period + 1);
    result[0] = data[0];
    for (let i = 1; i < data.length; i++) {
      result[i] = data[i] * k + result[i - 1] * (1 - k);
    }
    return result;
  }

  static MACD(data: number[], fast = 12, slow = 26, signal = 9): {
    macd: number[];
    signalLine: number[];
    histogram: number[];
  } {
    const fastEma = this.EMA(data, fast);
    const slowEma = this.EMA(data, slow);
    const macd: number[] = [];
    for (let i = 0; i < data.length; i++) {
      macd.push(fastEma[i] - slowEma[i]);
    }
    const signalLine = this.EMA(macd, signal);
    const histogram = macd.map((val, i) => val - signalLine[i]);

    return { macd, signalLine, histogram };
  }

  static RSI(data: number[], period = 14): number[] {
    const rsi: number[] = Array(data.length).fill(50);
    if (data.length <= period) return rsi;

    let avgGain = 0;
    let avgLoss = 0;

    // First RSI step
    for (let i = 1; i <= period; i++) {
      const change = data[i] - data[i - 1];
      if (change > 0) {
        avgGain += change;
      } else {
        avgLoss += Math.abs(change);
      }
    }

    avgGain /= period;
    avgLoss /= period;
    rsi[period] = avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss);

    // Smooth subsequent periods
    for (let i = period + 1; i < data.length; i++) {
      const change = data[i] - data[i - 1];
      const gain = change > 0 ? change : 0;
      const loss = change < 0 ? Math.abs(change) : 0;

      avgGain = (avgGain * (period - 1) + gain) / period;
      avgLoss = (avgLoss * (period - 1) + loss) / period;

      rsi[i] = avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss);
    }

    return rsi;
  }

  static StochasticRSI(rsi: number[], period = 14): { k: number[]; d: number[] } {
    const k: number[] = Array(rsi.length).fill(50);
    const d: number[] = Array(rsi.length).fill(50);

    for (let i = period; i < rsi.length; i++) {
      const window = rsi.slice(i - period + 1, i + 1);
      const minRsi = Math.min(...window);
      const maxRsi = Math.max(...window);
      const denominator = maxRsi - minRsi;
      k[i] = denominator === 0 ? 50 : ((rsi[i] - minRsi) / denominator) * 100;
    }

    // Smooth K with a 3-period simple average to get D
    const dSmooth = 3;
    for (let i = period + dSmooth; i < k.length; i++) {
      let sumK = 0;
      for (let j = 0; j < dSmooth; j++) {
        sumK += k[i - j];
      }
      d[i] = sumK / dSmooth;
    }

    return { k, d };
  }

  static ATR(candles: Candle[], period = 14): number[] {
    const atr: number[] = Array(candles.length).fill(0);
    if (candles.length === 0) return atr;

    const tr: number[] = [candles[0].high - candles[0].low];
    for (let i = 1; i < candles.length; i++) {
      const h = candles[i].high;
      const l = candles[i].low;
      const prevClose = candles[i - 1].close;
      tr.push(Math.max(h - l, Math.abs(h - prevClose), Math.abs(l - prevClose)));
    }

    atr[period - 1] = tr.slice(0, period).reduce((sum, val) => sum + val, 0) / period;
    for (let i = period; i < candles.length; i++) {
      atr[i] = (atr[i - 1] * (period - 1) + tr[i]) / period;
    }

    // Fill earlier periods with average
    for (let i = 0; i < period - 1; i++) {
      atr[i] = atr[period - 1];
    }

    return atr;
  }

  static ADX(candles: Candle[], period = 14): number[] {
    const adx: number[] = Array(candles.length).fill(20);
    if (candles.length <= period * 2) return adx;

    const tr: number[] = [];
    const plusDM: number[] = [];
    const minusDM: number[] = [];

    for (let i = 1; i < candles.length; i++) {
      const h = candles[i].high;
      const l = candles[i].low;
      const prevH = candles[i - 1].high;
      const prevL = candles[i - 1].low;
      const prevClose = candles[i - 1].close;

      tr.push(Math.max(h - l, Math.abs(h - prevClose), Math.abs(l - prevClose)));

      const upMove = h - prevH;
      const downMove = prevL - l;

      if (upMove > downMove && upMove > 0) {
        plusDM.push(upMove);
      } else {
        plusDM.push(0);
      }

      if (downMove > upMove && downMove > 0) {
        minusDM.push(downMove);
      } else {
        minusDM.push(0);
      }
    }

    // Smooth indicators using Wilder's technique
    const smoothedTR: number[] = Array(candles.length).fill(0);
    const smoothedPlusDM: number[] = Array(candles.length).fill(0);
    const smoothedMinusDM: number[] = Array(candles.length).fill(0);

    let trSum = tr.slice(0, period).reduce((s, v) => s + v, 0);
    let plusSum = plusDM.slice(0, period).reduce((s, v) => s + v, 0);
    let minusSum = minusDM.slice(0, period).reduce((s, v) => s + v, 0);

    smoothedTR[period] = trSum;
    smoothedPlusDM[period] = plusSum;
    smoothedMinusDM[period] = minusSum;

    for (let i = period + 1; i < candles.length; i++) {
      smoothedTR[i] = smoothedTR[i - 1] - (smoothedTR[i - 1] / period) + tr[i - 1];
      smoothedPlusDM[i] = smoothedPlusDM[i - 1] - (smoothedPlusDM[i - 1] / period) + plusDM[i - 1];
      smoothedMinusDM[i] = smoothedMinusDM[i - 1] - (smoothedMinusDM[i - 1] / period) + minusDM[i - 1];
    }

    const dx: number[] = Array(candles.length).fill(0);
    for (let i = period; i < candles.length; i++) {
      const plusDI = (smoothedPlusDM[i] / (smoothedTR[i] || 1)) * 100;
      const minusDI = (smoothedMinusDM[i] / (smoothedTR[i] || 1)) * 100;
      const diff = Math.abs(plusDI - minusDI);
      const sum = plusDI + minusDI;
      dx[i] = sum === 0 ? 0 : (diff / sum) * 100;
    }

    // Compute ADX (smooth DX)
    let dxSum = dx.slice(period, period * 2).reduce((s, v) => s + v, 0);
    adx[period * 2 - 1] = dxSum / period;

    for (let i = period * 2; i < candles.length; i++) {
      adx[i] = (adx[i - 1] * (period - 1) + dx[i]) / period;
    }

    return adx;
  }

  static BollingerBands(data: number[], period = 20, multiplier = 2): {
    upper: number[];
    middle: number[];
    lower: number[];
    width: number[];
  } {
    const middle = this.SMA(data, period);
    const upper: number[] = [];
    const lower: number[] = [];
    const width: number[] = [];

    for (let i = 0; i < data.length; i++) {
      if (i < period - 1) {
        upper.push(data[i]);
        lower.push(data[i]);
        width.push(0);
        continue;
      }

      const window = data.slice(i - period + 1, i + 1);
      const mean = middle[i];
      const variance = window.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / period;
      const stdDev = Math.sqrt(variance);

      const upperVal = mean + multiplier * stdDev;
      const lowerVal = mean - multiplier * stdDev;
      upper.push(upperVal);
      lower.push(lowerVal);
      width.push(upperVal === 0 ? 0 : (upperVal - lowerVal) / mean);
    }

    return { upper, middle, lower, width };
  }

  static ROC(data: number[], period = 12): number[] {
    const roc: number[] = Array(data.length).fill(0);
    for (let i = period; i < data.length; i++) {
      roc[i] = ((data[i] - data[i - period]) / (data[i - period] || 1)) * 100;
    }
    return roc;
  }

  static OBV(candles: Candle[]): number[] {
    const obv: number[] = Array(candles.length).fill(0);
    if (candles.length === 0) return obv;
    
    obv[0] = candles[0].volume;
    for (let i = 1; i < candles.length; i++) {
      const change = candles[i].close - candles[i - 1].close;
      if (change > 0) {
        obv[i] = obv[i - 1] + candles[i].volume;
      } else if (change < 0) {
        obv[i] = obv[i - 1] - candles[i].volume;
      } else {
        obv[i] = obv[i - 1];
      }
    }
    return obv;
  }

  static MFI(candles: Candle[], period = 14): number[] {
    const mfi: number[] = Array(candles.length).fill(50);
    if (candles.length <= period) return mfi;

    const typicalPrices = candles.map(c => (c.high + c.low + c.close) / 3);
    const rawMoneyFlows = typicalPrices.map((tp, i) => tp * candles[i].volume);

    for (let i = period; i < candles.length; i++) {
      let positiveFlow = 0;
      let negativeFlow = 0;

      for (let j = i - period + 1; j <= i; j++) {
        if (typicalPrices[j] > typicalPrices[j - 1]) {
          positiveFlow += rawMoneyFlows[j];
        } else if (typicalPrices[j] < typicalPrices[j - 1]) {
          negativeFlow += rawMoneyFlows[j];
        }
      }

      if (negativeFlow === 0) {
        mfi[i] = 100;
      } else {
        const moneyRatio = positiveFlow / negativeFlow;
        mfi[i] = 100 - 100 / (1 + moneyRatio);
      }
    }

    // Fill earlier values with the first calculated MFI value
    for (let i = 0; i < period; i++) {
      mfi[i] = mfi[period];
    }

    return mfi;
  }

  // Volume Profile (Volume at Price nodes)
  static VolumeProfile(candles: Candle[], bins = 15): { price: number; volume: number }[] {
    if (candles.length === 0) return [];
    const closes = candles.map(c => c.close);
    const minPrice = Math.min(...closes);
    const maxPrice = Math.max(...closes);
    const step = (maxPrice - minPrice) / bins;

    const profile = Array(bins).fill(0).map((_, i) => ({
      price: parseFloat((minPrice + i * step + step / 2).toFixed(2)),
      volume: 0
    }));

    for (const c of candles) {
      let binIdx = Math.floor((c.close - minPrice) / (step || 1));
      if (binIdx >= bins) binIdx = bins - 1;
      if (binIdx < 0) binIdx = 0;
      profile[binIdx].volume += c.volume;
    }

    return profile;
  }
}

// ==========================================
// 3. Automatic Chart Pattern Detection
// ==========================================
export interface ChartPattern {
  name: string;
  startIndex: number;
  endIndex: number;
  type: 'bullish' | 'bearish' | 'neutral';
  meta?: any;
}

export class ChartPatternDetector {
  static detect(candles: Candle[]): ChartPattern[] {
    const patterns: ChartPattern[] = [];
    const n = candles.length;
    if (n < 40) return patterns;

    // Detect Support/Resistance Pivots (Local Extrema)
    const pivots = this.findPivots(candles, 8);

    // 1. Support/Resistance Zones (Historical pivots clusters)
    const zones = this.detectSupportResistanceZones(pivots);

    // 2. Breakout/Breakdowns
    const breakouts = this.detectBreakouts(candles, zones);
    patterns.push(...breakouts);

    // 3. Double Tops and Bottoms
    const doubleTopsBottoms = this.detectDoubleTopsBottoms(pivots, n);
    patterns.push(...doubleTopsBottoms);

    // 4. Trend Channels and Triangles (Fit lines on recent pivots)
    const channelsAndTriangles = this.detectChannelsAndTriangles(pivots, n);
    patterns.push(...channelsAndTriangles);

    return patterns;
  }

  private static findPivots(candles: Candle[], window = 5): { idx: number; val: number; type: 'high' | 'low' }[] {
    const pivots: { idx: number; val: number; type: 'high' | 'low' }[] = [];
    const n = candles.length;

    for (let i = window; i < n - window; i++) {
      const currentH = candles[i].high;
      const currentL = candles[i].low;
      let isHigh = true;
      let isLow = true;

      for (let j = 1; j <= window; j++) {
        if (candles[i - j].high > currentH || candles[i + j].high > currentH) isHigh = false;
        if (candles[i - j].low < currentL || candles[i + j].low < currentL) isLow = false;
      }

      if (isHigh) pivots.push({ idx: i, val: currentH, type: 'high' });
      if (isLow) pivots.push({ idx: i, val: currentL, type: 'low' });
    }
    return pivots;
  }

  private static detectSupportResistanceZones(pivots: { val: number; type: 'high' | 'low' }[]): { price: number; type: 'support' | 'resistance' }[] {
    // Simple clustering of pivot values
    const zones: { price: number; type: 'support' | 'resistance' }[] = [];
    const highs = pivots.filter(p => p.type === 'high').map(p => p.val);
    const lows = pivots.filter(p => p.type === 'low').map(p => p.val);

    const cluster = (values: number[], tolerancePercent = 0.015): number[] => {
      const centers: number[] = [];
      for (const val of values) {
        let matched = false;
        for (let i = 0; i < centers.length; i++) {
          if (Math.abs(centers[i] - val) / centers[i] <= tolerancePercent) {
            centers[i] = (centers[i] + val) / 2; // update average
            matched = true;
            break;
          }
        }
        if (!matched) centers.push(val);
      }
      return centers;
    };

    cluster(highs).forEach(p => zones.push({ price: p, type: 'resistance' }));
    cluster(lows).forEach(p => zones.push({ price: p, type: 'support' }));

    return zones;
  }

  private static detectBreakouts(candles: Candle[], zones: { price: number; type: 'support' | 'resistance' }[]): ChartPattern[] {
    const patterns: ChartPattern[] = [];
    const n = candles.length;
    if (n < 5) return [];

    // Check last 5 candles for a breakout of any key zone
    for (let i = n - 5; i < n; i++) {
      const close = candles[i].close;
      const volume = candles[i].volume;

      // Calculate recent average volume
      let avgVolume = 0;
      const lookback = 10;
      if (i > lookback) {
        avgVolume = candles.slice(i - lookback, i).reduce((sum, c) => sum + c.volume, 0) / lookback;
      }

      const highVolume = volume > avgVolume * 1.5;

      for (const zone of zones) {
        if (zone.type === 'resistance' && close > zone.price && candles[i - 1].close <= zone.price) {
          patterns.push({
            name: highVolume ? 'Bullish Resistance Breakout (Confirmed)' : 'Bullish Resistance Breakout (Weak Vol)',
            startIndex: i - 1,
            endIndex: i,
            type: 'bullish',
            meta: { price: zone.price }
          });
        } else if (zone.type === 'support' && close < zone.price && candles[i - 1].close >= zone.price) {
          patterns.push({
            name: highVolume ? 'Bearish Support Breakdown (Confirmed)' : 'Bearish Support Breakdown (Weak Vol)',
            startIndex: i - 1,
            endIndex: i,
            type: 'bearish',
            meta: { price: zone.price }
          });
        }
      }
    }
    return patterns;
  }

  private static detectDoubleTopsBottoms(pivots: { idx: number; val: number; type: 'high' | 'low' }[], totalN: number): ChartPattern[] {
    const patterns: ChartPattern[] = [];
    const recentPivots = pivots.filter(p => p.idx > totalN - 60); // Focus on last 60 days
    if (recentPivots.length < 4) return [];

    for (let i = 0; i < recentPivots.length - 2; i++) {
      const p1 = recentPivots[i];
      const p2 = recentPivots[i + 2]; // Alternating pivot of the same type

      if (p1.type === p2.type) {
        const diffPercent = Math.abs(p1.val - p2.val) / p1.val;
        const timeDiff = p2.idx - p1.idx;

        if (diffPercent < 0.02 && timeDiff >= 10 && timeDiff <= 35) {
          if (p1.type === 'high') {
            patterns.push({
              name: 'Double Top (Bearish reversal)',
              startIndex: p1.idx,
              endIndex: p2.idx,
              type: 'bearish',
              meta: { price: (p1.val + p2.val) / 2 }
            });
          } else {
            patterns.push({
              name: 'Double Bottom (Bullish reversal)',
              startIndex: p1.idx,
              endIndex: p2.idx,
              type: 'bullish',
              meta: { price: (p1.val + p2.val) / 2 }
            });
          }
        }
      }
    }
    return patterns;
  }

  private static detectChannelsAndTriangles(pivots: { idx: number; val: number; type: 'high' | 'low' }[], totalN: number): ChartPattern[] {
    const patterns: ChartPattern[] = [];
    const recentHighs = pivots.filter(p => p.type === 'high' && p.idx > totalN - 80);
    const recentLows = pivots.filter(p => p.type === 'low' && p.idx > totalN - 80);
    if (recentHighs.length < 3 || recentLows.length < 3) return [];

    // Helper: Fits a line (y = mx + c) through points and returns m, c, and r-squared
    const fitTrendLine = (points: { idx: number; val: number }[]) => {
      const n = points.length;
      let sumX = 0, sumY = 0, sumXY = 0, sumXX = 0;
      for (const p of points) {
        sumX += p.idx;
        sumY += p.val;
        sumXY += p.idx * p.val;
        sumXX += p.idx * p.idx;
      }
      const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX || 1);
      const intercept = (sumY - slope * sumX) / n;
      return { slope, intercept };
    };

    const highsLine = fitTrendLine(recentHighs);
    const lowsLine = fitTrendLine(recentLows);

    const slopeDiff = Math.abs(highsLine.slope - lowsLine.slope);
    const meanSlope = (Math.abs(highsLine.slope) + Math.abs(lowsLine.slope)) / 2;

    const startIdx = Math.min(recentHighs[0].idx, recentLows[0].idx);
    const endIdx = totalN - 1;

    // Pattern classification
    if (slopeDiff < meanSlope * 0.25) {
      // Slopes are very close -> Parallel Channel
      const avgSlope = (highsLine.slope + lowsLine.slope) / 2;
      const type = avgSlope > 0.0001 ? 'bullish' : avgSlope < -0.0001 ? 'bearish' : 'neutral';
      patterns.push({
        name: `${type === 'bullish' ? 'Ascending' : type === 'bearish' ? 'Descending' : 'Horizontal'} Trend Channel`,
        startIndex: startIdx,
        endIndex: endIdx,
        type: type as any,
        meta: { highsSlope: highsLine.slope, lowsSlope: lowsLine.slope }
      });
    } else if (highsLine.slope < -0.0001 && lowsLine.slope > 0.0001) {
      // Slopes converge -> Symmetrical Triangle
      patterns.push({
        name: 'Symmetrical Triangle (Consolidation)',
        startIndex: startIdx,
        endIndex: endIdx,
        type: 'neutral',
        meta: { upperSlope: highsLine.slope, lowerSlope: lowsLine.slope }
      });
    } else if (Math.abs(highsLine.slope) < 0.0001 && lowsLine.slope > 0.0001) {
      // Ascending Triangle (Flat top, rising lows)
      patterns.push({
        name: 'Ascending Triangle (Bullish Bias)',
        startIndex: startIdx,
        endIndex: endIdx,
        type: 'bullish',
        meta: { resistance: highsLine.intercept }
      });
    } else if (highsLine.slope < -0.0001 && Math.abs(lowsLine.slope) < 0.0001) {
      // Descending Triangle (Falling highs, flat bottom)
      patterns.push({
        name: 'Descending Triangle (Bearish Bias)',
        startIndex: startIdx,
        endIndex: endIdx,
        type: 'bearish',
        meta: { support: lowsLine.intercept }
      });
    }

    return patterns;
  }
}

// ==========================================
// 4. Machine Learning Ensemble Model
// ==========================================

// A simple regression decision tree node
interface DecisionTreeNode {
  featureIdx?: number;
  splitVal?: number;
  left?: DecisionTreeNode;
  right?: DecisionTreeNode;
  val?: number; // Leaf prediction value (mean target)
}

// Decision Tree Regressor
class DecisionTreeRegressor {
  private root: DecisionTreeNode | null = null;
  constructor(private maxDepth = 4, private minSamplesSplit = 5) {}

  fit(X: number[][], y: number[]): void {
    this.root = this.buildTree(X, y, 0);
  }

  predict(X: number[][]): number[] {
    return X.map(row => this.predictRow(this.root, row));
  }

  private predictRow(node: DecisionTreeNode | null, row: number[]): number {
    if (!node) return 0;
    if (node.val !== undefined) return node.val;
    if (node.featureIdx === undefined || node.splitVal === undefined) return 0;

    if (row[node.featureIdx] <= node.splitVal) {
      return this.predictRow(node.left || null, row);
    } else {
      return this.predictRow(node.right || null, row);
    }
  }

  private buildTree(X: number[][], y: number[], depth: number): DecisionTreeNode {
    const numSamples = X.length;
    const numFeatures = X[0]?.length || 0;

    // Base cases
    if (depth >= this.maxDepth || numSamples < this.minSamplesSplit || this.allSame(y)) {
      const mean = y.reduce((s, v) => s + v, 0) / (y.length || 1);
      return { val: mean };
    }

    let bestVarReduction = -1;
    let bestFeature = -1;
    let bestSplit = 0;
    const currentVar = this.getVariance(y);

    // Search best split
    for (let f = 0; f < numFeatures; f++) {
      const values = X.map(row => row[f]);
      const uniqueVals = Array.from(new Set(values)).sort((a, b) => a - b);

      // Sub-sample split candidates if there are too many unique values to prevent O(N^2) complexity
      const candidates: number[] = [];
      const maxCandidates = 15;
      if (uniqueVals.length <= maxCandidates + 1) {
        for (let i = 0; i < uniqueVals.length - 1; i++) {
          candidates.push((uniqueVals[i] + uniqueVals[i + 1]) / 2);
        }
      } else {
        const step = uniqueVals.length / (maxCandidates + 1);
        for (let i = 1; i <= maxCandidates; i++) {
          const idx = Math.floor(i * step);
          if (idx < uniqueVals.length - 1) {
            candidates.push((uniqueVals[idx] + uniqueVals[idx + 1]) / 2);
          }
        }
      }

      for (const split of candidates) {
        const leftY: number[] = [];
        const rightY: number[] = [];

        for (let j = 0; j < numSamples; j++) {
          if (X[j][f] <= split) {
            leftY.push(y[j]);
          } else {
            rightY.push(y[j]);
          }
        }

        if (leftY.length === 0 || rightY.length === 0) continue;

        const leftVar = this.getVariance(leftY);
        const rightVar = this.getVariance(rightY);
        const splitVar = (leftY.length / numSamples) * leftVar + (rightY.length / numSamples) * rightVar;
        const reduction = currentVar - splitVar;

        if (reduction > bestVarReduction) {
          bestVarReduction = reduction;
          bestFeature = f;
          bestSplit = split;
        }
      }
    }

    if (bestVarReduction <= 0) {
      const mean = y.reduce((s, v) => s + v, 0) / (y.length || 1);
      return { val: mean };
    }

    // Split
    const leftX: number[][] = [];
    const leftY: number[] = [];
    const rightX: number[][] = [];
    const rightY: number[] = [];

    for (let i = 0; i < numSamples; i++) {
      if (X[i][bestFeature] <= bestSplit) {
        leftX.push(X[i]);
        leftY.push(y[i]);
      } else {
        rightX.push(X[i]);
        rightY.push(y[i]);
      }
    }

    return {
      featureIdx: bestFeature,
      splitVal: bestSplit,
      left: this.buildTree(leftX, leftY, depth + 1),
      right: this.buildTree(rightX, rightY, depth + 1)
    };
  }

  private allSame(y: number[]): boolean {
    if (y.length === 0) return true;
    const first = y[0];
    for (let i = 1; i < y.length; i++) {
      if (y[i] !== first) return false;
    }
    return true;
  }

  private getVariance(y: number[]): number {
    const n = y.length;
    if (n === 0) return 0;
    const mean = y.reduce((s, v) => s + v, 0) / n;
    return y.reduce((s, v) => s + Math.pow(v - mean, 2), 0) / n;
  }
}

// Random Forest Regressor
class RandomForestRegressor {
  private trees: DecisionTreeRegressor[] = [];
  constructor(private numTrees = 8, private maxDepth = 4, private minSamplesSplit = 5) {}

  fit(X: number[][], y: number[]): void {
    this.trees = [];
    const numSamples = X.length;

    for (let t = 0; t < this.numTrees; t++) {
      // Bootstrap sampling
      const sampleX: number[][] = [];
      const sampleY: number[] = [];

      for (let i = 0; i < numSamples; i++) {
        const randIdx = Math.floor(Math.random() * numSamples);
        sampleX.push(X[randIdx]);
        sampleY.push(y[randIdx]);
      }

      const tree = new DecisionTreeRegressor(this.maxDepth, this.minSamplesSplit);
      tree.fit(sampleX, sampleY);
      this.trees.push(tree);
    }
  }

  predict(X: number[][]): number[] {
    const treePredictions = this.trees.map(tree => tree.predict(X));
    const result: number[] = Array(X.length).fill(0);

    for (let i = 0; i < X.length; i++) {
      let sum = 0;
      for (let t = 0; t < this.numTrees; t++) {
        sum += treePredictions[t][i];
      }
      result[i] = sum / this.numTrees;
    }

    return result;
  }
}

// Gradient Boosting Regressor (simplified)
class GradientBoostingRegressor {
  private trees: DecisionTreeRegressor[] = [];
  private basePrediction = 0;

  constructor(private numTrees = 6, private learningRate = 0.1, private maxDepth = 3) {}

  fit(X: number[][], y: number[]): void {
    this.trees = [];
    const numSamples = X.length;
    if (numSamples === 0) return;

    this.basePrediction = y.reduce((s, v) => s + v, 0) / numSamples;
    const currentPredictions = Array(numSamples).fill(this.basePrediction);

    for (let t = 0; t < this.numTrees; t++) {
      // Calculate pseudo-residuals
      const residuals = y.map((val, i) => val - currentPredictions[i]);

      const tree = new DecisionTreeRegressor(this.maxDepth, 3);
      tree.fit(X, residuals);

      const treePred = tree.predict(X);
      for (let i = 0; i < numSamples; i++) {
        currentPredictions[i] += this.learningRate * treePred[i];
      }

      this.trees.push(tree);
    }
  }

  predict(X: number[][]): number[] {
    const result = Array(X.length).fill(this.basePrediction);
    for (const tree of this.trees) {
      const treePred = tree.predict(X);
      for (let i = 0; i < X.length; i++) {
        result[i] += this.learningRate * treePred[i];
      }
    }
    return result;
  }
}

// Logistic Regression with Sigmoid (gradient descent)
class LogisticRegression {
  private w: number[] = [];
  private b = 0;

  constructor(private learningRate = 0.05, private epochs = 100) {}

  private sigmoid(z: number): number {
    return 1 / (1 + Math.exp(-Math.max(-20, Math.min(20, z))));
  }

  fit(X: number[][], y: number[]): void {
    const n = X.length;
    const m = X[0]?.length || 0;
    this.w = Array(m).fill(0);
    this.b = 0;

    for (let epoch = 0; epoch < this.epochs; epoch++) {
      const dw = Array(m).fill(0);
      let db = 0;

      for (let i = 0; i < n; i++) {
        let z = this.b;
        for (let j = 0; j < m; j++) {
          z += X[i][j] * this.w[j];
        }
        const pred = this.sigmoid(z);
        const err = pred - y[i];

        for (let j = 0; j < m; j++) {
          dw[j] += err * X[i][j];
        }
        db += err;
      }

      // Update weights
      for (let j = 0; j < m; j++) {
        this.w[j] -= (this.learningRate * dw[j]) / n;
      }
      this.b -= (this.learningRate * db) / n;
    }
  }

  predictProb(X: number[][]): number[] {
    return X.map(row => {
      let z = this.b;
      for (let j = 0; j < row.length; j++) {
        z += row[j] * this.w[j];
      }
      return this.sigmoid(z);
    });
  }
}

// Simple Neural Network (feedforward 1 hidden layer)
class NeuralNetwork {
  private w1: number[][] = [];
  private b1: number[] = [];
  private w2: number[] = [];
  private b2 = 0;

  constructor(private hiddenSize = 6, private learningRate = 0.02, private epochs = 120) {}

  private relu(x: number): number {
    return Math.max(0, x);
  }

  private reluDeriv(x: number): number {
    return x > 0 ? 1 : 0;
  }

  fit(X: number[][], y: number[]): void {
    const n = X.length;
    const inputSize = X[0]?.length || 0;

    // Seeded initial weights
    this.w1 = Array(this.hiddenSize).fill(0).map((_, i) => 
      Array(inputSize).fill(0).map((_, j) => Math.sin(i * 3 + j) * 0.1)
    );
    this.b1 = Array(this.hiddenSize).fill(0);
    this.w2 = Array(this.hiddenSize).fill(0).map((_, i) => Math.cos(i) * 0.1);
    this.b2 = 0;

    for (let epoch = 0; epoch < this.epochs; epoch++) {
      for (let i = 0; i < n; i++) {
        const row = X[i];

        // 1. Forward Pass
        const hIn = Array(this.hiddenSize).fill(0);
        const hAct = Array(this.hiddenSize).fill(0);
        for (let j = 0; j < this.hiddenSize; j++) {
          let sum = this.b1[j];
          for (let k = 0; k < inputSize; k++) {
            sum += row[k] * this.w1[j][k];
          }
          hIn[j] = sum;
          hAct[j] = this.relu(sum);
        }

        let yIn = this.b2;
        for (let j = 0; j < this.hiddenSize; j++) {
          yIn += hAct[j] * this.w2[j];
        }
        const yPred = yIn; // Linear output for regression

        // 2. Backpropagation
        // Clip gradients to avoid exploding weights
        const dy = Math.max(-8, Math.min(8, yPred - y[i]));

        const dhAct = Array(this.hiddenSize).fill(0);
        const dhIn = Array(this.hiddenSize).fill(0);
        for (let j = 0; j < this.hiddenSize; j++) {
          dhAct[j] = dy * this.w2[j];
          dhIn[j] = dhAct[j] * this.reluDeriv(hIn[j]);
        }

        // 3. Weight Updates
        this.b2 -= this.learningRate * dy;
        for (let j = 0; j < this.hiddenSize; j++) {
          this.w2[j] -= this.learningRate * dy * hAct[j];
          this.b1[j] -= this.learningRate * dhIn[j];
          for (let k = 0; k < inputSize; k++) {
            this.w1[j][k] -= this.learningRate * dhIn[j] * row[k];
          }
        }
      }
    }
  }

  predict(X: number[][]): number[] {
    return X.map(row => {
      const hAct = Array(this.hiddenSize).fill(0);
      for (let j = 0; j < this.hiddenSize; j++) {
        let sum = this.b1[j];
        for (let k = 0; k < row.length; k++) {
          sum += row[k] * this.w1[j][k];
        }
        hAct[j] = this.relu(sum);
      }
      let yPred = this.b2;
      for (let j = 0; j < this.hiddenSize; j++) {
        yPred += hAct[j] * this.w2[j];
      }
      return yPred;
    });
  }
}

// Complete ML Ensemble Model
export class PredictiveEnsemble {
  private static modelCache = new Map<string, {
    rf: RandomForestRegressor;
    gb: GradientBoostingRegressor;
    lr: LogisticRegression;
    nn: NeuralNetwork;
    olsWeights: number[];
    lastTrainLength: number;
  }>();

  static clearCache(): void {
    PredictiveEnsemble.modelCache.clear();
  }

  static trainAndPredict(
    historicalCandles: Candle[],
    currentFeatures: number[],
    macroHistory: MacroDataPoint[],
    currentMacro: number[],
    assetId?: string
  ): {
    nextWeekDirectionProb: number;
    expectedReturnMin: number;
    expectedReturnMax: number;
    confidence: number;
    shapAttribution: Record<string, number>;
  } {
    const n = historicalCandles.length;
    const isCrypto = historicalCandles.some(c => c.fundingRate !== undefined);

    console.log(`[ML debug] ${assetId}: n=${n}, isCrypto=${isCrypto}, currentMacro=${JSON.stringify(currentMacro)}`);

    if (n < 45) {
      console.log(`[ML debug] ${assetId}: fallback n < 45`);
      return {
        nextWeekDirectionProb: 0.5,
        expectedReturnMin: -1.5,
        expectedReturnMax: 1.5,
        confidence: 50,
        shapAttribution: isCrypto
          ? { RSI: 0, MACD: 0, 'BB Width': 0, 'ATR Vol': 0, VIX: 0, DXY: 0, Liquidity: 0, MFI: 0, ADX: 0, 'Whale Flow': 0, 'Pro Sentiment': 0, 'Funding Rate': 0, 'Liquidation Intensity': 0 }
          : { RSI: 0, MACD: 0, 'BB Width': 0, 'ATR Vol': 0, VIX: 0, DXY: 0, Liquidity: 0, MFI: 0, ADX: 0, 'Whale Flow': 0, 'Pro Sentiment': 0 }
      };
    }

    // Cache lookup: Only retrain model every 28 days (4 weeks) per asset during backtest/long runs
    const cached = assetId ? PredictiveEnsemble.modelCache.get(assetId) : null;
    const shouldRetrain = !cached || (n - cached.lastTrainLength) >= 28;

    let rf: RandomForestRegressor;
    let gb: GradientBoostingRegressor;
    let lr: LogisticRegression;
    let nn: NeuralNetwork;
    let olsWeights: number[];

    const closes = historicalCandles.map(c => c.close);
    const lastClose = historicalCandles[n - 1].close;

    // Calculate MFI and ADX for the whole series
    const mfi = Technicals.MFI(historicalCandles, 14);
    const adx = Technicals.ADX(historicalCandles, 14);

    const latestCandle = historicalCandles[n - 1];
    const curMfi = mfi[n - 1] || 50;
    const curAdx = adx[n - 1] || 20;
    const curWhale = latestCandle.whaleAccumulation || 50;
    const curPro = latestCandle.proTraderSentiment || 52;

    let currentFeat: number[];
    if (isCrypto) {
      const fundingRate = latestCandle.fundingRate || 0;
      const liquidations = latestCandle.liquidations || 0;
      const rawVolume = latestCandle.volume || 0;
      const normLiq = rawVolume > 0 ? (liquidations / rawVolume) : 0;

      currentFeat = [
        currentFeatures[0] / 100, // RSI
        currentFeatures[1] / (lastClose || 1), // MACD hist normalized
        currentFeatures[2],       // BB width
        currentFeatures[3],       // Norm ATR
        currentMacro[0] / 50,     // VIX
        (currentMacro[1] - 90) / 20, // DXY
        currentMacro[2] / 150,     // Liquidity
        curMfi / 100,             // MFI
        curAdx / 100,             // ADX
        curWhale / 100,           // Whale Flow
        curPro / 100,             // Pro Sentiment
        fundingRate * 1000,       // Funding Rate (scaled by 1000)
        Math.log1p(normLiq * 100) // Log-scaled liquidation intensity
      ];
    } else {
      currentFeat = [
        currentFeatures[0] / 100, // RSI
        currentFeatures[1] / (lastClose || 1), // MACD hist normalized
        currentFeatures[2],       // BB width
        currentFeatures[3],       // Norm ATR
        currentMacro[0] / 50,     // VIX
        (currentMacro[1] - 90) / 20, // DXY
        currentMacro[2] / 150,     // Liquidity
        curMfi / 100,             // MFI
        curAdx / 100,             // ADX
        curWhale / 100,           // Whale Flow
        curPro / 100              // Pro Sentiment
      ];
    }

    const trainSize = shouldRetrain ? (n - 30) : (cached ? cached.lastTrainLength - 30 : 0);

    if (shouldRetrain) {
      // 1. Prepare Training Datasets
      const X: number[][] = [];
      const yReg: number[] = [];  // Target: Next 5-day continuous return %
      const yCls: number[] = [];  // Target: Binary direction (1 = positive return, 0 = negative/flat)

      const rsi = Technicals.RSI(closes, 14);
      const { macd, signalLine } = Technicals.MACD(closes);
      const bb = Technicals.BollingerBands(closes);
      const atr = Technicals.ATR(historicalCandles);

      const macroMap = new Map<string, MacroDataPoint>();
      for (let i = 0; i < macroHistory.length; i++) {
        macroMap.set(macroHistory[i].date, macroHistory[i]);
      }

      // Construct features matrix up to n - 5
      for (let i = 25; i < n - 5; i++) {
        // Find matching macro data point by date
        const date = historicalCandles[i].date;
        const macro = macroMap.get(date) || macroHistory[macroHistory.length - 1];

        const c = historicalCandles[i];
        const histMfi = mfi[i] || 50;
        const histAdx = adx[i] || 20;
        const whaleAccum = c.whaleAccumulation || 50;
        const proSentiment = c.proTraderSentiment || 52;

        let feat: number[];
        if (isCrypto) {
          const fundingRate = c.fundingRate || 0;
          const liquidations = c.liquidations || 0;
          const rawVolume = c.volume || 0;
          const normLiq = rawVolume > 0 ? (liquidations / rawVolume) : 0;

          feat = [
            rsi[i] / 100,                     // RSI normalized
            (macd[i] - signalLine[i]) / (closes[i] || 1), // MACD hist normalized
            bb.width[i],                      // BB width
            atr[i] / closes[i],               // Normalized ATR
            macro.vix / 50,                   // VIX normalized
            (macro.dxy - 90) / 20,            // DXY normalized
            macro.liquidity / 150,             // Liquidity normalized
            histMfi / 100,                    // MFI normalized
            histAdx / 100,                    // ADX normalized
            whaleAccum / 100,                 // Whale flow normalized
            proSentiment / 100,               // Pro sentiment normalized
            fundingRate * 1000,               // Funding Rate normalized
            Math.log1p(normLiq * 100)         // Liquidation Intensity normalized
          ];
        } else {
          feat = [
            rsi[i] / 100,                     // RSI normalized
            (macd[i] - signalLine[i]) / (closes[i] || 1), // MACD hist normalized
            bb.width[i],                      // BB width
            atr[i] / closes[i],               // Normalized ATR
            macro.vix / 50,                   // VIX normalized
            (macro.dxy - 90) / 20,            // DXY normalized
            macro.liquidity / 150,            // Liquidity normalized
            histMfi / 100,                    // MFI normalized
            histAdx / 100,                    // ADX normalized
            whaleAccum / 100,                 // Whale flow normalized
            proSentiment / 100                // Pro sentiment normalized
          ];
        }

        // Calculate future 5-day return
        const futureReturn = ((closes[i + 5] - closes[i]) / closes[i]) * 100;

        X.push(feat);
        yReg.push(futureReturn);
        yCls.push(futureReturn > 0 ? 1 : 0);
      }

      if (X.length < 10) {
        console.log(`[ML debug] ${assetId}: fallback X.length < 10 (length: ${X.length})`);
        return {
          nextWeekDirectionProb: 0.5,
          expectedReturnMin: -1,
          expectedReturnMax: 1,
          confidence: 50,
          shapAttribution: isCrypto
            ? { RSI: 0.1, MACD: 0.1, 'BB Width': 0.1, 'ATR Vol': 0.1, VIX: 0.1, DXY: 0.1, Liquidity: 0.1, MFI: 0.1, ADX: 0.1, 'Whale Flow': 0.1, 'Pro Sentiment': 0.1, 'Funding Rate': 0.1, 'Liquidation Intensity': 0.1 }
            : { RSI: 0.1, MACD: 0.1, 'BB Width': 0.1, 'ATR Vol': 0.1, VIX: 0.1, DXY: 0.1, Liquidity: 0.1, MFI: 0.1, ADX: 0.1, 'Whale Flow': 0.1, 'Pro Sentiment': 0.1 }
        };
      }

      // 2. Train Models
      rf = new RandomForestRegressor(5, 4, 3);
      gb = new GradientBoostingRegressor(4, 0.1, 3);
      lr = new LogisticRegression(0.05, 20);
      nn = new NeuralNetwork(5, 0.005, 20); // Safe learning rate & epochs

      rf.fit(X, yReg);
      gb.fit(X, yReg);
      nn.fit(X, yReg);
      lr.fit(X, yCls);

      // Linear OLS baseline
      olsWeights = MatrixMath.solveOLS(X, yReg) || Array(X[0].length).fill(0);

      // Save to cache
      if (assetId) {
        PredictiveEnsemble.modelCache.set(assetId, {
          rf, gb, lr, nn, olsWeights, lastTrainLength: n
        });
      }
    } else {
      // Use cached models
      rf = cached!.rf;
      gb = cached!.gb;
      lr = cached!.lr;
      nn = cached!.nn;
      olsWeights = cached!.olsWeights;
    }

    // 3. Inference
    const rfPred = rf.predict([currentFeat])[0];
    const gbPred = gb.predict([currentFeat])[0];
    const nnPred = nn.predict([currentFeat])[0];

    // OLS baseline prediction
    let olsPred = 0;
    for (let j = 0; j < currentFeat.length; j++) {
      olsPred += currentFeat[j] * olsWeights[j];
    }

    const logitProb = lr.predictProb([currentFeat])[0];

    // Blended Ensemble prediction (average of random forest, boosting, and neural net)
    const ensembleReg = (rfPred + gbPred + nnPred + olsPred) / 4;

    // Calculate dynamic weekly standard deviation based on historical return volatility
    const returns: number[] = [];
    for (let i = 1; i < n; i++) {
      returns.push((closes[i] - closes[i - 1]) / (closes[i - 1] || 1));
    }
    const meanReturn = returns.reduce((s, v) => s + v, 0) / returns.length || 0;
    const varianceReturn = returns.reduce((s, v) => s + Math.pow(v - meanReturn, 2), 0) / returns.length || 0.0001;
    const histVol = Math.sqrt(varianceReturn);
    const stdDevResidual = Math.max(0.5, parseFloat((histVol * Math.sqrt(isCrypto ? 7 : 5) * 100).toFixed(2)));

    const expectedReturnMin = parseFloat((ensembleReg - 1.2 * stdDevResidual).toFixed(2));
    const expectedReturnMax = parseFloat((ensembleReg + 1.2 * stdDevResidual).toFixed(2));

    // Directional probability (Logistic regression + sign matching booster)
    let signProb = 0.5;
    if (ensembleReg > 0) {
      signProb = 0.5 + 0.15 + (logitProb - 0.5) * 0.7;
    } else {
      signProb = 0.35 + (logitProb - 0.5) * 0.7;
    }
    const nextWeekDirectionProb = Math.min(0.95, Math.max(0.05, parseFloat(signProb.toFixed(3))));

    // Model Confidence Score: function of data size and model agreement
    const agreement = 1 - Math.min(1.0, (Math.abs(rfPred - gbPred) + Math.abs(gbPred - nnPred)) / (Math.abs(ensembleReg) || 1));
    const confidence = Math.min(98, Math.max(30, Math.round(50 + agreement * 30 + Math.min(20, trainSize / 5))));

    // 4. SHAP feature attribution calculation (perturbation method)
    const featureLabels = isCrypto
      ? ['RSI', 'MACD', 'BB Width', 'ATR Vol', 'VIX', 'DXY', 'Liquidity', 'MFI', 'ADX', 'Whale Flow', 'Pro Sentiment', 'Funding Rate', 'Liquidation Intensity']
      : ['RSI', 'MACD', 'BB Width', 'ATR Vol', 'VIX', 'DXY', 'Liquidity', 'MFI', 'ADX', 'Whale Flow', 'Pro Sentiment'];
    const shapAttribution: Record<string, number> = {};

    let totalAttribution = 0;
    for (let f = 0; f < currentFeat.length; f++) {
      // Perturb feature value to observe change
      const perturbed = [...currentFeat];
      perturbed[f] = 0; // nullify feature

      const rfPert = rf.predict([perturbed])[0];
      const gbPert = gb.predict([perturbed])[0];
      const nnPert = nn.predict([perturbed])[0];

      let olsPert = 0;
      for (let j = 0; j < perturbed.length; j++) {
        olsPert += perturbed[j] * olsWeights[j];
      }
      const ensemblePert = (rfPert + gbPert + nnPert + olsPert) / 4;

      const impact = Math.abs(ensembleReg - ensemblePert);
      shapAttribution[featureLabels[f]] = impact;
      totalAttribution += impact;
    }

    // Normalize attributions to total 100%
    for (const key in shapAttribution) {
      shapAttribution[key] = totalAttribution === 0 
        ? (isCrypto ? 7.7 : 9.1) 
        : parseFloat(((shapAttribution[key] / totalAttribution) * 100).toFixed(1));
    }

    return {
      nextWeekDirectionProb,
      expectedReturnMin,
      expectedReturnMax,
      confidence,
      shapAttribution
    };
  }
}

// ==========================================
// 5. VAR & Granger Causality
// ==========================================
export interface GrangerResult {
  source: string;
  target: string;
  fStat: number;
  pValue: number;
  causalLink: boolean;
}

export class VectorAutoregression {
  // Computes Granger Causality F-test: Does X Granger-cause Y?
  // H0: Lagged values of X do NOT predict Y (coefficients = 0).
  // Unrestricted: Y_t = c + sum(a_i * Y_{t-i}) + sum(b_i * X_{t-i})
  // Restricted: Y_t = c + sum(a_i * Y_{t-i})
  static grangerCausality(
    xReturns: number[],
    yReturns: number[],
    xName: string,
    yName: string,
    lags = 2
  ): GrangerResult {
    const n = xReturns.length;
    if (n < lags * 3 + 10) {
      return { source: xName, target: yName, fStat: 0, pValue: 1.0, causalLink: false };
    }

    // 1. Fit Unrestricted Model
    // Y = [constant, Y_t-1, Y_t-2, X_t-1, X_t-2]
    const X_unrestricted: number[][] = [];
    const Y_unrestricted: number[] = [];

    for (let t = lags; t < n; t++) {
      const row = [1]; // Constant
      for (let l = 1; l <= lags; l++) {
        row.push(yReturns[t - l]);
      }
      for (let l = 1; l <= lags; l++) {
        row.push(xReturns[t - l]);
      }
      X_unrestricted.push(row);
      Y_unrestricted.push(yReturns[t]);
    }

    const betaUnrestricted = MatrixMath.solveOLS(X_unrestricted, Y_unrestricted);
    if (!betaUnrestricted) {
      return { source: xName, target: yName, fStat: 0, pValue: 1.0, causalLink: false };
    }

    // Compute RSS (Residual Sum of Squares) for unrestricted model
    let rssUnrestricted = 0;
    for (let i = 0; i < X_unrestricted.length; i++) {
      let pred = 0;
      for (let j = 0; j < X_unrestricted[i].length; j++) {
        pred += X_unrestricted[i][j] * betaUnrestricted[j];
      }
      rssUnrestricted += Math.pow(Y_unrestricted[i] - pred, 2);
    }

    // 2. Fit Restricted Model (Lags of X omitted)
    const X_restricted: number[][] = [];
    const Y_restricted: number[] = [];

    for (let t = lags; t < n; t++) {
      const row = [1];
      for (let l = 1; l <= lags; l++) {
        row.push(yReturns[t - l]);
      }
      X_restricted.push(row);
      Y_restricted.push(yReturns[t]);
    }

    const betaRestricted = MatrixMath.solveOLS(X_restricted, Y_restricted);
    if (!betaRestricted) {
      return { source: xName, target: yName, fStat: 0, pValue: 1.0, causalLink: false };
    }

    // Compute RSS for restricted model
    let rssRestricted = 0;
    for (let i = 0; i < X_restricted.length; i++) {
      let pred = 0;
      for (let j = 0; j < X_restricted[i].length; j++) {
        pred += X_restricted[i][j] * betaRestricted[j];
      }
      rssRestricted += Math.pow(Y_restricted[i] - pred, 2);
    }

    // 3. F-test Calculation
    // F = ((RSS_restricted - RSS_unrestricted) / m) / (RSS_unrestricted / (N - k))
    // m = number of restrictions (lags of X) = lags
    // N = number of samples = X_unrestricted.length
    // k = number of parameters in unrestricted model = 1 + 2 * lags
    const m = lags;
    const N = X_unrestricted.length;
    const k = 1 + 2 * lags;

    const numerator = (rssRestricted - rssUnrestricted) / m;
    const denominator = rssUnrestricted / (N - k);
    const fStat = denominator === 0 ? 0 : numerator / denominator;

    // Approximate p-value from F-distribution (using simpler approximation)
    // Critical value for F(2, >120) at alpha=0.05 is roughly 3.07
    // Critical value at alpha=0.01 is roughly 4.78
    let pValue = 1.0;
    if (fStat > 4.78) {
      pValue = 0.008;
    } else if (fStat > 3.07) {
      pValue = 0.045;
    } else if (fStat > 1.5) {
      pValue = 0.22;
    } else {
      pValue = 0.65;
    }

    const causalLink = pValue < 0.05;

    return {
      source: xName,
      target: yName,
      fStat: parseFloat(fStat.toFixed(3)),
      pValue,
      causalLink
    };
  }
}

// ==========================================
// 6. Anomaly Detection
// ==========================================
export interface MarketAnomaly {
  date: string;
  type: 'volume' | 'volatility' | 'funding' | 'liquidations';
  severity: number; // Z-score absolute value
  message: string;
  condition: 'buy' | 'sell';
}

export class AnomalyDetector {
  static detectAnomalies(candles: Candle[], category: string, lookback = 30): MarketAnomaly[] {
    const anomalies: MarketAnomaly[] = [];
    const n = candles.length;
    if (n < lookback) return [];

    const volumes = candles.map(c => c.volume);
    const ranges = candles.map(c => c.high - c.low);

    // Calculate rolling Z-Scores for volume and volatility
    for (let i = lookback; i < n; i++) {
      const date = candles[i].date;
      const volWindow = volumes.slice(i - lookback, i);
      const rangeWindow = ranges.slice(i - lookback, i);

      // Volume anomaly
      const volMean = volWindow.reduce((s, v) => s + v, 0) / lookback;
      const volStd = Math.sqrt(volWindow.reduce((s, v) => s + Math.pow(v - volMean, 2), 0) / lookback) || 1;
      const volZ = (candles[i].volume - volMean) / volStd;

      if (volZ > 2.5) {
        const condition = candles[i].close >= candles[i].open ? 'buy' : 'sell';
        anomalies.push({
          date,
          type: 'volume',
          severity: parseFloat(volZ.toFixed(2)),
          message: `Unusual Volume Spike: Z-Score of +${volZ.toFixed(1)} detected`,
          condition
        });
      }

      // Volatility anomaly
      const rangeMean = rangeWindow.reduce((s, v) => s + v, 0) / lookback;
      const rangeStd = Math.sqrt(rangeWindow.reduce((s, v) => s + Math.pow(v - rangeMean, 2), 0) / lookback) || 1;
      const rangeZ = ((candles[i].high - candles[i].low) - rangeMean) / rangeStd;

      if (rangeZ > 2.8) {
        const condition = candles[i].close >= candles[i].open ? 'buy' : 'sell';
        anomalies.push({
          date,
          type: 'volatility',
          severity: parseFloat(rangeZ.toFixed(2)),
          message: `Unusual Volatility Expansion: Price range expanded to Z-Score +${rangeZ.toFixed(1)}`,
          condition
        });
      }

      // Crypto anomalies (funding, liquidations)
      if (category === 'crypto') {
        const funding = candles[i].fundingRate || 0;
        const liqs = candles[i].liquidations || 0;

        const liqWindow = candles.slice(i - lookback, i).map(c => c.liquidations || 0);
        const liqMean = liqWindow.reduce((s, v) => s + v, 0) / lookback;
        const liqStd = Math.sqrt(liqWindow.reduce((s, v) => s + Math.pow(v - liqMean, 2), 0) / lookback) || 1;
        const liqZ = (liqs - liqMean) / liqStd;

        if (liqZ > 3.0) {
          const condition = candles[i].close < candles[i].open ? 'buy' : 'sell';
          anomalies.push({
            date,
            type: 'liquidations',
            severity: parseFloat(liqZ.toFixed(2)),
            message: `Capitulation Event: Liquidations spiked to $${(liqs / 1000000).toFixed(1)}M (Z-Score +${liqZ.toFixed(1)})`,
            condition
          });
        }

        // Funding rate anomaly (absolute rate above threshold)
        if (Math.abs(funding) > 0.0006) {
          const condition = funding > 0 ? 'sell' : 'buy';
          anomalies.push({
            date,
            type: 'funding',
            severity: parseFloat((Math.abs(funding) / 0.0001).toFixed(2)),
            message: `Overleveraged Options/Futures: Funding Rate stretched to ${(funding * 100).toFixed(4)}%`,
            condition
          });
        }
      }
    }

    return anomalies;
  }
}

// ==========================================
// 7. Core Regime Detection Engine
// ==========================================
export class RegimeDetector {
  static classifyRegime(macro: MacroDataPoint): {
    name: 'High-inflation' | 'Low-volatility' | 'Liquidity-expansion' | 'Crisis' | 'Rate-hiking' | 'Risk-on/off';
    scores: Record<string, number>;
    description: string;
  } {
    const scores: Record<string, number> = {
      'Low-volatility': 0,
      'High-inflation': 0,
      'Crisis': 0,
      'Rate-hiking': 0,
      'Liquidity-expansion': 0
    };

    const cpi = macro.cpi;
    const rate = macro.fedFundsRate;
    const vix = macro.vix;
    const liqChange = macro.liquidity; // global liquidity

    // 1. Crisis Regime
    // Primarily driven by spikes in VIX
    if (vix > 28) {
      scores['Crisis'] = Math.min(100, (vix - 20) * 5);
    } else {
      scores['Crisis'] = (vix / 20) * 15;
    }

    // 2. High Inflation
    // Triggered when CPI goes above 4.5%
    if (cpi > 4.5) {
      scores['High-inflation'] = Math.min(100, 50 + (cpi - 4.5) * 12);
    } else {
      scores['High-inflation'] = (cpi / 4.5) * 45;
    }

    // 3. Rate Hiking
    // High central bank rates
    if (rate >= 4.0) {
      scores['Rate-hiking'] = Math.min(100, 60 + (rate - 4.0) * 15);
    } else {
      scores['Rate-hiking'] = (rate / 4.0) * 50;
    }

    // 4. Liquidity Expansion
    // Fast expansion of liquidity index, low VIX, low rates
    if (rate <= 3.5 && vix < 18) {
      scores['Liquidity-expansion'] = Math.min(100, 60 + (4 - rate) * 10 + (20 - vix) * 2);
    } else {
      scores['Liquidity-expansion'] = (20 / vix) * 20;
    }

    // 5. Low Volatility
    // VIX below 14
    if (vix < 14) {
      scores['Low-volatility'] = Math.min(100, 70 + (14 - vix) * 7);
    } else {
      scores['Low-volatility'] = (10 / vix) * 40;
    }

    // Determine highest score regime
    let activeRegime = 'Low-volatility';
    let highestScore = -1;
    for (const key in scores) {
      if (scores[key] > highestScore) {
        highestScore = scores[key];
        activeRegime = key;
      }
    }

    // Form descriptions
    let description = '';
    switch (activeRegime) {
      case 'Crisis':
        description = 'Market panic in action. Extreme volatility (VIX spiked), risk capital is seeking safe havens like Cash/DXY. High correlations.';
        break;
      case 'High-inflation':
        description = 'Inflation index elevated. Real assets and commodities outperforming equities. Yields are highly sensitive.';
        break;
      case 'Rate-hiking':
        description = 'Central banks active in hiking interest rates to contract liquidity. Value and yields are rising; growth sectors under pressure.';
        break;
      case 'Liquidity-expansion':
        description = 'Favorable macro liquidity window. Rate cuts/QE in progress. High risk appetite, causing risk assets (crypto/tech) to lead.';
        break;
      default:
        description = 'Quiet volatility regimes. Sideways/slow upward drift in equity indices. Mean reversion indicators are highly accurate.';
    }

    return {
      name: activeRegime as any,
      scores,
      description
    };
  }
}
