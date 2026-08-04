import { cookies } from "next/headers";
import type { MeResponse } from "./api";

function serverApiBase() {
  return (
    process.env.INTERNAL_API_URL?.replace(/\/$/, "") || "http://backend:8080"
  );
}

async function serverFetch<T>(path: string): Promise<T | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get("access_token");
  if (!token?.value) return null;

  try {
    const res = await fetch(`${serverApiBase()}/api/v1${path}`, {
      headers: { Cookie: `access_token=${token.value}` },
      cache: "no-store",
    });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

export async function getMe(): Promise<MeResponse | null> {
  return serverFetch<MeResponse>("/auth/me");
}

export type AdminMeResponse = {
  status: string;
  is_platform_admin: boolean;
  user: { id: string; email: string; name: string };
};

export async function getAdminMe(): Promise<AdminMeResponse | null> {
  return serverFetch<AdminMeResponse>("/admin/me");
}
