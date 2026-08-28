import { Suspense } from "react";
import { PostsListPage } from "@/components/posts/PostsListPage";

export default function PostsPage() {
  return (
    <Suspense fallback={<p className="p-6 text-sm text-muted">Загрузка…</p>}>
      <PostsListPage />
    </Suspense>
  );
}
