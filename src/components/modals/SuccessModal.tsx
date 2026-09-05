import React, { useEffect } from 'react';
import confetti from 'canvas-confetti';
import { Report } from '../../types';

interface SuccessModalProps {
  report: Report | null;
  onClose: () => void;
  onTrack: (reportId: string) => void;
}

export const SuccessModal: React.FC<SuccessModalProps> = ({ report, onClose, onTrack }) => {
  useEffect(() => {
    if (report) {
      try {
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 }
        });
      } catch (err) {
        // ignore
      }
    }
  }, [report]);

  if (!report) return null;

  return (
    <div className="modal-overlay active" id="successModal" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <button
          type="button"
          className="modal-close"
          id="btn-close-success"
          onClick={onClose}
        >
          <i className="fas fa-times"></i>
        </button>
        <div className="success-modal">
          <div className="success-icon">
            <i className="fas fa-check"></i>
          </div>
          <h2>Report Submitted Successfully</h2>
          <p>Your report has been received and is now being actively tracked.</p>
          <div className="success-id" id="successReportId">
            {report.id}
          </div>
          <div className="success-details" id="successDetails">
            <div className="success-detail-row">
              <span className="success-detail-label">Issue</span>
              <span className="success-detail-value">{report.title}</span>
            </div>
            <div className="success-detail-row">
              <span className="success-detail-label">Category</span>
              <span className="success-detail-value">{report.category}</span>
            </div>
            <div className="success-detail-row">
              <span className="success-detail-label">Location</span>
              <span className="success-detail-value">{report.area}</span>
            </div>
            <div className="success-detail-row">
              <span className="success-detail-label">Severity</span>
              <span className="success-detail-value">{report.severity}</span>
            </div>
            <div className="success-detail-row">
              <span className="success-detail-label">Smart Priority</span>
              <span className="success-detail-value">{report.priority}</span>
            </div>
            <div className="success-detail-row">
              <span className="success-detail-label">Date</span>
              <span className="success-detail-value">
                {new Date(report.date).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}
              </span>
            </div>
            <div className="success-detail-row">
              <span className="success-detail-label">Status</span>
              <span className="success-detail-value">
                <span className="status-badge status-reported">Reported</span>
              </span>
            </div>
          </div>
          <div className="success-actions">
            <button
              type="button"
              id="btn-close-success-action"
              className="btn btn-ghost"
              onClick={onClose}
            >
              Close
            </button>
            <button
              type="button"
              id="trackNewReport"
              className="btn btn-primary"
              onClick={() => {
                onClose();
                onTrack(report.id);
              }}
            >
              Track Report
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
