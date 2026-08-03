import { cookies } from "next/headers";
import type { MeResponse } from "./api";

function serverApiBase() {
  return (
    process.env.INTERNAL_API_URL?.replace(/\/$/, "") || "http://backend:8080"
  );
}

export async function getMe(): Promise<MeResponse | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get("access_token");
  if (!token?.value) return null;

  try {
    const res = await fetch(`${serverApiBase()}/api/v1/auth/me`, {
      headers: { Cookie: `access_token=${token.value}` },
      cache: "no-store",
    });
    if (!res.ok) return null;
    return (await res.json()) as MeResponse;
  } catch {
    return null;
  }
}
