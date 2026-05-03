import React, { useState, useCallback, useEffect } from "react";
import { request, setTokens, clearTokens, getAccessToken } from "@/lib/http";
import type { RegistrationStatus, SessionUser, UserRole } from "@/types/auth";
import { AuthContext } from "@/contexts/auth-context";

type ApiUser = {
  id: string;
  name: string;
  email: string;
  role: string;
  avatar?: string | null;
  registrationStatus?: RegistrationStatus;
};

type ApiProfile = { _id: string } | null;

type AuthPayload = {
  user: ApiUser;
  profile: ApiProfile;
  accessToken: string;
  refreshToken: string;
};

function mapPayloadToSession(data: Omit<AuthPayload, "accessToken" | "refreshToken">): SessionUser {
  const { user, profile } = data;
  const role = user.role as UserRole;
  const base: SessionUser = {
    id: String(user.id),
    name: user.name,
    email: user.email,
    role,
    avatar: user.avatar,
    registrationStatus: user.registrationStatus,
  };
  if (profile && role === "patient") {
    base.patientProfileId = String(profile._id);
  }
  if (profile && role === "doctor") {
    base.doctorProfileId = String(profile._id);
  }
  return base;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [bootstrapping, setBootstrapping] = useState(true);

  const applyPayload = useCallback((data: AuthPayload) => {
    setTokens(data.accessToken, data.refreshToken);
    setUser(mapPayloadToSession(data));
  }, []);

  useEffect(() => {
    (async () => {
      if (!getAccessToken()) {
        setBootstrapping(false);
        return;
      }
      try {
        const me = await request<{ user: ApiUser; profile: ApiProfile }>("/api/auth/me");
        setUser(mapPayloadToSession({ ...me, accessToken: "", refreshToken: "" }));
      } catch {
        clearTokens();
        setUser(null);
      } finally {
        setBootstrapping(false);
      }
    })();
  }, []);

  const login = useCallback(
    async (email: string, password: string) => {
      const data = await request<AuthPayload>("/api/auth/login", {
        method: "POST",
        json: { email, password },
      });
      applyPayload(data);
      return mapPayloadToSession(data);
    },
    [applyPayload]
  );

  const logout = useCallback(async () => {
    try {
      if (getAccessToken()) {
        await request<unknown>("/api/auth/logout", { method: "POST", json: {} });
      }
    } catch {
      /* ignore */
    } finally {
      clearTokens();
      setUser(null);
    }
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: Boolean(user),
        bootstrapping,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
