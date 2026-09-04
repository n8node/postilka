"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { LayoutGrid, Sparkles } from "lucide-react";
import { GenerationNavIcon } from "@/components/generation/GenerationNavIcon";
import { fetchGenerationNav, type GenerationNavView } from "@/lib/api";
import { cn } from "@/lib/utils";

function plateIsActive(pathname: string, search: string, href: string) {
  try {
    const target = new URL(href, "http://local");
    const current = new URL(`${pathname}${search}`, "http://local");
    if (target.pathname !== current.pathname) return false;
    if (target.pathname !== "/ai") {
      return target.search === current.search;
    }
    const tab = (raw: URLSearchParams) => raw.get("tab") || "studio";
    if (tab(target.searchParams) !== tab(current.searchParams)) return false;
    return (target.searchParams.get("section") || "") === (current.searchParams.get("section") || "");
  } catch {
    return pathname === href;
  }
}

export function GenerationNavBlock({ collapsed }: { collapsed: boolean }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const search = searchParams.toString() ? `?${searchParams.toString()}` : "";
  const [nav, setNav] = useState<GenerationNavView | null>(null);

  useEffect(() => {
    let cancelled = false;
    void fetchGenerationNav()
      .then((data) => {
        if (!cancelled) setNav(data);
      })
      .catch(() => {
        if (!cancelled) {
          setNav({
            settings: { title: "Генерация", studio_href: "/ai", more_href: "/ai", preview_limit: 8 },
            items: [],
          });
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const settings = nav?.settings;
  const items = nav?.items ?? [];
  const limit = Math.max(1, settings?.preview_limit ?? 8);
  const preview = items.slice(0, limit);
  const moreCount = Math.max(0, items.length - preview.length);
  const studioHref = settings?.studio_href || "/ai";
  const moreHref = settings?.more_href || "/ai";
  const title = settings?.title || "Генерация";

  if (collapsed) {
    if (!nav || items.length === 0) {
      return (
        <Link
          href={studioHref}
          title={title}
          className={cn(
            "flex items-center justify-center rounded-md px-2 py-2 text-sm transition-colors",
            plateIsActive(pathname, search, studioHref)
              ? "bg-zinc-100 font-medium text-text"
              : "text-muted hover:bg-zinc-50 hover:text-text",
          )}
        >
          <Sparkles className="h-4 w-4 shrink-0" />
        </Link>
      );
    }

    return (
      <div className="mb-1 rounded-lg border border-border bg-zinc-50/80 p-1 shadow-sm">
        <Link
          href={studioHref}
          title={title}
          aria-label={title}
          className="mb-1 flex h-6 items-center justify-center rounded-md text-muted hover:bg-white hover:text-text"
        >
          <Sparkles className="h-3.5 w-3.5" />
        </Link>
        <div className="grid grid-cols-2 gap-1">
          {preview.map((item) => {
            const active = plateIsActive(pathname, search, item.href);
            return (
              <Link
                key={item.id}
                href={item.href}
                title={item.subtitle ? `${item.title} — ${item.subtitle}` : item.title}
                aria-label={item.title}
                className={cn(
                  "flex h-8 items-center justify-center rounded-md transition-colors",
                  item.featured
                    ? "bg-accent text-white hover:bg-accent/90"
                    : active
                      ? "bg-white text-text shadow-sm ring-1 ring-border"
                      : "bg-white/80 text-muted hover:bg-white hover:text-text",
                )}
              >
                <GenerationNavIcon
                  item={item}
                  className={
                    item.featured ? "text-white" : active ? "text-text" : "text-muted"
                  }
                />
              </Link>
            );
          })}
        </div>
        {moreCount > 0 ? (
          <Link
            href={moreHref}
            title={`Все инструменты · ещё ${moreCount}`}
            aria-label={`Все инструменты, ещё ${moreCount}`}
            className="mt-1 flex h-7 items-center justify-center rounded-md text-muted hover:bg-white hover:text-text"
          >
            <LayoutGrid className="h-3.5 w-3.5" />
          </Link>
        ) : null}
      </div>
    );
  }

  if (!nav || items.length === 0) {
    return (
      <Link
        href={studioHref}
        className={cn(
          "flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm transition-colors",
          plateIsActive(pathname, search, studioHref)
            ? "bg-zinc-100 font-medium text-text"
            : "text-muted hover:bg-zinc-50 hover:text-text",
        )}
      >
        <Sparkles className="h-4 w-4 shrink-0" />
        <span className="truncate">{title}</span>
      </Link>
    );
  }

  return (
    <div className="mb-1 rounded-lg border border-border bg-zinc-50/70 p-2">
      <div className="mb-2 flex items-center justify-between gap-2 px-0.5">
        <p className="truncate text-[11px] font-semibold uppercase tracking-[0.04em] text-muted">
          {title}
        </p>
        <Link
          href={studioHref}
          className="shrink-0 text-[11px] font-medium text-accent hover:underline"
        >
          Студия
        </Link>
      </div>
      <div className="grid grid-cols-2 gap-1.5">
        {preview.map((item) => {
          const active = plateIsActive(pathname, search, item.href);
          return (
            <Link
              key={item.id}
              href={item.href}
              title={item.subtitle ? `${item.title} — ${item.subtitle}` : item.title}
              className={cn(
                "flex min-w-0 flex-col gap-0.5 rounded-md px-2 py-1.5 transition-colors",
                item.featured
                  ? "bg-accent text-white hover:bg-accent/90"
                  : active
                    ? "bg-white font-medium text-text shadow-sm ring-1 ring-border"
                    : "bg-white/80 text-text hover:bg-white",
              )}
            >
              <GenerationNavIcon
                item={item}
                className={item.featured ? "text-white" : "text-muted"}
              />
              <span className="truncate text-[12px] font-semibold leading-tight">{item.title}</span>
              {item.subtitle ? (
                <span
                  className={cn(
                    "truncate text-[10px] leading-tight",
                    item.featured ? "text-white/80" : "text-muted",
                  )}
                >
                  {item.subtitle}
                </span>
              ) : null}
            </Link>
          );
        })}
      </div>
      {moreCount > 0 ? (
        <Link
          href={moreHref}
          className="mt-1.5 flex items-center justify-center gap-1.5 rounded-md px-2 py-1.5 text-[11px] font-medium text-muted hover:bg-white hover:text-text"
        >
          <LayoutGrid className="h-3 w-3" />
          Все инструменты
          <span className="text-muted">+ ещё {moreCount}</span>
        </Link>
      ) : null}
    </div>
  );
}
