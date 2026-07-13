import axios, { AxiosError } from "axios";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080/api";

// Suppress AxiosError spam di browser console — error sudah ditangani via toast
if (typeof window !== "undefined") {
  const _origError = console.error.bind(console);
  console.error = (...args: any[]) => {
    // Filter AxiosError dan unhandled promise rejection dari axios
    if (
      args[0] instanceof AxiosError ||
      (typeof args[0] === "string" && args[0].includes("AxiosError")) ||
      (args[0]?.name === "AxiosError")
    ) {
      return; // silent — sudah ada toast
    }
    _origError(...args);
  };
}

export const api = axios.create({
  baseURL: API_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

// Request interceptor to attach JWT access token
api.interceptors.request.use(
  (config) => {
    if (typeof window !== "undefined") {
      const authData = localStorage.getItem("jurnal_auth");
      if (authData) {
        try {
          const { state } = JSON.parse(authData);
          if (state?.accessToken) {
            config.headers.Authorization = `Bearer ${state.accessToken}`;
          }
        } catch (e) {
          console.error("Error parsing auth state", e);
        }
      }
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor to handle token refresh
let isRefreshing = false;
let failedQueue: any[] = [];

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (token) {
      prom.resolve(token);
    } else {
      prom.reject(error);
    }
  });
  failedQueue = [];
};

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      // Jangan coba refresh jika request yang gagal adalah login/refresh itu sendiri
      const url = originalRequest.url || "";
      if (url.includes("/auth/login") || url.includes("/auth/refresh")) {
        return Promise.reject(error);
      }
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            return api(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const authData = localStorage.getItem("jurnal_auth");
        if (!authData) {
          // Tidak ada auth data = user belum login, jangan redirect paksa
          isRefreshing = false;
          return Promise.reject(error);
        }

        const parsed = JSON.parse(authData);
        const refreshToken = parsed.state?.refreshToken;
        if (!refreshToken) {
          // Tidak ada refresh token, bersihkan dan redirect
          localStorage.removeItem("jurnal_auth");
          if (typeof window !== "undefined" && !window.location.pathname.includes("/login")) {
            window.location.href = "/login";
          }
          isRefreshing = false;
          return Promise.reject(error);
        }

        // Request new access token using raw axios to bypass interceptors
        const refreshResponse = await axios.post(`${API_URL}/auth/refresh`, {
          refresh_token: refreshToken,
        });

        const { access_token, refresh_token: newRefreshToken, user } = refreshResponse.data.data;

        // Save back to localStorage
        localStorage.setItem(
          "jurnal_auth",
          JSON.stringify({
            state: {
              accessToken: access_token,
              refreshToken: newRefreshToken || refreshToken,
              user,
            },
          })
        );

        processQueue(null, access_token);
        originalRequest.headers.Authorization = `Bearer ${access_token}`;
        return api(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);
        // Hanya redirect ke login jika sudah di halaman yang membutuhkan auth
        if (typeof window !== "undefined" && !window.location.pathname.includes("/login")) {
          localStorage.removeItem("jurnal_auth");
          window.location.href = "/login";
        }
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);
