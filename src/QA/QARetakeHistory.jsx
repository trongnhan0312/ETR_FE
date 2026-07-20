import { useState, useEffect } from "react";
import { api } from "../utils/api";

const QARetakeHistory = () => {
  const [retakes, setRetakes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [subjectFilter, setSubjectFilter] = useState("");
  const [profiles, setProfiles] = useState([]);
  const [subjectResults, setSubjectResults] = useState([]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [retakeData, profileData] = await Promise.all([
        api.get("/RetakeHistory").catch(() => []),
        api.get("/UserProfiles/learners").catch(() => []),
      ]);

      const retakesArr = Array.isArray(retakeData) ? retakeData : [];
      const profilesArr = Array.isArray(profileData) ? profileData : [];

      // Extract unique subject result IDs from retake history
      const uniqueSrIds = [...new Set(retakesArr.map(r => r.subjectResultId))];
      const srArr = uniqueSrIds.map(id => ({ subjectResultId: id }));

      setProfiles(profilesArr);
      setSubjectResults(srArr);

      const mapped = retakesArr.map((r) => {
        const sr = srArr.find((s) => s.subjectResultId === r.subjectResultId);
        return {
          id: r.retakeHistoryId,
          subjectResultId: r.subjectResultId,
          retakeDate: r.retakeDate
            ? new Date(r.retakeDate).toLocaleString("vi-VN")
            : "N/A",
          reason: r.reason || "—",
          previousScore: r.previousScore ?? 0,
          newScore: r.newScore ?? 0,
          scoreDiff: (r.newScore ?? 0) - (r.previousScore ?? 0),
          authorizedBy: `Account #${r.authorizedByAccountId}`,
          attemptNo: r.attemptNo ?? 1,
          srStatus: sr?.status || "Unknown",
        };
      });

      setRetakes(mapped);
    } catch (err) {
      console.error("Error loading retake history:", err);
    } finally {
      setLoading(false);
    }
  };

  const filteredRetakes = subjectFilter
    ? retakes.filter((r) => r.subjectResultId === parseInt(subjectFilter))
    : retakes;

  return (
    <div className="qa-shell">
      <section className="qa-page-card">
        <p className="qa-eyebrow">Compliance</p>
        <h1>Retake History</h1>
        <p className="qa-page-description">
          View all retake attempts for subject results. Track score changes and
          authorization details across all learners.
        </p>
      </section>

      <section className="qa-table-card">
        <div className="qa-table-header">
          <div>
            <h2>Retake Records ({retakes.length})</h2>
            <p className="qa-page-description">
              Each entry records a score change made after initial publication.
            </p>
          </div>
          <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
            <select
              className="qa-select"
              value={subjectFilter}
              onChange={(e) => setSubjectFilter(e.target.value)}
              style={{ minWidth: "160px" }}
            >
              <option value="">All Subject Results</option>
              {subjectResults.map((sr) => (
                <option key={sr.subjectResultId} value={sr.subjectResultId}>
                  SR #{sr.subjectResultId}
                </option>
              ))}
            </select>
            <button
              className="qa-btn-secondary"
              type="button"
              onClick={loadData}
              disabled={loading}
              style={{ padding: "6px 12px", fontSize: "11px" }}
            >
              Refresh
            </button>
          </div>
        </div>

        <div className="qa-list">
          {loading ? (
            <div
              style={{
                padding: "24px",
                textAlign: "center",
                color: "#64748b",
              }}
            >
              Đang tải...
            </div>
          ) : filteredRetakes.length === 0 ? (
            <div
              style={{
                padding: "24px",
                textAlign: "center",
                color: "#64748b",
                fontStyle: "italic",
              }}
            >
              Chưa có bản ghi retake nào.
            </div>
          ) : (
            filteredRetakes.map((entry, idx) => (
              <div key={idx} className="qa-list-item">
                <div style={{ flex: 1 }}>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                    }}
                  >
                    <p className="qa-list-title">
                      Subject Result #{entry.subjectResultId} — Attempt #{entry.attemptNo}
                    </p>
                    <span
                      className={`qa-chip ${
                        entry.scoreDiff >= 0 ? "green" : "red"
                      }`}
                      style={{
                        fontSize: "11px",
                        fontWeight: 700,
                        padding: "2px 8px",
                        borderRadius: "4px",
                        background:
                          entry.scoreDiff >= 0
                            ? "rgba(34, 197, 94, 0.1)"
                            : "rgba(239, 68, 68, 0.1)",
                        color:
                          entry.scoreDiff >= 0 ? "#15803d" : "#dc2626",
                      }}
                    >
                      {entry.scoreDiff >= 0 ? "+" : ""}
                      {entry.scoreDiff.toFixed(1)}
                    </span>
                  </div>
                  <p className="qa-list-desc">
                    {entry.retakeDate} — Reason: {entry.reason}
                  </p>
                  <p className="qa-list-desc" style={{ fontSize: "11px" }}>
                    Previous: {entry.previousScore} → New: {entry.newScore} |
                    Authorized: {entry.authorizedBy} | Status: {entry.srStatus}
                  </p>
                </div>
                <span className="qa-status neutral">
                  Attempt {entry.attemptNo}
                </span>
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
};

export default QARetakeHistory;
