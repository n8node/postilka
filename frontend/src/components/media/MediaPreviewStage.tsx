import { cn } from "@/lib/utils";

type MediaPreviewStageProps = {
  children: React.ReactNode;
  tone?: "light" | "dark";
  className?: string;
};

export function MediaPreviewStage({
  children,
  tone = "dark",
  className,
}: MediaPreviewStageProps) {
  return (
    <div
      className={cn(
        "relative flex h-[clamp(360px,calc(100vh-250px),620px)] min-h-0 w-full items-center justify-center overflow-hidden rounded-lg",
        tone === "light" ? "bg-zinc-50" : "bg-zinc-900",
        className,
      )}
    >
      {children}
    </div>
  );
}