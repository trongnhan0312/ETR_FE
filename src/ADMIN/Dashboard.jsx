import { useState, useEffect } from 'react';
import { api } from '../utils/api';

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
  const [metrics, setMetrics] = useState([
    { label: 'Total Users', value: '...' },
    { label: 'Total Learners', value: '...' },
    { label: 'Total Courses', value: '...' },
    { label: 'Total Classes', value: '...' },
    { label: 'Total ETRs', value: '...' },
    { label: 'Pending Reviews', value: '...' },
  ]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [accounts, profiles, courses, classes, etrs] = await Promise.all([
          api.get("/Accounts").catch(() => []),
          api.get("/UserProfiles/learners").catch(() => []),
          api.get("/Courses").catch(() => []),
          api.get("/Classes").catch(() => []),
          api.get("/Etr").catch(() => []),
        ]);
        const etrsArr = Array.isArray(etrs) ? etrs : [];
        const pendingCount = etrsArr.filter((e) => e.status === "Submitted" || e.status === "Draft").length;
        setMetrics([
          { label: 'Total Users', value: String(Array.isArray(accounts) ? accounts.length : 0) },
          { label: 'Total Learners', value: String(Array.isArray(profiles) ? profiles.length : 0) },
          { label: 'Total Courses', value: String(Array.isArray(courses) ? courses.length : 0) },
          { label: 'Total Classes', value: String(Array.isArray(classes) ? classes.length : 0) },
          { label: 'Total ETRs', value: String(etrsArr.length) },
          { label: 'Pending Reviews', value: String(pendingCount) },
        ]);
      } catch (err) {
        console.error("Error loading admin dashboard:", err);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

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
        {metrics.map((metric) => (
          <article key={metric.label} className="metric-card">
            <span className="metric-label">{metric.label}</span>
            <strong className="metric-value">{loading ? "..." : metric.value}</strong>
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