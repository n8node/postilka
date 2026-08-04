export function StubBadge({ label = "Скоро" }: { label?: string }) {
  return (
    <span className="inline-flex items-center rounded-md bg-zinc-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-muted">
      {label}
    </span>
  );
}
