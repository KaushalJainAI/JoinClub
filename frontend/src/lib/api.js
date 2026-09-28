import axios from "axios";

// Same-origin "/api/v1" in dev (Vite proxies it) and whenever the API is served from
// the frontend's domain; VITE_API_URL points at a separate API origin otherwise.
export const API_BASE = `${import.meta.env.VITE_API_URL || ""}/api/v1`;

export const api = axios.create({
  baseURL: API_BASE,
  withCredentials: true,
  // Required by the backend's CSRF guard on every state-changing request.
  headers: { "X-Requested-With": "XMLHttpRequest" },
});

// Handlers the app registers once (see App.jsx) for session-wide auth errors.
const authHandlers = { onUnauthorized: null, onMustChangePassword: null };
export const setAuthHandlers = (h) => Object.assign(authHandlers, h);

api.interceptors.response.use(
  (res) => res,
  (error) => {
    const status = error.response?.status;
    const code = error.response?.data?.code;
    const url = error.config?.url || "";
    if (code === "MUST_CHANGE_PASSWORD") authHandlers.onMustChangePassword?.();
    else if (status === 401 && !url.startsWith("/auth/")) authHandlers.onUnauthorized?.();
    return Promise.reject(error);
  }
);

export const errorMessage = (error, fallback = "Something went wrong. Please try again.") => {
  if (error?.response?.data?.message) return error.response.data.message;
  if (error?.message === "Network Error") return "Can't reach the server. Is the backend running?";
  // Errors our own code throws (not axios) carry a message meant for the user.
  return !error?.isAxiosError && error?.message ? error.message : fallback;
};
