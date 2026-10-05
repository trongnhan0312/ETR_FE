import { useState, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { api, parseApiError, formatDateTime } from "../utils/api";
import { useToast } from "./Toast";
import { useLanguage } from "../context/LanguageContext";
import { downloadExportFile } from "../Auditor/auditorApi";
import PromptModal from "./PromptModal";
import ConfirmModal from "./ConfirmModal";
import "./etr-dossier.scss";

const EtrDossierModal = ({ etrId, isOpen, onClose, onActionSuccess }) => {
  const { tr } = useLanguage();
  const toast = useToast();

  const [dossier, setDossier] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState("overview");

  // Prompt / Confirm Modal states for actions
  const [promptAction, setPromptAction] = useState(null); // 'return' | 'reopen'
  const [confirmAction, setConfirmAction] = useState(null); // 'submit' | 'verify' | 'complete'
  const [actionSubmitting, setActionSubmitting] = useState(false);

  // Accordion open/close state for subjects
  const [openSubjects, setOpenSubjects] = useState({});

  const toggleSubject = (subId) => {
    setOpenSubjects((prev) => ({
      ...prev,
      [subId]: !prev[subId],
    }));
  };

  const loadDossier = useCallback(async () => {
    if (!etrId) return;
    setLoading(true);
    setError("");
    try {
      const data = await api.get(`/Etr/${etrId}/dossier`);
      setDossier(data);
      // Auto open first subject if available
      if (data?.subjects?.length > 0) {
        setOpenSubjects({ [data.subjects[0].subjectId]: true });
      }
    } catch (err) {
      console.error("Error loading ETR Dossier:", err);
      setError(parseApiError(err, tr("Unable to load detailed ETR dossier.")));
    } finally {
      setLoading(false);
    }
  }, [etrId, tr]);

  useEffect(() => {
    if (isOpen && etrId) {
      loadDossier();
    } else {
      setDossier(null);
      setError("");
      setActiveTab("overview");
    }
  }, [isOpen, etrId, loadDossier]);

  if (!isOpen) return null;

  // Actions execution
  const handleExecuteAction = async (actionType, comment = null) => {
    setActionSubmitting(true);
    try {
      if (actionType === "submit") {
        await api.post(`/Etr/${etrId}/submit`);
        toast.success(tr("ETR dossier submitted for verification successfully."));
      } else if (actionType === "verify") {
        await api.post(`/Etr/${etrId}/verify`);
        toast.success(tr("QA verified ETR dossier successfully."));
      } else if (actionType === "complete") {
        await api.post(`/Etr/${etrId}/complete`);
        toast.success(tr("Training Manager approved and completed ETR dossier."));
      } else if (actionType === "return") {
        await api.post(`/Etr/${etrId}/return`, { comment });
        toast.success(tr("ETR dossier returned for correction."));
      } else if (actionType === "reopen") {
        await api.post(`/Etr/${etrId}/reopen`, { comment });
        toast.success(tr("Administrator reopened ETR dossier successfully."));
      } else if (actionType === "exportPdf") {
        toast.info(tr("Generating PDF report..."));
        const job = await api.post(`/Exports/pdf`, { etrCourseRecordId: Number(etrId) });
        const jobId = job?.exportJobId ?? job?.ExportJobId;
        if (!jobId) {
          throw new Error(tr("Export job could not be created."));
        }
        let status = job?.status ?? job?.Status ?? "";
        for (let i = 0; i < 20; i++) {
          if (String(status).toLowerCase() === "completed") break;
          await new Promise((r) => setTimeout(r, 600));
          const detail = await api.get(`/Exports/${jobId}`).catch(() => null);
          status = detail?.status ?? detail?.Status ?? status;
        }
        const fileName = job?.fileName ?? job?.FileName ?? `ETR_${etrId}_Summary.pdf`;
        await downloadExportFile(jobId, fileName);
        toast.success(tr("PDF report downloaded successfully."));
      }

      setConfirmAction(null);
      setPromptAction(null);
      await loadDossier();
      if (onActionSuccess) onActionSuccess();
    } catch (err) {
      toast.error(parseApiError(err, tr("Action failed.")));
    } finally {
      setActionSubmitting(false);
    }
  };

  const allowedActions = dossier?.allowedActions || [];

  return createPortal(
    <div className="etr-dossier-overlay" onClick={onClose}>
      <div className="etr-dossier-modal" onClick={(e) => e.stopPropagation()}>
        {/* HEADER */}
        <div className="dossier-header">
          <div className="header-info">
            <div className="title-row">
              <h2 style={{ color: "#ffffff", margin: 0, fontSize: "18px", fontWeight: "800" }}>
                {tr("ETR Dossier")} #{dossier?.etrCourseRecordId || etrId}
                {dossier?.student && ` — ${dossier.student.fullName} (${dossier.student.userCode})`}
              </h2>
              {dossier && (
                <span className={`status-badge ${(dossier.status || "").toLowerCase()}`}>
                  {dossier.status}
                </span>
              )}
            </div>
            <p className="meta-subtitle">
              {tr("Course")}: <strong>{dossier?.course?.courseName || "—"}</strong> ({dossier?.course?.courseCode || "—"} · {tr("Version")} v{dossier?.courseVersionNo || 1}) • {tr("Class")}: <strong>{dossier?.class?.className || "—"}</strong> ({dossier?.class?.classCode || "—"})
            </p>
          </div>

          <div className="header-actions">
            {allowedActions.includes("Submit") && (
              <button
                className="action-btn btn-submit"
                onClick={() => setConfirmAction("submit")}
                disabled={actionSubmitting}
              >
                📤 {tr("Submit Dossier")}
              </button>
            )}

            {allowedActions.includes("Verify") && (
              <button
                className="action-btn btn-verify"
                onClick={() => setConfirmAction("verify")}
                disabled={actionSubmitting}
              >
                ✓ {tr("QA Verify")}
              </button>
            )}

            {allowedActions.includes("Complete") && (
              <button
                className="action-btn btn-complete"
                onClick={() => setConfirmAction("complete")}
                disabled={actionSubmitting}
              >
                🏆 {tr("Approve & Complete")}
              </button>
            )}

            {allowedActions.includes("Return") && (
              <button
                className="action-btn btn-return"
                onClick={() => setPromptAction("return")}
                disabled={actionSubmitting}
              >
                ↩ {tr("Return for Correction")}
              </button>
            )}

            {allowedActions.includes("Reopen") && (
              <button
                className="action-btn btn-reopen"
                onClick={() => setPromptAction("reopen")}
                disabled={actionSubmitting}
              >
                🔓 {tr("Re-open Record")}
              </button>
            )}

            {allowedActions.includes("ExportPdf") && (
              <button
                className="action-btn btn-export"
                onClick={() => handleExecuteAction("exportPdf")}
                disabled={actionSubmitting}
              >
                📄 {tr("Export PDF")}
              </button>
            )}

            <button className="close-btn" onClick={onClose} aria-label={tr("Close")}>
              &times;
            </button>
          </div>
        </div>

        {/* TAB NAVIGATION */}
        <div className="dossier-tabs">
          <button
            className={`tab-item ${activeTab === "overview" ? "active" : ""}`}
            onClick={() => setActiveTab("overview")}
          >
            {tr("1. Overview & Progress")}
          </button>
          <button
            className={`tab-item ${activeTab === "subjects" ? "active" : ""}`}
            onClick={() => setActiveTab("subjects")}
          >
            {tr("2. Subjects & Assessments")}
          </button>
          <button
            className={`tab-item ${activeTab === "sessions" ? "active" : ""}`}
            onClick={() => setActiveTab("sessions")}
          >
            {tr("3. Sessions & Logbook")}
          </button>
          {dossier?.credentials && (
            <button
              className={`tab-item ${activeTab === "credentials" ? "active" : ""}`}
              onClick={() => setActiveTab("credentials")}
            >
              {tr("4. Credentials & Medical")}
            </button>
          )}
          <button
            className={`tab-item ${activeTab === "evidences" ? "active" : ""}`}
            onClick={() => setActiveTab("evidences")}
          >
            {tr("5. Training Evidences")}
          </button>
          <button
            className={`tab-item ${activeTab === "approvalHistory" ? "active" : ""}`}
            onClick={() => setActiveTab("approvalHistory")}
          >
            {tr("6. Processing History")}
          </button>
        </div>

        {/* MODAL BODY */}
        <div className="dossier-body">
          {loading && (
            <div style={{ textAlign: "center", padding: "60px 20px", color: "#64748b" }}>
              <div style={{ fontSize: "24px", marginBottom: "12px" }}>⏳</div>
              <strong>{tr("Loading ETR Dossier details...")}</strong>
            </div>
          )}

          {error && (
            <div style={{ background: "#fee2e2", border: "1px solid #fecaca", padding: "16px", borderRadius: "8px", color: "#b91c1c" }}>
              <strong>⚠️ {tr("Error:")}</strong> {error}
            </div>
          )}

          {!loading && !error && dossier && (
            <>
              {/* TAB 1: OVERVIEW & READINESS */}
              {activeTab === "overview" && (
                <div>
                  <div className="metrics-grid">
                    <div className="metric-card">
                      <div className="metric-label">{tr("Completed Subjects")}</div>
                      <div className="metric-value">
                        {dossier.readiness?.passedSubjects} / {dossier.readiness?.totalSubjects}
                      </div>
                      <div className="metric-desc">{tr("Passed or exempted subjects per Course Version")}</div>
                    </div>
                    <div className="metric-card">
                      <div className="metric-label">{tr("Average Attendance")}</div>
                      <div className="metric-value">{dossier.readiness?.averageAttendance}%</div>
                      <div className="metric-desc">{tr("Training and classroom participation rate")}</div>
                    </div>
                    <div className="metric-card">
                      <div className="metric-label">{tr("Actual Flight Hours")}</div>
                      <div className="metric-value">{dossier.readiness?.totalFlightHours}h</div>
                      <div className="metric-desc">{tr("Logged and verified flight hours")}</div>
                    </div>
                    <div className="metric-card">
                      <div className="metric-label">{tr("Simulator Hours (FSTD/SIM)")}</div>
                      <div className="metric-value">{dossier.readiness?.totalSimulatorHours}h</div>
                      <div className="metric-desc">{tr("Logged and verified simulator hours")}</div>
                    </div>
                    <div className="metric-card">
                      <div className="metric-label">{tr("Readiness Status")}</div>
                      <div className="metric-value" style={{ color: dossier.readiness?.overallReadinessStatus === "Met" ? "#10b981" : "#b45309" }}>
                        {dossier.readiness?.overallReadinessStatus === "Met" ? tr("ELIGIBLE (MET)") : tr("NOT MET")}
                      </div>
                      <div className="metric-desc">{tr("Evaluation against course completion rules")}</div>
                    </div>
                  </div>

                  {dossier.readiness?.pendingConditions?.length > 0 && (
                    <div className="compliance-alert">
                      <div className="alert-icon">⚠️</div>
                      <div>
                        <strong>{tr("Pending conditions for course completion:")}</strong>
                        <ul style={{ margin: "6px 0 0 16px", padding: 0 }}>
                          {dossier.readiness.pendingConditions.map((cond, idx) => (
                            <li key={idx}>{cond}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  )}

                  <div className="section-card">
                    <div className="section-header">
                      <h3>{tr("Trainee & Training Information")}</h3>
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", fontSize: "12px" }}>
                      <div>
                        <p style={{ margin: "4px 0" }}><strong>{tr("Full Name")}:</strong> {dossier.student?.fullName}</p>
                        <p style={{ margin: "4px 0" }}><strong>{tr("Trainee ID")}:</strong> {dossier.student?.userCode}</p>
                        {dossier.student?.email && (
                          <p style={{ margin: "4px 0" }}><strong>{tr("Email")}:</strong> {dossier.student.email}</p>
                        )}
                        {dossier.student?.phone && (
                          <p style={{ margin: "4px 0" }}><strong>{tr("Phone")}:</strong> {dossier.student.phone}</p>
                        )}
                      </div>
                      <div>
                        <p style={{ margin: "4px 0" }}><strong>{tr("Course")}:</strong> {dossier.course?.courseName} ({dossier.course?.courseCode})</p>
                        <p style={{ margin: "4px 0" }}><strong>{tr("Course Version")}:</strong> Version {dossier.courseVersionNo}</p>
                        <p style={{ margin: "4px 0" }}><strong>{tr("Training Class")}:</strong> {dossier.class?.className} ({dossier.class?.classCode})</p>
                        <p style={{ margin: "4px 0" }}><strong>{tr("Class Duration")}:</strong> {dossier.class?.startDate ? formatDateTime(dossier.class.startDate) : "N/A"} → {dossier.class?.endDate ? formatDateTime(dossier.class.endDate) : "N/A"}</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: SUBJECTS & ASSESSMENTS */}
              {activeTab === "subjects" && (
                <div>
                  <div style={{ marginBottom: "16px", fontSize: "12px", color: "#64748b" }}>
                    💡 <em>{tr("Course subjects and requirements are displayed based on the snapshot at enrollment time.")}</em>
                  </div>

                  {(dossier.subjects || []).map((sub) => {
                    const isOpenSubject = !!openSubjects[sub.subjectId];
                    const isPassed = sub.status === "Passed" || sub.status === "Exempted";

                    return (
                      <div key={sub.subjectResultId} className="subject-accordion">
                        <div className="subject-summary" onClick={() => toggleSubject(sub.subjectId)}>
                          <div className="sub-title">
                            {sub.subjectCode} — {sub.subjectName}
                            <span style={{ marginLeft: "8px", fontSize: "11px", fontWeight: "normal", color: "#64748b" }}>
                              ({sub.subjectType} · {tr("Required")}: {sub.requiredHours}h · {tr("Passing Score")}: {sub.passingScore})
                            </span>
                          </div>
                          <div className="sub-badges">
                            <span style={{ fontSize: "11px", color: "#64748b" }}>
                              {tr("Score")}: <strong>{sub.score != null ? sub.score : "—"}</strong> | {tr("Attendance")}: <strong>{sub.attendanceRate != null ? `${sub.attendanceRate}%` : "—"}</strong>
                            </span>
                            <span
                              style={{
                                padding: "2px 8px",
                                borderRadius: "12px",
                                fontSize: "11px",
                                fontWeight: "700",
                                background: isPassed ? "#dcfce7" : "#fee2e2",
                                color: isPassed ? "#15803d" : "#b91c1c",
                              }}
                            >
                              {sub.status}
                            </span>
                            <span style={{ fontSize: "14px", color: "#94a3b8" }}>{isOpenSubject ? "▲" : "▼"}</span>
                          </div>
                        </div>

                        {isOpenSubject && (
                          <div className="subject-details">
                            {/* Signoff info */}
                            <div style={{ background: "#f8fafc", padding: "10px 14px", borderRadius: "8px", marginBottom: "14px", fontSize: "12px", border: "1px solid #e2e8f0" }}>
                              <strong>{tr("Subject Signoff:")}</strong>{" "}
                              {sub.isSignedOff ? (
                                <span style={{ color: "#15803d" }}>
                                  ✓ {tr("Signed off by")} <strong>{sub.signoffByName || tr("Instructor")}</strong> ({sub.signoffRole || "Instructor"}) {tr("at")} {sub.signedOffAt ? formatDateTime(sub.signedOffAt) : "N/A"}.
                                  {sub.signoffComment && <em> — {tr("Note")}: "{sub.signoffComment}"</em>}
                                </span>
                              ) : (
                                <span style={{ color: "#b45309" }}>⏳ {tr("Not signed off yet by assigned instructor.")}</span>
                              )}
                            </div>

                            {/* Assessments */}
                            <div style={{ marginBottom: "16px" }}>
                              <h4 style={{ margin: "0 0 8px 0", fontSize: "13px", color: "#002147" }}>
                                📝 {tr("Assessments")}
                              </h4>
                              {sub.assessments?.length === 0 ? (
                                <p style={{ fontSize: "12px", color: "#94a3b8", margin: 0 }}>{tr("No assessments recorded for this subject.")}</p>
                              ) : (
                                <table className="dossier-table">
                                  <thead>
                                    <tr>
                                      <th>{tr("ASSESSMENT NAME")}</th>
                                      <th>{tr("TYPE")}</th>
                                      <th>{tr("WEIGHT")}</th>
                                      <th>{tr("PASSING SCORE")}</th>
                                      <th>{tr("SCORE")}</th>
                                      <th>{tr("ATTEMPT")}</th>
                                      <th>{tr("RESULTS")}</th>
                                      <th>{tr("EVALUATOR")}</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {sub.assessments.map((a) => (
                                      <tr key={a.assessmentResultId}>
                                        <td><strong>{a.componentName}</strong></td>
                                        <td>{a.assessmentType}</td>
                                        <td>{a.weight}%</td>
                                        <td>{a.passingScore}</td>
                                        <td><strong>{a.score}</strong></td>
                                        <td>{tr("Attempt")} {a.attemptNo}</td>
                                        <td>
                                          <span style={{ color: a.resultStatus === "Pass" ? "#16a34a" : "#dc2626", fontWeight: "700" }}>
                                            {a.resultStatus}
                                          </span>
                                        </td>
                                        <td>{a.gradedByName || "—"}</td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              )}
                            </div>

                            {/* Practical Checklists */}
                            <div>
                              <h4 style={{ margin: "0 0 8px 0", fontSize: "13px", color: "#002147" }}>
                                📋 {tr("Practical Checklists")}
                              </h4>
                              {sub.practicalChecklists?.length === 0 ? (
                                <p style={{ fontSize: "12px", color: "#94a3b8", margin: 0 }}>{tr("No practical checklists recorded for this subject.")}</p>
                              ) : (
                                <table className="dossier-table">
                                  <thead>
                                    <tr>
                                      <th>{tr("TASK / ITEM NAME")}</th>
                                      <th>{tr("RESULT")}</th>
                                      <th>{tr("VERIFIER")}</th>
                                      <th>{tr("COMPLETED DATE")}</th>
                                      <th>{tr("COMMENTS")}</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {sub.practicalChecklists.map((pc) => (
                                      <tr key={pc.practicalChecklistResultId}>
                                        <td><strong>{pc.itemName}</strong></td>
                                        <td>
                                          <span style={{ color: pc.resultStatus === "Pass" ? "#16a34a" : "#dc2626", fontWeight: "700" }}>
                                            {pc.resultStatus}
                                          </span>
                                        </td>
                                        <td>{pc.verifiedByName || "—"}</td>
                                        <td>{pc.completedAt ? formatDateTime(pc.completedAt) : "—"}</td>
                                        <td>{pc.verificationComment || "—"}</td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {/* TAB 3: SESSIONS & TRAINING LOG */}
              {activeTab === "sessions" && (
                <div>
                  <div className="compliance-alert">
                    <div className="alert-icon">ℹ️</div>
                    <div>
                      <strong>{tr("Data Scope & Compliance Notice:")}</strong>
                      <div style={{ marginTop: "4px" }}>
                        • {tr("System tracks")} <strong>{tr("Assigned Instructor")}</strong> ({tr("by class subject")}) {tr("and")} <strong>{tr("Signed Instructor")}</strong> ({tr("digital signature on session logbook")}).<br />
                        • <em>{tr("Actual conducting instructor is not tracked separately in current schema (substitute teaching field pending).")}</em><br />
                        • <em>{tr("Historical qualification snapshot at session date is not tracked; competence is not inferred solely from signature.")}</em>
                      </div>
                    </div>
                  </div>

                  <div className="section-card">
                    <div className="section-header">
                      <h3>{tr("Detailed Session Logbook & Flight/SIM Hours")}</h3>
                    </div>

                    <div style={{ overflowX: "auto" }}>
                      <table className="dossier-table">
                        <thead>
                          <tr>
                            <th>{tr("Session / Lesson")}</th>
                            <th>{tr("Date")}</th>
                            <th>{tr("Type")}</th>
                            <th>{tr("Attendance")}</th>
                            <th>{tr("Hours")}</th>
                            <th>{tr("Routing / Device")}</th>
                            <th>{tr("Assigned Instructor")}</th>
                            <th>{tr("Signed By")}</th>
                            <th>{tr("Conducting Note")}</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(dossier.subjects || []).flatMap((sub) =>
                            (sub.sessions || []).map((sess) => (
                              <tr key={sess.sessionId}>
                                <td>
                                  <strong>{sess.sessionTitle}</strong>
                                  {sess.lessonCode && <div style={{ fontSize: "10px", color: "#64748b" }}>{tr("Code")}: {sess.lessonCode}</div>}
                                  <div style={{ fontSize: "10px", color: "#0284c7" }}>{tr("Subject")}: {sub.subjectCode}</div>
                                </td>
                                <td>{sess.sessionDate ? formatDateTime(sess.sessionDate) : "—"}</td>
                                <td>
                                  <span style={{ fontWeight: "600" }}>{sess.trainingType}</span>
                                </td>
                                <td>
                                  <span
                                    style={{
                                      padding: "2px 6px",
                                      borderRadius: "4px",
                                      fontSize: "10px",
                                      fontWeight: "700",
                                      background: sess.attendanceStatus === "Present" ? "#dcfce7" : "#f1f5f9",
                                      color: sess.attendanceStatus === "Present" ? "#16a34a" : "#64748b",
                                    }}
                                  >
                                    {sess.attendanceStatus}
                                  </span>
                                </td>
                                <td>
                                  {sess.flightHours != null && <div>{tr("Flight")}: <strong>{sess.flightHours}h</strong></div>}
                                  {sess.simulatorHours != null && <div>{tr("SIM")}: <strong>{sess.simulatorHours}h</strong></div>}
                                  {sess.flightHours == null && sess.simulatorHours == null && <div>—</div>}
                                </td>
                                <td>
                                  {sess.departureIcao && <div>{tr("Route")}: {sess.departureIcao} → {sess.arrivalIcao || "?"}</div>}
                                  {sess.aircraftRegistration && <div>{tr("Aircraft")}: {sess.aircraftRegistration}</div>}
                                  {sess.simulatorDevice && <div>{tr("Device")}: {sess.simulatorDevice}</div>}
                                  {!sess.departureIcao && !sess.aircraftRegistration && !sess.simulatorDevice && <div>{sess.location || tr("Classroom")}</div>}
                                </td>
                                <td>{sess.assignedInstructorName || "—"}</td>
                                <td>
                                  {sess.signedInstructorName ? (
                                    <div>
                                      <strong>{sess.signedInstructorName}</strong>
                                      {sess.instructorSignedAt && (
                                        <div style={{ fontSize: "10px", color: "#16a34a" }}>
                                          {tr("Signed")}: {formatDateTime(sess.instructorSignedAt)}
                                        </div>
                                      )}
                                    </div>
                                  ) : (
                                    <span style={{ color: "#94a3b8" }}>{tr("Unsigned")}</span>
                                  )}
                                </td>
                                <td>
                                  <span style={{ fontSize: "10px", color: "#64748b", display: "block" }}>
                                    {sess.actualInstructorNote}
                                  </span>
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 4: CREDENTIALS & MEDICAL */}
              {activeTab === "credentials" && dossier.credentials && (
                <div>
                  <div className="section-card">
                    <div className="section-header">
                      <h3>{tr("Credentials, Licenses & Medical Assessment")}</h3>
                      <span
                        style={{
                          padding: "4px 10px",
                          borderRadius: "16px",
                          fontSize: "11px",
                          fontWeight: "700",
                          background: dossier.credentials.isCredentialsVerified ? "#dcfce7" : "#fef3c7",
                          color: dossier.credentials.isCredentialsVerified ? "#15803d" : "#b45309",
                        }}
                      >
                        {dossier.credentials.isCredentialsVerified ? tr("VERIFIED") : tr("UNVERIFIED")}
                      </span>
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", fontSize: "12px" }}>
                      <div>
                        <p style={{ margin: "4px 0" }}><strong>{tr("License Type")}:</strong> {dossier.credentials.licenseType || "—"}</p>
                        <p style={{ margin: "4px 0" }}><strong>{tr("License Number")}:</strong> {dossier.credentials.licenseNumber || "—"}</p>
                        <p style={{ margin: "4px 0" }}><strong>{tr("License Expiry")}:</strong> {dossier.credentials.licenseExpiryDate ? formatDateTime(dossier.credentials.licenseExpiryDate) : "—"}</p>
                        <p style={{ margin: "4px 0" }}><strong>{tr("Type Ratings")}:</strong> {dossier.credentials.typeRatings || "—"}</p>
                      </div>
                      <div>
                        <p style={{ margin: "4px 0" }}><strong>{tr("Medical Class")}:</strong> {dossier.credentials.medicalClass || "—"}</p>
                        <p style={{ margin: "4px 0" }}><strong>{tr("Medical Expiry")}:</strong> {dossier.credentials.medicalExpiryDate ? formatDateTime(dossier.credentials.medicalExpiryDate) : "—"}</p>
                        <p style={{ margin: "4px 0" }}><strong>{tr("ICAO ELP")}:</strong> Level {dossier.credentials.icaoElpLevel || "—"}</p>
                        <p style={{ margin: "4px 0" }}><strong>{tr("ICAO Expiry")}:</strong> {dossier.credentials.icaoElpExpiryDate ? formatDateTime(dossier.credentials.icaoElpExpiryDate) : "—"}</p>
                      </div>
                    </div>
                  </div>

                  {/* Attachments Section */}
                  <div className="section-card">
                    <div className="section-header">
                      <h3>{tr("Attached Credential & Medical Documents")}</h3>
                    </div>

                    {dossier.credentials.attachments?.length > 0 ? (
                      <table className="dossier-table">
                        <thead>
                          <tr>
                            <th>{tr("DOCUMENT NAME")}</th>
                            <th>{tr("TYPE")}</th>
                            <th>{tr("SIZE")}</th>
                            <th>{tr("UPLOADED DATE")}</th>
                            <th>{tr("ACTIONS")}</th>
                          </tr>
                        </thead>
                        <tbody>
                          {dossier.credentials.attachments.map((att) => (
                            <tr key={att.attachmentId}>
                              <td><strong>{att.fileName}</strong></td>
                              <td>{att.docType || "General"}</td>
                              <td>{att.fileSize ? `${(att.fileSize / 1024).toFixed(1)} KB` : "—"}</td>
                              <td>{att.uploadedAt ? formatDateTime(att.uploadedAt) : "—"}</td>
                              <td>
                                <a
                                  href={att.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  style={{ color: "#0284c7", fontWeight: "600", textDecoration: "none" }}
                                >
                                  🔗 {tr("View File")}
                                </a>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    ) : (
                      <p style={{ fontSize: "12px", color: "#64748b", margin: 0 }}>
                        {tr("No attachments uploaded or current account is restricted to metadata-only view under privacy policy.")}
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* TAB 5: TRAINING EVIDENCES */}
              {activeTab === "evidences" && (
                <div>
                  <div className="section-card">
                    <div className="section-header">
                      <h3>{tr("Subject Training Evidences")}</h3>
                    </div>

                    <table className="dossier-table">
                      <thead>
                        <tr>
                          <th>{tr("FILE NAME")}</th>
                          <th>{tr("SUBJECT")}</th>
                          <th>{tr("FILE TYPE")}</th>
                          <th>{tr("UPLOADED BY")}</th>
                          <th>{tr("UPLOADED DATE")}</th>
                          <th>{tr("QA VERIFICATION")}</th>
                          <th>{tr("ACTIONS")}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(dossier.subjects || []).flatMap((sub) =>
                          (sub.evidenceFiles || []).map((ev) => (
                            <tr key={ev.evidenceFileId}>
                              <td><strong>{ev.fileName}</strong></td>
                              <td>{sub.subjectCode} - {sub.subjectName}</td>
                              <td>{ev.fileType}</td>
                              <td>{ev.uploadedByName || "—"}</td>
                              <td>{ev.uploadedAt ? formatDateTime(ev.uploadedAt) : "—"}</td>
                              <td>
                                <span
                                  style={{
                                    padding: "2px 8px",
                                    borderRadius: "10px",
                                    fontSize: "11px",
                                    fontWeight: "700",
                                    background: ev.verificationStatus === "Verified" ? "#dcfce7" : "#fee2e2",
                                    color: ev.verificationStatus === "Verified" ? "#15803d" : "#b91c1c",
                                  }}
                                >
                                  {ev.verificationStatus}
                                </span>
                                {ev.verificationComment && (
                                  <div style={{ fontSize: "10px", color: "#64748b", marginTop: "2px" }}>
                                    "{ev.verificationComment}"
                                  </div>
                                )}
                              </td>
                              <td>
                                {ev.fileUrl ? (
                                  <a
                                    href={ev.fileUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    style={{ color: "#0284c7", fontWeight: "600", textDecoration: "none" }}
                                  >
                                    🔗 {tr("View File")}
                                  </a>
                                ) : (
                                  "—"
                                )}
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* TAB 6: APPROVAL HISTORY */}
              {activeTab === "approvalHistory" && (
                <div>
                  <div className="section-card">
                    <div className="section-header">
                      <h3>{tr("Approval History & Workflow Timeline")}</h3>
                    </div>

                    {dossier.approvalHistories?.length === 0 ? (
                      <p style={{ fontSize: "12px", color: "#94a3b8", margin: 0 }}>
                        {tr("No approval history or status transition recorded yet.")}
                      </p>
                    ) : (
                      <div className="timeline">
                        {dossier.approvalHistories.map((hist) => (
                          <div key={hist.approvalHistoryId} className="timeline-item">
                            <div className="timeline-header">
                              <span className="action-tag">{hist.actionType}</span>
                              <span className="timeline-time">{hist.actionAt ? formatDateTime(hist.actionAt) : "—"}</span>
                            </div>
                            <div className="timeline-body">
                              <div>
                                {tr("Action by")}: <strong>{hist.actionByName || `Account #${hist.actionByAccountId}`}</strong>
                              </div>
                              {hist.previousStatus && hist.newStatus && (
                                <div style={{ fontSize: "11px", color: "#64748b", marginTop: "2px" }}>
                                  {tr("Status")}: <span>{hist.previousStatus}</span> → <strong>{hist.newStatus}</strong>
                                </div>
                              )}
                              {hist.comments && (
                                <div style={{ marginTop: "6px", fontStyle: "italic", color: "#002147" }}>
                                  "{hist.comments}"
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* CONFIRM MODAL FOR SUBMIT / VERIFY / COMPLETE */}
      {confirmAction && (
        <ConfirmModal
          isOpen={true}
          title={
            confirmAction === "submit"
              ? tr("Confirm Dossier Submission")
              : confirmAction === "verify"
              ? tr("Confirm QA Verification")
              : tr("Confirm Course Completion")
          }
          message={
            confirmAction === "submit"
              ? tr("Are you sure you want to submit this ETR dossier for QA verification? Status will transition to Submitted.")
              : confirmAction === "verify"
              ? tr("Do you confirm all evidences, subject signoffs, and course requirements are verified? Status will transition to Verified.")
              : tr("Do you confirm approval and completion of training for this student? ETR will transition to Completed and become permanently locked.")
          }
          confirmLabel={tr("Confirm")}
          cancelLabel={tr("Cancel")}
          onConfirm={() => handleExecuteAction(confirmAction)}
          onCancel={() => setConfirmAction(null)}
          loading={actionSubmitting}
        />
      )}

      {/* PROMPT MODAL FOR RETURN / REOPEN */}
      {promptAction && (
        <PromptModal
          isOpen={true}
          title={
            promptAction === "return"
              ? tr("Return Dossier for Correction")
              : tr("Re-open Completed ETR")
          }
          message={
            promptAction === "return"
              ? tr("Please enter the correction feedback/reason to be sent to the owner:")
              : tr("Please specify the reason for reopening this completed record (will be logged in audit trail):")
          }
          placeholder={tr("Enter detailed reason...")}
          required={true}
          confirmLabel={promptAction === "return" ? tr("Return") : tr("Re-open")}
          cancelLabel={tr("Cancel")}
          onConfirm={(comment) => handleExecuteAction(promptAction, comment)}
          onCancel={() => setPromptAction(null)}
          loading={actionSubmitting}
        />
      )}
    </div>,
    document.body
  );
};

export default EtrDossierModal;
