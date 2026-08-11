import { useState, useEffect } from 'react';
import { api } from '../utils/api';
import { useLanguage } from '../context/LanguageContext';

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
  const { tr } = useLanguage();
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
        const accs = Array.isArray(accounts) ? accounts : [];
        const profs = Array.isArray(profiles) ? profiles : [];
        const etrsArr = Array.isArray(etrs) ? etrs : [];
        const pendingCount = etrsArr.filter((e) => e.status === "Submitted" || e.status === "Draft").length;

        // Only count accounts/profiles with Student role (roleId 6 or role 'Student')
        const studentAccounts = accs.filter((acc) => {
          const rId = Number(acc.roleId);
          const rName = String(acc.role || '').toLowerCase();
          return rId === 6 || rName === 'student' || rName === 'learner';
        });

        const learnerCount = accs.length > 0
          ? studentAccounts.length
          : profs.filter((p) => {
              const rId = Number(p.roleId);
              const rName = String(p.role || '').toLowerCase();
              return rId === 6 || rName === 'student' || rName === 'learner';
            }).length;

        setMetrics([
          { label: 'Total Users', value: String(accs.length) },
          { label: 'Total Learners', value: String(learnerCount) },
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
          <p className="eyebrow">{tr('Administrator page 1 of 5')}</p>
          <h1>{tr('Dashboard')}</h1>
          <p className="page-description">
            {tr('Monitor overall platform activity, user counts, and review queues. Administrator can view core data, but workflow actions stay with the business roles.')}
          </p>
        </div>

        <div className="page-status-box">
          <strong>{tr('Read-only scope')}</strong>
          <p>{tr('View access only for training records and operational summaries.')}</p>
        </div>
      </section>

      <section className="metrics-grid admin-grid-6">
        {metrics.map((metric) => (
          <article key={metric.label} className="metric-card">
            <span className="metric-label">{tr(metric.label)}</span>
            <strong className="metric-value">{loading ? "..." : metric.value}</strong>
          </article>
        ))}
      </section>

      <section className="split-panel">
        <div className="info-card">
          <p className="section-label">{tr('Administrator should view')}</p>
          <h2>{tr('Read-only access')}</h2>
          <div className="pill-row">
            {readOnlyItems.map((item) => (
              <span key={item} className="tag-chip">
                {tr(item)}
              </span>
            ))}
          </div>
        </div>

        <div className="info-card warning-card">
          <p className="section-label">{tr('Restricted actions')}</p>
          <h2>{tr('Must stay with business roles')}</h2>
          <div className="pill-row">
            {blockedActions.map((item) => (
              <span key={item} className="restricted-chip">
                {tr(item)}
              </span>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
};

export default Dashboard;