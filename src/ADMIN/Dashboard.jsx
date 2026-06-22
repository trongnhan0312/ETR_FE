import React from 'react';

const dashboardMetrics = [
  { label: 'Total Users', value: '48' },
  { label: 'Total Learners', value: '126' },
  { label: 'Total Courses', value: '12' },
  { label: 'Total Classes', value: '21' },
  { label: 'Total ETRs', value: '94' },
  { label: 'Pending Reviews', value: '16' },
];

const readOnlyItems = ['Learners', 'Courses', 'Classes', 'ETRs'];

const blockedActions = [
  'Approve ETR',
  'Verify evidence',
  'Review ETR',
  'Submit ETR',
  'Record attendance',
  'Record assessment',
  'Upload evidence',
  'Reject ETR',
];

const Dashboard = () => {
  return (
    <div className="page-shell">
      <section className="page-header-card">
        <div>
          <p className="eyebrow">Administrator page 1 of 5</p>
          <h1>Dashboard</h1>
          <p className="page-description">
            Monitor overall platform activity, user counts, and review queues. Administrator can view core data,
            but workflow actions stay with the business roles.
          </p>
        </div>

        <div className="page-status-box">
          <strong>Read-only scope</strong>
          <p>View access only for training records and operational summaries.</p>
        </div>
      </section>

      <section className="metrics-grid admin-grid-6">
        {dashboardMetrics.map((metric) => (
          <article key={metric.label} className="metric-card">
            <span className="metric-label">{metric.label}</span>
            <strong className="metric-value">{metric.value}</strong>
          </article>
        ))}
      </section>

      <section className="split-panel">
        <div className="info-card">
          <p className="section-label">Administrator should view</p>
          <h2>Read-only access</h2>
          <div className="pill-row">
            {readOnlyItems.map((item) => (
              <span key={item} className="tag-chip">
                {item}
              </span>
            ))}
          </div>
        </div>

        <div className="info-card warning-card">
          <p className="section-label">Restricted actions</p>
          <h2>Must stay with business roles</h2>
          <div className="pill-row">
            {blockedActions.map((item) => (
              <span key={item} className="restricted-chip">
                {item}
              </span>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
};

export default Dashboard;