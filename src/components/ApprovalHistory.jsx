import { useState, useEffect } from "react";
import { api } from "../utils/api";

const ApprovalHistory = ({ etrId, onClose }) => {
  const [logEntries, setLogEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (etrId) {
      loadApprovalLogs();
    }
  }, [etrId]);

  const loadApprovalLogs = async () => {
    setLoading(true);
    setError("");
    try {
      const audits = await api.get("/Audit").catch(() => []);
      const auditsArr = Array.isArray(audits) ? audits : [];

      // Filter only ETR-related actions: SUBMIT, VERIFY, APPROVE, RETURN
      const relevantActions = ["SUBMIT", "VERIFY", "APPROVE", "RETURN"];
      const etrActions = auditsArr.filter(
        (a) =>
          (a.etrRecordId === etrId || a.eTRRecordId === etrId || a.recordId === etrId) &&
          relevantActions.includes(a.actionType || "")
      );

      const mapped = etrActions
        .sort(
          (a, b) =>
            new Date(b.recordedAt || 0) - new Date(a.recordedAt || 0)
        )
        .map((a) => ({
          time: a.recordedAt
            ? new Date(a.recordedAt).toLocaleString("vi-VN")
            : "N/A",
          action: a.actionType || "—",
          actor: `Account #${a.accountId || "?"}`,
          fromStatus: a.oldValue || "—",
          toStatus: a.newValue || "—",
          description: a.description || "",
        }));

      setLogEntries(mapped);
    } catch (err) {
      setError("Không thể tải lịch sử phê duyệt: " + (err.message || ""));
    } finally {
      setLoading(false);
    }
  };

  const getActionColor = (action) => {
    switch (action) {
      case "SUBMIT":
        return { bg: "rgba(59, 130, 246, 0.1)", color: "#2563eb", icon: "↑" };
      case "VERIFY":
        return { bg: "rgba(34, 197, 94, 0.1)", color: "#15803d", icon: "✓" };
      case "APPROVE":
        return { bg: "rgba(197, 160, 89, 0.15)", color: "#a1823a", icon: "★" };
      case "RETURN":
        return { bg: "rgba(239, 68, 68, 0.1)", color: "#dc2626", icon: "↩" };
      default:
        return { bg: "rgba(100, 116, 139, 0.1)", color: "#64748b", icon: "●" };
    }
  };

  if (!etrId) {
    return (
      <div style={{ padding: "24px", textAlign: "center", color: "#64748b", fontStyle: "italic" }}>
        Chọn một ETR để xem lịch sử phê duyệt.
      </div>
    );
  }

  return (
    <div>
      {onClose && (
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "16px",
            paddingBottom: "12px",
            borderBottom: "1px solid #e2e8f0",
          }}
        >
          <h3 style={{ margin: 0, fontSize: "16px", color: "#002147" }}>
            Approval History — ETR #{etrId}
          </h3>
          <button
            onClick={onClose}
            style={{
              background: "none",
              border: "1px solid #e2e8f0",
              borderRadius: "6px",
              padding: "4px 10px",
              cursor: "pointer",
              fontSize: "12px",
              color: "#64748b",
            }}
          >
            ✕ Close
          </button>
        </div>
      )}

      {loading ? (
        <div style={{ padding: "16px", textAlign: "center", color: "#64748b" }}>
          Đang tải...
        </div>
      ) : error ? (
        <div style={{ padding: "16px", textAlign: "center", color: "#dc2626" }}>
          {error}
        </div>
      ) : logEntries.length === 0 ? (
        <div style={{ padding: "16px", textAlign: "center", color: "#64748b", fontStyle: "italic" }}>
          Chưa có hoạt động phê duyệt nào cho ETR này.
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          {logEntries.map((entry, idx) => {
            const colors = getActionColor(entry.action);
            return (
              <div
                key={idx}
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: "12px",
                  padding: "12px",
                  borderRadius: "8px",
                  backgroundColor: "#f8fafc",
                  border: "1px solid #e2e8f0",
                }}
              >
                {/* Action Badge */}
                <div
                  style={{
                    width: "36px",
                    height: "36px",
                    borderRadius: "50%",
                    backgroundColor: colors.bg,
                    color: colors.color,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontWeight: 700,
                    fontSize: "14px",
                    flexShrink: 0,
                  }}
                >
                  {colors.icon}
                </div>

                {/* Content */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    <span
                      style={{
                        fontWeight: 700,
                        fontSize: "13px",
                        color: colors.color,
                        textTransform: "uppercase",
                      }}
                    >
                      {entry.action}
                    </span>
                    <span style={{ fontSize: "11px", color: "#94a3b8" }}>
                      {entry.time}
                    </span>
                  </div>
                  <p
                    style={{
                      margin: "4px 0 0",
                      fontSize: "12px",
                      color: "#475569",
                    }}
                  >
                    {entry.description || (
                      <>
                        Status: <strong>{entry.fromStatus}</strong> →{" "}
                        <strong>{entry.toStatus}</strong>
                      </>
                    )}
                  </p>
                  <p
                    style={{
                      margin: "2px 0 0",
                      fontSize: "11px",
                      color: "#94a3b8",
                    }}
                  >
                    {entry.actor}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default ApprovalHistory;
