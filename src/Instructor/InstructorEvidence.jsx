import { useState, useEffect, useMemo } from "react";
import { api } from "../utils/api";
import ConfirmModal from "../components/ConfirmModal";
import { useToast } from "../components/Toast";
import { useLanguage } from '../context/LanguageContext';
import { usePagination } from "../utils/usePagination";
import Pagination from "../components/Pagination";
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
  const { tr } = useLanguage();
  const toast = useToast();
  const [classesData, setClassesData] = useState([]);
  const [selectedClassId, setSelectedClassId] = useState("");
  // Học viên của lớp đã chọn (enrollmentId, accountId, fullName) + học viên đang chọn để upload
  const [classStudents, setClassStudents] = useState([]);
  const [selectedStudentId, setSelectedStudentId] = useState("");
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
            name: cls.className || tr("Lớp đào tạo"),
            subName: course ? course.courseName : tr("Chuyên đề huấn luyện"),
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

  // Load học viên của lớp đã chọn (enrollments + tên từ UserProfiles) để chọn người upload
  const loadClassStudents = async (classId) => {
    if (!classId) {
      setClassStudents([]);
      setSelectedStudentId("");
      return;
    }
    try {
      const [classEnrollments, profiles] = await Promise.all([
        api.get("/enrollments").catch(() => []),
        api.get("/UserProfiles/learners").catch(() => []),
      ]);
      const enrollmentsArr = Array.isArray(classEnrollments) ? classEnrollments : [];
      const profilesArr = Array.isArray(profiles) ? profiles : [];
      const students = enrollmentsArr
        .filter((e) => e.classId === parseInt(classId))
        .map((e) => {
          const profile = profilesArr.find((p) => p.accountId === e.accountId);
          return {
            enrollmentId: e.enrollmentId,
            accountId: e.accountId,
            fullName: profile?.fullName || `Student #${e.accountId}`,
          };
        });
      setClassStudents(students);
      // Giữ lựa chọn cũ nếu vẫn còn trong lớp; ngược lại chọn học viên đầu tiên
      setSelectedStudentId((prev) =>
        students.some((s) => String(s.enrollmentId) === prev)
          ? prev
          : students.length > 0
            ? String(students[0].enrollmentId)
            : ""
      );
    } catch (err) {
      console.error("Lỗi khi tải danh sách học viên:", err);
      setClassStudents([]);
      setSelectedStudentId("");
    }
  };

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
      const [classEnrollments, profiles] = await Promise.all([
        api.get("/enrollments").catch(() => []),
        api.get("/UserProfiles/learners").catch(() => []),
      ]);
      const enrollmentsArr = Array.isArray(classEnrollments) ? classEnrollments : [];
      const profilesArr = Array.isArray(profiles) ? profiles : [];
      const classEnrollmentIds = enrollmentsArr
        .filter((e) => e.classId === parseInt(selectedClassId))
        .map((e) => e.enrollmentId);

      // ETR API returns enrollmentId (not accountId), so match by enrollmentId
      const classEtrs = allEtrs.filter((e) =>
        classEnrollmentIds.includes(e.enrollmentId),
      );
      const subjectResultIds = [];
      // Map subjectResultId → tên học viên (hiển thị trên từng dòng evidence)
      const learnerBySr = {};
      // Map subjectResultId → accountId học viên (lọc evidence theo học viên đang chọn)
      const accountBySr = {};

      await Promise.all(
        classEtrs.map(async (etr) => {
          const etrDetails = await api
            .get(`/etr/${etr.etrCourseRecordId}`)
            .catch(() => null);
          if (etrDetails && etrDetails.subjectResults) {
            const enrollment = enrollmentsArr.find(
              (e) => e.enrollmentId === etr.enrollmentId,
            );
            const profile = enrollment
              ? profilesArr.find((p) => p.accountId === enrollment.accountId)
              : null;
            const learnerName =
              profile?.fullName || `Student #${enrollment?.accountId || ""}`;
            // Lớp KHÔNG có subjectId (backend Class/Classes không trả field này) → không thể
            // match theo sr.subjectId === 1 (không bao giờ khớp với ETR thật, gây hiển thị
            // nhầm evidence của ETR khác). Gom TẤT CẢ subject result của ETR các học viên
            // trong lớp để danh sách hiển thị đúng minh chứng của lớp này.
            etrDetails.subjectResults.forEach((sr) => {
              subjectResultIds.push(sr.subjectResultId);
              learnerBySr[sr.subjectResultId] = learnerName;
              accountBySr[sr.subjectResultId] = enrollment?.accountId;
            });
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
          name: ev.fileName || tr("Bằng chứng đào tạo"),
          type: typeName,
          date:
            ev.uploadedAt || ev.createdAt
              ? new Date(ev.uploadedAt || ev.createdAt).toLocaleDateString()
              : "N/A",
          size: fileSizeInMB,
          status:
            ev.verificationStatus === "Verified"
              ? "Verified"
              : ev.verificationStatus === "Rejected"
                ? "Rejected"
                : "Pending",
          fileUrl: ev.filePath || ev.fileUrl,
          learner: learnerBySr[ev.subjectResultId] || "",
          // accountId học viên sở hữu evidence — dùng để lọc theo học viên đang chọn
          accountId: accountBySr[ev.subjectResultId] ?? ev.accountId ?? null,
          // Lý do từ chối của QA (VerificationComment) — hiển thị để giảng viên biết cách tải lại
          comment: ev.verificationComment || "",
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
    loadClassStudents(selectedClassId);
  }, [selectedClassId, classesData, evidenceTypes]);

  // Handle file select and call upload API
  const handleUploadFile = async (file) => {
    if (!file) return;

    // Validate evidence type is selected
    if (!selectedEvidenceTypeId) {
      toast.warning(tr("Thiếu loại bằng chứng"));
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
      // Upload cho đúng học viên đã chọn trong dropdown (không phải học viên đầu tiên của lớp).
      // Nếu không có học viên hợp lệ thì chặn — KHÔNG fallback sang accountId của giảng viên
      // (điều đó sẽ tái phạm bug "Student #<giảng viên>" trên trang QA).
      const classEnrollment = classEnrollments.find(
        (e) => e.enrollmentId === parseInt(selectedStudentId),
      ) || classEnrollments.find((e) => e.classId === parseInt(selectedClassId));
      if (!classEnrollment) {
        throw new Error(
          tr("Lớp chưa có học viên nào để gắn minh chứng. Vui lòng kiểm tra danh sách học viên của lớp."),
        );
      }

      // ⚠️ KHÔNG match theo sr.subjectId === currentClass.subjectId: backend Class/Classes
      // KHÔNG trả field subjectId (TrainingClassResponse không có) nên subjectId luôn fallback
      // về 1, không khớp subject result nào của ETR mới → trước đây evidence bị gắn nhầm vào
      // SubjectResultId = 1 thuộc ETR seed Completed/Locked → QA thấy "ETR Locked" và không
      // Verify/Reject được. Lấy subject result ĐẦU TIÊN của ETR của học viên (giống
      // Academic/EtrManagement.jsx) — ETR đúng của lần ghi danh mới luôn InProgress/unlocked.
      let subjectResultId = 0;
      if (classEnrollment) {
        // ETR API returns enrollmentId (not accountId), so match by enrollmentId
        const studentEtr = allEtrs.find(
          (e) => e.enrollmentId === classEnrollment.enrollmentId,
        );
        if (studentEtr) {
          const etrDetails = await api
            .get(`/etr/${studentEtr.etrCourseRecordId}`)
            .catch(() => null);
          subjectResultId = etrDetails?.subjectResults?.[0]?.subjectResultId || 0;
        }
      }
      if (!subjectResultId) {
        throw new Error(
          tr("Không tìm thấy môn học (SubjectResult) trong ETR của học viên để gắn minh chứng. Vui lòng kiểm tra ghi danh/ETR của học viên."),
        );
      }

      const evidenceTypeIdInt = parseInt(selectedEvidenceTypeId);
      // Learner accountId — chỉ dùng khi tìm được enrollment hợp lệ (đã kiểm tra ở trên)
      const learnerAccountId = classEnrollment.accountId;
      const accountIdInt = parseInt(learnerAccountId);
      const subjectResultIdInt = parseInt(subjectResultId);

      console.log("[Upload Evidence] ====== DEBUG UPLOAD ======");
      console.log("[Upload Evidence] EvidenceTypeId:", {
        raw: selectedEvidenceTypeId,
        parsedInt: evidenceTypeIdInt,
        type: typeof selectedEvidenceTypeId,
      });
      console.log("[Upload Evidence] AccountId (learner, from enrollment):", classEnrollment?.accountId);
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
      // AccountId phải là tài khoản HỌC VIÊN (không phải giảng viên đang đăng nhập) —
      // lấy từ enrollment của học viên đã chọn, khớp với SubjectResultId ở trên.
      // Trước đây gửi nhầm accountId của giảng viên → QA hiển thị "Student #<giảng viên>".
      formData.append("AccountId", String(learnerAccountId));
      formData.append("SubjectResultId", String(subjectResultIdInt));
      formData.append("File", file, file.name);

      await api.postFormData("/Evidences/upload", formData);
      toast.success(tr("Tải lên thành công"));
      loadEvidences();
    } catch (err) {
      console.error("[Upload Evidence] Lỗi khi upload minh chứng:", err);

      toast.error(tr("Tải lên thất bại"));
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

  // Xóa minh chứng qua ConfirmModal (thay window.confirm)
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);

  const handleConfirmDeleteEvidence = async () => {
    if (!confirmDeleteId) return;
    try {
      await api.delete(`/Evidences/${confirmDeleteId}`);
      toast.success(tr("Xóa thành công"));
      loadEvidences();
    } catch (err) {
      console.error("Lỗi khi xóa minh chứng:", err);
      toast.error(tr("Xóa thất bại"));
    } finally {
      setConfirmDeleteId(null);
    }
  };

  // Tải xuống có xác thực (endpoint /Evidences/{id}/download yêu cầu Bearer token)
  const handleDownloadEvidence = async (id, name) => {
    try {
      const blob = await api.downloadFile(`/Evidences/${id}/download`, { suppressAuthRedirect: true });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = name || `evidence-${id}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Lỗi tải xuống minh chứng:", err);
      toast.error(tr("Tải xuống thất bại"));
    }
  };

  const selectedClass = useMemo(() => {
    return classesData.find((c) => c.classId === parseInt(selectedClassId));
  }, [classesData, selectedClassId]);

  // Học viên đang chọn trong dropdown (bên phải) — evidence hiển thị bên trái chỉ của học viên này
  const selectedStudent = useMemo(() => {
    return classStudents.find(
      (s) => String(s.enrollmentId) === String(selectedStudentId),
    );
  }, [classStudents, selectedStudentId]);

  // Lọc evidence theo học viên đã chọn (so khớp theo accountId học viên sở hữu evidence).
  // Chưa chọn học viên → hiện toàn bộ evidence của lớp (hành vi cũ).
  const visibleEvidences = useMemo(() => {
    if (!selectedStudent) return evidences;
    return evidences.filter(
      (ev) => String(ev.accountId) === String(selectedStudent.accountId),
    );
  }, [evidences, selectedStudent]);

  const evidencePager = usePagination(visibleEvidences, {
    pageSize: 10,
    resetKey: selectedStudentId,
  });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
      <section className="content-header">
        <div className="header-left">
          <h1>{tr('Hồ sơ minh chứng đào tạo')}</h1>
          <div className="divider-gold" />
          <p className="header-description">
            {tr('Tải lên và lưu trữ các tệp bằng chứng thực hành/điểm danh để phục vụ QA và báo cáo.')}
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
          {tr('Chọn lớp:')}
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
              {tr('Các minh chứng đã tải lên')}
            </h3>
            <p
              style={{
                fontSize: "11px",
                color: "rgba(0,33,71,0.5)",
                margin: "4px 0 0",
              }}
            >
              {selectedStudent
                ? `${tr('Minh chứng của học viên:')} ${selectedStudent.fullName} (${visibleEvidences.length} ${tr('tệp')})`
                : `${visibleEvidences.length} ${tr('tệp tài liệu lưu trữ')}`}
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
            <div style={{ textAlign: "center" }}>{tr('STT')}</div>
            <div>{tr('Tên tệp bằng chứng')}</div>
            <div>{tr('Loại bằng chứng')}</div>
            <div>{tr('Ngày tải lên')}</div>
            <div style={{ textAlign: "right", paddingRight: "24px" }}>
              {tr('Thao tác')}
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
                {tr('Đang tải tệp bằng chứng...')}
              </div>
            ) : visibleEvidences.length === 0 ? (
              <div
                style={{
                  padding: "24px",
                  textAlign: "center",
                  color: "rgba(0,33,71,0.4)",
                  fontStyle: "italic",
                }}
              >
                {selectedStudent
                  ? tr('Chưa có tệp minh chứng nào cho học viên này.') +
                    ' ' +
                    tr('Chọn học viên khác hoặc tải lên minh chứng mới ở khung bên phải.')
                  : tr('Chưa có tệp minh chứng nào được tải lên cho lớp này.')}
              </div>
            ) : (
              evidencePager.pageItems.map((ev) => (
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
                      href="#"
                      onClick={(e) => {
                        e.preventDefault();
                        handleDownloadEvidence(ev.evidenceFileId, ev.name);
                      }}
                      style={{
                        fontSize: "13px",
                        fontWeight: "700",
                        color: "#002147",
                        textDecoration: "none",
                      }}
                      className="hover:underline"
                      title={tr('Tải xuống')}
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
                      {ev.learner && (
                        <span style={{ fontWeight: "700", color: "#002147" }}>
                          {ev.learner}
                        </span>
                      )}
                      {ev.learner ? " · " : ""}
                      {ev.size} ·{" "}
                      <span
                        style={{
                          fontWeight: "700",
                          color:
                            ev.status === "Verified"
                              ? "#16a34a"
                              : ev.status === "Rejected"
                                ? "#ef4444"
                                : "#d97706",
                        }}
                      >
                        {ev.status}
                      </span>
                    </p>

                    {/* Lý do từ chối của QA — giảng viên tải lại và gửi lại cho QA duyệt */}
                    {ev.status === "Rejected" && (
                      <div
                        style={{
                          marginTop: "6px",
                          padding: "6px 8px",
                          borderRadius: "6px",
                          background: "rgba(239,68,68,0.06)",
                          border: "1px solid rgba(239,68,68,0.15)",
                        }}
                      >
                        <p
                          style={{
                            margin: 0,
                            fontSize: "10px",
                            fontWeight: "700",
                            color: "#dc2626",
                          }}
                        >
                          {tr('Lý do từ chối')}:{" "}
                          {ev.comment || tr('Chưa có lý do chi tiết.')}
                        </p>
                        <p
                          style={{
                            margin: "2px 0 0",
                            fontSize: "10px",
                            color: "rgba(0,33,71,0.55)",
                          }}
                        >
                          {tr('Tải lại minh chứng ở khung bên phải để gửi lại cho QA duyệt.')}
                        </p>
                      </div>
                    )}
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
                    {/* Đã được QA verify → KHÔNG được xóa nữa (immutable). */}
                    {ev.status === "Verified" ? (
                      <span
                        title={tr("Minh chứng đã được QA xác thực, không thể xóa.")}
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "4px",
                          padding: "4px 10px",
                          borderRadius: "6px",
                          fontSize: "11px",
                          fontWeight: "700",
                          backgroundColor: "rgba(34, 197, 94, 0.1)",
                          color: "#16a34a",
                          cursor: "not-allowed",
                        }}
                      >
                        <svg
                          width="11"
                          height="11"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2.5"
                        >
                          <rect x="3" y="11" width="18" height="11" rx="2" />
                          <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                        </svg>
                        {tr('Đã xác thực')}
                      </span>
                    ) : (
                      <button
                        onClick={() => setConfirmDeleteId(ev.evidenceFileId)}
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
                        {tr('Xóa bỏ')}
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="table-footer">
            <Pagination
              page={evidencePager.page}
              pageCount={evidencePager.pageCount}
              onChange={evidencePager.setPage}
              total={evidencePager.total}
              pageSize={10}
            />
          </div>
        </section>

        {/* Right pane: Upload File Dropzone */}
        <div className="dashboard-panel">
          <div className="panel-header">
            <h2>{tr('Tải lên minh chứng mới')}</h2>
          </div>

          {/* Học viên cần upload (evidence gắn theo từng học viên) */}
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
              {tr('Học viên:')}
            </label>
            <select
              value={selectedStudentId}
              onChange={(e) => setSelectedStudentId(e.target.value)}
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
              {classStudents.length === 0 ? (
                <option value="">{tr('Không có học viên trong lớp')}</option>
              ) : (
                classStudents.map((s) => (
                  <option key={s.enrollmentId} value={s.enrollmentId}>
                    {s.fullName}
                  </option>
                ))
              )}
            </select>
            <p
              style={{
                margin: 0,
                fontSize: "10px",
                color: "rgba(0,33,71,0.45)",
              }}
            >
              {tr('Minh chứng tải lên sẽ được gắn cho học viên này.')}
            </p>
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
              {tr('Loại bằng chứng:')}
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
                <option value="">{tr('Đang tải loại bằng chứng...')}</option>
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
                {tr('Kéo thả tệp minh chứng vào đây')}
              </span>
              <span className="dropzone-subtitle">
                {tr('Hỗ trợ PDF, PNG, JPG, DOCX (Tối đa 10MB)')}
              </span>
              <span
                className="dropzone-subtitle"
                style={{ color: "rgba(197,160,89,0.9)" }}
              >
                {tr('Minh chứng mới sẽ chuyển về trạng thái Pending để QA duyệt lại.')}
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
                {tr('Chọn tệp từ máy')}
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
                  {tr('Đang tải tệp lên máy chủ: ')}{uploadingFileName}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Xác nhận xóa minh chứng */}
      <ConfirmModal
        isOpen={!!confirmDeleteId}
        onClose={() => setConfirmDeleteId(null)}
        onConfirm={handleConfirmDeleteEvidence}
        title={tr("Xóa minh chứng")}
        message={tr("Bạn có chắc chắn muốn xóa tệp minh chứng này?")}
        confirmText="XÓA"
        cancelText="HỦY BỎ"
        confirmVariant="danger"
        bodyMessage={tr("Minh chứng sẽ được xóa mềm (soft delete) và không thể khôi phục trong giao diện này.")}
      />

      {/* Toast notifications */}
      <toast.ToastContainer />
    </div>
  );
};

export default InstructorEvidence;
