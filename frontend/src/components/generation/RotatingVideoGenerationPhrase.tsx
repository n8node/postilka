"use client";

import { useEffect, useRef, useState } from "react";
import {
  pickRandomPhrase,
  videoPhrasesForStatus,
} from "@/components/generation/video-loading-phrases";

const TERMINAL_LABELS: Record<string, string> = {
  succeeded: "Готово",
  failed: "Ошибка",
};

const ROTATE_MS = 3200;
const FADE_MS = 320;

type RotatingVideoGenerationPhraseProps = {
  status: string;
  active: boolean;
};

export function RotatingVideoGenerationPhrase({
  status,
  active,
}: RotatingVideoGenerationPhraseProps) {
  const pool = videoPhrasesForStatus(status);
  const terminal = status in TERMINAL_LABELS;
  const fixed = TERMINAL_LABELS[status];

  const [phrase, setPhrase] = useState(() => pickRandomPhrase(pool));
  const [visible, setVisible] = useState(true);
  const phraseRef = useRef(phrase);
  const statusRef = useRef(status);
  phraseRef.current = phrase;
  statusRef.current = status;

  useEffect(() => {
    if (terminal) return;
    setPhrase(pickRandomPhrase(videoPhrasesForStatus(status)));
    setVisible(true);
  }, [status, terminal]);

  useEffect(() => {
    if (!active || terminal) return;

    let fadeTimeout: number | undefined;

    const intervalId = window.setInterval(() => {
      setVisible(false);
      fadeTimeout = window.setTimeout(() => {
        setPhrase(
          pickRandomPhrase(
            videoPhrasesForStatus(statusRef.current),
            phraseRef.current,
          ),
        );
        setVisible(true);
      }, FADE_MS);
    }, ROTATE_MS);

    return () => {
      window.clearInterval(intervalId);
      if (fadeTimeout) window.clearTimeout(fadeTimeout);
    };
  }, [active, terminal]);

  if (fixed) {
    return (
      <span className="min-h-[18px] flex-1 text-left font-medium text-text">
        {fixed}
      </span>
    );
  }

  return (
    <span
      className={[
        "generation-phrase-line min-h-[18px] flex-1 text-left font-medium text-text",
        visible ? "generation-phrase-line--visible" : "generation-phrase-line--hidden",
      ].join(" ")}
      aria-live="polite"
    >
      {phrase}
    </span>
  );
}
