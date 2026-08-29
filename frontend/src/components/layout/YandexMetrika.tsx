"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useRef } from "react";

const YANDEX_METRIKA_ID = 112066792;

declare global {
  interface Window {
    ym?: (counterId: number, method: string, ...args: unknown[]) => void;
  }
}

export function YandexMetrikaHits() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const skipFirst = useRef(true);

  useEffect(() => {
    if (skipFirst.current) {
      skipFirst.current = false;
      return;
    }
    const url = `${window.location.pathname}${window.location.search}${window.location.hash}`;
    window.ym?.(YANDEX_METRIKA_ID, "hit", url);
  }, [pathname, searchParams]);

  return null;
}
