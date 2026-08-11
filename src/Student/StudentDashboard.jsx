import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../utils/api';
import { useLanguage } from '../context/LanguageContext';

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
};

const STATUS_LABEL = {
  'In Progress': 'Đang đào tạo',
  'Submitted': 'Đã nộp',
  'Verified': 'Đã thẩm định',
  'Completed': 'Hoàn thành',
  'Draft': 'Nháp',
  'Returned': 'Trả lại',
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

/** Map API response fields (PascalCase from .NET) to consistent camelCase */
const mapEtr = (e) => ({
  id: e.ETRCourseRecordId ?? e.etrCourseRecordId ?? null,
  enrollmentId: e.EnrollmentId ?? e.enrollmentId ?? null,
  status: e.Status ?? e.status ?? 'Draft',
  date: e.CompletedAt ?? e.completedAt ?? e.VerifiedAt ?? e.verifiedAt ?? e.SubmittedAt ?? e.submittedAt ?? null,
});

const StudentDashboard = () => {
  const { tr } = useLanguage();
  const navigate = useNavigate();
  const [etrs, setEtrs] = useState([]);
  const [profile, setProfile] = useState(null);
  const [certStatus, setCertStatus] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const [etrData, profileData, certData] = await Promise.all([
          api.get('/Etr/my-etr', { suppressAuthRedirect: true }).catch(() => []),
          api.get('/auth/me', { suppressAuthRedirect: true }).catch(() => null),
          // Get accountId from localStorage for certificate status
          (async () => {
            try {
              const u = JSON.parse(localStorage.getItem('user') || '{}');
              const aid = u.accountId || u.userId;
              if (aid) {
                return api.get(`/Etr/student/${aid}/current-status`, { suppressAuthRedirect: true }).catch(() => []);
              }
              return [];
            } catch { return []; }
          })(),
        ]);
        if (Array.isArray(etrData)) setEtrs(etrData);
        if (profileData) setProfile(profileData);
        if (Array.isArray(certData)) {
          setCertStatus(
            certData.map((c) => ({
              ...c,
              ValidityStatus: c.ValidityStatus ?? c.validityStatus,
              ExpiryDate: c.ExpiryDate ?? c.expiryDate ?? null,
              IssuedDate: c.IssuedDate ?? c.issuedDate ?? null,
              CourseName: c.CourseName ?? c.courseName,
              CourseId: c.CourseId ?? c.courseId,
              ETRCourseRecordId:
                c.ETRCourseRecordId ?? c.etrCourseRecordId ?? c.courseRecordId,
            })),
          );
        }
      } catch {
        // silent
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // User info
  let userName = tr('Học viên');
  let userLogin = 'student';
  if (profile) {
    userName = profile.FullName ?? profile.fullName ?? userName;
    userLogin = profile.Username ?? profile.username ?? userLogin;
  } else {
    try {
      const u = JSON.parse(localStorage.getItem('user') || '{}');
      userName = u.fullName || userName;
      userLogin = u.username || userLogin;
    } catch { /* ignore */ }
  }

  const initials = (name) => {
    if (!name) return 'HV';
    const parts = name.trim().split(' ');
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[parts.length - 2][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  const mapped = etrs.map(mapEtr);

  const metrics = [
    { label: tr('Tổng số hồ sơ'), value: mapped.length, cls: '' },
    { label: tr('Đang đào tạo'), value: mapped.filter(e => e.status === 'In Progress' || e.status === 'Draft').length, cls: 'blue' },
    { label: tr('Chờ xử lý'), value: mapped.filter(e => e.status === 'Submitted' || e.status === 'Verified').length, cls: 'amber' },
    { label: tr('Đã hoàn thành'), value: mapped.filter(e => e.status === 'Completed').length, cls: 'green' },
  ];

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
            <div className="student-table-grid" style={{ gridTemplateColumns: '48px 1.2fr 1.8fr 120px 140px 100px' }}>
              {/* Header */}
              <div className="student-table-cell student-table-cell--header">{tr('STT')}</div>
              <div className="student-table-cell student-table-cell--header">{tr('Mã hồ sơ')}</div>
              <div className="student-table-cell student-table-cell--header">{tr('Ghi danh')}</div>
              <div className="student-table-cell student-table-cell--header">{tr('Ngày')}</div>
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
                    {e.enrollmentId ? `${tr('Mã GD: ')}${e.enrollmentId}` : '--'}
                  </div>
                  <div className="student-table-cell">{formatDate(e.date)}</div>
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

      {/* ── Quick Actions ── */}
      <section className="student-actions">            {/* ── Certificate Status Summary ── */}
            {certStatus.length > 0 && (
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
                <div className="student-cert-mini-list">
                  {certStatus.slice(0, 4).map((cert, idx) => (
                    <div key={idx} className="student-cert-mini-item">
                      <div className="student-cert-mini-info">
                        <span className="student-cert-mini-course">
                          {cert.CourseName || `${tr('Khóa học #')}${cert.CourseId}`}
                        </span>
                        <span className="student-cert-mini-date">
                          {cert.ExpiryDate ? `${tr('Hết hạn: ')}${formatDate(cert.ExpiryDate)}` : tr('Vĩnh viễn')}
                        </span>
                      </div>
                      <span className={`student-cert-mini-badge student-cert-mini-badge--${(cert.ValidityStatus || '').toLowerCase()}`}>
                        {tr(VALIDITY_LABELS[cert.ValidityStatus]) || cert.ValidityStatus}
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
      </section>
    </div>
  );
};

export default StudentDashboard;
