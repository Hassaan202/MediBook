import { request } from "@/lib/http";

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  email: string;
  password: string;
  name: string;
  role: "patient" | "doctor" | "admin";
  [key: string]: unknown;
}

export const authService = {
  register: (data: RegisterData) =>
    request("/api/auth/register", { method: "POST", json: data }),

  login: (credentials: LoginCredentials) =>
    request("/api/auth/login", { method: "POST", json: credentials }),

  logout: () =>
    request("/api/auth/logout", { method: "POST", json: {} }),

  getCurrentUser: () =>
    request("/api/auth/me"),

  refreshToken: (refreshToken: string) =>
    request("/api/auth/refresh", { method: "POST", json: { refreshToken } }),

  forgotPassword: (email: string) =>
    request("/api/auth/forgot-password", { method: "POST", json: { email } }),

  resetPassword: (token: string, password: string) =>
    request("/api/auth/reset-password", { method: "POST", json: { token, password } }),
};

export default authService;
