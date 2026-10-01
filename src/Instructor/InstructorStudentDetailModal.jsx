import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { api, parseApiError } from "../utils/api";
import { useLanguage } from "../context/LanguageContext";

const InstructorStudentDetailModal = ({ student, initialTab = "logbook", onClose }) => {
  const { tr, lang } = useLanguage();
  const [activeTab, setActiveTab] = useState(initialTab); // 'logbook' | 'readiness'

  // Logbook State
  const [logbookData, setLogbookData] = useState(null);
  const [logbookLoading, setLogbookLoading] = useState(false);
  const [logbookError, setLogbookError] = useState(null);

  // Readiness State
  const [readinessData, setReadinessData] = useState(null);
  const [readinessLoading, setReadinessLoading] = useState(false);
  const [readinessError, setReadinessError] = useState(null);

  const fetchLogbook = async () => {
    if (!student?.accountId) return;
    setLogbookLoading(true);
    setLogbookError(null);
    try {
      const data = await api.get(`/Logbook/student/${student.accountId}`, {
        suppressAuthRedirect: true
      });
      setLogbookData(data);
    } catch (err) {
      console.error("Instructor fetch logbook failed:", err);
      const status = err?.status || err?.response?.status;
      if (status === 403) {
        setLogbookError(
          tr("⛔ Quyền truy cập bị từ chối (403): Học viên không thuộc phạm vi lớp học được phân công của bạn.")
        );
      } else if (status === 404) {
        setLogbookError(tr("⚠️ Không tìm thấy dữ liệu sổ bay của học viên (404 Not Found)."));
      } else {
        setLogbookError(parseApiError(err, tr("Không thể tải sổ bay học viên."), tr));
      }
    } finally {
      setLogbookLoading(false);
    }
  };

  const fetchReadiness = async () => {
    if (!student?.enrollmentId && !student?.etrId) return;
    setReadinessLoading(true);
    setReadinessError(null);
    try {
      let data = null;
      if (student.enrollmentId) {
        try {
          data = await api.get(`/etr/enrollment/${student.enrollmentId}/readiness`, {
            suppressAuthRedirect: true
          });
        } catch (enrErr) {
          const status = enrErr?.status || enrErr?.response?.status;
          // Fallback sang etrId CHỈ khi enrollment trả về 404 (chưa gắn readiness)
          if (status === 404 && student.etrId) {
            data = await api.get(`/etr/${student.etrId}/readiness`, {
              suppressAuthRedirect: true
            });
          } else {
            // Ném tiếp các lỗi 403 (Forbidden), 500 (Lỗi máy chủ) để catch ngoài hiển thị đúng bản chất lỗi
            throw enrErr;
          }
        }
      } else if (student.etrId) {
        data = await api.get(`/etr/${student.etrId}/readiness`, {
          suppressAuthRedirect: true
        });
      }

      if (data) {
        setReadinessData(data);
      } else {
        setReadinessError(
          tr("⚠️ Chưa có hồ sơ ETR hoặc chưa đủ dữ liệu đánh giá tính sẵn sàng cho học viên này trong lớp học.")
        );
      }
    } catch (err) {
      console.error("Instructor fetch readiness failed:", err);
      const status = err?.status || err?.response?.status;
      if (status === 403) {
        setReadinessError(
          tr("⛔ Quyền truy cập bị từ chối (403): Học viên không thuộc phạm vi các lớp được phân công của bạn.")
        );
      } else if (status === 404) {
        setReadinessError(tr("⚠️ Không tìm thấy hồ sơ ETR/Readiness của học viên (404 Not Found)."));
      } else {
        setReadinessError(parseApiError(err, tr("Không thể tải thông tin tính sẵn sàng từ máy chủ."), tr));
      }
    } finally {
      setReadinessLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === "logbook" && !logbookData && !logbookLoading) {
      fetchLogbook();
    } else if (activeTab === "readiness" && !readinessData && !readinessLoading) {
      fetchReadiness();
    }
  }, [activeTab, student]);

  const formatDate = (isoStr) => {
    if (!isoStr) return "--";
    try {
      return new Date(isoStr).toLocaleDateString(lang === "en" ? "en-US" : "vi-VN");
    } catch {
      return "--";
    }
  };

  const formatDateTime = (isoStr) => {
    if (!isoStr) return "--";
    try {
      return new Date(isoStr).toLocaleString(lang === "en" ? "en-US" : "vi-VN", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit"
      });
    } catch {
      return "--";
    }
  };

  const modalContent = (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        width: "100vw",
        height: "100vh",
        background: "rgba(15, 23, 42, 0.65)",
        backdropFilter: "blur(4px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 999999
      }}
    >
      <div
        style={{
          background: "#fff",
          borderRadius: "16px",
          width: "100%",
          maxWidth: "860px",
          maxHeight: "90vh",
          display: "flex",
          flexDirection: "column",
          boxShadow: "0 25px 50px -12px rgba(0,0,0,0.25)",
          overflow: "hidden"
        }}
      >
        {/* Modal Header */}
        <div
          style={{
            padding: "16px 24px",
            background: "linear-gradient(135deg, #002147 0%, #06376e 100%)",
            color: "#fff",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center"
          }}
        >
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <h3 style={{ margin: 0, fontSize: "18px", fontWeight: "700" }}>
                {student.fullName || `Học viên #${student.accountId}`}
              </h3>
              <span
                style={{
                  fontSize: "12px",
                  background: "rgba(255,255,255,0.2)",
                  padding: "2px 8px",
                  borderRadius: "6px"
                }}
              >
                {student.studentCode || `STU-${student.accountId}`}
              </span>
            </div>
            <div style={{ fontSize: "12px", color: "rgba(255,255,255,0.75)", marginTop: "4px" }}>
              {tr("Lớp:")} <strong>{student.className || `--`}</strong> • {tr("Khóa:")}{" "}
              <strong>{student.courseName || `--`}</strong>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            style={{
              background: "none",
              border: "none",
              color: "#fff",
              fontSize: "24px",
              cursor: "pointer",
              lineHeight: 1
            }}
          >
            ×
          </button>
        </div>

        {/* Tab Navigation */}
        <div
          style={{
            display: "flex",
            borderBottom: "1px solid #e2e8f0",
            background: "#f8fafc",
            padding: "0 20px"
          }}
        >
          <button
            type="button"
            onClick={() => setActiveTab("logbook")}
            style={{
              padding: "12px 18px",
              border: "none",
              background: "none",
              borderBottom: activeTab === "logbook" ? "3px solid #002147" : "3px solid transparent",
              color: activeTab === "logbook" ? "#002147" : "#64748b",
              fontWeight: activeTab === "logbook" ? "700" : "500",
              fontSize: "13px",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "6px"
            }}
          >
            <span>📖</span> {tr("Sổ bay & SIM (Pilot Logbook)")}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("readiness")}
            style={{
              padding: "12px 18px",
              border: "none",
              background: "none",
              borderBottom: activeTab === "readiness" ? "3px solid #002147" : "3px solid transparent",
              color: activeTab === "readiness" ? "#002147" : "#64748b",
              fontWeight: activeTab === "readiness" ? "700" : "500",
              fontSize: "13px",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "6px"
            }}
          >
            <span>🎯</span> {tr("Tính sẵn sàng hoàn thành (Readiness Check)")}
          </button>
        </div>

        {/* Modal Body */}
        <div style={{ padding: "20px 24px", overflowY: "auto", flex: 1 }}>
          {/* TAB 1: LOGBOOK */}
          {activeTab === "logbook" && (
            <div>
              {logbookLoading ? (
                <div style={{ textAlign: "center", padding: "40px", color: "#64748b" }}>
                  <div style={{ fontSize: "24px", marginBottom: "8px" }}>⏳</div>
                  <div>{tr("Đang tải dữ liệu sổ bay của học viên...")}</div>
                </div>
              ) : logbookError ? (
                <div
                  style={{
                    padding: "16px",
                    background: "#fef2f2",
                    border: "1px solid #fca5a5",
                    borderRadius: "8px",
                    color: "#b91c1c",
                    fontSize: "13px",
                    textAlign: "center"
                  }}
                >
                  <p style={{ margin: "0 0 12px 0", fontWeight: "600" }}>{logbookError}</p>
                  <button
                    type="button"
                    onClick={fetchLogbook}
                    style={{
                      padding: "6px 14px",
                      background: "#002147",
                      color: "#fff",
                      border: "none",
                      borderRadius: "6px",
                      fontSize: "12px",
                      cursor: "pointer"
                    }}
                  >
                    🔄 {tr("Thử tải lại")}
                  </button>
                </div>
              ) : !logbookData ? (
                <div style={{ textAlign: "center", padding: "40px", color: "#64748b" }}>
                  {tr("Không có dữ liệu sổ bay cho học viên này.")}
                </div>
              ) : (
                <div>
                  {/* Summary Cards */}
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))",
                      gap: "10px",
                      marginBottom: "16px"
                    }}
                  >
                    <div style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", padding: "10px", borderRadius: "8px", textAlign: "center" }}>
                      <div style={{ fontSize: "11px", color: "#166534", fontWeight: "600" }}>{tr("GIỜ BAY (FLIGHT)")}</div>
                      <div style={{ fontSize: "20px", fontWeight: "800", color: "#15803d", marginTop: "2px" }}>
                        {(logbookData.totalFlightHours ?? 0).toFixed(1)}h
                      </div>
                    </div>

                    <div style={{ background: "#faf5ff", border: "1px solid #e9d5ff", padding: "10px", borderRadius: "8px", textAlign: "center" }}>
                      <div style={{ fontSize: "11px", color: "#6b21a8", fontWeight: "600" }}>{tr("GIỜ SIM (FSTD)")}</div>
                      <div style={{ fontSize: "20px", fontWeight: "800", color: "#7e22ce", marginTop: "2px" }}>
                        {(logbookData.totalSimulatorHours ?? 0).toFixed(1)}h
                      </div>
                    </div>

                    <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", padding: "10px", borderRadius: "8px", textAlign: "center" }}>
                      <div style={{ fontSize: "11px", color: "#475569", fontWeight: "600" }}>{tr("DUAL (BAY / SIM)")}</div>
                      <div style={{ fontSize: "16px", fontWeight: "700", color: "#002147", marginTop: "2px" }}>
                        {(logbookData.flightDualHours ?? 0).toFixed(1)}h / {(logbookData.simulatorDualHours ?? 0).toFixed(1)}h
                      </div>
                    </div>

                    <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", padding: "10px", borderRadius: "8px", textAlign: "center" }}>
                      <div style={{ fontSize: "11px", color: "#475569", fontWeight: "600" }}>{tr("INSTRUMENT (BAY / SIM)")}</div>
                      <div style={{ fontSize: "16px", fontWeight: "700", color: "#002147", marginTop: "2px" }}>
                        {(logbookData.flightInstrumentHours ?? 0).toFixed(1)}h / {(logbookData.simulatorInstrumentHours ?? 0).toFixed(1)}h
                      </div>
                    </div>

                    <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", padding: "10px", borderRadius: "8px", textAlign: "center" }}>
                      <div style={{ fontSize: "11px", color: "#475569", fontWeight: "600" }}>{tr("HẠ CÁNH (NGÀY / ĐÊM)")}</div>
                      <div style={{ fontSize: "16px", fontWeight: "700", color: "#002147", marginTop: "2px" }}>
                        {logbookData.totalDayLandings ?? 0} / {logbookData.totalNightLandings ?? 0}
                      </div>
                    </div>
                  </div>

                  {/* Entries Table */}
                  <h4 style={{ margin: "0 0 10px 0", fontSize: "13px", color: "#002147", textTransform: "uppercase" }}>
                    {tr("Lịch sử huấn luyện bay & mô phỏng")} ({(logbookData.entries || []).length} {tr("chuyến")})
                  </h4>

                  {(logbookData.entries || []).length === 0 ? (
                    <div style={{ padding: "20px", textAlign: "center", background: "#f8fafc", borderRadius: "8px", color: "#64748b", fontSize: "13px" }}>
                      {tr("Học viên chưa có nhật ký huấn luyện bay hoặc mô phỏng nào được xác nhận.")}
                    </div>
                  ) : (
                    <div style={{ overflowX: "auto", border: "1px solid #e2e8f0", borderRadius: "8px" }}>
                      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px" }}>
                        <thead>
                          <tr style={{ background: "#f1f5f9", textAlign: "left", color: "#334155" }}>
                            <th style={{ padding: "8px 10px" }}>{tr("Ngày")}</th>
                            <th style={{ padding: "8px 10px" }}>{tr("Bài / Buổi học")}</th>
                            <th style={{ padding: "8px 10px" }}>{tr("Loại hình")}</th>
                            <th style={{ padding: "8px 10px" }}>{tr("Phương tiện / Thiết bị")}</th>
                            <th style={{ padding: "8px 10px" }}>{tr("Giờ bay/SIM")}</th>
                            <th style={{ padding: "8px 10px" }}>{tr("Hạ cánh")}</th>
                            <th style={{ padding: "8px 10px" }}>{tr("Ký xác nhận")}</th>
                          </tr>
                        </thead>
                        <tbody>
                          {logbookData.entries.map((e, idx) => (
                            <tr key={idx} style={{ borderBottom: "1px solid #f1f5f9" }}>
                              <td style={{ padding: "8px 10px", color: "#475569" }}>
                                {formatDate(e.flightDate || e.sessionDate)}
                              </td>
                              <td style={{ padding: "8px 10px" }}>
                                <strong style={{ color: "#002147" }}>{e.sessionTitle || e.lessonCode || `--`}</strong>
                                {e.subjectName && (
                                  <div style={{ fontSize: "11px", color: "#64748b" }}>{e.subjectName}</div>
                                )}
                              </td>
                              <td style={{ padding: "8px 10px" }}>
                                <span
                                  style={{
                                    padding: "2px 6px",
                                    borderRadius: "4px",
                                    fontSize: "11px",
                                    fontWeight: "600",
                                    background: e.trainingType === "Flight" ? "#e0f2fe" : "#f3e8ff",
                                    color: e.trainingType === "Flight" ? "#0369a1" : "#7e22ce"
                                  }}
                                >
                                  {e.trainingType === "Flight" ? tr("Bay thực") : tr("Mô phỏng SIM")}
                                </span>
                              </td>
                              <td style={{ padding: "8px 10px", color: "#475569" }}>
                                {e.aircraftRegistration || e.simulatorDevice || `--`}
                              </td>
                              <td style={{ padding: "8px 10px", fontWeight: "700", color: "#002147" }}>
                                {(e.flightHours || e.simulatorHours || 0).toFixed(1)}h
                              </td>
                              <td style={{ padding: "8px 10px", color: "#475569" }}>
                                {e.totalLandings ? `${e.totalLandings} lần` : `--`}
                              </td>
                              <td style={{ padding: "8px 10px" }}>
                                {e.instructorSignedAt ? (
                                  <span style={{ color: "#16a34a", fontWeight: "600", fontSize: "11px" }}>
                                    ✓ {formatDateTime(e.instructorSignedAt)}
                                  </span>
                                ) : (
                                  <span style={{ color: "#d97706", fontSize: "11px" }}>
                                    ⏳ {tr("Chưa ký")}
                                  </span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {/* Read-only Disclaimer */}
                  <div style={{ marginTop: "14px", fontSize: "11px", color: "#64748b", fontStyle: "italic", borderTop: "1px solid #f1f5f9", paddingTop: "8px" }}>
                    * {logbookData.disclaimer || tr("Dữ liệu sổ bay chỉ phản ánh thời gian huấn luyện thực tế đã ký nhận, dùng làm căn cứ tham khảo giảng dạy.")}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: READINESS CHECK */}
          {activeTab === "readiness" && (
            <div>
              {readinessLoading ? (
                <div style={{ textAlign: "center", padding: "40px", color: "#64748b" }}>
                  <div style={{ fontSize: "24px", marginBottom: "8px" }}>⏳</div>
                  <div>{tr("Đang đánh giá mức độ sẵn sàng của học viên...")}</div>
                </div>
              ) : readinessError ? (
                <div
                  style={{
                    padding: "16px",
                    background: "#fef2f2",
                    border: "1px solid #fca5a5",
                    borderRadius: "8px",
                    color: "#b91c1c",
                    fontSize: "13px",
                    textAlign: "center"
                  }}
                >
                  <p style={{ margin: "0 0 12px 0", fontWeight: "600" }}>{readinessError}</p>
                  <button
                    type="button"
                    onClick={fetchReadiness}
                    style={{
                      padding: "6px 14px",
                      background: "#002147",
                      color: "#fff",
                      border: "none",
                      borderRadius: "6px",
                      fontSize: "12px",
                      cursor: "pointer"
                    }}
                  >
                    🔄 {tr("Thử tải lại")}
                  </button>
                </div>
              ) : !readinessData ? (
                <div style={{ textAlign: "center", padding: "40px", color: "#64748b" }}>
                  {tr("Không có dữ liệu sẵn sàng hoàn thành.")}
                </div>
              ) : (
                <div>
                  {/* Status Banner */}
                  <div
                    style={{
                      padding: "14px 18px",
                      borderRadius: "10px",
                      marginBottom: "16px",
                      background:
                        readinessData.overallStatus === "Met"
                          ? "#f0fdf4"
                          : readinessData.overallStatus === "NotMet"
                            ? "#fef2f2"
                            : "#fffbeb",
                      border:
                        readinessData.overallStatus === "Met"
                          ? "1px solid #86efac"
                          : readinessData.overallStatus === "NotMet"
                            ? "1px solid #fca5a5"
                            : "1px solid #fde68a",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center"
                    }}
                  >
                    <div>
                      <div style={{ fontSize: "12px", fontWeight: "700", color: "#475569", textTransform: "uppercase" }}>
                        {tr("Trạng thái Sẵn sàng:")}
                      </div>
                      <div
                        style={{
                          fontSize: "16px",
                          fontWeight: "800",
                          color:
                            readinessData.overallStatus === "Met"
                              ? "#15803d"
                              : readinessData.overallStatus === "NotMet"
                                ? "#b91c1c"
                                : "#b45309",
                          marginTop: "2px"
                        }}
                      >
                        {readinessData.overallStatus === "Met"
                          ? tr("✓ ĐÃ ĐẠT TẤT CẢ TIÊU CHUẨN HOÀN THÀNH")
                          : readinessData.overallStatus === "NotMet"
                            ? tr("✗ CHƯA ĐẠT ĐỦ ĐIỀU KIỆN TỐI THIỂU")
                            : readinessData.overallStatus === "NoData"
                              ? tr("⏳ CHƯA CÓ DỮ LIỆU ĐÀO TẠO")
                              : tr("⚠️ CẦN RÀ SOÁT HỒ SƠ")}
                      </div>
                      <div style={{ fontSize: "12px", color: "#64748b", marginTop: "4px" }}>
                        {tr("Giáo trình áp dụng:")} <strong>{readinessData.courseName}</strong> (
                        <span style={{ color: "#002147", fontWeight: "700" }}>Phiên bản #{readinessData.courseVersionNo}</span>)
                      </div>
                    </div>

                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontSize: "12px", color: "#64748b" }}>{tr("Giờ bay tích lũy:")}</div>
                      <div style={{ fontSize: "16px", fontWeight: "700", color: "#002147" }}>
                        {(readinessData.totalFlightHours ?? 0).toFixed(1)}h Bay • {(readinessData.totalSimulatorHours ?? 0).toFixed(1)}h SIM
                      </div>
                    </div>
                  </div>

                  {/* Conditions List */}
                  <h4 style={{ margin: "0 0 10px 0", fontSize: "13px", color: "#002147", textTransform: "uppercase" }}>
                    {tr("Chi tiết điều kiện hoàn thành")} ({(readinessData.conditions || []).length})
                  </h4>

                  <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginBottom: "16px" }}>
                    {(readinessData.conditions || []).map((cond, idx) => {
                      const isMet = cond.status === "Met";
                      const isNotMet = cond.status === "NotMet";
                      return (
                        <div
                          key={idx}
                          style={{
                            padding: "10px 14px",
                            borderRadius: "8px",
                            background: isMet ? "#f0fdf4" : isNotMet ? "#fef2f2" : "#f8fafc",
                            border: isMet ? "1px solid #bbf7d0" : isNotMet ? "1px solid #fecaca" : "1px solid #e2e8f0",
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center"
                          }}
                        >
                          <div>
                            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                              <strong style={{ fontSize: "13px", color: "#002147" }}>{cond.conditionName}</strong>
                              {cond.isMandatory && (
                                <span style={{ fontSize: "10px", background: "#fee2e2", color: "#b91c1c", padding: "1px 5px", borderRadius: "3px", fontWeight: "700" }}>
                                  Bắt buộc
                                </span>
                              )}
                            </div>
                            <div style={{ fontSize: "12px", color: "#475569", marginTop: "2px" }}>
                              {cond.explanation}
                            </div>
                          </div>

                          <div style={{ textAlign: "right", minWidth: "120px" }}>
                            <span
                              style={{
                                padding: "3px 8px",
                                borderRadius: "4px",
                                fontSize: "11px",
                                fontWeight: "700",
                                background: isMet ? "#dcfce7" : isNotMet ? "#fee2e2" : "#e2e8f0",
                                color: isMet ? "#15803d" : isNotMet ? "#b91c1c" : "#475569"
                              }}
                            >
                              {isMet ? tr("ĐẠT") : isNotMet ? tr("CHƯA ĐẠT") : tr("CHƯA CÓ DỮ LIỆU")}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Credential Signals & Warnings (Masked for Instructor) */}
                  {(readinessData.warnings || []).length > 0 && (
                    <div style={{ marginBottom: "16px" }}>
                      <h4 style={{ margin: "0 0 8px 0", fontSize: "13px", color: "#002147", textTransform: "uppercase" }}>
                        {tr("Tín hiệu cảnh báo hồ sơ (Signals)")}
                      </h4>
                      <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                        {readinessData.warnings.map((w, idx) => (
                          <div
                            key={idx}
                            style={{
                              padding: "8px 12px",
                              background: w.severity === "Warning" ? "#fffbeb" : "#eff6ff",
                              border: w.severity === "Warning" ? "1px solid #fde68a" : "1px solid #bfdbfe",
                              borderRadius: "6px",
                              fontSize: "12px",
                              color: w.severity === "Warning" ? "#b45309" : "#1e40af",
                              display: "flex",
                              alignItems: "center",
                              gap: "8px"
                            }}
                          >
                            <span>{w.severity === "Warning" ? "⚠️" : "ℹ️"}</span>
                            <span>{w.message}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Read-only notice */}
                  <div
                    style={{
                      padding: "10px 14px",
                      borderRadius: "6px",
                      background: "#f1f5f9",
                      fontSize: "11px",
                      color: "#64748b",
                      lineHeight: 1.5
                    }}
                  >
                    ℹ️ <strong>{tr("Quyền hạn giảng viên:")}</strong> {tr("Màn hình này chỉ phục vụ theo dõi mức độ tích lũy kỹ năng và cảnh báo của học viên trong lớp. Giảng viên không có thẩm quyền khóa bay, chặn ghi danh hay cấp chứng chỉ tại đây.")}
                    <div style={{ marginTop: "4px", fontStyle: "italic" }}>
                      * {readinessData.disclaimer}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div
          style={{
            padding: "12px 24px",
            borderTop: "1px solid #e2e8f0",
            display: "flex",
            justifyContent: "flex-end",
            background: "#f8fafc"
          }}
        >
          <button
            type="button"
            onClick={onClose}
            style={{
              padding: "8px 18px",
              borderRadius: "6px",
              border: "1px solid #cbd5e1",
              background: "#fff",
              color: "#334155",
              fontSize: "13px",
              fontWeight: "600",
              cursor: "pointer"
            }}
          >
            {tr("Đóng")}
          </button>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
};

export default InstructorStudentDetailModal;
