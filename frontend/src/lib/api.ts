export type User = {
  id: string;
  email: string;
  name: string;
  locale: string;
  timezone: string;
  is_blocked: boolean;
  is_platform_admin: boolean;
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
) {
  return apiFetch<RegisterResponse>("/auth/register", {
    method: "POST",
    body: JSON.stringify({
      email,
      password,
      name,
      invite_code: inviteCode,
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

export function fetchWorkspaceInvites(workspaceId?: string) {
  const q = workspaceId ? `?workspace_id=${encodeURIComponent(workspaceId)}` : "";
  return apiFetch<{ invites: WorkspaceInvite[] }>(`/workspaces/invites${q}`);
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
  return apiFetch<{ workspace_name: string; email: string; role: string }>(
    `/public/workspace-invites/preview?token=${encodeURIComponent(token)}`,
  );
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

export type BillingPeriod = "monthly" | "yearly";

export type BillingUsage = {
  channels_used: number;
  posts_used: number;
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
  wallet_balance_cents: number;
  wallet_topup_min_cents: number;
  wallet_topup_max_cents: number;
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
  proxy_enabled: boolean;
  proxy_active_url: string;
  proxy_auto_failover: boolean;
  proxy_urls: string[];
  connect_help_text: string;
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
  | "youtube";

export type ChannelMetadata = {
  provider_title?: string;
  public_url?: string;
  avatar_url?: string;
  oauth_connected_at?: string;
  can_post?: boolean;
  is_admin?: boolean;
  bot_permissions?: string[];
  participants_count?: number;
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
