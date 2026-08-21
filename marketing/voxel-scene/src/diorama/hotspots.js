import * as THREE from 'three';

// Initial road start — hero and dog on the road opposite the central bus stop
export const JOURNEY_INTRO_VIEW = {
  theta: 0.65,
  phi: 0.88,
  zoom: 0.82,
  tx: 0,
  ty: 12.0,
  tz: 0,
};

// Road journey focus — following hero along the floating skyway
export const JOURNEY_ROAD_VIEW = {
  theta: 0.64,
  phi: 0.82,
  zoom: 0.72,
  tx: 0,
  ty: -6,
  tz: 75,
};

export const DEFAULT_VIEW = {
  theta: 0.65,
  phi: 0.88,
  zoom: 0.82,
  tx: 0,
  ty: 12.0,
  tz: 0,
};

export const HOTSPOTS = [
  {
    cls: 'star',
    label: 'POSTILKA',
    pos: new THREE.Vector3(-13, 31, -40),
    tag: 'ШТАБ ⚡',
    accent: '#334769',
    title: 'Главный ИИ-реактор',
    body: 'Здесь живут нейросети, которые не пьют кофе, не выгорают и не просят отпуск. Они генерируют сотни постов в секунду, пока вы спокойно досматриваете утренний сон!',
    view: { theta: 0.48, phi: 0.68, zoom: 1.4, tx: -13, ty: 17, tz: -36 },
  },
  {
    label: 'TELEGRAM',
    pos: new THREE.Vector3(-47, 16, 10),
    tag: 'МЕССЕНДЖЕР ⭕',
    accent: '#50a7ea',
    title: 'Цех идеальных кружочков',
    body: 'Секретная лаборатория по выпеканию сочных видео-кружочков и кликабельных кнопок. Посты улетают в каналы быстрее, чем Дуров успевает выложить новую цитату!',
    view: { theta: 0.15, phi: 0.68, zoom: 1.45, tx: -47, ty: 12, tz: 10 },
  },
  {
    label: 'VK',
    pos: new THREE.Vector3(-29, 8, 20),
    tag: 'ВКОНТАКТЕ 💙',
    accent: '#4473a8',
    title: 'VK-Телепорт',
    body: 'Прямой рейс в умную ленту ВКонтакте. Мемы, клипы и статьи залетают в рекомендации так бодро, будто алгоритмы VK писались специально под ваш контент!',
    view: { theta: 0.85, phi: 0.82, zoom: 1.5, tx: -29, ty: 6, tz: 20 },
  },
  {
    label: 'SHORTS',
    pos: new THREE.Vector3(-8, 12, 22),
    tag: 'ВИДЕО 🎬',
    accent: '#e62117',
    title: 'Генератор вирусных Shorts',
    body: 'Место, где вертикальные ролики получают +100 к удержанию. Нейросеть генерирует кликабельные заголовки такой силы, что палец зрителя сам тянется поставить лайк!',
    view: { theta: 0.68, phi: 0.84, zoom: 1.55, tx: -8, ty: 7, tz: 22 },
  },
  {
    label: 'ДЗЕН',
    pos: new THREE.Vector3(12, 10, 22),
    tag: 'ЛОНГРИДЫ 📖',
    accent: '#b5824c',
    title: 'Обитель 100% дочитываний',
    body: 'Здесь рождаются статьи, от которых невозможно оторваться даже во время важного созвона. ИИ закручивает сюжет так, что зачитываются даже сами авторы!',
    view: { theta: 0.55, phi: 0.82, zoom: 1.5, tx: 12, ty: 7, tz: 22 },
  },
  {
    label: 'photochka.ru',
    pos: new THREE.Vector3(31, 12, 21),
    tag: 'ВИЗУАЛ 📸',
    accent: '#f58a88',
    title: 'Фабрика идеального кадра',
    body: 'Уголок эстетики и фильтров без цензуры. Превращает даже случайный набросок в сочный арт уровня обложки глянца. Никаких неудачных ракурсов!',
    view: { theta: 0.35, phi: 0.8, zoom: 1.4, tx: 31, ty: 8, tz: 21 },
  },
  {
    label: 'РЕКЛАМА',
    pos: new THREE.Vector3(7.5, 12, -36),
    tag: 'ПРОМО 💰',
    accent: '#e63946',
    title: 'Станок для печати лидов',
    body: 'Цех, превращающий холодную аудиторию в преданных фанатов. Пишет продающие тексты такой мощи, что даже маркетологи конкурентов захотят купить ваш продукт!',
    view: { theta: 0.58, phi: 0.72, zoom: 1.45, tx: 7.5, ty: 10, tz: -36 },
  },
  {
    label: 'КАЛЕНДАРЬ',
    pos: new THREE.Vector3(29, 24, -36),
    tag: 'РАСПИСАНИЕ 📅',
    accent: '#334769',
    title: 'Башня спокойных выходных',
    body: 'Зарядите контент на месяц вперёд и забудьте про дедлайны. Пока вы отдыхаете с семьёй или гладите собаку, посты выходят строго по расписанию!',
    view: { theta: 0.75, phi: 0.65, zoom: 1.35, tx: 29, ty: 16, tz: -36 },
  },
  {
    label: 'MAX BOT',
    pos: new THREE.Vector3(46.5, 10, -5),
    tag: 'РОБОТЫ 🤖',
    accent: '#72cbb7',
    title: 'Робот Макс: Укротитель рутины',
    body: 'Неутомимый кибер-помощник, который отвечает клиентам за 0.1 секунды, собирает заявки и никогда не скажет: «Я устал, спросите завтра».',
    view: { theta: 0.45, phi: 0.72, zoom: 1.5, tx: 46.5, ty: 7, tz: -5 },
  },
  {
    label: 'АВТОБУС',
    pos: new THREE.Vector3(0, 4, 46),
    tag: 'ДОСТАВКА 🚌',
    accent: '#f5b324',
    title: 'Экспресс «Охват-2000»',
    body: 'Мгновенно развозит свежие порции контента прямо по лентам всех ваших соцсетей. Без пробок, пересадок и технических остановок!',
    view: { theta: 0.65, phi: 0.85, zoom: 1.25, tx: 0, ty: 2, tz: 44 },
  },
];

export function createHotspotElements(onClick, appendTarget = document.body) {
  return HOTSPOTS.map((h) => {
    const el = document.createElement('div');
    el.className = 'spot' + (h.cls ? ` ${h.cls}` : '');
    el.innerHTML = `<i></i><span class="lbl">${h.label}</span>`;
    el.addEventListener('click', (ev) => {
      ev.stopPropagation();
      onClick(h);
    });
    appendTarget.appendChild(el);
    return el;
  });
}

/** 5 Large Popup Banners for Multi-Screen Sky District Pavilions */
export const JOURNEY_PAVILIONS = [
  {
    id: 'vk_hub',
    label: 'VK HUB',
    uCenter: 0.244,
    uMin: 0.17,
    uMax: 0.31,
    anchorPos: new THREE.Vector3(112, 4.0, 114),
    accent: '#2787f5',
    accentGradient: 'linear-gradient(135deg, #2787f5, #0056b3)',
    tag: 'ВКОНТАКТЕ · АВТОПОСТИНГ',
    title: 'VK Хаб: Посты, Клипы & Контроль',
    body: 'Автоматическая публикация постов, историй и клипов в сообщества и на личные страницы ВКонтакте. Встроенный контент-контроль проверяет ссылки и медиа, а диспетчер очередей строго держит расписание выхода.',
    pills: ['⚡ Посты & Клипы', '🛡️ Авто-модерация', '📅 Сетка расписания'],
  },
  {
    id: 'youtube_hub',
    label: 'YOUTUBE SHORTS',
    uCenter: 0.413,
    uMin: 0.34,
    uMax: 0.48,
    anchorPos: new THREE.Vector3(-124, 0.0, 182),
    accent: '#e62117',
    accentGradient: 'linear-gradient(135deg, #e62117, #991b1b)',
    tag: 'YOUTUBE · SHORTS & ВИДЕО',
    title: 'YouTube Студия: Генерация & Релиз',
    body: 'Адаптация и дистрибуция вертикальных Shorts и видео. Нейросеть генерирует кликабельные обложки, формирует вирусные SEO-описания, теги и таймкоды, автоматически выгружая готовые ролики на канал.',
    pills: ['🎬 Вертикальные Shorts', '🏷️ SEO & Теги', '🖼️ Авто-обложки'],
  },
  {
    id: 'dzen_hub',
    label: 'ДЗЕН СТУДИЯ',
    uCenter: 0.586,
    uMin: 0.51,
    uMax: 0.65,
    anchorPos: new THREE.Vector3(128, 0.0, 265),
    accent: '#f59e0b',
    accentGradient: 'linear-gradient(135deg, #ffcc00, #d97706)',
    tag: 'ДЗЕН · СТАТЬИ И БЛОГИ',
    title: 'Дзен Студия: Авторские блоги',
    body: 'Умный редактор и дистрибутор лонгридов. Postilka автоматически верстает статьи с цитатами, иллюстрациями и галереями, отслеживает % дочитываний читателей и подключает материалы к монетизации.',
    pills: ['✍️ Вёрстка лонгридов', '📈 Дочитывания 90%+', '💰 Монетизация'],
  },
  {
    id: 'telegram_hub',
    label: 'HERO TELEGRAM',
    uCenter: 0.759,
    uMin: 0.68,
    uMax: 0.82,
    anchorPos: new THREE.Vector3(-124, -3.0, 348),
    accent: '#0088cc',
    accentGradient: 'linear-gradient(135deg, #50a7ea, #0077b5)',
    tag: 'TELEGRAM · КАНАЛЫ И БОТЫ',
    title: 'Hero Telegram: Кружочки & Боты',
    body: 'Мгновенная доставка контента в каналы и чаты. Конвейерный цех автоматически создаёт круглые видеосообщения («кружочки»), прикрепляет интерактивные inline-кнопки с реакциями и запускает ботов.',
    pills: ['⭕ Видео-кружочки', '🔘 Inline-кнопки', '🤖 Умные боты'],
  },
  {
    id: 'postilka_citadel',
    label: 'POSTILKA CITADEL',
    uCenter: 0.931,
    uMin: 0.86,
    uMax: 0.962,
    anchorPos: new THREE.Vector3(106, -2.0, 435),
    accent: '#6366f1',
    accentGradient: 'linear-gradient(90deg, #6366f1, #a855f7, #ec4899, #f59e0b, #10b981, #06b6d4)',
    tag: '✨ POSTILKA · СВЕРХСИЛА SMM-ФАБРИКИ',
    title: 'Цитадель Postilka: Полная Экосистема',
    body: 'Единый центр управления контентом: передовой ИИ-пайплайн, визуальные сценарии и командная работа в одном интерфейсе.',
    isCitadel: true,
    features: [
      {
        icon: '🎨',
        title: 'Студия рекламы',
        desc: 'Сценарии, креативы и комплексные промо-посты',
        color: '#8b5cf6',
        bg: 'linear-gradient(135deg, rgba(139, 92, 246, 0.12), rgba(139, 92, 246, 0.04))',
        border: 'rgba(139, 92, 246, 0.22)',
      },
      {
        icon: '🎬',
        title: 'Генерация видео',
        desc: 'Анимация фото, генерация роликов и сценариев',
        color: '#f43f5e',
        bg: 'linear-gradient(135deg, rgba(244, 63, 94, 0.12), rgba(244, 63, 94, 0.04))',
        border: 'rgba(244, 63, 94, 0.22)',
      },
      {
        icon: '📸',
        title: 'AI Фото & Арт',
        desc: 'Текст → фото, фильтры и адаптация под форматы соцсетей',
        color: '#f59e0b',
        bg: 'linear-gradient(135deg, rgba(245, 158, 11, 0.12), rgba(245, 158, 11, 0.04))',
        border: 'rgba(245, 158, 11, 0.22)',
      },
      {
        icon: '✏️',
        title: 'Режим наброска (Sketch)',
        desc: 'Холст эскизов: рисунок от руки становится готовым артом',
        color: '#10b981',
        bg: 'linear-gradient(135deg, rgba(16, 185, 129, 0.12), rgba(16, 185, 129, 0.04))',
        border: 'rgba(16, 185, 129, 0.22)',
      },
      {
        icon: '⚡',
        title: 'Нодовые процессы (Workflows)',
        desc: 'Визуальный DAG-холст: цепочки триггеров, AI и постинга',
        color: '#0ea5e9',
        bg: 'linear-gradient(135deg, rgba(14, 165, 233, 0.12), rgba(14, 165, 233, 0.04))',
        border: 'rgba(14, 165, 233, 0.22)',
      },
      {
        icon: '👥',
        title: 'Команда & Согласование',
        desc: 'Approval-модерация, роли (Admin/Editor), правки и аудит',
        color: '#6366f1',
        bg: 'linear-gradient(135deg, rgba(99, 102, 241, 0.12), rgba(99, 102, 241, 0.04))',
        border: 'rgba(99, 102, 241, 0.22)',
      },
    ],
    pills: ['🌐 6 соцсетей разом', '📊 Сквозная аналитика', '📅 Смарт-календарь', '🤖 ИИ-оркестратор'],
  },
  {
    id: 'road_terminus',
    label: 'СКОРО ОБНОВЛЕНИЕ',
    uCenter: 0.99,
    uMin: 0.966,
    uMax: 1.00,
    anchorPos: new THREE.Vector3(10, 4.0, 458),
    accent: '#f59e0b',
    accentGradient: 'linear-gradient(90deg, #f59e0b, #ef4444, #8b5cf6)',
    tag: '🚧 КОНЕЦ МАРШРУТА',
    title: 'Скоро обновление! Приходите ещё ✨',
    body: 'Вы дошли до края открытой части фабрики. Мы активно строим новые павильоны и готовим масштабные функции для Postilka! Вы можете вернуться на старт или исследовать путь назад.',
    isTerminus: true,
    pills: ['🏗️ Новые кварталы', '✨ Регулярные апдейты', '🚀 Postilka 2026'],
  },
];

export function createJourneyBannerElements(appendTarget = document.body) {
  return JOURNEY_PAVILIONS.map((p) => {
    const el = document.createElement('div');
    el.className =
      'journey-banner' +
      (p.isCitadel ? ' jb-citadel' : '') +
      (p.isTerminus ? ' jb-terminus' : '');
    el.dataset.pavilionId = p.id;

    if (p.isCitadel && p.features) {
      el.innerHTML = `
        <div class="jb-top-bar" style="background: ${p.accentGradient}; height: 5px;"></div>
        <div class="jb-header">
          <span class="jb-tag jb-tag-citadel">
            <span class="jb-dot jb-dot-glow"></span>
            ${p.tag}
          </span>
        </div>
        <h3 class="jb-title jb-title-citadel">${p.title}</h3>
        <p class="jb-body jb-body-citadel">${p.body}</p>
        <div class="jb-citadel-grid">
          ${p.features
            .map(
              (f) => `
            <div class="jb-feat-card" style="background: ${f.bg}; border-color: ${f.border};">
              <div class="jb-feat-header">
                <span class="jb-feat-icon">${f.icon}</span>
                <span class="jb-feat-title" style="color: ${f.color};">${f.title}</span>
              </div>
              <p class="jb-feat-desc">${f.desc}</p>
            </div>
          `
            )
            .join('')}
        </div>
        <div class="jb-pills jb-pills-citadel">
          ${p.pills.map((pill) => `<span class="jb-pill jb-pill-citadel">${pill}</span>`).join('')}
        </div>
      `;
    } else if (p.isTerminus) {
      el.innerHTML = `
        <div class="jb-top-bar" style="background: ${p.accentGradient}; height: 5px;"></div>
        <div class="jb-header">
          <span class="jb-tag" style="color: ${p.accent}; font-weight: 800;">
            <span class="jb-dot" style="background: ${p.accent}; box-shadow: 0 0 8px rgba(245, 158, 11, 0.7);"></span>
            ${p.tag}
          </span>
        </div>
        <h3 class="jb-title" style="color: #0f172a; font-size: 19px;">${p.title}</h3>
        <p class="jb-body">${p.body}</p>
        <button type="button" class="jb-return-btn" id="journeyReturnStart">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">
            <path d="M3 12h14a4 4 0 0 1 0 8H11"></path>
            <path d="M7 8l-4 4 4 4"></path>
          </svg>
          Вернуться на старт
        </button>
        <div class="jb-pills" style="margin-top: 12px;">
          ${p.pills.map((pill) => `<span class="jb-pill">${pill}</span>`).join('')}
        </div>
      `;
    } else {
      el.innerHTML = `
        <div class="jb-top-bar" style="background: ${p.accentGradient};"></div>
        <div class="jb-header">
          <span class="jb-tag" style="color: ${p.accent};">
            <span class="jb-dot" style="background: ${p.accent};"></span>
            ${p.tag}
          </span>
        </div>
        <h3 class="jb-title">${p.title}</h3>
        <p class="jb-body">${p.body}</p>
        <div class="jb-pills">
          ${p.pills.map((pill) => `<span class="jb-pill">${pill}</span>`).join('')}
        </div>
      `;
    }
    appendTarget.appendChild(el);
    return el;
  });
}
