import { X } from "lucide-react";

/** Page-level layout: main + optional right contextual sidebar. */
export function CabinetPage({
  children,
  right,
  rightTitle,
  onCloseRight,
}: {
  children: React.ReactNode;
  right?: React.ReactNode;
  rightTitle?: string;
  onCloseRight?: () => void;
}) {
  return (
    <div
      className={
        right
          ? "grid gap-4 xl:grid-cols-[minmax(0,1fr)_20rem]"
          : "block"
      }
    >
      <div className="min-w-0">{children}</div>
      {right ? (
        <aside className="flex h-fit flex-col rounded-xl border border-border bg-surface shadow-sm xl:sticky xl:top-4">
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <h2 className="text-sm font-semibold text-text">
              {rightTitle ?? "Подробности"}
            </h2>
            {onCloseRight ? (
              <button
                type="button"
                onClick={onCloseRight}
                className="rounded-md p-1 text-muted hover:bg-zinc-100 hover:text-text"
                aria-label="Закрыть панель"
              >
                <X className="h-4 w-4" />
              </button>
            ) : null}
          </div>
          <div className="px-4 py-4 text-sm">{right}</div>
        </aside>
      ) : null}
    </div>
  );
}
