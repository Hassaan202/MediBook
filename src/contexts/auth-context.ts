import { createContext } from "react";
import type { SessionUser } from "@/types/auth";

export interface AuthContextType {
  user: SessionUser | null;
  isAuthenticated: boolean;
  bootstrapping: boolean;
  login: (email: string, password: string) => Promise<SessionUser>;
  logout: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextType | null>(null);
