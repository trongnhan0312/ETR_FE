// --- API Base URLs ---
// Che do dev: uu tien local truoc, fallback sang deploy
// Che do production (Vercel): chi goi deploy (bo qua localhost de khoi bi cham)
const API_BASE_URL_LOCAL = "https://localhost:7169/api";
const API_BASE_URL_DEPLOY =
  "https://etrmanagement-be-fwhvagaxf3f3dmf0.southeastasia-01.azurewebsites.net/api";

// Vite tu dong nhan biet moi truong: import.meta.env.PROD === true khi build production
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

// Base URL đã khóa — sau request đầu tiên thành công, KHÔNG đổi sang base khác
let activeBaseUrl = null;

const resolveBaseUrlOrder = () => {
  if (isProduction) return [API_BASE_URL_DEPLOY];
  const manual = getManualApiMode();
  if (manual === "LOCAL") return [API_BASE_URL_LOCAL];
  if (manual === "DEPLOY") return [API_BASE_URL_DEPLOY];
  if (activeBaseUrl) return [activeBaseUrl];
  return API_BASE_URLS;
};

const lockBaseUrl = (baseUrl) => {
  if (!activeBaseUrl) {
    activeBaseUrl = baseUrl;
    console.info(
      `[API] 🔒 Đã khóa base URL: ${getApiBaseLabel(baseUrl)} (${baseUrl}) — MỌI request tiếp theo chỉ gọi base này.`,
    );
  }
};

/** Base URL đang dùng (cho các tầng fetch riêng như auditorApi download) */
export const getActiveApiBaseUrl = () => {
  if (isProduction) return API_BASE_URL_DEPLOY;
  const manual = getManualApiMode();
  if (manual === "LOCAL") return API_BASE_URL_LOCAL;
  if (manual === "DEPLOY") return API_BASE_URL_DEPLOY;
  return activeBaseUrl || API_BASE_URLS[0];
};

// --- Banner khởi động: log rõ chế độ + base URL sẽ dùng (LOCAL hay DEPLOY) ---
if (typeof console !== "undefined") {
  const mode = isProduction ? "PRODUCTION" : "DEV";
  const manual = getManualApiMode();
  const order = API_BASE_URLS.map(
    (u) => `${getApiBaseLabel(u)} (${u})`,
  ).join(" → ");
  let detail;
  if (isProduction) {
    detail =
      "Bản PRODUCTION: chỉ gọi DEPLOY (Azure) — bỏ qua localhost.";
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
    try {
      const url = `${baseUrl}${endpoint}`;
      console.log(
        `[API ${method}] Requesting: ${getApiBaseLabel(baseUrl)} (${url})`,
      );
      response = await fetch(url, fetchOptions);
    } catch (error) {
      // Network error - server not reachable. Nếu đã khóa base thì KHÔNG đổi base khác.
      console.warn(
        `[API ${method}] ⚠️ Không tới được API ${getApiBaseLabel(baseUrl)} (${baseUrl}${endpoint}):`,
        error.message,
        urls.length > 1
          ? "→ thử base URL kế tiếp (chỉ ở request đầu tiên)"
          : "",
      );
      continue;
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
      try {
        const url = `${baseUrl}${endpoint}`;
        console.log(
          `[API DOWNLOAD] Requesting: ${getApiBaseLabel(baseUrl)} (${url})`,
        );
        response = await fetch(url, { method: "GET", headers: getAuthHeaders() });
      } catch (error) {
        // Network error — nếu đã khóa base thì KHÔNG đổi base khác
        console.warn(
          `[API DOWNLOAD] ⚠️ Không tới được API ${getApiBaseLabel(baseUrl)} (${baseUrl}${endpoint}):`,
          error.message,
          urls.length > 1
            ? "→ thử base URL kế tiếp (chỉ ở request đầu tiên)"
            : "",
        );
        continue;
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
        throw new Error(err || `Download failed with status ${response.status}`);
      }
      lockBaseUrl(baseUrl);
      console.log(`[API DOWNLOAD] ✅ Đang dùng API ${getApiBaseLabel(baseUrl)} cho ${endpoint}`);
      return await response.blob();
    }
    const errMsg = `Cannot reach any API server for ${endpoint}`;
    console.error(`[API DOWNLOAD] ${errMsg}`);
    throw new Error(errMsg);
  },
};
