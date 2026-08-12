"use client";

import { GripVertical, RotateCw, Trash2 } from "lucide-react";
import { useCallback, useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { cn } from "@/lib/utils";
import {
  TELEGRAM_STORY_AREA_LIMITS,
  TELEGRAM_STORY_PERIODS,
  TELEGRAM_STORY_REACTION_EMOJIS,
  TELEGRAM_STORY_WEATHER_EMOJIS,
  canAddStoryAreaKind,
  countStoryAreasByKind,
  createDefaultStoryArea,
  createStoryAreaId,
  storyAreaKindLabel,
  type TelegramStoryArea,
  type TelegramStoryAreaKind,
  type TelegramStorySettings,
} from "@/lib/telegram-story";

type StoryAreaEditorProps = {
  settings: TelegramStorySettings;
  onChange: (settings: TelegramStorySettings) => void;
  mediaPreviewUrl?: string | null;
  disabled?: boolean;
};

type DragMode = "move" | "resize" | "rotate";

type DragState = {
  areaId: string;
  mode: DragMode;
  startX: number;
  startY: number;
  startPos: TelegramStoryArea["position"];
  centerX: number;
  centerY: number;
};

const AREA_COLORS: Record<TelegramStoryAreaKind, string> = {
  link: "border-white/80 bg-black/55 backdrop-blur-sm",
  location: "border-emerald-400 bg-emerald-500/25",
  suggested_reaction: "border-rose-400 bg-rose-500/25",
  weather: "border-amber-400 bg-amber-500/25",
};

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function areaSummary(area: TelegramStoryArea): string {
  switch (area.kind) {
    case "link":
      return area.url?.trim() || "Ссылка";
    case "location":
      return area.address?.city?.trim() || `${area.latitude ?? 0}, ${area.longitude ?? 0}`;
    case "suggested_reaction":
      return area.reaction_emoji ?? "❤";
    case "weather":
      return `${area.weather_emoji ?? "☀️"} ${area.temperature ?? 0}°`;
    default:
      return storyAreaKindLabel(area.kind);
  }
}

function withAreaId(area: TelegramStoryArea): TelegramStoryArea & { id: string } {
  return { ...area, id: area.id ?? createStoryAreaId() };
}

export function StoryAreaEditor({
  settings,
  onChange,
  mediaPreviewUrl,
  disabled = false,
}: StoryAreaEditorProps) {
  const canvasRef = useRef<HTMLDivElement>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [drag, setDrag] = useState<DragState | null>(null);
  const areas = (settings.areas ?? []).map(withAreaId);
  const selected = areas.find((area) => area.id === selectedId) ?? null;
  const counts = countStoryAreasByKind(areas);

  const patchSettings = useCallback(
    (patch: Partial<TelegramStorySettings>) => {
      onChange({ ...settings, ...patch });
    },
    [onChange, settings],
  );

  const patchAreas = useCallback(
    (next: TelegramStoryArea[]) => {
      patchSettings({ areas: next });
    },
    [patchSettings],
  );

  const patchArea = useCallback(
    (id: string, patch: Partial<TelegramStoryArea>) => {
      patchAreas(areas.map((area) => (area.id === id ? { ...area, ...patch } : area)));
    },
    [areas, patchAreas],
  );

  const addArea = (kind: TelegramStoryAreaKind) => {
    if (!canAddStoryAreaKind(areas, kind)) return;
    const next = [...areas, createDefaultStoryArea(kind, areas.length)];
    patchAreas(next);
    setSelectedId(next[next.length - 1]?.id ?? null);
  };

  const removeArea = (id: string) => {
    patchAreas(areas.filter((area) => area.id !== id));
    if (selectedId === id) setSelectedId(null);
  };

  const pointerToPercent = useCallback((clientX: number, clientY: number) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return { x: 0, y: 0 };
    return {
      x: clamp(((clientX - rect.left) / rect.width) * 100, 0, 100),
      y: clamp(((clientY - rect.top) / rect.height) * 100, 0, 100),
    };
  }, []);

  const onCanvasPointerDown = (event: ReactPointerEvent) => {
    if (event.target === canvasRef.current || (event.target as HTMLElement).dataset.canvasBg === "1") {
      setSelectedId(null);
    }
  };

  const startDrag = (
    event: ReactPointerEvent,
    area: TelegramStoryArea & { id: string },
    mode: DragMode,
  ) => {
    if (disabled) return;
    event.stopPropagation();
    event.preventDefault();
    setSelectedId(area.id);
    const rect = canvasRef.current?.getBoundingClientRect();
    const centerX =
      rect ? rect.left + (rect.width * (area.position.x_percentage + area.position.width_percentage / 2)) / 100 : event.clientX;
    const centerY =
      rect ? rect.top + (rect.height * (area.position.y_percentage + area.position.height_percentage / 2)) / 100 : event.clientY;
    setDrag({
      areaId: area.id,
      mode,
      startX: event.clientX,
      startY: event.clientY,
      startPos: { ...area.position },
      centerX,
      centerY,
    });
    (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
  };

  useEffect(() => {
    if (!drag) return;

    const onMove = (event: PointerEvent) => {
      const rect = canvasRef.current?.getBoundingClientRect();
      if (!rect) return;
      const dxPct = ((event.clientX - drag.startX) / rect.width) * 100;
      const dyPct = ((event.clientY - drag.startY) / rect.height) * 100;
      const start = drag.startPos;

      patchArea(drag.areaId, {
        position: (() => {
          if (drag.mode === "move") {
            const x = clamp(start.x_percentage + dxPct, 0, 100 - start.width_percentage);
            const y = clamp(start.y_percentage + dyPct, 0, 100 - start.height_percentage);
            return { ...start, x_percentage: x, y_percentage: y };
          }
          if (drag.mode === "resize") {
            const width = clamp(start.width_percentage + dxPct, 4, 100 - start.x_percentage);
            const height = clamp(start.height_percentage + dyPct, 4, 100 - start.y_percentage);
            return { ...start, width_percentage: width, height_percentage: height };
          }
          const angle =
            (Math.atan2(event.clientY - drag.centerY, event.clientX - drag.centerX) * 180) / Math.PI + 90;
          const normalized = ((angle % 360) + 360) % 360;
          return { ...start, rotation_angle: Math.round(normalized) };
        })(),
      });
    };

    const onUp = () => setDrag(null);

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
  }, [drag, patchArea]);

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block text-xs">
          <span className="mb-1 block font-medium text-zinc-600">Срок публикации</span>
          <select
            value={settings.active_period ?? 86400}
            disabled={disabled}
            onChange={(event) =>
              patchSettings({ active_period: Number(event.target.value) })
            }
            className="w-full rounded-lg border border-border px-3 py-2 text-sm"
          >
            {TELEGRAM_STORY_PERIODS.map((period) => (
              <option key={period.value} value={period.value}>
                {period.label}
              </option>
            ))}
          </select>
        </label>
        <div className="flex flex-col justify-end gap-2 text-sm">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={Boolean(settings.post_to_chat_page)}
              disabled={disabled}
              onChange={(event) => patchSettings({ post_to_chat_page: event.target.checked })}
            />
            Дублировать на странице чата
          </label>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={Boolean(settings.protect_content)}
              disabled={disabled}
              onChange={(event) => patchSettings({ protect_content: event.target.checked })}
            />
            Защита контента
          </label>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {(Object.keys(TELEGRAM_STORY_AREA_LIMITS) as TelegramStoryAreaKind[]).map((kind) => (
          <button
            key={kind}
            type="button"
            disabled={disabled || !canAddStoryAreaKind(areas, kind)}
            onClick={() => addArea(kind)}
            className="rounded-md border border-border bg-white px-2.5 py-1.5 text-xs font-medium hover:bg-zinc-50 disabled:opacity-40"
          >
            + {storyAreaKindLabel(kind)} ({counts[kind] ?? 0}/{TELEGRAM_STORY_AREA_LIMITS[kind]})
          </button>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,280px)_1fr]">
        <div
          ref={canvasRef}
          data-canvas-bg="1"
          onPointerDown={onCanvasPointerDown}
          className="relative mx-auto aspect-[9/16] w-full max-w-[280px] overflow-hidden rounded-xl border border-border bg-zinc-900 shadow-inner"
        >
          {mediaPreviewUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={mediaPreviewUrl}
              alt=""
              data-canvas-bg="1"
              className="absolute inset-0 h-full w-full object-cover"
            />
          ) : (
            <div
              data-canvas-bg="1"
              className="absolute inset-0 flex items-center justify-center text-xs text-zinc-400"
            >
              Прикрепите медиа для превью
            </div>
          )}
          {areas.map((area) => {
            const isSelected = area.id === selectedId;
            const { x_percentage, y_percentage, width_percentage, height_percentage, rotation_angle } =
              area.position;
            return (
              <div
                key={area.id}
                className={cn(
                  "absolute touch-none border-2",
                  AREA_COLORS[area.kind],
                  isSelected && "ring-2 ring-white/80",
                  disabled && "pointer-events-none",
                )}
                style={{
                  left: `${x_percentage}%`,
                  top: `${y_percentage}%`,
                  width: `${width_percentage}%`,
                  height: `${height_percentage}%`,
                  transform: `rotate(${rotation_angle}deg)`,
                  transformOrigin: "center center",
                }}
                onPointerDown={(event) => startDrag(event, area, "move")}
              >
                <div className="flex h-full items-center justify-center overflow-hidden px-1 text-center text-[10px] font-semibold text-white drop-shadow">
                  {area.kind === "link" ? (
                    <span className="truncate rounded-full bg-black/70 px-2 py-1">
                      🔗 {areaSummary(area)}
                    </span>
                  ) : (
                    areaSummary(area)
                  )}
                </div>
                {isSelected && !disabled && (
                  <>
                    <button
                      type="button"
                      aria-label="Перетащить"
                      className="absolute -left-2 top-1/2 -translate-y-1/2 rounded bg-white/90 p-0.5 text-zinc-700 shadow"
                      onPointerDown={(event) => startDrag(event, area, "move")}
                    >
                      <GripVertical className="h-3 w-3" />
                    </button>
                    <button
                      type="button"
                      aria-label="Изменить размер"
                      className="absolute -bottom-2 -right-2 h-4 w-4 cursor-se-resize rounded-full border-2 border-white bg-accent shadow"
                      onPointerDown={(event) => startDrag(event, area, "resize")}
                    />
                    <button
                      type="button"
                      aria-label="Повернуть"
                      className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full border border-white bg-white/90 p-0.5 text-zinc-700 shadow"
                      onPointerDown={(event) => startDrag(event, area, "rotate")}
                    >
                      <RotateCw className="h-3 w-3" />
                    </button>
                  </>
                )}
              </div>
            );
          })}
        </div>

        <div className="space-y-3">
          {areas.length === 0 ? (
            <p className="text-sm text-muted">
              Добавьте интерактивные зоны: ссылки, геометки, реакции или погоду. Перетаскивайте и
              меняйте размер на превью 9:16.
            </p>
          ) : (
            areas.map((area, index) => (
              <div
                key={area.id}
                className={cn(
                  "rounded-lg border p-3",
                  area.id === selectedId ? "border-accent bg-accent/5" : "border-border",
                )}
                onClick={() => setSelectedId(area.id)}
              >
                <div className="mb-2 flex items-center justify-between gap-2">
                  <p className="text-xs font-semibold">
                    {index + 1}. {storyAreaKindLabel(area.kind)}
                  </p>
                  <button
                    type="button"
                    disabled={disabled}
                    onClick={(event) => {
                      event.stopPropagation();
                      removeArea(area.id);
                    }}
                    className="text-muted hover:text-red-600 disabled:opacity-40"
                    aria-label="Удалить зону"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
                {area.kind === "link" && (
                  <>
                    <input
                      value={area.url ?? ""}
                      disabled={disabled}
                      onChange={(event) => patchArea(area.id, { url: event.target.value })}
                      placeholder="https://example.com"
                      className="w-full rounded border border-border px-2 py-1.5 text-xs"
                    />
                    <p className="mt-1 text-[11px] text-muted">
                      Telegram сам рисует «стикер ссылки» с доменом — как в приложении. Через API
                      можно передать только URL и позицию, без кастомного оформления.
                    </p>
                  </>
                )}
                {area.kind === "location" && (
                  <div className="grid gap-2">
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="number"
                        step="any"
                        value={area.latitude ?? ""}
                        disabled={disabled}
                        onChange={(event) =>
                          patchArea(area.id, { latitude: Number(event.target.value) })
                        }
                        placeholder="Широта"
                        className="rounded border border-border px-2 py-1.5 text-xs"
                      />
                      <input
                        type="number"
                        step="any"
                        value={area.longitude ?? ""}
                        disabled={disabled}
                        onChange={(event) =>
                          patchArea(area.id, { longitude: Number(event.target.value) })
                        }
                        placeholder="Долгота"
                        className="rounded border border-border px-2 py-1.5 text-xs"
                      />
                    </div>
                    <input
                      value={area.address?.city ?? ""}
                      disabled={disabled}
                      onChange={(event) =>
                        patchArea(area.id, {
                          address: { ...area.address, country_code: "RU", city: event.target.value },
                        })
                      }
                      placeholder="Город"
                      className="rounded border border-border px-2 py-1.5 text-xs"
                    />
                    <input
                      value={area.address?.street ?? ""}
                      disabled={disabled}
                      onChange={(event) =>
                        patchArea(area.id, {
                          address: { ...area.address, country_code: "RU", street: event.target.value },
                        })
                      }
                      placeholder="Улица"
                      className="rounded border border-border px-2 py-1.5 text-xs"
                    />
                  </div>
                )}
                {area.kind === "suggested_reaction" && (
                  <div className="space-y-2">
                    <div className="flex flex-wrap gap-1">
                      {TELEGRAM_STORY_REACTION_EMOJIS.slice(0, 24).map((emoji) => (
                        <button
                          key={emoji}
                          type="button"
                          disabled={disabled}
                          onClick={() => patchArea(area.id, { reaction_emoji: emoji })}
                          className={cn(
                            "rounded px-1.5 py-0.5 text-base hover:bg-zinc-100",
                            area.reaction_emoji === emoji && "bg-accent/15 ring-1 ring-accent",
                          )}
                        >
                          {emoji}
                        </button>
                      ))}
                    </div>
                    <select
                      value={area.reaction_emoji ?? "❤"}
                      disabled={disabled}
                      onChange={(event) =>
                        patchArea(area.id, { reaction_emoji: event.target.value })
                      }
                      className="w-full rounded border border-border px-2 py-1.5 text-xs"
                    >
                      {TELEGRAM_STORY_REACTION_EMOJIS.map((emoji) => (
                        <option key={emoji} value={emoji}>
                          {emoji}
                        </option>
                      ))}
                    </select>
                    <label className="flex items-center gap-2 text-xs">
                      <input
                        type="checkbox"
                        checked={Boolean(area.reaction_dark)}
                        disabled={disabled}
                        onChange={(event) =>
                          patchArea(area.id, { reaction_dark: event.target.checked })
                        }
                      />
                      Тёмная тема
                    </label>
                    <label className="flex items-center gap-2 text-xs">
                      <input
                        type="checkbox"
                        checked={Boolean(area.reaction_flipped)}
                        disabled={disabled}
                        onChange={(event) =>
                          patchArea(area.id, { reaction_flipped: event.target.checked })
                        }
                      />
                      Отразить
                    </label>
                  </div>
                )}
                {area.kind === "weather" && (
                  <div className="grid gap-2">
                    <div className="flex flex-wrap gap-1">
                      {TELEGRAM_STORY_WEATHER_EMOJIS.map((emoji) => (
                        <button
                          key={emoji}
                          type="button"
                          disabled={disabled}
                          onClick={() => patchArea(area.id, { weather_emoji: emoji })}
                          className={cn(
                            "rounded px-1.5 py-0.5 text-base hover:bg-zinc-100",
                            area.weather_emoji === emoji && "bg-accent/15 ring-1 ring-accent",
                          )}
                        >
                          {emoji}
                        </button>
                      ))}
                    </div>
                    <input
                      type="number"
                      value={area.temperature ?? 20}
                      disabled={disabled}
                      onChange={(event) =>
                        patchArea(area.id, { temperature: Number(event.target.value) })
                      }
                      className="rounded border border-border px-2 py-1.5 text-xs"
                    />
                  </div>
                )}
                <div className="mt-2 grid grid-cols-2 gap-2 text-[11px]">
                  <label>
                    X, %
                    <input
                      type="number"
                      min={0}
                      max={100}
                      step={0.1}
                      disabled={disabled}
                      value={area.position.x_percentage}
                      onChange={(event) =>
                        patchArea(area.id, {
                          position: {
                            ...area.position,
                            x_percentage: Number(event.target.value),
                          },
                        })
                      }
                      className="mt-0.5 w-full rounded border border-border px-2 py-1"
                    />
                  </label>
                  <label>
                    Y, %
                    <input
                      type="number"
                      min={0}
                      max={100}
                      step={0.1}
                      disabled={disabled}
                      value={area.position.y_percentage}
                      onChange={(event) =>
                        patchArea(area.id, {
                          position: {
                            ...area.position,
                            y_percentage: Number(event.target.value),
                          },
                        })
                      }
                      className="mt-0.5 w-full rounded border border-border px-2 py-1"
                    />
                  </label>
                  <label>
                    Ширина, %
                    <input
                      type="number"
                      min={1}
                      max={100}
                      step={0.1}
                      disabled={disabled}
                      value={area.position.width_percentage}
                      onChange={(event) =>
                        patchArea(area.id, {
                          position: {
                            ...area.position,
                            width_percentage: Number(event.target.value),
                          },
                        })
                      }
                      className="mt-0.5 w-full rounded border border-border px-2 py-1"
                    />
                  </label>
                  <label>
                    Поворот, °
                    <input
                      type="number"
                      min={0}
                      max={360}
                      disabled={disabled}
                      value={area.position.rotation_angle}
                      onChange={(event) =>
                        patchArea(area.id, {
                          position: {
                            ...area.position,
                            rotation_angle: Number(event.target.value),
                          },
                        })
                      }
                      className="mt-0.5 w-full rounded border border-border px-2 py-1"
                    />
                  </label>
                </div>
              </div>
            ))
          )}
          {selected && (
            <p className="text-[11px] text-muted">
              Перетаскивайте зону на превью, тяните угол для размера, иконку сверху — для поворота.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
