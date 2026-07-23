const API_BASE_URL =
  import.meta.env.VITE_API_URL || "https://localhost:7169/api";

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
    console.log(`[API GET] Requesting: ${API_BASE_URL}${endpoint}`);
    try {
      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        method: "GET",
        headers: getAuthHeaders(),
      });
      return await handleResponse(response, "GET", endpoint, options);
    } catch (error) {
      console.error(`[API GET] Error calling ${endpoint}:`, error);
      throw error;
    }
  },

  post: async (endpoint, data, options = {}) => {
    const isFormData =
      typeof FormData !== "undefined" && data instanceof FormData;

    console.log(
      `[API POST] Requesting: ${API_BASE_URL}${endpoint} with Payload:`,
      data,
    );
    try {
      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        method: "POST",
        headers: getAuthHeaders(isFormData),
        body: isFormData ? data : JSON.stringify(data),
      });
      return await handleResponse(response, "POST", endpoint, options);
    } catch (error) {
      console.error(`[API POST] Error calling ${endpoint}:`, error);
      throw error;
    }
  },

  postFormData: async (endpoint, formData) => {
    console.log(`[API FORM DATA POST] Requesting: ${API_BASE_URL}${endpoint}`);
    try {
      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        method: "POST",
        headers: getAuthHeaders(true),
        body: formData,
      });
      return await handleResponse(response, "FORMDATA", endpoint);
    } catch (error) {
      console.error(`[API FORM DATA POST] Error calling ${endpoint}:`, error);
      throw error;
    }
  },

  put: async (endpoint, data) => {
    console.log(
      `[API PUT] Requesting: ${API_BASE_URL}${endpoint} with Payload:`,
      data,
    );
    try {
      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        method: "PUT",
        headers: getAuthHeaders(),
        body: JSON.stringify(data),
      });
      return await handleResponse(response, "PUT", endpoint);
    } catch (error) {
      console.error(`[API PUT] Error calling ${endpoint}:`, error);
      throw error;
    }
  },

  patch: async (endpoint, data) => {
    console.log(
      `[API PATCH] Requesting: ${API_BASE_URL}${endpoint} with Payload:`,
      data,
    );
    try {
      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        method: "PATCH",
        headers: getAuthHeaders(),
        body: data ? JSON.stringify(data) : undefined,
      });
      return await handleResponse(response, "PATCH", endpoint);
    } catch (error) {
      console.error(`[API PATCH] Error calling ${endpoint}:`, error);
      throw error;
    }
  },

  delete: async (endpoint) => {
    console.log(`[API DELETE] Requesting: ${API_BASE_URL}${endpoint}`);
    try {
      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        method: "DELETE",
        headers: getAuthHeaders(),
      });
      return await handleResponse(response, "DELETE", endpoint);
    } catch (error) {
      console.error(`[API DELETE] Error calling ${endpoint}:`, error);
      throw error;
    }
  },
};
