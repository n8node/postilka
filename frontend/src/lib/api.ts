export type User = {
  id: string;
  email: string;
  name: string;
  locale: string;
  timezone: string;
  is_blocked: boolean;
  is_platform_admin: boolean;
  avatar_url?: string;
  email_verified_at?: string | null;
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
  wallet_balance_cents: number;
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
  max_workflows: number | null;
  max_workflow_invites: number | null;
  push_on_ready: boolean;
  analytics_enabled: boolean;
  storage_bytes: number | null;
  max_file_size_bytes: number | null;
  trash_retention_days: number;
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
  max_workflows?: number | null;
  max_workflow_invites?: number | null;
  push_on_ready?: boolean;
  analytics_enabled?: boolean;
  storage_bytes?: number | null;
  max_file_size_bytes?: number | null;
  trash_retention_days?: number;
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

export type AdminFile = {
  id: string;
  workspace_id: string;
  workspace_name: string;
  folder_id: string | null;
  folder_name: string | null;
  uploaded_by_user_id: string | null;
  uploader_email: string | null;
  uploader_name: string | null;
  name: string;
  mime_type: string;
  size: number;
  media_metadata?: { duration_seconds?: number } | null;
  deleted_at?: string | null;
  created_at: string;
  updated_at: string;
};

export type AdminFileStats = {
  total_files: number;
  total_bytes: number;
  trash_files: number;
  trash_bytes: number;
};

export type AdminFilesQuery = {
  q?: string;
  workspace_id?: string;
  folder_id?: string;
  uploaded_by?: string;
  type?: string;
  created_from?: string;
  created_to?: string;
  size_min?: number;
  size_max?: number;
  deleted_only?: boolean;
  limit?: number;
  offset?: number;
};

export type AdminFilesResponse = {
  total: number;
  files: AdminFile[];
  stats: AdminFileStats;
};

export type AdminFileAIGeneration = {
  generation_id: string;
  job_id: string;
  mode: string;
  prompt: string;
  model: string;
  aspect_ratio: string;
  credit_cost: number;
  quota_credits_used: number;
  wallet_cents_charged: number;
  duration_ms: number;
  created_at: string;
};

export type AdminFileDetail = AdminFile & {
  s3_key: string;
  ai?: AdminFileAIGeneration | null;
};

export function fetchAdminFile(fileId: string) {
  return apiFetch<{ file: AdminFileDetail }>(
    `/admin/files/${encodeURIComponent(fileId)}`,
  );
}

export type AdminAnalyticsOverview = {
  users_total: number;
  users_new_in_period: number;
  workspaces_total: number;
  channels_total: number;
  channels_active: number;
  files_total: number;
  storage_bytes: number;
  trash_bytes: number;
  ai_generations_total: number;
  ai_generations_succeeded: number;
  ai_generations_failed: number;
  ai_credits_spent: number;
  ai_wallet_cents_spent: number;
  topups_cents: number;
  checkouts_cents: number;
  daily_registrations: { date: string; count: number }[];
  daily_ai_generations: {
    date: string;
    total: number;
    succeeded: number;
    failed: number;
    credits: number;
    quota_credits: number;
    wallet_cents: number;
  }[];
  daily_topups: { date: string; amount_cents: number; count: number }[];
  daily_checkouts: { date: string; amount_cents: number; count: number }[];
  daily_new_files: { date: string; count: number }[];
  ai_by_mode: { label: string; count: number }[];
  channels_by_provider: { label: string; count: number }[];
  files_by_type: { label: string; bytes: number; count: number }[];
};

export function fetchAdminAnalytics(query?: { from?: string; to?: string }) {
  const params = new URLSearchParams();
  if (query?.from) params.set("from", query.from);
  if (query?.to) params.set("to", query.to);
  const qs = params.toString();
  return apiFetch<{ from: string; to: string; overview: AdminAnalyticsOverview }>(
    `/admin/analytics${qs ? `?${qs}` : ""}`,
  );
}

export type AdminFolderListItem = {
  id: string;
  name: string;
};

export class ApiError extends Error {
  status: number;
  code?: string;

  constructor(status: number, message: string, code?: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

function clientBase() {
  return process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") || "/app/api/v1";
}

export async function apiFetch<T>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${clientBase()}${path}`, {
      ...init,
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        ...(init.headers || {}),
      },
    });
  } catch {
    throw new ApiError(
      0,
      "Сервер не ответил — соединение прервано. Подождите несколько секунд и повторите.",
    );
  }

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg =
      typeof data === "object" && data && "error" in data
        ? String((data as { error: string }).error)
        : `HTTP ${res.status}`;
    const code =
      typeof data === "object" && data && "code" in data
        ? String((data as { code: string }).code)
        : undefined;
    throw new ApiError(res.status, msg, code);
  }
  return data as T;
}

export function login(email: string, password: string) {
  return apiFetch<MeResponse>("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
}

export type RegisterResponse = {
  email_verification_required: boolean;
  email: string;
  message: string;
};

export function register(
  email: string,
  password: string,
  name?: string,
  inviteCode?: string,
  workspaceInviteToken?: string,
) {
  return apiFetch<RegisterResponse>("/auth/register", {
    method: "POST",
    body: JSON.stringify({
      email,
      password,
      name,
      invite_code: inviteCode,
      workspace_invite_token: workspaceInviteToken,
    }),
  });
}

export function verifyEmail(token: string) {
  return apiFetch<MeResponse>("/auth/verify-email", {
    method: "POST",
    body: JSON.stringify({ token }),
  });
}

export function forgotPassword(email: string) {
  return apiFetch<{ status: string; message: string }>("/auth/forgot-password", {
    method: "POST",
    body: JSON.stringify({ email }),
  });
}

export function resendVerification(email: string) {
  return apiFetch<{ status: string; message: string }>(
    "/auth/resend-verification",
    {
      method: "POST",
      body: JSON.stringify({ email }),
    },
  );
}

export function resendVerificationMe() {
  return apiFetch<{ status: string; message: string }>(
    "/auth/resend-verification/me",
    { method: "POST" },
  );
}

export function changeEmail(email: string, password: string) {
  return apiFetch<{ user: User; message: string }>("/user/email", {
    method: "PATCH",
    body: JSON.stringify({ email, password }),
  });
}

export type TimezoneOption = {
  id: string;
  label: string;
};

export function fetchTimezones() {
  return apiFetch<{ timezones: TimezoneOption[] }>("/user/timezones");
}

export function changeTimezone(timezone: string) {
  return apiFetch<{ user: User; message: string }>("/user/timezone", {
    method: "PATCH",
    body: JSON.stringify({ timezone }),
  });
}

async function postUserAvatarMultipart<T>(path: string, formData: FormData): Promise<T> {
  const res = await fetch(`${clientBase()}${path}`, {
    method: "POST",
    credentials: "include",
    body: formData,
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

export function uploadUserAvatar(file: File) {
  const formData = new FormData();
  formData.append("file", file);
  return postUserAvatarMultipart<{ user: User; message: string }>("/user/avatar", formData);
}

export function deleteUserAvatar() {
  return apiFetch<{ user: User; message: string }>("/user/avatar", {
    method: "DELETE",
  });
}

export type WorkspaceInvite = {
  id: string;
  workspace_id: string;
  email: string;
  role: string;
  invited_by: string;
  status: string;
  expires_at: string;
  created_at: string;
};

export type WorkspaceMember = {
  user_id: string;
  email: string;
  name: string;
  role: string;
  joined_at: string;
  joined_via_invite: boolean;
};

export function fetchWorkspaceInvites(workspaceId?: string) {
  const q = workspaceId ? `?workspace_id=${encodeURIComponent(workspaceId)}` : "";
  return apiFetch<{ invites: WorkspaceInvite[] }>(`/workspaces/invites${q}`);
}

export function fetchWorkspaceMembers(workspaceId?: string) {
  const q = workspaceId ? `?workspace_id=${encodeURIComponent(workspaceId)}` : "";
  return apiFetch<{ members: WorkspaceMember[] }>(`/workspaces/members${q}`);
}

export function createWorkspaceInvite(
  email: string,
  role: string,
  workspaceId?: string,
) {
  const q = workspaceId ? `?workspace_id=${encodeURIComponent(workspaceId)}` : "";
  return apiFetch<{ invite: WorkspaceInvite }>(`/workspaces/invites${q}`, {
    method: "POST",
    body: JSON.stringify({ email, role }),
  });
}

export function acceptWorkspaceInvite(token: string) {
  return apiFetch<{ workspace: Workspace; message: string }>(
    "/workspaces/invites/accept",
    {
      method: "POST",
      body: JSON.stringify({ token }),
    },
  );
}

export function previewWorkspaceInvite(token: string) {
  return apiFetch<{
    workspace_name: string;
    email: string;
    role: string;
    user_exists: boolean;
  }>(`/public/workspace-invites/preview?token=${encodeURIComponent(token)}`);
}

export function resetPassword(token: string, password: string) {
  return apiFetch<MeResponse>("/auth/reset-password", {
    method: "POST",
    body: JSON.stringify({ token, password }),
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

export type AdminAuthSettings = {
  invite_registration_enabled: boolean;
  vk_login_enabled?: boolean;
  max_login_enabled?: boolean;
  max_webhook_registered?: boolean;
  max_webhook_error?: string;
  oauth?: {
    vk: {
      client_id: string;
      client_secret_set: boolean;
      redirect_uri: string;
      configured: boolean;
    };
    max: {
      bot_username: string;
      bot_token_set: boolean;
      webhook_secret_set: boolean;
      webhook_url: string;
      configured: boolean;
    };
  };
};

export type AdminAuthSettingsInput = {
  invite_registration_enabled: boolean;
  vk_login_enabled?: boolean;
  max_login_enabled?: boolean;
  vk?: {
    client_id?: string;
    client_secret?: string;
  };
  max?: {
    bot_username?: string;
    bot_token?: string;
    webhook_secret?: string;
  };
};

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

export type PublicInvite = {
  id: string;
  code: string;
  status: string;
  is_active: boolean;
};

export function fetchPublicInvites() {
  return apiFetch<{ invites: PublicInvite[] }>("/public/invites");
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
  return apiFetch<AdminAuthSettings>("/admin/auth-settings");
}

export function updateAdminAuthSettings(settings: AdminAuthSettingsInput) {
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

export function fetchAdminUserLoginIdentities(userId: string) {
  return apiFetch<{ identities: LoginIdentity[] }>(
    `/admin/users/${userId}/login-identities`,
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

export function createWorkspace(name: string) {
  return apiFetch<{
    workspace: Workspace;
    active_workspace: Workspace;
    workspaces: Workspace[];
  }>("/workspaces", {
    method: "POST",
    body: JSON.stringify({ name }),
  });
}

export function updateWorkspace(workspaceId: string, name: string) {
  return apiFetch<{ workspace: Workspace }>(`/workspaces/${workspaceId}`, {
    method: "PATCH",
    body: JSON.stringify({ name }),
  });
}

export function deleteWorkspace(workspaceId: string) {
  return apiFetch<{
    workspaces: Workspace[];
    active_workspace: Workspace | null;
  }>(`/workspaces/${workspaceId}`, {
    method: "DELETE",
  });
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

export type PublicPageCategory =
  | "instruction"
  | "help_center"
  | "legal"
  | "other";

export type PublicPage = {
  id: string;
  title: string;
  slug: string;
  meta_description: string;
  external_url: string;
  category: PublicPageCategory;
  provider: string | null;
  is_published: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

export type PublicPageInput = {
  title: string;
  slug?: string;
  meta_description?: string;
  external_url?: string;
  category?: PublicPageCategory;
  provider?: string | null;
  is_published?: boolean;
  sort_order?: number;
};

export function fetchAdminPublicPages() {
  return apiFetch<{ pages: PublicPage[] }>("/admin/public-pages");
}

export function createAdminPublicPage(body: PublicPageInput) {
  return apiFetch<PublicPage>("/admin/public-pages", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export function updateAdminPublicPage(id: string, body: PublicPageInput) {
  return apiFetch<PublicPage>(`/admin/public-pages/${id}`, {
    method: "PUT",
    body: JSON.stringify(body),
  });
}

export function deleteAdminPublicPage(id: string) {
  return apiFetch<{ status: string }>(`/admin/public-pages/${id}`, {
    method: "DELETE",
  });
}

export function assignAdminUserPlan(userId: string, planId: string) {
  return apiFetch<{ plan: Plan }>(`/admin/users/${userId}/plan`, {
    method: "PUT",
    body: JSON.stringify({ plan_id: planId }),
  });
}

export function setAdminUserBlocked(userId: string, blocked: boolean) {
  return apiFetch<{ user: User }>(`/admin/users/${userId}/blocked`, {
    method: "PUT",
    body: JSON.stringify({ blocked }),
  });
}

export function deleteAdminUser(userId: string) {
  return apiFetch<{ status: string }>(`/admin/users/${userId}`, {
    method: "DELETE",
  });
}

export function grantAdminUserWalletCredit(
  userId: string,
  amountCents: number,
  note?: string,
) {
  return apiFetch<{ wallet_balance_cents: number }>(
    `/admin/users/${userId}/wallet/credit`,
    {
      method: "POST",
      body: JSON.stringify({
        amount_cents: amountCents,
        note: note?.trim() ?? "",
      }),
    },
  );
}

export type AdminUserWorkspaceItem = {
  id: string;
  name: string;
  slug: string;
  role: string;
  is_owner: boolean;
  owner_email: string;
  owner_name: string;
  plan: AdminUserPlan | null;
  members_count: number;
  created_at: string;
};

export type AdminWorkspaceListItem = {
  id: string;
  name: string;
  slug: string;
  owner_id: string;
  owner_email: string;
  owner_name: string;
  plan: AdminUserPlan | null;
  members_count: number;
  invites_pending: number;
  invites_accepted: number;
  created_at: string;
  updated_at: string;
  plan_assigned_at?: string | null;
};

export type AdminWorkspaceMember = {
  user_id: string;
  email: string;
  name: string;
  role: string;
  joined_at: string;
  joined_via_invite: boolean;
};

export type AdminWorkspaceInvite = {
  id: string;
  email: string;
  role: string;
  status: string;
  invited_by_email: string;
  invited_by_name: string;
  expires_at: string;
  created_at: string;
};

export type AdminWorkspaceDetail = AdminWorkspaceListItem & {
  members: AdminWorkspaceMember[];
  invites: AdminWorkspaceInvite[];
};

export type AdminWorkspaceStats = {
  total_workspaces: number;
  total_members: number;
  total_owners: number;
  pending_invites: number;
  accepted_invites: number;
};

export type AdminWorkspacesQuery = {
  q?: string;
  owner_id?: string;
  limit?: number;
  offset?: number;
};

export type AdminWorkspacesResponse = {
  total: number;
  workspaces: AdminWorkspaceListItem[];
  stats: AdminWorkspaceStats;
};

export function fetchAdminUserWorkspaces(userId: string) {
  return apiFetch<{ workspaces: AdminUserWorkspaceItem[] }>(
    `/admin/users/${userId}/workspaces`,
  );
}

export function fetchAdminWorkspaces(query: AdminWorkspacesQuery = {}) {
  const params = new URLSearchParams();
  if (query.q?.trim()) params.set("q", query.q.trim());
  if (query.owner_id?.trim()) params.set("owner_id", query.owner_id.trim());
  if (typeof query.limit === "number") params.set("limit", String(query.limit));
  if (typeof query.offset === "number") params.set("offset", String(query.offset));
  const qs = params.toString();
  return apiFetch<AdminWorkspacesResponse>(
    `/admin/workspaces${qs ? `?${qs}` : ""}`,
  );
}

export function fetchAdminFiles(query: AdminFilesQuery = {}) {
  const params = new URLSearchParams();
  if (query.q?.trim()) params.set("q", query.q.trim());
  if (query.workspace_id?.trim()) params.set("workspace_id", query.workspace_id.trim());
  if (query.folder_id?.trim()) params.set("folder_id", query.folder_id.trim());
  if (query.uploaded_by?.trim()) params.set("uploaded_by", query.uploaded_by.trim());
  if (query.type?.trim()) params.set("type", query.type.trim());
  if (query.created_from?.trim()) params.set("created_from", query.created_from.trim());
  if (query.created_to?.trim()) params.set("created_to", query.created_to.trim());
  if (typeof query.size_min === "number") params.set("size_min", String(query.size_min));
  if (typeof query.size_max === "number") params.set("size_max", String(query.size_max));
  if (typeof query.deleted_only === "boolean") {
    params.set("deleted_only", String(query.deleted_only));
  }
  if (typeof query.limit === "number") params.set("limit", String(query.limit));
  if (typeof query.offset === "number") params.set("offset", String(query.offset));
  const qs = params.toString();
  return apiFetch<AdminFilesResponse>(`/admin/files${qs ? `?${qs}` : ""}`);
}

export function fetchAdminFileFolders(workspaceId: string, includeDeleted = false) {
  const params = new URLSearchParams({ workspace_id: workspaceId });
  if (includeDeleted) params.set("include_deleted", "true");
  return apiFetch<{ folders: AdminFolderListItem[] }>(
    `/admin/files/folders?${params.toString()}`,
  );
}

export function adminFilePreviewURL(fileId: string, download = false) {
  const base = `${clientBase()}/admin/files/${encodeURIComponent(fileId)}/preview`;
  return download ? `${base}?download=1` : base;
}

export type AdminPost = {
  id: string;
  workspace_id: string;
  workspace_name: string;
  author_user_id: string | null;
  author_email: string | null;
  author_name: string | null;
  mission_id: string | null;
  mission_title: string | null;
  origin: "user" | "agent";
  status: string;
  preview_text: string;
  targets_count: number;
  media_count: number;
  channels_label: string;
  views: number;
  likes: number;
  comments: number;
  shares: number;
  reach: number;
  clicks: number;
  clicks_unique: number;
  metrika_visits: number;
  metrika_goals: number;
  has_metrics: boolean;
  due_at: string | null;
  published_at: string | null;
  last_error: string;
  created_at: string;
  updated_at: string;
};

export type AdminPostStats = {
  total_posts: number;
  draft_count: number;
  pending_count: number;
  scheduled_count: number;
  publishing_count: number;
  published_count: number;
  failed_count: number;
  canceled_count: number;
  with_metrics_count: number;
};

export type AdminPostsQuery = {
  q?: string;
  workspace_id?: string;
  status?: string;
  origin?: string;
  created_by?: string;
  mission_id?: string;
  channel_id?: string;
  provider?: string;
  created_from?: string;
  created_to?: string;
  published_from?: string;
  published_to?: string;
  has_metrics?: boolean;
  limit?: number;
  offset?: number;
};

export type AdminPostsResponse = {
  total: number;
  posts: AdminPost[];
  stats: AdminPostStats;
};

export type AdminPostTarget = {
  id: string;
  channel_id: string;
  channel_name: string;
  provider: string;
  provider_label: string;
  status: string;
  provider_post_id: string;
  last_error: string;
  attempts: number;
  published_at: string | null;
};

export type AdminPostMedia = {
  id: string;
  file_id: string;
  position: number;
  name: string;
  mime_type: string;
  size: number;
};

export type AdminPostMetric = {
  target_id: string;
  channel_name: string;
  provider_label: string;
  views: number;
  likes: number;
  comments: number;
  shares: number;
  reach: number;
  clicks: number;
  clicks_unique: number;
  metrika_visits: number;
  metrika_goals: number;
  has_data: boolean;
};

export type AdminPostDetail = AdminPost & {
  content: Record<string, unknown>;
  settings: Record<string, unknown>;
  targets: AdminPostTarget[];
  media: AdminPostMedia[];
  metrics: AdminPostMetric[];
};

export function fetchAdminPosts(query: AdminPostsQuery = {}) {
  const params = new URLSearchParams();
  if (query.q?.trim()) params.set("q", query.q.trim());
  if (query.workspace_id?.trim()) params.set("workspace_id", query.workspace_id.trim());
  if (query.status?.trim()) params.set("status", query.status.trim());
  if (query.origin?.trim()) params.set("origin", query.origin.trim());
  if (query.created_by?.trim()) params.set("created_by", query.created_by.trim());
  if (query.mission_id?.trim()) params.set("mission_id", query.mission_id.trim());
  if (query.channel_id?.trim()) params.set("channel_id", query.channel_id.trim());
  if (query.provider?.trim()) params.set("provider", query.provider.trim());
  if (query.created_from?.trim()) params.set("created_from", query.created_from.trim());
  if (query.created_to?.trim()) params.set("created_to", query.created_to.trim());
  if (query.published_from?.trim()) params.set("published_from", query.published_from.trim());
  if (query.published_to?.trim()) params.set("published_to", query.published_to.trim());
  if (typeof query.has_metrics === "boolean") {
    params.set("has_metrics", String(query.has_metrics));
  }
  if (typeof query.limit === "number") params.set("limit", String(query.limit));
  if (typeof query.offset === "number") params.set("offset", String(query.offset));
  const qs = params.toString();
  return apiFetch<AdminPostsResponse>(`/admin/posts${qs ? `?${qs}` : ""}`);
}

export function fetchAdminPost(postId: string) {
  return apiFetch<{ post: AdminPostDetail }>(`/admin/posts/${postId}`);
}

export function fetchAdminWorkspace(workspaceId: string) {
  return apiFetch<AdminWorkspaceDetail>(`/admin/workspaces/${workspaceId}`);
}

export function deleteAdminWorkspace(workspaceId: string) {
  return apiFetch<{ status: string }>(`/admin/workspaces/${workspaceId}`, {
    method: "DELETE",
  });
}

export function deleteAllAdminWorkspaces() {
  return apiFetch<{ status: string; deleted: number }>("/admin/workspaces", {
    method: "DELETE",
    body: JSON.stringify({ confirm: "DELETE_ALL_WORKSPACES" }),
  });
}

export type SMTPEncryption = "none" | "ssl" | "tls";

export type SMTPSettings = {
  enabled: boolean;
  from_email: string;
  from_name: string;
  force_from_email: boolean;
  force_from_name: boolean;
  reply_to_from_email: boolean;
  host: string;
  port: number;
  encryption: SMTPEncryption;
  auto_tls: boolean;
  auth: boolean;
  username: string;
};

export type SMTPAdminView = {
  settings: SMTPSettings;
  password_set: boolean;
  updated_at?: string;
  yandex_preset_host: string;
  yandex_preset_port: number;
};

export type SMTPAdminUpdateRequest = {
  settings: SMTPSettings;
  password?: string;
};

export type SMTPTestEmailResult = {
  ok: boolean;
  message: string;
};

export function fetchAdminSMTPSettings() {
  return apiFetch<SMTPAdminView>("/admin/email-smtp");
}

export function updateAdminSMTPSettings(payload: SMTPAdminUpdateRequest) {
  return apiFetch<SMTPAdminView>("/admin/email-smtp", {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

export function sendAdminSMTPTest(to: string) {
  return apiFetch<SMTPTestEmailResult>("/admin/email-smtp/test", {
    method: "POST",
    body: JSON.stringify({ to }),
  });
}

export type EmailFooterLink = {
  label: string;
  url: string;
};

export type EmailSocialLink = {
  label: string;
  url: string;
  icon_url: string;
};

export type EmailTemplateSettings = {
  logo_url: string;
  logo_alt: string;
  primary_color: string;
  background_color: string;
  card_radius_px: number;
  signature_title: string;
  signature_team: string;
  footer_links: EmailFooterLink[];
  social_links: EmailSocialLink[];
  app_download_text: string;
  app_store_url: string;
  google_play_url: string;
  footer_legal_text: string;
  unsubscribe_text: string;
  unsubscribe_url: string;
};

export type EmailTemplateAdminView = {
  settings: EmailTemplateSettings;
  updated_at?: string;
};

export type EmailTemplateAdminUpdateRequest = {
  settings: EmailTemplateSettings;
};

export type EmailTemplateTestResult = {
  ok: boolean;
  message: string;
};

export function fetchAdminEmailTemplates() {
  return apiFetch<EmailTemplateAdminView>("/admin/email-templates");
}

export function updateAdminEmailTemplates(payload: EmailTemplateAdminUpdateRequest) {
  return apiFetch<EmailTemplateAdminView>("/admin/email-templates", {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

export function sendAdminEmailTemplateTest(to: string) {
  return apiFetch<EmailTemplateTestResult>("/admin/email-templates/test", {
    method: "POST",
    body: JSON.stringify({ to }),
  });
}

export function adminEmailTemplatePreviewURL() {
  return `${clientBase()}/admin/email-templates/preview`;
}

export type RobokassaAdminSettings = {
  merchant_login: string;
  test_mode: boolean;
  enabled: boolean;
};

export type PaymentAdminView = {
  active_provider: "robokassa";
  robokassa: RobokassaAdminSettings;
  robokassa_password1_set: boolean;
  robokassa_password1_hint?: string;
  robokassa_password2_set: boolean;
  robokassa_password2_hint?: string;
  robokassa_result_url: string;
  default_return_url: string;
  wallet_topup_min_cents: number;
  wallet_topup_max_cents: number;
  updated_at?: string;
};

export type PaymentAdminUpdateRequest = {
  active_provider: "robokassa";
  robokassa: RobokassaAdminSettings;
  robokassa_password1?: string;
  robokassa_password2?: string;
  wallet_topup_min_cents?: number;
  wallet_topup_max_cents?: number;
};

export type PaymentTestResult = {
  ok: boolean;
  message: string;
};

export function fetchAdminPaymentSettings() {
  return apiFetch<PaymentAdminView>("/admin/payment-settings");
}

export function updateAdminPaymentSettings(payload: PaymentAdminUpdateRequest) {
  return apiFetch<PaymentAdminView>("/admin/payment-settings", {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

export function testAdminPaymentConnection() {
  return apiFetch<PaymentTestResult>("/admin/payment-settings/test", {
    method: "POST",
    body: JSON.stringify({}),
  });
}

export type StorageAdminView = {
  endpoint: string;
  bucket: string;
  region: string;
  access_key: string;
  secret_key_set: boolean;
  secret_key_hint?: string;
  use_ssl: boolean;
  path_style: boolean;
  enabled: boolean;
  cors_origins: string[];
  cors_xml: string;
  updated_at?: string;
};

export type StorageAdminUpdateRequest = {
  endpoint: string;
  bucket: string;
  region: string;
  access_key: string;
  secret_key?: string;
  use_ssl: boolean;
  path_style: boolean;
  enabled: boolean;
};

export type StorageTestResult = {
  ok: boolean;
  message: string;
};

export function fetchAdminStorageSettings() {
  return apiFetch<StorageAdminView>("/admin/storage-settings");
}

export function updateAdminStorageSettings(payload: StorageAdminUpdateRequest) {
  return apiFetch<StorageAdminView>("/admin/storage-settings", {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

export function testAdminStorageConnection() {
  return apiFetch<StorageTestResult>("/admin/storage-settings/test", {
    method: "POST",
    body: JSON.stringify({}),
  });
}

export type BackupFrequency = "daily" | "weekly";

export type BackupSettings = {
  enabled: boolean;
  frequency: BackupFrequency;
  hour: number;
  minute: number;
  weekday: number;
  retain_count: number;
  next_run_at?: string | null;
  updated_at?: string;
};

export type BackupRun = {
  id: string;
  trigger: "manual" | "schedule";
  status: "queued" | "running" | "succeeded" | "failed";
  s3_key?: string;
  local_name?: string;
  size_bytes: number;
  media_files: number;
  error?: string;
  started_at?: string | null;
  finished_at?: string | null;
  created_at: string;
};

export type BackupAdminView = {
  settings: BackupSettings;
  storage_ready: boolean;
  restore_hint: string;
  runs: BackupRun[];
  timezone: string;
};

export function fetchAdminBackups() {
  return apiFetch<BackupAdminView>("/admin/backups");
}

export function updateAdminBackups(payload: {
  enabled: boolean;
  frequency: BackupFrequency;
  hour: number;
  minute: number;
  weekday: number;
  retain_count: number;
}) {
  return apiFetch<BackupAdminView>("/admin/backups", {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

export function runAdminBackup() {
  return apiFetch<BackupRun>("/admin/backups/run", {
    method: "POST",
    body: JSON.stringify({}),
  });
}

export function fetchAdminBackupDownload(id: string) {
  return apiFetch<{ url: string }>(`/admin/backups/runs/${encodeURIComponent(id)}/download`);
}

export type UploadFileSettings = {
  allowed_extensions: string[];
  max_size_image_mb: number;
  max_size_video_mb: number;
  max_size_audio_mb: number;
  max_size_archive_mb: number;
  max_size_other_mb: number;
};

export type UploadFileSettingsRecord = {
  config: UploadFileSettings;
  updated_at: string;
};

export function fetchAdminUploadFileSettings() {
  return apiFetch<UploadFileSettingsRecord>("/admin/settings/upload-files");
}

export function updateAdminUploadFileSettings(payload: UploadFileSettings) {
  return apiFetch<UploadFileSettingsRecord>("/admin/settings/upload-files", {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

export type BillingPeriod = "monthly" | "yearly";

export type BillingUsage = {
  channels_used: number;
  posts_used: number;
  workflows_used: number;
  ai_text_tokens_used: number;
  ai_media_credits_used: number;
  period_start: string;
};

export type WorkspaceSubscription = {
  id: string;
  workspace_id: string;
  plan_id: string;
  billing_period: BillingPeriod;
  period_start: string;
  period_end: string;
  base_amount_cents: number;
  auto_renew: boolean;
  status: "active" | "past_due" | "cancelled";
  last_checkout_id?: string;
  created_at: string;
  updated_at: string;
};

export type SubscribePreview = {
  plan_id: string;
  billing_period: BillingPeriod;
  list_price_cents: number;
  prorate_credit_cents: number;
  amount_due_cents: number;
  is_upgrade: boolean;
  current_plan_id?: string;
  period_end?: string;
};

export type BillingOverview = {
  payments_enabled: boolean;
  active_provider?: string;
  workspace_id: string;
  plan?: Plan;
  plan_assigned_at?: string;
  subscription?: WorkspaceSubscription;
  usage: BillingUsage;
  token_balance: TokenBalanceView;
  wallet_balance_cents: number;
  wallet_topup_min_cents: number;
  wallet_topup_max_cents: number;
};

export type TokenBalanceView = {
  total_remaining: number;
  plan_tokens_remaining: number;
  purchased_tokens_remaining: number;
  plan_tokens_allowance?: number | null;
  plan_period_end?: string;
  unlimited: boolean;
};

export type TokenPackage = {
  id: string;
  name: string;
  tokens: number;
  price_cents: number;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type TokenPackageUpsert = {
  id: string;
  name: string;
  tokens: number;
  price_cents: number;
  sort_order: number;
  is_active: boolean;
};

export type CheckoutResult = {
  checkout_id: string;
  kind: string;
  provider: string;
  checkout_url: string;
};

export type PaymentHistoryItem = {
  id: string;
  kind: string;
  amount_cents: number;
  status: string;
  description: string;
  created_at: string;
  paid_at?: string;
};

export function fetchBillingOverview() {
  return apiFetch<BillingOverview>("/billing/overview");
}

export function fetchBillingPlans() {
  return apiFetch<{ plans: Plan[] }>("/billing/plans");
}

export function billingSubscribeCheckout(payload: {
  plan_id: string;
  billing_period: BillingPeriod;
  workspace_id?: string;
}) {
  return apiFetch<CheckoutResult>("/billing/checkout/subscribe", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function billingWalletTopup(payload: { amount_cents: number }) {
  return apiFetch<CheckoutResult>("/billing/wallet/topup", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function fetchTokenPackages() {
  return apiFetch<{ packages: TokenPackage[] }>("/public/billing/packages");
}

export function billingPackageCheckout(packageId: string) {
  return apiFetch<CheckoutResult>(`/billing/checkout/package/${encodeURIComponent(packageId)}`, {
    method: "POST",
  });
}

export function fetchAdminTokenPackages() {
  return apiFetch<{ packages: TokenPackage[] }>("/admin/token-packages");
}

export function createAdminTokenPackage(body: TokenPackageUpsert) {
  return apiFetch<{ package: TokenPackage }>("/admin/token-packages", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export function updateAdminTokenPackage(id: string, body: TokenPackageUpsert) {
  return apiFetch<{ package: TokenPackage }>(`/admin/token-packages/${encodeURIComponent(id)}`, {
    method: "PUT",
    body: JSON.stringify(body),
  });
}

export function deleteAdminTokenPackage(id: string) {
  return apiFetch<{ ok: boolean }>(`/admin/token-packages/${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
}

export function billingSwitchFree(payload: { workspace_id?: string }) {
  return apiFetch<{ ok: boolean }>("/billing/switch-free", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function fetchBillingPaymentHistory() {
  return apiFetch<{ items: PaymentHistoryItem[] }>("/billing/payments");
}

export function fetchSubscribePreview(params: {
  plan_id: string;
  billing_period: BillingPeriod;
  workspace_id?: string;
}) {
  const q = new URLSearchParams({
    plan_id: params.plan_id,
    billing_period: params.billing_period,
  });
  if (params.workspace_id) q.set("workspace_id", params.workspace_id);
  return apiFetch<SubscribePreview>(`/billing/subscribe/preview?${q.toString()}`);
}

export function billingSetAutoRenew(payload: { workspace_id?: string; auto_renew: boolean }) {
  return apiFetch<WorkspaceSubscription>("/billing/subscription/auto-renew", {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

export type TelegramBotStatus =
  | "disabled"
  | "misconfigured"
  | "starting"
  | "online"
  | "offline";

export type TelegramRuntimeStatus = {
  status: TelegramBotStatus;
  message: string;
  bot_username?: string;
  last_error?: string;
  last_check_at?: string;
  supervisor_running: boolean;
};

export type TelegramSettings = {
  enabled: boolean;
  chat_id: string;
  proxy_enabled: boolean;
  proxy_active_url: string;
  proxy_auto_failover: boolean;
  proxy_urls: string[];
  notify_registration: boolean;
  registration_template: string;
  notify_email_verified: boolean;
  email_verified_template: string;
  notify_payment: boolean;
  payment_template: string;
  notify_wallet_topup: boolean;
  wallet_topup_template: string;
  notify_support: boolean;
  support_template: string;
};

export type TelegramAdminView = {
  settings: TelegramSettings;
  bot_token_set: boolean;
  bot_token_hint?: string;
  updated_at?: string;
  runtime: TelegramRuntimeStatus;
};

export type TelegramAdminUpdateRequest = {
  settings: TelegramSettings;
  bot_token?: string;
};

export type TelegramTestResult = {
  ok: boolean;
  message: string;
  runtime?: TelegramRuntimeStatus;
};

export type TelegramNotificationStatus =
  | "pending"
  | "processing"
  | "sent"
  | "failed";

export type TelegramNotificationRecord = {
  id: string;
  kind: string;
  message_text: string;
  status: TelegramNotificationStatus;
  attempt_count: number;
  next_attempt_at: string;
  last_error?: string;
  last_attempt_at?: string;
  sent_at?: string;
  created_at: string;
  updated_at: string;
};

export type TelegramNotificationListResult = {
  items: TelegramNotificationRecord[];
  total: number;
  limit: number;
  offset: number;
};

export function fetchAdminTelegramSettings() {
  return apiFetch<TelegramAdminView>("/admin/telegram/notifications");
}

export function updateAdminTelegramSettings(payload: TelegramAdminUpdateRequest) {
  return apiFetch<TelegramAdminView>("/admin/telegram/notifications", {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

export function fetchAdminTelegramStatus() {
  return apiFetch<TelegramRuntimeStatus>("/admin/telegram/status");
}

export function restartAdminTelegramBot() {
  return apiFetch<TelegramRuntimeStatus>("/admin/telegram/restart", {
    method: "POST",
  });
}

export function sendAdminTelegramTest() {
  return apiFetch<TelegramTestResult>("/admin/telegram/test", {
    method: "POST",
  });
}

export function fetchAdminTelegramQueue(params?: {
  status?: TelegramNotificationStatus;
  limit?: number;
  offset?: number;
}) {
  const q = new URLSearchParams();
  if (params?.status) q.set("status", params.status);
  if (params?.limit != null) q.set("limit", String(params.limit));
  if (params?.offset != null) q.set("offset", String(params.offset));
  const suffix = q.toString() ? `?${q.toString()}` : "";
  return apiFetch<TelegramNotificationListResult>(`/admin/telegram/queue${suffix}`);
}

export function retryAdminTelegramQueueItem(id: string) {
  return apiFetch<{ status: string }>(`/admin/telegram/queue/${id}/retry`, {
    method: "POST",
  });
}

export type TelegramProviderSettings = {
  enabled: boolean;
  business_stories_enabled: boolean;
  proxy_enabled: boolean;
  proxy_active_url: string;
  proxy_auto_failover: boolean;
  proxy_urls: string[];
  connect_help_text: string;
  business_connect_help_text: string;
  connect_help_url: string;
  docs_url: string;
  support_telegram_username: string;
  support_email: string;
  support_hours_text: string;
};

export type TelegramProviderAdminView = {
  settings: TelegramProviderSettings;
  updated_at?: string;
};

export function fetchAdminTelegramProviderSettings() {
  return apiFetch<TelegramProviderAdminView>("/admin/telegram/provider");
}

export function updateAdminTelegramProviderSettings(settings: TelegramProviderSettings) {
  return apiFetch<TelegramProviderAdminView>("/admin/telegram/provider", {
    method: "PUT",
    body: JSON.stringify(settings),
  });
}

export type YouTubeProviderSettings = {
  proxy_enabled: boolean;
  proxy_active_url: string;
  proxy_auto_failover: boolean;
  proxy_urls: string[];
};

export type YouTubeProviderAdminView = {
  settings: YouTubeProviderSettings;
  updated_at?: string;
};

export function fetchAdminYouTubeProviderSettings() {
  return apiFetch<YouTubeProviderAdminView>("/admin/youtube/provider");
}

export function updateAdminYouTubeProviderSettings(settings: YouTubeProviderSettings) {
  return apiFetch<YouTubeProviderAdminView>("/admin/youtube/provider", {
    method: "PUT",
    body: JSON.stringify(settings),
  });
}

export type SocialProviderKey = "vk" | "max" | "rutube" | "dzen" | "youtube";

export type SocialProviderSettings = {
  enabled: boolean;
  oauth_client_id: string;
  oauth_client_secret: string;
  platform_bot_enabled?: boolean;
  platform_oauth_enabled?: boolean;
  connect_help_text: string;
  connect_help_url: string;
  docs_url: string;
  support_telegram_username: string;
  support_email: string;
  support_hours_text: string;
};

export type SocialProviderAdminView = {
  provider: SocialProviderKey;
  label: string;
  connect_flow: "oauth" | "user_oauth" | "bot_token";
  settings: SocialProviderSettings;
  updated_at?: string;
};

export function fetchAdminSocialProviders() {
  return apiFetch<{ providers: SocialProviderAdminView[] }>("/admin/social-providers");
}

export function updateAdminSocialProvider(provider: SocialProviderKey, settings: SocialProviderSettings) {
  return apiFetch<SocialProviderAdminView>(`/admin/social-providers/${provider}`, {
    method: "PUT",
    body: JSON.stringify(settings),
  });
}

export type MAXPlatformBotAdminView = {
  enabled: boolean;
  bot_token_set: boolean;
  bot_token_hint?: string;
  bot?: {
    username: string;
    name: string;
    user_id: number;
    profile_url: string;
    search_query: string;
  };
  updated_at?: string;
};

export function fetchAdminMAXPlatformBot() {
  return apiFetch<MAXPlatformBotAdminView>("/admin/max-platform-bot");
}

export function updateAdminMAXPlatformBot(payload: { enabled: boolean; bot_token?: string }) {
  return apiFetch<MAXPlatformBotAdminView>("/admin/max-platform-bot", {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

export type ChannelStatus = "active" | "needs_reconnect" | "disabled";

export type ChannelProvider =
  | "telegram"
  | "vk"
  | "ok"
  | "max"
  | "rutube"
  | "dzen"
  | "youtube"
  | "photochka";

export type ChannelMetadata = {
  provider_title?: string;
  public_url?: string;
  avatar_url?: string;
  oauth_connected_at?: string;
  can_post?: boolean;
  is_admin?: boolean;
  bot_permissions?: string[];
  participants_count?: number;
  business_user_id?: string;
  business_user_chat_id?: string;
  can_manage_stories?: boolean;
  business_connection_enabled?: boolean;
};

export type Channel = {
  id: string;
  workspace_id: string;
  provider: ChannelProvider;
  name: string;
  chat_id: string;
  chat_type: string;
  bot_username?: string;
  max_post_mode?: "own" | "platform";
  vk_oauth_mode?: "own" | "platform";
  status: ChannelStatus;
  last_error?: string;
  metadata?: ChannelMetadata;
  metadata_refreshed_at?: string;
  created_at: string;
  updated_at: string;
};

export type PublishCapabilities = {
  text: boolean;
  photo?: boolean;
  video?: boolean;
  feed?: boolean;
  schedule?: boolean;
  formats?: string[];
  rich_text?: boolean;
  entities?: boolean;
  telegram_rich_messages?: boolean;
  inline_buttons?: boolean;
  styled_buttons?: boolean;
  custom_emoji?: boolean;
  first_comment?: boolean;
  location?: boolean;
  link_preview?: boolean;
  media_album?: boolean;
  max_media?: number;
  max_text_length?: number;
  max_buttons?: number;
  composer_media: boolean;
  composer_first_comment: boolean;
  composer_location: boolean;
  composer_link_preview: boolean;
  composer_pin?: boolean;
  composer_silent?: boolean;
  composer_video_note?: boolean;
};

export type ChannelListItem = Channel & {
  bot_token_set: boolean;
  bot_token_hint?: string;
  post_mode_label?: string;
  oauth_reconnect_by?: string;
  publish_capabilities?: PublishCapabilities;
};

export type ChannelUpdateRequest = {
  name?: string;
  bot_token?: string;
  max_post_mode?: "own" | "platform";
};

export type TelegramDiscoverBot = {
  id: number;
  username: string;
};

export type TelegramDiscoveredChat = {
  chat_id: string;
  title: string;
  type: string;
  bot_status: string;
  can_post: boolean;
  avatar_url?: string;
};

export type TelegramDiscoverResult = {
  bot: TelegramDiscoverBot;
  chats: TelegramDiscoveredChat[];
  hint?: string;
};

export type SocialProviderPublicInfo = {
  provider: SocialProviderKey;
  label: string;
  enabled: boolean;
  connect_flow: "oauth" | "user_oauth" | "bot_token" | "telegram_crosspost";
  platform_bot_enabled?: boolean;
  platform_oauth_enabled?: boolean;
  platform_bot?: {
    username: string;
    name: string;
    user_id: number;
    profile_url: string;
    search_query: string;
  };
  connect_help_text: string;
  connect_help_url: string;
  docs_url: string;
  support_telegram_username: string;
  support_telegram_url: string;
  support_email: string;
  support_hours_text: string;
  publish_capabilities?: PublishCapabilities;
};

export type ChannelProviderInfo = {
  telegram_enabled: boolean;
  telegram_business_stories_enabled: boolean;
  photochka_enabled?: boolean;
  photochka_connect_help_text?: string;
  business_connect_help_text?: string;
  connect_help_text: string;
  connect_help_url: string;
  docs_url: string;
  support_telegram_username: string;
  support_telegram_url: string;
  support_email: string;
  support_hours_text: string;
  providers: SocialProviderPublicInfo[];
};

export type DiscoveredChannelTarget = {
  external_id: string;
  title: string;
  type: string;
  can_post: boolean;
  avatar_url?: string;
};

export type ChannelDiscoverResult = {
  provider: string;
  targets: DiscoveredChannelTarget[];
  hint?: string;
  bot?: {
    username: string;
    name: string;
    user_id: number;
    profile_url: string;
    search_query: string;
  };
};

export function fetchChannels() {
  return apiFetch<{ items: ChannelListItem[] }>("/channels");
}

export function fetchChannel(id: string) {
  return apiFetch<ChannelListItem>(`/channels/${id}`);
}

export function updateChannel(id: string, payload: ChannelUpdateRequest) {
  return apiFetch<ChannelListItem>(`/channels/${id}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export function fetchChannelProviderInfo() {
  return apiFetch<ChannelProviderInfo>("/channels/provider-info");
}

export function discoverTelegramChannels(botToken: string) {
  return apiFetch<TelegramDiscoverResult>("/channels/telegram/discover", {
    method: "POST",
    body: JSON.stringify({ bot_token: botToken }),
  });
}

export function connectTelegramChannels(payload: {
  bot_token: string;
  channels: { chat_id: string; name?: string }[];
}) {
  return apiFetch<{ connected: ChannelListItem[]; skipped?: string[] }>(
    "/channels/telegram/connect",
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
  );
}

export type TelegramBusinessConnectResult = {
  registration_id: string;
  bot_username: string;
  connected: ChannelListItem[];
  hint?: string;
  issues?: string[];
};

export function connectTelegramBusiness(payload: { bot_token: string }) {
  return apiFetch<TelegramBusinessConnectResult>("/channels/telegram/business/connect", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function syncTelegramBusiness(payload: { registration_id: string }) {
  return apiFetch<TelegramBusinessConnectResult>("/channels/telegram/business/sync", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function verifyChannel(id: string) {
  return apiFetch<ChannelListItem>(`/channels/${id}/verify`, { method: "POST" });
}

export type ChannelTestMessagePayload = {
  text?: string;
  title?: string;
  photo_url?: string;
  video_url?: string;
  content_type?: "brief" | "article" | "feed" | "video";
  publish_at?: string;
};

export function sendChannelTestMessage(id: string, payload?: ChannelTestMessagePayload) {
  return apiFetch<{ success: boolean; message: string; provider_post_id?: string }>(
    `/channels/${id}/test-message`,
    {
      method: "POST",
      body: JSON.stringify(payload ?? {}),
    },
  );
}

export function deleteChannel(id: string) {
  return apiFetch<{ status: string }>(`/channels/${id}`, { method: "DELETE" });
}

export function updateChannelTelegramToken(id: string, botToken: string) {
  return apiFetch<ChannelListItem>(`/channels/${id}/telegram-token`, {
    method: "PUT",
    body: JSON.stringify({ bot_token: botToken }),
  });
}

export function startYouTubeChannelReconnect(channelId: string) {
  return apiFetch<{ redirect_url: string; state_token: string }>(
    `/channels/${channelId}/oauth/youtube/reconnect/start`,
    { method: "POST" },
  );
}

export function startChannelOAuth(
  provider: SocialProviderKey,
  options?: {
    oauth_app_mode?: "own" | "platform";
    oauth_client_id?: string;
    oauth_client_secret?: string;
  },
) {
  if (options && Object.keys(options).length > 0) {
    return apiFetch<{ redirect_url: string; state_token: string }>(
      `/channels/oauth/${provider}/start`,
      {
        method: "POST",
        body: JSON.stringify(options),
      },
    );
  }
  return apiFetch<{ redirect_url: string; state_token: string }>(
    `/channels/oauth/${provider}/start`,
    { method: "POST" },
  );
}

export function discoverChannelOAuth(provider: SocialProviderKey, sessionId: string) {
  return apiFetch<ChannelDiscoverResult>(
    `/channels/oauth/${provider}/discover?session_id=${encodeURIComponent(sessionId)}`,
  );
}

export function connectChannelOAuth(
  provider: SocialProviderKey,
  payload: { session_id: string; targets: { external_id: string; name?: string }[] },
) {
  return apiFetch<{ connected: ChannelListItem[]; skipped?: string[] }>(
    `/channels/oauth/${provider}/connect`,
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
  );
}

export function discoverMAXChannels(
  botToken: string,
  chatId?: string,
  postMode: "own" | "platform" = "own",
) {
  return apiFetch<ChannelDiscoverResult>("/channels/max/discover", {
    method: "POST",
    body: JSON.stringify({
      bot_token: botToken,
      chat_id: chatId ?? "",
      post_mode: postMode,
    }),
  });
}

export function connectMAXChannels(payload: {
  bot_token?: string;
  post_mode?: "own" | "platform";
  channels: { external_id: string; name?: string }[];
}) {
  return apiFetch<{ connected: ChannelListItem[]; skipped?: string[] }>(
    "/channels/max/connect",
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
  );
}

export function connectPhotochkaChannel(apiKey: string) {
  return apiFetch<{ connected: ChannelListItem[]; skipped?: string[] }>(
    "/channels/photochka/connect",
    {
      method: "POST",
      body: JSON.stringify({ api_key: apiKey }),
    },
  );
}

export type YandexModelPricing = {
  input_per_1k: number;
  output_per_1k: number;
  currency?: string;
};

export type YandexGptAdminView = {
  api_base_url: string;
  api_key_set: boolean;
  api_key_hint?: string;
  folder_id: string;
  folder_hint?: string;
  model_default: string;
  models: string[];
  model_pricing: Record<string, YandexModelPricing>;
  task_models: Record<string, string>;
  updated_at: string;
};

export type YandexGptAdminUpdateRequest = {
  api_base_url: string;
  api_key?: string;
  folder_id: string;
  model_default: string;
  model_pricing?: Record<string, YandexModelPricing>;
};

export type YandexGptTestResult = {
  ok: boolean;
  message: string;
  models?: string[];
};

export function fetchAdminYandexGptSettings() {
  return apiFetch<YandexGptAdminView>("/admin/config/yandex-gpt");
}

export function updateAdminYandexGptSettings(payload: YandexGptAdminUpdateRequest) {
  return apiFetch<YandexGptAdminView>("/admin/config/yandex-gpt", {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

export function testAdminYandexGptConnection(payload?: {
  api_key?: string;
  folder_id?: string;
}) {
  return apiFetch<YandexGptTestResult>("/admin/config/yandex-gpt/test", {
    method: "POST",
    body: JSON.stringify(payload ?? {}),
  });
}

export type MetrikaPlatformAdminView = {
  enabled: boolean;
  oauth_client_id: string;
  client_secret_set: boolean;
  client_secret_hint?: string;
  oauth_redirect_uri: string;
  updated_at: string;
};

export type MetrikaPlatformAdminUpdateRequest = {
  enabled: boolean;
  oauth_client_id: string;
  oauth_client_secret?: string;
};

export function fetchAdminMetrikaSettings() {
  return apiFetch<MetrikaPlatformAdminView>("/admin/config/metrika");
}

export function updateAdminMetrikaSettings(payload: MetrikaPlatformAdminUpdateRequest) {
  return apiFetch<MetrikaPlatformAdminView>("/admin/config/metrika", {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

export type KieModel = {
  id: string;
  name: string;
  category: string;
};

export type KieAdminSettings = {
  api_base_url: string;
  api_key_set: boolean;
  model_text_to_image: string;
  model_image_to_image: string;
  model_combine: string;
  model_filter: string;
  token_cost_text_to_image: number;
  token_cost_image_to_image: number;
  token_cost_combine: number;
  token_cost_filter: number;
  kopecks_per_media_credit: number;
  updated_at?: string;
};

export type KieTestResult = {
  ok: boolean;
  message?: string;
  models?: KieModel[];
  credits_remaining?: number;
};

export function fetchAdminKieSettings() {
  return apiFetch<{ settings: KieAdminSettings }>("/admin/config/kie");
}

export function updateAdminKieSettings(payload: Record<string, unknown>) {
  return apiFetch<{ settings: KieAdminSettings }>("/admin/config/kie", {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

export function testAdminKieConnection(payload?: {
  api_base_url?: string;
  api_key?: string;
}) {
  return apiFetch<KieTestResult>("/admin/config/kie/test", {
    method: "POST",
    body: JSON.stringify(payload ?? {}),
  });
}

export type KieVideoAdminSettings = {
  api_base_url: string;
  api_key_set: boolean;
  model_text_to_video: string;
  model_image_to_video: string;
  model_reference_to_video: string;
  default_duration_text_to_video: number;
  default_duration_image_to_video: number;
  default_duration_reference_to_video: number;
  credits_per_second_text_to_video: number;
  credits_per_second_image_to_video: number;
  credits_per_second_reference_to_video: number;
  credits_per_extra_reference_image: number;
  free_reference_images?: number;
  media_credit_price_rub: number;
  updated_at?: string;
};

export type KieVideoModel = {
  id: string;
  name: string;
  category: string;
};

export type KieVideoTestResult = {
  ok: boolean;
  message?: string;
  models?: KieVideoModel[];
  credits_remaining?: number;
};

export type KieVideoExample = {
  id: string;
  mode: string;
  prompt: string;
  aspect_ratio: string;
  duration: number;
  model_id?: string;
  status: "pending" | "generating" | "ready" | "failed";
  fail_message?: string;
  video_url?: string;
  source_image_urls?: string[];
  sort_order: number;
  created_at: string;
  updated_at: string;
};

export const KIE_VIDEO_ASPECT_RATIOS = [
  "9:16",
  "21:9",
  "16:9",
  "4:3",
  "1:1",
  "3:4",
] as const;

export function fetchAdminKieVideoSettings() {
  return apiFetch<{ settings: KieVideoAdminSettings }>("/admin/config/kie-video");
}

export function updateAdminKieVideoSettings(payload: Record<string, unknown>) {
  return apiFetch<{ settings: KieVideoAdminSettings }>("/admin/config/kie-video", {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

export function testAdminKieVideoConnection(payload?: {
  api_base_url?: string;
  api_key?: string;
}) {
  return apiFetch<KieVideoTestResult>("/admin/config/kie-video/test", {
    method: "POST",
    body: JSON.stringify(payload ?? {}),
  });
}

export function fetchAdminKieVideoExamples() {
  return apiFetch<{ examples: KieVideoExample[] }>("/admin/config/kie-video/examples");
}

export async function createAdminKieVideoExample(payload: {
  mode: string;
  prompt: string;
  aspect_ratio: string;
  duration: number;
  images?: File[];
}) {
  const formData = new FormData();
  formData.append("mode", payload.mode);
  formData.append("prompt", payload.prompt);
  formData.append("aspect_ratio", payload.aspect_ratio);
  formData.append("duration", String(payload.duration));
  for (const file of payload.images ?? []) {
    formData.append("images", file);
  }

  const base =
    process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") || "/app/api/v1";
  const res = await fetch(`${base}/admin/config/kie-video/examples`, {
    method: "POST",
    credentials: "include",
    body: formData,
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg =
      typeof data === "object" && data && "error" in data
        ? String((data as { error: string }).error)
        : `HTTP ${res.status}`;
    throw new ApiError(res.status, msg);
  }
  return data as { example: KieVideoExample };
}

export function deleteAdminKieVideoExample(id: string) {
  return apiFetch<{ ok: boolean }>(`/admin/config/kie-video/examples/${id}`, {
    method: "DELETE",
  });
}

export function fetchVideoGenerationExamples() {
  return apiFetch<{ examples: KieVideoExample[] }>("/generation/video-examples");
}

export type NotificationCategory = "info" | "warning" | "success" | "error";

export type AppNotification = {
  id: string;
  user_id: string;
  workspace_id?: string | null;
  type: string;
  category: NotificationCategory;
  title: string;
  body?: string;
  payload?: Record<string, unknown> | null;
  href?: string;
  read_at?: string | null;
  created_at: string;
};

export type NotificationListResponse = {
  items: AppNotification[];
  total: number;
  unread_count: number;
};

export type NotificationPreferences = {
  posts: boolean;
  channels: boolean;
  billing: boolean;
  quota: boolean;
  ai: boolean;
  files: boolean;
  team: boolean;
  support: boolean;
};

export function fetchNotifications(params?: {
  limit?: number;
  offset?: number;
  type?: string;
  unreadOnly?: boolean;
}) {
  const search = new URLSearchParams();
  if (params?.limit) search.set("limit", String(params.limit));
  if (params?.offset) search.set("offset", String(params.offset));
  if (params?.type) search.set("type", params.type);
  if (params?.unreadOnly) search.set("unreadOnly", "true");
  const q = search.toString();
  return apiFetch<NotificationListResponse>(`/notifications${q ? `?${q}` : ""}`);
}

export function markNotificationRead(id: string) {
  return apiFetch<{ ok: boolean }>(`/notifications/${id}/read`, { method: "PATCH" });
}

export function markAllNotificationsRead() {
  return apiFetch<{ count: number }>("/notifications/read-all", { method: "POST" });
}

export function deleteAllNotifications() {
  return apiFetch<{ deleted: number }>("/notifications", { method: "DELETE" });
}

export function fetchNotificationPreferences() {
  return apiFetch<NotificationPreferences>("/notifications/preferences");
}

export function updateNotificationPreferences(prefs: Partial<NotificationPreferences>) {
  return apiFetch<NotificationPreferences>("/notifications/preferences", {
    method: "PATCH",
    body: JSON.stringify(prefs),
  });
}

export type TicketStatus =
  | "open"
  | "awaiting_admin"
  | "awaiting_user"
  | "in_progress"
  | "resolved"
  | "closed";

export type SupportTicketTheme = {
  id: string;
  name: string;
  slug: string;
  sort_order?: number;
  is_active?: boolean;
  created_at?: string;
  updated_at?: string;
};

export type SupportTicketMessage = {
  id: string;
  author_role: "user" | "admin";
  body: string;
  created_at: string;
};

export type SupportTicket = {
  id: string;
  theme?: { name: string; slug: string };
  user?: { email: string; name: string };
  subject?: string | null;
  status: TicketStatus;
  messages?: SupportTicketMessage[];
  created_at: string;
  updated_at: string;
};

export type SupportSettings = {
  admin_email_enabled: boolean;
  admin_email_recipients: string;
  telegram_enabled: boolean;
  telegram_chat_id: string;
  telegram_new_ticket_template: string;
  telegram_user_reply_template: string;
  max_enabled: boolean;
  max_recipient_id: string;
  max_new_ticket_template: string;
  max_user_reply_template: string;
};

export type SupportSettingsAdminView = {
  settings: SupportSettings;
  telegram_bot_token_set: boolean;
  telegram_bot_token_hint?: string;
  max_bot_token_set: boolean;
  max_bot_token_hint?: string;
  updated_at: string;
};

export function fetchSupportThemes() {
  return apiFetch<SupportTicketTheme[]>("/support/themes");
}

export function fetchSupportTickets() {
  return apiFetch<SupportTicket[]>("/support/tickets");
}

export function fetchSupportTicketsCount() {
  return apiFetch<{ awaiting_user_count: number }>("/support/tickets/count");
}

export function createSupportTicket(body: { theme_id: string; body: string; subject?: string }) {
  return apiFetch<SupportTicket>("/support/tickets", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export function sendSupportTicketMessage(ticketId: string, body: string) {
  return apiFetch<SupportTicket>(`/support/tickets/${ticketId}/messages`, {
    method: "POST",
    body: JSON.stringify({ body }),
  });
}

export function fetchAdminSupportSettings() {
  return apiFetch<SupportSettingsAdminView>("/admin/support/settings");
}

export function updateAdminSupportSettings(payload: {
  settings: SupportSettings;
  telegram_bot_token?: string;
  max_bot_token?: string;
}) {
  return apiFetch<SupportSettingsAdminView>("/admin/support/settings", {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

export function testAdminSupportTelegram() {
  return apiFetch<{ ok: boolean; message: string }>("/admin/support/settings/test-telegram", {
    method: "POST",
  });
}

export function testAdminSupportMax() {
  return apiFetch<{ ok: boolean; message: string }>("/admin/support/settings/test-max", {
    method: "POST",
  });
}

export function testAdminSupportEmail() {
  return apiFetch<{ ok: boolean; message: string }>("/admin/support/settings/test-email", {
    method: "POST",
  });
}

export function fetchAdminSupportThemes() {
  return apiFetch<SupportTicketTheme[]>("/admin/support/themes");
}

export function createAdminSupportTheme(body: {
  name: string;
  slug?: string;
  sort_order?: number;
  is_active?: boolean;
}) {
  return apiFetch<SupportTicketTheme>("/admin/support/themes", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export function updateAdminSupportTheme(
  id: string,
  body: Partial<{ name: string; slug: string; sort_order: number; is_active: boolean }>,
) {
  return apiFetch<SupportTicketTheme>(`/admin/support/themes/${id}`, {
    method: "PATCH",
    body: JSON.stringify(body),
  });
}

export function deleteAdminSupportTheme(id: string) {
  return apiFetch<{ ok: boolean }>(`/admin/support/themes/${id}`, { method: "DELETE" });
}

export function fetchAdminSupportTickets() {
  return apiFetch<SupportTicket[]>("/admin/support/tickets");
}

export function fetchAdminSupportTicketsCount() {
  return apiFetch<{ awaiting_admin_count: number }>("/admin/support/tickets/count");
}

export function updateAdminSupportTicketStatus(id: string, status: TicketStatus) {
  return apiFetch<SupportTicket>(`/admin/support/tickets/${id}`, {
    method: "PATCH",
    body: JSON.stringify({ status }),
  });
}

export function replyAdminSupportTicket(id: string, body: string) {
  return apiFetch<SupportTicket>(`/admin/support/tickets/${id}/reply`, {
    method: "POST",
    body: JSON.stringify({ body }),
  });
}

