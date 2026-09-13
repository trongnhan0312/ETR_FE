import { useState, useCallback } from "react";
import { createPortal } from "react-dom";
import { api } from "../utils/api";
import { useToast } from "../components/Toast";
import { useLanguage } from '../context/LanguageContext';
import { usePagination } from "../utils/usePagination";
import Pagination from "../components/Pagination";

// Nhãn hiển thị cho status enum trả về từ GET /api/Search/etrs (EtrStatus BE):
// Draft | InProgress | Submitted | Verified | Completed | ReturnedForCorrection | Cancelled
const STATUS_LABELS = {
  Draft: "Draft",
  InProgress: "In Progress",
  Submitted: "Submitted",
  Verified: "QA Verified",
  Completed: "Completed",
  ReturnedForCorrection: "Returned for Correction",
  Cancelled: "Cancelled",
};

// Role được phép export (BE: ExportsController [Authorize(Roles = "Admin,Audit,Academic")]).
// QA KHÔNG có quyền → nút Export phải nói rõ thay vì bấm vào rồi lỗi 403.
const EXPORT_ROLES = ['admin', 'audit', 'academic'];

const getCurrentRole = () => {
  try {
    const u = JSON.parse(localStorage.getItem('user') || '{}');
    return String(u?.roleName || u?.role || '').toLowerCase();
  } catch {
    return '';
  }
};

const QASearchExport = () => {
  const { tr, trEn } = useLanguage();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [results, setResults] = useState(null);
  const [searching, setSearching] = useState(false);
  const [searchNonce, setSearchNonce] = useState(0);

  // Chi tiết bản ghi (View Details) + Audit Trail tải song song.
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detail, setDetail] = useState(null);
  const [detailRow, setDetailRow] = useState(null);
  const [auditLogs, setAuditLogs] = useState([]);

  const resultsArr = Array.isArray(results) ? results : [];
  const { page, setPage, pageCount, pageItems, total } = usePagination(resultsArr, {
    pageSize: 10,
    resetKey: searchNonce,
  });

  // Toast notifications (thay banner tm-alert-banner cũ)
  const toast = useToast();

  const canExport = EXPORT_ROLES.includes(getCurrentRole());

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      toast.error(tr("Thiếu từ khóa"));
      return;
    }
    setSearching(true);
    try {
      // Backend: GET /api/Search/etrs?query= — trả về các ETR record (kèm trạng thái thực).
      // KHÔNG nuốt lỗi 404/403/network bằng .catch(() => null) nữa — khi endpoint lỗi
      // (deploy thiếu controller, sai quyền, server down) người dùng phải thấy lỗi rõ ràng
      // thay vì kết quả rỗng giả "không tìm thấy".
      const data = await api.get(`/Search/etrs?query=${encodeURIComponent(searchQuery)}`);

      const rows = Array.isArray(data)
        ? data
        : data && Array.isArray(data.items)
          ? data.items
          : [];

      // Lọc trạng thái phía client — backend không hỗ trợ tham số status.
      // So khớp cả giá trị enum BE (ReturnedForCorrection) lẫn nhãn FE (RETURNED FOR CORRECTION).
      const norm = (v) => String(v || "").toLowerCase().replace(/[\s_-]/g, "");
      const filtered =
        statusFilter === "all"
          ? rows
          : rows.filter(
              (r) =>
                norm(r.status) === norm(statusFilter) ||
                norm(STATUS_LABELS[r.status] || "") === norm(statusFilter),
            );

      setResults(filtered);
      setSearchNonce((n) => n + 1);
      if (filtered.length === 0) {
        toast.info(tr("Không có kết quả"));
      } else {
        toast.success(tr("Tìm kiếm hoàn tất"));
      }
    } catch (err) {
      setResults([]);
      setSearchNonce((n) => n + 1);
      toast.error(
        `${tr("Tìm kiếm thất bại")}: ${
          err?.message || tr("Lỗi không xác định từ máy chủ")
        }`,
      );
    } finally {
      setSearching(false);
    }
  };

  // ===== View Details: lấy đầy đủ ETR (subject results + evidence + approval) =====
  const openDetails = async (row) => {
    const id = row?.etrCourseRecordId ?? row?.eTRCourseRecordId;
    setDetailRow(row);
    setDetail(null);
    setAuditLogs([]);
    setDetailOpen(true);
    if (!id) return;
    setDetailLoading(true);
    try {
      // GET /Etr/{id} được phép cho QA (Instructor,QA,Admin,Audit,Academic,TrainingManager)
      // → trả subjectResults / evidenceFiles / approvalHistories mà /Search/etrs không có.
      const [etrDetail, logs] = await Promise.all([
        api.get(`/Etr/${id}`, { suppressAuthRedirect: true }).catch(() => null),
        api
          .get(`/Audit/search?query=${encodeURIComponent(id)}&page=1&pageSize=50`)
          .catch(() => []),
      ]);
      setDetail(etrDetail);
      setAuditLogs(Array.isArray(logs) ? logs : Array.isArray(logs?.items) ? logs.items : []);
    } catch (err) {
      toast.error(`${tr("Không tải được chi tiết")}: ${err?.message || ""}`);
    } finally {
      setDetailLoading(false);
    }
  };

  const closeDetails = () => {
    setDetailOpen(false);
    setDetail(null);
    setDetailRow(null);
    setAuditLogs([]);
  };

  // ===== Export Training Package (PDF) =====
  // Endpoint /Exports/* chỉ cho Admin/Audit/Academic; QA bị 403 nên chặn từ đầu + báo rõ.
  const handleExportPackage = useCallback((row) => {
    if (!canExport) {
      toast.error(
        tr("Tài khoản QA không có quyền xuất gói. Vui lòng dùng tài khoản Admin/Audit/Academic."),
      );
      return;
    }
    const id = row?.etrCourseRecordId ?? row?.eTRCourseRecordId;
    if (!id) {
      toast.error(tr("Không xác định được hồ sơ ETR để xuất."));
      return;
    }
    api
      .post("/Exports/pdf", { ETRCourseRecordId: Number(id) })
      .then(() => toast.success(tr("Đã tạo yêu cầu xuất gói.")))
      .catch((err) =>
        toast.error(`${tr("Xuất gói thất bại")}: ${err?.message || ""}`),
      );
  }, [canExport, toast, tr]);

  const handleExportAudit = useCallback((row) => {
    if (!canExport) {
      toast.error(
        tr("Tài khoản QA không có quyền xuất Audit Trail. Vui lòng dùng tài khoản Admin/Audit."),
      );
      return;
    }
    const id = row?.etrCourseRecordId ?? row?.eTRCourseRecordId;
    api
      .post("/Exports/pdf", { ETRCourseRecordId: id ? Number(id) : undefined })
      .then(() => toast.success(tr("Đã tạo yêu cầu xuất Audit Trail.")))
      .catch((err) =>
        toast.error(`${tr("Xuất Audit Trail thất bại")}: ${err?.message || ""}`),
      );
  }, [canExport, toast, tr]);

  const statusClass = (status) =>
    status === "Completed" || status === "Verified"
      ? "reviewed"
      : status === "ReturnedForCorrection" || status === "Cancelled"
        ? "rejected"
        : "neutral";

  return (
    <div className="qa-shell">
      {/* Toast notifications */}
      <toast.ToastContainer />

      <section className="qa-page-card">
        <p className="qa-eyebrow">{trEn('Compliance')}</p>
        <h1>{trEn('Search and Export')}</h1>
        <p className="qa-page-description">
          {trEn('Search historical and active ETRs, then export training packages for audit or management review.')}
        </p>
      </section>

      <section className="qa-table-card">
        <div className="qa-input-row">
          <input
            className="qa-input"
            placeholder={trEn('Search by learner, course, class, or ETR ID')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
          />
          <select
            className="qa-select"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="all">{trEn('All Statuses')}</option>
            <option value="InProgress">{trEn('In Progress')}</option>
            <option value="Submitted">{trEn('Submitted')}</option>
            <option value="Verified">{trEn('QA Verified')}</option>
            <option value="Completed">{trEn('Completed')}</option>
            <option value="ReturnedForCorrection">{trEn('Returned for Correction')}</option>
          </select>
          <button
            className="qa-btn"
            type="button"
            onClick={handleSearch}
            disabled={searching}
          >
            {searching ? trEn('Searching...') : trEn('Search ETR Records')}
          </button>
        </div>

        {/* Thông báo quyền hiển thị SẴN (không cần bấm mới biết): QA chỉ có quyền xem.
            BE ExportsController giới hạn Admin/Audit/Academic → tránh gọi API rồi nhận 403. */}
        {!canExport && (
          <div
            role="note"
            style={{
              display: "flex",
              alignItems: "flex-start",
              gap: "8px",
              margin: "12px 0 0",
              padding: "10px 12px",
              background: "#fff7ed",
              border: "1px solid #fed7aa",
              borderRadius: 10,
              fontSize: "12.5px",
              color: "#9a3412",
            }}
          >
            <span aria-hidden="true">🔒</span>
            <span>
              <strong>{tr('Tài khoản QA chỉ có quyền tra cứu/xem chi tiết.')}</strong>{" "}
              {tr('Chức năng Export Training Package và Download Audit Trail yêu cầu quyền Admin / Audit / Academic.')}
            </span>
          </div>
        )}

        <div className="qa-divider" />

        {results !== null && (
          <>
            <div className="qa-list">
              {results.length === 0 ? (
                <div style={{ padding: "16px", textAlign: "center", color: "#64748b", fontStyle: "italic" }}>
                  {tr('Không tìm thấy bản ghi nào.')}
                </div>
              ) : (
                pageItems.map((r, idx) => (
                  <div key={idx} className="qa-list-item">
                    <div
                      style={{ flex: 1, minWidth: 0, cursor: "pointer" }}
                      onClick={() => openDetails(r)}
                      title={trEn('View Details')}
                    >
                      <p className="qa-list-title">
                        {r.studentName && r.studentName !== "-"
                          ? r.studentName
                          : r.learnerName || `ETR #${r.etrCourseRecordId || r.eTRCourseRecordId || ""}`}
                      </p>
                      <p className="qa-list-desc">
                        ETR #{r.etrCourseRecordId || r.eTRCourseRecordId || ""}
                        {r.classCode && r.classCode !== "-" ? ` · ${r.classCode}` : ""}
                        {r.className && r.className !== "-" && r.className !== r.classCode ? ` — ${r.className}` : ""}
                        {r.courseCode && r.courseCode !== "-" ? ` · ${r.courseCode}` : ""}
                        {r.courseName && r.courseName !== "-" ? ` — ${r.courseName}` : ""}
                      </p>
                    </div>
                    <span className={`qa-status ${statusClass(r.status)}`}>
                      {STATUS_LABELS[r.status] || r.status || "—"}
                    </span>
                    {/* Action buttons rõ ràng cho từng bản ghi (thay badge "Ready" mơ hồ) */}
                    <div className="qa-actions" style={{ gap: "8px", flexShrink: 0 }}>
                      <button
                        className="qa-btn-secondary"
                        type="button"
                        onClick={() => openDetails(r)}
                        style={{ padding: "6px 10px", fontSize: "11px" }}
                      >
                        {trEn('View Details')}
                      </button>
                      <button
                        className="qa-btn-secondary"
                        type="button"
                        onClick={() => handleExportPackage(r)}
                        title={
                          canExport
                            ? trEn('Export Package (PDF)')
                            : tr('Không có quyền xuất (cần Admin/Audit/Academic)')
                        }
                        style={{
                          padding: "6px 10px",
                          fontSize: "11px",
                          opacity: canExport ? 1 : 0.55,
                          cursor: canExport ? "pointer" : "not-allowed",
                        }}
                      >
                        {canExport ? "" : "🔒 "}{trEn('Export Package (PDF)')}
                      </button>
                      <button
                        className="qa-btn-ghost"
                        type="button"
                        onClick={() => handleExportAudit(r)}
                        title={
                          canExport
                            ? trEn('Download Audit Trail')
                            : tr('Không có quyền xuất (cần Admin/Audit)')
                        }
                        style={{
                          padding: "6px 10px",
                          fontSize: "11px",
                          opacity: canExport ? 1 : 0.55,
                          cursor: canExport ? "pointer" : "not-allowed",
                        }}
                      >
                        {canExport ? "" : "🔒 "}{trEn('Download Audit Trail')}
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            <Pagination
              page={page}
              pageCount={pageCount}
              onChange={setPage}
              total={total}
              pageSize={10}
            />
          </>
        )}

        <div className="qa-divider" />

        {/* Hướng dẫn chức năng: thay 3 thẻ "Ready" mơ hồ bằng mô tả rõ từng khối */}
        <div style={{ padding: "4px 2px" }}>
          <p className="qa-eyebrow" style={{ marginBottom: "8px" }}>
            {trEn('What each section does')}
          </p>
          <ul style={{ margin: 0, paddingLeft: 18, fontSize: "12.5px", color: "#475569", lineHeight: 1.7 }}>
            <li>
              <strong>{trEn('Search ETR Records')}</strong> —{" "}
              {trEn('enter a learner, course, class code or ETR ID above, then press Search.')}
            </li>
            <li>
              <strong>{trEn('View Details')}</strong> —{" "}
              {trEn('open the record to inspect subject results, evidence and approval history.')}
            </li>
            <li>
              <strong>{trEn('Export Training Package (PDF)')}</strong> —{" "}
              {canExport
                ? trEn('generate the audit-ready package for the selected record.')
                : tr('Yêu cầu quyền Admin / Audit / Academic.')}
            </li>
            <li>
              <strong>{trEn('Download Audit Trail')}</strong> —{" "}
              {canExport
                ? trEn('export the approval/audit log attached to the record.')
                : tr('Yêu cầu quyền Admin / Audit.')}
            </li>
          </ul>
        </div>
      </section>

      {/* ===== Modal View Details ===== */}
      {detailOpen &&
        createPortal(
          <div
            style={{
              position: "fixed",
              inset: 0,
              width: "100vw",
              height: "100vh",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: "rgba(0,33,71,0.75)",
              zIndex: 999999,
              backdropFilter: "blur(4px)",
            }}
            onClick={closeDetails}
          >
            <div
              className="qa-panel"
              style={{
                width: "980px",
                maxWidth: "96vw",
                maxHeight: "92vh",
                margin: "auto",
                display: "flex",
                flexDirection: "column",
                borderRadius: "18px",
                overflow: "hidden",
                padding: 0,
                boxShadow: "0 25px 50px -12px rgba(0,0,0,0.35)",
              }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div
                style={{
                  background: "#002147",
                  padding: "16px 20px",
                  display: "flex",
                  alignItems: "center",
                  gap: "12px",
                  borderBottom: "3px solid #c5a059",
                  flexShrink: 0,
                }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <h3 style={{ margin: 0, fontSize: "15px", fontWeight: 700, color: "#fff" }}>
                    {trEn('ETR Details')} —{" "}
                    {detailRow?.studentName || detailRow?.learnerName || "—"}
                  </h3>
                  <p style={{ margin: "4px 0 0", fontSize: "12px", color: "rgba(255,255,255,0.65)" }}>
                    ETR #{detailRow?.etrCourseRecordId || detailRow?.eTRCourseRecordId || "—"}
                    {detailRow?.classCode ? ` · ${detailRow.classCode}` : ""}
                    {detailRow?.courseName ? ` · ${detailRow.courseName}` : ""}
                  </p>
                </div>
                <span className={`qa-status ${statusClass(detailRow?.status)}`}>
                  {STATUS_LABELS[detailRow?.status] || detailRow?.status || "—"}
                </span>
                <button
                  type="button"
                  onClick={closeDetails}
                  aria-label={tr('Close')}
                  style={{
                    background: "rgba(255,255,255,0.08)",
                    border: "none",
                    color: "#fff",
                    width: 32,
                    height: 32,
                    borderRadius: 8,
                    cursor: "pointer",
                    fontSize: 15,
                    lineHeight: 1,
                    flexShrink: 0,
                  }}
                >
                  ✕
                </button>
              </div>

              {/* Body */}
              <div style={{ padding: "18px 22px", overflow: "auto" }}>
                {detailLoading ? (
                  <p style={{ textAlign: "center", color: "#64748b", padding: "32px 0" }}>
                    {tr('Đang tải chi tiết...')}
                  </p>
                ) : (
                  <>
                    {/* Subject Results — nguồn thật từ GET /Etr/{id} (không còn "No subject result data") */}
                    <p className="qa-eyebrow">{trEn('SUBJECT RESULTS')}</p>
                    {Array.isArray(detail?.subjectResults) && detail.subjectResults.length > 0 ? (
                      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12.5px", marginBottom: "18px" }}>
                        <thead>
                          <tr style={{ background: "#f1f5f9" }}>
                            <th style={{ textAlign: "left", padding: "8px" }}>{trEn('Subject')}</th>
                            <th style={{ textAlign: "left", padding: "8px" }}>{trEn('Status')}</th>
                            <th style={{ textAlign: "left", padding: "8px" }}>{trEn('Score')}</th>
                            <th style={{ textAlign: "left", padding: "8px" }}>{trEn('Attendance')}</th>
                            <th style={{ textAlign: "left", padding: "8px" }}>{trEn('Signed Off')}</th>
                          </tr>
                        </thead>
                        <tbody>
                          {detail.subjectResults.map((sr, i) => (
                            <tr key={sr.subjectResultId ?? i} style={{ borderTop: "1px solid #e2e8f0" }}>
                              <td style={{ padding: "8px" }}>#{sr.subjectId ?? "—"}</td>
                              <td style={{ padding: "8px" }}>{sr.status ?? "—"}</td>
                              <td style={{ padding: "8px" }}>
                                {sr.score != null ? `${sr.score}%` : "—"}
                              </td>
                              <td style={{ padding: "8px" }}>
                                {sr.attendanceRate != null ? `${sr.attendanceRate}%` : "—"}
                              </td>
                              <td style={{ padding: "8px" }}>{sr.isSignedOff ? tr('Có') : tr('Chưa')}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    ) : (
                      <p style={{ color: "#64748b", fontSize: "12.5px" }}>{tr('Không có dữ liệu kết quả môn học.')}</p>
                    )}

                    {/* Evidence */}
                    <p className="qa-eyebrow">{trEn('EVIDENCE FILES')}</p>
                    {Array.isArray(detail?.evidenceFiles) && detail.evidenceFiles.length > 0 ? (
                      <ul style={{ margin: "0 0 18px", paddingLeft: 18, fontSize: "12.5px", color: "#334155" }}>
                        {detail.evidenceFiles.map((ev, i) => (
                          <li key={ev.evidenceFileId ?? i}>
                            {ev.fileUrl ? (
                              <a href={ev.fileUrl} target="_blank" rel="noreferrer" style={{ color: "#0369a1" }}>
                                {ev.fileName || `File #${i + 1}`}
                              </a>
                            ) : (
                              ev.fileName || `File #${i + 1}`
                            )}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p style={{ color: "#64748b", fontSize: "12.5px" }}>{tr('Chưa có minh chứng.')}</p>
                    )}

                    {/* Approval History */}
                    <p className="qa-eyebrow">{trEn('APPROVAL HISTORY')}</p>
                    {Array.isArray(detail?.approvalHistories) && detail.approvalHistories.length > 0 ? (
                      <ul style={{ margin: "0 0 18px", paddingLeft: 18, fontSize: "12.5px", color: "#334155" }}>
                        {detail.approvalHistories.map((h, i) => (
                          <li key={h.approvalHistoryId ?? i}>
                            <strong>{h.actionType || "—"}</strong>
                            {h.actionAt ? ` · ${new Date(h.actionAt).toLocaleString("vi-VN")}` : ""}
                            {h.comments ? ` — ${h.comments}` : ""}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p style={{ color: "#64748b", fontSize: "12.5px" }}>{tr('Chưa có lịch sử phê duyệt.')}</p>
                    )}

                    {/* Audit Trail */}
                    <p className="qa-eyebrow">{trEn('AUDIT TRAIL')}</p>
                    {auditLogs.length > 0 ? (
                      <ul style={{ margin: 0, paddingLeft: 18, fontSize: "12.5px", color: "#334155" }}>
                        {auditLogs.slice(0, 20).map((log, i) => (
                          <li key={log.auditLogId ?? i}>
                            <strong>{log.actionType || "—"}</strong>
                            {log.createdAt ? ` · ${new Date(log.createdAt).toLocaleString("vi-VN")}` : ""}
                            {log.entityName ? ` · ${log.entityName}` : ""}
                            {log.description ? ` — ${log.description}` : ""}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p style={{ color: "#64748b", fontSize: "12.5px" }}>{tr('Chưa có bản ghi audit cho hồ sơ này.')}</p>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
};

export default QASearchExport;
