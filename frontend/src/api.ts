import type { DashboardSummary, LineStatus, Transaction, TransactionPayload } from "./types";

const API_BASE = import.meta.env.VITE_API_URL ?? "";

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    headers: { "Content-Type": "application/json", ...(options?.headers ?? {}) },
    ...options,
  });
  if (response.status === 204) {
    return undefined as T;
  }
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const detail = data.detail;
    const message = Array.isArray(detail)
      ? detail.map((item: { msg?: string }) => item.msg).join(", ")
      : detail || "เกิดข้อผิดพลาด";
    throw new Error(message);
  }
  return data as T;
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

export function simulateMockSlip() {
  return request<Transaction>("/api/slips/simulate-mock", {
    method: "POST",
  });
}

export function getExportCsvUrl(params: Record<string, string | undefined> = {}) {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value) search.set(key, value);
  });
  const query = search.toString();
  return `${API_BASE}/api/transactions/export${query ? `?${query}` : ""}`;
}

