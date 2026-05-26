import React, { useState } from 'react';
import { Download, TrendingUp, DollarSign, Percent, ShieldAlert, Award } from 'lucide-react';
import { formatAssetPrice } from '../utils/formatter.ts';

interface BacktestTrade {
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

interface EquityCurvePoint {
  date: string;
  strategy: number;
  btc: number;
  spx: number;
}

interface BacktestResult {
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

interface BacktestViewProps {
  results: BacktestResult | null;
  loading: boolean;
  onRunBacktest: () => void;
}

export const BacktestView: React.FC<BacktestViewProps> = ({
  results,
  loading,
  onRunBacktest
}) => {
  const [currentPage, setCurrentPage] = useState(1);
  const [filterAsset, setFilterAsset] = useState('ALL');
  const [filterAction, setFilterAction] = useState('ALL');
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  const itemsPerPage = 8;

  if (loading) {
    return (
      <div className="glass-panel flex-center" style={{ height: '350px', flexDirection: 'column', gap: '16px' }}>
        <div className="spinner" />
        <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Running Backtest Simulations...</span>
      </div>
    );
  }

  if (!results) {
    return (
      <div className="glass-panel flex-center" style={{ height: '350px', flexDirection: 'column', gap: '16px' }}>
        <Award size={48} style={{ color: 'var(--text-muted)' }} />
        <span style={{ fontSize: '1rem', color: 'var(--text-secondary)' }}>No backtest results loaded yet.</span>
        <button
          onClick={onRunBacktest}
          style={{
            backgroundColor: 'var(--color-info)',
            border: 'none',
            color: '#fff',
            padding: '10px 20px',
            borderRadius: '8px',
            fontWeight: 600,
            cursor: 'pointer'
          }}
        >
          Run Backtest Simulator
        </button>
      </div>
    );
  }

  const { equityCurve, tradeLog } = results;

  // Filter trade log
  const filteredTrades = tradeLog.filter(trade => {
    const matchAsset = filterAsset === 'ALL' || trade.assetId === filterAsset;
    const matchAction = filterAction === 'ALL' || trade.action === filterAction;
    return matchAsset && matchAction;
  });

  // Pagination calculations
  const totalPages = Math.ceil(filteredTrades.length / itemsPerPage) || 1;
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedTrades = filteredTrades.slice(startIndex, startIndex + itemsPerPage);

  // Render SVG Equity Curve Chart
  const renderEquityChart = () => {
    if (equityCurve.length < 2) return null;

    const values = equityCurve.map(pt => [pt.strategy, pt.btc, pt.spx]).flat();
    const minVal = Math.min(...values) * 0.98;
    const maxVal = Math.max(...values) * 1.02;
    const range = maxVal - minVal || 1;

    const width = 720;
    const height = 240;
    const paddingLeft = 40;
    const paddingRight = 60;
    const paddingTop = 10;
    const paddingBottom = 20;

    const innerWidth = width - paddingLeft - paddingRight;
    const innerHeight = height - paddingTop - paddingBottom;

    const getX = (idx: number) => paddingLeft + (idx / (equityCurve.length - 1)) * innerWidth;
    const getY = (val: number) => height - ((val - minVal) / range) * innerHeight - paddingBottom;

    // Generate path points
    const strategyPoints = equityCurve.map((pt, i) => `${getX(i)},${getY(pt.strategy)}`).join(' L ');
    const btcPoints = equityCurve.map((pt, i) => `${getX(i)},${getY(pt.btc)}`).join(' L ');
    const spxPoints = equityCurve.map((pt, i) => `${getX(i)},${getY(pt.spx)}`).join(' L ');

    const areaPoints = `${getX(0)},${height - paddingBottom} L ${strategyPoints} L ${getX(equityCurve.length - 1)},${height - paddingBottom} Z`;

    const gridLines = [];
    for (let i = 0; i <= 4; i++) {
      const pct = i / 4;
      const y = paddingTop + pct * innerHeight;
      const val = maxVal - pct * (maxVal - minVal);
      gridLines.push(
        <g key={`grid-eq-y-${i}`}>
          <line x1={paddingLeft} y1={y} x2={width - paddingRight} y2={y} stroke="rgba(255,255,255,0.03)" strokeWidth="1" strokeDasharray="3 3" />
          <text x={width - paddingRight + 5} y={y + 3} fill="var(--text-secondary)" fontSize="8" fontFamily="var(--font-display)">
            ${Math.round(val).toLocaleString()}
          </text>
        </g>
      );
    }

    return (
      <svg
        viewBox={`0 0 ${width} ${height}`}
        width="100%"
        height="100%"
        style={{ overflow: 'visible' }}
        onMouseLeave={() => setHoverIndex(null)}
        onMouseMove={(e) => {
          const rect = e.currentTarget.getBoundingClientRect();
          const clickX = e.clientX - rect.left;
          const pct = (clickX - paddingLeft) / (rect.width * (innerWidth / width));
          const idx = Math.round(pct * (equityCurve.length - 1));
          if (idx >= 0 && idx < equityCurve.length) {
            setHoverIndex(idx);
          } else {
            setHoverIndex(null);
          }
        }}
      >
        <defs>
          <linearGradient id="strategyGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--color-info)" stopOpacity="0.2" />
            <stop offset="100%" stopColor="var(--color-info)" stopOpacity="0.0" />
          </linearGradient>
        </defs>
        {gridLines}

        {/* Strategy area */}
        <path d={areaPoints} fill="url(#strategyGrad)" stroke="none" />

        {/* Benchmark Lines */}
        <path d={`M ${btcPoints}`} fill="none" stroke="var(--color-hold)" strokeWidth="1" strokeOpacity="0.6" strokeDasharray="3 3" />
        <path d={`M ${spxPoints}`} fill="none" stroke="var(--color-sell)" strokeWidth="1" strokeOpacity="0.6" strokeDasharray="3 3" />

        {/* Strategy Line */}
        <path d={`M ${strategyPoints}`} fill="none" stroke="var(--color-info)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />

        {/* Hover Crosshair */}
        {hoverIndex !== null && (() => {
          const point = equityCurve.find((_, idx) => idx === hoverIndex);
          if (!point) return null;
          return (
            <>
              <line x1={getX(hoverIndex)} y1={paddingTop} x2={getX(hoverIndex)} y2={height - paddingBottom} stroke="rgba(255,255,255,0.15)" strokeWidth="1" strokeDasharray="3 3" />
              <circle cx={getX(hoverIndex)} cy={getY(point.strategy)} r="4" fill="var(--color-info)" stroke="#000" strokeWidth="1.2" />
              <circle cx={getX(hoverIndex)} cy={getY(point.btc)} r="3" fill="var(--color-hold)" stroke="#000" strokeWidth="1" />
              <circle cx={getX(hoverIndex)} cy={getY(point.spx)} r="3" fill="var(--color-sell)" stroke="#000" strokeWidth="1" />
            </>
          );
        })()}
      </svg>
    );
  };

  // Export CSV Handler
  const handleExportCSV = () => {
    const headers = [
      'Date', 'Asset', 'Action', 'Size Amount ($)', 'Execution Price', 
      'Shares Bought', 'Transaction Fee ($)', 'Slippage ($)', 'Regime Context', 
      'Portfolio Value ($)', 'Realized P&L ($)', 'Realized P&L (%)', 'Stop Loss', 'Take Profit'
    ];
    const rows = tradeLog.map(t => [
      t.date,
      t.assetId,
      t.action,
      t.amount,
      t.price,
      t.shares,
      t.fee,
      t.slippage,
      t.regime,
      t.portfolioValue,
      t.pnl !== undefined ? t.pnl : '',
      t.pnlPercent !== undefined ? t.pnlPercent : '',
      t.stopLoss !== undefined ? t.stopLoss : '',
      t.takeProfit !== undefined ? t.takeProfit : ''
    ]);

    const csvContent = "data:text/csv;charset=utf-8,"
      + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `macrosignal_radar_backtest_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const uniqueAssets = Array.from(new Set(tradeLog.map(t => t.assetId))).filter(id => id !== 'CASH');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      
      {/* 1. Statistics Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
        
        {/* Cumulative Return */}
        <div className="glass-panel" style={{ padding: '14px 18px', display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{ width: '40px', height: '40px', borderRadius: '8px', backgroundColor: 'var(--color-buy-bg)', color: 'var(--color-buy)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Percent size={20} />
          </div>
          <div>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block' }}>Strategy Return</span>
            <span style={{ fontSize: '1.25rem', fontWeight: 800, fontFamily: 'var(--font-display)', color: 'var(--color-buy)' }}>
              +{results.cumulativeReturn}%
            </span>
          </div>
        </div>

        {/* Sharpe Ratio */}
        <div className="glass-panel" style={{ padding: '14px 18px', display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{ width: '40px', height: '40px', borderRadius: '8px', backgroundColor: 'var(--color-info-bg)', color: 'var(--color-info)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <TrendingUp size={20} />
          </div>
          <div>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block' }}>Sharpe Ratio</span>
            <span style={{ fontSize: '1.25rem', fontWeight: 800, fontFamily: 'var(--font-display)' }}>
              {results.sharpeRatio}
            </span>
          </div>
        </div>

        {/* Max Drawdown */}
        <div className="glass-panel" style={{ padding: '14px 18px', display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{ width: '40px', height: '40px', borderRadius: '8px', backgroundColor: 'var(--color-sell-bg)', color: 'var(--color-sell)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <ShieldAlert size={20} />
          </div>
          <div>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block' }}>Max Drawdown</span>
            <span style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--color-sell)', fontFamily: 'var(--font-display)' }}>
              {results.maxDrawdown}%
            </span>
          </div>
        </div>

        {/* Total Portfolio Value */}
        <div className="glass-panel" style={{ padding: '14px 18px', display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{ width: '40px', height: '40px', borderRadius: '8px', backgroundColor: 'var(--border-color)', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <DollarSign size={20} />
          </div>
          <div>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block' }}>Portfolio Value</span>
            <span style={{ fontSize: '1.25rem', fontWeight: 800, fontFamily: 'var(--font-display)' }}>
              ${results.finalValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>
        </div>
      </div>

      {/* 2. Equity Curve Chart */}
      <div className="glass-panel" style={{ padding: '16px', position: 'relative' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
          <div>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, fontFamily: 'var(--font-display)' }}>Equity Curve comparison</h3>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Strategy vs Buy-and-Hold Benchmarks ($100 Weekly DCA)</span>
          </div>
          <div style={{ display: 'flex', gap: '12px', fontSize: '0.75rem' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><span style={{ width: '8px', height: '8px', backgroundColor: 'var(--color-info)', borderRadius: '50%' }} /> Radar Strategy (+{results.cumulativeReturn}%)</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><span style={{ width: '8px', height: '8px', backgroundColor: 'var(--color-hold)', borderRadius: '50%' }} /> Bitcoin DCA (+{results.benchmarkReturns.btc}%)</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><span style={{ width: '8px', height: '8px', backgroundColor: 'var(--color-sell)', borderRadius: '50%' }} /> S&P 500 DCA (+{results.benchmarkReturns.spx}%)</span>
          </div>
        </div>

        <div style={{ position: 'relative', width: '100%' }}>
          {renderEquityChart()}

          {/* Hover HUD for Equity details */}
          {hoverIndex !== null && (() => {
            const point = equityCurve.find((_, idx) => idx === hoverIndex);
            if (!point) return null;
            return (
              <div
                style={{
                  position: 'absolute',
                  top: '20px',
                  left: '20px',
                  backgroundColor: 'rgba(9, 14, 28, 0.95)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '6px',
                  padding: '8px 12px',
                  fontSize: '0.75rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '4px',
                  boxShadow: '0 4px 10px rgba(0,0,0,0.5)',
                  minWidth: '180px'
                }}
              >
                <div style={{ fontWeight: 700, borderBottom: '1px solid var(--border-color)', paddingBottom: '3px', marginBottom: '2px' }}>
                  Date: {point.date}
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Radar Strategy:</span>
                  <strong style={{ color: 'var(--color-info)' }}>${point.strategy.toLocaleString()}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>BTC DCA:</span>
                  <strong style={{ color: 'var(--color-hold)' }}>${point.btc.toLocaleString()}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>S&P 500 DCA:</span>
                  <strong style={{ color: 'var(--color-sell)' }}>${point.spx.toLocaleString()}</strong>
                </div>
              </div>
            );
          })()}
        </div>
      </div>

      {/* 3. Trade Log Table */}
      <div className="glass-panel" style={{ padding: '16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '10px' }}>
          <div>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, fontFamily: 'var(--font-display)' }}>Backtest Trade Log</h3>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Review historically simulated buys and skips</span>
          </div>

          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {/* Filter Asset */}
            <select
              value={filterAsset}
              onChange={(e) => { setFilterAsset(e.target.value); setCurrentPage(1); }}
              className="select-filter"
              title="Filter by Asset"
            >
              <option value="ALL">All Assets</option>
              {uniqueAssets.map(id => <option key={id} value={id}>{id}</option>)}
            </select>

            {/* Filter Action */}
            <select
              value={filterAction}
              onChange={(e) => { setFilterAction(e.target.value); setCurrentPage(1); }}
              className="select-filter"
              title="Filter by Action"
            >
              <option value="ALL">All Actions</option>
              <option value="BUY">BUY</option>
              <option value="SKIP (CRISIS)">SKIP (CRISIS)</option>
              <option value="HOLD CASH">HOLD CASH</option>
              <option value="SELL (SL)">SELL (SL)</option>
              <option value="SELL (TP)">SELL (TP)</option>
              <option value="SELL (END)">SELL (END)</option>
            </select>

            {/* Export */}
            <button onClick={handleExportCSV} className="btn-export">
              <Download size={12} /> CSV Export
            </button>
          </div>
        </div>

        {/* Table layout */}
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem', textAlign: 'left' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-secondary)' }}>
                <th style={{ padding: '10px' }}>Date</th>
                <th style={{ padding: '10px' }}>Asset</th>
                <th style={{ padding: '10px' }}>Action</th>
                <th style={{ padding: '10px' }}>Size Amount</th>
                <th style={{ padding: '10px' }}>Execution Price</th>
                <th style={{ padding: '10px' }}>Shares</th>
                <th style={{ padding: '10px' }}>Stop Loss / Take Profit</th>
                <th style={{ padding: '10px' }}>Realized P&L</th>
                <th style={{ padding: '10px' }}>Active Regime</th>
                <th style={{ padding: '10px', textAlign: 'right' }}>Portfolio Value</th>
              </tr>
            </thead>
            <tbody>
              {paginatedTrades.map((trade, idx) => {
                const isBuy = trade.action === 'BUY';
                const isSkip = trade.action === 'SKIP (CRISIS)';
                const isSellSL = trade.action === 'SELL (SL)';
                const isSellTP = trade.action === 'SELL (TP)';
                const isSellEnd = trade.action === 'SELL (END)';
                
                return (
                  <tr key={idx} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)', transition: 'background-color 0.2s' }} className="table-row">
                    <td style={{ padding: '10px', whiteSpace: 'nowrap' }}>{trade.date}</td>
                    <td style={{ padding: '10px', fontWeight: 700 }}>{trade.assetId}</td>
                    <td style={{ padding: '10px' }}>
                      <span
                        className="badge-action"
                        style={{
                          backgroundColor: isBuy ? 'var(--color-buy-bg)' : isSkip ? 'var(--color-sell-bg)' : isSellSL ? 'rgba(239, 68, 68, 0.15)' : isSellTP ? 'rgba(16, 185, 129, 0.15)' : isSellEnd ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.05)',
                          color: isBuy ? 'var(--color-buy)' : isSkip ? 'var(--color-sell)' : isSellSL ? '#EF4444' : isSellTP ? '#10B981' : isSellEnd ? 'var(--text-primary)' : 'var(--text-secondary)',
                          border: `1px solid ${isBuy ? 'rgba(16,185,129,0.3)' : isSkip ? 'rgba(244,63,94,0.3)' : isSellSL ? 'rgba(239, 68, 68, 0.3)' : isSellTP ? 'rgba(16, 185, 129, 0.3)' : isSellEnd ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.08)'}`,
                          padding: '2px 6px',
                          borderRadius: '4px',
                          fontSize: '0.7rem',
                          fontWeight: 700
                        }}
                      >
                        {trade.action}
                      </span>
                    </td>
                    <td style={{ padding: '10px' }}>${trade.amount.toFixed(2)}</td>
                    <td style={{ padding: '10px' }}>{trade.price > 0 ? formatAssetPrice(trade.assetId, trade.price) : 'N/A'}</td>
                    <td style={{ padding: '10px' }}>{trade.shares > 0 ? trade.shares : 'N/A'}</td>
                    <td style={{ padding: '10px', whiteSpace: 'nowrap' }}>
                      {trade.stopLoss && trade.takeProfit ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', fontSize: '0.75rem' }}>
                          <span style={{ color: 'var(--color-sell)' }}>SL: {formatAssetPrice(trade.assetId, trade.stopLoss)}</span>
                          <span style={{ color: 'var(--color-buy)' }}>TP: {formatAssetPrice(trade.assetId, trade.takeProfit)}</span>
                        </div>
                      ) : 'N/A'}
                    </td>
                    <td style={{ padding: '10px' }}>
                      {trade.pnl !== undefined ? (
                        <span style={{ fontWeight: 700, color: trade.pnl >= 0 ? 'var(--color-buy)' : 'var(--color-sell)' }}>
                          {trade.pnl >= 0 ? '+' : ''}${trade.pnl.toLocaleString(undefined, { minimumFractionDigits: 2 })} ({trade.pnlPercent !== undefined ? `${trade.pnlPercent >= 0 ? '+' : ''}${trade.pnlPercent}%` : ''})
                        </span>
                      ) : 'N/A'}
                    </td>
                    <td style={{ padding: '10px', color: 'var(--color-regime)' }}>{trade.regime}</td>
                    <td style={{ padding: '10px', textAlign: 'right', fontWeight: 600 }}>${trade.portfolioValue.toLocaleString()}</td>
                  </tr>
                );
              })}

              {paginatedTrades.length === 0 && (
                <tr>
                  <td colSpan={10} style={{ textAlign: 'center', padding: '20px', color: 'var(--text-muted)' }}>
                    No trades match the selected filter criteria.
                  </td>
                </tr>
              )}

            </tbody>
          </table>
        </div>

        {/* Pagination controls */}
        {totalPages > 1 && (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '14px', fontSize: '0.8rem' }}>
            <span style={{ color: 'var(--text-secondary)' }}>Page {currentPage} of {totalPages}</span>
            <div style={{ display: 'flex', gap: '4px' }}>
              <button
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(prev => prev - 1)}
                className="btn-page"
              >
                Previous
              </button>
              <button
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage(prev => prev + 1)}
                className="btn-page"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      <style>{`
        .spinner {
          width: 32px;
          height: 32px;
          border: 3px solid rgba(59, 130, 246, 0.15);
          border-radius: 50%;
          border-top-color: var(--color-info);
          animation: spin 1s linear infinite;
        }
        .select-filter {
          background-color: #0b0f19;
          border: 1px solid var(--border-color);
          color: var(--text-primary);
          border-radius: 6px;
          padding: 6px 12px;
          font-size: 0.75rem;
          outline: none;
          cursor: pointer;
        }
        .select-filter:hover {
          border-color: var(--text-secondary);
        }
        .btn-export {
          background-color: var(--bg-card);
          border: 1px solid var(--border-color);
          color: var(--text-primary);
          border-radius: 6px;
          padding: 6px 12px;
          font-size: 0.75rem;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 6px;
          font-weight: 500;
        }
        .btn-export:hover {
          background-color: rgba(255,255,255,0.05);
          border-color: var(--text-secondary);
        }
        .btn-page {
          background-color: #0b0f19;
          border: 1px solid var(--border-color);
          color: var(--text-primary);
          border-radius: 4px;
          padding: 4px 10px;
          cursor: pointer;
        }
        .btn-page:hover:not(:disabled) {
          border-color: var(--text-secondary);
        }
        .btn-page:disabled {
          opacity: 0.4;
          cursor: not-allowed;
        }
        .table-row:hover {
          background-color: rgba(255,255,255,0.02);
        }
      `}</style>
    </div>
  );
};
