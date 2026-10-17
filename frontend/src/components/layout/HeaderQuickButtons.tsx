"use client";

import Link from "next/link";
import { ExternalLink, Sparkles, Star, Zap } from "lucide-react";
import { useEffect, useState } from "react";
import { fetchHeaderButtons, type HeaderButton } from "@/lib/api";

const icons = { Sparkles, Star, Zap, ExternalLink };
const shadows = { none: "none", sm: "0 1px 2px rgb(0 0 0 / .08)", md: "0 3px 8px rgb(0 0 0 / .14)", lg: "0 8px 18px rgb(0 0 0 / .18)" };

export function HeaderQuickButtons() {
  const [buttons, setButtons] = useState<HeaderButton[]>([]);
  useEffect(() => { void fetchHeaderButtons().then((data) => setButtons(data.buttons ?? [])).catch(() => setButtons([])); }, []);
  return <div className="flex min-w-0 flex-1 items-center gap-2 overflow-x-auto px-4 sm:px-6">
    {buttons.map((button) => {
      const Icon = button.icon && icons[button.icon as keyof typeof icons];
      return <Link key={button.id} href={button.href} className="inline-flex shrink-0 items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-white transition-opacity hover:opacity-90" style={{ backgroundColor: button.color, borderRadius: button.radius, boxShadow: shadows[button.shadow] }}>
        {Icon ? <Icon className="h-4 w-4" /> : null}<span>{button.text}</span>
      </Link>;
    })}
  </div>;
}