import { translateVn } from "./translate";
import { addActivity } from "./activityLog";

// --- API Base URL ---
// Theo yêu cầu: FE CHỈ gọi API đã deploy (Azure) — KHÔNG còn gọi API local,
// áp dụng cho cả môi trường dev lẫn production.
const API_BASE_URL_DEPLOY =
  import.meta.env.VITE_API_URL_DEPLOY ||
  "https://etrmanagement-be-fwhvagaxf3f3dmf0.southeastasia-01.azurewebsites.net/api";


// Luôn chỉ có đúng 1 base URL: DEPLOY.
export const API_BASE_URLS = [API_BASE_URL_DEPLOY];

/**
 * Nhãn base URL — luôn là DEPLOY (FE chỉ gọi API đã deploy).
 */
export const getApiBaseLabel = () => "DEPLOY";

// ==================== Chế độ chọn base URL: CHỈ DEPLOY ====================
// FE chỉ gọi đúng 1 base URL đã deploy (Azure) — không còn LOCAL, không fallback,
// không khóa base theo phiên, không bắt buộc bằng localStorage.
// (Giữ 2 hàm dưới đây để tương thích với code/tests cũ.)

/** Danh sách base URL sẽ gọi — luôn chỉ có đúng 1: DEPLOY. */
export const getApiBaseUrlCandidates = () => API_BASE_URLS;

/** Base URL đang dùng (cho các tầng fetch riêng như auditorApi download) — luôn DEPLOY */
export const getActiveApiBaseUrl = () => API_BASE_URL_DEPLOY;

/** No-op giữ tương thích — FE không còn khóa/chuyển base URL trong phiên. */
export const setActiveApiBaseUrl = () => null;

/** No-op giữ tương thích — FE không còn bắt buộc base theo localStorage. */
export const setApiBaseMode = () => null;

// --- Banner khởi động: log rõ chế độ DEPLOY-ONLY ---
if (typeof console !== "undefined") {
  console.info(
    `%c[API] Chế độ: DEPLOY-ONLY%c — MỌI request gọi API đã deploy (${API_BASE_URL_DEPLOY}). KHÔNG còn gọi API local.`,
    "color:#0a7d3f;font-weight:bold",
    "color:inherit",
  );
}

/**
 * Gọi API — CHỈ dùng đúng 1 base URL DEPLOY (không còn fallback local).
 */
async function fetchWithFallback(endpoint, fetchOptions, method, options) {
  const baseUrl = API_BASE_URL_DEPLOY;
  // Timeout 20s — nếu backend treo (không phản hồi, không trả lỗi),
  // fetch sẽ bị abort để FE hiển thị lỗi rõ ràng thay vì treo vô hạn.
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 20000);
  try {
    const url = `${baseUrl}${endpoint}`;
    console.log(`[API ${method}] Requesting: DEPLOY (${url})`);
    const response = await fetch(url, {
      ...fetchOptions,
      signal: controller.signal,
    });
    console.log(`[API ${method}] ✅ Đang dùng API DEPLOY cho ${endpoint}`);
    return await handleResponse(response, method, endpoint, options, fetchOptions?.body);
  } catch (error) {
    // Network error / timeout - server not reachable.
    console.warn(
      `[API ${method}] ⚠️ Không tới được API DEPLOY (${baseUrl}${endpoint}):`,
      error.message,
    );
        // Ghi lịch sử thao tác THẤT BẠI (lỗi mạng) — chỉ request GHI
    if (method !== "GET") {
      addActivity({ type: "error", method, endpoint, status: 0, message: "Network error / timeout" });
    }
    const errMsg = `Cannot reach API server for ${endpoint}`;
    console.error(`[API ${method}] ${errMsg}`);
    throw new Error(errMsg);
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Utility to check if a JWT token is expired based on its payload exp claim.
 */
export const isTokenExpired = (token) => {
  if (!token) return true;
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return false; // Non-JWT or demo token
    const base64Url = parts[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    const payload = JSON.parse(jsonPayload);
    if (payload && typeof payload.exp === 'number') {
      const nowInSeconds = Math.floor(Date.now() / 1000);
      return payload.exp < nowInSeconds;
    }
    return false;
  } catch (e) {
    return false;
  }
};

/**
 * Clears authentication data and redirects to login page.
 * Called automatically when the API returns 401 or token expires.
 */
export const handleUnauthorized = () => {
  localStorage.removeItem("token");
  localStorage.removeItem("user");
  if (typeof window !== "undefined" && window.location.pathname !== "/login") {
    window.location.href = "/login";
  }
};

const getAuthHeaders = (isFormData = false) => {
  const token = localStorage.getItem("token");
  if (token && isTokenExpired(token)) {
    handleUnauthorized();
    throw new Error("Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.");
  }

  const headers = {};
  if (!isFormData) {
    headers["Content-Type"] = "application/json";
  }
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  return headers;
};

const handleResponse = async (response, method, endpoint, options = {}, requestBody = null) => {
  console.log(
    `[API ${method}] Response Status: ${response.status} for ${endpoint}`,
  );

  if (!response.ok) {
    // Auto-logout on 401 (token expired or invalid) or 403 (unauthorized/token invalid)
    if (response.status === 401 || response.status === 403) {
      const token = localStorage.getItem("token");
      if (response.status === 401 || (token && isTokenExpired(token))) {
        if (!options.suppressAuthRedirect) {
          handleUnauthorized();
          throw new Error("Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.");
        }
      }
    }

    const err = await response.text();
    console.error(
      `[API ${method}] Failed: Status ${response.status}, Error:`,
      err,
      "\n[DIAG] Request body gửi lên:",
      requestBody,
    );
    // Ghi lịch sử thao tác THẤT BẠI — chỉ request GHI
    if (method !== "GET") {
      addActivity({ type: "error", method, endpoint, status: response.status, message: err.slice(0, 150) });
    }
    throw new Error(err || `Request failed with status ${response.status}`);
  }

  // Ghi lịch sử thao tác THÀNH CÔNG — chỉ request GHI (GET = đọc dữ liệu, không ghi log)
  if (method !== "GET") {
    addActivity({ type: "success", method, endpoint, status: response.status, message: "" });
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
   *
   * options.suppressAuthRedirect = true → KHÔNG đá user về /login khi tải file lỗi
   * (token hết hạn / 401). Chỉ ném lỗi để UI hiển thị thông báo — tránh mất phiên
   * làm việc hiện tại chỉ vì một lần tải file thất bại.
   */
  downloadFile: async (endpoint, options = {}) => {
    const baseUrl = API_BASE_URL_DEPLOY;
    const token = localStorage.getItem("token");
    // Nếu token hết hạn: chỉ đá về login khi KHÔNG được suppress — ngược lại chỉ ném lỗi
    if (token && isTokenExpired(token)) {
      if (!options.suppressAuthRedirect) handleUnauthorized();
      throw new Error("Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.");
    }

    let response;
    // Timeout 20s — tránh treo vô hạn khi backend không phản hồi
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 20000);
    try {
      const url = `${baseUrl}${endpoint}`;
      console.log(`[API DOWNLOAD] Requesting: DEPLOY (${url})`);
      const headers = {};
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }
      response = await fetch(url, {
        method: "GET",
        headers,
        signal: controller.signal,
      });
    } catch (error) {
      // Network error / timeout — CHỈ có 1 base URL nên báo lỗi luôn
      console.warn(
        `[API DOWNLOAD] ⚠️ Không tới được API DEPLOY (${baseUrl}${endpoint}):`,
        error.message,
      );
      const errMsg = `Cannot reach API server for ${endpoint}`;
      console.error(`[API DOWNLOAD] ${errMsg}`);
      throw new Error(errMsg);
    } finally {
      clearTimeout(timeoutId);
    }
    if (response.status === 401) {
      // 401 khi đang tải file: chỉ đá về login khi KHÔNG được suppress —
      // ngược lại chỉ báo lỗi, KHÔNG xóa token/phiên của người dùng.
      if (!options.suppressAuthRedirect) handleUnauthorized();
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
    console.log(`[API DOWNLOAD] ✅ Đang dùng API DEPLOY cho ${endpoint}`);
    return await response.blob();
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

  if (raw.includes("unconfirmed sessions")) {
    return translateVn(
      "❌ Quy tắc nghiệp vụ: Không thể chuyển Lớp sang Completed (Đã kết thúc) vì vẫn còn buổi học chưa được confirm. Vui lòng confirm toàn bộ buổi học của lớp trước khi hoàn thành.",
    );
  }

  if (
    raw.includes("Completed or Locked") ||
    raw.includes("ETR is locked") ||
    raw.includes("cannot be edited")
  ) {
    return translateVn(
      "🔒 Quy tắc an toàn dữ liệu: Hồ sơ ETR liên quan đã hoàn tất/khóa (Completed/Locked) nên không thể thay đổi minh chứng hoặc dữ liệu đào tạo này. Vui lòng liên hệ Admin nếu cần mở khóa.",
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

/**
 * Fetch công khai (trang marketing) — gọi thẳng API thật.
 * KHÔNG có mock/demo data, KHÔNG redirect khi 401. Lỗi → throw để trang
 * hiển thị trạng thái rỗng ("Không có dữ liệu") thay vì data giả.
 */
const apiFetch = async (endpoint, fetchOptions = {}) => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 20000);
  try {
    const response = await fetch(`${API_BASE_URL_DEPLOY}${endpoint}`, {
      ...fetchOptions,
      headers: {
        "Content-Type": "application/json",
        ...(fetchOptions.headers || {}),
      },
      signal: controller.signal,
    });
    if (!response.ok) {
      const text = await response.text().catch(() => "");
      throw new Error(text || `Request failed with status ${response.status}`);
    }
    if (response.status === 204) return null;
    return await response.json();
  } finally {
    clearTimeout(timeoutId);
  }
};

// ==================== PUBLIC FOOTER API HELPERS ====================

/**
 * Fetch real backend stats via GET requests to live endpoints (/Dashboard/stats, /Courses, /Classes, /Subjects, /Etr, /UserProfiles/learners, /Evidences)
 */
export const fetchRealBackendStats = async () => {
  try {
    const [stats, courses, classes, subjects, etrList, learners, accounts, evidences] = await Promise.all([
      apiFetch("/Dashboard/stats").catch(() => null),
      apiFetch("/Courses").catch(() => []),
      apiFetch("/Classes").catch(() => []),
      apiFetch("/Subjects").catch(() => []),
      apiFetch("/Etr").catch(() => []),
      apiFetch("/UserProfiles/learners").catch(() => []),
      apiFetch("/Accounts").catch(() => []),
      apiFetch("/Evidences").catch(() => [])
    ]);

    let activeLearnersCount = 0;
    if (Array.isArray(learners) && learners.length > 0) {
      activeLearnersCount = learners.length;
    } else if (Array.isArray(accounts) && accounts.length > 0) {
      activeLearnersCount = accounts.filter(acc => {
        const r = (acc.roleName || acc.role || "").toLowerCase();
        return r === "student" || r === "learner";
      }).length;
    }

    const etrCount = Array.isArray(etrList) && etrList.length > 0 ? etrList.length : 0;
    const coursesCount = Array.isArray(courses) && courses.length > 0 ? courses.length : 0;
    const classesCount = Array.isArray(classes) && classes.length > 0 ? classes.length : 0;
    const subjectsCount = Array.isArray(subjects) && subjects.length > 0 ? subjects.length : 0;
    const evidencesCount = Array.isArray(evidences) && evidences.length > 0 ? evidences.length : 0;

    const complianceRate = stats?.complianceRate ? `${stats.complianceRate}%` : null;
    const totalLockedRecords = stats?.totalLockedRecords ?? null;

    return {
      activeLearnersCount,
      etrCount,
      coursesCount,
      classesCount,
      subjectsCount,
      evidencesCount,
      complianceRate,
      totalLockedRecords,
      stats,
      courses: Array.isArray(courses) ? courses : [],
      classes: Array.isArray(classes) ? classes : [],
      subjects: Array.isArray(subjects) ? subjects : []
    };
  } catch (err) {
    // API lỗi → trả 0/trống (KHÔNG bịa số liệu). Trang sẽ hiển thị "Không có dữ liệu".
    console.warn("Không lấy được thống kê từ API:", err);
    return {
      activeLearnersCount: 0,
      etrCount: 0,
      coursesCount: 0,
      classesCount: 0,
      subjectsCount: 0,
      evidencesCount: 0,
      complianceRate: null,
      totalLockedRecords: null,
      stats: null,
      courses: [],
      classes: [],
      subjects: []
    };
  }
};

/**
 * Public Analytics Overview API
 */
export const fetchPublicAnalyticsOverview = async () => {
  // 100% dữ liệu từ API — không có hardcode/mock. Không có dữ liệu thật → ném lỗi
  // để trang hiển thị trạng thái "Không có dữ liệu" thay vì số liệu giả.
  const realStats = await fetchRealBackendStats();
  const hasData =
    realStats.activeLearnersCount > 0 ||
    realStats.etrCount > 0 ||
    (Array.isArray(realStats.courses) && realStats.courses.length > 0);
  if (!hasData) {
    throw new Error("Không có dữ liệu thống kê từ API");
  }
  return {
    totalTechnicians: realStats.activeLearnersCount || null,
    activeCertifications: realStats.etrCount || null,
    auditPassRate: realStats.complianceRate || null,
    averageSignoffTime: null,
    monthlyCompletionRate: null,
    attendanceRate: null,
    missingEvidenceRate: null,
    complianceTrends: [],
    fleetReadiness: (realStats.courses || []).map(c => ({
      program: c.courseName || c.courseCode || "Aviation Course",
      readiness: null,
      status: null
    }))
  };
};

/**
 * Public Careers API
 */
export const fetchPublicCareersJobs = async () => {
  // 100% dữ liệu từ API — API lỗi/không có endpoint → throw để trang hiển thị trống.
  return await apiFetch("/careers/jobs");
};

export const submitCareerApplication = async (applicationData) => {
  try {
    return await apiFetch("/careers/applications", {
      method: "POST",
      body: JSON.stringify(applicationData)
    });
  } catch (err) {
    console.error("Không gửi được đơn ứng tuyển:", err);
    return { success: false, message: translateVn("Không gửi được đơn. Vui lòng thử lại sau.") };
  }
};

/**
 * Public Newsroom API
 */
export const fetchPublicNews = async () => {
  // 100% dữ liệu từ API — API lỗi/không có endpoint → throw để trang hiển thị trống.
  return await apiFetch("/news");
};

export const fetchPublicNewsById = async (id) => {
  const newsList = await fetchPublicNews();
  const found = newsList.find(n => String(n.id) === String(id));
  // Không có tin trùng id → trả null để trang hiển thị "Article not found" (không bịa bài giả)
  return found || null;
};

/**
 * Public Regulatory Library API
 */
export const fetchPublicRegulatoryDocs = async () => {
  return await apiFetch("/regulatory-library");
};

/**
 * Public Contact Form API
 */
export const submitContactForm = async (contactData) => {
  try {
    return await apiFetch("/contact", {
      method: "POST",
      body: JSON.stringify(contactData)
    });
  } catch (err) {
    console.error("Không gửi được form liên hệ:", err);
    return { success: false, message: translateVn("Không gửi được tin nhắn. Vui lòng thử lại sau.") };
  }
};

/**
 * Định dạng chuỗi ngày giờ từ Backend (UTC) sang giờ địa phương Việt Nam (GMT+7).
 * Tự động gắn hậu tố 'Z' nếu chuỗi chưa có để trình duyệt nhận diện chính xác là UTC.
 */
export const formatDateTime = (dateStr, options = {}) => {
  if (!dateStr || dateStr === "—") return "—";
  try {
    const raw = String(dateStr).trim();
    const utcStr = raw.endsWith("Z") || raw.includes("+") || raw.includes("-", 10) ? raw : `${raw}Z`;
    const d = new Date(utcStr);
    if (Number.isNaN(d.getTime())) return String(dateStr);
    return d.toLocaleString("vi-VN", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
      ...options,
    });
  } catch {
    return String(dateStr);
  }
};


