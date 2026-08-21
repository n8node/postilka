import './embed-host.css';
import { DioramaScene } from './scene.js';
import { DEFAULT_VIEW } from './diorama/hotspots.js';

const mounts = new Map();
let activeRoot = null;
let activeScene = null;

function isTouchDevice() {
  return typeof window !== 'undefined' && window.matchMedia?.('(pointer: coarse)').matches === true;
}

function controlsGuideBodyHtml() {
  return `
        <div class="cg-section cg-desktop-only">
          <div class="cg-section-title">🚶 Прогулка по фабрике</div>
          <div class="cg-row">
            <div class="cg-keys">
              <span class="cg-k">Колесо</span>
              <span class="cg-or">или</span>
              <span class="cg-k">W</span><span class="cg-k">S</span>
              <span class="cg-k">↑</span><span class="cg-k">↓</span>
            </div>
            <div class="cg-desc">Идти по маршруту</div>
          </div>
          <div class="cg-row">
            <div class="cg-keys"><span class="cg-k">Пробел</span></div>
            <div class="cg-desc">Шаг вперед</div>
          </div>
        </div>
        <div class="cg-divider cg-desktop-only"></div>
        <div class="cg-section cg-desktop-only">
          <div class="cg-section-title">🎥 Камера и обзор</div>
          <div class="cg-row">
            <div class="cg-keys"><span class="cg-k">ЛКМ + тянуть</span></div>
            <div class="cg-desc">Вращение сцены (360°)</div>
          </div>
          <div class="cg-row">
            <div class="cg-keys">
              <span class="cg-k">ПКМ</span>
              <span class="cg-or">/</span>
              <span class="cg-k">Shift+ЛКМ</span>
            </div>
            <div class="cg-desc">Сдвиг / Панорама</div>
          </div>
          <div class="cg-row">
            <div class="cg-keys">
              <span class="cg-k">Колесо</span>
              <span class="cg-or">или</span>
              <span class="cg-k">+</span><span class="cg-k">-</span>
            </div>
            <div class="cg-desc">Зум (масштаб)</div>
          </div>
        </div>
        <div class="cg-divider cg-desktop-only"></div>
        <div class="cg-section cg-touch-only">
          <div class="cg-section-title">📱 Прогулка по фабрике</div>
          <div class="cg-row">
            <div class="cg-keys"><span class="cg-k">Свайп ↑↓</span></div>
            <div class="cg-desc">Идти по маршруту</div>
          </div>
          <div class="cg-row">
            <div class="cg-keys"><span class="cg-k">Кнопка «Шаг»</span></div>
            <div class="cg-desc">Шаг вперёд</div>
          </div>
        </div>
        <div class="cg-divider cg-touch-only"></div>
        <div class="cg-section cg-touch-only">
          <div class="cg-section-title">📱 Камера и обзор</div>
          <div class="cg-row">
            <div class="cg-keys"><span class="cg-k">1 палец</span></div>
            <div class="cg-desc">Вращение сцены</div>
          </div>
          <div class="cg-row">
            <div class="cg-keys"><span class="cg-k">2 пальца</span></div>
            <div class="cg-desc">Зум и сдвиг</div>
          </div>
          <div class="cg-row">
            <div class="cg-keys"><span class="cg-k">Кнопки +/−</span></div>
            <div class="cg-desc">Масштаб</div>
          </div>
        </div>
        <div class="cg-divider"></div>
        <div class="cg-section">
          <div class="cg-section-title">🏛️ Павильоны и интерактив</div>
          <div class="cg-row">
            <div class="cg-keys"><span class="cg-k cg-star">★ Тап</span></div>
            <div class="cg-desc">Подлёт и описание</div>
          </div>
          <div class="cg-row cg-desktop-only">
            <div class="cg-keys"><span class="cg-k">Esc</span></div>
            <div class="cg-desc">Закрыть инфо-карточку</div>
          </div>
        </div>
  `;
}

function touchDockHtml() {
  return `
      <div class="touch-dock" data-touch-dock aria-label="Сенсорное управление">
        <button type="button" class="touch-dock-btn" data-touch-step title="Шаг вперёд">Шаг</button>
        <button type="button" class="touch-dock-btn" data-touch-zoom-in title="Приблизить">+</button>
        <button type="button" class="touch-dock-btn" data-touch-zoom-out title="Отдалить">−</button>
      </div>
  `;
}

function buildWidgetMarkup() {
  return `
    <div class="postilka-voxel-poster" data-voxel-poster>
      <span>Собираем фабрику из вокселей…</span>
    </div>
    <div class="postilka-voxel-widget">
      <div id="stage"></div>
      <div class="controls-guide${isTouchDevice() ? ' collapsed' : ''}" id="controlsGuide">
        <button class="controls-guide-toggle" id="controlsGuideToggle" type="button" aria-label="Управление сценой" title="Свернуть / развернуть подсказки">
          <span class="cg-toggle-icon">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
              <rect x="2" y="6" width="20" height="12" rx="3"></rect>
              <path d="M6 12h4m-2-2v4m9-2h.01m3-2h.01"></path>
            </svg>
          </span>
          <span class="cg-toggle-text">Управление сценой</span>
          <span class="cg-chevron">
            <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="6 9 12 15 18 9"></polyline>
            </svg>
          </span>
        </button>
        <div class="controls-guide-body" id="controlsGuideBody">
          ${controlsGuideBodyHtml()}
        </div>
      </div>
      ${touchDockHtml()}
      <div class="panel" id="panel">
        <button class="x" id="panelX" type="button">×</button>
        <span class="tag" id="pTag">POSTILKA</span>
        <h2 id="pTitle"></h2>
        <p id="pBody"></p>
      </div>
      <div class="journey-prompt" id="journeyPrompt">
        <p>Хочешь узнать больше о Postilka? Нажми кнопку — и мы отправимся в путешествие по проекту.</p>
        <button type="button" id="journeyStart">Начать путешествие</button>
      </div>
    </div>
  `;
}

function wireWidget(root, scene) {
  const panel = root.querySelector('#panel');
  const controlsGuide = root.querySelector('#controlsGuide');
  const controlsGuideToggle = root.querySelector('#controlsGuideToggle');
  const poster = root.querySelector('[data-voxel-poster]');

  scene.onReady = () => {
    poster?.classList.add('hide');
  };

  controlsGuideToggle?.addEventListener('click', () => {
    controlsGuide?.classList.toggle('collapsed');
  });

  scene.onPanelOpen = (hotspot) => {
    root.querySelector('#pTag').textContent = hotspot.tag;
    root.querySelector('#pTitle').textContent = hotspot.title;
    root.querySelector('#pBody').textContent = hotspot.body;
    root.querySelector('#pTag').style.background = hotspot.accent;
    panel.style.setProperty('--accent', hotspot.accent);
    panel.classList.add('on');
  };

  const closePanel = ({ reset = true } = {}) => {
    panel.classList.remove('on');
    if (reset) scene.flyTo(DEFAULT_VIEW);
  };

  root.querySelector('#panelX')?.addEventListener('click', () => closePanel());

  root.querySelector('#journeyStart')?.addEventListener('click', () => {
    const rootEl = root.closest('[data-postilka-voxel-root]');
    if (rootEl) expandRoot(rootEl);
  });

  root.querySelector('[data-touch-step]')?.addEventListener('click', (e) => {
    e.stopPropagation();
    scene.stepJourneyForward();
  });
  root.querySelector('[data-touch-zoom-in]')?.addEventListener('click', (e) => {
    e.stopPropagation();
    scene.zoomBy(1.12);
  });
  root.querySelector('[data-touch-zoom-out]')?.addEventListener('click', (e) => {
    e.stopPropagation();
    scene.zoomBy(0.89);
  });

  if (isTouchDevice()) {
    controlsGuide?.classList.add('collapsed');
  }

  document.addEventListener('keydown', (event) => {
    if (activeRoot !== root?.closest('[data-postilka-voxel-root]')) return;
    if (event.key === 'Escape') {
      if (panel.classList.contains('on')) closePanel();
      else if (root.closest('.is-immersive')) window.PostilkaVoxel?.collapse?.();
    }
    if (
      (event.key === 'h' || event.key === 'H' || event.key === 'р' || event.key === 'Р') &&
      !event.ctrlKey &&
      !event.altKey &&
      !event.metaKey
    ) {
      const tag = document.activeElement?.tagName?.toLowerCase();
      if (tag !== 'input' && tag !== 'textarea') {
        controlsGuide?.classList.toggle('collapsed');
      }
    }
  });
}

function mountInto(rootEl, options = {}) {
  if (!rootEl || mounts.has(rootEl)) return mounts.get(rootEl);

  const stageHost = rootEl.querySelector('[data-postilka-voxel-stage]') || rootEl;
  stageHost.innerHTML = buildWidgetMarkup();

  const overlayRoot = stageHost.querySelector('.postilka-voxel-widget') || stageHost;
  const stage = stageHost.querySelector('#stage');
  const scene = new DioramaScene(stage, {
    overlayRoot,
    embedded: true,
  });

  wireWidget(stageHost, scene);

  requestAnimationFrame(() => scene.onResize());
  setTimeout(() => scene.onResize(), 120);
  setTimeout(() => scene.onResize(), 600);

  const api = {
    root: rootEl,
    scene,
    expand() {
      expandRoot(rootEl);
      scene.onResize();
    },
    collapse() {
      collapseRoot(rootEl);
      scene.stopJourney();
      scene.onResize();
    },
  };

  mounts.set(rootEl, api);
  if (!activeScene) {
    activeRoot = rootEl;
    activeScene = scene;
  }

  options.onReady?.(api);
  return api;
}

function expandRoot(rootEl) {
  activeRoot = rootEl;
  activeScene = mounts.get(rootEl)?.scene || activeScene;
  rootEl.classList.add('is-immersive');
  rootEl.classList.remove('is-preview');
  document.body.classList.add('postilka-voxel-lock');

  rootEl.querySelector('[data-voxel-collapse]')?.removeAttribute('hidden');

  activeScene?.startJourney();
  activeScene?.onResize();
}

function collapseRoot(rootEl) {
  rootEl.classList.remove('is-immersive');
  rootEl.classList.add('is-preview');
  document.body.classList.remove('postilka-voxel-lock');

  rootEl.querySelector('[data-voxel-collapse]')?.setAttribute('hidden', '');

  const api = mounts.get(rootEl);
  api?.scene?.stopJourney();
  api?.scene?.onResize();
  rootEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function autoMountAll() {
  document.querySelectorAll('[data-postilka-voxel-root]').forEach((rootEl) => {
    if (mounts.has(rootEl)) return;
    mountInto(rootEl);

    rootEl.querySelector('[data-voxel-collapse]')?.addEventListener('click', () => {
      collapseRoot(rootEl);
    });
  });
}

window.PostilkaVoxel = {
  mount: mountInto,
  expand(rootEl = activeRoot) {
    if (!rootEl) return;
    expandRoot(rootEl);
  },
  collapse(rootEl = activeRoot) {
    if (!rootEl) return;
    collapseRoot(rootEl);
  },
  getActiveScene() {
    return activeScene;
  },
};

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', autoMountAll);
} else {
  autoMountAll();
}
