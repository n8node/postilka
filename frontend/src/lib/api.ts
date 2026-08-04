export type User = {
  id: string;
  email: string;
  name: string;
  locale: string;
  timezone: string;
  is_blocked: boolean;
  is_platform_admin: boolean;
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
  active_workspace: Workspace | null;
  workspaces: Workspace[];
};

export type AdminUserWorkspace = {
  id: string;
  name: string;
  slug: string;
  role: string;
};

export type AdminUser = {
  id: string;
  email: string;
  name: string;
  locale: string;
  timezone: string;
  is_blocked: boolean;
  is_platform_admin: boolean;
  created_at: string;
  updated_at: string;
  workspace: AdminUserWorkspace | null;
};

export type AdminUsersResponse = {
  total: number;
  users: AdminUser[];
};

export type AdminUsersQuery = {
  q?: string;
  is_blocked?: boolean;
  is_platform_admin?: boolean;
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

export function fetchWorkspaces() {
  return apiFetch<{ workspaces: Workspace[] }>("/workspaces");
}

export function setActiveWorkspace(workspaceId: string) {
  return apiFetch<{ workspace: Workspace; active_workspace: Workspace }>(
    "/workspaces/active",
    {
      method: "POST",
      body: JSON.stringify({ workspace_id: workspaceId }),
    },
  );
}

export function fetchAdminUsers(query: AdminUsersQuery = {}) {
  const params = new URLSearchParams();
  if (query.q?.trim()) params.set("q", query.q.trim());
  if (typeof query.is_blocked === "boolean") {
    params.set("is_blocked", String(query.is_blocked));
  }
  if (typeof query.is_platform_admin === "boolean") {
    params.set("is_platform_admin", String(query.is_platform_admin));
  }
  const qs = params.toString();
  return apiFetch<AdminUsersResponse>(`/admin/users${qs ? `?${qs}` : ""}`);
}
