"use client";

type CalendarBulkBarProps = {
  count: number;
  busy?: boolean;
  onClear: () => void;
  onCancelSelected: () => void;
};

export function CalendarBulkBar({ count, busy, onClear, onCancelSelected }: CalendarBulkBarProps) {
  if (count === 0) return null;

  return (
    <div className="mb-3 flex flex-wrap items-center gap-2 rounded-lg border border-border bg-zinc-50 px-3 py-2 text-xs">
      <span className="font-medium">Выбрано: {count}</span>
      <button
        type="button"
        disabled={busy}
        onClick={onCancelSelected}
        className="rounded-md border border-border bg-surface px-2.5 py-1 font-medium hover:bg-white disabled:opacity-50"
      >
        Отменить выбранные
      </button>
      <button type="button" onClick={onClear} className="text-muted hover:text-text">
        Снять выбор
      </button>
      <span className="ml-auto hidden text-muted sm:inline">
        ← → период · T сегодня · Esc закрыть
      </span>
    </div>
  );
}
