import { useState, useEffect } from 'react';
import { api } from '../utils/api';
import { useLanguage } from '../context/LanguageContext';

const STATUS_CONFIG = {
  ExpiringSoon: {
    label: 'Sắp hết hạn',
    icon: '⚠',
    className: 'expiring',
    color: '#b45309',
    bg: '#fffbeb',
    border: '#fde68a',
  },
  Expired: {
    label: 'Đã hết hạn',
    icon: '✕',
    className: 'expired',
    color: '#b91c1c',
    bg: '#fef2f2',
    border: '#fecaca',
  },
};

const formatDate = (d) => {
  if (!d) return '--';
  try { return new Date(d).toLocaleDateString('vi-VN'); }
  catch { return '--'; }
};

const formatRemaining = (expiryDate) => {
  if (!expiryDate) return null;
  const now = new Date();
  const expiry = new Date(expiryDate);
  const diff = Math.ceil((expiry - now) / (1000 * 60 * 60 * 24));
  if (diff < 0) return `Overdue by ${Math.abs(diff)} days`;
  if (diff === 0) return 'Expires today';
  return `${diff} days left`;
};

const ExpiringStudents = () => {
  const { tr } = useLanguage();
  const [courses, setCourses] = useState([]);
  const [selectedCourseId, setSelectedCourseId] = useState('');
  const [daysThreshold, setDaysThreshold] = useState(30);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Load courses on mount
  useEffect(() => {
    (async () => {
      try {
        const data = await api.get('/Courses').catch(() => []);
        setCourses(Array.isArray(data) ? data : []);
        if (Array.isArray(data) && data.length > 0) {
          setSelectedCourseId(String(data[0].courseId || data[0].id));
        }
      } catch (err) {
        console.error('Error loading courses:', err);
      }
    })();
  }, []);

  // Load expiring students when course changes
  useEffect(() => {
    if (!selectedCourseId) return;
    loadExpiringStudents();
  }, [selectedCourseId, daysThreshold]);

  const loadExpiringStudents = async () => {
    setLoading(true);
    try {
      const data = await api
        .get(`/Etr/expiring-students?courseId=${selectedCourseId}&daysThreshold=${daysThreshold}`)
        .catch(() => []);
      setStudents(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Error loading expiring students:', err);
      setStudents([]);
    } finally {
      setLoading(false);
    }
  };

  // Filter students
  const filteredStudents = students.filter((s) => {
    const matchesSearch =
      !searchTerm.trim() ||
      (s.FullName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (s.Email || '').toLowerCase().includes(searchTerm.toLowerCase());

    if (statusFilter === 'ALL') return matchesSearch;
    return matchesSearch && s.ValidityStatus === statusFilter;
  });

  const stats = {
    expiringSoon: students.filter((s) => s.ValidityStatus === 'ExpiringSoon').length,
    expired: students.filter((s) => s.ValidityStatus === 'Expired').length,
  };

  return (
    <div className="page-shell">
      {/* ── Header ── */}
      <section className="student-welcome" style={{ background: 'linear-gradient(135deg, #0a1f3d 0%, #1e3a5f 100%)' }}>
        <div className="student-welcome-left">
          <p className="eyebrow">{tr('Academic Portal')}</p>
          <h1>{tr('Học viên sắp hết hạn chứng chỉ')}</h1>
          <p className="welcome-sub">
            {tr('Theo dõi và quản lý các học viên có chứng chỉ đào tạo sắp hết hạn hoặc đã hết hạn.')}
          </p>
        </div>
        <div className="student-welcome-right">
          <button
            className="action-btn"
            type="button"
            onClick={loadExpiringStudents}
            style={{ background: 'rgba(255,255,255,0.1)', color: '#fff', border: '1px solid rgba(255,255,255,0.2)' }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: 6 }}>
              <path d="M23 4v6h-6" /><path d="M1 20v-6h6" /><path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15" />
            </svg>
            {tr('Làm mới')}
          </button>
        </div>
      </section>

      {/* ── Filters ── */}
      <div className="academic-filter-bar" style={{
        display: 'flex', alignItems: 'center', gap: '16px',
        background: '#fff', border: '1px solid #e4eaf3', borderRadius: '14px',
        padding: '16px 20px', marginBottom: '20px', flexWrap: 'wrap'
      }}>
        {/* Course Select */}
        <div className="filter-group" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <label style={{ fontSize: '11px', fontWeight: 700, color: 'rgba(0,33,71,0.5)', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>
            {tr('Khóa học')}
          </label>
          <select
            value={selectedCourseId}
            onChange={(e) => setSelectedCourseId(e.target.value)}
            style={{
              padding: '8px 12px', borderRadius: '8px', border: '1px solid #d9e1ec',
              fontSize: '13px', fontWeight: 600, color: '#002147', background: '#f8faff',
              minWidth: '200px', cursor: 'pointer'
            }}
          >
            {courses.map((c) => (
              <option key={c.courseId || c.id} value={c.courseId || c.id}>
                {c.courseName || c.name || `Course #${c.courseId || c.id}`}
              </option>
            ))}
          </select>
        </div>

        {/* Days Threshold */}
        <div className="filter-group" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <label style={{ fontSize: '11px', fontWeight: 700, color: 'rgba(0,33,71,0.5)', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>
            {tr('Ngưỡng (ngày)')}
          </label>
          <select
            value={daysThreshold}
            onChange={(e) => setDaysThreshold(Number(e.target.value))}
            style={{
              padding: '8px 12px', borderRadius: '8px', border: '1px solid #d9e1ec',
              fontSize: '13px', fontWeight: 600, color: '#002147', background: '#f8faff',
              cursor: 'pointer'
            }}
          >
            <option value={15}>{tr('15 ngày')}</option>
            <option value={30}>{tr('30 ngày')}</option>
            <option value={60}>{tr('60 ngày')}</option>
            <option value={90}>{tr('90 ngày')}</option>
          </select>
        </div>

        {/* Search */}
        <div className="filter-group" style={{ flex: 1, minWidth: '200px' }}>
          <input
            type="text"
            placeholder={tr('Tìm kiếm theo tên hoặc email...')}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              width: '100%', padding: '8px 14px', borderRadius: '8px', border: '1px solid #d9e1ec',
              fontSize: '13px', color: '#002147', background: '#f8faff', outline: 'none',
              fontFamily: 'inherit'
            }}
          />
        </div>

        {/* Status Filter */}
        <div className="filter-group" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <button
            type="button"
            onClick={() => setStatusFilter('ALL')}
            style={{
              padding: '6px 14px', borderRadius: '8px', border: '1px solid #d9e1ec',
              fontSize: '12px', fontWeight: statusFilter === 'ALL' ? 700 : 600,
              color: statusFilter === 'ALL' ? '#002147' : 'rgba(0,33,71,0.5)',
              background: statusFilter === 'ALL' ? '#e4eaf3' : '#fff',
              cursor: 'pointer', transition: 'all 0.15s'
            }}
          >
            {tr('Tất cả')} ({students.length})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('ExpiringSoon')}
            style={{
              padding: '6px 14px', borderRadius: '8px', border: '1px solid #fde68a',
              fontSize: '12px', fontWeight: statusFilter === 'ExpiringSoon' ? 700 : 600,
              color: statusFilter === 'ExpiringSoon' ? '#b45309' : 'rgba(0,33,71,0.5)',
              background: statusFilter === 'ExpiringSoon' ? '#fffbeb' : '#fff',
              cursor: 'pointer', transition: 'all 0.15s'
            }}
          >
            {tr('Sắp hết hạn')} ({stats.expiringSoon})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('Expired')}
            style={{
              padding: '6px 14px', borderRadius: '8px', border: '1px solid #fecaca',
              fontSize: '12px', fontWeight: statusFilter === 'Expired' ? 700 : 600,
              color: statusFilter === 'Expired' ? '#b91c1c' : 'rgba(0,33,71,0.5)',
              background: statusFilter === 'Expired' ? '#fef2f2' : '#fff',
              cursor: 'pointer', transition: 'all 0.15s'
            }}
          >
            {tr('Đã hết hạn')} ({stats.expired})
          </button>
        </div>
      </div>

      {/* ── Summary Stats ── */}
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '20px'
      }}>
        <div className="student-metric-card">
          <span className="student-metric-label">{tr('Tổng học viên')}</span>
          <strong className="student-metric-value">{loading ? '...' : students.length}</strong>
        </div>
        <div className="student-metric-card">
          <span className="student-metric-label">{tr('Sắp hết hạn')}</span>
          <strong className="student-metric-value amber">{loading ? '...' : stats.expiringSoon}</strong>
        </div>
        <div className="student-metric-card">
          <span className="student-metric-label">{tr('Đã hết hạn')}</span>
          <strong className="student-metric-value" style={{ color: '#b91c1c' }}>{loading ? '...' : stats.expired}</strong>
        </div>
      </div>

      {/* ── Student Table ── */}
      <section className="student-table-section">
        {loading ? (
          <div className="student-empty">{tr('Đang tải dữ liệu...')}</div>
        ) : filteredStudents.length === 0 ? (
          <div className="student-empty">
            {students.length === 0
              ? tr('Không có học viên nào sắp hết hạn hoặc đã hết hạn chứng chỉ cho khóa học này.')
              : tr('Không tìm thấy học viên phù hợp.')}
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <div className="student-table-grid" style={{ gridTemplateColumns: '40px 1.5fr 1.5fr 1.2fr 1fr 1.2fr 120px' }}>
              <div className="student-table-cell student-table-cell--header">{tr('STT')}</div>
              <div className="student-table-cell student-table-cell--header">{tr('Học viên')}</div>
              <div className="student-table-cell student-table-cell--header">{tr('Email')}</div>
              <div className="student-table-cell student-table-cell--header">{tr('Mã ETR')}</div>
              <div className="student-table-cell student-table-cell--header">{tr('Ngày hết hạn')}</div>
              <div className="student-table-cell student-table-cell--header">{tr('Còn lại')}</div>
              <div className="student-table-cell student-table-cell--header student-table-cell--end">{tr('Trạng thái')}</div>

              {filteredStudents.map((s, idx) => {
                const config = STATUS_CONFIG[s.ValidityStatus] || STATUS_CONFIG.ExpiringSoon;
                return (
                  <div className="student-table-row" key={s.ETRCourseRecordId || idx}>
                    <div className="student-table-cell student-table-cell--index">{idx + 1}</div>
                    <div className="student-table-cell student-table-cell--strong">
                      {s.FullName || `${tr('Học viên')} #${s.AccountId}`}
                    </div>
                    <div className="student-table-cell">{s.Email || '--'}</div>
                    <div className="student-table-cell">#{s.ETRCourseRecordId}</div>
                    <div className="student-table-cell">{formatDate(s.ExpiryDate)}</div>
                    <div className="student-table-cell" style={{ color: config.color, fontWeight: 600 }}>
                      {formatRemaining(s.ExpiryDate)}
                    </div>
                    <div className="student-table-cell student-table-cell--end">
                      <span className={`student-badge student-badge--${config.className}`}
                        style={{
                          background: config.bg,
                          color: config.color,
                          border: `1px solid ${config.border}`
                        }}
                      >
                        {config.icon} {tr(config.label)}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </section>
    </div>
  );
};

export default ExpiringStudents;
