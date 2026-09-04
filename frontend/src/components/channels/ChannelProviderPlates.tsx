"use client";

import type { ChannelListItem } from "@/lib/api";
import { cn } from "@/lib/utils";
import {
  type ConnectProviderItem,
  type ConnectProviderKey,
  connectProviderLogoKey,
  countConnectedChannels,
} from "./ConnectChannelMenu";
import { PROVIDER_BRAND_COLOR } from "./ProviderIcon";
import { ProviderLogoMark } from "./ProviderLogoMark";

function connectedCaption(n: number) {
  if (n <= 0) return "Подключить";
  if (n === 1) return "Подключён";
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return `${n} подключён`;
  return `${n} подключено`;
}

function brandTint(key: ConnectProviderKey) {
  const color = PROVIDER_BRAND_COLOR[connectProviderLogoKey(key)] ?? "#71717A";
  return `${color}14`;
}

export function ChannelProviderPlates({
  items,
  channels,
  loading,
  onPick,
}: {
  items: ConnectProviderItem[];
  channels: ChannelListItem[];
  loading?: boolean;
  onPick: (key: ConnectProviderKey) => void;
}) {
  if (loading && items.length === 0) {
    return (
      <section className="mb-5" aria-hidden>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="h-[4.25rem] animate-pulse rounded-xl border border-border bg-zinc-50"
            />
          ))}
        </div>
      </section>
    );
  }

  if (items.length === 0) return null;

  return (
    <section className="mb-5" aria-label="Доступные соцсети">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6">
        {items.map((item) => {
          const count = countConnectedChannels(item.key, channels);
          const connected = count > 0;
          const provider = connectProviderLogoKey(item.key);
          return (
            <button
              key={item.key}
              type="button"
              onClick={() => onPick(item.key)}
              aria-label={
                connected
                  ? `${item.plateLabel}, ${connectedCaption(count)}. Подключить ещё`
                  : `Подключить ${item.plateLabel}`
              }
              className={cn(
                "group flex items-center gap-3 rounded-xl border bg-surface px-3.5 py-3 text-left shadow-sm transition",
                "hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40",
                connected
                  ? "border-emerald-200 hover:border-emerald-300"
                  : "border-border hover:border-accent/40",
              )}
            >
              <span
                className="inline-flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-xl ring-1 ring-black/5"
                style={{ backgroundColor: brandTint(item.key) }}
              >
                <ProviderLogoMark
                  provider={provider}
                  logoUrl={item.logoUrl}
                  contain
                  className="h-11 w-11 rounded-xl bg-transparent ring-0"
                  iconClassName="h-6 w-6"
                />
              </span>
              <span className="min-w-0">
                <span className="block truncate text-sm font-semibold text-text">
                  {item.plateLabel}
                </span>
                <span
                  className={cn(
                    "mt-0.5 block truncate text-xs",
                    connected ? "font-medium text-emerald-700" : "text-muted",
                  )}
                >
                  {connectedCaption(count)}
                </span>
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
