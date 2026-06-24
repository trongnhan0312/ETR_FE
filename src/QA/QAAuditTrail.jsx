const auditEntries = [
  { time: '2026-06-23 09:14', actor: 'QA Staff', action: 'Verified evidence', detail: 'Nguyen Van A - ETR-2026-041' },
  { time: '2026-06-23 11:07', actor: 'QA Staff', action: 'Returned ETR', detail: 'Tran Thi B - missing attendance attachment' },
  { time: '2026-06-23 15:22', actor: 'QA Staff', action: 'Exported package', detail: 'Monthly audit archive' },
];

const QAAuditTrail = () => (
  <div className="qa-shell">
    <section className="qa-page-card">
      <p className="qa-eyebrow">Compliance</p>
      <h1>Audit Trail</h1>
      <p className="qa-page-description">
        View activity history of ETRs and users so QA decisions can be traced during review and audit.
      </p>
    </section>

    <section className="qa-table-card">
      <div className="qa-table-header">
        <div>
          <h2>Recent Activity</h2>
          <p className="qa-page-description">Use this page to confirm who reviewed, verified, returned, or exported each record.</p>
        </div>
        <span className="qa-chip gold">Read Only</span>
      </div>

      <div className="qa-list">
        {auditEntries.map((entry) => (
          <div key={`${entry.time}-${entry.action}`} className="qa-list-item">
            <div>
              <p className="qa-list-title">{entry.action}</p>
              <p className="qa-list-desc">{entry.detail}</p>
            </div>
            <span className="qa-status neutral">{entry.time}</span>
          </div>
        ))}
      </div>
    </section>
  </div>
);

export default QAAuditTrail;
