import { api } from "../utils/api";
import {
  MOCK_AUDITOR_STATS,
  MOCK_LOCKED_ETRS,
  MOCK_APPROVAL_TIMELINE,
  MOCK_AUDIT_LOGS,
  MOCK_EXPORT_PACKAGES,
} from "./mockAuditorData";

/**
 * Auditor Compliance API Service Layer
 * Encapsulates backend API communication for Auditor role with robust normalization & fallback handling.
 */

// Helper to extract array from direct Array response or PagedResponse ({ items: [...] } / { Items: [...] })
const extractList = (data) => {
  if (Array.isArray(data)) return data;
  if (data && Array.isArray(data.items)) return data.items;
  if (data && Array.isArray(data.Items)) return data.Items;
  return null;
};

// --- 1. AuditController APIs (Read-Only) ---

/** GET /api/Audit (Lấy toàn bộ nhật ký) */
export const fetchAuditLogs = async () => {
  try {
    const data = await api.get("/Audit");
    const list = extractList(data);
    if (list && list.length > 0) {
      return list.map(normalizeAuditLog);
    }
  } catch (err) {
    console.warn("[Auditor API] GET /api/Audit failed, falling back to mock:", err.message);
  }
  return MOCK_AUDIT_LOGS;
};

/** GET /api/Audit/{id} (Xem chi tiết 1 nhật ký) */
export const fetchAuditLogById = async (id) => {
  try {
    const data = await api.get(`/Audit/${id}`);
    if (data) return normalizeAuditLog(data);
  } catch (err) {
    console.warn(`[Auditor API] GET /api/Audit/${id} failed, searching mock:`, err.message);
  }
  return MOCK_AUDIT_LOGS.find((l) => l.id === id || l.id === String(id)) || MOCK_AUDIT_LOGS[0];
};

/** GET /api/Audit/search (Tìm kiếm nhật ký) */
export const searchAuditLogs = async (query = "", filterModule = "All") => {
  try {
    const queryParams = new URLSearchParams();
    if (query) queryParams.append("query", query);
    if (filterModule && filterModule !== "All") queryParams.append("module", filterModule);

    const queryString = queryParams.toString();
    const endpoint = `/Audit/search${queryString ? `?${queryString}` : ""}`;
    const data = await api.get(endpoint);
    const list = extractList(data);
    if (list && list.length > 0) {
      return list.map(normalizeAuditLog);
    }
  } catch (err) {
    console.warn("[Auditor API] GET /api/Audit/search failed, filtering mock data:", err.message);
  }

  return MOCK_AUDIT_LOGS.filter((log) => {
    const matchesQuery =
      !query ||
      log.user?.toLowerCase().includes(query.toLowerCase()) ||
      log.action?.toLowerCase().includes(query.toLowerCase()) ||
      log.details?.toLowerCase().includes(query.toLowerCase()) ||
      log.id?.toLowerCase().includes(query.toLowerCase());

    const matchesModule =
      filterModule === "All" ||
      log.module?.toLowerCase().includes(filterModule.toLowerCase());

    return matchesQuery && matchesModule;
  });
};

// --- 2. EtrController APIs (Read-Only for Auditor) ---

/** GET /api/Etr (Lấy danh sách ETR) */
export const fetchEtrList = async () => {
  try {
    const data = await api.get("/Etr");
    const list = extractList(data);
    if (list && list.length > 0) {
      return list.map(normalizeEtr);
    }
  } catch (err) {
    console.warn("[Auditor API] GET /api/Etr failed, falling back to mock:", err.message);
  }
  return MOCK_LOCKED_ETRS;
};

/** GET /api/Etr/{id} (Xem chi tiết hồ sơ ETR và Kết quả Môn học) */
export const fetchEtrById = async (id) => {
  try {
    const data = await api.get(`/Etr/${id}`);
    if (data) return normalizeEtr(data);
  } catch (err) {
    console.warn(`[Auditor API] GET /api/Etr/${id} failed, fetching from mock:`, err.message);
  }
  return MOCK_LOCKED_ETRS.find((e) => e.id === id || e.id === String(id)) || MOCK_LOCKED_ETRS[0];
};

// --- 3. ApprovalsController APIs (Read-Only for Auditor) ---

/** GET /api/Approvals (Xem toàn bộ danh sách yêu cầu phê duyệt) */
export const fetchApprovals = async (etrId = null) => {
  try {
    const endpoint = etrId ? `/Approvals?etrId=${etrId}` : "/Approvals";
    const data = await api.get(endpoint);
    const list = extractList(data);
    if (list && list.length > 0) {
      return list.map(normalizeApproval);
    }
  } catch (err) {
    console.warn("[Auditor API] GET /api/Approvals failed, falling back to mock:", err.message);
  }
  return MOCK_APPROVAL_TIMELINE;
};

// --- 4. ExportsController APIs (Export Functionalities) ---

/** GET /api/Exports/download/{id} (Tải xuống file đã xuất) */
export const downloadExportFile = async (id, fileName = "export.zip") => {
  try {
    const res = await api.get(`/Exports/download/${id}`);
    return res;
  } catch (err) {
    console.warn(`[Auditor API] GET /api/Exports/download/${id} failed, using mock:`, err.message);
    // Fallback: simulate file download with mock content
    const content = `ETR Export Package
ID: ${id}
File: ${fileName}
Generated: ${new Date().toISOString()}
Status: Mock download — backend endpoint not available.

This is a simulated export file for development/demo purposes.`;
    const blob = new Blob([content], { type: "application/octet-stream" });
    const url = window.URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = fileName;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    window.URL.revokeObjectURL(url);
    return { success: true, id, fileName };
  }
};

/** POST /api/Exports/training-package (Kích hoạt xuất gói đào tạo) */
export const exportTrainingPackage = async (payload = {}) => {
  try {
    const res = await api.post("/Exports/training-package", payload);
    return res;
  } catch (err) {
    console.warn("[Auditor API] POST /api/Exports/training-package failed:", err.message);
    return {
      id: `PKG-2026-${Date.now().toString().slice(-3)}`,
      name: payload.name || "Complete_Evidence_Archive.zip",
      type: payload.packageType || "Full Evidence ZIP",
      scope: "Selected ETR Records Audit",
      generatedDate: new Date().toISOString().replace("T", " ").substring(0, 16),
      generatedBy: "Auditor Officer",
      size: "142.0 MB",
      status: "Ready",
      downloadUrl: "#",
      digitalSignature: "VALID (CA-AeroMetric-2026)",
    };
  }
};

/** POST /api/Exports/pdf (Kích hoạt xuất báo cáo PDF) */
export const exportPdf = async (payload = {}) => {
  try {
    const res = await api.post("/Exports/pdf", payload);
    return res;
  } catch (err) {
    console.warn("[Auditor API] POST /api/Exports/pdf failed:", err.message);
    return {
      id: `PKG-2026-${Date.now().toString().slice(-3)}`,
      name: payload.name || "Single_ETR_Compliance_Summary.pdf",
      type: "Compliance PDF",
      scope: "ETR Dossier Export",
      generatedDate: new Date().toISOString().replace("T", " ").substring(0, 16),
      generatedBy: "Auditor Officer",
      size: "18.4 MB",
      status: "Ready",
      downloadUrl: "#",
      digitalSignature: "VALID (CA-AeroMetric-2026)",
    };
  }
};

/** POST /api/Exports/dashboard (Kích hoạt xuất dữ liệu Dashboard) */
export const exportDashboard = async (payload = {}) => {
  try {
    const res = await api.post("/Exports/dashboard", payload);
    return res;
  } catch (err) {
    console.warn("[Auditor API] POST /api/Exports/dashboard failed:", err.message);
    return {
      id: `PKG-2026-${Date.now().toString().slice(-3)}`,
      name: payload.name || "Digital_Signature_Manifest.p7b",
      type: payload.type || "Digital Signature Package",
      scope: "Public Key Certificate Manifest Q2",
      generatedDate: new Date().toISOString().replace("T", " ").substring(0, 16),
      generatedBy: "Auditor Officer",
      size: "2.1 MB",
      status: "Ready",
      downloadUrl: "#",
      digitalSignature: "VALID (CA-AeroMetric-2026)",
    };
  }
};

// --- 5. DashboardController & ReportsController APIs ---

/** GET /api/Dashboard/stats (Xem số liệu thống kê KPIs) */
export const fetchDashboardStats = async () => {
  try {
    const data = await api.get("/Dashboard/stats");
    if (data && typeof data === "object") {
      return {
        totalLockedRecords: data.totalLockedRecords ?? data.TotalLockedRecords ?? data.totalEtrs ?? data.TotalEtrs ?? MOCK_AUDITOR_STATS.totalLockedRecords,
        complianceRate: data.complianceRate ?? data.ComplianceRate ?? data.completionRatePercent ?? data.CompletionRatePercent ?? MOCK_AUDITOR_STATS.complianceRate,
        pendingAudit: data.pendingAudit ?? data.PendingAudit ?? data.pendingApprovalCount ?? data.PendingApprovalCount ?? MOCK_AUDITOR_STATS.pendingAudit,
        auditPackagesExported: data.auditPackagesExported ?? data.AuditPackagesExported ?? MOCK_AUDITOR_STATS.auditPackagesExported,
      };
    }
  } catch (err) {
    console.warn("[Auditor API] GET /api/Dashboard/stats failed, using mock:", err.message);
  }
  return MOCK_AUDITOR_STATS;
};

/** GET /api/Reports/summary (Xem báo cáo tổng hợp) */
export const fetchReportsSummary = async () => {
  try {
    const data = await api.get("/Reports/summary");
    if (data) return data;
  } catch (err) {
    console.warn("[Auditor API] GET /api/Reports/summary failed, using mock summary:", err.message);
  }
  return {
    summaryTitle: "Regulatory Compliance Audit Summary",
    totalAudited: MOCK_AUDITOR_STATS.totalLockedRecords,
    complianceRate: MOCK_AUDITOR_STATS.complianceRate,
    generatedAt: new Date().toISOString(),
  };
};

// --- Normalization Functions ---
function normalizeAuditLog(raw) {
  return {
    id: raw.id || raw.auditId || raw.AuditId || raw.auditLogId || raw.AuditLogId || `LOG-${Math.random().toString(36).substring(2, 7)}`,
    timestamp: raw.timestamp || raw.recordedAt || raw.RecordedAt || raw.createdAt || raw.CreatedAt || new Date().toISOString().replace("T", " ").substring(0, 19),
    user: raw.user || raw.userName || raw.UserName || raw.userEmail || (raw.accountId ? `User #${raw.accountId}` : "Auditor Officer"),
    role: raw.role || raw.userRole || raw.UserRole || "Auditor",
    module: raw.module || raw.actionCategory || raw.ActionCategory || raw.entityName || raw.EntityName || "ETR Inspection",
    action: raw.action || raw.actionName || raw.ActionName || raw.actionType || raw.ActionType || "INSPECT_RECORD",
    target: raw.target || raw.entityId || raw.EntityId || raw.recordId || raw.RecordId || "-",
    result: raw.result || raw.status || (raw.isSuccess !== false ? "SUCCESS" : "FAILED"),
    details: raw.details || raw.description || raw.Description || "Compliance audit verification log",
  };
}

function normalizeEtr(raw) {
  return {
    id: raw.id || raw.etrCourseRecordId || raw.EtrCourseRecordId || raw.etrId || "ETR-2026-0891",
    learnerId: raw.learnerId || raw.studentId || raw.StudentId || "HV-8801",
    learnerName: raw.learnerName || raw.studentName || raw.StudentName || "Learner Name",
    learnerRole: raw.learnerRole || raw.jobTitle || raw.JobTitle || "Maintenance Specialist",
    learnerDepartment: raw.learnerDepartment || raw.department || raw.Department || "Line Maintenance",
    courseId: raw.courseId || raw.courseCode || raw.CourseCode || "CRS-A320-SYS",
    courseName: raw.courseName || raw.courseTitle || raw.CourseTitle || "A320 Type Rating & Systems",
    classId: raw.classId || raw.classCode || raw.ClassCode || "CLS-2026-A320-04",
    className: raw.className || raw.ClassTitle || "A320 Maintenance Systems Class",
    completionDate: raw.completionDate || raw.completedAt || raw.CompletedAt || "2026-06-15",
    lockedDate: raw.lockedDate || raw.lockedAt || raw.LockedAt || "2026-06-18 14:32",
    approvedBy: raw.approvedBy || raw.managerName || "Lê Hoàng Nam (Training Manager)",
    qaVerifiedBy: raw.qaVerifiedBy || raw.qaLead || "Trần Minh Quang (QA Lead)",
    academicStaff: raw.academicStaff || raw.staffName || "Phạm Thu Hà (Academic Staff)",
    instructor: raw.instructor || raw.instructorName || "Đỗ Quốc Việt (Senior Instructor)",
    status: raw.status || (raw.isLocked !== false ? "Locked & Compliant" : "Completed"),
    isLocked: raw.isLocked ?? true,
    verificationHash: raw.verificationHash || raw.hash || "0x8F9A3C72B10E45D9981A64B2",
    totalSessions: raw.totalSessions || 16,
    attendedSessions: raw.attendedSessions || 16,
    attendancePercentage: raw.attendancePercentage || 100,
    overallScore: raw.overallScore || raw.finalScore || 94.5,
    resultStatus: raw.resultStatus || raw.result || "PASSED",
    subjects: raw.subjects || raw.subjectResults || [
      { code: "MOD-01", name: "A320 Avionics & Flight Controls", score: 96, passScore: 80, result: "PASSED", instructor: "Đỗ Quốc Việt" },
      { code: "MOD-02", name: "Hydraulics & Fuel Management", score: 92, passScore: 80, result: "PASSED", instructor: "Đỗ Quốc Việt" },
    ],
    attendanceList: raw.attendanceList || raw.attendances || [
      { session: 1, date: "2026-05-02", topic: "Airframe Overview & Safety Guidelines", duration: "4 hours", status: "PRESENT" },
    ],
    evidences: raw.evidences || raw.evidenceFiles || [
      { id: "EVD-891-01", name: "A320_Practical_Assessment_Sheet_Signed.pdf", size: "3.4 MB", uploadedAt: "2026-06-15 16:20", uploadedBy: "Đỗ Quốc Việt", sha256: "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855", type: "PDF" },
    ],
  };
}

function normalizeApproval(raw) {
  return {
    stage: raw.stage || raw.stepNumber || raw.approvalRequestId || 1,
    roleTitle: raw.roleTitle || raw.stepName || "Approval Stage",
    user: raw.user || raw.approverName || (raw.currentApproverId ? `Approver #${raw.currentApproverId}` : "Approver"),
    role: raw.role || raw.approverRole || "Officer",
    timestamp: raw.timestamp || raw.actionDate || raw.requestedAt || new Date().toISOString(),
    action: raw.action || raw.actionDetails || raw.status || "Verified & Approved",
    status: raw.status || "Completed",
    hash: raw.hash || raw.signatureHash || "0x89A12019BC4F",
  };
}
