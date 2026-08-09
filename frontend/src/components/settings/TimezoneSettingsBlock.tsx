"use client";

import { FormEvent, useEffect, useState } from "react";
import {
  ApiError,
  changeTimezone,
  fetchTimezones,
  type TimezoneOption,
} from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import {
  DEFAULT_TIMEZONE,
  RUSSIA_TIMEZONES,
  normalizeTimezone,
  timezoneLabel,
} from "@/lib/russia-timezones";

export function TimezoneSettingsBlock({ embedded = false }: { embedded?: boolean }) {
  const { user, refreshAuth } = useAuth();
  const [options, setOptions] = useState<TimezoneOption[]>(RUSSIA_TIMEZONES);
  const [timezone, setTimezone] = useState(
    normalizeTimezone(user.timezone || DEFAULT_TIMEZONE),
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    setTimezone(normalizeTimezone(user.timezone || DEFAULT_TIMEZONE));
  }, [user.timezone]);

  useEffect(() => {
    fetchTimezones()
      .then((data) => {
        if (data.timezones?.length) {
          setOptions(data.timezones);
        }
      })
      .catch(() => {
        setOptions(RUSSIA_TIMEZONES);
      });
  }, []);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (timezone === normalizeTimezone(user.timezone)) return;

    setLoading(true);
    setError("");
    setSuccess("");
    try {
      const data = await changeTimezone(timezone);
      setSuccess(data.message);
      await refreshAuth();
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Не удалось сохранить таймзону",
      );
    } finally {
      setLoading(false);
    }
  }

  const form = (
    <form onSubmit={(e) => void handleSubmit(e)} className={embedded ? "space-y-4" : "mt-4 space-y-4"}>
      {error && (
        <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
          {error}
        </div>
      )}
      {success && (
        <div className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900">
          {success}
        </div>
      )}

      <div className="flex max-w-xl flex-col gap-3 sm:flex-row sm:items-center">
      <select
        value={timezone}
        onChange={(e) => setTimezone(e.target.value)}
        className="min-w-0 flex-1 rounded-md border border-border bg-bg px-3 py-2 text-sm"
      >
        {options.map((item) => (
          <option key={item.id} value={item.id}>
            {item.label}
          </option>
        ))}
      </select>

      <button
        type="submit"
        disabled={
          loading || timezone === normalizeTimezone(user.timezone)
        }
        className="shrink-0 rounded-md bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60"
      >
        {loading ? "Сохранение…" : "Сохранить"}
      </button>
      </div>
    </form>
  );

  if (embedded) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-lg font-semibold text-text">Таймзона</h2>
          <p className="mt-1 text-sm text-muted">
            Используется для отложенной публикации и расписания постов. Сейчас:{" "}
            <span className="font-medium text-text">
              {timezoneLabel(normalizeTimezone(user.timezone))}
            </span>
          </p>
        </div>
        {form}
      </div>
    );
  }

  return (
    <section className="rounded-xl border border-border bg-surface p-5 shadow-sm">
      <h2 className="text-sm font-semibold">Таймзона</h2>
      <p className="mt-1 text-sm text-muted">
        Используется для отложенной публикации и расписания постов. Сейчас:{" "}
        <span className="font-medium text-text">
          {timezoneLabel(normalizeTimezone(user.timezone))}
        </span>
      </p>
      {form}
    </section>
  );
}
