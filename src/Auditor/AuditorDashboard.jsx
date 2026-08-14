import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import ApexChart from "../components/ApexChart";
import { useLanguage } from "../context/LanguageContext";
import {
  fetchDashboardStats,
  fetchEtrList,
  fetchAuditLogs,
  fetchExportJobs,
} from "./auditorApi";
import { fetchMyDashboard } from "../utils/dashboardApi";

const AuditorDashboard = () => {
  const navigate = useNavigate();
  const { trEn } = useLanguage();
  const [stats, setStats] = useState({
    totalLockedRecords: "...",
    complianceRate: "...",
    pendingAudit: "...",
    auditPackagesExported: "...",
  });
  const [recentETRs, setRecentETRs] = useState([]);
  const [recentLogs, setRecentLogs] = useState([]);
  const [recentExports, setRecentExports] = useState([]);
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  // Xu hướng ETR đã khóa theo tháng — dữ liệu thật từ danh sách ETR (lockedDate/completionDate)
  const [etrTrend, setEtrTrend] = useState({ categories: [], locked: [], returned: [] });

  useEffect(() => {
    const loadDashboardData = async () => {
      setLoading(true);
      try {
        const [statsData, etrsData, logsData, exportJobs, dashboard] =
          await Promise.all([
            fetchDashboardStats(),
            fetchEtrList(),
            fetchAuditLogs(),
            fetchExportJobs(),
            fetchMyDashboard(),
          ]);

        const ov = dashboard?.overview ?? null;
        const lockedCount = Array.isArray(etrsData)
          ? etrsData.filter((e) => e.isLocked).length
          : 0;
        setStats({
          totalLockedRecords:
            lockedCount || statsData?.totalLockedRecords || "...",
          complianceRate: ov
            ? ov.completionRatePercent
            : (statsData?.complianceRate ?? "..."),
          pendingAudit: ov
            ? ov.pendingApprovalCount
            : (statsData?.pendingAudit ?? "..."),
          auditPackagesExported: Array.isArray(exportJobs)
            ? exportJobs.length
            : (statsData?.auditPackagesExported ?? "..."),
        });
        if (Array.isArray(etrsData)) {
          setRecentETRs(etrsData.slice(0, 3));
          setEtrTrend(buildEtrTrend(etrsData));
        }
        if (Array.isArray(logsData)) setRecentLogs(logsData.slice(0, 3));
        if (Array.isArray(exportJobs)) setRecentExports(exportJobs.slice(0, 2));
        setDashboardData(dashboard);
      } catch (err) {
        console.error("Error loading Auditor Dashboard data:", err);
      } finally {
        setLoading(false);
      }
    };

    loadDashboardData();
  }, []);

  // ── Đếm hồ sơ ETR theo tháng (8 tháng gần nhất) cho biểu đồ đường cong ──
  // 2 chuỗi so sánh: locked (khóa/hoàn tất, theo completedAt/verifiedAt) và
  // returned (bị QA trả về, theo updatedAt của hồ sơ đang ở trạng thái trả về).
  const buildEtrTrend = (etrs) => {
    const buckets = {};
    const now = new Date();
    for (let i = 7; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${d.getMonth()}`;
      buckets[key] = {
        label: `${d.toLocaleString("en-US", { month: "short" })} ${String(d.getFullYear()).slice(2)}`,
        locked: 0,
        returned: 0,
      };
    }
    const bucketKey = (d) => {
      if (!d || Number.isNaN(d.getTime())) return null;
      return `${d.getFullYear()}-${d.getMonth()}`;
    };
    etrs.forEach((etr) => {
      const status = String(etr.statusRaw || etr.status || "").toLowerCase();
      const isReturned =
        status.includes("returned") ||
        status.includes("reopened") ||
        status.includes("rejected");
      if (isReturned) {
        const k = bucketKey(etr.returnedAtRaw ? new Date(etr.returnedAtRaw) : null);
        if (k && buckets[k]) buckets[k].returned += 1;
        return;
      }
      // Hồ sơ khóa/hoàn tất: ưu tiên completedAt → verifiedAt → submittedAt (raw ISO)
      const rawDate =
        etr.completedAtRaw || etr.verifiedAtRaw || etr.submittedAtRaw;
      const k = bucketKey(rawDate ? new Date(rawDate) : null);
      if (k && buckets[k]) buckets[k].locked += 1;
    });
    const keys = Object.keys(buckets);
    return {
      categories: keys.map((k) => buckets[k].label),
      locked: keys.map((k) => buckets[k].locked),
      returned: keys.map((k) => buckets[k].returned),
    };
  };

  // Dữ liệu overview của /Dashboard/my-dashboard (dùng cho radial + total donut)
  const ov = dashboardData?.overview ?? null;
  const totalEtrs = ov?.totalEtrs || 0;

  // ── Biểu đồ ApexCharts (thư viện chart của FreeDash) ──
  // Donut: phân bố trạng thái ETR (statusFunnel)
  const donutOptions = useMemo(() => {
    const f = dashboardData?.funnel ?? null;
    const labels = [
      trEn("Draft"),
      trEn("InProgress"),
      trEn("Submitted"),
      trEn("Verified"),
      trEn("Completed"),
      trEn("Returned For Correction"),
      trEn("Cancelled"),
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
      colors: [
        "#94a3b8",
        "#0a2c55",
        "#6366f1",
        "#06b6d4",
        "#22c55e",
        "#f59e0b",
        "#ef4444",
      ],
      legend: {
        position: "bottom",
        fontSize: "12px",
        fontFamily: "inherit",
        labels: { colors: "rgba(0,33,71,0.75)" },
      },
      dataLabels: { enabled: false },
      plotOptions: {
        pie: {
          donut: {
            size: "68%",
            labels: {
              show: true,
              total: {
                show: true,
                label: trEn("Total ETRs"),
                fontSize: "12px",
                color: "rgba(0,33,71,0.5)",
                formatter: () => String(totalEtrs),
              },
            },
          },
        },
      },
      tooltip: { y: { formatter: (v) => `${v} ${trEn("records")}` } },
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dashboardData, totalEtrs]);

  // Radial: tỷ lệ hoàn thành
  const radialOptions = useMemo(() => {
    const rate = ov?.completionRatePercent || 0;
    return {
      chart: { type: "radialBar", fontFamily: "inherit" },
      series: [Math.min(100, rate)],
      labels: [trEn("Completion Rate")],
      colors: ["#22c55e"],
      plotOptions: {
        radialBar: {
          hollow: { size: "62%" },
          // Tách label (name) và số (value) ra xa nhau — offsetY cũ (-6/+4) làm
          // số 28px đè lên label. Value nhích lên, name đẩy xuống, chừa khoảng trống.
          dataLabels: {
            name: {
              fontSize: "13px",
              color: "rgba(0,33,71,0.55)",
              offsetY: 18,
            },
            value: {
              fontSize: "24px",
              fontWeight: 700,
              color: "#002147",
              offsetY: -12,
              formatter: (v) => `${Math.round(v)}%`,
            },
          },
        },
      },
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ov]);

  // Đường cong (smooth area) so sánh 2 chuỗi: Locked vs Returned theo tháng — 8 tháng gần nhất
  const trendOptions = useMemo(() => {
    return {
      chart: { type: "area", fontFamily: "inherit", toolbar: { show: false } },
      series: [
        {
          name: trEn("Locked"),
          data: etrTrend.locked,
        },
        {
          name: trEn("Returned"),
          data: etrTrend.returned,
        },
      ],
      xaxis: {
        categories: etrTrend.categories,
        labels: { style: { colors: "rgba(0,33,71,0.65)", fontSize: "11px" } },
      },
      colors: ["#c5a059", "#ef4444"],
      stroke: { curve: "smooth", width: 3 },
      fill: {
        type: "gradient",
        gradient: {
          shadeIntensity: 1,
          opacityFrom: 0.3,
          opacityTo: 0.05,
          stops: [0, 90],
        },
      },
      markers: { size: 4, colors: ["#c5a059", "#ef4444"], strokeColors: "#fff", strokeWidth: 2 },
      dataLabels: { enabled: false },
      legend: {
        position: "top",
        fontSize: "12px",
        fontFamily: "inherit",
        labels: { colors: "rgba(0,33,71,0.75)" },
      },
      grid: { borderColor: "#eef2f7" },
      tooltip: { y: { formatter: (v) => `${v} ${trEn("records")}` } },
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [etrTrend]);

  // Cột: tổng quan tuân thủ
  const columnOptions = useMemo(() => {
    const o = dashboardData?.overview ?? null;
    return {
      chart: { type: "bar", fontFamily: "inherit", toolbar: { show: false } },
      series: [
        {
          name: trEn("Records"),
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
        categories: [
          trEn("Completed"),
          trEn("Pending Approval"),
          trEn("Returned"),
          trEn("Rejected"),
          trEn("Missing Evidence"),
        ],
        labels: { style: { colors: "rgba(0,33,71,0.65)", fontSize: "11px" } },
      },
      colors: ["#0a2c55"],
      plotOptions: { bar: { borderRadius: 5, columnWidth: "52%" } },
      dataLabels: { enabled: false },
      grid: { borderColor: "#eef2f7" },
      tooltip: { y: { formatter: (v) => `${v} ${trEn("records")}` } },
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dashboardData]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
      {/* Header Card */}

      {/* KPI Cards — phong cách FreeDash (card sáng + icon + badge %), giữ tông navy/gold */}
      <section className="freedash-kpi-grid">
        <div className="freedash-kpi">
          <div
            className="freedash-kpi-icon"
            style={{ background: "rgba(10,44,85,0.08)", color: "#0a2c55" }}
          >
            <svg
              width="22"
              height="22"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
          </div>
          <div className="freedash-kpi-body">
            <div className="freedash-kpi-value">
              {stats.totalLockedRecords}
              {ov?.completionRatePercent > 0 && (
                <span
                  className="freedash-kpi-badge"
                  style={{
                    background: "rgba(34,197,94,0.12)",
                    color: "#16a34a",
                  }}
                >
                  {ov.completionRatePercent}%
                </span>
              )}
            </div>
            <div className="freedash-kpi-label">
              {trEn("Total Locked Records")}
            </div>
            <div className="freedash-kpi-sub">
              {trEn("IsLocked = true Records")}
            </div>
          </div>
        </div>

        <div className="freedash-kpi">
          <div
            className="freedash-kpi-icon"
            style={{ background: "rgba(34,197,94,0.12)", color: "#16a34a" }}
          >
            <svg
              width="22"
              height="22"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              <path d="M9 12l2 2 4-4" />
            </svg>
          </div>
          <div className="freedash-kpi-body">
            <div className="freedash-kpi-value" style={{ color: "#16a34a" }}>
              {stats.complianceRate}%
            </div>
            <div className="freedash-kpi-label">{trEn("Compliance Rate")}</div>
            <div className="freedash-kpi-sub">
              {trEn("0 Compliance Breaches")}
            </div>
          </div>
        </div>

        <div className="freedash-kpi">
          <div
            className="freedash-kpi-icon"
            style={{ background: "rgba(245,158,11,0.14)", color: "#d97706" }}
          >
            <svg
              width="22"
              height="22"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
          </div>
          <div className="freedash-kpi-body">
            <div className="freedash-kpi-value" style={{ color: "#d97706" }}>
              {stats.pendingAudit}
            </div>
            <div className="freedash-kpi-label">{trEn("Pending Audit")}</div>
            <div className="freedash-kpi-sub">
              {trEn("Scheduled Inspections")}
            </div>
          </div>
        </div>

        <div className="freedash-kpi">
          <div
            className="freedash-kpi-icon"
            style={{ background: "rgba(197,160,89,0.16)", color: "#c5a059" }}
          >
            <svg
              width="22"
              height="22"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
          </div>
          <div className="freedash-kpi-body">
            <div className="freedash-kpi-value">
              {stats.auditPackagesExported}
            </div>
            <div className="freedash-kpi-label">
              {trEn("Audit Packages Exported")}
            </div>
            <div className="freedash-kpi-sub">
              {trEn("Regulatory Archives")}
            </div>
          </div>
        </div>
      </section>

      {/* Charts row — ApexCharts kiểu FreeDash (donut + radial + cột) */}
      {dashboardData && (
        <section
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
            gap: "20px",
          }}
        >
          <div className="freedash-dist-card">
            <h3 className="freedash-dist-title">{trEn("ETR Status Funnel")}</h3>
            <p className="freedash-dist-sub">
              {trEn("ETR records distribution by status (Draft → Completed).")}
            </p>
            <ApexChart options={donutOptions} height={300} />
          </div>
          <div className="freedash-dist-card">
            <h3 className="freedash-dist-title">{trEn("Completion Rate")}</h3>
            <p className="freedash-dist-sub">
              {trEn("Percentage of ETR records completed out of the total.")}
            </p>
            <ApexChart options={radialOptions} height={300} />
          </div>
          <div className="freedash-dist-card">
            <h3 className="freedash-dist-title">
              {trEn("Compliance Overview")}
            </h3>
            <p className="freedash-dist-sub">
              {trEn(
                "Records by compliance group (completed, pending approval, returned, rejected, missing evidence).",
              )}
            </p>
            <ApexChart options={columnOptions} height={300} />
          </div>
        </section>
      )}

      {/* Line chart — đường cong so sánh Locked vs Returned theo tháng (8 tháng gần nhất) */}
      {etrTrend.locked.some((c) => c > 0) && (
        <section
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
            gap: "20px",
          }}
        >
          <div className="freedash-dist-card">
            <h3 className="freedash-dist-title">
              {trEn("Locked vs Returned Trend")}
            </h3>
            <p className="freedash-dist-sub">
              {trEn(
                "Records locked vs records returned by QA, per month over the last 8 months (smooth curves).",
              )}
            </p>
            <ApexChart options={trendOptions} height={280} />
          </div>
        </section>
      )}

      {/* Section 1: Recently Locked Records */}
      <section className="table-card">
        <div className="table-toolbar">
          <div className="toolbar-left">
            <h2
              style={{
                fontSize: "16px",
                fontWeight: "700",
                color: "#002147",
                margin: 0,
              }}
            >
              {trEn("Recently Locked Records (Finalized ETRs)")}
            </h2>
          </div>
          <div className="toolbar-right">
            <button
              className="auditor-btn-sm"
              onClick={() => navigate("/auditor/etrs")}
            >
              {trEn("View All")} ({recentETRs.length}) →
            </button>
          </div>
        </div>

        <div className="table-responsive-scroll">
          <div className="table-header auditor-table-grid">
            <div>{trEn("ETR ID")}</div>
            <div>{trEn("Learner")}</div>
            <div>{trEn("Course")}</div>
            <div>{trEn("Completion")}</div>
            <div>{trEn("Locked Date")}</div>
            <div>{trEn("Approved By")}</div>
            <div>{trEn("Status")}</div>
            <div style={{ textAlign: "right" }}>{trEn("Actions")}</div>
          </div>
          <div className="table-body">
            {loading ? (
              <div className="empty-table-state">
                {trEn("Loading locked records...")}
              </div>
            ) : recentETRs.length === 0 ? (
              <div className="empty-table-state">
                {trEn("No locked ETR records available.")}
              </div>
            ) : (
              recentETRs.map((etr) => (
                <div key={etr.id} className="table-row auditor-table-grid">
                  <div className="col-id">{etr.id}</div>
                  <div className="col-name">{etr.learnerName}</div>
                  <div className="col-course">{etr.courseName}</div>
                  <div>{etr.completionDate}</div>
                  <div>{etr.lockedDate}</div>
                  <div>{etr.approvedBy}</div>
                  <div>
                    <span className="badge-locked">
                      <svg
                        width="10"
                        height="10"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.5"
                      >
                        <rect
                          x="3"
                          y="11"
                          width="18"
                          height="11"
                          rx="2"
                          ry="2"
                        />
                        <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                      </svg>
                      {etr.status || trEn("Locked")}
                    </span>
                  </div>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "flex-end",
                      gap: "8px",
                    }}
                  >
                    <button
                      className="auditor-btn-sm"
                      onClick={() =>
                        navigate(`/auditor/details?id=${etr.etrCourseRecordId}`)
                      }
                    >
                      {trEn("View Details")}
                    </button>
                    <button
                      className="auditor-btn-sm"
                      onClick={() => navigate("/auditor/export-packages")}
                    >
                      {trEn("Export")}
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </section>

      {/* Grid containing Recent Audit Logs & Recent Export History */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(400px, 1fr))",
          gap: "20px",
        }}
      >
        {/* Section 2: Recent Audit Logs */}
        <section className="table-card" style={{ padding: "20px" }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "16px",
            }}
          >
            <h2
              style={{
                fontSize: "15px",
                fontWeight: "700",
                color: "#002147",
                margin: 0,
              }}
            >
              {trEn("Recent Audit Trail Events")}
            </h2>
            <button
              className="auditor-btn-sm"
              onClick={() => navigate("/auditor/audit-logs")}
            >
              {trEn("View All Logs")} →
            </button>
          </div>
          <div
            style={{ display: "flex", flexDirection: "column", gap: "12px" }}
          >
            {recentLogs.map((log) => (
              <div
                key={log.id}
                style={{
                  padding: "12px 14px",
                  borderRadius: "12px",
                  background: "#f8fafc",
                  border: "1px solid #dfe6f1",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    marginBottom: "4px",
                  }}
                >
                  <span
                    style={{
                      fontSize: "11px",
                      fontWeight: "700",
                      color: "#c5a059",
                    }}
                  >
                    {log.action}
                  </span>
                  <span
                    style={{ fontSize: "11px", color: "rgba(0,33,71,0.5)" }}
                  >
                    {log.timestamp}
                  </span>
                </div>
                <div
                  style={{
                    fontSize: "13px",
                    color: "#002147",
                    fontWeight: "600",
                  }}
                >
                  {log.user}
                </div>
                <div
                  style={{
                    fontSize: "12px",
                    color: "rgba(0,33,71,0.7)",
                    marginTop: "4px",
                  }}
                >
                  {log.details}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Section 3: Recent Export History */}
        <section className="table-card" style={{ padding: "20px" }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "16px",
            }}
          >
            <h2
              style={{
                fontSize: "15px",
                fontWeight: "700",
                color: "#002147",
                margin: 0,
              }}
            >
              {trEn("Recent Export History")}
            </h2>
            <button
              className="auditor-btn-sm"
              onClick={() => navigate("/auditor/export-packages")}
            >
              {trEn("Export Center")} →
            </button>
          </div>
          <div
            style={{ display: "flex", flexDirection: "column", gap: "12px" }}
          >
            {recentExports.map((pkg) => (
              <div
                key={pkg.id}
                style={{
                  padding: "12px 14px",
                  borderRadius: "12px",
                  background: "#f8fafc",
                  border: "1px solid #dfe6f1",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <div>
                  <div
                    style={{
                      fontSize: "13px",
                      fontWeight: "700",
                      color: "#002147",
                    }}
                  >
                    {pkg.name}
                  </div>
                  <div
                    style={{
                      fontSize: "11px",
                      color: "rgba(0,33,71,0.5)",
                      marginTop: "2px",
                    }}
                  >
                    {pkg.type} • {pkg.size} • {pkg.generatedDate}
                  </div>
                </div>
                <span className="badge-compliant" style={{ fontSize: "10px" }}>
                  {trEn("Verified")}
                </span>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
};

export default AuditorDashboard;
