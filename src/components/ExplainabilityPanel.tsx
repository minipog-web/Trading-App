import { useState } from 'react';
import { BarChart, Eye, Newspaper, Calendar, TrendingUp, TrendingDown } from 'lucide-react';

interface NewsClusterPoint {
  id: string;
  headline: string;
  x: number;
  y: number;
  cluster: number;
  clusterLabel: string;
  sentiment: number;
  impact: number;
  date: string;
  assetClass: 'crypto' | 'equity' | 'commodity' | 'macro';
}

interface ExplainabilityPanelProps {
  assetId?: string;
  assetCategory?: 'crypto' | 'equity' | 'commodity';
  shap: Record<string, number> | null;
  newsClusters: NewsClusterPoint[];
}

export const ExplainabilityPanel: React.FC<ExplainabilityPanelProps> = ({
  assetId = 'BTC',
  assetCategory = 'crypto',
  shap,
  newsClusters
}) => {
  const [hoveredArticle, setHoveredArticle] = useState<NewsClusterPoint | null>(null);

  const relevantNews = newsClusters.filter(
    art => art.assetClass === assetCategory || art.assetClass === 'macro'
  );

  // Render SHAP Bar Chart
  const renderShapChart = () => {
    if (!shap) return <div style={{ color: 'var(--text-muted)' }}>No feature attribution computed yet.</div>;
    const sortedFeatures = Object.entries(shap).sort((a, b) => b[1] - a[1]);

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {sortedFeatures.map(([feature, val]) => (
          <div key={feature} style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem' }}>
              <span style={{ fontWeight: 600 }}>{feature}</span>
              <span style={{ color: 'var(--color-info)', fontWeight: 700 }}>{val}%</span>
            </div>
            <div style={{ width: '100%', height: '8px', backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: '4px', overflow: 'hidden' }}>
              <div
                style={{
                  width: `${val}%`,
                  height: '100%',
                  backgroundColor: 'var(--color-info)',
                  boxShadow: 'var(--glow-blue)',
                  borderRadius: '4px',
                  transition: 'width 0.4s'
                }}
              />
            </div>
          </div>
        ))}
      </div>
    );
  };

  // Render 2D News Cluster Scatter Plot
  const renderNewsClusterPlot = () => {
    if (relevantNews.length === 0) return <div style={{ color: 'var(--text-muted)' }}>No news vector space loaded.</div>;

    const width = 460;
    const height = 280;
    const padding = 20;

    // Find min and max for bounds
    const xs = relevantNews.map(a => a.x);
    const ys = relevantNews.map(a => a.y);
    const minX = Math.min(...xs, -1) * 1.1;
    const maxX = Math.max(...xs, 1) * 1.1;
    const minY = Math.min(...ys, -1) * 1.1;
    const maxY = Math.max(...ys, 1) * 1.1;

    const mapX = (x: number) => padding + ((x - minX) / (maxX - minX)) * (width - 2 * padding);
    const mapY = (y: number) => height - (padding + ((y - minY) / (maxY - minY)) * (height - 2 * padding));

    const clusterColors = [
      '#F43F5E', // red - geopolitical
      '#8B5CF6', // purple - inflation/macro
      '#10B981', // green - growth
      '#3B82F6'  // blue - regulatory
    ];

    const dotX = hoveredArticle ? mapX(hoveredArticle.x) : 0;
    const dotY = hoveredArticle ? mapY(hoveredArticle.y) : 0;
    const isNearTop = dotY < height * 0.35;
    const isNearLeft = dotX < width * 0.25;
    const isNearRight = dotX > width * 0.75;

    let translateX = '-50%';
    let translateY = '-105%';

    if (isNearTop) {
      translateY = '15px';
    }
    if (isNearLeft) {
      translateX = '0%';
    } else if (isNearRight) {
      translateX = '-100%';
    }

    const transformStyle = `translate(${translateX}, ${translateY})`;

    return (
      <div style={{ position: 'relative' }}>
        <svg 
          viewBox={`0 0 ${width} ${height}`} 
          width="100%" 
          height="auto" 
          style={{ overflow: 'visible', display: 'block' }}
          onMouseLeave={() => setHoveredArticle(null)}
        >
          {/* Axis Grid lines */}
          <line x1={padding} y1={mapY(0)} x2={width - padding} y2={mapY(0)} stroke="rgba(255,255,255,0.05)" />
          <line x1={mapX(0)} y1={padding} x2={mapX(0)} y2={height - padding} stroke="rgba(255,255,255,0.05)" />
          
          <text x={width - 80} y={mapY(0) - 4} fill="var(--text-muted)" fontSize="7">Economic Growth</text>
          <text x={mapX(0) + 4} y={padding + 10} fill="var(--text-muted)" fontSize="7" transform={`rotate(90, ${mapX(0) + 4}, ${padding + 10})`}>Regulatory Stress</text>

          {/* Plot Points */}
          {relevantNews.map((art, idx) => {
            const cx = mapX(art.x);
            const cy = mapY(art.y);
            const color = clusterColors[art.cluster] || '#9CA3AF';
            const radius = 4 + (art.impact / 100) * 4;

            return (
              <circle
                key={idx}
                cx={cx}
                cy={cy}
                r={radius}
                fill={color}
                opacity={hoveredArticle?.id === art.id ? 1.0 : 0.85}
                stroke={hoveredArticle?.id === art.id ? '#FFF' : 'none'}
                strokeWidth="1.2"
                style={{ cursor: 'pointer', transition: 'all 0.15s' }}
                onMouseEnter={() => setHoveredArticle(art)}
              />
            );
          })}
        </svg>

        {/* Hover detail box */}
        {hoveredArticle && (
          <div
            style={{
              position: 'absolute',
              left: `${(dotX / width) * 100}%`,
              top: `${(dotY / height) * 100}%`,
              transform: transformStyle,
              backgroundColor: 'rgba(9, 14, 28, 0.98)',
              backdropFilter: 'blur(8px)',
              border: '1px solid var(--border-color-hover)',
              borderRadius: '6px',
              padding: '10px 14px',
              fontSize: '0.75rem',
              boxShadow: '0 8px 24px rgba(0,0,0,0.6)',
              zIndex: 100,
              pointerEvents: 'none',
              width: '260px',
              transition: 'left 0.1s ease-out, top 0.1s ease-out, transform 0.1s ease-out'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '3px' }}>
              <span style={{ fontWeight: 700, color: clusterColors[hoveredArticle.cluster] }}>{hoveredArticle.clusterLabel}</span>
              <span style={{ color: 'var(--text-secondary)' }}>{hoveredArticle.date}</span>
            </div>
            <p style={{ fontWeight: 500, margin: '4px 0', lineHeight: '1.25' }}>{hoveredArticle.headline}</p>
            <div style={{ display: 'flex', gap: '14px', marginTop: '6px', color: 'var(--text-secondary)' }}>
              <span>Impact: <strong style={{ color: '#FFF' }}>{hoveredArticle.impact}%</strong></span>
              <span>Sentiment: <strong style={{ color: hoveredArticle.sentiment > 0 ? 'var(--color-buy)' : 'var(--color-sell)' }}>{hoveredArticle.sentiment}</strong></span>
            </div>
          </div>
        )}
      </div>
    );
  };

  // Render News Feed
  const renderNewsFeed = () => {
    const sortedNews = [...relevantNews].sort((a, b) => {
      const dateCompare = b.date.localeCompare(a.date);
      if (dateCompare !== 0) return dateCompare;
      return b.impact - a.impact;
    });

    if (sortedNews.length === 0) {
      return <div style={{ color: 'var(--text-muted)', padding: '20px 0' }}>No relevant news catalysts found.</div>;
    }

    const displayNews = sortedNews.slice(0, 6);

    return (
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px', marginTop: '10px' }}>
        {displayNews.map((art) => {
          const isBullish = art.sentiment > 0.15;
          const isBearish = art.sentiment < -0.15;
          const sentimentLabel = isBullish ? 'Bullish' : isBearish ? 'Bearish' : 'Neutral';
          const sentimentColor = isBullish ? 'var(--color-buy)' : isBearish ? 'var(--color-sell)' : 'var(--text-secondary)';
          const sentimentBg = isBullish ? 'var(--color-buy-bg)' : isBearish ? 'var(--color-sell-bg)' : 'rgba(255, 255, 255, 0.05)';
          const sentimentBorder = isBullish ? '1px solid rgba(16, 185, 129, 0.3)' : isBearish ? '1px solid rgba(244, 63, 94, 0.3)' : '1px solid rgba(255, 255, 255, 0.1)';

          return (
            <div
              key={art.id}
              className="glass-panel"
              style={{
                padding: '16px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                gap: '12px',
                transition: 'all 0.2s',
                cursor: 'pointer'
              }}
              onMouseEnter={() => setHoveredArticle(art)}
              onMouseLeave={() => setHoveredArticle(null)}
            >
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Calendar size={12} />
                    <span>{art.date}</span>
                  </div>
                  <span style={{ textTransform: 'uppercase', fontWeight: 700, color: 'var(--color-info)' }}>
                    {art.assetClass}
                  </span>
                </div>

                <h4 style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)', marginTop: '8px', lineHeight: '1.4' }}>
                  {art.headline}
                </h4>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', borderTop: '1px solid rgba(255,255,255,0.04)', paddingTop: '10px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span
                    style={{
                      padding: '3px 8px',
                      borderRadius: '4px',
                      fontSize: '0.7rem',
                      fontWeight: 700,
                      color: sentimentColor,
                      backgroundColor: sentimentBg,
                      border: sentimentBorder,
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}
                  >
                    {isBullish ? <TrendingUp size={10} /> : isBearish ? <TrendingDown size={10} /> : null}
                    {sentimentLabel} ({art.sentiment > 0 ? `+${art.sentiment}` : art.sentiment})
                  </span>

                  <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                    Impact: <strong style={{ color: 'var(--text-primary)' }}>{art.impact}%</strong>
                  </span>
                </div>

                <div style={{ width: '100%', height: '4px', backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: '2px', overflow: 'hidden' }}>
                  <div
                    style={{
                      width: `${art.impact}%`,
                      height: '100%',
                      backgroundColor: sentimentColor,
                      borderRadius: '2px'
                    }}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>
      
      {/* SHAP values */}
      <div className="glass-panel" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
        <div>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700, fontFamily: 'var(--font-display)', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <BarChart size={18} /> SHAP Feature Attribution
          </h3>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>How much each component model feature impacted the final prediction rating</span>
        </div>
        {renderShapChart()}
      </div>

      {/* News Embeddings Cluster */}
      <div 
        className="glass-panel" 
        style={{ 
          padding: '16px', 
          display: 'flex', 
          flexDirection: 'column', 
          gap: '14px',
          position: 'relative',
          zIndex: hoveredArticle ? 20 : 1
        }}
      >
        <div>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700, fontFamily: 'var(--font-display)', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Eye size={18} /> News Embedding Clusters
          </h3>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
            2D projection of financial news. <strong>{assetId} ({assetCategory.toUpperCase()}) and Macro catalysts highlighted.</strong>
          </span>
        </div>
        {renderNewsClusterPlot()}
      </div>

      {/* Relevant News Catalysts Feed */}
      <div className="glass-panel" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '14px', gridColumn: 'span 2' }}>
        <div>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700, fontFamily: 'var(--font-display)', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Newspaper size={18} /> Relevant News Catalysts ({assetId})
          </h3>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
            Recent high-impact market news and macroeconomic catalysts matching <strong>{assetId} ({assetCategory.toUpperCase()})</strong>.
          </span>
        </div>
        {renderNewsFeed()}
      </div>
    </div>
  );
};
