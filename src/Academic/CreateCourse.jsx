import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { api } from "../utils/api";
import { useToast } from "../components/Toast";
import { useLanguage } from "../context/LanguageContext";
import CompletionRequirementsSection from "./CompletionRequirementsSection";

const CreateCourse = ({ onSave, onCancel, nextCourseCode }) => {
  const { tr } = useLanguage();
  const [code, setCode] = useState(nextCourseCode || "AV-MNT-102");
  const [name, setName] = useState("");
  const [nameError, setNameError] = useState("");
  const [duration, setDuration] = useState(0);
  const [description, setDescription] = useState("");
  const toast = useToast();

  // Completion Requirements state (Phase 1 & Phase 4) - Để trống mặc định để người tạo chủ động chọn
  const [completionRequirements, setCompletionRequirements] = useState([]);

  // Departments (Training Audience) selection state
  const [availableDepartments, setAvailableDepartments] = useState([]);
  const [selectedDepartmentIds, setSelectedDepartmentIds] = useState([]);
  const [loadingDepartments, setLoadingDepartments] = useState(true);
  const [departmentLoadError, setDepartmentLoadError] = useState(false);

  // Subjects selection state (Business Rule: Course MUST have at least 1 Subject)
  const [availableSubjects, setAvailableSubjects] = useState([]);
  const [selectedSubjectIds, setSelectedSubjectIds] = useState([]);
  const [subjectCriteria, setSubjectCriteria] = useState({}); // subjectId -> { requiredHours, isMandatory, passingScore }
  const [loadingSubjects, setLoadingSubjects] = useState(true);

  // Grade weights
  const [theory, setTheory] = useState(40);
  const [practice, setPractice] = useState(40);
  const [assignment, setAssignment] = useState(10);
  const [attendance, setAttendance] = useState(10);

  const [status, setStatus] = useState("HOẠT ĐỘNG");

  const totalWeight = theory + practice + assignment + attendance;
  const isWeightValid = totalWeight === 100;
  const isSubjectValid = selectedSubjectIds.length > 0;

  // Load available departments & subjects from API
  useEffect(() => {
    const fetchDepartments = async () => {
      try {
        setLoadingDepartments(true);
        setDepartmentLoadError(false);
        const data = await api.get("/Departments");
        const deptsArr = Array.isArray(data) ? data : [];
        // Filter training audience departments (exclude internal admin/training depts)
        const audienceDepts = deptsArr.filter((d) => {
          if (d.isTrainingAudience === false) return false;
          const code = (d.departmentCode || "").toUpperCase();
          const name = (d.departmentName || "").toLowerCase();
          return (
            code !== "ADM" &&
            code !== "TRN" &&
            !name.includes("administration") &&
            !name.includes("training") &&
            !name.includes("hành chính")
          );
        });
        setAvailableDepartments(audienceDepts);
      } catch (err) {
        console.error("Error fetching departments for CreateCourse:", err);
        setDepartmentLoadError(true);
        setAvailableDepartments([]);
      } finally {
        setLoadingDepartments(false);
      }
    };
    fetchDepartments();
  }, []);

  useEffect(() => {
    const fetchSubjects = async () => {
      try {
        setLoadingSubjects(true);
        const data = await api.get("/Subjects").catch(() => []);
        const subjectsArr = Array.isArray(data) ? data : [];

        const source =
          subjectsArr.length > 0
            ? subjectsArr
            : [
                {
                  subjectId: 1,
                  subjectCode: "SJ-REG",
                  subjectName: "Aviation Regulations & Compliance",
                  defaultHours: 20,
                },
                {
                  subjectId: 2,
                  subjectCode: "SJ-SYS",
                  subjectName: "Aircraft Systems Fundamentals",
                  defaultHours: 40,
                },
                {
                  subjectId: 3,
                  subjectCode: "SJ-PRA",
                  subjectName: "Practical Maintenance Skills",
                  defaultHours: 50,
                },
                {
                  subjectId: 4,
                  subjectCode: "SJ-SAF",
                  subjectName: "Safety & Human Factors",
                  defaultHours: 10,
                },
              ];

        setAvailableSubjects(source);
        setSelectedSubjectIds(source.map((s) => String(s.subjectId)));
        const initialCriteria = {};
        source.forEach((s) => {
          initialCriteria[String(s.subjectId)] = {
            requiredHours: s.defaultHours || 0,
            requiredSessions: s.minSessions || 1,
            isMandatory: true,
            passingScore: 5,
          };
        });
        setSubjectCriteria(initialCriteria);
      } catch (err) {
        console.error("Error fetching subjects for CreateCourse:", err);
      } finally {
        setLoadingSubjects(false);
      }
    };
    fetchSubjects();
  }, []);

  // Auto-calculate duration from selected subjects' requiredHours
  useEffect(() => {
    const total = selectedSubjectIds.reduce((sum, idStr) => {
      return sum + (subjectCriteria[idStr]?.requiredHours || 0);
    }, 0);
    setDuration(total);
  }, [selectedSubjectIds, subjectCriteria]);

  // Số giờ môn học chỉ nhận số nguyên không âm — kẹp ngay khi nhập để tổng
  // thời lượng khóa học không bao giờ âm hay thập phân.
  const toNonNegativeInt = (raw) =>
    Math.max(0, Math.floor(Number(raw) || 0));

  const updateSubjectCriteria = (subIdStr, field, value) => {
    setSubjectCriteria((prev) => ({
      ...prev,
      [subIdStr]: {
        ...(prev[subIdStr] || {
          requiredHours: 0,
          requiredSessions: 1,
          isMandatory: true,
          passingScore: 5,
        }),
        [field]: value,
      },
    }));
  };

  const handleNameChange = (e) => {
    const val = e.target.value;
    if (/[^a-zA-Z0-9\s\-',.()&/]/.test(val)) {
      setNameError(tr("Tên khóa học không được chứa ký tự đặc biệt."));
    } else {
      setNameError("");
    }
    setName(val);
  };

  const handleSubjectToggle = (subIdStr) => {
    setSelectedSubjectIds((prev) => {
      if (prev.includes(subIdStr)) {
        return prev.filter((id) => id !== subIdStr);
      } else {
        return [...prev, subIdStr];
      }
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    if (nameError) {
      toast.error(tr("Lỗi xác thực"));
      return;
    }

    if (!name.trim()) {
      toast.error(tr("Lỗi xác thực"));
      return;
    }

    if (theory < 0 || practice < 0 || assignment < 0 || attendance < 0) {
      toast.error(tr("Lỗi xác thực"));
      return;
    }

    if (!isWeightValid) {
      toast.warning(tr("Trọng số không hợp lệ"));
      return;
    }

    if (!isSubjectValid) {
      toast.error(tr("Quy tắc tuân thủ (Business Rule)"));
      return;
    }

    // Mỗi môn trong khóa phải có số giờ >= 1 (lớn hơn 0)
    const chosenSubjects = availableSubjects.filter((s) =>
      selectedSubjectIds.includes(String(s.subjectId)),
    );
    const hasZeroHourSubject = chosenSubjects.some((s) => {
      const crit = subjectCriteria[String(s.subjectId)];
      return !(Number(crit?.requiredHours) >= 1);
    });
    if (hasZeroHourSubject) {
      toast.error(tr('subject default hours must be larger than 0'));
      return;
    }

    // Thời lượng khóa học = tổng giờ các môn → phải là số nguyên dương
    if (!Number.isInteger(duration) || duration <= 0) {
      toast.error(
        tr(
          "Thời lượng khóa học phải là số nguyên dương (tổng số giờ các môn học). Vui lòng kiểm tra số giờ từng môn.",
        ),
      );
      return;
    }

    const structure = {};
    if (theory > 0) structure.theory = theory;
    if (practice > 0) structure.practice = practice;
    if (assignment > 0) structure.assignment = assignment;
    if (attendance > 0) structure.attendance = attendance;

    const subjectsPayload = chosenSubjects.map((s, idx) => {
      const crit = subjectCriteria[String(s.subjectId)] || {
        requiredHours: s.defaultHours || 0,
        requiredSessions: s.minSessions || 1,
        isMandatory: true,
        passingScore: 5,
      };
      return {
        subjectId: s.subjectId,
        sequenceNo: idx + 1,
        requiredHours: Number(crit.requiredHours) || 0,
        requiredSessions: Number(crit.requiredSessions) || 1,
        isMandatory: !!crit.isMandatory,
        passingScore: Number(crit.passingScore) || 0,
      };
    });

    const newCourse = {
      code,
      name: name.trim(),
      duration,
      description,
      structure,
      selectedSubjectIds,
      subjects: subjectsPayload,
      completionRequirements,
      departmentIds: selectedDepartmentIds.map(Number),
      attendanceProgress: 100,
      activeClassesCount: 0,
      classes: [],
      status: status === "HOẠT ĐỘNG" ? "Active" : "Pending",
    };

    onSave(newCourse);
  };

  const modalJSX = (
    <div
      className="modal-overlay"
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        width: "100vw",
        height: "100vh",
        backgroundColor: "rgba(0, 33, 71, 0.75)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 999999,
        backdropFilter: "blur(4px)",
      }}
    >
      <div
        className="modal-container"
        style={{
          width: "750px",
          maxWidth: "95vw",
          maxHeight: "90vh",
          margin: "auto",
        }}
      >
        <header className="modal-header">
          <h2>{tr("TẠO KHÓA HỌC MỚI (CẤU HÌNH MÔN HỌC BẮT BUỘC)")}</h2>
          <button
            className="close-btn"
            type="button"
            onClick={onCancel}
            aria-label={tr("Đóng")}
          >
            &times;
          </button>
        </header>

        <form onSubmit={handleSubmit}>
          <div
            className="modal-body"
            style={{ maxHeight: "75vh", overflowY: "auto", padding: "24px" }}
          >
            <div
              style={{
                backgroundColor: "#eff6ff",
                borderLeft: "4px solid #3b82f6",
                color: "#1e40af",
                padding: "12px 16px",
                borderRadius: "6px",
                fontSize: "12px",
                lineHeight: "1.5",
                marginBottom: "20px",
              }}
            >
              📌{" "}
              <strong>
                {tr(
                  "Quy tắc nghiệp vụ ETR bắt buộc (Section 3 - Business Rules):",
                )}
              </strong>
              <br />
              <i>
                {tr(
                  '"Một Khóa học (COURSE) phải có ít nhất một Môn học (SUBJECT) được cấu hình trong COURSE_SUBJECT trước khi mở ghi danh (Enrollment)."',
                )}
              </i>
            </div>

            {/* Basic Info */}
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "20px",
                marginBottom: "24px",
              }}
            >
              <div
                style={{
                  fontSize: "13px",
                  fontWeight: "700",
                  color: "#002147",
                  borderBottom: "1px solid #e0e4e9",
                  paddingBottom: "8px",
                }}
              >
                {tr("THÔNG TIN CƠ BẢN KHÓA HỌC")}
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="course-code">{tr("Mã khóa học *")}</label>
                  <input
                    id="course-code"
                    type="text"
                    placeholder={tr("Ví dụ: AV-MNT-102")}
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    required
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="course-duration">
                    {tr("Thời lượng (Giờ)")}{" "}
                    {tr("(Tự động tính từ các môn học đã chọn)")}
                  </label>
                  <input
                    id="course-duration"
                    type="number"
                    value={duration}
                    readOnly
                    style={{
                      backgroundColor: "#f8fafc",
                      cursor: "not-allowed",
                      opacity: "0.8",
                    }}
                  />
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="course-name">{tr("Tên khóa học *")}</label>
                <input
                  id="course-name"
                  type="text"
                  placeholder={tr(
                    "Nhập tên chương trình khóa học đào tạo (Ví dụ: Kỹ thuật Bảo trì Hệ thống Tàu bay)",
                  )}
                  value={name}
                  onChange={handleNameChange}
                  required
                />
                {nameError && (
                  <div
                    style={{
                      fontSize: "11px",
                      color: "#dc2626",
                      marginTop: "4px",
                      fontWeight: "600",
                    }}
                  >
                    {nameError}
                  </div>
                )}
              </div>

              <div className="form-group">
                <label htmlFor="course-desc">{tr("Mô tả khóa học")}</label>
                <textarea
                  id="course-desc"
                  className="premium-textarea"
                  style={{
                    height: "70px",
                    padding: "10px 14px",
                    borderRadius: "4px",
                    border: "1px solid #e0e4e8",
                    fontSize: "14px",
                    width: "100%",
                    outline: "none",
                  }}
                  placeholder={tr(
                    "Nhập tóm tắt nội dung chương trình đào tạo...",
                  )}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>
            </div>

            {/* PHÒNG BAN / ĐỐI TƯỢNG ĐÀO TẠO ĐƯỢC PHÉP HỌC */}
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "12px",
                marginBottom: "24px",
                backgroundColor: "#f8fafc",
                padding: "16px",
                borderRadius: "8px",
                border: "1px solid #e2e8f0",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  borderBottom: "1px solid #cbd5e1",
                  paddingBottom: "8px",
                }}
              >
                <div>
                  <span
                    style={{
                      fontSize: "13px",
                      fontWeight: "700",
                      color: "#002147",
                    }}
                  >
                    {tr("PHÒNG BAN / ĐỐI TƯỢNG ĐÀO TẠO ĐƯỢC PHÉP HỌC")}
                  </span>
                  <div style={{ fontSize: "11px", color: "#64748b", marginTop: "2px" }}>
                    {tr("Chọn các phòng ban được phép học khóa này. Để trống = Cho phép mọi phòng ban (Không giới hạn).")}
                  </div>
                </div>
                <span
                  style={{
                    fontSize: "11px",
                    fontWeight: 600,
                    padding: "3px 8px",
                    borderRadius: "12px",
                    backgroundColor: selectedDepartmentIds.length > 0 ? "#e0f2fe" : "#f1f5f9",
                    color: selectedDepartmentIds.length > 0 ? "#0369a1" : "#475569",
                    border: selectedDepartmentIds.length > 0 ? "1px solid #bae6fd" : "1px solid #cbd5e1",
                  }}
                >
                  {selectedDepartmentIds.length > 0
                    ? `🎯 ${tr("Đã giới hạn")} (${selectedDepartmentIds.length})`
                    : `🌐 ${tr("Mọi phòng ban (Không giới hạn)")}`}
                </span>
              </div>

              {loadingDepartments ? (
                <div style={{ fontSize: "12px", color: "#64748b", fontStyle: "italic" }}>
                  {tr("Đang tải danh sách phòng ban đào tạo...")}
                </div>
              ) : departmentLoadError ? (
                <div
                  style={{
                    fontSize: "12px",
                    color: "#dc2626",
                    backgroundColor: "#fef2f2",
                    padding: "8px 12px",
                    borderRadius: "4px",
                    border: "1px solid #fecaca",
                  }}
                >
                  ⚠️ {tr("Không thể tải danh sách phòng ban do lỗi máy chủ (Database chưa áp dụng Migration). Vui lòng thử lại sau.")}
                </div>
              ) : availableDepartments.length === 0 ? (
                <div style={{ fontSize: "12px", color: "#64748b", fontStyle: "italic" }}>
                  {tr("Không có danh mục phòng ban chuyên môn. Khóa học sẽ mở cho tất cả học viên.")}
                </div>
              ) : (
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
                    gap: "10px",
                    marginTop: "4px",
                  }}
                >
                  {availableDepartments.map((dept) => {
                    const isChecked = selectedDepartmentIds.includes(String(dept.departmentId));
                    return (
                      <label
                        key={dept.departmentId}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "8px",
                          padding: "8px 12px",
                          borderRadius: "6px",
                          backgroundColor: isChecked ? "#eff6ff" : "#ffffff",
                          border: isChecked ? "1px solid #3b82f6" : "1px solid #cbd5e1",
                          cursor: "pointer",
                          fontSize: "13px",
                          fontWeight: isChecked ? 600 : 400,
                          color: isChecked ? "#1d4ed8" : "#334155",
                          transition: "all 0.15s ease-in-out",
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => {
                            const strId = String(dept.departmentId);
                            setSelectedDepartmentIds((prev) =>
                              prev.includes(strId)
                                ? prev.filter((id) => id !== strId)
                                : [...prev, strId]
                            );
                          }}
                          style={{ cursor: "pointer", accentColor: "#2563eb" }}
                        />
                        <span>{dept.departmentName}</span>
                        {dept.departmentCode && (
                          <span style={{ fontSize: "10px", color: "#94a3b8", marginLeft: "auto" }}>
                            {dept.departmentCode}
                          </span>
                        )}
                      </label>
                    );
                  })}
                </div>
              )}
            </div>

            {/* MANDATORY COURSE SUBJECTS CONFIGURATION */}
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "14px",
                marginBottom: "24px",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  borderBottom: "1px solid #e0e4e9",
                  paddingBottom: "8px",
                }}
              >
                <span
                  style={{
                    fontSize: "13px",
                    fontWeight: "700",
                    color: "#002147",
                  }}
                >
                  {tr("CẤU HÌNH MÔN HỌC KHÓA (COURSE_SUBJECTS) *")}
                </span>
                <span
                  style={{
                    fontSize: "12px",
                    fontWeight: 600,
                    color: isSubjectValid ? "#16a34a" : "#dc2626",
                  }}
                >
                  {isSubjectValid
                    ? `${tr("✓ Đã chọn")} ${selectedSubjectIds.length} ${tr("môn học (Đạt điều kiện)")}`
                    : tr("❌ Chọn ít nhất 1 môn học")}
                </span>
              </div>

              {loadingSubjects ? (
                <div
                  style={{
                    fontSize: "13px",
                    color: "#64748b",
                    padding: "8px 0",
                  }}
                >
                  {tr("Đang tải danh sách môn học...")}
                </div>
              ) : (
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: "12px",
                    backgroundColor: "#f8fafc",
                    padding: "16px",
                    borderRadius: "6px",
                    border: "1px solid #e2e8f0",
                  }}
                >
                  {availableSubjects.map((sub) => {
                    const subIdStr = String(sub.subjectId);
                    const isChecked = selectedSubjectIds.includes(subIdStr);
                    return (
                      <label
                        key={sub.subjectId}
                        style={{
                          display: "flex",
                          alignItems: "flex-start",
                          gap: "10px",
                          padding: "10px 12px",
                          backgroundColor: isChecked ? "#ffffff" : "#f1f5f9",
                          border: isChecked
                            ? "1px solid #c5a059"
                            : "1px solid #cbd5e1",
                          borderRadius: "6px",
                          cursor: "pointer",
                          transition: "all 0.15s ease",
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => handleSubjectToggle(subIdStr)}
                          style={{ marginTop: "3px" }}
                        />
                        <div>
                          <div
                            style={{
                              fontSize: "13px",
                              fontWeight: 700,
                              color: "#002147",
                            }}
                          >
                            [{sub.subjectCode}] {sub.subjectName}
                          </div>
                          <div
                            style={{
                              fontSize: "11px",
                              color: "#64748b",
                              marginTop: "2px",
                            }}
                          >
                            {tr("Thời lượng:")} {sub.defaultHours || 20}{" "}
                            {tr("giờ")} | {tr("Hình thức:")}{" "}
                            {sub.assessmentMethod || "Exam"}
                          </div>
                        </div>
                      </label>
                    );
                  })}
                </div>
              )}

              {!isSubjectValid && (
                <div
                  style={{
                    fontSize: "12px",
                    color: "#dc2626",
                    fontWeight: 600,
                  }}
                >
                  {tr(
                    "⚠️ Bắt buộc phải chọn ít nhất 1 môn học. Khóa học không có môn học sẽ bị Backend chặn tuyệt đối khi Ghi danh.",
                  )}
                </div>
              )}

              {/* Per-subject criteria editor for selected subjects */}
              {isSubjectValid && (
                <div
                  style={{
                    border: "1px solid #e2e8f0",
                    borderRadius: "6px",
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      padding: "10px 14px",
                      background: "#f1f5f9",
                      fontSize: "12px",
                      fontWeight: 700,
                      color: "#002147",
                      borderBottom: "1px solid #e2e8f0",
                    }}
                  >
                    {tr(
                      "⚙️ Tiêu chí từng môn học (Thời gian học, Điểm đạt, Bắt buộc)",
                    )}
                  </div>
                  {availableSubjects
                    .filter((s) =>
                      selectedSubjectIds.includes(String(s.subjectId)),
                    )
                    .map((sub, idx) => {
                      const subIdStr = String(sub.subjectId);
                      const crit = subjectCriteria[subIdStr] || {
                        requiredHours: sub.defaultHours || 0,
                        isMandatory: true,
                        passingScore: 5,
                      };
                      return (
                        <div
                          key={sub.subjectId}
                          style={{
                            display: "grid",
                            gridTemplateColumns: "1.6fr 1fr 1fr 0.8fr 0.6fr",
                            gap: "10px",
                            alignItems: "center",
                            padding: "10px 14px",
                            borderBottom: "1px solid #f1f5f9",
                            background: idx % 2 === 0 ? "#ffffff" : "#fbfdff",
                          }}
                        >
                          <div
                            style={{
                              fontSize: "12px",
                              fontWeight: 700,
                              color: "#0f172a",
                            }}
                          >
                            <span style={{ color: "#c5a059", fontWeight: 800 }}>
                              #{idx + 1}
                            </span>{" "}
                            [{sub.subjectCode}] {sub.subjectName}
                          </div>
                          <div
                            style={{
                              display: "flex",
                              flexDirection: "column",
                              gap: "2px",
                            }}
                          >
                            <span
                              style={{
                                fontSize: "10px",
                                fontWeight: 700,
                                color: "#94a3b8",
                                textTransform: "uppercase",
                              }}
                            >
                              {tr("Số giờ cần học")}
                            </span>
                            <input
                              type="number"
                              min="0"
                              step="1"
                              value={crit.requiredHours}
                              onChange={(e) =>
                                updateSubjectCriteria(
                                  subIdStr,
                                  "requiredHours",
                                  toNonNegativeInt(e.target.value),
                                )
                              }
                              style={{
                                width: "100%",
                                padding: "6px 8px",
                                borderRadius: "4px",
                                border: "1px solid #cbd5e1",
                                fontSize: "12px",
                                outline: "none",
                              }}
                            />
                          </div>{" "}
                          <div
                            style={{
                              display: "flex",
                              flexDirection: "column",
                              gap: "2px",
                            }}
                          >
                            <span
                              style={{
                                fontSize: "10px",
                                fontWeight: 700,
                                color: "#94a3b8",
                                textTransform: "uppercase",
                              }}
                            >
                              {tr("Điểm để pass")} (0-100)
                            </span>
                            <input
                              type="number"
                              min="0"
                              max="100"
                              value={crit.passingScore}
                              onChange={(e) => {
                                const v = parseInt(e.target.value) || 0;
                                updateSubjectCriteria(
                                  subIdStr,
                                  "passingScore",
                                  Math.min(100, Math.max(0, v)),
                                );
                              }}
                              style={{
                                width: "100%",
                                padding: "6px 8px",
                                borderRadius: "4px",
                                border: "1px solid #cbd5e1",
                                fontSize: "12px",
                                outline: "none",
                              }}
                            />
                          </div>
                          <div
                            style={{
                              display: "flex",
                              flexDirection: "column",
                              gap: "2px",
                            }}
                          >
                            <span
                              style={{
                                fontSize: "10px",
                                fontWeight: 700,
                                color: "#94a3b8",
                                textTransform: "uppercase",
                              }}
                            >
                              {tr("Số buổi yêu cầu")} *
                            </span>
                            <input
                              type="number"
                              min="1"
                              value={crit.requiredSessions ?? 1}
                              onChange={(e) =>
                                updateSubjectCriteria(
                                  subIdStr,
                                  "requiredSessions",
                                  parseInt(e.target.value) || 1,
                                )
                              }
                              style={{
                                width: "100%",
                                padding: "6px 8px",
                                borderRadius: "4px",
                                border: "1px solid #cbd5e1",
                                fontSize: "12px",
                                outline: "none",
                              }}
                            />
                          </div>
                          <div
                            style={{
                              display: "flex",
                              flexDirection: "column",
                              alignItems: "center",
                              gap: "2px",
                            }}
                          >
                            <span
                              style={{
                                fontSize: "10px",
                                fontWeight: 700,
                                color: "#94a3b8",
                                textTransform: "uppercase",
                              }}
                            >
                              {tr("Bắt buộc")}
                            </span>
                            <input
                              type="checkbox"
                              checked={!!crit.isMandatory}
                              onChange={(e) =>
                                updateSubjectCriteria(
                                  subIdStr,
                                  "isMandatory",
                                  e.target.checked,
                                )
                              }
                              style={{ width: "16px", height: "16px" }}
                            />
                          </div>
                        </div>
                      );
                    })}
                </div>
              )}
            </div>

            {/* Grade Structure */}
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "16px",
                marginBottom: "24px",
              }}
            >
              <div
                style={{
                  fontSize: "13px",
                  fontWeight: "700",
                  color: "#002147",
                  borderBottom: "1px solid #e0e4e9",
                  paddingBottom: "8px",
                }}
              >
                {tr("CẤU TRÚC ĐIỂM ĐÁNH GIÁ (TỔNG = 100%)")}
              </div>

              <div className="form-group">
                <label htmlFor="course-theory">{tr("Lý thuyết (%)")}</label>
                <input
                  id="course-theory"
                  type="number"
                  min="0"
                  max="100"
                  value={theory}
                  onChange={(e) => {
                    const v = parseInt(e.target.value) || 0;
                    setTheory(v < 0 ? 0 : v);
                  }}
                  required
                />
              </div>
              <div className="form-group">
                <label htmlFor="course-practice">{tr("Thực hành (%)")}</label>
                <input
                  id="course-practice"
                  type="number"
                  min="0"
                  max="100"
                  value={practice}
                  onChange={(e) => {
                    const v = parseInt(e.target.value) || 0;
                    setPractice(v < 0 ? 0 : v);
                  }}
                  required
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="course-assign">{tr("Assignment (%)")}</label>
                  <input
                    id="course-assign"
                    type="number"
                    min="0"
                    max="100"
                    value={assignment}
                    onChange={(e) => {
                      const v = parseInt(e.target.value) || 0;
                      setAssignment(v < 0 ? 0 : v);
                    }}
                    required
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="course-attend">{tr("Chuyên cần (%)")}</label>
                  <input
                    id="course-attend"
                    type="number"
                    min="0"
                    max="100"
                    value={attendance}
                    onChange={(e) => {
                      const v = parseInt(e.target.value) || 0;
                      setAttendance(v < 0 ? 0 : v);
                    }}
                    required
                  />
                </div>
              </div>

              {/* Total weight display */}
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "12px 16px",
                  backgroundColor: isWeightValid
                    ? "rgba(34, 197, 94, 0.05)"
                    : "rgba(239, 68, 68, 0.05)",
                  border: `1px solid ${isWeightValid ? "rgba(34, 197, 94, 0.2)" : "rgba(239, 68, 68, 0.2)"}`,
                  borderRadius: "4px",
                }}
              >
                <div
                  style={{ display: "flex", alignItems: "center", gap: "8px" }}
                >
                  <span
                    style={{
                      width: "8px",
                      height: "8px",
                      borderRadius: "50%",
                      backgroundColor: isWeightValid ? "#22c55e" : "#ef4444",
                    }}
                  />
                  <span
                    style={{
                      fontSize: "13px",
                      fontWeight: "700",
                      color: "#002147",
                    }}
                  >
                    {tr("TỔNG CỘNG TRỌNG SỐ:")} {totalWeight}%
                  </span>
                </div>
                <span
                  style={{
                    fontSize: "12px",
                    fontWeight: "600",
                    color: isWeightValid ? "#16a34a" : "#dc2626",
                  }}
                >
                  {isWeightValid
                    ? tr("Hợp lệ (100%)")
                    : tr("Trọng số phải bằng 100%")}
                </span>
              </div>
            </div>

            {/* Initial Status */}
            <div
              style={{ display: "flex", flexDirection: "column", gap: "12px" }}
            >
              <div
                style={{
                  fontSize: "13px",
                  fontWeight: "700",
                  color: "#002147",
                  borderBottom: "1px solid #e0e4e9",
                  paddingBottom: "8px",
                }}
              >
                {tr("TRẠNG THÁI HOẠT ĐỘNG")}
              </div>
              <div style={{ display: "flex", gap: "16px" }}>
                <label
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    fontSize: "14px",
                    color: "#002147",
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                >
                  <input
                    type="radio"
                    name="course-status"
                    value="HOẠT ĐỘNG"
                    checked={status === "HOẠT ĐỘNG"}
                    onChange={() => setStatus("HOẠT ĐỘNG")}
                  />
                  <span>{tr("Hoạt động (Sẵn sàng mở lớp & ghi danh)")}</span>
                </label>
                <label
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    fontSize: "14px",
                    color: "#002147",
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                >
                  <input
                    type="radio"
                    name="course-status"
                    value="TẠM DỪNG"
                    checked={status === "TẠM DỪNG"}
                    onChange={() => setStatus("TẠM DỪNG")}
                  />
                  <span>{tr("Tạm dừng (Chưa mở ghi danh)")}</span>
                </label>
              </div>
            </div>

            {/* Completion Requirements Section (Phase 1 & Phase 4) */}
            <CompletionRequirementsSection
              isLocked={false}
              requirements={completionRequirements}
              onChange={setCompletionRequirements}
              versionNo={1}
            />
          </div>

          <footer
            className="modal-footer"
            style={{
              padding: "16px 24px",
              display: "flex",
              justifyContent: "flex-end",
              gap: "12px",
              borderTop: "1px solid #e0e4e9",
            }}
          >
            <button className="cancel-btn" type="button" onClick={onCancel}>
              {tr("HỦY BỎ")}
            </button>
            <button
              className="save-btn gold-gradient-btn"
              type="submit"
              disabled={!isWeightValid || !isSubjectValid}
            >
              {tr("TẠO KHÓA HỌC & CẤU HÌNH MÔN HỌC")}
            </button>
          </footer>
        </form>
      </div>

      {/* Toast notifications */}
      <toast.ToastContainer />
    </div>
  );

  return createPortal(modalJSX, document.body);
};

export default CreateCourse;
