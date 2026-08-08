import { apiFetch } from "@/lib/api";
import type { WorkspaceFile } from "@/lib/files-api";
import { probeMediaDuration } from "@/lib/file-media";

export type UploadJobStatus =
  | "pending"
  | "uploading"
  | "completed"
  | "error"
  | "cancelled";

export type UploadJob = {
  id: string;
  name: string;
  size: number;
  mimeType: string;
  folderId: string | null;
  workspaceId: string;
  progress: number;
  status: UploadJobStatus;
  error?: string;
  resultFile?: WorkspaceFile;
  queuedAt: number;
};

type StoredJob = UploadJob & {
  sessionToken?: string;
  uploadUrl?: string;
  uploadHeaders?: Record<string, string>;
  blob?: Blob;
  mediaDurationSeconds?: number;
};

const DB_NAME = "postilka-upload-queue";
const DB_VERSION = 1;
const STORE = "jobs";

type QueueListener = (jobs: UploadJob[]) => void;
type CompleteListener = (file: WorkspaceFile) => void;
type IdleListener = () => void;

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onerror = () => reject(req.error);
    req.onsuccess = () => resolve(req.result);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: "id" });
      }
    };
  });
}

async function dbGetAll(): Promise<StoredJob[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readonly");
    const req = tx.objectStore(STORE).getAll();
    req.onsuccess = () => resolve((req.result as StoredJob[]) ?? []);
    req.onerror = () => reject(req.error);
  });
}

async function dbPut(job: StoredJob): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).put(job);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

async function dbDelete(id: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

function putWithProgress(
  url: string,
  blob: Blob,
  headers: Record<string, string>,
  onProgress: (pct: number) => void,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable && e.total > 0) {
        onProgress(Math.round((e.loaded / e.total) * 100));
      }
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) resolve();
      else reject(new Error(`S3 upload failed: ${xhr.status}`));
    };
    xhr.onerror = () => reject(new Error("S3 upload network error"));
    xhr.open("PUT", url);
    for (const [k, v] of Object.entries(headers)) {
      if (k.toLowerCase() !== "host") xhr.setRequestHeader(k, v);
    }
    xhr.send(blob);
  });
}

class UploadQueueManager {
  private listeners = new Set<QueueListener>();
  private completeListeners = new Set<CompleteListener>();
  private idleListeners = new Set<IdleListener>();
  private jobs: UploadJob[] = [];
  private running = false;
  private cancelled = false;

  subscribe(fn: QueueListener) {
    this.listeners.add(fn);
    fn(this.sortedJobs());
    return () => {
      this.listeners.delete(fn);
    };
  }

  onComplete(fn: CompleteListener) {
    this.completeListeners.add(fn);
    return () => {
      this.completeListeners.delete(fn);
    };
  }

  onIdle(fn: IdleListener) {
    this.idleListeners.add(fn);
    return () => {
      this.idleListeners.delete(fn);
    };
  }

  private sortedJobs(): UploadJob[] {
    return [...this.jobs].sort((a, b) => a.queuedAt - b.queuedAt);
  }

  private emit() {
    const sorted = this.sortedJobs();
    for (const fn of this.listeners) fn(sorted);
  }

  private sortStored(stored: StoredJob[]): StoredJob[] {
    return [...stored].sort((a, b) => (a.queuedAt ?? 0) - (b.queuedAt ?? 0));
  }

  private pickNextJob(stored: StoredJob[]): StoredJob | undefined {
    const sorted = this.sortStored(stored);
    const uploading = sorted.find((j) => j.status === "uploading");
    if (uploading) return uploading;
    return sorted.find((j) => j.status === "pending");
  }

  private notifyIdleIfDone() {
    if (this.jobs.length === 0) return;
    const allSuccess = this.jobs.every((j) => j.status === "completed");
    if (!allSuccess) return;
    for (const fn of this.idleListeners) fn();
  }

  private toPublic(stored: StoredJob): UploadJob {
    return {
      id: stored.id,
      name: stored.name,
      size: stored.size,
      mimeType: stored.mimeType,
      folderId: stored.folderId,
      workspaceId: stored.workspaceId,
      progress: stored.progress,
      status: stored.status,
      error: stored.error,
      resultFile: stored.resultFile,
      queuedAt: stored.queuedAt ?? 0,
    };
  }

  async hydrate() {
    const stored = this.sortStored(await dbGetAll());
    const active: UploadJob[] = [];
    for (const row of stored) {
      if (row.status === "uploading" || (row.status === "error" && row.blob)) {
        row.status = "pending";
        row.progress = 0;
        row.error = undefined;
        await dbPut(row);
      }
      if (row.status !== "cancelled") {
        active.push(this.toPublic(row));
      }
    }
    this.jobs = active;
    this.emit();
    void this.process();
  }

  async enqueue(files: File[], folderId: string | null, workspaceId: string) {
    const base = Date.now();
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const id = crypto.randomUUID();
      const job: StoredJob = {
        id,
        name: file.name,
        size: file.size,
        mimeType: file.type || "application/octet-stream",
        folderId,
        workspaceId,
        progress: 0,
        status: "pending",
        queuedAt: base + i,
        blob: file,
      };
      await dbPut(job);
      this.jobs.push(this.toPublic(job));
    }
    this.emit();
    void this.process();
  }

  cancelAll() {
    this.cancelled = true;
    void (async () => {
      for (const job of this.jobs) {
        if (job.status === "pending" || job.status === "uploading") {
          await dbDelete(job.id);
        }
      }
      this.jobs = this.jobs.map((j) =>
        j.status === "pending" || j.status === "uploading"
          ? { ...j, status: "cancelled" as const }
          : j,
      );
      this.emit();
    })();
  }

  dismissCompleted() {
    this.jobs = this.jobs.filter((j) => j.status !== "completed" && j.status !== "cancelled");
    this.emit();
  }

  private async updateJob(id: string, patch: Partial<StoredJob>) {
    const stored = (await dbGetAll()).find((j) => j.id === id);
    if (!stored) return;
    const next: StoredJob = { ...stored, ...patch };
    await dbPut(next);
    const idx = this.jobs.findIndex((j) => j.id === id);
    if (idx >= 0) {
      this.jobs[idx] = this.toPublic(next);
      this.emit();
    }
  }

  private async process() {
    if (this.running) return;
    this.running = true;
    this.cancelled = false;

    while (!this.cancelled) {
      const stored = await dbGetAll();
      const next = this.pickNextJob(stored);
      if (!next) break;
      await this.processOne(next);
    }

    this.running = false;
    if (!this.cancelled) {
      this.notifyIdleIfDone();
      void this.process();
    }
  }

  private async processOne(job: StoredJob) {
    if (this.cancelled) return;

    if (!job.blob) {
      await this.updateJob(job.id, { status: "error", error: "Файл не найден локально" });
      return;
    }

    await this.updateJob(job.id, { status: "uploading", progress: 0 });

    let sessionToken = job.sessionToken;
    let uploadUrl = job.uploadUrl;
    let uploadHeaders = job.uploadHeaders;

    try {
      if (!sessionToken || !uploadUrl) {
        let mediaDurationSeconds = job.mediaDurationSeconds;
        if (mediaDurationSeconds == null && job.blob) {
          mediaDurationSeconds = await probeMediaDuration(job.blob, job.mimeType);
          if (mediaDurationSeconds != null) {
            await this.updateJob(job.id, { mediaDurationSeconds });
          }
        }
        const init = await apiFetch<{
          upload_url: string;
          upload_headers: Record<string, string>;
          upload_session_token: string;
        }>("/files/upload/init", {
          method: "POST",
          body: JSON.stringify({
            name: job.name,
            size: job.size,
            mime_type: job.mimeType,
            folder_id: job.folderId,
            media_duration_seconds: mediaDurationSeconds ?? undefined,
          }),
        });
        sessionToken = init.upload_session_token;
        uploadUrl = init.upload_url;
        uploadHeaders = init.upload_headers;
        await this.updateJob(job.id, { sessionToken, uploadUrl, uploadHeaders });
      }

      await putWithProgress(uploadUrl!, job.blob, uploadHeaders ?? {}, (pct) => {
        void this.updateJob(job.id, { progress: pct });
      });

      const created = await apiFetch<WorkspaceFile>("/files/upload/complete", {
        method: "POST",
        body: JSON.stringify({ upload_session_token: sessionToken }),
      });

      await dbDelete(job.id);
      const idx = this.jobs.findIndex((j) => j.id === job.id);
      if (idx >= 0) {
        this.jobs[idx] = {
          ...this.jobs[idx],
          status: "completed",
          progress: 100,
          resultFile: created,
        };
        this.emit();
      }
      for (const fn of this.completeListeners) fn(created);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Ошибка загрузки";
      await this.updateJob(job.id, {
        status: "error",
        error: msg,
        sessionToken: undefined,
        uploadUrl: undefined,
        uploadHeaders: undefined,
      });
    }
  }
}

export const uploadQueue =
  typeof window !== "undefined" ? new UploadQueueManager() : null;
