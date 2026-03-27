import axios from "axios";
import toast from "react-hot-toast";

/**
 * 🛡️ Hardened API Service Layer
 * - Multi-tenant Authentication
 * - Automatic Token Rotation (Silent Refresh)
 * - Standardized Error Interception
 */

const API = axios.create({
  // Security: Use environment variable, fallback to localhost only in dev
  baseURL: process.env.REACT_APP_API_URL || "http://localhost:8000/api/",
  headers: {
    "Content-Type": "application/json",
  },
});

// Request interceptor: Attach JWT bearer token
API.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("access_token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor: Handle expired tokens, paginated results, and global errors
API.interceptors.response.use(
  (response) => {
    // 🛡️ Fail-safe: Automatically unpack DRF paginated results for backward compatibility
    // This allows existing components using setList(res.data) to keep working
    if (response.data && response.data.results && Array.isArray(response.data.results)) {
      const originalResults = response.data.results;
      // Attach metadata to the array so advanced components can still access it
      originalResults._pagination = {
        count: response.data.count,
        next: response.data.next,
        previous: response.data.previous
      };
      response.data = originalResults;
    }
    return response;
  },
  async (error) => {
    const originalRequest = error.config;

    // 1. Handle Token Expiry (401) with Silent Rotation
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      const refreshToken = localStorage.getItem("refresh_token");

      if (refreshToken) {
        try {
          const response = await axios.post(
            `${API.defaults.baseURL}auth/token/refresh/`, 
            { refresh: refreshToken }
          );

          if (response.status === 200) {
            localStorage.setItem("access_token", response.data.access);
            API.defaults.headers.common["Authorization"] = `Bearer ${response.data.access}`;
            return API(originalRequest);
          }
        } catch (refreshError) {
          // Token rotation failed -> Session absolute expiry
          console.error("Session expired. Redirecting to login.");
          localStorage.clear();
          window.location.href = "/login?session=expired";
        }
      }
    }

    // 2. Global Error Handling
    if (error.response) {
      const status = error.response.status;
      const data = error.response.data;

      if (status === 403) {
        toast.error("Permission Denied: You do not have access to this module.");
      } else if (status === 429) {
        toast.error("Too many requests. Please slow down.");
      } else if (status >= 500) {
        toast.error("Server Error: Our engineers have been notified.");
      }
    } else {
      toast.error("Network Error: Please check your internet connection.");
    }

    return Promise.reject(error);
  }
);

export default API;
