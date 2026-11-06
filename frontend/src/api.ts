import type {
  AuthResponse,
  DashboardSummary,
  LineStatus,
  SlipScanResponse,
  Transaction,
  TransactionPayload,
  User,
} from "./types";

const API_BASE = import.meta.env.VITE_API_URL ?? "";

export function getAuthToken(): string | null {
  return localStorage.getItem("finance_auth_token");
}

export function setAuthToken(token: string | null): void {
  if (token) localStorage.setItem("finance_auth_token", token);
  else localStorage.removeItem("finance_auth_token");
}

export function getStoredUser(): User | null {
  const raw = localStorage.getItem("finance_auth_user");
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function setStoredUser(user: User | null): void {
  if (user) localStorage.setItem("finance_auth_user", JSON.stringify(user));
  else localStorage.removeItem("finance_auth_user");
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const token = getAuthToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options?.headers as Record<string, string> ?? {}),
  };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
  });
  if (response.status === 204) {
    return undefined as T;
  }
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    if (response.status === 401 && !path.startsWith("/api/auth/")) {
      setAuthToken(null);
      setStoredUser(null);
      window.dispatchEvent(new Event("auth-changed"));
    }
    const detail = data.detail;
    const message = Array.isArray(detail)
      ? detail.map((item: { msg?: string }) => item.msg).join(", ")
      : detail || "เกิดข้อผิดพลาด";
    throw new Error(message);
  }
  return data as T;
}

export async function loginUser(username: string, password: string):Promise<AuthResponse> {
  const res = await request<AuthResponse>("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ username, password }),
  });
  setAuthToken(res.token);
  setStoredUser(res.user);
  window.dispatchEvent(new Event("auth-changed"));
  return res;
}

export async function registerUser(
  username: string,
  password: string,
  display_name: string
): Promise<AuthResponse> {
  const res = await request<AuthResponse>("/api/auth/register", {
    method: "POST",
    body: JSON.stringify({ username, password, display_name }),
  });
  setAuthToken(res.token);
  setStoredUser(res.user);
  window.dispatchEvent(new Event("auth-changed"));
  return res;
}

export async function loginDemoUser(): Promise<AuthResponse> {
  const res = await request<AuthResponse>("/api/auth/demo", {
    method: "POST",
  });
  setAuthToken(res.token);
  setStoredUser(res.user);
  window.dispatchEvent(new Event("auth-changed"));
  return res;
}

export function logoutUser(): void {
  setAuthToken(null);
  setStoredUser(null);
  window.dispatchEvent(new Event("auth-changed"));
}

export function fetchTransactions(params: Record<string, string | undefined> = {}) {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value) search.set(key, value);
  });
  const query = search.toString();
  return request<Transaction[]>(`/api/transactions${query ? `?${query}` : ""}`);
}

export function createTransaction(payload: TransactionPayload) {
  return request<Transaction>("/api/transactions", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function updateTransaction(id: number, payload: TransactionPayload) {
  return request<Transaction>(`/api/transactions/${id}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

export function deleteTransaction(id: number) {
  return request<void>(`/api/transactions/${id}`, { method: "DELETE" });
}

export function confirmTransaction(id: number, payload: TransactionPayload) {
  return request<Transaction>(`/api/transactions/${id}/confirm`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function rejectTransaction(id: number) {
  return request<Transaction>(`/api/transactions/${id}/reject`, { method: "POST" });
}

export function fetchSummary() {
  return request<DashboardSummary>("/api/dashboard/summary");
}

export function fetchCategories() {
  return request<{ categories: string[] }>("/api/categories");
}

export function fetchLineStatus() {
  return request<LineStatus>("/api/settings/line");
}

export function fetchHealth() {
  return request<{ status: string; database: string; line: string; ocr_provider: string }>("/api/health");
}

export function uploadSlip(imageBase64: string, filename?: string) {
  return request<Transaction>("/api/slips/upload", {
    method: "POST",
    body: JSON.stringify({ image_base64: imageBase64, filename }),
  });
}

export function scanSlip(imageBase64: string, filename?: string) {
  return request<SlipScanResponse>("/api/slips/scan", {
    method: "POST",
    body: JSON.stringify({ image_base64: imageBase64, filename }),
  });
}

export function simulateMockSlip() {
  return request<Transaction>("/api/slips/simulate-mock", {
    method: "POST",
  });
}

export function getExportCsvUrl(params: Record<string, string | undefined> = {}) {
  const search = new URLSearchParams();
  const token = getAuthToken();
  if (token) {
    search.set("token", token);
  }
  Object.entries(params).forEach(([key, value]) => {
    if (value) search.set(key, value);
  });
  const query = search.toString();
  return `${API_BASE}/api/transactions/export${query ? `?${query}` : ""}`;
}

