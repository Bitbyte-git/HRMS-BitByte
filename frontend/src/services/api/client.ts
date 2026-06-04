import axios from "axios";
import toast from "react-hot-toast";

const RAW_BASE_URL =
  import.meta.env.VITE_API_URL ||
  "https://bitbyte-backend.onrender.com/api/v1";

const BASE_URL = RAW_BASE_URL.replace(/\/$/, "").endsWith("/api/v1")
  ? RAW_BASE_URL.replace(/\/$/, "")
  : `${RAW_BASE_URL.replace(/\/$/, "")}/api/v1`;

export const apiClient = axios.create({
  baseURL: BASE_URL,
  timeout: 30000,
  headers: { Accept: "application/json" },
});

apiClient.interceptors.request.use(
  (config) => {
    if (config.data instanceof FormData) {
      const headers = config.headers as any;
      if (typeof headers.delete === "function") {
        headers.delete("Content-Type");
      } else {
        delete headers["Content-Type"];
        delete headers["content-type"];
      }
    }

    const token = localStorage.getItem("auth_token");
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
  },
  (error) => Promise.reject(error),
);

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const { response } = error;
    if (!response) {
      toast.error("Network error. Please check your connection.");
      return Promise.reject(error);
    }
    const { status, data } = response;
    switch (status) {
      case 401:
        if (data?.code !== "FIRST_LOGIN_RESET_REQUIRED") {
          localStorage.removeItem("auth_token");
          localStorage.removeItem("auth_user");
          window.location.href = "/login";
        }
        break;
      case 403:
        if (data?.code !== "FIRST_LOGIN_RESET_REQUIRED")
          toast.error("Access denied.");
        break;
      case 429:
        toast.error("Too many requests. Please wait and try again.");
        break;
      case 500:
        toast.error("Server error. Please try again later.");
        break;
    }
    return Promise.reject(error);
  },
);

export default apiClient;
