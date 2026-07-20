const API_BASE_URL =
  import.meta.env.VITE_API_URL || "https://localhost:7169/api";

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

export const api = {
  get: async (endpoint) => {
    console.log(`[API GET] Requesting: ${API_BASE_URL}${endpoint}`);
    try {
      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        method: "GET",
        headers: getAuthHeaders(),
      });
      console.log(
        `[API GET] Response Status: ${response.status} for ${endpoint}`,
      );
      if (!response.ok) {
        const err = await response.text();
        console.error(
          `[API GET] Failed: Status ${response.status}, Error:`,
          err,
        );
        throw new Error(err || `Request failed with status ${response.status}`);
      }
      const data = await response.json();
      console.log(`[API GET] Success data for ${endpoint}:`, data);
      return data;
    } catch (error) {
      console.error(`[API GET] Error calling ${endpoint}:`, error);
      throw error;
    }
  },

  post: async (endpoint, data) => {
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
      console.log(
        `[API POST] Response Status: ${response.status} for ${endpoint}`,
      );
      if (!response.ok) {
        const err = await response.text();
        console.error(
          `[API POST] Failed: Status ${response.status}, Error:`,
          err,
        );
        throw new Error(err || `Request failed with status ${response.status}`);
      }
      if (response.status === 204) {
        console.log(`[API POST] Success (No Content) for ${endpoint}`);
        return null;
      }
      try {
        const resData = await response.json();
        console.log(`[API POST] Success data for ${endpoint}:`, resData);
        return resData;
      } catch {
        console.log(`[API POST] Success (Empty Body) for ${endpoint}`);
        return null;
      }
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
      console.log(
        `[API FORM DATA POST] Response Status: ${response.status} for ${endpoint}`,
      );
      if (!response.ok) {
        const err = await response.text();
        console.error(
          `[API FORM DATA POST] Failed: Status ${response.status}, Error:`,
          err,
        );
        throw new Error(err || `Request failed with status ${response.status}`);
      }
      if (response.status === 204) {
        console.log(
          `[API FORM DATA POST] Success (No Content) for ${endpoint}`,
        );
        return null;
      }
      try {
        const resData = await response.json();
        console.log(
          `[API FORM DATA POST] Success data for ${endpoint}:`,
          resData,
        );
        return resData;
      } catch {
        console.log(
          `[API FORM DATA POST] Success (Empty Body) for ${endpoint}`,
        );
        return null;
      }
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
      console.log(
        `[API PUT] Response Status: ${response.status} for ${endpoint}`,
      );
      if (!response.ok) {
        const err = await response.text();
        console.error(
          `[API PUT] Failed: Status ${response.status}, Error:`,
          err,
        );
        throw new Error(err || `Request failed with status ${response.status}`);
      }
      if (response.status === 204) {
        console.log(`[API PUT] Success (No Content) for ${endpoint}`);
        return null;
      }
      try {
        const resData = await response.json();
        console.log(`[API PUT] Success data for ${endpoint}:`, resData);
        return resData;
      } catch {
        console.log(`[API PUT] Success (Empty Body) for ${endpoint}`);
        return null;
      }
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
      console.log(
        `[API PATCH] Response Status: ${response.status} for ${endpoint}`,
      );
      if (!response.ok) {
        const err = await response.text();
        console.error(
          `[API PATCH] Failed: Status ${response.status}, Error:`,
          err,
        );
        throw new Error(err || `Request failed with status ${response.status}`);
      }
      if (response.status === 204) {
        console.log(`[API PATCH] Success (No Content) for ${endpoint}`);
        return null;
      }
      try {
        const resData = await response.json();
        console.log(`[API PATCH] Success data for ${endpoint}:`, resData);
        return resData;
      } catch {
        console.log(`[API PATCH] Success (Empty Body) for ${endpoint}`);
        return null;
      }
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
      console.log(
        `[API DELETE] Response Status: ${response.status} for ${endpoint}`,
      );
      if (!response.ok) {
        const err = await response.text();
        console.error(
          `[API DELETE] Failed: Status ${response.status}, Error:`,
          err,
        );
        throw new Error(err || `Request failed with status ${response.status}`);
      }
      if (response.status === 204) {
        console.log(`[API DELETE] Success (No Content) for ${endpoint}`);
        return null;
      }
      try {
        const resData = await response.json();
        console.log(`[API DELETE] Success data for ${endpoint}:`, resData);
        return resData;
      } catch {
        console.log(`[API DELETE] Success (Empty Body) for ${endpoint}`);
        return null;
      }
    } catch (error) {
      console.error(`[API DELETE] Error calling ${endpoint}:`, error);
      throw error;
    }
  },
};
