import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import '../i18n';
import { TrendingUp, TrendingDown, RefreshCw, BarChart2, Radio, Newspaper, ChevronDown, ChevronUp, Sparkles, Eye } from 'lucide-react';
import { formatAssetPrice } from '../utils/formatter.ts';

interface AssetSummary {
  id: string;
  name: string;
  category: 'crypto' | 'equity' | 'commodity';
  price: number;
  change24h: number;
  rating: 'Strong Buy' | 'Buy' | 'Hold' | 'Sell';
  score: number;
  sparkline: number[];
  parentIndex?: string;
}

interface BuyRecommendation {
  id: string;
  name: string;
  category: 'crypto' | 'equity' | 'commodity';
  parentIndex?: string;
  price: number;
  change24h: number;
  rating: 'Strong Buy' | 'Buy' | 'Hold' | 'Sell';
  score: number;
  technicalScore: number;
  mlScore: number;
  macroScore: number;
  newsScore: number;
  crossAssetScore: number;
  whaleScore: number;
  confidence: number;
  suggestedEntry: number;
  takeProfit: number;
  stopLoss: number;
  rationale: string[];
}

interface DashboardProps {
  assets: AssetSummary[];
  activeRegime: { name: string; description: string; scores: Record<string, number> } | null;
  newsSummary: { impactScore: number; sentimentScore: number; sentimentTrend: string } | null;
  onSelectAsset: (id: string) => void;
  onRefresh: () => void;
  loading: boolean;
  topRecommendations: BuyRecommendation[];
  loadingRecommendations: boolean;
}

export const Dashboard: React.FC<DashboardProps> = ({
  assets,
  activeRegime,
  newsSummary,
  onSelectAsset,
  onRefresh,
  loading,
  topRecommendations = [],
  loadingRecommendations
}) => {
  const { t } = useTranslation();
  const [expandedRecs, setExpandedRecs] = useState<Map<string, boolean>>(new Map());

  const toggleRationale = (id: string) => {
    setExpandedRecs(prev => {
      const next = new Map(prev);
      next.set(id, !next.get(id));
      return next;
    });
  };
  // Core asset IDs to keep the dashboard clean and performant
  const CORE_ASSET_IDS = [
    'BTC', 'ETH', 'SOL', 'NASDAQ', 'SPX', 'NYSE', 'GOLD', 'WTI', 'BCOM',
    'AAPL', 'MSFT', 'NVDA', 'TSLA', 'AMZN', 'META', 'GOOGL', 'BRK.B',
    'JPM', 'LLY', 'WMT', 'XOM'
  ];

  const coreAssetsOnly = assets.filter(a => CORE_ASSET_IDS.includes(a.id));

  // Group assets by category & parentIndex
  const cryptoAssets = coreAssetsOnly.filter(a => a.category === 'crypto');
  const indexAssets = coreAssetsOnly.filter(a => a.category === 'equity' && !a.parentIndex);
  const techAssets = coreAssetsOnly.filter(a => a.parentIndex === 'NASDAQ');
  const blueChipAssets = coreAssetsOnly.filter(a => a.parentIndex === 'SPX' || a.parentIndex === 'NYSE');
  const commodityAssets = coreAssetsOnly.filter(a => a.category === 'commodity');

  // Compute overall market sentiment score
  const avgScore = assets.length > 0 ? Math.round(assets.reduce((sum, a) => sum + a.score, 0) / assets.length) : 50;

  // Render a custom Sparkline in SVG
  const renderSparkline = (prices: number[], isPositive: boolean) => {
    if (prices.length < 2) return null;
    const min = Math.min(...prices);
    const max = Math.max(...prices);
    const range = max - min || 1;
    const width = 120;
    const height = 40;
    const points = prices.map((price, idx) => {
      const x = (idx / (prices.length - 1)) * width;
      const y = height - ((price - min) / range) * (height - 4) - 2; // inverted y with padding
      return `${x},${y}`;
    });

    const pathData = `M ${points.join(' L ')}`;
    const areaData = `${pathData} L ${width},${height} L 0,${height} Z`;
    const color = isPositive ? 'var(--color-buy)' : 'var(--color-sell)';
    const gradientId = `grad-${Math.random().toString(36).substr(2, 9)}`;

    return (
      <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.25" />
            <stop offset="100%" stopColor={color} stopOpacity="0.0" />
          </linearGradient>
        </defs>
        <path d={areaData} fill={`url(#${gradientId})`} />
        <path d={pathData} fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  };

  const getScoreColor = (score: number) => {
    if (score >= 74) return 'var(--color-buy)';
    if (score >= 58) return 'var(--color-buy)';
    if (score >= 42) return 'var(--color-hold)';
    return 'var(--color-sell)';
  };

  const renderAssetCard = (asset: AssetSummary) => {
    const isPositive = asset.change24h >= 0;
    const scoreColor = getScoreColor(asset.score);

    return (
      <div
          key={asset.id}
          className="glass-panel asset-card animate-slide-in"
          onClick={() => onSelectAsset(asset.id)}
      >
        <div className="asset-card-header">
          <div>
            <span className="asset-card-id">
              {asset.id}
            </span>
            <span className="asset-card-name">
              {asset.name}
            </span>
          </div>
          <div className={`badge-rating ${asset.rating.toLowerCase().replace(' ', '-')}`}>
            {asset.rating}
          </div>
        </div>

        <div className="asset-card-price-row">
          <div>
            <span className="asset-card-price">
              {formatAssetPrice(asset.id, asset.price)}
            </span>
            <span className={`asset-card-change ${isPositive ? 'asset-card-change--up' : 'asset-card-change--down'}`}>
              {isPositive ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
              {isPositive ? '+' : ''}{asset.change24h}%
            </span>
          </div>
          <div>
            {renderSparkline(asset.sparkline, isPositive)}
          </div>
        </div>

        <div className="asset-card-footer">
          <span className="asset-card-score-label">
            <BarChart2 size={12} /> Model Score
          </span>
          <span className="asset-card-score-value" style={{ color: scoreColor }}>
            {asset.score}/100
          </span>
        </div>
      </div>
    );
  };

  return (
    <div className="dash-root">
      
      {/* 1. Market Health Summary & Regime Indicator */}
      <div className="dash-summary-grid">
        
        {/* Active Regime */}
        <div className="glass-panel dash-summary-card">
          <div className="dash-summary-icon dash-summary-icon--regime">
            <Radio size={24} className="pulse-glow-regime" />
          </div>
          <div>
            <span className="dash-summary-label">{t('dashActiveMacroRegime')}</span>
            <span className="dash-summary-value dash-summary-value--regime">
              {activeRegime ? activeRegime.name : 'Detecting...'}
            </span>
            <span className="dash-summary-desc">
              {activeRegime ? activeRegime.description : ''}
            </span>
          </div>
        </div>

        {/* Unified Sentiment */}
        <div className="glass-panel dash-summary-card">
          <div className="dash-summary-icon dash-summary-icon--buy">
            <TrendingUp size={24} />
          </div>
          <div>
            <span className="dash-summary-label">{t('dashRadarSentiment')}</span>
            <span className="dash-summary-value">
              {avgScore} / 100
            </span>
            <span className="dash-summary-desc">
              {avgScore >= 60 ? 'Bullish Accumulation bias' : avgScore <= 40 ? 'De-risking Liquidation bias' : 'Neutral consolidation bias'}
            </span>
          </div>
        </div>

        {/* News Intelligence */}
        <div className="glass-panel dash-summary-card">
          <div className="dash-summary-icon dash-summary-icon--info">
            <Newspaper size={24} />
          </div>
          <div>
            <span className="dash-summary-label">{t('dashNewsCatalyst')}</span>
            <span className="dash-summary-value">
              {t('dashImpact')}: {newsSummary ? newsSummary.impactScore : 0}%
            </span>
            <span className="dash-summary-desc">
              {t('dashSentiment')}: <strong className={newsSummary?.sentimentScore && newsSummary.sentimentScore > 0 ? 'text-buy' : 'text-sell'}>
                {newsSummary ? (newsSummary.sentimentScore > 0 ? 'Bullish' : 'Bearish') : 'Neutral'} ({newsSummary ? newsSummary.sentimentScore : 0})
              </strong>
            </span>
          </div>
        </div>
      </div>

      {/* 2. Top Buy Recommendations Section */}
      <div className="glass-panel dash-recs-panel">
        <div className="dash-recs-header">
          <div>
            <h2 className="dash-recs-title">
              <Sparkles size={18} className="dash-recs-sparkle" /> Top 5 Daily Buy Recommendations
            </h2>
            <span className="dash-recs-subtitle">
              {t('dashTopMomentum')}
            </span>
          </div>
          <span className="badge-rating strong-buy dash-recs-badge">
            {t('dashActiveSignalFilter')}
          </span>
        </div>

        {loadingRecommendations ? (
          <div className="dash-recs-loading">
            <div className="spinner" />
            <span className="dash-recs-loading-text">{t('dashRunningML')}</span>
          </div>
        ) : topRecommendations.length === 0 ? (
          <div className="dash-recs-empty">
            {t('dashNoSignals')}
          </div>
        ) : (
          <div className="dash-recs-list">
            {topRecommendations.map((rec) => {
              const isPositive = rec.change24h >= 0;
              const isExpanded = !!expandedRecs.get(rec.id);
              
              // Format category badge text
              let categoryLabel = 'NASDAQ Stock';
              if (rec.category === 'crypto') categoryLabel = 'Coinbase Crypto';
              else if (rec.parentIndex === 'SPX' || rec.parentIndex === 'NYSE') categoryLabel = `${rec.parentIndex} Stock`;

              return (
                <div key={rec.id} className="rec-card">
                  <div className="rec-card-row">
                    
                    {/* Ticker & Name */}
                    <div className="rec-ticker-group">
                      <div className="rec-ticker-link" onClick={() => onSelectAsset(rec.id)}>
                        <span className="rec-ticker-id">{rec.id}</span>
                        <span className="rec-ticker-name">{rec.name}</span>
                      </div>
                      <span className={`rec-category-badge ${rec.category === 'crypto' ? 'rec-category-badge--crypto' : 'rec-category-badge--equity'}`}>
                        {categoryLabel}
                      </span>
                    </div>

                    {/* Price & Change */}
                    <div className="rec-price-group">
                      <span className="rec-price">{formatAssetPrice(rec.id, rec.price)}</span>
                      <span className={`rec-change ${isPositive ? 'rec-change--up' : 'rec-change--down'}`}>
                        {isPositive ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                        {isPositive ? '+' : ''}{rec.change24h}%
                      </span>
                    </div>

                    {/* Score Bar */}
                    <div className="rec-score-group">
                      <div className="rec-score-bar-wrap">
                        <div className="rec-score-bar-header">
                          <span className="rec-score-label">{t('dashSignalScore')}</span>
                          <strong className="rec-score-value">{rec.score}/100</strong>
                        </div>
                        <div className="rec-score-track">
                          <div className="rec-score-fill" style={{ width: `${rec.score}%` }} />
                        </div>
                      </div>
                      <span className={`badge-rating rec-rating-badge ${rec.rating.toLowerCase().replace(' ', '-')}`}>
                        {rec.rating}
                      </span>
                    </div>

                    {/* Action buttons */}
                    <div className="rec-actions">
                      <button
                        onClick={() => toggleRationale(rec.id)}
                        className={`toggle-rationale-btn ${isExpanded ? 'toggle-rationale-btn--expanded' : ''}`}
                      >
                        {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />} {t('dashRationale')}
                      </button>
                      <button onClick={() => onSelectAsset(rec.id)} className="btn-tool rec-analyze-btn">
                        <Eye size={12} /> {t('dashAnalyze')}
                      </button>
                    </div>
                  </div>

                  {/* Expanded Rationale & Trading Plan Details */}
                  {isExpanded && (
                    <div 
                      style={{ 
                        borderTop: '1px dashed var(--border-color)',
                        paddingTop: '12px',
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                        gap: '16px',
                        animation: 'slideIn 0.2s ease-out'
                      }}
                    >
                      {/* Trading levels */}
                      <div 
                        style={{ 
                          backgroundColor: 'rgba(255,255,255,0.01)',
                          border: '1px solid var(--border-color)',
                          borderRadius: '8px',
                          padding: '10px 12px',
                          display: 'grid',
                          gridTemplateColumns: '1fr 1fr',
                          gap: '8px',
                          alignContent: 'center',
                          fontSize: '0.75rem'
                        }}
                      >
                        <div>
                          <span style={{ color: 'var(--text-secondary)', display: 'block', fontSize: '0.65rem' }}>{t('dashLimitEntry')}</span>
                          <strong style={{ color: '#FBBF24' }}>{formatAssetPrice(rec.id, rec.suggestedEntry)}</strong>
                        </div>
                        <div>
                          <span style={{ color: 'var(--text-secondary)', display: 'block', fontSize: '0.65rem' }}>{t('dashConfidence')}</span>
                          <strong>{rec.confidence}%</strong>
                        </div>
                        <div style={{ borderTop: '1px solid rgba(255,255,255,0.03)', paddingTop: '6px' }}>
                          <span style={{ color: 'var(--color-buy)', display: 'block', fontSize: '0.65rem' }}>{t('dashTakeProfit')}</span>
                          <strong style={{ color: 'var(--color-buy)' }}>{formatAssetPrice(rec.id, rec.takeProfit)}</strong>
                        </div>
                        <div style={{ borderTop: '1px solid rgba(255,255,255,0.03)', paddingTop: '6px' }}>
                          <span style={{ color: 'var(--color-sell)', display: 'block', fontSize: '0.65rem' }}>{t('dashStopLoss')}</span>
                          <strong style={{ color: 'var(--color-sell)' }}>{formatAssetPrice(rec.id, rec.stopLoss)}</strong>
                        </div>
                      </div>

                      {/* Rationale Bullet points */}
                      <div style={{ gridColumn: 'span 2' }}>
                        <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                          {t('dashInvestmentCase')}
                        </span>
                        <ul style={{ paddingLeft: '14px', fontSize: '0.75rem', display: 'flex', flexDirection: 'column', gap: '6px', color: 'var(--text-secondary)', lineHeight: '1.4' }}>
                          {rec.rationale.map((bullet, idx) => (
                            <li key={idx}>{bullet}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 3. Assets Tracked Grid */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 700, fontFamily: 'var(--font-display)' }}>{t('dashMarketsRadar')}</h2>
          <button
            onClick={onRefresh}
            disabled={loading}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              backgroundColor: 'transparent',
              border: '1px solid var(--border-color)',
              color: 'var(--text-primary)',
              borderRadius: '6px',
              padding: '6px 12px',
              fontSize: '0.8rem',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
            className="refresh-btn"
          >
            <RefreshCw size={14} className={loading ? 'spin' : ''} />
            {t('dashRefreshSignals')}
          </button>
        </div>

        {/* Category: Cryptocurrencies */}
        <div style={{ marginBottom: '25px' }}>
          <h3 style={{ fontSize: '1rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '10px' }}>
            {t('dashCryptocurrencies')}
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' }}>
            {cryptoAssets.map(renderAssetCard)}
          </div>
        </div>

        {/* Category: Equity Indices */}
        <div style={{ marginBottom: '25px' }}>
          <h3 style={{ fontSize: '1rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '10px' }}>
            {t('dashIndexComposites')}
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' }}>
            {indexAssets.map(renderAssetCard)}
          </div>
        </div>

        {/* Category: Tech Constituents */}
        <div style={{ marginBottom: '25px' }}>
          <h3 style={{ fontSize: '1rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '10px' }}>
            {t('dashTechConstituents')}
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' }}>
            {techAssets.map(renderAssetCard)}
          </div>
        </div>

        {/* Category: Blue-Chip & Value Constituents */}
        <div style={{ marginBottom: '25px' }}>
          <h3 style={{ fontSize: '1rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '10px' }}>
            {t('dashBlueChip')}
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' }}>
            {blueChipAssets.map(renderAssetCard)}
          </div>
        </div>

        {/* Category: Commodities */}
        <div style={{ marginBottom: '25px' }}>
          <h3 style={{ fontSize: '1rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '10px' }}>
            {t('dashCommodities')}
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' }}>
            {commodityAssets.map(renderAssetCard)}
          </div>
        </div>
      </div>

      {/* Embedded CSS for custom classes */}
      <style>{`
        .asset-card {
          background-color: var(--bg-card);
        }
        .asset-card:hover {
          transform: translateY(-2px);
        }
        .spin {
          animation: spin 1s linear infinite;
        }
        @keyframes spin {
          100% { transform: rotate(360deg); }
        }
        .refresh-btn:hover:not(:disabled) {
          background-color: rgba(255, 255, 255, 0.05);
          border-color: var(--text-secondary);
        }
      `}</style>
    </div>
  );
};
