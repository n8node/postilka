"use client";

import { useEffect, useRef, useState } from "react";

type UseLazyInViewOptions = {
  rootMargin?: string;
  enabled?: boolean;
};

export function useLazyInView(options?: UseLazyInViewOptions) {
  const enabled = options?.enabled ?? true;
  const ref = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    if (!enabled) {
      setInView(true);
      return;
    }
    const node = ref.current;
    if (!node) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        setInView(entry.isIntersecting);
      },
      { rootMargin: options?.rootMargin ?? "280px 0px" },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [enabled, options?.rootMargin]);

  return { ref, inView };
}
