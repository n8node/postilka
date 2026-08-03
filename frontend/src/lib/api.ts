export type User = {
  id: string;
  email: string;
  name: string;
  locale: string;
  timezone: string;
  is_blocked: boolean;
  created_at: string;
};

export type Workspace = {
  id: string;
  name: string;
  slug: string;
  owner_id: string;
  role?: string;
  created_at: string;
};

export type MeResponse = {
  user: User;
  workspace: Workspace | null;
};

export class ApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

function clientBase() {
  return process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") || "/app/api/v1";
}

export async function apiFetch<T>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const res = await fetch(`${clientBase()}${path}`, {
    ...init,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(init.headers || {}),
    },
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg =
      typeof data === "object" && data && "error" in data
        ? String((data as { error: string }).error)
        : `HTTP ${res.status}`;
    throw new ApiError(res.status, msg);
  }
  return data as T;
}

export function login(email: string, password: string) {
  return apiFetch<MeResponse>("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
}

export function register(email: string, password: string, name?: string) {
  return apiFetch<MeResponse>("/auth/register", {
    method: "POST",
    body: JSON.stringify({ email, password, name }),
  });
}

export function logout() {
  return apiFetch<{ status: string }>("/auth/logout", { method: "POST" });
}

export function fetchMe() {
  return apiFetch<MeResponse>("/auth/me");
}
