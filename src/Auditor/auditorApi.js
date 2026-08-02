import { api, API_BASE_URLS } from "../utils/api";

/**
 * Auditor Compliance API Service Layer
 * Encapsulates backend API communication for the Auditor (Audit) role.
 * Read-only: maps real backend responses to the shapes the Auditor UI consumes.
 */

// Helper to extract array from direct Array response or PagedResponse ({ items: [...] } / { Items: [...] })
const extractList = (data) => {
  if (Array.isArray(data)) return data;
  if (data && Array.isArray(data.items)) return data.items;
  if (data && Array.isArray(data.Items)) return data.Items;
  return [];
};

const fmtDate = (d) => {
  if (!d) return "—";
  try {
    const date = new Date(d);
    if (Number.isNaN(date.getTime())) return "—";
    return date.toLocaleString("vi-VN", {
      year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit",
    });
  } catch {
    return "—";
  }
};

const fmtSize = (bytes) => {
  if (!bytes && bytes !== 0) return "—";
  const mb = bytes / (1024 * 1024);
  return `${mb >= 100 ? mb.toFixed(0) : mb.toFixed(1)} MB`;
};

const extractEtrId = (raw) => raw?.etrCourseRecordId ?? raw?.eTRCourseRecordId ?? null;

// In-session export job history (BE has no "list export jobs" endpoint)
const exportJobCache = [];

// --- Lookup data (enrichment cross-references) ---

let lookupPromise = null;
const loadLookup = () => {
  if (!lookupPromise) {
    lookupPromise = Promise.all([
      api.get("/Enrollments").catch(() => []),
      api.get("/Accounts").catch(() => []),
      api.get("/UserProfiles/learners").catch(() => []),
      api.get("/Classes").catch(() => []),
      api.get("/Courses").catch(() => []),
      api.get("/ClassStudents").catch(() => []),
      api.get("/Evidences").catch(() => []),
      api.get("/Attendance").catch(() => []),
      api.get("/AssessmentResults").catch(() => []),
    ]).then(([enrollments, accounts, profiles, classes, courses, classStudents, evidences, attendance, assessmentResults]) => ({
      enrollments: extractList(enrollments),
      accounts: extractList(accounts),
      profiles: extractList(profiles),
      classes: extractList(classes),
      courses: extractList(courses),
      classStudents: extractList(classStudents),
      evidences: extractList(evidences),
      attendance: extractList(attendance),
      assessmentResults: extractList(assessmentResults),
    })).finally(() => {
      lookupPromise = null;
    });
  }
  return lookupPromise;
};

const accountName = (lookup, accountId) => {
  const account = lookup.accounts.find((a) => a.accountId === accountId);
  if (!account) return `Account #${accountId}`;
  const profile = lookup.profiles.find((p) => p.accountId === accountId);
  return profile?.fullName || account.username || `Account #${accountId}`;
};

// --- 1. AuditController APIs (Read-Only) ---

/** GET /api/Audit?page=&pageSize= (Danh sách nhật ký hệ thống) */
export const fetchAuditLogs = async (page = 1, pageSize = 50) => {
  const data = await api.get(`/Audit?page=${page}&pageSize=${pageSize}`);
  return extractList(data).map(normalizeAuditLog);
};

/** GET /api/Audit/{id} (Chi tiết một nhật ký) */
export const fetchAuditLogById = async (id) => {
  const data = await api.get(`/Audit/${id}`);
  return data ? normalizeAuditLog(data) : null;
};

/** GET /api/Audit/search?query= (Tìm kiếm nhật ký; filterModule lọc client-side theo entityName) */
export const searchAuditLogs = async (query = "", filterModule = "All", page = 1, pageSize = 50) => {
  const q = String(query || "").trim();
  const endpoint = `/Audit/search?query=${encodeURIComponent(q)}&page=${page}&pageSize=${pageSize}`;
  let logs = extractList(await api.get(endpoint)).map(normalizeAuditLog);
  if (filterModule && filterModule !== "All") {
    logs = logs.filter((log) =>
      String(log.module || "").toLowerCase().includes(String(filterModule).toLowerCase()),
    );
  }
  return logs;
};

// --- 2. EtrController APIs (Read-Only for Auditor) ---

/** GET /api/Etr (Danh sách ETR, enrich tên học viên / khóa học / lớp) */
export const fetchEtrList = async () => {
  const lookup = await loadLookup();
  const etrs = await api.get("/Etr");
  return extractList(etrs).map((etr) => normalizeEtr(etr, lookup));
};

/** GET /api/Etr/{id} (Chi tiết hồ sơ ETR + bằng chứng / điểm danh / kết quả) */
export const fetchEtrById = async (id) => {
  const lookup = await loadLookup();
  const numericId = String(id).replace(/\D/g, "");
  if (!numericId) return null;
  const data = await api.get(`/Etr/${numericId}`);
  if (!data) return null;
  return normalizeEtr(data, lookup);
};

/** GET /api/Etr/student/{studentId}/current-status (Trạng thái chứng chỉ hiện tại của học viên) */
export const fetchStudentEtrStatus = async (studentId) => {
  const data = await api.get(`/Etr/student/${studentId}/current-status`);
  return extractList(data);
};

/** GET /api/Etr/student/{studentId}/history (Lịch sử ETR của học viên) */
export const fetchStudentEtrHistory = async (studentId) => {
  const data = await api.get(`/Etr/student/${studentId}/history`);
  return extractList(data);
};

// --- 3. ApprovalsController APIs (Read-Only for Auditor) ---

/** GET /api/Approvals (Danh sách yêu cầu phê duyệt; lọc theo ETR nếu có etrId) */
export const fetchApprovals = async (etrId = null) => {
  const lookup = await loadLookup();
  const requests = extractList(await api.get("/Approvals"));
  let filtered = requests;
  if (etrId) {
    const numericId = String(etrId).replace(/\D/g, "");
    if (numericId) {
      filtered = requests.filter((r) => r.etrCourseRecordId === Number(numericId));
    }
  }
  return filtered.map((r) => normalizeApproval(r, lookup));
};

// --- 4. ExportsController APIs (Export Functionalities) ---

const normalizeExportJob = (raw) => ({
  id: raw.exportJobId ?? raw.exportJobID ?? "—",
  name: raw.fileName || "—",
  type: raw.exportType || "—",
  generatedDate: fmtDate(raw.requestedAt),
  generatedBy: raw.requestedByAccountId ? `Account #${raw.requestedByAccountId}` : "—",
  size: "—",
  status: raw.status || "—",
  etrCourseRecordId: raw.etrCourseRecordId || null,
});

/** POST /api/Exports/pdf */
export const exportPdf = async (payload = {}) => {
  const res = await api.post("/Exports/pdf", payload);
  const pkg = normalizeExportJob(res);
  exportJobCache.unshift(pkg);
  return pkg;
};

/** POST /api/Exports/training-package (cần ETRCourseRecordId; tự lấy ETR gần nhất nếu thiếu) */
export const exportTrainingPackage = async (payload = {}) => {
  let body = { ...payload };
  if (!body.ETRCourseRecordId && !body.etrCourseRecordId) {
    const etrs = await api.get("/Etr").catch(() => []);
    const first = extractList(etrs)[0];
    if (first) body.ETRCourseRecordId = extractEtrId(first);
  }
  const res = await api.post("/Exports/training-package", body);
  const pkg = normalizeExportJob(res);
  exportJobCache.unshift(pkg);
  return pkg;
};

/** POST /api/Exports/dashboard */
export const exportDashboard = async (payload = {}) => {
  const res = await api.post("/Exports/dashboard", payload);
  const pkg = normalizeExportJob(res);
  exportJobCache.unshift(pkg);
  return pkg;
};

/** Danh sách export job trong phiên (BE không có endpoint list) */
export const fetchExportJobs = async () => [...exportJobCache];

/** GET /api/Exports/download/{id} — tải file binary qua fetch thuần */
export const downloadExportFile = async (id, fileName = "export.zip") => {
  const token = localStorage.getItem("token");
  for (const baseUrl of API_BASE_URLS) {
    try {
      const response = await fetch(`${baseUrl}/Exports/download/${id}`, {
        method: "GET",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!response.ok) {
        console.warn(`[Auditor API] GET /Exports/download/${id} status ${response.status}`);
        continue;
      }
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = fileName;
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);
      window.URL.revokeObjectURL(url);
      return { success: true, id, fileName };
    } catch (err) {
      console.warn(`[Auditor API] Cannot reach ${baseUrl} for download:`, err.message);
    }
  }
  throw new Error(`Không thể tải file export #${id}.`);
};

// --- 5. DashboardController & ReportsController APIs ---

/** GET /api/Dashboard/stats (KPIs: totalEtrs, completionRatePercent, pendingApprovalCount, ...) */
export const fetchDashboardStats = async () => {
  const data = await api.get("/Dashboard/stats");
  return {
    totalLockedRecords: data?.totalEtrs ?? data?.TotalEtrs ?? "—",
    complianceRate: data?.completionRatePercent ?? data?.CompletionRatePercent ?? "—",
    pendingAudit: data?.pendingApprovalCount ?? data?.PendingApprovalCount ?? "—",
    auditPackagesExported: exportJobCache.length,
  };
};

/** GET /api/Reports/summary (Tổng hợp lớp học + ETR) */
export const fetchReportsSummary = async () => {
  const data = await api.get("/Reports/summary");
  return {
    totalClasses: data?.totalClasses ?? data?.TotalClasses ?? "—",
    totalEtrs: data?.totalEtrs ?? data?.TotalEtrs ?? "—",
    completedCount: data?.completedCount ?? data?.CompletedCount ?? "—",
    completionRatePercent: data?.completionRatePercent ?? data?.CompletionRatePercent ?? "—",
    pendingApprovalCount: data?.pendingApprovalCount ?? data?.PendingApprovalCount ?? "—",
    rejectedCount: data?.rejectedCount ?? data?.RejectedCount ?? "—",
  };
};

// --- Normalization Functions ---

function normalizeAuditLog(raw) {
  return {
    id: raw.auditLogId ?? raw.AuditLogId ?? "—",
    timestamp: "—",
    user: raw.accountId ? `Account #${raw.accountId}` : "—",
    role: "—",
    module: raw.entityName || raw.EntityName || "—",
    action: raw.actionType || raw.ActionType || "—",
    target: raw.recordId ?? raw.RecordId ?? "—",
    result: "SUCCESS",
    details: raw.description || raw.Description || `${raw.actionType || ""} ${raw.entityName || ""} #${raw.recordId ?? ""}`.trim(),
  };
}

function normalizeEtr(raw, lookup) {
  const etrId = extractEtrId(raw);
  const enrollment = lookup.enrollments.find((e) => e.enrollmentId === raw.enrollmentId);
  const account = enrollment
    ? lookup.accounts.find((a) => a.accountId === enrollment.accountId)
    : null;
  const profile = account
    ? lookup.profiles.find((p) => p.accountId === account.accountId)
    : null;
  const cls = enrollment
    ? lookup.classes.find((c) => c.classId === enrollment.classId)
    : null;
  const course = cls ? lookup.courses.find((c) => c.courseId === cls.courseId) : null;
  const classStudent = account
    ? lookup.classStudents.find((cs) => cs.accountId === account.accountId && cs.classId === enrollment?.classId)
    : null;

  // Evidence files linked to this ETR record (if the entity carries the FK) or uploaded by the learner's account
  const evidences = lookup.evidences.filter(
    (ev) =>
      extractEtrId(ev) === etrId ||
      (account && ev.uploadedBy === account.accountId),
  );

  // Attendance for the learner's ClassStudent
  const attendanceList = classStudent
    ? lookup.attendance
        .filter((a) => a.classStudentId === classStudent.classStudentId)
        .map((a) => ({
          session: a.sessionId,
          date: fmtDate(a.recordedAt),
          topic: `Session #${a.sessionId}`,
          duration: "—",
          status: a.status || "PRESENT",
        }))
    : [];

  // Assessment results for the learner's account
  const subjectResults = account
    ? lookup.assessmentResults
        .filter((ar) => ar.accountId === account.accountId)
        .map((ar) => ({
          code: `ASM-${String(ar.assessmentId).padStart(4, "0")}`,
          name: `Assessment #${ar.assessmentId}`,
          passScore: "—",
          score: ar.score ?? "—",
          result: ar.resultStatus || "—",
          instructor: ar.gradedByAccountId ? accountName(lookup, ar.gradedByAccountId) : "—",
        }))
    : [];
  const scored = subjectResults.filter((s) => typeof s.score === "number" && !Number.isNaN(s.score));
  const overallScore = scored.length
    ? (scored.reduce((sum, s) => sum + s.score, 0) / scored.length).toFixed(1)
    : "—";

  return {
    id: `#ETR-${String(etrId ?? "").padStart(4, "0")}`,
    etrCourseRecordId: etrId,
    enrollmentId: raw.enrollmentId,
    learnerId: profile?.userCode || account?.username || "—",
    learnerName: profile?.fullName || account?.username || (account ? `Account #${account.accountId}` : "—"),
    learnerRole: "—",
    learnerDepartment: "—",
    courseId: course ? `#${course.courseCode || course.courseId}` : (cls ? `#${cls.courseId}` : "—"),
    courseName: course?.courseName || "—",
    classId: cls ? `#${cls.classCode || cls.classId}` : "—",
    className: cls?.className || "—",
    completionDate: fmtDate(raw.completedAt),
    lockedDate: fmtDate(raw.verifiedAt),
    approvedBy: "—",
    qaVerifiedBy: "—",
    academicStaff: "—",
    instructor: "—",
    status: raw.isLocked ? "Locked & Compliant" : (raw.status || "—"),
    isLocked: !!raw.isLocked,
    verificationHash: "—",
    totalSessions: "—",
    attendedSessions: attendanceList.length,
    attendancePercentage: attendanceList.length ? 100 : "—",
    overallScore,
    resultStatus: "—",
    subjects: subjectResults,
    attendanceList,
    evidences: evidences.map((ev) => ({
      id: `EVD-${String(ev.evidenceFileId ?? "").padStart(4, "0")}`,
      name: ev.fileName || "—",
      size: fmtSize(ev.fileSize),
      uploadedAt: fmtDate(ev.uploadedAt),
      uploadedBy: ev.uploadedBy ? accountName(lookup, ev.uploadedBy) : "—",
      type: ev.mimeType?.startsWith("image/") ? "PHOTO" : ev.fileExtension?.toUpperCase() || "—",
    })),
  };
}

function normalizeApproval(raw, lookup) {
  return {
    stage: raw.approvalRequestId ?? "—",
    roleTitle: raw.currentStatus || "—",
    user: raw.submittedBy ? accountName(lookup, raw.submittedBy) : "—",
    role: "—",
    timestamp: fmtDate(raw.submittedAt),
    action: raw.currentStatus || "—",
    status: raw.currentStatus || "—",
    hash: "—",
  };
}
