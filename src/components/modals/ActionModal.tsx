import React from 'react';
import { Report, PriorityType, StatusType } from '../../types';

interface ActionModalProps {
  report: Report | null;
  mode: 'priority' | 'status' | null;
  onClose: () => void;
  onChangePriority: (reportId: string, priority: PriorityType) => void;
  onChangeStatus: (reportId: string, status: StatusType) => void;
}

export const ActionModal: React.FC<ActionModalProps> = ({
  report,
  mode,
  onClose,
  onChangePriority,
  onChangeStatus
}) => {
  if (!report || !mode) return null;

  const priorities: PriorityType[] = ['Low', 'Medium', 'High', 'Critical'];
  const statuses: StatusType[] = ['Reported', 'Verified', 'Assigned', 'In Progress', 'Resolved'];

  return (
    <div className="modal-overlay active" id="actionModal" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <button
          type="button"
          className="modal-close"
          id="btn-close-action"
          onClick={onClose}
        >
          <i className="fas fa-times"></i>
        </button>

        {mode === 'priority' && (
          <div style={{ padding: '8px' }}>
            <h2
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: '22px',
                fontWeight: 800,
                marginBottom: '8px'
              }}
            >
              Change Priority
            </h2>
            <p style={{ color: 'var(--gray-500)', marginBottom: '24px' }}>
              Update priority for ticket <strong>{report.id}</strong>
            </p>
            <div style={{ display: 'grid', gap: '12px' }}>
              {priorities.map((p) => (
                <button
                  key={p}
                  type="button"
                  className={`btn ${report.priority === p ? 'btn-primary' : 'btn-outline'}`}
                  onClick={() => {
                    onChangePriority(report.id, p);
                    onClose();
                  }}
                >
                  {p} Priority {report.priority === p ? '(Current)' : ''}
                </button>
              ))}
            </div>
          </div>
        )}

        {mode === 'status' && (
          <div style={{ padding: '8px' }}>
            <h2
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: '22px',
                fontWeight: 800,
                marginBottom: '8px'
              }}
            >
              Change Status
            </h2>
            <p style={{ color: 'var(--gray-500)', marginBottom: '24px' }}>
              Update workflow stage for <strong>{report.id}</strong>
            </p>
            <div style={{ display: 'grid', gap: '12px' }}>
              {statuses.map((s) => (
                <button
                  key={s}
                  type="button"
                  className={`btn ${report.status === s ? 'btn-primary' : 'btn-outline'}`}
                  onClick={() => {
                    onChangeStatus(report.id, s);
                    onClose();
                  }}
                >
                  {s} {report.status === s ? '(Current)' : ''}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
