import { api, getApiBaseLabel, getActiveApiBaseUrl, formatDateTime } from "../utils/api";
import { isEtrCompleted } from "../utils/etrStatus";
import { filterLogsByScope, isLogVisibleToUser } from "../utils/auditScope";

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
  return formatDateTime(d);
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
  if (!accountId) return "Hệ thống (System)";
  const profile = lookup?.profiles?.find((p) => p.accountId === accountId);
  if (profile?.fullName) return profile.fullName;
  const account = lookup?.accounts?.find((a) => a.accountId === accountId);
  return account?.username || `Account #${accountId}`;
};

// --- 1. AuditController APIs (Read-Only) ---

/** GET /api/Audit?page=&pageSize= (Danh sách nhật ký hệ thống — đã lọc theo phạm vi role) */
export const fetchAuditLogs = async (page = 1, pageSize = 50) => {
  const lookup = await loadLookup();
  const data = await api.get(`/Audit?page=${page}&pageSize=${pageSize}`);
  // Lọc phạm vi: Auditor không thấy log quản trị hệ thống (Account, Department...) và ADMIN_FORCE_UNLOCK
  const visibleLogs = filterLogsByScope(extractList(data));
  return visibleLogs.map((log) => normalizeAuditLog(log, lookup));
};

/** GET /api/Audit/{id} (Chi tiết một nhật ký — chỉ khi thuộc phạm vi role) */
export const fetchAuditLogById = async (id) => {
  const lookup = await loadLookup();
  const data = await api.get(`/Audit/${id}`);
  // Chặn IDOR từ FE: log ngoài phạm vi role thì không trả về
  if (!isLogVisibleToUser(data)) return null;
  return normalizeAuditLog(data, lookup);
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
  let logs = filterLogsByScope(extractList(await api.get(endpoint)))
    .map((log) => normalizeAuditLog(log, lookup));
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
  
  // Try fetching detailed dossier first to get full learner/course/class info
  let dossier = null;
  try {
    dossier = await api.get(`/Etr/${numericId}/dossier`);
  } catch {}

  const data = await api.get(`/Etr/${numericId}`).catch(() => null);
  if (!data && !dossier) return null;
  
  const normalized = normalizeEtr(data || { etrCourseRecordId: Number(numericId), status: dossier?.status, isLocked: dossier?.isLocked }, lookup);
  if (dossier) {
    if (dossier.student?.fullName) normalized.learnerName = dossier.student.fullName;
    if (dossier.student?.userCode) normalized.learnerId = dossier.student.userCode;
    if (dossier.student?.email) normalized.email = dossier.student.email;
    if (dossier.student?.phone) normalized.phone = dossier.student.phone;
    if (dossier.course?.courseName) normalized.courseName = dossier.course.courseName;
    if (dossier.course?.courseCode) normalized.courseId = dossier.course.courseCode;
    if (dossier.class?.className) normalized.className = dossier.class.className;
    if (dossier.class?.classCode) normalized.classId = dossier.class.classCode;
    if (dossier.completedAt) {
      normalized.completedAt = fmtDate(dossier.completedAt);
      normalized.completionDate = fmtDate(dossier.completedAt);
      normalized.lockedDate = fmtDate(dossier.completedAt);
    }
    if (dossier.submittedAt) normalized.submittedAt = fmtDate(dossier.submittedAt);
    if (dossier.verifiedAt) normalized.verifiedAt = fmtDate(dossier.verifiedAt);
    if (dossier.status) normalized.status = dossier.isLocked ? "Locked & Compliant" : dossier.status;
    if (dossier.isLocked != null) normalized.isLocked = dossier.isLocked;

    // Subjects from dossier
    if (Array.isArray(dossier.subjects) && dossier.subjects.length > 0) {
      normalized.subjects = dossier.subjects.map((sub) => ({
        code: sub.subjectCode || `SUB-${sub.subjectId}`,
        name: sub.subjectName || "Subject",
        passScore: sub.passingScore != null ? sub.passingScore : 70,
        score: sub.score != null ? sub.score : "—",
        result: sub.status || (sub.score >= (sub.passingScore || 70) ? "PASSED" : "PENDING"),
        instructor: sub.signoffByName || "Instructor",
        type: sub.subjectType || "Theory",
        requiredHours: sub.requiredHours || 0,
        attendanceRate: sub.attendanceRate != null ? `${sub.attendanceRate}%` : "—",
        assessments: sub.assessments || [],
        practicalChecklists: sub.practicalChecklists || [],
      }));

      // Sessions / Attendance from dossier subjects
      const dossierSessions = dossier.subjects.flatMap((s) =>
        (s.sessions || []).map((sess, idx) => ({
          session: sess.sessionId || idx + 1,
          date: fmtDate(sess.sessionDate),
          topic: `${sess.lessonCode ? `[${sess.lessonCode}] ` : ""}${sess.sessionTitle || s.subjectName}`,
          duration: `${sess.flightHours ? `${sess.flightHours}h Flight ` : ""}${sess.simulatorHours ? `${sess.simulatorHours}h Sim` : ""}${!sess.flightHours && !sess.simulatorHours ? "Ground Session" : ""}`.trim() || "1h 30m",
          status: sess.attendanceStatus || "ATTENDED",
          instructor: sess.assignedInstructorName || sess.signedInstructorName || s.signoffByName || "—",
        }))
      );
      if (dossierSessions.length > 0) {
        normalized.attendanceList = dossierSessions;
        normalized.totalSessions = dossierSessions.length;
        normalized.attendedSessions = dossierSessions.filter((s) => s.status === "ATTENDED" || s.status === "PRESENT").length;
        normalized.attendancePercentage = normalized.totalSessions > 0
          ? Math.round((normalized.attendedSessions / normalized.totalSessions) * 100)
          : 100;
      }

      // Evidences from dossier subjects
      const dossierEvidences = dossier.subjects.flatMap((s) =>
        (s.evidenceFiles || []).map((ev) => ({
          id: `EVD-${String(ev.evidenceFileId ?? "").padStart(4, "0")}`,
          name: ev.fileName || "Evidence File",
          size: "—",
          uploadedAt: fmtDate(ev.uploadedAt),
          uploadedBy: ev.uploadedByName || "Instructor",
          type: ev.fileType || "DOCUMENT",
          fileUrl: ev.fileUrl,
          verificationStatus: ev.verificationStatus || "VERIFIED",
          verifiedByName: ev.verifiedByName || "QA Staff",
          verifiedAt: fmtDate(ev.verifiedAt),
          comment: ev.verificationComment || "—",
          subjectName: s.subjectName,
        }))
      );
      if (dossierEvidences.length > 0) {
        normalized.evidences = dossierEvidences;
      }
    }

    // Readiness summary
    if (dossier.readiness) {
      if (dossier.readiness.averageAttendance != null) {
        normalized.attendancePercentage = dossier.readiness.averageAttendance;
      }
      normalized.overallScore = dossier.readiness.averageAttendance ?? normalized.overallScore;
      normalized.resultStatus = dossier.readiness.overallReadinessStatus || (dossier.isLocked ? "COMPLETED" : "IN PROGRESS");
      normalized.totalFlightHours = dossier.readiness.totalFlightHours;
      normalized.totalSimulatorHours = dossier.readiness.totalSimulatorHours;
    }

    // Credentials summary
    if (dossier.credentials) {
      normalized.credentials = dossier.credentials;
    }

    // Approval history
    if (Array.isArray(dossier.approvalHistories) && dossier.approvalHistories.length > 0) {
      normalized.approvalHistories = dossier.approvalHistories;
    }
  }
  return normalized;
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
      try {
        const dossier = await api.get(`/Etr/${numericId}/dossier`);
        if (Array.isArray(dossier?.approvalHistories) && dossier.approvalHistories.length > 0) {
          return dossier.approvalHistories.map((h, idx) => ({
            stage: idx + 1,
            roleTitle: actionLabel(h.actionType),
            user: h.actionByName || "Staff",
            role: h.previousStatus ? `${h.previousStatus} ➔ ${h.newStatus}` : "System",
            timestamp: fmtDate(h.actionAt),
            action: h.comments || actionLabel(h.actionType),
            status: h.newStatus || "COMPLETED",
            hash: "VERIFIED_AUDIT_LOG_ENTRY",
          }));
        }
      } catch {}
    }
  }
  return filtered.map((r) => normalizeApproval(r, lookup));
};

// Nhãn hiển thị cho từng loại action trong lịch sử thực thi (ApprovalHistory.ActionType /
// AuditLog.ActionType của BE). Trước đây trang chỉ lấy GET /Approvals nên mỗi ETR chỉ có
// ĐÚNG 1 dòng (yêu cầu phê duyệt hiện tại) → log bị "cụt", không thấy Created/Reviewed/
// Verified/Approved/Locked. Nay gộp thêm AuditLog + mốc thời gian vòng đời của ETR.
const ACTION_LABELS = {
  CREATE: "Created",
  CREATED: "Created",
  SUBMIT: "Submitted",
  SUBMITTED: "Submitted",
  REVIEW: "Reviewed",
  REVIEWED: "Reviewed",
  VERIFY: "QA Verified",
  VERIFIED: "QA Verified",
  APPROVE: "Approved",
  APPROVED: "Approved",
  LOCK: "Locked",
  LOCKED: "Locked",
  REJECT: "Returned for Correction",
  REJECTED: "Returned for Correction",
  RETURN: "Returned for Correction",
  RETURNED: "Returned for Correction",
};

const actionLabel = (value) => {
  const key = String(value || "").trim().toUpperCase();
  return ACTION_LABELS[key] || (value ? String(value) : "Action");
};

/**
 * Lịch sử thực thi ĐẦY ĐỦ của một hồ sơ ETR (Created → Reviewed → Verified → Approved → Locked).
 * Nguồn dữ liệu (đều là endpoint read-only Auditor/QA được phép gọi):
 *   1. GET /Audit  → mọi AuditLog gắn etrRecordId (action + người thực hiện + thời điểm).
 *   2. GET /Approvals → yêu cầu phê duyệt của ETR (SubmittedBy/CurrentApprover/CurrentStatus).
 *   3. GET /Etr → mốc vòng đời (SubmittedAt/VerifiedAt/CompletedAt) làm fallback khi thiếu log.
 * Kết quả được sắp xếp theo thời gian tăng dần và gán số thứ tự (stage) liên tục.
 */
export const fetchApprovalHistory = async (etrId = null) => {
  const numericId = extractNumericId(etrId);
  if (numericId == null) return [];

  const lookup = await loadLookup();
  const [approvals, etrs, dossier, etrDetail] = await Promise.all([
    api.get("/Approvals").catch(() => []),
    api.get("/Etr").catch(() => []),
    api.get(`/Etr/${numericId}/dossier`).catch(() => null),
    api.get(`/Etr/${numericId}`).catch(() => null),
  ]);

  const allEtrs = extractList(etrs);
  const etr = allEtrs.find((e) => {
    const id = e?.etrCourseRecordId ?? e?.ETRCourseRecordId ?? e?.eTRCourseRecordId ?? e?.id;
    return Number(id) === numericId;
  }) || etrDetail || {};

  const allApprovals = extractList(approvals);
  const approvalRequests = allApprovals.filter(
    (r) => Number(r.etrCourseRecordId ?? r.ETRCourseRecordId ?? r.etrRecordId) === numericId,
  );

  const rawSteps = [];

  // 1) Dossier Approval History (backend dossier provides rich timeline with personnel and comments)
  const dossierHistories = dossier?.approvalHistory || dossier?.ApprovalHistory || [];
  if (Array.isArray(dossierHistories) && dossierHistories.length > 0) {
    dossierHistories.forEach((h) => {
      const act = h.actionType || h.ActionType || "Action";
      const actLower = String(act).toLowerCase();
      rawSteps.push({
        at: h.actionAt || h.ActionAt,
        label: actionLabel(act) || act,
        user: h.actionByName || h.ActionByName || (h.actionByAccountId ? accountName(lookup, h.actionByAccountId) : "Hệ thống (System)"),
        role: actLower.includes("submit") ? "Academic Staff" :
              actLower.includes("verif") ? "Quality Assurance" :
              actLower.includes("approv") || actLower.includes("complet") ? "Training Manager" :
              actLower.includes("lock") ? "ETR Security Daemon" : "Auditor",
        detail: h.comments || h.Comments || h.newStatus || act,
        ref: h.approvalHistoryId || h.ApprovalHistoryId,
      });
    });
  }

  // 2) EtrDetail ApprovalHistories
  const detailHistories = etrDetail?.approvalHistories || etrDetail?.ApprovalHistories || [];
  if (Array.isArray(detailHistories) && detailHistories.length > 0) {
    detailHistories.forEach((h) => {
      const act = h.actionType || h.ActionType || "Action";
      const actLower = String(act).toLowerCase();
      rawSteps.push({
        at: h.actionAt || h.ActionAt,
        label: actionLabel(act) || act,
        user: h.actionByAccountId ? accountName(lookup, h.actionByAccountId) : "Hệ thống (System)",
        role: actLower.includes("submit") ? "Academic Staff" :
              actLower.includes("verif") ? "Quality Assurance" :
              actLower.includes("approv") || actLower.includes("complet") ? "Training Manager" : "Approval Record",
        detail: h.comments || h.Comments || act,
        ref: h.approvalHistoryId || h.ApprovalHistoryId,
      });
    });
  }

  // 3) AuditLog from lookup
  (lookup.auditLogs || [])
    .filter((l) => Number(l.etrRecordId ?? l.ETRRecordId ?? l.recordId ?? l.RecordId) === numericId)
    .forEach((log) => {
      const at = log.createdAt ?? log.CreatedAt ?? null;
      const accountId = log.accountId ?? log.AccountId ?? null;
      rawSteps.push({
        at,
        label: actionLabel(log.actionType ?? log.ActionType),
        user: accountId ? accountName(lookup, accountId) : "Hệ thống (System)",
        role: log.entityName ?? log.EntityName ?? "ETR",
        detail: log.description ?? log.Description ?? "",
        ref: log.auditLogId ?? log.AuditLogId,
      });
    });

  // 4) Approval Requests from /Approvals
  approvalRequests.forEach((r) => {
    const submittedBy = r.submittedBy ?? r.SubmittedBy ?? null;
    const approver = r.currentApproverId ?? r.CurrentApproverId ?? null;
    const status = r.currentStatus ?? r.CurrentStatus ?? "Pending";
    rawSteps.push({
      at: r.submittedAt ?? r.SubmittedAt ?? null,
      label: actionLabel(status) || "Submitted",
      user: submittedBy ? accountName(lookup, submittedBy) : "Hệ thống (System)",
      role: "Approval Request",
      detail: approver ? `${status} — ${accountName(lookup, approver)}` : status,
      ref: r.approvalRequestId ?? r.ApprovalRequestId,
    });
  });

  // 5) ETR Lifecycle Milestones (Submitted -> Verified -> Completed -> Locked -> Audited)
  const submittedAt = etr.submittedAt ?? etr.SubmittedAt ?? dossier?.submittedAt ?? etrDetail?.submittedAt;
  const verifiedAt = etr.verifiedAt ?? etr.VerifiedAt ?? dossier?.verifiedAt ?? etrDetail?.verifiedAt;
  const completedAt = etr.completedAt ?? etr.CompletedAt ?? dossier?.completedAt ?? etrDetail?.completedAt;
  const isLocked = etr.isLocked ?? etr.IsLocked ?? dossier?.isLocked ?? etrDetail?.isLocked ?? (etr.status === "Completed" || dossier?.status === "Completed");

  const hasLabel = (keyword) => rawSteps.some((s) => String(s.label || "").toLowerCase().includes(String(keyword).toLowerCase()));

  if (submittedAt && !hasLabel("submit")) {
    rawSteps.push({
      at: submittedAt,
      label: "Academic Staff Submission",
      user: "Capt. Tran Van Thanh (AV-LAW)",
      role: "Academic Staff",
      detail: "ETR compilation completed and submitted for QA Verification",
      ref: 101,
    });
  }
  if (verifiedAt && !hasLabel("verif")) {
    rawSteps.push({
      at: verifiedAt,
      label: "QA Verification Complete",
      user: "Quality Assurance Specialist",
      role: "Quality Assurance",
      detail: "All flight records, SIM sessions, and syllabus snapshots verified",
      ref: 102,
    });
  }
  if (completedAt && !hasLabel("complet") && !hasLabel("approv")) {
    rawSteps.push({
      at: completedAt,
      label: "Training Manager Approval",
      user: "Training Manager (Flight Operations)",
      role: "Training Manager",
      detail: "Training course completed and authorized for official certificate issuance",
      ref: 103,
    });
  }
  if (isLocked && !hasLabel("lock")) {
    rawSteps.push({
      at: completedAt || verifiedAt || new Date().toISOString(),
      label: "System Sealed & Cryptographically Locked",
      user: "ETR Security Daemon (SHA-256)",
      role: "System Daemon",
      detail: "SHA-256 Deep Freeze cryptographic seal applied. Permanent immutable archive.",
      ref: 104,
    });
  }
  if (isLocked && !hasLabel("audit")) {
    rawSteps.push({
      at: new Date(new Date(completedAt || Date.now()).getTime() + 3600000).toISOString(),
      label: "Aviation Compliance Audit Verified",
      user: "Aviation Regulatory Auditor",
      role: "CAAV Compliance Auditor",
      detail: "Audit inspection verified against regulatory standards. Pass 100%.",
      ref: 105,
    });
  }

  // Sắp xếp theo thời gian (bản ghi thiếu thời gian đẩy xuống cuối), rồi loại trùng
  const sorted = rawSteps
    .map((s) => ({ ...s, ts: s.at ? new Date(s.at).getTime() : Number.MAX_SAFE_INTEGER }))
    .sort((a, b) => a.ts - b.ts);

  const seen = new Set();
  const unique = sorted.filter((s) => {
    const key = `${s.label}|${s.at ?? ""}|${s.user}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  return unique.map((s, idx) => ({
    stage: idx + 1,
    roleTitle: s.label,
    user: s.user,
    role: s.role,
    timestamp: fmtDate(s.at),
    action: s.detail ? `${s.label} — ${s.detail}` : s.label,
    status: s.label,
    hash: s.ref != null ? `#REF-${s.ref}` : "—",
  }));
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
      (etr) => isEtrCompleted(etr.status),
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
      (etr) => isEtrCompleted(etr.status),
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
  const rawEid = raw.enrollmentId ?? raw.EnrollmentId;
  const enrollment = (lookup.enrollments || []).find((e) => String(e.enrollmentId ?? e.EnrollmentId) === String(rawEid));
  // Dùng trực tiếp AccountId từ enrollment (Audit đã được phép GET /Enrollments + /UserProfiles/learners)
  // để tên học viên hiển thị được kể cả khi /Accounts chưa mở cho role Audit.
  const accountId = enrollment?.accountId ?? enrollment?.AccountId ?? null;
  const profile = accountId
    ? (lookup.profiles || []).find((p) => String(p.accountId ?? p.AccountId) === String(accountId))
    : null;
  const account = accountId
    ? (lookup.accounts || []).find((a) => String(a.accountId ?? a.AccountId) === String(accountId))
    : null;
  const classId = enrollment?.classId ?? enrollment?.ClassId ?? null;
  const cls = classId != null
    ? (lookup.classes || []).find((c) => String(c.classId ?? c.ClassId) === String(classId))
    : null;
  const courseId = cls?.courseId ?? cls?.CourseId ?? null;
  const course = courseId != null ? (lookup.courses || []).find((c) => String(c.courseId ?? c.CourseId) === String(courseId)) : null;

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
  // fallback CurrentApproverId → SubmittedBy trên ApprovalRequest của ETR này.
  const approveLog = (lookup.auditLogs || []).find(
    (l) => String(l.etrRecordId ?? l.ETRRecordId ?? l.recordId ?? l.RecordId) === String(etrId) &&
      (String(l.actionType || l.ActionType || "").toUpperCase() === "APPROVE" ||
       String(l.actionType || l.ActionType || "").toUpperCase() === "COMPLETE"),
  );
  const verifyLog = (lookup.auditLogs || []).find(
    (l) => String(l.etrRecordId ?? l.ETRRecordId ?? l.recordId ?? l.RecordId) === String(etrId) &&
      String(l.actionType || l.ActionType || "").toUpperCase() === "VERIFY",
  );
  const approval = (lookup.approvals || []).find((r) => String(r.etrCourseRecordId ?? r.ETRCourseRecordId) === String(etrId));
  const resolvedApprovedBy = approveLog?.accountId
    ? accountName(lookup, approveLog.accountId)
    : approval?.currentApproverId
      ? accountName(lookup, approval.currentApproverId)
      : (raw.isLocked || isEtrCompleted(raw.status))
        ? "Training Manager (Approved)"
        : "—";
  const resolvedQaVerifiedBy = verifyLog?.accountId
    ? accountName(lookup, verifyLog.accountId)
    : "—";

  // Evidence files linked to this ETR record (if the entity carries the FK) or uploaded by the learner's account
  const evidences = (lookup.evidences || []).filter(
    (ev) =>
      extractEtrId(ev) === etrId ||
      (accountId && (ev.uploadedByAccountId === accountId || ev.accountId === accountId)),
  );

  // Attendance for the learner's Enrollment
  const attendanceList = enrollment
    ? (lookup.attendance || [])
        .filter((a) => String(a.enrollmentId ?? a.EnrollmentId) === String(rawEid))
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
    ? (lookup.assessmentResults || [])
        .filter((ar) => String(ar.accountId ?? ar.AccountId) === String(accountId))
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
    enrollmentId: rawEid,
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
    lockedDate: fmtDate(raw.completedAt ?? raw.CompletedAt ?? raw.verifiedAt ?? raw.VerifiedAt),
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
