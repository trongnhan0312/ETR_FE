import { useState, useCallback } from "react";
import { api } from "../utils/api";

const API_BASE_URL =
  import.meta.env.VITE_API_URL || "https://localhost:7169/api";

const QASearchExport = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [results, setResults] = useState(null);
  const [searching, setSearching] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [message, setMessage] = useState({ type: "", text: "" });

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      setMessage({ type: "error", text: "Vui lòng nhập từ khóa tìm kiếm." });
      return;
    }
    setSearching(true);
    setMessage({ type: "", text: "" });
    try {
      const data = await api
        .get(`/Search?q=${encodeURIComponent(searchQuery)}&status=${statusFilter}`)
        .catch(() => null);
      if (data && Array.isArray(data)) {
        setResults(data);
        setMessage({ type: "success", text: `Tìm thấy ${data.length} kết quả.` });
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

  const handleExportPackage = useCallback(async () => {
    setExporting(true);
    try {
      const result = await api.post("/Exports/training-package", {});
      if (result && result.exportJobId) {
        // Open download in new tab
        window.open(
          `${API_BASE_URL}/Exports/download/${result.exportJobId}`,
          "_blank"
        );
        setMessage({
          type: "success",
          text: `Gói training đã được xuất. Tải file: ${result.fileName || "training_package.zip"}`,
        });
      } else {
        setMessage({ type: "success", text: "Yêu cầu xuất gói training đã được tạo." });
      }
    } catch (err) {
      setMessage({ type: "error", text: "Xuất thất bại: " + (err.message || "") });
    } finally {
      setExporting(false);
    }
  }, []);

  const handleExportAudit = useCallback(async () => {
    setExporting(true);
    try {
      const result = await api.post("/Exports/pdf", {});
      if (result && result.exportJobId) {
        window.open(
          `${API_BASE_URL}/Exports/download/${result.exportJobId}`,
          "_blank"
        );
        setMessage({
          type: "success",
          text: `Audit trail PDF đã được xuất.`,
        });
      } else {
        setMessage({ type: "success", text: "Yêu cầu xuất audit trail đã được tạo." });
      }
    } catch (err) {
      setMessage({ type: "error", text: "Xuất thất bại: " + (err.message || "") });
    } finally {
      setExporting(false);
    }
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
            <option value="pending">Pending</option>
            <option value="reviewed">Reviewed</option>
            <option value="rejected">Rejected</option>
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
                      {r.courseName || r.className || ""} - {r.status || ""}
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
            disabled={exporting}
          >
            {exporting ? "Exporting..." : "Export Training Package"}
          </button>
          <button
            className="qa-btn-ghost"
            type="button"
            onClick={handleExportAudit}
            disabled={exporting}
          >
            Export Audit Trail
          </button>
        </div>
      </section>
    </div>
  );
};

export default QASearchExport;
