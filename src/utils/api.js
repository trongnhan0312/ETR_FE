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
 * Try each base URL until one works.
 * Only retries on network errors (fetch throws), NOT on API-level errors (4xx/5xx).
 */
async function fetchWithFallback(
  urls,
  endpoint,
  fetchOptions,
  method,
  options,
) {
  for (const baseUrl of urls) {
    let response;
    try {
      const url = `${baseUrl}${endpoint}`;
      console.log(`[API ${method}] Requesting: ${url}`);
      response = await fetch(url, fetchOptions);
    } catch (error) {
      // Network error - server not reachable, try next URL
      console.warn(
        `[API ${method}] Cannot reach ${baseUrl}${endpoint}:`,
        error.message,
      );
      continue;
    }
    // Fetch succeeded (server responded), process the response
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
      API_BASE_URLS,
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
      API_BASE_URLS,
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
      API_BASE_URLS,
      endpoint,
      { method: "POST", headers: getAuthHeaders(true), body: formData },
      "FORMDATA",
      {},
    );
  },

  put: async (endpoint, data) => {
    return fetchWithFallback(
      API_BASE_URLS,
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
      API_BASE_URLS,
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
      API_BASE_URLS,
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
    for (const baseUrl of API_BASE_URLS) {
      let response;
      try {
        const url = `${baseUrl}${endpoint}`;
        console.log(`[API DOWNLOAD] Requesting: ${url}`);
        response = await fetch(url, { method: "GET", headers: getAuthHeaders() });
      } catch (error) {
        // Network error — thử base URL kế tiếp
        console.warn(
          `[API DOWNLOAD] Cannot reach ${baseUrl}${endpoint}:`,
          error.message,
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
      return await response.blob();
    }
    const errMsg = `Cannot reach any API server for ${endpoint}`;
    console.error(`[API DOWNLOAD] ${errMsg}`);
    throw new Error(errMsg);
  },
};
