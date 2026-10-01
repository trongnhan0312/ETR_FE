import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { api } from '../utils/api';
import { useLanguage } from '../context/LanguageContext';
import { isEtrCompleted } from '../utils/etrStatus';
import { useSubViewBack } from '../utils/navigation';

const STATUS_MAP = {
  'In Progress': 'progress',
  'InProgress': 'progress',
  'Submitted': 'submitted',
  'Verified': 'verified',
  'Completed': 'completed',
  'Draft': 'draft',
  'Returned': 'returned',
  // Giá trị legacy BE vẫn trả về từ dữ liệu cũ (xem utils/etrStatus.js)
  'Approved': 'completed',
  'Rejected': 'returned',
  'Pending': 'submitted',
  'UnderReview': 'progress',
};

const STATUS_LABEL = {
  'In Progress': 'Đang đào tạo',
  'InProgress': 'Đang đào tạo',
  'Submitted': 'Đã nộp',
  'Verified': 'Đã thẩm định',
  'Completed': 'Hoàn thành',
  'Approved': 'Hoàn thành',
  'Draft': 'Nháp',
  'Returned': 'Trả lại',
  'ReturnedForCorrection': 'Trả lại để chỉnh sửa',
  'Rejected': 'Trả lại để chỉnh sửa',
  'Pending': 'Đã nộp',
  'UnderReview': 'Đang thẩm định',
};

// Thông điệp theo TỪNG trạng thái — trước đây mọi trạng thái khác Completed đều hiển thị
// "Hồ sơ đang trong quá trình đào tạo." nên hồ sơ đã SUBMITTED/VERIFIED/LOCKED vẫn bị hiểu là
// "đang xử lý" (kèm vòng tròn trạng thái giống loading vô tận).
const STATUS_MESSAGE = {
  'Completed': 'Hồ sơ đã hoàn thành và đóng băng. Dữ liệu đã được khóa vĩnh viễn.',
  'Verified': 'Hồ sơ đã được QA thẩm định và đang chờ phê duyệt cuối cùng.',
  'Submitted': 'Hồ sơ đã được nộp và đang chờ QA thẩm định.',
  'Returned': 'Hồ sơ đã bị trả lại để chỉnh sửa. Vui lòng kiểm tra ghi chú/phản hồi.',
  'ReturnedForCorrection': 'Hồ sơ đã bị trả lại để chỉnh sửa. Vui lòng kiểm tra ghi chú/phản hồi.',
  'Rejected': 'Hồ sơ đã bị từ chối/trả lại để chỉnh sửa. Vui lòng kiểm tra ghi chú/phản hồi.',
  'Draft': 'Hồ sơ đang ở dạng nháp, chưa được nộp.',
  'In Progress': 'Hồ sơ đang trong quá trình đào tạo.',
  'InProgress': 'Hồ sơ đang trong quá trình đào tạo.',
  'Approved': 'Hồ sơ đã được phê duyệt và đóng băng. Dữ liệu đã được khóa vĩnh viễn.',
  'Pending': 'Hồ sơ đã được nộp và đang chờ thẩm định.',
  'UnderReview': 'Hồ sơ đang được thẩm định.',
};

// Trạng thái đã "chốt" (không còn quay vòng đào tạo) → icon ✓ và không hiển thị như đang tải.
const DONE_STATUSES = ['Completed', 'Approved', 'Verified', 'Submitted'];

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

/* ── Course Version Readiness Check Section ── */
export const StudentReadinessCheckSection = ({ etrId, enrollmentId }) => {
  const { tr } = useLanguage();
  const [readiness, setReadiness] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchReadiness = async () => {
      try {
        setLoading(true);
        let data = null;
        if (etrId) {
          data = await api.get(`/etr/${etrId}/readiness`, { suppressAuthRedirect: true }).catch(() => null);
        }
        if (!data && enrollmentId) {
          data = await api.get(`/etr/enrollment/${enrollmentId}/readiness`, { suppressAuthRedirect: true }).catch(() => null);
        }
        setReadiness(data);
      } catch (err) {
        console.error("Lỗi khi tải đánh giá sẵn sàng:", err);
      } finally {
        setLoading(false);
      }
    };
    if (etrId || enrollmentId) {
      fetchReadiness();
    }
  }, [etrId, enrollmentId]);

  if (loading) {
    return (
      <section className="student-info-card" style={{ marginBottom: 24 }}>
        <p className="info-eyebrow">{tr('Đánh giá Mức độ Sẵn sàng')}</p>
        <h3>{tr('Kiểm tra Tính Sẵn sàng Hoàn thành Khóa học (Course Version Readiness)')}</h3>
        <p style={{ color: 'rgba(0,33,71,0.5)', fontSize: 13, marginTop: 8 }}>{tr('Đang kiểm tra dữ liệu...')}</p>
      </section>
    );
  }

  if (!readiness) return null;

  const conditions = readiness.conditions ?? readiness.Conditions ?? [];
  const warnings = readiness.warnings ?? readiness.Warnings ?? [];
  const overallStatus = readiness.overallStatus ?? readiness.OverallStatus ?? 'NoData';
  const flightHours = readiness.totalFlightHours ?? readiness.TotalFlightHours ?? 0;
  const simHours = readiness.totalSimulatorHours ?? readiness.TotalSimulatorHours ?? 0;
  const versionNo = readiness.courseVersionNo ?? readiness.CourseVersionNo ?? 1;

  const getStatusBadge = (status) => {
    switch (status) {
      case 'Met':
        return <span style={{ background: '#dcfce7', color: '#15803d', padding: '3px 8px', borderRadius: 6, fontSize: 12, fontWeight: 700 }}>✓ {tr('Đạt')}</span>;
      case 'NotMet':
        return <span style={{ background: '#fee2e2', color: '#b91c1c', padding: '3px 8px', borderRadius: 6, fontSize: 12, fontWeight: 700 }}>✗ {tr('Chưa đạt')}</span>;
      case 'NoData':
        return <span style={{ background: '#f1f5f9', color: '#64748b', padding: '3px 8px', borderRadius: 6, fontSize: 12, fontWeight: 700 }}>ℹ {tr('Chưa có dữ liệu')}</span>;
      case 'ReviewRequired':
        return <span style={{ background: '#fef3c7', color: '#b45309', padding: '3px 8px', borderRadius: 6, fontSize: 12, fontWeight: 700 }}>⚠ {tr('Cần rà soát')}</span>;
      default:
        return <span style={{ background: '#f1f5f9', color: '#64748b', padding: '3px 8px', borderRadius: 6, fontSize: 12, fontWeight: 700 }}>{status}</span>;
    }
  };

  const getOverallBadge = (status) => {
    switch (status) {
      case 'Met':
        return <span style={{ background: '#16a34a', color: '#ffffff', padding: '4px 12px', borderRadius: 20, fontSize: 13, fontWeight: 700 }}>✓ {tr('Đủ điều kiện hoàn thành')}</span>;
      case 'ReviewRequired':
        return <span style={{ background: '#d97706', color: '#ffffff', padding: '4px 12px', borderRadius: 20, fontSize: 13, fontWeight: 700 }}>⚠ {tr('Cần rà soát trước khi nộp')}</span>;
      case 'NoData':
        return <span style={{ background: '#64748b', color: '#ffffff', padding: '4px 12px', borderRadius: 20, fontSize: 13, fontWeight: 700 }}>ℹ {tr('Chưa đủ dữ liệu đánh giá')}</span>;
      default:
        return <span style={{ background: '#dc2626', color: '#ffffff', padding: '4px 12px', borderRadius: 20, fontSize: 13, fontWeight: 700 }}>✗ {tr('Chưa đủ điều kiện hoàn thành')}</span>;
    }
  };

  return (
    <section className="student-info-card" style={{ marginBottom: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <p className="info-eyebrow">{tr('Đánh giá Mức độ Sẵn sàng')}</p>
          <h3 style={{ margin: '2px 0 4px' }}>{tr('Kiểm tra Tính Sẵn sàng Hoàn thành Khóa học')}</h3>
          <p style={{ fontSize: 12, color: 'rgba(0,33,71,0.6)', margin: 0 }}>
            {tr('Đối chiếu theo Giáo trình:')} <strong>{readiness.courseName ?? readiness.CourseName}</strong> ({tr('Phiên bản')} <span style={{ color: '#0369a1', fontWeight: 700 }}>#{versionNo}</span>)
          </p>
        </div>
        <div>
          {getOverallBadge(overallStatus)}
        </div>
      </div>

      {/* Snapshot Information Banner (P1-05 & Phase 4) */}
      <div style={{
        marginTop: 12,
        padding: '10px 14px',
        borderRadius: 8,
        background: '#f0f9ff',
        border: '1px solid #bae6fd',
        fontSize: 12,
        color: '#0369a1',
        display: 'flex',
        alignItems: 'center',
        gap: 8,
      }}>
        <span>📌</span>
        <span>
          <strong>{tr('Cơ chế Snapshot Giáo trình:')}</strong> {tr('Hồ sơ ETR này được gắn cố định với phiên bản')} <strong>v{versionNo}</strong> {tr('của khóa học tại thời điểm ghi danh. Mọi điều kiện hoàn thành hiển thị bên dưới áp dụng theo snapshot này, không bị thay đổi hồi tố khi giáo trình cập nhật phiên bản mới.')}
        </span>
      </div>

      {/* Summary KPI Pills */}
      <div style={{ display: 'flex', gap: 16, marginTop: 16, flexWrap: 'wrap' }}>
        <div style={{ flex: '1 1 200px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, padding: '10px 14px' }}>
          <div style={{ fontSize: 11, color: '#64748b', fontWeight: 600 }}>{tr('Giờ bay thực tế hợp lệ')}</div>
          <div style={{ fontSize: 18, fontWeight: 700, color: '#0369a1', marginTop: 2 }}>{Number(flightHours).toFixed(1)} {tr('giờ')}</div>
        </div>
        <div style={{ flex: '1 1 200px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, padding: '10px 14px' }}>
          <div style={{ fontSize: 11, color: '#64748b', fontWeight: 600 }}>{tr('Giờ buồng lái mô phỏng (FSTD)')}</div>
          <div style={{ fontSize: 18, fontWeight: 700, color: '#0284c7', marginTop: 2 }}>{Number(simHours).toFixed(1)} {tr('giờ')}</div>
        </div>
      </div>

      {/* Conditions Table */}
      <div style={{ overflowX: 'auto', marginTop: 16 }}>
        <table className="student-subject-table">
          <thead>
            <tr>
              <th>{tr('Điều kiện giáo trình')}</th>
              <th>{tr('Hiện tại / Chỉ tiêu')}</th>
              <th>{tr('Trạng thái')}</th>
              <th>{tr('Giải thích chi tiết')}</th>
            </tr>
          </thead>
          <tbody>
            {conditions.map((c, idx) => {
              const name = c.conditionName ?? c.ConditionName;
              const status = c.status ?? c.Status;
              const cur = c.currentValue ?? c.CurrentValue;
              const th = c.thresholdValue ?? c.ThresholdValue;
              const unit = c.unit ?? c.Unit ?? '';
              const expl = c.explanation ?? c.Explanation;

              let targetStr = '--';
              if (cur !== null && cur !== undefined && th !== null && th !== undefined) {
                targetStr = `${cur} / ${th} ${unit}`.trim();
              } else if (th !== null && th !== undefined) {
                targetStr = `≥ ${th} ${unit}`.trim();
              } else if (cur !== null && cur !== undefined) {
                targetStr = `${cur} ${unit}`.trim();
              }

              return (
                <tr key={c.conditionCode || idx}>
                  <td style={{ fontWeight: 700, color: '#002147' }}>{name}</td>
                  <td style={{ fontWeight: 600, color: '#334155' }}>{targetStr}</td>
                  <td>{getStatusBadge(status)}</td>
                  <td style={{ fontSize: 12, color: '#475569' }}>{expl}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Warnings & Signals Section */}
      {warnings.length > 0 && (
        <div style={{ marginTop: 16, padding: '12px 16px', borderRadius: 8, background: '#fffbeb', border: '1px solid #fef3c7' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 700, color: '#92400e', fontSize: 13, marginBottom: 8 }}>
            <span>⚠</span> {tr('Cảnh báo & Lưu ý Hồ sơ Năng định (Tham chiếu — Không chặn bay)')}
          </div>
          <ul style={{ margin: 0, paddingLeft: 18, fontSize: 12, color: '#78350f', lineHeight: 1.6 }}>
            {warnings.map((w, idx) => (
              <li key={w.warningCode || idx}>
                <strong>{w.category ?? w.Category}:</strong> {w.message ?? w.Message}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Disclaimer */}
      <p style={{ fontSize: 11, color: '#94a3b8', marginTop: 12, marginBottom: 0, fontStyle: 'italic' }}>
        * {readiness.disclaimer ?? readiness.Disclaimer ?? tr('Đánh giá mức độ sẵn sàng đào tạo dựa trên dữ liệu ETR và phiên bản giáo trình áp dụng. Đây là tín hiệu tham chiếu, không thay thế quyết định phê duyệt chuyên môn hoặc cấp phép bay.')}
      </p>
    </section>
  );
};

/* ── Flight & Simulator Training Log Section ── */
const StudentFlightSimLogSection = ({ enrollmentId }) => {
  const { tr } = useLanguage();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [signingId, setSigningId] = useState(null);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const fetchRecords = async () => {
    if (!enrollmentId) return;
    try {
      setLoading(true);
      const res = await api.get(`/attendance/enrollment/${enrollmentId}`).catch(() => []);
      setLogs(res || []);
    } catch (err) {
      console.error("Lỗi khi tải nhật ký đào tạo:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecords();
  }, [enrollmentId]);

  const handleStudentSign = async (recordId) => {
    try {
      setSigningId(recordId);
      setErrorMsg("");
      await api.post(`/attendance/${recordId}/student-sign`, {
        comments: "Học viên xác nhận nội dung bài học và giờ huấn luyện.",
      });
      setSuccessMsg(tr("Ký xác nhận huấn luyện thành công!"));
      await fetchRecords();
    } catch (err) {
      console.error("Lỗi khi ký:", err);
      setErrorMsg(err.response?.data?.message || err.message || tr("Ký xác nhận thất bại!"));
    } finally {
      setSigningId(null);
    }
  };

  if (loading) {
    return (
      <section className="student-info-card" style={{ marginBottom: 24 }}>
        <p className="info-eyebrow">{tr('Nhật ký Đào tạo')}</p>
        <h3>{tr('Nhật ký Huấn luyện Bay & Buồng lái Mô phỏng')}</h3>
        <p style={{ color: 'rgba(0,33,71,0.5)', fontSize: 13, marginTop: 8 }}>{tr('Đang tải dữ liệu...')}</p>
      </section>
    );
  }

  const trainingRecords = (logs || []).filter(
    (r) =>
      r.sessionTrainingType === 'Flight' ||
      r.sessionTrainingType === 'Simulator' ||
      r.flightHours > 0 ||
      r.simulatorHours > 0 ||
      r.aircraftRegistration ||
      r.simulatorDevice
  );

  return (
    <section className="student-info-card" style={{ marginBottom: 24 }}>
      <p className="info-eyebrow">{tr('Nhật ký Đào tạo')}</p>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h3>{tr('Nhật ký Huấn luyện Bay & Mô phỏng (Flight / SIM Log)')}</h3>
        {successMsg && (
          <span style={{ fontSize: 12, color: '#16a34a', fontWeight: 700 }}>
            ✓ {successMsg}
          </span>
        )}
        {errorMsg && (
          <span style={{ fontSize: 12, color: '#dc2626', fontWeight: 700 }}>
            ⚠ {errorMsg}
          </span>
        )}
      </div>

      {trainingRecords.length > 0 ? (
        <div style={{ overflowX: 'auto', marginTop: 12 }}>
          <table className="student-subject-table">
            <thead>
              <tr>
                <th>{tr('Bài học')}</th>
                <th>{tr('Loại')}</th>
                <th>{tr('Giờ HL')}</th>
                <th>{tr('Chi tiết giờ (Dual/Solo/PIC/Night/Inst/XC)')}</th>
                <th>{tr('Hạ cánh')}</th>
                <th>{tr('Tàu / Thiết bị')}</th>
                <th>{tr('Hành trình / Bài bay')}</th>
                <th>{tr('Đánh giá')}</th>
                <th>{tr('Xác nhận GV')}</th>
                <th style={{ textAlign: 'center' }}>{tr('Học viên Ký')}</th>
              </tr>
            </thead>
            <tbody>
              {trainingRecords.map((r, idx) => (
                <tr key={r.attendanceRecordId || idx}>
                  <td style={{ fontWeight: 700, color: '#002147' }}>
                    {r.sessionLessonCode || `Lession #${idx + 1}`}
                  </td>
                  <td>
                    <span style={{
                      fontSize: 11,
                      fontWeight: 700,
                      padding: '2px 8px',
                      borderRadius: 6,
                      background: r.sessionTrainingType === 'Flight' ? 'rgba(3, 105, 161, 0.1)' : 'rgba(147, 51, 234, 0.1)',
                      color: r.sessionTrainingType === 'Flight' ? '#0369a1' : '#7e22ce'
                    }}>
                      {r.sessionTrainingType === 'Flight' ? '✈️ Bay' : '🕹️ SIM'}
                    </span>
                  </td>
                  <td style={{ fontWeight: 700, color: '#002147' }}>
                    {r.sessionTrainingType === 'Flight'
                      ? (r.flightHours != null ? `${r.flightHours}h` : '--')
                      : (r.simulatorHours != null ? `${r.simulatorHours}h` : '--')}
                  </td>
                  <td style={{ fontSize: 11, color: '#475569' }}>
                    {[
                      r.dualHours != null && `Dual: ${r.dualHours}h`,
                      r.soloHours != null && `Solo: ${r.soloHours}h`,
                      r.picHours != null && `PIC: ${r.picHours}h`,
                      r.nightHours != null && `Night: ${r.nightHours}h`,
                      r.instrumentHours != null && `Inst: ${r.instrumentHours}h`,
                      r.crossCountryHours != null && `XC: ${r.crossCountryHours}h`,
                    ].filter(Boolean).join(' | ') || '--'}
                  </td>
                  <td style={{ fontSize: 12 }}>
                    {r.dayLandings != null || r.nightLandings != null
                      ? `${r.dayLandings || 0} ngày / ${r.nightLandings || 0} đêm`
                      : '--'}
                  </td>
                  <td style={{ fontSize: 12 }}>
                    {r.aircraftRegistration || r.simulatorDevice || '--'}
                  </td>
                  <td style={{ fontSize: 12 }}>
                    {r.departureIcao || r.arrivalIcao
                      ? `${r.departureIcao || '-'} ➔ ${r.arrivalIcao || '-'} ${r.route ? `(${r.route})` : ''}`
                      : r.route || '--'}
                  </td>
                  <td>
                    <span style={{
                      fontSize: 11,
                      fontWeight: 700,
                      padding: '2px 8px',
                      borderRadius: 6,
                      background: r.performanceGrade === 'Satisfactory' ? 'rgba(16, 185, 129, 0.15)' : r.performanceGrade === 'Unsatisfactory' ? 'rgba(239, 68, 68, 0.15)' : 'rgba(245, 158, 11, 0.15)',
                      color: r.performanceGrade === 'Satisfactory' ? '#059669' : r.performanceGrade === 'Unsatisfactory' ? '#dc2626' : '#d97706'
                    }}>
                      {r.performanceGrade || 'Satisfactory'}
                    </span>
                  </td>
                  <td style={{ fontSize: 11 }}>
                    {r.instructorSignedAt ? (
                      <span style={{ color: '#16a34a', fontWeight: 700 }}>
                        ✓ {formatDate(r.instructorSignedAt)}
                      </span>
                    ) : (
                      <span style={{ color: '#94a3b8' }}>Chưa ký</span>
                    )}
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    {r.studentSignedAt ? (
                      <span style={{ color: '#0284c7', fontWeight: 700, fontSize: 11 }}>
                        ✓ {formatDate(r.studentSignedAt)}
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleStudentSign(r.attendanceRecordId)}
                        disabled={signingId === r.attendanceRecordId}
                        style={{
                          padding: '4px 10px',
                          borderRadius: 6,
                          border: 'none',
                          background: '#0284c7',
                          color: '#ffffff',
                          fontSize: 11,
                          fontWeight: 700,
                          cursor: 'pointer',
                        }}
                      >
                        {signingId === r.attendanceRecordId ? tr('Đang ký...') : tr('✍️ Ký điện tử')}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p style={{ color: 'rgba(0,33,71,0.5)', fontSize: 13, marginTop: 8 }}>
          {tr('Chưa có bản ghi huấn luyện bay hoặc mô phỏng nào trong khóa học này.')}
        </p>
      )}
    </section>
  );
};

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

        {/* Status Summary — render đúng theo TỪNG trạng thái (SUBMITTED/VERIFIED/LOCKED...),
            không còn hiển thị chung chung "đang trong quá trình" cho mọi trạng thái. */}
        <div className="student-info-card student-info-card--center">
          <div className={`student-status-icon ${DONE_STATUSES.includes(s.status) || s.isLocked ? 'student-status-icon--done' : 'student-status-icon--pending'}`}>
            {DONE_STATUSES.includes(s.status) || s.isLocked ? '✓' : '○'}
          </div>
          <p className="student-status-text">
            {tr(STATUS_MESSAGE[s.status] || STATUS_MESSAGE['In Progress'])}
          </p>
          {s.isLocked && (
            <p style={{ margin: '6px 0 0', fontSize: 12, fontWeight: 700, color: '#15803d' }}>
              🔒 {tr('Hồ sơ đã được KHÓA (Locked)!')}
            </p>
          )}
        </div>
      </section>

      {/* Subject Results */}
      <section className="student-info-card" style={{ marginBottom: 24 }}>
        <p className="info-eyebrow">{tr('Kết quả môn học')}</p>
        <h3>{tr('Kết quả')}</h3>
        <p style={{ fontSize: 12, color: 'rgba(0,33,71,0.6)', margin: '4px 0 8px' }}>
          <span style={{ color: '#15803d', fontWeight: 700 }}>{tr('GIỮ NGUYÊN')}</span>
          {' — '}{tr('môn đã Pass/Exempted được giữ kết quả từ lần học trước')}
          {' · '}
          <span style={{ color: '#d97706', fontWeight: 700 }}>{tr('CẦN HỌC LẠI')}</span>
          {' — '}{tr('môn chưa Pass phải học/thi lại trong kỳ này')}
        </p>
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
                // Retake tracking (2026-08): IsCarriedOver = true → môn được giữ nguyên kết quả
                // từ lần học trước (đã Pass/Exempted); false → môn đang phải học/thi lại.
                const carried = sr.IsCarriedOver ?? sr.isCarriedOver ?? null;
                return (
                <tr key={idx}>
                  <td style={{ fontWeight: 600, color: '#002147' }}>
                    {sr.SubjectName ?? sr.subjectName ?? `${tr('Môn #')}${sr.SubjectId ?? sr.subjectId ?? idx + 1}`}
                    {carried != null && (
                      <span
                        style={{
                          display: 'inline-block',
                          marginLeft: 8,
                          padding: '2px 8px',
                          borderRadius: 999,
                          fontSize: 10,
                          fontWeight: 700,
                          letterSpacing: '0.04em',
                          verticalAlign: 'middle',
                          ...(carried
                            ? { background: 'rgba(34,197,94,0.12)', color: '#15803d' }
                            : { background: 'rgba(217,119,6,0.12)', color: '#d97706' }),
                        }}
                      >
                        {carried ? tr('GIỮ NGUYÊN') : tr('CẦN HỌC LẠI')}
                      </span>
                    )}
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
            {s.detailLoaded === false
              ? tr('Kết quả môn học sẽ hiển thị khi hồ sơ được thẩm định xong.')
              : tr('Không có dữ liệu kết quả môn học.')}
          </p>
        )}
      </section>

      {/* Course Version Readiness Check */}
      <StudentReadinessCheckSection etrId={s.id} enrollmentId={s.enrollmentId} />

      {/* Flight & Simulator Training Log */}
      {s.enrollmentId && (
        <StudentFlightSimLogSection enrollmentId={s.enrollmentId} />
      )}

      {/* Evidences */}
      {s.evidences && s.evidences.length > 0 && (
        <section className="student-info-card" style={{ marginBottom: 24 }}>
          <p className="info-eyebrow">{tr('Minh chứng')}</p>
          <h3>{tr('Tệp tin')}</h3>
          <div className="student-evidence-list">
            {s.evidences.map((ev, idx) => {
              const fUrl = ev.FileUrl ?? ev.fileUrl;
              const fName = ev.FileName ?? ev.fileName ?? ev.EvidenceTypeName ?? ev.evidenceTypeName ?? `${tr('Tệp #')}${idx + 1}`;
              return fUrl ? (
                <a
                  key={idx}
                  href={fUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="student-evidence-chip"
                  style={{ textDecoration: 'none', color: 'inherit', cursor: 'pointer' }}
                >
                  <svg width="12" height="14" viewBox="0 0 12 14" fill="none"><path d="M0 14V0H8L12 4V14H0ZM7 5V1H1V13H11V5H7ZM1 1V5V1V5V13V1Z" fill="currentColor" opacity="0.5" /></svg>
                  {fName} ↗
                </a>
              ) : (
                <span key={idx} className="student-evidence-chip">
                  <svg width="12" height="14" viewBox="0 0 12 14" fill="none"><path d="M0 14V0H8L12 4V14H0ZM7 5V1H1V13H11V5H7ZM1 1V5V1V5V13V1Z" fill="currentColor" opacity="0.5" /></svg>
                  {fName}
                </span>
              );
            })}
          </div>
        </section>
      )}

      {/* Audit History */}
      {s.historyLogs && s.historyLogs.length > 0 && (
        <section className="student-info-card" style={{ marginBottom: 24 }}>
          <p className="info-eyebrow">{tr('Lịch sử')}</p>
          <h3>{tr('Audit Trail')}</h3>
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
        const isCompleted = isEtrCompleted(record.status);
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
                    <span className="student-history-label">{tr('ETR trước')}</span>
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
  const navigate = useNavigate();
  const location = useLocation();
  const { tr } = useLanguage();
  const [etrs, setEtrs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedEtr, setSelectedEtr] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('list'); // 'list' or 'history'

  const handleBackToList = () => {
    setSelectedEtr(null);
    if (location.state?.selectedEtrId) {
      navigate(".", {
        replace: true,
        state: {
          ...(location.state || {}),
          selectedEtrId: null,
        },
      });
    }
  };

  useSubViewBack(!!selectedEtr, handleBackToList);

  useEffect(() => {
    if (!location.state?.selectedEtrId && selectedEtr) {
      setSelectedEtr(null);
    }
  }, [location.state?.selectedEtrId]);

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
    let loaded = false;
    try {
      if (id) {
        const enriched = await api
          .get(`/Etr/${id}`, { suppressAuthRedirect: true })
          .catch(() => null);
        if (enriched) {
          loaded = true;
          // EtrDetailsResponse: SubjectResults, EvidenceFiles, ApprovalHistories →
          // DetailView expects subjectResults / evidences / historyLogs.
          const subjects = Array.isArray(enriched.SubjectResults ?? enriched.subjectResults)
            ? (enriched.SubjectResults ?? enriched.subjectResults).map((sr) => ({
                ...sr,
                SubjectId: sr.SubjectId ?? sr.subjectId,
                SubjectName: sr.SubjectName ?? sr.subjectName,
                Score: sr.Score ?? sr.score ?? sr.AssessmentScore ?? sr.assessmentScore,
                PracticalScore: sr.PracticalScore ?? sr.practicalScore,
                AttendanceRate: sr.AttendanceRate ?? sr.attendanceRate,
                IsPassed: sr.IsPassed ?? sr.isPassed ?? sr.IsSignedOff ?? sr.isSignedOff ?? (Number(sr.Score ?? sr.score ?? 0) >= 50),
              }))
            : null;
          const evidences = Array.isArray(enriched.EvidenceFiles ?? enriched.evidenceFiles)
            ? (enriched.EvidenceFiles ?? enriched.evidenceFiles).map((ev) => ({
                ...ev,
                FileName: ev.FileName ?? ev.fileName,
                FileUrl: ev.FileUrl ?? ev.fileUrl,
              }))
            : null;
          const historyLogs = Array.isArray(enriched.ApprovalHistories ?? enriched.approvalHistories)
            ? (enriched.ApprovalHistories ?? enriched.approvalHistories).map((h) => ({
                ...h,
                Description: h.ActionType ?? h.actionType ?? h.Comment ?? h.comments,
                Timestamp: h.ActionAt ?? h.actionAt ?? h.CreatedAt ?? h.createdAt,
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
    // Cờ cho biết đã lấy được chi tiết đầy đủ (/Etr/{id}) hay chưa — dùng để hiển thị thông báo
    // chính xác thay vì "Không có dữ liệu kết quả môn học" gây hiểu nhầm khi API bị chặn (403).
    setSelectedEtr({ ...detail, detailLoaded: loaded });
    navigate(".", {
      replace: false,
      state: {
        ...(location.state || {}),
        selectedEtrId: id,
      },
    });
  };

  const mapped = etrs.map(mapEtr);

  const filtered = mapped.filter((e) => {
    const term = searchTerm.toLowerCase().trim();
    if (!term) return true;
    return String(e.id).includes(term) || String(e.enrollmentId).includes(term);
  });

  // Detail view
  if (selectedEtr) {
    return <DetailView etr={selectedEtr} onBack={handleBackToList} />;
  }

  // List view
  return (
    <div className="page-shell">
      {/* Header */}
      <section className="student-welcome" style={{ marginBottom: 20 }}>
        <div className="student-welcome-left">
          <p className="eyebrow">{tr('Student Portal')}</p>
          <h1>{tr('Hồ sơ ETR của tôi')}</h1>
          <p className="welcome-sub">{tr('Danh sách các hồ sơ đào tạo điện tử (ETR) của bạn.')}</p>
        </div>
        <div className="student-welcome-right">
          <span className="welcome-role">
            {mapped.length} {tr('hồ sơ')} &middot; {mapped.filter(e => isEtrCompleted(e.status)).length} {tr('hoàn thành')}
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
                  <div className="student-table-cell student-table-cell--header">{tr('STT')}</div>
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
