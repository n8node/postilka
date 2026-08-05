"use client";

import { useEffect, useState } from "react";
import { fetchAuthMethods } from "@/lib/api";

type SocialLoginButtonsProps = {
  nextPath?: string;
  mode?: "login" | "link";
};

function oauthStartURL(provider: "vk" | "max", mode: string, nextPath: string) {
  const params = new URLSearchParams({ next: nextPath });
  const path =
    mode === "link"
      ? `/app/api/v1/auth/oauth/${provider}/link?${params.toString()}`
      : `/app/api/v1/auth/oauth/${provider}/start?${params.toString()}`;
  return path;
}

export function SocialLoginButtons({
  nextPath = "/dashboard",
  mode = "login",
}: SocialLoginButtonsProps) {
  const [vkEnabled, setVkEnabled] = useState(false);
  const [maxEnabled, setMaxEnabled] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAuthMethods()
      .then((data) => {
        setVkEnabled(Boolean(data.vk_login_enabled));
        setMaxEnabled(Boolean(data.max_login_enabled));
      })
      .catch(() => {
        setVkEnabled(false);
        setMaxEnabled(false);
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading || (!vkEnabled && !maxEnabled)) {
    return null;
  }

  async function handleMAX() {
    window.location.href = oauthStartURL("max", mode, nextPath);
  }

  function handleVK() {
    if (mode === "login") {
      window.location.href = oauthStartURL("vk", mode, nextPath);
      return;
    }
    window.location.href = oauthStartURL("vk", mode, nextPath);
  }

  return (
    <div className="space-y-3">
      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t border-slate-200" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-surface px-2 text-muted">или</span>
        </div>
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        {vkEnabled && (
          <button
            type="button"
            onClick={handleVK}
            className="flex items-center justify-center gap-2 rounded-lg border border-[#0077FF]/30 bg-[#0077FF]/5 px-4 py-2.5 text-sm font-medium text-[#0077FF] hover:bg-[#0077FF]/10"
          >
            ВКонтакте
          </button>
        )}
        {maxEnabled && (
          <button
            type="button"
            onClick={() => void handleMAX()}
            className="flex items-center justify-center gap-2 rounded-lg border border-violet-300 bg-violet-50 px-4 py-2.5 text-sm font-medium text-violet-700 hover:bg-violet-100"
          >
            MAX
          </button>
        )}
      </div>
    </div>
  );
}
