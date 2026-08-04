import { translateVn } from "./translate";

// --- API Base URLs ---
// Chế độ dev: ưu tiên local trước, fallback sang deploy nếu local không phản hồi.
// Chế độ production: chỉ gọi deploy để tránh dùng localhost.
const API_BASE_URL_LOCAL =
  import.meta.env.VITE_API_URL_LOCAL ||
  import.meta.env.VITE_API_URL ||
  "https://localhost:7169/api";
const API_BASE_URL_DEPLOY =
  import.meta.env.VITE_API_URL_DEPLOY ||
  "https://etrmanagement-be-fwhvagaxf3f3dmf0.southeastasia-01.azurewebsites.net/api";

// Vite tự động nhận biết môi trường: import.meta.env.PROD === true khi build production
const isProduction = import.meta.env.PROD;

export const API_BASE_URLS = isProduction
  ? [API_BASE_URL_DEPLOY]
  : [API_BASE_URL_LOCAL, API_BASE_URL_DEPLOY];

/**
 * Gán nhãn LOCAL/DEPLOY cho base URL — dùng để log rõ ràng frontend đang gọi API nào.
 */
export const getApiBaseLabel = (baseUrl) => {
  if (baseUrl === API_BASE_URL_LOCAL) return "LOCAL";
  if (baseUrl === API_BASE_URL_DEPLOY) return "DEPLOY";
  return "CUSTOM";
};

// ==================== Chế độ chọn base URL: KHÔNG trộn LOCAL/DEPLOY ====================
// - PRODUCTION: luôn DEPLOY.
// - DEV: tự khóa base URL đầu tiên phản hồi được (sticky) — mọi request sau đó chỉ dùng base đó.
// - Bắt buộc thủ công bằng: localStorage.setItem("apiBaseMode", "local" | "deploy")
const API_MODE_STORAGE_KEY = "apiBaseMode";
const ACTIVE_BASE_URL_STORAGE_KEY = "activeApiBaseUrl";

const DEMO_DATA = {
  "/auth/login": {
    token: "demo-token",
    accountId: 1,
    userId: 1,
    username: "demo.instructor",
    fullName: "Demo Instructor",
    role: "Instructor",
  },
  "/auth/forgot-password": { success: true, message: "Demo mode" },
  "/classes": [
    {
      classId: 1,
      classCode: "CL-01",
      className: "Lớp A",
      courseId: 1,
      status: "Đang diễn ra",
      subjectId: 1,
    },
    {
      classId: 2,
      classCode: "CL-02",
      className: "Lớp B",
      courseId: 1,
      status: "Đang diễn ra",
      subjectId: 1,
    },
  ],
  "/courses": [{ courseId: 1, courseName: "Khóa học A" }],
  "/assessments": [
    { assessmentId: 1, subjectId: 1, assessmentName: "Kiểm tra giữa kỳ" },
  ],
  "/sessions": [
    {
      sessionId: 1,
      classId: 1,
      sessionTitle: "Buổi 1",
      sessionDate: "2026-07-20",
      location: "Phòng A",
      subjectId: 1,
      assessmentId: 1,
      isConfirmed: false,
    },
    {
      sessionId: 2,
      classId: 1,
      sessionTitle: "Buổi 2",
      sessionDate: "2026-07-21",
      location: "Phòng B",
      subjectId: 1,
      assessmentId: 1,
      isConfirmed: true,
    },
  ],
  "/enrollments": [
    { enrollmentId: 1, accountId: 6, classId: 1, status: "Active" },
    { enrollmentId: 2, accountId: 7, classId: 1, status: "Active" },
  ],
  "/accounts": [],
  "/userprofiles/learners": [
    { accountId: 6, fullName: "Jane Student", employeeCode: "HV001" },
    { accountId: 7, fullName: "John Student", employeeCode: "HV002" },
  ],
  "/classstudents": [],
  "/evidences": [
    {
      evidenceId: 1,
      subjectResultId: 1,
      fileName: "attendance-sheet.pdf",
      status: "Pending",
      verified: false,
    },
  ],
  "/attendance": [
    {
      attendanceRecordId: 1,
      sessionId: 1,
      accountId: 6,
      status: "P",
      remarks: "",
    },
  ],
  "/assessmentresults": [
    {
      assessmentResultId: 1,
      assessmentId: 1,
      accountId: 6,
      subjectResultId: 1,
      score: 85,
      remark: "Good",
      isPublished: false,
      sessionId: 1,
    },
    {
      assessmentResultId: 2,
      assessmentId: 1,
      accountId: 7,
      subjectResultId: 2,
      score: 92,
      remark: "Excellent",
      isPublished: true,
      sessionId: 1,
    },
  ],
  "/practicalchecklistresults": [
    {
      practicalChecklistResultId: 1,
      sessionId: 1,
      subjectResultId: 1,
      practicalChecklistId: 1,
      score: 75,
      resultStatus: "Passed",
      isPublished: false,
      verificationComment: "Well done",
    },
    {
      practicalChecklistResultId: 2,
      sessionId: 2,
      subjectResultId: 2,
      practicalChecklistId: 1,
      score: 45,
      resultStatus: "Failed",
      isPublished: true,
      verificationComment: "Needs improvement",
    },
  ],
  "/etr": [
    {
      etrCourseRecordId: 1,
      enrollmentId: 1,
      status: "InProgress",
      isLocked: false,
    },
    {
      etrCourseRecordId: 2,
      enrollmentId: 2,
      status: "InProgress",
      isLocked: false,
    },
  ],
  "/etr/1": {
    etrCourseRecordId: 1,
    enrollmentId: 1,
    status: "InProgress",
    subjectResults: [{ subjectResultId: 1, subjectId: 1, status: "Pending" }],
  },
  "/etr/2": {
    etrCourseRecordId: 2,
    enrollmentId: 2,
    status: "InProgress",
    subjectResults: [{ subjectResultId: 2, subjectId: 1, status: "Pending" }],
  },
  "/approvals": [
    {
      approvalRequestId: 1,
      etrCourseRecordId: 20260891,
      currentStatus: "Submitted",
      submittedByAccountId: 4,
      submittedAt: "2026-06-15T16:45:00",
      completedAt: null,
      stage: 1,
      roleTitle: "Academic Staff",
      user: "Phạm Thu Hà",
      role: "Academic Officer",
      timestamp: "2026-06-15 16:45",
      action: "Verified learner eligibility",
      status: "Completed",
      hash: "0x89A12019BC4F",
    },
  ],
  "/audit": [
    {
      id: "LOG-001",
      timestamp: "2026-07-24 14:10:02",
      user: "Auditor Officer",
      role: "Auditor",
      module: "ETR Inspection",
      action: "INSPECT_LOCKED_ETR",
      target: "ETR-2026-0891",
      result: "SUCCESS",
      details: "Inspected ETR details",
    },
  ],
  "/dashboard/stats": {
    totalLockedRecords: 142,
    complianceRate: 99.4,
    pendingAudit: 5,
    auditPackagesExported: 28,
  },
  "/reports/summary": {
    summaryTitle: "Regulatory Compliance Audit Summary",
    totalAudited: 142,
    complianceRate: 99.4,
  },
};

const normalizeEndpoint = (endpoint) => {
  if (!endpoint) return "/";
  const cleaned = endpoint.startsWith("/") ? endpoint : `/${endpoint}`;
  const withoutApi = cleaned.replace(/^\/api/i, "");
  return (withoutApi || "/").toLowerCase();
};

const getDemoData = (endpoint) => {
  const normalized = normalizeEndpoint(endpoint);
  const direct = DEMO_DATA[normalized];
  if (direct !== undefined) return direct;

  // Demo data chỉ dùng cho request ĐỌC (GET) — các request ghi không bao giờ fallback demo.
  return [];
};

const shouldUseDemoFallback = (endpoint, response, method) => {
  if (isProduction) return false;
  if (!endpoint) return false;
  // CHỈ fallback demo cho request ĐỌC (GET). Mọi request GHI (POST/PUT/PATCH/DELETE)
  // phải hiển thị lỗi thật từ backend — tránh "báo thành công giả" khi dữ liệu chưa được lưu.
  if (method !== "GET") return false;
  const normalized = normalizeEndpoint(endpoint);
  if (
    normalized.startsWith("/auth") ||
    normalized.startsWith("/classes") ||
    normalized.startsWith("/courses") ||
    normalized.startsWith("/assessments") ||
    normalized.startsWith("/sessions") ||
    normalized.startsWith("/enrollments") ||
    normalized.startsWith("/accounts") ||
    normalized.startsWith("/userprofiles") ||
    normalized.startsWith("/classstudents") ||
    normalized.startsWith("/evidences") ||
    normalized.startsWith("/attendance") ||
    normalized.startsWith("/assessmentresults") ||
    normalized.startsWith("/practicalchecklistresults") ||
    normalized.startsWith("/etr") ||
    normalized.startsWith("/approvals") ||
    normalized.startsWith("/audit") ||
    normalized.startsWith("/dashboard") ||
    normalized.startsWith("/reports")
  ) {
    return true;
  }
  return response && !response.ok;
};

const getManualApiMode = () => {
  try {
    const v = localStorage.getItem(API_MODE_STORAGE_KEY);
    if (v === "local") return "LOCAL";
    if (v === "deploy") return "DEPLOY";
  } catch {
    /* bỏ qua nếu localStorage không khả dụng */
  }
  return null;
};

const getPersistedActiveBaseUrl = () => {
  try {
    const saved = localStorage.getItem(ACTIVE_BASE_URL_STORAGE_KEY);
    return saved || null;
  } catch {
    return null;
  }
};

// Base URL đã khóa — sau request đầu tiên thành công, KHÔNG đổi sang base khác
let activeBaseUrl = getPersistedActiveBaseUrl();

export const getApiBaseUrlCandidates = () => {
  if (isProduction) return [API_BASE_URL_DEPLOY];
  const manual = getManualApiMode();
  if (manual === "LOCAL") return [API_BASE_URL_LOCAL];
  if (manual === "DEPLOY") return [API_BASE_URL_DEPLOY];

  const persisted = activeBaseUrl || getPersistedActiveBaseUrl();
  if (persisted) {
    return [persisted, ...API_BASE_URLS.filter((url) => url !== persisted)];
  }

  return API_BASE_URLS;
};

export const setActiveApiBaseUrl = (baseUrl) => {
  activeBaseUrl = baseUrl || null;
  try {
    if (activeBaseUrl) {
      localStorage.setItem(ACTIVE_BASE_URL_STORAGE_KEY, activeBaseUrl);
    } else {
      localStorage.removeItem(ACTIVE_BASE_URL_STORAGE_KEY);
    }
  } catch {
    /* bỏ qua nếu localStorage không khả dụng */
  }
  return activeBaseUrl;
};

export const setApiBaseMode = (mode) => {
  try {
    if (mode === null) {
      localStorage.removeItem(API_MODE_STORAGE_KEY);
    } else {
      localStorage.setItem(API_MODE_STORAGE_KEY, mode);
    }
  } catch {
    /* bỏ qua nếu localStorage không khả dụng */
  }
  return mode;
};

const resolveBaseUrlOrder = () => {
  return getApiBaseUrlCandidates();
};

const lockBaseUrl = (baseUrl) => {
  if (!baseUrl) return;
  if (!activeBaseUrl || activeBaseUrl !== baseUrl) {
    setActiveApiBaseUrl(baseUrl);
    console.info(
      `[API] 🔒 Đã khóa base URL: ${getApiBaseLabel(baseUrl)} (${baseUrl}) — MỌI request tiếp theo chỉ gọi base này.`,
    );
  }
};

/** Base URL đang dùng (cho các tầng fetch riêng như auditorApi download) */
export const getActiveApiBaseUrl = () => {
  const candidates = getApiBaseUrlCandidates();
  return candidates[0] || API_BASE_URL_DEPLOY;
};

// --- Banner khởi động: log rõ chế độ + base URL sẽ dùng (LOCAL hay DEPLOY) ---
if (typeof console !== "undefined") {
  const mode = isProduction ? "PRODUCTION" : "DEV";
  const manual = getManualApiMode();
  const order = API_BASE_URLS.map((u) => `${getApiBaseLabel(u)} (${u})`).join(
    " → ",
  );
  let detail;
  if (isProduction) {
    detail = "Bản PRODUCTION: chỉ gọi DEPLOY (Azure) — bỏ qua localhost.";
  } else if (manual) {
    detail = `Bắt buộc dùng ${manual} (apiBaseMode=${manual.toLowerCase()}) — bỏ qua auto-fallback.`;
  } else {
    detail = `Tự khóa base đầu tiên phản hồi được theo thứ tự: ${order} — sau đó MỌI request chỉ dùng base đó (không trộn LOCAL/DEPLOY).`;
  }
  console.info(
    `%c[API] Chế độ: ${mode}%c — ${detail}`,
    "color:#0a7d3f;font-weight:bold",
    "color:inherit",
  );
}

/**
 * Gọi API theo base URL đã khóa (hoặc tự khóa ở request đầu tiên).
 * KHÔNG fallback sang base khác sau khi đã khóa — tránh trộn LOCAL/DEPLOY.
 */
async function fetchWithFallback(endpoint, fetchOptions, method, options) {
  const urls = resolveBaseUrlOrder();
  for (const baseUrl of urls) {
    let response;
    // Timeout 20s cho mỗi request — nếu backend treo (không phản hồi, không trả lỗi),
    // fetch sẽ bị abort để FE hiển thị lỗi rõ ràng thay vì treo vô hạn.
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 20000);
    try {
      const url = `${baseUrl}${endpoint}`;
      console.log(
        `[API ${method}] Requesting: ${getApiBaseLabel(baseUrl)} (${url})`,
      );
      response = await fetch(url, {
        ...fetchOptions,
        signal: controller.signal,
      });
    } catch (error) {
      // Network error / timeout - server not reachable. Nếu đã khóa base thì KHÔNG đổi base khác.
      console.warn(
        `[API ${method}] ⚠️ Không tới được API ${getApiBaseLabel(baseUrl)} (${baseUrl}${endpoint}):`,
        error.message,
        urls.length > 1
          ? "→ thử base URL kế tiếp (chỉ ở request đầu tiên)"
          : "",
      );
      if (shouldUseDemoFallback(endpoint, { ok: false, status: 0 }, method)) {
        return getDemoData(endpoint);
      }
      continue;
    } finally {
      clearTimeout(timeoutId);
    }
    // Server đã phản hồi → khóa base URL này cho toàn bộ phiên làm việc
    lockBaseUrl(baseUrl);
    console.log(
      `[API ${method}] ✅ Đang dùng API ${getApiBaseLabel(baseUrl)} cho ${endpoint}`,
    );
    return await handleResponse(response, method, endpoint, options);
  }
  // All URLs failed with network errors
  const errMsg = `Cannot reach any API server for ${endpoint}`;
  console.error(`[API ${method}] ${errMsg}`);
  throw new Error(errMsg);
}

/**
 * Clears authentication data and redirects to login page.
 * Called automatically when the API returns 401 (token expired/invalid).
 */
const handleUnauthorized = () => {
  localStorage.removeItem("token");
  localStorage.removeItem("user");
  // Only redirect if not already on the login page to avoid loops
  if (window.location.pathname !== "/login") {
    window.location.href = "/login";
  }
};

const getAuthHeaders = (isFormData = false) => {
  const token = localStorage.getItem("token");
  const headers = {};

  if (!isFormData) {
    headers["Content-Type"] = "application/json";
  }

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  return headers;
};

const handleResponse = async (response, method, endpoint, options = {}) => {
  console.log(
    `[API ${method}] Response Status: ${response.status} for ${endpoint}`,
  );

  if (!response.ok) {
    if (shouldUseDemoFallback(endpoint, response, method)) {
      console.warn(`[API ${method}] Using demo fallback for ${endpoint}`);
      return getDemoData(endpoint);
    }

    // Auto-logout on 401 (token expired or invalid)
    if (response.status === 401) {
      if (!options.suppressAuthRedirect) {
        handleUnauthorized();
        throw new Error("Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.");
      }
      // If suppressAuthRedirect, just throw without redirecting
      const errText = await response.text().catch(() => "");
      console.warn(`[API ${method}] 401 suppressed for ${endpoint}:`, errText);
      throw new Error(errText || "Unauthorized");
    }

    const err = await response.text();
    console.error(
      `[API ${method}] Failed: Status ${response.status}, Error:`,
      err,
    );
    throw new Error(err || `Request failed with status ${response.status}`);
  }

  if (response.status === 204) {
    console.log(`[API ${method}] Success (No Content) for ${endpoint}`);
    return null;
  }

  try {
    const data = await response.json();
    console.log(`[API ${method}] Success data for ${endpoint}:`, data);
    return data;
  } catch {
    console.log(`[API ${method}] Success (Empty Body) for ${endpoint}`);
    return null;
  }
};

export const api = {
  get: async (endpoint, options = {}) => {
    return fetchWithFallback(
      endpoint,
      { method: "GET", headers: getAuthHeaders() },
      "GET",
      options,
    );
  },

  post: async (endpoint, data, options = {}) => {
    const isFormData =
      typeof FormData !== "undefined" && data instanceof FormData;
    return fetchWithFallback(
      endpoint,
      {
        method: "POST",
        headers: getAuthHeaders(isFormData),
        body: isFormData ? data : JSON.stringify(data),
      },
      "POST",
      options,
    );
  },

  postFormData: async (endpoint, formData) => {
    return fetchWithFallback(
      endpoint,
      { method: "POST", headers: getAuthHeaders(true), body: formData },
      "FORMDATA",
      {},
    );
  },

  put: async (endpoint, data) => {
    return fetchWithFallback(
      endpoint,
      {
        method: "PUT",
        headers: getAuthHeaders(),
        body: JSON.stringify(data),
      },
      "PUT",
      {},
    );
  },

  patch: async (endpoint, data) => {
    return fetchWithFallback(
      endpoint,
      {
        method: "PATCH",
        headers: getAuthHeaders(),
        body: data ? JSON.stringify(data) : undefined,
      },
      "PATCH",
      {},
    );
  },

  delete: async (endpoint) => {
    return fetchWithFallback(
      endpoint,
      { method: "DELETE", headers: getAuthHeaders() },
      "DELETE",
      {},
    );
  },

  /**
   * Tải file nhị phân (PDF/ảnh...) với token xác thực — dùng cho các endpoint trả về
   * PhysicalFile/FileStream (api.get parse JSON nên không dùng được cho blob).
   */
  downloadFile: async (endpoint) => {
    const urls = resolveBaseUrlOrder();
    for (const baseUrl of urls) {
      let response;
      // Timeout 20s — tránh treo vô hạn khi backend không phản hồi
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 20000);
      try {
        const url = `${baseUrl}${endpoint}`;
        console.log(
          `[API DOWNLOAD] Requesting: ${getApiBaseLabel(baseUrl)} (${url})`,
        );
        response = await fetch(url, {
          method: "GET",
          headers: getAuthHeaders(),
          signal: controller.signal,
        });
      } catch (error) {
        // Network error / timeout — nếu đã khóa base thì KHÔNG đổi base khác
        console.warn(
          `[API DOWNLOAD] ⚠️ Không tới được API ${getApiBaseLabel(baseUrl)} (${baseUrl}${endpoint}):`,
          error.message,
          urls.length > 1
            ? "→ thử base URL kế tiếp (chỉ ở request đầu tiên)"
            : "",
        );
        continue;
      } finally {
        clearTimeout(timeoutId);
      }
      if (response.status === 401) {
        handleUnauthorized();
        throw new Error("Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.");
      }
      if (!response.ok) {
        const err = await response.text().catch(() => "");
        console.error(
          `[API DOWNLOAD] Failed: Status ${response.status} for ${endpoint}:`,
          err,
        );
        throw new Error(
          err || `Download failed with status ${response.status}`,
        );
      }
      lockBaseUrl(baseUrl);
      console.log(
        `[API DOWNLOAD] ✅ Đang dùng API ${getApiBaseLabel(baseUrl)} cho ${endpoint}`,
      );
      return await response.blob();
    }
    const errMsg = `Cannot reach any API server for ${endpoint}`;
    console.error(`[API DOWNLOAD] ${errMsg}`);
    throw new Error(errMsg);
  },
};

/**
 * Hàm dịch tất cả các ngoại lệ nghiệp vụ CSDL từ Backend sang Tiếng Việt chuẩn Hàng không
 */
export const parseApiError = (err, fallback) => {
  if (!err)
    return (
      translateVn(fallback) ||
      translateVn("Thao tác thất bại. Vui lòng thử lại.")
    );
  const raw = typeof err === "string" ? err : err.message || String(err);

  if (
    raw.includes("already enrolled") ||
    raw.includes("ongoing ETR") ||
    raw.includes("active class for this course")
  ) {
    return translateVn(
      "❌ Quy tắc tuân thủ ETR Hàng không (Business Rule Violation): Học viên này đã được ghi danh vào một Lớp học thuộc Khóa học này và đang có Hồ sơ ETR chưa hoàn thành (InProgress). Theo quy định ETR, mỗi học viên chỉ được có 01 Hồ sơ ETR đang diễn ra cho 01 Khóa học tại một thời điểm. Vui lòng chọn Học viên khác.",
    );
  }

  if (
    raw.includes("no subjects configured") ||
    raw.includes("has no subjects")
  ) {
    return translateVn(
      "❌ Quy tắc tuân thủ (Business Rule Violation): Khóa học chưa được cấu hình Môn học (Subject). Bắt buộc chọn Khóa đã có môn học trước khi mở ghi danh.",
    );
  }

  // ——— Lỗi CSDL (ưu tiên phát hiện TRÙNG MÃ trước, rồi mới tới DbUpdateException chung) ———
  // Trùng khoá duy nhất (duplicate key): lỗi phổ biến nhất khi tạo Khóa học / Lớp học
  if (
    raw.includes("IX_Courses_CourseCode") ||
    raw.includes("IX_Classes_ClassCode") ||
    raw.includes("Cannot insert duplicate key") ||
    raw.includes("duplicate key") ||
    raw.includes("UNIQUE constraint") ||
    raw.includes("A record with the same unique value already exists") ||
    raw.includes("2601") ||
    raw.includes("2627")
  ) {
    return translateVn(
      "❌ Lỗi CSDL (Trùng mã bản ghi): Mã Khóa học, Mã Lớp học hoặc Tên dữ liệu này đã tồn tại trong CSDL. Vui lòng nhập một Mã mới duy nhất.",
    );
  }

  // DbUpdateException chung (ngoài trường hợp trùng khoá/vi phạm FK): báo rõ để user biết dữ liệu chưa được lưu
  if (
    raw.includes("DbUpdateException") ||
    raw.includes("An error occurred while saving the entity changes") ||
    raw.includes("See the inner exception for details")
  ) {
    return translateVn(
      "❌ Lỗi lưu dữ liệu (DbUpdateException): Không thể lưu bản ghi vào CSDL. Vui lòng kiểm tra lại thông tin (Mã lớp trùng, Khóa học/Giảng viên không hợp lệ) và thử lại.",
    );
  }

  if (
    raw.includes("REFERENCE constraint") ||
    raw.includes("foreign key constraint") ||
    raw.includes("FK_") ||
    raw.includes("One or more referenced resources do not exist") ||
    raw.includes("Invalid reference") ||
    raw.includes("DELETE statement conflicted")
  ) {
    return translateVn(
      "❌ Lỗi Ràng buộc CSDL (Foreign Key Constraint): Không thể lưu/xóa dữ liệu này vì Khóa học hoặc Giảng viên được chọn không tồn tại, hoặc dữ liệu đang được liên kết bởi bản ghi khác.",
    );
  }

  if (
    raw.includes("is not in Completed status") ||
    raw.includes("ETR is not in Completed")
  ) {
    return translateVn(
      "❌ Quy tắc kiểm toán: Không thể trích xuất Training Package. Hồ sơ ETR chưa được Trưởng phòng phê duyệt và đóng bằng (Completed).",
    );
  }

  if (
    raw.includes("uploaded yourself") ||
    raw.includes("cannot verify evidence")
  ) {
    return translateVn(
      "❌ Quy tắc QA: Bạn không thể thẩm định tệp minh chứng do chính tài khoản của bạn tải lên.",
    );
  }

  if (raw.includes("already published")) {
    return translateVn(
      "❌ Quy tắc chấm điểm: Kết quả Bảng kiểm thực hành này đã được công bố, không thể chỉnh sửa.",
    );
  }

  if (raw.includes("ETR is locked") || raw.includes("cannot be edited")) {
    return translateVn(
      "🔒 Quy tắc an toàn dữ liệu: Hồ sơ ETR này đã bị đóng bằng vĩnh viễn (Freeze Data). Không thể chỉnh sửa.",
    );
  }

  if (
    raw.includes("OperationCanceledException") ||
    raw.includes("TaskCanceledException") ||
    raw.includes("operation was canceled") ||
    raw.includes("aborted")
  ) {
    return translateVn(
      "ℹ️ Thao tác xử lý đã bị hủy do kết nối mạng gián đoạn hoặc chuyển trang trong lúc đang lưu. Vui lòng thử lại.",
    );
  }

  try {
    const parsed = JSON.parse(raw);
    // ASP.NET ProblemDetails: { title, detail } — ưu tiên detail (mô tả cụ thể)
    if (parsed.detail) return parsed.detail;
    if (parsed.message) return parsed.message;
    if (parsed.title) return parsed.title;
  } catch (error) {
    // Ignore parse failures and fall back to the translated message.
    console.debug("Failed to parse API error payload", error);
  }

  return translateVn(fallback) || translateVn(raw);
};
