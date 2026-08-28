"use client";

import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import {
  Clock,
  Mail,
  Search,
  UserMinus,
  UserPlus,
  Users,
} from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { CabinetPage } from "@/components/layout/CabinetPage";
import { EmptyState } from "@/components/layout/EmptyState";
import { TeamInvitePanel } from "@/components/team/TeamInvitePanel";
import {
  ApiError,
  leaveWorkspace,
  removeWorkspaceMember,
  resendWorkspaceInvite,
  revokeWorkspaceInvite,
  transferWorkspaceOwnership,
  updateWorkspaceInvite,
  updateWorkspaceMember,
  fetchWorkspaceInvites,
  fetchWorkspaceMembers,
  type WorkspaceInvite,
  type WorkspaceMember,
  type WorkspaceSeats,
} from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { userAvatarSrc } from "@/lib/user-avatar";
import { cn } from "@/lib/utils";

const roleLabels: Record<string, string> = {
  owner: "Владелец",
  admin: "Администратор",
  editor: "Редактор",
  viewer: "Наблюдатель",
};

const roleHelp: Record<string, string> = {
  owner: "Полное управление workspace, тарифом и составом команды.",
  admin: "Управляет участниками, каналами и публикациями.",
  editor: "Создаёт и публикует контент в подключённых каналах.",
  viewer: "Видит календарь и материалы, без права публикации.",
};

const roleBadge: Record<string, string> = {
  owner: "border-amber-200 bg-amber-50 text-amber-800",
  admin: "border-blue-200 bg-blue-50 text-blue-800",
  editor: "border-border bg-zinc-50 text-zinc-700",
  viewer: "border-border bg-white text-muted",
};

const avatarPalette = [
  "bg-blue-100 text-blue-800",
  "bg-violet-100 text-violet-800",
  "bg-emerald-100 text-emerald-800",
  "bg-amber-100 text-amber-800",
  "bg-rose-100 text-rose-800",
  "bg-cyan-100 text-cyan-800",
];

type FilterId = "all" | "active" | "invites" | "suspended";
type Selection =
  | { kind: "member"; id: string }
  | { kind: "invite"; id: string }
  | { kind: "invite-new" }
  | null;

function initialsOf(name: string, email: string) {
  const source = (name || email).trim();
  return source
    .split(/[\s@]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("") || "?";
}

function avatarTone(key: string) {
  let hash = 0;
  for (const ch of key) hash = (hash + ch.charCodeAt(0) * 17) % avatarPalette.length;
  return avatarPalette[hash] ?? avatarPalette[0];
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("ru-RU", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString("ru-RU", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function inviteExpired(inv: WorkspaceInvite) {
  return new Date(inv.expires_at).getTime() <= Date.now();
}

function Rank(role: string) {
  switch (role) {
    case "owner":
      return 4;
    case "admin":
      return 3;
    case "editor":
      return 2;
    case "viewer":
      return 1;
    default:
      return 0;
  }
}

function SeatChip({ seats }: { seats?: WorkspaceSeats }) {
  if (!seats) return null;
  const occupied = seats.used + seats.pending;
  const limit = seats.limit;
  const limited = limit != null;
  const full = limit != null && occupied >= limit;
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium",
        full
          ? "border-amber-200 bg-amber-50 text-amber-800"
          : "border-border bg-zinc-50 text-zinc-700",
      )}
    >
      Места: {occupied}
      {limited ? ` из ${limit}` : " · без лимита"}
    </span>
  );
}

function RoleBadge({ role }: { role: string }) {
  return (
    <span
      className={cn(
        "inline-flex rounded-full border px-2 py-0.5 text-xs font-medium",
        roleBadge[role] ?? roleBadge.editor,
      )}
    >
      {roleLabels[role] ?? role}
    </span>
  );
}

function PersonAvatar({
  name,
  email,
  toneKey,
  src,
}: {
  name: string;
  email: string;
  toneKey: string;
  src?: string | null;
}) {
  return (
    <div
      className={cn(
        "flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full text-xs font-semibold",
        src ? "bg-zinc-100" : avatarTone(toneKey),
      )}
    >
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt="" className="h-full w-full object-cover" />
      ) : (
        initialsOf(name, email)
      )}
    </div>
  );
}

function DetailRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <p className="text-xs text-muted">{label}</p>
      <div className="mt-0.5 text-sm">{children}</div>
    </div>
  );
}

export function TeamPage() {
  const { user, workspace, active_workspace, refreshAuth } = useAuth();
  const workspaceId = active_workspace?.id ?? workspace?.id;
  const myRole = active_workspace?.role ?? workspace?.role ?? "";
  const canManage = myRole === "owner" || myRole === "admin";
  const router = useRouter();

  const [members, setMembers] = useState<WorkspaceMember[]>([]);
  const [invites, setInvites] = useState<WorkspaceInvite[]>([]);
  const [seats, setSeats] = useState<WorkspaceSeats | undefined>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState<FilterId>("all");
  const [query, setQuery] = useState("");
  const [selection, setSelection] = useState<Selection>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    if (!workspaceId) return;
    setLoading(true);
    setError("");
    try {
      const [membersData, invitesData] = await Promise.all([
        fetchWorkspaceMembers(workspaceId),
        fetchWorkspaceInvites(workspaceId).catch(() => ({ invites: [] as WorkspaceInvite[] })),
      ]);
      setMembers(membersData.members ?? []);
      setSeats(membersData.seats);
      setInvites(invitesData.invites ?? []);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Не удалось загрузить команду");
    } finally {
      setLoading(false);
    }
  }, [workspaceId]);

  useEffect(() => {
    void load();
  }, [load]);

  const selectedMember =
    selection?.kind === "member"
      ? members.find((m) => m.user_id === selection.id) ?? null
      : null;
  const selectedInvite =
    selection?.kind === "invite"
      ? invites.find((i) => i.id === selection.id) ?? null
      : null;

  useEffect(() => {
    if (selection?.kind === "member" && !selectedMember) setSelection(null);
    if (selection?.kind === "invite" && !selectedInvite) setSelection(null);
  }, [selection, selectedMember, selectedInvite]);

  const filteredMembers = useMemo(() => {
    const q = query.trim().toLowerCase();
    return members.filter((m) => {
      if (filter === "invites") return false;
      if (filter === "active" && m.status === "suspended") return false;
      if (filter === "suspended" && m.status !== "suspended") return false;
      if (!q) return true;
      return (
        m.name.toLowerCase().includes(q) ||
        m.email.toLowerCase().includes(q) ||
        (roleLabels[m.role] ?? m.role).toLowerCase().includes(q)
      );
    });
  }, [members, filter, query]);

  const filteredInvites = useMemo(() => {
    if (filter === "active" || filter === "suspended") return [];
    const q = query.trim().toLowerCase();
    return invites.filter((inv) => {
      if (!q) return true;
      return (
        inv.email.toLowerCase().includes(q) ||
        (roleLabels[inv.role] ?? inv.role).toLowerCase().includes(q)
      );
    });
  }, [invites, filter, query]);

  const counts = {
    all: members.length + invites.length,
    active: members.filter((m) => m.status !== "suspended").length,
    invites: invites.length,
    suspended: members.filter((m) => m.status === "suspended").length,
  };

  function canManageMember(target: WorkspaceMember) {
    if (!canManage) return false;
    if (target.user_id === user.id) return false;
    if (target.role === "owner") return false;
    return Rank(myRole) > Rank(target.role);
  }

  async function runAction(action: () => Promise<void>) {
    setBusy(true);
    setError("");
    try {
      await action();
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Не удалось выполнить действие");
    } finally {
      setBusy(false);
    }
  }

  const filters: { id: FilterId; label: string }[] = [
    { id: "all", label: `Все · ${counts.all}` },
    { id: "active", label: `В воркфлоу · ${counts.active}` },
    { id: "invites", label: `Приглашения · ${counts.invites}` },
    { id: "suspended", label: `Отстранены · ${counts.suspended}` },
  ];

  const occupied = seats ? seats.used + seats.pending : members.filter((m) => m.status !== "suspended").length + invites.filter((i) => !inviteExpired(i)).length;
  const seatLimit = seats?.limit;
  const seatsFull = seatLimit != null && occupied >= seatLimit;

  const rightTitle =
    selection?.kind === "invite-new"
      ? "Новое приглашение"
      : selectedMember
        ? selectedMember.name || selectedMember.email
        : selectedInvite
          ? selectedInvite.email
          : "Команда";

  return (
    <div>
      <PageHeader
        title="Команда"
        description="Участники текущего workspace: роли, приглашения и доступ к работе."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <SeatChip seats={seats} />
            {canManage && (
              <button
                type="button"
                onClick={() => setSelection({ kind: "invite-new" })}
                className="inline-flex items-center gap-2 rounded-md bg-accent px-3 py-2 text-sm font-medium text-white hover:bg-blue-700"
              >
                <UserPlus className="h-4 w-4" />
                Пригласить
              </button>
            )}
          </div>
        }
      />

      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <CabinetPage
        rightTitle={rightTitle}
        onCloseRight={selection ? () => setSelection(null) : undefined}
        right={
          selection?.kind === "invite-new" ? (
            canManage ? (
              <div className="space-y-4">
                <p className="text-sm text-muted">
                  Коллега получит письмо со ссылкой. Пока приглашение не принято, оно занимает место тарифа.
                </p>
                {seatsFull && (
                  <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
                    Лимит мест исчерпан. Отстраните участника или смените тариф, чтобы пригласить нового.
                  </p>
                )}
                <TeamInvitePanel
                  workspaceId={workspaceId}
                  disabled={seatsFull}
                  onCreated={() => {
                    void load();
                    setFilter("invites");
                  }}
                />
              </div>
            ) : (
              <p className="text-sm text-muted">
                Приглашать могут владелец и администратор.
              </p>
            )
          ) : selectedMember ? (
            <MemberSidebar
              member={selectedMember}
              myId={user.id}
              myRole={myRole}
              canManage={canManageMember(selectedMember)}
              busy={busy}
              isSelf={selectedMember.user_id === user.id}
              avatarSrc={
                selectedMember.user_id === user.id ? userAvatarSrc(user) : null
              }
              onChangeRole={(role) =>
                void runAction(async () => {
                  await updateWorkspaceMember(
                    selectedMember.user_id,
                    { role },
                    workspaceId,
                  );
                })
              }
              onSuspend={() => {
                if (
                  !window.confirm(
                    `Отстранить ${selectedMember.name || selectedMember.email} от воркфлоу? Доступ к workspace закроется, публикации и файлы сохранятся.`,
                  )
                ) {
                  return;
                }
                void runAction(async () => {
                  await updateWorkspaceMember(
                    selectedMember.user_id,
                    { status: "suspended" },
                    workspaceId,
                  );
                });
              }}
              onRestore={() =>
                void runAction(async () => {
                  await updateWorkspaceMember(
                    selectedMember.user_id,
                    { status: "active" },
                    workspaceId,
                  );
                })
              }
              onRemove={() => {
                if (
                  !window.confirm(
                    `Убрать ${selectedMember.name || selectedMember.email} из команды? Участник потеряет доступ. История публикаций останется.`,
                  )
                ) {
                  return;
                }
                void runAction(async () => {
                  await removeWorkspaceMember(selectedMember.user_id, workspaceId);
                  setSelection(null);
                });
              }}
              onTransfer={() => {
                if (
                  !window.confirm(
                    `Передать владение ${selectedMember.name || selectedMember.email}? Вы станете администратором.`,
                  )
                ) {
                  return;
                }
                void runAction(async () => {
                  await transferWorkspaceOwnership(selectedMember.user_id, workspaceId);
                  await refreshAuth();
                  router.refresh();
                });
              }}
              onLeave={() => {
                if (
                  !window.confirm(
                    "Покинуть этот workspace? Вы потеряете доступ, пока вас снова не пригласят.",
                  )
                ) {
                  return;
                }
                void runAction(async () => {
                  await leaveWorkspace(workspaceId);
                  await refreshAuth();
                  router.push("/dashboard");
                  router.refresh();
                });
              }}
            />
          ) : selectedInvite ? (
            <InviteSidebar
              invite={selectedInvite}
              canManage={canManage}
              busy={busy}
              onChangeRole={(role) =>
                void runAction(async () => {
                  await updateWorkspaceInvite(selectedInvite.id, role, workspaceId);
                })
              }
              onResend={() =>
                void runAction(async () => {
                  await resendWorkspaceInvite(selectedInvite.id, workspaceId);
                })
              }
              onRevoke={() => {
                if (
                  !window.confirm(
                    `Отозвать приглашение для ${selectedInvite.email}? Ссылка из письма перестанет работать.`,
                  )
                ) {
                  return;
                }
                void runAction(async () => {
                  await revokeWorkspaceInvite(selectedInvite.id, workspaceId);
                  setSelection(null);
                });
              }}
            />
          ) : (
            <OverviewSidebar
              seats={seats}
              members={members}
              invites={invites}
              canManage={canManage}
              onInvite={() => setSelection({ kind: "invite-new" })}
            />
          )
        }
      >
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap gap-1.5" role="tablist" aria-label="Фильтр команды">
            {filters.map((item) => (
              <button
                key={item.id}
                type="button"
                role="tab"
                aria-selected={filter === item.id}
                onClick={() => setFilter(item.id)}
                className={cn(
                  "rounded-full border px-3 py-1.5 text-xs font-medium",
                  filter === item.id
                    ? "border-accent bg-accent/10 text-accent"
                    : "border-border text-muted hover:bg-zinc-50",
                )}
              >
                {item.label}
              </button>
            ))}
          </div>
          <label className="relative block sm:w-72">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Имя, email или роль"
              className="w-full rounded-md border border-border bg-surface py-2 pl-9 pr-3 text-sm"
            />
          </label>
        </div>

        {loading ? (
          <p className="text-sm text-muted">Загрузка команды…</p>
        ) : filteredMembers.length === 0 && filteredInvites.length === 0 ? (
          <EmptyState
            title={query ? "Никого не нашли" : "Пока только вы"}
            description={
              query
                ? "Сбросьте поиск или выберите другой фильтр."
                : "Пригласите коллег — они появятся здесь после принятия письма."
            }
            action={
              canManage && !query ? (
                <button
                  type="button"
                  onClick={() => setSelection({ kind: "invite-new" })}
                  className="inline-flex items-center gap-2 rounded-md bg-accent px-3 py-2 text-sm font-medium text-white hover:bg-blue-700"
                >
                  <UserPlus className="h-4 w-4" />
                  Пригласить участника
                </button>
              ) : undefined
            }
          />
        ) : (
          <div className="overflow-hidden rounded-xl border border-border bg-surface shadow-sm">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-border bg-zinc-50 text-muted">
                <tr>
                  <th scope="col" className="px-4 py-3 font-medium">
                    Участник
                  </th>
                  <th scope="col" className="px-4 py-3 font-medium">
                    Роль
                  </th>
                  <th scope="col" className="px-4 py-3 font-medium">
                    Статус
                  </th>
                  <th scope="col" className="hidden px-4 py-3 font-medium md:table-cell">
                    В команде с
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredInvites.map((inv) => {
                  const expired = inviteExpired(inv);
                  const selected = selection?.kind === "invite" && selection.id === inv.id;
                  return (
                    <tr
                      key={`invite-${inv.id}`}
                      onClick={() => setSelection({ kind: "invite", id: inv.id })}
                      className={cn(
                        "cursor-pointer border-b border-border hover:bg-zinc-50",
                        selected && "bg-zinc-50",
                      )}
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-50 text-blue-700">
                            <Mail className="h-4 w-4" />
                          </div>
                          <div className="min-w-0">
                            <p className="font-medium">{inv.email}</p>
                            <p className="text-xs text-muted">Приглашение отправлено</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <RoleBadge role={inv.role} />
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={cn(
                            "inline-flex rounded-full border px-2 py-0.5 text-xs font-medium",
                            expired
                              ? "border-zinc-200 bg-zinc-100 text-zinc-600"
                              : "border-blue-200 bg-blue-50 text-blue-800",
                          )}
                        >
                          {expired ? "Истекло" : "Ожидает"}
                        </span>
                      </td>
                      <td className="hidden px-4 py-3 text-muted md:table-cell">
                        {formatDate(inv.created_at)}
                      </td>
                    </tr>
                  );
                })}
                {filteredMembers.map((member) => {
                  const selected =
                    selection?.kind === "member" && selection.id === member.user_id;
                  const suspended = member.status === "suspended";
                  return (
                    <tr
                      key={member.user_id}
                      onClick={() => setSelection({ kind: "member", id: member.user_id })}
                      className={cn(
                        "cursor-pointer border-b border-border last:border-0 hover:bg-zinc-50",
                        selected && "bg-zinc-50",
                        suspended && "opacity-70",
                      )}
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <PersonAvatar
                            name={member.name}
                            email={member.email}
                            toneKey={member.user_id}
                            src={
                              member.user_id === user.id ? userAvatarSrc(user) : null
                            }
                          />
                          <div className="min-w-0">
                            <p className="font-medium">
                              {member.name || member.email}
                              {member.user_id === user.id ? (
                                <span className="ml-1.5 text-xs font-normal text-muted">
                                  вы
                                </span>
                              ) : null}
                            </p>
                            <p className="truncate text-xs text-muted">{member.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <RoleBadge role={member.role} />
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={cn(
                            "inline-flex rounded-full border px-2 py-0.5 text-xs font-medium",
                            suspended
                              ? "border-amber-200 bg-amber-50 text-amber-800"
                              : "border-emerald-200 bg-emerald-50 text-emerald-800",
                          )}
                        >
                          {suspended ? "Отстранён" : "В воркфлоу"}
                        </span>
                      </td>
                      <td className="hidden px-4 py-3 text-muted md:table-cell">
                        {formatDate(member.joined_at)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </CabinetPage>
    </div>
  );
}

function OverviewSidebar({
  seats,
  members,
  invites,
  canManage,
  onInvite,
}: {
  seats?: WorkspaceSeats;
  members: WorkspaceMember[];
  invites: WorkspaceInvite[];
  canManage: boolean;
  onInvite: () => void;
}) {
  const active = members.filter((m) => m.status !== "suspended").length;
  return (
    <div className="space-y-5">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-zinc-100 text-zinc-600">
          <Users className="h-5 w-5" />
        </div>
        <div>
          <p className="font-semibold">Состав workspace</p>
          <p className="mt-0.5 text-xs text-muted">
            Выберите строку, чтобы увидеть детали и действия.
          </p>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2 text-center">
        <div className="rounded-lg border border-border bg-zinc-50 px-2 py-3">
          <p className="text-lg font-semibold">{active}</p>
          <p className="text-[11px] text-muted">в воркфлоу</p>
        </div>
        <div className="rounded-lg border border-border bg-zinc-50 px-2 py-3">
          <p className="text-lg font-semibold">{invites.length}</p>
          <p className="text-[11px] text-muted">приглашений</p>
        </div>
      </div>
      {seats && (
        <DetailRow label="Места тарифа">
          {seats.used + seats.pending}
          {seats.limit != null ? ` из ${seats.limit}` : " · без ограничения"}
          {seats.pending > 0 ? ` · ${seats.pending} ждут ответа` : ""}
        </DetailRow>
      )}
      <div>
        <p className="text-xs font-medium text-muted">Роли</p>
        <ul className="mt-2 space-y-2">
          {(["owner", "admin", "editor", "viewer"] as const).map((role) => (
            <li key={role} className="text-sm">
              <RoleBadge role={role} />
              <p className="mt-1 text-xs text-muted">{roleHelp[role]}</p>
            </li>
          ))}
        </ul>
      </div>
      {canManage && (
        <button
          type="button"
          onClick={onInvite}
          className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-accent px-3 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          <UserPlus className="h-4 w-4" />
          Пригласить участника
        </button>
      )}
    </div>
  );
}

function MemberSidebar({
  member,
  myId,
  myRole,
  canManage,
  busy,
  isSelf,
  avatarSrc,
  onChangeRole,
  onSuspend,
  onRestore,
  onRemove,
  onTransfer,
  onLeave,
}: {
  member: WorkspaceMember;
  myId: string;
  myRole: string;
  canManage: boolean;
  busy: boolean;
  isSelf: boolean;
  avatarSrc: string | null;
  onChangeRole: (role: string) => void;
  onSuspend: () => void;
  onRestore: () => void;
  onRemove: () => void;
  onTransfer: () => void;
  onLeave: () => void;
}) {
  const suspended = member.status === "suspended";
  const assignableRoles = ["admin", "editor", "viewer"].filter(
    (role) => Rank(myRole) > Rank(role) || role === member.role,
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <PersonAvatar
          name={member.name}
          email={member.email}
          toneKey={member.user_id}
          src={avatarSrc}
        />
        <div className="min-w-0">
          <p className="truncate font-semibold">{member.name || member.email}</p>
          <p className="truncate text-xs text-muted">{member.email}</p>
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        <RoleBadge role={member.role} />
        <span
          className={cn(
            "inline-flex rounded-full border px-2 py-0.5 text-xs font-medium",
            suspended
              ? "border-amber-200 bg-amber-50 text-amber-800"
              : "border-emerald-200 bg-emerald-50 text-emerald-800",
          )}
        >
          {suspended ? "Отстранён" : "В воркфлоу"}
        </span>
      </div>
      <DetailRow label="В команде с">{formatDateTime(member.joined_at)}</DetailRow>
      <DetailRow label="Как присоединился">
        {member.joined_via_invite ? "По приглашению" : "Создал workspace"}
      </DetailRow>
      <p className="text-xs text-muted">{roleHelp[member.role]}</p>

      {canManage && member.role !== "owner" && (
        <label className="block space-y-1">
          <span className="text-xs text-muted">Роль</span>
          <select
            value={member.role}
            disabled={busy || suspended}
            onChange={(e) => onChangeRole(e.target.value)}
            className="w-full rounded-md border border-border bg-bg px-3 py-2 text-sm"
          >
            {assignableRoles.map((role) => (
              <option key={role} value={role}>
                {roleLabels[role]}
              </option>
            ))}
          </select>
        </label>
      )}

      <div className="space-y-2 pt-1">
        {canManage && !suspended && (
          <button
            type="button"
            disabled={busy}
            onClick={onSuspend}
            className="inline-flex w-full items-center justify-center gap-2 rounded-md border border-amber-200 px-3 py-2 text-sm text-amber-800 hover:bg-amber-50 disabled:opacity-50"
          >
            <UserMinus className="h-4 w-4" />
            Отстранить от воркфлоу
          </button>
        )}
        {canManage && suspended && (
          <button
            type="button"
            disabled={busy}
            onClick={onRestore}
            className="w-full rounded-md bg-accent px-3 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            Вернуть в работу
          </button>
        )}
        {canManage && (
          <button
            type="button"
            disabled={busy}
            onClick={onRemove}
            className="w-full rounded-md border border-red-200 px-3 py-2 text-sm text-red-600 hover:bg-red-50 disabled:opacity-50"
          >
            Убрать из команды
          </button>
        )}
        {myRole === "owner" &&
          member.user_id !== myId &&
          !suspended &&
          member.role !== "owner" && (
            <button
              type="button"
              disabled={busy}
              onClick={onTransfer}
              className="w-full rounded-md border border-border px-3 py-2 text-sm hover:bg-zinc-50 disabled:opacity-50"
            >
              Передать владение
            </button>
          )}
        {isSelf && myRole !== "owner" && (
          <button
            type="button"
            disabled={busy}
            onClick={onLeave}
            className="w-full rounded-md border border-red-200 px-3 py-2 text-sm text-red-600 hover:bg-red-50 disabled:opacity-50"
          >
            Покинуть workspace
          </button>
        )}
      </div>
    </div>
  );
}

function InviteSidebar({
  invite,
  canManage,
  busy,
  onChangeRole,
  onResend,
  onRevoke,
}: {
  invite: WorkspaceInvite;
  canManage: boolean;
  busy: boolean;
  onChangeRole: (role: string) => void;
  onResend: () => void;
  onRevoke: () => void;
}) {
  const expired = inviteExpired(invite);
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-50 text-blue-700">
          <Mail className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <p className="truncate font-semibold">{invite.email}</p>
          <p className="text-xs text-muted">Ещё не принял приглашение</p>
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        <RoleBadge role={invite.role} />
        <span
          className={cn(
            "inline-flex rounded-full border px-2 py-0.5 text-xs font-medium",
            expired
              ? "border-zinc-200 bg-zinc-100 text-zinc-600"
              : "border-blue-200 bg-blue-50 text-blue-800",
          )}
        >
          {expired ? "Истекло" : "Ожидает ответа"}
        </span>
      </div>
      <DetailRow label="Отправлено">{formatDateTime(invite.created_at)}</DetailRow>
      <DetailRow label={expired ? "Истекло" : "Действует до"}>
        <span className="inline-flex items-center gap-1">
          <Clock className="h-3.5 w-3.5 text-muted" />
          {formatDateTime(invite.expires_at)}
        </span>
      </DetailRow>
      {(invite.invited_by_name || invite.invited_by_email) && (
        <DetailRow label="Пригласил">
          {invite.invited_by_name || invite.invited_by_email}
        </DetailRow>
      )}
      {canManage && (
        <>
          <label className="block space-y-1">
            <span className="text-xs text-muted">Роль после входа</span>
            <select
              value={invite.role}
              disabled={busy}
              onChange={(e) => onChangeRole(e.target.value)}
              className="w-full rounded-md border border-border bg-bg px-3 py-2 text-sm"
            >
              {["admin", "editor", "viewer"].map((role) => (
                <option key={role} value={role}>
                  {roleLabels[role]}
                </option>
              ))}
            </select>
          </label>
          <div className="space-y-2 pt-1">
            <button
              type="button"
              disabled={busy}
              onClick={onResend}
              className="w-full rounded-md bg-accent px-3 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {expired ? "Отправить новое письмо" : "Отправить ещё раз"}
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={onRevoke}
              className="w-full rounded-md border border-red-200 px-3 py-2 text-sm text-red-600 hover:bg-red-50 disabled:opacity-50"
            >
              Отозвать приглашение
            </button>
          </div>
        </>
      )}
    </div>
  );
}
