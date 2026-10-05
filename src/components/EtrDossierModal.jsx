import { useState, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { api, parseApiError, formatDateTime } from "../utils/api";
import { useToast } from "./Toast";
import { useLanguage } from "../context/LanguageContext";
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
      console.error("Lỗi khi tải ETR Dossier:", err);
      setError(parseApiError(err, tr("Không thể tải hồ sơ chi tiết ETR.")));
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
        toast.success(tr("Hồ sơ ETR đã được gửi đi thẩm định thành công."));
      } else if (actionType === "verify") {
        await api.post(`/Etr/${etrId}/verify`);
        toast.success(tr("QA đã xác minh hồ sơ ETR thành công."));
      } else if (actionType === "complete") {
        await api.post(`/Etr/${etrId}/complete`);
        toast.success(tr("Training Manager đã phê duyệt hoàn tất hồ sơ ETR."));
      } else if (actionType === "return") {
        await api.post(`/Etr/${etrId}/return`, { comment });
        toast.success(tr("Đã trả lại hồ sơ ETR để bổ sung/chỉnh sửa."));
      } else if (actionType === "reopen") {
        await api.post(`/Etr/${etrId}/reopen`, { comment });
        toast.success(tr("Admin đã mở lại hồ sơ ETR thành công."));
      } else if (actionType === "exportPdf") {
        await api.post(`/Exports/pdf`, { etrCourseRecordId: Number(etrId) });
        toast.success(tr("Đã kích hoạt xuất file PDF hồ sơ ETR."));
      }

      setConfirmAction(null);
      setPromptAction(null);
      await loadDossier();
      if (onActionSuccess) onActionSuccess();
    } catch (err) {
      toast.error(parseApiError(err, tr("Thao tác thất bại.")));
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
              <h2>
                Hồ sơ ETR #{dossier?.etrCourseRecordId || etrId}
                {dossier?.student && ` — ${dossier.student.fullName} (${dossier.student.userCode})`}
              </h2>
              {dossier && (
                <span className={`status-badge ${(dossier.status || "").toLowerCase()}`}>
                  {dossier.status}
                </span>
              )}
            </div>
            <p className="meta-subtitle">
              Khóa: <strong>{dossier?.course?.courseName || "—"}</strong> ({dossier?.course?.courseCode || "—"} · Phiên bản v{dossier?.courseVersionNo || 1}) • Lớp: <strong>{dossier?.class?.className || "—"}</strong> ({dossier?.class?.classCode || "—"})
            </p>
          </div>

          <div className="header-actions">
            {allowedActions.includes("Submit") && (
              <button
                className="action-btn btn-submit"
                onClick={() => setConfirmAction("submit")}
                disabled={actionSubmitting}
              >
                📤 {tr("Gửi thẩm định (Submit)")}
              </button>
            )}

            {allowedActions.includes("Verify") && (
              <button
                className="action-btn btn-verify"
                onClick={() => setConfirmAction("verify")}
                disabled={actionSubmitting}
              >
                ✓ {tr("QA Thẩm định (Verify)")}
              </button>
            )}

            {allowedActions.includes("Complete") && (
              <button
                className="action-btn btn-complete"
                onClick={() => setConfirmAction("complete")}
                disabled={actionSubmitting}
              >
                🏆 {tr("Phê duyệt (Complete)")}
              </button>
            )}

            {allowedActions.includes("Return") && (
              <button
                className="action-btn btn-return"
                onClick={() => setPromptAction("return")}
                disabled={actionSubmitting}
              >
                ↩ {tr("Trả lại (Return)")}
              </button>
            )}

            {allowedActions.includes("Reopen") && (
              <button
                className="action-btn btn-reopen"
                onClick={() => setPromptAction("reopen")}
                disabled={actionSubmitting}
              >
                🔓 {tr("Mở lại (Re-open)")}
              </button>
            )}

            {allowedActions.includes("ExportPdf") && (
              <button
                className="action-btn btn-export"
                onClick={() => handleExecuteAction("exportPdf")}
                disabled={actionSubmitting}
              >
                📄 {tr("Xuất PDF")}
              </button>
            )}

            <button className="close-btn" onClick={onClose} aria-label={tr("Đóng")}>
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
            📊 {tr("1. Tổng quan & Tiến độ")}
          </button>
          <button
            className={`tab-item ${activeTab === "subjects" ? "active" : ""}`}
            onClick={() => setActiveTab("subjects")}
          >
            📚 {tr("2. Môn học & Đánh giá")}
          </button>
          <button
            className={`tab-item ${activeTab === "sessions" ? "active" : ""}`}
            onClick={() => setActiveTab("sessions")}
          >
            ✈️ {tr("3. Buổi học & Nhật ký")}
          </button>
          {dossier?.credentials && (
            <button
              className={`tab-item ${activeTab === "credentials" ? "active" : ""}`}
              onClick={() => setActiveTab("credentials")}
            >
              🪪 {tr("4. Năng định & Sức khỏe")}
            </button>
          )}
          <button
            className={`tab-item ${activeTab === "evidences" ? "active" : ""}`}
            onClick={() => setActiveTab("evidences")}
          >
            📁 {tr("5. Minh chứng đào tạo")}
          </button>
          <button
            className={`tab-item ${activeTab === "approvalHistory" ? "active" : ""}`}
            onClick={() => setActiveTab("approvalHistory")}
          >
            🕒 {tr("6. Lịch sử xử lý")}
          </button>
        </div>

        {/* MODAL BODY */}
        <div className="dossier-body">
          {loading && (
            <div style={{ textAlign: "center", padding: "60px 20px", color: "#64748b" }}>
              <div style={{ fontSize: "24px", marginBottom: "12px" }}>⏳</div>
              <strong>{tr("Đang tải dữ liệu hồ sơ ETR Dossier...")}</strong>
            </div>
          )}

          {error && (
            <div style={{ background: "#fee2e2", border: "1px solid #fecaca", padding: "16px", borderRadius: "8px", color: "#b91c1c" }}>
              <strong>⚠️ {tr("Lỗi:")}</strong> {error}
            </div>
          )}

          {!loading && !error && dossier && (
            <>
              {/* TAB 1: OVERVIEW & READINESS */}
              {activeTab === "overview" && (
                <div>
                  <div className="metrics-grid">
                    <div className="metric-card">
                      <div className="metric-label">{tr("Môn học hoàn thành")}</div>
                      <div className="metric-value">
                        {dossier.readiness?.passedSubjects} / {dossier.readiness?.totalSubjects}
                      </div>
                      <div className="metric-desc">{tr("Số môn đạt hoặc miễn trừ theo Course Version")}</div>
                    </div>
                    <div className="metric-card">
                      <div className="metric-label">{tr("Chuyên cần trung bình")}</div>
                      <div className="metric-value">{dossier.readiness?.averageAttendance}%</div>
                      <div className="metric-desc">{tr("Tỷ lệ tham gia các buổi học")}</div>
                    </div>
                    <div className="metric-card">
                      <div className="metric-label">{tr("Giờ bay thực tế")}</div>
                      <div className="metric-value">{dossier.readiness?.totalFlightHours}h</div>
                      <div className="metric-desc">{tr("Đã tích lũy và xác nhận")}</div>
                    </div>
                    <div className="metric-card">
                      <div className="metric-label">{tr("Giờ mô phỏng FSTD/SIM")}</div>
                      <div className="metric-value">{dossier.readiness?.totalSimulatorHours}h</div>
                      <div className="metric-desc">{tr("Đã tích lũy và xác nhận")}</div>
                    </div>
                    <div className="metric-card">
                      <div className="metric-label">{tr("Trạng thái hoàn thành")}</div>
                      <div className="metric-value" style={{ color: dossier.readiness?.overallReadinessStatus === "Met" ? "#10b981" : "#b45309" }}>
                        {dossier.readiness?.overallReadinessStatus === "Met" ? tr("ĐỦ ĐIỀU KIỆN (MET)") : tr("CHƯA ĐẠT (NOT MET)")}
                      </div>
                      <div className="metric-desc">{tr("Đối chiếu quy tắc hoàn thành khóa")}</div>
                    </div>
                  </div>

                  {dossier.readiness?.pendingConditions?.length > 0 && (
                    <div className="compliance-alert">
                      <div className="alert-icon">⚠️</div>
                      <div>
                        <strong>{tr("Các điều kiện còn thiếu để hoàn thành khóa học:")}</strong>
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
                      <h3>{tr("Thông tin Học viên & Đào tạo")}</h3>
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", fontSize: "12px" }}>
                      <div>
                        <p style={{ margin: "4px 0" }}><strong>Họ và tên:</strong> {dossier.student?.fullName}</p>
                        <p style={{ margin: "4px 0" }}><strong>Mã học viên:</strong> {dossier.student?.userCode}</p>
                        {dossier.student?.email && (
                          <p style={{ margin: "4px 0" }}><strong>Email:</strong> {dossier.student.email}</p>
                        )}
                        {dossier.student?.phone && (
                          <p style={{ margin: "4px 0" }}><strong>Điện thoại:</strong> {dossier.student.phone}</p>
                        )}
                      </div>
                      <div>
                        <p style={{ margin: "4px 0" }}><strong>Khóa học:</strong> {dossier.course?.courseName} ({dossier.course?.courseCode})</p>
                        <p style={{ margin: "4px 0" }}><strong>Phiên bản khóa:</strong> Version {dossier.courseVersionNo}</p>
                        <p style={{ margin: "4px 0" }}><strong>Lớp đào tạo:</strong> {dossier.class?.className} ({dossier.class?.classCode})</p>
                        <p style={{ margin: "4px 0" }}><strong>Thời gian lớp:</strong> {dossier.class?.startDate ? formatDateTime(dossier.class.startDate) : "N/A"} → {dossier.class?.endDate ? formatDateTime(dossier.class.endDate) : "N/A"}</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: SUBJECTS & ASSESSMENTS */}
              {activeTab === "subjects" && (
                <div>
                  <div style={{ marginBottom: "16px", fontSize: "12px", color: "#64748b" }}>
                    💡 <em>{tr("Thông tin môn học được hiển thị theo bản chụp (snapshot) tại thời điểm học viên ghi danh vào Course Version này.")}</em>
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
                              ({sub.subjectType} · Yêu cầu: {sub.requiredHours}h · Chuẩn đạt: {sub.passingScore}đ)
                            </span>
                          </div>
                          <div className="sub-badges">
                            <span style={{ fontSize: "11px", color: "#64748b" }}>
                              Điểm: <strong>{sub.score != null ? `${sub.score}đ` : "—"}</strong> | Chuyên cần: <strong>{sub.attendanceRate != null ? `${sub.attendanceRate}%` : "—"}</strong>
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
                              <strong>{tr("Chữ ký xác nhận môn (Subject Signoff):")}</strong>{" "}
                              {sub.isSignedOff ? (
                                <span style={{ color: "#15803d" }}>
                                  ✓ Đã ký bởi <strong>{sub.signoffByName || "Giảng viên"}</strong> ({sub.signoffRole || "Instructor"}) vào lúc {sub.signedOffAt ? formatDateTime(sub.signedOffAt) : "N/A"}.
                                  {sub.signoffComment && <em> — Nhận xét: "{sub.signoffComment}"</em>}
                                </span>
                              ) : (
                                <span style={{ color: "#b45309" }}>⏳ Chưa được giảng viên phụ trách ký chốt môn.</span>
                              )}
                            </div>

                            {/* Assessments */}
                            <div style={{ marginBottom: "16px" }}>
                              <h4 style={{ margin: "0 0 8px 0", fontSize: "13px", color: "#002147" }}>
                                📝 {tr("Bài kiểm tra (Assessments)")}
                              </h4>
                              {sub.assessments?.length === 0 ? (
                                <p style={{ fontSize: "12px", color: "#94a3b8", margin: 0 }}>{tr("Không có bài kiểm tra lý thuyết/thực hành nào được gắn cho môn này.")}</p>
                              ) : (
                                <table className="dossier-table">
                                  <thead>
                                    <tr>
                                      <th>{tr("Tên bài đánh giá")}</th>
                                      <th>{tr("Loại")}</th>
                                      <th>{tr("Trọng số")}</th>
                                      <th>{tr("Điểm chuẩn")}</th>
                                      <th>{tr("Điểm số")}</th>
                                      <th>{tr("Lần thi")}</th>
                                      <th>{tr("Kết quả")}</th>
                                      <th>{tr("Người chấm")}</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {sub.assessments.map((a) => (
                                      <tr key={a.assessmentResultId}>
                                        <td><strong>{a.componentName}</strong></td>
                                        <td>{a.assessmentType}</td>
                                        <td>{a.weight}%</td>
                                        <td>{a.passingScore}đ</td>
                                        <td><strong>{a.score}đ</strong></td>
                                        <td>Lần {a.attemptNo}</td>
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
                                📋 {tr("Bảng kiểm thao tác thực hành (Practical Checklists)")}
                              </h4>
                              {sub.practicalChecklists?.length === 0 ? (
                                <p style={{ fontSize: "12px", color: "#94a3b8", margin: 0 }}>{tr("Không có bảng kiểm thao tác thực hành nào cho môn này.")}</p>
                              ) : (
                                <table className="dossier-table">
                                  <thead>
                                    <tr>
                                      <th>{tr("Nội dung thao tác")}</th>
                                      <th>{tr("Kết quả")}</th>
                                      <th>{tr("Người thẩm định")}</th>
                                      <th>{tr("Ngày hoàn thành")}</th>
                                      <th>{tr("Nhận xét")}</th>
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
                      <strong>{tr("Ranh giới dữ liệu & Lưu ý thẩm định tuân thủ:")}</strong>
                      <div style={{ marginTop: "4px" }}>
                        • Hệ thống ghi nhận <strong>Giảng viên phân công</strong> (theo môn của lớp) và <strong>Người ký xác nhận buổi học</strong> (chữ ký số trên sổ nhật ký đào tạo).<br />
                        • <em>Chưa có dữ liệu hệ thống ghi nhận người thực dạy riêng biệt</em> (trường hợp dạy thay chưa được phân tách trường riêng trong DB).<br />
                        • <em>Chưa có bản chụp lịch sử hiệu lực chứng chỉ tại ngày dạy (Historical Qualification Snapshot); không tự động suy đoán năng lực từ chữ ký.</em>
                      </div>
                    </div>
                  </div>

                  <div className="section-card">
                    <div className="section-header">
                      <h3>{tr("Nhật ký chi tiết từng buổi học & Giờ bay/SIM")}</h3>
                    </div>

                    <div style={{ overflowX: "auto" }}>
                      <table className="dossier-table">
                        <thead>
                          <tr>
                            <th>{tr("Buổi / Bài học")}</th>
                            <th>{tr("Ngày học")}</th>
                            <th>{tr("Hình thức")}</th>
                            <th>{tr("Điểm danh")}</th>
                            <th>{tr("Giờ đào tạo")}</th>
                            <th>{tr("Hành trình / Thiết bị")}</th>
                            <th>{tr("GV Phân công")}</th>
                            <th>{tr("Người ký xác nhận")}</th>
                            <th>{tr("Ghi chú thực dạy & năng lực")}</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(dossier.subjects || []).flatMap((sub) =>
                            (sub.sessions || []).map((sess) => (
                              <tr key={sess.sessionId}>
                                <td>
                                  <strong>{sess.sessionTitle}</strong>
                                  {sess.lessonCode && <div style={{ fontSize: "10px", color: "#64748b" }}>Mã: {sess.lessonCode}</div>}
                                  <div style={{ fontSize: "10px", color: "#0284c7" }}>Môn: {sub.subjectCode}</div>
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
                                  {sess.flightHours != null && <div>Bay: <strong>{sess.flightHours}h</strong></div>}
                                  {sess.simulatorHours != null && <div>SIM: <strong>{sess.simulatorHours}h</strong></div>}
                                  {sess.flightHours == null && sess.simulatorHours == null && <div>—</div>}
                                </td>
                                <td>
                                  {sess.departureIcao && <div>Tuyến: {sess.departureIcao} → {sess.arrivalIcao || "?"}</div>}
                                  {sess.aircraftRegistration && <div>Tàu bay: {sess.aircraftRegistration}</div>}
                                  {sess.simulatorDevice && <div>Thiết bị: {sess.simulatorDevice}</div>}
                                  {!sess.departureIcao && !sess.aircraftRegistration && !sess.simulatorDevice && <div>{sess.location || "Lớp học"}</div>}
                                </td>
                                <td>{sess.assignedInstructorName || "—"}</td>
                                <td>
                                  {sess.signedInstructorName ? (
                                    <div>
                                      <strong>{sess.signedInstructorName}</strong>
                                      {sess.instructorSignedAt && (
                                        <div style={{ fontSize: "10px", color: "#16a34a" }}>
                                          Ký: {formatDateTime(sess.instructorSignedAt)}
                                        </div>
                                      )}
                                    </div>
                                  ) : (
                                    <span style={{ color: "#94a3b8" }}>Chưa ký</span>
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
                      <h3>{tr("Hồ sơ Năng định, Bằng lái & Giám định Sức khỏe")}</h3>
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
                        {dossier.credentials.isCredentialsVerified ? tr("ĐÃ XÁC MINH (VERIFIED)") : tr("CHƯA XÁC MINH")}
                      </span>
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", fontSize: "12px" }}>
                      <div>
                        <p style={{ margin: "4px 0" }}><strong>Loại bằng lái:</strong> {dossier.credentials.licenseType || "—"}</p>
                        <p style={{ margin: "4px 0" }}><strong>Số bằng lái:</strong> {dossier.credentials.licenseNumber || "—"}</p>
                        <p style={{ margin: "4px 0" }}><strong>Hạn bằng lái:</strong> {dossier.credentials.licenseExpiryDate ? formatDateTime(dossier.credentials.licenseExpiryDate) : "—"}</p>
                        <p style={{ margin: "4px 0" }}><strong>Định chuẩn máy bay (Type Ratings):</strong> {dossier.credentials.typeRatings || "—"}</p>
                      </div>
                      <div>
                        <p style={{ margin: "4px 0" }}><strong>Cấp giám định y khoa:</strong> {dossier.credentials.medicalClass || "—"}</p>
                        <p style={{ margin: "4px 0" }}><strong>Hạn giám định sức khỏe:</strong> {dossier.credentials.medicalExpiryDate ? formatDateTime(dossier.credentials.medicalExpiryDate) : "—"}</p>
                        <p style={{ margin: "4px 0" }}><strong>Tiếng Anh ICAO:</strong> Level {dossier.credentials.icaoElpLevel || "—"}</p>
                        <p style={{ margin: "4px 0" }}><strong>Hạn chứng chỉ ICAO:</strong> {dossier.credentials.icaoElpExpiryDate ? formatDateTime(dossier.credentials.icaoElpExpiryDate) : "—"}</p>
                      </div>
                    </div>
                  </div>

                  {/* Attachments Section */}
                  <div className="section-card">
                    <div className="section-header">
                      <h3>{tr("Tài liệu Minh chứng Năng định & Y tế đính kèm")}</h3>
                    </div>

                    {dossier.credentials.attachments?.length > 0 ? (
                      <table className="dossier-table">
                        <thead>
                          <tr>
                            <th>{tr("Tên tài liệu")}</th>
                            <th>{tr("Loại")}</th>
                            <th>{tr("Dung lượng")}</th>
                            <th>{tr("Ngày tải")}</th>
                            <th>{tr("Thao tác")}</th>
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
                                  🔗 {tr("Xem tệp")}
                                </a>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    ) : (
                      <p style={{ fontSize: "12px", color: "#64748b", margin: 0 }}>
                        {tr("Không có tệp đính kèm nào được tải lên hoặc tài khoản hiện tại chỉ được xem thông tin trạng thái theo chính sách phân quyền riêng tư.")}
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
                      <h3>{tr("Danh sách Minh chứng Đào tạo theo Môn học (Training Evidences)")}</h3>
                    </div>

                    <table className="dossier-table">
                      <thead>
                        <tr>
                          <th>{tr("Tên tệp minh chứng")}</th>
                          <th>{tr("Môn học")}</th>
                          <th>{tr("Loại tệp")}</th>
                          <th>{tr("Người tải")}</th>
                          <th>{tr("Ngày tải")}</th>
                          <th>{tr("QA Thẩm định")}</th>
                          <th>{tr("Thao tác")}</th>
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
                                    🔗 {tr("Xem tệp")}
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
                      <h3>{tr("Lịch sử Phê duyệt & Luồng xử lý ETR (Approval History)")}</h3>
                    </div>

                    {dossier.approvalHistories?.length === 0 ? (
                      <p style={{ fontSize: "12px", color: "#94a3b8", margin: 0 }}>
                        {tr("Chưa có bước phê duyệt hoặc thay đổi trạng thái nào được ghi nhận.")}
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
                                Thực hiện bởi: <strong>{hist.actionByName || `Account #${hist.actionByAccountId}`}</strong>
                              </div>
                              {hist.previousStatus && hist.newStatus && (
                                <div style={{ fontSize: "11px", color: "#64748b", marginTop: "2px" }}>
                                  Trạng thái: <span>{hist.previousStatus}</span> → <strong>{hist.newStatus}</strong>
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
              ? tr("Xác nhận gửi hồ sơ ETR")
              : confirmAction === "verify"
              ? tr("Xác nhận thẩm định hồ sơ ETR")
              : tr("Xác nhận hoàn tất hồ sơ ETR")
          }
          message={
            confirmAction === "submit"
              ? tr("Bạn có chắc chắn muốn gửi hồ sơ ETR này để QA thẩm định? Hồ sơ sẽ được chuyển sang trạng thái Submitted.")
              : confirmAction === "verify"
              ? tr("Bạn xác nhận đã rà soát đầy đủ minh chứng, chữ ký môn và điều kiện môn học? Hồ sơ sẽ được chuyển sang trạng thái Verified.")
              : tr("Bạn xác nhận phê duyệt hoàn tất khóa học cho học viên này? Hồ sơ ETR sẽ được chuyển sang trạng thái Completed và khóa bất biến.")
          }
          confirmLabel={tr("Xác nhận")}
          cancelLabel={tr("Hủy")}
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
              ? tr("Trả lại hồ sơ ETR để chỉnh sửa")
              : tr("Mở lại hồ sơ ETR đã hoàn tất")
          }
          message={
            promptAction === "return"
              ? tr("Vui lòng nhập lý do/yêu cầu chỉnh sửa gửi cho người phụ trách:")
              : tr("Vui lòng nêu rõ lý do mở lại hồ sơ đã hoàn thành (sẽ được ghi vào nhật ký kiểm toán):")
          }
          placeholder={tr("Nhập lý do chi tiết...")}
          required={true}
          confirmLabel={promptAction === "return" ? tr("Trả lại") : tr("Mở lại")}
          cancelLabel={tr("Hủy")}
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
