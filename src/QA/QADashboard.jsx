import { useState, useEffect } from "react";
import { api } from "../utils/api";

const QADashboard = () => {
  const [metrics, setMetrics] = useState([
    { label: "Pending Evidence", value: "..." },
    { label: "Pending ETR Reviews", value: "..." },
    { label: "Rejected Records", value: "..." },
    { label: "Reviewed Today", value: "..." },
  ]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [evidences, etrs, audit] = await Promise.all([
          api.get("/Evidences").catch(() => []),
          api.get("/Etr").catch(() => []),
          api.get("/Audit").catch(() => []),
        ]);

        const evfs = Array.isArray(evidences) ? evidences : [];
        const etrsArr = Array.isArray(etrs) ? etrs : [];
        const audits = Array.isArray(audit) ? audit : [];

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
          if (!a.recordedAt) return false;
          const d = new Date(a.recordedAt);
          const today = new Date();
          return d.toDateString() === today.toDateString();
        }).length;

        setMetrics([
          { label: "Pending Evidence", value: String(pendingEvidence) },
          { label: "Pending ETR Reviews", value: String(pendingEtrs) },
          { label: "Rejected Records", value: String(rejectedEvfs) },
          { label: "Reviewed Today", value: String(todayReviewed) },
        ]);
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
            <p className="qa-eyebrow">Quality assurance operations</p>
            <h1>QA Staff Dashboard</h1>
            <p className="qa-page-description">
              Central view for pending evidence, ETR review work, rejected
              records, and compliance actions.
            </p>
          </div>
          <div className="qa-status-box">
            <strong>Today&apos;s focus</strong>
            <p>
              Review evidence first, then clear the ETR queue and capture
              exceptions in the audit trail.
            </p>
          </div>
        </div>
      </section>

      <section className="qa-metrics">
        {loading
          ? metrics.map((m) => (
              <div key={m.label} className="qa-metric-card">
                <span className="qa-metric-label">{m.label}</span>
                <div className="qa-metric-value" style={{ opacity: 0.4 }}>
                  ...
                </div>
              </div>
            ))
          : metrics.map((metric) => (
              <div key={metric.label} className="qa-metric-card">
                <span className="qa-metric-label">{metric.label}</span>
                <div className="qa-metric-value">{metric.value}</div>
              </div>
            ))}
      </section>

      <section className="qa-grid-2">
        <div className="qa-panel">
          <h2>Recommended QA Navigation</h2>
          <div className="qa-badge-row">
            <span className="qa-chip primary">Dashboard</span>
            <span className="qa-chip primary">Evidence Verification</span>
            <span className="qa-chip primary">ETR Review Queue</span>
            <span className="qa-chip primary">Search / Export</span>
            <span className="qa-chip primary">Audit Trail</span>
          </div>
          <div className="qa-divider" />
          <p className="qa-page-description">
            This structure keeps QA Staff focused on review work only.
          </p>
        </div>

        <div className="qa-panel">
          <h2>Access Scope</h2>
          <ul>
            <li>View learner, course, class, attendance, and assessment data.</li>
            <li>Verify or reject uploaded evidence.</li>
            <li>Review ETRs and return them for correction.</li>
            <li>Search records, export packages, and view audit logs.</li>
          </ul>
        </div>
      </section>

      <section className="qa-table-card">
        <div className="qa-table-header">
          <div>
            <h2>Core Work Queue</h2>
            <p className="qa-page-description">
              The 5-page QA workflow is enough for capstone demonstration and
              user acceptance.
            </p>
          </div>
          <div className="qa-actions">
            <span className="qa-chip warn">Pending QA</span>
            <span className="qa-chip gold">Audit Ready</span>
          </div>
        </div>

        <div className="qa-list">
          <div className="qa-list-item">
            <div>
              <p className="qa-list-title">Evidence Verification</p>
              <p className="qa-list-desc">
                Verify uploaded training evidence before it enters the review
                queue.
              </p>
            </div>
            <span className="qa-status pending">Pending</span>
          </div>
          <div className="qa-list-item">
            <div>
              <p className="qa-list-title">ETR Review Queue</p>
              <p className="qa-list-desc">
                Review submitted ETRs, inspect completeness, and return items
                when needed.
              </p>
            </div>
            <span className="qa-status pending">In Review</span>
          </div>
          <div className="qa-list-item">
            <div>
              <p className="qa-list-title">Compliance Actions</p>
              <p className="qa-list-desc">
                Search historical records, export training packages, and inspect
                the audit trail.
              </p>
            </div>
            <span className="qa-status neutral">Ready</span>
          </div>
        </div>
      </section>
    </div>
  );
};

export default QADashboard;
