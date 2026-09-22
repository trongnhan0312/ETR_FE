import { useState, useEffect, useMemo } from "react";
import { api } from "../utils/api";
import { announce } from "../utils/crudNotify";
import { uploadToCloudinary, validateEvidenceFile } from "../utils/cloudinary";
import ConfirmModal from "../components/ConfirmModal";
import { useToast } from "../components/Toast";
import { useLanguage } from '../context/LanguageContext';
import { usePagination } from "../utils/usePagination";
import Pagination from "../components/Pagination";

const InstructorEvidence = () => {
  const { tr } = useLanguage();
  const toast = useToast();
  const [classesData, setClassesData] = useState([]);
  const [selectedClassId, setSelectedClassId] = useState("");
  // Học viên của lớp đã chọn (enrollmentId, accountId, fullName) + học viên đang chọn để upload
  const [classStudents, setClassStudents] = useState([]);
  const [selectedStudentId, setSelectedStudentId] = useState("");
  const [subjectsList, setSubjectsList] = useState([]);
  const [studentSubjects, setStudentSubjects] = useState([]);
  const [selectedSubjectResultId, setSelectedSubjectResultId] = useState("");
  const [selectedSubjectFilter, setSelectedSubjectFilter] = useState("");
  const [evidences, setEvidences] = useState([]);
  const [evidenceTypes, setEvidenceTypes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadingFileName, setUploadingFileName] = useState("");
  const [selectedEvidenceTypeId, setSelectedEvidenceTypeId] = useState("");

  // File drag & drop hover state
  const [dragging, setDragging] = useState(false);

  // Load classes, evidence types, and subjects
  useEffect(() => {
    const loadInitData = async () => {
      setLoading(true);
      try {
        const [apiClasses, apiCourses, apiEvidenceTypes, apiSubjects] = await Promise.all([
          api.get("/classes").catch(() => []),
          api.get("/courses").catch(() => []),
          api.get("/EvidenceTypes").catch(() => []),
          api.get("/subjects").catch(() => []),
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
        setSubjectsList(Array.isArray(apiSubjects) ? apiSubjects : []);
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

  // Load môn học của học viên đang chọn (dựa trên ETR của học viên)
  useEffect(() => {
    const loadStudentSubjects = async () => {
      if (!selectedStudentId) {
        setStudentSubjects([]);
        setSelectedSubjectResultId("");
        return;
      }
      try {
        const allEtrs = await api.get("/etr").catch(() => []);
        const studentEtr = (Array.isArray(allEtrs) ? allEtrs : []).find(
          (e) => String(e.enrollmentId) === String(selectedStudentId),
        );
        if (!studentEtr) {
          setStudentSubjects([]);
          setSelectedSubjectResultId("");
          return;
        }

        const etrDetails = await api
          .get(`/etr/${studentEtr.etrCourseRecordId}`)
          .catch(() => null);

        if (etrDetails && Array.isArray(etrDetails.subjectResults)) {
          const mapped = etrDetails.subjectResults.map((sr) => {
            const matchedSubject = subjectsList.find(
              (s) => s.subjectId === sr.subjectId,
            );
            return {
              subjectResultId: sr.subjectResultId,
              subjectId: sr.subjectId,
              subjectCode: matchedSubject?.subjectCode || `SUB-${sr.subjectId}`,
              subjectName: matchedSubject?.subjectName || `Môn học #${sr.subjectId}`,
              status: sr.status,
            };
          });
          setStudentSubjects(mapped);
          if (mapped.length > 0) {
            setSelectedSubjectResultId((prev) =>
              mapped.some((m) => String(m.subjectResultId) === String(prev))
                ? prev
                : String(mapped[0].subjectResultId),
            );
          } else {
            setSelectedSubjectResultId("");
          }
        } else {
          setStudentSubjects([]);
          setSelectedSubjectResultId("");
        }
      } catch (err) {
        console.error("Lỗi khi tải môn học của học viên:", err);
        setStudentSubjects([]);
        setSelectedSubjectResultId("");
      }
    };
    loadStudentSubjects();
  }, [selectedStudentId, subjectsList]);

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

      if (classEnrollmentIds.length === 0) {
        setEvidences([]);
        setLoading(false);
        return;
      }

      // ETR API returns enrollmentId (not accountId), so match by enrollmentId
      const classEtrs = allEtrs.filter((e) =>
        classEnrollmentIds.includes(e.enrollmentId),
      );
      const subjectResultIds = [];
      // Map subjectResultId → tên học viên (hiển thị trên từng dòng evidence)
      const learnerBySr = {};
      // Map subjectResultId → accountId học viên (lọc evidence theo học viên đang chọn)
      const accountBySr = {};
      // Map subjectResultId → thông tin môn học
      const subjectBySr = {};

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
            etrDetails.subjectResults.forEach((sr) => {
              subjectResultIds.push(sr.subjectResultId);
              learnerBySr[sr.subjectResultId] = learnerName;
              accountBySr[sr.subjectResultId] = enrollment?.accountId;
              const sub = subjectsList.find((s) => s.subjectId === sr.subjectId);
              subjectBySr[sr.subjectResultId] = {
                subjectId: sr.subjectId,
                subjectCode: sub?.subjectCode || `SUB-${sr.subjectId}`,
                subjectName: sub?.subjectName || `Môn học #${sr.subjectId}`,
              };
            });
          }
        }),
      );

      // If we have subjectResultIds, filter by them; otherwise show empty list
      const filteredEvidences =
        subjectResultIds.length > 0
          ? allEvidences.filter((ev) =>
              subjectResultIds.includes(ev.subjectResultId),
            )
          : [];

      const mappedEvidences = filteredEvidences.map((ev, idx) => {
        const typeName =
          evidenceTypes.find((t) => t.evidenceTypeId === ev.evidenceTypeId)
            ?.typeName || "PRACTICAL FORM";
        const fileSizeInMB = ev.fileSize
          ? `${(ev.fileSize / (1024 * 1024)).toFixed(2)} MB`
          : "1.2 MB";
        const subInfo = subjectBySr[ev.subjectResultId];
        return {
          evidenceFileId: ev.evidenceFileId || ev.id,
          stt: String(idx + 1).padStart(2, "0"),
          name: ev.fileName || tr("Bằng chứng đào tạo"),
          type: typeName,
          subjectCode: subInfo?.subjectCode || "",
          subjectName: subInfo?.subjectName || "",
          subjectId: subInfo?.subjectId || null,
          subjectResultId: ev.subjectResultId,
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
  }, [selectedClassId, classesData, evidenceTypes, subjectsList]);

  // Handle file select and call upload API
  const handleUploadFile = async (file) => {
    if (!file) return;

    // Chặn sớm định dạng không nằm trong whitelist (khớp BE + Cloudinary preset)
    const invalidReason = validateEvidenceFile(file);
    if (invalidReason) {
      toast.error(tr(invalidReason));
      return;
    }

    // Validate evidence type is selected
    if (!selectedEvidenceTypeId) {
      toast.warning(tr("Thiếu loại bằng chứng"));
      return;
    }

    setUploading(true);
    setUploadingFileName(file.name);
    try {
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

      let subjectResultId = selectedSubjectResultId ? parseInt(selectedSubjectResultId) : 0;
      if (!subjectResultId && classEnrollment) {
        // Fallback: ETR API returns enrollmentId (not accountId), so match by enrollmentId
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
          tr("Vui lòng chọn môn học cần gắn minh chứng."),
        );
      }

      const evidenceTypeIdInt = parseInt(selectedEvidenceTypeId);
      // Learner accountId — chỉ dùng khi tìm được enrollment hợp lệ (đã kiểm tra ở trên)
      const learnerAccountId = classEnrollment.accountId;
      const accountIdInt = parseInt(learnerAccountId);
      const subjectResultIdInt = parseInt(subjectResultId);

      // Mô hình Cloudinary (2026-08): FE upload thẳng file lên Cloudinary để lấy URL,
      // sau đó chỉ gửi JSON metadata về BE — BE không nhận byte file nào nữa.
      const cloudFile = await uploadToCloudinary(file);

      await api.post("/Evidences/upload", {
        evidenceTypeId: evidenceTypeIdInt,
        accountId: accountIdInt,
        subjectResultId: subjectResultIdInt,
        fileUrl: cloudFile.fileUrl,
        publicId: cloudFile.publicId,
        fileName: cloudFile.fileName,
        mimeType: cloudFile.mimeType,
        fileSize: cloudFile.fileSize,
      });
      toast.success(tr("Tải lên thành công"), announce("add", tr("Minh chứng")));
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
      toast.success(tr("Xóa thành công"), announce("delete", tr("Minh chứng")));
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

  // Học viên đang chọn trong dropdown (bên phải) — evidence hiển thị bên trái chỉ của học viên này
  const selectedStudent = useMemo(() => {
    return classStudents.find(
      (s) => String(s.enrollmentId) === String(selectedStudentId),
    );
  }, [classStudents, selectedStudentId]);

  // Danh sách các môn học có trong bằng chứng của lớp
  const classSubjectsForFilter = useMemo(() => {
    const map = new Map();
    evidences.forEach((ev) => {
      if (ev.subjectId && !map.has(ev.subjectId)) {
        map.set(ev.subjectId, {
          subjectId: ev.subjectId,
          subjectCode: ev.subjectCode,
          subjectName: ev.subjectName,
        });
      }
    });
    return Array.from(map.values());
  }, [evidences]);

  // Lọc evidence theo học viên và môn học đã chọn
  const visibleEvidences = useMemo(() => {
    let list = evidences;
    if (selectedStudent) {
      list = list.filter(
        (ev) => String(ev.accountId) === String(selectedStudent.accountId),
      );
    }
    if (selectedSubjectFilter) {
      list = list.filter(
        (ev) => String(ev.subjectId) === String(selectedSubjectFilter),
      );
    }
    return list;
  }, [evidences, selectedStudent, selectedSubjectFilter]);

  const evidencePager = usePagination(visibleEvidences, {
    pageSize: 10,
    resetKey: `${selectedStudentId}_${selectedSubjectFilter}`,
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
          flexWrap: "wrap",
          gap: "12px",
          padding: "14px 20px",
          background: "#ffffff",
          border: "1px solid #dfe6f1",
          borderRadius: "16px",
          boxShadow: "0 4px 12px rgba(0,33,71,0.04)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
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
            onChange={(e) => {
              setSelectedClassId(e.target.value);
              setSelectedSubjectFilter("");
            }}
          >
            {classesData.map((c) => (
              <option key={c.classId} value={c.classId}>
                {c.name} ({c.code})
              </option>
            ))}
          </select>
        </div>

        {classSubjectsForFilter.length > 0 && (
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginLeft: "12px" }}>
            <label
              style={{
                fontSize: "11px",
                fontWeight: "700",
                color: "rgba(0,33,71,0.5)",
                textTransform: "uppercase",
                letterSpacing: "0.05em",
              }}
            >
              {tr('Lọc môn:')}
            </label>
            <select
              style={{
                padding: "8px 12px",
                borderRadius: "8px",
                border: "1px solid #d9e1ec",
                fontSize: "12px",
                fontWeight: "600",
                color: "#002147",
                outline: "none",
                cursor: "pointer",
              }}
              value={selectedSubjectFilter}
              onChange={(e) => setSelectedSubjectFilter(e.target.value)}
            >
              <option value="">{tr('Tất cả môn học')}</option>
              {classSubjectsForFilter.map((sub) => (
                <option key={sub.subjectId} value={sub.subjectId}>
                  [{sub.subjectCode}] {sub.subjectName}
                </option>
              ))}
            </select>
          </div>
        )}
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
                      {ev.subjectCode && (
                        <span
                          style={{
                            display: "inline-block",
                            padding: "1px 6px",
                            borderRadius: "4px",
                            background: "#e0f2fe",
                            color: "#0369a1",
                            fontWeight: "700",
                            fontSize: "10px",
                            marginRight: "4px",
                          }}
                        >
                          [{ev.subjectCode}] {ev.subjectName}
                        </span>
                      )}
                      {ev.subjectCode ? " · " : ""}
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

          {/* Môn học cần gắn minh chứng */}
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
              {tr('Môn học:')}
            </label>
            <select
              value={selectedSubjectResultId}
              onChange={(e) => setSelectedSubjectResultId(e.target.value)}
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
              {studentSubjects.length === 0 ? (
                <option value="">{tr('Chưa có môn học trong ETR')}</option>
              ) : (
                studentSubjects.map((sub) => (
                  <option key={sub.subjectResultId} value={sub.subjectResultId}>
                    [{sub.subjectCode}] {sub.subjectName}
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
              {tr('Minh chứng sẽ được liên kết vào kết quả của môn học này.')}
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
                {tr('Hỗ trợ PDF, PNG, JPG, GIF, WEBP — lưu trữ trên Cloudinary')}
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
                accept=".jpg,.jpeg,.png,.gif,.webp,.pdf"
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
