"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { FileManager } from "@/components/files/FileManager";

function FilesPageContent() {
  const searchParams = useSearchParams();
  return (
    <FileManager
      initialFolderId={searchParams.get("folder")}
      initialFileId={searchParams.get("file")}
    />
  );
}

export default function FilesPage() {
  return (
    <Suspense fallback={<p className="p-6 text-sm text-muted">Загрузка…</p>}>
      <FilesPageContent />
    </Suspense>
  );
}
