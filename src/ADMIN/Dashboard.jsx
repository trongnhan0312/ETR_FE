import { useState, useEffect } from 'react';
import { api } from '../utils/api';
import { fetchMyDashboard } from '../utils/dashboardApi';
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
  const [funnel, setFunnel] = useState(null);
  const [actionItems, setActionItems] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [accounts, profiles, courses, classes, dashboard] = await Promise.all([
          api.get("/Accounts").catch(() => []),
          api.get("/UserProfiles/learners").catch(() => []),
          api.get("/Courses").catch(() => []),
          api.get("/Classes").catch(() => []),
          fetchMyDashboard(),
        ]);
        const accs = Array.isArray(accounts) ? accounts : [];
        const profs = Array.isArray(profiles) ? profiles : [];
        const totalEtrs = dashboard?.overview?.totalEtrs ?? 0;
        const pendingCount =
          dashboard?.actionItems?.pendingApprovalEtrIds?.length ??
          dashboard?.overview?.pendingApprovalCount ??
          0;

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
          { label: 'Total ETRs', value: String(totalEtrs) },
          { label: 'Pending Reviews', value: String(pendingCount) },
        ]);
        setFunnel(dashboard?.funnel ?? null);
        setActionItems(dashboard?.actionItems ?? null);
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

      {funnel && (
        <section className="info-card" style={{ marginTop: 24 }}>
          <p className="section-label">{tr('ETR pipeline')}</p>
          <h2>{tr('Status funnel')}</h2>
          <div className="pill-row">
            {[
              ['Draft', funnel.draft, 'tag-chip'],
              ['In Progress', funnel.inProgress, 'tag-chip'],
              ['Submitted', funnel.submitted, 'restricted-chip'],
              ['Verified', funnel.verified, 'restricted-chip'],
              ['Completed', funnel.completed, 'tag-chip'],
              ['Returned', funnel.returnedForCorrection, 'restricted-chip'],
              ['Cancelled', funnel.cancelled, 'tag-chip'],
            ].map(([label, value, cls]) => (
              <span key={label} className={cls}>
                {tr(label)} · {value}
              </span>
            ))}
          </div>
        </section>
      )}

      {actionItems && (
        <section className="info-card" style={{ marginTop: 24 }}>
          <p className="section-label">{tr('Chase up')}</p>
          <h2>{tr('ETR action items')}</h2>
          <div className="pill-row">
            <span className="restricted-chip">
              {tr('Pending approval')} · {actionItems.pendingApprovalEtrIds.length}
            </span>
            <span className="restricted-chip">
              {tr('Rejected')} · {actionItems.rejectedEtrIds.length}
            </span>
            <span className="restricted-chip">
              {tr('Returned')} · {actionItems.returnedForCorrectionEtrIds.length}
            </span>
            <span className="restricted-chip">
              {tr('Missing evidence')} · {actionItems.missingEvidenceEtrIds.length}
            </span>
          </div>
        </section>
      )}
    </div>
  );
};

export default Dashboard;