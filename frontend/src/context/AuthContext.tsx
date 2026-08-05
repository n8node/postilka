"use client";

import { fetchMe, type MeResponse } from "@/lib/api";
import {
  createContext,
  useCallback,
  useContext,
  useState,
  type ReactNode,
} from "react";

export type AuthContextValue = MeResponse & {
  refreshAuth: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({
  initial,
  children,
}: {
  initial: MeResponse;
  children: ReactNode;
}) {
  const [me, setMe] = useState(initial);

  const refreshAuth = useCallback(async () => {
    const data = await fetchMe();
    setMe(data);
  }, []);

  return (
    <AuthContext.Provider value={{ ...me, refreshAuth }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth outside AuthProvider");
  return ctx;
}
