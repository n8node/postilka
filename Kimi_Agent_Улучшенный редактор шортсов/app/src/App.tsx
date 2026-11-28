import { useEffect, useMemo, useRef, useState } from 'react'
import {
  ArrowLeft, ArrowRight, Captions, Check, CheckCircle2, ChevronDown,
  CircleHelp, Copy, Crop, Expand, Film,
  GripVertical, Image, Layers3, Link2, Magnet, Maximize2, Mic2,
  MousePointer2, Pause, Play, Plus, Redo2, RotateCcw,
  Scissors, Search, Settings2, SlidersHorizontal, Sparkles, Trash2,
  Undo2, Volume2, VolumeX, WandSparkles, X, ZoomIn, ZoomOut,
} from 'lucide-react'
import '@fontsource/onest/400.css'
import '@fontsource/onest/500.css'
import '@fontsource/onest/600.css'
import '@fontsource/onest/700.css'

type Ratio = '9:16' | '1:1' | '16:9'
type LeftTab = 'scenes' | 'captions'
type RightTab = 'visual' | 'audio'

const subtitles = [
  { id: 1, time: '00:00 — 00:04', start: 0, text: 'Каждый боится звонить,' },
  { id: 2, time: '00:04 — 00:08', start: 4, text: 'пока не поймёт одну вещь' },
  { id: 3, time: '00:08 — 00:12', start: 8, text: 'клиент ждёт вашего звонка' },
]

const initialScenes = [
  { id: 1, title: 'Сцена 1', meta: '00:00–00:12', image: '/host.jpg' },
  { id: 2, title: 'Сцена 2', meta: '00:12–00:30', image: '/scene-interview.jpg' },
]

const steps = ['Исходное видео', 'Фрагменты', 'Редактор', 'Экспорт']

function App() {
  const [leftTab, setLeftTab] = useState<LeftTab>('scenes')
  const [rightTab, setRightTab] = useState<RightTab>('visual')
  const [scenes, setScenes] = useState(initialScenes)
  const [selectedScene, setSelectedScene] = useState(1)
  const [selectedCaption, setSelectedCaption] = useState(2)
  const [ratio, setRatio] = useState<Ratio>('9:16')
  const [captionPreset, setCaptionPreset] = useState('Акцент')
  const [showCaptions, setShowCaptions] = useState(true)
  const [captionSize, setCaptionSize] = useState(56)
  const [scale, setScale] = useState(100)
  const [volume, setVolume] = useState(80)
  const [speed, setSpeed] = useState('1×')
  const [playing, setPlaying] = useState(false)
  const [muted, setMuted] = useState(false)
  const [safeZone, setSafeZone] = useState(true)
  const [currentTime, setCurrentTime] = useState(5)
  const [zoom, setZoom] = useState(62)
  const [snap, setSnap] = useState(true)
  const [query, setQuery] = useState('')
  const [toast, setToast] = useState('')
  const [projectName, setProjectName] = useState('Как не бояться звонить клиентам')
  const exportDialog = useRef<HTMLDialogElement>(null)
  const timelineRef = useRef<HTMLDivElement>(null)

  const filteredCaptions = useMemo(
    () => subtitles.filter((item) => item.text.toLowerCase().includes(query.toLowerCase())),
    [query],
  )

  useEffect(() => {
    if (!toast) return
    const timer = window.setTimeout(() => setToast(''), 2600)
    return () => window.clearTimeout(timer)
  }, [toast])

  useEffect(() => {
    if (!playing) return
    const timer = window.setInterval(() => {
      setCurrentTime((time) => (time >= 12 ? 0 : Math.min(12, time + 0.25)))
    }, 250)
    return () => window.clearInterval(timer)
  }, [playing])

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement
      if (['INPUT', 'TEXTAREA'].includes(target.tagName) || exportDialog.current?.open) return
      if (event.code === 'Space') {
        event.preventDefault()
        setPlaying((value) => !value)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const notify = (message: string) => setToast(message)
  const formatTime = (value: number) => `00:${Math.floor(value).toString().padStart(2, '0')}`

  const addScene = () => {
    const id = Math.max(...scenes.map((scene) => scene.id)) + 1
    setScenes([...scenes, { id, title: `Сцена ${id}`, meta: '00:30–00:42', image: '/scene-product.jpg' }])
    setSelectedScene(id)
    notify('Новая сцена добавлена')
  }

  const removeScene = (id: number) => {
    if (scenes.length === 1) {
      notify('В проекте должна остаться хотя бы одна сцена')
      return
    }
    setScenes(scenes.filter((scene) => scene.id !== id))
    if (selectedScene === id) setSelectedScene(scenes.find((scene) => scene.id !== id)?.id ?? 1)
    notify('Сцена удалена')
  }

  const seekFromPointer = (event: React.MouseEvent<HTMLDivElement>) => {
    const rect = timelineRef.current?.getBoundingClientRect()
    if (!rect) return
    const next = ((event.clientX - rect.left) / rect.width) * 12
    setCurrentTime(Math.max(0, Math.min(12, next)))
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand" aria-label="Postilka">Postilka</div>
        <div className="topbar-divider" />
        <button className="back-link" onClick={() => notify('Возврат к списку фрагментов')}>
          <ArrowLeft size={16} /> Фрагменты
        </button>
        <div className="project-heading">
          <input
            aria-label="Название проекта"
            value={projectName}
            onChange={(event) => setProjectName(event.target.value)}
            onBlur={() => notify('Название проекта сохранено')}
          />
          <span>Shorts Studio</span>
        </div>
        <div className="save-state"><CheckCircle2 size={15} /> Все изменения сохранены</div>
        <div className="history-actions">
          <button className="icon-button" aria-label="Отменить" onClick={() => notify('Последнее действие отменено')}><Undo2 size={17} /></button>
          <button className="icon-button" aria-label="Повторить" onClick={() => notify('Действие восстановлено')}><Redo2 size={17} /></button>
        </div>
        <button className="button button-primary" onClick={() => exportDialog.current?.showModal()}>
          К экспорту <ArrowRight size={17} />
        </button>
      </header>

      <nav className="wizard" aria-label="Этапы создания шортса">
        <div className="wizard-label">НОВЫЙ ШОРТС</div>
        <div className="wizard-steps">
          {steps.map((step, index) => {
            const number = index + 1
            const current = number === 3
            const complete = number < 3
            return (
              <div className={`wizard-step ${current ? 'current' : ''} ${complete ? 'complete' : ''}`} key={step}>
                <span className="step-number">{complete ? <Check size={13} strokeWidth={3} /> : number}</span>
                <span>{step}</span>
                {index < steps.length - 1 && <div className="step-line" />}
              </div>
            )
          })}
        </div>
        <button className="shortcut-link" onClick={() => notify('Пробел — воспроизведение, S — разделить, Delete — удалить')}>
          <CircleHelp size={16} /> Горячие клавиши
        </button>
      </nav>

      <main className="workspace">
        <section className="editor-grid">
          <aside className="panel structure-panel">
            <div className="segmented panel-tabs" role="tablist" aria-label="Структура ролика">
              <button className={leftTab === 'scenes' ? 'active' : ''} onClick={() => setLeftTab('scenes')} role="tab" aria-selected={leftTab === 'scenes'}>
                <Layers3 size={15} /> Сцены <span>{scenes.length}</span>
              </button>
              <button className={leftTab === 'captions' ? 'active' : ''} onClick={() => setLeftTab('captions')} role="tab" aria-selected={leftTab === 'captions'}>
                <Captions size={15} /> Текст
              </button>
            </div>

            {leftTab === 'scenes' ? (
              <div className="panel-content">
                <div className="section-heading">
                  <div><strong>Сцены ролика</strong><span>Перетащите, чтобы менять порядок</span></div>
                  <button className="icon-button small" aria-label="Добавить сцену" onClick={addScene}><Plus size={16} /></button>
                </div>
                <div className="scene-list">
                  {scenes.map((scene) => (
                    <article
                      className={`scene-card ${selectedScene === scene.id ? 'selected' : ''}`}
                      key={scene.id}
                      onClick={() => setSelectedScene(scene.id)}
                    >
                      <GripVertical className="drag-handle" size={15} />
                      <img src={scene.image} alt="" />
                      <button className="scene-info" onClick={() => { setSelectedScene(scene.id); setCurrentTime(scene.id === 1 ? 5 : 0) }}>
                        <strong>{scene.title}</strong>
                        <span>{scene.meta}</span>
                      </button>
                      <button className="scene-delete" aria-label={`Удалить ${scene.title}`} onClick={(event) => { event.stopPropagation(); removeScene(scene.id) }}>
                        <Trash2 size={14} />
                      </button>
                    </article>
                  ))}
                </div>
                <button className="button button-secondary full-width" onClick={addScene}><Plus size={16} /> Добавить сцену</button>
                <div className="ai-note">
                  <Sparkles size={16} />
                  <div><strong>Подсказка AI</strong><p>На 00:05 лучше сменить крупность — зритель дольше удерживает внимание.</p></div>
                </div>
              </div>
            ) : (
              <div className="panel-content captions-content">
                <label className="search-field"><Search size={15} /><input placeholder="Найти в субтитрах" value={query} onChange={(event) => setQuery(event.target.value)} /></label>
                <div className="caption-list">
                  {filteredCaptions.map((caption) => (
                    <button
                      key={caption.id}
                      className={`caption-item ${selectedCaption === caption.id ? 'selected' : ''}`}
                      onClick={() => { setSelectedCaption(caption.id); setCurrentTime(caption.start + 1) }}
                    >
                      <span>{caption.time}</span>
                      <p>{caption.text}</p>
                    </button>
                  ))}
                  {filteredCaptions.length === 0 && <div className="empty-state">Ничего не найдено</div>}
                </div>
                <button className="button button-secondary full-width" onClick={() => notify('Новый сегмент добавлен на отметке 00:12')}><Plus size={16} /> Добавить сегмент</button>
              </div>
            )}
          </aside>

          <section className="preview-panel" aria-label="Предпросмотр видео">
            <div className="preview-toolbar">
              <div className="preview-title"><Film size={16} /><strong>Предпросмотр</strong><span>1080 × 1920</span></div>
              <div className="preview-actions">
                <button className={`toolbar-toggle ${safeZone ? 'active' : ''}`} onClick={() => setSafeZone(!safeZone)} aria-pressed={safeZone}>
                  <Crop size={15} /> Безопасные зоны
                </button>
                <button className="icon-button small" aria-label="На весь экран" onClick={() => { document.querySelector('.preview-panel')?.requestFullscreen?.(); notify('Открыт полноэкранный предпросмотр') }}><Maximize2 size={16} /></button>
              </div>
            </div>
            <div className="canvas-area">
              <div className={`video-frame ratio-${ratio.replace(':', '-')}`}>
                <img className="video-poster" src="/host.jpg" alt="Кадр вертикального видео с ведущей" style={{ transform: `scale(${scale / 100})` }} />
                <div className="video-shade" />
                {safeZone && <div className="safe-zone"><span>Безопасная зона</span></div>}
                <div className="video-title">Как не бояться<br />звонить клиентам</div>
                {showCaptions && <div className={`video-subtitle preset-${captionPreset.toLowerCase()}`} style={{ fontSize: `${Math.round(captionSize / 3.2)}px` }}>
                  пока не поймёт <mark>одну</mark> вещь
                </div>}
                <button className="center-play" aria-label={playing ? 'Поставить на паузу' : 'Воспроизвести'} onClick={() => setPlaying(!playing)}>
                  {playing ? <Pause size={23} fill="currentColor" /> : <Play size={23} fill="currentColor" />}
                </button>
              </div>
            </div>
            <div className="player-controls">
              <button className="play-button" aria-label={playing ? 'Пауза' : 'Воспроизвести'} onClick={() => setPlaying(!playing)}>
                {playing ? <Pause size={17} fill="currentColor" /> : <Play size={17} fill="currentColor" />}
              </button>
              <span className="timecode"><strong>{formatTime(currentTime)}</strong><i>/</i>00:12</span>
              <input
                className="player-range"
                aria-label="Позиция воспроизведения"
                type="range" min="0" max="12" step="0.25" value={currentTime}
                onChange={(event) => setCurrentTime(Number(event.target.value))}
                style={{ '--range-progress': `${(currentTime / 12) * 100}%` } as React.CSSProperties}
              />
              <button className="icon-button small" aria-label={muted ? 'Включить звук' : 'Выключить звук'} onClick={() => setMuted(!muted)}>{muted ? <VolumeX size={17} /> : <Volume2 size={17} />}</button>
              <button className="speed-button" onClick={() => setSpeed(speed === '1×' ? '1.5×' : speed === '1.5×' ? '2×' : '1×')}>{speed}</button>
              <button className="icon-button small" aria-label="Развернуть видео" onClick={() => document.querySelector('.video-frame')?.requestFullscreen?.()}><Expand size={16} /></button>
            </div>
          </section>

          <aside className="panel inspector-panel">
            <div className="inspector-header">
              <div><Settings2 size={17} /><strong>Настройки</strong></div>
              <button className="icon-button small" aria-label="Сбросить настройки" onClick={() => { setRatio('9:16'); setScale(100); setCaptionSize(56); setCaptionPreset('Акцент'); setShowCaptions(true); notify('Настройки сброшены') }}><RotateCcw size={15} /></button>
            </div>
            <div className="segmented inspector-tabs" role="tablist" aria-label="Тип настроек">
              <button className={rightTab === 'visual' ? 'active' : ''} onClick={() => setRightTab('visual')} role="tab" aria-selected={rightTab === 'visual'}><SlidersHorizontal size={14} /> Изображение</button>
              <button className={rightTab === 'audio' ? 'active' : ''} onClick={() => setRightTab('audio')} role="tab" aria-selected={rightTab === 'audio'}><Mic2 size={14} /> Звук</button>
            </div>

            {rightTab === 'visual' ? (
              <div className="inspector-scroll">
                <section className="setting-section">
                  <div className="setting-title"><strong>Формат видео</strong><span>Вертикальный</span></div>
                  <div className="ratio-options">
                    {(['9:16', '1:1', '16:9'] as Ratio[]).map((item) => (
                      <button key={item} className={ratio === item ? 'active' : ''} onClick={() => setRatio(item)}>
                        <i className={`ratio-icon ratio-icon-${item.replace(':', '-')}`} />{item}
                      </button>
                    ))}
                  </div>
                  <label className="range-label"><span>Масштаб</span><output>{scale}%</output></label>
                  <input type="range" min="80" max="140" value={scale} onChange={(event) => setScale(Number(event.target.value))} style={{ '--range-progress': `${((scale - 80) / 60) * 100}%` } as React.CSSProperties} />
                  <button className="text-action" onClick={() => setScale(100)}><WandSparkles size={14} /> Заполнить кадр автоматически</button>
                </section>

                <section className="setting-section">
                  <div className="setting-title"><strong>Субтитры</strong><label className="switch-label"><input type="checkbox" checked={showCaptions} onChange={(event) => setShowCaptions(event.target.checked)} aria-label="Показывать субтитры" /><span className="switch" /></label></div>
                  <div className="field-label">Стиль</div>
                  <div className="preset-grid">
                    {['Акцент', 'Минимум', 'Классик', 'Караоке'].map((preset) => (
                      <button key={preset} className={`caption-preset preset-sample-${preset.toLowerCase()} ${captionPreset === preset ? 'active' : ''}`} onClick={() => setCaptionPreset(preset)}>
                        <span>Звоните <b>смело</b></span><small>{preset}</small>
                      </button>
                    ))}
                  </div>
                  <label className="range-label"><span>Размер текста</span><output>{captionSize}</output></label>
                  <input type="range" min="36" max="76" value={captionSize} onChange={(event) => setCaptionSize(Number(event.target.value))} style={{ '--range-progress': `${((captionSize - 36) / 40) * 100}%` } as React.CSSProperties} />
                </section>

                <section className="setting-section compact-section">
                  <button className="accordion-button" onClick={() => notify('Доступны логотип, фирменный цвет и подпись')}>
                    <span><Image size={16} /> Заголовок и брендинг</span><ChevronDown size={16} />
                  </button>
                </section>
              </div>
            ) : (
              <div className="inspector-scroll">
                <section className="setting-section">
                  <div className="setting-title"><strong>Громкость</strong><output>{muted ? 0 : volume}%</output></div>
                  <input type="range" min="0" max="100" value={muted ? 0 : volume} onChange={(event) => { setVolume(Number(event.target.value)); setMuted(false) }} style={{ '--range-progress': `${muted ? 0 : volume}%` } as React.CSSProperties} />
                  <button className="button button-secondary full-width" onClick={() => setMuted(!muted)}>{muted ? <Volume2 size={16} /> : <VolumeX size={16} />}{muted ? 'Включить звук' : 'Выключить звук'}</button>
                </section>
                <section className="setting-section">
                  <div className="setting-title"><strong>Скорость видео</strong><span>{speed}</span></div>
                  <div className="ratio-options speed-options">
                    {['0.5×', '1×', '1.5×', '2×'].map((item) => <button key={item} className={speed === item ? 'active' : ''} onClick={() => setSpeed(item)}>{item}</button>)}
                  </div>
                </section>
                <section className="setting-section">
                  <div className="audio-clean"><Sparkles size={17} /><div><strong>Улучшение речи</strong><p>Убрать шум и выровнять громкость голоса.</p></div></div>
                  <button className="button button-secondary full-width" onClick={() => notify('Анализ звука запущен')}>Улучшить автоматически</button>
                </section>
              </div>
            )}
          </aside>
        </section>

        <section className="timeline-panel panel">
          <div className="timeline-toolbar">
            <div className="timeline-title"><strong>Таймлайн</strong><span>12 секунд · 2 сцены</span></div>
            <div className="edit-tools">
              <button className="tool-button active" onClick={() => notify('Инструмент выбора активен')}><MousePointer2 size={15} /> Выбор</button>
              <button className="tool-button" onClick={() => notify(`Фрагмент разделён на отметке ${formatTime(currentTime)}`)}><Scissors size={15} /> Разделить <kbd>S</kbd></button>
              <button className="tool-icon" aria-label="Дублировать сцену" onClick={() => { addScene(); notify('Сцена продублирована') }}><Copy size={15} /></button>
              <button className="tool-icon danger" aria-label="Удалить выбранную сцену" onClick={() => removeScene(selectedScene)}><Trash2 size={15} /></button>
              <div className="tool-separator" />
              <button className={`tool-icon ${snap ? 'active' : ''}`} aria-label="Привязка к сегментам" aria-pressed={snap} onClick={() => setSnap(!snap)}><Magnet size={16} /></button>
            </div>
            <div className="zoom-control"><ZoomOut size={14} /><input aria-label="Масштаб таймлайна" type="range" min="30" max="100" value={zoom} onChange={(event) => setZoom(Number(event.target.value))} style={{ '--range-progress': `${((zoom - 30) / 70) * 100}%` } as React.CSSProperties} /><ZoomIn size={15} /><span>{zoom}%</span></div>
          </div>
          <div className="timeline-body">
            <div className="track-labels">
              <div className="ruler-spacer" />
              <div><Film size={14} /> Видео</div>
              <div><Volume2 size={14} /> Аудио</div>
              <div><Captions size={14} /> Субтитры</div>
            </div>
            <div className="tracks-scroll">
              <div className="tracks-content" style={{ width: `${Math.max(100, zoom + 38)}%` }}>
                <div className="time-ruler">
                  {['00:00', '00:02', '00:04', '00:06', '00:08', '00:10', '00:12'].map((time) => <span key={time}>{time}</span>)}
                </div>
                <div className="tracks-click-area" ref={timelineRef} onClick={seekFromPointer}>
                  <div className="track video-track">
                    <div className="video-clip">
                      {['/host.jpg', '/host.jpg', '/scene-interview.jpg', '/host.jpg', '/scene-product.jpg', '/host.jpg', '/scene-store.jpg', '/host.jpg'].map((image, index) => <img key={index} src={image} alt="" />)}
                      <span className="clip-name">Сцена 1 · Основной фрагмент</span>
                    </div>
                  </div>
                  <div className="track audio-track">
                    <div className="audio-clip">{Array.from({ length: 94 }).map((_, index) => <i key={index} style={{ height: `${6 + ((index * 13) % 18)}px` }} />)}</div>
                  </div>
                  <div className="track captions-track">
                    <button className="caption-clip first" onClick={() => { setSelectedCaption(1); setCurrentTime(1) }}>Каждый боится звонить,</button>
                    <button className="caption-clip second selected" onClick={() => { setSelectedCaption(2); setCurrentTime(5) }}>пока не поймёт одну вещь</button>
                    <button className="caption-clip third" onClick={() => { setSelectedCaption(3); setCurrentTime(9) }}>клиент ждёт вашего звонка</button>
                  </div>
                  <div className="playhead" style={{ left: `${(currentTime / 12) * 100}%` }}><span /></div>
                </div>
              </div>
            </div>
          </div>
          <div className="timeline-footer"><span><kbd>Пробел</kbd> воспроизведение</span><span><Link2 size={13} /> {snap ? 'Привязка включена' : 'Привязка выключена'}</span><span className="timeline-tip">Нажмите на дорожку, чтобы переместить указатель</span></div>
        </section>
      </main>

      <dialog className="export-dialog" ref={exportDialog} onClick={(event) => { if (event.target === exportDialog.current) exportDialog.current.close() }}>
        <form method="dialog">
          <div className="dialog-header"><div><span>ШАГ 4 ИЗ 4</span><h2>Всё готово к экспорту</h2></div><button className="icon-button" value="cancel" aria-label="Закрыть"><X size={19} /></button></div>
          <p className="dialog-description">Проверьте основные параметры. На следующем шаге вы сможете скачать видео или сразу запланировать публикацию.</p>
          <div className="export-summary">
            <div><Film size={18} /><span>Формат</span><strong>{ratio} · 1080 × 1920</strong></div>
            <div><Captions size={18} /><span>Субтитры</span><strong>{captionPreset} · встроены</strong></div>
            <div><Volume2 size={18} /><span>Звук</span><strong>{muted ? 'Выключен' : `Оригинал · ${volume}%`}</strong></div>
          </div>
          <label className="publish-check"><input type="checkbox" defaultChecked /><span><strong>Показать варианты публикации</strong><small>Telegram, VK, YouTube Shorts и другие каналы</small></span></label>
          <div className="dialog-actions"><button className="button button-secondary" value="cancel">Вернуться к редактированию</button><button className="button button-primary" value="default" onClick={() => notify('Настройки приняты. Открываем экспорт')}>Продолжить <ArrowRight size={17} /></button></div>
        </form>
      </dialog>

      <div className={`toast ${toast ? 'visible' : ''}`} role="status" aria-live="polite"><CheckCircle2 size={17} />{toast}</div>
    </div>
  )
}

export default App
