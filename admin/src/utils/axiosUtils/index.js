import axios from "axios";
import getCookie from "../customFunctions/GetCookie";
import Cookies from "js-cookie";
import { ToastNotification } from "../customFunctions/ToastNotification";
import { toast } from "react-toastify";

let last403At = 0;
const ACCESS_DENIED_TOAST_ID = "access-denied-403";

const client = axios.create({
  baseURL: process.env.API_PROD_URL,
  headers: {
    Accept: "application/json",
    "Content-Type": "application/json",
  },
  timeout: 30000,
});

const normalizeUrl = (u = "") => {
  // handles: "admin/self", "/admin/self", "/api/admin/self", "http://..../api/admin/self"
  try {
    // if absolute URL
    const parsed = new URL(u);
    return parsed.pathname || u;
  } catch {
    return u.startsWith("/") ? u : `/${u}`;
  }
};

const isSelfEndpoint = (u = "") => {
  const raw = (u || "").toString().trim();

  // covers: "self" and "/self"
  if (raw === "self" || raw === "/self") return true;

  const path = normalizeUrl(raw);
  // covers: "/admin/self", "/api/admin/self", and anything ending with "/self"
  return path.endsWith("/admin/self") || path.includes("/admin/self") || path.endsWith("/self");
};

// Endpoints that require authentication - skip entirely when no token
const isProtectedEndpoint = (u = "") => {
  if (isSelfEndpoint(u)) return true;
  const raw = (u || "").toString().trim().toLowerCase();
  const path = normalizeUrl(raw);
  const protectedPaths = ["/settings", "/badge", "/notifications", "/profile", "/me"];
  return protectedPaths.some(p => path.endsWith(p) || path.includes(p + "/") || raw === p.substring(1));
};

const request = async ({ ...options }, router) => {
  const token = getCookie("uat");
  const url = options?.url || "";

  // Guard against accidental calls to the API base URL (e.g. missing endpoint path)
  if (!url || (typeof url === "string" && !url.trim())) {
    if (process.env.NODE_ENV === "development") {
      console.warn("Skipped API request because endpoint URL is empty.", options);
    }
    return {
      data: {},
      status: 204,
      statusText: "No Content",
      headers: {},
      config: options,
    };
  }

  // ✅ HARD BLOCK: don't call protected endpoints if not logged in (prevents 401 spam)
  if (!token && isProtectedEndpoint(url)) {
    return {
      data: null,
      status: 204,
      statusText: "No Content",
      headers: {},
      config: options,
    };
  }


  // Attach token only if exists
  if (token) {
    client.defaults.headers.common.Authorization = `Bearer ${token}`;
  } else {
    delete client.defaults.headers.common.Authorization;
  }

  const onSuccess = (response) => response;

  const onError = (error) => {
    const status = error?.response?.status;
    const message = error?.response?.data?.message || error?.message;

    // ✅ 401: Only logout/redirect if user HAD a token (session expired)
    if (status === 401) {
      // Silently handle 401 for protected endpoints when no token
      if (!token && isProtectedEndpoint(url)) {
        return {
          data: null,
          status: 401,
          statusText: "Unauthorized",
          headers: {},
          config: options,
        };
      }
      if (token) {
        Cookies.remove("uat");
        Cookies.remove("ue");
        Cookies.remove("account");
        localStorage.clear();
        router && router.push("/auth/login");
      }
      throw error;
    }

    if (status === 403) {
      const denyMessage =
        error?.response?.data?.message ||
        "You do not have permission to perform this action. Please contact an administrator.";

      const now = Date.now();
      if (!toast.isActive(ACCESS_DENIED_TOAST_ID) && now - last403At > 3000) {
        ToastNotification("error", `Access Denied: ${denyMessage}`, {
          toastId: ACCESS_DENIED_TOAST_ID,
          autoClose: 3000,
        });
        last403At = now;
      }
      throw error;
    }

    if (process.env.NODE_ENV === "development") {
      // Don't spam console with 401s for protected endpoints
      if (!(status === 401 && isProtectedEndpoint(url))) {
        console.error("API Error:", {
          url,
          status,
          message,
        });
      }
    }

    throw error;
  };

  try {
    const response = await client(options);
    return onSuccess(response);
  } catch (error) {
    return onError(error);
  }
};

export default request;
