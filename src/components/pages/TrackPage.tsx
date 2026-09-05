import React, { useState, useEffect } from 'react';
import { Report } from '../../types';

interface TrackPageProps {
  reports: Report[];
  initialSearchId?: string;
}

export const TrackPage: React.FC<TrackPageProps> = ({ reports, initialSearchId }) => {
  const [searchInput, setSearchInput] = useState(initialSearchId || '');
  const [searchedReport, setSearchedReport] = useState<Report | null>(null);
  const [hasSearched, setHasSearched] = useState(false);
  const [recentSearches, setRecentSearches] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('civicfix_recent_searches');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    if (initialSearchId) {
      setSearchInput(initialSearchId);
      handleTrack(initialSearchId);
    }
  }, [initialSearchId]);

  const handleTrack = (idToSearch?: string) => {
    const targetId = (idToSearch || searchInput).trim().toUpperCase();
    if (!targetId) return;

    setHasSearched(true);
    const found = reports.find((r) => r.id.toUpperCase() === targetId);
    setSearchedReport(found || null);

    // Save to recent searches (up to last 5, deduplicated)
    setRecentSearches((prev) => {
      const updated = [targetId, ...prev.filter((id) => id !== targetId)].slice(0, 5);
      try {
        localStorage.setItem('civicfix_recent_searches', JSON.stringify(updated));
      } catch (err) {
        console.error('Failed to save recent search to localStorage', err);
      }
      return updated;
    });
  };

  const handleClearRecent = () => {
    setRecentSearches([]);
    localStorage.removeItem('civicfix_recent_searches');
  };

  return (
    <section className="page active" id="track">
      <div className="container">
        <div className="page-header">
          <span className="section-tag">Track Report</span>
          <h1 className="page-title">Track Your Report</h1>
          <p className="page-subtitle">
            Enter your unique complaint ID to view real-time status and municipal progress.
          </p>
        </div>

        <div className="track-search-card">
          <div className="track-search">
            <div className="track-input-wrap">
              <i className="fas fa-search"></i>
              <input
                type="text"
                id="trackInput"
                className="track-input"
                placeholder="Enter Report ID (e.g. CF-2026-0001)"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleTrack();
                }}
              />
            </div>
            <button
              type="button"
              className="btn btn-primary"
              id="trackBtn"
              onClick={() => handleTrack()}
            >
              <i className="fas fa-search"></i> Track
            </button>
          </div>
          <div className="track-suggestions">
            <span>Try:</span>
            {reports.slice(0, 3).map((r) => (
              <button
                key={r.id}
                type="button"
                className="suggestion-chip"
                onClick={() => {
                  setSearchInput(r.id);
                  handleTrack(r.id);
                }}
              >
                {r.id}
              </button>
            ))}
          </div>

          {/* Recent Searches Section */}
          {recentSearches.length > 0 && (
            <div
              className="track-recent-section"
              id="trackRecentSearches"
              style={{
                marginTop: '16px',
                paddingTop: '16px',
                borderTop: '1px solid var(--gray-200)'
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: '10px'
                }}
              >
                <span
                  style={{
                    fontSize: '13px',
                    fontWeight: 600,
                    color: 'var(--navy)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  <i className="fas fa-history" style={{ color: 'var(--primary)', fontSize: '13px' }}></i>
                  Recent Searches ({recentSearches.length})
                </span>
                <button
                  type="button"
                  onClick={handleClearRecent}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--gray-500)',
                    fontSize: '12px',
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    padding: '2px 8px',
                    borderRadius: '4px'
                  }}
                  title="Clear search history"
                >
                  <i className="fas fa-trash-alt" style={{ fontSize: '11px' }}></i> Clear History
                </button>
              </div>

              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {recentSearches.map((recId) => {
                  const found = reports.find((r) => r.id.toUpperCase() === recId);
                  const isCurrent = searchedReport?.id.toUpperCase() === recId;
                  return (
                    <button
                      key={recId}
                      type="button"
                      className={`suggestion-chip ${isCurrent ? 'active' : ''}`}
                      id={`recent-search-${recId}`}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '6px 12px',
                        borderRadius: '20px',
                        fontSize: '12px',
                        fontWeight: 600,
                        backgroundColor: isCurrent ? 'var(--primary-light)' : 'var(--gray-100)',
                        border: isCurrent ? '1px solid var(--primary)' : '1px solid var(--gray-200)',
                        color: isCurrent ? 'var(--primary)' : 'var(--navy)'
                      }}
                      onClick={() => {
                        setSearchInput(recId);
                        handleTrack(recId);
                      }}
                    >
                      <i className="fas fa-search" style={{ fontSize: '10px', opacity: 0.6 }}></i>
                      <span>{recId}</span>
                      {found && (
                        <span
                          style={{
                            fontSize: '10px',
                            padding: '1px 6px',
                            borderRadius: '10px',
                            fontWeight: 700,
                            background:
                              found.status === 'Resolved'
                                ? '#D1FAE5'
                                : found.status === 'In Progress'
                                ? '#FEF3C7'
                                : '#E0E7FF',
                            color:
                              found.status === 'Resolved'
                                ? '#065F46'
                                : found.status === 'In Progress'
                                ? '#92400E'
                                : '#3730A3'
                          }}
                        >
                          {found.status}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        <div className="track-result" id="trackResult">
          {!hasSearched ? (
            <div className="track-empty">
              <div className="track-empty-icon">
                <i className="fas fa-clipboard-check"></i>
              </div>
              <h3>Enter a Report ID to begin</h3>
              <p>Search for any infrastructure report to view its verified details and resolution timeline.</p>
            </div>
          ) : !searchedReport ? (
            <div className="track-empty">
              <div
                className="track-empty-icon"
                style={{ background: 'var(--danger-light)', color: 'var(--danger)' }}
              >
                <i className="fas fa-exclamation-circle"></i>
              </div>
              <h3>Report Not Found</h3>
              <p>
                No ticket registered under ID: <strong>{searchInput}</strong>
              </p>
              <p style={{ marginTop: '12px', fontSize: '13px', color: 'var(--gray-500)' }}>
                Please verify the ID formatting (e.g. CF-2026-0001) and try again.
              </p>
            </div>
          ) : (
            <div className="track-result-card">
              <div className="track-result-header">
                <div>
                  <div className="track-result-id">{searchedReport.id}</div>
                  <div style={{ opacity: 0.9, fontSize: '14px', marginTop: '4px' }}>
                    {searchedReport.title}
                  </div>
                </div>
                <span className="track-result-status">{searchedReport.status}</span>
              </div>
              <div className="track-result-body">
                <div className="track-detail-grid">
                  <div className="track-detail-item">
                    <div className="track-detail-label">Category</div>
                    <div className="track-detail-value">{searchedReport.category}</div>
                  </div>
                  <div className="track-detail-item">
                    <div className="track-detail-label">Priority</div>
                    <div className="track-detail-value">{searchedReport.priority}</div>
                  </div>
                  <div className="track-detail-item">
                    <div className="track-detail-label">Location</div>
                    <div className="track-detail-value">{searchedReport.area}</div>
                  </div>
                  <div className="track-detail-item">
                    <div className="track-detail-label">Severity</div>
                    <div className="track-detail-value">{searchedReport.severity}</div>
                  </div>
                  <div className="track-detail-item">
                    <div className="track-detail-label">Date Filed</div>
                    <div className="track-detail-value">
                      {new Date(searchedReport.date).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })}
                    </div>
                  </div>
                  <div className="track-detail-item">
                    <div className="track-detail-label">Last Updated</div>
                    <div className="track-detail-value">
                      {new Date(searchedReport.lastUpdated).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })}
                    </div>
                  </div>
                </div>

                <div className="track-detail-item" style={{ marginBottom: '24px' }}>
                  <div className="track-detail-label">Description</div>
                  <div className="track-detail-value" style={{ fontWeight: 400 }}>
                    {searchedReport.description}
                  </div>
                </div>

                {searchedReport.photoUrl && (
                  <div style={{ marginBottom: '24px' }}>
                    <div className="track-detail-label" style={{ marginBottom: '8px' }}>
                      Attached Photo
                    </div>
                    <img
                      src={searchedReport.photoUrl}
                      alt="Attached issue"
                      style={{ maxHeight: '200px', borderRadius: 'var(--radius-md)' }}
                    />
                  </div>
                )}

                <div className="timeline-section">
                  <h3 className="timeline-title">Status Timeline</h3>
                  <div className="timeline">
                    {searchedReport.timeline.map((item, idx) => (
                      <div
                        key={idx}
                        className={`timeline-item ${
                          item.completed ? 'completed' : 'pending'
                        } ${item.current ? 'current' : ''}`}
                      >
                        <div className="timeline-dot">
                          {item.completed ? (
                            <i className="fas fa-check"></i>
                          ) : item.current ? (
                            <i className="fas fa-circle"></i>
                          ) : null}
                        </div>
                        <div className="timeline-content">
                          <h4>{item.status}</h4>
                          <div className="timeline-date">{item.date}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
};
