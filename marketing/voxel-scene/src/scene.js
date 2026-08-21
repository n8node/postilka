import * as THREE from 'three';
import { buildCity } from './diorama/buildCity.js';
import {
  DEFAULT_VIEW,
  JOURNEY_INTRO_VIEW,
  JOURNEY_ROAD_VIEW,
  HOTSPOTS,
  JOURNEY_PAVILIONS,
  createHotspotElements,
  createJourneyBannerElements,
} from './diorama/hotspots.js';
import { configureTextureQuality } from './diorama/textures.js';

const D = 43;
const RAD = 170;

const easeIO = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const easeOutBack = (t) => {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
};

export class DioramaScene {
  constructor(container, options = {}) {
    this.container = container;
    this.overlayRoot = options.overlayRoot || document.body;
    this.embedded = Boolean(options.embedded);
    this.reduced =
      window.matchMedia &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    this.ctr = {
      theta: DEFAULT_VIEW.theta,
      phi: DEFAULT_VIEW.phi,
      zoom: DEFAULT_VIEW.zoom,
      target: new THREE.Vector3(DEFAULT_VIEW.tx, DEFAULT_VIEW.ty, DEFAULT_VIEW.tz),
      minPhi: 0.22,
      maxPhi: 1.38,
      minZoom: 0.5,
      maxZoom: 3.5,
    };

    this.tweens = [];
    this.autoRotate = false;
    this.idleTimer = 0;
    this.drag = false;
    this.moved = false;
    this.px = 0;
    this.py = 0;

    this.onPanelOpen = null;
    this.onReady = null;
    this.journeyStarted = false;
    this.journeyCamReady = false;
    this.THREE = THREE;
    this.journeyFocus = new THREE.Vector3();
    this.userPanOffset = new THREE.Vector3();
    this.clock = new THREE.Clock();

    this.initRenderer();
    this.initLights();
    this.initCity();
    this.initControls();
    this.initHotspots();
    this.initJourneyPrompt();
    this.initIntro();
    this.animate();

    setTimeout(() => this.onReady?.(), 450);

    this._resizeObserver = new ResizeObserver(() => this.onResize());
    this._resizeObserver.observe(this.container);
  }

  getViewportSize() {
    let width = Math.max(this.container?.clientWidth || 0, 0);
    let height = Math.max(this.container?.clientHeight || 0, 0);

    if (this.embedded && width < 2) {
      const layoutHost =
        this.container?.closest('.e-con') ||
        this.container?.closest('.elementor-section') ||
        this.container?.closest('[data-postilka-voxel-root]')?.parentElement;
      width = Math.max(layoutHost?.clientWidth || 0, window.innerWidth);
    }

    if (height < 2 && this.embedded) {
      const root = this.container?.closest('[data-postilka-voxel-root]');
      height = Math.max(root?.clientHeight || 0, 420);
    }

    return {
      width: Math.max(width, 1),
      height: Math.max(height, 1),
    };
  }

  initRenderer() {
    this.scene = new THREE.Scene();
    const skyCanvas = document.createElement('canvas');
    skyCanvas.width = 1024;
    skyCanvas.height = 576;
    const skyContext = skyCanvas.getContext('2d');
    const skyGradient = skyContext.createLinearGradient(0, 0, 1024, 576);
    skyGradient.addColorStop(0, '#ffe6b5');
    skyGradient.addColorStop(0.55, '#f5cec7');
    skyGradient.addColorStop(1, '#d8e4f5');
    skyContext.fillStyle = skyGradient;
    skyContext.fillRect(0, 0, skyCanvas.width, skyCanvas.height);
    const skyTexture = new THREE.CanvasTexture(skyCanvas);
    skyTexture.colorSpace = THREE.SRGBColorSpace;
    this.scene.background = skyTexture;
    this.aspect = this.getViewportSize().width / this.getViewportSize().height;
    this.camera = new THREE.OrthographicCamera(
      -D * this.aspect,
      D * this.aspect,
      D,
      -D,
      -500,
      2000
    );

    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    const { width, height } = this.getViewportSize();
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(width, height);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.container.appendChild(this.renderer.domElement);
    configureTextureQuality({
      anisotropy: this.renderer.capabilities.getMaxAnisotropy(),
    });

    window.addEventListener('resize', () => this.onResize());
  }

  initLights() {
    this.scene.add(new THREE.HemisphereLight(0xfff6df, 0xaebbd0, 1.2));
    const sun = new THREE.DirectionalLight(0xfff2d0, 1.5);
    sun.position.set(48, 86, 36);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    const s = sun.shadow.camera;
    s.left = -110;
    s.right = 110;
    s.top = 110;
    s.bottom = -110;
    s.near = 1;
    s.far = 320;
    sun.shadow.bias = -0.0004;
    sun.shadow.radius = 3;
    this.scene.add(sun);

    const fill = new THREE.DirectionalLight(0xbfe0ff, 0.42);
    fill.position.set(-40, 30, -30);
    this.scene.add(fill);
  }

  initCity() {
    const built = buildCity(this.reduced);
    this.city = built.city;
    this.movers = built.movers;
    this.screens = built.screens;
    this.couriers = built.carts;
    this.journeyActors = built.journeyActors;
    this.scene.add(this.city);
  }

  advanceJourneyWalk(journey, deltaU) {
    const minU = journey.initialU ?? 0;
    const maxLead = 0.008;
    const curU = journey.walkU ?? minU;
    const maxU = 0.993;
    journey.walkTarget = THREE.MathUtils.clamp(
      journey.walkTarget + deltaU,
      Math.max(minU, curU - maxLead),
      Math.min(maxU, curU + maxLead)
    );
    if (deltaU > 0) journey.facingDirection = 1;
    else if (deltaU < 0) journey.facingDirection = -1;
  }

  initControls() {
    const el = this.renderer.domElement;

    el.addEventListener('contextmenu', (e) => e.preventDefault());

    el.addEventListener('pointerdown', (e) => {
      this.drag = true;
      this.dragButton = e.button;
      this.isPanning = e.button === 2 || e.button === 1 || e.shiftKey;
      this.moved = false;
      this.px = e.clientX;
      this.py = e.clientY;
      this.autoRotate = false;
      this.idleTimer = 0;
      el.setPointerCapture(e.pointerId);
    });

    el.addEventListener('pointermove', (e) => {
      if (!this.drag) return;
      const dx = e.clientX - this.px;
      const dy = e.clientY - this.py;
      this.px = e.clientX;
      this.py = e.clientY;
      if (Math.abs(dx) + Math.abs(dy) > 2) this.moved = true;

      this.cancelTweens();

      if (this.isPanning) {
        const rect = el.getBoundingClientRect();
        this.updateCam();
        this.camera.updateMatrixWorld();
        const cameraRight = new THREE.Vector3().setFromMatrixColumn(this.camera.matrixWorld, 0);
        const cameraUp = new THREE.Vector3().setFromMatrixColumn(this.camera.matrixWorld, 1);

        const panX = -dx * ((2 * D * this.aspect) / (rect.width * this.ctr.zoom));
        const panY = dy * ((2 * D) / (rect.height * this.ctr.zoom));

        this.ctr.target.addScaledVector(cameraRight, panX);
        this.ctr.target.addScaledVector(cameraUp, panY);
        this.userPanOffset.addScaledVector(cameraRight, panX);
        this.userPanOffset.addScaledVector(cameraUp, panY);
      } else {
        this.ctr.theta -= dx * 0.006;
        this.ctr.phi -= dy * 0.006;
      }
    });

    el.addEventListener('pointerup', () => {
      this.drag = false;
      this.idleTimer = 0;
    });

    el.addEventListener(
      'wheel',
      (e) => {
        e.preventDefault();
        const journey = this.journeyActors?.userData;

        if (
          this.journeyStarted &&
          journey?.mode === 'walking' &&
          !e.shiftKey &&
          !e.ctrlKey
        ) {
          this.autoRotate = false;
          this.idleTimer = 0;
          this.advanceJourneyWalk(journey, e.deltaY * 0.00018);
          return;
        }

        this.cancelTweens();
        this.autoRotate = false;
        this.idleTimer = 0;

        const rect = el.getBoundingClientRect();
        const ndcX = ((e.clientX - rect.left) / rect.width) * 2 - 1;
        const ndcY = -(((e.clientY - rect.top) / rect.height) * 2 - 1);

        const oldZoom = this.ctr.zoom;
        const zoomFactor = 1 - e.deltaY * 0.0012;
        const newZoom = Math.max(
          this.ctr.minZoom,
          Math.min(this.ctr.maxZoom, oldZoom * zoomFactor)
        );

        if (Math.abs(newZoom - oldZoom) > 0.00001) {
          const deltaInvZoom = 1 / oldZoom - 1 / newZoom;

          // Camera right and up orientation in world space
          this.updateCam();
          this.camera.updateMatrixWorld();
          const cameraRight = new THREE.Vector3().setFromMatrixColumn(this.camera.matrixWorld, 0);
          const cameraUp = new THREE.Vector3().setFromMatrixColumn(this.camera.matrixWorld, 1);

          // Shift target so the exact world point under the cursor stays fixed
          const shiftX = ndcX * D * this.aspect * deltaInvZoom;
          const shiftY = ndcY * D * deltaInvZoom;

          this.ctr.target.addScaledVector(cameraRight, shiftX);
          this.ctr.target.addScaledVector(cameraUp, shiftY);
          this.ctr.zoom = newZoom;
          this.updateCam();
        }
      },
      { passive: false }
    );

    // Keyboard controls for journey and zoom
    window.addEventListener('keydown', (e) => {
      const journey = this.journeyActors?.userData;
      if (
        e.key === 'ArrowDown' ||
        e.key === 'PageDown' ||
        e.key === 's' ||
        e.key === 'S' ||
        e.key === ' '
      ) {
        if (this.journeyStarted && journey?.mode === 'walking') {
          this.advanceJourneyWalk(journey, 0.004);
        }
      } else if (
        e.key === 'ArrowUp' ||
        e.key === 'PageUp' ||
        e.key === 'w' ||
        e.key === 'W'
      ) {
        if (this.journeyStarted && journey?.mode === 'walking') {
          this.advanceJourneyWalk(journey, -0.004);
        }
      } else if (e.key === '+' || e.key === '=') {
        this.ctr.zoom = Math.min(this.ctr.maxZoom, this.ctr.zoom * 1.15);
      } else if (e.key === '-' || e.key === '_') {
        this.ctr.zoom = Math.max(this.ctr.minZoom, this.ctr.zoom * 0.87);
      }
    });
  }

  initHotspots() {
    this.spotEls = createHotspotElements((h) => {
      this.onPanelOpen?.(h);
      this.flyTo(h.view);
    }, this.overlayRoot);
    this.journeyBannerEls = createJourneyBannerElements(this.overlayRoot);
    this.journeyBannerEls.forEach((el) => {
      const returnBtn = el.querySelector('.jb-return-btn');
      if (returnBtn) {
        returnBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          this.returnToJourneyStart();
        });
      }
    });
    this._v = new THREE.Vector3();
  }

  returnToJourneyStart() {
    if (!this.journeyActors || !this.journeyStarted) return;
    const ja = this.journeyActors.userData;
    const initU = ja.initialU ?? 0;
    this.journeyCamReady = false;
    ja.walkTarget = initU;
    ja.walkU = initU;
    ja.displayU = initU;
    ja.velocity = 0;
    ja.facingDirection = 1;
    this.userPanOffset.set(0, 0, 0);

    const hero = ja.hero;
    this.flyTo(
      {
        ...JOURNEY_ROAD_VIEW,
        tx: hero.position.x,
        ty: hero.position.y + 3.0,
        tz: hero.position.z,
      },
      () => {
        this.journeyCamReady = true;
      }
    );
  }

  initJourneyPrompt() {
    this.journeyPromptEl = document.getElementById('journeyPrompt');
    this.journeyStartBtn = document.getElementById('journeyStart');
    this.journeyStartBtn?.addEventListener('click', () => this.startJourney());
  }

  stopJourney() {
    if (!this.journeyStarted || !this.journeyActors) return;
    const ja = this.journeyActors.userData;
    const initU = ja.initialU ?? 0;
    this.journeyStarted = false;
    this.journeyCamReady = false;
    ja.mode = 'idle';
    ja.walkU = initU;
    ja.walkTarget = initU;
    ja.displayU = initU;
    ja.velocity = 0;
    ja.facingDirection = 1;
    this.userPanOffset.set(0, 0, 0);
    this.journeyPromptEl?.classList.remove('hidden');
    this.journeyBannerEls?.forEach((el) => el.classList.remove('active'));
    this.resetView();
  }

  startJourney() {
    if (this.journeyStarted || !this.journeyActors) return;
    this.journeyStarted = true;
    this.journeyCamReady = false;
    this.autoRotate = false;
    this.userPanOffset.set(0, 0, 0);
    this.journeyPromptEl?.classList.add('hidden');

    const ja = this.journeyActors.userData;
    const initU = ja.initialU ?? 0;
    ja.mode = 'walking';
    ja.walkU = initU;
    ja.walkTarget = initU;
    ja.displayU = initU;
    ja.velocity = 0;
    ja.scrollActive = false;
    ja.facingDirection = 1;
    ja.heroStridePhase = 0;
    ja.dogStridePhase = 0;

    const hero = ja.hero;
    this.flyTo(
      {
        ...JOURNEY_ROAD_VIEW,
        tx: hero.position.x,
        ty: hero.position.y + 3.0,
        tz: hero.position.z,
      },
      () => {
        this.journeyCamReady = true;
      }
    );
  }

  initIntro() {
    if (this.reduced) {
      this.city.scale.setScalar(1);
    } else {
      this.city.scale.setScalar(0.001);
      this.tw((v) => this.city.scale.setScalar(v), 0.001, 1, 1.25, easeOutBack);
    }
    this.updateCam();
  }

  tw(setter, from, to, dur, ease = easeIO) {
    this.tweens.push({ setter, from, to, dur, t: 0, ease });
  }

  cancelTweens() {
    this.tweens = [];
  }

  updateTweens(dt) {
    for (let i = this.tweens.length - 1; i >= 0; i--) {
      const T = this.tweens[i];
      T.t = Math.min(1, T.t + dt / T.dur);
      T.setter(T.from + (T.to - T.from) * T.ease(T.t));
      if (T.t >= 1) {
        T.onComplete?.();
        this.tweens.splice(i, 1);
      }
    }
  }

  flyTo(v, onComplete) {
    this.autoRotate = false;
    this.cancelTweens();
    const dur = 1.15;
    this.tw((x) => (this.ctr.theta = x), this.ctr.theta, v.theta, dur);
    this.tw((x) => (this.ctr.phi = x), this.ctr.phi, v.phi, dur);
    this.tw((x) => (this.ctr.zoom = x), this.ctr.zoom, v.zoom, dur);
    this.tw((x) => (this.ctr.target.x = x), this.ctr.target.x, v.tx, dur);
    this.tw((x) => (this.ctr.target.y = x), this.ctr.target.y, v.ty, dur);
    this.tw((x) => (this.ctr.target.z = x), this.ctr.target.z, v.tz, dur);
    if (onComplete) {
      this.tweens.push({
        setter: () => {},
        from: 0,
        to: 1,
        dur,
        t: 0,
        ease: easeIO,
        onComplete,
      });
    }
  }

  resetView() {
    this.userPanOffset.set(0, 0, 0);
    this.flyTo(DEFAULT_VIEW);
  }

  updateCam() {
    this.ctr.phi = Math.max(this.ctr.minPhi, Math.min(this.ctr.maxPhi, this.ctr.phi));
    this.ctr.zoom = Math.max(this.ctr.minZoom, Math.min(this.ctr.maxZoom, this.ctr.zoom));
    const sp = Math.sin(this.ctr.phi);
    this.camera.position.set(
      this.ctr.target.x + RAD * sp * Math.sin(this.ctr.theta),
      this.ctr.target.y + RAD * Math.cos(this.ctr.phi),
      this.ctr.target.z + RAD * sp * Math.cos(this.ctr.theta)
    );
    this.camera.lookAt(this.ctr.target);
    this.camera.zoom = this.ctr.zoom;
    this.camera.updateProjectionMatrix();
  }

  placeSpots() {
    const hideHotspots = this.journeyStarted;
    const { width, height } = this.getViewportSize();
    for (let i = 0; i < HOTSPOTS.length; i++) {
      if (hideHotspots) {
        this.spotEls[i].style.display = 'none';
        continue;
      }
      const h = HOTSPOTS[i];
      if (h.dynamic === 'courier' && this.couriers?.[h.courierIndex ?? 0]) {
        const c = this.couriers[h.courierIndex ?? 0];
        this._v.set(c.position.x, 4, c.position.z);
      } else {
        this._v.copy(h.pos);
      }
      this._v.project(this.camera);
      const behind = this._v.z > 1;
      this.spotEls[i].style.display = behind ? 'none' : 'grid';
      this.spotEls[i].style.left = (this._v.x * 0.5 + 0.5) * width + 'px';
      this.spotEls[i].style.top = (-this._v.y * 0.5 + 0.5) * height + 'px';
    }

    this.placeJourneyPrompt();
    this.placeJourneyBanners();
  }

  placeJourneyBanners() {
    if (!this.journeyBannerEls || !this.journeyActors) return;

    const ja = this.journeyActors.userData;
    const currentU = ja?.displayU ?? ja?.walkU ?? 0;
    const isJourneyActive = this.journeyStarted && ja?.mode === 'walking';

    const { width: screenW, height: screenH } = this.getViewportSize();
    const pad = 24;
    const cardHalfW = 195;

    for (let i = 0; i < JOURNEY_PAVILIONS.length; i++) {
      const p = JOURNEY_PAVILIONS[i];
      const el = this.journeyBannerEls[i];
      if (!el) continue;

      this._v.copy(p.anchorPos);
      this._v.project(this.camera);

      const behind = this._v.z > 1;
      if (behind) {
        el.style.display = 'none';
        el.classList.remove('active');
        continue;
      }

      el.style.display = 'block';
      const rawX = (this._v.x * 0.5 + 0.5) * screenW;
      const rawY = (-this._v.y * 0.5 + 0.5) * screenH;

      // Ensure banner stays cleanly inside viewport bounds
      const isCitadel = p.isCitadel;
      const isTerminus = p.isTerminus;
      const cardHalfW = isCitadel ? 270 : (isTerminus ? 210 : 195);
      const cardHeight = isCitadel ? 390 : (isTerminus ? 270 : 240);
      const clampedX = Math.max(pad + cardHalfW, Math.min(screenW - pad - cardHalfW, rawX));
      const clampedY = Math.max(cardHeight + 20, Math.min(screenH - 20, rawY));

      el.style.left = clampedX + 'px';
      el.style.top = clampedY + 'px';

      const isInZone = isJourneyActive && currentU >= p.uMin && currentU <= p.uMax;
      if (isInZone) {
        el.classList.add('active');
      } else {
        el.classList.remove('active');
      }
    }
  }

  placeJourneyPrompt() {
    if (!this.journeyPromptEl || this.journeyStarted || !this.journeyActors) return;

    const ja = this.journeyActors.userData;
    const hero = ja.hero;
    // Project top of hero's head (hero height is ~11.5 world units when scaled 1.875)
    this._v.set(hero.position.x, hero.position.y + 11.5, hero.position.z);
    this._v.project(this.camera);

    const behind = this._v.z > 1;
    const { width, height } = this.getViewportSize();
    const x = (this._v.x * 0.5 + 0.5) * width;
    const y = (-this._v.y * 0.5 + 0.5) * height;

    this.journeyPromptEl.style.display = behind ? 'none' : 'block';
    this.journeyPromptEl.style.left = x + 'px';
    this.journeyPromptEl.style.top = y + 'px';
  }

  onResize() {
    const { width, height } = this.getViewportSize();
    this.aspect = width / height;
    this.camera.left = -D * this.aspect;
    this.camera.right = D * this.aspect;
    this.camera.top = D;
    this.camera.bottom = -D;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  }

  destroy() {
    this._resizeObserver?.disconnect();
  }

  animate() {
    requestAnimationFrame(() => this.animate());

    const dt = Math.min(this.clock.getDelta(), 0.05);
    const t = this.clock.elapsedTime;

    this.updateTweens(dt);
    for (const m of this.movers) m.fn(t, dt, this.camera);
    for (const sc of this.screens) {
      if (Number.isFinite(sc.userData.ph)) {
        sc.material.emissiveIntensity =
          0.35 + 0.4 * Math.abs(Math.sin(t * 7 + sc.userData.ph));
      }
    }

    if (this.autoRotate) {
      this.idleTimer += dt;
      if (this.idleTimer > 0.2) this.ctr.theta += 0.05 * dt;
    }

    const journey = this.journeyActors?.userData;
    if (this.journeyStarted && this.journeyCamReady && journey && journey.mode === 'walking') {
      // Smoothly follow the hero's progression along the multi-screen journey path,
      // while preserving the user's freely adjusted camera angle (theta/phi), zoom level, and pan offset!
      this.journeyFocus
        .set(
          journey.hero.position.x,
          journey.hero.position.y + 3.0,
          journey.hero.position.z
        )
        .add(this.userPanOffset);
      this.ctr.target.lerp(this.journeyFocus, Math.min(1, dt * 4.5));
    }

    this.updateCam();
    this.renderer.render(this.scene, this.camera);
    this.placeSpots();
  }
}
