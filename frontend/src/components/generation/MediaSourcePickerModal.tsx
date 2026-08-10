"use client";

import { useEffect, useState } from "react";
import { FolderOpen, HardDriveUpload, X } from "lucide-react";
import { WorkspaceMediaPickerModal } from "@/components/generation/WorkspaceMediaPickerModal";
import type { WorkspaceFile } from "@/lib/files-api";
import type { VideoMediaKind } from "@/lib/video-generation-data";
import { cn } from "@/lib/utils";

type MediaSourcePickerModalProps = {
  open: boolean;
  title: string;
  subtitle?: string;
  mediaKind: VideoMediaKind;
  referenceVideoFilter?: boolean;
  onClose: () => void;
  onPickComputer: () => void;
  onPickDiskFile: (file: WorkspaceFile) => void;
};

export function MediaSourcePickerModal({
  open,
  title,
  subtitle,
  mediaKind,
  referenceVideoFilter = false,
  onClose,
  onPickComputer,
  onPickDiskFile,
}: MediaSourcePickerModalProps) {
  const [step, setStep] = useState<"choice" | "disk">("choice");

  useEffect(() => {
    if (open) setStep("choice");
  }, [open]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="media-source-picker-title"
      onClick={onClose}
    >
      <div
        className={cn(
          "flex w-full flex-col overflow-hidden rounded-xl border border-border bg-surface shadow-xl",
          step === "disk"
            ? "max-h-[min(88vh,720px)] max-w-2xl"
            : "max-w-md",
        )}
        onClick={(e) => e.stopPropagation()}
      >
        {step === "choice" ? (
          <>
            <div className="flex items-start justify-between gap-3 border-b border-border px-4 py-3">
              <div>
                <h2
                  id="media-source-picker-title"
                  className="text-[15px] font-semibold text-text"
                >
                  {title}
                </h2>
                {subtitle ? (
                  <p className="mt-0.5 text-[12px] text-muted">{subtitle}</p>
                ) : null}
              </div>
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg p-1.5 text-muted hover:bg-zinc-100 hover:text-text"
                aria-label="Закрыть"
              >
                <X size={18} />
              </button>
            </div>

            <div className="grid gap-3 p-4 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => {
                  onPickComputer();
                  onClose();
                }}
                className="flex flex-col items-center gap-3 rounded-xl border border-border bg-bg px-4 py-6 text-center transition-colors hover:border-accent hover:bg-blue-50"
              >
                <span className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-50 text-accent">
                  <HardDriveUpload size={22} />
                </span>
                <span>
                  <span className="block text-[14px] font-medium text-text">
                    С компьютера
                  </span>
                  <span className="mt-1 block text-[11px] text-muted">
                    Выбрать файл на этом устройстве
                  </span>
                </span>
              </button>

              <button
                type="button"
                onClick={() => setStep("disk")}
                className="flex flex-col items-center gap-3 rounded-xl border border-border bg-bg px-4 py-6 text-center transition-colors hover:border-accent hover:bg-blue-50"
              >
                <span className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-50 text-accent">
                  <FolderOpen size={22} />
                </span>
                <span>
                  <span className="block text-[14px] font-medium text-text">
                    С диска проекта
                  </span>
                  <span className="mt-1 block text-[11px] text-muted">
                    Файлы workspace с превью
                  </span>
                </span>
              </button>
            </div>
          </>
        ) : (
          <WorkspaceMediaPickerModal
            embedded
            open
            mediaKind={mediaKind}
            referenceVideoFilter={referenceVideoFilter}
            onBack={() => setStep("choice")}
            onClose={onClose}
            onSelect={onPickDiskFile}
          />
        )}
      </div>
    </div>
  );
}
