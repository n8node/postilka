"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties, MouseEvent as ReactMouseEvent } from "react";
import {
  Captions,
  Check,
  ChevronDown,
  ChevronUp,
  Copy,
  Crop,
  Expand,
  Film,
  GripVertical,
  Image as ImageIcon,
  Layers3,
  Link2,
  Loader2,
  Magnet,
  Maximize2,
  Mic2,
  MousePointer2,
  Pause,
  Play,
  Plus,
  RotateCcw,
  Save,
  Scissors,
  Search,
  Settings2,
  SlidersHorizontal,
  Sparkles,
  Trash2,
  Volume2,
  VolumeX,
  WandSparkles,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import type { ShortsClip, ShortsCropConfig, ShortsCropKeyframe, ShortsTimedWord } from "@/lib/shorts-api";
import styles from "./ShortsEditorPanel.module.css";

export type ShortsEditorSettings = {
  style: string;
  position: string;
  fontSize: number;
  textColor: string;
  background: string;
  watermark: string;
  safeZone: number;
};

type Props = {
  clips: ShortsClip[];
  draftUrls: Record<string, string>;
  sourceUrl?: string;
  initialSettings: ShortsEditorSettings;
  onSaveCrop?: (clipId: string, config: ShortsCropConfig) => Promise<void>;
  onSaveSettings: (settings: ShortsEditorSettings) => Promise<void>;
  onReorder: (fromIndex: number, toIndex: number) => void;
  onOpenClips: () => void;
  onDeleteClip: (clipId: string) => void;
  timedWords?: ShortsTimedWord[];
};

type Ratio = "9:16" | "1:1" | "16:9";
type LeftTab = "scenes" | "captions";
type RightTab = "visual" | "audio";
type CaptionPreset = "accent" | "minimal" | "classic" | "karaoke";

type SceneSegment = {
  clip: ShortsClip;
  index: number;
  start: number;
  end: number;
  duration: number;
};

const captionPresets: Array<{ id: CaptionPreset; label: string }> = [
  { id: "accent", label: "Акцент" },
  { id: "minimal", label: "Минимум" },
  { id: "classic", label: "Классик" },
  { id: "karaoke", label: "Караоке" },
];

const defaultSettings: ShortsEditorSettings = {
  style: "bold",
  position: "bottom",
  fontSize: 56,
  textColor: "#FFFFFF",
  background: "#101010",
  watermark: "",
  safeZone: 70,
};

const defaultCropConfig: ShortsCropConfig = {
  mode: "manual",
  aspect_ratio: "9:16",
  keyframes: [{ time: 0, center_x: 0.5, center_y: 0.5, scale: 1 }],
};

const sidebarWidthByViewport = { compact: 210, standard: 238, wide: 254 } as const;
const inspectorWidthByViewport = { compact: 250, standard: 286, wide: 304 } as const;

function cropConfigForClip(clip: ShortsClip, ratio: Ratio): ShortsCropConfig {
  const config = clip.crop_config;
  if (!config) return { ...defaultCropConfig, aspect_ratio: ratio, keyframes: [{ ...defaultCropConfig.keyframes[0] }] };
  return { ...config, aspect_ratio: ratio, keyframes: config.keyframes.map((keyframe) => ({ ...keyframe })) };
}

function formatTime(value: number) {
  const seconds = Math.max(0, Math.floor(Number.isFinite(value) ? value : 0));
  return `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;
}

function rangeStyle(value: number): CSSProperties {
  return { "--range-progress": `${Math.max(0, Math.min(100, value))}%` } as CSSProperties;
}

function SceneThumbnail({ src, className }: { src?: string; className: string }) {
  if (!src) return <div className={`${className} ${styles.thumbnailEmpty}`}><Film size={15} /></div>;
  return <video className={className} src={src} muted playsInline preload="metadata" aria-hidden="true" tabIndex={-1} />;
}

export function ShortsEditorPanel({ clips, draftUrls, sourceUrl, initialSettings, onSaveSettings, onSaveCrop, onReorder, onOpenClips, onDeleteClip, timedWords = [] }: Props) {
  const [leftTab, setLeftTab] = useState<LeftTab>("scenes");
  const [rightTab, setRightTab] = useState<RightTab>("visual");
  const [selectedClipId, setSelectedClipId] = useState(clips[0]?.id ?? "");
  const [sidebarBaseWidth, setSidebarBaseWidth] = useState<number>(sidebarWidthByViewport.standard);
  const [sidebarWidth, setSidebarWidth] = useState<number>(sidebarWidthByViewport.standard * 2);
  const [inspectorBaseWidth, setInspectorBaseWidth] = useState<number>(inspectorWidthByViewport.standard);
  const [inspectorWidth, setInspectorWidth] = useState<number>(inspectorWidthByViewport.standard * 2);
  const [ratio, setRatio] = useState<Ratio>("9:16");
  const [showOriginal, setShowOriginal] = useState(false);
  const [cropConfig, setCropConfig] = useState<ShortsCropConfig>(defaultCropConfig);
  const [cropDirty, setCropDirty] = useState(false);
  const [cropSaving, setCropSaving] = useState(false);
  const [captionPreset, setCaptionPreset] = useState<CaptionPreset>(initialSettings.style === "minimal" ? "minimal" : initialSettings.style === "classic" ? "classic" : "accent");
  const [showCaptions, setShowCaptions] = useState(true);
  const [settings, setSettings] = useState<ShortsEditorSettings>({ ...initialSettings });
  const [scale, setScale] = useState(100);
  const [volume, setVolume] = useState(80);
  const [speed, setSpeed] = useState(1);
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(false);
  const [safeZoneVisible, setSafeZoneVisible] = useState(true);
  const [currentTime, setCurrentTime] = useState(0);
  const [videoDuration, setVideoDuration] = useState<number | null>(null);
  const [sourceDimensions, setSourceDimensions] = useState({ width: 16, height: 9 });
  const [videoError, setVideoError] = useState(false);
  const [zoom, setZoom] = useState(62);
  const [snap, setSnap] = useState(true);
  const [query, setQuery] = useState("");
  const [brandingOpen, setBrandingOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const previewRef = useRef<HTMLElement>(null);
  const videoFrameRef = useRef<HTMLDivElement>(null);
  const editorGridRef = useRef<HTMLElement>(null);
  const sidebarResizeRef = useRef<{ pointerId: number } | null>(null);
  const inspectorResizeRef = useRef<{ pointerId: number } | null>(null);
  const cropDragRef = useRef<{ pointerId: number; startX: number; startY: number; centerX: number; centerY: number } | null>(null);
  const timelineRef = useRef<HTMLDivElement>(null);
  const pendingSeekRef = useRef<number | null>(null);
  const dragIndexRef = useRef<number | null>(null);

  const segments = useMemo(() => {
    let offset = 0;
    return clips.map((clip, index): SceneSegment => {
      const duration = Math.max(0.1, clip.end_seconds - clip.start_seconds);
      const segment = { clip, index, start: offset, end: offset + duration, duration };
      offset += duration;
      return segment;
    });
  }, [clips]);
  const totalDuration = segments.at(-1)?.end ?? 0;
  const selectedSegment = segments.find((segment) => segment.clip.id === selectedClipId) ?? segments[0];
  const selectedClip = selectedSegment?.clip;
  const selectedUrl = selectedClip ? draftUrls[selectedClip.id] : undefined;
  const previewUrl = sourceUrl || selectedUrl;
  const selectedDuration = selectedSegment?.duration ?? videoDuration ?? 0;
  const timelineTime = (selectedSegment?.start ?? 0) + Math.min(currentTime, selectedSegment?.duration ?? 0);
  const captionBlocks = useMemo(() => {
    const clipStart = selectedClip?.start_seconds ?? 0;
    const clipEnd = selectedClip?.end_seconds ?? 0;
    const words = timedWords.filter((word) => word.end > clipStart && word.start < clipEnd);
    const blocks: ShortsTimedWord[][] = [];
    for (const word of words) {
      const block = blocks.at(-1);
      if (!block || word.end - block[0].start > 8) blocks.push([word]);
      else block.push(word);
    }
    return blocks;
  }, [timedWords, selectedClip]);
  const activeCaptionBlock = useMemo(() => {
    const absoluteTime = (selectedClip?.start_seconds ?? 0) + currentTime;
    if (!captionBlocks.length) return [];
    const containing = captionBlocks.find((block) => absoluteTime >= block[0].start && absoluteTime < block.at(-1)!.end);
    if (containing) return containing;
    return captionBlocks.find((block) => absoluteTime < block[0].start) ?? captionBlocks.at(-1)!;
  }, [captionBlocks, currentTime, selectedClip]);
  const activeWordIndex = useMemo(() => {
    const absoluteTime = (selectedClip?.start_seconds ?? 0) + currentTime;
    return activeCaptionBlock.findIndex((word) => absoluteTime >= word.start && absoluteTime < word.end);
  }, [activeCaptionBlock, currentTime, selectedClip]);
  const filteredSegments = useMemo(() => segments.filter((segment) => segment.clip.transcript_text.toLowerCase().includes(query.trim().toLowerCase())), [segments, query]);
  const rulerLabels = useMemo(() => Array.from({ length: 7 }, (_, index) => formatTime((totalDuration * index) / 6)), [totalDuration]);

  useEffect(() => {
    if (!segments.length) {
      setSelectedClipId("");
      return;
    }
    if (!segments.some((segment) => segment.clip.id === selectedClipId)) setSelectedClipId(segments[0].clip.id);
  }, [segments, selectedClipId]);

  useEffect(() => {
    setPlaying(false);
    setVideoDuration(null);
    setVideoError(false);
  }, [selectedClipId]);

  useEffect(() => {
    const updateSidebarWidth = () => {
      const baseWidth = window.innerWidth >= 1500
        ? sidebarWidthByViewport.wide
        : window.innerWidth <= 1250
          ? sidebarWidthByViewport.compact
          : sidebarWidthByViewport.standard;
      setSidebarBaseWidth(baseWidth);
      setSidebarWidth(baseWidth * 2);
      const inspectorBaseWidth = window.innerWidth >= 1500
        ? inspectorWidthByViewport.wide
        : window.innerWidth <= 1250
          ? inspectorWidthByViewport.compact
          : inspectorWidthByViewport.standard;
      setInspectorBaseWidth(inspectorBaseWidth);
      setInspectorWidth(inspectorBaseWidth * 2);
    };
    updateSidebarWidth();
    window.addEventListener("resize", updateSidebarWidth);
    return () => window.removeEventListener("resize", updateSidebarWidth);
  }, []);

  useEffect(() => {
    if (!selectedClip) return;
    const next = cropConfigForClip(selectedClip, ratio);
    setCropConfig(next);
    setCropDirty(false);
  }, [selectedClipId, selectedClip, ratio]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    video.volume = volume / 100;
    video.muted = muted;
  }, [volume, muted, selectedUrl]);

  useEffect(() => {
    if (videoRef.current) videoRef.current.playbackRate = speed;
  }, [speed, selectedUrl]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement;
      if (["INPUT", "TEXTAREA", "SELECT", "BUTTON"].includes(target.tagName) || target.isContentEditable) return;
      if (event.code === "Space") {
        event.preventDefault();
        void togglePlayback();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  });

  function selectScene(clipId: string, time = 0) {
    pendingSeekRef.current = time;
    setCurrentTime(time);
    if (clipId === selectedClipId && videoRef.current) {
      videoRef.current.currentTime = (selectedClip?.start_seconds ?? 0) + time;
      return;
    }
    setSelectedClipId(clipId);
  }

  function currentCropKeyframe(): ShortsCropKeyframe {
    const points = [...cropConfig.keyframes].sort((a, b) => a.time - b.time);
    if (!points.length) return { time: 0, center_x: 0.5, center_y: 0.5, scale: 1 };
    const previous = [...points].reverse().find((point) => point.time <= currentTime) ?? points[0];
    const next = points.find((point) => point.time >= currentTime) ?? previous;
    if (next.time <= previous.time) return previous;
    const progress = (currentTime - previous.time) / (next.time - previous.time);
    return {
      time: currentTime,
      center_x: previous.center_x + (next.center_x - previous.center_x) * progress,
      center_y: previous.center_y + (next.center_y - previous.center_y) * progress,
      scale: previous.scale + (next.scale - previous.scale) * progress,
    };
  }

  function cropOverlayStyle(keyframe: ShortsCropKeyframe): CSSProperties {
    const outputAspect = ratio === "9:16" ? 9 / 16 : ratio === "1:1" ? 1 : 16 / 9;
    const sourceAspect = sourceDimensions.width / sourceDimensions.height;
    const cropWidth = (sourceAspect >= outputAspect ? outputAspect / sourceAspect : 1) / Math.max(0.5, keyframe.scale);
    const cropHeight = (sourceAspect >= outputAspect ? 1 : sourceAspect / outputAspect) / Math.max(0.5, keyframe.scale);
    return {
      left: `${keyframe.center_x * 100}%`,
      top: `${keyframe.center_y * 100}%`,
      width: `${Math.min(1, cropWidth) * 100}%`,
      height: `${Math.min(1, cropHeight) * 100}%`,
      transform: "translate(-50%, -50%)",
    };
  }

  function updateCropPosition(centerX: number, centerY: number) {
    const current = currentCropKeyframe();
    const next = { ...current, time: currentTime, center_x: Math.max(0, Math.min(1, centerX)), center_y: Math.max(0, Math.min(1, centerY)) };
    setCropConfig((config) => ({ ...config, mode: "manual", aspect_ratio: ratio, keyframes: [...config.keyframes.filter((point) => Math.abs(point.time - currentTime) > 0.02), next].sort((a, b) => a.time - b.time) }));
    setCropDirty(true);
  }

  async function persistCrop(nextConfig: ShortsCropConfig) {
    if (!selectedClip || !onSaveCrop) return;
    setCropSaving(true);
    try {
      await onSaveCrop(selectedClip.id, nextConfig);
      setCropDirty(false);
    } finally {
      setCropSaving(false);
    }
  }

  function addCropKeyframe() {
    const current = currentCropKeyframe();
    const nextConfig = { ...cropConfig, mode: "manual" as const, aspect_ratio: ratio, keyframes: [...cropConfig.keyframes.filter((point) => Math.abs(point.time - currentTime) > 0.02), { ...current, time: currentTime }].sort((a, b) => a.time - b.time) };
    setCropConfig(nextConfig);
    void persistCrop(nextConfig);
  }

  function selectCropKeyframe(keyframe: ShortsCropKeyframe) {
    setCurrentTime(Math.max(0, Math.min(selectedSegment?.duration ?? 0, keyframe.time)));
    if (videoRef.current) {
      videoRef.current.currentTime = (selectedClip?.start_seconds ?? 0) + keyframe.time;
    }
  }

  function removeCropKeyframe(time: number) {
    const nextConfig = { ...cropConfig, keyframes: cropConfig.keyframes.filter((keyframe) => Math.abs(keyframe.time - time) > 0.02) };
    setCropConfig(nextConfig);
    void persistCrop(nextConfig);
  }

  function handleCropPointerDown(event: React.PointerEvent<HTMLDivElement>) {
    const current = currentCropKeyframe();
    cropDragRef.current = { pointerId: event.pointerId, startX: event.clientX, startY: event.clientY, centerX: current.center_x, centerY: current.center_y };
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function handleCropPointerMove(event: React.PointerEvent<HTMLDivElement>) {
    const drag = cropDragRef.current;
    const frame = videoFrameRef.current;
    if (!drag || !frame) return;
    const rect = frame.getBoundingClientRect();
    updateCropPosition(drag.centerX + (event.clientX - drag.startX) / rect.width, drag.centerY + (event.clientY - drag.startY) / rect.height);
  }

  function handleCropPointerUp() {
    cropDragRef.current = null;
  }

  async function togglePlayback() {
    const video = videoRef.current;
    if (!video || !previewUrl) return;
    if (video.paused) {
      try {
        await video.play();
      } catch {
        setPlaying(false);
      }
    } else {
      video.pause();
    }
  }

  function seekVideo(time: number) {
    const next = Math.max(0, Math.min(selectedDuration, time));
    if (videoRef.current) videoRef.current.currentTime = next;
    setCurrentTime(next);
  }

  function handleVideoMetadata() {
    const video = videoRef.current;
    if (!video) return;
    if (Number.isFinite(video.duration) && video.duration > 0) setVideoDuration(video.duration);
    if (video.videoWidth > 0 && video.videoHeight > 0) setSourceDimensions({ width: video.videoWidth, height: video.videoHeight });
    video.playbackRate = speed;
    video.volume = volume / 100;
    video.muted = muted;
    if (pendingSeekRef.current !== null) {
      const requested = (selectedClip?.start_seconds ?? 0) + pendingSeekRef.current;
      video.currentTime = Math.min(requested, Number.isFinite(video.duration) ? video.duration : requested);
      pendingSeekRef.current = null;
    }
  }

  function seekTimeline(event: ReactMouseEvent<HTMLDivElement>) {
    const rect = timelineRef.current?.getBoundingClientRect();
    if (!rect || !totalDuration) return;
    let next = ((event.clientX - rect.left) / rect.width) * totalDuration;
    if (snap) {
      const points = segments.flatMap((segment) => [segment.start, segment.end]);
      const nearest = points.reduce((best, point) => Math.abs(point - next) < Math.abs(best - next) ? point : best, points[0]);
      if (Math.abs(nearest - next) <= totalDuration * 0.015) next = nearest;
    }
    const segment = segments.find((item) => next >= item.start && next <= item.end) ?? segments.at(-1);
    if (segment) selectScene(segment.clip.id, Math.max(0, Math.min(segment.duration, next - segment.start)));
  }

  function handleReorder(fromIndex: number, toIndex: number) {
    if (fromIndex === toIndex || fromIndex < 0 || toIndex < 0 || fromIndex >= clips.length || toIndex >= clips.length) return;
    onReorder(fromIndex, toIndex);
  }

  function setSidebarWidthFromPointer(clientX: number) {
    const grid = editorGridRef.current;
    if (!grid) return;
    const rect = grid.getBoundingClientRect();
    const nextWidth = clientX - rect.left;
    setSidebarWidth(Math.max(sidebarBaseWidth, Math.min(sidebarBaseWidth * 3.5, nextWidth)));
  }

  function handleSidebarResizeStart(event: React.PointerEvent<HTMLDivElement>) {
    sidebarResizeRef.current = { pointerId: event.pointerId };
    event.currentTarget.setPointerCapture(event.pointerId);
    event.preventDefault();
  }

  function handleSidebarResizeMove(event: React.PointerEvent<HTMLDivElement>) {
    if (!sidebarResizeRef.current) return;
    setSidebarWidthFromPointer(event.clientX);
  }

  function handleSidebarResizeEnd() {
    sidebarResizeRef.current = null;
  }

  function handleSidebarResizeKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight" && event.key !== "Home" && event.key !== "End") return;
    event.preventDefault();
    const step = event.shiftKey ? 40 : 10;
    const nextWidth = event.key === "Home"
      ? sidebarBaseWidth
      : event.key === "End"
        ? sidebarBaseWidth * 3.5
        : sidebarWidth + (event.key === "ArrowRight" ? step : -step);
    setSidebarWidth(Math.max(sidebarBaseWidth, Math.min(sidebarBaseWidth * 3.5, nextWidth)));
  }

  function setInspectorWidthFromPointer(clientX: number) {
    const grid = editorGridRef.current;
    if (!grid) return;
    const rect = grid.getBoundingClientRect();
    const nextWidth = rect.right - clientX;
    setInspectorWidth(Math.max(inspectorBaseWidth, Math.min(inspectorBaseWidth * 3.5, nextWidth)));
  }

  function handleInspectorResizeStart(event: React.PointerEvent<HTMLDivElement>) {
    inspectorResizeRef.current = { pointerId: event.pointerId };
    event.currentTarget.setPointerCapture(event.pointerId);
    event.preventDefault();
  }

  function handleInspectorResizeMove(event: React.PointerEvent<HTMLDivElement>) {
    if (!inspectorResizeRef.current) return;
    setInspectorWidthFromPointer(event.clientX);
  }

  function handleInspectorResizeEnd() {
    inspectorResizeRef.current = null;
  }

  function handleInspectorResizeKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight" && event.key !== "Home" && event.key !== "End") return;
    event.preventDefault();
    const step = event.shiftKey ? 40 : 10;
    const nextWidth = event.key === "Home"
      ? inspectorBaseWidth
      : event.key === "End"
        ? inspectorBaseWidth * 3.5
        : inspectorWidth + (event.key === "ArrowLeft" ? step : -step);
    setInspectorWidth(Math.max(inspectorBaseWidth, Math.min(inspectorBaseWidth * 3.5, nextWidth)));
  }

  function updateSettings(patch: Partial<ShortsEditorSettings>) {
    setSettings((current) => ({ ...current, ...patch }));
  }

  function selectPreset(preset: CaptionPreset) {
    setCaptionPreset(preset);
    updateSettings({ style: preset === "karaoke" ? "bold" : preset });
  }

  function resetSettings() {
    setRatio("9:16");
    setScale(100);
    setCaptionPreset("accent");
    setShowCaptions(true);
    setSettings({ ...defaultSettings });
  }

  async function saveSettings() {
    setSaving(true);
    try {
      await onSaveSettings(settings);
    } finally {
      setSaving(false);
    }
  }

  function cycleSpeed() {
    setSpeed((current) => current === 1 ? 1.5 : current === 1.5 ? 2 : 1);
  }

  if (!selectedClip || !selectedSegment) {
    return <div className={styles.workspace}><div className={styles.emptyEditor}><Film size={30} /><h2>Нет фрагментов для редактирования</h2><p>Сначала завершите анализ и выберите фрагменты ролика.</p><button type="button" className={`${styles.button} ${styles.buttonPrimary}`} onClick={onOpenClips}>Перейти к фрагментам</button></div></div>;
  }

  const ratioClass = ratio === "1:1" ? styles.ratio11 : ratio === "16:9" ? styles.ratio169 : "";
  const crop = currentCropKeyframe();
  const captionPositionClass = settings.position === "top" ? styles.captionTop : settings.position === "center" ? styles.captionCenter : "";
  const captionPresetClass = styles[`preset${captionPreset[0].toUpperCase()}${captionPreset.slice(1)}`];

  return (
    <div className={styles.workspace}>
      <section
        className={styles.editorGrid}
        ref={editorGridRef}
        style={{ "--editor-sidebar-width": `${sidebarWidth}px`, "--editor-inspector-width": `${inspectorWidth}px` } as CSSProperties}
      >
        <aside className={`${styles.panel} ${styles.structurePanel}`}>
          <div className={`${styles.segmented} ${styles.panelTabs}`} role="tablist" aria-label="Структура ролика">
            <button type="button" className={leftTab === "scenes" ? styles.active : ""} onClick={() => setLeftTab("scenes")} role="tab" aria-selected={leftTab === "scenes"}><Layers3 size={15} /> Сцены <span>{clips.length}</span></button>
            <button type="button" className={leftTab === "captions" ? styles.active : ""} onClick={() => setLeftTab("captions")} role="tab" aria-selected={leftTab === "captions"}><Captions size={15} /> Текст</button>
          </div>

          {leftTab === "scenes" ? <div className={styles.panelContent}>
            <div className={styles.sectionHeading}><div><strong>Сцены ролика</strong><span>Перетащите, чтобы менять порядок</span></div><button type="button" className={`${styles.iconButton} ${styles.small}`} aria-label="Добавить сцену" onClick={onOpenClips}><Plus size={16} /></button></div>
            <div className={styles.sceneList}>
              {segments.map((segment) => <article
                key={segment.clip.id}
                className={`${styles.sceneCard} ${selectedClip.id === segment.clip.id ? styles.selected : ""}`}
                onClick={() => selectScene(segment.clip.id)}
                draggable
                onDragStart={() => { dragIndexRef.current = segment.index; }}
                onDragOver={(event) => event.preventDefault()}
                onDrop={(event) => { event.preventDefault(); if (dragIndexRef.current !== null) handleReorder(dragIndexRef.current, segment.index); dragIndexRef.current = null; }}
              >
                <GripVertical
                  className={styles.dragHandle}
                  size={15}
                  tabIndex={0}
                  role="button"
                  aria-label={`Изменить порядок сцены ${segment.index + 1}`}
                  onKeyDown={(event) => {
                    if (event.key === "ArrowUp") { event.preventDefault(); handleReorder(segment.index, segment.index - 1); }
                    if (event.key === "ArrowDown") { event.preventDefault(); handleReorder(segment.index, segment.index + 1); }
                  }}
                />
                <SceneThumbnail src={draftUrls[segment.clip.id]} className={styles.sceneThumb} />
                <button type="button" className={styles.sceneInfo} onClick={() => selectScene(segment.clip.id)}><strong>Сцена {segment.index + 1}</strong><span>{formatTime(segment.clip.start_seconds)}–{formatTime(segment.clip.end_seconds)}</span></button>
                <button
                  type="button"
                  className={`${styles.iconButton} ${styles.small} ${styles.sceneDelete}`}
                  aria-label={`Удалить сцену ${segment.index + 1}`}
                  title={clips.length <= 1 ? "В проекте должна остаться хотя бы одна сцена" : "Удалить сцену"}
                  disabled={clips.length <= 1}
                  onMouseDown={(event) => event.stopPropagation()}
                  onClick={(event) => {
                    event.stopPropagation();
                    onDeleteClip(segment.clip.id);
                  }}
                ><Trash2 size={14} /></button>
                {selectedClip.id === segment.clip.id && <Check className={styles.sceneCheck} size={14} />}
              </article>)}
            </div>
            <button type="button" className={`${styles.button} ${styles.buttonSecondary} ${styles.fullWidth}`} onClick={onOpenClips}><Plus size={16} /> Добавить сцену</button>
            <div className={styles.aiNote}><Sparkles size={16} /><div><strong>Подсказка AI</strong><p>Оценка выбранного фрагмента: {selectedClip.score.toFixed(2)}. Проверьте первые секунды — именно они удерживают внимание зрителя.</p></div></div>
          </div> : <div className={`${styles.panelContent} ${styles.captionsContent}`}>
            <label className={styles.searchField}><Search size={15} /><input placeholder="Найти в субтитрах" value={query} onChange={(event) => setQuery(event.target.value)} /></label>
            <div className={styles.captionList}>
              {filteredSegments.map((segment) => <button type="button" key={segment.clip.id} className={`${styles.captionItem} ${selectedClip.id === segment.clip.id ? styles.selected : ""}`} onClick={() => selectScene(segment.clip.id)}><span>{formatTime(segment.clip.start_seconds)} — {formatTime(segment.clip.end_seconds)}</span><p>{segment.clip.transcript_text || "Текст фрагмента не распознан"}</p></button>)}
              {!filteredSegments.length && <div className={styles.emptyState}>Ничего не найдено</div>}
            </div>
            <button type="button" className={`${styles.button} ${styles.buttonSecondary} ${styles.fullWidth}`} onClick={onOpenClips}><Plus size={16} /> Изменить фрагменты</button>
          </div>}
        </aside>

        <div
          className={styles.sidebarResizeHandle}
          role="separator"
          aria-label="Изменить ширину панели сцен и текста"
          aria-orientation="vertical"
          aria-valuemin={sidebarBaseWidth}
          aria-valuemax={sidebarBaseWidth * 3.5}
          aria-valuenow={Math.round(sidebarWidth)}
          tabIndex={0}
          onPointerDown={handleSidebarResizeStart}
          onPointerMove={handleSidebarResizeMove}
          onPointerUp={handleSidebarResizeEnd}
          onPointerCancel={handleSidebarResizeEnd}
          onKeyDown={handleSidebarResizeKeyDown}
        />

        <section className={styles.previewPanel} aria-label="Предпросмотр видео" ref={previewRef}>
          <div className={styles.previewToolbar}><div className={styles.previewTitle}><Film size={16} /><strong>Предпросмотр</strong><span>{showOriginal ? "Оригинал 16:9" : ratio} · {ratio === "9:16" ? "1080 × 1920" : ratio === "1:1" ? "1080 × 1080" : "1920 × 1080"}</span></div><div className={styles.previewActions}><button type="button" className={`${styles.toolbarToggle} ${showOriginal ? styles.active : ""}`} onClick={() => setShowOriginal((value) => !value)} aria-pressed={showOriginal}><Crop size={15} /> Оригинал 16:9</button><button type="button" className={`${styles.toolbarToggle} ${safeZoneVisible ? styles.active : ""}`} onClick={() => setSafeZoneVisible((value) => !value)} aria-pressed={safeZoneVisible}>Безопасные зоны</button><button type="button" className={`${styles.iconButton} ${styles.small}`} aria-label="На весь экран" onClick={() => void previewRef.current?.requestFullscreen?.()}><Maximize2 size={16} /></button></div></div>
          <div className={styles.canvasArea}>
            <div className={`${styles.videoFrame} ${showOriginal ? styles.originalFrame : ratioClass}`} ref={videoFrameRef}>
              {(showOriginal ? sourceUrl : selectedUrl) && !videoError ? <video
                key={selectedClip.id}
                ref={videoRef}
                className={styles.videoPoster}
                src={previewUrl}
                playsInline
                preload="metadata"
                style={showOriginal ? undefined : {
                  objectPosition: `${crop.center_x * 100}% ${crop.center_y * 100}%`,
                  transform: `scale(${(scale / 100) * crop.scale})`,
                }}
                onClick={() => void togglePlayback()}
                onPlay={() => setPlaying(true)}
                onPause={() => setPlaying(false)}
                onEnded={() => setPlaying(false)}
                onTimeUpdate={(event) => setCurrentTime(Math.max(0, event.currentTarget.currentTime - (selectedClip.start_seconds ?? 0)))}
                onLoadedMetadata={handleVideoMetadata}
                onCanPlay={handleVideoMetadata}
                onError={() => setVideoError(true)}
              /> : <div className={styles.previewPlaceholder}>{selectedClip.draft_file_id && !videoError ? <Loader2 className={styles.spinning} size={24} /> : <Film size={28} />}<span>{videoError ? "Не удалось загрузить превью" : selectedClip.draft_file_id ? "Загрузка превью…" : "Превью ещё не готово"}</span></div>}
              {showOriginal && cropConfig.keyframes.length > 0 && <div className={styles.cropOverlay} style={cropOverlayStyle(crop)} onPointerDown={handleCropPointerDown} onPointerMove={handleCropPointerMove} onPointerUp={handleCropPointerUp} onPointerCancel={handleCropPointerUp} role="slider" aria-label="Область кадрирования" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(crop.center_x * 100)} aria-valuetext={`Центр ${Math.round(crop.center_x * 100)}%, ${Math.round(crop.center_y * 100)}%`}><span>Кадр {ratio}</span></div>}
              <div className={styles.videoShade} />
              {safeZoneVisible && <div className={styles.safeZone}><span>Безопасная зона</span></div>}
              {settings.watermark && <div className={styles.videoTitle}>{settings.watermark}</div>}
              {!showOriginal && showCaptions && selectedClip.transcript_text && <div className={`${styles.videoSubtitle} ${captionPresetClass} ${captionPositionClass} ${activeCaptionBlock.length > 0 ? styles.syncedSubtitle : ""}`} style={{ fontSize: `${Math.max(10, Math.round(settings.fontSize / 3.2))}px`, color: settings.textColor, "--caption-background": settings.background } as CSSProperties}>
                {activeCaptionBlock.length > 0 ? activeCaptionBlock.map((word, index) => <span key={`${word.start}-${index}`} className={index === activeWordIndex ? styles.currentCaptionWord : index < activeWordIndex ? styles.spokenCaptionWord : ""}>{word.word}</span>) : selectedClip.transcript_text}
              </div>}
              <button type="button" className={styles.centerPlay} aria-label={playing ? "Поставить на паузу" : "Воспроизвести"} disabled={!previewUrl || videoError} onClick={() => void togglePlayback()}>{playing ? <Pause size={23} fill="currentColor" /> : <Play size={23} fill="currentColor" />}</button>
            </div>
          </div>
          <div className={styles.playerControls}>
            <button type="button" className={styles.playButton} aria-label={playing ? "Пауза" : "Воспроизвести"} disabled={!previewUrl || videoError} onClick={() => void togglePlayback()}>{playing ? <Pause size={17} fill="currentColor" /> : <Play size={17} fill="currentColor" />}</button>
            <span className={styles.timecode}><strong>{formatTime(currentTime)}</strong><i>/</i>{formatTime(selectedDuration)}</span>
            <input className={`${styles.range} ${styles.playerRange}`} aria-label="Позиция воспроизведения" type="range" min="0" max={Math.max(0.1, selectedDuration)} step="0.01" value={Math.min(currentTime, Math.max(0.1, selectedDuration))} disabled={!selectedUrl || videoError} onChange={(event) => seekVideo(Number(event.target.value))} style={rangeStyle((currentTime / Math.max(0.1, selectedDuration)) * 100)} />
            <button type="button" className={`${styles.iconButton} ${styles.small}`} aria-label={muted ? "Включить звук" : "Выключить звук"} onClick={() => setMuted((value) => !value)}>{muted ? <VolumeX size={17} /> : <Volume2 size={17} />}</button>
            <button type="button" className={styles.speedButton} onClick={cycleSpeed}>{speed}×</button>
            <button type="button" className={`${styles.iconButton} ${styles.small}`} aria-label="Развернуть видео" onClick={() => void videoFrameRef.current?.requestFullscreen?.()}><Expand size={16} /></button>
          </div>
        </section>

        <div
          className={styles.sidebarResizeHandle}
          role="separator"
          aria-label="Изменить ширину панели настроек"
          aria-orientation="vertical"
          aria-valuemin={inspectorBaseWidth}
          aria-valuemax={inspectorBaseWidth * 3.5}
          aria-valuenow={Math.round(inspectorWidth)}
          tabIndex={0}
          onPointerDown={handleInspectorResizeStart}
          onPointerMove={handleInspectorResizeMove}
          onPointerUp={handleInspectorResizeEnd}
          onPointerCancel={handleInspectorResizeEnd}
          onKeyDown={handleInspectorResizeKeyDown}
        />

        <aside className={`${styles.panel} ${styles.inspectorPanel}`}>
          <div className={styles.inspectorHeader}><div><Settings2 size={17} /><strong>Настройки</strong></div><button type="button" className={`${styles.iconButton} ${styles.small}`} aria-label="Сбросить настройки" onClick={resetSettings}><RotateCcw size={15} /></button></div>
          <div className={`${styles.segmented} ${styles.inspectorTabs}`} role="tablist" aria-label="Тип настроек"><button type="button" className={rightTab === "visual" ? styles.active : ""} onClick={() => setRightTab("visual")} role="tab" aria-selected={rightTab === "visual"}><SlidersHorizontal size={14} /> Изображение</button><button type="button" className={rightTab === "audio" ? styles.active : ""} onClick={() => setRightTab("audio")} role="tab" aria-selected={rightTab === "audio"}><Mic2 size={14} /> Звук</button></div>

          {rightTab === "visual" ? <div className={styles.inspectorScroll}>
            <section className={styles.settingSection}>
              <div className={styles.settingTitle}><strong>Формат видео</strong><span>{ratio === "9:16" ? "Вертикальный" : ratio === "1:1" ? "Квадратный" : "Горизонтальный"}</span></div>
              <div className={styles.ratioOptions}>{(["9:16", "1:1", "16:9"] as Ratio[]).map((item) => <button type="button" key={item} className={ratio === item ? styles.active : ""} onClick={() => setRatio(item)}><i className={`${styles.ratioIcon} ${item === "9:16" ? styles.ratioIcon916 : item === "1:1" ? styles.ratioIcon11 : styles.ratioIcon169}`} />{item}</button>)}</div>
              <label className={styles.rangeLabel}><span>Масштаб</span><output>{scale}%</output></label>
              <input className={styles.range} type="range" aria-label="Масштаб видео" min="80" max="140" value={scale} onChange={(event) => setScale(Number(event.target.value))} style={rangeStyle(((scale - 80) / 60) * 100)} />
              <button type="button" className={styles.textAction} onClick={() => setScale(100)}><WandSparkles size={14} /> Заполнить кадр автоматически</button>
              <div className={styles.cropHint}>{showOriginal ? "Перетаскивайте рамку на исходном 16:9 видео" : "Включите «Оригинал 16:9», чтобы настроить область кадрирования"}</div>
              <div className={styles.cropModes} role="group" aria-label="Режим кадрирования">
                <button type="button" className={cropConfig.mode === "manual" ? styles.active : ""} onClick={() => { setCropConfig((config) => ({ ...config, mode: "manual" })); setCropDirty(true); }}>Вручную</button>
                <button type="button" className={cropConfig.mode === "auto" ? styles.active : ""} onClick={() => { setCropConfig((config) => ({ ...config, mode: "auto", keyframes: [{ ...currentCropKeyframe(), time: 0, center_x: 0.5, center_y: 0.5 }] })); setCropDirty(true); }}>Авто (центр)</button>
              </div>
              <button type="button" className={styles.textAction} onClick={addCropKeyframe}><Plus size={14} /> Добавить точку кадрирования на {formatTime(currentTime)}</button>
              <div className={styles.cropKeyframes} aria-label="Сохранённые точки кадрирования">
                <div className={styles.cropKeyframesHeader}><strong>Точки кадрирования</strong><span>{cropConfig.keyframes.length}</span></div>
                {[...cropConfig.keyframes].sort((a, b) => a.time - b.time).map((keyframe) => <div className={styles.cropKeyframe} key={`${keyframe.time}-${keyframe.center_x}-${keyframe.center_y}`}>
                  <button type="button" className={styles.cropKeyframeSelect} onClick={() => selectCropKeyframe(keyframe)}>
                    <span className={styles.cropKeyframeDot} />
                    <span><strong>{formatTime(keyframe.time)}</strong><small>Центр {Math.round(keyframe.center_x * 100)}% · масштаб {Math.round(keyframe.scale * 100)}%</small></span>
                  </button>
                  <button type="button" className={styles.cropKeyframeDelete} aria-label={`Удалить точку кадрирования на ${formatTime(keyframe.time)}`} onClick={() => removeCropKeyframe(keyframe.time)}><Trash2 size={13} /></button>
                </div>)}
                <p className={styles.cropKeyframesHint}>Переместите рамку в нужный момент и добавьте точку. Между точками положение плавно меняется.</p>
              </div>
              {cropSaving && <div className={styles.cropSavingHint}><Loader2 size={12} className={styles.spinning} /> Сохраняем точки…</div>}
            </section>

            <section className={styles.settingSection}>
              <div className={styles.settingTitle}><strong>Субтитры</strong><label className={styles.switchLabel}><input type="checkbox" checked={showCaptions} onChange={(event) => setShowCaptions(event.target.checked)} aria-label="Показывать субтитры" /><span className={styles.switch} /></label></div>
              <div className={styles.fieldLabel}>Стиль</div>
              <div className={styles.presetGrid}>{captionPresets.map((preset) => <button type="button" key={preset.id} className={`${styles.captionPreset} ${styles[`sample${preset.id[0].toUpperCase()}${preset.id.slice(1)}`]} ${captionPreset === preset.id ? styles.active : ""}`} onClick={() => selectPreset(preset.id)}><span>Звоните <b>смело</b></span><small>{preset.label}</small></button>)}</div>
              <label className={styles.rangeLabel}><span>Размер текста</span><output>{settings.fontSize}</output></label>
              <input className={styles.range} type="range" aria-label="Размер текста субтитров" min="36" max="76" value={settings.fontSize} onChange={(event) => updateSettings({ fontSize: Number(event.target.value) })} style={rangeStyle(((settings.fontSize - 36) / 40) * 100)} />
            </section>

            <section className={`${styles.settingSection} ${styles.compactSection}`}>
              <button type="button" className={styles.accordionButton} onClick={() => setBrandingOpen((value) => !value)} aria-expanded={brandingOpen}><span><ImageIcon size={16} /> Заголовок и брендинг</span>{brandingOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}</button>
              {brandingOpen && <div className={styles.brandingFields}>
                <label>Текст на видео<input value={settings.watermark} onChange={(event) => updateSettings({ watermark: event.target.value })} placeholder="Например, @postilka" /></label>
                <span>Положение субтитров</span>
                <div className={styles.positionOptions}>{[["top", "Сверху"], ["center", "По центру"], ["bottom", "Снизу"]].map(([value, label]) => <button type="button" key={value} className={settings.position === value ? styles.active : ""} onClick={() => updateSettings({ position: value })}>{label}</button>)}</div>
                <div className={styles.colorFields}><label>Текст<input type="color" value={settings.textColor} onChange={(event) => updateSettings({ textColor: event.target.value })} /></label><label>Обводка<input type="color" value={settings.background} onChange={(event) => updateSettings({ background: event.target.value })} /></label></div>
                <label className={styles.rangeLabel}><span>Отступ безопасной зоны</span><output>{settings.safeZone}</output></label>
                <input className={styles.range} type="range" aria-label="Отступ безопасной зоны" min="0" max="300" value={settings.safeZone} onChange={(event) => updateSettings({ safeZone: Number(event.target.value) })} style={rangeStyle((settings.safeZone / 300) * 100)} />
              </div>}
            </section>
          </div> : <div className={styles.inspectorScroll}>
            <section className={styles.settingSection}><div className={styles.settingTitle}><strong>Громкость</strong><output>{muted ? 0 : volume}%</output></div><input className={styles.range} aria-label="Громкость" type="range" min="0" max="100" value={muted ? 0 : volume} onChange={(event) => { setVolume(Number(event.target.value)); setMuted(false); }} style={rangeStyle(muted ? 0 : volume)} /><button type="button" className={`${styles.button} ${styles.buttonSecondary} ${styles.fullWidth}`} onClick={() => setMuted((value) => !value)}>{muted ? <Volume2 size={16} /> : <VolumeX size={16} />}{muted ? "Включить звук" : "Выключить звук"}</button></section>
            <section className={styles.settingSection}><div className={styles.settingTitle}><strong>Скорость видео</strong><span>{speed}×</span></div><div className={`${styles.ratioOptions} ${styles.speedOptions}`}>{[0.5, 1, 1.5, 2].map((item) => <button type="button" key={item} className={speed === item ? styles.active : ""} onClick={() => setSpeed(item)}>{item}×</button>)}</div></section>
            <section className={styles.settingSection}><div className={styles.audioClean}><Sparkles size={17} /><div><strong>Улучшение речи</strong><p>Автоматическая очистка звука будет доступна в следующих версиях редактора.</p></div></div></section>
          </div>}
          {rightTab === "visual" && <div className={styles.inspectorFooter}><button type="button" className={`${styles.button} ${styles.buttonPrimary} ${styles.fullWidth}`} disabled={saving} onClick={() => void saveSettings()}>{saving ? <Loader2 size={15} className={styles.spinning} /> : <Save size={15} />}{saving ? "Сохранение…" : "Сохранить и обновить превью"}</button></div>}
        </aside>
      </section>

      <section className={`${styles.panel} ${styles.timelinePanel}`}>
        <div className={styles.timelineToolbar}>
          <div className={styles.timelineTitle}><strong>Таймлайн</strong><span>{formatTime(totalDuration)} · {clips.length} {clips.length === 1 ? "сцена" : "сцены"}</span></div>
          <div className={styles.editTools}><button type="button" className={`${styles.toolButton} ${styles.active}`}><MousePointer2 size={15} /> Выбор</button><button type="button" className={styles.toolButton} disabled title="Разделение сцен будет доступно в следующих версиях"><Scissors size={15} /> Разделить <kbd>S</kbd></button><button type="button" className={styles.toolIcon} aria-label="Дублировать сцену" disabled title="Дублирование сцен будет доступно в следующих версиях"><Copy size={15} /></button><button type="button" className={`${styles.toolIcon} ${styles.danger}`} aria-label="Удалить выбранную сцену" disabled={clips.length <= 1} title={clips.length <= 1 ? "В проекте должна остаться хотя бы одна сцена" : "Удалить выбранную сцену"} onClick={() => onDeleteClip(selectedClip.id)}><Trash2 size={15} /></button><div className={styles.toolSeparator} /><button type="button" className={`${styles.toolIcon} ${snap ? styles.active : ""}`} aria-label="Привязка к сегментам" aria-pressed={snap} onClick={() => setSnap((value) => !value)}><Magnet size={16} /></button></div>
          <div className={styles.zoomControl}><ZoomOut size={14} /><input className={styles.range} aria-label="Масштаб таймлайна" type="range" min="30" max="100" value={zoom} onChange={(event) => setZoom(Number(event.target.value))} style={rangeStyle(((zoom - 30) / 70) * 100)} /><ZoomIn size={15} /><span>{zoom}%</span></div>
        </div>
        <div className={styles.timelineBody}>
          <div className={styles.trackLabels}><div className={styles.rulerSpacer} /><div><Film size={14} /> Видео</div><div><Crop size={14} /> Кадрирование</div><div><Volume2 size={14} /> Аудио</div><div><Captions size={14} /> Субтитры</div></div>
          <div className={styles.tracksScroll}>
            <div className={styles.tracksContent} style={{ width: `${Math.max(100, zoom + 38)}%` }}>
              <div className={styles.timeRuler}>{rulerLabels.map((time, index) => <span key={`${time}-${index}`}>{time}</span>)}</div>
              <div className={styles.tracksClickArea} ref={timelineRef} onClick={seekTimeline}>
                <div className={`${styles.track} ${styles.videoTrack}`}>{segments.map((segment) => <button type="button" key={segment.clip.id} className={`${styles.videoClip} ${selectedClip.id === segment.clip.id ? styles.selected : ""}`} style={{ width: `${(segment.duration / totalDuration) * 100}%` }} onClick={(event) => { event.stopPropagation(); selectScene(segment.clip.id); }}><SceneThumbnail src={draftUrls[segment.clip.id]} className={styles.trackThumb} /><span className={styles.clipName}>Сцена {segment.index + 1}</span></button>)}</div>
                <div className={`${styles.track} ${styles.cropTrack}`}>{segments.map((segment) => <button type="button" key={segment.clip.id} className={`${styles.cropClip} ${selectedClip.id === segment.clip.id ? styles.selected : ""}`} style={{ width: `${(segment.duration / totalDuration) * 100}%` }} onClick={(event) => { event.stopPropagation(); selectScene(segment.clip.id); }}>{segment.clip.crop_config?.keyframes?.length ?? 0} точек</button>)}</div>
                <div className={styles.track}><div className={styles.audioClip}>{Array.from({ length: 94 }).map((_, index) => <i key={index} style={{ height: `${6 + ((index * 13) % 18)}px` }} />)}</div></div>
                <div className={`${styles.track} ${styles.captionsTrack}`}>{segments.map((segment) => <button type="button" key={segment.clip.id} className={`${styles.captionClip} ${selectedClip.id === segment.clip.id ? styles.selected : ""}`} style={{ left: `${(segment.start / totalDuration) * 100}%`, width: `${(segment.duration / totalDuration) * 100}%` }} onClick={(event) => { event.stopPropagation(); selectScene(segment.clip.id); }}>{segment.clip.transcript_text || `Сцена ${segment.index + 1}`}</button>)}</div>
                <div className={styles.playhead} style={{ left: `${totalDuration ? (timelineTime / totalDuration) * 100 : 0}%` }}><span /></div>
              </div>
            </div>
          </div>
        </div>
        <div className={styles.timelineFooter}><span><kbd>Пробел</kbd> воспроизведение</span><span><Link2 size={13} /> {snap ? "Привязка включена" : "Привязка выключена"}</span><span className={styles.timelineTip}>Нажмите на дорожку, чтобы переместить указатель</span></div>
      </section>
    </div>
  );
}
