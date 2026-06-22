import React from 'react';

const auditLogs = [
  { user: 'Administrator', action: 'Created user account', date: '2026-06-22', status: 'Success' },
  { user: 'QA Staff', action: 'Viewed pending ETRs', date: '2026-06-22', status: 'Success' },
  { user: 'Training Manager', action: 'Exported report', date: '2026-06-21', status: 'Success' },
];

const AuditLog = () => {
  return (
    <div className="page-shell">
      <section className="page-header-card">
        <div>
          <p className="eyebrow">Administrator page 4 of 5</p>
          <h1>Audit Log</h1>
          <p className="page-description">
            View audit entries, search by activity, and filter by user or date. Logs are read-only and cannot be edited or deleted.
          </p>
        </div>

        <button className="ghost-btn" type="button">
          Search Audit Logs
        </button>
      </section>

      <section className="split-panel">
        <div className="info-card">
          <p className="section-label">Functions</p>
          <div className="pill-row">
            <span className="tag-chip">View audit logs</span>
            <span className="tag-chip">Search audit logs</span>
            <span className="tag-chip">Filter by user</span>
            <span className="tag-chip">Filter by date</span>
          </div>
        </div>

        <div className="info-card warning-card">
          <p className="section-label">Not allowed</p>
          <div className="pill-row">
            <span className="restricted-chip">Edit logs</span>
            <span className="restricted-chip">Delete logs</span>
          </div>
        </div>
      </section>

      <section className="table-section">
        <div className="section-header">
          <div>
            <p className="section-label">Recent activity</p>
            <h2>Immutable log trail</h2>
          </div>
        </div>

        <div className="data-table user-table">
          <div className="table-header table-layout audit-layout">
            <div>User</div>
            <div>Action</div>
            <div>Date</div>
            <div>Status</div>
          </div>

          {auditLogs.map((entry) => (
            <div key={`${entry.user}-${entry.action}`} className="table-row table-layout audit-layout">
              <div className="font-medium">{entry.user}</div>
              <div className="text-gray">{entry.action}</div>
              <div className="text-gray">{entry.date}</div>
              <div>
                <span className="status status-active">{entry.status}</span>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};

export default AuditLog;