import * as THREE from 'three';
import { C, box, put } from './buildCity.js';
import { getThoughtBubbleTexture } from './textures.js';

// ==========================================
// 1. THOUGHT PHRASES (Work hard for the platform)
// ==========================================

export const THOUGHT_PHRASES = [
  'План горит! Пишем рилсы!',
  'Контент сам себя не сделает!',
  'Ещё 20 постов до обеда!',
  'Постилка требует охватов!',
  'Срочно в тренды!',
  'Дедлайн был вчера...',
  'Алгоритмы не спят, и я не сплю!',
  'Где мои просмотры?!',
  'Всё ради кликов!',
  'Автопостинг 24/7!',
  'Трафик не ждёт!',
  'Генерируем контент non-stop!',
  'Охваты упали! Работаем!',
  'Всё на благо платформы!',
  'Ещё 5 статей в Дзен!',
  'Рендерим до утра!',
  'Партия сказала: постить!',
  'Монтируем Shorts без сна!',
  'SEO само себя не оптимизирует!',
  'Лайки, где вы?!',
  'Работаем на максимум!',
  'Календарь горит красным!',
  'Постим во все соцсети!',
];

// ==========================================
// 2. PLATFORMS & HEIGHT MAPPING
// ==========================================

export const PLATFORMS = [
  // Upper Main Factory Floor
  { name: 'main_floor', minX: -55, maxX: 55, minZ: -44, maxZ: 28, y: 0.28 },

  // VK Pedestal (front-left)
  { name: 'vk_platform', minX: -41, maxX: -17, minZ: 8, maxZ: 32, y: 0.28 },

  // YouTube Shorts red elevated platform (front-center-left)
  { name: 'youtube_platform', minX: -17.5, maxX: 1.5, minZ: 12.5, maxZ: 31.5, y: 3.68 },

  // Zen Articles Pedestal (front-center-right)
  { name: 'zen_platform', minX: 1, maxX: 23, minZ: 11, maxZ: 33, y: 0.28 },

  // Photochka Pedestal / Room (front-right)
  { name: 'photo_platform', minX: 19, maxX: 43, minZ: 9, maxZ: 33, y: 0.35 },

  // Telegram Elevated Podium (top-left)
  { name: 'telegram_podium', minX: -59, maxX: -31, minZ: -9, maxZ: 23, y: 5.0 },

  // MAX District Room (far-right)
  { name: 'max_room', minX: 38, maxX: 55, minZ: -14, maxZ: 4, y: 0.42 },

  // Dispatch / Mezzanine deck (jumpable)
  { name: 'dispatch_deck', minX: 22, maxX: 34, minZ: -18, maxZ: -10, y: 2.2 },

  // Conveyor Belt top surface (jumpable)
  { name: 'conveyor_belt', minX: -34, maxX: 30, minZ: -15.5, maxZ: -12.5, y: 4.65 },

  // Zen Book Stacks (jumpable)
  { name: 'zen_books', minX: 8.5, maxX: 12.5, minZ: 24.5, maxZ: 27.5, y: 1.8 },

  // Lower Perimeter Road & Sand Terrace (Fallen characters land here and walk before falling off diorama outer edge)
  { name: 'outer_road_terrace', minX: -86, maxX: 86, minZ: -58, maxZ: 58, y: -5.85 },
];

// ==========================================
// 3. SOLID OBSTACLES & WALLS
// ==========================================

export const OBSTACLES = [
  // Main Platform Foundation Core (Keeps road-level characters outside the solid portico subterranean base)
  { minX: -56, maxX: 56, minZ: -48, maxZ: 32.5, minY: -6.5, maxY: 0.1, jumpable: false },

  // Left Bus Depot (Back-Left)
  { minX: -78, maxX: -58, minZ: -66, maxZ: -42, minY: -6.5, maxY: 12, jumpable: false },

  // Right Bus Depot (Back-Right)
  { minX: 58, maxX: 78, minZ: -66, maxZ: -42, minY: -6.5, maxY: 12, jumpable: false },

  // Back Wall
  { minX: -56, maxX: 56, minZ: -49, maxZ: -42.5, minY: 0, maxY: 25, jumpable: false },

  // Media Studio
  { minX: -30, maxX: -6, minZ: -45, maxZ: -23, minY: 0, maxY: 20, jumpable: false },

  // POSTILKA Central Production Tower
  { minX: -2, maxX: 12, minZ: -44, maxZ: -20, minY: 0, maxY: 35, jumpable: false },

  // Ad Pavilion / Рекламный пост & Coffee Station
  { minX: 14, maxX: 30, minZ: -45, maxZ: -23, minY: 0, maxY: 18, jumpable: false },
  { minX: 7, maxX: 13, minZ: -38, maxZ: -30, minY: 0, maxY: 12, jumpable: false }, // Coffee station

  // Calendar Tower & Disk Warehouse
  { minX: 32, maxX: 48, minZ: -45, maxZ: -23, minY: 0, maxY: 25, jumpable: false },
  { minX: 41, maxX: 56, minZ: -42, maxZ: -30, minY: 0, maxY: 25, jumpable: false },

  // Machinery & Conveyor
  { minX: -40, maxX: -32, minZ: -18, maxZ: -10, minY: 0, maxY: 14, jumpable: false }, // clock station
  { minX: -26.5, maxX: -21.5, minZ: -16, maxZ: -11.5, minY: 0, maxY: 6, jumpable: false }, // writer desk
  { minX: -12, maxX: 0, minZ: -19, maxZ: -9, minY: 0, maxY: 16, jumpable: false }, // lens machine
  { minX: 11, maxX: 17, minZ: -17.5, maxZ: -10.5, minY: 0, maxY: 14, jumpable: false }, // check gate
  { minX: -34, maxX: 30, minZ: -15.5, maxZ: -12.5, minY: 0, maxY: 4.65, jumpable: false }, // conveyor belt body

  // Telegram District (Podium solid base for lower characters + Booth walls for top characters)
  { minX: -58.5, maxX: -31.5, minZ: -8.5, maxZ: 20.5, minY: 0, maxY: 4.8, jumpable: false },
  { minX: -56.5, maxX: -34.5, minZ: -2.0, maxZ: 0.0, minY: 4.8, maxY: 22, jumpable: false },
  { minX: -56.5, maxX: -54.5, minZ: -2.0, maxZ: 17.0, minY: 4.8, maxY: 22, jumpable: false },
  { minX: -54.0, maxX: -50.0, minZ: 11.0, maxZ: 16.0, minY: 4.8, maxY: 12, jumpable: false }, // button rack

  // VK District (Back Wall, Left Wall, Speech Bubble)
  { minX: -38.5, maxX: -19.5, minZ: 12.2, maxZ: 13.8, minY: 0, maxY: 16, jumpable: false },
  { minX: -38.2, maxX: -36.8, minZ: 12.2, maxZ: 28.8, minY: 0, maxY: 16, jumpable: false },
  { minX: -35.0, maxX: -23.0, minZ: 18.0, maxZ: 22.5, minY: 0, maxY: 9, jumpable: false },

  // YouTube Shorts (Red platform solid base for ground characters + Props on top)
  { minX: -17.5, maxX: 1.5, minZ: 12.5, maxZ: 31.5, minY: 0, maxY: 3.68, jumpable: true, topY: 3.68 },
  { minX: -16.5, maxX: -8.5, minZ: 15.5, maxZ: 21.5, minY: 3.68, maxY: 24, jumpable: false }, // phone
  { minX: -9.0, maxX: 0.5, minZ: 16.5, maxZ: 23.5, minY: 3.68, maxY: 15, jumpable: false }, // play icon

  // Zen District Desk & Scroll
  { minX: 7.0, maxX: 17.0, minZ: 18.5, maxZ: 23.5, minY: 0, maxY: 14, jumpable: false },

  // Photochka District Walls
  { minX: 21.5, maxX: 40.5, minZ: 12.8, maxZ: 14.2, minY: 0, maxY: 16, jumpable: false },
  { minX: 21.8, maxX: 23.2, minZ: 13.0, maxZ: 29.5, minY: 0, maxY: 16, jumpable: false },

  // MAX District Walls & Robot
  { minX: 38.0, maxX: 55.0, minZ: -13.2, maxZ: -11.8, minY: 0, maxY: 16, jumpable: false },
  { minX: 53.5, maxX: 55.0, minZ: -13.2, maxZ: 3.2, minY: 0, maxY: 16, jumpable: false },
  { minX: 47.0, maxX: 53.0, minZ: -5.0, maxZ: 0.5, minY: 0, maxY: 10, jumpable: false },
];

export const SPAWN_POINTS = [
  // Factory central floor
  { x: -6, y: 0.28, z: -5 },
  { x: 12, y: 0.28, z: -6 },
  { x: -16, y: 0.28, z: 6 },
  { x: 5, y: 0.28, z: 10 },
  { x: 22, y: 0.28, z: 2 },
  { x: -2, y: 0.28, z: 16 },

  // YouTube Shorts platform
  { x: -7, y: 3.68, z: 24 },
  { x: -2, y: 3.68, z: 26 },
  { x: 0, y: 3.68, z: 23 },

  // VK platform
  { x: -29, y: 0.28, z: 24 },
  { x: -25, y: 0.28, z: 16 },

  // Telegram podium
  { x: -46, y: 5.0, z: 12 },
  { x: -42, y: 5.0, z: 4 },

  // Zen platform
  { x: 12, y: 0.28, z: 24 },
  { x: 8, y: 0.28, z: 17 },

  // Photochka platform
  { x: 31, y: 0.35, z: 24 },
  { x: 26, y: 0.35, z: 16 },

  // MAX District
  { x: 44, y: 0.42, z: -4 },

  // Outer Perimeter Road & Stops
  { x: -74, y: -5.85, z: 8 },
  { x: -18, y: -5.85, z: 46 },
  { x: 18, y: -5.85, z: 46 },
  { x: 74, y: -5.85, z: 8 },
];

/**
 * Returns the highest walkable surface Y at (x, z) at or below currentY (+ step allowance).
 * Returns null if (x, z) is in the void outside any platform.
 */
export function getFloorHeight(x, z, currentY = 100) {
  let highest = -Infinity;
  let found = false;

  for (let i = 0; i < PLATFORMS.length; i++) {
    const p = PLATFORMS[i];
    if (x >= p.minX && x <= p.maxX && z >= p.minZ && z <= p.maxZ) {
      if (p.y <= currentY + 1.2) {
        if (p.y > highest) {
          highest = p.y;
          found = true;
        }
      }
    }
  }

  return found ? highest : null;
}

/**
 * Checks if target position (x, z) intersects any solid obstacles.
 */
export function checkObstacleCollision(x, z, currentY, radius = 0.8) {
  for (let i = 0; i < OBSTACLES.length; i++) {
    const obs = OBSTACLES[i];
    if (
      x + radius >= obs.minX &&
      x - radius <= obs.maxX &&
      z + radius >= obs.minZ &&
      z - radius <= obs.maxZ
    ) {
      // Check height overlap
      if (currentY + 0.4 >= obs.minY && currentY + 0.4 <= obs.maxY) {
        const cx = (obs.minX + obs.maxX) / 2;
        const cz = (obs.minZ + obs.maxZ) / 2;
        const dx = x - cx;
        const dz = z - cz;
        const hx = (obs.maxX - obs.minX) / 2;
        const hz = (obs.maxZ - obs.minZ) / 2;
        const ox = hx - Math.abs(dx);
        const oz = hz - Math.abs(dz);

        let nx = 0;
        let nz = 0;
        if (ox < oz) {
          nx = dx > 0 ? 1 : -1;
        } else {
          nz = dz > 0 ? 1 : -1;
        }

        return {
          hit: true,
          jumpable: obs.jumpable ?? false,
          topY: obs.topY ?? obs.maxY,
          normal: { nx, nz },
          obstacle: obs,
        };
      }
    }
  }
  return { hit: false };
}

/**
 * Returns any higher walkable ledge/platform at (x, z) that can be jumped onto.
 */
export function findJumpableTarget(x, z, currentY) {
  for (let i = 0; i < PLATFORMS.length; i++) {
    const p = PLATFORMS[i];
    if (x >= p.minX && x <= p.maxX && z >= p.minZ && z <= p.maxZ) {
      if (p.y > currentY + 0.5 && p.y <= currentY + 4.8) {
        return p.y;
      }
    }
  }
  return null;
}

function wrapAngle(a) {
  while (a > Math.PI) a -= Math.PI * 2;
  while (a < -Math.PI) a += Math.PI * 2;
  return a;
}

const easeOutBack = (t) => {
  const c1 = 1.7;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
};

// ==========================================
// 4. RIGGED CHARACTER / ROBOT GENERATORS
// ==========================================

export function createRiggedCharacter(o = {}) {
  const g = new THREE.Group();
  const shirt = o.shirt ?? C.postilkaNavy;
  const pants = o.pants ?? C.vkBlue;
  const skin = o.skin ?? C.skinLight;
  const hair = o.hair ?? C.hairBrown;

  // Legs with hip pivot at y = 1.35
  const legL = new THREE.Group();
  legL.position.set(-0.36, 1.35, 0);
  legL.add(put(box(0.55, 0.55, 0.55, pants), 0, -0.25, 0));
  legL.add(put(box(0.55, 0.75, 0.55, C.hairDark), 0, -0.85, 0));
  g.add(legL);

  const legR = new THREE.Group();
  legR.position.set(0.36, 1.35, 0);
  legR.add(put(box(0.55, 0.55, 0.55, pants), 0, -0.25, 0));
  legR.add(put(box(0.55, 0.75, 0.55, C.hairDark), 0, -0.85, 0));
  g.add(legR);

  // Upper body (torso, head, hair, arms)
  const upperBody = new THREE.Group();
  upperBody.position.set(0, 0, 0);

  // Pelvis & Torso
  upperBody.add(put(box(1.4, 0.45, 0.9, pants), 0, 1.45, 0));
  upperBody.add(put(box(1.6, 1.35, 1.0, shirt), 0, 2.25, 0));

  // Arms with shoulder pivots at y = 2.6
  const armL = new THREE.Group();
  armL.position.set(-1.02, 2.6, 0);
  armL.add(put(box(0.45, 1.05, 0.55, shirt), 0, -0.5, 0));
  armL.add(put(box(0.4, 0.4, 0.4, skin), 0, -1.15, 0));
  upperBody.add(armL);

  const armR = new THREE.Group();
  armR.position.set(1.02, 2.6, 0);
  armR.add(put(box(0.45, 1.05, 0.55, shirt), 0, -0.5, 0));
  armR.add(put(box(0.4, 0.4, 0.4, skin), 0, -1.15, 0));
  upperBody.add(armR);

  // Head & Hair
  upperBody.add(put(box(1.35, 1.25, 1.25, skin), 0, 3.45, 0));
  upperBody.add(put(box(0.2, 0.22, 0.1, C.black), -0.3, 3.45, 0.65));
  upperBody.add(put(box(0.2, 0.22, 0.1, C.black), 0.3, 3.45, 0.65));
  upperBody.add(put(box(1.5, 0.6, 1.45, hair), 0, 4.15, 0));
  upperBody.add(put(box(1.5, 0.7, 0.4, hair), 0, 3.7, -0.55));

  g.add(upperBody);

  // Floating Thought Bubble attached above head with solid opaque depth testing
  const thoughtGeo = new THREE.PlaneGeometry(9.6, 4.8);
  const thoughtMat = new THREE.MeshBasicMaterial({
    transparent: true,
    depthTest: true,
    depthWrite: true,
    alphaTest: 0.5,
    side: THREE.DoubleSide,
  });
  const thoughtMesh = new THREE.Mesh(thoughtGeo, thoughtMat);
  thoughtMesh.position.set(0, 6.0, 0);
  thoughtMesh.visible = false;
  g.add(thoughtMesh);

  const targetScale = o.scale ?? 0.85;
  g.scale.setScalar(targetScale);

  g.userData.rig = {
    legL,
    legR,
    armL,
    armR,
    upperBody,
    thoughtMesh,
    thoughtMat,
    targetScale,
    isRobot: false,
  };

  return g;
}

export function createRiggedRobot(o = {}) {
  const g = new THREE.Group();
  const color = o.color ?? C.botBody;
  const screenCol = o.screenCol ?? C.botScreen;

  const legL = new THREE.Group();
  legL.position.set(-0.35, 0.8, 0);
  legL.add(put(box(0.45, 0.8, 0.45, C.metalGrey), 0, -0.4, 0));
  g.add(legL);

  const legR = new THREE.Group();
  legR.position.set(0.35, 0.8, 0);
  legR.add(put(box(0.45, 0.8, 0.45, C.metalGrey), 0, -0.4, 0));
  g.add(legR);

  const upperBody = new THREE.Group();
  upperBody.add(put(box(1.5, 1.6, 1.1, color), 0, 1.5, 0));

  const armL = new THREE.Group();
  armL.position.set(-0.95, 2.0, 0);
  armL.add(put(box(0.4, 1.1, 0.4, C.metalGrey), 0, -0.55, 0));
  upperBody.add(armL);

  const armR = new THREE.Group();
  armR.position.set(0.95, 2.0, 0);
  armR.add(put(box(0.4, 1.1, 0.4, C.metalGrey), 0, -0.55, 0));
  upperBody.add(armR);

  upperBody.add(put(box(0.5, 0.3, 0.5, C.metalDark), 0, 2.45, 0));
  upperBody.add(put(box(1.3, 1.1, 1.1, color), 0, 3.05, 0));
  upperBody.add(put(box(0.95, 0.7, 0.15, C.black), 0, 3.05, 0.55));
  upperBody.add(put(box(0.25, 0.25, 0.1, screenCol, { emissive: screenCol, ei: 0.9 }), -0.25, 3.05, 0.62));
  upperBody.add(put(box(0.25, 0.25, 0.1, screenCol, { emissive: screenCol, ei: 0.9 }), 0.25, 3.05, 0.62));
  upperBody.add(put(box(0.15, 0.6, 0.15, C.metalGrey), 0, 3.85, 0));
  upperBody.add(put(box(0.35, 0.35, 0.35, C.clockYellow), 0, 4.2, 0));

  g.add(upperBody);

  const thoughtGeo = new THREE.PlaneGeometry(9.6, 4.8);
  const thoughtMat = new THREE.MeshBasicMaterial({
    transparent: true,
    depthTest: true,
    depthWrite: true,
    alphaTest: 0.5,
    side: THREE.DoubleSide,
  });
  const thoughtMesh = new THREE.Mesh(thoughtGeo, thoughtMat);
  thoughtMesh.position.set(0, 6.0, 0);
  thoughtMesh.visible = false;
  g.add(thoughtMesh);

  const targetScale = o.scale ?? 0.85;
  g.scale.setScalar(targetScale);

  g.userData.rig = {
    legL,
    legR,
    armL,
    armR,
    upperBody,
    thoughtMesh,
    thoughtMat,
    targetScale,
    isRobot: true,
  };
  return g;
}

// ==========================================
// 5. CROWD MANAGER CLASS
// ==========================================

function depenetrateActor(actor) {
  const { mesh } = actor;
  const currentY = mesh.position.y;
  const r = 0.82;

  for (let i = 0; i < OBSTACLES.length; i++) {
    const obs = OBSTACLES[i];
    if (currentY + 0.35 >= obs.minY && currentY + 0.35 <= obs.maxY) {
      if (
        mesh.position.x + r > obs.minX &&
        mesh.position.x - r < obs.maxX &&
        mesh.position.z + r > obs.minZ &&
        mesh.position.z - r < obs.maxZ
      ) {
        const pushLeft = obs.minX - r - mesh.position.x;
        const pushRight = obs.maxX + r - mesh.position.x;
        const pushBack = obs.minZ - r - mesh.position.z;
        const pushFront = obs.maxZ + r - mesh.position.z;

        const absL = Math.abs(pushLeft);
        const absR = Math.abs(pushRight);
        const absB = Math.abs(pushBack);
        const absF = Math.abs(pushFront);
        const minP = Math.min(absL, absR, absB, absF);

        if (minP === absL) {
          mesh.position.x = obs.minX - r;
          actor.heading = -Math.PI / 2;
        } else if (minP === absR) {
          mesh.position.x = obs.maxX + r;
          actor.heading = Math.PI / 2;
        } else if (minP === absB) {
          mesh.position.z = obs.minZ - r;
          actor.heading = Math.PI;
        } else {
          mesh.position.z = obs.maxZ + r;
          actor.heading = 0;
        }
        actor.targetHeading = actor.heading;
        mesh.rotation.y = actor.heading;
        actor.wanderTimer = 1.5;
      }
    }
  }
}

export class CrowdManager {
  constructor(cityGroup, options = {}) {
    this.city = cityGroup;
    this.reduced = options.reduced ?? false;
    this.bus = options.bus ?? null;
    this.charactersGroup = new THREE.Group();
    this.charactersGroup.name = 'crowd_characters';
    this.city.add(this.charactersGroup);
    this.actors = [];
    this.lastCamera = null;
  }

  setBus(busMesh) {
    this.bus = busMesh;
  }

  addActor(mesh, config = {}) {
    const rig = mesh.userData.rig || {
      targetScale: 0.85,
      legL: null,
      legR: null,
      armL: null,
      armR: null,
      upperBody: null,
      thoughtMesh: null,
      thoughtMat: null,
    };

    const initialPos = config.pos
      ? new THREE.Vector3(config.pos.x, config.pos.y, config.pos.z)
      : new THREE.Vector3(0, 0.28, 0);

    mesh.position.copy(initialPos);
    mesh.rotation.y = config.heading ?? Math.random() * Math.PI * 2;
    this.charactersGroup.add(mesh);

    const actor = {
      mesh,
      rig,
      state: 'WALKING', // WALKING | JUMPING | LANDING | THINKING | FALLING | DISAPPEARING | RESPAWNING | POPPING_IN
      pos: initialPos.clone(),
      vel: new THREE.Vector3(0, 0, 0),
      speed: config.speed ?? (3.6 + Math.random() * 2.2),
      heading: mesh.rotation.y,
      targetHeading: mesh.rotation.y,
      walkPhase: Math.random() * Math.PI * 2,
      wanderTimer: 1.5 + Math.random() * 2.5,
      thoughtTimer: 2.0 + Math.random() * 10.0, // Staggered initial thoughts
      timer: 0,
      behavior: config.behavior ?? 'roamer', // 'roamer' | 'district' | 'cliff_walker'
      homeBounds: config.homeBounds ?? null,
      homeSpawns: config.homeSpawns ?? [initialPos.clone()],
      pauseTimer: 0,
      hitCooldown: 0,
      isHitByBus: false,

      // Jump parameters
      jumpStart: new THREE.Vector3(),
      jumpTarget: new THREE.Vector3(),
      jumpProgress: 0,
      jumpDuration: 0.65,
      jumpArcHeight: 2.0,
    };

    this.actors.push(actor);
    return actor;
  }

  update(t, dt, camera = null) {
    if (this.reduced) return;
    const clampedDt = Math.min(dt, 0.05);
    if (camera) this.lastCamera = camera;

    // Check collision between bus and pedestrians
    if (this.bus) {
      this.checkBusCollisions(t, clampedDt);
    }

    for (let i = 0; i < this.actors.length; i++) {
      this.updateActor(this.actors[i], t, clampedDt, this.lastCamera);
    }
  }

  checkBusCollisions(t, dt) {
    if (!this.bus) return;
    const busPos = this.bus.position;
    const busRot = this.bus.rotation.y;

    // Half extents of the bus (busW: 5.2, busL: 13.8) + character radius tolerance
    const halfW = 2.9;
    const halfL = 7.4;

    const cosR = Math.cos(-busRot);
    const sinR = Math.sin(-busRot);

    for (let i = 0; i < this.actors.length; i++) {
      const actor = this.actors[i];
      if (actor.hitCooldown > 0) {
        actor.hitCooldown -= dt;
      }

      // Only hit active walkable or thinking/jumping/landing characters
      if (
        actor.state === 'DISAPPEARING' ||
        actor.state === 'RESPAWNING' ||
        actor.state === 'POPPING_IN'
      ) {
        continue;
      }

      const charPos = actor.mesh.position;
      // Check height proximity (bus is at y = -5.55, height 5.4)
      if (Math.abs(charPos.y - busPos.y) > 3.5) continue;

      // Transform character position into bus local coordinate space
      const dx = charPos.x - busPos.x;
      const dz = charPos.z - busPos.z;
      const localX = dx * cosR - dz * sinR;
      const localZ = dx * sinR + dz * cosR;

      if (Math.abs(localX) < halfW && Math.abs(localZ) < halfL && actor.hitCooldown <= 0) {
        // COLLISION WITH BUS!
        actor.hitCooldown = 2.5; // Avoid immediate re-hit
        actor.isHitByBus = true;

        // Hide thought bubble if active
        if (actor.rig.thoughtMesh) actor.rig.thoughtMesh.visible = false;

        // Compute knockback direction away from bus
        const sideSign = localX >= 0 ? 1 : -1;
        // World side direction
        const sideWorldX = Math.cos(busRot) * sideSign;
        const sideWorldZ = -Math.sin(busRot) * sideSign;

        // Forward momentum from bus
        const fwdWorldX = Math.sin(busRot);
        const fwdWorldZ = Math.cos(busRot);

        // Combined outward impulse
        const impulseX = sideWorldX * 0.8 + fwdWorldX * 0.6;
        const impulseZ = sideWorldZ * 0.8 + fwdWorldZ * 0.6;
        const len = Math.hypot(impulseX, impulseZ) || 1;

        const knockSpeed = 12.5;
        actor.vel.set((impulseX / len) * knockSpeed, 7.8, (impulseZ / len) * knockSpeed);

        // Set state to FALLING
        actor.state = 'FALLING';

        // Tumble rotation
        actor.heading += Math.PI * 0.5 * sideSign;
        actor.targetHeading = actor.heading;
      }
    }
  }

  updateActor(actor, t, dt, camera) {
    switch (actor.state) {
      case 'WALKING':
        this.updateWalking(actor, t, dt);
        break;

      case 'JUMPING':
        this.updateJumping(actor, t, dt);
        break;

      case 'LANDING':
        this.updateLanding(actor, t, dt);
        break;

      case 'THINKING':
        this.updateThinking(actor, t, dt, camera);
        break;

      case 'FALLING':
        this.updateFalling(actor, t, dt);
        break;

      case 'DISAPPEARING':
        this.updateDisappearing(actor, t, dt);
        break;

      case 'RESPAWNING':
        this.updateRespawning(actor, t, dt);
        break;

      case 'POPPING_IN':
        this.updatePoppingIn(actor, t, dt);
        break;
    }
  }

  startJump(actor, targetX, targetY, targetZ, arcHeight = 1.8) {
    actor.state = 'JUMPING';
    actor.jumpStart.copy(actor.mesh.position);
    actor.jumpTarget.set(targetX, targetY, targetZ);
    actor.jumpProgress = 0;
    const dist = Math.hypot(targetX - actor.mesh.position.x, targetZ - actor.mesh.position.z);
    actor.jumpDuration = Math.max(0.45, Math.min(0.85, 0.35 + dist * 0.08));
    actor.jumpArcHeight = Math.max(arcHeight, Math.abs(targetY - actor.mesh.position.y) * 0.5 + 1.2);

    actor.heading = Math.atan2(targetX - actor.mesh.position.x, targetZ - actor.mesh.position.z);
    actor.targetHeading = actor.heading;
    actor.mesh.rotation.y = actor.heading;
  }

  startThinking(actor) {
    actor.state = 'THINKING';
    actor.timer = 3.6; // 3.6s thought duration
    actor.thoughtTimer = 9.0 + Math.random() * 16.0; // Next thought cooldown

    const phrase = THOUGHT_PHRASES[Math.floor(Math.random() * THOUGHT_PHRASES.length)];
    const tex = getThoughtBubbleTexture(phrase);

    if (actor.rig.thoughtMat) {
      actor.rig.thoughtMat.map = tex;
      actor.rig.thoughtMat.needsUpdate = true;
    }

    if (actor.rig.thoughtMesh) {
      actor.rig.thoughtMesh.visible = true;
      actor.rig.thoughtMesh.scale.setScalar(0.001);
      if (this.lastCamera) {
        actor.rig.thoughtMesh.quaternion.copy(actor.mesh.quaternion).invert().multiply(this.lastCamera.quaternion);
      }
    }
  }

  updateWalking(actor, t, dt) {
    const { mesh, rig } = actor;

    // 1. Strict obstacle de-penetration (never clip or get trapped inside walls/geometry)
    depenetrateActor(actor);

    // 2. Anti-stuck watchdog: if stuck in place for too long, deflect or teleport to safety
    if (!actor.lastPos) actor.lastPos = mesh.position.clone();
    const dMoved = Math.hypot(mesh.position.x - actor.lastPos.x, mesh.position.z - actor.lastPos.z);
    actor.lastPos.copy(mesh.position);

    if (dMoved < 0.04 && actor.pauseTimer <= 0) {
      actor.stuckTime = (actor.stuckTime || 0) + dt;
    } else {
      actor.stuckTime = 0;
    }

    if (actor.stuckTime > 1.6) {
      // Deflect away from blockage
      actor.heading += Math.PI * (0.75 + Math.random() * 0.5);
      actor.targetHeading = actor.heading;
      mesh.rotation.y = actor.heading;
      actor.wanderTimer = 2.0;
    }

    if (actor.stuckTime > 3.8) {
      // Hard stuck watchdog: reset to safe spawn point
      const safeSpawn = (actor.homeSpawns && actor.homeSpawns[0]) || SPAWN_POINTS[0];
      mesh.position.set(safeSpawn.x, safeSpawn.y, safeSpawn.z);
      actor.vel.set(0, 0, 0);
      actor.stuckTime = 0;
      actor.heading = Math.random() * Math.PI * 2;
      actor.targetHeading = actor.heading;
      mesh.rotation.y = actor.heading;
      return;
    }

    // 3. Periodic thought trigger
    actor.thoughtTimer -= dt;
    if (actor.thoughtTimer <= 0) {
      this.startThinking(actor);
      return;
    }

    // 4. Periodic wander steering (stable, smooth, obstacle-aware)
    actor.wanderTimer -= dt;
    if (actor.wanderTimer <= 0) {
      actor.wanderTimer = 2.2 + Math.random() * 3.5;

      // Occasional brief pause
      if (Math.random() < 0.15 && actor.pauseTimer <= 0) {
        actor.pauseTimer = 0.8 + Math.random() * 1.4;
      }

      if (actor.behavior === 'district' && actor.homeBounds) {
        // Pick target inside district bounds, ensuring it's not facing a wall
        const targetX = actor.homeBounds.minX + Math.random() * (actor.homeBounds.maxX - actor.homeBounds.minX);
        const targetZ = actor.homeBounds.minZ + Math.random() * (actor.homeBounds.maxZ - actor.homeBounds.minZ);
        const candHeading = Math.atan2(targetX - mesh.position.x, targetZ - mesh.position.z);

        const testX = mesh.position.x + Math.sin(candHeading) * 2.0;
        const testZ = mesh.position.z + Math.cos(candHeading) * 2.0;
        const testCol = checkObstacleCollision(testX, testZ, mesh.position.y, 0.75);
        if (!testCol.hit) {
          actor.targetHeading = candHeading;
        } else {
          actor.targetHeading = Math.atan2(testCol.normal.nx, testCol.normal.nz);
        }
      } else if (actor.behavior === 'cliff_walker') {
        actor.targetHeading += (Math.random() - 0.5) * 1.2;
      } else {
        actor.targetHeading += (Math.random() - 0.5) * 1.6;
      }

      // Spontaneous playful hop while walking in clear space
      if (Math.random() < 0.07 && actor.pauseTimer <= 0) {
        const hopDist = 3.6;
        const hopX = mesh.position.x + Math.sin(actor.heading) * hopDist;
        const hopZ = mesh.position.z + Math.cos(actor.heading) * hopDist;
        const hopFloor = getFloorHeight(hopX, hopZ, mesh.position.y);
        if (hopFloor !== null) {
          const hopCol = checkObstacleCollision(hopX, hopZ, hopFloor, 0.85);
          const midX = (mesh.position.x + hopX) / 2;
          const midZ = (mesh.position.z + hopZ) / 2;
          const midCol = checkObstacleCollision(midX, midZ, Math.max(mesh.position.y, hopFloor) + 1.0, 0.8);
          if (!hopCol.hit && !midCol.hit) {
            this.startJump(actor, hopX, hopFloor, hopZ, 1.4);
            return;
          }
        }
      }
    }

    // 5. Smooth, rate-limited heading rotation without snapping
    const diff = wrapAngle(actor.targetHeading - actor.heading);
    actor.heading += diff * Math.min(1, dt * 5.0);
    mesh.rotation.y = actor.heading;

    // 5. Handle pause / movement
    let isMoving = true;
    if (actor.pauseTimer > 0) {
      actor.pauseTimer -= dt;
      isMoving = false;
    }

    if (isMoving) {
      const vx = Math.sin(actor.heading) * actor.speed;
      const vz = Math.cos(actor.heading) * actor.speed;
      const nextX = mesh.position.x + vx * dt;
      const nextZ = mesh.position.z + vz * dt;

      // Check solid obstacle collision at next step
      const col = checkObstacleCollision(nextX, nextZ, mesh.position.y, 0.82);
      if (col.hit) {
        if (col.jumpable && col.topY > mesh.position.y && col.topY <= mesh.position.y + 4.8) {
          // Jump onto obstacle surface
          const jumpDist = 4.2;
          const jumpTargetX = mesh.position.x + Math.sin(actor.heading) * jumpDist;
          const jumpTargetZ = mesh.position.z + Math.cos(actor.heading) * jumpDist;
          this.startJump(actor, jumpTargetX, col.topY, jumpTargetZ, 1.8);
          return;
        } else {
          // Smoothly slide and deflect off wall
          const nx = col.normal.nx;
          const nz = col.normal.nz;

          // Push slightly away from obstacle along normal
          mesh.position.x += nx * 0.12;
          mesh.position.z += nz * 0.12;

          // Compute reflection / sliding angle
          const currentVx = Math.sin(actor.heading);
          const currentVz = Math.cos(actor.heading);
          const tangentX = -nz;
          const tangentZ = nx;
          const tanDot = currentVx * tangentX + currentVz * tangentZ;
          const sideBias = tanDot >= 0 ? 0.45 : -0.45;

          const awayAngle = Math.atan2(nx, nz) + sideBias;
          actor.heading = awayAngle;
          actor.targetHeading = awayAngle;
          mesh.rotation.y = awayAngle;

          // Walk stably away for at least 1.8 - 3.2 seconds
          actor.wanderTimer = 1.8 + Math.random() * 1.4;
          return;
        }
      }

      // Check if stepping towards a higher elevated platform ledge (e.g. YouTube red platform)
      const higherLedgeY = findJumpableTarget(nextX, nextZ, mesh.position.y);
      if (higherLedgeY !== null) {
        const jumpDist = 4.8;
        const jumpTargetX = mesh.position.x + Math.sin(actor.heading) * jumpDist;
        const jumpTargetZ = mesh.position.z + Math.cos(actor.heading) * jumpDist;
        const jumpObstacle = checkObstacleCollision(jumpTargetX, jumpTargetZ, higherLedgeY, 0.75);
        if (!jumpObstacle.hit) {
          this.startJump(actor, jumpTargetX, higherLedgeY, jumpTargetZ, 2.0);
          return;
        }
      }

      // Floor height check
      const floorY = getFloorHeight(nextX, nextZ, mesh.position.y);

      // Check if stepping off an edge
      if (floorY === null || floorY < mesh.position.y - 1.4) {
        mesh.position.x = nextX;
        mesh.position.z = nextZ;
        actor.vel.set(vx * 0.9, 0.8, vz * 0.9);
        actor.state = 'FALLING';
        return;
      }

      // Normal smooth walking on ground
      mesh.position.x = nextX;
      mesh.position.z = nextZ;
      mesh.position.y += (floorY - mesh.position.y) * Math.min(1, dt * 14.0);

      // Striding limb animation
      actor.walkPhase += dt * actor.speed * 2.4;
      const legSwing = Math.sin(actor.walkPhase) * 0.65;
      const armSwing = Math.sin(actor.walkPhase) * 0.55;

      if (rig.legL) rig.legL.rotation.x = legSwing;
      if (rig.legR) rig.legR.rotation.x = -legSwing;
      if (rig.armL) rig.armL.rotation.x = -armSwing;
      if (rig.armR) rig.armR.rotation.x = armSwing;
      if (rig.upperBody) {
        rig.upperBody.position.y = Math.abs(Math.sin(actor.walkPhase)) * 0.16;
        rig.upperBody.rotation.z = Math.sin(actor.walkPhase) * 0.04;
        rig.upperBody.rotation.x = 0.04;
      }
    } else {
      // Idle breathing / fidget
      if (rig.legL) rig.legL.rotation.x *= 0.8;
      if (rig.legR) rig.legR.rotation.x *= 0.8;
      if (rig.armL) rig.armL.rotation.x *= 0.8;
      if (rig.armR) rig.armR.rotation.x *= 0.8;
      if (rig.upperBody) {
        rig.upperBody.position.y = Math.sin(t * 3.5) * 0.04;
        rig.upperBody.rotation.z = 0;
        rig.upperBody.rotation.x = 0;
      }
    }
  }

  updateJumping(actor, t, dt) {
    const { mesh, rig } = actor;
    actor.jumpProgress += dt;
    const u = Math.min(1, actor.jumpProgress / actor.jumpDuration);

    // Parabolic arc interpolation
    mesh.position.x = actor.jumpStart.x + (actor.jumpTarget.x - actor.jumpStart.x) * u;
    mesh.position.z = actor.jumpStart.z + (actor.jumpTarget.z - actor.jumpStart.z) * u;
    const baseLinearY = actor.jumpStart.y + (actor.jumpTarget.y - actor.jumpStart.y) * u;
    mesh.position.y = baseLinearY + 4 * actor.jumpArcHeight * u * (1 - u);

    // Dynamic jumping pose
    if (rig.legL) rig.legL.rotation.x = -0.65;
    if (rig.legR) rig.legR.rotation.x = -0.65;
    if (rig.armL) {
      rig.armL.rotation.z = 1.35;
      rig.armL.rotation.x = -0.4;
    }
    if (rig.armR) {
      rig.armR.rotation.z = -1.35;
      rig.armR.rotation.x = -0.4;
    }
    if (rig.upperBody) {
      rig.upperBody.rotation.x = 0.22;
      rig.upperBody.rotation.z = 0;
    }

    if (u >= 1) {
      mesh.position.y = actor.jumpTarget.y;
      actor.vel.set(0, 0, 0);
      actor.state = 'LANDING';
      actor.timer = 0.18;
    }
  }

  updateThinking(actor, t, dt, camera) {
    const { mesh, rig } = actor;
    actor.timer -= dt;

    // Pop-in (first 0.35s), Floating middle, Pop-out (last 0.35s)
    let scale = 1.0;
    if (actor.timer > 3.25) {
      const p = Math.min(1, (3.6 - actor.timer) / 0.35);
      scale = easeOutBack(p);
    } else if (actor.timer < 0.35) {
      scale = Math.max(0.001, actor.timer / 0.35);
    }

    if (rig.thoughtMesh) {
      rig.thoughtMesh.scale.setScalar(scale);
      rig.thoughtMesh.position.y = 6.0 + Math.sin(t * 3.5) * 0.22;
      if (camera) {
        rig.thoughtMesh.quaternion.copy(mesh.quaternion).invert().multiply(camera.quaternion);
      }
    }

    // Thinking pose (scratching head / pondering)
    if (rig.armR) {
      rig.armR.rotation.x = -1.95;
      rig.armR.rotation.z = -0.42;
    }
    if (rig.armL) {
      rig.armL.rotation.x = -0.25;
      rig.armL.rotation.z = 0.35;
    }
    if (rig.legL) rig.legL.rotation.x *= 0.8;
    if (rig.legR) rig.legR.rotation.x *= 0.8;
    if (rig.upperBody) {
      rig.upperBody.rotation.z = 0.08;
      rig.upperBody.rotation.x = -0.06;
      rig.upperBody.position.y = Math.sin(t * 4.0) * 0.05;
    }

    if (actor.timer <= 0) {
      if (rig.thoughtMesh) rig.thoughtMesh.visible = false;
      if (rig.upperBody) {
        rig.upperBody.rotation.set(0, 0, 0);
        rig.upperBody.position.set(0, 0, 0);
      }
      if (rig.armR) rig.armR.rotation.set(0, 0, 0);
      if (rig.armL) rig.armL.rotation.set(0, 0, 0);

      actor.state = 'WALKING';
      actor.heading += (Math.random() - 0.5) * 1.5;
      actor.targetHeading = actor.heading;
      actor.wanderTimer = 1.0;
    }
  }

  updateFalling(actor, t, dt) {
    const { mesh, rig } = actor;

    actor.vel.y -= 38.0 * dt;
    mesh.position.x += actor.vel.x * dt;
    mesh.position.z += actor.vel.z * dt;
    mesh.position.y += actor.vel.y * dt;

    if (rig.thoughtMesh) rig.thoughtMesh.visible = false;

    // Flailing arms & kicking legs in freefall
    const flailLeg = Math.sin(t * 22) * 0.85;
    const flailArm = Math.sin(t * 25) * 0.45;

    if (rig.legL) rig.legL.rotation.x = flailLeg + 0.25;
    if (rig.legR) rig.legR.rotation.x = -flailLeg - 0.25;
    if (rig.armL) {
      rig.armL.rotation.z = 1.35 + flailArm;
      rig.armL.rotation.x = Math.cos(t * 20) * 0.3;
    }
    if (rig.armR) {
      rig.armR.rotation.z = -1.35 - flailArm;
      rig.armR.rotation.x = -Math.cos(t * 20) * 0.3;
    }
    if (rig.upperBody) {
      rig.upperBody.rotation.x = Math.min(0.65, -actor.vel.y * 0.035);
      rig.upperBody.rotation.z = Math.sin(t * 16) * 0.28;
    }

    // Check landing on a lower platform
    const floorY = getFloorHeight(mesh.position.x, mesh.position.z, mesh.position.y);
    if (floorY !== null && mesh.position.y <= floorY + 0.35 && actor.vel.y < 0) {
      mesh.position.y = floorY;
      actor.vel.set(0, 0, 0);
      actor.state = 'LANDING';
      actor.timer = actor.isHitByBus ? 1.0 : 0.22;
      return;
    }

    // Fall into void below diorama
    if (mesh.position.y < -13.0) {
      actor.isHitByBus = false;
      actor.state = 'DISAPPEARING';
      actor.timer = 0.45;
    }
  }

  updateLanding(actor, t, dt) {
    const { rig } = actor;
    actor.timer -= dt;

    if (actor.isHitByBus) {
      // Knocked down on ground by bus
      if (rig.upperBody) {
        rig.upperBody.rotation.set(-1.1, 0, 0.25);
        rig.upperBody.position.y = -0.35;
        rig.upperBody.scale.set(1.05, 0.85, 1.05);
      }
      if (rig.legL) rig.legL.rotation.set(0.6, 0, 0);
      if (rig.legR) rig.legR.rotation.set(0.6, 0, 0);
      if (rig.armL) rig.armL.rotation.set(-0.8, 0, 0.8);
      if (rig.armR) rig.armR.rotation.set(-0.8, 0, -0.8);
    } else {
      // Normal landing squash
      if (rig.upperBody) {
        rig.upperBody.scale.set(1.15, 0.72, 1.15);
        rig.upperBody.position.y = -0.25;
        rig.upperBody.rotation.set(0, 0, 0);
      }
      if (rig.legL) rig.legL.rotation.set(0, 0, 0);
      if (rig.legR) rig.legR.rotation.set(0, 0, 0);
      if (rig.armL) rig.armL.rotation.set(0, 0, 0);
      if (rig.armR) rig.armR.rotation.set(0, 0, 0);
    }

    if (actor.timer <= 0) {
      if (rig.upperBody) {
        rig.upperBody.scale.set(1, 1, 1);
        rig.upperBody.position.set(0, 0, 0);
        rig.upperBody.rotation.set(0, 0, 0);
      }
      if (rig.legL) rig.legL.rotation.set(0, 0, 0);
      if (rig.legR) rig.legR.rotation.set(0, 0, 0);
      if (rig.armL) rig.armL.rotation.set(0, 0, 0);
      if (rig.armR) rig.armR.rotation.set(0, 0, 0);

      actor.isHitByBus = false;
      actor.state = 'WALKING';
      actor.heading = actor.mesh.rotation.y + (Math.random() - 0.5) * 1.5;
      actor.targetHeading = actor.heading;
      actor.wanderTimer = 1.2;
    }
  }

  updateDisappearing(actor, t, dt) {
    const { mesh, rig } = actor;
    actor.timer -= dt;

    mesh.rotation.y += dt * 12.0;
    mesh.rotation.x += dt * 6.0;

    const frac = Math.max(0, actor.timer / 0.45);
    mesh.scale.setScalar(rig.targetScale * frac);

    if (actor.timer <= 0) {
      mesh.visible = false;
      actor.state = 'RESPAWNING';
      actor.timer = 0.6 + Math.random() * 1.6;
    }
  }

  updateRespawning(actor, t, dt) {
    actor.timer -= dt;
    if (actor.timer <= 0) {
      const { mesh, rig } = actor;

      let spawn;
      if (actor.homeSpawns && actor.homeSpawns.length > 0 && Math.random() < 0.65) {
        spawn = actor.homeSpawns[Math.floor(Math.random() * actor.homeSpawns.length)];
      } else {
        spawn = SPAWN_POINTS[Math.floor(Math.random() * SPAWN_POINTS.length)];
      }

      mesh.position.set(spawn.x, spawn.y, spawn.z);
      actor.heading = Math.random() * Math.PI * 2;
      actor.targetHeading = actor.heading;
      mesh.rotation.set(0, actor.heading, 0);

      if (rig.legL) rig.legL.rotation.set(0, 0, 0);
      if (rig.legR) rig.legR.rotation.set(0, 0, 0);
      if (rig.armL) rig.armL.rotation.set(0, 0, 0);
      if (rig.armR) rig.armR.rotation.set(0, 0, 0);
      if (rig.upperBody) {
        rig.upperBody.position.set(0, 0, 0);
        rig.upperBody.rotation.set(0, 0, 0);
        rig.upperBody.scale.set(1, 1, 1);
      }
      if (rig.thoughtMesh) rig.thoughtMesh.visible = false;

      mesh.scale.setScalar(0.001);
      mesh.visible = true;
      actor.state = 'POPPING_IN';
      actor.timer = 0;
    }
  }

  updatePoppingIn(actor, t, dt) {
    const { mesh, rig } = actor;
    actor.timer += dt;
    const progress = Math.min(1, actor.timer / 0.35);
    const s = easeOutBack(progress) * rig.targetScale;
    mesh.scale.setScalar(Math.max(0.001, s));

    if (progress >= 1) {
      mesh.scale.setScalar(rig.targetScale);
      actor.state = 'WALKING';
      actor.wanderTimer = 0.5;
    }
  }
}

/**
 * Initialize and populate all animated characters and bots across the diorama scene.
 */
export function createCrowd(cityGroup, options = {}) {
  const manager = new CrowdManager(cityGroup, options);

  // 1. YouTube Shorts Resident (Walking & hopping on the red platform!)
  const ytChar = createRiggedCharacter({ shirt: C.clockYellow, pants: C.vkBlue, scale: 0.68 });
  manager.addActor(ytChar, {
    pos: { x: 0.2, y: 3.68, z: 24.5 },
    behavior: 'cliff_walker',
    speed: 4.0,
    homeBounds: { minX: -16, maxX: 1, minZ: 13, maxZ: 31 },
    homeSpawns: [
      new THREE.Vector3(0.2, 3.68, 24.5),
      new THREE.Vector3(-6.5, 3.68, 24.0),
      new THREE.Vector3(-2.0, 3.68, 27.0),
    ],
  });

  // 2. VK District Residents (Front-Left)
  const vkChar1 = createRiggedCharacter({ shirt: C.white, pants: C.woodLeg, scale: 0.82 });
  manager.addActor(vkChar1, {
    pos: { x: -33, y: 0.28, z: 25 },
    behavior: 'district',
    speed: 3.8,
    homeBounds: { minX: -40, maxX: -18, minZ: 10, maxZ: 31 },
    homeSpawns: [new THREE.Vector3(-33, 0.28, 25), new THREE.Vector3(-25, 0.28, 21)],
  });

  const vkChar2 = createRiggedCharacter({ shirt: C.groundShadow, pants: C.postilkaNavy, scale: 0.82 });
  manager.addActor(vkChar2, {
    pos: { x: -25, y: 0.28, z: 25 },
    behavior: 'roamer',
    speed: 4.2,
    homeBounds: { minX: -40, maxX: -18, minZ: 10, maxZ: 31 },
    homeSpawns: [new THREE.Vector3(-25, 0.28, 25)],
  });

  // 3. Telegram District Residents (Elevated top-left podium at y=5.0)
  const tgChar1 = createRiggedCharacter({ shirt: C.photoPink, pants: C.postilkaNavy, scale: 0.85 });
  manager.addActor(tgChar1, {
    pos: { x: -52, y: 5.0, z: 18 },
    behavior: 'cliff_walker',
    speed: 4.2,
    homeBounds: { minX: -57, maxX: -33, minZ: -7, maxZ: 21 },
    homeSpawns: [new THREE.Vector3(-52, 5.0, 18), new THREE.Vector3(-42, 5.0, 8)],
  });

  const tgChar2 = createRiggedCharacter({ shirt: C.telegramSky, pants: C.vkBlue, scale: 0.85 });
  manager.addActor(tgChar2, {
    pos: { x: -44, y: 5.0, z: 18 },
    behavior: 'district',
    speed: 4.0,
    homeBounds: { minX: -57, maxX: -33, minZ: -7, maxZ: 21 },
    homeSpawns: [new THREE.Vector3(-44, 5.0, 18)],
  });

  const tgBot = createRiggedRobot({ color: C.botBody, screenCol: C.telegramSky, scale: 0.82 });
  manager.addActor(tgBot, {
    pos: { x: -54, y: 5.0, z: 14 },
    behavior: 'district',
    speed: 3.5,
    homeBounds: { minX: -57, maxX: -33, minZ: -7, maxZ: 21 },
    homeSpawns: [new THREE.Vector3(-54, 5.0, 14)],
  });

  // 4. Zen Articles District Resident (Front-Center-Right)
  const zenChar = createRiggedCharacter({ shirt: C.black, pants: C.white, scale: 0.82 });
  manager.addActor(zenChar, {
    pos: { x: 10, y: 0.28, z: 25 },
    behavior: 'district',
    speed: 3.8,
    homeBounds: { minX: 3, maxX: 21, minZ: 12, maxZ: 31 },
    homeSpawns: [new THREE.Vector3(10, 0.28, 25), new THREE.Vector3(15, 0.28, 20)],
  });

  // 5. Photochka District Resident (Front-Right)
  const photoChar = createRiggedCharacter({ shirt: C.photoPink, pants: C.vkBlue, scale: 0.82 });
  manager.addActor(photoChar, {
    pos: { x: 33, y: 0.35, z: 25 },
    behavior: 'roamer',
    speed: 4.0,
    homeBounds: { minX: 21, maxX: 41, minZ: 10, maxZ: 31 },
    homeSpawns: [new THREE.Vector3(33, 0.35, 25), new THREE.Vector3(26, 0.35, 18)],
  });

  // 5B. MAX District Resident (Far-Right)
  const maxChar = createRiggedCharacter({ shirt: C.maxTeal, pants: C.white, hair: C.hairDark, scale: 0.82 });
  manager.addActor(maxChar, {
    pos: { x: 44, y: 0.42, z: -4 },
    behavior: 'district',
    speed: 3.7,
    homeBounds: { minX: 39, maxX: 53, minZ: -11, maxZ: 2 },
    homeSpawns: [new THREE.Vector3(44, 0.42, -4), new THREE.Vector3(48, 0.42, -2)],
  });

  // 6. Factory Floor Line Workers & Robots
  const lineBot = createRiggedRobot({ color: C.botBody, screenCol: C.screenGreen, scale: 0.82 });
  manager.addActor(lineBot, {
    pos: { x: 7, y: 0.28, z: -8 },
    behavior: 'roamer',
    speed: 3.6,
    homeSpawns: [new THREE.Vector3(7, 0.28, -8)],
  });

  const dispatchBot = createRiggedRobot({ color: C.metalGrey, screenCol: C.clockYellow, scale: 0.82 });
  manager.addActor(dispatchBot, {
    pos: { x: 23, y: 0.28, z: -8 },
    behavior: 'roamer',
    speed: 3.8,
    homeSpawns: [new THREE.Vector3(23, 0.28, -8)],
  });

  const moderator = createRiggedCharacter({
    shirt: C.screenGreen,
    pants: C.postilkaNavy,
    hair: C.hairDark,
    scale: 0.76,
  });
  manager.addActor(moderator, {
    pos: { x: 15, y: 0.28, z: -8 },
    behavior: 'roamer',
    speed: 3.9,
    homeSpawns: [new THREE.Vector3(15, 0.28, -8)],
  });

  // 7. Roaming Diorama Visitors / Explorers across the main floor & edges
  const roamer1 = createRiggedCharacter({
    shirt: C.photoCoralDk,
    pants: C.white,
    hair: C.hairBlond,
    scale: 0.82,
  });
  manager.addActor(roamer1, {
    pos: { x: -14, y: 0.28, z: 6 },
    behavior: 'cliff_walker',
    speed: 4.2,
    homeSpawns: [new THREE.Vector3(-14, 0.28, 6), new THREE.Vector3(-5, 0.28, 14)],
  });

  const roamer2 = createRiggedCharacter({
    shirt: C.maxDot,
    pants: C.hairDark,
    hair: C.hairBrown,
    scale: 0.82,
  });
  manager.addActor(roamer2, {
    pos: { x: 5, y: 0.28, z: 12 },
    behavior: 'roamer',
    speed: 4.1,
    homeSpawns: [new THREE.Vector3(5, 0.28, 12), new THREE.Vector3(18, 0.28, 6)],
  });

  const roamer3 = createRiggedCharacter({
    shirt: C.postilkaLight,
    pants: C.vkBlueDk,
    hair: C.hairDark,
    scale: 0.82,
  });
  manager.addActor(roamer3, {
    pos: { x: 22, y: 0.28, z: 4 },
    behavior: 'cliff_walker',
    speed: 4.3,
    homeSpawns: [new THREE.Vector3(22, 0.28, 4)],
  });

  const roamer4 = createRiggedCharacter({
    shirt: C.telegramSky,
    pants: C.photoCoralDk,
    hair: C.hairBlond,
    scale: 0.82,
  });
  manager.addActor(roamer4, {
    pos: { x: -36, y: 0.28, z: -4 },
    behavior: 'roamer',
    speed: 4.0,
    homeSpawns: [new THREE.Vector3(-36, 0.28, -4), new THREE.Vector3(-20, 0.28, -4)],
  });

  // 8. Outer Road Walkers (exploring the road track, waiting near bus stops, hopping and roaming)
  const roadWalker1 = createRiggedCharacter({
    shirt: C.busYellow,
    pants: C.metalDark,
    hair: C.hairBrown,
    scale: 0.82,
  });
  manager.addActor(roadWalker1, {
    pos: { x: -22, y: -5.85, z: 46 },
    behavior: 'cliff_walker',
    speed: 4.0,
    homeSpawns: [new THREE.Vector3(-22, -5.85, 46), new THREE.Vector3(0, -5.85, 46)],
  });

  const roadWalker2 = createRiggedCharacter({
    shirt: C.photoPink,
    pants: C.vkBlue,
    hair: C.hairBlond,
    scale: 0.82,
  });
  manager.addActor(roadWalker2, {
    pos: { x: 26, y: -5.85, z: 46 },
    behavior: 'cliff_walker',
    speed: 4.2,
    homeSpawns: [new THREE.Vector3(26, -5.85, 46), new THREE.Vector3(72, -5.85, 10)],
  });

  return manager;
}
