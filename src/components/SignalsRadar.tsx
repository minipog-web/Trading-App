import React, { useState, useEffect } from 'react';
import { Search, Eye, Filter, ArrowUpDown } from 'lucide-react';
import { formatAssetPrice } from '../utils/formatter.ts';

interface AssetSignal {
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
  sparkline: number[];
}

interface SignalsRadarProps {
  assets: AssetSignal[];
  onSelectAsset: (id: string) => void;
  onTrackAsset?: (symbol: string) => Promise<boolean>;
}

type SortField = 'id' | 'price' | 'score' | 'technicalScore' | 'mlScore' | 'macroScore' | 'newsScore' | 'crossAssetScore' | 'whaleScore' | 'confidence';
type SortOrder = 'asc' | 'desc';

export const SignalsRadar: React.FC<SignalsRadarProps> = ({ assets, onSelectAsset, onTrackAsset }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [ratingFilter, setRatingFilter] = useState('ALL');
  const [sortField, setSortField] = useState<SortField>('score');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const [isTracking, setIsTracking] = useState(false);
  const [trackError, setTrackError] = useState<string | null>(null);

  const itemsPerPage = 25;

  // Reset to first page when search filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, categoryFilter, ratingFilter]);

  // Filter logic
  const filteredAssets = assets.filter(asset => {
    const matchesSearch = asset.id.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          asset.name.toLowerCase().includes(searchTerm.toLowerCase());
    
    let matchesCategory = true;
    if (categoryFilter !== 'ALL') {
      if (categoryFilter === 'CRYPTO') matchesCategory = asset.category === 'crypto';
      else if (categoryFilter === 'COMMODITY') matchesCategory = asset.category === 'commodity';
      else if (categoryFilter === 'INDEX') matchesCategory = asset.category === 'equity' && !asset.parentIndex;
      else if (categoryFilter === 'TECH') matchesCategory = asset.parentIndex === 'NASDAQ';
      else if (categoryFilter === 'BLUECHIP') matchesCategory = asset.parentIndex === 'SPX' || asset.parentIndex === 'NYSE';
    }

    const matchesRating = ratingFilter === 'ALL' || asset.rating === ratingFilter;

    return matchesSearch && matchesCategory && matchesRating;
  });

  const getSortValue = (asset: AssetSignal, field: SortField) => {
    switch (field) {
      case 'id': return asset.id;
      case 'price': return asset.price;
      case 'score': return asset.score;
      case 'technicalScore': return asset.technicalScore;
      case 'mlScore': return asset.mlScore;
      case 'macroScore': return asset.macroScore;
      case 'newsScore': return asset.newsScore;
      case 'crossAssetScore': return asset.crossAssetScore;
      case 'whaleScore': return asset.whaleScore;
      case 'confidence': return asset.confidence;
      default: return 0;
    }
  };

  // Sort logic
  const sortedAssets = [...filteredAssets].sort((a, b) => {
    let valA = getSortValue(a, sortField);
    let valB = getSortValue(b, sortField);

    if (typeof valA === 'string') {
      valA = valA.toLowerCase();
      valB = (valB as string).toLowerCase();
    }

    if (valA === undefined) return 1;
    if (valB === undefined) return -1;

    if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
    if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
    return 0;
  });

  const totalPages = Math.ceil(sortedAssets.length / itemsPerPage) || 1;
  const paginatedAssets = sortedAssets.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(prev => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
  };

  const handleTrackSymbol = async (symbol: string) => {
    setIsTracking(true);
    setTrackError(null);
    try {
      if (onTrackAsset) {
        const success = await onTrackAsset(symbol);
        if (!success) {
          setTrackError(`Failed to fetch symbol "${symbol}" from Yahoo Finance.`);
        } else {
          setSearchTerm('');
        }
      }
    } catch (e: any) {
      setTrackError(e.message || 'Error tracking ticker.');
    } finally {
      setIsTracking(false);
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 74) return 'var(--color-buy)';
    if (score >= 58) return 'var(--color-buy)';
    if (score >= 42) return 'var(--color-hold)';
    return 'var(--color-sell)';
  };

  return (
    <div className="glass-panel" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
      
      {/* Header and Stats */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '14px' }}>
        <div>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 800, fontFamily: 'var(--font-display)' }}>Signals Radar</h2>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
            Real-time calculated model scores and trading ranges across {assets.length} tracked asset classes.
          </p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: '220px' }}>
          <Search size={16} style={{ position: 'absolute', left: '12px', top: '10px', color: 'var(--text-secondary)' }} />
          <input
            type="text"
            placeholder="Search by symbol or name..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              width: '100%',
              backgroundColor: '#0b0f19',
              border: '1px solid var(--border-color)',
              color: 'var(--text-primary)',
              borderRadius: '8px',
              padding: '8px 12px 8px 36px',
              fontSize: '0.85rem',
              outline: 'none',
              transition: 'border-color 0.2s'
            }}
            className="search-input"
          />
        </div>

        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {/* Category Dropdown */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Filter size={12} style={{ color: 'var(--text-secondary)' }} />
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="select-filter"
              title="Filter by Asset Category"
            >
              <option value="ALL">All Categories</option>
              <option value="CRYPTO">Cryptocurrencies</option>
              <option value="INDEX">Index Composites</option>
              <option value="TECH">Tech Equities (NASDAQ)</option>
              <option value="BLUECHIP">Blue-Chips & Value</option>
              <option value="COMMODITY">Commodities</option>
            </select>
          </div>

          {/* Rating Dropdown */}
          <select
            value={ratingFilter}
            onChange={(e) => setRatingFilter(e.target.value)}
            className="select-filter"
            title="Filter by Rating"
          >
            <option value="ALL">All Ratings</option>
            <option value="Strong Buy">Strong Buy</option>
            <option value="Buy">Buy</option>
            <option value="Hold">Hold</option>
            <option value="Sell">Sell</option>
          </select>
        </div>
      </div>

      {/* Signals Grid Table */}
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem', textAlign: 'left' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-secondary)' }}>
              <th onClick={() => handleSort('id')} style={{ padding: '12px 10px', cursor: 'pointer' }} className="sortable-th">
                Asset <ArrowUpDown size={10} style={{ marginLeft: '4px', display: 'inline' }} />
              </th>
              <th style={{ padding: '12px 10px' }}>Rating</th>
              <th onClick={() => handleSort('price')} style={{ padding: '12px 10px', cursor: 'pointer' }} className="sortable-th">
                Price <ArrowUpDown size={10} style={{ marginLeft: '4px', display: 'inline' }} />
              </th>
              <th onClick={() => handleSort('score')} style={{ padding: '12px 10px', cursor: 'pointer' }} className="sortable-th">
                Unified Score <ArrowUpDown size={10} style={{ marginLeft: '4px', display: 'inline' }} />
              </th>
              <th onClick={() => handleSort('technicalScore')} style={{ padding: '12px 10px', cursor: 'pointer', textAlign: 'center' }} className="sortable-th">
                Tech <ArrowUpDown size={10} style={{ marginLeft: '4px', display: 'inline' }} />
              </th>
              <th onClick={() => handleSort('mlScore')} style={{ padding: '12px 10px', cursor: 'pointer', textAlign: 'center' }} className="sortable-th">
                ML <ArrowUpDown size={10} style={{ marginLeft: '4px', display: 'inline' }} />
              </th>
              <th onClick={() => handleSort('macroScore')} style={{ padding: '12px 10px', cursor: 'pointer', textAlign: 'center' }} className="sortable-th">
                Macro <ArrowUpDown size={10} style={{ marginLeft: '4px', display: 'inline' }} />
              </th>
              <th onClick={() => handleSort('newsScore')} style={{ padding: '12px 10px', cursor: 'pointer', textAlign: 'center' }} className="sortable-th">
                News <ArrowUpDown size={10} style={{ marginLeft: '4px', display: 'inline' }} />
              </th>
              <th onClick={() => handleSort('crossAssetScore')} style={{ padding: '12px 10px', cursor: 'pointer', textAlign: 'center' }} className="sortable-th">
                Cross-Asset <ArrowUpDown size={10} style={{ marginLeft: '4px', display: 'inline' }} />
              </th>
              <th onClick={() => handleSort('whaleScore')} style={{ padding: '12px 10px', cursor: 'pointer', textAlign: 'center' }} className="sortable-th">
                Whale Flow <ArrowUpDown size={10} style={{ marginLeft: '4px', display: 'inline' }} />
              </th>
              <th onClick={() => handleSort('confidence')} style={{ padding: '12px 10px', cursor: 'pointer', textAlign: 'center' }} className="sortable-th">
                Confidence <ArrowUpDown size={10} style={{ marginLeft: '4px', display: 'inline' }} />
              </th>
              <th style={{ padding: '12px 10px' }}>Stop Loss / Take Profit</th>
              <th style={{ padding: '12px 10px', textAlign: 'right' }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {paginatedAssets.map((asset) => {
              const isPositive = asset.change24h >= 0;
              const scoreColor = getScoreColor(asset.score);
              return (
                <tr key={asset.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)', transition: 'background-color 0.2s' }} className="table-row">
                  {/* Asset */}
                  <td style={{ padding: '12px 10px', whiteSpace: 'nowrap' }}>
                    <span style={{ fontWeight: 800, fontSize: '0.9rem', display: 'block', color: 'var(--text-primary)' }}>{asset.id}</span>
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>{asset.name}</span>
                  </td>

                  {/* Rating */}
                  <td style={{ padding: '12px 10px' }}>
                    <span className={`badge-rating ${asset.rating.toLowerCase().replace(' ', '-')}`}>
                      {asset.rating}
                    </span>
                  </td>

                  {/* Price */}
                  <td style={{ padding: '12px 10px' }}>
                    <span style={{ fontWeight: 700, display: 'block' }}>
                      {formatAssetPrice(asset.id, asset.price)}
                    </span>
                    <span style={{ fontSize: '0.75rem', fontWeight: 600, color: isPositive ? 'var(--color-buy)' : 'var(--color-sell)' }}>
                      {isPositive ? '+' : ''}{asset.change24h}%
                    </span>
                  </td>

                  {/* Unified Score */}
                  <td style={{ padding: '12px 10px', minWidth: '130px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontWeight: 700, color: scoreColor, width: '24px' }}>{asset.score}</span>
                      <div style={{ flex: 1, height: '6px', backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: '3px', overflow: 'hidden' }}>
                        <div
                          style={{
                            height: '100%',
                            width: `${asset.score}%`,
                            backgroundColor: scoreColor,
                            borderRadius: '3px',
                            boxShadow: `0 0 6px ${scoreColor}`
                          }}
                        />
                      </div>
                    </div>
                  </td>

                  {/* Technical Score */}
                  <td style={{ padding: '12px 10px', textAlign: 'center', fontWeight: 600 }}>{asset.technicalScore}</td>

                  {/* ML Score */}
                  <td style={{ padding: '12px 10px', textAlign: 'center', fontWeight: 600 }}>{asset.mlScore}</td>

                  {/* Macro Score */}
                  <td style={{ padding: '12px 10px', textAlign: 'center', fontWeight: 600 }}>{asset.macroScore}</td>

                  {/* News Score */}
                  <td style={{ padding: '12px 10px', textAlign: 'center', fontWeight: 600 }}>{asset.newsScore}</td>

                  {/* Cross-Asset Score */}
                  <td style={{ padding: '12px 10px', textAlign: 'center', fontWeight: 600 }}>{asset.crossAssetScore}</td>

                  {/* Whale Flow */}
                  <td style={{ padding: '12px 10px', textAlign: 'center', fontWeight: 700 }}>
                    <span style={{ 
                      color: asset.whaleScore >= 70 ? 'var(--color-buy)' : asset.whaleScore <= 30 ? 'var(--color-sell)' : '#f59e0b',
                      backgroundColor: asset.whaleScore >= 70 ? 'rgba(16,185,129,0.08)' : asset.whaleScore <= 30 ? 'rgba(244,63,94,0.08)' : 'rgba(245,158,11,0.08)',
                      padding: '2px 6px',
                      borderRadius: '4px'
                    }}>
                      {asset.whaleScore}
                    </span>
                  </td>

                  {/* Confidence */}
                  <td style={{ padding: '12px 10px', textAlign: 'center', color: 'var(--text-secondary)' }}>{asset.confidence}%</td>

                  {/* Stop Loss / Take Profit */}
                  <td style={{ padding: '12px 10px', whiteSpace: 'nowrap' }}>
                    <span style={{ display: 'block', color: 'var(--color-sell)', fontWeight: 600 }}>
                      SL: {formatAssetPrice(asset.id, asset.stopLoss)}
                    </span>
                    <span style={{ display: 'block', color: 'var(--color-buy)', fontWeight: 600 }}>
                      TP: {formatAssetPrice(asset.id, asset.takeProfit)}
                    </span>
                  </td>

                  {/* Action */}
                  <td style={{ padding: '12px 10px', textAlign: 'right' }}>
                    <button
                      onClick={() => onSelectAsset(asset.id)}
                      className="btn-tool"
                      style={{
                        padding: '6px 12px',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        fontSize: '0.75rem',
                        fontWeight: 600
                      }}
                    >
                      <Eye size={12} /> Analyze
                    </button>
                  </td>
                </tr>
              );
            })}

            {sortedAssets.length === 0 && (
              <tr>
                <td colSpan={13} style={{ textAlign: 'center', padding: '40px 20px' }}>
                  <p style={{ color: 'var(--text-muted)', marginBottom: '14px', fontSize: '0.9rem' }}>
                    No assets match the criteria for "{searchTerm}".
                  </p>
                  {searchTerm.trim().length > 0 && searchTerm.trim().length <= 5 && !searchTerm.includes(' ') && (
                    <div>
                      <button
                        onClick={() => handleTrackSymbol(searchTerm.trim().toUpperCase())}
                        className="btn-tool"
                        disabled={isTracking}
                        style={{
                          padding: '8px 16px',
                          fontSize: '0.8rem',
                          fontWeight: 600,
                          backgroundColor: 'var(--color-buy)',
                          color: '#000',
                          borderRadius: '6px',
                          boxShadow: '0 0 10px rgba(16, 185, 129, 0.3)',
                          cursor: 'pointer'
                        }}
                      >
                        {isTracking ? 'Tracking Ticker...' : `🔍 Track "${searchTerm.trim().toUpperCase()}" on NYSE/NASDAQ`}
                      </button>
                      {trackError && (
                        <p style={{ color: 'var(--color-sell)', marginTop: '8px', fontSize: '0.75rem' }}>{trackError}</p>
                      )}
                    </div>
                  )}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '16px', fontSize: '0.8rem' }}>
          <div style={{ color: 'var(--text-secondary)' }}>
            Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, sortedAssets.length)} of {sortedAssets.length} assets
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              disabled={currentPage === 1}
              onClick={() => setCurrentPage(prev => prev - 1)}
              className="btn-tool"
              style={{ padding: '4px 10px', fontSize: '0.75rem', opacity: currentPage === 1 ? 0.5 : 1, cursor: currentPage === 1 ? 'not-allowed' : 'pointer' }}
            >
              Previous
            </button>
            <span style={{ display: 'inline-flex', alignItems: 'center', padding: '0 8px', fontWeight: 600 }}>
              Page {currentPage} of {totalPages}
            </span>
            <button
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage(prev => prev + 1)}
              className="btn-tool"
              style={{ padding: '4px 10px', fontSize: '0.75rem', opacity: currentPage === totalPages ? 0.5 : 1, cursor: currentPage === totalPages ? 'not-allowed' : 'pointer' }}
            >
              Next
            </button>
          </div>
        </div>
      )}

      <style>{`
        .sortable-th:hover {
          color: var(--text-primary);
        }
        .search-input:focus {
          border-color: var(--color-info) !important;
          box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.2);
        }
      `}</style>
    </div>
  );
};
