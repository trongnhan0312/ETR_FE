import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchMyDashboard } from '../utils/dashboardApi';
import { useLanguage } from '../context/LanguageContext';

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

  const kpis = [
    { label: tr('Tổng hồ sơ ETR'), value: o?.totalEtrs, cls: '' },
    { label: tr('Đã hoàn thành'), value: o?.completedCount, cls: 'green' },
    { label: tr('Tỷ lệ hoàn thành'), value: o?.completionRatePercent != null ? `${o.completionRatePercent}%` : '...', cls: 'green' },
    { label: tr('Chờ phê duyệt'), value: o?.pendingApprovalCount, cls: 'amber' },
    { label: tr('Bị từ chối'), value: o?.rejectedCount, cls: 'red' },
    { label: tr('Trả lại'), value: o?.returnedForCorrectionCount, cls: 'amber' },
    { label: tr('Thiếu minh chứng'), value: o?.missingEvidenceCount, cls: 'red' },
  ];

  const funnelRows = f
    ? [
        ['Draft', f.draft],
        ['In Progress', f.inProgress],
        ['Submitted', f.submitted],
        ['Verified', f.verified],
        ['Completed', f.completed],
        ['Returned', f.returnedForCorrection],
        ['Cancelled', f.cancelled],
      ]
    : [];

  const actionChase = ai
    ? [
        { label: tr('Chờ phê duyệt'), ids: ai.pendingApprovalEtrIds, cls: 'restricted-chip' },
        { label: tr('Bị từ chối'), ids: ai.rejectedEtrIds, cls: 'restricted-chip' },
        { label: tr('Trả lại'), ids: ai.returnedForCorrectionEtrIds, cls: 'restricted-chip' },
        { label: tr('Thiếu minh chứng'), ids: ai.missingEvidenceEtrIds, cls: 'restricted-chip' },
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

      <section className="metrics-grid admin-grid-6">
        {kpis.map((kpi) => (
          <article key={kpi.label} className="metric-card">
            <span className="metric-label">{kpi.label}</span>
            <strong className="metric-value">
              {loading ? '...' : kpi.value == null ? '0' : kpi.value}
            </strong>
          </article>
        ))}
      </section>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 20 }}>
        {f && (
          <section className="info-card">
            <p className="section-label">{tr('Kênh trạng thái ETR')}</p>
            <h2>{tr('Status funnel')}</h2>
            <div className="pill-row">
              {funnelRows.map(([label, value]) => (
                <span key={label} className="tag-chip">
                  {tr(label)} · {value}
                </span>
              ))}
            </div>
          </section>
        )}

        {ai && (
          <section className="info-card warning-card">
            <p className="section-label">{tr('Đôn đốc xử lý')}</p>
            <h2>{tr('ETR action items')}</h2>
            <div className="pill-row">
              {actionChase.map((row) => (
                <button
                  key={row.label}
                  type="button"
                  className={row.cls}
                  style={{ cursor: 'pointer', border: 'none' }}
                  onClick={() => navigate('/academic/etr')}
                  title={tr('Xem danh sách ETR')}
                >
                  {row.label} · {row.ids.length}
                </button>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
};

export default AcademicDashboard;