"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Headphones } from "lucide-react";
import { fetchSupportTicketsCount } from "@/lib/api";

export function SupportWidget() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    function load() {
      fetchSupportTicketsCount()
        .then((d) => setCount(d.awaiting_user_count ?? 0))
        .catch(() => setCount(0));
    }
    load();
    const interval = setInterval(load, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <Link
      href="/support"
      className="relative rounded-xl p-2 text-muted transition-colors hover:bg-zinc-100 hover:text-text"
      aria-label="Поддержка"
      title="Поддержка"
    >
      <Headphones className="h-5 w-5" />
      {count > 0 && (
        <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-accent px-1 text-[10px] font-medium text-white">
          {count > 99 ? "99+" : count}
        </span>
      )}
    </Link>
  );
}
