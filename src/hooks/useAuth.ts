import { useContext } from "react";
import { AuthContext } from "@/contexts/auth-context";
import type { SessionUser, UserRole } from "@/types/auth";

export type { SessionUser, UserRole };

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
