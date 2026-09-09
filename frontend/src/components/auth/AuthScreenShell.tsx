"use client";

import { useEffect, useState } from "react";
import { fetchAuthScreen, type AuthScreenSlide } from "@/lib/api";
import { mediaUrl } from "@/lib/media-display";
import { AuthScreenSlider } from "@/components/auth/AuthScreenSlider";

export function AuthScreenShell({ children }: { children: React.ReactNode }) {
  const [logoURL, setLogoURL] = useState("");
  const [slides, setSlides] = useState<AuthScreenSlide[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetchAuthScreen()
      .then((data) => {
        if (!cancelled) {
          setLogoURL(data.logo_url ? mediaUrl(data.logo_url) : "");
          setSlides(data.slides.slice(0, 4));
        }
      })
      .catch(() => {
        if (!cancelled) {
          setLogoURL("");
          setSlides([]);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-6xl items-center px-4 py-8 sm:px-6 lg:px-8">
      <div className="grid w-full overflow-hidden rounded-2xl border border-white/60 bg-surface/90 shadow-2xl backdrop-blur-sm lg:grid-cols-[minmax(0,0.92fr)_minmax(0,1.08fr)]">
        <section className="min-w-0 p-6 sm:p-8 lg:p-10">
          <div className="mx-auto w-full max-w-md">
            <div className="mb-8">
              <div className="flex h-14 items-center justify-center">
                {logoURL ? (
                  <img className="max-h-12 max-w-[13rem] object-contain object-center" src={logoURL} alt="Postilka" />
                ) : (
                  <span className="text-center text-lg font-semibold tracking-tight text-slate-900">Postilka</span>
                )}
              </div>
              <h1 className="mt-5 text-center text-2xl font-semibold tracking-tight text-slate-900">
                Добро пожаловать в Постилку
              </h1>
            </div>
            {children}
          </div>
        </section>
        <AuthScreenSlider slides={slides} loading={loading} />
      </div>
    </main>
  );
}