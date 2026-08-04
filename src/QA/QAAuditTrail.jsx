import { useState, useEffect } from "react";
import { api } from "../utils/api";
import { useLanguage } from '../context/LanguageContext';

const QAAuditTrail = () => {
  const { tr } = useLanguage();
  const [auditEntries, setAuditEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [auditError, setAuditError] = useState("");

  useEffect(() => {
    loadAudit();
  }, []);

  const loadAudit = async () => {
    setLoading(true);
    try {
      // Backend /Audit cho phép Admin/Audit/QA/Academic (đã bổ sung role QA) — nếu vẫn gặp 403,
      // hiển thị thông báo rõ ràng thay vì im lặng hiển thị danh sách trống.
      const data = await api.get("/Audit?page=1&pageSize=50").catch((err) => {
        const isForbidden =
          /403|Forbidden|không có quyền|unauthorized|not authorized/i.test(
            err?.message || "",
          );
        throw isForbidden
          ? new Error(
              tr("Tài khoản của bạn không có quyền xem Audit Log hệ thống."),
            )
          : err;
      });
      const audits = Array.isArray(data)
        ? data
        : Array.isArray(data?.items)
          ? data.items
          : [];
      const mapped = audits.slice(0, 50).map((a) => ({
        time: a.recordedAt
          ? new Date(a.recordedAt).toLocaleString("vi-VN")
          : "N/A",
        actor: `Account #${a.accountId || "System"}`,
        action: a.actionType || a.entityName || "UPDATE",
        detail:
          a.description ||
          `${a.actionType || "UPDATE"} ${a.entityName || "record"} #${a.recordId || ""}`,
      }));
      setAuditEntries(mapped);
    } catch (err) {
      console.error("Error loading audit:", err);
      setAuditEntries([]);
      setAuditError(err.message || tr("Không thể tải audit log."));
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
              {tr('Đang tải...')}
            </div>
          ) : auditError ? (
            <div
              style={{
                padding: "24px",
                textAlign: "center",
                color: "#b00020",
                fontStyle: "italic",
              }}
            >
              {auditError}
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
              {tr('Chưa có bản ghi audit nào.')}
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
