import './style.css';
import { DioramaScene } from './scene.js';
import { DEFAULT_VIEW } from './diorama/hotspots.js';

const stage = document.getElementById('stage');
const panel = document.getElementById('panel');
const loader = document.getElementById('load');
const controlsGuide = document.getElementById('controlsGuide');
const controlsGuideToggle = document.getElementById('controlsGuideToggle');
const scene = new DioramaScene(stage);
window.__scene = scene;

scene.onReady = () => {
  loader.classList.add('hide');
};

controlsGuideToggle?.addEventListener('click', () => {
  controlsGuide?.classList.toggle('collapsed');
});

scene.onPanelOpen = (hotspot) => {
  document.getElementById('pTag').textContent = hotspot.tag;
  document.getElementById('pTitle').textContent = hotspot.title;
  document.getElementById('pBody').textContent = hotspot.body;
  document.getElementById('pTag').style.background = hotspot.accent;
  panel.style.setProperty('--accent', hotspot.accent);
  panel.classList.add('on');
};

function closePanel({ reset = true } = {}) {
  panel.classList.remove('on');
  if (reset) scene.flyTo(DEFAULT_VIEW);
}

document.getElementById('panelX').addEventListener('click', () => closePanel());
document.getElementById('reset').addEventListener('click', () => {
  panel.classList.remove('on');
  scene.resetView();
});

// Modal System
const modalBackdrop = document.getElementById('modalBackdrop');
const allModals = document.querySelectorAll('.site-modal');

export function openModal(modalId) {
  closePanel({ reset: false });
  allModals.forEach((m) => m.classList.remove('active'));
  const target = document.getElementById(modalId);
  if (target && modalBackdrop) {
    target.classList.add('active');
    modalBackdrop.classList.add('open');
  }
}

export function closeModal() {
  if (modalBackdrop) {
    modalBackdrop.classList.remove('open');
    allModals.forEach((m) => m.classList.remove('active'));
  }
}

// Global modal triggers
document.querySelectorAll('[data-modal]').forEach((btn) => {
  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    const modalId = btn.getAttribute('data-modal');
    const target = document.getElementById(modalId);
    if (modalBackdrop?.classList.contains('open') && target?.classList.contains('active')) {
      closeModal();
    } else if (modalId) {
      openModal(modalId);
    }
  });
});

// Modal close buttons
document.querySelectorAll('[data-close]').forEach((btn) => {
  btn.addEventListener('click', () => closeModal());
});

// Click outside modal to close
modalBackdrop?.addEventListener('click', (e) => {
  if (e.target === modalBackdrop) closeModal();
});

// Auth tab switcher
const authTabs = document.querySelectorAll('[data-auth-tab]');
const authNameField = document.getElementById('authNameField');
const authSubmitBtn = document.getElementById('authSubmitBtn');

function setAuthMode(mode) {
  authTabs.forEach((tab) => {
    tab.classList.toggle('active', tab.dataset.authTab === mode);
  });
  if (authNameField) authNameField.style.display = mode === 'register' ? 'block' : 'none';
  if (authSubmitBtn) authSubmitBtn.textContent = mode === 'register' ? 'Зарегистрироваться' : 'Войти в Postilka';
}

authTabs.forEach((tab) => {
  tab.addEventListener('click', () => setAuthMode(tab.dataset.authTab));
});

document.querySelectorAll('[data-auth-action]').forEach((btn) => {
  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    setAuthMode('register');
    openModal('authModal');
  });
});

document.getElementById('aboutStartTourBtn')?.addEventListener('click', () => {
  closeModal();
  scene.startJourney();
});

document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') {
    if (modalBackdrop?.classList.contains('open')) {
      closeModal();
    } else {
      closePanel();
    }
  }
  if ((event.key === 'h' || event.key === 'H' || event.key === 'р' || event.key === 'Р') && !event.ctrlKey && !event.altKey && !event.metaKey) {
    // Only toggle if not typing in input
    const tag = document.activeElement?.tagName?.toLowerCase();
    if (tag !== 'input' && tag !== 'textarea') {
      controlsGuide?.classList.toggle('collapsed');
    }
  }
});
