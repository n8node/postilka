"use client";

import Link from "next/link";
import { ImageIcon, Video } from "lucide-react";
import { ProtectedMediaImage } from "@/components/media/ProtectedMediaImage";
import { FileThumbnail } from "@/components/files/FileThumbnail";
import type { AIUsageHistoryItem } from "@/lib/generation-api";
import { generationModeLabels, type GenerationModeId } from "@/lib/generation-data";
import { cn } from "@/lib/utils";

function formatRub(cents: number) {
  if (cents <= 0) return null;
  return new Intl.NumberFormat("ru-RU", {
    style: "currency",
    currency: "RUB",
    maximumFractionDigits: 0,
  }).format(cents / 100);
}

function formatCredits(n: number) {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return `${n} кредит`;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return `${n} кредита`;
  return `${n} кредитов`;
}

function modeLabel(mode: string) {
  return generationModeLabels[mode as GenerationModeId] ?? mode;
}

function filesLink(item: AIUsageHistoryItem) {
  const params = new URLSearchParams();
  if (item.ai_content_folder_id) params.set("folder", item.ai_content_folder_id);
  if (item.workspace_file_id) params.set("file", item.workspace_file_id);
  const qs = params.toString();
  return qs ? `/files?${qs}` : "/files";
}

type AIUsageHistoryListProps = {
  items: AIUsageHistoryItem[];
};

export function AIUsageHistoryList({ items }: AIUsageHistoryListProps) {
  if (items.length === 0) {
    return (
      <p className="mt-4 text-sm text-muted">
        Пока нет успешных AI-генераций. После первой генерации здесь появится история
        списаний, а файлы — в папке «AI контент».
      </p>
    );
  }

  return (
    <ul className="mt-4 divide-y divide-border">
      {items.map((item) => {
        const isVideo = (item.mime_type ?? "").startsWith("video/");
        const walletRub = formatRub(item.wallet_cents_charged);
        return (
          <li key={item.id} className="flex gap-4 py-4 first:pt-0">
            <div className="h-16 w-16 shrink-0 overflow-hidden rounded-lg border border-border bg-zinc-50">
              {item.workspace_file_id ? (
                <FileThumbnail
                  fileId={item.workspace_file_id}
                  name={item.prompt}
                  mimeType={item.mime_type || "image/jpeg"}
                  size="sm"
                  className="h-full w-full rounded-lg"
                />
              ) : item.preview_url ? (
                <ProtectedMediaImage
                  url={item.preview_url}
                  alt=""
                  className="h-full w-full object-cover"
                />
              ) : isVideo ? (
                <div className="flex h-full w-full items-center justify-center text-muted">
                  <Video className="h-6 w-6" />
                </div>
              ) : (
                <div className="flex h-full w-full items-center justify-center text-muted">
                  <ImageIcon className="h-6 w-6" />
                </div>
              )}
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-text">
                    {modeLabel(item.mode)}
                  </p>
                  <p className="mt-0.5 line-clamp-2 text-xs text-muted">{item.prompt || "—"}</p>
                </div>
                <div className="shrink-0 text-right text-sm">
                  <p className="font-semibold text-text">{formatCredits(item.credit_cost)}</p>
                  {walletRub ? (
                    <p className="text-xs text-amber-800">−{walletRub} с кошелька</p>
                  ) : item.quota_credits_used > 0 ? (
                    <p className="text-xs text-muted">из тарифа</p>
                  ) : null}
                </div>
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-muted">
                <time dateTime={item.created_at}>
                  {new Date(item.created_at).toLocaleString("ru-RU", {
                    day: "2-digit",
                    month: "short",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </time>
                {(item.workspace_file_id || item.ai_content_folder_id) && (
                  <Link
                    href={filesLink(item)}
                    className={cn("font-medium text-accent hover:underline")}
                  >
                    Открыть в файлах
                  </Link>
                )}
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
