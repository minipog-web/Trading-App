import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import './i18n';
import { Dashboard } from './components/Dashboard.tsx';
import { CandlestickChart } from './components/CandlestickChart.tsx';
import { ExplainabilityPanel } from './components/ExplainabilityPanel.tsx';
import { RecommendationExplainer } from './components/RecommendationExplainer.tsx';
import { BacktestView } from './components/BacktestView.tsx';
import { SignalsRadar } from './components/SignalsRadar.tsx';
import { Radio, RefreshCw, Sun, Moon, Database, Zap, Globe } from 'lucide-react';
import { formatAssetPrice } from './utils/formatter.ts';

export default function App() {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<'dashboard' | 'details' | 'backtest' | 'signals'>('dashboard');
  const [selectedAssetId, setSelectedAssetId] = useState<string>('BTC');
  const [timeframe, setTimeframe] = useState<'1D' | '1W'>('1D');
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');

  // API Data States
  const [assets, setAssets] = useState<any[]>([]);
  const [activeRegime, setActiveRegime] = useState<any>(null);
  const [newsSummary, setNewsSummary] = useState<any>(null);
  const [newsClusters, setNewsClusters] = useState<any[]>([]);
  const [topRecommendations, setTopRecommendations] = useState<any[]>([]);
  const [loadingRecommendations, setLoadingRecommendations] = useState<boolean>(true);
  const [backtestResults, setBacktestResults] = useState<any>(null);

  // Asset Details State
  const [assetDetails, setAssetDetails] = useState<any>(null);

  // Loading States
  const [loadingAssets, setLoadingAssets] = useState<boolean>(true);
  const [loadingDetails, setLoadingDetails] = useState<boolean>(false);
  const [loadingBacktest, setLoadingBacktest] = useState<boolean>(false);

  // 1. Initial Load: Fetch Macro, News, Assets
  const fetchGlobalData = async () => {
    setLoadingAssets(true);
    setLoadingRecommendations(true);
    try {
      // Fetch Assets
      const assetsRes = await fetch('/api/assets');
      const assetsData = await assetsRes.json();
      setAssets(assetsData);

      // Fetch Macro Regime
      const macroRes = await fetch('/api/macro');
      const macroData = await macroRes.json();
      setActiveRegime(macroData.regime);

      // Fetch News Clusters
      const newsRes = await fetch(`/api/news?assetId=${selectedAssetId}`);
      const newsData = await newsRes.json();
      setNewsSummary(newsData.summary);
      setNewsClusters(newsData.allClusters || []);

      // Fetch Top Recommendations
      const recRes = await fetch('/api/recommendations/top');
      if (recRes.ok) {
        const recData = await recRes.json();
        setTopRecommendations(recData);
      }
    } catch (error) {
      console.error('Error fetching global data:', error);
    } finally {
      setLoadingAssets(false);
      setLoadingRecommendations(false);
    }
  };

  // 2. Fetch Asset Details
  const fetchAssetDetailsData = async (id: string, tf: '1D' | '1W' = timeframe) => {
    setLoadingDetails(true);
    try {
      const res = await fetch(`/api/assets/${id}?timeframe=${tf}`);
      if (res.ok) {
        const data = await res.json();
        setAssetDetails(data);
      }
    } catch (error) {
      console.error(`Error fetching details for ${id.replace(/[\r\n]/g, '')}:`, error);
    } finally {
      setLoadingDetails(false);
    }
  };

  // 3. Fetch Backtest Results
  const fetchBacktestData = async () => {
    if (backtestResults) return; // Only fetch once
    setLoadingBacktest(true);
    try {
      const res = await fetch('/api/backtest');
      if (res.ok) {
        const data = await res.json();
        setBacktestResults(data);
      }
    } catch (error) {
      console.error('Error fetching backtest results:', error);
    } finally {
      setLoadingBacktest(false);
    }
  };

  // Trigger global fetch on mount
  useEffect(() => {
    fetchGlobalData();
  }, []);

  // Sync details fetch when selected asset or timeframe changes
  useEffect(() => {
    if (selectedAssetId) {
      fetchAssetDetailsData(selectedAssetId, timeframe);
      
      // Fetch news specific to selected asset to customize Explainability Panel
      const fetchAssetNews = async () => {
        try {
          const newsRes = await fetch(`/api/news?assetId=${selectedAssetId}`);
          if (newsRes.ok) {
            const newsData = await newsRes.json();
            setNewsSummary(newsData.summary);
            setNewsClusters(newsData.allClusters || []);
          }
        } catch (error) {
          console.error(`Error fetching news for ${selectedAssetId}:`, error);
        }
      };
      fetchAssetNews();
    }
  }, [selectedAssetId, timeframe]);

  // Sync backtest fetch when tab clicked
  useEffect(() => {
    if (activeTab === 'backtest') {
      fetchBacktestData();
    }
  }, [activeTab]);

  // Toggle Theme
  const toggleTheme = () => {
    const nextTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(nextTheme);
    if (nextTheme === 'light') {
      document.body.classList.add('light-mode');
    } else {
      document.body.classList.remove('light-mode');
    }
  };

  const handleSelectAsset = (id: string) => {
    setSelectedAssetId(id);
    setActiveTab('details');
  };

  const handleTrackNewAsset = async (symbol: string): Promise<boolean> => {
    try {
      const res = await fetch(`/api/assets/${symbol}`);
      if (res.ok) {
        // Refresh local assets list so the new symbol is visible
        const assetsRes = await fetch('/api/assets');
        const assetsData = await assetsRes.json();
        setAssets(assetsData);

        // Fetch recommendations as well to get updated signals
        const recRes = await fetch('/api/recommendations/top');
        if (recRes.ok) {
          const recData = await recRes.json();
          setTopRecommendations(recData);
        }

        // Set active asset and navigate to details
        setSelectedAssetId(symbol);
        setActiveTab('details');
        return true;
      }
      return false;
    } catch (error) {
      console.error(`Error tracking new asset ${symbol}:`, error);
      return false;
    }
  };

  return (
    <div className="app-root">
      
      {/* 1. Header Navigation Bar */}
      <header className="glass-panel app-header">
        <div className="app-header-brand">
          <span className="app-title">
            📡 {t('appName')} <span className="app-title-suffix">{t('appNameSuffix')}</span>
          </span>
        </div>

        {/* Global Regime Banner */}
        {activeRegime && (
          <div className="regime-banner">
            <Radio size={14} className="pulse-glow-regime" style={{ borderRadius: '50%' }} />
            <span>{t('macroRegime')}<strong>{activeRegime.name}</strong></span>
          </div>
        )}

        {/* Header toolbar inputs */}
        <div className="app-header-toolbar">
          {/* Timeframe toggle */}
          <div className="timeframe-toggle">
            <button
              onClick={() => setTimeframe('1D')}
              className={`toggle-btn ${timeframe === '1D' ? 'active' : ''}`}
            >
              1D
            </button>
            <button
              onClick={() => setTimeframe('1W')}
              className={`toggle-btn ${timeframe === '1W' ? 'active' : ''}`}
            >
              1W
            </button>
          </div>

          {/* Theme switcher */}
          <button onClick={toggleTheme} className="icon-btn-header" title={theme === 'dark' ? t('switchToLight') : t('switchToDark')}>
            {theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
          </button>

          {/* Refresh */}
          <button onClick={fetchGlobalData} className="icon-btn-header" disabled={loadingAssets} title={t('refreshData')}>
            <RefreshCw size={15} className={loadingAssets ? 'spin' : ''} />
          </button>
        </div>
      </header>

      {/* 2. Tab Menu Navigation */}
      <nav className="app-nav">
        <button
          onClick={() => setActiveTab('dashboard')}
          className={`tab-link ${activeTab === 'dashboard' ? 'active' : ''}`}
        >
          {t('tabDashboard')}
        </button>
        <button
          onClick={() => setActiveTab('signals')}
          className={`tab-link ${activeTab === 'signals' ? 'active' : ''}`}
        >
          {t('tabSignals')}
        </button>
        <button
          onClick={() => setActiveTab('details')}
          className={`tab-link ${activeTab === 'details' ? 'active' : ''}`}
        >
          {t('tabDetails', { id: selectedAssetId })}
        </button>
        <button
          onClick={() => setActiveTab('backtest')}
          className={`tab-link ${activeTab === 'backtest' ? 'active' : ''}`}
        >
          {t('tabBacktest')}
        </button>
      </nav>

      {/* 3. Main Views router */}
      <main className="app-main">
        {activeTab === 'dashboard' && (
          <Dashboard
            assets={assets}
            activeRegime={activeRegime ? { name: activeRegime.name, description: activeRegime.description, scores: activeRegime.scores } : null}
            newsSummary={newsSummary}
            onSelectAsset={handleSelectAsset}
            onRefresh={fetchGlobalData}
            loading={loadingAssets}
            topRecommendations={topRecommendations}
            loadingRecommendations={loadingRecommendations}
          />
        )}

        {activeTab === 'signals' && (
          <SignalsRadar
            assets={assets}
            onSelectAsset={handleSelectAsset}
            onTrackAsset={handleTrackNewAsset}
          />
        )}

        {activeTab === 'details' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {loadingDetails || !assetDetails ? (
              <div className="glass-panel flex-center" style={{ height: '350px', flexDirection: 'column', gap: '14px' }}>
                <div className="spinner" />
                <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>{t('loadingAssets')}</span>
              </div>
            ) : (
              <>
                {/* Asset Candlestick Panel and Recommendation HUD */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>
                  
                  {/* Candlestick chart container */}
                  <div style={{ gridColumn: 'span 2', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 4px' }}>
                      <div>
                        <h2 style={{ fontSize: '1.5rem', fontWeight: 800, fontFamily: 'var(--font-display)' }}>
                          {assetDetails.info.id} / USD Candlestick
                        </h2>
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                          {assetDetails.info.name} • Volume: {assetDetails.info.volume.toLocaleString()}
                        </span>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <span style={{ fontSize: '1.5rem', fontWeight: 800, fontFamily: 'var(--font-display)', display: 'block' }}>
                          {formatAssetPrice(assetDetails.info.id, assetDetails.info.currentPrice)}
                        </span>
                        {assetDetails.info.fundingRate !== undefined && (
                          <span style={{ fontSize: '0.7rem', color: 'var(--color-info)', marginRight: '8px' }}>
                            {t('funding')}{(assetDetails.info.fundingRate * 100).toFixed(4)}%
                          </span>
                        )}
                        {assetDetails.info.liquidations > 0 && (
                          <span style={{ fontSize: '0.7rem', color: 'var(--color-sell)' }}>
                            {t('liq24h')}{(assetDetails.info.liquidations / 1000).toFixed(0)}k
                          </span>
                        )}
                      </div>
                    </div>
                    
                    <CandlestickChart
                      assetId={assetDetails.info.id}
                      candles={assetDetails.candles}
                      technicals={assetDetails.technicals}
                      patterns={assetDetails.patterns}
                      anomalies={assetDetails.anomalies}
                      recommendation={assetDetails.recommendation}
                    />
                  </div>

                  {/* Right side controls, HUD, and Profile column */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    {/* Recommendation HUD card */}
                    <div className="glass-panel" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <h3 style={{ fontSize: '1.2rem', fontWeight: 700, fontFamily: 'var(--font-display)' }}>{t('recommendationHud')}</h3>
                        <span className={`badge-rating ${assetDetails.recommendation.rating.toLowerCase().replace(' ', '-')}`}>
                          {assetDetails.recommendation.rating}
                        </span>
                      </div>

                      {/* Gauge score */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', borderBottom: '1px solid var(--border-color)', paddingBottom: '16px' }}>
                        <div style={{ position: 'relative', width: '64px', height: '64px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          {/* Circular ring path */}
                          <svg width="64" height="64" viewBox="0 0 36 36" style={{ transform: 'rotate(-90deg)' }}>
                            <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="3" />
                            <path
                              d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                              fill="none"
                              stroke="var(--color-info)"
                              strokeWidth="3"
                              strokeDasharray={`${assetDetails.recommendation.score}, 100`}
                            />
                          </svg>
                          <span style={{ position: 'absolute', fontSize: '1rem', fontWeight: 800 }}>
                            {assetDetails.recommendation.score}
                          </span>
                        </div>
                        <div>
                          <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block' }}>{t('unifiedSignalScore')}</span>
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                            {t('ensembleConfidence', { value: assetDetails.recommendation.confidence })}
                          </span>
                        </div>
                      </div>

                      {/* Suggest entry exits */}
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', fontSize: '0.8rem' }}>
                        <div style={{ backgroundColor: 'rgba(255,255,255,0.02)', padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                          <span style={{ color: 'var(--text-secondary)', display: 'block', fontSize: '0.7rem' }}>{t('limitEntryPrice')}</span>
                          <strong style={{ color: '#FBBF24', fontSize: '1rem' }}>{formatAssetPrice(assetDetails.info.id, assetDetails.recommendation.suggestedEntry)}</strong>
                        </div>
                        <div style={{ backgroundColor: 'rgba(255,255,255,0.02)', padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                          <span style={{ color: 'var(--text-secondary)', display: 'block', fontSize: '0.7rem' }}>{t('expectedReturnError')}</span>
                          <strong style={{ fontSize: '1rem' }}>{assetDetails.recommendation.expectedError}</strong>
                        </div>
                        <div style={{ backgroundColor: 'rgba(16,185,129,0.04)', padding: '8px 12px', borderRadius: '8px', border: '1px solid rgba(16,185,129,0.2)' }}>
                          <span style={{ color: 'var(--color-buy)', display: 'block', fontSize: '0.7rem' }}>{t('takeProfitTarget')}</span>
                          <strong style={{ color: 'var(--color-buy)', fontSize: '1rem' }}>{formatAssetPrice(assetDetails.info.id, assetDetails.recommendation.takeProfit)}</strong>
                        </div>
                        <div style={{ backgroundColor: 'rgba(244,63,94,0.04)', padding: '8px 12px', borderRadius: '8px', border: '1px solid rgba(244,63,94,0.2)' }}>
                          <span style={{ color: 'var(--color-sell)', display: 'block', fontSize: '0.7rem' }}>{t('stopLossLimit')}</span>
                          <strong style={{ color: 'var(--color-sell)', fontSize: '1rem' }}>{formatAssetPrice(assetDetails.info.id, assetDetails.recommendation.stopLoss)}</strong>
                        </div>
                      </div>

                      {/* Rationale list */}
                      <div style={{ marginTop: '4px' }}>
                        <h4 style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                          {t('plainLanguageRationale')}
                        </h4>
                        <ul style={{ paddingLeft: '14px', fontSize: '0.8rem', display: 'flex', flexDirection: 'column', gap: '8px', color: 'var(--text-secondary)', lineHeight: '1.3' }}>
                          {assetDetails.recommendation.rationale.map((bullet: string, idx: number) => (
                            <li key={idx}>{bullet}</li>
                          ))}
                        </ul>
                      </div>
                    </div>

                    {/* Asset Profile & Sector Overview */}
                    <div className="glass-panel" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                      <h3 style={{ fontSize: '1.1rem', fontWeight: 700, fontFamily: 'var(--font-display)', display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
                        <Globe size={16} style={{ color: 'var(--color-info)' }} /> Asset Profile & Sector Role
                      </h3>
                      
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.04)', paddingBottom: '6px' }}>
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Sector / Asset Class</span>
                          <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-info)' }}>
                            {assetDetails.info.profile?.sector || 'Broad Market'}
                          </span>
                        </div>
                        
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', borderBottom: '1px solid rgba(255,255,255,0.04)', paddingBottom: '6px' }}>
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Sector Role</span>
                          <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                            {assetDetails.info.profile?.role || 'Market Asset Component'}
                          </span>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Overview & Description</span>
                          <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', lineHeight: '1.4', margin: 0 }}>
                            {assetDetails.info.profile?.description || 'No profile description available.'}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Unified Score Formula Explainer */}
                <div className="glass-panel" style={{ padding: '20px' }}>
                  <h3 style={{ fontSize: '1.2rem', fontWeight: 800, fontFamily: 'var(--font-display)', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Zap size={18} /> Score Attribution & Formula Explainer
                  </h3>
                  <RecommendationExplainer
                    assetId={selectedAssetId}
                    explanation={assetDetails.recommendation.explanation}
                  />
                </div>

                {/* Explainability component card */}
                <ExplainabilityPanel
                  assetId={selectedAssetId}
                  assetCategory={assetDetails.info.category}
                  shap={assetDetails.ml.shap}
                  newsClusters={newsClusters}
                />
              </>
            )}
          </div>
        )}

        {activeTab === 'backtest' && (
          <BacktestView
            results={backtestResults}
            loading={loadingBacktest}
            onRunBacktest={fetchBacktestData}
          />
        )}
      </main>

      {/* 4. Footer */}
      <footer className="app-footer">
        <span>{t('footerVersion')}</span>
        <span className="app-footer-simulator">
          <Database size={10} /> {t('footerSimulator')}
        </span>
      </footer>

      {/* Styles for toggle headers and tab navigation */}
      <style>{`
        .toggle-btn {
          background-color: transparent;
          border: none;
          color: var(--text-secondary);
          padding: 6px 12px;
          font-size: 0.75rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        }
        .toggle-btn.active {
          background-color: rgba(255,255,255,0.06);
          color: var(--text-primary);
        }
        .icon-btn-header {
          background-color: rgba(255,255,255,0.03);
          border: 1px solid var(--border-color);
          color: var(--text-secondary);
          border-radius: 6px;
          width: 32px;
          height: 32px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.2s;
        }
        .icon-btn-header:hover {
          background-color: rgba(255,255,255,0.07);
          color: var(--text-primary);
          border-color: var(--text-secondary);
        }
        .tab-link {
          background-color: transparent;
          border: none;
          color: var(--text-secondary);
          padding: 8px 16px;
          font-size: 0.9rem;
          font-weight: 500;
          cursor: pointer;
          position: relative;
          transition: color 0.2s;
          font-family: var(--font-display);
        }
        .tab-link:hover {
          color: var(--text-primary);
        }
        .tab-link.active {
          color: var(--text-primary);
          font-weight: 700;
        }
        .tab-link.active::after {
          content: '';
          position: absolute;
          bottom: -5px;
          left: 16px;
          right: 16px;
          height: 2px;
          background-color: var(--color-info);
          border-radius: 2px;
          box-shadow: var(--glow-blue);
        }
        .spin {
          animation: spin 1s linear infinite;
        }
        @keyframes spin {
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
