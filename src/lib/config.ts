const raw = import.meta.env.VITE_API_URL as string | undefined;
export const API_BASE = (raw && raw.replace(/\/$/, "")) || "";

export function apiUrl(path: string): string {
  if (path.startsWith("http")) return path;
  const p = path.startsWith("/") ? path : `/${path}`;
  return `${API_BASE}${p}`;
}
