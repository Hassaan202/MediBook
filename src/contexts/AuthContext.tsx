import React, { createContext, useContext, useState, useCallback } from "react";

export type UserRole = "patient" | "doctor" | "admin";

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatar?: string;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (data: { name: string; email: string; password: string; role: UserRole }) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

const MOCK_USERS: Record<string, User & { password: string }> = {
  "patient@demo.com": { id: "p1", name: "Sarah Johnson", email: "patient@demo.com", role: "patient", password: "password" },
  "doctor@demo.com": { id: "d1", name: "Dr. Michael Chen", email: "doctor@demo.com", role: "doctor", password: "password" },
  "admin@demo.com": { id: "a1", name: "Admin User", email: "admin@demo.com", role: "admin", password: "password" },
};

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(() => {
    const stored = localStorage.getItem("hms_user");
    return stored ? JSON.parse(stored) : null;
  });

  const login = useCallback(async (email: string, _password: string) => {
    await new Promise((r) => setTimeout(r, 500));
    const found = MOCK_USERS[email];
    if (!found) throw new Error("Invalid credentials. Try patient@demo.com, doctor@demo.com, or admin@demo.com");
    const { password: _, ...userData } = found;
    setUser(userData);
    localStorage.setItem("hms_user", JSON.stringify(userData));
  }, []);

  const register = useCallback(async (data: { name: string; email: string; password: string; role: UserRole }) => {
    await new Promise((r) => setTimeout(r, 500));
    const newUser: User = { id: `${data.role[0]}${Date.now()}`, name: data.name, email: data.email, role: data.role };
    setUser(newUser);
    localStorage.setItem("hms_user", JSON.stringify(newUser));
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    localStorage.removeItem("hms_user");
  }, []);

  return (
    <AuthContext.Provider value={{ user, isAuthenticated: !!user, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
