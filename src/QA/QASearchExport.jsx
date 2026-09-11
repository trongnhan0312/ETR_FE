import { useState, useCallback } from "react";
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

const QASearchExport = () => {
  const { tr, trEn } = useLanguage();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [results, setResults] = useState(null);
  const [searching, setSearching] = useState(false);
  const [searchNonce, setSearchNonce] = useState(0);

  const resultsArr = Array.isArray(results) ? results : [];
  const { page, setPage, pageCount, pageItems, total } = usePagination(resultsArr, {
    pageSize: 10,
    resetKey: searchNonce,
  });

  // Toast notifications (thay banner tm-alert-banner cũ)
  const toast = useToast();

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

  // Export endpoint chỉ cho role Admin/Audit/Academic — QA không có quyền (backend trả 403),
  // nên thông báo rõ thay vì gọi API.
  const handleExportPackage = useCallback(() => {
    toast.error(tr("Không có quyền xuất"));
  }, [toast, tr]);

  const handleExportAudit = useCallback(() => {
    toast.error(tr("Không có quyền xuất"));
  }, [toast, tr]);

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
                  <div>
                    <p className="qa-list-title">
                      {r.studentName && r.studentName !== "-"
                        ? r.studentName
                        : r.learnerName || r.studentName || `ETR #${r.etrCourseRecordId || r.eTRCourseRecordId || ""}`}
                    </p>
                    <p className="qa-list-desc">
                      ETR #{r.etrCourseRecordId || r.eTRCourseRecordId || ""}
                      {r.classCode && r.classCode !== "-" ? ` · ${r.classCode}` : ""}
                      {r.className && r.className !== "-" && r.className !== r.classCode ? ` — ${r.className}` : ""}
                      {r.courseCode && r.courseCode !== "-" ? ` · ${r.courseCode}` : ""}
                    </p>
                  </div>
                  <span
                    className={`qa-status ${
                      r.status === "Completed" || r.status === "Verified"
                        ? "reviewed"
                        : r.status === "ReturnedForCorrection" || r.status === "Cancelled"
                          ? "rejected"
                          : "neutral"
                    }`}
                  >
                    {STATUS_LABELS[r.status] || r.status || "—"}
                  </span>
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

        <div className="qa-list">
          <div className="qa-list-item">
            <div>
              <p className="qa-list-title">{trEn('Search ETR Records')}</p>
              <p className="qa-list-desc">
                {trEn('Use learner name, course code, date, or status.')}
              </p>
            </div>
            <span className="qa-status neutral">{trEn('Ready')}</span>
          </div>
          <div className="qa-list-item">
            <div>
              <p className="qa-list-title">{trEn('Export Training Package')}</p>
              <p className="qa-list-desc">
                {trEn('Generate audit-ready PDF or archive outputs.')}
              </p>
            </div>
            <span className="qa-status neutral">{trEn('Ready')}</span>
          </div>
          <div className="qa-list-item">
            <div>
              <p className="qa-list-title">{trEn('Filter scope')}</p>
              <p className="qa-list-desc">
                {trEn('Active records, historical records, and reviewed queues.')}
              </p>
            </div>
            <span className="qa-status neutral">{trEn('Ready')}</span>
          </div>
        </div>

        <div className="qa-actions" style={{ marginTop: "18px" }}>
          <button
            className="qa-btn-secondary"
            type="button"
            onClick={handleExportPackage}
          >
            {trEn('Export Training Package')}
          </button>
          <button
            className="qa-btn-ghost"
            type="button"
            onClick={handleExportAudit}
          >
            {trEn('Export Audit Trail')}
          </button>
        </div>
      </section>
    </div>
  );
};

export default QASearchExport;
