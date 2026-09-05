import React, { useState, useEffect, useRef } from 'react';
import L from 'leaflet';
import { Report, User, PageType, PriorityType, StatusType } from '../../types';
import { categoryConfig } from '../../data/demoData';
import { getActiveGoogleMapsKey } from '../../utils/maps';
import { GoogleLiveMap } from '../maps/GoogleLiveMap';

interface AdminPageProps {
  reports: Report[];
  users: User[];
  onNavigate: (page: PageType) => void;
  onViewDetail: (report: Report) => void;
  onAdminAction: (reportId: string, action: 'verify' | 'assign' | 'resolve' | 'priority' | 'status') => void;
  showToast: (title: string, msg: string, type?: 'info' | 'success' | 'warning' | 'error') => void;
}

export const AdminPage: React.FC<AdminPageProps> = ({
  reports,
  users,
  onNavigate,
  onViewDetail,
  onAdminAction,
  showToast
}) => {
  const googleMapsApiKey = getActiveGoogleMapsKey();
  const [adminMapEngine, setAdminMapEngine] = useState<'google' | 'leaflet'>(
    googleMapsApiKey ? 'google' : 'leaflet'
  );
  const [activeTab, setActiveTab] = useState<
    'overview' | 'reports' | 'map' | 'analytics' | 'users' | 'settings'
  >('overview');

  const [tableSearch, setTableSearch] = useState('');
  const [tableStatusFilter, setTableStatusFilter] = useState('all');

  const adminMapContainerRef = useRef<HTMLDivElement>(null);
  const adminMapInstanceRef = useRef<L.Map | null>(null);

  // Filtered table reports
  const filteredReports = reports.filter((r) => {
    const s = tableSearch.toLowerCase();
    const matchesSearch =
      !s ||
      r.id.toLowerCase().includes(s) ||
      r.title.toLowerCase().includes(s) ||
      r.category.toLowerCase().includes(s) ||
      r.area.toLowerCase().includes(s);
    const matchesStatus = tableStatusFilter === 'all' || r.status === tableStatusFilter;
    return matchesSearch && matchesStatus;
  });

  // Calculate category distributions
  const categoryCounts: Record<string, number> = {};
  reports.forEach((r) => {
    categoryCounts[r.category] = (categoryCounts[r.category] || 0) + 1;
  });
  const maxCategoryCount = Math.max(...Object.values(categoryCounts), 1);

  // Calculate status distributions
  const statusCounts: Record<string, number> = {
    Reported: 0,
    Verified: 0,
    Assigned: 0,
    'In Progress': 0,
    Resolved: 0
  };
  reports.forEach((r) => {
    if (statusCounts[r.status] !== undefined) {
      statusCounts[r.status]++;
    }
  });

  // Area distribution
  const areaCounts: Record<string, number> = {};
  reports.forEach((r) => {
    const areaName = r.area.split(',')[0].trim();
    areaCounts[areaName] = (areaCounts[areaName] || 0) + 1;
  });
  const maxAreaCount = Math.max(...Object.values(areaCounts), 1);

  // Automatically update to google if key is active
  useEffect(() => {
    if (googleMapsApiKey && adminMapEngine === 'leaflet') {
      setAdminMapEngine('google');
    }
  }, [googleMapsApiKey]);

  // Setup Admin Map when tab is 'map'
  useEffect(() => {
    if (activeTab !== 'map') return;
    if (adminMapEngine !== 'leaflet') return;
    if (!adminMapContainerRef.current) return;

    if (adminMapInstanceRef.current) {
      adminMapInstanceRef.current.remove();
      adminMapInstanceRef.current = null;
    }
    if ((adminMapContainerRef.current as unknown as { _leaflet_id?: number })._leaflet_id) {
      delete (adminMapContainerRef.current as unknown as { _leaflet_id?: number })._leaflet_id;
    }

    const map = L.map(adminMapContainerRef.current).setView([11.0168, 78.6569], 7);
    L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
      maxZoom: 19
    }).addTo(map);

    reports.forEach((report) => {
      const config = categoryConfig[report.category] || {
        color: '#64748B',
        class: 'marker-other',
        icon: 'fa-circle'
      };
      const icon = L.divIcon({
        className: 'custom-marker',
        html: `<div class="marker-pin ${config.class}"><i class="fas ${config.icon}"></i></div>`,
        iconSize: [32, 32],
        iconAnchor: [16, 32]
      });

      const statusClass = report.status.toLowerCase().replace(' ', '-');
      const marker = L.marker([report.lat, report.lng], { icon });

      const popupDiv = document.createElement('div');
      popupDiv.className = 'popup-card';
      popupDiv.innerHTML = `
        <div class="popup-header" style="background: ${config.color}">
          <span class="popup-id">${report.id}</span>
          <span class="status-badge status-${statusClass}" style="background: rgba(255,255,255,0.25); color: white;">
            ${report.status}
          </span>
        </div>
        <div class="popup-body">
          <div class="popup-title">${report.title}</div>
          <div class="popup-row"><span class="popup-label">Category:</span><span class="popup-value">${report.category}</span></div>
          <div class="popup-row"><span class="popup-label">Priority:</span><span class="popup-value">${report.priority}</span></div>
          <div class="popup-row"><span class="popup-label">Location:</span><span class="popup-value">${report.area}</span></div>
        </div>
      `;

      const viewBtn = document.createElement('button');
      viewBtn.className = 'btn btn-primary btn-sm btn-block popup-view-btn';
      viewBtn.textContent = 'View Report';
      viewBtn.onclick = () => onViewDetail(report);
      popupDiv.querySelector('.popup-body')?.appendChild(viewBtn);

      marker.bindPopup(popupDiv, { maxWidth: 300 });
      marker.addTo(map);
    });

    adminMapInstanceRef.current = map;

    return () => {
      if (adminMapInstanceRef.current) {
        adminMapInstanceRef.current.remove();
        adminMapInstanceRef.current = null;
      }
    };
  }, [activeTab, reports, onViewDetail, adminMapEngine, googleMapsApiKey]);

  const palette = ['#0A6EBD', '#00ADB5', '#8B5CF6', '#F59E0B', '#10B981', '#EF4444', '#F97316', '#64748B'];

  // Status donut gradient calculation
  const totalReports = reports.length || 1;
  const statusColorsMap: Record<string, string> = {
    Reported: '#3B82F6',
    Verified: '#8B5CF6',
    Assigned: '#00ADB5',
    'In Progress': '#F59E0B',
    Resolved: '#10B981'
  };

  const donutGradientParts: string[] = [];
  let cumulative = 0;
  Object.entries(statusCounts).forEach(([status, count]) => {
    const percent = (count / totalReports) * 100;
    donutGradientParts.push(
      `${statusColorsMap[status]} ${cumulative}% ${cumulative + percent}%`
    );
    cumulative += percent;
  });

  return (
    <section className="page active" id="admin">
      <div className="admin-layout">
        {/* Sidebar */}
        <aside className="admin-sidebar">
          <div className="admin-sidebar-header">
            <div className="admin-logo">
              <i className="fas fa-shield-halved"></i>
            </div>
            <div>
              <div className="admin-title">Admin Panel</div>
              <div className="admin-subtitle">Authority Console</div>
            </div>
          </div>
          <nav className="admin-nav">
            <button
              type="button"
              className={`admin-nav-link ${activeTab === 'overview' ? 'active' : ''}`}
              onClick={() => setActiveTab('overview')}
            >
              <i className="fas fa-chart-pie"></i> Overview
            </button>
            <button
              type="button"
              className={`admin-nav-link ${activeTab === 'reports' ? 'active' : ''}`}
              onClick={() => setActiveTab('reports')}
            >
              <i className="fas fa-clipboard-list"></i> Reports
            </button>
            <button
              type="button"
              className={`admin-nav-link ${activeTab === 'map' ? 'active' : ''}`}
              onClick={() => setActiveTab('map')}
            >
              <i className="fas fa-map"></i> Live Map
            </button>
            <button
              type="button"
              className={`admin-nav-link ${activeTab === 'analytics' ? 'active' : ''}`}
              onClick={() => setActiveTab('analytics')}
            >
              <i className="fas fa-chart-bar"></i> Analytics
            </button>
            <button
              type="button"
              className={`admin-nav-link ${activeTab === 'users' ? 'active' : ''}`}
              onClick={() => setActiveTab('users')}
            >
              <i className="fas fa-users"></i> Users
            </button>
            <button
              type="button"
              className={`admin-nav-link ${activeTab === 'settings' ? 'active' : ''}`}
              onClick={() => setActiveTab('settings')}
            >
              <i className="fas fa-cog"></i> Settings
            </button>
          </nav>
          <div className="admin-sidebar-footer">
            <div className="admin-user">
              <div className="admin-avatar">AD</div>
              <div>
                <div className="admin-user-name">Admin Officer</div>
                <div className="admin-user-role">Municipal Authority</div>
              </div>
            </div>
          </div>
        </aside>

        {/* Main Console */}
        <div className="admin-main">
          {/* Tab 1: Overview */}
          {activeTab === 'overview' && (
            <div className="admin-section active" id="admin-overview">
              <div className="admin-header">
                <div>
                  <h1>Overview</h1>
                  <p>Real-time operational snapshot of civic infrastructure complaints.</p>
                </div>
                <button
                  type="button"
                  className="btn btn-primary btn-sm"
                  onClick={() => onNavigate('report')}
                >
                  <i className="fas fa-plus"></i> Create Report
                </button>
              </div>

              <div className="admin-stat-grid">
                <div className="admin-stat-card">
                  <div className="admin-stat-top">
                    <div className="admin-stat-icon icon-blue">
                      <i className="fas fa-file-alt"></i>
                    </div>
                    <span className="admin-stat-trend up">
                      <i className="fas fa-arrow-up"></i> 12%
                    </span>
                  </div>
                  <div className="admin-stat-num">{reports.length}</div>
                  <div className="admin-stat-label">Total Reports</div>
                </div>
                <div className="admin-stat-card">
                  <div className="admin-stat-top">
                    <div className="admin-stat-icon icon-orange">
                      <i className="fas fa-hourglass-half"></i>
                    </div>
                    <span className="admin-stat-trend up">
                      <i className="fas fa-arrow-up"></i> 5%
                    </span>
                  </div>
                  <div className="admin-stat-num">
                    {reports.filter((r) => r.status === 'Reported').length}
                  </div>
                  <div className="admin-stat-label">Pending Verification</div>
                </div>
                <div className="admin-stat-card">
                  <div className="admin-stat-top">
                    <div className="admin-stat-icon icon-red">
                      <i className="fas fa-exclamation-triangle"></i>
                    </div>
                    <span className="admin-stat-trend down">
                      <i className="fas fa-arrow-down"></i> 3%
                    </span>
                  </div>
                  <div className="admin-stat-num">
                    {reports.filter((r) => r.priority === 'Critical').length}
                  </div>
                  <div className="admin-stat-label">Critical Priority</div>
                </div>
                <div className="admin-stat-card">
                  <div className="admin-stat-top">
                    <div className="admin-stat-icon icon-teal">
                      <i className="fas fa-spinner"></i>
                    </div>
                    <span className="admin-stat-trend up">
                      <i className="fas fa-arrow-up"></i> 8%
                    </span>
                  </div>
                  <div className="admin-stat-num">
                    {reports.filter((r) => r.status === 'In Progress' || r.status === 'Assigned').length}
                  </div>
                  <div className="admin-stat-label">In Progress</div>
                </div>
                <div className="admin-stat-card">
                  <div className="admin-stat-top">
                    <div className="admin-stat-icon icon-green">
                      <i className="fas fa-check-circle"></i>
                    </div>
                    <span className="admin-stat-trend up">
                      <i className="fas fa-arrow-up"></i> 15%
                    </span>
                  </div>
                  <div className="admin-stat-num">
                    {reports.filter((r) => r.status === 'Resolved').length}
                  </div>
                  <div className="admin-stat-label">Resolved</div>
                </div>
              </div>

              <div className="admin-grid-2">
                <div className="admin-card">
                  <div className="admin-card-header">
                    <h3>Recent Reports</h3>
                    <button
                      type="button"
                      className="link-btn"
                      onClick={() => setActiveTab('reports')}
                    >
                      View all <i className="fas fa-arrow-right"></i>
                    </button>
                  </div>
                  <div className="admin-recent-list" id="adminRecentList">
                    {reports.slice(-5).reverse().map((r) => {
                      const config = categoryConfig[r.category] || {
                        color: '#0A6EBD',
                        icon: 'fa-bullseye'
                      };
                      const statusClass = r.status.toLowerCase().replace(' ', '-');
                      return (
                        <div
                          key={r.id}
                          className="admin-recent-item"
                          onClick={() => onViewDetail(r)}
                        >
                          <div
                            className="admin-recent-icon"
                            style={{ background: `${config.color}20`, color: config.color }}
                          >
                            <i className={`fas ${config.icon}`}></i>
                          </div>
                          <div className="admin-recent-info">
                            <div className="admin-recent-title">{r.title}</div>
                            <div className="admin-recent-meta">
                              {r.id} · {r.area}
                            </div>
                          </div>
                          <span className={`status-badge status-${statusClass}`}>
                            {r.status}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="admin-card">
                  <div className="admin-card-header">
                    <h3>Reports by Category</h3>
                  </div>
                  <div className="mini-chart" id="miniCatChart">
                    {Object.entries(categoryCounts).map(([cat, count], idx) => (
                      <div key={cat} className="mini-bar-item">
                        <div className="mini-bar-label">{cat}</div>
                        <div className="mini-bar-track">
                          <div
                            className="mini-bar-fill"
                            style={{
                              width: `${(count / maxCategoryCount) * 100}%`,
                              background: palette[idx % palette.length]
                            }}
                          ></div>
                        </div>
                        <div className="mini-bar-value">{count}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Tab 2: Reports Management Table */}
          {activeTab === 'reports' && (
            <div className="admin-section active" id="admin-reports">
              <div className="admin-header">
                <div>
                  <h1>Reports Management</h1>
                  <p>View, verify, assign and resolve citizen complaints.</p>
                </div>
                <div className="admin-table-actions">
                  <div className="admin-search">
                    <i className="fas fa-search"></i>
                    <input
                      type="text"
                      id="adminReportSearch"
                      placeholder="Search reports..."
                      value={tableSearch}
                      onChange={(e) => setTableSearch(e.target.value)}
                    />
                  </div>
                  <select
                    className="admin-filter-select"
                    id="adminStatusFilter"
                    value={tableStatusFilter}
                    onChange={(e) => setTableStatusFilter(e.target.value)}
                  >
                    <option value="all">All Status</option>
                    <option value="Reported">Reported</option>
                    <option value="Verified">Verified</option>
                    <option value="Assigned">Assigned</option>
                    <option value="In Progress">In Progress</option>
                    <option value="Resolved">Resolved</option>
                  </select>
                </div>
              </div>

              <div className="table-wrapper">
                <table className="admin-table" id="adminTable">
                  <thead>
                    <tr>
                      <th>Report ID</th>
                      <th>Issue</th>
                      <th>Category</th>
                      <th>Location</th>
                      <th>Priority</th>
                      <th>Status</th>
                      <th>Date</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody id="adminTableBody">
                    {filteredReports.length === 0 ? (
                      <tr>
                        <td
                          colSpan={8}
                          style={{ textAlign: 'center', padding: '40px', color: '#94A3B8' }}
                        >
                          No matching complaints found
                        </td>
                      </tr>
                    ) : (
                      filteredReports.map((report) => {
                        const statusClass = report.status.toLowerCase().replace(' ', '-');
                        const priorityClass = report.priority.toLowerCase();

                        return (
                          <tr key={report.id}>
                            <td>
                              <span className="table-id">{report.id}</span>
                            </td>
                            <td style={{ maxWidth: '240px', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {report.title}
                            </td>
                            <td>{report.category}</td>
                            <td>{report.area}</td>
                            <td>
                              <span className={`meta-tag priority-${priorityClass}`}>
                                {report.priority}
                              </span>
                            </td>
                            <td>
                              <span className={`status-badge status-${statusClass}`}>
                                {report.status}
                              </span>
                            </td>
                            <td>{new Date(report.date).toLocaleDateString()}</td>
                            <td>
                              <div className="table-actions">
                                <button
                                  type="button"
                                  className="action-btn"
                                  title="View Details"
                                  onClick={() => onViewDetail(report)}
                                >
                                  <i className="fas fa-eye"></i>
                                </button>
                                <button
                                  type="button"
                                  className="action-btn"
                                  title="Verify Report"
                                  onClick={() => onAdminAction(report.id, 'verify')}
                                >
                                  <i className="fas fa-check"></i>
                                </button>
                                <button
                                  type="button"
                                  className="action-btn"
                                  title="Assign to Field Team"
                                  onClick={() => onAdminAction(report.id, 'assign')}
                                >
                                  <i className="fas fa-user-plus"></i>
                                </button>
                                <button
                                  type="button"
                                  className="action-btn"
                                  title="Change Priority"
                                  onClick={() => onAdminAction(report.id, 'priority')}
                                >
                                  <i className="fas fa-flag"></i>
                                </button>
                                <button
                                  type="button"
                                  className="action-btn"
                                  title="Change Status"
                                  onClick={() => onAdminAction(report.id, 'status')}
                                >
                                  <i className="fas fa-sync"></i>
                                </button>
                                <button
                                  type="button"
                                  className="action-btn"
                                  title="Mark as Resolved"
                                  onClick={() => onAdminAction(report.id, 'resolve')}
                                >
                                  <i className="fas fa-check-double"></i>
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Tab 3: Admin Live Map */}
          {activeTab === 'map' && (
            <div className="admin-section active" id="admin-map">
              <div className="admin-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <h1>Live Map View</h1>
                  <p>Geographic cluster overview of all active tickets across Tamil Nadu.</p>
                </div>
                {googleMapsApiKey ? (
                  <div style={{ display: 'flex', gap: '4px', background: 'var(--gray-100)', padding: '3px', borderRadius: '8px' }}>
                    <button
                      type="button"
                      className={`btn btn-sm ${adminMapEngine === 'google' ? 'btn-primary' : 'btn-ghost'}`}
                      style={{ padding: '3px 8px', fontSize: '11px', borderRadius: '6px' }}
                      onClick={() => setAdminMapEngine('google')}
                    >
                      <i className="fab fa-google" style={{ marginRight: '4px' }}></i> Google Maps
                    </button>
                    <button
                      type="button"
                      className={`btn btn-sm ${adminMapEngine === 'leaflet' ? 'btn-primary' : 'btn-ghost'}`}
                      style={{ padding: '3px 8px', fontSize: '11px', borderRadius: '6px' }}
                      onClick={() => setAdminMapEngine('leaflet')}
                    >
                      <i className="fas fa-map" style={{ marginRight: '4px' }}></i> OSM
                    </button>
                  </div>
                ) : (
                  <span className="map-provider-badge osm">
                    <i className="fas fa-map"></i> OpenStreetMap
                  </span>
                )}
              </div>
              {adminMapEngine === 'google' && googleMapsApiKey ? (
                <div style={{ width: '100%', height: '520px', borderRadius: '12px', overflow: 'hidden' }}>
                  <GoogleLiveMap
                    apiKey={googleMapsApiKey}
                    reports={reports}
                    onViewDetail={onViewDetail}
                    onAuthError={() => {
                      setAdminMapEngine('leaflet');
                      showToast('Map Notice', 'Switched to OpenStreetMap due to API key restrictions.', 'info');
                    }}
                  />
                </div>
              ) : (
                <div ref={adminMapContainerRef} id="adminLiveMap" className="admin-map"></div>
              )}
            </div>
          )}

          {/* Tab 4: Analytics */}
          {activeTab === 'analytics' && (
            <div className="admin-section active" id="admin-analytics">
              <div className="admin-header">
                <div>
                  <h1>Analytics &amp; SLA Insights</h1>
                  <p>Trends, category distributions and resolution performance metrics.</p>
                </div>
              </div>

              <div className="analytics-grid">
                {/* Category bar chart */}
                <div className="analytics-card">
                  <h3>Reports by Category</h3>
                  <div className="bar-chart" id="catChart">
                    {Object.entries(categoryCounts).map(([cat, count], idx) => (
                      <div key={cat} className="bar-item">
                        <div className="bar-label">{cat}</div>
                        <div className="bar-track">
                          <div
                            className="bar-fill"
                            style={{
                              width: `${(count / maxCategoryCount) * 100}%`,
                              background: palette[idx % palette.length]
                            }}
                          >
                            {count}
                          </div>
                        </div>
                        <div className="bar-value">{count}</div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Status Donut */}
                <div className="analytics-card">
                  <h3>Reports by Status</h3>
                  <div className="donut-chart-container">
                    <div
                      className="donut-chart"
                      style={{
                        background: `conic-gradient(${donutGradientParts.join(', ')})`
                      }}
                    >
                      <div
                        style={{
                          position: 'absolute',
                          top: '20%',
                          left: '20%',
                          right: '20%',
                          bottom: '20%',
                          background: 'white',
                          borderRadius: '50%'
                        }}
                      ></div>
                      <div className="donut-center">
                        <div className="donut-center-num">{reports.length}</div>
                        <div className="donut-center-label">Total</div>
                      </div>
                    </div>
                    <div className="donut-legend" id="statusLegend">
                      {Object.entries(statusCounts).map(([status, count]) => (
                        <div key={status} className="legend-item">
                          <div
                            className="legend-color"
                            style={{ background: statusColorsMap[status] }}
                          ></div>
                          <div className="legend-label">{status}</div>
                          <div className="legend-value">{count}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Monthly Reports Trend */}
                <div className="analytics-card analytics-card-wide">
                  <h3>Monthly Reports Trend (Last 6 Months)</h3>
                  <div className="line-chart" id="monthlyChart">
                    <svg
                      className="line-chart-svg"
                      viewBox="0 0 600 200"
                      preserveAspectRatio="none"
                    >
                      <defs>
                        <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#0A6EBD" stopOpacity="0.3" />
                          <stop offset="100%" stopColor="#0A6EBD" stopOpacity="0" />
                        </linearGradient>
                      </defs>
                      <line x1="40" y1="40" x2="560" y2="40" stroke="#E2E8F0" strokeWidth="1" strokeDasharray="4 4" />
                      <line x1="40" y1="80" x2="560" y2="80" stroke="#E2E8F0" strokeWidth="1" strokeDasharray="4 4" />
                      <line x1="40" y1="120" x2="560" y2="120" stroke="#E2E8F0" strokeWidth="1" strokeDasharray="4 4" />
                      <line x1="40" y1="160" x2="560" y2="160" stroke="#E2E8F0" strokeWidth="1" strokeDasharray="4 4" />

                      <path
                        className="line-chart-area"
                        d="M 40 120 L 144 100 L 248 70 L 352 45 L 456 95 L 560 102 L 560 160 L 40 160 Z"
                      />
                      <path
                        className="line-chart-line"
                        d="M 40 120 L 144 100 L 248 70 L 352 45 L 456 95 L 560 102"
                      />

                      {[
                        { x: 40, y: 120, label: 'Aug', val: 156 },
                        { x: 144, y: 100, label: 'Sep', val: 189 },
                        { x: 248, y: 70, label: 'Oct', val: 234 },
                        { x: 352, y: 45, label: 'Nov', val: 287 },
                        { x: 456, y: 95, label: 'Dec', val: 198 },
                        { x: 560, y: 102, label: 'Jan', val: 184 }
                      ].map((p, i) => (
                        <g key={i}>
                          <circle className="line-chart-point" cx={p.x} cy={p.y} r="5" />
                          <text className="line-chart-label" x={p.x} y="185" textAnchor="middle">
                            {p.label}
                          </text>
                          <text
                            className="line-chart-label"
                            x={p.x}
                            y={p.y - 12}
                            textAnchor="middle"
                            fill="#0A1929"
                            fontWeight="700"
                          >
                            {p.val}
                          </text>
                        </g>
                      ))}
                    </svg>
                  </div>
                </div>

                {/* Area Distribution */}
                <div className="analytics-card">
                  <h3>Reports by Municipal Zone</h3>
                  <div className="bar-chart-horizontal" id="areaChart">
                    {Object.entries(areaCounts).slice(0, 6).map(([ar, count], idx) => (
                      <div key={ar} className="bar-item">
                        <div className="bar-label">{ar}</div>
                        <div className="bar-track">
                          <div
                            className="bar-fill"
                            style={{
                              width: `${(count / maxAreaCount) * 100}%`,
                              background: palette[idx % palette.length]
                            }}
                          >
                            {count}
                          </div>
                        </div>
                        <div className="bar-value">{count}</div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Resolution Performance */}
                <div className="analytics-card">
                  <h3>Resolution Statistics</h3>
                  <div className="resolution-stats" id="resolutionStats">
                    <div className="res-stat-item">
                      <div className="res-stat-num" style={{ color: 'var(--success)' }}>
                        {reports.filter((r) => r.status === 'Resolved').length}
                      </div>
                      <div className="res-stat-label">Issues Resolved</div>
                      <div className="res-stat-trend" style={{ color: 'var(--success)' }}>
                        <i className="fas fa-arrow-up"></i> 15%
                      </div>
                    </div>
                    <div className="res-stat-item">
                      <div className="res-stat-num" style={{ color: 'var(--primary)' }}>
                        5.2d
                      </div>
                      <div className="res-stat-label">Avg Resolution Time</div>
                      <div className="res-stat-trend" style={{ color: 'var(--success)' }}>
                        <i className="fas fa-arrow-down"></i> 8%
                      </div>
                    </div>
                    <div className="res-stat-item">
                      <div className="res-stat-num" style={{ color: 'var(--teal)' }}>
                        {(
                          (reports.filter((r) => r.status === 'Resolved').length /
                            (reports.length || 1)) *
                          100
                        ).toFixed(1)}
                        %
                      </div>
                      <div className="res-stat-label">Resolution Rate</div>
                      <div className="res-stat-trend" style={{ color: 'var(--success)' }}>
                        <i className="fas fa-arrow-up"></i> 12%
                      </div>
                    </div>
                    <div className="res-stat-item">
                      <div className="res-stat-num" style={{ color: 'var(--purple)' }}>
                        94%
                      </div>
                      <div className="res-stat-label">Citizen Satisfaction</div>
                      <div className="res-stat-trend" style={{ color: 'var(--success)' }}>
                        <i className="fas fa-arrow-up"></i> 6%
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Tab 5: Users */}
          {activeTab === 'users' && (
            <div className="admin-section active" id="admin-users">
              <div className="admin-header">
                <div>
                  <h1>User Accounts</h1>
                  <p>Manage registered citizens and verified authority accounts.</p>
                </div>
              </div>
              <div className="table-wrapper">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Email</th>
                      <th>Role</th>
                      <th>Reports Filed</th>
                      <th>Status</th>
                      <th>Joined</th>
                    </tr>
                  </thead>
                  <tbody id="usersTableBody">
                    {users.map((u, i) => (
                      <tr key={i}>
                        <td style={{ fontWeight: 600 }}>{u.name}</td>
                        <td>{u.email}</td>
                        <td>
                          <span
                            className={`meta-tag ${
                              u.role === 'Authority' || u.role === 'admin' ? 'cat' : ''
                            }`}
                          >
                            {u.role}
                          </span>
                        </td>
                        <td>{u.reports}</td>
                        <td>
                          <span className="status-badge status-resolved">{u.status}</span>
                        </td>
                        <td>{u.joined}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Tab 6: Settings */}
          {activeTab === 'settings' && (
            <div className="admin-section active" id="admin-settings">
              <div className="admin-header">
                <div>
                  <h1>Settings</h1>
                  <p>Configure municipal response workflows, SLAs, and notification options.</p>
                </div>
              </div>
              <div className="settings-grid">
                <div className="settings-card">
                  <h3>Notification Preferences</h3>
                  <label className="toggle-row">
                    <span>Email notifications for new complaints</span>
                    <input
                      type="checkbox"
                      defaultChecked
                      onChange={() => showToast('Settings', 'Notification settings saved', 'info')}
                    />
                  </label>
                  <label className="toggle-row">
                    <span>SMS alerts for Critical priority tickets</span>
                    <input
                      type="checkbox"
                      defaultChecked
                      onChange={() => showToast('Settings', 'SMS alerts updated', 'info')}
                    />
                  </label>
                  <label className="toggle-row">
                    <span>Daily executive summary digest</span>
                    <input
                      type="checkbox"
                      onChange={() => showToast('Settings', 'Digest updated', 'info')}
                    />
                  </label>
                </div>

                <div className="settings-card">
                  <h3>Workflow Automation</h3>
                  <label className="toggle-row">
                    <span>Auto-assign reports by geographic zone</span>
                    <input
                      type="checkbox"
                      defaultChecked
                      onChange={() => showToast('Settings', 'Auto-assignment updated', 'info')}
                    />
                  </label>
                  <label className="toggle-row">
                    <span>Require photo evidence for submission</span>
                    <input
                      type="checkbox"
                      onChange={() => showToast('Settings', 'Photo requirements updated', 'info')}
                    />
                  </label>
                  <label className="toggle-row">
                    <span>Enable AI auto-classification engine</span>
                    <input
                      type="checkbox"
                      defaultChecked
                      onChange={() => showToast('Settings', 'AI engine updated', 'info')}
                    />
                  </label>
                </div>

                <div className="settings-card">
                  <h3>Service Level Agreement (SLA) Targets</h3>
                  <div className="settings-input">
                    <label>Initial Response Target (Hours)</label>
                    <input type="number" defaultValue={24} />
                  </div>
                  <div className="settings-input">
                    <label>Standard Resolution Target (Days)</label>
                    <input type="number" defaultValue={7} />
                  </div>
                  <div className="settings-input">
                    <label>Critical Hazard Resolution Target (Hours)</label>
                    <input type="number" defaultValue={4} />
                  </div>
                  <button
                    type="button"
                    className="btn btn-primary btn-sm btn-block"
                    onClick={() => showToast('Success', 'SLA Targets successfully updated', 'success')}
                  >
                    Save Targets
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
};
