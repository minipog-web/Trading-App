import React, { useState } from 'react';
import { 
  BarChart2, 
  Layers, 
  AlertTriangle, 
  Newspaper, 
  Globe, 
  Users, 
  CheckCircle,
  Clock,
  ShieldAlert
} from 'lucide-react';

interface RecommendationExplanation {
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
  technicalBreakdown: {
    indicators: Record<string, {
      name: string;
      value: string;
      signal: 'Bullish' | 'Bearish' | 'Neutral';
      contribution: number;
    }>;
    patterns: {
      name: string;
      type: 'bullish' | 'bearish' | 'neutral';
      age: number;
    }[];
    confluenceBonus: number;
    totalScore: number;
  };
  whaleBreakdown: {
    whaleScore: number;
    whaleAccumulation: number;
    proTraderSentiment: number;
    fiveDayTrend: 'Accumulating' | 'Distributing' | 'Flat';
    divergenceDetected: boolean;
    divergenceType: 'Bullish' | 'Bearish' | 'None';
    volumeConfirmation: boolean;
  };
  anomalyDetail: {
    anomalyScore: number;
    activeAnomaliesCount: number;
    recentAnomalies: {
      date: string;
      type: string;
      severity: number;
      message: string;
      condition: string;
    }[];
  };
  newsBreakdown: {
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
  };
  macroRegime: string;
  crossAssetInfluence: number;
}

interface RecommendationExplainerProps {
  assetId: string;
  explanation?: RecommendationExplanation;
}

export const RecommendationExplainer: React.FC<RecommendationExplainerProps> = ({
  assetId,
  explanation
}) => {
  const [activeTab, setActiveTab] = useState<'all' | 'technical' | 'whale' | 'macro' | 'news' | 'anomalies'>('all');

  if (!explanation) {
    return (
      <div className="glass-panel" style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)' }}>
        No explanation matrix precomputed for {assetId}. Select an asset from the radar to inspect its logic.
      </div>
    );
  }

  const {
    weights,
    scores,
    technicalBreakdown,
    whaleBreakdown,
    anomalyDetail,
    newsBreakdown,
    macroRegime,
    crossAssetInfluence
  } = explanation;

  // Formatted weights in %
  const formattedWeights = {
    technical: Math.round(weights.technical * 100),
    ml: Math.round(weights.ml * 100),
    macro: Math.round(weights.macro * 100),
    news: Math.round(weights.news * 100),
    crossAsset: Math.round(weights.crossAsset * 100),
    whale: Math.round(weights.whale * 100),
    anomaly: Math.round(weights.anomaly * 100),
  };

  const getSignalBadgeColor = (signal: 'Bullish' | 'Bearish' | 'Neutral') => {
    switch (signal) {
      case 'Bullish': return { color: 'var(--color-buy)', bg: 'var(--color-buy-bg)', border: 'rgba(16, 185, 129, 0.3)' };
      case 'Bearish': return { color: 'var(--color-sell)', bg: 'var(--color-sell-bg)', border: 'rgba(244, 63, 94, 0.3)' };
      default: return { color: 'var(--text-secondary)', bg: 'rgba(255, 255, 255, 0.05)', border: 'rgba(255, 255, 255, 0.1)' };
    }
  };

  const getSentimentEmoji = (sentiment: number) => {
    if (sentiment > 0.15) return '🟢 Positive';
    if (sentiment < -0.15) return '🔴 Negative';
    return '🟡 Neutral';
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      
      {/* Tab Selectors */}
      <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '12px', flexWrap: 'wrap' }}>
        {(['all', 'technical', 'whale', 'macro', 'news', 'anomalies'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            style={{
              padding: '6px 12px',
              borderRadius: '6px',
              border: activeTab === tab ? '1px solid var(--color-info)' : '1px solid rgba(255,255,255,0.05)',
              backgroundColor: activeTab === tab ? 'rgba(59, 130, 246, 0.15)' : 'rgba(0,0,0,0.15)',
              color: activeTab === tab ? 'var(--text-primary)' : 'var(--text-secondary)',
              cursor: 'pointer',
              textTransform: 'capitalize',
              fontWeight: 600,
              fontSize: '0.8rem',
              transition: 'all 0.15s ease'
            }}
          >
            {tab === 'all' ? 'Unified Matrix' : `${tab} score`}
          </button>
        ))}
      </div>

      {activeTab === 'all' && (
        <>
          {/* Score Attribution Matrix & Weights */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
            
            {/* Left: Score breakdown */}
            <div className="glass-panel" style={{ padding: '20px' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Layers size={16} /> Formula Decomposition
              </h3>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '20px' }}>
                Weighted contributions of model facets to Unified Score under current <strong>{macroRegime}</strong> regime.
              </p>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {[
                  { name: 'Technical Engine', score: scores.technical, weight: formattedWeights.technical, color: '#3B82F6' },
                  { name: 'ML Predictive Ensemble', score: scores.ml, weight: formattedWeights.ml, color: '#10B981' },
                  { name: 'Macro Regime Fit', score: scores.macro, weight: formattedWeights.macro, color: '#F59E0B' },
                  { name: 'News & Sentiment Decay', score: scores.news, weight: formattedWeights.news, color: '#EC4899' },
                  { name: 'Cross-Asset Causality', score: scores.crossAsset, weight: formattedWeights.crossAsset, color: '#8B5CF6' },
                  { name: 'Smart Money / Whales', score: scores.whale, weight: formattedWeights.whale, color: '#06B6D4' },
                  { name: 'Anomaly Vol & Volatility', score: scores.anomaly, weight: formattedWeights.anomaly, color: '#EF4444' },
                ].map((item) => {
                  const contribution = Math.round((item.score * item.weight) / 100);
                  return (
                    <div key={item.name} style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem' }}>
                        <span style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>{item.name}</span>
                        <span style={{ color: 'var(--text-primary)' }}>
                          {item.score} <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>× {item.weight}% = <strong>+{contribution}</strong></span>
                        </span>
                      </div>
                      <div style={{ width: '100%', height: '6px', backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: '3px', overflow: 'hidden' }}>
                        <div
                          style={{
                            width: `${(item.score * item.weight) / 100}%`,
                            height: '100%',
                            backgroundColor: item.color,
                            boxShadow: `0 0 8px ${item.color}`,
                            borderRadius: '3px',
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Right: SVG representation donut info */}
            <div className="glass-panel" style={{ padding: '20px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
              <div style={{ position: 'relative', width: '160px', height: '160px' }}>
                <svg width="100%" height="100%" viewBox="0 0 42 42">
                  <circle cx="21" cy="21" r="15.915" fill="transparent" stroke="rgba(255,255,255,0.03)" strokeWidth="4" />
                  
                  {/* Accumulate rings for weights */}
                  {(() => {
                    let totalPercent = 0;
                    const ringColors = ['#3B82F6', '#10B981', '#F59E0B', '#EC4899', '#8B5CF6', '#06B6D4', '#EF4444'];
                    const ringWeights = [
                      weights.technical,
                      weights.ml,
                      weights.macro,
                      weights.news,
                      weights.crossAsset,
                      weights.whale,
                      weights.anomaly
                    ];
                    
                    return ringWeights.map((w, idx) => {
                      const strokeDasharray = `${w * 100} ${100 - w * 100}`;
                      const strokeDashoffset = 100 - totalPercent + 25; // 25 start at top
                      totalPercent += w * 100;
                      return (
                        <circle
                          key={idx}
                          cx="21"
                          cy="21"
                          r="15.915"
                          fill="transparent"
                          stroke={ringColors[idx]}
                          strokeWidth="4"
                          strokeDasharray={strokeDasharray}
                          strokeDashoffset={strokeDashoffset}
                        />
                      );
                    });
                  })()}
                </svg>
                <div style={{
                  position: 'absolute',
                  top: '50%',
                  left: '50%',
                  transform: 'translate(-50%, -50%)',
                  textAlign: 'center'
                }}>
                  <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Unified</div>
                  <div style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--text-primary)', lineHeight: '1' }}>
                    {Math.round(
                      scores.technical * weights.technical +
                      scores.ml * weights.ml +
                      scores.macro * weights.macro +
                      scores.news * weights.news +
                      scores.crossAsset * weights.crossAsset +
                      scores.whale * weights.whale +
                      scores.anomaly * weights.anomaly
                    )}
                  </div>
                  <div style={{ fontSize: '0.55rem', color: 'var(--text-secondary)', marginTop: '2px' }}>/ 100</div>
                </div>
              </div>
              <div style={{ marginTop: '16px', display: 'flex', gap: '8px', flexWrap: 'wrap', justifyContent: 'center', fontSize: '0.65rem' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><span style={{ display: 'inline-block', width: '8px', height: '8px', backgroundColor: '#3B82F6', borderRadius: '50%' }}></span>Tech</span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><span style={{ display: 'inline-block', width: '8px', height: '8px', backgroundColor: '#10B981', borderRadius: '50%' }}></span>ML</span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><span style={{ display: 'inline-block', width: '8px', height: '8px', backgroundColor: '#F59E0B', borderRadius: '50%' }}></span>Macro</span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><span style={{ display: 'inline-block', width: '8px', height: '8px', backgroundColor: '#EC4899', borderRadius: '50%' }}></span>News</span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><span style={{ display: 'inline-block', width: '8px', height: '8px', backgroundColor: '#8B5CF6', borderRadius: '50%' }}></span>VAR</span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><span style={{ display: 'inline-block', width: '8px', height: '8px', backgroundColor: '#06B6D4', borderRadius: '50%' }}></span>Whale</span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><span style={{ display: 'inline-block', width: '8px', height: '8px', backgroundColor: '#EF4444', borderRadius: '50%' }}></span>Anomaly</span>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Technicals tab */}
      {(activeTab === 'all' || activeTab === 'technical') && (
        <div className="glass-panel" style={{ padding: '20px' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <BarChart2 size={16} /> Technical Confluence Matrix
          </h3>
          
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem', textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)', color: 'var(--text-muted)' }}>
                  <th style={{ padding: '8px 12px' }}>Indicator</th>
                  <th style={{ padding: '8px 12px' }}>Value</th>
                  <th style={{ padding: '8px 12px' }}>Signal</th>
                  <th style={{ padding: '8px 12px', textAlign: 'right' }}>Weight Contribution</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(technicalBreakdown.indicators).map(([key, ind]) => {
                  const styleProps = getSignalBadgeColor(ind.signal);
                  return (
                    <tr key={key} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)', transition: 'background-color 0.15s' }}>
                      <td style={{ padding: '10px 12px', fontWeight: 600, color: 'var(--text-primary)' }}>{ind.name}</td>
                      <td style={{ padding: '10px 12px', fontFamily: 'monospace', color: 'var(--text-secondary)' }}>{ind.value}</td>
                      <td style={{ padding: '10px 12px' }}>
                        <span style={{
                          padding: '2px 8px',
                          borderRadius: '4px',
                          fontSize: '0.65rem',
                          fontWeight: 700,
                          backgroundColor: styleProps.bg,
                          color: styleProps.color,
                          border: styleProps.border,
                        }}>
                          {ind.signal}
                        </span>
                      </td>
                      <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 700, color: ind.contribution > 0 ? 'var(--color-buy)' : ind.contribution < 0 ? 'var(--color-sell)' : 'var(--text-muted)' }}>
                        {ind.contribution > 0 ? `+${ind.contribution}` : ind.contribution} pts
                      </td>
                    </tr>
                  );
                })}
                {technicalBreakdown.confluenceBonus !== 0 && (
                  <tr style={{ backgroundColor: 'rgba(59, 130, 246, 0.05)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                    <td style={{ padding: '12px', fontWeight: 700, color: 'var(--color-info)' }}>Confluence Signal Bonus</td>
                    <td style={{ padding: '12px', fontStyle: 'italic', color: 'var(--text-muted)' }}>Strong indicator agreement</td>
                    <td style={{ padding: '12px' }}>
                      <span style={{
                        padding: '2px 8px',
                        borderRadius: '4px',
                        fontSize: '0.65rem',
                        fontWeight: 700,
                        backgroundColor: technicalBreakdown.confluenceBonus > 0 ? 'var(--color-buy-bg)' : 'var(--color-sell-bg)',
                        color: technicalBreakdown.confluenceBonus > 0 ? 'var(--color-buy)' : 'var(--color-sell)',
                        border: '1px solid rgba(59, 130, 246, 0.3)',
                      }}>
                        Confluence
                      </span>
                    </td>
                    <td style={{ padding: '12px', textAlign: 'right', fontWeight: 800, color: technicalBreakdown.confluenceBonus > 0 ? 'var(--color-buy)' : 'var(--color-sell)' }}>
                      {technicalBreakdown.confluenceBonus > 0 ? `+${technicalBreakdown.confluenceBonus}` : technicalBreakdown.confluenceBonus} pts
                    </td>
                  </tr>
                )}
                <tr style={{ borderTop: '2px solid rgba(255,255,255,0.08)', fontWeight: 700 }}>
                  <td style={{ padding: '12px' }} colSpan={2}>Technical Engine Aggregate Score</td>
                  <td style={{ padding: '12px' }}>
                    <span style={{
                      padding: '4px 10px',
                      borderRadius: '6px',
                      fontSize: '0.8rem',
                      fontWeight: 800,
                      backgroundColor: technicalBreakdown.totalScore > 58 ? 'var(--color-buy-bg)' : technicalBreakdown.totalScore < 42 ? 'var(--color-sell-bg)' : 'rgba(255,255,255,0.05)',
                      color: technicalBreakdown.totalScore > 58 ? 'var(--color-buy)' : technicalBreakdown.totalScore < 42 ? 'var(--color-sell)' : 'var(--text-secondary)'
                    }}>
                      {technicalBreakdown.totalScore > 74 ? 'Strong Overbought/Bullish Trend' : technicalBreakdown.totalScore > 58 ? 'Bullish Structure' : 'Sideways Consolidation'}
                    </span>
                  </td>
                  <td style={{ padding: '12px', textAlign: 'right', fontSize: '1rem', color: 'var(--text-primary)' }}>
                    {technicalBreakdown.totalScore} / 100
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Chart Patterns */}
          {technicalBreakdown.patterns && technicalBreakdown.patterns.length > 0 && (
            <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
              <h4 style={{ fontSize: '0.8rem', fontWeight: 700, marginBottom: '10px', color: 'var(--text-secondary)' }}>Detected Reversals & Breakouts:</h4>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {technicalBreakdown.patterns.map((pat, idx) => {
                  const styleProps = getSignalBadgeColor(pat.type === 'bullish' ? 'Bullish' : pat.type === 'bearish' ? 'Bearish' : 'Neutral');
                  return (
                    <div 
                      key={idx}
                      style={{
                        padding: '6px 10px',
                        borderRadius: '6px',
                        backgroundColor: 'rgba(255,255,255,0.02)',
                        border: '1px solid rgba(255,255,255,0.05)',
                        fontSize: '0.75rem',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px'
                      }}
                    >
                      <span style={{ fontWeight: 600 }}>{pat.name}</span>
                      <span style={{ fontSize: '0.65rem', color: styleProps.color, backgroundColor: styleProps.bg, border: styleProps.border, padding: '1px 5px', borderRadius: '3px', fontWeight: 700 }}>
                        {pat.type}
                      </span>
                      <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '2px' }}>
                        <Clock size={10} /> {pat.age === 0 ? 'Current' : `${pat.age} bars ago`}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Whale positioning */}
      {(activeTab === 'all' || activeTab === 'whale') && (
        <div className="glass-panel" style={{ padding: '20px' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Users size={16} /> Whale Flow & Smart Money Positioning
          </h3>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '20px' }}>
            Tracks on-chain block transfers, order book liquidity depth changes, and professional trader sentiment.
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
            
            {/* Whale stats */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.03)', paddingBottom: '8px' }}>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Whale Accumulation Index</span>
                <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)' }}>{whaleBreakdown.whaleAccumulation}%</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.03)', paddingBottom: '8px' }}>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Pro Trader Sentiment</span>
                <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)' }}>{whaleBreakdown.proTraderSentiment}%</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.03)', paddingBottom: '8px' }}>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Whale 5-Day Trend</span>
                <span style={{ 
                  fontSize: '0.85rem', 
                  fontWeight: 700, 
                  color: whaleBreakdown.fiveDayTrend === 'Accumulating' ? 'var(--color-buy)' : whaleBreakdown.fiveDayTrend === 'Distributing' ? 'var(--color-sell)' : 'var(--text-secondary)' 
                }}>
                  {whaleBreakdown.fiveDayTrend}
                </span>
              </div>
            </div>

            {/* Whale indicators checklist */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', padding: '10px 14px', backgroundColor: 'rgba(255,255,255,0.02)', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.04)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.75rem' }}>
                <span style={{ color: whaleBreakdown.divergenceDetected ? 'var(--color-buy)' : 'var(--text-muted)' }}>
                  {whaleBreakdown.divergenceDetected ? <CheckCircle size={14} /> : <AlertTriangle size={14} />}
                </span>
                <span>Whale Divergence: <strong>{whaleBreakdown.divergenceDetected ? `${whaleBreakdown.divergenceType} Divergence` : 'None'}</strong></span>
              </div>
              
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.75rem' }}>
                <span style={{ color: whaleBreakdown.volumeConfirmation ? 'var(--color-buy)' : 'var(--text-muted)' }}>
                  {whaleBreakdown.volumeConfirmation ? <CheckCircle size={14} /> : <AlertTriangle size={14} />}
                </span>
                <span>Volume Confirmation: <strong>{whaleBreakdown.volumeConfirmation ? 'Confirmed' : 'Unconfirmed'}</strong></span>
              </div>

              <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '8px', marginTop: '4px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>Agg Whale Score:</span>
                <span style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--color-info)' }}>{whaleBreakdown.whaleScore} / 100</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Macro & VAR */}
      {(activeTab === 'all' || activeTab === 'macro') && (
        <div className="glass-panel" style={{ padding: '20px' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Globe size={16} /> Macro Regime Fit & Cross-Asset Causality
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '20px' }}>
            <div>
              <h4 style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '8px' }}>Macro Regime</h4>
              <div style={{ padding: '12px', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.06)', backgroundColor: 'rgba(255,255,255,0.01)' }}>
                <div style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--color-info)' }}>{macroRegime}</div>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '6px', lineHeight: '1.3' }}>
                  The regime classifier shifts component weights. For example, during a <strong>Crisis</strong>, macro hedges (like Commodities) and liquidations take priority over technical indicators.
                </p>
                <div style={{ marginTop: '8px', fontSize: '0.75rem', fontWeight: 700 }}>
                  Fit Score: <span style={{ color: scores.macro > 60 ? 'var(--color-buy)' : 'var(--text-secondary)' }}>{scores.macro} / 100</span>
                </div>
              </div>
            </div>
            <div>
              <h4 style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '8px' }}>Vector Autoregression (VAR) Causality</h4>
              <div style={{ padding: '12px', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.06)', backgroundColor: 'rgba(255,255,255,0.01)' }}>
                <div style={{ fontSize: '1rem', fontWeight: 800, color: crossAssetInfluence > 25 ? 'var(--color-buy)' : crossAssetInfluence < -25 ? 'var(--color-sell)' : 'var(--text-primary)' }}>
                  {crossAssetInfluence > 25 ? 'Strong Lead Flow' : crossAssetInfluence < -25 ? 'Negative Pressure' : 'No Causality'}
                </div>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '6px', lineHeight: '1.3' }}>
                  Analyzes if Granger causality links exist between leading macro indexes and this asset.
                </p>
                <div style={{ marginTop: '8px', fontSize: '0.75rem', fontWeight: 700 }}>
                  Granger F-Stat Influence: <span style={{ color: 'var(--color-info)' }}>{crossAssetInfluence.toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* News catalyst */}
      {(activeTab === 'all' || activeTab === 'news') && (
        <div className="glass-panel" style={{ padding: '20px' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Newspaper size={16} /> News Sentiments & Recency Decay
          </h3>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', marginBottom: '16px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Analyzed Catalyst Articles</span>
              <strong style={{ fontSize: '1.1rem' }}>{newsBreakdown.articleCount} articles</strong>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Average Sentiment</span>
              <strong style={{ fontSize: '1.1rem' }}>{getSentimentEmoji(newsBreakdown.averageSentiment)} ({newsBreakdown.averageSentiment.toFixed(2)})</strong>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>News Engine Score</span>
              <strong style={{ fontSize: '1.1rem', color: 'var(--color-buy)' }}>{newsBreakdown.newsScore} / 100</strong>
            </div>
          </div>

          <h4 style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '10px' }}>Recent Catalyst Timeline (Decayed):</h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {newsBreakdown.recentCatalysts.map((cat, idx) => {
              const daysAgo = Math.max(0, (Date.now() - new Date(cat.date).getTime()) / (1000 * 60 * 60 * 24));
              const recencyDecay = Math.exp(-daysAgo / 3);
              return (
                <div 
                  key={idx}
                  style={{
                    padding: '10px 14px',
                    borderRadius: '6px',
                    backgroundColor: 'rgba(255,255,255,0.01)',
                    border: '1px solid rgba(255,255,255,0.04)',
                    fontSize: '0.75rem',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '4px'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)', fontSize: '0.65rem' }}>
                    <span>{cat.date} ({daysAgo.toFixed(1)}d ago)</span>
                    <span>Sentiment: <strong style={{ color: cat.sentiment > 0.15 ? 'var(--color-buy)' : cat.sentiment < -0.15 ? 'var(--color-sell)' : 'var(--text-secondary)' }}>{cat.sentiment.toFixed(2)}</strong></span>
                  </div>
                  <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{cat.title}</div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-secondary)', fontSize: '0.65rem', marginTop: '2px' }}>
                    <span>Raw Impact: {cat.impact}%</span>
                    <span>Effective Decayed Weight: <strong style={{ color: 'var(--text-primary)' }}>{Math.round(recencyDecay * 100)}%</strong></span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Anomalies tab */}
      {(activeTab === 'all' || activeTab === 'anomalies') && (
        <div className="glass-panel" style={{ padding: '20px' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <ShieldAlert size={16} /> Market Anomalies & Volatility Extremes
          </h3>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '20px' }}>
            Monitors rolling volume z-scores, absolute range extensions, and order-book liquidity spikes.
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', marginBottom: '16px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Active 30-Day Anomalies</span>
              <strong style={{ fontSize: '1.1rem' }}>{anomalyDetail.activeAnomaliesCount} detected</strong>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Anomaly Bias</span>
              <strong style={{ fontSize: '1.1rem', color: anomalyDetail.anomalyScore > 50 ? 'var(--color-buy)' : anomalyDetail.anomalyScore < 50 ? 'var(--color-sell)' : 'var(--text-secondary)' }}>
                {anomalyDetail.anomalyScore > 50 ? 'Bullish Impulse' : anomalyDetail.anomalyScore < 50 ? 'Bearish Impulse' : 'Neutral Volatility'}
              </strong>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Anomaly Score Impact</span>
              <strong style={{ fontSize: '1.1rem', color: 'var(--color-info)' }}>{anomalyDetail.anomalyScore} / 100</strong>
            </div>
          </div>

          <h4 style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '10px' }}>Recent Anomaly Logs:</h4>
          {anomalyDetail.recentAnomalies.length === 0 ? (
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', padding: '10px 0' }}>No volume or price range anomalies detected over lookback period.</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {anomalyDetail.recentAnomalies.map((anom, idx) => {
                const badgeColor = getSignalBadgeColor(anom.condition === 'buy' ? 'Bullish' : 'Bearish');
                return (
                  <div 
                    key={idx}
                    style={{
                      padding: '10px 14px',
                      borderRadius: '6px',
                      backgroundColor: 'rgba(255,255,255,0.01)',
                      border: '1px solid rgba(255,255,255,0.04)',
                      fontSize: '0.75rem',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '12px'
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{anom.message}</div>
                      <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>Type: {anom.type} | Date: {anom.date}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{
                        padding: '1px 6px',
                        borderRadius: '3px',
                        fontSize: '0.6rem',
                        fontWeight: 700,
                        backgroundColor: badgeColor.bg,
                        color: badgeColor.color,
                        border: badgeColor.border
                      }}>
                        {anom.condition.toUpperCase()}
                      </span>
                      <span style={{ fontWeight: 700, color: 'var(--text-secondary)' }}>Z-Score: {anom.severity}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

    </div>
  );
};
