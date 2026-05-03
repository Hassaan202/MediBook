import { apiUrl } from "./config";

const AT_KEY = "medibook_at";
const RT_KEY = "medibook_rt";

export function getAccessToken(): string | null {
  return localStorage.getItem(AT_KEY);
}

export function setTokens(access: string, refresh: string) {
  localStorage.setItem(AT_KEY, access);
  localStorage.setItem(RT_KEY, refresh);
}

export function clearTokens() {
  localStorage.removeItem(AT_KEY);
  localStorage.removeItem(RT_KEY);
}

export function getRefreshToken(): string | null {
  return localStorage.getItem(RT_KEY);
}

type Json = Record<string, unknown> | unknown[] | null;

export class ApiError extends Error {
  status: number;
  errors: { message?: string }[];

  constructor(message: string, status: number, errors: { message?: string }[] = []) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.errors = errors;
  }
}

export async function request<T>(
  path: string,
  init?: Omit<RequestInit, "body"> & { json?: Json; parseJson?: boolean }
): Promise<T> {
  const headers: Record<string, string> = {
    ...(init?.headers as Record<string, string>),
  };
  const token = getAccessToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  let body: BodyInit | undefined = init?.body as BodyInit | undefined;
  if (init?.json !== undefined) {
    headers["Content-Type"] = "application/json";
    body = JSON.stringify(init.json);
  }
  const res = await fetch(apiUrl(path), {
    ...init,
    headers,
    body,
  });
  const ct = res.headers.get("content-type") || "";
  const parseJson = init?.parseJson !== false;
  if (!parseJson || !ct.includes("application/json")) {
    if (!res.ok) {
      const t = await res.text();
      throw new ApiError(t.slice(0, 200) || `HTTP ${res.status}`, res.status);
    }
    return undefined as T;
  }
  const text = await res.text();
  let parsed: { success?: boolean; message?: string; data?: T; errors?: { message?: string }[] } =
    {};
  try {
    parsed = text ? JSON.parse(text) : {};
  } catch {
    throw new ApiError(text.slice(0, 200) || `HTTP ${res.status}`, res.status);
  }
  if (!res.ok) {
    throw new ApiError(
      parsed.message || `HTTP ${res.status}`,
      res.status,
      Array.isArray(parsed.errors) ? parsed.errors : []
    );
  }
  if (parsed.success === false) {
    throw new ApiError(
      parsed.message || "Request failed",
      res.status,
      Array.isArray(parsed.errors) ? parsed.errors : []
    );
  }
  return parsed.data as T;
}

export async function requestBlob(path: string, init?: RequestInit): Promise<Blob> {
  const headers: Record<string, string> = { ...(init?.headers as Record<string, string>) };
  const token = getAccessToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(apiUrl(path), { ...init, headers });
  if (!res.ok) {
    const t = await res.text();
    let msg = t.slice(0, 200);
    try {
      const j = JSON.parse(t) as { message?: string };
      if (j.message) msg = j.message;
    } catch {
      /* ignore */
    }
    throw new ApiError(msg, res.status);
  }
  return res.blob();
}
