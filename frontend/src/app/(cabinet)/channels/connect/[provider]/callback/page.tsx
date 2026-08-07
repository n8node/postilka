"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { ConnectOAuthProviderDialog } from "@/components/channels/ConnectOAuthProviderDialog";
import { ConnectVKDialog } from "@/components/channels/ConnectVKDialog";
import type { SocialProviderKey } from "@/lib/api";

const OAUTH_PROVIDERS: SocialProviderKey[] = ["vk", "ok", "rutube", "dzen"];

const LABELS: Record<SocialProviderKey, string> = {
  vk: "VK",
  ok: "OK",
  max: "MAX",
  rutube: "Rutube",
  dzen: "Дзен",
};

export default function ChannelOAuthCallbackPage({
  params,
}: {
  params: Promise<{ provider: string }>;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [provider, setProvider] = useState<SocialProviderKey | null>(null);
  const sessionId = searchParams.get("session_id");
  const oauthError = searchParams.get("error");

  useEffect(() => {
    void params.then((p) => {
      const key = p.provider as SocialProviderKey;
      if (OAUTH_PROVIDERS.includes(key)) {
        setProvider(key);
      } else {
        router.replace("/channels");
      }
    });
  }, [params, router]);

  if (oauthError) {
    return (
      <div className="mx-auto max-w-md py-16 text-center">
        <h1 className="text-lg font-semibold text-red-700">Ошибка авторизации</h1>
        <p className="mt-2 text-sm text-muted">{oauthError}</p>
        <button
          type="button"
          onClick={() => router.push("/channels")}
          className="mt-6 rounded-md bg-accent px-4 py-2 text-sm text-white"
        >
          Вернуться к каналам
        </button>
      </div>
    );
  }

  if (!provider || !sessionId) {
    return <p className="py-16 text-center text-sm text-muted">Загрузка…</p>;
  }

  if (provider === "vk") {
    return (
      <ConnectVKDialog
        open
        initialSessionId={sessionId}
        onClose={() => router.push("/channels")}
        onConnected={() => router.push("/channels")}
      />
    );
  }

  return (
    <ConnectOAuthProviderDialog
      open
      provider={provider}
      label={LABELS[provider]}
      initialSessionId={sessionId}
      onClose={() => router.push("/channels")}
      onConnected={() => router.push("/channels")}
    />
  );
}
