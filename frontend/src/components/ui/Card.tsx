import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type CardProps = {
  children: ReactNode;
  className?: string;
  hover?: boolean;
  padding?: boolean;
};

export function Card({
  children,
  className,
  hover = false,
  padding = true,
}: CardProps) {
  return (
    <div
      className={cn(
        "rounded-xl border border-border bg-surface shadow-sm transition-colors",
        hover && "hover:border-zinc-300",
        padding && "p-4 sm:p-[18px]",
        className,
      )}
    >
      {children}
    </div>
  );
}
