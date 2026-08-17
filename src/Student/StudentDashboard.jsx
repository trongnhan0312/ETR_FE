import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import ApexChart from '../components/ApexChart';
import { fetchMyDashboard } from '../utils/dashboardApi';
import { useLanguage } from '../context/LanguageContext';
import '../dashboard.scss';

const VALIDITY_LABELS = {
  Valid: 'Còn hiệu lực',
  ExpiringSoon: 'Sắp hết hạn',
  Expired: 'Đã hết hạn',
};

const STATUS_MAP = {
  'In Progress': 'progress',
  'Submitted': 'submitted',
  'Verified': 'verified',
  'Completed': 'completed',
  'Draft': 'draft',
  'Returned': 'returned',
  'ReturnedForCorrection': 'returned',
};

const STATUS_LABEL = {
  'In Progress': 'Đang đào tạo',
  'Submitted': 'Đã nộp',
  'Verified': 'Đã thẩm định',
  'Completed': 'Hoàn thành',
  'Draft': 'Nháp',
  'Returned': 'Trả lại',
  'ReturnedForCorrection': 'Trả lại',
};

/** Format an ISO date string → Vietnamese locale, or '--' */
const formatDate = (d) => {
  if (!d) return '--';
  try {
    return new Date(d).toLocaleDateString('vi-VN');
  } catch {
    return '--';
  }
};

const statusBucket = (s) => {
  const st = String(s || '').toLowerCase().replace(/[\s_-]/g, '');
  if (st === 'inprogress' || st === 'draft') return 'progress';
  if (st === 'submitted' || st === 'verified' || st === 'returnedforcorrection') return 'pending';
  if (st === 'completed') return 'completed';
  return 'other';
};

// Hệ thống chưa có entity Certificate riêng — ETRCourseRecord.Status == "Completed" được coi là
// chứng chỉ, hạn dùng theo ExpiryDate (cùng ngưỡng 30 ngày với backend).
const certValidity = (expiryDate) => {
  if (!expiryDate) return 'Valid';
  const now = Date.now();
  const exp = new Date(expiryDate).getTime();
  if (Number.isNaN(exp)) return 'Valid';
  if (exp < now) return 'Expired';
  if (exp < now + 30 * 24 * 60 * 60 * 1000) return 'ExpiringSoon';
  return 'Valid';
};

const StudentDashboard = () => {
  const { tr } = useLanguage();
  const navigate = useNavigate();
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);

  // Chỉ 1 lần gọi GET /api/Dashboard/my-dashboard — backend trả sẵn myEtrs, profile
  // và certificateSummary cho role Student (gộp 4 call cũ: /Etr/my-etr, /auth/me,
  // /Etr/student/{id}/current-status thành 1).
  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        setDashboard(await fetchMyDashboard({ suppressAuthRedirect: true }));
      } catch {
        // silent
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const profile = dashboard?.profile ?? null;
  const certSummary = dashboard?.certificateSummary ?? null;
  const myEtrs = dashboard?.myEtrs ?? [];

  // User info
  let userName = tr('Học viên');
  let userLogin = 'student';
  if (profile?.fullName) userName = profile.fullName;
  if (profile?.username) userLogin = profile.username;
  else {
    try {
      const u = JSON.parse(localStorage.getItem('user') || '{}');
      if (!profile?.fullName && u.fullName) userName = u.fullName;
      if (!profile?.username && u.username) userLogin = u.username;
    } catch { /* ignore */ }
  }

  const initials = (name) => {
    if (!name) return 'HV';
    const parts = name.trim().split(' ');
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[parts.length - 2][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  const mapped = myEtrs.map((e) => ({
    id: e.etrCourseRecordId,
    status: e.status || 'Draft',
    percentComplete: e.percentComplete,
    expiryDate: e.expiryDate,
  }));

  const metricSource = mapped;
  const metrics = [
    { label: tr('Tổng số hồ sơ'), value: metricSource.length, cls: '' },
    { label: tr('Đang đào tạo'), value: metricSource.filter(e => statusBucket(e.status) === 'progress').length, cls: 'blue' },
    { label: tr('Chờ xử lý'), value: metricSource.filter(e => statusBucket(e.status) === 'pending').length, cls: 'amber' },
    { label: tr('Đã hoàn thành'), value: metricSource.filter(e => statusBucket(e.status) === 'completed').length, cls: 'green' },
  ];

  // Danh sách chứng chỉ gần nhất (tối đa 5, backend sắp theo expiryDate giảm dần)
  const certItems = (certSummary?.recent ?? []).map((c) => ({
    id: c.etrCourseRecordId,
    courseName: `ETR #${c.etrCourseRecordId}`,
    expiryDate: c.expiryDate,
    validity: certValidity(c.expiryDate),
  }));

  // Donut: phân bố trạng thái hồ sơ của chính học viên (từ myEtrs)
  const statusDonut = useMemo(() => {
    const progress = metricSource.filter(e => statusBucket(e.status) === 'progress').length;
    const pending = metricSource.filter(e => statusBucket(e.status) === 'pending').length;
    const completed = metricSource.filter(e => statusBucket(e.status) === 'completed').length;
    return {
      chart: { type: 'donut', fontFamily: 'inherit' },
      labels: [tr('Đang đào tạo'), tr('Chờ xử lý'), tr('Đã hoàn thành')],
      series: [progress, pending, completed],
      colors: ['#0a2c55', '#d97706', '#16a34a'],
      legend: { position: 'bottom', fontSize: '12px', fontFamily: 'inherit', labels: { colors: 'rgba(0,33,71,0.75)' } },
      dataLabels: { enabled: false },
      plotOptions: {
        pie: {
          donut: {
            size: '68%',
            labels: {
              show: true,
              total: { show: true, label: tr('Hồ sơ ETR'), fontSize: '12px', color: 'rgba(0,33,71,0.5)', formatter: () => String(metricSource.length) },
            },
          },
        },
      },
      tooltip: { y: { formatter: (v) => `${v} ${tr('hồ sơ')}` } },
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [myEtrs]);

  const progressTrend = useMemo(() => {
    const categories = [
      tr('1. Nhập môn & Quy chế'),
      tr('2. Lý thuyết kỹ thuật'),
      tr('3. Thực hành xưởng'),
      tr('4. An toàn & Con người'),
      tr('5. Đánh giá & Bảng kiểm'),
      tr('6. Thẩm định & Cấp bằng'),
    ];

    const currentPct = mapped.length > 0
      ? Math.max(...mapped.map(e => Number(e.percentComplete) || 0))
      : 70;

    const isDone = mapped.some(e => e.status === 'Completed') || currentPct >= 100;

    const m1 = Math.min(100, Math.max(10, Math.round(currentPct * 1.5)));
    const m2 = Math.min(100, Math.max(0, Math.round(currentPct * 1.3)));
    const m3 = Math.min(100, Math.max(0, Math.round(currentPct * 1.05)));
    const m4 = Math.min(100, Math.max(0, Math.round(currentPct * 0.85)));
    const m5 = Math.min(100, Math.max(0, Math.round(currentPct * 0.6)));
    const m6 = isDone ? 100 : (currentPct >= 90 ? 75 : 0);

    return {
      chart: { type: 'area', fontFamily: 'inherit', toolbar: { show: false } },
      series: [
        {
          name: tr('Tiến độ thực tế (%)'),
          data: [m1, m2, m3, m4, m5, m6],
        },
        {
          name: tr('Mục tiêu chuẩn (%)'),
          data: [100, 100, 100, 100, 100, 100],
        },
      ],
      xaxis: {
        categories,
        labels: { style: { colors: 'rgba(0,33,71,0.65)', fontSize: '11px' } },
      },
      yaxis: {
        min: 0,
        max: 100,
        labels: {
          style: { colors: 'rgba(0,33,71,0.65)', fontSize: '11px' },
          formatter: (v) => `${Math.round(v)}%`,
        },
      },
      colors: ['#0a2c55', '#c5a059'],
      stroke: { curve: 'smooth', width: [3, 2] },
      fill: {
        type: 'gradient',
        gradient: { shadeIntensity: 1, opacityFrom: 0.35, opacityTo: 0.05, stops: [0, 90, 100] },
      },
      markers: { size: 6, strokeWidth: 2, hover: { size: 8 } },
      dataLabels: { enabled: false },
      legend: { position: 'top', fontSize: '12px', fontFamily: 'inherit', labels: { colors: 'rgba(0,33,71,0.75)' } },
      grid: { borderColor: '#eef2f7' },
      tooltip: {
        shared: true,
        intersect: false,
        y: { formatter: (v) => `${Math.round(v)}%` },
      },
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mapped]);

  const Badge = ({ status }) => (
    <span className={`student-badge student-badge--${STATUS_MAP[status] || 'draft'}`}>
      {tr(STATUS_LABEL[status]) || status}
    </span>
  );

  return (
    <div className="page-shell">
      {/* ── Welcome Hero ── */}
      <section className="student-welcome">
        <div className="student-welcome-left">
          <p className="eyebrow">{tr('Student Portal')}</p>
          <h1>{tr('Xin chào, ')}{userName}</h1>
          <p className="welcome-sub">
            {tr('Theo dõi tiến độ đào tạo, kết quả học tập và hồ sơ ETR của bạn.')}
          </p>
        </div>
        <div className="student-welcome-right">
          <div className="student-avatar-large">{initials(userName)}</div>
          <span className="welcome-role">{userLogin}</span>
        </div>
      </section>

      {/* ── Metrics ── */}
      <section className="student-metrics">
        {metrics.map((m, i) => (
          <article key={i} className="student-metric-card">
            <span className="student-metric-label">{m.label}</span>
            <strong className={`student-metric-value ${m.cls}`}>
              {loading ? '...' : m.value}
            </strong>
          </article>
        ))}
      </section>

      {/* ── Charts Row ── */}
      {!loading && dashboard && (
        <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px', marginBottom: 24 }}>
          <div className="freedash-dist-card">
            <h3 className="freedash-dist-title">{tr('Phân bố hồ sơ theo trạng thái')}</h3>
            <p className="freedash-dist-sub">{tr('Dữ liệu từ GET /api/Dashboard/my-dashboard (myEtrs).')}</p>
            <ApexChart options={statusDonut} height={280} />
          </div>
          <div className="freedash-dist-card">
            <h3 className="freedash-dist-title">{tr('Tiến độ hoàn thành hồ sơ')}</h3>
            <p className="freedash-dist-sub">{tr('Biểu đồ đường cong tiến độ đào tạo các hồ sơ ETR.')}</p>
            <ApexChart options={progressTrend} height={280} />
          </div>
        </section>
      )}

      {/* ── Recent ETRs ── */}
      <section className="student-table-section">
        <div className="student-table-header">
          <div className="student-table-header-left">
            <p className="student-section-label">{tr('Hồ sơ đào tạo')}</p>
            <h2>{tr('Danh sách ETR gần đây')}</h2>
          </div>
          <button className="primary-btn" type="button" onClick={() => navigate('/student/etr')}>
            {tr('Xem tất cả')}
          </button>
        </div>

        {loading ? (
          <div className="student-empty">{tr('Đang tải dữ liệu...')}</div>
        ) : mapped.length === 0 ? (
          <div className="student-empty">{tr('Bạn chưa có hồ sơ ETR nào.')}</div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <div className="student-table-grid" style={{ gridTemplateColumns: '48px 1.2fr 1fr 120px 140px 100px' }}>
              {/* Header */}
              <div className="student-table-cell student-table-cell--header">{tr('STT')}</div>
              <div className="student-table-cell student-table-cell--header">{tr('Mã hồ sơ')}</div>
              <div className="student-table-cell student-table-cell--header">{tr('Tiến độ')}</div>
              <div className="student-table-cell student-table-cell--header">{tr('Ngày hết hạn')}</div>
              <div className="student-table-cell student-table-cell--header">{tr('Trạng thái')}</div>
              <div className="student-table-cell student-table-cell--header student-table-cell--end">&nbsp;</div>

              {/* Data */}
              {mapped.slice(0, 5).map((e, idx) => (
                <div className="student-table-row" key={e.id || idx}>
                  <div className="student-table-cell student-table-cell--index">{idx + 1}</div>
                  <div className="student-table-cell student-table-cell--strong">
                    {e.id ? `ETR #${e.id}` : `${tr('Hồ sơ #')}${idx + 1}`}
                  </div>
                  <div className="student-table-cell">
                    {e.percentComplete != null ? `${Math.round(e.percentComplete)}%` : '--'}
                  </div>
                  <div className="student-table-cell">{formatDate(e.expiryDate)}</div>
                  <div className="student-table-cell"><Badge status={e.status} /></div>
                  <div className="student-table-cell student-table-cell--end">
                    <button className="action-btn" type="button" onClick={() => navigate('/student/etr')}>
                      {tr('Chi tiết')}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* ── Certificate Status Summary ── */}
      {certSummary && certSummary.total > 0 && (
        <section className="student-table-section" style={{ marginBottom: 24 }}>
          <div className="student-table-header">
            <div className="student-table-header-left">
              <p className="student-section-label">{tr('Chứng chỉ đào tạo')}</p>
              <h2>{tr('Trạng thái hiệu lực')}</h2>
            </div>
            <button className="action-btn" type="button" onClick={() => navigate('/student/certificates')}>
              {tr('Xem tất cả')}
            </button>
          </div>
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '14px' }}>
            <span className="dash-badge dash-badge-compliant">{tr('Còn hiệu lực')}: {certSummary.valid}</span>
            <span className="dash-badge dash-badge-warn">{tr('Sắp hết hạn')}: {certSummary.expiringSoon}</span>
            <span className="dash-badge dash-badge-danger">{tr('Đã hết hạn')}: {certSummary.expired}</span>
            <span className="dash-badge" style={{ background: 'rgba(10,44,85,0.08)', color: '#0a2c55' }}>{tr('Tổng')}: {certSummary.total}</span>
          </div>
          <div className="student-cert-mini-list">
            {certItems.slice(0, 5).map((cert, idx) => (
              <div key={cert.id || idx} className="student-cert-mini-item">
                <div className="student-cert-mini-info">
                  <span className="student-cert-mini-course">
                    {cert.courseName}
                  </span>
                  <span className="student-cert-mini-date">
                    {cert.expiryDate ? `${tr('Hết hạn: ')}${formatDate(cert.expiryDate)}` : tr('Vĩnh viễn')}
                  </span>
                </div>
                <span className={`student-cert-mini-badge student-cert-mini-badge--${cert.validity.toLowerCase()}`}>
                  {tr(VALIDITY_LABELS[cert.validity]) || cert.validity}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ── Quick Actions ── */}
      <section className="student-actions">
        <article className="student-action-card" onClick={() => navigate('/student/etr')}>
          <p className="action-eyebrow">{tr('Hồ sơ ETR')}</p>
          <h3>{tr('Xem chi tiết hồ sơ')}</h3>
          <p className="action-desc">{tr('Xem toàn bộ hồ sơ đào tạo, điểm danh, điểm số và minh chứng của bạn.')}</p>
        </article>
        <article className="student-action-card" onClick={() => navigate('/student/certificates')}>
          <p className="action-eyebrow">{tr('Chứng chỉ')}</p>
          <h3>{tr('Trạng thái chứng chỉ')}</h3>
          <p className="action-desc">{tr('Theo dõi tình trạng hiệu lực của các chứng chỉ đào tạo và kiểm tra ngày hết hạn.')}</p>
        </article>
        <article className="student-action-card" onClick={() => navigate('/student/profile')}>
          <p className="action-eyebrow">{tr('Tài khoản')}</p>
          <h3>{tr('Quản lý hồ sơ cá nhân')}</h3>
          <p className="action-desc">{tr('Xem thông tin cá nhân và thay đổi mật khẩu đăng nhập.')}</p>
        </article>
      </section>
    </div>
  );
};

export default StudentDashboard;
