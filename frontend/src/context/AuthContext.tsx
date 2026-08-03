"use client";

import type { MeResponse } from "@/lib/api";
import { createContext, useContext } from "react";

const AuthContext = createContext<MeResponse | null>(null);

export function AuthProvider({
  value,
  children,
}: {
  value: MeResponse;
  children: React.ReactNode;
}) {
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth outside AuthProvider");
  return ctx;
}
