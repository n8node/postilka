import { AiPageWrapper } from "@/components/generation/AiPageWrapper";
import Link from "next/link";

export default function AiPage() {
  return (
    <>
      <AiPageWrapper />
      <div className="mx-auto mt-6 max-w-6xl px-6 pb-8">
        <Link
          href="/shorts"
          className="inline-flex rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/80 transition hover:bg-white/10"
        >
          Открыть Shorts Studio
        </Link>
      </div>
    </>
  );
}
