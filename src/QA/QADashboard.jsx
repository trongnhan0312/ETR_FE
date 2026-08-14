import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import ApexChart from "../components/ApexChart";
import { api } from "../utils/api";
import { fetchMyDashboard } from "../utils/dashboardApi";
import { useLanguage } from '../context/LanguageContext';
import {
  buildSrToAccountMap,
  resolveEvidenceLearner,
} from "../utils/evidenceEnrich";
import "../dashboard.scss";

const QADashboard = () => {
  const navigate = useNavigate();
  const { trEn } = useLanguage();
  const [metrics, setMetrics] = useState({
    pendingEvidence: null,
    pendingEtrs: null,
    rejectedEvidence: null,
    reviewedToday: null,
  });
  const [evidenceFiles, setEvidenceFiles] = useState([]);
  const [evidenceTotal, setEvidenceTotal] = useState(0);
  const [evidenceBreakdown, setEvidenceBreakdown] = useState({ verified: 0, pending: 0, rejected: 0 });
  const [funnel, setFunnel] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [evidences, etrs, audit, profiles, dashboard] = await Promise.all([
          api.get("/Evidences").catch(() => []),
          api.get("/Etr").catch(() => []),
          api.get("/Audit?page=1&pageSize=50").catch(() => []),
          api.get("/UserProfiles/learners").catch(() => []),
          fetchMyDashboard(),
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
          (e) => e.verificationStatus !== "Verified" && e.verificationStatus !== "Rejected"
        ).length;
        const rejectedEvidence = evfs.filter(
          (e) => e.verificationStatus === "Rejected"
        ).length;
        const verifiedEvidence = evfs.filter(
          (e) => e.verificationStatus === "Verified"
        ).length;
        const pendingEtrs =
          dashboard?.pendingVerificationEtrIds?.length ??
          etrsArr.filter((e) => e.status === "Submitted").length;
        const todayReviewed = audits.filter((a) => {
          const t = a.createdAt ?? a.recordedAt;
          if (!t) return false;
          const d = new Date(t);
          const today = new Date();
          return d.toDateString() === today.toDateString();
        }).length;

        setMetrics({
          pendingEvidence,
          pendingEtrs,
          rejectedEvidence,
          reviewedToday: todayReviewed,
        });
        setEvidenceBreakdown({ verified: verifiedEvidence, pending: pendingEvidence, rejected: rejectedEvidence });
        setFunnel(dashboard?.funnel ?? null);

        // Danh sách file minh chứng đã tải lên (nối tên học viên qua AccountId)
        const files = evfs
          .map((ev) => ({
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
          }))
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

  // Donut: phân bố trạng thái evidence (dữ liệu thật từ GET /api/Evidences)
  const evidenceDonut = useMemo(() => {
    return {
      chart: { type: "donut", fontFamily: "inherit" },
      labels: [trEn("Verified"), trEn("Pending"), trEn("Rejected")],
      series: [
        evidenceBreakdown.verified,
        evidenceBreakdown.pending,
        evidenceBreakdown.rejected,
      ],
      colors: ["#22c55e", "#f59e0b", "#ef4444"],
      legend: { position: "bottom", fontSize: "12px", fontFamily: "inherit", labels: { colors: "rgba(0,33,71,0.75)" } },
      dataLabels: { enabled: false },
      plotOptions: {
        pie: {
          donut: {
            size: "68%",
            labels: {
              show: true,
              total: { show: true, label: trEn("Evidence Files"), fontSize: "12px", color: "rgba(0,33,71,0.5)", formatter: () => String(evidenceTotal) },
            },
          },
        },
      },
      tooltip: { y: { formatter: (v) => `${v} ${trEn("files")}` } },
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [evidenceBreakdown, evidenceTotal]);

  // Donut: ETR status funnel (dữ liệu thật từ /Dashboard/my-dashboard)
  const funnelDonut = useMemo(() => {
    const f = funnel ?? {};
    return {
      chart: { type: "donut", fontFamily: "inherit" },
      labels: [trEn("Submitted"), trEn("Verified"), trEn("Completed"), trEn("Returned For Correction"), trEn("In Progress")],
      series: [f.submitted || 0, f.verified || 0, f.completed || 0, f.returnedForCorrection || 0, f.inProgress || 0],
      colors: ["#6366f1", "#06b6d4", "#22c55e", "#f59e0b", "#94a3b8"],
      legend: { position: "bottom", fontSize: "12px", fontFamily: "inherit", labels: { colors: "rgba(0,33,71,0.75)" } },
      dataLabels: { enabled: false },
      tooltip: { y: { formatter: (v) => `${v} ${trEn("records")}` } },
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [funnel]);

  const kpis = [
    {
      label: trEn("Pending Evidence"),
      value: metrics.pendingEvidence,
      icon: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <polyline points="14 2 14 8 20 8" />
        </svg>
      ),
      iconBg: "rgba(245,158,11,0.14)",
      iconColor: "#d97706",
    },
    {
      label: trEn("Pending ETR Reviews"),
      value: metrics.pendingEtrs,
      icon: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="22 12 16 12 14 15 10 15 8 12 2 12" />
          <path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z" />
        </svg>
      ),
      iconBg: "rgba(99,102,241,0.12)",
      iconColor: "#6366f1",
    },
    {
      label: trEn("Rejected Records"),
      value: metrics.rejectedEvidence,
      icon: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" />
          <line x1="15" y1="9" x2="9" y2="15" />
          <line x1="9" y1="9" x2="15" y2="15" />
        </svg>
      ),
      iconBg: "rgba(239,68,68,0.1)",
      iconColor: "#dc2626",
    },
    {
      label: trEn("Reviewed Today"),
      value: metrics.reviewedToday,
      icon: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
          <polyline points="22 4 12 14.01 9 11.01" />
        </svg>
      ),
      iconBg: "rgba(34,197,94,0.12)",
      iconColor: "#16a34a",
    },
  ];

  return (
    <div className="page-shell">
      <section className="page-header-card">
        <div>
          <p className="eyebrow">{trEn('Quality assurance operations')}</p>
          <h1>{trEn('QA Staff Dashboard')}</h1>
          <p className="page-description">
            {trEn('Central view for pending evidence, ETR review work, rejected records, and compliance actions.')}
          </p>
        </div>
        <div className="page-status-box">
          <strong>{trEn("Data source")}</strong>
          <p>GET /api/Evidences · /api/Etr · /api/Audit · /api/Dashboard/my-dashboard</p>
        </div>
      </section>

      {/* KPI Cards */}
      <section className="freedash-kpi-grid">
        {kpis.map((kpi) => (
          <div key={kpi.label} className="freedash-kpi">
            <div className="freedash-kpi-icon" style={{ background: kpi.iconBg, color: kpi.iconColor }}>
              {kpi.icon}
            </div>
            <div className="freedash-kpi-body">
              <div className="freedash-kpi-value" style={{ color: kpi.iconColor }}>
                {loading ? "..." : kpi.value ?? 0}
              </div>
              <div className="freedash-kpi-label">{kpi.label}</div>
              <div className="freedash-kpi-sub">{trEn("Live from API")}</div>
            </div>
          </div>
        ))}
      </section>

      {/* Charts Row */}
      <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "20px" }}>
        <div className="freedash-dist-card">
          <h3 className="freedash-dist-title">{trEn("Evidence Verification Status")}</h3>
          <p className="freedash-dist-sub">{trEn("All uploaded evidence files by verification status.")}</p>
          <ApexChart options={evidenceDonut} height={300} />
        </div>
        <div className="freedash-dist-card">
          <h3 className="freedash-dist-title">{trEn("ETR Status Funnel")}</h3>
          <p className="freedash-dist-sub">{trEn("System-wide ETR distribution by status.")}</p>
          <ApexChart options={funnelDonut} height={300} />
        </div>
        <div className="freedash-dist-card">
          <h3 className="freedash-dist-title">{trEn("Recommended QA Navigation")}</h3>
          <p className="freedash-dist-sub">{trEn("Jump straight to the review work queues.")}</p>
          <div style={{ display: "flex", flexDirection: "column", gap: "12px", paddingTop: "8px" }}>
            <button className="dash-btn-sm" type="button" onClick={() => navigate("/qa/evidence")}>
              {trEn("Evidence Verification")} →
            </button>
            <button className="dash-btn-sm" type="button" onClick={() => navigate("/qa/reviews")}>
              {trEn("ETR Review Queue")} →
            </button>
            <button className="dash-btn-sm" type="button" onClick={() => navigate("/qa/search")}>
              {trEn("Search / Export")} →
            </button>
            <button className="dash-btn-sm" type="button" onClick={() => navigate("/qa/audit")}>
              {trEn("Audit Trail")} →
            </button>
          </div>
        </div>
      </section>

      {/* Recent Evidence Files */}
      <section className="table-card" style={{ padding: "20px 24px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
          <div>
            <h2 style={{ fontSize: "16px", fontWeight: "700", color: "#002147", margin: 0 }}>{trEn('Uploaded Evidence Files')}</h2>
            <p style={{ fontSize: "12px", color: "rgba(0,33,71,0.5)", margin: "4px 0 0" }}>
              {trEn('Recently uploaded evidence files across the system.')}
            </p>
          </div>
          <span className="dash-badge dash-badge-locked">{evidenceTotal} {trEn('files')}</span>
        </div>
        {loading ? (
          <div className="dash-empty">{trEn('Loading data...')}</div>
        ) : evidenceFiles.length === 0 ? (
          <div className="dash-empty">{trEn('No evidence files uploaded yet.')}</div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            {evidenceFiles.map((file) => (
              <div
                key={file.id}
                style={{ padding: "12px 14px", borderRadius: "12px", background: "#f8fafc", border: "1px solid #dfe6f1", display: "flex", justifyContent: "space-between", alignItems: "center", gap: "12px" }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ margin: 0, fontSize: "13px", fontWeight: "700", color: "#002147" }}>{file.fileName}</p>
                  <p style={{ margin: "2px 0 0", fontSize: "12px", color: "rgba(0,33,71,0.6)" }}>
                    {file.learner}
                    {file.uploadedAt ? ` · ${new Date(file.uploadedAt).toLocaleString("vi-VN")}` : ""}
                  </p>
                </div>
                <span className={`dash-badge ${file.status === "Verified" ? "dash-badge-compliant" : file.status === "Rejected" ? "dash-badge-danger" : "dash-badge-warn"}`}>
                  {trEn(file.status)}
                </span>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};

export default QADashboard;
