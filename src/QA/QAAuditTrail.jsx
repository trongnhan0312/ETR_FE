import { useState, useEffect } from "react";
import { api } from "../utils/api";

const QAAuditTrail = () => {
  const [auditEntries, setAuditEntries] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAudit();
  }, []);

  const loadAudit = async () => {
    setLoading(true);
    try {
      const data = await api.get("/Audit").catch(() => []);
      const audits = Array.isArray(data) ? data : [];
      const mapped = audits.slice(0, 50).map((a) => ({
        time: a.recordedAt
          ? new Date(a.recordedAt).toLocaleString("vi-VN")
          : "N/A",
        actor: `Account #${a.accountId || "System"}`,
        action: a.actionType || a.entityName || "UPDATE",
        detail:
          a.description ||
          `${a.actionType || "Cập nhật"} ${a.entityName || "hồ sơ"} #${a.recordId || ""}`,
      }));
      setAuditEntries(mapped);
    } catch (err) {
      console.error("Error loading audit:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="qa-shell">
      <section className="qa-page-card">
        <p className="qa-eyebrow">Compliance</p>
        <h1>Audit Trail</h1>
        <p className="qa-page-description">
          View activity history of ETRs and users so QA decisions can be traced
          during review and audit.
        </p>
      </section>

      <section className="qa-table-card">
        <div className="qa-table-header">
          <div>
            <h2>Recent Activity ({auditEntries.length})</h2>
            <p className="qa-page-description">
              Use this page to confirm who reviewed, verified, returned, or
              exported each record.
            </p>
          </div>
          <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
            <button
              className="qa-btn-secondary"
              type="button"
              onClick={loadAudit}
              disabled={loading}
              style={{ padding: "6px 12px", fontSize: "11px" }}
            >
              Refresh
            </button>
            <span className="qa-chip gold">Read Only</span>
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
          ) : auditEntries.length === 0 ? (
            <div
              style={{
                padding: "24px",
                textAlign: "center",
                color: "#64748b",
                fontStyle: "italic",
              }}
            >
              Chưa có bản ghi audit nào.
            </div>
          ) : (
            auditEntries.map((entry, idx) => (
              <div key={idx} className="qa-list-item">
                <div>
                  <p className="qa-list-title">{entry.action}</p>
                  <p className="qa-list-desc">
                    {entry.actor} - {entry.detail}
                  </p>
                </div>
                <span className="qa-status neutral">{entry.time}</span>
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
};

export default QAAuditTrail;
