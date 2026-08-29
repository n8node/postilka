import type { ChannelProvider } from "@/lib/api";
import { cn } from "@/lib/utils";

export const PROVIDER_LABEL: Record<ChannelProvider, string> = {
  telegram: "Telegram",
  vk: "VK",
  ok: "Одноклассники",
  max: "MAX",
  rutube: "Rutube",
  dzen: "Дзен",
  youtube: "YouTube",
  photochka: "Photochka",
  wordpress: "WordPress",
};

export function formatProviderLabel(provider: ChannelProvider, chatType?: string) {
  if (provider === "telegram" && chatType === "business") return "Telegram Business";
  return PROVIDER_LABEL[provider] ?? provider;
}

const ICON_COLOR: Record<ChannelProvider, string> = {
  telegram: "#2AABEE",
  vk: "#0077FF",
  ok: "#EE8208",
  max: "#4B55EE",
  rutube: "#100943",
  dzen: "#111111",
  youtube: "#FF0000",
  photochka: "#7C3AED",
  wordpress: "#21759B",
};

export function ProviderIcon({
  provider,
  className,
}: {
  provider: ChannelProvider;
  className?: string;
}) {
  const color = ICON_COLOR[provider] ?? "#71717A";
  return (
    <svg viewBox="0 0 24 24" className={cn("h-3.5 w-3.5 shrink-0", className)} aria-hidden>
      {provider === "telegram" ? (
        <path
          fill={color}
          d="M21.5 3.4 2.8 10.6c-1.3.5-1.3 1.2-.2 1.5l4.8 1.5 11.1-7c.5-.3.9-.1.6.2L9.6 15.4v3.6c0 .5.2.7.8.5l2.4-2.3 4.7 3.5c.9.5 1.5.2 1.7-.8L22.4 4.4c.3-1.1-.4-1.6-.9-1z"
        />
      ) : null}
      {provider === "vk" ? (
        <path
          fill={color}
          d="M12.5 18c-6.2 0-9.7-4.2-9.8-11.3h3.1c.1 5.2 2.4 7.4 4.2 7.9V6.7h2.9v4.5c1.8-.2 3.6-2.2 4.3-4.5h2.9c-.5 3.1-2.8 5.1-4.4 5.8 1.6.6 4.1 2.4 5.1 5.5h-3.2c-.8-2.4-2.7-4.3-5.1-4.5V18z"
        />
      ) : null}
      {provider === "max" ? (
        <>
          <rect width="24" height="24" rx="6" fill={color} />
          <path fill="#fff" d="M6.2 7.2h3.1l2.7 5.2 2.7-5.2h3.1v9.6h-2.5V11l-2.2 4.4h-2.2L8.7 11v5.8H6.2z" />
        </>
      ) : null}
      {provider === "youtube" ? (
        <>
          <path
            fill={color}
            d="M23 12.2s0-3.3-.4-4.8c-.2-.9-.9-1.6-1.8-1.8C18.9 5.2 12 5.2 12 5.2s-6.9 0-8.8.4c-.9.2-1.6.9-1.8 1.8C1 8.9 1 12.2 1 12.2s0 3.3.4 4.8c.2.9.9 1.6 1.8 1.8 1.9.4 8.8.4 8.8.4s6.9 0 8.8-.4c.9-.2 1.6-.9 1.8-1.8.4-1.5.4-4.8.4-4.8z"
          />
          <path fill="#fff" d="M9.8 15.5V8.9l6.2 3.3z" />
        </>
      ) : null}
      {provider === "dzen" ? (
        <>
          <circle cx="12" cy="12" r="10" fill={color} />
          <circle cx="12" cy="12" r="4.2" fill="#fff" />
        </>
      ) : null}
      {provider === "rutube" ? (
        <>
          <rect width="24" height="24" rx="5" fill={color} />
          <path fill="#fff" d="M7 7.5h4.2c2.9 0 4.7 1.6 4.7 4.1 0 2.6-1.9 4.4-4.8 4.4H7zm2.6 2.1v4.3h1.6c1.4 0 2.2-.8 2.2-2.2 0-1.3-.8-2.1-2.2-2.1z" />
        </>
      ) : null}
      {provider === "ok" ? (
        <>
          <circle cx="12" cy="8" r="3.4" fill={color} />
          <path
            fill={color}
            d="M6.6 13.2c2.1 2 4.7 2.5 5.4 2.6-.7.1-3.3.6-5.4 2.6l1.7 1.7c1.2-1.1 2.5-1.7 3.7-2v2.8h2.4V18.1c1.2.3 2.5.9 3.7 2l1.7-1.7c-2.1-2-4.7-2.5-5.4-2.6.7-.1 3.3-.6 5.4-2.6l-1.7-1.7c-1.4 1.3-3.4 2.1-5.4 2.1s-4-.8-5.4-2.1z"
          />
        </>
      ) : null}
      {provider === "photochka" ? (
        <>
          <rect width="24" height="24" rx="6" fill={color} />
          <path
            fill="#fff"
            d="M7.5 8.2h9v1.8h-3.4v6.8H10.9v-6.8H7.5zm4.8 0h4.7c1.8 0 3.1 1.2 3.1 2.9 0 1.1-.6 2-1.5 2.5l2 3.2h-2.4l-1.7-2.8h-1.2v2.8h-2.3zm2.4 1.6v1.5h2.1c.6 0 1-.4 1-.9s-.4-.9-1-.9z"
          />
        </>
      ) : null}
      {provider === "wordpress" ? (
        <>
          <circle cx="12" cy="12" r="10" fill={color} />
          <path
            fill="#fff"
            d="M12 4.6c-1.6 0-3 .5-4.1 1.5l2.2 6.1 2.1-6.3c.5-.1.9-.2 1.4-.2 2.8 0 4.8 1.9 4.8 5.1 0 .5 0 1-.1 1.5-.8-.2-1.7-.2-1.7-.2-.1 0-.2.2 0 .3 0 0 .8.1 1.3.1l1.4 4.1c.3.7.5 1.3.5 1.8C17.8 16.6 15.2 19.4 12 19.4c-1.4 0-2.6-.4-3.6-1.1l2-5.7 1.3 3.8c.1.3.2.3.4.3s.3 0 .4-.3l2.3-6.8c.2-.6.2-1.1.2-1.5 0-2.2-1.4-3.3-3.4-3.3-.8 0-1.6.3-2.1.7l-.8 2.4c-.2.6-.3 1.1-.3 1.5 0 2.2 1.4 3.3 3.4 3.3.4 0 .8 0 1.1-.1-.1.3-.2.6-.4 1.1-.6.1-1.2.2-1.8.2-3.2 0-5.3-2.1-5.3-5.3C4.6 7 7.8 4.6 12 4.6z"
          />
        </>
      ) : null}
    </svg>
  );
}
