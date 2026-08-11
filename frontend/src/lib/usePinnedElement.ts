import {
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type RefObject,
} from "react";

type PinnedRect = {
  top: number;
  left: number;
  width: number;
};

type UsePinnedElementOptions = {
  enabled: boolean;
  topOffset?: number;
  minWidth?: number;
};

type UsePinnedElementResult = {
  hostRef: RefObject<HTMLDivElement | null>;
  targetRef: RefObject<HTMLElement | null>;
  anchorRef: RefObject<HTMLElement | null>;
  pinnedStyle: CSSProperties | undefined;
};

export function usePinnedElement({
  enabled,
  topOffset = 24,
  minWidth = 1280,
}: UsePinnedElementOptions): UsePinnedElementResult {
  const hostRef = useRef<HTMLDivElement>(null);
  const targetRef = useRef<HTMLElement>(null);
  const anchorRef = useRef<HTMLElement>(null);
  const [pinnedStyle, setPinnedStyle] = useState<CSSProperties | undefined>(undefined);

  useLayoutEffect(() => {
    const host = hostRef.current;
    const target = targetRef.current;
    const anchor = anchorRef.current;
    if (!enabled || !host || !target || !anchor) {
      setPinnedStyle(undefined);
      return;
    }

    let frame = 0;

    const sync = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        if (window.innerWidth < minWidth) {
          host.style.minHeight = "";
          setPinnedStyle(undefined);
          return;
        }

        host.style.minHeight = `${anchor.offsetHeight}px`;

        const hostRect = host.getBoundingClientRect();
        const targetHeight = target.offsetHeight;

        if (hostRect.top >= topOffset || targetHeight <= 0) {
          setPinnedStyle(undefined);
          return;
        }

        const bottomLimit = hostRect.bottom - targetHeight;
        const top = Math.min(topOffset, bottomLimit);

        setPinnedStyle({
          position: "fixed",
          top,
          left: hostRect.left,
          width: hostRect.width,
          zIndex: 10,
        });
      });
    };

    sync();
    window.addEventListener("scroll", sync, { passive: true, capture: true });
    window.addEventListener("resize", sync);
    const observer = new ResizeObserver(sync);
    observer.observe(host);
    observer.observe(target);
    observer.observe(anchor);

    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", sync, true);
      window.removeEventListener("resize", sync);
      observer.disconnect();
      host.style.minHeight = "";
      setPinnedStyle(undefined);
    };
  }, [enabled, minWidth, topOffset]);

  return { hostRef, targetRef, anchorRef, pinnedStyle };
}
