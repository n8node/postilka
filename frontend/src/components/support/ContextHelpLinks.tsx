"use client";

import { BookOpen, MessageCircle } from "lucide-react";

type ContextHelpLinksProps = {
  helpURL?: string;
  helpLabel?: string;
  onSupportClick: () => void;
  supportLabel?: string;
};

export function ContextHelpLinks({
  helpURL,
  helpLabel = "Открыть инструкцию",
  onSupportClick,
  supportLabel = "Спросить в поддержке",
}: ContextHelpLinksProps) {
  return (
    <div className={helpURL ? "grid gap-2 sm:grid-cols-2" : "grid gap-2"}>
      {helpURL ? (
        <a
          href={helpURL}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center justify-center gap-2 rounded-lg border border-border bg-zinc-50 px-3 py-2.5 text-sm font-medium text-text transition-colors hover:bg-zinc-100"
        >
          <BookOpen className="h-4 w-4 shrink-0 text-accent" />
          <span className="text-center">{helpLabel}</span>
        </a>
      ) : null}
      <button
        type="button"
        onClick={onSupportClick}
        className="inline-flex items-center justify-center gap-2 rounded-lg border border-border bg-zinc-50 px-3 py-2.5 text-sm font-medium text-text transition-colors hover:bg-zinc-100"
      >
        <MessageCircle className="h-4 w-4 shrink-0 text-accent" />
        <span className="text-center">{supportLabel}</span>
      </button>
    </div>
  );
}
