import React from 'react';
import { Report } from '../../types';
import { categoryConfig } from '../../data/demoData';

interface ReportDetailModalProps {
  report: Report | null;
  onClose: () => void;
}

export const ReportDetailModal: React.FC<ReportDetailModalProps> = ({ report, onClose }) => {
  if (!report) return null;

  const config = categoryConfig[report.category] || {
    color: '#0A6EBD',
    class: 'marker-other',
    icon: 'fa-exclamation-circle'
  };
  const statusClass = report.status.toLowerCase().replace(' ', '-');

  return (
    <div className="modal-overlay active" id="reportDetailModal" onClick={onClose}>
      <div
        className="modal modal-lg"
        style={{
          maxHeight: '90vh',
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
          position: 'relative'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          className="modal-close"
          id="btn-close-detail"
          onClick={onClose}
          style={{ position: 'absolute', zIndex: 30 }}
        >
          <i className="fas fa-times"></i>
        </button>
        <div
          id="reportDetailContent"
          style={{
            maxHeight: '90vh',
            overflowY: 'auto',
            overflowX: 'hidden',
            width: '100%',
            scrollBehavior: 'smooth'
          }}
        >
          {/* Header Banner */}
          <div
            style={{
              background: `linear-gradient(135deg, ${config.color}, ${config.color}dd)`,
              padding: '32px',
              color: 'white',
              borderRadius: 'var(--radius-xl) var(--radius-xl) 0 0'
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                marginBottom: '16px'
              }}
            >
              <div>
                <div
                  style={{
                    fontFamily: 'var(--font-display)',
                    fontSize: '20px',
                    fontWeight: 800
                  }}
                >
                  {report.id}
                </div>
                <div style={{ opacity: 0.9, fontSize: '14px', marginTop: '4px' }}>
                  {new Date(report.date).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                </div>
              </div>
              <span
                className={`status-badge status-${statusClass}`}
                style={{ background: 'rgba(255,255,255,0.25)', color: 'white' }}
              >
                {report.status}
              </span>
            </div>
            <h2
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: '24px',
                fontWeight: 800,
                marginBottom: '8px'
              }}
            >
              {report.title}
            </h2>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <span
                style={{
                  padding: '4px 12px',
                  background: 'rgba(255,255,255,0.2)',
                  borderRadius: '100px',
                  fontSize: '12px',
                  fontWeight: 600
                }}
              >
                <i className={`fas ${config.icon}`}></i> {report.category}
              </span>
              <span
                style={{
                  padding: '4px 12px',
                  background: 'rgba(255,255,255,0.2)',
                  borderRadius: '100px',
                  fontSize: '12px',
                  fontWeight: 600
                }}
              >
                Priority: {report.priority}
              </span>
              <span
                style={{
                  padding: '4px 12px',
                  background: 'rgba(255,255,255,0.2)',
                  borderRadius: '100px',
                  fontSize: '12px',
                  fontWeight: 600
                }}
              >
                Severity: {report.severity}
              </span>
            </div>
          </div>

          {/* Details Body */}
          <div style={{ padding: '32px' }}>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: '16px',
                marginBottom: '24px'
              }}
            >
              <div className="track-detail-item">
                <div className="track-detail-label">Location</div>
                <div className="track-detail-value">{report.area}</div>
              </div>
              <div className="track-detail-item">
                <div className="track-detail-label">Coordinates</div>
                <div className="track-detail-value">
                  {report.lat.toFixed(4)}, {report.lng.toFixed(4)}
                </div>
              </div>
              <div className="track-detail-item">
                <div className="track-detail-label">Reporter</div>
                <div className="track-detail-value">{report.reporter}</div>
              </div>
              <div className="track-detail-item">
                <div className="track-detail-label">Last Updated</div>
                <div className="track-detail-value">
                  {new Date(report.lastUpdated).toLocaleDateString()}
                </div>
              </div>
            </div>

            <div className="track-detail-item" style={{ marginBottom: '24px' }}>
              <div className="track-detail-label">Description</div>
              <div className="track-detail-value" style={{ fontWeight: 400 }}>
                {report.description}
              </div>
            </div>

            {report.photoUrl && (
              <div style={{ marginBottom: '24px' }}>
                <div className="track-detail-label" style={{ marginBottom: '8px' }}>
                  Photo Evidence
                </div>
                <img
                  src={report.photoUrl}
                  alt="Report evidence"
                  style={{
                    maxHeight: '220px',
                    borderRadius: 'var(--radius-md)',
                    objectFit: 'cover'
                  }}
                />
              </div>
            )}

            {/* Timeline */}
            <div className="timeline-section">
              <h3 className="timeline-title">Status Timeline</h3>
              <div className="timeline">
                {report.timeline.map((item, idx) => (
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
      </div>
    </div>
  );
};
