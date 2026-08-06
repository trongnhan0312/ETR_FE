import { useState, useEffect, useMemo } from "react";
import { api } from "../utils/api";
import { buildSrToAccountMap } from "../utils/evidenceEnrich";
import { useLanguage } from '../context/LanguageContext';

// Trạng thái ETR → nhãn hiển thị + màu badge/chip
const STATUS_META = {
  InProgress: { label: "Under Review", color: "#d97706", bg: "rgba(217,119,6,0.1)" },
  Draft: { label: "Draft", color: "#d97706", bg: "rgba(217,119,6,0.1)" },
  Submitted: { label: "Pending QA", color: "#d97706", bg: "rgba(217,119,6,0.1)" },
  Verified: { label: "QA Verified", color: "#15803d", bg: "rgba(34,197,94,0.12)" },
  ReturnedForCorrection: { label: "Returned for Correction", color: "#dc2626", bg: "rgba(239,68,68,0.1)" },
  Reopened: { label: "Reopened", color: "#d97706", bg: "rgba(217,119,6,0.1)" },
  Completed: { label: "Approved", color: "#15803d", bg: "rgba(34,197,94,0.12)" },
};

const QAETRList = () => {
  const { tr, trEn } = useLanguage();
  const [etrRecords, setEtrRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadData = async () => {
    try {
      const etrs = await api.get("/Etr").catch(() => []);
      const etrsArr = Array.isArray(etrs) ? etrs : [];
      // Truyền etrsArr vào helper để tránh gọi lại GET /Etr; helper tái sử dụng chi tiết /Etr/{id} đã fetch
      const [enrollments, profiles, evidences, srData] = await Promise.all([
        api.get("/Enrollments").catch(() => []),
        api.get("/UserProfiles/learners").catch(() => []),
        api.get("/Evidences").catch(() => []),
        buildSrToAccountMap(etrsArr),
      ]);
      const enrollmentsArr = Array.isArray(enrollments) ? enrollments : [];
      const profilesArr = Array.isArray(profiles) ? profiles : [];
      const evfsArr = Array.isArray(evidences) ? evidences : [];
      const detailsById = srData?.etrDetailsById || {};

      const evStatusById = {};
      evfsArr.forEach((ev) => {
        evStatusById[ev.evidenceFileId] = ev.verificationStatus;
      });

      const mapped = etrsArr.map((etr) => {
        const etrId = etr.etrCourseRecordId || etr.eTRCourseRecordId;
        const enrollment = enrollmentsArr.find(
          (enr) => enr.enrollmentId === etr.enrollmentId
        );
        const profile = enrollment
          ? profilesArr.find((p) => p.accountId === enrollment.accountId)
          : null;
        const details = detailsById[etrId];
        const evFiles = Array.isArray(details?.evidenceFiles)
          ? details.evidenceFiles
          : [];
        const verifiedCount = evFiles.filter(
          (f) => evStatusById[f.evidenceFileId] === "Verified"
        ).length;

        return {
          etrId,
          id: `#ETR-${String(etrId).padStart(4, "0")}`,
          learner:
            profile?.fullName || `Student #${enrollment?.accountId || ""}`,
          course: `${trEn('Class')} #${enrollment?.classId ?? ""}`,
          status: etr.status,
          hasDetails: !!details,
          evidenceCount: evFiles.length,
          verifiedCount,
          submittedAt: etr.submittedAt
            ? new Date(etr.submittedAt).toLocaleString("vi-VN")
            : "—",
          verifiedAt: etr.verifiedAt
            ? new Date(etr.verifiedAt).toLocaleString("vi-VN")
            : "—",
          completedAt: etr.completedAt
            ? new Date(etr.completedAt).toLocaleString("vi-VN")
            : "—",
          locked: etr.isLocked === true || etr.status === "Completed",
        };
      });

      mapped.sort((a, b) => b.etrId - a.etrId);
      setEtrRecords(mapped);
    } catch (err) {
      console.error("Error loading ETR registry:", err);
    } finally {
      setLoading(false);
    }
  };

  const statuses = useMemo(() => {
    const seen = {};
    etrRecords.forEach((r) => {
      if (r.status) seen[r.status] = true;
    });
    return ["all", ...Object.keys(seen)];
  }, [etrRecords]);

  const statusCounts = useMemo(() => {
    const counts = {};
    etrRecords.forEach((r) => {
      counts[r.status] = (counts[r.status] || 0) + 1;
    });
    return counts;
  }, [etrRecords]);

  const filtered = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    return etrRecords.filter((r) => {
      const matchStatus = statusFilter === "all" || r.status === statusFilter;
      const matchSearch =
        !term ||
        r.id.toLowerCase().includes(term) ||
        r.learner.toLowerCase().includes(term) ||
        r.course.toLowerCase().includes(term);
      return matchStatus && matchSearch;
    });
  }, [etrRecords, statusFilter, searchTerm]);

  const getMeta = (status) => STATUS_META[status] || { label: status, color: "#64748b", bg: "rgba(100,116,139,0.1)" };

  return (
    <div className="qa-shell">
      <section className="qa-page-card">
        <p className="qa-eyebrow">{trEn('ETR registry')}</p>
        <h1>{trEn('ETR List')}</h1>
        <p className="qa-page-description">
          {trEn('View all ETR records across the system with their current status, learner, and evidence progress.')}
        </p>
      </section>

      {/* Tóm tắt theo trạng thái */}
      <section className="qa-badge-row" style={{ marginBottom: 4 }}>
        {Object.entries(statusCounts).map(([status, count]) => {
          const meta = getMeta(status);
          return (
            <span
              key={status}
              className="qa-chip"
              style={{
                fontSize: 11,
                fontWeight: 700,
                padding: "4px 10px",
                borderRadius: 6,
                background: meta.bg,
                color: meta.color,
              }}
            >
              {trEn(meta.label)}: {count}
            </span>
          );
        })}
      </section>

      <section className="qa-table-card">
        <div className="qa-table-header">
          <div>
            <h2>{trEn('All ETR Records')} ({filtered.length})</h2>
            <p className="qa-page-description">
              {trEn('Read-only registry — use the Review Queue for actions on submitted records.')}
            </p>
          </div>
          <div style={{ display: "flex", gap: "8px", alignItems: "center", flexWrap: "wrap" }}>
            <input
              className="qa-input"
              placeholder={trEn('Search ETR ID, learner, class...')}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{ minWidth: 200 }}
            />
            <select
              className="qa-select"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              style={{ minWidth: 160 }}
            >
              {statuses.map((s) => (
                <option key={s} value={s}>
                  {s === "all"
                    ? trEn('All Statuses')
                    : trEn(getMeta(s).label)}
                </option>
              ))}
            </select>
            <button
              className="qa-btn-secondary"
              type="button"
              onClick={() => {
                setLoading(true);
                loadData();
              }}
              disabled={loading}
              style={{ padding: "6px 12px", fontSize: "11px" }}
            >
              {trEn('Refresh')}
            </button>
          </div>
        </div>

        <div className="qa-list">
          {loading ? (
            <div style={{ padding: "24px", textAlign: "center", color: "#64748b" }}>
              {tr('Đang tải...')}
            </div>
          ) : filtered.length === 0 ? (
            <div style={{ padding: "24px", textAlign: "center", color: "#64748b", fontStyle: "italic" }}>
              {tr('Không có ETR nào.')}
            </div>
          ) : (
            filtered.map((etr) => {
              const meta = getMeta(etr.status);
              return (
                <div
                  key={etr.etrId}
                  className="qa-list-item"
                  style={{ flexDirection: "column", alignItems: "stretch", gap: 8 }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      gap: 12,
                      flexWrap: "wrap",
                    }}
                  >
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p className="qa-list-title">
                        {etr.id} — {etr.learner}
                      </p>
                      <p className="qa-list-desc">
                        {etr.course} · {trEn('Evidence')}: {etr.hasDetails ? `${etr.verifiedCount}/${etr.evidenceCount} ${trEn('verified')}` : "—"}
                      </p>
                    </div>
                    <div style={{ display: "flex", gap: 8, alignItems: "center", flexShrink: 0 }}>
                      {etr.locked && (
                        <span
                          className="qa-chip warn"
                          title={tr('Hồ sơ đã hoàn tất và bị khóa — không thể thay đổi dữ liệu.')}
                          style={{ fontSize: 10, whiteSpace: "nowrap" }}
                        >
                          🔒 {trEn('Locked')}
                        </span>
                      )}
                      <span
                        className={`qa-status ${meta.color === "#15803d" ? "verified" : meta.color === "#dc2626" ? "rejected" : "pending"}`}
                      >
                        {trEn(meta.label)}
                      </span>
                    </div>
                  </div>
                  <p className="qa-list-desc" style={{ fontSize: 11 }}>
                    {trEn('Submitted')}: {etr.submittedAt} · {trEn('Verified')}: {etr.verifiedAt} · {trEn('Completed')}: {etr.completedAt}
                  </p>
                </div>
              );
            })
          )}
        </div>
      </section>
    </div>
  );
};

export default QAETRList;
