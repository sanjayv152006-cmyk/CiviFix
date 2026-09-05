import React, { useState, useEffect } from 'react';
import { Report } from '../../types';
import { categoryConfig } from '../../data/demoData';

interface MapLegendOverlayProps {
  reports: Report[];
  selectedCategory?: string;
  selectedStatus?: string;
  onSelectCategory?: (category: string) => void;
  onSelectStatus?: (status: string) => void;
  hasUserLocation?: boolean;
}

type LegendTab = 'status' | 'category' | 'symbols';

export const MapLegendOverlay: React.FC<MapLegendOverlayProps> = ({
  reports,
  selectedCategory = 'all',
  selectedStatus = 'all',
  onSelectCategory,
  onSelectStatus,
  hasUserLocation = false
}) => {
  // Determine default collapsed state based on screen width or local storage
  const [isCollapsed, setIsCollapsed] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('civic_map_legend_collapsed');
      if (stored !== null) {
        return stored === 'true';
      }
      return window.innerWidth < 768;
    }
    return false;
  });

  const [activeTab, setActiveTab] = useState<LegendTab>('status');

  // Persist preference to localStorage
  const handleToggleCollapse = () => {
    setIsCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('civic_map_legend_collapsed', String(next));
      } catch (e) {
        // Ignore storage write errors
      }
      return next;
    });
  };

  // Keyboard accessibility: Escape to collapse
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isCollapsed) {
        setIsCollapsed(true);
        try {
          localStorage.setItem('civic_map_legend_collapsed', 'true');
        } catch {
          // Ignore
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isCollapsed]);

  // Counts calculation
  const statusCounts = {
    Reported: reports.filter((r) => r.status === 'Reported').length,
    Verified: reports.filter((r) => r.status === 'Verified').length,
    'In Progress': reports.filter((r) => r.status === 'In Progress').length,
    Resolved: reports.filter((r) => r.status === 'Resolved').length
  };

  const statuses: { id: string; label: string; dotClass: string; color: string; count: number }[] = [
    { id: 'Reported', label: 'Reported', dotClass: 's-reported', color: 'var(--info, #3B82F6)', count: statusCounts['Reported'] },
    { id: 'Verified', label: 'Verified', dotClass: 's-verified', color: 'var(--purple, #8B5CF6)', count: statusCounts['Verified'] },
    { id: 'In Progress', label: 'In Progress', dotClass: 's-progress', color: 'var(--warning, #F59E0B)', count: statusCounts['In Progress'] },
    { id: 'Resolved', label: 'Resolved', dotClass: 's-resolved', color: 'var(--success, #10B981)', count: statusCounts['Resolved'] }
  ];

  // Top civic categories
  const categoriesList: {
    id: string;
    label: string;
    icon: string;
    color: string;
    count: number;
  }[] = [
    {
      id: 'Pothole & Road Damage',
      label: 'Potholes & Roads',
      icon: 'fa-road',
      color: '#F97316',
      count: reports.filter((r) => r.category === 'Pothole' || r.category === 'Road Damage').length
    },
    {
      id: 'Garbage & Waste Dump',
      label: 'Garbage Dump',
      icon: 'fa-trash-alt',
      color: '#10B981',
      count: reports.filter((r) => r.category === 'Garbage Overflow').length
    },
    {
      id: 'Broken Streetlight',
      label: 'Streetlights',
      icon: 'fa-lightbulb',
      color: '#8B5CF6',
      count: reports.filter((r) => r.category === 'Broken Streetlight').length
    },
    {
      id: 'Water Leakage & Supply',
      label: 'Water Leakage',
      icon: 'fa-tint',
      color: '#3B82F6',
      count: reports.filter((r) => r.category === 'Water Leakage').length
    },
    {
      id: 'Drainage & Sewage Overflow',
      label: 'Drainage Overflow',
      icon: 'fa-water',
      color: '#0A6EBD',
      count: reports.filter((r) => r.category === 'Drainage Issue').length
    },
    {
      id: 'Damaged Public Facility',
      label: 'Public Facility',
      icon: 'fa-ban',
      color: '#EF4444',
      count: reports.filter((r) => r.category === 'Damaged Public Facility').length
    }
  ];

  return (
    <div
      id="mapLegend"
      className={`map-legend ${isCollapsed ? 'map-legend-collapsed' : 'map-legend-expanded'}`}
      role="region"
      aria-label="Map Legend and Key"
    >
      {isCollapsed ? (
        /* Collapsed Minimalist Pill Button - Reclaims map screen space */
        <button
          type="button"
          className="legend-collapsed-pill"
          onClick={handleToggleCollapse}
          aria-expanded={false}
          aria-label="Expand map key and legend"
          title="Click to view Map Key & Legend"
        >
          <span className="pill-icon">
            <i className="fas fa-layer-group"></i>
          </span>
          <span className="pill-label">Map Key</span>
          <div className="pill-dots" aria-hidden="true">
            <span className="mini-dot s-reported"></span>
            <span className="mini-dot s-verified"></span>
            <span className="mini-dot s-progress"></span>
            <span className="mini-dot s-resolved"></span>
          </div>
          <span className="pill-badge">{reports.length}</span>
          <i className="fas fa-chevron-up pill-arrow" aria-hidden="true"></i>
        </button>
      ) : (
        /* Expanded Rich Key Overlay */
        <div className="legend-card-inner">
          {/* Header */}
          <div className="legend-card-header">
            <div className="legend-title-wrap">
              <i className="fas fa-map-marked-alt legend-title-icon"></i>
              <div className="legend-title-text">
                <span className="legend-title">Map Key & Legend</span>
                <span className="legend-subtitle">
                  {reports.length} {reports.length === 1 ? 'issue' : 'issues'} active
                </span>
              </div>
            </div>
            <button
              type="button"
              className="legend-collapse-btn"
              onClick={handleToggleCollapse}
              aria-expanded={true}
              aria-label="Collapse map key"
              title="Collapse to reclaim screen space"
            >
              <i className="fas fa-chevron-down"></i>
            </button>
          </div>

          {/* Segmented Tab Controls */}
          <div className="legend-tabs" role="tablist">
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'status'}
              className={`legend-tab-btn ${activeTab === 'status' ? 'active' : ''}`}
              onClick={() => setActiveTab('status')}
            >
              Status ({statuses.length})
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'category'}
              className={`legend-tab-btn ${activeTab === 'category' ? 'active' : ''}`}
              onClick={() => setActiveTab('category')}
            >
              Categories ({categoriesList.length})
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'symbols'}
              className={`legend-tab-btn ${activeTab === 'symbols' ? 'active' : ''}`}
              onClick={() => setActiveTab('symbols')}
            >
              Symbols
            </button>
          </div>

          {/* Tab Content */}
          <div className="legend-card-content">
            {activeTab === 'status' && (
              <div className="legend-items-list">
                {statuses.map((stat) => {
                  const isFiltered = selectedStatus === stat.id;
                  return (
                    <div
                      key={stat.id}
                      className={`legend-item status-item ${isFiltered ? 'is-selected' : ''}`}
                      onClick={() => onSelectStatus && onSelectStatus(isFiltered ? 'all' : stat.id)}
                      role={onSelectStatus ? 'button' : undefined}
                      tabIndex={onSelectStatus ? 0 : undefined}
                      title={onSelectStatus ? `Click to filter by ${stat.label}` : undefined}
                    >
                      <div className="legend-item-left">
                        <span className={`dot ${stat.dotClass}`}></span>
                        <span className="legend-item-label">{stat.label}</span>
                      </div>
                      <span className="legend-item-count">{stat.count}</span>
                    </div>
                  );
                })}
              </div>
            )}

            {activeTab === 'category' && (
              <div className="legend-items-list category-list">
                {categoriesList.map((cat) => {
                  const isFiltered = selectedCategory === cat.id;
                  return (
                    <div
                      key={cat.id}
                      className={`legend-item category-item ${isFiltered ? 'is-selected' : ''}`}
                      onClick={() => onSelectCategory && onSelectCategory(isFiltered ? 'all' : cat.id)}
                      role={onSelectCategory ? 'button' : undefined}
                      tabIndex={onSelectCategory ? 0 : undefined}
                      title={onSelectCategory ? `Click to filter by ${cat.label}` : undefined}
                    >
                      <div className="legend-item-left">
                        <span
                          className="category-icon-badge"
                          style={{ backgroundColor: `${cat.color}1A`, color: cat.color }}
                        >
                          <i className={`fas ${cat.icon}`}></i>
                        </span>
                        <span className="legend-item-label">{cat.label}</span>
                      </div>
                      <span className="legend-item-count">{cat.count}</span>
                    </div>
                  );
                })}
              </div>
            )}

            {activeTab === 'symbols' && (
              <div className="legend-items-list symbols-list">
                <div className="legend-item symbol-item">
                  <div className="legend-item-left">
                    <span className="symbol-preview user-location-preview">
                      <span className="pulse-ring"></span>
                      <span className="solid-dot"></span>
                    </span>
                    <span className="legend-item-label">Your GPS Location</span>
                  </div>
                  <span className="legend-item-tag">{hasUserLocation ? 'Active' : 'Standby'}</span>
                </div>

                <div className="legend-item symbol-item">
                  <div className="legend-item-left">
                    <span className="symbol-preview critical-preview">
                      <i className="fas fa-exclamation-triangle text-warning"></i>
                    </span>
                    <span className="legend-item-label">High-Density Alert</span>
                  </div>
                  <span className="legend-item-tag alert">Zone Alert</span>
                </div>

                <div className="legend-item symbol-item">
                  <div className="legend-item-left">
                    <span className="symbol-preview traffic-preview">
                      <i className="fas fa-traffic-light text-success"></i>
                    </span>
                    <span className="legend-item-label">Live Highway Traffic</span>
                  </div>
                  <span className="legend-item-tag info">Google Layer</span>
                </div>
              </div>
            )}
          </div>

          {/* Quick Footer */}
          <div className="legend-card-footer">
            <button
              type="button"
              className="legend-mini-action"
              onClick={handleToggleCollapse}
              title="Collapse to reclaim screen space"
            >
              <i className="fas fa-compress-alt"></i> Collapse to minimize
            </button>
            {onSelectStatus && (selectedStatus !== 'all' || selectedCategory !== 'all') && (
              <button
                type="button"
                className="legend-mini-reset"
                onClick={() => {
                  onSelectStatus('all');
                  if (onSelectCategory) onSelectCategory('all');
                }}
              >
                Reset filter
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
