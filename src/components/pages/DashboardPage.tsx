import React, { useState } from 'react';
import { Report, PageType, AuthSession } from '../../types';

interface DashboardPageProps {
  reports: Report[];
  session?: AuthSession | null;
  onNavigate: (page: PageType) => void;
  onViewDetail: (report: Report) => void;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({
  reports,
  session,
  onNavigate,
  onViewDetail
}) => {
  const [activeTab, setActiveTab] = useState<'my' | 'all'>('my');

  // Filter user reports vs all community reports
  const myReports = reports.filter((r) => {
    if (!session) return false;
    const matchesEmail = session.email && r.reporterEmail?.toLowerCase() === session.email.toLowerCase();
    const matchesId = session.id && r.reporterId === session.id;
    const matchesName = session.fullName && r.reporter.toLowerCase() === session.fullName.toLowerCase();
    return Boolean(matchesEmail || matchesId || matchesName);
  });

  // Default to 'all' if user has no filed reports yet so they see immediate community data
  const displayedReports = activeTab === 'my' ? myReports : reports;

  const total = displayedReports.length;
  const pending = displayedReports.filter((r) => r.status === 'Reported' || r.status === 'Verified').length;
  const inProgress = displayedReports.filter(
    (r) => r.status === 'Assigned' || r.status === 'In Progress'
  ).length;
  const resolved = displayedReports.filter((r) => r.status === 'Resolved').length;

  const isAdmin = session?.role === 'admin';

  return (
    <section className="page active" id="dashboard">
      <div className="container">
        {/* Admin Quick Banner */}
        {isAdmin && (
          <div
            style={{
              background: 'linear-gradient(135deg, #0F172A 0%, #1E293B 100%)',
              color: '#FFFFFF',
              padding: '16px 20px',
              borderRadius: '12px',
              marginBottom: '24px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '16px',
              boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div
                style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '10px',
                  background: 'rgba(56, 189, 248, 0.2)',
                  color: '#38BDF8',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '18px'
                }}
              >
                <i className="fas fa-shield-alt"></i>
              </div>
              <div>
                <div style={{ fontWeight: 700, fontSize: '15px' }}>
                  Municipal Authority Console Available
                </div>
                <div style={{ fontSize: '13px', color: '#94A3B8' }}>
                  You are logged in with Administrative privileges. Manage team assignments, verify tickets, and configure SLAs.
                </div>
              </div>
            </div>
            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={() => onNavigate('admin')}
              style={{ whiteSpace: 'nowrap' }}
            >
              Open Admin Console <i className="fas fa-arrow-right" style={{ marginLeft: '6px' }}></i>
            </button>
          </div>
        )}

        <div className="page-header" style={{ marginBottom: '24px' }}>
          <span className="section-tag">
            {isAdmin ? 'Authority Overview' : 'Citizen Dashboard'}
          </span>
          <h1 className="page-title">
            {session ? `Welcome, ${session.fullName}` : 'Community Dashboard'}
          </h1>
          <p className="page-subtitle">
            {activeTab === 'my'
              ? 'Track the real-time progress and verification status of your submitted infrastructure reports.'
              : 'Overview of all civic infrastructure complaints, active field repairs, and verified resolutions.'}
          </p>
        </div>

        {/* View Switcher Tabs */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '12px',
            marginBottom: '20px'
          }}
        >
          <div
            style={{
              display: 'inline-flex',
              background: 'var(--gray-100)',
              padding: '4px',
              borderRadius: '10px',
              border: '1px solid var(--gray-200)'
            }}
          >
            <button
              type="button"
              className={`btn btn-sm ${activeTab === 'my' ? 'btn-primary' : 'btn-ghost'}`}
              style={{ borderRadius: '8px', padding: '6px 14px', fontSize: '13px' }}
              onClick={() => setActiveTab('my')}
            >
              <i className="fas fa-user" style={{ marginRight: '6px' }}></i>
              My Reports ({myReports.length})
            </button>
            <button
              type="button"
              className={`btn btn-sm ${activeTab === 'all' ? 'btn-primary' : 'btn-ghost'}`}
              style={{ borderRadius: '8px', padding: '6px 14px', fontSize: '13px' }}
              onClick={() => setActiveTab('all')}
            >
              <i className="fas fa-globe" style={{ marginRight: '6px' }}></i>
              All Community Reports ({reports.length})
            </button>
          </div>

          <button
            type="button"
            className="btn btn-primary btn-sm"
            onClick={() => onNavigate('report')}
          >
            <i className="fas fa-plus"></i> Report New Issue
          </button>
        </div>

        <div className="dashboard-stats">
          <div className="dash-stat-card">
            <div className="dash-stat-icon icon-blue">
              <i className="fas fa-file-alt"></i>
            </div>
            <div className="dash-stat-info">
              <div className="dash-stat-num" id="userTotalReports">
                {total}
              </div>
              <div className="dash-stat-label">
                {activeTab === 'my' ? 'My Reports' : 'Total Reports'}
              </div>
            </div>
          </div>
          <div className="dash-stat-card">
            <div className="dash-stat-icon icon-orange">
              <i className="fas fa-clock"></i>
            </div>
            <div className="dash-stat-info">
              <div className="dash-stat-num" id="userPending">
                {pending}
              </div>
              <div className="dash-stat-label">Pending Verification</div>
            </div>
          </div>
          <div className="dash-stat-card">
            <div className="dash-stat-icon icon-teal">
              <i className="fas fa-spinner"></i>
            </div>
            <div className="dash-stat-info">
              <div className="dash-stat-num" id="userProgress">
                {inProgress}
              </div>
              <div className="dash-stat-label">In Progress</div>
            </div>
          </div>
          <div className="dash-stat-card">
            <div className="dash-stat-icon icon-green">
              <i className="fas fa-check-circle"></i>
            </div>
            <div className="dash-stat-info">
              <div className="dash-stat-num" id="userResolved">
                {resolved}
              </div>
              <div className="dash-stat-label">Resolved</div>
            </div>
          </div>
        </div>

        <div className="dashboard-section">
          <div className="section-header-flex">
            <h2>
              {activeTab === 'my' ? 'My Submitted Grievances' : 'Active Community Complaints'}
            </h2>
          </div>

          {displayedReports.length === 0 ? (
            <div
              style={{
                textAlign: 'center',
                padding: '48px 24px',
                background: '#FFFFFF',
                borderRadius: '16px',
                border: '1px solid var(--gray-200)'
              }}
            >
              <div
                style={{
                  width: '64px',
                  height: '64px',
                  borderRadius: '50%',
                  background: 'var(--gray-100)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 16px',
                  color: 'var(--gray-400)',
                  fontSize: '24px'
                }}
              >
                <i className="fas fa-clipboard-check"></i>
              </div>
              <h3 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--navy)', marginBottom: '8px' }}>
                {activeTab === 'my' ? 'No personal complaints filed yet' : 'No community complaints found'}
              </h3>
              <p style={{ fontSize: '14px', color: 'var(--gray-500)', maxWidth: '420px', margin: '0 auto 20px' }}>
                {activeTab === 'my'
                  ? 'Have you noticed broken roads, damaged streetlights, or sewage leaks in your neighborhood? Submit your first report now.'
                  : 'All reported issues have been handled.'}
              </p>
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => onNavigate('report')}
              >
                <i className="fas fa-plus"></i> Report An Issue
              </button>
            </div>
          ) : (
            <div className="reports-list" id="userReportsList">
              {displayedReports.map((report) => {
                const statusClass = report.status.toLowerCase().replace(' ', '-');
                const priorityClass = report.priority.toLowerCase();

                return (
                  <div key={report.id} className="report-card">
                    <div className="report-card-header">
                      <span className="report-card-id">{report.id}</span>
                      <span className={`status-badge status-${statusClass}`}>
                        {report.status}
                      </span>
                    </div>
                    <h3 className="report-card-title">{report.title}</h3>
                    <div className="report-card-meta">
                      <span className="meta-tag cat">{report.category}</span>
                      <span className={`meta-tag priority-${priorityClass}`}>
                        {report.priority} Priority
                      </span>
                      <span className="meta-tag">Severity: {report.severity}</span>
                    </div>
                    <div className="report-card-location">
                      <i className="fas fa-map-marker-alt"></i> {report.area}
                    </div>
                    <div className="report-card-footer">
                      <span className="report-card-date">
                        {new Date(report.date).toLocaleDateString()}
                      </span>
                      <button
                        type="button"
                        className="link-btn"
                        onClick={() => onViewDetail(report)}
                      >
                        View Details <i className="fas fa-arrow-right"></i>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </section>
  );
};
