import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import ApexChart from '../components/ApexChart';
import { fetchMyDashboard } from '../utils/dashboardApi';
import { useLanguage } from '../context/LanguageContext';
import '../dashboard.scss';

const AcademicDashboard = () => {
  const navigate = useNavigate();
  const { tr } = useLanguage();
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        setDashboard(await fetchMyDashboard());
      } catch (err) {
        console.error('Error loading Academic Dashboard:', err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const o = dashboard?.overview ?? null;
  const f = dashboard?.funnel ?? null;
  const ai = dashboard?.actionItems ?? null;
  const totalEtrs = o?.totalEtrs || 0;
  // Backend tính sẵn cho Academic: danh sách điểm danh thấp toàn hệ thống + số hồ sơ sắp hết hạn
  const lowAttendance = dashboard?.lowAttendanceStudents ?? [];
  const expiringStudentsCount = dashboard?.expiringStudentsCount ?? 0;

  const kpis = [
    {
      label: tr('Tổng hồ sơ ETR'),
      value: o?.totalEtrs,
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
      label: tr('Đã hoàn thành'),
      value: o?.completedCount,
      badge: o?.completionRatePercent != null ? `${o.completionRatePercent}%` : null,
      icon: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
          <polyline points="22 4 12 14.01 9 11.01" />
        </svg>
      ),
      iconBg: 'rgba(34,197,94,0.12)',
      iconColor: '#16a34a',
    },
    {
      label: tr('Chờ phê duyệt'),
      value: o?.pendingApprovalCount,
      icon: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" />
          <polyline points="12 6 12 12 16 14" />
        </svg>
      ),
      iconBg: 'rgba(245,158,11,0.14)',
      iconColor: '#d97706',
    },
    {
      label: tr('Bị từ chối'),
      value: o?.rejectedCount,
      icon: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" />
          <line x1="15" y1="9" x2="9" y2="15" />
          <line x1="9" y1="9" x2="15" y2="15" />
        </svg>
      ),
      iconBg: 'rgba(239,68,68,0.1)',
      iconColor: '#dc2626',
    },
    {
      label: tr('Trả lại'),
      value: o?.returnedForCorrectionCount,
      icon: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="1 4 1 10 7 10" />
          <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
        </svg>
      ),
      iconBg: 'rgba(245,158,11,0.14)',
      iconColor: '#d97706',
    },
    {
      label: tr('Thiếu minh chứng'),
      value: o?.missingEvidenceCount,
      icon: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <polyline points="14 2 14 8 20 8" />
        </svg>
      ),
      iconBg: 'rgba(239,68,68,0.1)',
      iconColor: '#dc2626',
    },
    {
      label: tr('Sắp hết hạn (30 ngày)'),
      value: expiringStudentsCount,
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

  const actionChase = ai
    ? [
        { label: tr('Chờ phê duyệt'), ids: ai.pendingApprovalEtrIds, cls: 'dash-badge-warn' },
        { label: tr('Bị từ chối'), ids: ai.rejectedEtrIds, cls: 'dash-badge-danger' },
        { label: tr('Trả lại'), ids: ai.returnedForCorrectionEtrIds, cls: 'dash-badge-warn' },
        { label: tr('Thiếu minh chứng'), ids: ai.missingEvidenceEtrIds, cls: 'dash-badge-danger' },
      ]
    : [];

  return (
    <div className="page-shell">
      <section className="page-header-card">
        <div>
          <p className="eyebrow">{tr('Academic Portal')}</p>
          <h1>{tr('Academic Dashboard')}</h1>
          <p className="page-description">
            {tr('Tổng quan đào tạo: tiến độ ETR, kênh trạng thái và danh sách hồ sơ cần đôn đốc.')}
          </p>
        </div>
        <div className="page-status-box">
          <strong>{tr('Data source')}</strong>
          <p>GET /api/Dashboard/my-dashboard</p>
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
                {!loading && kpi.badge != null && (
                  <span className="freedash-kpi-badge" style={{ background: 'rgba(34,197,94,0.12)', color: '#16a34a' }}>
                    {kpi.badge}
                  </span>
                )}
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
            <h3 className="freedash-dist-title">{tr('Kênh trạng thái ETR')}</h3>
            <p className="freedash-dist-sub">{tr('Phân bố hồ sơ ETR theo trạng thái.')}</p>
            <ApexChart options={donutOptions} height={300} />
          </div>
          <div className="freedash-dist-card">
            <h3 className="freedash-dist-title">{tr('Tỷ lệ hoàn thành')}</h3>
            <p className="freedash-dist-sub">{tr('Phần trăm hồ sơ ETR đã hoàn thành.')}</p>
            <ApexChart options={radialOptions} height={300} />
          </div>
          <div className="freedash-dist-card">
            <h3 className="freedash-dist-title">{tr('Tổng quan tuân thủ')}</h3>
            <p className="freedash-dist-sub">{tr('Hồ sơ theo nhóm tuân thủ.')}</p>
            <ApexChart options={columnOptions} height={300} />
          </div>
        </section>
      )}

      {/* Action items + low attendance */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>
        <section className="table-card" style={{ padding: '20px 24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <div>
              <h2 style={{ fontSize: '16px', fontWeight: '700', color: '#002147', margin: 0 }}>{tr('Đôn đốc xử lý')}</h2>
              <p style={{ fontSize: '12px', color: 'rgba(0,33,71,0.5)', margin: '4px 0 0' }}>{tr('ETR action items')}</p>
            </div>
            <button className="dash-btn-sm" type="button" onClick={() => navigate('/academic/etr')}>
              {tr('Danh sách ETR')} →
            </button>
          </div>
          {loading ? (
            <div className="dash-empty">{tr('Đang tải...')}</div>
          ) : actionChase.length === 0 ? (
            <div className="dash-empty">{tr('Không có mục cần đôn đốc.')}</div>
          ) : (
            <div className="pill-row">
              {actionChase.map((row) => (
                <button
                  key={row.label}
                  type="button"
                  className={`dash-badge ${row.cls}`}
                  style={{ cursor: 'pointer', border: 'none', background: 'transparent' }}
                  onClick={() => navigate('/academic/etr')}
                  title={tr('Xem danh sách ETR')}
                >
                  {row.label} · {row.ids.length}
                </button>
              ))}
            </div>
          )}
        </section>

        <section className="table-card" style={{ padding: '20px 24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <div>
              <h2 style={{ fontSize: '16px', fontWeight: '700', color: '#002147', margin: 0 }}>{tr('Học viên dưới ngưỡng điểm danh')}</h2>
              <p style={{ fontSize: '12px', color: 'rgba(0,33,71,0.5)', margin: '4px 0 0' }}>
                {tr('Học viên có tỉ lệ điểm danh dưới ngưỡng tối thiểu (toàn hệ thống).')}
              </p>
            </div>
            <span className="dash-badge dash-badge-danger">{lowAttendance.length}</span>
          </div>
          {loading ? (
            <div className="dash-empty">{tr('Đang tải...')}</div>
          ) : lowAttendance.length === 0 ? (
            <div className="dash-empty">{tr('Không có học viên nào dưới ngưỡng.')}</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {lowAttendance.slice(0, 8).map((s, idx) => (
                <div
                  key={`${s.accountId}-${s.subjectId}-${idx}`}
                  style={{ padding: '10px 12px', borderRadius: '10px', background: '#f8fafc', border: '1px solid #dfe6f1', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px' }}
                >
                  <div style={{ fontSize: '13px', fontWeight: '600', color: '#002147' }}>
                    {s.userCode || `#${s.accountId}`} · {s.fullName}
                    <div style={{ fontSize: '11px', color: 'rgba(0,33,71,0.55)', fontWeight: '500' }}>
                      {s.subjectCode} · {tr('ngưỡng')} {s.thresholdPercent}%
                    </div>
                  </div>
                  <span className="dash-badge dash-badge-danger">{s.attendanceRate}%</span>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
};

export default AcademicDashboard;
