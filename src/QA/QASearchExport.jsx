const searchItems = [
  { label: 'Search ETR Records', value: 'Use learner name, course code, date, or status.' },
  { label: 'Export Training Package', value: 'Generate audit-ready PDF or archive outputs.' },
  { label: 'Filter scope', value: 'Active records, historical records, and reviewed queues.' },
];

const QASearchExport = () => (
  <div className="qa-shell">
    <section className="qa-page-card">
      <p className="qa-eyebrow">Compliance</p>
      <h1>Search and Export</h1>
      <p className="qa-page-description">
        Search historical and active ETRs, then export training packages for audit or management review.
      </p>
    </section>

    <section className="qa-table-card">
      <div className="qa-input-row">
        <input className="qa-input" placeholder="Search by learner, course, class, or ETR ID" />
        <select className="qa-select" defaultValue="all">
          <option value="all">All Statuses</option>
          <option value="pending">Pending</option>
          <option value="reviewed">Reviewed</option>
          <option value="rejected">Rejected</option>
        </select>
        <button className="qa-btn" type="button">Search ETR Records</button>
      </div>

      <div className="qa-divider" />

      <div className="qa-list">
        {searchItems.map((item) => (
          <div key={item.label} className="qa-list-item">
            <div>
              <p className="qa-list-title">{item.label}</p>
              <p className="qa-list-desc">{item.value}</p>
            </div>
            <span className="qa-status neutral">Ready</span>
          </div>
        ))}
      </div>

      <div className="qa-actions" style={{ marginTop: '18px' }}>
        <button className="qa-btn-secondary" type="button">Export Training Package</button>
        <button className="qa-btn-ghost" type="button">Export Audit Trail</button>
      </div>
    </section>
  </div>
);

export default QASearchExport;
