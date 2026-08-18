"use client";

import { useRef, useState } from "react";
import { Camera, Trash2 } from "lucide-react";
import { ApiError, deleteUserAvatar, uploadUserAvatar, type User } from "@/lib/api";
import { userAvatarSrc } from "@/lib/user-avatar";
import { useAuth } from "@/context/AuthContext";
import { cn } from "@/lib/utils";

function initialsFromUser(user: User) {
  return (user.name || user.email)
    .split(/[\s@]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

export function UserAvatarEditor() {
  const { user, refreshAuth } = useAuth();
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cacheKey, setCacheKey] = useState(0);

  const avatarSrc = userAvatarSrc(user, cacheKey);
  const initials = initialsFromUser(user) || "?";

  async function handleFileChange(file: File | null) {
    if (!file) return;
    setUploading(true);
    setError(null);
    try {
      await uploadUserAvatar(file);
      await refreshAuth();
      setCacheKey(Date.now());
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Не удалось загрузить аватар");
    } finally {
      setUploading(false);
      if (inputRef.current) {
        inputRef.current.value = "";
      }
    }
  }

  async function handleRemove() {
    if (!user.avatar_url) return;
    setUploading(true);
    setError(null);
    try {
      await deleteUserAvatar();
      await refreshAuth();
      setCacheKey(Date.now());
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Не удалось удалить аватар");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-4">
        <div className="relative">
          {avatarSrc ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={avatarSrc}
              alt=""
              className="h-20 w-20 rounded-full border border-border object-cover"
            />
          ) : (
            <div className="flex h-20 w-20 items-center justify-center rounded-full border border-border bg-zinc-100 text-lg font-semibold text-text">
              {initials}
            </div>
          )}
          <button
            type="button"
            disabled={uploading}
            onClick={() => inputRef.current?.click()}
            className={cn(
              "absolute -bottom-1 -right-1 rounded-full border border-border bg-surface p-2 text-muted shadow-sm transition-colors hover:text-text",
              uploading && "pointer-events-none opacity-60",
            )}
            aria-label="Загрузить аватар"
          >
            <Camera className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-2">
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={uploading}
              onClick={() => inputRef.current?.click()}
              className="rounded-md border border-border px-3 py-1.5 text-sm hover:bg-bg disabled:opacity-60"
            >
              {uploading ? "Загрузка…" : "Загрузить фото"}
            </button>
            {user.avatar_url && (
              <button
                type="button"
                disabled={uploading}
                onClick={() => void handleRemove()}
                className="inline-flex items-center gap-1 rounded-md border border-border px-3 py-1.5 text-sm text-red-700 hover:bg-red-50 disabled:opacity-60"
              >
                <Trash2 className="h-3.5 w-3.5" />
                Удалить
              </button>
            )}
          </div>
          <p className="text-xs text-muted">JPG, PNG или WebP, до 5 МБ.</p>
        </div>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={(event) => void handleFileChange(event.target.files?.[0] ?? null)}
      />

      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}
