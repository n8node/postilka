"use client";

import { ChevronDown, Loader2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import {
  fetchChannelProviderInfo,
  type ChannelListItem,
  type ChannelProvider,
  type ChannelProviderInfo,
} from "@/lib/api";
import { cn } from "@/lib/utils";
import { ConnectTelegramDialog } from "./ConnectTelegramDialog";
import { ConnectOAuthProviderDialog } from "./ConnectOAuthProviderDialog";
import { ConnectVKDialog } from "./ConnectVKDialog";
import { ConnectMAXDialog } from "./ConnectMAXDialog";
import { ConnectDzenDialog } from "./ConnectDzenDialog";
import { ConnectYouTubeDialog } from "./ConnectYouTubeDialog";
import { ConnectTelegramBusinessDialog } from "./ConnectTelegramBusinessDialog";
import { ConnectPhotochkaDialog } from "./ConnectPhotochkaDialog";
import { ConnectWordPressDialog } from "./ConnectWordPressDialog";
import { ProviderLogoMark } from "./ProviderLogoMark";

const PROVIDER_LABELS: Partial<Record<ChannelProvider, string>> = {
  telegram: "Telegram",
  vk: "VK",
  max: "MAX",
  rutube: "Rutube",
  dzen: "Дзен",
  youtube: "YouTube",
  photochka: "Photochka",
  wordpress: "WordPress",
};

type ConnectMenuItem = {
  key: ChannelProvider | "telegram_business";
  label: string;
  logoUrl?: string;
};

type ConnectChannelMenuProps = {
  onConnected: (connected?: ChannelListItem[]) => void;
};

export function ConnectChannelMenu({ onConnected }: ConnectChannelMenuProps) {
  const [open, setOpen] = useState(false);
  const [providerInfo, setProviderInfo] = useState<ChannelProviderInfo | null>(null);
  const [activeProvider, setActiveProvider] = useState<ChannelProvider | "telegram_business" | null>(
    null,
  );
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

  const enabledProviders: ConnectMenuItem[] = [];
  if (providerInfo?.telegram_enabled) {
    enabledProviders.push({
      key: "telegram",
      label: "Telegram",
      logoUrl: providerInfo.telegram_logo_url,
    });
  }
  if (providerInfo?.telegram_business_stories_enabled) {
    enabledProviders.push({
      key: "telegram_business",
      label: "Telegram Business (Stories)",
      logoUrl: providerInfo.telegram_business_logo_url || providerInfo.telegram_logo_url,
    });
  }
  for (const p of providerInfo?.providers ?? []) {
    if (p.enabled) {
      enabledProviders.push({
        key: p.provider as ChannelProvider,
        label: p.label,
        logoUrl: p.logo_url,
      });
    }
  }
  if (providerInfo?.photochka_enabled !== false) {
    enabledProviders.push({
      key: "photochka",
      label: "Photochka",
      logoUrl: providerInfo?.photochka_logo_url,
    });
  }
  if (providerInfo?.wordpress_enabled !== false) {
    enabledProviders.push({
      key: "wordpress",
      label: "WordPress",
      logoUrl: providerInfo?.wordpress_logo_url,
    });
  }

  function pickProvider(key: ChannelProvider | "telegram_business") {
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
          <ul className="absolute right-0 z-20 mt-1 min-w-[220px] overflow-hidden rounded-lg border border-border bg-surface py-1 shadow-lg">
            {enabledProviders.map((item) => (
              <li key={item.key}>
                <button
                  type="button"
                  onClick={() => pickProvider(item.key)}
                  className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm hover:bg-zinc-50"
                >
                  <ProviderLogoMark
                    provider={item.key === "telegram_business" ? "telegram" : item.key}
                    logoUrl={item.logoUrl}
                  />
                  <span>{item.label}</span>
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

      <ConnectTelegramBusinessDialog
        open={activeProvider === "telegram_business"}
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

      {activeProvider === "rutube" && (
        <ConnectOAuthProviderDialog
          open
          provider="rutube"
          label={PROVIDER_LABELS.rutube ?? "Rutube"}
          onClose={() => setActiveProvider(null)}
          onConnected={handleConnected}
        />
      )}

      {activeProvider === "youtube" && (
        <ConnectYouTubeDialog
          open
          onClose={() => setActiveProvider(null)}
          onConnected={handleConnected}
        />
      )}

      <ConnectPhotochkaDialog
        open={activeProvider === "photochka"}
        onClose={() => setActiveProvider(null)}
        onConnected={handleConnected}
      />

      <ConnectWordPressDialog
        open={activeProvider === "wordpress"}
        onClose={() => setActiveProvider(null)}
        onConnected={handleConnected}
      />
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
