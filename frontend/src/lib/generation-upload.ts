import { ApiError } from "@/lib/api";

export function generationApiBase(): string {
  return process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") || "/app/api/v1";
}

export async function postGenerationMultipart<T>(
  path: string,
  formData: FormData,
): Promise<T> {
  const res = await fetch(`${generationApiBase()}${path}`, {
    method: "POST",
    credentials: "include",
    body: formData,
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg =
      typeof data === "object" && data && "error" in data
        ? String((data as { error: string }).error)
        : `HTTP ${res.status}`;
    throw new ApiError(res.status, msg);
  }
  return data as T;
}
