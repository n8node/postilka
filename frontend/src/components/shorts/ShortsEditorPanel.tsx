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
import type { ShortsClip } from "@/lib/shorts-api";
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
  initialSettings: ShortsEditorSettings;
  onSaveSettings: (settings: ShortsEditorSettings) => Promise<void>;
  onReorder: (fromIndex: number, toIndex: number) => void;
  onOpenClips: () => void;
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

export function ShortsEditorPanel({ clips, draftUrls, initialSettings, onSaveSettings, onReorder, onOpenClips }: Props) {
  const [leftTab, setLeftTab] = useState<LeftTab>("scenes");
  const [rightTab, setRightTab] = useState<RightTab>("visual");
  const [selectedClipId, setSelectedClipId] = useState(clips[0]?.id ?? "");
  const [ratio, setRatio] = useState<Ratio>("9:16");
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
  const [videoError, setVideoError] = useState(false);
  const [zoom, setZoom] = useState(62);
  const [snap, setSnap] = useState(true);
  const [query, setQuery] = useState("");
  const [brandingOpen, setBrandingOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const previewRef = useRef<HTMLElement>(null);
  const videoFrameRef = useRef<HTMLDivElement>(null);
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
  const selectedDuration = videoDuration ?? selectedSegment?.duration ?? 0;
  const timelineTime = (selectedSegment?.start ?? 0) + Math.min(currentTime, selectedSegment?.duration ?? 0);
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
      videoRef.current.currentTime = time;
      return;
    }
    setSelectedClipId(clipId);
  }

  async function togglePlayback() {
    const video = videoRef.current;
    if (!video || !selectedUrl) return;
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
    video.playbackRate = speed;
    video.volume = volume / 100;
    video.muted = muted;
    if (pendingSeekRef.current !== null) {
      video.currentTime = Math.min(pendingSeekRef.current, Number.isFinite(video.duration) ? video.duration : pendingSeekRef.current);
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
  const captionPositionClass = settings.position === "top" ? styles.captionTop : settings.position === "center" ? styles.captionCenter : "";
  const captionPresetClass = styles[`preset${captionPreset[0].toUpperCase()}${captionPreset.slice(1)}`];

  return (
    <div className={styles.workspace}>
      <section className={styles.editorGrid}>
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

        <section className={styles.previewPanel} aria-label="Предпросмотр видео" ref={previewRef}>
          <div className={styles.previewToolbar}><div className={styles.previewTitle}><Film size={16} /><strong>Предпросмотр</strong><span>{ratio} · {ratio === "9:16" ? "1080 × 1920" : ratio === "1:1" ? "1080 × 1080" : "1920 × 1080"}</span></div><div className={styles.previewActions}><button type="button" className={`${styles.toolbarToggle} ${safeZoneVisible ? styles.active : ""}`} onClick={() => setSafeZoneVisible((value) => !value)} aria-pressed={safeZoneVisible}><Crop size={15} /> Безопасные зоны</button><button type="button" className={`${styles.iconButton} ${styles.small}`} aria-label="На весь экран" onClick={() => void previewRef.current?.requestFullscreen?.()}><Maximize2 size={16} /></button></div></div>
          <div className={styles.canvasArea}>
            <div className={`${styles.videoFrame} ${ratioClass}`} ref={videoFrameRef}>
              {selectedUrl && !videoError ? <video
                key={selectedClip.id}
                ref={videoRef}
                className={styles.videoPoster}
                src={selectedUrl}
                playsInline
                preload="metadata"
                style={{ transform: `scale(${scale / 100})` }}
                onClick={() => void togglePlayback()}
                onPlay={() => setPlaying(true)}
                onPause={() => setPlaying(false)}
                onEnded={() => setPlaying(false)}
                onTimeUpdate={(event) => setCurrentTime(event.currentTarget.currentTime)}
                onLoadedMetadata={handleVideoMetadata}
                onCanPlay={handleVideoMetadata}
                onError={() => setVideoError(true)}
              /> : <div className={styles.previewPlaceholder}>{selectedClip.draft_file_id && !videoError ? <Loader2 className={styles.spinning} size={24} /> : <Film size={28} />}<span>{videoError ? "Не удалось загрузить превью" : selectedClip.draft_file_id ? "Загрузка превью…" : "Превью ещё не готово"}</span></div>}
              <div className={styles.videoShade} />
              {safeZoneVisible && <div className={styles.safeZone}><span>Безопасная зона</span></div>}
              {settings.watermark && <div className={styles.videoTitle}>{settings.watermark}</div>}
              {showCaptions && selectedClip.transcript_text && <div className={`${styles.videoSubtitle} ${captionPresetClass} ${captionPositionClass}`} style={{ fontSize: `${Math.max(10, Math.round(settings.fontSize / 3.2))}px`, color: settings.textColor, "--caption-background": settings.background } as CSSProperties}>{selectedClip.transcript_text}</div>}
              <button type="button" className={styles.centerPlay} aria-label={playing ? "Поставить на паузу" : "Воспроизвести"} disabled={!selectedUrl || videoError} onClick={() => void togglePlayback()}>{playing ? <Pause size={23} fill="currentColor" /> : <Play size={23} fill="currentColor" />}</button>
            </div>
          </div>
          <div className={styles.playerControls}>
            <button type="button" className={styles.playButton} aria-label={playing ? "Пауза" : "Воспроизвести"} disabled={!selectedUrl || videoError} onClick={() => void togglePlayback()}>{playing ? <Pause size={17} fill="currentColor" /> : <Play size={17} fill="currentColor" />}</button>
            <span className={styles.timecode}><strong>{formatTime(currentTime)}</strong><i>/</i>{formatTime(selectedDuration)}</span>
            <input className={`${styles.range} ${styles.playerRange}`} aria-label="Позиция воспроизведения" type="range" min="0" max={Math.max(0.1, selectedDuration)} step="0.01" value={Math.min(currentTime, Math.max(0.1, selectedDuration))} disabled={!selectedUrl || videoError} onChange={(event) => seekVideo(Number(event.target.value))} style={rangeStyle((currentTime / Math.max(0.1, selectedDuration)) * 100)} />
            <button type="button" className={`${styles.iconButton} ${styles.small}`} aria-label={muted ? "Включить звук" : "Выключить звук"} onClick={() => setMuted((value) => !value)}>{muted ? <VolumeX size={17} /> : <Volume2 size={17} />}</button>
            <button type="button" className={styles.speedButton} onClick={cycleSpeed}>{speed}×</button>
            <button type="button" className={`${styles.iconButton} ${styles.small}`} aria-label="Развернуть видео" onClick={() => void videoFrameRef.current?.requestFullscreen?.()}><Expand size={16} /></button>
          </div>
        </section>

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
          <div className={styles.editTools}><button type="button" className={`${styles.toolButton} ${styles.active}`}><MousePointer2 size={15} /> Выбор</button><button type="button" className={styles.toolButton} disabled title="Разделение сцен будет доступно в следующих версиях"><Scissors size={15} /> Разделить <kbd>S</kbd></button><button type="button" className={styles.toolIcon} aria-label="Дублировать сцену" disabled title="Дублирование сцен будет доступно в следующих версиях"><Copy size={15} /></button><button type="button" className={`${styles.toolIcon} ${styles.danger}`} aria-label="Удалить выбранную сцену" disabled title="Удаление сцен будет доступно в следующих версиях"><Trash2 size={15} /></button><div className={styles.toolSeparator} /><button type="button" className={`${styles.toolIcon} ${snap ? styles.active : ""}`} aria-label="Привязка к сегментам" aria-pressed={snap} onClick={() => setSnap((value) => !value)}><Magnet size={16} /></button></div>
          <div className={styles.zoomControl}><ZoomOut size={14} /><input className={styles.range} aria-label="Масштаб таймлайна" type="range" min="30" max="100" value={zoom} onChange={(event) => setZoom(Number(event.target.value))} style={rangeStyle(((zoom - 30) / 70) * 100)} /><ZoomIn size={15} /><span>{zoom}%</span></div>
        </div>
        <div className={styles.timelineBody}>
          <div className={styles.trackLabels}><div className={styles.rulerSpacer} /><div><Film size={14} /> Видео</div><div><Volume2 size={14} /> Аудио</div><div><Captions size={14} /> Субтитры</div></div>
          <div className={styles.tracksScroll}>
            <div className={styles.tracksContent} style={{ width: `${Math.max(100, zoom + 38)}%` }}>
              <div className={styles.timeRuler}>{rulerLabels.map((time, index) => <span key={`${time}-${index}`}>{time}</span>)}</div>
              <div className={styles.tracksClickArea} ref={timelineRef} onClick={seekTimeline}>
                <div className={`${styles.track} ${styles.videoTrack}`}>{segments.map((segment) => <button type="button" key={segment.clip.id} className={`${styles.videoClip} ${selectedClip.id === segment.clip.id ? styles.selected : ""}`} style={{ width: `${(segment.duration / totalDuration) * 100}%` }} onClick={(event) => { event.stopPropagation(); selectScene(segment.clip.id); }}><SceneThumbnail src={draftUrls[segment.clip.id]} className={styles.trackThumb} /><span className={styles.clipName}>Сцена {segment.index + 1}</span></button>)}</div>
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
