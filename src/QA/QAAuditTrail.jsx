import { useState, useEffect, useMemo } from "react";
import { api } from "../utils/api";
import { useLanguage } from "../context/LanguageContext";
import { usePagination } from "../utils/usePagination";
import Pagination from "../components/Pagination";
import AuditLogDetailModal from "../components/AuditLogDetailModal";

const QA_ACTION_METAS = {
  INSERT: { label: "Tạo mới (INSERT)", color: "#2563eb", category: "CRUD" },
  CREATE: { label: "Tạo mới (CREATE)", color: "#2563eb", category: "CRUD" },
  UPDATE: { label: "Cập nhật (UPDATE)", color: "#d97706", category: "CRUD" },
  DELETE: { label: "Xóa (DELETE)", color: "#dc2626", category: "CRUD" },
  VERIFY: { label: "Xác minh QA (VERIFY)", color: "#0891b2", category: "MAKER_CHECKER" },
  APPROVE: { label: "Phê duyệt (APPROVE)", color: "#16a34a", category: "MAKER_CHECKER" },
  REJECT: { label: "Từ chối / Trả lại (RETURN)", color: "#dc2626", category: "MAKER_CHECKER" },
  RETURN: { label: "Trả lại (RETURN)", color: "#f59e0b", category: "MAKER_CHECKER" },
  SUBMIT: { label: "Nộp duyệt (SUBMIT)", color: "#7c3aed", category: "MAKER_CHECKER" },
  IMPORT_ATTENDANCE: { label: "Import điểm danh", color: "#4f46e5", category: "ATTENDANCE" },
  IMPORT_ASSESSMENT: { label: "Import điểm", color: "#4f46e5", category: "ASSESSMENT" },
};

const getQaActionMeta = (action) => {
  const act = String(action || "").toUpperCase().trim();
  for (const [k, v] of Object.entries(QA_ACTION_METAS)) {
    if (act.includes(k)) return v;
  }
  return { label: action || "UPDATE", color: "#64748b", category: "CRUD" };
};

const formatValueSnippet = (val) => {
  if (!val || val === "—") return "—";
  const str = String(val).trim();
  if (str.startsWith("{") && str.endsWith("}")) {
    try {
      const obj = JSON.parse(str);
      const parts = [];
      if (obj.FileName) parts.push(`File: ${obj.FileName}`);
      if (obj.Score != null) parts.push(`Score: ${obj.Score}`);
      if (obj.Status) parts.push(`Status: ${obj.Status}`);
      if (obj.AttendanceRate != null) parts.push(`Attendance: ${obj.AttendanceRate}%`);
      if (obj.ClassId) parts.push(`Class #${obj.ClassId}`);
      if (obj.SubjectId) parts.push(`Subject #${obj.SubjectId}`);
      if (parts.length > 0) return parts.join(", ");
      const keys = Object.keys(obj).filter(
        (k) => obj[k] !== null && !["CreatedAt", "UpdatedAt", "DeletedAt", "IsDeleted"].includes(k)
      );
      if (keys.length > 0) return keys.slice(0, 3).map((k) => `${k}: ${obj[k]}`).join(", ");
    } catch {
      // fallback
    }
  }
  return str.length > 50 ? `${str.slice(0, 47)}...` : str;
};

const QAAuditTrail = () => {
  const { tr, trEn } = useLanguage();
  const [auditEntries, setAuditEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [auditError, setAuditError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("ALL");
  const [selectedLog, setSelectedLog] = useState(null);

  useEffect(() => {
    loadAudit();
  }, []);

  const loadAudit = async () => {
    setLoading(true);
    setAuditError("");
    try {
      const [data, accounts] = await Promise.all([
        api.get("/Audit?page=1&pageSize=100").catch((err) => {
          const isForbidden = /403|Forbidden|không có quyền|unauthorized/i.test(err?.message || "");
          throw isForbidden
            ? new Error(tr("Tài khoản của bạn không có quyền xem Audit Log hệ thống."))
            : err;
        }),
        api.get("/Accounts").catch(() => []),
      ]);

      const audits = Array.isArray(data) ? data : Array.isArray(data?.items) ? data.items : [];
      const accountList = Array.isArray(accounts) ? accounts : Array.isArray(accounts?.items) ? accounts.items : [];
      const accountMap = new Map();
      accountList.forEach((acc) => {
        if (acc?.accountId) accountMap.set(acc.accountId, acc.username || acc.fullName || `Account #${acc.accountId}`);
      });

      const mapped = audits.map((a) => {
        const meta = getQaActionMeta(a.actionType);
        const userLabel = a.accountId
          ? (accountMap.get(a.accountId) || `Account #${a.accountId}`)
          : trEn("Hệ thống (System / Admin)");

        return {
          id: a.auditLogId || a.id || "—",
          timestamp: (a.createdAt ?? a.recordedAt) ? new Date(a.createdAt ?? a.recordedAt).toLocaleString("vi-VN") : "—",
          user: userLabel,
          actor: userLabel,
          accountId: a.accountId,
          action: a.actionType || "UPDATE",
          actionMeta: meta,
          module: a.entityName || "Record",
          recordId: a.recordId,
          target: a.recordId,
          etrCourseRecordId: a.etrRecordId,
          oldValue: a.oldValue || "—",
          newValue: a.newValue || "—",
          details: a.description || `${a.actionType || "UPDATE"} ${a.entityName || "record"} #${a.recordId || ""}`.trim(),
        };
      });

      setAuditEntries(mapped);
    } catch (err) {
      console.error("Error loading audit:", err);
      setAuditEntries([]);
      setAuditError(err.message || tr("Không thể tải audit log."));
    } finally {
      setLoading(false);
    }
  };

  const filteredEntries = useMemo(() => {
    return auditEntries.filter((log) => {
      const q = searchQuery.toLowerCase().trim();
      const matchSearch =
        !q ||
        String(log.id).toLowerCase().includes(q) ||
        log.user.toLowerCase().includes(q) ||
        log.action.toLowerCase().includes(q) ||
        log.module.toLowerCase().includes(q) ||
        log.details.toLowerCase().includes(q) ||
        String(log.recordId || "").toLowerCase().includes(q);

      let matchCategory = true;
      if (selectedCategory === "EVIDENCE") {
        matchCategory = /evidence/i.test(log.module) || /file/i.test(log.module);
      } else if (selectedCategory === "ASSESSMENT") {
        matchCategory = /assessment/i.test(log.module) || /score/i.test(log.module) || /result/i.test(log.module);
      } else if (selectedCategory === "ATTENDANCE") {
        matchCategory = /attendance/i.test(log.module) || /session/i.test(log.module);
      } else if (selectedCategory === "MAKER_CHECKER") {
        matchCategory = log.actionMeta.category === "MAKER_CHECKER" || /approval/i.test(log.module) || /etr/i.test(log.module);
      } else if (selectedCategory === "CRUD") {
        matchCategory = /INSERT|CREATE|UPDATE|DELETE/i.test(log.action);
      }

      return matchSearch && matchCategory;
    });
  }, [auditEntries, searchQuery, selectedCategory]);

  const { page, setPage, pageCount, pageItems, total } = usePagination(filteredEntries, {
    pageSize: 10,
    resetKey: `${searchQuery}|${selectedCategory}`,
  });

  return (
    <div className="qa-shell">
      {/* Page Card */}
      <section className="qa-page-card">
        <p className="qa-eyebrow">{trEn("Compliance & Quality Assurance")}</p>
        <h1>{trEn("QA Audit Trail (Nhật ký Thẩm định)")}</h1>
        <p className="qa-page-description">
          {trEn("Rà soát các thay đổi về bằng chứng, điểm số, điểm danh và phê duyệt phục vụ nguyên tắc thẩm định Maker-Checker. Kiểm tra đầy đủ mọi thao tác CRUD và điều chỉnh.")}
        </p>
      </section>

      {/* Filter Toolbar */}
      <section
        className="qa-table-card"
        style={{ padding: "16px 20px", display: "flex", flexDirection: "column", gap: "12px" }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px" }}>
          {/* Search Box */}
          <div style={{ position: "relative", width: "300px", maxWidth: "100%" }}>
            <input
              type="text"
              placeholder={trEn("Search by actor, module, score, file...")}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: "100%",
                padding: "8px 14px",
                borderRadius: "8px",
                border: "1px solid #cbd5e1",
                fontSize: "13px",
                outline: "none",
              }}
            />
          </div>

          <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
            <button
              className="qa-btn-secondary"
              type="button"
              onClick={loadAudit}
              disabled={loading}
              style={{ padding: "6px 14px", fontSize: "12px", borderRadius: "6px" }}
            >
              {trEn("Refresh")}
            </button>
            <span className="qa-chip gold">{trEn("Maker-Checker Verified")}</span>
          </div>
        </div>

        {/* Category Filter Tabs */}
        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", alignItems: "center", paddingTop: "8px", borderTop: "1px solid #f1f5f9" }}>
          <span style={{ fontSize: "11px", fontWeight: "700", color: "#64748b", textTransform: "uppercase" }}>
            {trEn("QA Categories:")}
          </span>
          {[
            { key: "ALL", label: trEn("All Logs") },
            { key: "MAKER_CHECKER", label: trEn("Maker-Checker & Sign-offs") },
            { key: "EVIDENCE", label: trEn("Evidence Files (Minh chứng)") },
            { key: "ASSESSMENT", label: trEn("Assessments & Scores") },
            { key: "ATTENDANCE", label: trEn("Attendance Logs") },
            { key: "CRUD", label: trEn("All CRUD Actions") },
          ].map((cat) => (
            <button
              key={cat.key}
              type="button"
              onClick={() => setSelectedCategory(cat.key)}
              style={{
                padding: "5px 12px",
                borderRadius: "6px",
                border: selectedCategory === cat.key ? "none" : "1px solid #cbd5e1",
                background: selectedCategory === cat.key ? "#002147" : "#ffffff",
                color: selectedCategory === cat.key ? "#ffffff" : "#334155",
                fontSize: "12px",
                fontWeight: selectedCategory === cat.key ? "700" : "500",
                cursor: "pointer",
                transition: "all 0.15s ease",
              }}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </section>

      {/* Main Table Card */}
      <section className="qa-table-card" style={{ padding: "20px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
          <div>
            <h2 style={{ fontSize: "16px", fontWeight: "700", color: "#002147", margin: 0 }}>
              {trEn("Verified Activity Records")} ({filteredEntries.length})
            </h2>
            <p style={{ margin: "4px 0 0", fontSize: "12px", color: "#64748b" }}>
              {trEn("Click any row to inspect complete before/after values and JSON audit payload.")}
            </p>
          </div>
        </div>

        <div style={{ overflowX: "auto", width: "100%", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
          <div style={{ minWidth: "1050px" }}>
            {/* Table Header */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "70px 140px 160px 150px 130px 1.4fr 100px",
                padding: "12px 16px",
                background: "#002147",
                color: "#ffffff",
                fontWeight: "700",
                fontSize: "11px",
                letterSpacing: "0.04em",
                textTransform: "uppercase",
                alignItems: "center",
              }}
            >
              <div>{trEn("ID")}</div>
              <div>{trEn("Timestamp")}</div>
              <div>{trEn("Actor")}</div>
              <div>{trEn("Action")}</div>
              <div>{trEn("Module")}</div>
              <div>{trEn("Details / Changes")}</div>
              <div style={{ textAlign: "right" }}>{trEn("Action")}</div>
            </div>

            {/* Table Body */}
            {loading ? (
              <div style={{ padding: "32px", textAlign: "center", color: "#64748b" }}>
                {tr("Đang tải dữ liệu...")}
              </div>
            ) : auditError ? (
              <div style={{ padding: "32px", textAlign: "center", color: "#b91c1c", fontStyle: "italic" }}>
                {auditError}
              </div>
            ) : filteredEntries.length === 0 ? (
              <div style={{ padding: "32px", textAlign: "center", color: "#64748b", fontStyle: "italic" }}>
                {tr("Chưa có bản ghi audit nào.")}
              </div>
            ) : (
              pageItems.map((entry) => {
                const newSnippet = formatValueSnippet(entry.newValue);
                return (
                  <div
                    key={entry.id}
                    onClick={() => setSelectedLog(entry)}
                    style={{
                      display: "grid",
                      gridTemplateColumns: "70px 140px 160px 150px 130px 1.4fr 100px",
                      padding: "12px 16px",
                      borderBottom: "1px solid #f1f5f9",
                      alignItems: "center",
                      fontSize: "12px",
                      cursor: "pointer",
                      transition: "background-color 0.15s ease",
                      background: "#ffffff",
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = "#f8fafc"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = "#ffffff"; }}
                  >
                    <div style={{ fontWeight: "700", color: "#c5a059" }}>#{entry.id}</div>
                    <div style={{ color: "#64748b" }}>{entry.timestamp}</div>
                    <div style={{ fontWeight: "600", color: "#0f172a", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {entry.user}
                    </div>
                    <div>
                      <span
                        style={{
                          padding: "3px 8px",
                          borderRadius: "999px",
                          fontSize: "11px",
                          fontWeight: "700",
                          backgroundColor: `${entry.actionMeta.color}1a`,
                          color: entry.actionMeta.color,
                          whiteSpace: "nowrap",
                          display: "inline-block",
                        }}
                      >
                        {trEn(entry.actionMeta.label)}
                      </span>
                    </div>
                    <div style={{ fontWeight: "600", color: "#002147" }}>
                      {entry.module} {entry.recordId && <span style={{ color: "#64748b" }}>#{entry.recordId}</span>}
                    </div>
                    <div
                      title={entry.details}
                      style={{
                        color: "#475569",
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}
                    >
                      {entry.details} {newSnippet !== "—" && <span style={{ color: "#16a34a", fontSize: "11px", marginLeft: "4px" }}>({newSnippet})</span>}
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedLog(entry);
                        }}
                        style={{
                          padding: "4px 10px",
                          borderRadius: "6px",
                          border: "1px solid #cbd5e1",
                          background: "#ffffff",
                          color: "#002147",
                          fontSize: "11px",
                          fontWeight: "600",
                          cursor: "pointer",
                        }}
                      >
                        {trEn("Details ›")}
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Pagination */}
        <Pagination
          page={page}
          pageCount={pageCount}
          onChange={setPage}
          total={total}
          pageSize={10}
        />
      </section>

      {/* Detail Modal */}
      {selectedLog && (
        <AuditLogDetailModal
          log={selectedLog}
          onClose={() => setSelectedLog(null)}
        />
      )}
    </div>
  );
};

export default QAAuditTrail;
