"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { CircleHelp, Search, X } from "lucide-react";
import {
  fetchHelpArticle,
  fetchHelpArticleByRoute,
  fetchHelpCatalog,
  type HelpArticle,
  type HelpArticleSummary,
} from "@/lib/api";
import { helpRouteFromPath, helpRouteLabel } from "@/lib/help";
import { HelpArticleBody } from "@/components/help/HelpArticleBody";

export function HelpLauncher() {
  const pathname = usePathname();
  const router = useRouter();
  const params = useSearchParams();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (params.get("help") !== "1") return;
    setOpen(true);
    const next = new URLSearchParams(params.toString());
    next.delete("help");
    const query = next.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  }, [params, pathname, router]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-xl p-2 text-muted transition-colors hover:bg-zinc-100 hover:text-text"
        aria-label="Справка по разделу"
        title="Справка по разделу"
      >
        <CircleHelp className="h-5 w-5" />
      </button>
      {open ? <HelpDrawer onClose={() => setOpen(false)} /> : null}
    </>
  );
}

function HelpDrawer({ onClose }: { onClose: () => void }) {
  const pathname = usePathname();
  const routeKey = helpRouteFromPath(pathname);
  const [article, setArticle] = useState<HelpArticle | null>(null);
  const [catalog, setCatalog] = useState<HelpArticleSummary[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    Promise.all([fetchHelpArticleByRoute(routeKey), fetchHelpCatalog()])
      .then(([page, list]) => {
        if (cancelled) return;
        setArticle(page.article);
        setCatalog(list.articles || []);
      })
      .catch(() => {
        if (!cancelled) {
          setArticle(null);
          setCatalog([]);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [routeKey]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return catalog;
    return catalog.filter(
      (item) =>
        item.title.toLowerCase().includes(q) ||
        item.excerpt.toLowerCase().includes(q) ||
        helpRouteLabel(item.route_key).toLowerCase().includes(q),
    );
  }, [catalog, query]);

  const openArticle = async (id: string) => {
    setLoading(true);
    try {
      const next = await fetchHelpArticle(id);
      setArticle(next);
    } finally {
      setLoading(false);
    }
  };

  const panel = (
    <div className="fixed inset-0 z-[200] flex justify-end" role="dialog" aria-modal="true">
      <button
        type="button"
        className="absolute inset-0 bg-zinc-950/50"
        aria-label="Закрыть справку"
        onClick={onClose}
      />
      <aside className="relative z-10 flex h-dvh w-full shrink-0 flex-col overflow-hidden border-l border-zinc-200 bg-white shadow-2xl isolate dark:border-zinc-800 dark:bg-zinc-900 md:w-[40vw] md:min-w-[22rem] md:max-w-[44rem]">
        <header className="flex shrink-0 items-start justify-between gap-3 border-b border-zinc-200 bg-white px-5 py-4 dark:border-zinc-800 dark:bg-zinc-900">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
              Справка
            </p>
            <h2 className="mt-0.5 text-base font-semibold text-zinc-900 dark:text-zinc-100">
              {article?.title || helpRouteLabel(routeKey)}
            </h2>
            <p className="text-xs text-zinc-500">
              Раздел: {helpRouteLabel(article?.route_key || routeKey)}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 dark:hover:bg-zinc-800"
            aria-label="Закрыть"
          >
            <X className="h-4 w-4" />
          </button>
        </header>

        <div className="shrink-0 border-b border-zinc-200 bg-white px-5 py-3 dark:border-zinc-800 dark:bg-zinc-900">
          <label className="flex items-center gap-2 rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800/60">
            <Search className="h-4 w-4 shrink-0 text-zinc-400" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Поиск по справке"
              className="w-full bg-transparent text-sm outline-none"
            />
          </label>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto bg-white px-5 py-4 dark:bg-zinc-900">
          {loading ? (
            <p className="text-sm text-zinc-500">Загрузка…</p>
          ) : article && article.body_html.trim() ? (
            <HelpArticleBody html={article.body_html} />
          ) : (
            <div className="rounded-2xl border border-dashed border-zinc-200 px-4 py-8 text-sm text-zinc-600 dark:border-zinc-700">
              <p>Для этого раздела справки пока нет.</p>
              <Link
                href="/support"
                onClick={onClose}
                className="mt-3 inline-flex text-sm font-medium text-indigo-600 hover:underline"
              >
                Написать в поддержку
              </Link>
            </div>
          )}

          {filtered.length > 0 ? (
            <div className="mt-8">
              <h3 className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
                Другие разделы
              </h3>
              <ul className="mt-2 space-y-1">
                {filtered.map((item) => (
                  <li key={item.id}>
                    <button
                      type="button"
                      onClick={() => void openArticle(item.id)}
                      className={`w-full rounded-xl px-3 py-2 text-left text-sm hover:bg-zinc-50 dark:hover:bg-zinc-800 ${
                        article?.id === item.id
                          ? "bg-indigo-50 text-indigo-800 dark:bg-indigo-950/40 dark:text-indigo-200"
                          : "text-zinc-700 dark:text-zinc-300"
                      }`}
                    >
                      <span className="block font-medium">{item.title}</span>
                      <span className="block text-[11px] text-zinc-400">
                        {helpRouteLabel(item.route_key)}
                        {item.excerpt ? ` · ${item.excerpt}` : ""}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>

        <footer className="shrink-0 border-t border-zinc-200 bg-white px-5 py-3 text-sm dark:border-zinc-800 dark:bg-zinc-900">
          <Link
            href="/support"
            onClick={onClose}
            className="font-medium text-indigo-600 hover:underline"
          >
            Не нашли ответ? Написать в поддержку
          </Link>
        </footer>
      </aside>
    </div>
  );

  if (!mounted) return null;
  return createPortal(panel, document.body);
}
