import { useState, useCallback } from "react";
import { api } from "../utils/api";
import { useToast } from "../components/Toast";

const QASearchExport = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [results, setResults] = useState(null);
  const [searching, setSearching] = useState(false);

  // Toast notifications (thay banner tm-alert-banner cũ)
  const toast = useToast();

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      toast.error("Thiếu từ khóa", "Vui lòng nhập từ khóa tìm kiếm.");
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
        toast.success("Tìm kiếm hoàn tất", `Tìm thấy ${enriched.length} kết quả.`);
      } else {
        setResults([]);
        toast.info("Không có kết quả", "Không tìm thấy kết quả nào.");
      }
    } catch (err) {
      toast.error("Tìm kiếm thất bại", err.message || "Lỗi không xác định");
    } finally {
      setSearching(false);
    }
  };

  // Export endpoint chỉ cho role Admin/Audit/Academic — QA không có quyền (backend trả 403),
  // nên thông báo rõ thay vì gọi API.
  const handleExportPackage = useCallback(() => {
    toast.error("Không có quyền xuất", "Tài khoản QA không có quyền xuất Training Package (chỉ Admin/Audit/Academic).");
  }, [toast]);

  const handleExportAudit = useCallback(() => {
    toast.error("Không có quyền xuất", "Tài khoản QA không có quyền xuất Audit Trail (chỉ Admin/Audit/Academic).");
  }, [toast]);

  return (
    <div className="qa-shell">
      {/* Toast notifications */}
      <toast.ToastContainer />

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
                      {r.className ? ` · ${r.className}` : ""}
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
