import { useState, useCallback } from "react";
import { api } from "../utils/api";
import { useToast } from "../components/Toast";
import { useLanguage } from '../context/LanguageContext';

const QASearchExport = () => {
  const { tr, trEn } = useLanguage();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [results, setResults] = useState(null);
  const [searching, setSearching] = useState(false);

  // Toast notifications (thay banner tm-alert-banner cũ)
  const toast = useToast();

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      toast.error(tr("Thiếu từ khóa"));
      return;
    }
    setSearching(true);
    try {
      // Backend: GET /api/Search/etrs?query= — trả về các ETR record (kèm trạng thái thực)
      const data = await api
        .get(`/Search/etrs?query=${encodeURIComponent(searchQuery)}`)
        .catch(() => null);

      if (data && Array.isArray(data)) {
        // Lọc trạng thái phía client — backend không hỗ trợ tham số status
        const filtered =
          statusFilter === "all"
            ? data
            : data.filter((r) => (r.status || "") === statusFilter);

        // Backend /Search/etrs đã trả kèm StudentName/ClassName; enrich thêm họ tên đầy đủ nếu
        // tài khoản có quyền đọc Enrollments/UserProfiles (fallback vẫn giữ tên từ kết quả search).
        const [enrollments, profiles] = await Promise.all([
          api.get("/Enrollments").catch(() => []),
          api.get("/UserProfiles/learners").catch(() => []),
        ]);
        const enrollmentsArr = Array.isArray(enrollments) ? enrollments : [];
        const profilesArr = Array.isArray(profiles) ? profiles : [];
        const enriched = filtered.map((r) => {
          const enrollment = enrollmentsArr.find(
            (e) => e.enrollmentId === r.enrollmentId
          );
          const profile = enrollment
            ? profilesArr.find((p) => p.accountId === enrollment.accountId)
            : null;
          return { ...r, learnerName: profile?.fullName || "" };
        });

        setResults(enriched);
        toast.success(tr("Tìm kiếm hoàn tất"));
      } else {
        setResults([]);
        toast.info(tr("Không có kết quả"));
      }
    } catch (err) {
      toast.error(tr("Tìm kiếm thất bại"));
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
          <div className="qa-list">
            {results.length === 0 ? (
              <div style={{ padding: "16px", textAlign: "center", color: "#64748b", fontStyle: "italic" }}>
                {tr('Không tìm thấy bản ghi nào.')}
              </div>
            ) : (
              results.slice(0, 20).map((r, idx) => (
                <div key={idx} className="qa-list-item">
                  <div>
                    <p className="qa-list-title">
                      {r.learnerName || r.studentName || `ETR #${r.etrCourseRecordId || r.eTRCourseRecordId || ""}`}
                    </p>
                    <p className="qa-list-desc">
                      ETR #{r.etrCourseRecordId || r.eTRCourseRecordId || ""} - {r.status || ""}
                      {r.className ? ` · ${r.className}` : ""}
                    </p>
                  </div>
                  <span className="qa-status neutral">{trEn('Ready')}</span>
                </div>
              ))
            )}
          </div>
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
