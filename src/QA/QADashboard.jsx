const dashboardMetrics = [
  { label: 'Pending Evidence', value: '18' },
  { label: 'Pending ETR Reviews', value: '12' },
  { label: 'Rejected Records', value: '4' },
  { label: 'Reviewed Today', value: '9' },
];

const dashboardItems = [
  {
    title: 'Evidence Verification',
    description: 'Verify uploaded training evidence before it enters the review queue.',
    status: 'Pending',
  },
  {
    title: 'ETR Review Queue',
    description: 'Review submitted ETRs, inspect completeness, and return items when needed.',
    status: 'In Review',
  },
  {
    title: 'Compliance Actions',
    description: 'Search historical records, export training packages, and inspect the audit trail.',
    status: 'Ready',
  },
];

const QADashboard = () => (
  <div className="qa-shell">
    <section className="qa-page-card">
      <div className="qa-header">
        <div>
          <p className="qa-eyebrow">Quality assurance operations</p>
          <h1>QA Staff Dashboard</h1>
          <p className="qa-page-description">
            Central view for pending evidence, ETR review work, rejected records, and compliance actions.
          </p>
        </div>
        <div className="qa-status-box">
          <strong>Today&apos;s focus</strong>
          <p>Review evidence first, then clear the ETR queue and capture exceptions in the audit trail.</p>
        </div>
      </div>
    </section>

    <section className="qa-metrics">
      {dashboardMetrics.map((metric) => (
        <div key={metric.label} className="qa-metric-card">
          <span className="qa-metric-label">{metric.label}</span>
          <div className="qa-metric-value">{metric.value}</div>
        </div>
      ))}
    </section>

    <section className="qa-grid-2">
      <div className="qa-panel">
        <h2>Recommended QA Navigation</h2>
        <div className="qa-badge-row">
          <span className="qa-chip primary">Dashboard</span>
          <span className="qa-chip primary">Evidence Verification</span>
          <span className="qa-chip primary">ETR Review Queue</span>
          <span className="qa-chip primary">Search / Export</span>
          <span className="qa-chip primary">Audit Trail</span>
        </div>
        <div className="qa-divider" />
        <p className="qa-page-description">
          This structure keeps QA Staff focused on review work only. Create, manage, and final approval functions stay outside this role.
        </p>
      </div>

      <div className="qa-panel">
        <h2>Access Scope</h2>
        <ul>
          <li>View learner, course, class, attendance, and assessment data.</li>
          <li>Verify or reject uploaded evidence.</li>
          <li>Review ETRs and return them for correction.</li>
          <li>Search records, export packages, and view audit logs.</li>
        </ul>
      </div>
    </section>

    <section className="qa-table-card">
      <div className="qa-table-header">
        <div>
          <h2>Core Work Queue</h2>
          <p className="qa-page-description">The 5-page QA workflow is enough for capstone demonstration and user acceptance.</p>
        </div>
        <div className="qa-actions">
          <span className="qa-chip warn">Pending QA</span>
          <span className="qa-chip gold">Audit Ready</span>
        </div>
      </div>

      <div className="qa-list">
        {dashboardItems.map((item) => (
          <div key={item.title} className="qa-list-item">
            <div>
              <p className="qa-list-title">{item.title}</p>
              <p className="qa-list-desc">{item.description}</p>
            </div>
            <span className="qa-status pending">{item.status}</span>
          </div>
        ))}
      </div>
    </section>
  </div>
);

export default QADashboard;
