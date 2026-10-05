import React, { useState, useEffect } from "react";
import { api, parseApiError } from "../utils/api";
import { useToast } from "../components/Toast";
import { useLanguage } from "../context/LanguageContext";

export const REQUIREMENT_TYPES = [
  {
    type: "MinAttendance",
    label: "Tỷ lệ tham dự tối thiểu",
    unit: "%",
    defaultThreshold: 80,
    min: 0,
    max: 100,
    hasThreshold: true,
    description: "Yêu cầu tỷ lệ tham dự của học viên đạt ngưỡng tối thiểu (0 - 100%)."
  },
  {
    type: "MinFlightHours",
    label: "Giờ bay tích lũy tối thiểu",
    unit: "hrs",
    defaultThreshold: 10,
    min: 0,
    max: 999.99,
    hasThreshold: true,
    description: "Tổng giờ bay huấn luyện thực tế tích lũy bắt buộc (0 - 999.99 giờ)."
  },
  {
    type: "MinSimulatorHours",
    label: "Giờ mô phỏng SIM/FSTD tối thiểu",
    unit: "hrs",
    defaultThreshold: 15,
    min: 0,
    max: 999.99,
    hasThreshold: true,
    description: "Tổng giờ buồng lái mô phỏng tích lũy bắt buộc (0 - 999.99 giờ)."
  },
  {
    type: "AllAssessmentsPassed",
    label: "Đạt tất cả bài kiểm tra lý thuyết",
    unit: null,
    defaultThreshold: null,
    hasThreshold: false,
    description: "Học viên phải đạt điểm sàn ở tất cả các bài đánh giá lý thuyết."
  },
  {
    type: "AllChecklistsSignedOff",
    label: "Ký xác nhận tất cả bảng kiểm thực hành",
    unit: null,
    defaultThreshold: null,
    hasThreshold: false,
    description: "Tất cả bảng kiểm thao tác / kỹ năng thực hành bắt buộc phải được giảng viên ký xác nhận."
  }
];

const EMPTY_REQUIREMENTS = [];

const CompletionRequirementsSection = ({
  courseId,
  isLocked = false,
  requirements = EMPTY_REQUIREMENTS,
  onChange = null, // Used in CreateCourse (local state)
  versionNo = 1
}) => {
  const { tr } = useLanguage();
  const toast = useToast();

  const [items, setItems] = useState(requirements || EMPTY_REQUIREMENTS);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  // Form state for adding/editing a requirement
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [reqType, setReqType] = useState("MinAttendance");
  const [reqName, setReqName] = useState("");
  const [reqDesc, setReqDesc] = useState("");
  const [threshold, setThreshold] = useState("80");
  const [isMandatory, setIsMandatory] = useState(true);
  const [formValidation, setFormValidation] = useState("");

  const loadRequirements = async () => {
    if (!courseId) return;
    setLoading(true);
    setErrorMsg("");
    try {
      const data = await api.get(`/CompletionRequirements/course/${courseId}`);
      const list = Array.isArray(data) ? data : [];
      setItems(list);
      if (onChange) onChange(list);
    } catch (err) {
      console.error("Lỗi tải CompletionRequirements:", err);
      setErrorMsg(parseApiError(err, tr("Không thể tải điều kiện hoàn thành từ máy chủ."), tr));
    } finally {
      setLoading(false);
    }
  };

  // 1. Khi courseId thay đổi (Chế độ Edit), chỉ tải 1 lần từ API
  useEffect(() => {
    if (courseId) {
      loadRequirements();
    }
  }, [courseId]);

  // 2. Khi không có courseId (Chế độ Create Course), đồng bộ từ prop requirements
  useEffect(() => {
    if (!courseId) {
      setItems(requirements || EMPTY_REQUIREMENTS);
    }
  }, [courseId, requirements]);

  const selectedTypeConfig = REQUIREMENT_TYPES.find((t) => t.type === reqType) || REQUIREMENT_TYPES[0];

  const handleOpenAdd = () => {
    setEditingId(null);
    setReqType("MinFlightHours");
    setReqName(tr("Giờ bay tích lũy tối thiểu"));
    setReqDesc(tr("Tổng giờ bay huấn luyện thực tế tích lũy bắt buộc (0 - 999.99 giờ)."));
    setThreshold("10");
    setIsMandatory(true);
    setFormValidation("");
    setShowForm(true);
  };

  const handleOpenEdit = (item) => {
    setEditingId(item.requirementId || item.id || item._tempId);
    setReqType(item.requirementType || "MinFlightHours");
    setReqName(item.requirementName || "");
    setReqDesc(item.description || "");
    setThreshold(item.thresholdValue != null ? String(item.thresholdValue) : "");
    setIsMandatory(item.isMandatory !== false);
    setFormValidation("");
    setShowForm(true);
  };

  const handleTypeChange = (typeVal) => {
    setReqType(typeVal);
    const cfg = REQUIREMENT_TYPES.find((t) => t.type === typeVal);
    if (cfg) {
      if (!editingId) {
        setReqName(tr(cfg.label));
        setReqDesc(tr(cfg.description));
      }
      if (cfg.hasThreshold) {
        setThreshold(cfg.defaultThreshold != null ? String(cfg.defaultThreshold) : "");
      } else {
        setThreshold("");
      }
    }
  };

  const validateForm = () => {
    if (!reqName.trim()) {
      return tr("Tên tiêu chí không được để trống.");
    }
    if (selectedTypeConfig.hasThreshold) {
      if (threshold === "" || threshold === null || isNaN(Number(threshold))) {
        return tr("Ngưỡng giá trị bắt buộc phải là số hợp lệ.");
      }
      const val = Number(threshold);
      if (val < selectedTypeConfig.min || val > selectedTypeConfig.max) {
        return `${tr("Ngưỡng cho")} ${selectedTypeConfig.label} ${tr("phải nằm trong khoảng")} ${selectedTypeConfig.min} - ${selectedTypeConfig.max} ${selectedTypeConfig.unit || ""}.`;
      }
    }
    return "";
  };

  const handleSaveForm = async (e) => {
    e.preventDefault();
    const validationError = validateForm();
    if (validationError) {
      setFormValidation(validationError);
      return;
    }

    const payload = {
      courseId: courseId ? Number(courseId) : 0,
      requirementName: reqName.trim(),
      description: reqDesc.trim() || null,
      isMandatory,
      displayOrder: items.length + 1,
      requirementType: reqType,
      thresholdValue: selectedTypeConfig.hasThreshold ? Number(threshold) : null
    };

    setSubmitting(true);
    setFormValidation("");

    try {
      if (courseId) {
        // Direct API call
        if (editingId && typeof editingId === "number") {
          await api.put(`/CompletionRequirements/${editingId}`, payload);
          toast.success(tr("Cập nhật tiêu chuẩn hoàn thành thành công!"));
        } else {
          await api.post(`/CompletionRequirements`, payload);
          toast.success(tr("Thêm tiêu chuẩn hoàn thành thành công!"));
        }
        await loadRequirements();
      } else {
        // Local mode for CreateCourse
        if (editingId) {
          const updated = items.map((it) => {
            const itId = it.requirementId || it._tempId;
            return itId === editingId ? { ...it, ...payload } : it;
          });
          setItems(updated);
          if (onChange) onChange(updated);
        } else {
          const newItem = {
            ...payload,
            _tempId: `temp_${Date.now()}`,
            versionNo: versionNo || 1
          };
          const updated = [...items, newItem];
          setItems(updated);
          if (onChange) onChange(updated);
        }
        toast.success(tr("Đã thêm yêu cầu hoàn thành vào danh sách cấu hình."));
      }
      setShowForm(false);
    } catch (err) {
      console.error("Lưu CompletionRequirement thất bại:", err);
      setFormValidation(parseApiError(err, tr("Lưu tiêu chuẩn hoàn thành thất bại."), tr));
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (item) => {
    const id = item.requirementId || item.id;
    if (courseId && id && typeof id === "number") {
      if (!window.confirm(tr("Bạn có chắc chắn muốn xóa tiêu chuẩn hoàn thành này?"))) return;
      try {
        await api.delete(`/CompletionRequirements/${id}`);
        toast.success(tr("Đã xóa tiêu chuẩn hoàn thành."));
        await loadRequirements();
      } catch (err) {
        console.error("Xóa CompletionRequirement thất bại:", err);
        toast.error(parseApiError(err, tr("Xóa tiêu chuẩn hoàn thành thất bại."), tr));
      }
    } else {
      // Local mode
      const tempId = item.requirementId || item._tempId;
      const updated = items.filter((it) => (it.requirementId || it._tempId) !== tempId);
      setItems(updated);
      if (onChange) onChange(updated);
      toast.success(tr("Đã xóa tiêu chuẩn khỏi danh sách."));
    }
  };

  return (
    <div
      style={{
        marginTop: "20px",
        padding: "16px",
        borderRadius: "10px",
        background: "#f8fafc",
        border: "1px solid #e2e8f0"
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "12px",
          borderBottom: "1px solid #cbd5e1",
          paddingBottom: "8px"
        }}
      >
        <div>
          <h4
            style={{
              margin: 0,
              fontSize: "13px",
              fontWeight: "700",
              color: "#002147",
              textTransform: "uppercase",
              letterSpacing: "0.05em",
              display: "flex",
              alignItems: "center",
              gap: "8px"
            }}
          >
            {tr("TIÊU CHUẨN HOÀN THÀNH KHÓA HỌC")}
            <span
              style={{
                fontSize: "11px",
                background: "#002147",
                color: "#fff",
                padding: "1px 6px",
                borderRadius: "10px"
              }}
            >
              v{versionNo}
            </span>
          </h4>
          <p style={{ margin: "4px 0 0", fontSize: "12px", color: "#64748b" }}>
            {tr("Cấu hình ngưỡng tối thiểu về điểm danh, giờ bay và giờ buồng lái mô phỏng để đánh giá tự động tính sẵn sàng hoàn thành.")}
          </p>
        </div>

        {!isLocked && (
          <button
            type="button"
            onClick={handleOpenAdd}
            style={{
              padding: "6px 12px",
              borderRadius: "6px",
              background: "#002147",
              color: "#fff",
              border: "none",
              fontSize: "12px",
              fontWeight: "600",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "6px"
            }}
          >
            <span>+</span> {tr("Thêm tiêu chí")}
          </button>
        )}
      </div>

      {isLocked && (
        <div
          style={{
            padding: "10px 14px",
            background: "#eff6ff",
            borderLeft: "4px solid #3b82f6",
            borderRadius: "4px",
            fontSize: "12px",
            color: "#1e40af",
            marginBottom: "12px",
            lineHeight: 1.5
          }}
        >
          <strong>{tr("Khóa cấu hình tiêu chuẩn hoàn thành:")}</strong>{" "}
          {tr("Khóa học đang hoạt động và có lớp ghi danh. Tiêu chí hoàn thành được bảo vệ để đảm bảo tính toàn vẹn hồ sơ học viên. Để điều chỉnh tiêu chí, vui lòng sử dụng")}{" "}
          <strong>{tr("Nhân bản phiên bản")}</strong>.
        </div>
      )}

      {errorMsg && (
        <div
          style={{
            padding: "10px 14px",
            background: "#fef2f2",
            border: "1px solid #fca5a5",
            borderRadius: "6px",
            color: "#b91c1c",
            fontSize: "12px",
            marginBottom: "12px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: "10px"
          }}
        >
          <div>
            <strong>{tr("Lỗi:")}</strong> {errorMsg}
          </div>
          {courseId && (
            <button
              type="button"
              onClick={loadRequirements}
              style={{
                padding: "4px 10px",
                background: "#b91c1c",
                color: "#fff",
                border: "none",
                borderRadius: "4px",
                fontSize: "11px",
                fontWeight: "600",
                cursor: "pointer",
                whiteSpace: "nowrap"
              }}
            >
              {tr("Thử lại")}
            </button>
          )}
        </div>
      )}

      {/* Requirements Table */}
      {loading ? (
        <div style={{ textAlign: "center", padding: "16px", color: "#64748b", fontSize: "12px" }}>
          {tr("Đang tải điều kiện hoàn thành...")}
        </div>
      ) : items.length === 0 ? (
        <div
          style={{
            padding: "16px",
            textAlign: "center",
            background: "#fff",
            borderRadius: "8px",
            border: "1px dashed #cbd5e1",
            color: "#64748b",
            fontSize: "12px"
          }}
        >
          {tr("Chưa cấu hình điều kiện hoàn thành cụ thể. Hệ thống sẽ áp dụng tiêu chuẩn mặc định (Điểm danh >= 80%, đạt tất cả bài kiểm tra và ký xác nhận bảng kiểm).")}
          {!isLocked && (
            <div style={{ marginTop: "8px" }}>
              <button
                type="button"
                onClick={handleOpenAdd}
                style={{
                  background: "none",
                  border: "none",
                  color: "#0284c7",
                  fontSize: "12px",
                  fontWeight: "600",
                  cursor: "pointer",
                  textDecoration: "underline"
                }}
              >
                {tr("+ Bổ sung ngay")}
              </button>
            </div>
          )}
        </div>
      ) : (
        <div style={{ overflowX: "auto", background: "#fff", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px" }}>
            <thead>
              <tr style={{ background: "#f1f5f9", color: "#334155", textAlign: "left" }}>
                <th style={{ padding: "8px 12px", width: "40px" }}>STT</th>
                <th style={{ padding: "8px 12px" }}>{tr("Tiêu chí & Phân loại")}</th>
                <th style={{ padding: "8px 12px", width: "130px" }}>{tr("Ngưỡng yêu cầu")}</th>
                <th style={{ padding: "8px 12px", width: "100px" }}>{tr("Bắt buộc")}</th>
                <th style={{ padding: "8px 12px", width: "80px" }}>{tr("Phiên bản")}</th>
                {!isLocked && <th style={{ padding: "8px 12px", textAlign: "right", width: "100px" }}>{tr("Thao tác")}</th>}
              </tr>
            </thead>
            <tbody>
              {items.map((item, idx) => {
                const cfg = REQUIREMENT_TYPES.find((t) => t.type === item.requirementType);
                const unitStr = cfg?.unit || (item.requirementType === "MinAttendance" ? "%" : item.requirementType?.includes("Hours") ? "hrs" : "");
                return (
                  <tr key={item.requirementId || item._tempId || idx} style={{ borderBottom: "1px solid #f1f5f9" }}>
                    <td style={{ padding: "8px 12px", color: "#64748b" }}>{idx + 1}</td>
                    <td style={{ padding: "8px 12px" }}>
                      <strong style={{ color: "#002147", display: "block" }}>{item.requirementName}</strong>
                      <span style={{ fontSize: "11px", color: "#64748b" }}>
                        {item.requirementType || tr("Tham khảo")} {item.description ? `• ${item.description}` : ""}
                      </span>
                    </td>
                    <td style={{ padding: "8px 12px" }}>
                      {item.thresholdValue != null ? (
                        <span
                          style={{
                            fontWeight: "700",
                            color: "#0369a1",
                            background: "#e0f2fe",
                            padding: "2px 8px",
                            borderRadius: "4px"
                          }}
                        >
                          ≥ {Number(item.thresholdValue).toFixed(item.requirementType === "MinAttendance" ? 0 : 1)} {unitStr}
                        </span>
                      ) : (
                        <span style={{ color: "#64748b", fontStyle: "italic" }}>{tr("Định tính")}</span>
                      )}
                    </td>
                    <td style={{ padding: "8px 12px" }}>
                      {item.isMandatory ? (
                        <span
                          style={{
                            color: "#b91c1c",
                            background: "#fee2e2",
                            padding: "2px 6px",
                            borderRadius: "4px",
                            fontWeight: "600",
                            fontSize: "11px"
                          }}
                        >
                          {tr("Bắt buộc")}
                        </span>
                      ) : (
                        <span style={{ color: "#64748b", fontSize: "11px" }}>{tr("Tham khảo")}</span>
                      )}
                    </td>
                    <td style={{ padding: "8px 12px", color: "#475569", fontWeight: "600" }}>
                      v{item.versionNo || versionNo || 1}
                    </td>
                    {!isLocked && (
                      <td style={{ padding: "8px 12px", textAlign: "right" }}>
                        <button
                          type="button"
                          onClick={() => handleOpenEdit(item)}
                          style={{
                            background: "none",
                            border: "none",
                            color: "#0284c7",
                            cursor: "pointer",
                            fontSize: "12px",
                            marginRight: "8px"
                          }}
                        >
                          {tr("Sửa")}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(item)}
                          style={{
                            background: "none",
                            border: "none",
                            color: "#ef4444",
                            cursor: "pointer",
                            fontSize: "12px"
                          }}
                        >
                          {tr("Xóa")}
                        </button>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Form Modal for Add/Edit */}
      {showForm && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(15, 23, 42, 0.65)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000000,
            backdropFilter: "blur(4px)"
          }}
        >
          <div
            style={{
              background: "#fff",
              borderRadius: "12px",
              padding: "20px 24px",
              width: "100%",
              maxWidth: "520px",
              boxShadow: "0 20px 25px -5px rgba(0,0,0,0.2)"
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                borderBottom: "1px solid #e2e8f0",
                paddingBottom: "10px",
                marginBottom: "16px"
              }}
            >
              <h3 style={{ margin: 0, fontSize: "16px", color: "#002147", fontWeight: "700" }}>
                {editingId ? tr("Chỉnh sửa Tiêu chuẩn Hoàn thành") : tr("Thêm Tiêu chuẩn Hoàn thành Mới")}
              </h3>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                style={{ background: "none", border: "none", fontSize: "20px", cursor: "pointer", color: "#64748b" }}
              >
                ×
              </button>
            </div>

            {formValidation && (
              <div
                style={{
                  padding: "8px 12px",
                  background: "#fef2f2",
                  border: "1px solid #fca5a5",
                  borderRadius: "6px",
                  color: "#b91c1c",
                  fontSize: "12px",
                  marginBottom: "14px"
                }}
              >
                {formValidation}
              </div>
            )}

            <form onSubmit={handleSaveForm}>
              <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                <div>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: "600", color: "#334155", marginBottom: "4px" }}>
                    {tr("Phân loại tiêu chuẩn *")}
                  </label>
                  <select
                    value={reqType}
                    onChange={(e) => handleTypeChange(e.target.value)}
                    style={{
                      width: "100%",
                      padding: "8px 10px",
                      borderRadius: "6px",
                      border: "1px solid #cbd5e1",
                      fontSize: "13px"
                    }}
                  >
                    {REQUIREMENT_TYPES.map((t) => (
                      <option key={t.type} value={t.type}>
                        {tr(t.label)}
                      </option>
                    ))}
                  </select>
                  <div style={{ fontSize: "11px", color: "#64748b", marginTop: "3px" }}>
                    {tr(selectedTypeConfig.description)}
                  </div>
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: "600", color: "#334155", marginBottom: "4px" }}>
                    {tr("Tên tiêu chuẩn hiển thị *")}
                  </label>
                  <input
                    type="text"
                    value={reqName}
                    onChange={(e) => setReqName(e.target.value)}
                    placeholder={tr("Nhập tên điều kiện...")}
                    required
                    style={{
                      width: "100%",
                      padding: "8px 10px",
                      borderRadius: "6px",
                      border: "1px solid #cbd5e1",
                      fontSize: "13px"
                    }}
                  />
                </div>

                {selectedTypeConfig.hasThreshold && (
                  <div>
                    <label style={{ display: "block", fontSize: "12px", fontWeight: "600", color: "#334155", marginBottom: "4px" }}>
                      {tr("Ngưỡng giá trị")} ({selectedTypeConfig.unit}) *
                    </label>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <input
                        type="number"
                        step={selectedTypeConfig.type === "MinAttendance" ? "1" : "0.1"}
                        min={selectedTypeConfig.min}
                        max={selectedTypeConfig.max}
                        value={threshold}
                        onChange={(e) => setThreshold(e.target.value)}
                        required
                        style={{
                          flex: 1,
                          padding: "8px 10px",
                          borderRadius: "6px",
                          border: "1px solid #cbd5e1",
                          fontSize: "13px"
                        }}
                      />
                      <span style={{ fontSize: "13px", fontWeight: "600", color: "#475569" }}>
                        {selectedTypeConfig.unit}
                      </span>
                    </div>
                    <div style={{ fontSize: "11px", color: "#64748b", marginTop: "3px" }}>
                      {tr("Khoảng giá trị cho phép:")} {selectedTypeConfig.min} - {selectedTypeConfig.max} {selectedTypeConfig.unit}
                    </div>
                  </div>
                )}

                <div>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: "600", color: "#334155", marginBottom: "4px" }}>
                    {tr("Mô tả / Ghi chú")}
                  </label>
                  <textarea
                    rows={2}
                    value={reqDesc}
                    onChange={(e) => setReqDesc(e.target.value)}
                    placeholder={tr("Nhập ghi chú bổ sung cho tiêu chí này...")}
                    style={{
                      width: "100%",
                      padding: "8px 10px",
                      borderRadius: "6px",
                      border: "1px solid #cbd5e1",
                      fontSize: "13px"
                    }}
                  />
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <input
                    type="checkbox"
                    id="isMandatoryCheck"
                    checked={isMandatory}
                    onChange={(e) => setIsMandatory(e.target.checked)}
                    style={{ accentColor: "#002147", cursor: "pointer", width: "16px", height: "16px" }}
                  />
                  <label htmlFor="isMandatoryCheck" style={{ fontSize: "13px", color: "#334155", cursor: "pointer" }}>
                    <strong>{tr("Bắt buộc để hoàn thành khóa học")}</strong>
                  </label>
                </div>
              </div>

              <div
                style={{
                  display: "flex",
                  justifyContent: "flex-end",
                  gap: "10px",
                  marginTop: "18px",
                  borderTop: "1px solid #e2e8f0",
                  paddingTop: "14px"
                }}
              >
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  disabled={submitting}
                  style={{
                    padding: "8px 14px",
                    borderRadius: "6px",
                    border: "1px solid #cbd5e1",
                    background: "#fff",
                    color: "#475569",
                    fontSize: "13px",
                    fontWeight: "600",
                    cursor: "pointer"
                  }}
                >
                  {tr("Hủy")}
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  style={{
                    padding: "8px 16px",
                    borderRadius: "6px",
                    border: "none",
                    background: "#002147",
                    color: "#fff",
                    fontSize: "13px",
                    fontWeight: "600",
                    cursor: submitting ? "not-allowed" : "pointer"
                  }}
                >
                  {submitting ? tr("Saving...") : tr("Save Requirement")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default CompletionRequirementsSection;
