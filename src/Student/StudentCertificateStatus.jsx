import { useState, useEffect } from 'react';
import { api } from '../utils/api';
import { useLanguage } from '../context/LanguageContext';

const STATUS_CONFIG = {
  Valid: {
    label: 'Còn hiệu lực',
    icon: '✓',
    className: 'cert-valid',
    color: '#15803d',
    bg: '#f0fdf4',
    border: '#bbf7d0',
  },
  ExpiringSoon: {
    label: 'Sắp hết hạn',
    icon: '⚠',
    className: 'cert-expiring',
    color: '#b45309',
    bg: '#fffbeb',
    border: '#fde68a',
  },
  Expired: {
    label: 'Đã hết hạn',
    icon: '✕',
    className: 'cert-expired',
    color: '#b91c1c',
    bg: '#fef2f2',
    border: '#fecaca',
  },
};

const formatDate = (d) => {
  if (!d) return '--';
  try {
    return new Date(d).toLocaleDateString('vi-VN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
  } catch {
    return '--';
  }
};

/** Get remaining days until expiry */
const getRemainingDays = (expiryDate) => {
  if (!expiryDate) return null;
  const now = new Date();
  const expiry = new Date(expiryDate);
  const diff = Math.ceil((expiry - now) / (1000 * 60 * 60 * 24));
  return diff;
};

/** Format remaining days into readable text */
const StudentCertificateStatus = () => {
  const { tr } = useLanguage();

  const formatRemaining = (days) => {
    if (days === null) return null;
    if (days < 0) return `${tr('Quá hạn ')}${Math.abs(days)} ${tr('ngày')}`;
    if (days === 0) return tr('Hết hạn hôm nay');
    if (days === 1) return tr('Còn 1 ngày');
    if (days < 30) return `${tr('Còn ')}${days} ${tr('ngày')}`;
    const months = Math.floor(days / 30);
    const remainingDays = days % 30;
    if (months === 1) return `${tr('Còn 1 tháng')}${remainingDays > 0 ? ` ${remainingDays} ${tr('ngày')}` : ''}`;
    return `${tr('Còn ')}${months} ${tr('tháng')}${remainingDays > 0 ? ` ${remainingDays} ${tr('ngày')}` : ''}`;
  };

  const [statusList, setStatusList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState('ALL'); // ALL, Valid, ExpiringSoon, Expired

  useEffect(() => {
    loadStatus();
  }, []);

  const loadStatus = async () => {
    setLoading(true);
    setError(null);
    try {
      // Get accountId from user info in localStorage
      let accountId = null;
      try {
        const userJson = localStorage.getItem('user');
        if (userJson) {
          const user = JSON.parse(userJson);
          accountId = user.accountId || user.userId;
        }
      } catch {}

      if (!accountId) {
        setError(tr('Không thể xác thực người dùng. Vui lòng đăng nhập lại.'));
        setLoading(false);
        return;
      }

      const data = await api.get(`/Etr/student/${accountId}/current-status`, {
        suppressAuthRedirect: true,
      }).catch(() => []);

      setStatusList(
        (Array.isArray(data) ? data : []).map((s) => ({
          ...s,
          ValidityStatus: s.ValidityStatus ?? s.validityStatus,
          ExpiryDate: s.ExpiryDate ?? s.expiryDate ?? null,
          IssuedDate: s.IssuedDate ?? s.issuedDate ?? null,
          CourseName: s.CourseName ?? s.courseName,
          CourseId: s.CourseId ?? s.courseId,
          ETRCourseRecordId:
            s.ETRCourseRecordId ?? s.etrCourseRecordId ?? s.courseRecordId,
        })),
      );
    } catch (err) {
      console.error('Error loading certificate status:', err);
      setError(tr('Không thể tải trạng thái chứng chỉ. Vui lòng thử lại sau.'));
      setStatusList([]);
    } finally {
      setLoading(false);
    }
  };

  // Filter statuses
  const filteredStatuses =
    filter === 'ALL'
      ? statusList
      : statusList.filter((s) => s.ValidityStatus === filter);

  // Count stats
  const stats = {
    total: statusList.length,
    valid: statusList.filter((s) => s.ValidityStatus === 'Valid').length,
    expiringSoon: statusList.filter((s) => s.ValidityStatus === 'ExpiringSoon').length,
    expired: statusList.filter((s) => s.ValidityStatus === 'Expired').length,
  };

  return (
    <div className="page-shell">
      {/* ── Header ── */}
      <section className="student-welcome">
        <div className="student-welcome-left">
          <p className="eyebrow">{tr('Student Portal')}</p>
          <h1>{tr('Trạng thái chứng chỉ')}</h1>
          <p className="welcome-sub">
            {tr('Theo dõi tình trạng hiệu lực của các chứng chỉ đào tạo của bạn.')}
          </p>
        </div>
        <div className="student-welcome-right">
          <button
            className="action-btn"
            type="button"
            onClick={loadStatus}
            style={{ background: 'rgba(255,255,255,0.1)', color: '#fff', border: '1px solid rgba(255,255,255,0.2)' }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: 6 }}>
              <path d="M23 4v6h-6" /><path d="M1 20v-6h6" /><path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15" />
            </svg>
            {tr('Làm mới')}
          </button>
        </div>
      </section>

      {/* ── Stats Cards ── */}
      <section className="student-metrics">
        <div className="student-metric-card">
          <span className="student-metric-label">{tr('Tổng số chứng chỉ')}</span>
          <strong className="student-metric-value">
            {loading ? '...' : stats.total}
          </strong>
        </div>
        <div className="student-metric-card">
          <span className="student-metric-label">{tr('Còn hiệu lực')}</span>
          <strong className="student-metric-value green">
            {loading ? '...' : stats.valid}
          </strong>
        </div>
        <div className="student-metric-card">
          <span className="student-metric-label">{tr('Sắp hết hạn')}</span>
          <strong className="student-metric-value amber">
            {loading ? '...' : stats.expiringSoon}
          </strong>
        </div>
        <div className="student-metric-card">
          <span className="student-metric-label">{tr('Đã hết hạn')}</span>
          <strong className="student-metric-value" style={{ color: '#b91c1c' }}>
            {loading ? '...' : stats.expired}
          </strong>
        </div>
      </section>

      {/* ── Filter Tabs ── */}
      <div className="student-filter-tabs">
        {[
          { key: 'ALL', label: tr('Tất cả'), count: stats.total },
          { key: 'Valid', label: tr('Còn hiệu lực'), count: stats.valid },
          { key: 'ExpiringSoon', label: tr('Sắp hết hạn'), count: stats.expiringSoon },
          { key: 'Expired', label: tr('Đã hết hạn'), count: stats.expired },
        ].map((tab) => (
          <button
            key={tab.key}
            type="button"
            className={`student-filter-tab ${filter === tab.key ? 'active' : ''}`}
            onClick={() => setFilter(tab.key)}
          >
            <span>{tab.label}</span>
            <span className="student-filter-count">{tab.count}</span>
          </button>
        ))}
      </div>

      {/* ── Content ── */}
      <section className="student-table-section">
        {loading ? (
          <div className="student-empty">{tr('Đang tải dữ liệu chứng chỉ...')}</div>
        ) : error ? (
          <div className="student-empty" style={{ color: '#b91c1c' }}>{error}</div>
        ) : filteredStatuses.length === 0 ? (
          <div className="student-empty">
            {filter === 'ALL'
              ? tr('Bạn chưa có chứng chỉ đào tạo nào.')
              : tr('Không có chứng chỉ nào ở trạng thái này.')}
          </div>
        ) : (
          <div className="student-cert-list">
            {filteredStatuses.map((cert) => {
              const config = STATUS_CONFIG[cert.ValidityStatus] || STATUS_CONFIG.Valid;
              const days = getRemainingDays(cert.ExpiryDate);
              const remainingText = formatRemaining(days);

              return (
                <div
                  key={`${cert.CourseId}-${cert.ETRCourseRecordId}`}
                  className="student-cert-card"
                  style={{
                    borderLeftColor: config.color,
                    borderLeftWidth: '4px',
                    borderLeftStyle: 'solid',
                  }}
                >
                  {/* Status Badge */}
                  <div
                    className="student-cert-status-badge"
                    style={{
                      background: config.bg,
                      color: config.color,
                      border: `1px solid ${config.border}`,
                    }}
                  >
                    <span className="student-cert-status-icon">{config.icon}</span>
                    <span>{tr(config.label)}</span>
                  </div>

                  {/* Course Info */}
                  <div className="student-cert-info">
                    <h3 className="student-cert-course-name">
                      {cert.CourseName || `${tr('Khóa học #')}${cert.CourseId}`}
                    </h3>
                    <p className="student-cert-id">
                      {tr('Mã ETR: #')}{cert.ETRCourseRecordId}
                    </p>
                  </div>

                  {/* Date Info */}
                  <div className="student-cert-dates">
                    <div className="student-cert-date-item">
                      <span className="student-cert-date-label">{tr('Ngày cấp')}</span>
                      <span className="student-cert-date-value">
                        {formatDate(cert.IssuedDate)}
                      </span>
                    </div>
                    <div className="student-cert-date-item">
                      <span className="student-cert-date-label">{tr('Ngày hết hạn')}</span>
                      <span
                        className="student-cert-date-value"
                        style={
                          cert.ValidityStatus === 'Expired'
                            ? { color: '#b91c1c' }
                            : cert.ValidityStatus === 'ExpiringSoon'
                              ? { color: '#b45309' }
                              : {}
                        }
                      >
                        {cert.ExpiryDate ? formatDate(cert.ExpiryDate) : tr('Vĩnh viễn')}
                      </span>
                    </div>
                    {remainingText && (
                      <div className="student-cert-date-item">
                        <span className="student-cert-date-label">{tr('Thời hạn còn')}</span>
                        <span
                          className="student-cert-date-value"
                          style={{
                            color: config.color,
                            fontWeight: 700,
                          }}
                        >
                          {remainingText}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Progress bar for expiring certificates */}
                  {cert.ExpiryDate && cert.ValidityStatus !== 'Expired' && (
                    <div className="student-cert-progress">
                      <div
                        className="student-cert-progress-bar"
                        style={{
                          background:
                            cert.ValidityStatus === 'ExpiringSoon'
                              ? 'linear-gradient(90deg, #f59e0b, #d97706)'
                              : 'linear-gradient(90deg, #22c55e, #16a34a)',
                          width: `${Math.min(100, Math.max(5, ((days || 365) / 365) * 100))}%`,
                        }}
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
};

export default StudentCertificateStatus;
