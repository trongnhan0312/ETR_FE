import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import ApexChart from '../components/ApexChart';
import { api } from '../utils/api';
import { fetchMyDashboard } from '../utils/dashboardApi';
import { useLanguage } from '../context/LanguageContext';
import '../dashboard.scss';

const Dashboard = () => {
  const navigate = useNavigate();
  const { tr } = useLanguage();
  const [metrics, setMetrics] = useState({
    totalUsers: null,
    totalLearners: null,
    totalCourses: null,
    totalClasses: null,
    totalEtrs: null,
    pendingReviews: null,
  });
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [accounts, profiles, courses, classes, d] = await Promise.all([
          api.get('/Accounts').catch(() => []),
          api.get('/UserProfiles/learners').catch(() => []),
          api.get('/Courses').catch(() => []),
          api.get('/Classes').catch(() => []),
          fetchMyDashboard(),
        ]);
        const accs = Array.isArray(accounts) ? accounts : [];
        const profs = Array.isArray(profiles) ? profiles : [];
        const totalEtrs = d?.overview?.totalEtrs ?? 0;
        const pendingCount =
          d?.actionItems?.pendingApprovalEtrIds?.length ??
          d?.overview?.pendingApprovalCount ??
          0;

        const isLearner = (acc) => {
          const rId = Number(acc.roleId);
          const rName = String(acc.role || '').toLowerCase();
          return rId === 6 || rName === 'student' || rName === 'learner';
        };

        const learnerCount = accs.length > 0
          ? accs.filter(isLearner).length
          : profs.filter(isLearner).length;

        setMetrics({
          totalUsers: accs.length,
          totalLearners: learnerCount,
          totalCourses: Array.isArray(courses) ? courses.length : 0,
          totalClasses: Array.isArray(classes) ? classes.length : 0,
          totalEtrs,
          pendingReviews: pendingCount,
        });
        setDashboard(d);
      } catch (err) {
        console.error('Error loading admin dashboard:', err);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  const o = dashboard?.overview ?? null;
  const f = dashboard?.funnel ?? null;
  const ai = dashboard?.actionItems ?? null;
  const totalEtrs = o?.totalEtrs || 0;

  const kpis = [
    {
      label: tr('Total Users'),
      value: metrics.totalUsers,
      icon: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
          <path d="M16 3.13a4 4 0 0 1 0 7.75" />
        </svg>
      ),
      iconBg: 'rgba(10,44,85,0.08)',
      iconColor: '#0a2c55',
    },
    {
      label: tr('Total Learners'),
      value: metrics.totalLearners,
      icon: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M22 10v6M2 10l10-5 10 5-10 5z" />
          <path d="M6 12v5c3 3 9 3 12 0v-5" />
        </svg>
      ),
      iconBg: 'rgba(99,102,241,0.12)',
      iconColor: '#6366f1',
    },
    {
      label: tr('Total Courses'),
      value: metrics.totalCourses,
      icon: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
          <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
        </svg>
      ),
      iconBg: 'rgba(6,182,212,0.12)',
      iconColor: '#0891b2',
    },
    {
      label: tr('Total Classes'),
      value: metrics.totalClasses,
      icon: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
          <line x1="8" y1="21" x2="16" y2="21" />
          <line x1="12" y1="17" x2="12" y2="21" />
        </svg>
      ),
      iconBg: 'rgba(197,160,89,0.16)',
      iconColor: '#c5a059',
    },
    {
      label: tr('Total ETRs'),
      value: metrics.totalEtrs,
      icon: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <polyline points="14 2 14 8 20 8" />
        </svg>
      ),
      iconBg: 'rgba(34,197,94,0.12)',
      iconColor: '#16a34a',
    },
    {
      label: tr('Pending Reviews'),
      value: metrics.pendingReviews,
      icon: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" />
          <polyline points="12 6 12 12 16 14" />
        </svg>
      ),
      iconBg: 'rgba(245,158,11,0.14)',
      iconColor: '#d97706',
    },
  ];

  const donutOptions = useMemo(() => {
    const labels = [
      tr('Draft'),
      tr('In Progress'),
      tr('Submitted'),
      tr('Verified'),
      tr('Completed'),
      tr('Returned For Correction'),
      tr('Cancelled'),
    ];
    return {
      chart: { type: 'donut', fontFamily: 'inherit' },
      labels,
      series: [
        f?.draft || 0,
        f?.inProgress || 0,
        f?.submitted || 0,
        f?.verified || 0,
        f?.completed || 0,
        f?.returnedForCorrection || 0,
        f?.cancelled || 0,
      ],
      colors: ['#94a3b8', '#0a2c55', '#6366f1', '#06b6d4', '#22c55e', '#f59e0b', '#ef4444'],
      legend: { position: 'bottom', fontSize: '12px', fontFamily: 'inherit', labels: { colors: 'rgba(0,33,71,0.75)' } },
      dataLabels: { enabled: false },
      plotOptions: {
        pie: {
          donut: {
            size: '68%',
            labels: {
              show: true,
              total: { show: true, label: tr('Total ETRs'), fontSize: '12px', color: 'rgba(0,33,71,0.5)', formatter: () => String(totalEtrs) },
            },
          },
        },
      },
      tooltip: { y: { formatter: (v) => `${v} ${tr('records')}` } },
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dashboard, totalEtrs]);

  const radialOptions = useMemo(() => {
    const rate = o?.completionRatePercent || 0;
    return {
      chart: { type: 'radialBar', fontFamily: 'inherit' },
      series: [Math.min(100, rate)],
      labels: [tr('Completion Rate')],
      colors: ['#22c55e'],
      plotOptions: {
        radialBar: {
          hollow: { size: '62%' },
          dataLabels: {
            name: { fontSize: '13px', color: 'rgba(0,33,71,0.55)', offsetY: 18 },
            value: { fontSize: '24px', fontWeight: 700, color: '#002147', offsetY: -12, formatter: (v) => `${Math.round(v)}%` },
          },
        },
      },
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [o]);

  const columnOptions = useMemo(() => {
    return {
      chart: { type: 'bar', fontFamily: 'inherit', toolbar: { show: false } },
      series: [
        {
          name: tr('Records'),
          data: [
            o?.completedCount || 0,
            o?.pendingApprovalCount || 0,
            o?.returnedForCorrectionCount || 0,
            o?.rejectedCount || 0,
            o?.missingEvidenceCount || 0,
          ],
        },
      ],
      xaxis: {
        categories: [tr('Completed'), tr('Pending Approval'), tr('Returned'), tr('Rejected'), tr('Missing Evidence')],
        labels: { style: { colors: 'rgba(0,33,71,0.65)', fontSize: '11px' } },
      },
      colors: ['#0a2c55'],
      plotOptions: { bar: { borderRadius: 5, columnWidth: '52%' } },
      dataLabels: { enabled: false },
      grid: { borderColor: '#eef2f7' },
      tooltip: { y: { formatter: (v) => `${v} ${tr('records')}` } },
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dashboard]);

  const actionRows = ai
    ? [
        { label: tr('Pending approval'), count: ai.pendingApprovalEtrIds.length, cls: 'dash-badge-warn' },
        { label: tr('Rejected'), count: ai.rejectedEtrIds.length, cls: 'dash-badge-danger' },
        { label: tr('Returned'), count: ai.returnedForCorrectionEtrIds.length, cls: 'dash-badge-warn' },
        { label: tr('Missing evidence'), count: ai.missingEvidenceEtrIds.length, cls: 'dash-badge-danger' },
      ]
    : [];

  return (
    <div className="page-shell">
      <section className="page-header-card">
        <div>
          <p className="eyebrow">{tr('Administrator')}</p>
          <h1>{tr('Dashboard')}</h1>
          <p className="page-description">
            {tr('Monitor overall platform activity, user counts, and review queues. Administrator can view core data, but workflow actions stay with the business roles.')}
          </p>
        </div>
        <div className="page-status-box">
          <strong>{tr('Data source')}</strong>
          <p>GET /api/Accounts · /api/Courses · /api/Classes · /api/Dashboard/my-dashboard</p>
        </div>
      </section>

      {/* KPI Cards */}
      <section className="freedash-kpi-grid">
        {kpis.map((kpi) => (
          <div key={kpi.label} className="freedash-kpi">
            <div className="freedash-kpi-icon" style={{ background: kpi.iconBg, color: kpi.iconColor }}>
              {kpi.icon}
            </div>
            <div className="freedash-kpi-body">
              <div className="freedash-kpi-value" style={{ color: kpi.iconColor }}>
                {loading ? '...' : kpi.value == null ? 0 : kpi.value}
              </div>
              <div className="freedash-kpi-label">{kpi.label}</div>
              <div className="freedash-kpi-sub">{tr('Live from API')}</div>
            </div>
          </div>
        ))}
      </section>

      {/* Charts Row */}
      {dashboard && (
        <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px' }}>
          <div className="freedash-dist-card">
            <h3 className="freedash-dist-title">{tr('ETR Status Funnel')}</h3>
            <p className="freedash-dist-sub">{tr('ETR pipeline by status.')}</p>
            <ApexChart options={donutOptions} height={300} />
          </div>
          <div className="freedash-dist-card">
            <h3 className="freedash-dist-title">{tr('Completion Rate')}</h3>
            <p className="freedash-dist-sub">{tr('Percentage of ETR records completed.')}</p>
            <ApexChart options={radialOptions} height={300} />
          </div>
          <div className="freedash-dist-card">
            <h3 className="freedash-dist-title">{tr('Compliance Overview')}</h3>
            <p className="freedash-dist-sub">{tr('Records by compliance group.')}</p>
            <ApexChart options={columnOptions} height={300} />
          </div>
        </section>
      )}

      {/* Action items */}
      <section className="table-card" style={{ padding: '20px 24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div>
            <h2 style={{ fontSize: '16px', fontWeight: '700', color: '#002147', margin: 0 }}>{tr('ETR action items')}</h2>
            <p style={{ fontSize: '12px', color: 'rgba(0,33,71,0.5)', margin: '4px 0 0' }}>{tr('Chase up queues across the platform.')}</p>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button className="dash-btn-sm" type="button" onClick={() => navigate('/admin/users')}>
              {tr('User Management')} →
            </button>
            <button className="dash-btn-sm" type="button" onClick={() => navigate('/admin/audit')}>
              {tr('Audit Log')} →
            </button>
          </div>
        </div>
        {loading ? (
          <div className="dash-empty">{tr('Loading...')}</div>
        ) : actionRows.length === 0 ? (
          <div className="dash-empty">{tr('No action items.')}</div>
        ) : (
          <div className="pill-row">
            {actionRows.map((row) => (
              <span key={row.label} className={`dash-badge ${row.cls}`}>
                {row.label} · {row.count}
              </span>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};

export default Dashboard;
