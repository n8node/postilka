import { PostComposer } from "@/components/posts/PostComposer";

type PostDetailPageProps = {
  params: Promise<{ id: string }>;
};

export default async function PostDetailPage({ params }: PostDetailPageProps) {
  const { id } = await params;
  return <PostComposer initialPostId={id} />;
}
