"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Animates displayed progress toward API value (never decreases while active).
 */
export function useSmoothProgress(progress: number, active: boolean): number {
  const targetRef = useRef(progress);
  targetRef.current = progress;

  const [display, setDisplay] = useState(() =>
    Math.min(100, Math.max(0, Math.round(progress))),
  );

  useEffect(() => {
    const target = Math.min(100, Math.max(0, Math.round(progress)));
    if (!active) {
      setDisplay(target);
      return;
    }

    const id = window.setInterval(() => {
      setDisplay((current) => {
        const t = Math.min(100, Math.max(0, Math.round(targetRef.current)));
        if (current >= t) return current;
        const gap = t - current;
        const step = gap > 12 ? 3 : gap > 6 ? 2 : 1;
        return Math.min(t, current + step);
      });
    }, 100);

    return () => window.clearInterval(id);
  }, [active, progress]);

  return display;
}
