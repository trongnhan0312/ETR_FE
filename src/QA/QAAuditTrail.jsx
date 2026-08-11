import { useState, useEffect } from "react";
import { api } from "../utils/api";
import { useLanguage } from "../context/LanguageContext";

const QAAuditTrail = () => {
  const { tr, trEn } = useLanguage();
  const [auditEntries, setAuditEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [auditError, setAuditError] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  useEffect(() => {
    loadAudit();
  }, []);

  const loadAudit = async () => {
    setLoading(true);
    setCurrentPage(1);
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
        time:
          (a.createdAt ?? a.recordedAt)
            ? new Date(a.createdAt ?? a.recordedAt).toLocaleString("vi-VN")
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

  const totalPages = Math.ceil(auditEntries.length / itemsPerPage) || 1;
  const paginatedEntries = auditEntries.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage,
  );

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage);
    }
  };

  return (
    <div className="qa-shell">
      <section className="qa-page-card">
        <p className="qa-eyebrow">{trEn("Compliance")}</p>
        <h1>{trEn("Audit Trail")}</h1>
        <p className="qa-page-description">
          {trEn(
            "View activity history of ETRs and users so QA decisions can be traced during review and audit.",
          )}
        </p>
      </section>

      <section className="qa-table-card">
        <div className="qa-table-header">
          <div>
            <h2>
              {trEn("Recent Activity")} ({auditEntries.length})
            </h2>
            <p className="qa-page-description">
              {trEn(
                "Use this page to confirm who reviewed, verified, returned, or exported each record.",
              )}
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
              {trEn("Refresh")}
            </button>
            <span className="qa-chip gold">{trEn("Read Only")}</span>
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
              {tr("Đang tải...")}
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
              {tr("Chưa có bản ghi audit nào.")}
            </div>
          ) : (
            <>
              {paginatedEntries.map((entry, idx) => (
                <div key={idx} className="qa-list-item">
                  <div>
                    <p className="qa-list-title">{entry.action}</p>
                    <p className="qa-list-desc">
                      {entry.actor} - {entry.detail}
                    </p>
                  </div>
                  <span className="qa-status neutral">{entry.time}</span>
                </div>
              ))}

              {/* Pagination Controls */}
              <div
                style={{
                  display: "flex",
                  justify: "space-between",
                  alignItems: "center",
                  padding: "16px 20px",
                  borderTop: "1px solid #e2e8f0",
                  marginTop: "8px",
                  fontSize: "13px",
                  color: "#64748b",
                  flexWrap: "wrap",
                  gap: "12px",
                }}
              >
                <div>
                  {tr("Hiển thị")}{" "}
                  <strong>{(currentPage - 1) * itemsPerPage + 1}</strong> -{" "}
                  <strong>
                    {Math.min(currentPage * itemsPerPage, auditEntries.length)}
                  </strong>{" "}
                  {tr("trên")} <strong>{auditEntries.length}</strong>{" "}
                  {tr("hoạt động")}
                </div>

                <div
                  style={{ display: "flex", gap: "6px", alignItems: "center" }}
                >
                  <button
                    type="button"
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                    style={{
                      padding: "6px 12px",
                      borderRadius: "6px",
                      border: "1px solid #cbd5e1",
                      background: currentPage === 1 ? "#f8fafc" : "#fff",
                      color: currentPage === 1 ? "#94a3b8" : "#334155",
                      cursor: currentPage === 1 ? "not-allowed" : "pointer",
                      fontWeight: "600",
                      fontSize: "12px",
                    }}
                  >
                    {tr("‹ Trước")}
                  </button>

                  {Array.from({ length: totalPages }, (_, i) => i + 1).map(
                    (p) => (
                      <button
                        key={p}
                        type="button"
                        onClick={() => handlePageChange(p)}
                        style={{
                          padding: "6px 10px",
                          borderRadius: "6px",
                          border:
                            p === currentPage ? "none" : "1px solid #cbd5e1",
                          background: p === currentPage ? "#002147" : "#fff",
                          color: p === currentPage ? "#fff" : "#334155",
                          cursor: "pointer",
                          fontWeight: p === currentPage ? "700" : "500",
                          fontSize: "12px",
                          minWidth: "32px",
                        }}
                      >
                        {p}
                      </button>
                    ),
                  )}

                  <button
                    type="button"
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    style={{
                      padding: "6px 12px",
                      borderRadius: "6px",
                      border: "1px solid #cbd5e1",
                      background:
                        currentPage === totalPages ? "#f8fafc" : "#fff",
                      color: currentPage === totalPages ? "#94a3b8" : "#334155",
                      cursor:
                        currentPage === totalPages ? "not-allowed" : "pointer",
                      fontWeight: "600",
                      fontSize: "12px",
                    }}
                  >
                    {tr("Sau ›")}
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </section>
    </div>
  );
};

export default QAAuditTrail;
