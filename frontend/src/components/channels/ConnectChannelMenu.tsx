"use client";

import { ChevronDown, Loader2 } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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

export type ConnectProviderKey = ChannelProvider | "telegram_business";

export type ConnectProviderItem = {
  key: ConnectProviderKey;
  label: string;
  plateLabel: string;
  logoUrl?: string;
};

export function connectProviderLogoKey(key: ConnectProviderKey): ChannelProvider {
  return key === "telegram_business" ? "telegram" : key;
}

export function buildEnabledConnectProviders(
  info: ChannelProviderInfo | null,
): ConnectProviderItem[] {
  const enabled: ConnectProviderItem[] = [];
  if (info?.telegram_enabled) {
    enabled.push({
      key: "telegram",
      label: "Telegram",
      plateLabel: "Telegram",
      logoUrl: info.telegram_logo_url,
    });
  }
  if (info?.telegram_business_stories_enabled) {
    enabled.push({
      key: "telegram_business",
      label: "Telegram Business (Stories)",
      plateLabel: "Telegram Business",
      logoUrl: info.telegram_business_logo_url || info.telegram_logo_url,
    });
  }
  for (const p of info?.providers ?? []) {
    if (p.enabled) {
      enabled.push({
        key: p.provider as ChannelProvider,
        label: p.label,
        plateLabel: p.label,
        logoUrl: p.logo_url,
      });
    }
  }
  if (info?.photochka_enabled !== false) {
    enabled.push({
      key: "photochka",
      label: "Photochka",
      plateLabel: "Photochka",
      logoUrl: info?.photochka_logo_url,
    });
  }
  if (info?.wordpress_enabled !== false) {
    enabled.push({
      key: "wordpress",
      label: "WordPress",
      plateLabel: "WordPress",
      logoUrl: info?.wordpress_logo_url,
    });
  }
  return enabled;
}

export function countConnectedChannels(
  key: ConnectProviderKey,
  channels: ChannelListItem[],
): number {
  if (key === "telegram_business") {
    return channels.filter((c) => c.provider === "telegram" && c.chat_type === "business").length;
  }
  if (key === "telegram") {
    return channels.filter((c) => c.provider === "telegram" && c.chat_type !== "business").length;
  }
  return channels.filter((c) => c.provider === key).length;
}

export function useConnectChannelFlow(onConnected: (connected?: ChannelListItem[]) => void) {
  const [providerInfo, setProviderInfo] = useState<ChannelProviderInfo | null>(null);
  const [infoLoading, setInfoLoading] = useState(true);
  const [activeProvider, setActiveProvider] = useState<ConnectProviderKey | null>(null);

  useEffect(() => {
    fetchChannelProviderInfo()
      .then(setProviderInfo)
      .catch(() => {})
      .finally(() => setInfoLoading(false));
  }, []);

  const enabledProviders = useMemo(
    () => buildEnabledConnectProviders(providerInfo),
    [providerInfo],
  );

  const pickProvider = useCallback((key: ConnectProviderKey) => {
    setActiveProvider(key);
  }, []);

  const handleConnected = useCallback(
    (connected?: ChannelListItem[]) => {
      setActiveProvider(null);
      onConnected(connected);
    },
    [onConnected],
  );

  return {
    enabledProviders,
    infoLoading,
    pickProvider,
    dialogs: (
      <ConnectChannelDialogs
        activeProvider={activeProvider}
        onClose={() => setActiveProvider(null)}
        onConnected={handleConnected}
        onConnectTelegram={() => setActiveProvider("telegram")}
      />
    ),
  };
}

function ConnectChannelDialogs({
  activeProvider,
  onClose,
  onConnected,
  onConnectTelegram,
}: {
  activeProvider: ConnectProviderKey | null;
  onClose: () => void;
  onConnected: (connected?: ChannelListItem[]) => void;
  onConnectTelegram: () => void;
}) {
  return (
    <>
      <ConnectTelegramDialog
        open={activeProvider === "telegram"}
        onClose={onClose}
        onConnected={onConnected}
      />

      <ConnectTelegramBusinessDialog
        open={activeProvider === "telegram_business"}
        onClose={onClose}
        onConnected={onConnected}
      />

      {activeProvider === "max" && (
        <ConnectMAXDialog open onClose={onClose} onConnected={onConnected} />
      )}

      {activeProvider === "vk" && (
        <ConnectVKDialog open onClose={onClose} onConnected={onConnected} />
      )}

      {activeProvider === "dzen" && (
        <ConnectDzenDialog open onClose={onClose} onConnectTelegram={onConnectTelegram} />
      )}

      {activeProvider === "rutube" && (
        <ConnectOAuthProviderDialog
          open
          provider="rutube"
          label={PROVIDER_LABELS.rutube ?? "Rutube"}
          onClose={onClose}
          onConnected={onConnected}
        />
      )}

      {activeProvider === "youtube" && (
        <ConnectYouTubeDialog open onClose={onClose} onConnected={onConnected} />
      )}

      <ConnectPhotochkaDialog
        open={activeProvider === "photochka"}
        onClose={onClose}
        onConnected={onConnected}
      />

      <ConnectWordPressDialog
        open={activeProvider === "wordpress"}
        onClose={onClose}
        onConnected={onConnected}
      />
    </>
  );
}

type ConnectChannelMenuProps = {
  providers: ConnectProviderItem[];
  onPick: (key: ConnectProviderKey) => void;
};

export function ConnectChannelMenu({ providers, onPick }: ConnectChannelMenuProps) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  return (
    <div className="relative" ref={menuRef}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        disabled={providers.length === 0}
        className="inline-flex items-center gap-1.5 rounded-md bg-accent px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
      >
        Подключить канал
        <ChevronDown className={cn("h-4 w-4 transition-transform", open && "rotate-180")} />
      </button>

      {open && providers.length > 0 && (
        <ul className="absolute right-0 z-20 mt-1 min-w-[220px] overflow-hidden rounded-lg border border-border bg-surface py-1 shadow-lg">
          {providers.map((item) => (
            <li key={item.key}>
              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  onPick(item.key);
                }}
                className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm hover:bg-zinc-50"
              >
                <ProviderLogoMark
                  provider={connectProviderLogoKey(item.key)}
                  logoUrl={item.logoUrl}
                />
                <span>{item.label}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
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
