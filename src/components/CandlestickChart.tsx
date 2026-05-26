import { useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import '../i18n';
import { ZoomIn, ZoomOut, MoveLeft, MoveRight, RotateCcw, AlertTriangle } from 'lucide-react';
import { formatAssetPrice } from '../utils/formatter.ts';

interface Candle {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  fundingRate?: number;
  liquidations?: number;
}

interface IndicatorData {
  sma20: number[];
  sma50: number[];
  sma100: number[];
  sma200: number[];
  ema20: number[];
  ema50: number[];
  macd: number[];
  macdSignal: number[];
  macdHist: number[];
  rsi: number[];
  stochRsiK: number[];
  stochRsiD: number[];
  bbUpper: number[];
  bbMiddle: number[];
  bbLower: number[];
}

interface Pattern {
  name: string;
  startIndex: number;
  endIndex: number;
  type: 'bullish' | 'bearish' | 'neutral';
  meta?: any;
}

interface Anomaly {
  date: string;
  type: 'volume' | 'volatility' | 'funding' | 'liquidations';
  severity: number;
  message: string;
  condition: 'buy' | 'sell';
}

interface Recommendation {
  suggestedEntry: number;
  takeProfit: number;
  stopLoss: number;
  rating: string;
}

interface CandlestickChartProps {
  assetId: string;
  candles: Candle[];
  technicals: IndicatorData;
  patterns: Pattern[];
  anomalies: Anomaly[];
  recommendation: Recommendation;
}

export const CandlestickChart: React.FC<CandlestickChartProps> = ({
  assetId,
  candles,
  technicals,
  patterns,
  anomalies,
  recommendation
}) => {
  const [zoomLevel, setZoomLevel] = useState(1); // 1 to 5
  const [panOffset, setPanOffset] = useState(0); // number of candles shifted
  const [activeOverlay, setActiveOverlay] = useState<'ma' | 'bb' | 'none'>('ma');
  const [activeIndicator, setActiveIndicator] = useState<'rsi' | 'macd' | 'onchain'>('rsi');
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const { t } = useTranslation();
  const containerRef = useRef<HTMLDivElement>(null);

  type TechnicalKey = 'bbUpper' | 'bbLower' | 'bbMiddle' | 'sma20' | 'sma50' | 'sma200' | 'ema20' | 'ema50' | 'macd' | 'macdSignal' | 'macdHist' | 'rsi';

  // Switch-based dispatch — no bracket/prototype access possible
  const getTechnicalSeries = (key: TechnicalKey): number[] => {
    switch (key) {
      case 'bbUpper':    return technicals.bbUpper;
      case 'bbLower':    return technicals.bbLower;
      case 'bbMiddle':   return technicals.bbMiddle;
      case 'sma20':      return technicals.sma20;
      case 'sma50':      return technicals.sma50;
      case 'sma200':     return technicals.sma200;
      case 'ema20':      return technicals.ema20;
      case 'ema50':      return technicals.ema50;
      case 'macd':       return technicals.macd;
      case 'macdSignal': return technicals.macdSignal;
      case 'macdHist':   return technicals.macdHist;
      case 'rsi':        return technicals.rsi;
    }
  };

  // Bounds-checked single-value accessor
  const getTechnicalValue = (key: TechnicalKey, idx: number): number => {
    const series = getTechnicalSeries(key);
    const safeIdx = Math.max(0, Math.min(series.length - 1, Math.floor(idx)));
    return series[safeIdx] ?? 0;
  };

  // Zoom parameters
  const baseCount = 60;
  const visibleCount = Math.max(12, Math.round(baseCount / zoomLevel));

  // Determine slice indices
  const maxPan = candles.length - visibleCount;
  const clampedPan = Math.max(0, Math.min(maxPan, panOffset));

  const endIndex = candles.length - clampedPan;
  const startIndex = Math.max(0, endIndex - visibleCount);

  // Sliced data
  const visibleCandles = candles.slice(startIndex, endIndex);
  const visibleIdxMapping = Array.from({ length: visibleCandles.length }, (_, i) => startIndex + i);

  // Bounds-checked mapping accessor — eliminates bracket notation on loop indices
  const getOrigIdx = (i: number): number => {
    const safeI = Math.max(0, Math.min(visibleIdxMapping.length - 1, Math.floor(i)));
    return visibleIdxMapping[safeI];
  };

  // Price Bounds
  const highs = visibleCandles.map((c, i) => {
    const origIdx = getOrigIdx(i);
    let val = c.high;
    if (activeOverlay === 'bb') {
      const bbUpper = getTechnicalValue('bbUpper', origIdx);
      if (bbUpper) val = Math.max(val, bbUpper);
    }
    return val;
  });
  const lows = visibleCandles.map((c, i) => {
    const origIdx = getOrigIdx(i);
    let val = c.low;
    if (activeOverlay === 'bb') {
      const bbLower = getTechnicalValue('bbLower', origIdx);
      if (bbLower) val = Math.min(val, bbLower);
    }
    return val;
  });

  const maxPrice = Math.max(...highs, recommendation.takeProfit, recommendation.suggestedEntry, recommendation.stopLoss) * 1.01;
  const minPrice = Math.min(...lows, recommendation.takeProfit, recommendation.suggestedEntry, recommendation.stopLoss) * 0.99;
  const priceRange = maxPrice - minPrice || 1;

  // Chart dimensions
  const chartWidth = 720;
  const chartHeight = 280;
  const volumeHeight = 60;
  const indicatorHeight = 80;
  const paddingRight = 60;
  const paddingLeft = 10;
  const paddingTop = 10;
  const paddingBottom = 20;

  const innerWidth = chartWidth - paddingLeft - paddingRight;

  // Price to Y mapper
  const getY = (price: number) => {
    return chartHeight - ((price - minPrice) / priceRange) * (chartHeight - paddingTop - paddingBottom) - paddingBottom;
  };

  // Y to Price mapper (for grid lines)
  const getPriceAtY = (y: number) => {
    const pct = (chartHeight - paddingBottom - y) / (chartHeight - paddingTop - paddingBottom);
    return minPrice + pct * priceRange;
  };

  // Zoom / Pan functions
  const handleZoomIn = () => setZoomLevel(prev => Math.min(5, prev + 0.5));
  const handleZoomOut = () => setZoomLevel(prev => Math.max(1, prev - 0.5));
  const handlePanLeft = () => setPanOffset(prev => Math.min(candles.length - visibleCount, prev + 3));
  const handlePanRight = () => setPanOffset(prev => Math.max(0, prev - 3));
  const handleReset = () => {
    setZoomLevel(1);
    setPanOffset(0);
  };

  // Generate Polyline points for indicators
  const getPolylinePoints = (key: TechnicalKey) => {
    return visibleCandles.map((_, i) => {
      const origIdx = getOrigIdx(i);
      const val = getTechnicalValue(key, origIdx);
      const x = paddingLeft + (i / (visibleCandles.length - 1)) * innerWidth;
      const y = getY(val);
      return `${x},${y}`;
    }).filter(p => !p.includes('NaN')).join(' ');
  };

  // Renders Grid lines
  const renderGridLines = () => {
    const lines = [];
    const stepCount = 5;
    for (let i = 0; i <= stepCount; i++) {
      const y = paddingTop + (i / stepCount) * (chartHeight - paddingTop - paddingBottom);
      const price = getPriceAtY(y);
      lines.push(
        <g key={`grid-y-${i}`}>
          <line
            x1={paddingLeft}
            y1={y}
            x2={chartWidth - paddingRight}
            y2={y}
            stroke="rgba(255,255,255,0.04)"
            strokeWidth="1"
            strokeDasharray="4 4"
          />
          <text
            x={chartWidth - paddingRight + 5}
            y={y + 4}
            fill="var(--text-secondary)"
            fontSize="9"
            fontFamily="var(--font-display)"
          >
            {price.toLocaleString(undefined, { maximumFractionDigits: 1 })}
          </text>
        </g>
      );
    }
    return lines;
  };

  return (
    <div className="glass-panel chart-panel" ref={containerRef}>
      
      {/* 1. Header Toolbar */}
      <div className="chart-toolbar">
        <div className="chart-toolbar-left">
          <button
            onClick={() => setActiveOverlay(activeOverlay === 'ma' ? 'bb' : activeOverlay === 'bb' ? 'none' : 'ma')}
            className={`btn-tool ${activeOverlay !== 'none' ? 'active' : ''}`}
          >
            {t('chartOverlay', { value: activeOverlay.toUpperCase() })}
          </button>
          <button
            onClick={() => {
              const isCrypto = candles.some(c => c.fundingRate !== undefined);
              if (isCrypto) {
                setActiveIndicator(activeIndicator === 'rsi' ? 'macd' : activeIndicator === 'macd' ? 'onchain' : 'rsi');
              } else {
                setActiveIndicator(activeIndicator === 'rsi' ? 'macd' : 'rsi');
              }
            }}
            className="btn-tool"
          >
            {t('chartIndicator', { value: activeIndicator.toUpperCase() })}
          </button>
          
          {/* Anomaly Legend */}
          <div className="chart-anomaly-legend">
            <span className="chart-anomaly-item">
              <span className="anomaly-arrow anomaly-arrow--buy">▲</span> {t('buyAnomaly')}
            </span>
            <span className="chart-anomaly-item">
              <span className="anomaly-arrow anomaly-arrow--sell">▼</span> {t('sellAnomaly')}
            </span>
          </div>
        </div>

        <div className="chart-toolbar-right">
          <button onClick={handlePanLeft} className="btn-tool" title="Pan left"><MoveLeft size={14} /></button>
          <button onClick={handleZoomIn} className="btn-tool" title="Zoom in"><ZoomIn size={14} /></button>
          <button onClick={handleZoomOut} className="btn-tool" title="Zoom out"><ZoomOut size={14} /></button>
          <button onClick={handlePanRight} className="btn-tool" title="Pan right"><MoveRight size={14} /></button>
          <button onClick={handleReset} className="btn-tool" title="Reset view"><RotateCcw size={14} /></button>
        </div>
      </div>

      {/* 2. Main Candlestick Chart Area */}
      <div className="chart-svg-wrapper">
        <svg
          viewBox={`0 0 ${chartWidth} ${chartHeight + volumeHeight + indicatorHeight}`}
          width="100%"
          height="100%"
          className="chart-svg"
          onMouseLeave={() => setHoverIndex(null)}
          onMouseMove={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            const clickX = e.clientX - rect.left;
            // Calculate which candle matches X
            const pct = (clickX - paddingLeft) / (rect.width * (innerWidth / chartWidth));
            const idx = Math.round(pct * (visibleCandles.length - 1));
            if (idx >= 0 && idx < visibleCandles.length) {
              setHoverIndex(idx);
            } else {
              setHoverIndex(null);
            }
          }}
        >
          {/* Main Price Frame */}
          <g>
            {renderGridLines()}

            {/* Support/Resistance zones detected */}
            {patterns.map((p, idx) => {
              if (p.name.includes('resistance') || p.name.includes('support')) {
                const price = p.meta?.price;
                if (price && price >= minPrice && price <= maxPrice) {
                  const y = getY(price);
                  return (
                    <g key={`pat-line-${idx}`}>
                      <line
                        x1={paddingLeft}
                        y1={y}
                        x2={chartWidth - paddingRight}
                        y2={y}
                        stroke={p.type === 'bullish' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)'}
                        strokeWidth="1.5"
                      />
                      <text
                        x={paddingLeft + 5}
                        y={y - 3}
                        fill={p.type === 'bullish' ? 'var(--color-buy)' : 'var(--color-sell)'}
                        fontSize="8"
                        opacity="0.6"
                      >
                        {p.name}
                      </text>
                    </g>
                  );
                }
              }
              return null;
            })}

            {/* Draw BB area overlay */}
            {activeOverlay === 'bb' && (
              <path
                d={(() => {
                  const upperPoints: string[] = [];
                  const lowerPoints: string[] = [];
                  visibleCandles.forEach((_, i) => {
                    const origIdx = getOrigIdx(i);
                    const x = paddingLeft + (i / (visibleCandles.length - 1)) * innerWidth;
                    upperPoints.push(`${x},${getY(getTechnicalValue('bbUpper', origIdx))}`);
                    lowerPoints.unshift(`${x},${getY(getTechnicalValue('bbLower', origIdx))}`);
                  });
                  return `M ${upperPoints.join(' L ')} L ${lowerPoints.join(' L ')} Z`;
                })()}
                fill="rgba(59, 130, 246, 0.03)"
                stroke="none"
              />
            )}

            {/* Overlay Indicator lines */}
            {activeOverlay === 'ma' && (
              <>
                <polyline points={getPolylinePoints('sma20')} fill="none" stroke="#FBBF24" strokeWidth="1" />
                <polyline points={getPolylinePoints('sma50')} fill="none" stroke="#3B82F6" strokeWidth="1.2" />
                <polyline points={getPolylinePoints('sma200')} fill="none" stroke="#8B5CF6" strokeWidth="1.5" />
              </>
            )}

            {activeOverlay === 'bb' && (
              <>
                <polyline points={getPolylinePoints('bbUpper')} fill="none" stroke="rgba(59, 130, 246, 0.4)" strokeWidth="1" strokeDasharray="3 3" />
                <polyline points={getPolylinePoints('bbMiddle')} fill="none" stroke="rgba(59, 130, 246, 0.3)" strokeWidth="1" />
                <polyline points={getPolylinePoints('bbLower')} fill="none" stroke="rgba(59, 130, 246, 0.4)" strokeWidth="1" strokeDasharray="3 3" />
              </>
            )}

            {/* Candle wicks & bodies */}
            {visibleCandles.map((candle, idx) => {
              const x = paddingLeft + (idx / (visibleCandles.length - 1)) * innerWidth;
              const yOpen = getY(candle.open);
              const yClose = getY(candle.close);
              const yHigh = getY(candle.high);
              const yLow = getY(candle.low);
              const isUp = candle.close >= candle.open;
              const color = isUp ? 'var(--color-buy)' : 'var(--color-sell)';
              
              const candleWidth = Math.max(3, (innerWidth / visibleCandles.length) * 0.7);

              return (
                <g key={`candle-${idx}`}>
                  {/* Wick line */}
                  <line x1={x} y1={yHigh} x2={x} y2={yLow} stroke={color} strokeWidth="1.2" />
                  {/* Body rect */}
                  <rect
                    x={x - candleWidth / 2}
                    y={Math.min(yOpen, yClose)}
                    width={candleWidth}
                    height={Math.max(1, Math.abs(yOpen - yClose))}
                    fill={isUp ? 'transparent' : color}
                    stroke={color}
                    strokeWidth="1.2"
                  />

                  {/* Draw Anomaly Markers on Candle */}
                  {(() => {
                    const origDate = candle.date;
                    const dateAnom = anomalies.find(a => a.date === origDate);
                    if (dateAnom) {
                      const markerY = dateAnom.type === 'volume' ? yHigh - 14 : yLow + 14;
                      const isBuy = dateAnom.condition === 'buy';
                      const markerColor = isBuy ? 'var(--color-buy)' : 'var(--color-sell)';
                      if (isBuy) {
                        return (
                          <polygon
                            points={`${x},${markerY - 6} ${x - 5},${markerY + 4} ${x + 5},${markerY + 4}`}
                            fill={markerColor}
                            stroke="#000"
                            strokeWidth="1"
                            className="anomaly-marker"
                          />
                        );
                      } else {
                        return (
                          <polygon
                            points={`${x},${markerY + 6} ${x - 5},${markerY - 4} ${x + 5},${markerY - 4}`}
                            fill={markerColor}
                            stroke="#000"
                            strokeWidth="1"
                            className="anomaly-marker"
                          />
                        );
                      }
                    }
                    return null;
                  })()}
                </g>
              );
            })}

            {/* Dashboard trading recommendation overlays */}
            {(() => {
              const yEntry = getY(recommendation.suggestedEntry);
              const yTP = getY(recommendation.takeProfit);
              const ySL = getY(recommendation.stopLoss);
              return (
                <g opacity="0.8">
                  {/* Entry Line */}
                  <line x1={paddingLeft} y1={yEntry} x2={chartWidth - paddingRight} y2={yEntry} stroke="#FBBF24" strokeWidth="1" strokeDasharray="4 4" />
                  <text x={chartWidth - paddingRight - 120} y={yEntry - 4} fill="#FBBF24" fontSize="8" fontWeight="600">{t('chartEntry')}: {formatAssetPrice(assetId, recommendation.suggestedEntry)}</text>

                  {/* TP Line */}
                  <line x1={paddingLeft} y1={yTP} x2={chartWidth - paddingRight} y2={yTP} stroke="var(--color-buy)" strokeWidth="1" strokeDasharray="4 4" />
                  <text x={chartWidth - paddingRight - 110} y={yTP - 4} fill="var(--color-buy)" fontSize="8" fontWeight="600">{t('chartTP')}: {formatAssetPrice(assetId, recommendation.takeProfit)}</text>

                  {/* SL Line */}
                  <line x1={paddingLeft} y1={ySL} x2={chartWidth - paddingRight} y2={ySL} stroke="var(--color-sell)" strokeWidth="1" strokeDasharray="4 4" />
                  <text x={chartWidth - paddingRight - 110} y={ySL - 4} fill="var(--color-sell)" fontSize="8" fontWeight="600">{t('chartSL')}: {formatAssetPrice(assetId, recommendation.stopLoss)}</text>
                </g>
              );
            })()}

            {/* Hover vertical crosshair line */}
            {hoverIndex !== null && (
              <line
                x1={paddingLeft + (hoverIndex / (visibleCandles.length - 1)) * innerWidth}
                y1={paddingTop}
                x2={paddingLeft + (hoverIndex / (visibleCandles.length - 1)) * innerWidth}
                y2={chartHeight - paddingBottom}
                stroke="rgba(255,255,255,0.18)"
                strokeWidth="1.2"
                strokeDasharray="3 3"
              />
            )}
          </g>

          {/* 3. Volume Panel Frame */}
          <g transform={`translate(0, ${chartHeight})`}>
            <rect x={paddingLeft} y="0" width={innerWidth} height={volumeHeight - 10} fill="rgba(255,255,255,0.01)" stroke="rgba(255,255,255,0.03)" />
            <line x1={paddingLeft} y1="0" x2={chartWidth - paddingRight} y2="0" stroke="rgba(255,255,255,0.06)" />
            
            {visibleCandles.map((candle, idx) => {
              const x = paddingLeft + (idx / (visibleCandles.length - 1)) * innerWidth;
              const maxVol = Math.max(...visibleCandles.map(c => c.volume)) || 1;
              const h = ((candle.volume / maxVol) * (volumeHeight - 20));
              const isUp = candle.close >= candle.open;
              const color = isUp ? 'rgba(16, 185, 129, 0.4)' : 'rgba(239, 68, 68, 0.4)';
              const candleWidth = Math.max(2, (innerWidth / visibleCandles.length) * 0.6);

              return (
                <rect
                  key={`vol-${idx}`}
                  x={x - candleWidth / 2}
                  y={volumeHeight - 15 - h}
                  width={candleWidth}
                  height={Math.max(1, h)}
                  fill={color}
                />
              );
            })}
            <text x={chartWidth - paddingRight + 5} y="15" fill="var(--text-secondary)" fontSize="8">{t('chartVolume')}</text>
          </g>

          {/* 4. Secondary Technical Indicator Frame (RSI/MACD) */}
          <g transform={`translate(0, ${chartHeight + volumeHeight})`}>
            <line x1={paddingLeft} y1="0" x2={chartWidth - paddingRight} y2="0" stroke="rgba(255,255,255,0.06)" />
            
            {activeIndicator === 'rsi' ? (
              // RSI Pane
              <g>
                <line x1={paddingLeft} y1={((100 - 70) / 100) * (indicatorHeight - 20)} x2={chartWidth - paddingRight} y2={((100 - 70) / 100) * (indicatorHeight - 20)} stroke="rgba(239, 68, 68, 0.2)" strokeDasharray="3 3" />
                <line x1={paddingLeft} y1={((100 - 30) / 100) * (indicatorHeight - 20)} x2={chartWidth - paddingRight} y2={((100 - 30) / 100) * (indicatorHeight - 20)} stroke="rgba(16, 185, 129, 0.2)" strokeDasharray="3 3" />
                <polyline
                  points={visibleCandles.map((_, i) => {
                    const origIdx = getOrigIdx(i);
                    const r = getTechnicalValue('rsi', origIdx) || 50;
                    const x = paddingLeft + (i / (visibleCandles.length - 1)) * innerWidth;
                    const y = ((100 - r) / 100) * (indicatorHeight - 20);
                    return `${x},${y}`;
                  }).join(' ')}
                  fill="none"
                  stroke="#8B5CF6"
                  strokeWidth="1.2"
                />
                <text x={chartWidth - paddingRight + 5} y="20" fill="var(--text-secondary)" fontSize="8">{t('chartRsi')}</text>
                <text x={chartWidth - paddingRight + 5} y={((100 - 70) / 100) * (indicatorHeight - 20) + 3} fill="var(--color-sell)" fontSize="7" opacity="0.6">70</text>
                <text x={chartWidth - paddingRight + 5} y={((100 - 30) / 100) * (indicatorHeight - 20) + 3} fill="var(--color-buy)" fontSize="7" opacity="0.6">30</text>
              </g>
            ) : activeIndicator === 'macd' ? (
              // MACD Pane
              <g>
                <line x1={paddingLeft} y1={(indicatorHeight - 20) / 2} x2={chartWidth - paddingRight} y2={(indicatorHeight - 20) / 2} stroke="rgba(255,255,255,0.06)" />
                
                {/* MACD Histograms */}
                {visibleCandles.map((_, idx) => {
                  const origIdx = getOrigIdx(idx);
                  const val = getTechnicalValue('macdHist', origIdx) || 0;
                  const maxMacd = Math.max(...visibleCandles.map((_, id) => Math.abs(getTechnicalValue('macdHist', getOrigIdx(id))))) || 1;
                  
                  const x = paddingLeft + (idx / (visibleCandles.length - 1)) * innerWidth;
                  const scale = (indicatorHeight - 20) / 2;
                  const h = (val / maxMacd) * (scale - 5);
                  
                  const color = val >= 0 ? 'rgba(16, 185, 129, 0.4)' : 'rgba(239, 68, 68, 0.4)';
                  const barWidth = Math.max(1.5, (innerWidth / visibleCandles.length) * 0.4);

                  return (
                    <rect
                      key={`macdhist-${idx}`}
                      x={x - barWidth / 2}
                      y={val >= 0 ? scale - h : scale}
                      width={barWidth}
                      height={Math.max(1, Math.abs(h))}
                      fill={color}
                    />
                  );
                })}

                {/* MACD Line */}
                <polyline
                  points={visibleCandles.map((_, i) => {
                    const origIdx = getOrigIdx(i);
                    const val = getTechnicalValue('macd', origIdx) || 0;
                    const maxMacd = Math.max(...visibleCandles.map((_, id) => Math.abs(getTechnicalValue('macd', getOrigIdx(id))))) || 1;
                    const x = paddingLeft + (i / (visibleCandles.length - 1)) * innerWidth;
                    const scale = (indicatorHeight - 20) / 2;
                    const y = scale - (val / maxMacd) * (scale - 5);
                    return `${x},${y}`;
                  }).join(' ')}
                  fill="none"
                  stroke="#3B82F6"
                  strokeWidth="1"
                />

                {/* Signal Line */}
                <polyline
                  points={visibleCandles.map((_, i) => {
                    const origIdx = getOrigIdx(i);
                    const val = getTechnicalValue('macdSignal', origIdx) || 0;
                    const maxMacd = Math.max(...visibleCandles.map((_, id) => Math.abs(getTechnicalValue('macdSignal', getOrigIdx(id))))) || 1;
                    const x = paddingLeft + (i / (visibleCandles.length - 1)) * innerWidth;
                    const scale = (indicatorHeight - 20) / 2;
                    const y = scale - (val / maxMacd) * (scale - 5);
                    return `${x},${y}`;
                  }).join(' ')}
                  fill="none"
                  stroke="#FBBF24"
                  strokeWidth="1"
                />
                
                <text x={chartWidth - paddingRight + 5} y="20" fill="var(--text-secondary)" fontSize="8">{t('chartMacd')}</text>
              </g>
            ) : (
              // On-Chain Pane (Funding Rate & Liquidations)
              <g>
                {/* Center line (zero funding rate) */}
                <line x1={paddingLeft} y1={(indicatorHeight - 20) / 2} x2={chartWidth - paddingRight} y2={(indicatorHeight - 20) / 2} stroke="rgba(255,255,255,0.06)" />
                
                {/* Liquidations Bars (orange/red) */}
                {visibleCandles.map((candle, idx) => {
                  const val = candle.liquidations || 0;
                  const maxLiq = Math.max(...visibleCandles.map(c => c.liquidations || 0)) || 1;
                  
                  const x = paddingLeft + (idx / (visibleCandles.length - 1)) * innerWidth;
                  const scale = indicatorHeight - 20;
                  const h = (val / maxLiq) * (scale - 25);
                  
                  const color = 'rgba(244, 63, 94, 0.45)'; // Rosy red for liquidations
                  const barWidth = Math.max(2, (innerWidth / visibleCandles.length) * 0.5);

                  return (
                    <rect
                      key={`onchain-liq-${idx}`}
                      x={x - barWidth / 2}
                      y={scale - 15 - h}
                      width={barWidth}
                      height={Math.max(1, h)}
                      fill={color}
                    />
                  );
                })}

                {/* Funding Rate Line (cyan/blue) */}
                <polyline
                  points={visibleCandles.map((candle, i) => {
                    const val = candle.fundingRate || 0;
                    const maxFunding = Math.max(...visibleCandles.map(c => Math.abs(c.fundingRate || 0))) || 0.0006;
                    const x = paddingLeft + (i / (visibleCandles.length - 1)) * innerWidth;
                    const scale = (indicatorHeight - 20) / 2;
                    const y = scale - (val / maxFunding) * (scale - 15);
                    return `${x},${y}`;
                  }).join(' ')}
                  fill="none"
                  stroke="var(--color-info)"
                  strokeWidth="1.5"
                />

                <text x={chartWidth - paddingRight + 5} y="20" fill="var(--color-info)" fontSize="8">{t('chartFundingRate')}</text>
                <text x={chartWidth - paddingRight + 5} y="35" fill="rgba(244, 63, 94, 0.9)" fontSize="8">{t('chartLiquidations')}</text>
              </g>
            )}
          </g>
        </svg>

        {/* 5. Tooltip HUD Panel (renders on hover) */}
        {(() => {
          if (hoverIndex === null) return null;
          const safeHoverIdx = Math.max(0, Math.min(visibleCandles.length - 1, Math.floor(hoverIndex)));
          const hoveredCandle = visibleCandles[safeHoverIdx];
          const hoveredOrigIdx = getOrigIdx(safeHoverIdx);
          const dateAnom = anomalies.find(a => a.date === hoveredCandle.date);
          const anomIsBuy = dateAnom?.condition === 'buy';
          return (
            <div className="tooltip-hud">
              <div className="tooltip-header">
                <span>{t('tooltipDate')}: {hoveredCandle.date}</span>
                {dateAnom && (
                  <span className={`tooltip-anomaly-badge ${anomIsBuy ? 'buy' : 'sell'}`}>
                    <AlertTriangle size={10} /> {t('tooltipAnomaly')} ({anomIsBuy ? t('tooltipBuy') : t('tooltipSell')})
                  </span>
                )}
              </div>
              <div>{t('tooltipOpen')}: <strong className="text-primary-strong">{hoveredCandle.open}</strong></div>
              <div>{t('tooltipClose')}: <strong className="text-primary-strong">{hoveredCandle.close}</strong></div>
              <div>{t('tooltipHigh')}: <strong className="text-primary-strong">{hoveredCandle.high}</strong></div>
              <div>{t('tooltipLow')}: <strong className="text-primary-strong">{hoveredCandle.low}</strong></div>
              <div>{t('tooltipVol')}: <strong className="text-primary-strong">{hoveredCandle.volume.toLocaleString()}</strong></div>

              {hoveredCandle.fundingRate !== undefined && (
                <div>{t('tooltipFunding')}: <strong className="text-info-strong">{(hoveredCandle.fundingRate * 100).toFixed(4)}%</strong></div>
              )}
              {hoveredCandle.liquidations !== undefined && (
                <div>{t('tooltipLiqs')}: <strong className="text-liq-strong">${(hoveredCandle.liquidations / 1000000).toFixed(2)}M</strong></div>
              )}

              {activeIndicator === 'rsi' ? (
                <div className="tooltip-span-2">
                  {t('tooltipRsi')}: <strong className="text-rsi-strong">{getTechnicalValue('rsi', hoveredOrigIdx).toFixed(1)}</strong>
                </div>
              ) : activeIndicator === 'macd' ? (
                <div className="tooltip-span-2">
                  {t('tooltipMacdHist')}: <strong className="text-macd-strong">{getTechnicalValue('macdHist', hoveredOrigIdx).toFixed(3)}</strong>
                </div>
              ) : (
                <div className="tooltip-span-2-flex">
                  <span>{t('tooltipFunding')}: <strong className="text-info-strong">{(hoveredCandle.fundingRate! * 100).toFixed(4)}%</strong></span>
                  <span>{t('tooltipLiqs')}: <strong className="text-liq-strong">${(hoveredCandle.liquidations! / 1000000).toFixed(2)}M</strong></span>
                </div>
              )}

              {dateAnom && (
                <div className={`tooltip-anomaly-desc ${anomIsBuy ? 'buy' : 'sell'}`}>
                  <strong>{anomIsBuy ? t('tooltipBullish') : t('tooltipBearish')}: </strong>{dateAnom.message}
                </div>
              )}
            </div>
          );
        })()}
      </div>

      <style>{`
        .btn-tool {
          background-color: rgba(255,255,255,0.03);
          border: 1px solid var(--border-color);
          color: var(--text-secondary);
          border-radius: 6px;
          padding: 6px 10px;
          font-size: 0.75rem;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
          display: inline-flex;
          align-items: center;
          justify-content: center;
        }
        .btn-tool:hover {
          background-color: rgba(255,255,255,0.07);
          border-color: var(--text-primary);
          color: var(--text-primary);
        }
        .btn-tool.active {
          background-color: var(--color-info-bg);
          border-color: var(--color-info);
          color: var(--text-primary);
        }
        .chart-svg {
          overflow: visible;
        }
        .anomaly-marker {
          cursor: pointer;
        }
        .tooltip-hud {
          position: absolute;
          top: 40px;
          left: 20px;
          background-color: rgba(9, 14, 28, 0.95);
          border: 1px solid var(--border-color);
          border-radius: 8px;
          padding: 10px 14px;
          font-size: 0.8rem;
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 6px 14px;
          z-index: 10;
          box-shadow: 0 4px 20px rgba(0,0,0,0.5);
          min-width: 220px;
        }
        .tooltip-header {
          grid-column: span 2;
          font-weight: 700;
          border-bottom: 1px solid var(--border-color);
          padding-bottom: 4px;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .tooltip-anomaly-badge {
          font-size: 0.7rem;
          display: flex;
          align-items: center;
          gap: 2px;
          font-weight: bold;
        }
        .tooltip-anomaly-badge.buy {
          color: var(--color-buy);
        }
        .tooltip-anomaly-badge.sell {
          color: var(--color-sell);
        }
        .text-primary-strong {
          color: var(--text-primary);
        }
        .text-info-strong {
          color: var(--color-info);
        }
        .text-liq-strong {
          color: rgba(244, 63, 94, 0.95);
        }
        .text-rsi-strong {
          color: #8B5CF6;
        }
        .text-macd-strong {
          color: #3B82F6;
        }
        .tooltip-span-2 {
          grid-column: span 2;
        }
        .tooltip-span-2-flex {
          grid-column: span 2;
          display: flex;
          gap: 10px;
        }
        .tooltip-anomaly-desc {
          grid-column: span 2;
          font-size: 0.7rem;
          margin-top: 4px;
          border-top: 1px dashed rgba(255,255,255,0.1);
          padding-top: 4px;
        }
        .tooltip-anomaly-desc.buy {
          color: var(--color-buy);
        }
        .tooltip-anomaly-desc.sell {
          color: var(--color-sell);
        }
      `}</style>
    </div>
  );
};
