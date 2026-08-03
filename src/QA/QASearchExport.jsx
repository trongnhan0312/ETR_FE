import { useState, useCallback } from "react";
import { api } from "../utils/api";

const QASearchExport = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [results, setResults] = useState(null);
  const [searching, setSearching] = useState(false);
  const [message, setMessage] = useState({ type: "", text: "" });

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      setMessage({ type: "error", text: "Vui lòng nhập từ khóa tìm kiếm." });
      return;
    }
    setSearching(true);
    setMessage({ type: "", text: "" });
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

        // Enrich tên học viên (nếu backend phân quyền cho phép — nếu 403 sẽ fallback ETR #id)
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
        setMessage({
          type: "success",
          text: `Tìm thấy ${enriched.length} kết quả.`,
        });
      } else {
        setResults([]);
        setMessage({ type: "warning", text: "Không tìm thấy kết quả nào." });
      }
    } catch (err) {
      setMessage({ type: "error", text: "Tìm kiếm thất bại: " + (err.message || "") });
    } finally {
      setSearching(false);
    }
  };

  // Export endpoint chỉ cho role Admin/Audit/Academic — QA không có quyền (backend trả 403),
  // nên thông báo rõ thay vì gọi API.
  const handleExportPackage = useCallback(() => {
    setMessage({
      type: "error",
      text: "Tài khoản QA không có quyền xuất Training Package (chỉ Admin/Audit/Academic).",
    });
  }, []);

  const handleExportAudit = useCallback(() => {
    setMessage({
      type: "error",
      text: "Tài khoản QA không có quyền xuất Audit Trail (chỉ Admin/Audit/Academic).",
    });
  }, []);

  return (
    <div className="qa-shell">
      {message.text && (
        <div className={`tm-alert-banner ${message.type}`} style={{ marginBottom: "16px" }}>
          <p>{message.text}</p>
          <button onClick={() => setMessage({ type: "", text: "" })}>✕</button>
        </div>
      )}

      <section className="qa-page-card">
        <p className="qa-eyebrow">Compliance</p>
        <h1>Search and Export</h1>
        <p className="qa-page-description">
          Search historical and active ETRs, then export training packages for
          audit or management review.
        </p>
      </section>

      <section className="qa-table-card">
        <div className="qa-input-row">
          <input
            className="qa-input"
            placeholder="Search by learner, course, class, or ETR ID"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
          />
          <select
            className="qa-select"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="all">All Statuses</option>
            <option value="InProgress">In Progress</option>
            <option value="Submitted">Submitted</option>
            <option value="Verified">QA Verified</option>
            <option value="Completed">Completed</option>
            <option value="ReturnedForCorrection">Returned for Correction</option>
          </select>
          <button
            className="qa-btn"
            type="button"
            onClick={handleSearch}
            disabled={searching}
          >
            {searching ? "Searching..." : "Search ETR Records"}
          </button>
        </div>

        <div className="qa-divider" />

        {results !== null && (
          <div className="qa-list">
            {results.length === 0 ? (
              <div style={{ padding: "16px", textAlign: "center", color: "#64748b", fontStyle: "italic" }}>
                Không tìm thấy bản ghi nào.
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
                    </p>
                  </div>
                  <span className="qa-status neutral">Ready</span>
                </div>
              ))
            )}
          </div>
        )}

        <div className="qa-divider" />

        <div className="qa-list">
          <div className="qa-list-item">
            <div>
              <p className="qa-list-title">Search ETR Records</p>
              <p className="qa-list-desc">
                Use learner name, course code, date, or status.
              </p>
            </div>
            <span className="qa-status neutral">Ready</span>
          </div>
          <div className="qa-list-item">
            <div>
              <p className="qa-list-title">Export Training Package</p>
              <p className="qa-list-desc">
                Generate audit-ready PDF or archive outputs.
              </p>
            </div>
            <span className="qa-status neutral">Ready</span>
          </div>
          <div className="qa-list-item">
            <div>
              <p className="qa-list-title">Filter scope</p>
              <p className="qa-list-desc">
                Active records, historical records, and reviewed queues.
              </p>
            </div>
            <span className="qa-status neutral">Ready</span>
          </div>
        </div>

        <div className="qa-actions" style={{ marginTop: "18px" }}>
          <button
            className="qa-btn-secondary"
            type="button"
            onClick={handleExportPackage}
          >
            Export Training Package
          </button>
          <button
            className="qa-btn-ghost"
            type="button"
            onClick={handleExportAudit}
          >
            Export Audit Trail
          </button>
        </div>
      </section>
    </div>
  );
};

export default QASearchExport;
