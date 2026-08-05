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

export type AdminUserPlan = {
  id: string;
  slug: string;
  name: string;
  is_free: boolean;
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
  plan: AdminUserPlan | null;
};

export type Plan = {
  id: string;
  slug: string;
  name: string;
  description: string;
  is_free: boolean;
  is_active: boolean;
  is_popular: boolean;
  price_monthly_cents: number | null;
  price_yearly_cents: number | null;
  max_channels: number | null;
  max_posts_per_period: number | null;
  max_seats: number | null;
  storage_bytes: number | null;
  ai_text_tokens_quota: number | null;
  ai_media_credits_quota: number | null;
  free_plan_duration_days: number | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

export type PlanInput = {
  slug?: string;
  name: string;
  description?: string;
  is_free?: boolean;
  is_active?: boolean;
  is_popular?: boolean;
  price_monthly_cents?: number | null;
  price_yearly_cents?: number | null;
  max_channels?: number | null;
  max_posts_per_period?: number | null;
  max_seats?: number | null;
  storage_bytes?: number | null;
  ai_text_tokens_quota?: number | null;
  ai_media_credits_quota?: number | null;
  free_plan_duration_days?: number | null;
  sort_order?: number;
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

export function register(
  email: string,
  password: string,
  name?: string,
  inviteCode?: string,
) {
  return apiFetch<MeResponse>("/auth/register", {
    method: "POST",
    body: JSON.stringify({
      email,
      password,
      name,
      invite_code: inviteCode,
    }),
  });
}

export type AuthMethods = {
  invite_registration_enabled: boolean;
  vk_login_enabled?: boolean;
  max_login_enabled?: boolean;
};

export type LoginIdentity = {
  id: string;
  user_id: string;
  provider: "vk" | "max";
  provider_user_id: string;
  display_name: string;
  avatar_url?: string;
  created_at: string;
};

export type AdminAuthSettings = AuthMethods;

export function fetchAuthMethods() {
  return apiFetch<AuthMethods>("/auth/methods");
}

export function verifyInviteCode(inviteCode: string) {
  return apiFetch<{
    ok: boolean;
    invite_required: boolean;
    invite_code?: string;
  }>("/auth/invite/verify", {
    method: "POST",
    body: JSON.stringify({ invite_code: inviteCode }),
  });
}

export type UserInvite = {
  id: string;
  code: string;
  status: string;
  is_active: boolean;
  used_at?: string | null;
  created_at: string;
};

export function fetchUserInvites() {
  return apiFetch<{
    invite_registration_enabled: boolean;
    invites: UserInvite[];
  }>("/user/invites");
}

export type AdminInvite = {
  id: string;
  code: string;
  scope: "SYSTEM" | "USER";
  status: string;
  effective_status: string;
  created_at: string;
  used_at?: string | null;
  expires_at?: string | null;
  owner_user?: { id: string; email: string; name: string } | null;
  created_by_user?: { id: string; email: string; name: string } | null;
  used_by_user?: { id: string; email: string; name: string } | null;
};

export type InviteRelation = {
  id: string;
  invite_code: string;
  inviter?: { id: string; email: string; name: string } | null;
  invited?: { id: string; email: string; name: string } | null;
  used_at?: string | null;
};

export type AdminInvitesResponse = {
  invites: AdminInvite[];
  relations: InviteRelation[];
  stats: {
    total: number;
    active: number;
    used: number;
    total_relations: number;
    unique_inviters: number;
  };
  total: number;
  page: number;
  limit: number;
  total_pages: number;
};

export type AdminInvitesQuery = {
  search?: string;
  status?: string;
  scope?: string;
  page?: number;
  limit?: number;
};

export function fetchAdminInvites(query: AdminInvitesQuery = {}) {
  const params = new URLSearchParams();
  if (query.search?.trim()) params.set("search", query.search.trim());
  if (query.status) params.set("status", query.status);
  if (query.scope) params.set("scope", query.scope);
  if (query.page) params.set("page", String(query.page));
  if (query.limit) params.set("limit", String(query.limit));
  const qs = params.toString();
  return apiFetch<AdminInvitesResponse>(`/admin/invites${qs ? `?${qs}` : ""}`);
}

export function issueAdminInvites(count: number) {
  return apiFetch<{ invites: AdminInvite[]; count: number }>(
    "/admin/invites/issue",
    {
      method: "POST",
      body: JSON.stringify({ count }),
    },
  );
}

export function revokeAdminInvite(inviteId: string) {
  return apiFetch<{ status: string }>("/admin/invites/revoke", {
    method: "POST",
    body: JSON.stringify({ invite_id: inviteId }),
  });
}

export function fetchAdminAuthSettings() {
  return apiFetch<AuthMethods>("/admin/auth-settings");
}

export function updateAdminAuthSettings(settings: {
  invite_registration_enabled: boolean;
  vk_login_enabled?: boolean;
  max_login_enabled?: boolean;
}) {
  return apiFetch<AdminAuthSettings>("/admin/auth-settings", {
    method: "PUT",
    body: JSON.stringify(settings),
  });
}

export type UserInviteRelations = {
  invited_by?: {
    invite_id: string;
    invite_code: string;
    user?: { id: string; email: string; name: string } | null;
  } | null;
  invited_users: {
    id: string;
    email: string;
    name: string;
    invite_code: string;
    registered_at: string;
  }[];
};

export function fetchAdminUserInvites(userId: string) {
  return apiFetch<{ invites: UserInvite[] }>(`/admin/users/${userId}/invites`);
}

export function addAdminUserInvites(userId: string, count: number) {
  return apiFetch<{ invites: UserInvite[] }>(
    `/admin/users/${userId}/invites`,
    {
      method: "POST",
      body: JSON.stringify({ count }),
    },
  );
}

export function fetchAdminUserInviteRelations(userId: string) {
  return apiFetch<UserInviteRelations>(
    `/admin/users/${userId}/invite-relations`,
  );
}

export function fetchLoginIdentities() {
  return apiFetch<{
    identities: LoginIdentity[];
    methods: AuthMethods;
  }>("/user/login-identities");
}

export function unlinkLoginIdentity(provider: "vk" | "max") {
  return apiFetch<{ status: string }>(`/user/login-identities/${provider}`, {
    method: "DELETE",
  });
}

export function pollMAXOAuthStatus(token: string) {
  return apiFetch<{
    status: string;
    redirect_url?: string;
    deep_link?: string;
    error?: string;
  }>(`/auth/oauth/max/status?token=${encodeURIComponent(token)}`);
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

export function fetchAdminPlans() {
  return apiFetch<{ plans: Plan[] }>("/admin/plans");
}

export function createAdminPlan(body: PlanInput) {
  return apiFetch<Plan>("/admin/plans", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export function updateAdminPlan(id: string, body: PlanInput) {
  return apiFetch<Plan>(`/admin/plans/${id}`, {
    method: "PUT",
    body: JSON.stringify(body),
  });
}

export function deleteAdminPlan(id: string) {
  return apiFetch<{ status: string }>(`/admin/plans/${id}`, {
    method: "DELETE",
  });
}

export function assignAdminUserPlan(userId: string, planId: string) {
  return apiFetch<{ plan: Plan }>(`/admin/users/${userId}/plan`, {
    method: "PUT",
    body: JSON.stringify({ plan_id: planId }),
  });
}
