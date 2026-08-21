import './style.css';
import './embed-host.css';
import { DioramaScene } from './scene.js';
import { DEFAULT_VIEW } from './diorama/hotspots.js';

const mounts = new Map();
let activeRoot = null;
let activeScene = null;

function buildWidgetMarkup() {
  return `
    <div class="postilka-voxel-poster" data-voxel-poster>
      <span>Собираем фабрику из вокселей…</span>
    </div>
    <div class="postilka-voxel-widget">
      <div id="stage"></div>
      <div class="controls-guide collapsed" id="controlsGuide">
        <button class="controls-guide-toggle" id="controlsGuideToggle" type="button" aria-label="Управление сценой">
          <span class="cg-toggle-text">Управление сценой</span>
        </button>
        <div class="controls-guide-body" id="controlsGuideBody">
          <div class="cg-section">
            <div class="cg-section-title">Прогулка</div>
            <div class="cg-row"><div class="cg-keys"><span class="cg-k">W</span><span class="cg-k">S</span></div><div class="cg-desc">Идти по маршруту</div></div>
          </div>
        </div>
      </div>
      <div class="panel" id="panel">
        <button class="x" id="panelX" type="button">×</button>
        <span class="tag" id="pTag">POSTILKA</span>
        <h2 id="pTitle"></h2>
        <p id="pBody"></p>
      </div>
      <div class="journey-prompt hidden" id="journeyPrompt">
        <p>Нажмите «Начать путешествие», чтобы идти по маршруту.</p>
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
    scene.startJourney();
  });

  document.addEventListener('keydown', (event) => {
    if (activeRoot !== root?.closest('[data-postilka-voxel-root]')) return;
    if (event.key === 'Escape') {
      if (panel.classList.contains('on')) closePanel();
      else if (root.closest('.is-immersive')) window.PostilkaVoxel?.collapse?.();
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

  const expandBtn = rootEl.querySelector('[data-voxel-expand]');
  const collapseBtn = rootEl.querySelector('[data-voxel-collapse]');
  expandBtn?.setAttribute('hidden', '');
  collapseBtn?.removeAttribute('hidden');

  activeScene?.startJourney();
  activeScene?.onResize();
}

function collapseRoot(rootEl) {
  rootEl.classList.remove('is-immersive');
  rootEl.classList.add('is-preview');
  document.body.classList.remove('postilka-voxel-lock');

  const expandBtn = rootEl.querySelector('[data-voxel-expand]');
  const collapseBtn = rootEl.querySelector('[data-voxel-collapse]');
  collapseBtn?.setAttribute('hidden', '');
  expandBtn?.removeAttribute('hidden');

  const api = mounts.get(rootEl);
  api?.scene?.stopJourney();
  api?.scene?.onResize();
  rootEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function autoMountAll() {
  document.querySelectorAll('[data-postilka-voxel-root]').forEach((rootEl) => {
    if (mounts.has(rootEl)) return;
    mountInto(rootEl);

    rootEl.querySelector('[data-voxel-expand]')?.addEventListener('click', () => {
      expandRoot(rootEl);
    });
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
