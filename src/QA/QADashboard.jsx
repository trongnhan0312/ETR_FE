import { useState, useEffect } from "react";
import { api } from "../utils/api";
import { useLanguage } from '../context/LanguageContext';
import {
  buildSrToAccountMap,
  resolveEvidenceLearner,
} from "../utils/evidenceEnrich";

const QADashboard = () => {
  const { trEn } = useLanguage();
  const [metrics, setMetrics] = useState([
    { label: "Pending Evidence", value: "..." },
    { label: "Pending ETR Reviews", value: "..." },
    { label: "Rejected Records", value: "..." },
    { label: "Reviewed Today", value: "..." },
  ]);
  const [evidenceFiles, setEvidenceFiles] = useState([]);
  const [evidenceTotal, setEvidenceTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [evidences, etrs, audit, profiles] = await Promise.all([
          api.get("/Evidences").catch(() => []),
          api.get("/Etr").catch(() => []),
          api.get("/Audit?page=1&pageSize=50").catch(() => []),
          api.get("/UserProfiles/learners").catch(() => []),
        ]);

        const evfs = Array.isArray(evidences) ? evidences : [];
        const etrsArr = Array.isArray(etrs) ? etrs : [];
        const profilesArr = Array.isArray(profiles) ? profiles : [];
        // Map subjectResultId → accountId để hiển thị đúng tên học viên cho evidence
        // bị lưu nhầm accountId giảng viên (tải lên qua trang Instructor trước khi fix).
        const srData = await buildSrToAccountMap(etrsArr);
        const srToAccount = srData?.srToAccount || {};
        const audits = Array.isArray(audit)
          ? audit
          : Array.isArray(audit?.items)
            ? audit.items
            : [];

        const pendingEvidence = evfs.filter(
          (e) => e.verificationStatus !== "Verified"
        ).length;
        const pendingEtrs = etrsArr.filter(
          (e) => e.status === "Submitted"
        ).length;
        const rejectedEvfs = evfs.filter(
          (e) => e.verificationStatus === "Rejected"
        ).length;
        const todayReviewed = audits.filter((a) => {
          const t = a.createdAt ?? a.recordedAt;
          if (!t) return false;
          const d = new Date(t);
          const today = new Date();
          return d.toDateString() === today.toDateString();
        }).length;

        setMetrics([
          { label: "Pending Evidence", value: String(pendingEvidence) },
          { label: "Pending ETR Reviews", value: String(pendingEtrs) },
          { label: "Rejected Records", value: String(rejectedEvfs) },
          { label: "Reviewed Today", value: String(todayReviewed) },
        ]);

        // Danh sách file minh chứng đã tải lên (nối tên học viên qua AccountId,
        // fallback qua subjectResultId cho bản ghi cũ lưu nhầm accountId giảng viên)
        const files = evfs
          .map((ev) => {
            return {
              id: ev.evidenceFileId,
              fileName: ev.fileName || "File",
              learner: resolveEvidenceLearner(ev, profilesArr, srToAccount),
              status:
                ev.verificationStatus === "Verified"
                  ? "Verified"
                  : ev.verificationStatus === "Rejected"
                    ? "Rejected"
                    : "Pending",
              uploadedAt: ev.uploadedAt || null,
            };
          })
          .sort((a, b) => new Date(b.uploadedAt || 0) - new Date(a.uploadedAt || 0));
        setEvidenceTotal(files.length);
        setEvidenceFiles(files.slice(0, 8));
      } catch (err) {
        console.error("Error loading QA dashboard:", err);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  return (
    <div className="qa-shell">
      <section className="qa-page-card">
        <div className="qa-header">
          <div>
            <p className="qa-eyebrow">{trEn('Quality assurance operations')}</p>
            <h1>{trEn('QA Staff Dashboard')}</h1>
            <p className="qa-page-description">
              {trEn('Central view for pending evidence, ETR review work, rejected records, and compliance actions.')}
            </p>
          </div>
          <div className="qa-status-box">
            <strong>{trEn("Today's focus")}</strong>
            <p>
              {trEn('Review evidence first, then clear the ETR queue and capture exceptions in the audit trail.')}
            </p>
          </div>
        </div>
      </section>

      <section className="qa-metrics">
        {loading
          ? metrics.map((m) => (
              <div key={m.label} className="qa-metric-card">
                <span className="qa-metric-label">{trEn(m.label)}</span>
                <div className="qa-metric-value" style={{ opacity: 0.4 }}>
                  ...
                </div>
              </div>
            ))
          : metrics.map((metric) => (
              <div key={metric.label} className="qa-metric-card">
                <span className="qa-metric-label">{trEn(metric.label)}</span>
                <div className="qa-metric-value">{metric.value}</div>
              </div>
            ))}
      </section>

      <section className="qa-grid-2">
        <div className="qa-panel">
          <h2>{trEn('Recommended QA Navigation')}</h2>
          <div className="qa-badge-row">
            <span className="qa-chip primary">{trEn('Dashboard')}</span>
            <span className="qa-chip primary">{trEn('Evidence Verification')}</span>
            <span className="qa-chip primary">{trEn('ETR Review Queue')}</span>
            <span className="qa-chip primary">{trEn('Search / Export')}</span>
            <span className="qa-chip primary">{trEn('Audit Trail')}</span>
          </div>
          <div className="qa-divider" />
          <p className="qa-page-description">
            {trEn('This structure keeps QA Staff focused on review work only.')}
          </p>
        </div>

        <div className="qa-panel">
          <h2>{trEn('Access Scope')}</h2>
          <ul>
            <li>{trEn('View learner, course, class, attendance, and assessment data.')}</li>
            <li>{trEn('Verify or reject uploaded evidence.')}</li>
            <li>{trEn('Review ETRs and return them for correction.')}</li>
            <li>{trEn('Search records, export packages, and view audit logs.')}</li>
          </ul>
        </div>
      </section>

      {/* Dashboard QA: xem các file chứng từ đã tải lên */}
      <section className="qa-table-card">
        <div className="qa-table-header">
          <div>
            <h2>{trEn('Uploaded Evidence Files')}</h2>
            <p className="qa-page-description">
              {trEn('Recently uploaded evidence files across the system.')}
            </p>
          </div>
          <span className="qa-chip gold">{evidenceTotal} {trEn('files')}</span>
        </div>

        <div className="qa-list">
          {loading ? (
            <div style={{ padding: "24px", textAlign: "center", color: "#64748b" }}>
              {trEn('Loading data...')}
            </div>
          ) : evidenceFiles.length === 0 ? (
            <div style={{ padding: "24px", textAlign: "center", color: "#64748b", fontStyle: "italic" }}>
              {trEn('No evidence files uploaded yet.')}
            </div>
          ) : (
            evidenceFiles.map((file) => (
              <div key={file.id} className="qa-list-item">
                <div style={{ flex: 1 }}>
                  <p className="qa-list-title">{file.fileName}</p>
                  <p className="qa-list-desc">
                    {file.learner}
                    {file.uploadedAt
                      ? ` · ${new Date(file.uploadedAt).toLocaleString("vi-VN")}`
                      : ""}
                  </p>
                </div>
                <span
                  className={`qa-status ${file.status === "Rejected" ? "rejected" : file.status === "Verified" ? "verified" : "pending"}`}
                >
                  {trEn(file.status)}
                </span>
              </div>
            ))
          )}
        </div>
      </section>

      <section className="qa-table-card">
        <div className="qa-table-header">
          <div>
            <h2>{trEn('Core Work Queue')}</h2>
            <p className="qa-page-description">
              {trEn('The 5-page QA workflow is enough for capstone demonstration and user acceptance.')}
            </p>
          </div>
          <div className="qa-actions">
            <span className="qa-chip warn">{trEn('Pending QA')}</span>
            <span className="qa-chip gold">{trEn('Audit Ready')}</span>
          </div>
        </div>

        <div className="qa-list">
          <div className="qa-list-item">
            <div>
              <p className="qa-list-title">{trEn('Evidence Verification')}</p>
              <p className="qa-list-desc">
                {trEn('Verify uploaded training evidence before it enters the review queue.')}
              </p>
            </div>
            <span className="qa-status pending">{trEn('Pending')}</span>
          </div>
          <div className="qa-list-item">
            <div>
              <p className="qa-list-title">{trEn('ETR Review Queue')}</p>
              <p className="qa-list-desc">
                {trEn('Review submitted ETRs, inspect completeness, and return items when needed.')}
              </p>
            </div>
            <span className="qa-status pending">{trEn('In Review')}</span>
          </div>
          <div className="qa-list-item">
            <div>
              <p className="qa-list-title">{trEn('Compliance Actions')}</p>
              <p className="qa-list-desc">
                {trEn('Search historical records, export training packages, and inspect the audit trail.')}
              </p>
            </div>
            <span className="qa-status neutral">{trEn('Ready')}</span>
          </div>
        </div>
      </section>
    </div>
  );
};

export default QADashboard;
