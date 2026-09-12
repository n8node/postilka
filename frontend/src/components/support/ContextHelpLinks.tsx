"use client";

import { BookOpen } from "lucide-react";

type ContextHelpLinksProps = {
  helpURL?: string;
  helpLabel?: string;
};

export function ContextHelpLinks({
  helpURL,
  helpLabel = "Инструкция",
}: ContextHelpLinksProps) {
  if (!helpURL) return null;

  return (
    <a
      href={helpURL}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-border bg-zinc-50 px-3 py-2.5 text-sm font-medium text-text transition-colors hover:bg-zinc-100"
    >
      <BookOpen className="h-4 w-4 shrink-0 text-accent" />
      <span className="text-center">{helpLabel}</span>
    </a>
  );
}
