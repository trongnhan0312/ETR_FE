import { useState, useEffect } from 'react';
import { api } from '../utils/api';

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

const Badge = ({ status }) => (
  <span className={`student-badge student-badge--${STATUS_MAP[status] || 'draft'}`}>
    {STATUS_LABEL[status] || status}
  </span>
);

/** Format date string → Vietnamese locale */
const formatDate = (d) => {
  if (!d) return '--';
  try { return new Date(d).toLocaleDateString('vi-VN'); }
  catch { return '--'; }
};

/** Map API PascalCase fields to stable camelCase */
const mapEtr = (e) => ({
  id: e.ETRCourseRecordId ?? e.etrCourseRecordId ?? null,
  enrollmentId: e.EnrollmentId ?? e.enrollmentId ?? null,
  status: e.Status ?? e.status ?? 'Draft',
  submittedAt: e.SubmittedAt ?? e.submittedAt ?? null,
  verifiedAt: e.VerifiedAt ?? e.verifiedAt ?? null,
  completedAt: e.CompletedAt ?? e.completedAt ?? null,
  subjectResults: e.SubjectResults ?? e.subjectResults ?? null,
  evidences: e.Evidences ?? e.evidences ?? null,
  historyLogs: e.HistoryLogs ?? e.historyLogs ?? null,
});

/* ── Detail View ── */
const DetailView = ({ etr, onBack }) => {
  const s = mapEtr(etr || {});

  return (
    <div className="page-shell">
      {/* Header */}
      <section className="student-detail-header">
        <div>
          <button className="student-detail-back" type="button" onClick={onBack}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
              <path d="M19 12H5" /><path d="M12 19l-7-7 7-7" />
            </svg>
            Quay lại danh sách
          </button>
          <h1 className="student-detail-title">
            {s.id ? `ETR #${s.id}` : 'Hồ sơ đào tạo'}
          </h1>
          <p className="student-detail-sub">
            Mã ghi danh: {s.enrollmentId || '--'}
            {s.submittedAt ? ` | Nộp: ${formatDate(s.submittedAt)}` : ''}
          </p>
        </div>
        <Badge status={s.status} />
      </section>

      {/* Info Grid */}
      <section className="student-info-grid">
        <div className="student-info-card">
          <p className="info-eyebrow">Thông tin hồ sơ</p>
          <h3>Chi tiết</h3>
          <div className="student-field-row">
            <div className="student-field">
              <div className="student-field-label">Mã hồ sơ</div>
              <div className="student-field-value">{s.id || '--'}</div>
            </div>
            <div className="student-field">
              <div className="student-field-label">Mã ghi danh</div>
              <div className="student-field-value">{s.enrollmentId || '--'}</div>
            </div>
            <div className="student-field">
              <div className="student-field-label">Ngày nộp</div>
              <div className="student-field-value">{formatDate(s.submittedAt)}</div>
            </div>
            <div className="student-field">
              <div className="student-field-label">Ngày thẩm định</div>
              <div className="student-field-value">{formatDate(s.verifiedAt)}</div>
            </div>
            <div className="student-field">
              <div className="student-field-label">Ngày hoàn thành</div>
              <div className="student-field-value">{formatDate(s.completedAt)}</div>
            </div>
            <div className="student-field">
              <div className="student-field-label">Trạng thái</div>
              <div className="student-field-value">{STATUS_LABEL[s.status] || s.status || '--'}</div>
            </div>
          </div>
        </div>

        {/* Status Summary */}
        <div className="student-info-card student-info-card--center">
          <div className={`student-status-icon ${s.status === 'Completed' ? 'student-status-icon--done' : 'student-status-icon--pending'}`}>
            {s.status === 'Completed' ? '✓' : '○'}
          </div>
          <p className="student-status-text">
            {s.status === 'Completed'
              ? 'Hồ sơ đã hoàn thành và đóng băng. Dữ liệu đã được khóa vĩnh viễn.'
              : 'Hồ sơ đang trong quá trình đào tạo.'}
          </p>
        </div>
      </section>

      {/* Subject Results */}
      <section className="student-info-card" style={{ marginBottom: 24 }}>
        <p className="info-eyebrow">Kết quả môn học</p>
        <h3>Kết quả</h3>
        {s.subjectResults && s.subjectResults.length > 0 ? (
          <table className="student-subject-table">
            <thead>
              <tr>
                <th>Môn học</th>
                <th>Điểm LT</th>
                <th>Điểm TH</th>
                <th>Chuyên cần</th>
                <th style={{ textAlign: 'center' }}>Kết quả</th>
              </tr>
            </thead>
            <tbody>
              {s.subjectResults.map((sr, idx) => (
                <tr key={idx}>
                  <td style={{ fontWeight: 600, color: '#002147' }}>
                    {sr.SubjectName ?? sr.subjectName ?? `Môn #${sr.SubjectId ?? sr.subjectId ?? idx + 1}`}
                  </td>
                  <td>{sr.AssessmentScore ?? sr.assessmentScore != null ? `${sr.AssessmentScore ?? sr.assessmentScore}%` : '--'}</td>
                  <td>{sr.PracticalScore ?? sr.practicalScore != null ? `${sr.PracticalScore ?? sr.practicalScore}%` : '--'}</td>
                  <td>{sr.AttendanceRate ?? sr.attendanceRate != null ? `${sr.AttendanceRate ?? sr.attendanceRate}%` : '--'}</td>
                  <td style={{ textAlign: 'center' }}>
                    <span className={`student-result-badge ${(sr.IsPassed ?? sr.isPassed) ? 'student-result-badge--pass' : 'student-result-badge--fail'}`}>
                      {(sr.IsPassed ?? sr.isPassed) ? 'ĐẠT' : 'KHÔNG ĐẠT'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p style={{ color: 'rgba(0,33,71,0.5)', fontSize: 13, marginTop: 8 }}>
            Không có dữ liệu kết quả môn học.
          </p>
        )}
      </section>

      {/* Evidences */}
      {s.evidences && s.evidences.length > 0 && (
        <section className="student-info-card" style={{ marginBottom: 24 }}>
          <p className="info-eyebrow">Minh chứng</p>
          <h3>Tệp tin</h3>
          <div className="student-evidence-list">
            {s.evidences.map((ev, idx) => (
              <span key={idx} className="student-evidence-chip">
                <svg width="12" height="14" viewBox="0 0 12 14" fill="none"><path d="M0 14V0H8L12 4V14H0ZM7 5V1H1V13H11V5H7ZM1 1V5V1V5V13V1Z" fill="currentColor" opacity="0.5" /></svg>
                {ev.FileName ?? ev.fileName ?? ev.EvidenceTypeName ?? ev.evidenceTypeName ?? `Tệp #${idx + 1}`}
              </span>
            ))}
          </div>
        </section>
      )}

      {/* Audit History */}
      {s.historyLogs && s.historyLogs.length > 0 && (
        <section className="student-info-card" style={{ marginBottom: 24 }}>
          <p className="info-eyebrow">Lịch sử</p>
          <h3>Audit Trail</h3>
          <div className="student-audit-list">
            {s.historyLogs.map((log, idx) => (
              <div key={idx} className="student-audit-item">
                <span>{log.Description ?? log.description ?? log.Action ?? log.action ?? log.Event ?? log.event ?? '--'}</span>
                <span className="student-audit-date">{log.Timestamp ?? log.timestamp ?? log.Date ?? log.date ?? '--'}</span>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
};

/* ── List View (default) ── */
const StudentMyETR = () => {
  const [etrs, setEtrs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedEtr, setSelectedEtr] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await api.get('/Etr/my-etr', { suppressAuthRedirect: true }).catch(() => []);
      setEtrs(Array.isArray(data) ? data : []);
    } catch {
      setEtrs([]);
    } finally {
      setLoading(false);
    }
  };

  const mapped = etrs.map(mapEtr);

  const filtered = mapped.filter((e) => {
    const term = searchTerm.toLowerCase().trim();
    if (!term) return true;
    return String(e.id).includes(term) || String(e.enrollmentId).includes(term);
  });

  // Detail view
  if (selectedEtr) {
    return <DetailView etr={selectedEtr} onBack={() => setSelectedEtr(null)} />;
  }

  // List view
  return (
    <div className="page-shell">
      {/* Header */}
      <section className="student-welcome" style={{ marginBottom: 20 }}>
        <div className="student-welcome-left">
          <p className="eyebrow">Student Portal</p>
          <h1>Hồ sơ ETR của tôi</h1>
          <p className="welcome-sub">Danh sách các hồ sơ đào tạo điện tử (ETR) của bạn.</p>
        </div>
        <div className="student-welcome-right">
          <span className="welcome-role">
            {mapped.length} hồ sơ &middot; {mapped.filter(e => e.status === 'Completed').length} hoàn thành
          </span>
        </div>
      </section>

      {/* Search */}
      <div className="student-search-bar">
        <span className="student-search-icon">
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <path d="M16.6 18L10.3 11.7C9.8 12.1 9.225 12.4167 8.575 12.65C7.925 12.8833 7.23333 13 6.5 13C4.68333 13 3.14583 12.3708 1.8875 11.1125C0.629167 9.85417 0 8.31667 0 6.5C0 4.68333 0.629167 3.14583 1.8875 1.8875C3.14583 0.629167 4.68333 0 6.5 0C8.31667 0 9.85417 0.629167 11.1125 1.8875C12.3708 3.14583 13 4.68333 13 6.5C13 7.23333 12.8833 7.925 12.65 8.575C12.4167 9.225 12.1 9.8 11.7 10.3L18 16.6L16.6 18ZM6.5 11C7.75 11 8.8125 10.5625 9.6875 9.6875C10.5625 8.8125 11 7.75 11 6.5C11 5.25 10.5625 4.1875 9.6875 3.3125C8.8125 2.4375 7.75 2 6.5 2C5.25 2 4.1875 2.4375 3.3125 3.3125C2.4375 4.1875 2 5.25 2 6.5C2 7.75 2.4375 8.8125 3.3125 9.6875C4.1875 10.5625 5.25 11 6.5 11Z" fill="currentColor" />
          </svg>
        </span>
        <input type="text" placeholder="Tìm kiếm theo mã hồ sơ, mã ghi danh..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
        {searchTerm && (
          <button type="button" onClick={() => setSearchTerm('')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(0,33,71,0.35)', padding: 0, fontSize: '16px' }}>✕</button>
        )}
      </div>

      {/* List */}
      <section className="student-table-section">
        {loading ? (
          <div className="student-empty">Đang tải dữ liệu...</div>
        ) : filtered.length === 0 ? (
          <div className="student-empty">{searchTerm ? 'Không tìm thấy hồ sơ phù hợp.' : 'Bạn chưa có hồ sơ ETR nào.'}</div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <div className="student-table-grid" style={{ gridTemplateColumns: '48px 1.2fr 1.2fr 120px 140px 100px' }}>
              <div className="student-table-cell student-table-cell--header">STT</div>
              <div className="student-table-cell student-table-cell--header">Mã hồ sơ</div>
              <div className="student-table-cell student-table-cell--header">Ghi danh</div>
              <div className="student-table-cell student-table-cell--header">Ngày</div>
              <div className="student-table-cell student-table-cell--header">Trạng thái</div>
              <div className="student-table-cell student-table-cell--header student-table-cell--end">&nbsp;</div>

              {filtered.map((e, idx) => (
                <div className="student-table-row" key={e.id || idx} style={{ cursor: 'pointer' }} onClick={() => setSelectedEtr(etrs.find(r => (r.ETRCourseRecordId ?? r.etrCourseRecordId) === e.id) || etrs[idx])}>
                  <div className="student-table-cell student-table-cell--index">{idx + 1}</div>
                  <div className="student-table-cell student-table-cell--strong">{e.id ? `ETR #${e.id}` : `Hồ sơ #${idx + 1}`}</div>
                  <div className="student-table-cell">{e.enrollmentId ? `Mã GD: ${e.enrollmentId}` : '--'}</div>
                  <div className="student-table-cell">{formatDate(e.completedAt || e.verifiedAt || e.submittedAt)}</div>
                  <div className="student-table-cell"><Badge status={e.status} /></div>
                  <div className="student-table-cell student-table-cell--end">
                    <button className="action-btn" type="button" onClick={(e2) => { e2.stopPropagation(); setSelectedEtr(etrs.find(r => (r.ETRCourseRecordId ?? r.etrCourseRecordId) === e.id) || etrs[idx]); }}>
                      Chi tiết
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>
    </div>
  );
};

export default StudentMyETR;
