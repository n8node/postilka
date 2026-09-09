"use client";

import { useEffect, useState } from "react";
import type { AuthScreenSlide } from "@/lib/api";
import { mediaUrl } from "@/lib/media-display";

const FALLBACK_DURATION_SECONDS = 6;
const MIN_DURATION_SECONDS = 1;

export function AuthScreenSlider({
  slides,
  loading,
}: {
  slides: AuthScreenSlide[];
  loading: boolean;
}) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [direction, setDirection] = useState<1 | -1>(1);

  const activeSlide = slides[activeIndex];
  const activeDuration = Math.max(
    MIN_DURATION_SECONDS,
    Number(activeSlide?.duration_seconds) || FALLBACK_DURATION_SECONDS,
  );

  useEffect(() => {
    if (slides.length < 2) return;
    const timer = window.setTimeout(() => {
      setDirection(1);
      setActiveIndex((index) => (index + 1) % slides.length);
    }, activeDuration * 1000);

    return () => window.clearTimeout(timer);
  }, [activeDuration, activeIndex, slides.length]);

  useEffect(() => {
    if (activeIndex >= slides.length) setActiveIndex(0);
  }, [activeIndex, slides.length]);

  if (loading || slides.length === 0) {
    if (!loading) return null;
    return (
      <aside className="min-h-[26rem] overflow-hidden rounded-2xl border border-white/40 bg-slate-950/15 lg:min-h-[34rem]" />
    );
  }

  return (
    <aside className="relative min-h-[26rem] overflow-hidden rounded-2xl border border-white/40 bg-slate-950 text-white shadow-xl lg:min-h-[34rem]">
      <div
        className="auth-slide-track absolute inset-0 flex"
        style={{
          transform: `translate3d(-${activeIndex * 100}%, 0, 0)`,
          transitionDuration: direction === 1 ? "520ms" : "420ms",
        }}
      >
        {slides.map((slide) => {
          const mediaURL = slide.media_url ? mediaUrl(slide.media_url) : "";
          return (
            <div key={slide.slot} className="relative h-full min-w-full shrink-0">
              {mediaURL && slide.media_kind === "video" ? (
                <video
                  className="h-full w-full object-cover"
                  src={mediaURL}
                  autoPlay
                  muted
                  playsInline
                  loop
                />
              ) : mediaURL ? (
                <img className="h-full w-full object-cover" src={mediaURL} alt="" />
              ) : (
                <div className="h-full w-full bg-slate-900" />
              )}
            </div>
          );
        })}
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/20 to-transparent" />
      </div>

      <div className="relative flex min-h-[26rem] flex-col justify-end px-7 pb-5 pt-14 xl:px-9 xl:pb-6 xl:pt-16 lg:min-h-[34rem]">
        <div className="auth-slide-content-viewport overflow-hidden">
          <div
            className="auth-slide-track flex"
            style={{
              transform: `translate3d(-${activeIndex * 100}%, 0, 0)`,
              transitionDuration: direction === 1 ? "520ms" : "420ms",
            }}
          >
            {slides.map((slide) => (
              <div key={slide.slot} className="min-w-full shrink-0 pr-4">
                <div className="max-w-md">
                  {slide.tag && (
                    <span className="inline-flex rounded-full border border-white/30 bg-white/10 px-3 py-1 text-xs font-medium uppercase tracking-[0.14em] text-white/85 backdrop-blur-sm">
                      {slide.tag}
                    </span>
                  )}
                  <h2 className="mt-4 text-3xl font-semibold tracking-tight text-white">
                    {slide.title || "Создавайте больше с Postilka"}
                  </h2>
                  {slide.description && (
                    <p className="mt-3 text-sm leading-relaxed text-white/75">
                      {slide.description}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-8 grid grid-cols-4 gap-2" aria-label="Слайды">
          {slides.map((slide, index) => (
            <button
              key={slide.slot}
              type="button"
              aria-label={`Открыть слайд ${index + 1}`}
              onClick={() => {
                setDirection(index >= activeIndex ? 1 : -1);
                setActiveIndex(index);
              }}
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
                      ? { animationDuration: `${activeDuration}s` }
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