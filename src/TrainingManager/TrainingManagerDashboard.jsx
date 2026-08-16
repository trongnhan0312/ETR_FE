import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import ApexChart from "../components/ApexChart";
import { fetchMyDashboard } from "../utils/dashboardApi";
import { useLanguage } from "../context/LanguageContext";
import "../dashboard.scss";

const TrainingManagerDashboard = () => {
  const navigate = useNavigate();
  const { tr } = useLanguage();
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        setDashboard(await fetchMyDashboard());
      } catch (err) {
        console.error("Error loading Training Manager Dashboard:", err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const o = dashboard?.overview ?? null;
  const f = dashboard?.funnel ?? null;
  const ai = dashboard?.actionItems ?? null;
  const totalEtrs = o?.totalEtrs || 0;

  // Xu hướng Locked vs Returned theo 8 tháng gần nhất — backend tính sẵn (monthlyTrend)
  const etrTrend = useMemo(() => {
    const t = dashboard?.monthlyTrend ?? null;
    if (!t || !Array.isArray(t.months)) return { categories: [], locked: [], returned: [] };
    const label = (m) => {
      const parts = String(m).split("-").map(Number);
      const y = parts[0];
      const mo = parts[1];
      if (!y || !mo) return String(m);
      return `${new Date(y, mo - 1, 1).toLocaleString("en-US", { month: "short" })} ${String(y).slice(2)}`;
    };
    return {
      categories: t.months.map(label),
      locked: Array.isArray(t.locked) ? t.locked : [],
      returned: Array.isArray(t.returned) ? t.returned : [],
    };
  }, [dashboard]);

  const donutOptions = useMemo(() => {
    const labels = [
      tr("Draft"),
      tr("In Progress"),
      tr("Submitted"),
      tr("Verified"),
      tr("Completed"),
      tr("Returned For Correction"),
      tr("Cancelled"),
    ];
    return {
      chart: { type: "donut", fontFamily: "inherit" },
      labels,
      series: [
        f?.draft || 0,
        f?.inProgress || 0,
        f?.submitted || 0,
        f?.verified || 0,
        f?.completed || 0,
        f?.returnedForCorrection || 0,
        f?.cancelled || 0,
      ],
      colors: ["#94a3b8", "#0a2c55", "#6366f1", "#06b6d4", "#22c55e", "#f59e0b", "#ef4444"],
      legend: { position: "bottom", fontSize: "12px", fontFamily: "inherit", labels: { colors: "rgba(0,33,71,0.75)" } },
      dataLabels: { enabled: false },
      plotOptions: {
        pie: {
          donut: {
            size: "68%",
            labels: {
              show: true,
              total: { show: true, label: tr("Total ETRs"), fontSize: "12px", color: "rgba(0,33,71,0.5)", formatter: () => String(totalEtrs) },
            },
          },
        },
      },
      tooltip: { y: { formatter: (v) => `${v} ${tr("records")}` } },
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dashboard, totalEtrs]);

  const radialOptions = useMemo(() => {
    const rate = o?.completionRatePercent || 0;
    return {
      chart: { type: "radialBar", fontFamily: "inherit" },
      series: [Math.min(100, rate)],
      labels: [tr("Completion Rate")],
      colors: ["#22c55e"],
      plotOptions: {
        radialBar: {
          hollow: { size: "62%" },
          dataLabels: {
            name: { fontSize: "13px", color: "rgba(0,33,71,0.55)", offsetY: 18 },
            value: { fontSize: "24px", fontWeight: 700, color: "#002147", offsetY: -12, formatter: (v) => `${Math.round(v)}%` },
          },
        },
      },
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [o]);

  const columnOptions = useMemo(() => {
    return {
      chart: { type: "bar", fontFamily: "inherit", toolbar: { show: false } },
      series: [
        {
          name: tr("Records"),
          data: [
            o?.completedCount || 0,
            o?.pendingApprovalCount || 0,
            o?.returnedForCorrectionCount || 0,
            o?.rejectedCount || 0,
            o?.missingEvidenceCount || 0,
          ],
        },
      ],
      xaxis: {
        categories: [tr("Completed"), tr("Pending Approval"), tr("Returned"), tr("Rejected"), tr("Missing Evidence")],
        labels: { style: { colors: "rgba(0,33,71,0.65)", fontSize: "11px" } },
      },
      colors: ["#0a2c55"],
      plotOptions: { bar: { borderRadius: 5, columnWidth: "52%" } },
      dataLabels: { enabled: false },
      grid: { borderColor: "#eef2f7" },
      tooltip: { y: { formatter: (v) => `${v} ${tr("records")}` } },
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dashboard]);

  const trendOptions = useMemo(() => {
    return {
      chart: { type: "area", fontFamily: "inherit", toolbar: { show: false } },
      series: [
        { name: tr("Locked"), data: etrTrend.locked },
        { name: tr("Returned"), data: etrTrend.returned },
      ],
      xaxis: { categories: etrTrend.categories, labels: { style: { colors: "rgba(0,33,71,0.65)", fontSize: "11px" } } },
      colors: ["#c5a059", "#ef4444"],
      stroke: { curve: "smooth", width: 3 },
      fill: { type: "gradient", gradient: { shadeIntensity: 1, opacityFrom: 0.3, opacityTo: 0.05, stops: [0, 90] } },
      markers: { size: 4, colors: ["#c5a059", "#ef4444"], strokeColors: "#fff", strokeWidth: 2 },
      dataLabels: { enabled: false },
      legend: { position: "top", fontSize: "12px", fontFamily: "inherit", labels: { colors: "rgba(0,33,71,0.75)" } },
      grid: { borderColor: "#eef2f7" },
      tooltip: { y: { formatter: (v) => `${v} ${tr("records")}` } },
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [etrTrend]);

  const actionRows = ai
    ? [
        { label: tr("Pending Approval"), count: ai.pendingApprovalEtrIds.length, cls: "dash-badge-warn" },
        { label: tr("Rejected"), count: ai.rejectedEtrIds.length, cls: "dash-badge-danger" },
        { label: tr("Returned For Correction"), count: ai.returnedForCorrectionEtrIds.length, cls: "dash-badge-warn" },
        { label: tr("Missing Evidence"), count: ai.missingEvidenceEtrIds.length, cls: "dash-badge-danger" },
      ]
    : [];

  const showTrend = etrTrend.locked.some((c) => c > 0) || etrTrend.returned.some((c) => c > 0);

  return (
    <div className="page-shell">
      <section className="page-header-card">
        <div>
          <p className="eyebrow">{tr("Training Manager Portal")}</p>
          <h1>{tr("Analytics Dashboard")}</h1>
          <p className="page-description">
            {tr("Operational performance and compliance overview from live ETR data.")}
          </p>
        </div>
        <div className="page-status-box">
          <strong>{tr("Data source")}</strong>
          <p>GET /api/Dashboard/my-dashboard</p>
        </div>
      </section>

      {/* KPI Cards */}
      <section className="freedash-kpi-grid">
        <div className="freedash-kpi">
          <div className="freedash-kpi-icon" style={{ background: "rgba(10,44,85,0.08)", color: "#0a2c55" }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
              <path d="M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
          </div>
          <div className="freedash-kpi-body">
            <div className="freedash-kpi-value">{loading ? "..." : totalEtrs}</div>
            <div className="freedash-kpi-label">{tr("Total ETRs")}</div>
            <div className="freedash-kpi-sub">{tr("All ETR records in the system")}</div>
          </div>
        </div>

        <div className="freedash-kpi">
          <div className="freedash-kpi-icon" style={{ background: "rgba(34,197,94,0.12)", color: "#16a34a" }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
              <polyline points="22 4 12 14.01 9 11.01" />
            </svg>
          </div>
          <div className="freedash-kpi-body">
            <div className="freedash-kpi-value">
              {loading ? "..." : o?.completedCount || 0}
              {!loading && o?.completionRatePercent > 0 && (
                <span className="freedash-kpi-badge" style={{ background: "rgba(34,197,94,0.12)", color: "#16a34a" }}>
                  {o.completionRatePercent}%
                </span>
              )}
            </div>
            <div className="freedash-kpi-label">{tr("Completed")}</div>
            <div className="freedash-kpi-sub">{tr("ETRs finalized and locked")}</div>
          </div>
        </div>

        <div className="freedash-kpi">
          <div className="freedash-kpi-icon" style={{ background: "rgba(245,158,11,0.14)", color: "#d97706" }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
          </div>
          <div className="freedash-kpi-body">
            <div className="freedash-kpi-value">{loading ? "..." : o?.pendingApprovalCount || 0}</div>
            <div className="freedash-kpi-label">{tr("Pending Approval")}</div>
            <div className="freedash-kpi-sub">{tr("Awaiting review or final sign-off")}</div>
          </div>
        </div>

        <div className="freedash-kpi">
          <div className="freedash-kpi-icon" style={{ background: "rgba(197,160,89,0.16)", color: "#c5a059" }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            </svg>
          </div>
          <div className="freedash-kpi-body">
            <div className="freedash-kpi-value" style={{ color: "#16a34a" }}>
              {loading ? "..." : `${o?.completionRatePercent ?? 0}%`}
            </div>
            <div className="freedash-kpi-label">{tr("Completion Rate")}</div>
            <div className="freedash-kpi-sub">{tr("Percentage of ETRs completed")}</div>
          </div>
        </div>
      </section>

      {/* Charts Row */}
      {dashboard && (
        <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "20px" }}>
          <div className="freedash-dist-card">
            <h3 className="freedash-dist-title">{tr("ETR Status Funnel")}</h3>
            <p className="freedash-dist-sub">{tr("ETR records distribution by status (Draft → Completed).")}</p>
            <ApexChart options={donutOptions} height={300} />
          </div>
          <div className="freedash-dist-card">
            <h3 className="freedash-dist-title">{tr("Completion Rate")}</h3>
            <p className="freedash-dist-sub">{tr("Percentage of ETR records completed out of the total.")}</p>
            <ApexChart options={radialOptions} height={300} />
          </div>
          <div className="freedash-dist-card">
            <h3 className="freedash-dist-title">{tr("Compliance Overview")}</h3>
            <p className="freedash-dist-sub">
              {tr("Records by compliance group (completed, pending approval, returned, rejected, missing evidence).")}
            </p>
            <ApexChart options={columnOptions} height={300} />
          </div>
        </section>
      )}

      {/* Trend Chart — monthlyTrend từ backend (8 tháng gần nhất) */}
      {showTrend && (
        <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "20px" }}>
          <div className="freedash-dist-card">
            <h3 className="freedash-dist-title">{tr("Locked vs Returned Trend")}</h3>
            <p className="freedash-dist-sub">
              {tr("Records locked vs records returned by QA, per month over the last 8 months.")}
            </p>
            <ApexChart options={trendOptions} height={280} />
          </div>
        </section>
      )}

      {/* Action Items */}
      <section className="table-card" style={{ padding: "20px 24px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
          <div>
            <h2 style={{ fontSize: "16px", fontWeight: "700", color: "#002147", margin: 0 }}>{tr("ETR Action Items")}</h2>
            <p style={{ fontSize: "12px", color: "rgba(0,33,71,0.5)", margin: "4px 0 0" }}>
              {tr("Records needing review, sign-off, or evidence completion.")}
            </p>
          </div>
          <button className="dash-btn-sm" type="button" onClick={() => navigate("/trainingmanager/etr-approval")}>
            {tr("Approval Queue")} →
          </button>
        </div>
        {loading ? (
          <div className="dash-empty">{tr("Loading...")}</div>
        ) : actionRows.length === 0 ? (
          <div className="dash-empty">{tr("No action items.")}</div>
        ) : (
          <div className="pill-row">
            {actionRows.map((row) => (
              <button
                key={row.label}
                type="button"
                className={`dash-badge ${row.cls}`}
                style={{ cursor: "pointer", border: "none", background: "transparent" }}
                onClick={() => navigate("/trainingmanager/etr-approval")}
                title={tr("View approval queue")}
              >
                {row.label} · {row.count}
              </button>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};

export default TrainingManagerDashboard;
