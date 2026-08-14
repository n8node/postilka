"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AlertTriangle, Loader2 } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { CabinetPage } from "@/components/layout/CabinetPage";
import { EmptyState } from "@/components/layout/EmptyState";
import { CalendarBulkBar } from "@/components/calendar/CalendarBulkBar";
import { CalendarToolbar } from "@/components/calendar/CalendarToolbar";
import { CalendarFiltersBar, type StatusFilter } from "@/components/calendar/CalendarFiltersBar";
import { CalendarMonthView } from "@/components/calendar/CalendarMonthView";
import { CalendarWeekView, CalendarDayView } from "@/components/calendar/CalendarWeekView";
import { CalendarListView } from "@/components/calendar/CalendarListView";
import { CalendarKanbanView, type KanbanColumnId, columnForPost } from "@/components/calendar/CalendarKanbanView";
import { CalendarTimelineView } from "@/components/calendar/CalendarTimelineView";
import { CalendarInspector } from "@/components/calendar/CalendarInspector";
import { CalendarQueuePanel } from "@/components/calendar/CalendarQueuePanel";
import { UndoToast } from "@/components/calendar/UndoToast";
import { useAuth } from "@/context/AuthContext";
import { ApiError, fetchChannels, type ChannelListItem } from "@/lib/api";
import {
  type CalendarView,
  combineDateAndTime,
  dateKey,
  isPastDateTime,
  postCalendarDate,
  rangeForView,
  shiftAnchor,
  toRFC3339,
} from "@/lib/calendar-utils";
import { detectCalendarConflicts } from "@/lib/calendar-conflicts";
import { downloadCalendarIcs } from "@/lib/calendar-ical";
import { metricsMapFromAnalytics, type PostMetricsSummary } from "@/lib/calendar-metrics";
import { fetchAnalyticsPosts } from "@/lib/analytics-api";
import { DEFAULT_TIMEZONE, normalizeTimezone, RUSSIA_TIMEZONES } from "@/lib/russia-timezones";
import {
  cancelPost,
  createPost,
  deletePost,
  fetchCalendarPosts,
  fetchUnscheduledPosts,
  publishPost,
  schedulePost,
  type Post,
} from "@/lib/posts-api";
import { postPreviewText, postToSaveInput } from "@/lib/posts-display";

type DragPayload = {
  postId: string;
  sourceDueAt?: string;
};

type UndoState = {
  postId: string;
  previousDueAt?: string;
  message: string;
};

export function CalendarPage() {
  const { user } = useAuth();
  const workspaceTz = normalizeTimezone(user?.timezone || DEFAULT_TIMEZONE);

  const [view, setView] = useState<CalendarView>("month");
  const [anchor, setAnchor] = useState(() => new Date());
  const [displayTimeZone, setDisplayTimeZone] = useState(workspaceTz);
  const [posts, setPosts] = useState<Post[]>([]);
  const [queuePosts, setQueuePosts] = useState<Post[]>([]);
  const [channels, setChannels] = useState<ChannelListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [bulkSelected, setBulkSelected] = useState<Set<string>>(new Set());
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("");
  const [channelFilter, setChannelFilter] = useState("");
  const [query, setQuery] = useState("");
  const [hidePublished, setHidePublished] = useState(true);
  const [originFilter, setOriginFilter] = useState<"" | "user" | "agent">("");
  const [busy, setBusy] = useState(false);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dropTargetKey, setDropTargetKey] = useState<string | null>(null);
  const [invalidDrop, setInvalidDrop] = useState(false);
  const [undo, setUndo] = useState<UndoState | null>(null);
  const [expandedDay, setExpandedDay] = useState<Date | null>(null);
  const [metricsByPost, setMetricsByPost] = useState<Map<string, PostMetricsSummary>>(new Map());
  const [dropColumn, setDropColumn] = useState<KanbanColumnId | null>(null);
  const dragPayload = useRef<DragPayload | null>(null);

  useEffect(() => {
    setDisplayTimeZone(workspaceTz);
  }, [workspaceTz]);

  const range = useMemo(() => rangeForView(view, anchor, displayTimeZone), [view, anchor, displayTimeZone]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [calendarRes, queueRes, channelsRes, analyticsRes] = await Promise.all([
        fetchCalendarPosts({
          from: toRFC3339(range.from),
          to: toRFC3339(range.to),
          status: statusFilter || undefined,
          channel_id: channelFilter || undefined,
          q: query || undefined,
          origin: originFilter || undefined,
        }),
        fetchUnscheduledPosts({
          status: statusFilter === "draft" ? "draft" : statusFilter || undefined,
          channel_id: channelFilter || undefined,
          q: query || undefined,
          origin: originFilter || undefined,
        }),
        fetchChannels(),
        fetchAnalyticsPosts({
          from: toRFC3339(range.from),
          to: toRFC3339(range.to),
          limit: 500,
        }).catch(() => ({ items: [], total: 0 })),
      ]);
      setPosts(calendarRes.items);
      setQueuePosts(queueRes.items);
      setChannels(channelsRes.items);
      setMetricsByPost(metricsMapFromAnalytics(analyticsRes.items));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Не удалось загрузить календарь");
    } finally {
      setLoading(false);
    }
  }, [range.from, range.to, statusFilter, channelFilter, query, originFilter]);

  useEffect(() => {
    void load();
  }, [load]);

  const filteredPosts = useMemo(() => {
    let list = posts;
    if (hidePublished) list = list.filter((p) => p.status !== "published");
    return list;
  }, [posts, hidePublished]);

  const conflicts = useMemo(
    () => detectCalendarConflicts(filteredPosts, channels, displayTimeZone),
    [filteredPosts, channels, displayTimeZone],
  );

  const selected = useMemo(
    () => [...filteredPosts, ...queuePosts].find((p) => p.id === selectedId) ?? null,
    [filteredPosts, queuePosts, selectedId],
  );

  const updatePostLocal = (updated: Post) => {
    setPosts((prev) => {
      const idx = prev.findIndex((p) => p.id === updated.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = updated;
        return next;
      }
      return [...prev, updated];
    });
    setQueuePosts((prev) => {
      const hasDue = Boolean(updated.due_at);
      const inQueue = prev.some((p) => p.id === updated.id);
      if (!hasDue && ["draft", "failed", "canceled"].includes(updated.status)) {
        if (inQueue) return prev.map((p) => (p.id === updated.id ? updated : p));
        return [...prev, updated];
      }
      return prev.filter((p) => p.id !== updated.id);
    });
  };

  const removePostLocal = (postId: string) => {
    setPosts((prev) => prev.filter((p) => p.id !== postId));
    setQueuePosts((prev) => prev.filter((p) => p.id !== postId));
    if (selectedId === postId) setSelectedId(null);
  };

  const handleDragStart = (post: Post, e: React.DragEvent) => {
    dragPayload.current = { postId: post.id, sourceDueAt: post.due_at };
    setDraggingId(post.id);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", post.id);
    if (e.currentTarget instanceof HTMLElement) {
      e.dataTransfer.setDragImage(e.currentTarget, 20, 16);
    }
  };

  const handleDragEnd = () => {
    setDraggingId(null);
    setDropTargetKey(null);
    setDropColumn(null);
    setInvalidDrop(false);
    dragPayload.current = null;
  };

  const handleDragOverColumn = (column: KanbanColumnId, e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDropColumn(column);
  };

  const handleDropColumn = async (column: KanbanColumnId, e: React.DragEvent) => {
    e.preventDefault();
    const payload = dragPayload.current;
    handleDragEnd();
    if (!payload) return;
    const post = [...filteredPosts, ...queuePosts].find((p) => p.id === payload.postId);
    if (!post) return;
    if (columnForPost(post) === column) return;

    if (column === "scheduled") {
      const next = combineDateAndTime(new Date(), post.due_at, displayTimeZone);
      if (isPastDateTime(next)) return;
      await reschedulePost(post, next);
      return;
    }
    if (column === "issues" && ["scheduled", "pending_approval", "draft", "failed"].includes(post.status)) {
      try {
        const updated = await cancelPost(post.id);
        updatePostLocal(updated);
      } catch (err) {
        setError(err instanceof ApiError ? err.message : "Не удалось отменить публикацию");
      }
    }
  };

  const handleExportIcal = () => {
    const exportPosts = [...filteredPosts, ...queuePosts].filter((p) => postCalendarDate(p));
    const stamp = new Intl.DateTimeFormat("en-CA", { timeZone: displayTimeZone }).format(new Date());
    downloadCalendarIcs(exportPosts, displayTimeZone, `postilka-${stamp}.ics`);
  };

  const evaluateDrop = (targetDate: Date) => {
    const payload = dragPayload.current;
    if (!payload) return null;
    const post = [...filteredPosts, ...queuePosts].find((p) => p.id === payload.postId);
    if (!post) return null;
    const next = combineDateAndTime(targetDate, post.due_at, displayTimeZone);
    if (isPastDateTime(next)) {
      setInvalidDrop(true);
      return null;
    }
    setInvalidDrop(false);
    return { post, next, same:
      post.due_at && Math.abs(new Date(post.due_at).getTime() - next.getTime()) < 60_000 };
  };

  const handleDragOverDay = (day: Date, e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    const key = dateKey(day, displayTimeZone);
    setDropTargetKey(key);
    const payload = dragPayload.current;
    if (!payload) return;
    const post = [...filteredPosts, ...queuePosts].find((p) => p.id === payload.postId);
    if (!post) return;
    const next = combineDateAndTime(day, post.due_at, displayTimeZone);
    setInvalidDrop(isPastDateTime(next));
  };

  const handleDropDay = async (day: Date, e: React.DragEvent) => {
    e.preventDefault();
    const result = evaluateDrop(day);
    handleDragEnd();
    if (!result || result.same) return;
    await reschedulePost(result.post, result.next);
  };

  const handleDragOverHour = (hour: number, e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    const key = `${dateKey(anchor, displayTimeZone)}-${hour}`;
    setDropTargetKey(key);
    const payload = dragPayload.current;
    if (!payload) return;
    const post = [...filteredPosts, ...queuePosts].find((p) => p.id === payload.postId);
    if (!post) return;
    const next = combineDateAndTime(anchor, post.due_at, displayTimeZone, hour);
    setInvalidDrop(isPastDateTime(next));
  };

  const handleDropHour = async (hour: number, e: React.DragEvent) => {
    e.preventDefault();
    const next = combineDateAndTime(anchor, undefined, displayTimeZone, hour);
    const payload = dragPayload.current;
    handleDragEnd();
    if (!payload) return;
    const post = [...filteredPosts, ...queuePosts].find((p) => p.id === payload.postId);
    if (!post || isPastDateTime(next)) return;
    if (post.due_at && Math.abs(new Date(post.due_at).getTime() - next.getTime()) < 60_000) return;
    await reschedulePost(post, next);
  };

  const reschedulePost = async (post: Post, next: Date) => {
    const previousDueAt = post.due_at;
    const optimistic = { ...post, due_at: toRFC3339(next), status: "scheduled" as const };
    updatePostLocal(optimistic);
    try {
      const updated = await schedulePost(post.id, toRFC3339(next));
      updatePostLocal(updated);
      setUndo({
        postId: post.id,
        previousDueAt,
        message: `Перенесено: ${postPreviewText(post).slice(0, 40)}…`,
      });
    } catch (err) {
      updatePostLocal(post);
      setError(err instanceof ApiError ? err.message : "Не удалось перенести публикацию");
    }
  };

  const handleUndo = async () => {
    if (!undo) return;
    const post = [...filteredPosts, ...queuePosts].find((p) => p.id === undo.postId);
    setUndo(null);
    if (!post) return;
    if (!undo.previousDueAt) {
      try {
        const canceled = await cancelPost(post.id);
        updatePostLocal(canceled);
      } catch {
        /* ignore */
      }
      return;
    }
    try {
      const updated = await schedulePost(post.id, undo.previousDueAt);
      updatePostLocal(updated);
    } catch {
      /* ignore */
    }
  };

  const handleInspectorAction = async (action: () => Promise<void>) => {
    setBusy(true);
    try {
      await action();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Ошибка операции");
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement || e.target instanceof HTMLSelectElement) {
        return;
      }
      if (e.key === "t" || e.key === "T") {
        e.preventDefault();
        setAnchor(new Date());
      }
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        setAnchor((a) => shiftAnchor(view, a, -1, displayTimeZone));
      }
      if (e.key === "ArrowRight") {
        e.preventDefault();
        setAnchor((a) => shiftAnchor(view, a, 1, displayTimeZone));
      }
      if (e.key === "Escape") setSelectedId(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [view, displayTimeZone]);

  const toggleBulk = (id: string) => {
    setBulkSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const expandedDayPosts = useMemo(() => {
    if (!expandedDay) return [];
    const key = dateKey(expandedDay, displayTimeZone);
    return filteredPosts
      .filter((p) => {
        const at = postCalendarDate(p);
        return at && dateKey(at, displayTimeZone) === key;
      })
      .sort((a, b) => (postCalendarDate(a)?.getTime() ?? 0) - (postCalendarDate(b)?.getTime() ?? 0));
  }, [expandedDay, filteredPosts, displayTimeZone]);

  return (
    <div>
      <PageHeader
        title="Календарь"
        description="Планирование публикаций: перетаскивайте посты, фильтруйте по каналам и статусам."
      />

      <CabinetPage
        rightTitle={selected ? postPreviewText(selected).slice(0, 48) : undefined}
        onCloseRight={selected ? () => setSelectedId(null) : undefined}
        right={
          selected ? (
            <CalendarInspector
              post={selected}
              channels={channels}
              timeZone={displayTimeZone}
              metrics={metricsByPost.get(selected.id)}
              busy={busy}
              onReschedule={() => {
                const next = window.prompt(
                  "Новая дата и время (ГГГГ-ММ-ДД ЧЧ:ММ)",
                  selected.due_at
                    ? new Intl.DateTimeFormat("sv-SE", {
                        year: "numeric",
                        month: "2-digit",
                        day: "2-digit",
                        hour: "2-digit",
                        minute: "2-digit",
                        timeZone: displayTimeZone,
                      })
                        .format(new Date(selected.due_at))
                        .replace(" ", "T")
                        .slice(0, 16)
                        .replace("T", " ")
                    : "",
                );
                if (!next) return;
                const parsed = new Date(next.replace(" ", "T"));
                if (Number.isNaN(parsed.getTime())) return;
                void handleInspectorAction(async () => {
                  const updated = await schedulePost(selected.id, parsed.toISOString());
                  updatePostLocal(updated);
                });
              }}
              onCancel={() =>
                handleInspectorAction(async () => {
                  const updated = await cancelPost(selected.id);
                  updatePostLocal(updated);
                })
              }
              onPublish={() =>
                handleInspectorAction(async () => {
                  const updated = await publishPost(selected.id);
                  updatePostLocal(updated);
                  await load();
                })
              }
              onDuplicate={() =>
                handleInspectorAction(async () => {
                  const input = postToSaveInput(selected);
                  const created = await createPost(input);
                  updatePostLocal(created);
                  setSelectedId(created.id);
                })
              }
              onDelete={() =>
                handleInspectorAction(async () => {
                  if (!window.confirm("Удалить публикацию?")) return;
                  await deletePost(selected.id);
                  removePostLocal(selected.id);
                })
              }
            />
          ) : undefined
        }
      >
        <CalendarToolbar
          view={view}
          anchor={anchor}
          timeZone={displayTimeZone}
          displayTimeZone={displayTimeZone}
          onViewChange={setView}
          onPrev={() => setAnchor((a) => shiftAnchor(view, a, -1, displayTimeZone))}
          onNext={() => setAnchor((a) => shiftAnchor(view, a, 1, displayTimeZone))}
          onToday={() => setAnchor(new Date())}
          onDisplayTimeZoneChange={setDisplayTimeZone}
          timezoneOptions={RUSSIA_TIMEZONES}
          loading={loading}
          onExportIcal={handleExportIcal}
        />

        <CalendarFiltersBar
          channels={channels}
          status={statusFilter}
          channelId={channelFilter}
          query={query}
          hidePublished={hidePublished}
          origin={originFilter}
          onStatusChange={setStatusFilter}
          onChannelChange={setChannelFilter}
          onQueryChange={setQuery}
          onHidePublishedChange={setHidePublished}
          onOriginChange={setOriginFilter}
        />

        {view === "list" ? (
          <CalendarBulkBar
            count={bulkSelected.size}
            busy={busy}
            onClear={() => setBulkSelected(new Set())}
            onCancelSelected={() =>
              void handleInspectorAction(async () => {
                for (const id of bulkSelected) {
                  try {
                    const updated = await cancelPost(id);
                    updatePostLocal(updated);
                  } catch {
                    /* skip failed */
                  }
                }
                setBulkSelected(new Set());
              })
            }
          />
        ) : null}

        {conflicts.length > 0 ? (
          <div className="mb-3 flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <div>
              <p className="font-semibold">Обнаружены пересечения ({conflicts.length})</p>
              <ul className="mt-1 list-inside list-disc">
                {conflicts.slice(0, 3).map((c) => (
                  <li key={c.id}>{c.message}</li>
                ))}
              </ul>
            </div>
          </div>
        ) : null}

        {error ? (
          <div className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">{error}</div>
        ) : null}

        <CalendarQueuePanel
          posts={queuePosts}
          channels={channels}
          timeZone={displayTimeZone}
          selectedId={selectedId}
          onSelect={setSelectedId}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        />

        <div className="mt-3">
          {loading && posts.length === 0 ? (
            <div className="flex items-center justify-center gap-2 rounded-xl border border-border py-16 text-sm text-muted">
              <Loader2 className="h-5 w-5 animate-spin" />
              Загрузка календаря…
            </div>
          ) : filteredPosts.length === 0 && queuePosts.length === 0 ? (
            <EmptyState
              title="Календарь пуст"
              description="Создайте пост или перетащите черновик из очереди на нужный день."
              action={
                <Link
                  href="/posts/new"
                  className="inline-flex rounded-md bg-accent px-3 py-2 text-sm font-semibold text-white hover:opacity-90"
                >
                  Создать пост
                </Link>
              }
            />
          ) : view === "month" ? (
            <CalendarMonthView
              anchor={anchor}
              timeZone={displayTimeZone}
              posts={filteredPosts}
              channels={channels}
              selectedId={selectedId}
              conflicts={conflicts}
              metricsByPost={metricsByPost}
              draggingId={draggingId}
              dropTargetKey={dropTargetKey}
              invalidDrop={invalidDrop}
              onSelect={setSelectedId}
              onDragStart={handleDragStart}
              onDragEnd={handleDragEnd}
              onDragOverDay={handleDragOverDay}
              onDropDay={handleDropDay}
              onExpandDay={setExpandedDay}
            />
          ) : view === "week" ? (
            <CalendarWeekView
              anchor={anchor}
              timeZone={displayTimeZone}
              posts={filteredPosts}
              channels={channels}
              selectedId={selectedId}
              conflicts={conflicts}
              metricsByPost={metricsByPost}
              draggingId={draggingId}
              dropTargetKey={dropTargetKey}
              invalidDrop={invalidDrop}
              onSelect={setSelectedId}
              onDragStart={handleDragStart}
              onDragEnd={handleDragEnd}
              onDragOverDay={handleDragOverDay}
              onDropDay={handleDropDay}
            />
          ) : view === "day" ? (
            <CalendarDayView
              anchor={anchor}
              timeZone={displayTimeZone}
              posts={filteredPosts}
              channels={channels}
              selectedId={selectedId}
              conflicts={conflicts}
              metricsByPost={metricsByPost}
              draggingId={draggingId}
              dropTargetKey={dropTargetKey}
              invalidDrop={invalidDrop}
              onSelect={setSelectedId}
              onDragStart={handleDragStart}
              onDragEnd={handleDragEnd}
              onDragOverHour={handleDragOverHour}
              onDropHour={handleDropHour}
            />
          ) : view === "kanban" ? (
            <CalendarKanbanView
              posts={[...filteredPosts, ...queuePosts]}
              channels={channels}
              timeZone={displayTimeZone}
              selectedId={selectedId}
              metricsByPost={metricsByPost}
              conflicts={conflicts}
              draggingId={draggingId}
              dropColumn={dropColumn}
              onSelect={setSelectedId}
              onDragStart={handleDragStart}
              onDragEnd={handleDragEnd}
              onDragOverColumn={handleDragOverColumn}
              onDropColumn={handleDropColumn}
            />
          ) : view === "timeline" ? (
            <CalendarTimelineView
              anchor={anchor}
              timeZone={displayTimeZone}
              posts={filteredPosts}
              channels={channels}
              selectedId={selectedId}
              metricsByPost={metricsByPost}
              onSelect={setSelectedId}
            />
          ) : (
            <CalendarListView
              posts={filteredPosts}
              channels={channels}
              timeZone={displayTimeZone}
              selectedId={selectedId}
              conflicts={conflicts}
              metricsByPost={metricsByPost}
              selectedIds={bulkSelected}
              onSelect={setSelectedId}
              onToggleSelect={toggleBulk}
            />
          )}
        </div>

        {expandedDay ? (
          <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/30 p-4 sm:items-center">
            <div className="max-h-[80vh] w-full max-w-md overflow-hidden rounded-xl border border-border bg-surface shadow-xl">
              <div className="flex items-center justify-between border-b border-border px-4 py-3">
                <h3 className="text-sm font-semibold">
                  {new Intl.DateTimeFormat("ru-RU", {
                    weekday: "long",
                    day: "numeric",
                    month: "long",
                    timeZone: displayTimeZone,
                  }).format(expandedDay)}
                </h3>
                <button
                  type="button"
                  onClick={() => setExpandedDay(null)}
                  className="text-sm text-muted hover:text-text"
                >
                  Закрыть
                </button>
              </div>
              <div className="max-h-[60vh] space-y-1 overflow-y-auto p-3">
                {expandedDayPosts.map((post) => (
                  <button
                    key={post.id}
                    type="button"
                    onClick={() => {
                      setSelectedId(post.id);
                      setExpandedDay(null);
                    }}
                    className="block w-full rounded-md border border-border px-3 py-2 text-left text-xs hover:bg-zinc-50"
                  >
                    {postPreviewText(post)}
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : null}
      </CabinetPage>

      {undo ? <UndoToast message={undo.message} onUndo={() => void handleUndo()} onDismiss={() => setUndo(null)} /> : null}
    </div>
  );
}
