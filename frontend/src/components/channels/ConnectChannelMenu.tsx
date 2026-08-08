"use client";

import { ChevronDown, Loader2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import {
  fetchChannelProviderInfo,
  type ChannelListItem,
  type ChannelProvider,
  type ChannelProviderInfo,
  type SocialProviderKey,
} from "@/lib/api";
import { cn } from "@/lib/utils";
import { ConnectTelegramDialog } from "./ConnectTelegramDialog";
import { ConnectOAuthProviderDialog } from "./ConnectOAuthProviderDialog";
import { ConnectVKDialog } from "./ConnectVKDialog";
import { ConnectMAXDialog } from "./ConnectMAXDialog";
import { ConnectDzenDialog } from "./ConnectDzenDialog";

const PROVIDER_LABELS: Record<ChannelProvider, string> = {
  telegram: "Telegram",
  vk: "VK",
  ok: "OK",
  max: "MAX",
  rutube: "Rutube",
  dzen: "Дзен",
};

type ConnectChannelMenuProps = {
  onConnected: (connected?: ChannelListItem[]) => void;
};

export function ConnectChannelMenu({ onConnected }: ConnectChannelMenuProps) {
  const [open, setOpen] = useState(false);
  const [providerInfo, setProviderInfo] = useState<ChannelProviderInfo | null>(null);
  const [activeProvider, setActiveProvider] = useState<ChannelProvider | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchChannelProviderInfo()
      .then(setProviderInfo)
      .catch(() => {});
  }, []);

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  const enabledProviders: { key: ChannelProvider; label: string }[] = [];
  if (providerInfo?.telegram_enabled) {
    enabledProviders.push({ key: "telegram", label: "Telegram" });
  }
  for (const p of providerInfo?.providers ?? []) {
    if (p.enabled) {
      enabledProviders.push({
        key: p.provider as ChannelProvider,
        label: p.label,
      });
    }
  }

  function pickProvider(key: ChannelProvider) {
    setOpen(false);
    setActiveProvider(key);
  }

  function handleConnected(connected?: ChannelListItem[]) {
    setActiveProvider(null);
    onConnected(connected);
  }

  return (
    <>
      <div className="relative" ref={menuRef}>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          disabled={enabledProviders.length === 0}
          className="inline-flex items-center gap-1.5 rounded-md bg-accent px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          Подключить канал
          <ChevronDown className={cn("h-4 w-4 transition-transform", open && "rotate-180")} />
        </button>

        {open && enabledProviders.length > 0 && (
          <ul className="absolute right-0 z-20 mt-1 min-w-[180px] overflow-hidden rounded-lg border border-border bg-surface py-1 shadow-lg">
            {enabledProviders.map((item) => (
              <li key={item.key}>
                <button
                  type="button"
                  onClick={() => pickProvider(item.key)}
                  className="block w-full px-4 py-2 text-left text-sm hover:bg-zinc-50"
                >
                  {item.label}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <ConnectTelegramDialog
        open={activeProvider === "telegram"}
        onClose={() => setActiveProvider(null)}
        onConnected={handleConnected}
      />

      {activeProvider === "max" && (
        <ConnectMAXDialog
          open
          onClose={() => setActiveProvider(null)}
          onConnected={handleConnected}
        />
      )}

      {activeProvider === "vk" && (
        <ConnectVKDialog
          open
          onClose={() => setActiveProvider(null)}
          onConnected={handleConnected}
        />
      )}

      {activeProvider === "dzen" && (
        <ConnectDzenDialog
          open
          onClose={() => setActiveProvider(null)}
          onConnectTelegram={() => setActiveProvider("telegram")}
        />
      )}

      {activeProvider && ["ok", "rutube"].includes(activeProvider) && (
        <ConnectOAuthProviderDialog
          open
          provider={activeProvider as SocialProviderKey}
          label={PROVIDER_LABELS[activeProvider]}
          onClose={() => setActiveProvider(null)}
          onConnected={handleConnected}
        />
      )}
    </>
  );
}

export function ConnectChannelMenuLoading() {
  return (
    <span className="inline-flex items-center gap-2 rounded-md bg-accent/80 px-3 py-2 text-sm text-white">
      <Loader2 className="h-4 w-4 animate-spin" />
      Загрузка…
    </span>
  );
}
