import { useState, useEffect, useMemo } from "react";
import { api } from "../utils/api";
const getAccountIdFromToken = () => {
  try {
    const token = localStorage.getItem("token");
    if (!token) return 0;
    const base64Url = token.split(".")[1];
    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split("")
        .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
        .join(""),
    );
    const decoded = JSON.parse(jsonPayload);
    const id =
      decoded[
        "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier"
      ];
    return parseInt(id) || 0;
  } catch (e) {
    console.error("Lỗi giải mã token:", e);
    return 0;
  }
};

const InstructorEvidence = () => {
  const [classesData, setClassesData] = useState([]);
  const [selectedClassId, setSelectedClassId] = useState("");
  const [evidences, setEvidences] = useState([]);
  const [evidenceTypes, setEvidenceTypes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadingFileName, setUploadingFileName] = useState("");
  const [selectedEvidenceTypeId, setSelectedEvidenceTypeId] = useState("");

  // File drag & drop hover state
  const [dragging, setDragging] = useState(false);

  // Load classes and evidence types
  useEffect(() => {
    const loadInitData = async () => {
      setLoading(true);
      try {
        const [apiClasses, apiCourses, apiEvidenceTypes] = await Promise.all([
          api.get("/classes").catch(() => []),
          api.get("/courses").catch(() => []),
          api.get("/EvidenceTypes").catch(() => []),
        ]);

        const mappedClasses = apiClasses.map((cls, idx) => {
          const course = apiCourses.find((c) => c.courseId === cls.courseId);
          return {
            classId: cls.classId,
            code: cls.classCode || `CL-${cls.classId}`,
            name: cls.className || "Lớp đào tạo",
            subName: course ? course.courseName : "Chuyên đề huấn luyện",
            courseKey: course ? String(course.courseId) : "N/A",
            subjectId: cls.subjectId || 1,
          };
        });
        setClassesData(mappedClasses);
        setEvidenceTypes(apiEvidenceTypes);
        if (apiEvidenceTypes.length > 0) {
          setSelectedEvidenceTypeId(String(apiEvidenceTypes[0].evidenceTypeId));
        }
        if (mappedClasses.length > 0) {
          setSelectedClassId(mappedClasses[0].classId);
        }
      } catch (err) {
        console.error("Lỗi khi tải dữ liệu khởi tạo:", err);
      } finally {
        setLoading(false);
      }
    };
    loadInitData();
  }, []);

  // Load evidence files when class is selected
  const loadEvidences = async () => {
    if (!selectedClassId) return;
    setLoading(true);
    try {
      const [allEvidences, allEtrs] = await Promise.all([
        api.get("/Evidences").catch(() => []),
        api.get("/etr").catch(() => []),
      ]);

      // Filter evidence files by matching subjectResultId for students in this class
      const classEnrollments = await api.get("/enrollments").catch(() => []);
      const classEnrollmentIds = classEnrollments
        .filter((e) => e.classId === parseInt(selectedClassId))
        .map((e) => e.enrollmentId);

      // ETR API returns enrollmentId (not accountId), so match by enrollmentId
      const classEtrs = allEtrs.filter((e) =>
        classEnrollmentIds.includes(e.enrollmentId),
      );
      const subjectResultIds = [];

      await Promise.all(
        classEtrs.map(async (etr) => {
          const etrDetails = await api
            .get(`/etr/${etr.etrCourseRecordId}`)
            .catch(() => null);
          if (etrDetails && etrDetails.subjectResults) {
            const currentClass = classesData.find(
              (c) => c.classId === parseInt(selectedClassId),
            );
            const subRes = etrDetails.subjectResults.find(
              (sr) =>
                sr.subjectId === (currentClass ? currentClass.subjectId : 1),
            );
            if (subRes) {
              subjectResultIds.push(subRes.subjectResultId);
            }
          }
        }),
      );

      // Debug: log what we got
      console.log("[loadEvidences] allEvidences:", allEvidences?.length || 0);
      console.log("[loadEvidences] allEtrs:", allEtrs?.length || 0);
      console.log("[loadEvidences] classEnrollmentIds:", classEnrollmentIds);
      console.log("[loadEvidences] classEtrs:", classEtrs?.length || 0);
      console.log("[loadEvidences] subjectResultIds found:", subjectResultIds);

      // If we have subjectResultIds, filter by them; otherwise show all evidences
      const filteredEvidences =
        subjectResultIds.length > 0
          ? allEvidences.filter((ev) =>
              subjectResultIds.includes(ev.subjectResultId),
            )
          : allEvidences;

      console.log("[loadEvidences] filteredEvidences:", filteredEvidences?.length || 0);

      const mappedEvidences = filteredEvidences.map((ev, idx) => {
        const typeName =
          evidenceTypes.find((t) => t.evidenceTypeId === ev.evidenceTypeId)
            ?.typeName || "PRACTICAL FORM";
        const fileSizeInMB = ev.fileSize
          ? `${(ev.fileSize / (1024 * 1024)).toFixed(2)} MB`
          : "1.2 MB";
        return {
          evidenceFileId: ev.evidenceFileId || ev.id,
          stt: String(idx + 1).padStart(2, "0"),
          name: ev.fileName || "Bằng chứng đào tạo",
          type: typeName,
          date:
            ev.uploadedAt || ev.createdAt
              ? new Date(ev.uploadedAt || ev.createdAt).toLocaleDateString()
              : "N/A",
          size: fileSizeInMB,
          status: "Verified",
          fileUrl: ev.filePath || ev.fileUrl,
        };
      });
      setEvidences(mappedEvidences);
    } catch (err) {
      console.error("Lỗi khi tải minh chứng:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadEvidences();
  }, [selectedClassId, classesData, evidenceTypes]);

  // Handle file select and call upload API
  const handleUploadFile = async (file) => {
    if (!file) return;

    // Validate evidence type is selected
    if (!selectedEvidenceTypeId) {
      alert("Vui lòng chọn loại bằng chứng trước khi tải lên.");
      return;
    }

    setUploading(true);
    setUploadingFileName(file.name);
    try {
      // Get logged-in user accountId
      let currentAccountId = getAccountIdFromToken();
      if (!currentAccountId) {
        try {
          const userJson = localStorage.getItem("user");
          if (userJson) {
            const parsedUser = JSON.parse(userJson);
            currentAccountId =
              parseInt(parsedUser.userId) ||
              parseInt(parsedUser.accountId) ||
              parseInt(parsedUser.id) ||
              0;
          }
        } catch (e) {
          console.error("Error reading accountId from user info", e);
        }
      }

      // Find subjectResultId to link this evidence file
      const allEtrs = await api.get("/etr").catch(() => []);
      const classEnrollments = await api.get("/enrollments").catch(() => []);
      const classEnrollment = classEnrollments.find(
        (e) => e.classId === parseInt(selectedClassId),
      );

      let subjectResultId = 1;
      if (classEnrollment) {
        // ETR API returns enrollmentId (not accountId), so match by enrollmentId
        const studentEtr = allEtrs.find(
          (e) => e.enrollmentId === classEnrollment.enrollmentId,
        );
        if (studentEtr) {
          const etrDetails = await api
            .get(`/etr/${studentEtr.etrCourseRecordId}`)
            .catch(() => null);
          if (etrDetails && etrDetails.subjectResults) {
            const currentClass = classesData.find(
              (c) => c.classId === parseInt(selectedClassId),
            );
            const subRes = etrDetails.subjectResults.find(
              (sr) =>
                sr.subjectId === (currentClass ? currentClass.subjectId : 1),
            );
            if (subRes) {
              subjectResultId = subRes.subjectResultId;
            }
          }
        }
      }

      const evidenceTypeIdInt = parseInt(selectedEvidenceTypeId);
      const accountIdInt = parseInt(currentAccountId);
      const subjectResultIdInt = parseInt(subjectResultId);

      console.log("[Upload Evidence] ====== DEBUG UPLOAD ======");
      console.log("[Upload Evidence] EvidenceTypeId:", {
        raw: selectedEvidenceTypeId,
        parsedInt: evidenceTypeIdInt,
        type: typeof selectedEvidenceTypeId,
      });
      console.log("[Upload Evidence] AccountId:", {
        raw: currentAccountId,
        parsedInt: accountIdInt,
        type: typeof currentAccountId,
      });
      console.log("[Upload Evidence] SubjectResultId:", {
        raw: subjectResultId,
        parsedInt: subjectResultIdInt,
        type: typeof subjectResultId,
      });
      console.log("[Upload Evidence] File:", {
        name: file.name,
        size: file.size,
        type: file.type,
      });
      console.log("[Upload Evidence] Selected class:", {
        classId: selectedClassId,
        className: selectedClass?.name,
        subjectId: selectedClass?.subjectId,
      });
      console.log("[Upload Evidence] ==========================");

      // Validate IDs are valid numbers
      if (isNaN(evidenceTypeIdInt) || evidenceTypeIdInt <= 0) {
        throw new Error("EvidenceTypeId không hợp lệ: " + selectedEvidenceTypeId);
      }
      if (isNaN(accountIdInt) || accountIdInt <= 0) {
        throw new Error("AccountId không hợp lệ: " + currentAccountId);
      }
      if (isNaN(subjectResultIdInt) || subjectResultIdInt <= 0) {
        throw new Error(
          "SubjectResultId không hợp lệ: " +
            subjectResultId +
            ". Không tìm thấy ETR/subject result cho giảng viên.",
        );
      }

      const formData = new FormData();
      formData.append("EvidenceTypeId", String(evidenceTypeIdInt));
      formData.append("AccountId", String(accountIdInt));
      formData.append("SubjectResultId", String(subjectResultIdInt));
      formData.append("File", file, file.name);

      await api.postFormData("/Evidences/upload", formData);
      alert(`Đã tải lên tệp minh chứng: ${file.name} thành công!`);
      loadEvidences();
    } catch (err) {
      console.error("[Upload Evidence] Lỗi khi upload minh chứng:", err);

      let message = "Đã xảy ra lỗi khi tải lên minh chứng.";
      const errText = err?.message || "";

      // Try to extract response body for more detail
      if (err?.responseBody) {
        console.log("[Upload Evidence] Backend response body:", err.responseBody);
      }

      if (
        errText.includes("Failed to fetch") ||
        errText.includes("ERR_CONNECTION_REFUSED") ||
        errText.includes("NetworkError")
      ) {
        message =
          "Không thể kết nối tới máy chủ API. Vui lòng đảm bảo backend đang chạy và đang lắng nghe tại https://localhost:7169.";
      } else if (errText.includes("400")) {
        message =
          "Yêu cầu không hợp lệ (400). Vui lòng kiểm tra lại thông tin EvidenceTypeId, AccountId, SubjectResultId và File.";
      } else if (errText.includes("401")) {
        message =
          "Phiên đăng nhập đã hết hạn (401). Vui lòng đăng nhập lại.";
      } else if (errText.includes("413")) {
        message =
          "Tệp quá lớn (413). Vui lòng chọn tệp nhỏ hơn 10MB.";
      } else if (errText.includes("415")) {
        message =
          "Định dạng tệp không được hỗ trợ (415). Vui lòng chọn PDF, PNG, JPG hoặc DOCX.";
      } else if (errText.includes("500")) {
        message =
          "Lỗi máy chủ nội bộ (500). Vui lòng kiểm tra log backend để biết chi tiết InnerException.";
      } else if (errText) {
        message = `Lỗi: ${errText}`;
      }

      alert(message);
    } finally {
      setUploading(false);
      setUploadingFileName("");
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setDragging(true);
  };

  const handleDragLeave = () => {
    setDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleUploadFile(e.dataTransfer.files[0]);
    }
  };

  const handleDeleteEvidence = async (id) => {
    if (!window.confirm("Bạn có chắc chắn muốn xóa tệp minh chứng này?"))
      return;
    try {
      await api.delete(`/Evidences/${id}`);
      alert("Xóa tệp minh chứng thành công!");
      loadEvidences();
    } catch (err) {
      console.error("Lỗi khi xóa minh chứng:", err);
      alert("Đã xảy ra lỗi: " + err.message);
    }
  };

  const selectedClass = useMemo(() => {
    return classesData.find((c) => c.classId === parseInt(selectedClassId));
  }, [classesData, selectedClassId]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
      <section className="content-header">
        <div className="header-left">
          <h1>Hồ sơ minh chứng đào tạo</h1>
          <div className="divider-gold" />
          <p className="header-description">
            Tải lên và lưu trữ các tệp bằng chứng thực hành/điểm danh để phục vụ
            QA và báo cáo.
          </p>
        </div>
      </section>

      {/* Class Selector Bar */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "12px",
          padding: "14px 20px",
          background: "#ffffff",
          border: "1px solid #dfe6f1",
          borderRadius: "16px",
          boxShadow: "0 4px 12px rgba(0,33,71,0.04)",
        }}
      >
        <label
          style={{
            fontSize: "11px",
            fontWeight: "700",
            color: "rgba(0,33,71,0.5)",
            textTransform: "uppercase",
            letterSpacing: "0.05em",
          }}
        >
          Chọn lớp:
        </label>
        <select
          style={{
            padding: "8px 12px",
            borderRadius: "8px",
            border: "1px solid #d9e1ec",
            fontSize: "12px",
            fontWeight: "700",
            color: "#002147",
            outline: "none",
            cursor: "pointer",
          }}
          value={selectedClassId}
          onChange={(e) => setSelectedClassId(e.target.value)}
        >
          {classesData.map((c) => (
            <option key={c.classId} value={c.classId}>
              {c.name} ({c.code})
            </option>
          ))}
        </select>
      </div>

      {/* Grid: Uploader on Left, List on Right */}
      <div className="dashboard-grid">
        {/* Left pane: Evidence Files List */}
        <section className="table-card" style={{ boxShadow: "none" }}>
          <div
            style={{ padding: "16px 20px", borderBottom: "1px solid #dfe6f1" }}
          >
            <h3
              style={{
                fontSize: "15px",
                fontWeight: "700",
                color: "#002147",
                margin: 0,
              }}
            >
              Các minh chứng đã tải lên
            </h3>
            <p
              style={{
                fontSize: "11px",
                color: "rgba(0,33,71,0.5)",
                margin: "4px 0 0",
              }}
            >
              {evidences.length} tệp tài liệu lưu trữ
            </p>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "50px 1fr 140px 100px 100px",
              alignItems: "center",
              gap: "12px",
              background: "linear-gradient(135deg, #06234a 0%, #041b39 100%)",
              color: "#ffffff",
              padding: "12px 20px",
              fontSize: "11px",
              fontWeight: "700",
              letterSpacing: "0.05em",
              textTransform: "uppercase",
            }}
          >
            <div style={{ textAlign: "center" }}>STT</div>
            <div>Tên tệp bằng chứng</div>
            <div>Loại bằng chứng</div>
            <div>Ngày tải lên</div>
            <div style={{ textAlign: "right", paddingRight: "24px" }}>
              Thao tác
            </div>
          </div>

          <div className="table-body">
            {loading ? (
              <div
                style={{
                  padding: "24px",
                  textAlign: "center",
                  color: "rgba(0,33,71,0.4)",
                  fontStyle: "italic",
                }}
              >
                Đang tải tệp bằng chứng...
              </div>
            ) : evidences.length === 0 ? (
              <div
                style={{
                  padding: "24px",
                  textAlign: "center",
                  color: "rgba(0,33,71,0.4)",
                  fontStyle: "italic",
                }}
              >
                Chưa có tệp minh chứng nào được tải lên cho lớp này.
              </div>
            ) : (
              evidences.map((ev) => (
                <div
                  key={ev.evidenceFileId}
                  className="table-row"
                  style={{
                    display: "grid",
                    gridTemplateColumns: "50px 1fr 140px 100px 100px",
                    alignItems: "center",
                    gap: "12px",
                    padding: "14px 20px",
                  }}
                >
                  <span
                    style={{
                      fontSize: "13px",
                      fontWeight: "700",
                      color: "rgba(0,33,71,0.4)",
                      textAlign: "center",
                    }}
                  >
                    {ev.stt}
                  </span>
                  <div>
                    <a
                      href={`${import.meta.env.VITE_API_URL || "https://localhost:7169/api"}/Evidences/${ev.evidenceFileId}/download`}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        fontSize: "13px",
                        fontWeight: "700",
                        color: "#002147",
                        textDecoration: "none",
                      }}
                      className="hover:underline"
                    >
                      {ev.name}
                    </a>
                    <p
                      style={{
                        fontSize: "10px",
                        color: "rgba(0,33,71,0.4)",
                        margin: "2px 0 0",
                      }}
                    >
                      {ev.size}
                    </p>
                  </div>
                  <span
                    style={{
                      fontSize: "10px",
                      fontWeight: "700",
                      color:
                        ev.type === "ATTENDANCE SHEET" ? "#16a34a" : "#c5a059",
                      padding: "4px 10px",
                      borderRadius: "999px",
                      backgroundColor:
                        ev.type === "ATTENDANCE SHEET"
                          ? "rgba(34,197,94,0.08)"
                          : "rgba(197,160,89,0.08)",
                      display: "inline-block",
                    }}
                  >
                    {ev.type}
                  </span>
                  <span
                    style={{ fontSize: "12px", color: "rgba(0,33,71,0.6)" }}
                  >
                    {ev.date}
                  </span>
                  <div style={{ textAlign: "right", paddingRight: "12px" }}>
                    <button
                      onClick={() => handleDeleteEvidence(ev.evidenceFileId)}
                      style={{
                        padding: "4px 10px",
                        borderRadius: "6px",
                        fontSize: "11px",
                        fontWeight: "700",
                        border: "none",
                        backgroundColor: "rgba(239, 68, 68, 0.08)",
                        color: "#ef4444",
                        cursor: "pointer",
                      }}
                    >
                      Xóa bỏ
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>

        {/* Right pane: Upload File Dropzone */}
        <div className="dashboard-panel">
          <div className="panel-header">
            <h2>Tải lên minh chứng mới</h2>
          </div>

          {/* Evidence Type Selector */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "8px",
              marginBottom: "8px",
            }}
          >
            <label
              style={{
                fontSize: "11px",
                fontWeight: "700",
                color: "rgba(0,33,71,0.5)",
                textTransform: "uppercase",
                letterSpacing: "0.05em",
              }}
            >
              Loại bằng chứng:
            </label>
            <select
              value={selectedEvidenceTypeId}
              onChange={(e) => setSelectedEvidenceTypeId(e.target.value)}
              style={{
                padding: "10px 14px",
                borderRadius: "10px",
                border: "1px solid #d9e1ec",
                fontSize: "13px",
                fontWeight: "600",
                color: "#002147",
                outline: "none",
                cursor: "pointer",
                width: "100%",
                backgroundColor: "#ffffff",
              }}
            >
              {evidenceTypes.length === 0 ? (
                <option value="">Đang tải loại bằng chứng...</option>
              ) : (
                evidenceTypes.map((et) => (
                  <option key={et.evidenceTypeId} value={et.evidenceTypeId}>
                    {et.typeName || `Loại ${et.evidenceTypeId}`}
                  </option>
                ))
              )}
            </select>
          </div>

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "16px",
              marginTop: "4px",
            }}
          >
            <div
              className={`evidence-dropzone${dragging ? " dragging" : ""}`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              <div className="dropzone-icon">
                <svg
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                >
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12"></path>
                </svg>
              </div>
              <span className="dropzone-title">
                Kéo thả tệp minh chứng vào đây
              </span>
              <span className="dropzone-subtitle">
                Hỗ trợ PDF, PNG, JPG, DOCX (Tối đa 10MB)
              </span>

              <input
                type="file"
                id="file-upload-input"
                style={{ display: "none" }}
                onChange={(e) => {
                  if (e.target.files && e.target.files.length > 0) {
                    handleUploadFile(e.target.files[0]);
                  }
                }}
              />
              <button
                type="button"
                onClick={() =>
                  document.getElementById("file-upload-input").click()
                }
                style={{
                  marginTop: "8px",
                  padding: "8px 20px",
                  borderRadius: "999px",
                  fontSize: "11px",
                  fontWeight: "700",
                  border: "none",
                  backgroundColor: "#002147",
                  cursor: "pointer",
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                  color: "white",
                }}
              >
                Chọn tệp từ máy
              </button>
            </div>
            {uploading && (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "8px",
                  padding: "10px",
                  backgroundColor: "rgba(197, 160, 89, 0.06)",
                  borderRadius: "10px",
                  border: "1px solid rgba(197, 160, 89, 0.15)",
                }}
              >
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#c5a059"
                  strokeWidth="2.5"
                  style={{ animation: "spin 1s linear infinite" }}
                >
                  <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
                </svg>
                <p
                  style={{
                    fontSize: "12px",
                    color: "#c5a059",
                    fontWeight: "700",
                    margin: 0,
                  }}
                >
                  Đang tải tệp lên máy chủ: {uploadingFileName}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default InstructorEvidence;
