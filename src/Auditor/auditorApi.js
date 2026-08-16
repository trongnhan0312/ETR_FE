import { api, getApiBaseLabel, getActiveApiBaseUrl } from "../utils/api";

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

// In-session export job history — dùng để hiển thị ngay job vừa export trong phiên
// (có thể chưa kịp xuất hiện ở GET /Exports), gộp cùng danh sách thật từ backend.
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
      api.get("/Evidences").catch(() => []),
      api.get("/Attendance").catch(() => []),
      api.get("/AssessmentResults").catch(() => []),
      api.get("/Approvals").catch(() => []),
      api.get("/Audit?page=1&pageSize=100").catch(() => []),
    ]).then(([enrollments, accounts, profiles, classes, courses, evidences, attendance, assessmentResults, approvals, auditLogs]) => ({
      enrollments: extractList(enrollments),
      accounts: extractList(accounts),
      profiles: extractList(profiles),
      classes: extractList(classes),
      courses: extractList(courses),
      evidences: extractList(evidences),
      attendance: extractList(attendance),
      assessmentResults: extractList(assessmentResults),
      approvals: extractList(approvals),
      auditLogs: extractList(auditLogs),
    })).finally(() => {
      lookupPromise = null;
    });
  }
  return lookupPromise;
};

// Ưu tiên UserProfiles/learners (Audit đã được phép truy cập) — chỉ fallback qua Accounts khi không
// có profile, để tên học viên/người phê duyệt hiển thị được ngay cả khi /Accounts chưa mở cho Audit.
const accountName = (lookup, accountId) => {
  if (!accountId) return "—";
  const profile = lookup.profiles.find((p) => p.accountId === accountId);
  if (profile?.fullName) return profile.fullName;
  const account = lookup.accounts.find((a) => a.accountId === accountId);
  return account?.username || `Account #${accountId}`;
};

// --- 1. AuditController APIs (Read-Only) ---

/** GET /api/Audit?page=&pageSize= (Danh sách nhật ký hệ thống) */
export const fetchAuditLogs = async (page = 1, pageSize = 50) => {
  const lookup = await loadLookup();
  const data = await api.get(`/Audit?page=${page}&pageSize=${pageSize}`);
  return extractList(data).map((log) => normalizeAuditLog(log, lookup));
};

/** GET /api/Audit/{id} (Chi tiết một nhật ký) */
export const fetchAuditLogById = async (id) => {
  const lookup = await loadLookup();
  const data = await api.get(`/Audit/${id}`);
  return data ? normalizeAuditLog(data, lookup) : null;
};

/**
 * GET /api/Audit/search?query= (Tìm kiếm nhật ký; filterModule lọc theo entityName)
 *
 * LƯU Ý (bug đã sửa): BE deploy yêu cầu `query` BẮT BUỘC — gọi `/Audit/search?query=`
 * (rỗng) sẽ trả 400 "The query field is required." → trang audit-logs trống toàn bộ.
 * → Khi KHÔNG có từ khóa, dùng `/Audit?page=&pageSize=` (list thường, trả toàn bộ log);
 *   chỉ gọi `/Audit/search` khi người dùng thực sự nhập chữ.
 */
export const searchAuditLogs = async (query = "", filterModule = "All", page = 1, pageSize = 50) => {
  const lookup = await loadLookup();
  const q = String(query || "").trim();
  const endpoint = q
    ? `/Audit/search?query=${encodeURIComponent(q)}&page=${page}&pageSize=${pageSize}`
    : `/Audit?page=${page}&pageSize=${pageSize}`;
  let logs = extractList(await api.get(endpoint)).map((log) => normalizeAuditLog(log, lookup));
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

// Trích số thật từ mọi định dạng id người dùng có thể truyền: số thuần (891),
// chuỗi "ETR-2026-0891", hoặc id hiển thị "#ETR-0891". Trả về null nếu không có số nào.
const extractNumericId = (value) => {
  const digits = String(value ?? "").replace(/\D/g, "");
  return digits ? Number(digits) : null;
};

// Đồng bộ id ETR từ payload ở MỌI kiểu viết (ETRCourseRecordId / etrCourseRecordId / etrId)
// — trước đây chỉ nhận 2 key đầu nên payload { etrId } bị bỏ qua và export luôn rơi vào
// fallback "ETR Completed đầu tiên", khiến file export ra là hồ sơ SAI học viên (và thiếu
// mốc thời gian validation của đúng hồ sơ đang xem).
const resolveRequestedEtrId = (body) => {
  const direct = body?.ETRCourseRecordId ?? body?.etrCourseRecordId;
  if (direct != null && direct !== "") return extractNumericId(direct);
  return extractNumericId(body?.etrId);
};

/** POST /api/Exports/pdf */
export const exportPdf = async (payload = {}) => {
  let body = { ...payload };
  const requestedId = resolveRequestedEtrId(body);
  if (requestedId == null) {
    // Fallback chỉ khi payload KHÔNG nói rõ export hồ sơ nào — tự chọn ETR Completed đầu tiên.
    const etrs = await api.get("/Etr").catch(() => []);
    const firstCompleted = extractList(etrs).find(
      (etr) => String(etr.status || "").toLowerCase() === "completed",
    );
    const fallback = extractList(etrs)[0];
    body.ETRCourseRecordId = extractEtrId(firstCompleted || fallback);
  } else {
    body.ETRCourseRecordId = requestedId;
  }
  const res = await api.post("/Exports/pdf", body);
  const pkg = normalizeExportJob(res);
  exportJobCache.unshift(pkg);
  return pkg;
};

/** POST /api/Exports/training-package (cần ETRCourseRecordId; tự chọn ETR Completed đầu tiên nếu thiếu) */
export const exportTrainingPackage = async (payload = {}) => {
  let body = { ...payload };
  const requestedId = resolveRequestedEtrId(body);
  if (requestedId == null) {
    const etrs = await api.get("/Etr").catch(() => []);
    const firstCompleted = extractList(etrs).find(
      (etr) => String(etr.status || "").toLowerCase() === "completed",
    );
    const fallback = extractList(etrs)[0];
    body.ETRCourseRecordId = extractEtrId(firstCompleted || fallback);
  } else {
    body.ETRCourseRecordId = requestedId;
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

/**
 * GET /api/Exports?page=&pageSize= — danh sách export job THẬT (phân trang, mới nhất trước).
 * Gộp thêm các job vừa export trong phiên (exportJobCache) để hiển thị tức thì.
 */
export const fetchExportJobs = async (page = 1, pageSize = 100) => {
  try {
    const data = await api.get(`/Exports?page=${page}&pageSize=${pageSize}`);
    const jobs = extractList(data).map(normalizeExportJob);
    const seen = new Set(jobs.map((j) => j.id));
    exportJobCache.forEach((j) => {
      if (!seen.has(j.id)) jobs.unshift(j);
    });
    return jobs;
  } catch (err) {
    console.warn("Không lấy được danh sách export job từ GET /Exports:", err.message);
    return [...exportJobCache];
  }
};

/** GET /api/Exports/download/{id} — tải file binary qua fetch thuần (dùng đúng base URL đã khóa) */
export const downloadExportFile = async (id, fileName = "export.zip") => {
  const token = localStorage.getItem("token");
  const baseUrl = getActiveApiBaseUrl();
  try {
    const response = await fetch(`${baseUrl}/Exports/download/${id}`, {
      method: "GET",
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (!response.ok) {
      console.warn(`[Auditor API] GET /Exports/download/${id} status ${response.status}`);
      throw new Error(`Download failed with status ${response.status}`);
    }
    console.log(`[Auditor API] ✅ Đang dùng API ${getApiBaseLabel(baseUrl)} để tải export #${id}`);
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
    console.warn(`[Auditor API] Không tới được ${baseUrl} cho download:`, err.message);
    throw new Error(`Không thể tải file export #${id}.`, { cause: err });
  }
};

// --- 5. DashboardController & ReportsController APIs ---

/** GET /api/Dashboard/stats (KPIs: totalEtrs, completionRatePercent, pendingApprovalCount, ...) */
export const fetchDashboardStats = async () => {
  const data = await api.get("/Dashboard/stats");
  const exportJobs = await fetchExportJobs();
  return {
    totalLockedRecords: data?.totalEtrs ?? data?.TotalEtrs ?? "—",
    complianceRate: data?.completionRatePercent ?? data?.CompletionRatePercent ?? "—",
    pendingAudit: data?.pendingApprovalCount ?? data?.PendingApprovalCount ?? "—",
    auditPackagesExported: exportJobs.length,
  };
};

/** GET /api/Dashboard/stats (Tổng hợp; not used by live pages, kept for tests/tools) */
export const fetchReportsSummary = async () => {
  const data = await api.get("/Dashboard/stats");
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

function normalizeAuditLog(raw, lookup) {
  return {
    id: raw.auditLogId ?? raw.AuditLogId ?? "—",
    etrCourseRecordId: raw.etrRecordId ?? raw.ETRRecordId ?? null,
    timestamp: fmtDate(raw.createdAt ?? raw.CreatedAt),
    accountId: raw.accountId ?? raw.AccountId ?? null,
    user: raw.accountId
      ? accountName(lookup || {}, raw.accountId)
      : "—",
    role: "—",
    module: raw.entityName || raw.EntityName || "—",
    action: raw.actionType || raw.ActionType || "—",
    target: raw.recordId ?? raw.RecordId ?? "—",
    oldValue: raw.oldValue || raw.OldValue || "—",
    newValue: raw.newValue || raw.NewValue || "—",
    result: "SUCCESS",
    details: raw.description || raw.Description || `${raw.actionType || ""} ${raw.entityName || ""} #${raw.recordId ?? ""}`.trim(),
  };
}

function normalizeEtr(raw, lookup) {
  const etrId = extractEtrId(raw);
  const enrollment = lookup.enrollments.find((e) => e.enrollmentId === raw.enrollmentId);
  // Dùng trực tiếp AccountId từ enrollment (Audit đã được phép GET /Enrollments + /UserProfiles/learners)
  // để tên học viên hiển thị được kể cả khi /Accounts chưa mở cho role Audit.
  const accountId = enrollment?.accountId ?? null;
  const profile = accountId
    ? lookup.profiles.find((p) => p.accountId === accountId)
    : null;
  const account = accountId
    ? lookup.accounts.find((a) => a.accountId === accountId)
    : null;
  const cls = enrollment
    ? lookup.classes.find((c) => c.classId === enrollment.classId)
    : null;
  const course = cls ? lookup.courses.find((c) => c.courseId === cls.courseId) : null;

  // Class không còn InstructorAccountId cấp lớp — Giảng viên được phân công theo Môn học
  // (InstructorAssignments). Lấy danh sách tên giảng viên từ các assignment.
  const classInstructorNames = (() => {
    const assignments = Array.isArray(cls?.instructorAssignments) ? cls.instructorAssignments : [];
    const names = assignments
      .filter((a) => a.instructorAccountId)
      .map((a) => accountName(lookup, a.instructorAccountId));
    return names.length > 0 ? names.join(', ') : "—";
  })();

  // Người phê duyệt cuối: ưu tiên AuditLog ActionType=APPROVE (ghi bởi TrainingManager/Admin khi chốt),
  // fallback CurrentApproverId → SubmittedBy trên ApprovalRequest của ETR này. Lưu ý: SubmittedBy là
  // NGƯỜI GỬI yêu cầu (thường là Instructor submit), không phải người phê duyệt thật — chỉ là fallback
  // tốt hơn "—" khi không tìm thấy APPROVE log (vd: ETR cũ trượt khỏi 100 log gần nhất).
  const approveLog = (lookup.auditLogs || []).find(
    (l) => l.etrRecordId === etrId && String(l.actionType || "").toUpperCase() === "APPROVE",
  );
  const verifyLog = (lookup.auditLogs || []).find(
    (l) => l.etrRecordId === etrId && String(l.actionType || "").toUpperCase() === "VERIFY",
  );
  const approval = (lookup.approvals || []).find((r) => r.etrCourseRecordId === etrId);
  const resolvedApprovedBy = approveLog?.accountId
    ? accountName(lookup, approveLog.accountId)
    : approval?.currentApproverId
      ? accountName(lookup, approval.currentApproverId)
      : approval?.submittedBy
        ? accountName(lookup, approval.submittedBy)
        : "—";
  const resolvedQaVerifiedBy = verifyLog?.accountId
    ? accountName(lookup, verifyLog.accountId)
    : "—";

  // Evidence files linked to this ETR record (if the entity carries the FK) or uploaded by the learner's account
  const evidences = lookup.evidences.filter(
    (ev) =>
      extractEtrId(ev) === etrId ||
      (accountId && ev.uploadedByAccountId === accountId),
  );

  // Attendance for the learner's Enrollment
  const attendanceList = enrollment
    ? lookup.attendance
        .filter((a) => a.enrollmentId === enrollment.enrollmentId)
        .map((a) => ({
          session: a.sessionId,
          date: fmtDate(a.recordedAt),
          topic: `Session #${a.sessionId}`,
          duration: "—",
          status: a.status || "PRESENT",
        }))
    : [];

  // Assessment results for the learner's account
  const subjectResults = accountId
    ? lookup.assessmentResults
        .filter((ar) => ar.accountId === accountId)
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
    learnerId: profile?.userCode || account?.username || (accountId ? `Account #${accountId}` : "—"),
    learnerName: profile?.fullName || account?.username || (accountId ? `Account #${accountId}` : "—"),
    learnerRole: "—",
    learnerDepartment: "—",
    courseId: course ? `#${course.courseCode || course.courseId}` : (cls ? `#${cls.courseId}` : "—"),
    courseName: course?.courseName || "—",
    classId: cls ? `#${cls.classCode || cls.classId}` : "—",
    className: cls?.className || "—",
    // Mốc thời gian validation của hồ sơ (hiển thị trên màn chi tiết + đối chiếu với file export)
    submittedAt: fmtDate(raw.submittedAt),
    verifiedAt: fmtDate(raw.verifiedAt),
    completedAt: fmtDate(raw.completedAt),
    completionDate: fmtDate(raw.completedAt),
    lockedDate: fmtDate(raw.verifiedAt),
    // Raw ISO (chưa format) — dùng cho biểu đồ xu hướng theo tháng trên Dashboard
    submittedAtRaw: raw.submittedAt ?? null,
    verifiedAtRaw: raw.verifiedAt ?? null,
    completedAtRaw: raw.completedAt ?? null,
    returnedAtRaw: raw.updatedAt ?? null,
    statusRaw: raw.status || null,
    approvedBy: resolvedApprovedBy,
    qaVerifiedBy: resolvedQaVerifiedBy,
    academicStaff: "—",
    instructor: classInstructorNames,
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
      uploadedBy: ev.uploadedByAccountId ? accountName(lookup, ev.uploadedByAccountId) : "—",
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
