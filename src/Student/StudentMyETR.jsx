import { useState, useEffect } from 'react';
import { api } from '../utils/api';
import { useLanguage } from '../context/LanguageContext';

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

const Badge = ({ status }) => {
  const { tr } = useLanguage();
  return (
    <span className={`student-badge student-badge--${STATUS_MAP[status] || 'draft'}`}>
      {tr(STATUS_LABEL[status]) || status}
    </span>
  );
};

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
  issuedDate: e.IssuedDate ?? e.issuedDate ?? null,
  expiryDate: e.ExpiryDate ?? e.expiryDate ?? null,
  previousRecordId: e.PreviousRecordId ?? e.previousRecordId ?? null,
  isLocked: e.IsLocked ?? e.isLocked ?? false,
  subjectResults: e.SubjectResults ?? e.subjectResults ?? null,
  evidences: e.Evidences ?? e.evidences ?? null,
  historyLogs: e.HistoryLogs ?? e.historyLogs ?? null,
});

/* ── Detail View ── */
const DetailView = ({ etr, onBack }) => {
  const { tr } = useLanguage();
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
            {tr('Quay lại danh sách')}
          </button>
          <h1 className="student-detail-title">
            {s.id ? `ETR #${s.id}` : tr('Hồ sơ đào tạo')}
          </h1>
          <p className="student-detail-sub">
            {tr('Mã ghi danh:')} {s.enrollmentId || '--'}
            {s.submittedAt ? ` | ${tr('Nộp:')} ${formatDate(s.submittedAt)}` : ''}
          </p>
        </div>
        <Badge status={s.status} />
      </section>

      {/* Info Grid */}
      <section className="student-info-grid">
        <div className="student-info-card">
          <p className="info-eyebrow">{tr('Thông tin hồ sơ')}</p>
          <h3>{tr('Chi tiết')}</h3>
          <div className="student-field-row">
            <div className="student-field">
              <div className="student-field-label">{tr('Mã hồ sơ')}</div>
              <div className="student-field-value">{s.id || '--'}</div>
            </div>
            <div className="student-field">
              <div className="student-field-label">{tr('Mã ghi danh')}</div>
              <div className="student-field-value">{s.enrollmentId || '--'}</div>
            </div>
            <div className="student-field">
              <div className="student-field-label">{tr('Ngày cấp chứng chỉ')}</div>
              <div className="student-field-value">{formatDate(s.issuedDate)}</div>
            </div>
            <div className="student-field">
              <div className="student-field-label">{tr('Ngày hết hạn')}</div>
              <div className="student-field-value" style={s.expiryDate && new Date(s.expiryDate) < new Date() ? { color: '#b91c1c' } : {}}>
                {s.expiryDate ? formatDate(s.expiryDate) : tr('Vĩnh viễn')}
              </div>
            </div>
            <div className="student-field">
              <div className="student-field-label">{tr('ETR trước đó')}</div>
              <div className="student-field-value">
                {s.previousRecordId ? `#${s.previousRecordId}` : '--'}
              </div>
            </div>
            <div className="student-field">
              <div className="student-field-label">{tr('Trạng thái')}</div>
              <div className="student-field-value">{tr(STATUS_LABEL[s.status]) || s.status || '--'}</div>
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
              ? tr('Hồ sơ đã hoàn thành và đóng băng. Dữ liệu đã được khóa vĩnh viễn.')
              : tr('Hồ sơ đang trong quá trình đào tạo.')}
          </p>
        </div>
      </section>

      {/* Subject Results */}
      <section className="student-info-card" style={{ marginBottom: 24 }}>
        <p className="info-eyebrow">{tr('Kết quả môn học')}</p>
        <h3>{tr('Kết quả')}</h3>
        {s.subjectResults && s.subjectResults.length > 0 ? (
          <table className="student-subject-table">
            <thead>
              <tr>
                <th>{tr('Môn học')}</th>
                <th>{tr('Điểm LT')}</th>
                <th>{tr('Điểm TH')}</th>
                <th>{tr('Chuyên cần')}</th>
                <th style={{ textAlign: 'center' }}>{tr('Kết quả')}</th>
              </tr>
            </thead>
            <tbody>
              {s.subjectResults.map((sr, idx) => {
                // B9: BE mới (2026-08-04) trả thêm field Score trong SubjectResultResponse —
                // ưu tiên Score mới, fallback về AssessmentScore cũ nếu có.
                const scoreVal = sr.Score ?? sr.score ?? sr.AssessmentScore ?? sr.assessmentScore;
                const practicalVal = sr.PracticalScore ?? sr.practicalScore;
                const attendanceVal = sr.AttendanceRate ?? sr.attendanceRate;
                return (
                <tr key={idx}>
                  <td style={{ fontWeight: 600, color: '#002147' }}>
                    {sr.SubjectName ?? sr.subjectName ?? `${tr('Môn #')}${sr.SubjectId ?? sr.subjectId ?? idx + 1}`}
                  </td>
                  <td>{scoreVal != null ? `${scoreVal}%` : '--'}</td>
                  <td>{practicalVal != null ? `${practicalVal}%` : '--'}</td>
                  <td>{attendanceVal != null ? `${attendanceVal}%` : '--'}</td>
                  <td style={{ textAlign: 'center' }}>
                    <span className={`student-result-badge ${(sr.IsPassed ?? sr.isPassed) ? 'student-result-badge--pass' : 'student-result-badge--fail'}`}>
                      {(sr.IsPassed ?? sr.isPassed) ? tr('ĐẠT') : tr('KHÔNG ĐẠT')}
                    </span>
                  </td>
                </tr>
                );
              })}
            </tbody>
          </table>
        ) : (
          <p style={{ color: 'rgba(0,33,71,0.5)', fontSize: 13, marginTop: 8 }}>
            {tr('Không có dữ liệu kết quả môn học.')}
          </p>
        )}
      </section>

      {/* Evidences */}
      {s.evidences && s.evidences.length > 0 && (
        <section className="student-info-card" style={{ marginBottom: 24 }}>
          <p className="info-eyebrow">{tr('Minh chứng')}</p>
          <h3>{tr('Tệp tin')}</h3>
          <div className="student-evidence-list">
            {s.evidences.map((ev, idx) => (
              <span key={idx} className="student-evidence-chip">
                <svg width="12" height="14" viewBox="0 0 12 14" fill="none"><path d="M0 14V0H8L12 4V14H0ZM7 5V1H1V13H11V5H7ZM1 1V5V1V5V13V1Z" fill="currentColor" opacity="0.5" /></svg>
                {ev.FileName ?? ev.fileName ?? ev.EvidenceTypeName ?? ev.evidenceTypeName ?? `${tr('Tệp #')}${idx + 1}`}
              </span>
            ))}
          </div>
        </section>
      )}

      {/* Audit History */}
      {s.historyLogs && s.historyLogs.length > 0 && (
        <section className="student-info-card" style={{ marginBottom: 24 }}>
          <p className="info-eyebrow">{tr('Lịch sử')}</p>
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

/* ── Training History Timeline ── */
const TrainingHistory = () => {
  const { tr } = useLanguage();
  const [historyRecords, setHistoryRecords] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        let accountId = null;
        try {
          const userJson = localStorage.getItem('user');
          if (userJson) {
            const user = JSON.parse(userJson);
            accountId = user.accountId || user.userId;
          }
        } catch {}

        if (!accountId) {
          setHistoryRecords([]);
          setLoading(false);
          return;
        }

        const data = await api.get(`/Etr/student/${accountId}/history`, {
          suppressAuthRedirect: true,
        }).catch(() => []);

        setHistoryRecords(Array.isArray(data) ? data : []);
      } catch {
        setHistoryRecords([]);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const mapped = historyRecords.map(mapEtr);

  if (loading) {
    return <div className="student-empty">{tr('Đang tải lịch sử đào tạo...')}</div>;
  }

  if (mapped.length === 0) {
    return <div className="student-empty">{tr('Chưa có lịch sử đào tạo.')}</div>;
  }

  return (
    <div className="student-history-timeline">
      {mapped.map((record, idx) => {
        const isFirst = idx === 0;
        const isCompleted = record.status === 'Completed';
        const isExpired = record.expiryDate && new Date(record.expiryDate) < new Date();

        return (
          <div key={record.id || idx} className="student-history-item">
            {/* Timeline connector */}
            <div className="student-history-connector">
              <div className={`student-history-dot ${isCompleted ? 'completed' : ''}`}>
                {isCompleted ? '✓' : idx + 1}
              </div>
              {idx < mapped.length - 1 && <div className="student-history-line" />}
            </div>

            {/* Content card */}
            <div className="student-history-card">
              <div className="student-history-header">
                <span className="student-history-title">ETR #{record.id}</span>
                <Badge status={record.status} />
              </div>

              <div className="student-history-details">
                <div className="student-history-detail">
                  <span className="student-history-label">{tr('Ngày cấp')}</span>
                  <span className="student-history-value">{formatDate(record.issuedDate)}</span>
                </div>
                <div className="student-history-detail">
                  <span className="student-history-label">{tr('Ngày hết hạn')}</span>
                  <span className="student-history-value" style={isExpired ? { color: '#b91c1c' } : {}}>
                    {record.expiryDate ? formatDate(record.expiryDate) : tr('Vĩnh viễn')}
                  </span>
                </div>
                <div className="student-history-detail">
                  <span className="student-history-label">{tr('Mã ghi danh')}</span>
                  <span className="student-history-value">#{record.enrollmentId}</span>
                </div>
                {record.previousRecordId && (
                  <div className="student-history-detail">
                    <span className="student-history-label">ETR trước</span>
                    <span className="student-history-value">
                      <span className="student-history-prev-link">#{record.previousRecordId}</span>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginLeft: 4, color: '#c5a059' }}>
                        <path d="M5 12h14" /><path d="M12 5l7 7-7 7" />
                      </svg>
                    </span>
                  </div>
                )}
              </div>

              {isFirst && isCompleted && (
                <div className="student-history-current-label">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M22 11.08V12a10 10 0 11-5.93-9.14" /><path d="M22 4L12 14.01l-3-3" />
                  </svg>
                  {tr('Chứng chỉ hiện tại')}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};

/* ── List View (default) ── */
const StudentMyETR = () => {
  const { tr } = useLanguage();
  const [etrs, setEtrs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedEtr, setSelectedEtr] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('list'); // 'list' or 'history'

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

  useEffect(() => { loadData(); }, []);

  const openDetail = async (row) => {
    const id = row?.ETRCourseRecordId ?? row?.etrCourseRecordId;
    let detail = row;
    try {
      if (id) {
        const enriched = await api
          .get(`/Etr/${id}`, { suppressAuthRedirect: true })
          .catch(() => null);
        if (enriched) {
          // EtrDetailsResponse: SubjectResults, EvidenceFiles, ApprovalHistories →
          // DetailView expects subjectResults / evidences / historyLogs.
          const subjects = Array.isArray(enriched.SubjectResults ?? enriched.subjectResults)
            ? (enriched.SubjectResults ?? enriched.subjectResults).map((sr) => ({
                ...sr,
                SubjectId: sr.SubjectId ?? sr.subjectId,
                Score: sr.Score ?? sr.score,
                AttendanceRate: sr.AttendanceRate ?? sr.attendanceRate,
                IsPassed: sr.IsSignedOff ?? sr.isSignedOff,
              }))
            : null;
          const evidences = Array.isArray(enriched.EvidenceFiles ?? enriched.evidenceFiles)
            ? (enriched.EvidenceFiles ?? enriched.evidenceFiles).map((ev) => ({
                ...ev,
                FileName: ev.FileName ?? ev.fileName,
              }))
            : null;
          const historyLogs = Array.isArray(enriched.ApprovalHistories ?? enriched.approvalHistories)
            ? (enriched.ApprovalHistories ?? enriched.approvalHistories).map((h) => ({
                ...h,
                Description: h.ActionType ?? h.actionType,
                Timestamp: h.ActionAt ?? h.actionAt,
              }))
            : null;
          detail = {
            ...enriched,
            SubjectResults: subjects ?? enriched.SubjectResults ?? null,
            Evidences: evidences ?? enriched.Evidences ?? null,
            HistoryLogs: historyLogs ?? enriched.HistoryLogs ?? null,
          };
        }
      }
    } catch {
      // fall back to the list row
    }
    setSelectedEtr(detail);
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
          <h1>{tr('Hồ sơ ETR của tôi')}</h1>
          <p className="welcome-sub">{tr('Danh sách các hồ sơ đào tạo điện tử (ETR) của bạn.')}</p>
        </div>
        <div className="student-welcome-right">
          <span className="welcome-role">
            {mapped.length} {tr('hồ sơ')} &middot; {mapped.filter(e => e.status === 'Completed').length} {tr('hoàn thành')}
          </span>
        </div>
      </section>

      {/* Tab Navigation */}
      <div className="student-tab-bar">
        <button
          type="button"
          className={`student-tab ${activeTab === 'list' ? 'active' : ''}`}
          onClick={() => setActiveTab('list')}
        >
          <svg width="14" height="14" viewBox="0 0 16 20" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M6.95 16L12.6 10.35L11.15 8.9L6.925 13.125L4.825 11.025L3.4 12.45L6.95 16ZM2 20C1.45 20 0.979167 19.8042 0.5875 19.4125C0.195833 19.0208 0 18.55 0 18V2C0 1.45 0.195833 0.979167 0.5875 0.5875C0.979167 0.195833 1.45 0 2 0H10L16 6V18C16 18.55 15.8042 19.0208 15.4125 19.4125C15.0208 19.8042 14.55 20 14 20H2Z" />
          </svg>
          <span>{tr('Danh sách ETR')}</span>
          <span className="student-tab-count">{mapped.length}</span>
        </button>
        <button
          type="button"
          className={`student-tab ${activeTab === 'history' ? 'active' : ''}`}
          onClick={() => setActiveTab('history')}
        >
          <svg width="14" height="14" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="9" cy="9" r="8" /><path d="M9 5v4l3 3" />
          </svg>
          <span>{tr('Lịch sử đào tạo')}</span>
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === 'history' ? (
        <section className="student-table-section">
          <div className="student-table-header">
            <div className="student-table-header-left">
              <p className="student-section-label">{tr('Lịch sử đào tạo')}</p>
              <h2>{tr('Toàn bộ quá trình đào tạo')}</h2>
            </div>
          </div>
          <TrainingHistory />
        </section>
      ) : (
        <>
          {/* Search */}
          <div className="student-search-bar">
            <span className="student-search-icon">
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                <path d="M16.6 18L10.3 11.7C9.8 12.1 9.225 12.4167 8.575 12.65C7.925 12.8833 7.23333 13 6.5 13C4.68333 13 3.14583 12.3708 1.8875 11.1125C0.629167 9.85417 0 8.31667 0 6.5C0 4.68333 0.629167 3.14583 1.8875 1.8875C3.14583 0.629167 4.68333 0 6.5 0C8.31667 0 9.85417 0.629167 11.1125 1.8875C12.3708 3.14583 13 4.68333 13 6.5C13 7.23333 12.8833 7.925 12.65 8.575C12.4167 9.225 12.1 9.8 11.7 10.3L18 16.6L16.6 18ZM6.5 11C7.75 11 8.8125 10.5625 9.6875 9.6875C10.5625 8.8125 11 7.75 11 6.5C11 5.25 10.5625 4.1875 9.6875 3.3125C8.8125 2.4375 7.75 2 6.5 2C5.25 2 4.1875 2.4375 3.3125 3.3125C2.4375 4.1875 2 5.25 2 6.5C2 7.75 2.4375 8.8125 3.3125 9.6875C4.1875 10.5625 5.25 11 6.5 11Z" fill="currentColor" />
              </svg>
            </span>
            <input type="text" placeholder={tr('Tìm kiếm theo mã hồ sơ, mã ghi danh...')} value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
            {searchTerm && (
              <button type="button" onClick={() => setSearchTerm('')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(0,33,71,0.35)', padding: 0, fontSize: '16px' }}>✕</button>
            )}
          </div>

          {/* List */}
          <section className="student-table-section">
            {loading ? (
              <div className="student-empty">{tr('Đang tải dữ liệu...')}</div>
            ) : filtered.length === 0 ? (
              <div className="student-empty">{searchTerm ? tr('Không tìm thấy hồ sơ phù hợp.') : tr('Bạn chưa có hồ sơ ETR nào.')}</div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <div className="student-table-grid" style={{ gridTemplateColumns: '48px 1.2fr 1.2fr 120px 140px 100px' }}>
                  <div className="student-table-cell student-table-cell--header">STT</div>
                  <div className="student-table-cell student-table-cell--header">{tr('Mã hồ sơ')}</div>
                  <div className="student-table-cell student-table-cell--header">{tr('Ghi danh')}</div>
                  <div className="student-table-cell student-table-cell--header">{tr('Ngày')}</div>
                  <div className="student-table-cell student-table-cell--header">{tr('Trạng thái')}</div>
                  <div className="student-table-cell student-table-cell--header student-table-cell--end">&nbsp;</div>

                  {filtered.map((e, idx) => (
                    <div className="student-table-row" key={e.id || idx} style={{ cursor: 'pointer' }} onClick={() => openDetail(etrs.find(r => (r.ETRCourseRecordId ?? r.etrCourseRecordId) === e.id) || etrs[idx])}>
                      <div className="student-table-cell student-table-cell--index">{idx + 1}</div>
                      <div className="student-table-cell student-table-cell--strong">{e.id ? `ETR #${e.id}` : `${tr('Hồ sơ #')}${idx + 1}`}</div>
                      <div className="student-table-cell">{e.enrollmentId ? `${tr('Mã GD: ')}${e.enrollmentId}` : '--'}</div>
                      <div className="student-table-cell">{formatDate(e.completedAt || e.verifiedAt || e.submittedAt)}</div>
                      <div className="student-table-cell"><Badge status={e.status} /></div>
                      <div className="student-table-cell student-table-cell--end">
                        <button className="action-btn" type="button" onClick={(e2) => { e2.stopPropagation(); openDetail(etrs.find(r => (r.ETRCourseRecordId ?? r.etrCourseRecordId) === e.id) || etrs[idx]); }}>
                          {tr('Chi tiết')}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
};

export default StudentMyETR;
