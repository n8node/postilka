"use client";

import { useEffect, useState } from "react";
import type { AuthScreenSlide } from "@/lib/api";
import { mediaUrl } from "@/lib/media-display";

const FALLBACK_DURATION_SECONDS = 6;

export function AuthScreenSlider({
  slides,
  loading,
}: {
  slides: AuthScreenSlide[];
  loading: boolean;
}) {
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    if (slides.length < 2) return;
    const duration = Math.max(
      FALLBACK_DURATION_SECONDS,
      slides[activeIndex]?.duration_seconds || FALLBACK_DURATION_SECONDS,
    );
    const timer = window.setTimeout(() => {
      setActiveIndex((index) => (index + 1) % slides.length);
    }, duration * 1000);

    return () => window.clearTimeout(timer);
  }, [activeIndex, slides]);

  useEffect(() => {
    if (activeIndex >= slides.length) setActiveIndex(0);
  }, [activeIndex, slides.length]);

  if (loading || slides.length === 0) {
    if (!loading) return null;
    return (
      <aside className="min-h-[26rem] overflow-hidden rounded-2xl border border-white/40 bg-slate-950/15 lg:min-h-[34rem]" />
    );
  }

  const activeSlide = slides[activeIndex];
  const activeMediaURL = activeSlide.media_url ? mediaUrl(activeSlide.media_url) : "";

  return (
    <aside className="relative min-h-[26rem] overflow-hidden rounded-2xl border border-white/40 bg-slate-950 text-white shadow-xl lg:min-h-[34rem]">
      <div className="absolute inset-0">
        {activeMediaURL && activeSlide.media_kind === "video" ? (
          <video
            key={activeMediaURL}
            className="h-full w-full object-cover"
            src={activeMediaURL}
            autoPlay
            muted
            playsInline
            loop
          />
        ) : activeMediaURL ? (
          <img
            key={activeMediaURL}
            className="h-full w-full object-cover"
            src={activeMediaURL}
            alt=""
          />
        ) : (
          <div className="h-full w-full bg-slate-900" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/20 to-transparent" />
      </div>

      <div className="relative flex min-h-[34rem] flex-col justify-end p-7 xl:p-9">
        <div className="max-w-md">
          {activeSlide.tag && (
            <span className="inline-flex rounded-full border border-white/30 bg-white/10 px-3 py-1 text-xs font-medium uppercase tracking-[0.14em] text-white/85 backdrop-blur-sm">
              {activeSlide.tag}
            </span>
          )}
          <h2 className="mt-4 text-3xl font-semibold tracking-tight text-white">
            {activeSlide.title || "Создавайте больше с Postilka"}
          </h2>
          {activeSlide.description && (
            <p className="mt-3 text-sm leading-relaxed text-white/75">
              {activeSlide.description}
            </p>
          )}
        </div>

        <div className="mt-8 grid grid-cols-4 gap-2" aria-label="Слайды">
          {slides.map((slide, index) => (
            <button
              key={slide.slot}
              type="button"
              aria-label={`Открыть слайд ${index + 1}`}
              onClick={() => setActiveIndex(index)}
              className="group h-8 cursor-pointer pt-3"
            >
              <span className="block h-1 overflow-hidden rounded-full bg-white/25">
                <span
                  className={`block h-full rounded-full bg-white ${
                    index < activeIndex
                      ? "w-full"
                      : index === activeIndex
                        ? "auth-slide-progress w-0"
                        : "w-0"
                  }`}
                  style={
                    index === activeIndex
                      ? { animationDuration: `${Math.max(FALLBACK_DURATION_SECONDS, activeSlide.duration_seconds || FALLBACK_DURATION_SECONDS)}s` }
                      : undefined
                  }
                />
              </span>
            </button>
          ))}
        </div>
      </div>
    </aside>
  );
}