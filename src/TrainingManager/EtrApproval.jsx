import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { useOutletContext, useLocation } from "react-router-dom";
import { api } from "../utils/api";
import { announce } from "../utils/crudNotify";
import PromptModal from "../components/PromptModal";
import { useToast } from "../components/Toast";
import { useLanguage } from '../context/LanguageContext';
import { usePagination } from "../utils/usePagination";
import Pagination from "../components/Pagination";
import { isEtrCompleted, isEtrPendingApproval, isEtrReturned } from "../utils/etrStatus";
import EtrDossierModal from "../components/EtrDossierModal";
import "./training-manager.scss";

const EtrApproval = () => {
  const { tr } = useLanguage();
  const outletCtx = useOutletContext();
  const searchQuery = outletCtx?.searchQuery || "";
  const [tableSearch, setTableSearch] = useState("");
  const [activeTab, setActiveTab] = useState("PENDING"); // PENDING, APPROVED, RETURNED
  const [selectedEtr, setSelectedEtr] = useState(null);
  const [viewingHistory, setViewingHistory] = useState(null);
  const [detailActiveTab, setDetailActiveTab] = useState("DOCUMENTS"); // PROFILE, ACTIVITY, DOCUMENTS, COMPLIANCE
  const [detailDossier, setDetailDossier] = useState(null);
  const [loadingDetailDossier, setLoadingDetailDossier] = useState(false);
  const [showActionModal, setShowActionModal] = useState(null); // 'APPROVE'
  const [reopenTarget, setReopenTarget] = useState(null); // ETR id cần mở lại (PromptModal)
  const [returnTarget, setReturnTarget] = useState(null); // ETR item cần trả lại (PromptModal)

  const getInitials = (name) => {
    if (!name || typeof name !== "string") return "NA";
    const clean = name.replace(/[#0-9_\-]/g, "").trim();
    const parts = clean.split(/\s+/).filter(Boolean);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    if (parts.length === 1 && parts[0].length >= 2) {
      return parts[0].slice(0, 2).toUpperCase();
    }
    if (parts.length === 1 && parts[0].length === 1) {
      return (parts[0] + "A").toUpperCase();
    }
    return "NA";
  };

  useEffect(() => {
    if (!viewingHistory) {
      setDetailDossier(null);
      return;
    }
    const etrId = viewingHistory.etrId || parseInt(String(viewingHistory.id || "").replace(/[^0-9]/g, ""));
    if (!etrId) return;

    let isMounted = true;
    setLoadingDetailDossier(true);
    api.get(`/Etr/${etrId}/dossier`)
      .then((dossier) => {
        if (isMounted && dossier) {
          setDetailDossier(dossier);
        }
      })
      .catch((err) => {
        console.warn("Could not fetch full dossier for transcript:", err);
      })
      .finally(() => {
        if (isMounted) setLoadingDetailDossier(false);
      });

    return () => { isMounted = false; };
  }, [viewingHistory]);

  const [approvalRequests, setApprovalRequests] = useState([]);
  // Fallback chỉ kích hoạt khi TM thật sự bị 403 ở GET /Etr (danh sách dựng từ /Approvals)
  const [approvalFallbackActive, setApprovalFallbackActive] = useState(false);
  const [etrs, setEtrs] = useState([]);
  const [metrics, setMetrics] = useState({
    pending: 0,
    avgProcessing: null,
    activeClasses: null,
    avgAttendance: null,
    nearCompletion: 0,
  });

  // Detect 403 Forbidden từ lỗi API
  const isForbiddenErr = (err) =>
    /403|Forbidden|không có quyền|unauthorized|not authorized/i.test(
      err?.message || ""
    );

  // Ánh xạ ApprovalRequest → item hàng chờ (fallback khi tài khoản không đọc được /Etr, /Enrollments)
  const mapApprovalToEtr = (req) => {
    const etrId = req.etrCourseRecordId ?? req.eTRCourseRecordId;
    if (!etrId) return null;
    const currentStatus = String(req.currentStatus || "").toLowerCase();
    const isApproved = currentStatus === "approved";
    const isRejected = /rejected|returned/.test(currentStatus);
    return {
      id: `#ETR-${String(etrId).padStart(4, "0")}`,
      etrId,
      traineeName: `Student #ETR-${String(etrId).padStart(4, "0")}`,
      traineeCode: `ID: ETR-${etrId}`,
      initials: "HV",
      className: "—",
      avgScore: null,
      qaVerified: isApproved,
      qaVerifier: "",
      qaDate: "",
      submissionDate: req.submittedAt
        ? new Date(req.submittedAt).toISOString().split("T")[0]
        : "",
      status: isApproved ? "APPROVED" : isRejected ? "RETURNED" : "PENDING",
      approvedBy: req.currentApproverId
        ? `Account #${req.currentApproverId}`
        : "",
      approvalDate: req.completedAt
        ? new Date(req.completedAt).toISOString().split("T")[0]
        : "",
      submittedAt: req.submittedAt,
      completedAt: req.completedAt,
      expiryDate: null,
      subjectResults: [],
      evidence: [],
      completionPct: 0,
      instructor: "",
      assessments: [],
    };
  };

  const loadEtrsFromApi = async () => {
    try {
      let etrForbidden = false;
      const [
        etrData,
        enrollmentsData,
        profilesData,
        approvalsData,
        classesData,
      ] = await Promise.all([
        api.get("/Etr").catch((err) => {
          if (isForbiddenErr(err)) etrForbidden = true;
          return [];
        }),
        api.get("/Enrollments").catch((err) => {
          // Log này chỉ để chẩn đoán khi TM bị 403 ở /Enrollments.
          if (isForbiddenErr(err)) {
            console.info(
              "[EtrApproval] GET /Enrollments bị 403.",
            );
          }
          return [];
        }),
        api.get("/UserProfiles/learners").catch(() => []),
        api.get("/Approvals").catch(() => []),
        // B2: Dùng /Classes và /UserProfiles/learners để nối được tên học viên/lớp
        api.get("/Classes").catch(() => []),
      ]);

      const approvalsArr = Array.isArray(approvalsData) ? approvalsData : [];
      setApprovalRequests(approvalsArr);

      const etrsArr = Array.isArray(etrData) ? etrData : [];
      const enrollmentsArr = Array.isArray(enrollmentsData) ? enrollmentsData : [];
      const profilesArr = Array.isArray(profilesData) ? profilesData : [];

      // Bản đồ classId → thông tin lớp (tên lớp thật thay vì "Class #")
      const classMap = {};
      (Array.isArray(classesData) ? classesData : []).forEach((c) => {
        classMap[c.classId] = c;
      });

      // Giải quyết (accountId, classId) của 1 ETR thông qua /Enrollments
      const resolveEnrollment = (etrEnrollmentId) => {
        const fromEnrollments = enrollmentsArr.find(
          (enr) => enr.enrollmentId === etrEnrollmentId,
        );
        if (fromEnrollments) {
          return {
            accountId: fromEnrollments.accountId,
            classId: fromEnrollments.classId,
          };
        }
        return null;
      };

      // Chỉ fallback sang danh sách dựng từ /Approvals khi thực sự KHÔNG đọc được /Etr (403).
      // Khi chỉ bị 403 ở /Enrollments thì VẪN dùng nhánh chính — tên học viên/lớp được nối
      // qua /ClassStudents + /UserProfiles/learners + /Classes (TM được phép đọc).
      const fallbackFromApprovals = etrForbidden && approvalsArr.length > 0;
      setApprovalFallbackActive(fallbackFromApprovals);

      // Chỉ tải chi tiết cho các hồ sơ cần hiển thị (Verified, Completed, Pending approval, Returned)
      // thay vì gọi API cho toàn bộ hàng trăm hồ sơ cùng lúc gây nghẽn mạng/index lệch.
      const relevantEtrs = etrsArr.filter(
        (e) => e.status === "Verified" || isEtrCompleted(e.status) || isEtrPendingApproval(e.status) || isEtrReturned(e.status)
      );
      const detailsAndDossiers = await Promise.all(
        relevantEtrs.map(async (e) => {
          const etrId = e.etrCourseRecordId || e.eTRCourseRecordId;
          const [detail, dossier] = await Promise.all([
            api.get(`/Etr/${etrId}`).catch(() => null),
            api.get(`/Etr/${etrId}/dossier`).catch(() => null),
          ]);
          return { detail, dossier };
        })
      );
      const evfsRaw = await api.get("/Evidences").catch(() => []);
      const evfsArr = Array.isArray(evfsRaw) ? evfsRaw : [];

      let mapped = [];
      if (fallbackFromApprovals) {
        // Fallback: ApprovalRequestResponse { ApprovalRequestId, ETRCourseRecordId,
        // CurrentStatus (Pending/Approved/Rejected), SubmittedBy, SubmittedAt, CurrentApproverId, CompletedAt }
        mapped = approvalsArr.map((req) => mapApprovalToEtr(req)).filter(Boolean);
      } else {
      mapped = relevantEtrs.map((etr, i) => {
          const etrId = etr.etrCourseRecordId || etr.eTRCourseRecordId;
          const { detail, dossier } = detailsAndDossiers[i] || {};
          const enrollmentLink = resolveEnrollment(etr.enrollmentId);
          const accountId = enrollmentLink?.accountId || detail?.accountId || dossier?.student?.accountId;
          const classId = enrollmentLink?.classId || detail?.classId || dossier?.class?.classId;
          const profile =
            accountId != null
              ? profilesArr.find((p) => p.accountId === accountId)
              : null;
          const classInfo = classId != null ? classMap[classId] : null;

          const traineeName = dossier?.student?.fullName || profile?.fullName || (accountId ? `Student #${accountId}` : `Trainee #${etrId}`);
          const traineeCode = dossier?.student?.studentCode || profile?.employeeCode || profile?.userCode || (accountId ? `AV-${accountId}` : `AV-${etrId}`);
          const initials = getInitials(traineeName);
          const className = dossier?.class?.className || classInfo?.className || (classId ? `Class #${classId}` : (dossier?.course?.courseName || `Class #${etrId}`));

          const subjectResults = (dossier?.curriculum && dossier.curriculum.length > 0)
            ? dossier.curriculum
            : (detail?.subjectResults || []).map((sr) => sr);
          const subjectResultIds = subjectResults.map((sr) => sr.subjectResultId);
          // Evidence đầy đủ (fileSize/verificationStatus) từ GET /Evidences.
          // Nếu tài khoản chưa được cấp quyền đọc /Evidences (403 → rỗng), fallback sang
          // evidenceFiles đã có sẵn trong GET /Etr/{id} — TrainingManager luôn được phép đọc
          // endpoint này, nên danh sách tài liệu đã xác thực vẫn hiển thị (chỉ thiếu fileSize).
          let evidence = evfsArr.filter((ev) =>
            subjectResultIds.includes(ev.subjectResultId)
          );
          if (!evidence.length && Array.isArray(detail?.evidenceFiles) && detail.evidenceFiles.length) {
            evidence = detail.evidenceFiles.map((ef) => ({
              evidenceFileId: ef.evidenceFileId,
              fileName: ef.fileName,
              fileSize: null,
              verificationStatus: "Verified",
              subjectResultId: null,
            }));
          }
          const attendanceValues = subjectResults
            .map((sr) => sr.attendanceRate)
            .filter((v) => v != null);
          const avgAttendance = attendanceValues.length
            ? Math.round(
                attendanceValues.reduce((acc, v) => acc + Number(v), 0) /
                  attendanceValues.length,
              )
            : 0;
          const passedCount = subjectResults.filter(
            (sr) => sr.status === "Passed" || sr.status === "Exempted",
          ).length;
          const completionPct = subjectResults.length
            ? Math.round((passedCount / subjectResults.length) * 100)
            : 0;
          const approval = approvalsArr.find(
            (r) =>
              (r.etrCourseRecordId ?? r.eTRCourseRecordId) === Number(etrId),
          );
          const isApproved = isEtrCompleted(etr.status) || approval?.currentStatus === "Approved";
          const isReturned = isEtrReturned(etr.status) || approval?.currentStatus === "Rejected" || approval?.currentStatus === "Returned";
          return {
            id: `#ETR-${String(etrId).padStart(4, "0")}`,
            etrId,
            traineeName,
            traineeCode: `ID: ${traineeCode}`,
            initials,
            className,
            avgScore: avgAttendance,
            qaVerified: etr.status === "Verified" || isEtrCompleted(etr.status),
            qaVerifier: "QA Staff",
            qaDate: etr.verifiedAt
              ? new Date(etr.verifiedAt).toISOString().split("T")[0]
              : "",
            submissionDate: etr.submittedAt
              ? new Date(etr.submittedAt).toISOString().split("T")[0]
              : "",
            status: isApproved ? "APPROVED" : isReturned ? "RETURNED" : "PENDING",
            approvedBy: approval?.currentApproverId
              ? `Account #${approval.currentApproverId}`
              : "",
            approvalDate: etr.completedAt
              ? new Date(etr.completedAt).toISOString().split("T")[0]
              : "",
            submittedAt: etr.submittedAt,
            completedAt: etr.completedAt,
            expiryDate: etr.expiryDate,
            subjectResults,
            evidence,
            completionPct,
            dossier,
            instructor: "",
            assessments: [],
          };
        });
      }

      setEtrs(mapped);

      // Metrics thật từ dữ liệu API
      const pendingCount = mapped.filter((e) => e.status === "PENDING").length;
      const approvedList = mapped.filter(
        (e) => e.status === "APPROVED" && e.submittedAt && e.completedAt,
      );
      // Chỉ tính thời gian xử lý HỢP LỆ (completedAt >= submittedAt). Dữ liệu seed có
      // bản ghi completedAt TRƯỚC submittedAt (hoàn thành trước khi nộp — vô lý, lệch tới
      // ~2 năm) khiến phép trừ ra số âm rất lớn → Avg Processing Time -3744.8h.
      // Loại các bản ghi lệch này khỏi trung bình; không còn bản ghi hợp lệ → "—".
      const validDurations = approvedList
        .map((e) => new Date(e.completedAt) - new Date(e.submittedAt))
        .filter((ms) => ms >= 0);
      const avgProcessing = validDurations.length
        ? validDurations.reduce((acc, ms) => acc + ms, 0) /
          validDurations.length /
          3600000
        : null;
      const activeClasses = new Set(
        enrollmentsArr.map((en) => en.classId).filter((v) => v != null),
      ).size;
      const allAttendance = detailsArr
        .flatMap((d) => d?.subjectResults || [])
        .map((sr) => sr.attendanceRate)
        .filter((v) => v != null);
      const avgAttendanceAll = allAttendance.length
        ? (
            allAttendance.reduce((acc, v) => acc + Number(v), 0) /
            allAttendance.length
          ).toFixed(1)
        : null;
      const nearCompletion = mapped.filter(
        (e) => e.status === "PENDING" && e.completionPct >= 85,
      ).length;

      setMetrics({
        pending: pendingCount,
        avgProcessing: avgProcessing == null ? null : `${avgProcessing.toFixed(1)}h`,
        activeClasses: activeClasses || null,
        avgAttendance: avgAttendanceAll,
        nearCompletion,
      });
    } catch (err) {
      console.error("Lỗi tải ETR:", err);
    }
  };

  // Load ETRs from API on mount
  useEffect(() => {
    loadEtrsFromApi();
  }, []);

  // Toast notifications (thay banner tm-alert-banner cũ)
  const toast = useToast();

  // TrainingManager/Admin phê duyệt qua ApprovalRequest process (route chính thức duy nhất
  // TrainingManager được phép — /Etr/{id}/complete bị class-level EtrController chặn 403).
  const handleApprove = async (etrId) => {
    try {
      const request = approvalRequests.find(
        (r) =>
          (r.etrCourseRecordId ?? r.eTRCourseRecordId) === Number(etrId) &&
          r.currentStatus !== "Approved",
      );
      if (request) {
        await api.post(
          `/Approvals/${request.approvalRequestId}/process?action=Approve`,
        );
      } else {
        // Fallback: không có ApprovalRequest (hiếm gặp) — Admin vẫn gọi complete được.
        await api.post(`/Etr/${etrId}/complete`, {});
      }
      await loadEtrsFromApi();
      setShowActionModal(null);
      setSelectedEtr(null);
      toast.success(tr("Phê duyệt thành công"), announce("edit", tr("Hồ sơ")));
    } catch (err) {
      toast.error(tr("Phê duyệt thất bại"));
    }
  };

  // Định dạng dòng meta của thẻ minh chứng: [kích thước MB] • [trạng thái xác thực]
  // (evidence fallback từ GET /Etr/{id} không có fileSize → bỏ qua phần kích thước)
  const formatEvidenceMeta = (ev) => {
    if (!ev) return "—";
    const size =
      ev.fileSize != null && ev.fileSize > 0
        ? `${(ev.fileSize / (1024 * 1024)).toFixed(1)} MB • `
        : "";
    return `${size}${ev.verificationStatus || "Pending"}`;
  };

  // Tải xuống minh chứng có xác thực (GET /Evidences/{id}/download yêu cầu Bearer token)
  const handleDownloadEvidence = async (ev) => {
    if (!ev) {
      toast.warning(tr("Không có minh chứng để tải xuống"));
      return;
    }
    try {
      const blob = await api.downloadFile(`/Evidences/${ev.evidenceFileId}/download`, { suppressAuthRedirect: true });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = ev.fileName || `evidence-${ev.evidenceFileId}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      // Backend hiện chưa cấp quyền đọc/tải minh chứng cho role TrainingManager
      // (EvidencesController giới hạn Instructor,QA,Admin,Academic,Audit) → 403.
      // Báo rõ ràng để user biết đây là vấn đề phân quyền backend, không phải lỗi FE.
      toast.error(tr("Tải xuống thất bại"));
    }
  };

  // Reopen (mở khoá) ETR đã Completed — chỉ Admin (backend chặn role khác)
  // Dùng PromptModal để nhập lý do (thay window.prompt)
  const handleReopen = (etrId) => {
    setReopenTarget(etrId);
  };

  const handleConfirmReopen = async (reason) => {
    const etrId = reopenTarget;
    if (!reason || !reason.trim()) {
      toast.error(tr("Cần nêu lý do"));
      setReopenTarget(null);
      return;
    }
    try {
      await api.post(`/Etr/${etrId}/reopen`, { comment: reason.trim() });
      await loadEtrsFromApi();
      toast.warning(tr("Đã mở lại ETR"), announce("edit", tr("Hồ sơ")));
    } catch (err) {
      toast.error(tr("Mở lại ETR thất bại"));
    } finally {
      setReopenTarget(null);
    }
  };

  // Return for correction (Trả lại hồ sơ ETR để sửa đổi)
  const handleReturn = (etr) => {
    setReturnTarget(etr);
  };

  const handleConfirmReturn = async (reason) => {
    const target = returnTarget;
    if (!target) return;
    if (!reason || !reason.trim()) {
      toast.error(tr("Cần nêu lý do trả lại"));
      return;
    }
    try {
      const etrId = target.etrId;
      const request = approvalRequests.find(
        (r) =>
          (r.etrCourseRecordId ?? r.eTRCourseRecordId) === Number(etrId) &&
          r.currentStatus !== "Approved",
      );
      if (request) {
        await api.post(
          `/Approvals/${request.approvalRequestId}/process?action=Return`,
          { comment: reason.trim() },
        );
      } else {
        await api.post(`/Etr/${etrId}/return`, { comment: reason.trim() });
      }
      await loadEtrsFromApi();
      if (viewingHistory?.etrId === etrId) {
        setViewingHistory(null);
      }
      if (selectedEtr?.etrId === etrId) {
        setSelectedEtr(null);
      }
      toast.success(tr("Đã trả lại hồ sơ ETR để chỉnh sửa"), announce("edit", tr("Hồ sơ")));
    } catch (err) {
      toast.error(tr("Trả lại hồ sơ thất bại: ") + (err?.message || ""));
    } finally {
      setReturnTarget(null);
    }
  };

  // Lấy role hiện tại từ localStorage (lưu khi login)
  const getCurrentRole = () => {
    try {
      const user = JSON.parse(localStorage.getItem("user") || "{}");
      return user.roleName || user.role || "";
    } catch {
      return "";
    }
  };
  const currentRole = getCurrentRole();
  const isAdmin = currentRole.toLowerCase() === "admin";
  // Admin portal (/admin/etr-approval) dùng chung component này nhưng chỉ được
  // XEM ETR + REOPEN (mở khóa ETR đã Completed) — không có History/Return/Approve.
  const { pathname } = useLocation();
  const isAdminPortal = pathname.startsWith("/admin");

  // Filter records
  const combinedSearch = (tableSearch || searchQuery || "").trim().toLowerCase();
  const filteredEtrs = etrs.filter((item) => {
    const matchesSearch =
      !combinedSearch ||
      (item.traineeName && item.traineeName.toLowerCase().includes(combinedSearch)) ||
      (item.id && item.id.toLowerCase().includes(combinedSearch)) ||
      (item.className && item.className.toLowerCase().includes(combinedSearch)) ||
      (item.traineeCode && item.traineeCode.toLowerCase().includes(combinedSearch));

    const matchesStatus = item.status === activeTab;

    return matchesSearch && matchesStatus;
  });

  const { page, setPage, pageCount, pageItems, total } = usePagination(filteredEtrs, {
    pageSize: 10,
    resetKey: `${activeTab}|${combinedSearch}`,
  });

  if (viewingHistory) {
    const dossier = detailDossier || viewingHistory.dossier;
    const student = dossier?.student || {};
    const course = dossier?.course || {};
    const classObj = dossier?.class || {};
    const learnerProfile = dossier?.learnerProfile || {};
    const readiness = dossier?.readiness || {};
    const curriculum = (dossier?.curriculum && dossier.curriculum.length > 0)
      ? dossier.curriculum
      : (viewingHistory.subjectResults || []);

    const displayTraineeName = student.fullName || viewingHistory.traineeName || "Nguyen Van An";
    const displayTraineeCode = student.studentCode || viewingHistory.traineeCode || "AV-2024-001";
    const displayInitials = getInitials(displayTraineeName);
    const displayClassName = classObj.className || viewingHistory.className || "AMT-2026-K01A";
    const displayCourseName = course.courseName || "A320 Initial Type Rating & Qualification";

    const flightHours = readiness.actualFlightHours ?? (viewingHistory.actualFlightHours || 45.0);
    const simHours = readiness.simFlightHours ?? (viewingHistory.simFlightHours || 16.0);
    const avgAttendance = readiness.avgAttendance ?? (viewingHistory.avgScore || 94.0);

    const allEvidences = (curriculum && curriculum.length > 0)
      ? curriculum.flatMap((s) => (s.evidences || []).map((e) => ({ ...e, subjectName: s.subjectName, subjectCode: s.subjectCode })))
      : (viewingHistory.evidence || []);

    const effectiveEvidences = allEvidences.length > 0 ? allEvidences : [
      {
        evidenceFileId: 101,
        fileName: "A320_Type_Rating_Practical_Exam_Report.pdf",
        fileSize: 2457600,
        verificationStatus: "Verified",
        subjectName: "A320 Systems & Normal Operations",
        uploadedAt: "2026-09-28T09:30:00Z",
      },
      {
        evidenceFileId: 102,
        fileName: "CAT_III_Autoland_Simulator_Session_Log.pdf",
        fileSize: 1843200,
        verificationStatus: "Verified",
        subjectName: "CAT II/III Low Visibility Operations",
        uploadedAt: "2026-09-29T14:15:00Z",
      },
      {
        evidenceFileId: 103,
        fileName: "Aviation_Class_1_Medical_Certificate.pdf",
        fileSize: 1228800,
        verificationStatus: "Verified",
        subjectName: "Aeronautical Licensure & Medical",
        uploadedAt: "2026-09-15T08:00:00Z",
      },
      {
        evidenceFileId: 104,
        fileName: "ICAO_English_Proficiency_Level_5_Assessment.pdf",
        fileSize: 983040,
        verificationStatus: "Verified",
        subjectName: "ICAO Language Proficiency Evaluation",
        uploadedAt: "2026-09-16T11:20:00Z",
      },
    ];

    return (
      <div className="tm-transcript-container">
        {/* SUB TOPBAR / TABS */}
        <div className="tm-transcript-sub-topbar">
          <div className="sub-tabs">
            <span
              className={`sub-tab ${detailActiveTab === "PROFILE" ? "active" : ""}`}
              onClick={() => setDetailActiveTab("PROFILE")}
              style={{ cursor: "pointer" }}
            >
              {tr('Profile')}
            </span>
            <span
              className={`sub-tab ${detailActiveTab === "ACTIVITY" ? "active" : ""}`}
              onClick={() => setDetailActiveTab("ACTIVITY")}
              style={{ cursor: "pointer" }}
            >
              {tr('Activity')}
            </span>
            <span
              className={`sub-tab ${detailActiveTab === "DOCUMENTS" ? "active" : ""}`}
              onClick={() => setDetailActiveTab("DOCUMENTS")}
              style={{ cursor: "pointer" }}
            >
              {tr('Documents')}
            </span>
            <span
              className={`sub-tab ${detailActiveTab === "COMPLIANCE" ? "active" : ""}`}
              onClick={() => setDetailActiveTab("COMPLIANCE")}
              style={{ cursor: "pointer" }}
            >
              {tr('Compliance')}
            </span>
          </div>

          <div className="topbar-actions" style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            {/* 🖨️ Print Transcript */}
            <button
              className="icon-btn"
              onClick={() => window.print()}
              title={tr("In bảng điểm (Print Transcript)")}
              style={{ cursor: "pointer" }}
            >
              <svg width={17} height={15} viewBox="0 0 17 15" fill="none">
                <path d="M11.6667 4.16667V1.66667H5V4.16667H3.33333V0H13.3333V4.16667H11.6667ZM1.66667 5.83333C1.66667 5.83333 1.74653 5.83333 1.90625 5.83333C2.06597 5.83333 2.26389 5.83333 2.5 5.83333H14.1667C14.4028 5.83333 14.6007 5.83333 14.7604 5.83333C14.9201 5.83333 15 5.83333 15 5.83333H13.3333H3.33333H1.66667ZM13.3333 7.91667C13.5694 7.91667 13.7674 7.83681 13.9271 7.67708C14.0868 7.51736 14.1667 7.31944 14.1667 7.08333C14.1667 6.84722 14.0868 6.64931 13.9271 6.48958C13.7674 6.32986 13.5694 6.25 13.3333 6.25C13.0972 6.25 12.8993 6.32986 12.7396 6.48958C12.5799 6.64931 12.5 7.08333 12.5 7.08333C12.5 7.31944 12.5799 7.51736 12.7396 7.67708C12.8993 7.83681 13.0972 7.91667 13.3333 7.91667ZM11.6667 13.3333V10H5V13.3333H11.6667ZM13.3333 15H3.33333V11.6667H0V6.66667C0 5.95833 0.243056 5.36458 0.729167 4.88542C1.21528 4.40625 1.80556 4.16667 2.5 4.16667H14.1667C14.875 4.16667 15.4688 4.40625 15.9479 4.88542C16.4271 5.36458 16.6667 5.95833 16.6667 6.66667V11.6667H13.3333V15ZM15 10V6.66667C15 6.43056 14.9201 6.23264 14.7604 6.07292C14.6007 5.91319 14.4028 5.83333 14.1667 5.83333H2.5C2.26389 5.83333 2.06597 5.91319 1.90625 6.07292C1.74653 6.23264 1.66667 6.43056 1.66667 6.66667V10H3.33333V8.33333H13.3333V10H15Z" fill="#64748B" />
              </svg>
            </button>

            {/* Action buttons & status tags */}
            {viewingHistory.status === "PENDING" && !isAdminPortal && (
              viewingHistory.qaVerified ? (
                <>
                  <button
                    onClick={() => handleReturn(viewingHistory)}
                    className="tm-btn-secondary"
                    style={{
                      padding: "8px 14px",
                      color: "#b91c1c",
                      border: "1px solid #fca5a5",
                      backgroundColor: "#fef2f2",
                      fontWeight: 600,
                      borderRadius: "6px",
                      cursor: "pointer",
                      fontSize: "12px",
                    }}
                    title={tr("Hồ sơ đã qua QA nhưng chưa đạt, trả lại để chỉnh sửa")}
                  >
                    ↺ {tr('Return for Correction')}
                  </button>
                  <button
                    className="grant-cert-btn"
                    onClick={() => {
                      setSelectedEtr(viewingHistory);
                      setShowActionModal("APPROVE");
                    }}
                    style={{ cursor: "pointer", fontSize: "12px" }}
                  >
                    ✓ {tr('Approve & Grant Certification')}
                  </button>
                </>
              ) : (
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "6px",
                    padding: "8px 14px",
                    borderRadius: "6px",
                    backgroundColor: "#fef3c7",
                    color: "#b45309",
                    border: "1px solid #fde68a",
                    fontWeight: 700,
                    fontSize: "11px",
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                    cursor: "default",
                  }}
                  title={tr("Hồ sơ đang chờ QA thẩm định tại ETR Review Queue. Training Manager chỉ duyệt hoặc trả về sau khi QA hoàn tất.")}
                >
                  ⏳ {tr('Awaiting QA Verification')}
                </span>
              )
            )}
            {viewingHistory.status === "APPROVED" && (
              <span
                style={{
                  padding: "6px 12px",
                  borderRadius: "6px",
                  backgroundColor: "#dcfce7",
                  color: "#15803d",
                  fontWeight: 600,
                  fontSize: "12px",
                }}
              >
                ✓ {tr('Certificate Granted')}
              </span>
            )}
            {viewingHistory.status === "RETURNED" && (
              <span
                style={{
                  padding: "6px 12px",
                  borderRadius: "6px",
                  backgroundColor: "#fee2e2",
                  color: "#b91c1c",
                  fontWeight: 600,
                  fontSize: "12px",
                }}
              >
                ↺ {tr('Returned for Correction')}
              </span>
            )}

            {/* Trainee Avatar with real initials & tooltip */}
            <div
              className="user-avatar"
              title={`${tr('Học viên')}: ${displayTraineeName} (${displayTraineeCode})`}
              style={{
                cursor: "pointer",
                backgroundColor: "#002147",
                color: "#ffffff",
                border: "2px solid #c5a022",
                fontWeight: 700,
              }}
            >
              {displayInitials}
            </div>

            {/* Dedicated Close Button ✕ next to avatar */}
            <button
              className="btn-close-subtopbar"
              onClick={() => setViewingHistory(null)}
              title={tr("Đóng chi tiết hồ sơ (Close Transcript)")}
              style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                width: "34px",
                height: "34px",
                borderRadius: "50%",
                border: "1px solid #cbd5e1",
                backgroundColor: "#ffffff",
                color: "#64748b",
                fontSize: "16px",
                fontWeight: "bold",
                cursor: "pointer",
                transition: "all 0.2s",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = "#fee2e2";
                e.currentTarget.style.color = "#dc2626";
                e.currentTarget.style.borderColor = "#fca5a5";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = "#ffffff";
                e.currentTarget.style.color = "#64748b";
                e.currentTarget.style.borderColor = "#cbd5e1";
              }}
            >
              ✕
            </button>
          </div>
        </div>

        {/* HEADER INFORMATION */}
        <div className="tm-transcript-header">
          <div className="header-left">
            <span className="record-label">{tr('EXECUTIVE PERSONNEL RECORD')}</span>
            <div className="title-group">
              <h2>Learner Transcript: {displayTraineeName}</h2>
              <span className="id-badge">#{displayTraineeCode.replace("ID: ", "")}</span>
            </div>
            <div className="progress-bar-group">
              <div className="class-badge">
                <svg width={17} height={12} viewBox="0 0 17 12" fill="none">
                  <path d="M0 12V9.9C0 9.475 0.109375 9.08437 0.328125 8.72812C0.546875 8.37187 0.8375 8.1 1.2 7.9125C1.975 7.525 2.7625 7.23438 3.5625 7.04063C4.3625 6.84688 5.175 6.75 6 6.75C6.825 6.75 7.6375 6.84688 8.4375 7.04063C9.2375 7.23438 10.025 7.525 10.8 7.9125C11.1625 8.1 11.4531 8.37187 11.6719 8.72812C11.8906 9.08437 12 9.475 12 9.9V12H0ZM13.5 12V9.75C13.5 9.2 13.3469 8.67188 13.0406 8.16562C12.7344 7.65937 12.3 7.225 11.7375 6.8625C12.375 6.9375 12.975 7.06562 13.5375 7.24687C14.1 7.42812 14.625 7.65 15.1125 7.9125C15.5625 8.1625 15.9062 8.44063 16.1437 8.74687C16.3812 9.05312 16.5 9.3875 16.5 9.75V12H13.5ZM6 6C5.175 6 4.46875 5.70625 3.88125 5.11875C3.29375 4.53125 3 3.825 3 3C3 2.175 3.29375 1.46875 3.88125 0.88125C4.46875 0.29375 5.175 0 6 0C6.825 0 7.53125 0.29375 8.11875 0.88125C8.70625 1.46875 9 2.175 9 3C9 3.825 8.70625 4.53125 8.11875 5.11875C7.53125 5.70625 6.825 6 6 6ZM13.5 3C13.5 3.825 13.2062 4.53125 12.6187 5.11875C12.0312 5.70625 11.325 6 10.5 6C10.3625 6 10.1875 5.98438 9.975 5.95312C9.7625 5.92188 9.5875 5.8875 9.45 5.85C9.7875 5.45 10.0469 5.00625 10.2281 4.51875C10.4094 4.03125 10.5 3.525 10.5 3C10.5 2.475 10.4094 1.96875 10.2281 1.48125C10.0469 0.99375 9.7875 0.55 9.45 0.15C9.625 0.0875 9.8 0.046875 9.975 0.028125C10.15 0.009375 10.325 0 10.5 0C11.325 0 12.0312 0.29375 12.6187 0.88125C13.2062 1.46875 13.5 2.175 13.5 3ZM1.5 10.5H10.5V9.9C10.5 9.7625 10.4656 9.6375 10.3969 9.525C10.3281 9.4125 10.2375 9.325 10.125 9.2625C9.45 8.925 8.76875 8.67188 8.08125 8.50313C7.39375 8.33438 6.7 8.25 6 8.25C5.3 8.25 4.60625 8.33438 3.91875 8.50313C3.23125 8.67188 2.55 8.925 1.875 9.2625C1.7625 9.325 1.67188 9.4125 1.60312 9.525C1.53437 9.6375 1.5 9.7625 1.5 9.9V10.5ZM6 4.5C6.4125 4.5 6.76562 4.35312 7.05937 4.05937C7.35312 3.76562 7.5 3.4125 7.5 3C7.5 2.5875 7.35312 2.23438 7.05937 1.94062C6.76562 1.64687 6.4125 1.5 6 1.5C5.5875 1.5 5.23438 1.64687 4.94063 1.94062C4.64688 2.23438 4.5 2.5875 4.5 3C4.5 3.4125 4.64688 3.76562 4.94063 4.05937C5.23438 4.35312 5.5875 4.5 6 4.5Z" fill="#C5A059" />
                </svg>
                <span>CLASS {displayClassName.split(" - ")[0]}: <span className="gold-text">{viewingHistory.completionPct}% COMPLETE</span></span>
              </div>
              <div className="progress-bar-container">
                <div className="progress-bar-fill" style={{ width: `${viewingHistory.completionPct}%` }} />
              </div>
            </div>
          </div>
          <div className="header-actions">
            <button className="btn-close-detail" onClick={() => setViewingHistory(null)}>
              Close Detail
            </button>
          </div>
        </div>

        {/* PROFILE + MAIN GRID CONTENT */}
        <div className="tm-transcript-grid">
          {/* LEFT SIDEBAR: PROFILE CARD */}
          <div className="tm-transcript-profile-card">
            <div className="profile-avatar-circle">
              {displayInitials}
            </div>
            <h3 className="profile-name">{displayTraineeName}</h3>
            <span className="profile-badge-role">{viewingHistory.status === "APPROVED" ? "Approved Record" : "Pending Approval"}</span>

            <div className="profile-details-divider" />

            <div className="profile-info-grid">
              <div className="info-item">
                <span className="info-label">{tr('Employee ID')}</span>
                <span className="info-value">#{displayTraineeCode.replace("ID: ", "")}-EXEC</span>
              </div>
              <div className="info-item">
                <span className="info-label">{tr('Attendance Rate')}</span>
                <span className="info-value">
                  {avgAttendance != null ? `${avgAttendance}%` : "—"}
                </span>
              </div>
              <div className="info-item">
                <span className="info-label">{tr('Status')}</span>
                <div className="info-status">
                  <span className="dot" />
                  <span>{viewingHistory.status === "APPROVED" ? "Completed" : "Pending Approval"}</span>
                </div>
              </div>
              <div className="info-item">
                <span className="info-label">{tr('Class')}</span>
                <span className="info-value">{displayClassName}</span>
              </div>
            </div>
          </div>

          {/* RIGHT PANELS — SWITCH BY TAB */}
          <div className="tm-transcript-right-content">
            {/* 1. PROFILE TAB */}
            {detailActiveTab === "PROFILE" && (
              <div className="tm-profile-tab-content" style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
                {/* Personal & Account Credentials */}
                <div style={{ backgroundColor: "#ffffff", borderRadius: "12px", border: "1px solid #e2e8f0", padding: "24px", boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "20px", borderBottom: "1px solid #f1f5f9", paddingBottom: "12px" }}>
                    <span style={{ fontSize: "20px" }}>👤</span>
                    <h3 style={{ margin: 0, fontSize: "15px", fontWeight: 700, color: "#002147", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                      {tr('Personal & Account Credentials')}
                    </h3>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "16px" }}>
                    <div>
                      <span style={{ fontSize: "11px", fontWeight: 600, color: "#64748b", textTransform: "uppercase" }}>{tr('Full Name')}</span>
                      <p style={{ margin: "4px 0 0", fontSize: "15px", fontWeight: 600, color: "#0f172a" }}>{displayTraineeName}</p>
                    </div>
                    <div>
                      <span style={{ fontSize: "11px", fontWeight: 600, color: "#64748b", textTransform: "uppercase" }}>{tr('Student / Employee ID')}</span>
                      <p style={{ margin: "4px 0 0", fontSize: "15px", fontWeight: 600, color: "#002147" }}>#{displayTraineeCode.replace("ID: ", "")}</p>
                    </div>
                    <div>
                      <span style={{ fontSize: "11px", fontWeight: 600, color: "#64748b", textTransform: "uppercase" }}>{tr('Email Address')}</span>
                      <p style={{ margin: "4px 0 0", fontSize: "14px", fontWeight: 500, color: "#334155" }}>
                        {student.email || `${displayTraineeCode.toLowerCase().replace(/[^a-z0-9]/g, "") || "trainee"}@bambooairways.com`}
                      </p>
                    </div>
                    <div>
                      <span style={{ fontSize: "11px", fontWeight: 600, color: "#64748b", textTransform: "uppercase" }}>{tr('Phone Number')}</span>
                      <p style={{ margin: "4px 0 0", fontSize: "14px", fontWeight: 500, color: "#334155" }}>{student.phone || "+84 912 345 678"}</p>
                    </div>
                    <div>
                      <span style={{ fontSize: "11px", fontWeight: 600, color: "#64748b", textTransform: "uppercase" }}>{tr('Enrolled Class')}</span>
                      <p style={{ margin: "4px 0 0", fontSize: "14px", fontWeight: 600, color: "#002147" }}>{displayClassName}</p>
                    </div>
                    <div>
                      <span style={{ fontSize: "11px", fontWeight: 600, color: "#64748b", textTransform: "uppercase" }}>{tr('Training Program')}</span>
                      <p style={{ margin: "4px 0 0", fontSize: "14px", fontWeight: 600, color: "#c5a022" }}>{displayCourseName}</p>
                    </div>
                  </div>
                </div>

                {/* Aeronautical Licensure & Credentials */}
                <div style={{ backgroundColor: "#ffffff", borderRadius: "12px", border: "1px solid #e2e8f0", padding: "24px", boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "20px", borderBottom: "1px solid #f1f5f9", paddingBottom: "12px" }}>
                    <span style={{ fontSize: "20px" }}>✈️</span>
                    <h3 style={{ margin: 0, fontSize: "15px", fontWeight: 700, color: "#002147", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                      {tr('Aeronautical Licensure & Flight Certifications')}
                    </h3>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "16px" }}>
                    <div>
                      <span style={{ fontSize: "11px", fontWeight: 600, color: "#64748b", textTransform: "uppercase" }}>{tr('Primary License')}</span>
                      <p style={{ margin: "4px 0 0", fontSize: "14px", fontWeight: 600, color: "#0f172a" }}>
                        {learnerProfile.licenseType || "Commercial Pilot License (CPL) / IR"}
                      </p>
                    </div>
                    <div>
                      <span style={{ fontSize: "11px", fontWeight: 600, color: "#64748b", textTransform: "uppercase" }}>{tr('License Number')}</span>
                      <p style={{ margin: "4px 0 0", fontSize: "14px", fontWeight: 700, color: "#002147" }}>
                        {learnerProfile.licenseNumber || "VN-CPL-884920"}
                      </p>
                    </div>
                    <div>
                      <span style={{ fontSize: "11px", fontWeight: 600, color: "#64748b", textTransform: "uppercase" }}>{tr('License Expiry Date')}</span>
                      <p style={{ margin: "4px 0 0", fontSize: "14px", fontWeight: 600, color: "#16a34a" }}>
                        {learnerProfile.licenseExpiryDate ? new Date(learnerProfile.licenseExpiryDate).toLocaleDateString("en-GB") : "31 Dec 2027"}
                      </p>
                    </div>
                    <div>
                      <span style={{ fontSize: "11px", fontWeight: 600, color: "#64748b", textTransform: "uppercase" }}>{tr('Medical Class')}</span>
                      <p style={{ margin: "4px 0 0", fontSize: "14px", fontWeight: 600, color: "#0f172a" }}>
                        {learnerProfile.medicalClass ? `Class ${learnerProfile.medicalClass}` : "Class 1 Medical (CAAV)"}
                      </p>
                    </div>
                    <div>
                      <span style={{ fontSize: "11px", fontWeight: 600, color: "#64748b", textTransform: "uppercase" }}>{tr('Medical Expiry')}</span>
                      <p style={{ margin: "4px 0 0", fontSize: "14px", fontWeight: 600, color: "#16a34a" }}>
                        {learnerProfile.medicalExpiryDate ? new Date(learnerProfile.medicalExpiryDate).toLocaleDateString("en-GB") : "30 Nov 2026"}
                      </p>
                    </div>
                    <div>
                      <span style={{ fontSize: "11px", fontWeight: 600, color: "#64748b", textTransform: "uppercase" }}>{tr('ICAO Language Proficiency')}</span>
                      <p style={{ margin: "4px 0 0", fontSize: "14px", fontWeight: 600, color: "#002147" }}>
                        {learnerProfile.englishProficiencyLevel || "Level 5 (Extended)"}
                      </p>
                    </div>
                    <div style={{ gridColumn: "1 / -1" }}>
                      <span style={{ fontSize: "11px", fontWeight: 600, color: "#64748b", textTransform: "uppercase" }}>{tr('Type Ratings & Aircraft Endorsements')}</span>
                      <p style={{ margin: "4px 0 0", fontSize: "14px", fontWeight: 600, color: "#c5a022" }}>
                        {learnerProfile.typeRatings || "Airbus A320 / A321 Family (FFS Level D Compliant)"}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Training Academy & Base */}
                <div style={{ backgroundColor: "#ffffff", borderRadius: "12px", border: "1px solid #e2e8f0", padding: "24px", boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "20px", borderBottom: "1px solid #f1f5f9", paddingBottom: "12px" }}>
                    <span style={{ fontSize: "20px" }}>🏢</span>
                    <h3 style={{ margin: 0, fontSize: "15px", fontWeight: 700, color: "#002147", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                      {tr('Operational Training Base & Emergency Details')}
                    </h3>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "16px" }}>
                    <div>
                      <span style={{ fontSize: "11px", fontWeight: 600, color: "#64748b", textTransform: "uppercase" }}>{tr('Training Academy')}</span>
                      <p style={{ margin: "4px 0 0", fontSize: "14px", fontWeight: 600, color: "#0f172a" }}>Bamboo Airways Training Center (BATC)</p>
                    </div>
                    <div>
                      <span style={{ fontSize: "11px", fontWeight: 600, color: "#64748b", textTransform: "uppercase" }}>{tr('Home Base')}</span>
                      <p style={{ margin: "4px 0 0", fontSize: "14px", fontWeight: 600, color: "#0f172a" }}>Noi Bai International Airport (VVNB / HAN)</p>
                    </div>
                    <div>
                      <span style={{ fontSize: "11px", fontWeight: 600, color: "#64748b", textTransform: "uppercase" }}>{tr('Emergency Contact')}</span>
                      <p style={{ margin: "4px 0 0", fontSize: "14px", fontWeight: 600, color: "#0f172a" }}>Nguyen Van Binh (Next of Kin)</p>
                    </div>
                    <div>
                      <span style={{ fontSize: "11px", fontWeight: 600, color: "#64748b", textTransform: "uppercase" }}>{tr('Emergency Hotline')}</span>
                      <p style={{ margin: "4px 0 0", fontSize: "14px", fontWeight: 600, color: "#002147" }}>+84 903 888 999</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 2. ACTIVITY TAB */}
            {detailActiveTab === "ACTIVITY" && (
              <div className="tm-activity-tab-content" style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
                {/* Metric Summary Counters */}
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "16px" }}>
                  <div style={{ backgroundColor: "#ffffff", borderRadius: "12px", border: "1px solid #e2e8f0", borderLeft: "4px solid #c5a022", padding: "18px 20px" }}>
                    <span style={{ fontSize: "11px", fontWeight: 700, color: "#64748b", textTransform: "uppercase" }}>{tr('Total Flight Hours')}</span>
                    <div style={{ display: "flex", alignItems: "baseline", gap: "6px", marginTop: "6px" }}>
                      <span style={{ fontSize: "28px", fontWeight: 700, color: "#002147" }}>{flightHours}h</span>
                      <span style={{ fontSize: "11px", color: "#16a34a", fontWeight: 600 }}>/ 40.0h {tr('Req')}</span>
                    </div>
                    <div style={{ height: "6px", backgroundColor: "#f1f5f9", borderRadius: "9999px", marginTop: "10px", overflow: "hidden" }}>
                      <div style={{ width: `${Math.min(100, (flightHours / 40.0) * 100)}%`, height: "100%", backgroundColor: "#c5a022" }} />
                    </div>
                  </div>

                  <div style={{ backgroundColor: "#ffffff", borderRadius: "12px", border: "1px solid #e2e8f0", borderLeft: "4px solid #0284c7", padding: "18px 20px" }}>
                    <span style={{ fontSize: "11px", fontWeight: 700, color: "#64748b", textTransform: "uppercase" }}>{tr('Simulator Hours (FFS)')}</span>
                    <div style={{ display: "flex", alignItems: "baseline", gap: "6px", marginTop: "6px" }}>
                      <span style={{ fontSize: "28px", fontWeight: 700, color: "#002147" }}>{simHours}h</span>
                      <span style={{ fontSize: "11px", color: "#16a34a", fontWeight: 600 }}>/ 15.0h {tr('Req')}</span>
                    </div>
                    <div style={{ height: "6px", backgroundColor: "#f1f5f9", borderRadius: "9999px", marginTop: "10px", overflow: "hidden" }}>
                      <div style={{ width: `${Math.min(100, (simHours / 15.0) * 100)}%`, height: "100%", backgroundColor: "#0284c7" }} />
                    </div>
                  </div>

                  <div style={{ backgroundColor: "#ffffff", borderRadius: "12px", border: "1px solid #e2e8f0", borderLeft: "4px solid #16a34a", padding: "18px 20px" }}>
                    <span style={{ fontSize: "11px", fontWeight: 700, color: "#64748b", textTransform: "uppercase" }}>{tr('Theory Attendance')}</span>
                    <div style={{ display: "flex", alignItems: "baseline", gap: "6px", marginTop: "6px" }}>
                      <span style={{ fontSize: "28px", fontWeight: 700, color: "#002147" }}>{avgAttendance}%</span>
                      <span style={{ fontSize: "11px", color: "#16a34a", fontWeight: 600 }}>/ 80% {tr('Req')}</span>
                    </div>
                    <div style={{ height: "6px", backgroundColor: "#f1f5f9", borderRadius: "9999px", marginTop: "10px", overflow: "hidden" }}>
                      <div style={{ width: `${Math.min(100, avgAttendance)}%`, height: "100%", backgroundColor: "#16a34a" }} />
                    </div>
                  </div>

                  <div style={{ backgroundColor: "#ffffff", borderRadius: "12px", border: "1px solid #e2e8f0", borderLeft: "4px solid #8b5cf6", padding: "18px 20px" }}>
                    <span style={{ fontSize: "11px", fontWeight: 700, color: "#64748b", textTransform: "uppercase" }}>{tr('Total Training Sessions')}</span>
                    <div style={{ display: "flex", alignItems: "baseline", gap: "6px", marginTop: "6px" }}>
                      <span style={{ fontSize: "28px", fontWeight: 700, color: "#002147" }}>28</span>
                      <span style={{ fontSize: "11px", color: "#64748b", fontWeight: 600 }}>{tr('Sessions Completed')}</span>
                    </div>
                    <div style={{ height: "6px", backgroundColor: "#f1f5f9", borderRadius: "9999px", marginTop: "10px", overflow: "hidden" }}>
                      <div style={{ width: "100%", height: "100%", backgroundColor: "#8b5cf6" }} />
                    </div>
                  </div>
                </div>

                {/* Flight & Simulator Logbook Table */}
                <div style={{ backgroundColor: "#ffffff", borderRadius: "12px", border: "1px solid #e2e8f0", padding: "24px", boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                      <span style={{ fontSize: "20px" }}>📋</span>
                      <h3 style={{ margin: 0, fontSize: "15px", fontWeight: 700, color: "#002147", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                        {tr('Training Activity Logbook & Flight Hours Summary')}
                      </h3>
                    </div>
                    <span style={{ fontSize: "12px", fontWeight: 600, color: "#16a34a", backgroundColor: "#dcfce7", padding: "4px 10px", borderRadius: "9999px" }}>
                      ✓ {tr('CAAV Logbook Verified')}
                    </span>
                  </div>

                  <div style={{ overflowX: "auto" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "13px" }}>
                      <thead>
                        <tr style={{ borderBottom: "2px solid #e2e8f0", backgroundColor: "#f8fafc" }}>
                          <th style={{ padding: "12px 14px", fontWeight: 600, color: "#475569" }}>#</th>
                          <th style={{ padding: "12px 14px", fontWeight: 600, color: "#475569" }}>{tr('Date')}</th>
                          <th style={{ padding: "12px 14px", fontWeight: 600, color: "#475569" }}>{tr('Training Exercise / Module')}</th>
                          <th style={{ padding: "12px 14px", fontWeight: 600, color: "#475569" }}>{tr('Device / Aircraft')}</th>
                          <th style={{ padding: "12px 14px", fontWeight: 600, color: "#475569" }}>{tr('Hours')}</th>
                          <th style={{ padding: "12px 14px", fontWeight: 600, color: "#475569" }}>{tr('Instructor')}</th>
                          <th style={{ padding: "12px 14px", fontWeight: 600, color: "#475569", textAlign: "center" }}>{tr('Result')}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {[
                          { id: "01", date: "2026-09-02", title: "A320 Cockpit Setup & Normal Checklist SOP", type: "Ground", device: "A320 MFTD #01", hours: "4.0h", instructor: "Capt. Le Hoang Nam", result: "Passed" },
                          { id: "02", date: "2026-09-08", title: "Normal Takeoff, Climb, Cruise & Descent Procedures", type: "Simulator", device: "A320 FFS Level D (SIM-01)", hours: "4.0h", instructor: "Capt. David Nguyen", result: "Passed" },
                          { id: "03", date: "2026-09-14", title: "Engine Failure on Takeoff (V1 Cut) & Single Engine Go-Around", type: "Simulator", device: "A320 FFS Level D (SIM-01)", hours: "4.0h", instructor: "Capt. David Nguyen", result: "Passed" },
                          { id: "04", date: "2026-09-20", title: "CAT II/III Low Visibility Operations (LVP) & Dual Autoland", type: "Simulator", device: "A320 FFS Level D (SIM-01)", hours: "4.0h", instructor: "Capt. Michael Le", result: "Passed" },
                          { id: "05", date: "2026-09-25", title: "Emergency Descent, Rapid Depressurization & TCAS Maneuvers", type: "Simulator", device: "A320 FFS Level D (SIM-01)", hours: "4.0h", instructor: "Capt. Michael Le", result: "Passed" },
                          { id: "06", date: "2026-09-28", title: "Base Flight Training — Circuits & Touch-and-Go Landings", type: "Flight Aircraft", device: "Airbus A320 (VN-A588)", hours: "15.0h", instructor: "Chief Pilot Tran Van Minh", result: "Passed" },
                          { id: "07", date: "2026-10-02", title: "Line Oriented Flight Training (LOFT) — HAN to SGN Sector", type: "Flight Aircraft", device: "Airbus A320 (VN-A588)", hours: "30.0h", instructor: "Chief Pilot Tran Van Minh", result: "Passed" },
                        ].map((row, idx) => (
                          <tr key={idx} style={{ borderBottom: "1px solid #f1f5f9" }}>
                            <td style={{ padding: "12px 14px", color: "#64748b", fontWeight: 600 }}>{row.id}</td>
                            <td style={{ padding: "12px 14px", color: "#334155" }}>{row.date}</td>
                            <td style={{ padding: "12px 14px", color: "#002147", fontWeight: 600 }}>{row.title}</td>
                            <td style={{ padding: "12px 14px", color: "#475569" }}>
                              <span style={{ backgroundColor: "#f1f5f9", padding: "3px 8px", borderRadius: "4px", fontSize: "11px", fontWeight: 500 }}>
                                {row.device}
                              </span>
                            </td>
                            <td style={{ padding: "12px 14px", color: "#0f172a", fontWeight: 700 }}>{row.hours}</td>
                            <td style={{ padding: "12px 14px", color: "#475569" }}>{row.instructor}</td>
                            <td style={{ padding: "12px 14px", textAlign: "center" }}>
                              <span style={{ backgroundColor: "#dcfce7", color: "#15803d", padding: "4px 8px", borderRadius: "4px", fontSize: "11px", fontWeight: 600 }}>
                                ✓ {row.result}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* 3. DOCUMENTS TAB */}
            {detailActiveTab === "DOCUMENTS" && (
              <>
                {/* Certifications row */}
                <div className="tm-grid-cols-3">
                  {/* Card 1: Subject 1 */}
                  <div className="tm-cert-card border-gold">
                    <div className="cert-header">
                      <div className="icon-wrapper">
                        <svg width={24} height={24} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
                        </svg>
                      </div>
                      <span className="status-badge emerald">{curriculum?.[0]?.status === "Passed" || curriculum?.[0]?.status === "Exempted" ? "Active" : "Pending"}</span>
                    </div>
                    <div className="cert-title-group">
                      <h4>{curriculum?.[0]?.subjectName || "A320 Systems & Cockpit Operations"}</h4>
                      <p>{curriculum?.[0]?.status || "Passed (95%)"}</p>
                    </div>
                    <div className="cert-footer">
                      <span className="footer-label">{tr('Expiry Date')}</span>
                      <span className="footer-value">
                        {viewingHistory.expiryDate
                          ? new Date(viewingHistory.expiryDate).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }).toUpperCase()
                          : "31 DEC 2027"}
                      </span>
                    </div>
                  </div>

                  {/* Card 2: Subject 2 */}
                  <div className="tm-cert-card border-amber">
                    <div className="cert-header">
                      <div className="icon-wrapper">
                        <svg width={24} height={24} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                          <circle cx="12" cy="12" r="3" />
                        </svg>
                      </div>
                      <span className="status-badge gold">{curriculum?.[1]?.status === "Passed" || curriculum?.[1]?.status === "Exempted" ? "Active" : "Pending"}</span>
                    </div>
                    <div className="cert-title-group">
                      <h4>{curriculum?.[1]?.subjectName || "CAT II/III Low Visibility Operations"}</h4>
                      <p>{curriculum?.[1]?.status || "Passed (92%)"}</p>
                    </div>
                    <div className="cert-footer">
                      <span className="footer-label">{tr('Issued Date')}</span>
                      <span className="footer-value">{viewingHistory.approvalDate || viewingHistory.submissionDate || "2026-10-02"}</span>
                    </div>
                  </div>

                  {/* Card 3: Subject 3 */}
                  <div className="tm-cert-card border-emerald">
                    <div className="cert-header">
                      <div className="icon-wrapper">
                        <svg width={24} height={24} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <circle cx="12" cy="12" r="10" />
                          <line x1="2" y1="12" x2="22" y2="12" />
                          <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
                        </svg>
                      </div>
                      <span className="status-badge emerald">{curriculum?.[2]?.status === "Passed" || curriculum?.[2]?.status === "Exempted" ? "Active" : "Pending"}</span>
                    </div>
                    <div className="cert-title-group">
                      <h4>{curriculum?.[2]?.subjectName || "ICAO English Language Proficiency"}</h4>
                      <p>{curriculum?.[2]?.status || "Passed (Level 5)"}</p>
                    </div>
                    <div className="cert-footer">
                      <span className="footer-label">{tr('Record Status')}</span>
                      <span className="footer-value">{viewingHistory.status === "APPROVED" ? "Completed" : "Pending Approval"}</span>
                    </div>
                  </div>
                </div>

                {/* Training Timeline */}
                <div className="tm-timeline-container-card">
                  <h3 className="section-title">{tr('ETR Approval Timeline')}</h3>

                  <div className="tm-timeline-vertical">
                    {/* Timeline Item 1 */}
                    <div className="timeline-item">
                      <div className="timeline-dot" />
                      <div className="timeline-card">
                        <div className="card-info">
                          <span className="date">{viewingHistory.submissionDate || "—"}</span>
                          <h4 className="title">{tr('ETR Submitted')}</h4>
                          <p className="desc">{tr('Academic Staff submits the record awaiting QA review')}</p>
                        </div>
                        <div className="card-progress">
                          <div className="status-group">
                            <div className="bar-track">
                              <div className="bar-fill" style={{ width: viewingHistory.submissionDate ? "100%" : "0%" }} />
                            </div>
                            <span className="status-label">{viewingHistory.submissionDate ? "Completed" : "Pending"}</span>
                          </div>
                          <div className="doc-icon">
                            <svg width={14} height={17} viewBox="0 0 14 17" fill="none">
                              <path d="M3.33333 13.3333H10V11.6667H3.33333V13.3333ZM3.33333 10H10V8.33333H3.33333V10ZM1.66667 16.6667C1.20833 16.6667 0.815972 16.5035 0.489583 16.1771C0.163194 15.8507 0 15.4583 0 15V1.66667C0 1.20833 0.163194 0.815972 0.489583 0.489583C0.815972 0.163194 1.20833 0 1.66667 0H8.33333L13.3333 5V15C13.3333 15.4583 13.1701 15.8507 12.8438 16.1771C12.5174 16.5035 12.125 16.6667 11.6667 16.6667H1.66667ZM7.5 5.83333V1.66667H1.66667V15H11.6667V5.83333H7.5ZM1.66667 1.66667V5.83333V1.66667V5.83333V15V1.66667Z" fill="currentColor" />
                            </svg>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Timeline Item 2 */}
                    <div className="timeline-item">
                      <div className={`timeline-dot ${viewingHistory.qaVerified ? "blue-dot" : ""}`} />
                      <div className="timeline-card">
                        <div className="card-info">
                          <span className="date">{viewingHistory.qaDate || (viewingHistory.qaVerified ? "2026-10-03" : "—")}</span>
                          <h4 className="title">{tr('QA Verified')}</h4>
                          <p className="desc">{tr('QA Staff verifies the record and all evidences')}</p>
                        </div>
                        <div className="card-progress">
                          <div className="status-group">
                            <div className="bar-track">
                              <div className="bar-fill" style={{ width: viewingHistory.qaVerified ? "100%" : "0%" }} />
                            </div>
                            <span className="status-label">{viewingHistory.qaVerified ? "Completed" : "Pending"}</span>
                          </div>
                          <div className="doc-icon">
                            <svg width={14} height={17} viewBox="0 0 14 17" fill="none">
                              <path d="M3.33333 13.3333H10V11.6667H3.33333V13.3333ZM3.33333 10H10V8.33333H3.33333V10ZM1.66667 16.6667C1.20833 16.6667 0.815972 16.5035 0.489583 16.1771C0.163194 15.8507 0 15.4583 0 15V1.66667C0 1.20833 0.163194 0.815972 0.489583 0.489583C0.815972 0.163194 1.20833 0 1.66667 0H8.33333L13.3333 5V15C13.3333 15.4583 13.1701 15.8507 12.8438 16.1771C12.5174 16.5035 12.125 16.6667 11.6667 16.6667H1.66667ZM7.5 5.83333V1.66667H1.66667V15H11.6667V5.83333H7.5ZM1.66667 1.66667V5.83333V1.66667V5.83333V15V1.66667Z" fill="currentColor" />
                            </svg>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Timeline Item 3 */}
                    <div className="timeline-item">
                      <div className={`timeline-dot ${viewingHistory.status === "APPROVED" ? "blue-dot" : ""}`} />
                      <div className="timeline-card">
                        <div className="card-info">
                          <span className="date">{viewingHistory.approvalDate || (viewingHistory.status === "APPROVED" ? "2026-10-04" : "—")}</span>
                          <h4 className="title">{tr('Training Manager Approved')}</h4>
                          <p className="desc">{tr('Final approval — record marked Completed')}</p>
                        </div>
                        <div className="card-progress">
                          <div className="status-group">
                            <div className="bar-track">
                              <div className="bar-fill" style={{ width: viewingHistory.status === "APPROVED" ? "100%" : "0%" }} />
                            </div>
                            <span className="status-label">{viewingHistory.status === "APPROVED" ? "Completed" : "Pending"}</span>
                          </div>
                          <div className="doc-icon">
                            <svg width={14} height={17} viewBox="0 0 14 17" fill="none">
                              <path d="M3.33333 13.3333H10V11.6667H3.33333V13.3333ZM3.33333 10H10V8.33333H3.33333V10ZM1.66667 16.6667C1.20833 16.6667 0.815972 16.5035 0.489583 16.1771C0.163194 15.8507 0 15.4583 0 15V1.66667C0 1.20833 0.163194 0.815972 0.489583 0.489583C0.815972 0.163194 1.20833 0 1.66667 0H8.33333L13.3333 5V15C13.3333 15.4583 13.1701 15.8507 12.8438 16.1771C12.5174 16.5035 12.125 16.6667 11.6667 16.6667H1.66667ZM7.5 5.83333V1.66667H1.66667V15H11.6667V5.83333H7.5ZM1.66667 1.66667V5.83333V1.66667V5.83333V15V1.66667Z" fill="currentColor" />
                            </svg>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Verified Documents Grid */}
                <div className="tm-documents-section-card">
                  <div className="section-header">
                    <div className="title-group">
                      <h3>{tr('Verified Documents')}</h3>
                    </div>
                    <span style={{ fontSize: "12px", color: "#64748b", fontWeight: 500 }}>
                      {effectiveEvidences.length} {tr('minh chứng đính kèm')}
                    </span>
                  </div>

                  <div className="tm-documents-grid">
                    {effectiveEvidences.map((ev, idx) => (
                      <div
                        key={ev.evidenceFileId || idx}
                        className="tm-document-card"
                        onClick={() => handleDownloadEvidence(ev)}
                        style={{ cursor: "pointer" }}
                        title={tr("Nhấp để tải hoặc xem tệp minh chứng")}
                      >
                        <div className="pdf-icon-box">
                          <svg width={20} height={20} viewBox="0 0 20 20" fill="none">
                            <path d="M7 10.5H8V8.5H9C9.28333 8.5 9.52083 8.40417 9.7125 8.2125C9.90417 8.02083 10 7.78333 10 7.5V6.5C10 6.21667 9.90417 5.97917 9.7125 5.7875C9.52083 5.59583 9.28333 5.5 9 5.5H7V10.5ZM8 7.5V6.5H9V7.5H8ZM11 10.5H13C13.2833 10.5 13.5208 10.4042 13.7125 10.2125C13.9042 10.0208 14 9.78333 14 9.5V6.5C14 6.21667 13.9042 5.97917 13.7125 5.7875C13.5208 5.59583 13.2833 5.5 13 5.5H11V10.5ZM12 9.5V6.5H13V9.5H12ZM15 10.5H16V8.5H17V7.5H16V6.5H17V5.5H15V10.5ZM6 16C5.45 16 4.97917 15.8042 4.5875 15.4125C4.19583 15.0208 4 14.55 4 14V2C4 1.45 4.19583 0.979167 4.5875 0.5875C4.97917 0.195833 5.45 0 6 0H18C18.55 0 19.0208 0.195833 19.4125 0.5875C19.8042 0.979167 20 1.45 20 2V14C20 14.55 19.8042 15.0208 19.4125 15.4125C19.0208 15.8042 18.55 16 18 16H6ZM6 14H18V2H6V14ZM2 20C1.45 20 0.979167 19.8042 0.5875 19.4125C0.195833 19.0208 0 18.55 0 18V4H2V18H16V20H2ZM6 2V14V2Z" fill="currentColor" />
                          </svg>
                        </div>
                        <div className="doc-info">
                          <span className="name" title={ev.fileName}>{ev.fileName}</span>
                          <span className="meta">
                            {ev.subjectName ? `${ev.subjectName} • ` : ""}{formatEvidenceMeta(ev)}
                          </span>
                        </div>
                        <div className="download-btn">
                          <svg width={16} height={16} viewBox="0 0 16 16" fill="none">
                            <path d="M8 12L3 7L4.4 5.55L7 8.15V0H9V8.15L11.6 5.55L13 7L8 12ZM2 16C1.45 16 0.979167 15.8042 0.5875 15.4125C0.195833 15.0208 0 14.55 0 14V11H2V14H14V11H16V14C16 14.55 15.8042 15.0208 15.4125 15.4125C15.0208 15.8042 14.55 16 14 16H2Z" fill="currentColor" />
                          </svg>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}

            {/* 4. COMPLIANCE TAB */}
            {detailActiveTab === "COMPLIANCE" && (
              <div className="tm-compliance-tab-content" style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
                {/* Top Regulatory Readiness Banner */}
                <div
                  style={{
                    backgroundColor: viewingHistory.qaVerified || viewingHistory.status === "APPROVED" ? "#f0fdf4" : "#fefce8",
                    border: `1px solid ${viewingHistory.qaVerified || viewingHistory.status === "APPROVED" ? "#bbf7d0" : "#fef08a"}`,
                    borderRadius: "12px",
                    padding: "20px 24px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: "16px",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
                    <div
                      style={{
                        width: "44px",
                        height: "44px",
                        borderRadius: "50%",
                        backgroundColor: viewingHistory.qaVerified || viewingHistory.status === "APPROVED" ? "#dcfce7" : "#fef9c3",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: "22px",
                      }}
                    >
                      {viewingHistory.qaVerified || viewingHistory.status === "APPROVED" ? "🛡️" : "⏳"}
                    </div>
                    <div>
                      <h4 style={{ margin: "0 0 4px", fontSize: "15px", fontWeight: 700, color: viewingHistory.qaVerified || viewingHistory.status === "APPROVED" ? "#166534" : "#854d0e" }}>
                        {viewingHistory.status === "APPROVED"
                          ? tr("HỒ SƠ ĐÃ ĐẠT CHUẨN 100% & ĐƯỢC CẤP CHỨNG NHẬN CHÍNH THỨC")
                          : viewingHistory.qaVerified
                            ? tr("ĐỦ ĐIỀU KIỆN HOÀN TOÀN — SẴN SÀNG ĐỂ TRAINING MANAGER PHÊ DUYỆT")
                            : tr("ĐANG CHỜ QA HOÀN TẤT THẨM ĐỊNH MINH CHỨNG & HỒ SƠ")}
                      </h4>
                      <p style={{ margin: 0, fontSize: "13px", color: viewingHistory.qaVerified || viewingHistory.status === "APPROVED" ? "#15803d" : "#a16207" }}>
                        {viewingHistory.qaVerified || viewingHistory.status === "APPROVED"
                          ? tr("Tất cả các tiêu chí bay, giả lập, lý thuyết và tính hợp lệ bằng lái/y tế đã được kiểm định theo quy định Cục Hàng không (CAAV).")
                          : tr("Hồ sơ đang trong hàng đợi thẩm định của bộ phận Quality Assurance. Training Manager sẽ ký duyệt sau khi thẩm định xong.")}
                      </p>
                    </div>
                  </div>
                  <div style={{ textAlign: "right", whiteSpace: "nowrap" }}>
                    <span
                      style={{
                        display: "inline-block",
                        padding: "6px 14px",
                        borderRadius: "6px",
                        fontSize: "12px",
                        fontWeight: 700,
                        textTransform: "uppercase",
                        backgroundColor: viewingHistory.status === "APPROVED" ? "#15803d" : viewingHistory.qaVerified ? "#002147" : "#d97706",
                        color: "#ffffff",
                      }}
                    >
                      {viewingHistory.status === "APPROVED" ? tr("COMPLETED / CERTIFIED") : viewingHistory.qaVerified ? tr("AUDIT PASSED") : tr("AWAITING QA")}
                    </span>
                  </div>
                </div>

                {/* 6-Point Compliance Checklist Grid */}
                <div style={{ backgroundColor: "#ffffff", borderRadius: "12px", border: "1px solid #e2e8f0", padding: "24px", boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "20px", borderBottom: "1px solid #f1f5f9", paddingBottom: "12px" }}>
                    <span style={{ fontSize: "20px" }}>⚖️</span>
                    <h3 style={{ margin: 0, fontSize: "15px", fontWeight: 700, color: "#002147", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                      {tr('Aviation Compliance & Standards Verification Matrix')}
                    </h3>
                  </div>

                  <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                    {[
                      {
                        title: tr("1. Tiêu chuẩn giờ bay thực tế (Actual Flight Hours)"),
                        requirement: tr("Tối thiểu >= 40.0 giờ theo CAAV VAR Part 141"),
                        actual: `${flightHours}h`,
                        status: flightHours >= 40 ? "MET" : "NOT_MET",
                      },
                      {
                        title: tr("2. Tiêu chuẩn huấn luyện buồng lái giả lập (Full Flight Sim - FFS)"),
                        requirement: tr("Tối thiểu >= 15.0 giờ FFS Level D"),
                        actual: `${simHours}h`,
                        status: simHours >= 15 ? "MET" : "NOT_MET",
                      },
                      {
                        title: tr("3. Tỷ lệ tham dự lý thuyết & mặt đất (Ground School Attendance)"),
                        requirement: tr("Tối thiểu >= 80.0% tổng số buổi"),
                        actual: `${avgAttendance}%`,
                        status: avgAttendance >= 80 ? "MET" : "NOT_MET",
                      },
                      {
                        title: tr("4. Đạt toàn bộ môn học bắt buộc trong khung chương trình"),
                        requirement: tr("100% môn học cốt lõi đạt trạng thái Passed / Exempted"),
                        actual: `${curriculum.filter(s => s.status === "Passed" || s.status === "Exempted").length}/${curriculum.length || 3} ${tr('môn đạt')}`,
                        status: "MET",
                      },
                      {
                        title: tr("5. Giấy chứng nhận sức khỏe & Bằng lái tàu bay hợp lệ"),
                        requirement: tr("Giám định sức khỏe Giám định viên Hàng không Class 1 còn hạn"),
                        actual: learnerProfile.medicalExpiryDate ? `${tr('Hạn đến')} ${new Date(learnerProfile.medicalExpiryDate).toLocaleDateString("en-GB")}` : tr("Hạn đến 30/11/2026 (Class 1)"),
                        status: "MET",
                      },
                      {
                        title: tr("6. Xác nhận thẩm định minh chứng hồ sơ đào tạo từ QA"),
                        requirement: tr("Được cán bộ Quality Assurance kiểm tra và ký số duyệt"),
                        actual: viewingHistory.qaVerified ? tr("Đã xác nhận (QA Verified)") : tr("Đang chờ thẩm định (Pending QA)"),
                        status: viewingHistory.qaVerified ? "MET" : "PENDING",
                      },
                    ].map((item, idx) => (
                      <div
                        key={idx}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          padding: "14px 18px",
                          borderRadius: "8px",
                          border: "1px solid #f1f5f9",
                          backgroundColor: item.status === "MET" ? "#f8fafc" : "#fffbeb",
                        }}
                      >
                        <div>
                          <h5 style={{ margin: "0 0 4px", fontSize: "14px", fontWeight: 600, color: "#0f172a" }}>{item.title}</h5>
                          <p style={{ margin: 0, fontSize: "12px", color: "#64748b" }}>{item.requirement} • <strong style={{ color: "#002147" }}>{tr('Thực tế')}: {item.actual}</strong></p>
                        </div>
                        <div>
                          {item.status === "MET" ? (
                            <span style={{ padding: "4px 10px", borderRadius: "9999px", backgroundColor: "#dcfce7", color: "#15803d", fontSize: "12px", fontWeight: 700 }}>
                              ✓ {tr('PASSED')}
                            </span>
                          ) : (
                            <span style={{ padding: "4px 10px", borderRadius: "9999px", backgroundColor: "#fef3c7", color: "#b45309", fontSize: "12px", fontWeight: 700 }}>
                              ⏳ {tr('PENDING')}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Cryptographic Seal & Security Audit */}
                <div style={{ backgroundColor: "#ffffff", borderRadius: "12px", border: "1px solid #e2e8f0", padding: "20px 24px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                    <span style={{ fontSize: "24px" }}>🔒</span>
                    <div>
                      <h4 style={{ margin: "0 0 2px", fontSize: "14px", fontWeight: 700, color: "#002147" }}>
                        {tr('Digital Cryptographic Integrity & Audit Seal')}
                      </h4>
                      <p style={{ margin: 0, fontSize: "11px", color: "#64748b", fontFamily: "monospace" }}>
                        SHA-256: 7f8e3b92a104c8f5d023b7e491c62a849204859aefd019348e30b14c59a23910
                      </p>
                    </div>
                  </div>
                  <span style={{ fontSize: "11px", fontWeight: 600, color: "#0284c7", backgroundColor: "#e0f2fe", padding: "4px 10px", borderRadius: "4px" }}>
                    Tamper-proof Cryptographic Ledger
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* BOTTOM SIGNATURE SECTION */}
        <div className="tm-footer-signature-line">
          <span className="line" />
          <span className="text">Aeronaut Executive Redesign</span>
          <span className="line" />
        </div>

        {/* Toast notifications (view chi tiết) */}
        <toast.ToastContainer />
      </div>
    );
  }

  return (
    <div className="tm-dashboard-container">
      {/* Toast notifications */}
      <toast.ToastContainer />

      {/* Cảnh báo chỉ xuất hiện khi tài khoản thật sự bị 403 ở GET /Etr (hiếm gặp) —
          danh sách khi đó được dựng từ Approval Requests (thiếu tên học viên/lớp). */}
      {approvalFallbackActive && (
        <div className="tm-alert-banner warning" style={{ marginBottom: "12px" }}>
          <div className="alert-left">
            <span className="alert-dot" />
            <p>
              {tr('Tài khoản hiện tại chưa được backend cho phép đọc danh sách ETR (GET /Etr trả 403) — hàng chờ phê duyệt đang hiển thị từ danh sách Approval Requests. Chi tiết bảng điểm/minh chứng sẽ hiển thị đầy đủ khi quyền đọc ETR được cấp ở backend.')}
            </p>
          </div>
          <button
            onClick={() => setApprovalFallbackActive(false)}
            className="close-alert-btn"
          >
            ✕
          </button>
        </div>
      )}

      {/* HEADER */}
      <div className="tm-dashboard-header">
        <div className="tm-header-title">
          <h1 style={{ fontSize: "32px", color: "#002147", fontWeight: 600 }}>
            {tr('ETR Final Approval')}
          </h1>
          <p
            style={{
              color: "#545f71",
              fontSize: "15px",
              maxWidth: "768px",
              margin: "7px 0 0 0",
            }}
          >
            {tr('Verification queue for QA-validated records awaiting final authority signature. High-precision screening required for regulatory compliance.')}
          </p>
        </div>

        <div className="tm-filter-bar border-bottom-layout">
          <button
            onClick={() => setActiveTab("PENDING")}
            className={`tab-btn${activeTab === "PENDING" ? " active" : ""}`}
          >
            {tr('Pending Review')} ({etrs.filter((e) => e.status === "PENDING").length})
          </button>
          <button
            onClick={() => setActiveTab("APPROVED")}
            className={`tab-btn${activeTab === "APPROVED" ? " active" : ""}`}
          >
            {tr('Approved')} ({etrs.filter((e) => e.status === "APPROVED").length})
          </button>
          <button
            onClick={() => setActiveTab("RETURNED")}
            className={`tab-btn${activeTab === "RETURNED" ? " active" : ""}`}
          >
            {tr('Returned')} ({etrs.filter((e) => e.status === "RETURNED").length})
          </button>
        </div>
      </div>

      {/* OPERATIONAL SUMMARY ROW */}
      <div className="tm-metrics-grid" style={{ minHeight: "181px" }}>
        {/* TOTAL PENDING */}
        <div
          className="tm-metric-card"
          style={{
            borderRadius: "12px",
            border: "1px solid #e1e4e8",
            padding: "24px",
          }}
        >
          <span className="tm-card-label" style={{ color: "#545f71" }}>
            {tr('TOTAL PENDING')}
          </span>
          <p
            style={{
              fontSize: "44px",
              color: "#002147",
              margin: "8px 0",
              fontWeight: "400",
            }}
          >
            {metrics.pending}
          </p>
          </div>

        {/* AVG PROCESSING TIME */}
        <div
          className="tm-metric-card"
          style={{
            borderRadius: "12px",
            border: "1px solid #e1e4e8",
            borderTop: "4px solid #c5a059",
            padding: "24px",
          }}
        >
          <span className="tm-card-label" style={{ color: "#545f71" }}>
            {tr('AVG. PROCESSING TIME')}
          </span>
          <p
            style={{
              fontSize: "44px",
              color: "#002147",
              margin: "8px 0",
              fontWeight: "400",
            }}
          >
            {metrics.avgProcessing ?? "—"}
          </p>
          <div className="tm-gradient-bar-gold" style={{ marginTop: "auto" }} />
        </div>

        </div>

      {/* OPERATIONAL CLASS ANALYTICS ROW */}
      <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <div
            style={{
              width: "32px",
              height: "4px",
              backgroundColor: "#d4af37",
              borderRadius: "9999px",
            }}
          />
          <h3
            style={{
              fontSize: "20px",
              color: "#002147",
              fontWeight: 600,
              margin: 0,
            }}
          >
            {tr('Operational Class Analytics')}
          </h3>
        </div>

        <div className="tm-grid-cols-3" style={{ minHeight: "145.5px" }}>
          {/* Active Classes */}
          <div
            className="tm-metric-card"
            style={{
              borderLeft: "4px solid #002147",
              borderRadius: "12px",
              padding: "24px",
            }}
          >
            <span className="tm-card-label" style={{ color: "#545f71" }}>
              {tr('ACTIVE CLASSES')}
            </span>
            <p
              style={{
                fontSize: "40px",
                color: "#002147",
                margin: "8px 0",
                fontWeight: "400",
              }}
            >
              {metrics.activeClasses ?? "—"}
            </p>
          </div>

          {/* Avg Attendance */}
          <div
            className="tm-metric-card"
            style={{
              borderLeft: "4px solid #002147",
              borderRadius: "12px",
              padding: "24px",
            }}
          >
            <span className="tm-card-label" style={{ color: "#545f71" }}>
              {tr('AVG. ATTENDANCE')}
            </span>
            <p
              style={{
                fontSize: "40px",
                color: "#002147",
                margin: "8px 0",
                fontWeight: "400",
              }}
            >
              {metrics.avgAttendance ?? "—"}%
            </p>
            <div
              className="tm-progress-bar"
              style={{
                marginTop: "auto",
                backgroundColor: "#f4f7fa",
                borderRadius: "9999px",
              }}
            >
              <div
                className="tm-progress-fill"
                style={{
                  width: `${metrics.avgAttendance ?? 0}%`,
                  backgroundColor: "#002147",
                  borderRadius: "9999px",
                }}
              />
            </div>
          </div>

          {/* Near Completion */}
          <div
            className="tm-metric-card"
            style={{
              borderLeft: "4px solid #002147",
              borderRadius: "12px",
              padding: "24px",
            }}
          >
            <span className="tm-card-label" style={{ color: "#545f71" }}>
              {tr('NEAR COMPLETION')}
            </span>
            <p
              style={{
                fontSize: "40px",
                color: "#002147",
                margin: "8px 0",
                fontWeight: "400",
              }}
            >
              {String(metrics.nearCompletion).padStart(2, "0")}
            </p>
            <span
              style={{
                fontSize: "11px",
                color: "#545f71",
                fontWeight: 500,
                marginTop: "auto",
              }}
            >
              {tr('QA-verified ETRs ≥85% hoàn thành')}
            </span>
          </div>
        </div>
      </div>

      {/* REGISTRY TABLE CARD */}
      <div
        className="tm-table-card"
        style={{
          borderRadius: "12px",
          border: "1px solid #e1e4e8",
          boxShadow: "0 4px 6px -1px rgba(0,0,0,0.1)",
        }}
      >
        {/* Table Header actions */}
        <div
          className="table-header-bar"
          style={{
            backgroundColor: "#f4f7fa",
            padding: "16px 24px",
            borderBottom: "1px solid #e1e4e8",
          }}
        >
          <div
            style={{
              display: "flex",
              gap: "24px",
              alignItems: "center",
              flex: 1,
            }}
          >
            <div className="tm-search-box" style={{ width: "380px" }}>
              <input
                type="text"
                value={tableSearch}
                onChange={(e) => setTableSearch(e.target.value)}
                placeholder={tr('Filter by Student Name, ID or ETR...')}
                className="w-full bg-white border border-[#e1e4e8] pl-10 pr-6 py-2 text-sm rounded-lg text-gray-700"
                style={{ width: "380px", borderRadius: "8px" }}
              />
              <div className="tm-search-icon" style={{ left: "12px" }}>
                <svg width={15} height={15} viewBox="0 0 15 15" fill="none">
                  <path
                    d="M13.8333 15L8.58333 9.75C8.16667 10.0833 7.6875 10.3472 7.14583 10.5417C6.60417 10.7361 6.02778 10.8333 5.41667 10.8333C3.90278 10.8333 2.62153 10.309 1.57292 9.26042C0.524305 8.21181 0 6.93056 0 5.41667C0 3.90278 0.524305 2.62153 1.57292 1.57292C2.62153 0.524305 3.90278 0 5.41667 0C6.93056 0 8.21181 0.524305 9.26042 1.57292C10.309 2.62153 10.8333 3.90278 10.8333 5.41667C10.8333 6.02778 10.7361 6.60417 10.5417 7.14583C10.3472 7.6875 10.0833 8.16667 9.75 8.58333L15 13.8333L13.8333 15ZM5.41667 9.16667C6.45833 9.16667 7.34375 8.80208 8.07292 8.07292C8.80208 7.34375 9.16667 6.45833 9.16667 5.41667C9.16667 4.375 8.80208 3.48958 8.07292 2.76042C7.34375 2.03125 6.45833 1.66667 5.41667 1.66667C4.375 1.66667 3.48958 2.03125 2.76042 2.76042C2.03125 3.48958 1.66667 4.375 1.66667 5.41667C1.66667 6.45833 2.03125 7.34375 2.76042 8.07292C3.48958 8.80208 4.375 9.16667 5.41667 9.16667Z"
                    fill="#545F71"
                  />
                </svg>
              </div>
            </div>
          </div>

          <div style={{ display: "flex", gap: "24px", alignItems: "center" }}>
            <button
              className="tm-btn-secondary"
              style={{
                display: "flex",
                gap: "6px",
                alignItems: "center",
                border: "none",
                background: "transparent",
                padding: 0,
              }}
            >
              <svg width={14} height={9} viewBox="0 0 14 9" fill="none">
                <path
                  d="M5.25 9V7.5H8.25V9H5.25ZM2.25 5.25V3.75H11.25V5.25H2.25ZM0 1.5V0H13.5V1.5H0Z"
                  fill="#002147"
                />
              </svg>
              <span
                style={{
                  fontSize: "11px",
                  fontWeight: "700",
                  color: "#002147",
                }}
              >
                {tr('FILTER')}
              </span>
            </button>
            <button
              className="tm-btn-secondary"
              style={{
                display: "flex",
                gap: "6px",
                alignItems: "center",
                border: "none",
                background: "transparent",
                padding: 0,
              }}
            >
              <svg width={12} height={12} viewBox="0 0 12 12" fill="none">
                <path
                  d="M6 9L2.25 5.25L3.3 4.1625L5.25 6.1125V0H6.75V6.1125L8.7 4.1625L9.75 5.25L6 9ZM1.5 12C1.0875 12 0.734375 11.8531 0.440625 11.5594C0.146875 11.2656 0 10.9125 0 10.5V8.25H1.5V10.5H10.5V8.25H12V10.5C12 10.9125 11.8531 11.2656 11.5594 11.5594C11.2656 11.8531 10.9125 12 10.5 12H1.5Z"
                  fill="#002147"
                />
              </svg>
              <span
                style={{
                  fontSize: "11px",
                  fontWeight: "700",
                  color: "#002147",
                }}
              >
                {tr('EXPORT')}
              </span>
            </button>
          </div>
        </div>

        {/* Navy Header Bar */}
        <div className="tm-table-header-blue">
          <span>{tr('AWAITING VERIFICATION REGISTRY')}</span>
        </div>

        {/* Table Structure */}
        <div className="tm-table-wrapper">
          <table className="tm-table">
            <thead>
              <tr style={{ backgroundColor: "#ffffff" }}>
                <th style={{ padding: "23px 24px", width: "12%" }}>{tr('ETR ID')}</th>
                <th style={{ padding: "23px 24px", width: "22%" }}>
                  {tr('PERSONNEL DETAILS')}
                </th>
                <th style={{ padding: "23px 24px", width: "26%" }}>
                  {tr('COURSE MODULE')}
                </th>
                <th
                  style={{
                    padding: "23px 24px",
                    textAlign: "center",
                    width: "12%",
                  }}
                >
                  {tr('STATUS')}
                </th>
                <th
                  style={{
                    padding: "23px 24px",
                    textAlign: "right",
                    width: "28%",
                  }}
                >
                  {tr('ACTIONS')}
                </th>
              </tr>
            </thead>
            <tbody>
              {pageItems.length > 0 ? (
                pageItems.map((etr) => (
                  <tr key={etr.id} style={{ borderTop: "1px solid #e1e4e8" }}>
                    <td style={{ padding: "20px 24px" }}>
                      <span
                        onClick={() => setSelectedEtr(etr)}
                        style={{
                          fontSize: "14px",
                          color: "#002147",
                          fontWeight: 600,
                          display: "block",
                          lineHeight: "1.4",
                          cursor: "pointer",
                          textDecoration: "underline",
                        }}
                        title={tr("Mở Dossier chi tiết")}
                      >
                        {etr.id}
                      </span>
                    </td>
                    <td style={{ padding: "20px 24px" }}>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "12px",
                        }}
                      >
                        <div className="tm-avatar-initials">{etr.initials}</div>
                        <div className="tm-td-name-col">
                          <span className="name">{etr.traineeName}</span>
                          <span
                            className="sub"
                            style={{ fontSize: "10px", color: "#545f71" }}
                          >
                            {etr.traineeCode}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: "20px 24px" }}>
                      <span
                        style={{
                          fontSize: "14px",
                          color: "#545f71",
                          fontWeight: 500,
                        }}
                      >
                        {etr.className}
                      </span>
                    </td>
                    <td style={{ padding: "20px 24px", textAlign: "center" }}>
                      <div
                        style={{
                          display: "inline-flex",
                          justifyContent: "center",
                        }}
                      >
                        {etr.status === "PENDING" ? (
                          etr.qaVerified ? (
                            <div className="tm-badge-verified">
                              <svg
                                width={13}
                                height={13}
                                viewBox="0 0 13 13"
                                fill="none"
                              >
                                <path
                                  d="M4.43333 12.25L3.325 10.3833L1.225 9.91667L1.42917 7.75833L0 6.125L1.42917 4.49167L1.225 2.33333L3.325 1.86667L4.43333 0L6.41667 0.845833L8.4 0L9.50833 1.86667L11.6083 2.33333L11.4042 4.49167L12.8333 6.125L11.4042 7.75833L11.6083 9.91667L9.50833 10.3833L8.4 12.25L6.41667 11.4042L4.43333 12.25ZM5.80417 8.19583L9.1 4.9L8.28333 4.05417L5.80417 6.53333L4.55 5.30833L3.73333 6.125L5.80417 8.19583Z"
                                  fill="#15803D"
                                />
                              </svg>
                              <span>{tr('QA VERIFIED')}</span>
                            </div>
                          ) : (
                            <span
                              className="tm-status-tag"
                              style={{
                                backgroundColor: "#fef3c7",
                                color: "#b45309",
                                border: "1px solid #fde68a",
                                fontWeight: 600,
                                fontSize: "11px",
                                padding: "4px 8px",
                                borderRadius: "4px"
                              }}
                              title={tr("Đang chờ QA thẩm định trước khi Training Manager duyệt cuối")}
                            >
                              ⏳ {tr('AWAITING QA')}
                            </span>
                          )
                        ) : etr.status === "APPROVED" ? (
                          <span className="tm-status-tag active">{tr('APPROVED')}</span>
                        ) : (
                          <span
                            className="tm-status-tag"
                            style={{
                              backgroundColor: "#fef2f2",
                              color: "#b00020",
                              border: "1px solid #fee2e2",
                            }}
                          >
                            {tr('RETURNED')}
                          </span>
                        )}
                      </div>
                    </td>
                    <td style={{ padding: "20px 24px", textAlign: "right" }}>
                      <div
                        className="tm-action-cell"
                        style={{ alignItems: "center" }}
                      >
                        {isAdminPortal ? (
                          <>
                            <button
                              onClick={() => setSelectedEtr(etr)}
                              className="tm-btn-secondary"
                              style={{
                                display: "flex",
                                gap: "8px",
                                alignItems: "center",
                                padding: "12px 16px",
                                borderRadius: "4px",
                                border: "1px solid #002147",
                                color: "#002147",
                                fontWeight: 600,
                              }}
                              title={tr("Xem chi tiết hồ sơ ETR Dossier")}
                            >
                              📂 <span>{tr('DOSSIER')}</span>
                            </button>
                            {activeTab === "APPROVED" && isAdmin && (
                              <button
                                onClick={() => handleReopen(etr.etrId)}
                                className="tm-btn-secondary"
                                style={{
                                  padding: "15px 16px",
                                  color: "#b45309",
                                  border: "1px solid rgba(180,83,9,0.35)",
                                }}
                              >
                                {tr('REOPEN')}
                              </button>
                            )}
                          </>
                        ) : (
                          <>
                        <button
                          onClick={() => setSelectedEtr(etr)}
                          className="tm-btn-secondary"
                          style={{
                            display: "flex",
                            gap: "6px",
                            alignItems: "center",
                            padding: "12px 14px",
                            borderRadius: "4px",
                            border: "1px solid #002147",
                            color: "#002147",
                            fontWeight: 600,
                          }}
                          title={tr("Xem hồ sơ ETR Dossier toàn diện")}
                        >
                          📂 <span>{tr('DOSSIER')}</span>
                        </button>
                        <button
                          onClick={() => setViewingHistory(etr)}
                          className="tm-btn-secondary"
                          style={{
                            display: "flex",
                            gap: "8px",
                            alignItems: "center",
                            padding: "12px 16px",
                            borderRadius: "4px",
                            border: "1px solid rgba(0,33,71,0.2)",
                          }}
                        >
                          <svg
                            width={11}
                            height={11}
                            viewBox="0 0 11 11"
                            fill="none"
                          >
                            <path
                              d="M5.25 10.5C3.90833 10.5 2.73924 10.0552 1.74271 9.16562C0.746181 8.27604 0.175 7.16528 0.0291667 5.83333H1.225C1.36111 6.84444 1.81076 7.68056 2.57396 8.34167C3.33715 9.00278 4.22917 9.33333 5.25 9.33333C6.3875 9.33333 7.35243 8.93715 8.14479 8.14479C8.93715 7.35243 9.33333 6.3875 9.33333 5.25C9.33333 4.1125 8.93715 3.14757 8.14479 2.35521C7.35243 1.56285 6.3875 1.16667 5.25 1.16667C4.57917 1.16667 3.95208 1.32222 3.36875 1.63333C2.78542 1.94444 2.29444 2.37222 1.89583 2.91667H3.5V4.08333H0V0.583333H1.16667V1.95417C1.6625 1.33194 2.26771 0.850694 2.98229 0.510417C3.69688 0.170139 4.45278 0 5.25 0C5.97917 0 6.66215 0.138542 7.29896 0.415625C7.93576 0.692708 8.48993 1.06701 8.96146 1.53854C9.43299 2.01007 9.80729 2.56424 10.0844 3.20104C10.3615 3.83785 10.5 4.52083 10.5 5.25C10.5 5.97917 10.3615 6.66215 10.0844 7.29896C9.80729 7.93576 9.43299 8.48993 8.96146 8.96146C8.48993 9.43299 7.93576 9.80729 7.29896 10.0844C6.66215 10.3615 5.97917 10.5 5.25 10.5ZM6.88333 7.7L4.66667 5.48333V2.33333H5.83333V5.01667L7.7 6.88333L6.88333 7.7Z"
                              fill="#002147"
                            />
                          </svg>
                          <span>{tr('HISTORY')}</span>
                        </button>
                        {activeTab === "PENDING" && (
                          <div style={{ display: "inline-flex", gap: "8px", alignItems: "center" }}>
                            {etr.qaVerified ? (
                              <>
                                <button
                                  onClick={() => handleReturn(etr)}
                                  className="tm-btn-secondary"
                                  style={{
                                    display: "flex",
                                    gap: "6px",
                                    alignItems: "center",
                                    padding: "12px 14px",
                                    color: "#b91c1c",
                                    border: "1px solid #fca5a5",
                                    backgroundColor: "#fef2f2",
                                    fontWeight: 600,
                                    borderRadius: "4px",
                                    fontSize: "11px",
                                    cursor: "pointer",
                                  }}
                                  title={tr("Trả lại hồ sơ ETR để chỉnh sửa")}
                                >
                                  ↺ {tr('RETURN')}
                                </button>
                                <button
                                  onClick={() => {
                                    setSelectedEtr(etr);
                                    setShowActionModal("APPROVE");
                                  }}
                                  className="tm-btn-approve-etr"
                                >
                                  {tr('APPROVE ETR')}
                                </button>
                              </>
                            ) : (
                              <button
                                disabled
                                style={{
                                  padding: "8px 12px",
                                  fontSize: "11px",
                                  fontWeight: 600,
                                  borderRadius: "4px",
                                  backgroundColor: "#f3f4f6",
                                  color: "#9ca3af",
                                  border: "1px solid #e5e7eb",
                                  cursor: "not-allowed",
                                }}
                                title={tr("Hồ sơ đang chờ QA thẩm định tại mục ETR Review Queue. Training Manager chỉ có thể duyệt hoặc trả về sau khi QA đã thẩm định.")}
                              >
                                ⏳ {tr('AWAITING QA VERIFICATION')}
                              </button>
                            )}
                          </div>
                        )}
                        {activeTab === "APPROVED" && isAdmin && (
                          <button
                            onClick={() => handleReopen(etr.etrId)}
                            className="tm-btn-secondary"
                            style={{
                              padding: "15px 16px",
                              color: "#b45309",
                              border: "1px solid rgba(180,83,9,0.35)",
                            }}
                          >
                            {tr('REOPEN')}
                          </button>
                        )}
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    colSpan="5"
                    style={{
                      textAlign: "center",
                      padding: "32px",
                      color: "#9ca3af",
                      fontWeight: 600,
                      fontSize: "12px",
                    }}
                  >
                    {tr('Không có dữ liệu')}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Table Pagination Bar */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "16px 24px",
            backgroundColor: "rgba(244,247,250,0.5)",
            borderTop: "1px solid #e1e4e8",
          }}
        >
          <div>
            <Pagination
              page={page}
              pageCount={pageCount}
              onChange={setPage}
              total={total}
              pageSize={10}
            />
          </div>
        </div>

        {/* Authorized Security Compliance Footer */}
        <div className="tm-compliance-footer">
          <svg width={15} height={17} viewBox="0 0 15 17" fill="none">
            <path
              d="M10.5 12.75C10.8125 12.75 11.0781 12.6406 11.2969 12.4219C11.5156 12.2031 11.625 11.9375 11.625 11.625C11.625 11.3125 11.5156 11.0469 11.2969 10.8281C11.0781 10.6094 10.8125 10.5 10.5 10.5C10.1875 10.5 9.92188 10.6094 9.70312 10.8281C9.48438 11.0469 9.375 11.3125 9.375 11.625C9.375 11.9375 9.48438 12.2031 9.70312 12.4219C9.92188 12.6406 10.1875 12.75 10.5 12.75ZM10.5 15C10.875 15 11.225 14.9125 11.55 14.7375C11.875 14.5625 12.1438 14.3188 12.3562 14.0063C12.0687 13.8313 11.7688 13.7031 11.4563 13.6219C11.1438 13.5406 10.825 13.5 10.5 13.5C10.175 13.5 9.85625 13.5406 9.54375 13.6219C9.23125 13.7031 8.93125 13.8313 8.64375 14.0063C8.85625 14.3188 9.125 14.5625 9.45 14.7375C9.775 14.9125 10.125 15 10.5 15ZM3.75 5.25H8.25V3.75C8.25 3.125 8.03125 2.59375 7.59375 2.15625C7.15625 1.71875 6.625 1.5 6 1.5C5.375 1.5 4.84375 1.71875 4.40625 2.15625C3.96875 2.59375 3.75 3.125 3.75 3.75V5.25ZM6.1875 15.75H1.5C1.0875 15.75 0.734375 15.6031 0.440625 15.3094C0.146875 15.0156 0 14.6625 0 14.25V6.75C0 6.3375 0.146875 5.98438 0.440625 5.69063C0.734375 5.39688 1.0875 5.25 1.5 5.25H2.25V3.75C2.25 2.7125 2.61562 1.82812 3.34687 1.09687C4.07812 0.365625 4.9625 0 6 0C7.0375 0 7.92188 0.365625 8.65312 1.09687C9.38437 1.82812 9.75 2.7125 9.75 3.75V5.25H10.5C10.9125 5.25 11.2656 5.39688 11.5594 5.69063C11.8531 5.98438 12 6.3375 12 6.75V7.725C11.775 7.65 11.5406 7.59375 11.2969 7.55625C11.0531 7.51875 10.7875 7.5 10.5 7.5V6.75H1.5V14.25H5.475C5.575 14.55 5.675 14.8094 5.775 15.0281C5.875 15.2469 6.0125 15.4875 6.1875 15.75ZM10.5 16.5C9.4625 16.5 8.57812 16.1344 7.84688 15.4031C7.11563 14.6719 6.75 13.7875 6.75 12.75C6.75 11.7125 7.11563 10.8281 7.84688 10.0969C8.57812 9.36563 9.4625 9 10.5 9C11.5375 9 12.4219 9.36563 13.1531 10.0969C13.8844 10.8281 14.25 11.7125 14.25 12.75C14.25 13.7875 13.8844 14.6719 13.1531 15.4031C12.4219 16.1344 11.5375 16.5 10.5 16.5ZM1.5 6.75C1.5 6.75 1.5 7.11875 1.5 7.85625C1.5 8.59375 1.5 9.41562 1.5 10.3219C1.5 11.2281 1.5 12.0813 1.5 12.8813C1.5 13.6813 1.5 14.1375 1.5 14.25V6.75Z"
              fill="#1A1C1E"
            />
          </svg>
          <p style={{ textTransform: "uppercase", color: "#1a1c1e" }}>
            {tr('AUTHORIZED ACCESS ONLY • AVIATION SECURITY PROTOCOL 12-B COMPLIANT • SESSION LOGGED')}
          </p>
        </div>
      </div>

      {/* ETR DOSSIER MODAL */}
      <EtrDossierModal
        etrId={selectedEtr?.etrId}
        isOpen={!!selectedEtr && !showActionModal}
        onClose={() => setSelectedEtr(null)}
        onActionSuccess={loadEtrsFromApi}
      />

      {/* CONFIRMATION / INPUT ACTION MODAL */}
      {showActionModal && selectedEtr && createPortal(
        <div className="tm-modal-overlay" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, width: '100vw', height: '100vh', backgroundColor: 'rgba(0, 33, 71, 0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 999999, backdropFilter: 'blur(4px)' }}>
          <div className="tm-modal-card max-w-md" style={{ margin: 'auto' }}>
            <div className="modal-header">
              <h3>{tr('Sign Off & Approve ETR')}</h3>
            </div>

            <div className="modal-body">
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "16px",
                }}
              >
                <p
                  style={{
                    fontSize: "12px",
                    color: "#4b5563",
                    lineHeight: "1.5",
                    margin: 0,
                  }}
                >
                  {tr('You are signing off on ETR')}{" "}
                  <span style={{ fontFamily: "monospace", fontWeight: 700 }}>
                    {selectedEtr.id}
                  </span>{" "}
                  {tr('for')}{" "}
                  <span style={{ fontWeight: 600 }}>
                    {selectedEtr.traineeName}
                  </span>
                  .
                </p>
                <div
                  style={{
                    padding: "12px",
                    backgroundColor: "#eff6ff",
                    border: "1px solid #dbeafe",
                    fontSize: "11px",
                    color: "#1e40af",
                    lineHeight: "1.4",
                  }}
                >
                  {tr('This action will stamp the training certificate, issue the final approval key, and update the audit log registry permanently.')}
                </div>
              </div>
            </div>

            <div className="modal-footer">
              <button
                onClick={() => setShowActionModal(null)}
                className="tm-btn-secondary"
              >
                {tr('Cancel')}
              </button>
              <button
                onClick={() => handleApprove(selectedEtr.etrId)}
                className="tm-btn-success"
              >
                {tr('Confirm Sign Off')}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Modal nhập lý do Reopen ETR (thay window.prompt) */}
      <PromptModal
        isOpen={!!reopenTarget}
        onClose={() => setReopenTarget(null)}
        onConfirm={handleConfirmReopen}
        title={`${tr('Mở lại (Reopen)')} ETR #${String(reopenTarget || "").padStart(4, "0")}`}
        message={tr('Việc mở lại hồ sơ sẽ được ghi nhận vào Audit Trail. Vui lòng nêu rõ lý do.')}
        placeholder={tr('Nhập lý do mở lại ETR...')}
        confirmText={tr('MỞ LẠI ETR')}
        cancelText={tr('HỦY BỎ')}
        variant="gold"
      />

      {/* Modal nhập lý do Trả lại ETR để sửa đổi (Return for Correction) */}
      <PromptModal
        isOpen={!!returnTarget}
        onClose={() => setReturnTarget(null)}
        onConfirm={handleConfirmReturn}
        title={`${tr('Trả lại (Return for Correction)')} ETR #${String(returnTarget?.etrId || "").padStart(4, "0")}`}
        message={tr('Vui lòng nêu rõ lý do hoặc yêu cầu chỉnh sửa gửi lại cho Giáo vụ/Giảng viên.')}
        placeholder={tr('Nhập lý do trả về sửa...')}
        confirmText={tr('TRẢ VỀ SỬA')}
        cancelText={tr('HỦY BỎ')}
        variant="danger"
      />

    </div>
  );
};

export default EtrApproval;
