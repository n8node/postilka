"use client";

import { useEffect, useRef, useState } from "react";
import { initGasWebGL } from "@/components/auth/auth-gas-webgl";

function StaticFallback() {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 bg-bg bg-gradient-to-br from-bg via-bg to-slate-100/80"
    />
  );
}

export function AuthGasBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [useFallback, setUseFallback] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const reducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    const webgl = initGasWebGL(canvas);
    if (!webgl) {
      setUseFallback(true);
      return;
    }

    let rafId = 0;
    const startTime = performance.now();

    const resize = () => {
      const parent = canvas.parentElement;
      if (!parent) return;

      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const { clientWidth, clientHeight } = parent;
      webgl.resize(clientWidth * dpr, clientHeight * dpr);
      canvas.style.width = `${clientWidth}px`;
      canvas.style.height = `${clientHeight}px`;
    };

    const drawFrame = (now: number) => {
      webgl.draw((now - startTime) / 1000);
    };

    resize();

    if (reducedMotion) {
      drawFrame(startTime);
    } else {
      const tick = (now: number) => {
        drawFrame(now);
        rafId = window.requestAnimationFrame(tick);
      };
      rafId = window.requestAnimationFrame(tick);
    }

    const target = canvas.parentElement ?? canvas;
    const observer = new ResizeObserver(resize);
    observer.observe(target);

    return () => {
      window.cancelAnimationFrame(rafId);
      observer.disconnect();
      webgl.destroy();
    };
  }, []);

  if (useFallback) {
    return <StaticFallback />;
  }

  return (
    <canvas
      ref={canvasRef}
      aria-hidden
      className="pointer-events-none absolute inset-0 h-full w-full"
    />
  );
}
