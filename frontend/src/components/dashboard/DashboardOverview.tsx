"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  LayoutGrid,
  Loader2,
  PenSquare,
  Plus,
  Radio,
  Sparkles,
  TriangleAlert,
  Video,
  Wallet,
} from "lucide-react";
import { ProtectedMediaImage } from "@/components/media/ProtectedMediaImage";
import { ProtectedMediaVideo } from "@/components/media/ProtectedMediaVideo";
import { fetchChannels, type ChannelListItem } from "@/lib/api";
import {
  adStudioCategoryLabel,
  fetchAdStudioTemplates,
  type AdStudioTemplate,
} from "@/lib/ad-studio";
import { fetchPosts, type Post } from "@/lib/posts-api";
import { cn } from "@/lib/utils";

type DashboardOverviewProps = {
  userName?: string;
  workspaceName?: string;
};

const STATUS_LABEL: Record<Post["status"], string> = {
  draft: "Черновик",
  pending_approval: "На согласовании",
  scheduled: "Запланирован",
  publishing: "Публикуется",
  published: "Опубликован",
  failed: "Ошибка",
  canceled: "Отменён",
};

function formatDate(value?: string) {
  if (!value) return "Без даты";
  return new Intl.DateTimeFormat("ru-RU", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function templateAspectClass(ratio: string) {
  if (ratio === "9:16") return "aspect-[9/16]";
  if (ratio === "4:5") return "aspect-[4/5]";
  if (ratio === "16:9") return "aspect-video";
  return "aspect-square";
}

const STUDIO_VIDEO_ROWS = 2;
const STUDIO_VIDEO_COLUMNS = 6;

function StudioVideoCard({ template }: { template: AdStudioTemplate }) {
  const hasVideoPreview = template.preview_kind === "video" && template.preview_source_url;

  return (
    <Link
      href="/ai"
      className="group relative min-w-0 overflow-hidden rounded-2xl bg-zinc-100 focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2"
    >
      <div className={cn("relative overflow-hidden", templateAspectClass(template.aspect_ratio))}>
        {hasVideoPreview ? (
          <ProtectedMediaVideo
            url={template.preview_source_url!}
            poster={template.preview_url}
            autoPlay
            loop
            muted
            controls={false}
            lazy
            className="object-cover transition duration-500 group-hover:scale-[1.04]"
          />
        ) : template.preview_url ? (
          <ProtectedMediaImage
            url={template.preview_url}
            alt={template.title}
            loading="lazy"
            className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.04]"
          />
        ) : (
          <div className="flex h-full items-center justify-center bg-gradient-to-br from-violet-200 via-fuchsia-100 to-amber-100 text-violet-700">
            <Video className="h-7 w-7" />
          </div>
        )}
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/25 to-transparent p-3 pt-10 text-white">
          <div className="mb-1 flex items-center gap-1.5 text-[11px] font-medium text-white/75">
            <Video className="h-3 w-3" />
            {adStudioCategoryLabel(template.category)}
          </div>
          <p className="truncate text-sm font-semibold">{template.title}</p>
        </div>
      </div>
    </Link>
  );
}

export function DashboardOverview({ userName, workspaceName }: DashboardOverviewProps) {
  const [templates, setTemplates] = useState<AdStudioTemplate[]>([]);
  const [channels, setChannels] = useState<ChannelListItem[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    void Promise.all([
      fetchAdStudioTemplates(),
      fetchChannels(),
      fetchPosts({ limit: 24 }),
    ])
      .then(([studio, channelResponse, postResponse]) => {
        if (!mounted) return;
        setTemplates(
          studio.items
            .filter((item) => item.media_kind === "video")
            .slice(0, STUDIO_VIDEO_ROWS * STUDIO_VIDEO_COLUMNS),
        );
        setChannels(channelResponse.items);
        setPosts(postResponse.items);
      })
      .catch(() => {
        // Each destination remains available even when the overview request fails.
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, []);

  const upcomingPosts = useMemo(
    () =>
      posts
        .filter((post) => post.status === "scheduled" || post.status === "publishing" || post.status === "pending_approval")
        .sort((a, b) => (a.due_at || "").localeCompare(b.due_at || ""))
        .slice(0, 4),
    [posts],
  );
  const activeChannels = channels.filter((channel) => channel.status === "active").length;
  const reconnectChannels = channels.filter((channel) => channel.status === "needs_reconnect").length;
  const approvalPosts = posts.filter((post) => post.status === "pending_approval").length;
  const failedPosts = posts.filter((post) => post.status === "failed").length;

  return (
    <div className="space-y-6 px-4 py-6 sm:px-6 lg:px-8">
      <section className="relative overflow-hidden rounded-3xl bg-zinc-950 px-5 py-6 text-white sm:px-7 lg:px-8 lg:py-8">
        <div className="pointer-events-none absolute -right-24 -top-40 h-96 w-96 rounded-full bg-violet-600/35 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-36 left-[35%] h-72 w-72 rounded-full bg-cyan-500/20 blur-3xl" />
        <div className="relative grid gap-6 xl:grid-cols-[minmax(0,1fr)_auto] xl:items-end">
          <div>
            <p className="mb-3 text-sm text-zinc-300">{workspaceName || "Ваше рабочее пространство"}</p>
            <h1 className="max-w-3xl text-3xl font-semibold tracking-tight sm:text-4xl">
              {userName ? `${userName}, создавайте и запускайте контент в одном потоке.` : "Создавайте и запускайте контент в одном потоке."}
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-zinc-300">
              Студия, публикации, каналы и результат собраны в едином рабочем контуре.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href="/ai" className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-zinc-950 transition hover:bg-zinc-100">
              <Sparkles className="h-4 w-4" />
              Открыть Студию
            </Link>
            <Link href="/posts/new" className="inline-flex items-center gap-2 rounded-xl border border-white/20 bg-white/10 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-white/15">
              <Plus className="h-4 w-4" />
              Создать пост
            </Link>
          </div>
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Link href="/channels" className="rounded-2xl border border-border bg-surface p-4 transition hover:border-zinc-300 hover:shadow-sm">
          <Radio className="h-5 w-5 text-sky-600" />
          <p className="mt-5 text-3xl font-semibold tracking-tight">{activeChannels}</p>
          <p className="mt-1 text-sm font-medium">Активных каналов</p>
          <p className="mt-1 text-xs text-muted">{channels.length ? `из ${channels.length} подключённых` : "Подключите первый канал"}</p>
        </Link>
        <Link href="/calendar" className="rounded-2xl border border-border bg-surface p-4 transition hover:border-zinc-300 hover:shadow-sm">
          <CalendarDays className="h-5 w-5 text-violet-600" />
          <p className="mt-5 text-3xl font-semibold tracking-tight">{upcomingPosts.length}</p>
          <p className="mt-1 text-sm font-medium">Ближайших публикаций</p>
          <p className="mt-1 text-xs text-muted">Следующие действия в календаре</p>
        </Link>
        <Link href="/posts?status=pending_approval" className="rounded-2xl border border-border bg-surface p-4 transition hover:border-zinc-300 hover:shadow-sm">
          <CheckCircle2 className="h-5 w-5 text-emerald-600" />
          <p className="mt-5 text-3xl font-semibold tracking-tight">{approvalPosts}</p>
          <p className="mt-1 text-sm font-medium">Ждут согласования</p>
          <p className="mt-1 text-xs text-muted">Проверьте перед публикацией</p>
        </Link>
        <Link href="/plans" className="rounded-2xl border border-border bg-surface p-4 transition hover:border-zinc-300 hover:shadow-sm">
          <Wallet className="h-5 w-5 text-amber-600" />
          <p className="mt-5 text-3xl font-semibold tracking-tight">Тариф</p>
          <p className="mt-1 text-sm font-medium">Квоты и кошелёк</p>
          <p className="mt-1 text-xs text-muted">Баланс и AI-лимиты</p>
        </Link>
      </section>

      <section className="overflow-hidden rounded-3xl border border-border bg-surface">
        <div className="flex flex-wrap items-end justify-between gap-4 border-b border-border px-5 py-5 sm:px-6">
          <div>
            <div className="mb-2 flex items-center gap-2 text-violet-700">
              <LayoutGrid className="h-4 w-4" />
              <span className="text-xs font-semibold uppercase tracking-[0.14em]">Студия</span>
            </div>
            <h2 className="text-xl font-semibold tracking-tight">Видео-сценарии из Студии</h2>
            <p className="mt-1 text-sm text-muted">Готовые видео-шаблоны для рекламы, UGC и motion — откроются в Студии.</p>
          </div>
          <Link href="/ai" className="inline-flex items-center gap-1.5 text-sm font-semibold text-accent hover:underline">
            Все видео-шаблоны <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        <div className="p-3 sm:p-4">
          {loading ? (
            <div className="flex h-52 items-center justify-center gap-2 text-sm text-muted">
              <Loader2 className="h-4 w-4 animate-spin" /> Загружаем Студию…
            </div>
          ) : templates.length ? (
            <div className="overflow-x-auto pb-1">
              <div className="grid min-w-min grid-flow-col grid-rows-2 gap-3 auto-cols-[minmax(9.5rem,1fr)] sm:auto-cols-[minmax(11rem,1fr)] lg:auto-cols-[minmax(13rem,1fr)] xl:auto-cols-[minmax(15rem,1fr)]">
                {templates.map((template) => (
                  <StudioVideoCard key={template.id} template={template} />
                ))}
              </div>
            </div>
          ) : (
            <div className="flex min-h-52 flex-col items-center justify-center rounded-2xl bg-zinc-50 px-5 text-center">
              <Video className="mb-3 h-6 w-6 text-violet-600" />
              <p className="font-semibold">Видео-шаблоны скоро появятся</p>
              <p className="mt-1 text-sm text-muted">Откройте Студию, чтобы посмотреть все сценарии генерации видео.</p>
              <Link href="/ai" className="mt-4 text-sm font-semibold text-accent hover:underline">Перейти в Студию</Link>
            </div>
          )}
        </div>
      </section>

      <div className="grid gap-6 2xl:grid-cols-[minmax(0,1.45fr)_minmax(22rem,0.8fr)]">
        <section className="rounded-3xl border border-border bg-surface">
          <div className="flex items-center justify-between gap-3 border-b border-border px-5 py-4 sm:px-6">
            <div>
              <h2 className="font-semibold">Ближайшие публикации</h2>
              <p className="mt-1 text-sm text-muted">Календарь остаётся техническим представлением вашего хода.</p>
            </div>
            <Link href="/calendar" className="text-sm font-semibold text-accent hover:underline">К календарю</Link>
          </div>
          <div className="divide-y divide-border">
            {upcomingPosts.length ? upcomingPosts.map((post) => (
              <Link key={post.id} href={`/posts/${post.id}`} className="flex items-center gap-4 px-5 py-4 transition hover:bg-zinc-50 sm:px-6">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-50 text-violet-700">
                  <PenSquare className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">{post.content.title || post.content.text || "Публикация без текста"}</p>
                  <p className="mt-1 text-xs text-muted">{formatDate(post.due_at)} · {post.targets.length || 0} кан.</p>
                </div>
                <span className="hidden rounded-full bg-zinc-100 px-2.5 py-1 text-xs font-medium text-zinc-600 sm:block">{STATUS_LABEL[post.status]}</span>
              </Link>
            )) : (
              <div className="px-5 py-12 text-center sm:px-6">
                <CalendarDays className="mx-auto mb-3 h-6 w-6 text-zinc-400" />
                <p className="font-semibold">Публикаций пока нет</p>
                <Link href="/posts/new" className="mt-2 inline-block text-sm font-semibold text-accent hover:underline">Создать первую публикацию</Link>
              </div>
            )}
          </div>
        </section>

        <aside className="rounded-3xl border border-border bg-surface p-5 sm:p-6">
          <h2 className="font-semibold">Требует внимания</h2>
          <p className="mt-1 text-sm text-muted">Сигналы, которые лучше разобрать до запуска.</p>
          <div className="mt-5 space-y-3">
            {reconnectChannels > 0 ? (
              <Link href="/channels" className="flex gap-3 rounded-2xl bg-amber-50 p-3 text-sm transition hover:bg-amber-100">
                <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0 text-amber-700" />
                <span><b className="text-amber-950">{reconnectChannels} канал(а) требуют переподключения.</b><br /><span className="text-amber-800">Проверьте доступ до следующей публикации.</span></span>
              </Link>
            ) : null}
            {failedPosts > 0 ? (
              <Link href="/posts?status=failed" className="flex gap-3 rounded-2xl bg-red-50 p-3 text-sm transition hover:bg-red-100">
                <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0 text-red-700" />
                <span><b className="text-red-950">{failedPosts} публикаций завершились с ошибкой.</b><br /><span className="text-red-800">Откройте пост, чтобы повторить отправку.</span></span>
              </Link>
            ) : null}
            {approvalPosts > 0 ? (
              <Link href="/posts?status=pending_approval" className="flex gap-3 rounded-2xl bg-emerald-50 p-3 text-sm transition hover:bg-emerald-100">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-700" />
                <span><b className="text-emerald-950">{approvalPosts} материалов ждут решения.</b><br /><span className="text-emerald-800">Согласуйте их перед публикацией.</span></span>
              </Link>
            ) : null}
            {!reconnectChannels && !failedPosts && !approvalPosts ? (
              <div className="rounded-2xl bg-emerald-50 p-4 text-sm text-emerald-900">
                <CheckCircle2 className="mb-2 h-5 w-5 text-emerald-700" />
                Всё под контролем. Создайте новый материал в Студии или подготовьте публикацию.
              </div>
            ) : null}
          </div>
        </aside>
      </div>
    </div>
  );
}
