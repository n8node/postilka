import * as THREE from 'three';
import { createCrowd } from './crowd.js';
import {
  getPostilkaSignTexture,
  getSignTexture,
  getTelegramLogoTexture,
  getVKLogoTexture,
  getCalendarGridTexture,
  getGaugesTexture,
  getAdBillboardTexture,
  getArticleScrollTexture,
  getClockFaceTexture,
  getPaperSheetTexture,
  getCheckmarkTexture,
  getMaxFloorTexture,
  getYouTubeFloorTexture,
  getYouTubePlayTriangleTexture,
  getPhotochkaSignTexture,
  getPolaroidMainPhotoTexture,
  getPortraitBoyTexture,
  getPortraitGirlTexture,
  getPortraitVideoTexture,
  getZenSignTexture,
  getYouTubePhoneScreenTexture,
  getTelegramPostCardTexture,
  getCoffeeSignTexture,
  getBusDestinationTexture,
  getBusSideWindowsTexture,
  getBusStopSignTexture,
  getBusDepotSignTexture,
  getVKRoutingScreenTexture,
  getVKPostFeedScreenTexture,
  getVKContentProofScreenTexture,
  getVKLikeMonumentTexture,
  getBadgeTexture,
  getJourneyConsoleTexture,
  getVKJourneySignTexture,
  getYouTubeStudioSignTexture,
  getYouTubeSwitcherScreenTexture,
  getTelegramDispatcherSignTexture,
  getTelegramCirclesScreenTexture,
  getPostilkaMasterSignTexture,
  getPostilkaAnalyticsWallTexture,
  getDzenLogoTexture,
  getDzenJourneySignTexture,
  getDzenEditorScreenTexture,
  getDzenArticleMonumentTexture,
  getTelegramHeroSignTexture,
  getTelegramConsoleIconsTexture,
  getTelegramConveyorControlsTexture,
  getTelegramSpeechLogoTexture,
  getTelegramStickerTexture,
  getHazardStripeTexture,
  getRoadTerminusSignTexture,
} from './textures.js';

/** Color palette extracted directly from the reference image */
export const C = {
  // Stepped pedestals & ground
  groundSand: 0xf2ede7,
  groundShadow: 0xcfc5bd,
  groundBack: 0xddd4cc,
  groundTerrace: 0xbdb0a0,
  wallCream: 0xf5ead6,
  wallBevel: 0xdec6ab,

  // Postilka & Metal
  postilkaDark: 0x24334f,
  postilkaNavy: 0x334769,
  postilkaLight: 0x5a769e,
  metalGrey: 0x6e7e94,
  metalDark: 0x364052,
  pipeGrey: 0x8a98a8,

  // Districts
  telegramSky: 0x50a7ea,
  telegramDk: 0x3888c7,
  telegramGlass: 0xbfe3fa,
  vkBlue: 0x4473a8,
  vkBlueDk: 0x345b87,
  ytRed: 0xe62117,
  ytPhone: 0x222228,
  zenSand: 0xf5e2c4,
  zenWood: 0xb5824c,
  zenYellow: 0xffcc00,
  zenYellowLight: 0xffe066,
  zenDark: 0x222228,
  zenSlate: 0x2e2f38,
  zenPaper: 0xfaf6f0,
  photoPink: 0xf58a88,
  photoCoralDk: 0xdc6b69,
  maxTeal: 0x72cbb7,
  maxTealDk: 0x53a996,
  maxRoom: 0xf2eff9,
  maxRoomEdge: 0xc7c6de,
  maxDot: 0x7583c7,
  maxRobot: 0x8d98ab,
  maxRobotLight: 0xb8c0cd,

  // Props & Machinery
  woodPlank: 0xbe8c54,
  woodDark: 0x8f5f30,
  woodLeg: 0x5c3e20,
  parcelGold: 0xebb46c,
  parcelTape: 0xc48740,
  clockYellow: 0xf7c93e,
  clockRed: 0xe63946,
  checkGreen: 0x38d948,
  screenGreen: 0x34c759,
  white: 0xffffff,
  black: 0x1a1a24,
  botBody: 0x82bfe8,
  botScreen: 0x2ad19f,
  skinLight: 0xf8d2b2,
  skinWarm: 0xebb991,
  hairBrown: 0x5c4230,
  hairDark: 0x362419,
  hairBlond: 0xdfa84a,
  railSilver: 0x98a8b8,
  tieWood: 0x7c5432,

  // Bus & Outer Perimeter Track
  busYellow: 0xf5b324,
  busYellowDk: 0xdb9612,
  busCream: 0xfbf6e9,
  busGlass: 0x3d4a5d,
  trackGreen: 0x82bd48,
  trackGreenDk: 0x6ca336,
  trackRail: 0xd97543,
};

const _geo = {};
const _mat = {};

export function geo(w, h, d) {
  const k = `${w}_${h}_${d}`;
  return _geo[k] || (_geo[k] = new THREE.BoxGeometry(w, h, d));
}

export function mat(color, o = {}) {
  const k = `${color}|${o.rough ?? 0.88}|${o.emissive || 0}|${o.ei || 0}`;
  return (
    _mat[k] ||
    (_mat[k] = new THREE.MeshStandardMaterial({
      color,
      roughness: o.rough ?? 0.88,
      metalness: o.metalness ?? 0.05,
      emissive: o.emissive || 0x000000,
      emissiveIntensity: o.ei || 0,
    }))
  );
}

export function box(w, h, d, color, o = {}) {
  const material = o.texture
    ? new THREE.MeshStandardMaterial({
        map: o.texture,
        roughness: o.rough ?? 0.8,
        metalness: 0,
        emissive: o.emissive || 0x000000,
        emissiveIntensity: o.ei || 0,
      })
    : o.unique
    ? new THREE.MeshStandardMaterial({
        color,
        roughness: o.rough ?? 0.88,
        metalness: o.metalness ?? 0.05,
        emissive: o.emissive || 0x000000,
        emissiveIntensity: o.ei || 0,
      })
    : mat(color, o);

  const m = new THREE.Mesh(geo(w, h, d), material);
  m.castShadow = o.cast ?? true;
  m.receiveShadow = o.receive ?? true;
  return m;
}

export function put(m, x, y, z, rx = 0, ry = 0, rz = 0) {
  m.position.set(x, y, z);
  if (rx || ry || rz) m.rotation.set(rx, ry, rz);
  return m;
}

export function character(o = {}) {
  const g = new THREE.Group();
  const shirt = o.shirt ?? C.postilkaNavy;
  const pants = o.pants ?? C.vkBlue;
  const skin = o.skin ?? C.skinLight;
  const hair = o.hair ?? C.hairBrown;

  // Legs / shoes
  g.add(put(box(0.55, 0.9, 0.55, C.hairDark), -0.36, 0.45, 0));
  g.add(put(box(0.55, 0.9, 0.55, C.hairDark), 0.36, 0.45, 0));
  // Pants
  g.add(put(box(1.4, 0.8, 0.9, pants), 0, 1.1, 0));
  // Torso / Shirt
  g.add(put(box(1.6, 1.4, 1.0, shirt), 0, 2.0, 0));
  // Arms
  g.add(put(box(0.45, 1.2, 0.55, shirt), -1.02, 1.9, 0));
  g.add(put(box(0.45, 1.2, 0.55, shirt), 1.02, 1.9, 0));
  // Hands
  g.add(put(box(0.4, 0.4, 0.4, skin), -1.02, 1.15, 0));
  g.add(put(box(0.4, 0.4, 0.4, skin), 1.02, 1.15, 0));
  // Head
  g.add(put(box(1.35, 1.25, 1.25, skin), 0, 3.15, 0));
  // Eyes
  g.add(put(box(0.2, 0.22, 0.1, C.black), -0.3, 3.15, 0.65));
  g.add(put(box(0.2, 0.22, 0.1, C.black), 0.3, 3.15, 0.65));
  // Hair
  g.add(put(box(1.5, 0.6, 1.45, hair), 0, 3.85, 0));
  g.add(put(box(1.5, 0.7, 0.4, hair), 0, 3.4, -0.55));

  g.scale.setScalar(o.scale ?? 0.85);
  return g;
}

/** Voxel smartphone with red casing and stepped corners (YouTube Shorts reference). */
function buildYtPhone() {
  const g = new THREE.Group();
  const sw = 8.2; // Wider phone display
  const sh = 16.4;
  const sd = 1.35;
  const frame = 0.52;

  // Solid red outer shell
  g.add(put(box(sw + frame * 2, sh + frame * 2, sd, C.ytRed), 0, sh / 2, 0));

  // Dark screen casing inset
  g.add(put(box(sw + 0.1, sh + 0.1, 0.25, C.black), 0, sh / 2, sd / 2 + 0.06));

  // YouTube Mobile Feed screen with voxel people, thumbnails and buttons
  const phoneScreen = box(sw - 0.2, sh - 0.8, 0.15, C.white, {
    unique: true,
    texture: getYouTubePhoneScreenTexture(),
  });
  phoneScreen.position.set(0, sh / 2, sd / 2 + 0.16);
  g.add(phoneScreen);

  // Top speaker slot
  g.add(put(box(2.2, 0.22, 0.18, C.black), 0, sh - 0.25, sd / 2 + 0.22));

  // Side buttons on the left red casing
  g.add(put(box(0.38, 1.4, 0.5, C.ytRed), -(sw / 2 + frame + 0.19), sh * 0.63, 0));
  g.add(put(box(0.38, 0.9, 0.5, C.ytRed), -(sw / 2 + frame + 0.19), sh * 0.49, 0));

  // Stepped corner notches on red casing
  const step = 0.45;
  const corners = [
    [-(sw / 2 + frame), 0.2, sd / 2],
    [sw / 2 + frame, 0.2, sd / 2],
    [-(sw / 2 + frame), sh - 0.2, sd / 2],
    [sw / 2 + frame, sh - 0.2, sd / 2],
  ];
  corners.forEach(([x, y, z]) => {
    g.add(put(box(step, step, step, C.ytRed), x * 0.92, y, z));
  });

  return g;
}

/** Voxel YouTube play-button block with stepped edges (compact size). */
function buildYtPlayIcon() {
  const g = new THREE.Group();
  const w = 5.8; // Smaller play button (was 8.6)
  const h = 5.8; // Smaller play button (was 8.8)
  const d = 2.4; // Smaller depth (was 3.2)

  g.add(put(box(w, h, d, C.ytRed), 0, h / 2, 0));

  const face = box(w - 0.4, h - 0.4, 0.15, C.ytRed, {
    texture: getYouTubePlayTriangleTexture(),
  });
  face.position.set(0, h / 2, d / 2 + 0.08);
  g.add(face);

  // Layered stair-step ridges along the sides
  for (let i = 0; i < 3; i++) {
    const s = 0.4;
    g.add(put(box(s, s, d + 0.06, C.ytRed), w / 2 + 0.15, 0.4 + i * s, 0));
    g.add(put(box(s, s, d + 0.06, C.ytRed), w / 2 + 0.15, h - 0.4 - i * s, 0));
    g.add(put(box(s, s, d + 0.06, C.ytRed), -(w / 2 + 0.15), 0.4 + i * s, 0));
    g.add(put(box(s, s, d + 0.06, C.ytRed), -(w / 2 + 0.15), h - 0.4 - i * s, 0));
  }

  return g;
}

/** Robot bot worker matching the illustration */
function robot(color = C.botBody, screenCol = C.botScreen) {
  const g = new THREE.Group();
  // Legs
  g.add(put(box(0.45, 0.8, 0.45, C.metalGrey), -0.35, 0.4, 0));
  g.add(put(box(0.45, 0.8, 0.45, C.metalGrey), 0.35, 0.4, 0));
  // Body
  g.add(put(box(1.5, 1.6, 1.1, color), 0, 1.5, 0));
  // Arms
  g.add(put(box(0.4, 1.1, 0.4, C.metalGrey), -0.95, 1.5, 0));
  g.add(put(box(0.4, 1.1, 0.4, C.metalGrey), 0.95, 1.5, 0));
  // Neck
  g.add(put(box(0.5, 0.3, 0.5, C.metalDark), 0, 2.45, 0));
  // Head / Screen
  g.add(put(box(1.3, 1.1, 1.1, color), 0, 3.05, 0));
  g.add(put(box(0.95, 0.7, 0.15, C.black), 0, 3.05, 0.55));
  // Glowing eyes
  g.add(put(box(0.25, 0.25, 0.1, screenCol, { emissive: screenCol, ei: 0.9 }), -0.25, 3.05, 0.62));
  g.add(put(box(0.25, 0.25, 0.1, screenCol, { emissive: screenCol, ei: 0.9 }), 0.25, 3.05, 0.62));
  // Antenna
  g.add(put(box(0.15, 0.6, 0.15, C.metalGrey), 0, 3.85, 0));
  g.add(put(box(0.35, 0.35, 0.35, C.clockYellow), 0, 4.2, 0));

  g.scale.setScalar(0.85);
  return g;
}

/** Cardboard parcel box with tape */
function parcel(w = 1.6, h = 1.2, d = 1.4) {
  const g = new THREE.Group();
  g.add(box(w, h, d, C.parcelGold));
  g.add(put(box(w + 0.05, h + 0.05, d * 0.35, C.parcelTape), 0, 0, 0));
  g.add(put(box(w * 0.35, h + 0.05, d + 0.05, C.parcelTape), 0, 0, 0));
  return g;
}

/** Conveyor belt segment with wooden legs */
function makeConveyorSection(length, x, y, z) {
  const g = new THREE.Group();
  // Belt surface
  g.add(put(box(length, 0.3, 2.2, C.metalDark), 0, 0, 0));
  g.add(put(box(length, 0.15, 1.8, C.postilkaNavy), 0, 0.2, 0));

  // Legs with crossbars
  const steps = Math.max(2, Math.floor(length / 6));
  for (let i = 0; i <= steps; i++) {
    const lx = -length / 2 + (i * length) / steps;
    g.add(put(box(0.35, y, 0.35, C.woodLeg), lx, -y / 2, -0.85));
    g.add(put(box(0.35, y, 0.35, C.woodLeg), lx, -y / 2, 0.85));
    g.add(put(box(0.25, 0.25, 1.7, C.woodPlank), lx, -y / 2, 0));
  }
  g.position.set(x, y, z);
  return g;
}

/** Rail track segment with wooden sleepers */
function makeRail(x1, z1, x2, z2, y = 0.4) {
  const g = new THREE.Group();
  const dx = x2 - x1;
  const dz = z2 - z1;
  const len = Math.hypot(dx, dz);
  const angle = Math.atan2(dx, dz);

  // Sleepers (wooden ties)
  const ties = Math.floor(len / 1.8);
  for (let i = 0; i <= ties; i++) {
    const t = (i * 1.8) / len;
    const px = x1 + dx * t;
    const pz = z1 + dz * t;
    const tie = box(2.2, 0.2, 0.6, C.tieWood);
    put(tie, px, y, pz, 0, angle + Math.PI / 2, 0);
    g.add(tie);
  }

  // Steel rails (pair)
  const mx = (x1 + x2) / 2;
  const mz = (z1 + z2) / 2;
  const r1 = box(0.22, 0.25, len, C.railSilver);
  const r2 = box(0.22, 0.25, len, C.railSilver);
  put(r1, mx - Math.cos(angle) * 0.7, y + 0.18, mz + Math.sin(angle) * 0.7, 0, angle, 0);
  put(r2, mx + Math.cos(angle) * 0.7, y + 0.18, mz - Math.sin(angle) * 0.7, 0, angle, 0);
  g.add(r1);
  g.add(r2);
  return g;
}

/** Build continuous smooth road mesh with curbs along waypoints (no seam lines, no middle rails) */
function buildContinuousRoadMesh(waypoints, y = -5.85) {
  const g = new THREE.Group();
  const n = waypoints.length;
  if (n < 2) return g;

  // Compute smooth normal vector for each waypoint
  const normals = [];
  for (let i = 0; i < n; i++) {
    let tx = 0;
    let tz = 0;
    if (i === 0) {
      tx = waypoints[1].x - waypoints[0].x;
      tz = waypoints[1].z - waypoints[0].z;
    } else if (i === n - 1) {
      tx = waypoints[n - 1].x - waypoints[n - 2].x;
      tz = waypoints[n - 1].z - waypoints[n - 2].z;
    } else {
      const t1x = waypoints[i].x - waypoints[i - 1].x;
      const t1z = waypoints[i].z - waypoints[i - 1].z;
      const t2x = waypoints[i + 1].x - waypoints[i].x;
      const t2z = waypoints[i + 1].z - waypoints[i].z;
      const len1 = Math.hypot(t1x, t1z) || 1;
      const len2 = Math.hypot(t2x, t2z) || 1;
      tx = t1x / len1 + t2x / len2;
      tz = t1z / len1 + t2z / len2;
    }
    const tLen = Math.hypot(tx, tz) || 1;
    tx /= tLen;
    tz /= tLen;
    // Perpendicular normal in XZ plane
    normals.push({ nx: -tz, nz: tx });
  }

  // 1. Continuous Road Surface Ribbon (Green lawn / paved roadway)
  const roadWidth = 9.0;
  const halfW = roadWidth / 2;
  const topY = y + 0.38; // Raised above ground terrace (-5.47 vs -5.90)
  const botY = y - 0.35; // Extends down into ground slab (-6.20)

  const positions = [];
  for (let i = 0; i < n - 1; i++) {
    const p1 = waypoints[i];
    const p2 = waypoints[i + 1];
    const n1 = normals[i];
    const n2 = normals[i + 1];

    const l1x = p1.x + n1.nx * halfW, l1z = p1.z + n1.nz * halfW;
    const r1x = p1.x - n1.nx * halfW, r1z = p1.z - n1.nz * halfW;
    const l2x = p2.x + n2.nx * halfW, l2z = p2.z + n2.nz * halfW;
    const r2x = p2.x - n2.nx * halfW, r2z = p2.z - n2.nz * halfW;

    // Top surface (CCW winding facing UP +Y)
    positions.push(
      l1x, topY, l1z,
      l2x, topY, l2z,
      r1x, topY, r1z,

      r1x, topY, r1z,
      l2x, topY, l2z,
      r2x, topY, r2z
    );

    // Left side skirt (facing outward left)
    positions.push(
      l1x, botY, l1z,
      l2x, topY, l2z,
      l1x, topY, l1z,

      l1x, botY, l1z,
      l2x, botY, l2z,
      l2x, topY, l2z
    );

    // Right side skirt (facing outward right)
    positions.push(
      r1x, topY, r1z,
      r2x, topY, r2z,
      r1x, botY, r1z,

      r1x, botY, r1z,
      r2x, topY, r2z,
      r2x, botY, r2z
    );
  }

  const roadGeo = new THREE.BufferGeometry();
  roadGeo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  roadGeo.computeVertexNormals();

  const roadMat = new THREE.MeshStandardMaterial({
    color: C.trackGreen,
    roughness: 0.82,
    metalness: 0.05,
    side: THREE.DoubleSide,
  });
  const roadMesh = new THREE.Mesh(roadGeo, roadMat);
  roadMesh.receiveShadow = true;
  g.add(roadMesh);

  // 2. Darker Edge Curbs (Left & Right continuous borders)
  const curbPositions = [];
  const curbW = 0.65;
  const curbTopY = topY + 0.08;

  for (let i = 0; i < n - 1; i++) {
    const p1 = waypoints[i];
    const p2 = waypoints[i + 1];
    const n1 = normals[i];
    const n2 = normals[i + 1];

    // Left Curb
    const l1_out_x = p1.x + n1.nx * halfW, l1_out_z = p1.z + n1.nz * halfW;
    const l1_in_x = p1.x + n1.nx * (halfW - curbW), l1_in_z = p1.z + n1.nz * (halfW - curbW);
    const l2_out_x = p2.x + n2.nx * halfW, l2_out_z = p2.z + n2.nz * halfW;
    const l2_in_x = p2.x + n2.nx * (halfW - curbW), l2_in_z = p2.z + n2.nz * (halfW - curbW);

    // Top curb surface (CCW facing UP)
    curbPositions.push(
      l1_out_x, curbTopY, l1_out_z,
      l2_out_x, curbTopY, l2_out_z,
      l1_in_x, curbTopY, l1_in_z,

      l1_in_x, curbTopY, l1_in_z,
      l2_out_x, curbTopY, l2_out_z,
      l2_in_x, curbTopY, l2_in_z
    );

    // Right Curb
    const r1_in_x = p1.x - n1.nx * (halfW - curbW), r1_in_z = p1.z - n1.nz * (halfW - curbW);
    const r1_out_x = p1.x - n1.nx * halfW, r1_out_z = p1.z - n1.nz * halfW;
    const r2_in_x = p2.x - n2.nx * (halfW - curbW), r2_in_z = p2.z - n2.nz * (halfW - curbW);
    const r2_out_x = p2.x - n2.nx * halfW, r2_out_z = p2.z - n2.nz * halfW;

    // Top curb surface (CCW facing UP)
    curbPositions.push(
      r1_in_x, curbTopY, r1_in_z,
      r2_in_x, curbTopY, r2_in_z,
      r1_out_x, curbTopY, r1_out_z,

      r1_out_x, curbTopY, r1_out_z,
      r2_in_x, curbTopY, r2_in_z,
      r2_out_x, curbTopY, r2_out_z
    );
  }

  const curbGeo = new THREE.BufferGeometry();
  curbGeo.setAttribute('position', new THREE.Float32BufferAttribute(curbPositions, 3));
  curbGeo.computeVertexNormals();

  const curbMat = new THREE.MeshStandardMaterial({
    color: C.trackGreenDk,
    roughness: 0.82,
    metalness: 0.05,
    side: THREE.DoubleSide,
  });
  const curbMesh = new THREE.Mesh(curbGeo, curbMat);
  curbMesh.receiveShadow = true;
  g.add(curbMesh);

  return g;
}

/** Build voxel bus stop shelter with bench, timetable post, planter box, and waiting character */
function buildBusStop(name, labelText) {
  const g = new THREE.Group();
  g.name = `bus_stop_${name}`;

  // 1. Paved concrete / sand stone platform
  g.add(put(box(11.0, 0.4, 6.5, C.groundSand), 0, 0.2, 0));
  g.add(put(box(11.4, 0.2, 6.9, C.wallBevel), 0, 0.05, 0));

  // 2. Yellow voxel roof canopy shelter
  const roof = new THREE.Group();
  // 4 Wooden support posts
  roof.add(put(box(0.55, 5.0, 0.55, C.woodLeg), -4.6, 2.5, -2.4));
  roof.add(put(box(0.55, 5.0, 0.55, C.woodLeg), 4.6, 2.5, -2.4));
  roof.add(put(box(0.55, 5.0, 0.55, C.woodLeg), -4.6, 2.5, 2.4));
  roof.add(put(box(0.55, 5.0, 0.55, C.woodLeg), 4.6, 2.5, 2.4));
  // Roof rafters / beams
  roof.add(put(box(9.8, 0.35, 5.4, C.woodPlank), 0, 5.0, 0));
  // Slanted / stepped yellow roof canopy
  roof.add(put(box(10.6, 0.5, 6.0, C.busYellow), 0, 5.35, 0));
  roof.add(put(box(9.4, 0.4, 5.0, C.busYellowDk), 0, 5.7, 0));
  g.add(roof);

  // 3. Wooden Bench
  const bench = new THREE.Group();
  bench.add(put(box(5.2, 0.25, 1.4, C.woodPlank), 0, 1.2, 0)); // seat
  bench.add(put(box(0.4, 1.2, 1.2, C.woodDark), -2.1, 0.6, 0)); // legs
  bench.add(put(box(0.4, 1.2, 1.2, C.woodDark), 2.1, 0.6, 0));
  bench.add(put(box(5.2, 1.2, 0.25, C.woodPlank), 0, 2.0, -0.6)); // backrest
  bench.position.set(0, 0, -1.2);
  g.add(bench);

  // 4. Blue Bus Stop Signboard & Timetable Post
  const signpost = new THREE.Group();
  signpost.add(put(box(0.35, 4.6, 0.35, C.postilkaNavy), 0, 2.3, 0)); // pole
  const signPlate = box(3.2, 1.6, 0.2, C.white, {
    unique: true,
    texture: getBusStopSignTexture(labelText),
  });
  signPlate.position.set(0, 4.0, 0.12);
  signpost.add(signPlate);
  signpost.position.set(4.4, 0, 2.2);
  g.add(signpost);

  // 5. Planter box with colorful flowers (like in Haruni reference)
  const planter = new THREE.Group();
  planter.add(put(box(3.2, 1.0, 1.4, C.woodDark), 0, 0.5, 0));
  planter.add(put(box(3.0, 0.3, 1.2, C.trackGreenDk), 0, 1.0, 0)); // soil / grass
  // Flowers
  const flowerCols = [C.clockRed, C.photoPink, C.clockYellow, C.white];
  for (let i = 0; i < 4; i++) {
    planter.add(put(box(0.4, 0.45, 0.4, flowerCols[i]), -1.1 + i * 0.72, 1.3, 0));
  }
  planter.position.set(-3.8, 0, 2.2);
  g.add(planter);

  // 6. Waiting voxel character at stop
  const passenger = new THREE.Group();
  passenger.add(put(box(0.9, 1.0, 0.7, C.vkBlue), 0, 1.9, 0)); // shirt
  passenger.add(put(box(0.35, 1.4, 0.35, C.postilkaNavy), -0.22, 0.7, 0)); // legs
  passenger.add(put(box(0.35, 1.4, 0.35, C.postilkaNavy), 0.22, 0.7, 0));
  passenger.add(put(box(0.75, 0.75, 0.75, C.skinLight), 0, 2.8, 0)); // face
  passenger.add(put(box(0.8, 0.4, 0.8, C.hairBrown), 0, 3.2, 0)); // hair
  passenger.position.set(1.4, 0, 0.5);
  passenger.rotation.y = -Math.PI / 6;
  g.add(passenger);

  return g;
}

/** Build voxel bus depot building (Депо) where the bus parks, enters and departs */
function buildBusDepot(name, titleText = 'ДЕПО №1') {
  const g = new THREE.Group();
  g.name = `bus_depot_${name}`;

  const depW = 18.0;
  const depH = 13.5;
  const depD = 22.0;

  // 1. Concrete Foundation Slab (Sub-level)
  g.add(put(box(depW + 1.2, 1.2, depD + 1.2, C.groundShadow), 0, 0.6, 0));
  // Interior garage concrete floor
  g.add(put(box(depW - 0.4, 0.35, depD - 0.4, C.metalDark), 0, 1.35, 0));

  // 2. Main Building Outer Walls (Two-tone: cream and navy industrial)
  // Left wall
  g.add(put(box(1.2, depH, depD, C.wallCream), -depW / 2 + 0.6, depH / 2 + 1.0, 0));
  // Right wall
  g.add(put(box(1.2, depH, depD, C.wallCream), depW / 2 - 0.6, depH / 2 + 1.0, 0));
  // Back rear wall
  g.add(put(box(depW, depH, 1.2, C.wallCream), 0, depH / 2 + 1.0, -depD / 2 + 0.6));

  // 3. Front Facade & Arched Garage Portal Opening (at z = +depD / 2 - 0.6 = +10.4)
  const frontZ = depD / 2 - 0.6;
  // Left pillar
  g.add(put(box(4.8, depH, 1.4, C.postilkaNavy), -depW / 2 + 2.4, depH / 2 + 1.0, frontZ));
  // Right pillar
  g.add(put(box(4.8, depH, 1.4, C.postilkaNavy), depW / 2 - 2.4, depH / 2 + 1.0, frontZ));
  // Lintel arch over doorway (Door opening width: 8.4, door opening height: 7.6)
  g.add(put(box(depW, depH - 7.6, 1.4, C.postilkaNavy), 0, 7.6 + (depH - 7.6) / 2 + 1.0, frontZ));

  // 4. Yellow & Black Hazard Striped Garage Trim
  const stripeW = 1.0;
  for (let i = 0; i < 9; i++) {
    const col = i % 2 === 0 ? C.clockYellow : C.black;
    g.add(put(box(stripeW, 0.5, 0.2, col), -4.0 + i * stripeW, 7.8, frontZ + 0.8));
  }

  // 5. Large Illuminated Depot Signboard
  const depotSign = box(14.0, 2.6, 0.4, C.black, {
    unique: true,
    texture: getBusDepotSignTexture(titleText),
  });
  depotSign.position.set(0, 10.4, frontZ + 0.9);
  g.add(depotSign);

  // 6. Traffic Control Signals (Red / Green LEDs above entrance)
  g.add(put(box(0.5, 0.5, 0.25, C.screenGreen, { emissive: C.screenGreen, ei: 0.95 }), -3.6, 8.8, frontZ + 0.8));
  g.add(put(box(0.5, 0.5, 0.25, C.clockRed, { emissive: C.clockRed, ei: 0.95 }), 3.6, 8.8, frontZ + 0.8));

  // 7. Stepped Industrial Roof with Skylight Monitor
  g.add(put(box(depW + 1.6, 0.8, depD + 1.6, C.metalGrey), 0, depH + 1.4, 0));
  // Raised monitor roof
  const monW = 9.0;
  const monH = 2.4;
  const monD = 14.0;
  g.add(put(box(monW, monH, monD, C.postilkaDark), 0, depH + 1.8 + monH / 2, -1.0));
  g.add(put(box(monW + 0.8, 0.4, monD + 0.8, C.metalGrey), 0, depH + 1.8 + monH + 0.2, -1.0));
  // Monitor glass clerestory windows
  g.add(put(box(monW + 0.2, 1.4, monD - 2.0, C.busGlass), 0, depH + 2.6, -1.0));
  // 2 Roof ventilation exhaust stacks
  g.add(put(box(1.6, 1.8, 1.6, C.metalDark), -5.5, depH + 2.3, -4.0));
  g.add(put(box(1.6, 1.8, 1.6, C.metalDark), 5.5, depH + 2.3, -4.0));

  // 8. Interior Service Lighting & Inspection Details
  g.add(put(box(3.2, 0.35, 8.0, C.clockYellow, { emissive: 0xfff59d, ei: 0.9 }), 0, 7.2, 0));
  // Service floor plates inside depot
  g.add(put(box(3.2, 0.1, depD - 4.0, C.metalDark), 0, 1.45, 0));

  // 9. Exterior Service Equipment (Fuel pump, Oil barrels, Wall lights)
  // Wall lanterns flanking doorway
  g.add(put(box(0.6, 0.8, 0.6, C.clockYellow, { emissive: 0xfff59d, ei: 0.95 }), -depW / 2 + 1.0, 6.0, frontZ + 0.8));
  g.add(put(box(0.6, 0.8, 0.6, C.clockYellow, { emissive: 0xfff59d, ei: 0.95 }), depW / 2 - 1.0, 6.0, frontZ + 0.8));

  // Fuel pump on left side
  const pump = new THREE.Group();
  pump.add(put(box(1.4, 3.2, 1.4, C.clockYellow), 0, 1.6, 0));
  pump.add(put(box(1.5, 0.4, 1.5, C.black), 0, 3.4, 0)); // top cap
  pump.add(put(box(0.8, 0.8, 0.2, C.white), 0, 2.5, 0.75)); // meter dial
  pump.add(put(box(0.3, 2.0, 0.3, C.black), 0.75, 1.6, 0)); // hose
  pump.position.set(-depW / 2 - 2.2, 0.6, 6.0);
  g.add(pump);

  // 2 Oil barrels on right side
  g.add(put(box(1.4, 2.2, 1.4, C.clockRed), depW / 2 + 2.2, 1.7, 4.0));
  g.add(put(box(1.4, 2.2, 1.4, C.vkBlue), depW / 2 + 2.2, 1.7, 7.0));

  return g;
}

/** Build smooth round voxel bus wheel with rubber tire, rim, hub, brass cap & lug nuts */
function buildBusWheel() {
  const wG = new THREE.Group();

  // 1. Smooth 24-segment Cylinder for Black Rubber Tire
  const tireGeo = new THREE.CylinderGeometry(0.98, 0.98, 0.82, 24);
  tireGeo.rotateZ(Math.PI / 2);
  const tireMesh = new THREE.Mesh(tireGeo, mat(C.black, { rough: 0.92 }));
  tireMesh.castShadow = true;
  tireMesh.receiveShadow = true;
  wG.add(tireMesh);

  // 2. Metallic Wheel Rim with Inset
  const rimGeo = new THREE.CylinderGeometry(0.64, 0.64, 0.86, 24);
  rimGeo.rotateZ(Math.PI / 2);
  const rimMesh = new THREE.Mesh(rimGeo, mat(C.metalGrey, { rough: 0.5 }));
  wG.add(rimMesh);

  // 3. Central Hub Inset
  const hubGeo = new THREE.CylinderGeometry(0.32, 0.32, 0.9, 16);
  hubGeo.rotateZ(Math.PI / 2);
  const hubMesh = new THREE.Mesh(hubGeo, mat(C.metalDark, { rough: 0.6 }));
  wG.add(hubMesh);

  // 4. Center Brass Cap
  const capGeo = new THREE.CylinderGeometry(0.16, 0.16, 0.94, 12);
  capGeo.rotateZ(Math.PI / 2);
  const capMesh = new THREE.Mesh(capGeo, mat(C.clockYellow, { emissive: 0xd97706, ei: 0.3 }));
  wG.add(capMesh);

  // 5. 5 Voxel Lug Nuts (болты ступицы с обеих сторон)
  for (let i = 0; i < 5; i++) {
    const angle = (i / 5) * Math.PI * 2;
    const sy = Math.sin(angle) * 0.44;
    const sz = Math.cos(angle) * 0.44;
    const bolt1 = box(0.12, 0.12, 0.12, C.wallCream);
    bolt1.position.set(0.44, sy, sz);
    wG.add(bolt1);
    const bolt2 = box(0.12, 0.12, 0.12, C.wallCream);
    bolt2.position.set(-0.44, sy, sz);
    wG.add(bolt2);
  }

  return wG;
}

/** Build the vibrant Haruni-style yellow voxel shuttle bus */
function buildHaruniBus() {
  const g = new THREE.Group();
  g.name = 'haruni_bus';

  const busW = 5.2;
  const busH = 5.4;
  const busL = 13.8;

  // Inner oscillating body group for driving bob & suspension
  const body = new THREE.Group();
  body.name = 'bus_body';

  // 1. Main Yellow Body Shell
  body.add(put(box(busW, busH - 1.2, busL, C.busYellow), 0, 1.0 + (busH - 1.2) / 2, 0));

  // 2. Cream / White Lower Skirt Stripe
  body.add(put(box(busW + 0.1, 1.2, busL + 0.1, C.busCream), 0, 1.6, 0));

  // 3. Beveled Roof Slab & AC / Vent Unit
  body.add(put(box(busW - 0.4, 0.6, busL - 0.4, C.busYellow), 0, 1.0 + busH - 0.3, 0));
  body.add(put(box(2.4, 0.75, 4.4, C.busCream), 0, 1.0 + busH + 0.35, -1.0));

  // 4. Front Destination Marquee (Over Windshield)
  const frontMarquee = box(3.6, 1.2, 0.4, C.black, {
    unique: true,
    texture: getBusDestinationTexture('POSTILKA'),
  });
  frontMarquee.position.set(0, 5.4, busL / 2 + 0.22);
  body.add(frontMarquee);

  // 5. Front Windshield & Wipers
  body.add(put(box(busW - 0.8, 2.5, 0.25, C.busGlass), 0, 3.7, busL / 2 + 0.08));
  // Wipers
  body.add(put(box(1.2, 0.1, 0.1, C.black), -1.1, 2.7, busL / 2 + 0.22, 0, 0, 0.25));
  body.add(put(box(1.2, 0.1, 0.1, C.black), 1.1, 2.7, busL / 2 + 0.22, 0, 0, 0.25));

  // 6. Headlights, Bumper & Mirrors
  // Round Glowing Yellow Headlights
  body.add(put(box(0.8, 0.8, 0.3, C.clockYellow, { emissive: 0xfff59d, ei: 0.95 }), -1.8, 1.8, busL / 2 + 0.12));
  body.add(put(box(0.8, 0.8, 0.3, C.clockYellow, { emissive: 0xfff59d, ei: 0.95 }), 1.8, 1.8, busL / 2 + 0.12));
  // Front Bumper
  body.add(put(box(busW + 0.2, 0.8, 0.6, C.metalDark), 0, 1.2, busL / 2 + 0.32));
  // License plate
  body.add(put(box(1.4, 0.5, 0.1, C.white), 0, 1.2, busL / 2 + 0.64));
  // Side view mirrors
  body.add(put(box(0.3, 0.8, 0.5, C.busYellow), -busW / 2 - 0.4, 3.8, busL / 2 - 0.8));
  body.add(put(box(0.3, 0.8, 0.5, C.busYellow), busW / 2 + 0.4, 3.8, busL / 2 - 0.8));

  // 7. Side Windows with Passenger Silhouettes
  const leftWin = box(0.15, 2.2, busL - 3.2, C.white, {
    unique: true,
    texture: getBusSideWindowsTexture(),
  });
  leftWin.position.set(-busW / 2 - 0.08, 3.8, -0.2);
  body.add(leftWin);

  const rightWin = box(0.15, 2.2, busL - 3.2, C.white, {
    unique: true,
    texture: getBusSideWindowsTexture(),
  });
  rightWin.position.set(busW / 2 + 0.08, 3.8, -0.2);
  body.add(rightWin);

  // Passenger boarding door on right side
  body.add(put(box(0.2, 3.8, 2.2, C.busCream), busW / 2 + 0.08, 2.7, busL / 2 - 2.0));
  body.add(put(box(0.25, 1.8, 0.9, C.busGlass), busW / 2 + 0.08, 3.6, busL / 2 - 2.0));

  // 8. Rear details (Glass, Marquee, Taillights, Bumper)
  body.add(put(box(busW - 1.2, 2.2, 0.2, C.busGlass), 0, 3.8, -busL / 2 - 0.08));
  const rearMarquee = box(3.6, 1.2, 0.4, C.black, {
    unique: true,
    texture: getBusDestinationTexture('POSTILKA'),
  });
  rearMarquee.position.set(0, 5.4, -busL / 2 - 0.22);
  rearMarquee.rotation.y = Math.PI;
  body.add(rearMarquee);

  // Red Taillights
  body.add(put(box(0.7, 1.0, 0.25, C.clockRed, { emissive: 0xef4444, ei: 0.9 }), -1.8, 2.0, -busL / 2 - 0.12));
  body.add(put(box(0.7, 1.0, 0.25, C.clockRed, { emissive: 0xef4444, ei: 0.9 }), 1.8, 2.0, -busL / 2 - 0.12));
  // Rear Bumper
  body.add(put(box(busW + 0.2, 0.8, 0.6, C.metalDark), 0, 1.2, -busL / 2 - 0.32));

  g.add(body);

  // 9. 4 Smooth Round Wheels with Hubs & Lug Bolts
  const wheels = [];
  const wheelPositions = [
    [-busW / 2 + 0.15, 0.98, 3.8],
    [busW / 2 - 0.15, 0.98, 3.8],
    [-busW / 2 + 0.15, 0.98, -3.8],
    [busW / 2 - 0.15, 0.98, -3.8],
  ];
  for (const [wx, wy, wz] of wheelPositions) {
    const wG = buildBusWheel();
    wG.position.set(wx, wy, wz);
    g.add(wG);
    wheels.push(wG);
  }

  g.userData = { body, wheels };
  return g;
}

/** Oversized landing-page hero, based on the supplied coral-shirt voxel character. */
function buildLandingHero() {
  const g = new THREE.Group();
  g.name = 'landing_hero';

  const visual = new THREE.Group();
  g.add(visual);

  const skin = 0xf1c9aa;
  const skinShade = 0xdca984;
  const shirt = 0xd96f61;
  const shirtLight = 0xee8a79;
  const denim = 0x355b91;
  const denimLight = 0x557caf;
  const denimDark = 0x243f69;
  const leather = 0x4a2d22;
  const leatherDark = 0x271712;
  const hair = 0x4a2c20;
  const hairLight = 0x65402f;

  // Articulated legs with detailed jeans, cuffs and layered boots.
  const legL = new THREE.Group();
  const legR = new THREE.Group();
  for (const [leg, x] of [[legL, -0.48], [legR, 0.48]]) {
    leg.position.set(x, 1.85, 0);
    leg.add(put(box(0.82, 1.55, 0.82, denim), 0, -0.72, 0));
    leg.add(put(box(0.86, 0.15, 0.86, denimLight), 0, -1.44, 0.02));
    leg.add(put(box(0.92, 0.56, 1.22, leather), 0, -1.78, 0.18));
    leg.add(put(box(0.98, 0.16, 1.34, leatherDark), 0, -2.08, 0.22));
    leg.add(put(box(0.7, 0.08, 0.12, 0xb58b72), 0, -1.72, 0.82));
    leg.add(put(box(0.1, 0.08, 0.16, 0xe4c7aa), -0.2, -1.58, 0.81));
    leg.add(put(box(0.1, 0.08, 0.16, 0xe4c7aa), 0.2, -1.58, 0.81));
    visual.add(leg);
  }

  const body = new THREE.Group();
  visual.add(body);

  // Jeans waist, belt, buckle, loops and pockets.
  body.add(put(box(2.05, 0.58, 1.08, denimDark), 0, 2.0, 0));
  body.add(put(box(2.12, 0.16, 1.13, leather), 0, 2.28, 0.02));
  body.add(put(box(0.38, 0.3, 0.12, 0xb77a45), 0, 2.28, 0.63));
  body.add(put(box(0.16, 0.34, 0.08, leatherDark), -0.72, 2.29, 0.62));
  body.add(put(box(0.16, 0.34, 0.08, leatherDark), 0.72, 2.29, 0.62));
  body.add(put(box(0.52, 0.08, 0.08, denimLight), -0.6, 2.04, 0.58, 0, 0, -0.28));
  body.add(put(box(0.52, 0.08, 0.08, denimLight), 0.6, 2.04, 0.58, 0, 0, 0.28));

  // Coral shirt with hem, collar and subtle voxel stitching.
  body.add(put(box(2.6, 2.05, 1.28, shirt), 0, 3.45, 0));
  body.add(put(box(2.68, 0.16, 1.34, shirtLight), 0, 2.48, 0));
  body.add(put(box(0.82, 0.12, 0.08, shirtLight), 0, 4.35, 0.67));
  body.add(put(box(0.1, 1.55, 0.07, 0xc75f55), -1.2, 3.43, 0.68));
  body.add(put(box(0.1, 1.55, 0.07, 0xc75f55), 1.2, 3.43, 0.68));

  // Shoulder-pivoted arms, ready for the future walk/jump animation.
  const armL = new THREE.Group();
  const armR = new THREE.Group();
  for (const [arm, x] of [[armL, -1.62], [armR, 1.62]]) {
    arm.position.set(x, 4.15, 0);
    arm.add(put(box(0.68, 1.45, 0.82, shirt), 0, -0.68, 0));
    arm.add(put(box(0.62, 0.72, 0.72, skin), 0, -1.72, 0.02));
    arm.add(put(box(0.68, 0.16, 0.78, shirtLight), 0, -1.36, 0));
    body.add(arm);
  }

  // Neck and independently animated large square head.
  body.add(put(box(0.74, 0.5, 0.72, skinShade), 0, 4.75, 0));
  const head = new THREE.Group();
  head.position.set(0, 5.85, 0);
  body.add(head);
  head.add(box(2.15, 2.0, 1.78, skin));

  // Layered side-parted hair matching the reference silhouette.
  head.add(put(box(2.32, 0.66, 1.96, hair), 0, 1.15, -0.03));
  head.add(put(box(2.08, 0.22, 2.02, hairLight), 0.08, 1.57, -0.02));
  head.add(put(box(0.48, 1.22, 1.88, hair), -1.1, 0.63, -0.06));
  head.add(put(box(0.5, 0.7, 0.35, hairLight), 0.98, 0.77, 0.72));

  // Minimal face, with tiny brow and nose depth details.
  head.add(put(box(0.24, 0.28, 0.1, leatherDark), -0.46, 0.07, 0.94));
  head.add(put(box(0.24, 0.28, 0.1, leatherDark), 0.46, 0.07, 0.94));
  head.add(put(box(0.18, 0.12, 0.18, skinShade), 0, -0.3, 0.98));
  head.add(put(box(0.56, 0.1, 0.08, skinShade), 0, -0.65, 0.93));

  // Balanced protagonist scale relative to the wide road, furniture and large pavilions
  g.scale.setScalar(1.875);
  g.userData.rig = { visual, body, head, legL, legR, armL, armR };
  return g;
}

/** Detailed seated companion dog, proportioned to the oversized landing hero. */
function buildLandingDog() {
  const g = new THREE.Group();
  g.name = 'landing_dog';

  const visual = new THREE.Group();
  g.add(visual);

  const tan = 0xc98952;
  const tanLight = 0xe2a970;
  const tanDark = 0x8f5637;
  const cream = 0xf0ddc5;
  const creamShade = 0xd7bea5;
  const dark = 0x241713;
  const collar = 0x9f2e35;

  // Standing body with four articulated paws so the companion can trot beside the hero.
  visual.add(put(box(2.25, 1.55, 1.48, tan), 0, 1.92, -0.22));
  visual.add(put(box(1.35, 1.12, 0.42, cream), 0, 1.78, 0.72));
  const legFL = new THREE.Group();
  const legFR = new THREE.Group();
  const legBL = new THREE.Group();
  const legBR = new THREE.Group();
  for (const [leg, x, z] of [
    [legFL, -0.72, 0.48],
    [legFR, 0.72, 0.48],
    [legBL, -0.72, -0.72],
    [legBR, 0.72, -0.72],
  ]) {
    leg.position.set(x, 1.35, z);
    leg.add(put(box(0.48, 1.25, 0.52, tanLight), 0, -0.58, 0));
    leg.add(put(box(0.58, 0.28, 0.78, cream), 0, -1.2, 0.16));
    visual.add(leg);
  }

  // Neck, collar and tag.
  visual.add(put(box(1.46, 0.42, 1.3, collar), 0, 2.5, 0));
  visual.add(put(box(0.28, 0.34, 0.14, 0xd5b45a), 0, 2.26, 0.72));

  const head = new THREE.Group();
  head.position.set(0, 3.45, 0.08);
  visual.add(head);
  head.add(box(1.95, 1.72, 1.62, tan));

  // Upright ears with darker inner panels.
  head.add(put(box(0.58, 0.95, 0.72, tan), -0.68, 1.16, -0.1));
  head.add(put(box(0.58, 0.95, 0.72, tan), 0.68, 1.16, -0.1));
  head.add(put(box(0.28, 0.58, 0.12, tanDark), -0.68, 1.18, 0.31));
  head.add(put(box(0.28, 0.58, 0.12, tanDark), 0.68, 1.18, 0.31));

  // Cream mask, cheeks, muzzle, eyes and nose.
  head.add(put(box(1.52, 0.94, 0.26, cream), 0, -0.28, 0.9));
  head.add(put(box(0.72, 0.64, 0.62, creamShade), 0, -0.42, 1.08));
  head.add(put(box(0.22, 0.28, 0.12, dark), -0.48, 0.2, 0.88));
  head.add(put(box(0.22, 0.28, 0.12, dark), 0.48, 0.2, 0.88));
  head.add(put(box(0.42, 0.34, 0.34, dark), 0, -0.28, 1.46));
  head.add(put(box(0.42, 0.08, 0.1, tanDark), 0, -0.72, 1.15));

  // Blocky curled tail with an independently animatable pivot.
  const tail = new THREE.Group();
  tail.position.set(-1.02, 1.45, -0.66);
  tail.add(put(box(0.44, 1.32, 0.48, tan), 0, 0.3, 0, 0, 0, -0.62));
  tail.add(put(box(0.46, 0.72, 0.5, cream), -0.35, 0.88, 0));
  visual.add(tail);

  // Balanced companion scale
  g.scale.setScalar(1.425);
  g.userData.rig = { visual, head, tail, legFL, legFR, legBL, legBR };
  return g;
}

function buildTrackInfo(waypoints) {
  const segments = [];
  let total = 0;
  for (let i = 0; i < waypoints.length - 1; i++) {
    const a = waypoints[i];
    const b = waypoints[i + 1];
    const length = Math.hypot(b.x - a.x, b.z - a.z);
    segments.push({ a, b, length, start: total });
    total += length;
  }
  return { waypoints, segments, total };
}

function sampleJourneyTrack(track, u) {
  const dist = THREE.MathUtils.clamp(u, 0, 1) * track.total;
  const segment = track.segments.find((s) => dist <= s.start + s.length) || track.segments.at(-1);
  const local = THREE.MathUtils.clamp((dist - segment.start) / segment.length, 0, 1);
  const x = THREE.MathUtils.lerp(segment.a.x, segment.b.x, local);
  const y = THREE.MathUtils.lerp(segment.a.y ?? -8.5, segment.b.y ?? -8.5, local);
  const z = THREE.MathUtils.lerp(segment.a.z, segment.b.z, local);
  return { x, y, z, angle: Math.atan2(segment.b.x - segment.a.x, segment.b.z - segment.a.z) };
}

/** Road mesh puts the sandy surface at trackY + 0.38 */
const JOURNEY_ROAD_SURFACE_OFFSET = 0.38;
/** Terrace brown ground surface level */
const GROUND_TERRACE_SURFACE_Y = -5.90;
/** Exact bottom-of-foot offset for oversized hero (scale 1.875, local sole at -0.31) */
const HERO_FOOT_OFFSET = 0.64;
/** Exact bottom-of-paw offset for oversized dog (scale 1.425, local paw at +0.01) */
const DOG_FOOT_OFFSET = 0.05;
const LANDING_DOG_FLANK_OFFSET = 5.6;
const LANDING_DOG_BACK_OFFSET = 2.6;

function terraceHeroGroundY() {
  return GROUND_TERRACE_SURFACE_Y + HERO_FOOT_OFFSET;
}

function terraceDogGroundY() {
  return GROUND_TERRACE_SURFACE_Y + DOG_FOOT_OFFSET;
}

function journeyRoadSurfaceY(trackY) {
  return (trackY ?? -8.5) + JOURNEY_ROAD_SURFACE_OFFSET;
}

function landingHeroGroundY(trackY) {
  return journeyRoadSurfaceY(trackY) + HERO_FOOT_OFFSET;
}

function landingDogGroundY(trackY) {
  return journeyRoadSurfaceY(trackY) + DOG_FOOT_OFFSET;
}

/** Place props on the green road verge without overhanging the floating edge */
function sampleJourneyTrackEdge(track, u, side = 1, inset = 8.0) {
  const sample = sampleJourneyTrack(track, u);
  const nx = -Math.cos(sample.angle) * side;
  const nz = Math.sin(sample.angle) * side;
  return {
    x: sample.x + nx * inset,
    y: journeyRoadSurfaceY(sample.y) + 0.06,
    z: sample.z + nz * inset,
    angle: sample.angle,
  };
}

function buildJourneyLamp() {
  const g = new THREE.Group();
  g.add(put(box(0.25, 5.2, 0.25, C.metalDark, { cast: false }), 0, 2.6, 0));
  g.add(put(box(1.1, 0.28, 1.1, C.metalDark, { cast: false }), 0, 4.95, 0));
  g.add(put(box(0.72, 0.48, 0.72, C.clockYellow, { emissive: 0xffd152, ei: 0.7, cast: false }), 0, 4.65, 0));
  g.add(put(box(0.95, 0.22, 0.95, C.groundShadow, { cast: false }), 0, 0.11, 0));
  return g;
}

function buildJourneyBench() {
  const g = new THREE.Group();
  // Long axis along Z (parallel to the road when rotation.y = track angle)
  // Seat faces +X so it can look inward toward the roadway from the verge
  g.add(put(box(0.88, 0.22, 3.8, C.woodPlank), 0, 1.25, 0));
  g.add(put(box(0.45, 0.22, 3.8, C.woodPlank), -0.35, 2.05, 0));
  for (const z of [-1.5, 1.5]) {
    g.add(put(box(0.35, 1.25, 0.24, C.metalDark), 0, 0.62, z));
  }
  return g;
}

function buildJourneyShrub() {
  const g = new THREE.Group();
  g.add(put(box(2.2, 0.5, 1.6, C.woodDark, { cast: false }), 0, 0.25, 0));
  g.add(put(box(1.7, 1.2, 1.3, C.trackGreenDk, { cast: false }), 0, 1.05, 0));
  g.add(put(box(1.1, 0.7, 1.0, C.trackGreen, { cast: false }), -0.35, 1.75, 0));
  g.add(put(box(0.35, 0.35, 0.35, C.photoPink, { emissive: 0xf58a88, ei: 0.5, cast: false }), 0.25, 1.85, 0.2));
  return g;
}

/** Build wide multi-screen floating 3D roadway: sandy center lane, green lawn verges on both sides, stone curbs, solid bottom plate and floating structural pillars */
function buildJourneyWideRoadMesh(waypoints, totalWidth = 20.0) {
  const g = new THREE.Group();
  const n = waypoints.length;
  if (n < 2) return g;

  const normals = [];
  for (let i = 0; i < n; i++) {
    let tx = 0, tz = 0;
    if (i === 0) {
      tx = waypoints[1].x - waypoints[0].x;
      tz = waypoints[1].z - waypoints[0].z;
    } else if (i === n - 1) {
      tx = waypoints[n - 1].x - waypoints[n - 2].x;
      tz = waypoints[n - 1].z - waypoints[n - 2].z;
    } else {
      const t1x = waypoints[i].x - waypoints[i - 1].x;
      const t1z = waypoints[i].z - waypoints[i - 1].z;
      const t2x = waypoints[i + 1].x - waypoints[i].x;
      const t2z = waypoints[i + 1].z - waypoints[i].z;
      const len1 = Math.hypot(t1x, t1z) || 1;
      const len2 = Math.hypot(t2x, t2z) || 1;
      tx = t1x / len1 + t2x / len2;
      tz = t1z / len1 + t2z / len2;
    }
    const tLen = Math.hypot(tx, tz) || 1;
    normals.push({ nx: -tz / tLen, nz: tx / tLen });
  }

  const halfTotal = totalWidth / 2;
  const vergeW = 2.4;
  const halfCenter = halfTotal - vergeW;
  const curbW = 0.45;
  const deckThickness = 1.6;

  const centerPos = [];
  const dashedPos = [];
  const leftVergePos = [];
  const rightVergePos = [];
  const leftCurbPos = [];
  const rightCurbPos = [];
  const sideFasciaPos = [];
  const bottomPos = [];

  for (let i = 0; i < n - 1; i++) {
    const p1 = waypoints[i];
    const p2 = waypoints[i + 1];
    const n1 = normals[i];
    const n2 = normals[i + 1];

    const y1 = p1.y ?? -8.5;
    const y2 = p2.y ?? -8.5;
    const topY1 = y1 + 0.38;
    const topY2 = y2 + 0.38;
    const vergeY1 = y1 + 0.44;
    const vergeY2 = y2 + 0.44;
    const curbY1 = y1 + 0.52;
    const curbY2 = y2 + 0.52;
    const botY1 = y1 - deckThickness;
    const botY2 = y2 - deckThickness;

    // Center lane bounds
    const cL1x = p1.x + n1.nx * halfCenter, cL1z = p1.z + n1.nz * halfCenter;
    const cR1x = p1.x - n1.nx * halfCenter, cR1z = p1.z - n1.nz * halfCenter;
    const cL2x = p2.x + n2.nx * halfCenter, cL2z = p2.z + n2.nz * halfCenter;
    const cR2x = p2.x - n2.nx * halfCenter, cR2z = p2.z - n2.nz * halfCenter;

    // Outer verge bounds
    const vL1x = p1.x + n1.nx * halfTotal, vL1z = p1.z + n1.nz * halfTotal;
    const vR1x = p1.x - n1.nx * halfTotal, vR1z = p1.z - n1.nz * halfTotal;
    const vL2x = p2.x + n2.nx * halfTotal, vL2z = p2.z + n2.nz * halfTotal;
    const vR2x = p2.x - n2.nx * halfTotal, vR2z = p2.z - n2.nz * halfTotal;

    // Inner curb bounds
    const kL1x = p1.x + n1.nx * (halfTotal - curbW), kL1z = p1.z + n1.nz * (halfTotal - curbW);
    const kL2x = p2.x + n2.nx * (halfTotal - curbW), kL2z = p2.z + n2.nz * (halfTotal - curbW);
    const kR1x = p1.x - n1.nx * (halfTotal - curbW), kR1z = p1.z - n1.nz * (halfTotal - curbW);
    const kR2x = p2.x - n2.nx * (halfTotal - curbW), kR2z = p2.z - n2.nz * (halfTotal - curbW);

    // 1. Center sandy roadway ribbon
    centerPos.push(
      cL1x, topY1, cL1z, cL2x, topY2, cL2z, cR1x, topY1, cR1z,
      cR1x, topY1, cR1z, cL2x, topY2, cL2z, cR2x, topY2, cR2z
    );

    // Subtle dashed center lane markings
    if (i % 3 === 0) {
      const dW = 0.3;
      const dL1x = p1.x + n1.nx * dW, dL1z = p1.z + n1.nz * dW;
      const dR1x = p1.x - n1.nx * dW, dR1z = p1.z - n1.nz * dW;
      const dL2x = p2.x + n2.nx * dW, dL2z = p2.z + n2.nz * dW;
      const dR2x = p2.x - n2.nx * dW, dR2z = p2.z - n2.nz * dW;
      dashedPos.push(
        dL1x, topY1 + 0.02, dL1z, dL2x, topY2 + 0.02, dL2z, dR1x, topY1 + 0.02, dR1z,
        dR1x, topY1 + 0.02, dR1z, dL2x, topY2 + 0.02, dL2z, dR2x, topY2 + 0.02, dR2z
      );
    }

    // 2. Left lawn verge
    leftVergePos.push(
      vL1x, vergeY1, vL1z, vL2x, vergeY2, vL2z, cL1x, vergeY1, cL1z,
      cL1x, vergeY1, cL1z, vL2x, vergeY2, vL2z, cL2x, vergeY2, cL2z
    );

    // 3. Right lawn verge
    rightVergePos.push(
      cR1x, vergeY1, cR1z, cR2x, vergeY2, cR2z, vR1x, vergeY1, vR1z,
      vR1x, vergeY1, vR1z, cR2x, vergeY2, cR2z, vR2x, vergeY2, vR2z
    );

    // 4. Left and Right curbs
    leftCurbPos.push(
      vL1x, curbY1, vL1z, vL2x, curbY2, vL2z, kL1x, curbY1, kL1z,
      kL1x, curbY1, kL1z, vL2x, curbY2, vL2z, kL2x, curbY2, kL2z
    );
    rightCurbPos.push(
      kR1x, curbY1, kR1z, kR2x, curbY2, kR2z, vR1x, curbY1, vR1z,
      vR1x, curbY1, vR1z, kR2x, curbY2, kR2z, vR2x, curbY2, vR2z
    );

    // 5. Vertical Side Walls (Fascia)
    sideFasciaPos.push(
      vL1x, botY1, vL1z, vL2x, vergeY2, vL2z, vL1x, vergeY1, vL1z,
      vL1x, botY1, vL1z, vL2x, botY2, vL2z, vL2x, vergeY2, vL2z,
      vR1x, vergeY1, vR1z, vR2x, vergeY2, vR2z, vR1x, botY1, vR1z,
      vR1x, botY1, vR1z, vR2x, vergeY2, vR2z, vR2x, botY2, vR2z
    );

    // 6. Underside bottom floor
    bottomPos.push(
      vL1x, botY1, vL1z, vR1x, botY1, vR1z, vL2x, botY2, vL2z,
      vR1x, botY1, vR1z, vR2x, botY2, vR2z, vL2x, botY2, vL2z
    );
  }

  const makeMesh = (positions, color, roughness = 0.88) => {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geo.computeVertexNormals();
    const mesh = new THREE.Mesh(
      geo,
      new THREE.MeshStandardMaterial({
        color,
        roughness,
        metalness: 0.04,
        side: THREE.DoubleSide,
      })
    );
    mesh.receiveShadow = true;
    mesh.castShadow = true;
    return mesh;
  };

  g.add(makeMesh(centerPos, 0xd8caa8, 0.92)); // Warm sand road surface
  if (dashedPos.length > 0) g.add(makeMesh(dashedPos, 0xfcf9f2, 0.7)); // White center lane markings
  g.add(makeMesh(leftVergePos, C.trackGreen, 0.82)); // Green lawn verges
  g.add(makeMesh(rightVergePos, C.trackGreen, 0.82));
  g.add(makeMesh(leftCurbPos, 0x7d756b, 0.9)); // Outer granite curb
  g.add(makeMesh(rightCurbPos, 0x7d756b, 0.9));
  g.add(makeMesh(sideFasciaPos, 0x5a524a, 0.95)); // Side concrete fascia
  g.add(makeMesh(bottomPos, 0x383430, 0.95)); // Underside bottom plate

  // Floating Bridge Pylons / Pillars under the road at intervals
  for (let idx = 0; idx < n; idx += 26) {
    const pt = waypoints[idx];
    if (pt) {
      const pY = (pt.y ?? -8.5) - deckThickness;
      g.add(put(box(5.4, 1.2, 5.4, 0x5a524a, { cast: false }), pt.x, pY - 0.6, pt.z));
      g.add(put(box(3.8, 12.0, 3.8, 0x48423c, { cast: false }), pt.x, pY - 7.2, pt.z));
      g.add(put(box(2.8, 6.0, 2.8, 0x36312b, { cast: false }), pt.x, pY - 16.2, pt.z));
    }
  }

  // Start & End Cap vertical masonry faces
  if (n >= 2) {
    const pStart = waypoints[0];
    const nStart = normals[0];
    const yStart = pStart.y ?? -8.5;
    const topYStart = yStart + 0.52;
    const botYStart = yStart - deckThickness;
    const sL_x = pStart.x + nStart.nx * halfTotal, sL_z = pStart.z + nStart.nz * halfTotal;
    const sR_x = pStart.x - nStart.nx * halfTotal, sR_z = pStart.z - nStart.nz * halfTotal;

    sideFasciaPos.push(
      sL_x, botYStart, sL_z,
      sL_x, topYStart, sL_z,
      sR_x, topYStart, sR_z,

      sL_x, botYStart, sL_z,
      sR_x, topYStart, sR_z,
      sR_x, botYStart, sR_z
    );

    const pEnd = waypoints[n - 1];
    const nEnd = normals[n - 1];
    const yEnd = pEnd.y ?? -8.5;
    const topYEnd = yEnd + 0.52;
    const botYEnd = yEnd - deckThickness;
    const eL_x = pEnd.x + nEnd.nx * halfTotal, eL_z = pEnd.z + nEnd.nz * halfTotal;
    const eR_x = pEnd.x - nEnd.nx * halfTotal, eR_z = pEnd.z - nEnd.nz * halfTotal;

    sideFasciaPos.push(
      eR_x, botYEnd, eR_z,
      eR_x, topYEnd, eR_z,
      eL_x, topYEnd, eL_z,

      eR_x, botYEnd, eR_z,
      eL_x, topYEnd, eL_z,
      eL_x, botYEnd, eL_z
    );
  }

  return g;
}

/** Build the massive, highly detailed VK Pavilion matching Reference Image 2 */
function buildDetailedVKHub() {
  const g = new THREE.Group();
  g.name = 'journey_pavilion_vk_hub';

  // 1. Floating Sky Island Platform Base
  const baseW = 44;
  const baseD = 34;
  g.add(put(box(baseW, 1.6, baseD, C.groundSand, { cast: false }), 0, 0.8, 0));
  g.add(put(box(baseW + 1.2, 0.4, baseD + 1.2, C.groundShadow, { cast: false }), 0, 0.2, 0));
  // Stepped floating underside bedrock
  g.add(put(box(baseW - 2.0, 3.2, baseD - 2.0, C.groundTerrace, { cast: false }), 0, -1.6, 0));
  g.add(put(box(baseW - 6.0, 2.4, baseD - 6.0, C.groundShadow, { cast: false }), 0, -4.4, 0));
  g.add(put(box(baseW - 12.0, 4.0, baseD - 12.0, 0x22262d, { cast: false }), 0, -7.6, 0));

  // 2. Main Two-Story Building Structure
  const buildW = 32;
  const buildH = 22;
  const buildD = 22;
  const bZ = -4.5;

  // Solid weathered structural core
  g.add(put(box(buildW, buildH * 0.45, buildD, 0x5a6a7c), 0, buildH * 0.225 + 0.8, bZ));
  g.add(put(box(buildW * 0.85, buildH * 0.55, buildD * 0.85, 0x47586a), -2.0, buildH * 0.725 + 0.8, bZ - 1.5));

  // Weathered wooden facade strips and pillars
  for (const x of [-14.5, -5.0, 5.0, 14.5]) {
    g.add(put(box(1.2, buildH + 1.0, 1.2, 0x2e3c4e), x, buildH / 2 + 0.8, bZ + buildD / 2 + 0.2));
  }
  // Beams across floors
  g.add(put(box(buildW + 1.2, 0.9, 1.8, 0x243242), 0, buildH * 0.45 + 0.8, bZ + buildD / 2 + 0.4));
  g.add(put(box(buildW + 1.6, 1.1, 2.0, 0x243242), 0, buildH + 0.8, bZ + buildD / 2 + 0.4));

  // 3. Top Roof Monuments (VK 3D Logo Block + Giant Marquee)
  // Left: Giant 3D Stepped VK Logo Block
  const logoBox = put(box(8.5, 10.5, 3.8, 0x4473a8), -9.5, buildH + 6.2, bZ + 2.0);
  g.add(logoBox);
  const logoFace = put(box(7.6, 9.5, 0.25, C.white, { texture: getVKLogoTexture() }), -9.5, buildH + 6.2, bZ + 3.95);
  g.add(logoFace);

  // Right: Giant Marquee "ВКОНТАКТЕ: СЛУЖБА ПОСТИНГА" on steel trusses
  for (const x of [0.5, 12.5]) {
    g.add(put(box(0.6, 4.2, 0.6, C.metalDark), x, buildH + 2.8, bZ + 2.0));
  }
  const marquee = put(box(21.0, 6.6, 0.85, 0x1e2e4a, { texture: getVKJourneySignTexture() }), 6.5, buildH + 6.5, bZ + 2.4);
  g.add(marquee);

  // 4. Upper Floor Facade: "РОУТИНГ" Screen
  const routeScreen = put(box(9.2, 6.8, 0.35, C.white, { texture: getVKRoutingScreenTexture() }), -7.5, buildH * 0.72 + 0.8, bZ + buildD / 2 + 0.2);
  g.add(routeScreen);

  // 5. Lower Floor Open Dispatch Hall with Workstations
  // Open hall cavity base
  g.add(put(box(24.0, 0.3, 12.0, 0x223042), 2.0, 1.0, bZ + 3.0));

  // Central Desk: VK Post Feed Screen + Orange Shirt Operator
  g.add(put(box(12.5, 1.8, 3.2, 0x2b3b4f), 1.0, 1.9, bZ + 4.0));
  g.add(put(box(12.0, 0.2, 2.8, C.white), 1.0, 2.9, bZ + 4.0));
  const postScreen = put(box(8.2, 5.6, 0.25, C.white, { texture: getVKPostFeedScreenTexture() }), 1.0, 6.0, bZ + 3.0);
  g.add(postScreen);
  g.add(put(character({ shirt: 0xe66e4e, pants: C.vkBlue, scale: 0.92 }), 0.5, 1.0, bZ + 5.8));

  // Right Desk: Content Proof Screen + Teal Shirt Operator (Girl) + Dome Light
  g.add(put(box(5.8, 2.1, 3.4, 0x2b3b4f), 9.2, 2.0, bZ + 4.0));
  g.add(put(box(5.4, 0.2, 3.0, C.white), 9.2, 3.15, bZ + 4.0));
  const proofScreen = put(box(4.8, 6.2, 0.25, C.white, { texture: getVKContentProofScreenTexture() }), 9.2, 6.6, bZ + 3.0);
  g.add(proofScreen);
  const proofBadge = put(box(3.8, 1.1, 0.15, C.black, { texture: getBadgeTexture('КОНТЕНТ ПРУВОВ') }), 9.2, 10.1, bZ + 3.2);
  g.add(proofBadge);
  // Glowing dome lamp on counter
  g.add(put(box(0.7, 0.7, 0.7, 0xffeb60, { emissive: 0xffeb60, ei: 0.8 }), 7.5, 3.6, bZ + 3.5));
  g.add(put(character({ shirt: 0x3aa899, hair: C.hairBrown, pants: C.metalGrey, scale: 0.92 }), 9.2, 1.0, bZ + 5.8, 0, Math.PI, 0));

  // Lower Front Desk: Purple Shirt Operator
  g.add(put(box(4.8, 1.6, 2.4, 0x2b3b4f), 5.5, 1.8, bZ + 8.5));
  g.add(put(character({ shirt: 0x7b4ea6, pants: C.metalDark, scale: 0.88 }), 5.5, 1.0, bZ + 10.2, 0, Math.PI, 0));

  // 6. Front Interactive Like Monument 👍
  const likeFrame = put(box(8.8, 9.4, 1.4, 0x182438), 2.2, 5.7, bZ + 12.8);
  g.add(likeFrame);
  const likeScreen = put(box(8.0, 8.6, 0.25, C.white, { emissive: 0x4a7ad8, ei: 0.45, texture: getVKLikeMonumentTexture() }), 2.2, 5.7, bZ + 13.55);
  g.add(likeScreen);

  // 7. Left Outdoor Terrace
  const modPad = put(box(13.0, 0.28, 12.0, 0xf7ded7, { cast: false }), -15.5, 1.7, bZ + 8.0);
  g.add(modPad);

  // 8. Right Driveway with VK-ПОЧТА Delivery Van
  const drivePad = put(box(14.0, 0.28, 16.0, 0xd0c7bc, { cast: false }), 17.5, 1.7, bZ + 8.0);
  g.add(drivePad);

  for (const [vx, vz] of [[15.0, bZ + 12.5]]) {
    const van = new THREE.Group();
    van.position.set(vx, 1.8, vz);
    van.rotation.y = -0.35;
    // Body
    van.add(put(box(3.4, 1.4, 2.4, C.busCream), -1.4, 1.3, 0)); // Cab
    van.add(put(box(1.3, 1.2, 2.38, C.busGlass), -2.4, 2.3, 0)); // Windshield
    van.add(put(box(4.6, 2.4, 2.4, 0x4473a8), 1.6, 2.0, 0)); // Blue cargo box
    // Side VK-ПОЧТА markings
    van.add(put(box(3.8, 0.8, 0.08, C.white, { texture: getBadgeTexture('VK-ПОЧТА', '#4473a8') }), 1.6, 2.0, 1.25));
    van.add(put(box(3.8, 0.8, 0.08, C.white, { texture: getBadgeTexture('VK-ПОЧТА', '#4473a8') }), 1.6, 2.0, -1.25));
    // Wheels
    for (const [wx, wz] of [[-1.6, 1.25], [2.2, 1.25], [-1.6, -1.25], [2.2, -1.25]]) {
      van.add(put(box(0.65, 0.65, 0.25, C.black), wx, 0.55, wz));
      van.add(put(box(0.3, 0.3, 0.28, C.railSilver), wx, 0.55, wz));
    }
    g.add(van);
  }

  // 9. Front Roadside Furniture (Streetlamps, Bench, Flower Planter)
  g.add(put(buildJourneyLamp(), -18.5, 1.8, bZ + 16.5));
  g.add(put(buildJourneyLamp(), 11.5, 1.8, bZ + 16.5));
  g.add(put(buildJourneyBench(), -7.5, 1.8, bZ + 16.5));
  g.add(put(buildJourneyShrub(), -15.5, 1.8, bZ + 16.5));

  return g;
}

/** Build the massive YouTube Shorts & Creator Media Studio at Turn 2 */
function buildDetailedYouTubeHub() {
  const g = new THREE.Group();
  g.name = 'journey_pavilion_youtube_hub';

  // Floating Sky Island Platform Base
  const baseW = 42;
  const baseD = 32;
  g.add(put(box(baseW, 1.6, baseD, C.groundSand, { cast: false }), 0, 0.8, 0));
  g.add(put(box(baseW + 1.2, 0.4, baseD + 1.2, C.groundShadow, { cast: false }), 0, 0.2, 0));
  // Stepped floating underside bedrock
  g.add(put(box(baseW - 2.0, 3.2, baseD - 2.0, C.groundTerrace, { cast: false }), 0, -1.6, 0));
  g.add(put(box(baseW - 6.0, 2.4, baseD - 6.0, C.groundShadow, { cast: false }), 0, -4.4, 0));
  g.add(put(box(baseW - 12.0, 4.0, baseD - 12.0, 0x22262d, { cast: false }), 0, -7.6, 0));

  // Main 2-story building in white & bold red
  const buildW = 30;
  const buildH = 22;
  const buildD = 20;
  const bZ = -4.0;

  g.add(put(box(buildW, buildH, buildD, 0xf5f0ea), 0, buildH / 2 + 0.8, bZ));
  // Red accents and columns
  for (const x of [-13.5, -4.5, 4.5, 13.5]) {
    g.add(put(box(1.2, buildH + 0.8, 1.2, C.ytRed), x, buildH / 2 + 0.8, bZ + buildD / 2 + 0.2));
  }
  g.add(put(box(buildW + 1.2, 1.0, 1.8, C.ytRed), 0, buildH + 0.8, bZ + buildD / 2 + 0.3));

  // Top Marquee: "YOUTUBE SHORTS: КРЕАТОР СТУДИЯ"
  const marquee = put(
    box(22.0, 5.8, 0.8, 0x1f1f24, {
      texture: getSignTexture('YOUTUBE SHORTS: КРЕАТОР СТУДИЯ', '#e62117'),
    }),
    0, buildH + 5.8, bZ + 2.0
  );
  g.add(marquee);

  // Giant Vertical Standing Red YouTube Phone
  const ytPhone = buildYtPhone();
  ytPhone.position.set(-8.5, 0.8, bZ + buildD / 2 + 2.5);
  ytPhone.scale.setScalar(1.25);
  g.add(ytPhone);

  // Giant 3D YouTube Play Button Icon
  const ytPlay = buildYtPlayIcon();
  ytPlay.position.set(8.5, 0.8, bZ + buildD / 2 + 2.5);
  ytPlay.scale.setScalar(1.35);
  g.add(ytPlay);

  // Open-front Video Production Studio on ground floor
  g.add(put(box(16.0, 8.2, 0.4, 0x34c759), 0, 5.0, bZ + 1.0)); // Green screen backwall
  // Studio lighting softboxes on tripods
  for (const x of [-6.5, 6.5]) {
    g.add(put(box(0.25, 6.5, 0.25, C.metalDark), x, 3.25, bZ + 6.0));
    g.add(put(box(2.2, 2.2, 0.5, C.white, { emissive: 0xffffff, ei: 0.8 }), x, 6.5, bZ + 6.0));
  }
  // Video camera on tripod
  g.add(put(box(0.25, 4.2, 0.25, C.metalDark), 0, 2.1, bZ + 8.5));
  g.add(put(box(1.8, 1.2, 2.2, C.black), 0, 4.4, bZ + 8.5));

  // Creator & Director & Robot assistant characters
  g.add(put(character({ shirt: C.ytRed, pants: C.black, scale: 0.95 }), -2.0, 1.0, bZ + 4.5));
  g.add(put(character({ shirt: C.black, pants: C.metalGrey, scale: 0.95 }), 2.2, 1.0, bZ + 7.5, 0, Math.PI, 0));
  const camerabot = robot(C.botBody, C.botScreen);
  camerabot.position.set(0, 1.0, bZ + 7.0);
  g.add(camerabot);

  // Roadside Furniture
  g.add(put(buildJourneyLamp(), -16.5, 1.8, bZ + 15.0));
  g.add(put(buildJourneyLamp(), 16.5, 1.8, bZ + 15.0));
  g.add(put(buildJourneyBench(), 0, 1.8, bZ + 15.0));
  g.add(put(buildJourneyShrub(), -12.5, 1.8, bZ + 15.0));
  g.add(put(buildJourneyShrub(), 12.5, 1.8, bZ + 15.0));

  return g;
}

/** Build the dedicated Dzen Personal Blogging & Publishing Pavilion at Turn 3 */
function buildDetailedDzenHub() {
  const g = new THREE.Group();
  g.name = 'journey_pavilion_dzen_hub';

  // 1. Floating Sky Island Platform Base
  const baseW = 44;
  const baseD = 34;
  g.add(put(box(baseW, 1.6, baseD, C.groundSand, { cast: false }), 0, 0.8, 0));
  g.add(put(box(baseW + 1.2, 0.4, baseD + 1.2, C.groundShadow, { cast: false }), 0, 0.2, 0));
  // Stepped floating underside bedrock
  g.add(put(box(baseW - 2.0, 3.2, baseD - 2.0, C.groundTerrace, { cast: false }), 0, -1.6, 0));
  g.add(put(box(baseW - 6.0, 2.4, baseD - 6.0, C.groundShadow, { cast: false }), 0, -4.4, 0));
  g.add(put(box(baseW - 12.0, 4.0, baseD - 12.0, 0x22262d, { cast: false }), 0, -7.6, 0));

  // 2. Main Two-Story Building Structure in Modern Dark Graphite & Warm Wood
  const buildW = 32;
  const buildH = 22;
  const buildD = 22;
  const bZ = -4.5;

  // Solid dark architectural core
  g.add(put(box(buildW, buildH * 0.45, buildD, C.zenDark), 0, buildH * 0.225 + 0.8, bZ));
  g.add(put(box(buildW, buildH * 0.55, buildD, C.zenSlate), 0, buildH * 0.725 + 0.8, bZ));

  // Beams across floors (dark slate + subtle yellow edge line)
  g.add(put(box(buildW + 1.2, 0.9, 1.8, 0x1c1c22), 0, buildH * 0.45 + 0.8, bZ + buildD / 2 + 0.4));
  g.add(put(box(buildW + 1.6, 0.3, 0.2, C.zenYellow), 0, buildH * 0.45 + 0.8, bZ + buildD / 2 + 1.35));
  g.add(put(box(buildW + 1.6, 1.1, 2.0, 0x1c1c22), 0, buildH + 0.8, bZ + buildD / 2 + 0.4));

  // 3. Top Roof Monuments (Dzen 3D Logo Cube + Giant Marquee)
  // Left: Giant 3D Dzen Spark / 4-Point Star Monument Block
  const logoBox = put(box(8.5, 10.5, 3.8, 0x18181c), -9.5, buildH + 6.2, bZ + 2.0);
  g.add(logoBox);
  const logoFace = put(box(7.6, 9.5, 0.25, C.white, { texture: getDzenLogoTexture() }), -9.5, buildH + 6.2, bZ + 3.95);
  g.add(logoFace);

  // Right: Giant Marquee "ДЗЕН: ПЛАТФОРМА БЛОГОВ" on steel/graphite trusses
  for (const x of [0.5, 12.5]) {
    g.add(put(box(0.6, 4.2, 0.6, C.metalDark), x, buildH + 2.8, bZ + 2.0));
  }
  const marquee = put(
    box(21.0, 6.6, 0.85, 0x18181c, { texture: getDzenJourneySignTexture() }),
    6.5, buildH + 6.5, bZ + 2.4
  );
  g.add(marquee);

  // 4. Upper Floor Facade: Full-Wall Article Editor Screen
  const editorScreen = put(
    box(31.2, 10.4, 0.35, C.white, { texture: getDzenEditorScreenTexture() }),
    0, buildH * 0.725 + 0.8, bZ + buildD / 2 + 0.2
  );
  g.add(editorScreen);

  // 5. Lower Floor: Editorial Studio & Publishing Lounge
  // Open floor cavity
  g.add(put(box(24.0, 0.3, 12.0, 0x222228), 2.0, 1.0, bZ + 3.0));

  // Left Installation: Interactive Digital Article Monument
  const articleFrame = put(box(8.8, 9.4, 1.4, 0x18181c), -6.5, 5.7, bZ + 11.5);
  g.add(articleFrame);
  const articleScreen = put(
    box(8.0, 8.6, 0.25, C.white, { emissive: 0xffcc00, ei: 0.35, texture: getDzenArticleMonumentTexture() }),
    -6.5, 5.7, bZ + 12.25
  );
  g.add(articleScreen);

  // Right Installation: Dzen Wooden Article Newsstand & Press
  const dzenStand = new THREE.Group();
  dzenStand.position.set(8.5, 1.0, bZ + 10.5);
  dzenStand.add(put(box(11.0, 6.5, 4.5, C.zenWood), 0, 3.25, 0));
  dzenStand.add(put(box(9.6, 1.4, 0.2, 0x18181c, { texture: getZenSignTexture() }), 0, 5.8, 2.3));
  dzenStand.add(put(box(8.6, 3.8, 0.2, C.white, { texture: getArticleScrollTexture() }), 0, 2.8, 2.3));
  // Glowing ambient desk lamp on top counter
  dzenStand.add(put(box(0.8, 0.8, 0.8, 0xffeb60, { emissive: 0xffeb60, ei: 0.85 }), -3.8, 4.0, 1.0));
  g.add(dzenStand);

  // Center: Blogger / Writer Desk with laptop & coffee
  const desk = new THREE.Group();
  desk.position.set(1.0, 1.0, bZ + 7.5);
  desk.add(put(box(5.2, 1.8, 2.6, 0x8f5f30), 0, 0.9, 0)); // Wooden desk
  desk.add(put(box(1.8, 0.15, 1.2, 0x282830), 0, 1.88, 0)); // Laptop base
  desk.add(put(box(1.8, 1.1, 0.12, 0x282830), 0, 2.45, -0.5)); // Laptop screen
  desk.add(put(box(1.6, 0.9, 0.05, 0xffcc00, { emissive: 0xffcc00, ei: 0.8 }), 0, 2.45, -0.42)); // Screen glow
  desk.add(put(box(0.45, 0.55, 0.45, C.white), 1.8, 2.1, 0.2)); // Coffee mug
  g.add(desk);

  // Characters: Author / Blogger & Reader / Editor
  g.add(put(character({ shirt: C.clockYellow, pants: C.metalDark, scale: 0.92 }), 1.0, 1.0, bZ + 10.2, 0, Math.PI, 0));
  g.add(put(character({ shirt: 0x3d3d45, pants: C.groundTerrace, scale: 0.92 }), 8.5, 1.0, bZ + 13.8, 0, 0, 0));

  // 6. Roadside Furniture (Lamps, Bench, Planters)
  g.add(put(buildJourneyLamp(), -17.5, 1.8, bZ + 15.5));
  g.add(put(buildJourneyLamp(), 16.5, 1.8, bZ + 15.5));
  g.add(put(buildJourneyBench(), 1.0, 1.8, bZ + 15.5));
  g.add(put(buildJourneyShrub(), -13.5, 1.8, bZ + 15.5));
  g.add(put(buildJourneyShrub(), 13.5, 1.8, bZ + 15.5));

  return g;
}

/** Build the dedicated Hero Telegram Media & Channel Pavilion at Turn 4 */
function buildDetailedTelegramHub() {
  const g = new THREE.Group();
  g.name = 'journey_pavilion_telegram_hub';

  // 1. Floating Sky Island Platform Base
  const baseW = 44;
  const baseD = 34;
  g.add(put(box(baseW, 1.6, baseD, C.groundSand, { cast: false }), 0, 0.8, 0));
  g.add(put(box(baseW + 1.2, 0.4, baseD + 1.2, C.groundShadow, { cast: false }), 0, 0.2, 0));
  // Stepped floating underside bedrock
  g.add(put(box(baseW - 2.0, 3.2, baseD - 2.0, C.groundTerrace, { cast: false }), 0, -1.6, 0));
  g.add(put(box(baseW - 6.0, 2.4, baseD - 6.0, C.groundShadow, { cast: false }), 0, -4.4, 0));
  g.add(put(box(baseW - 12.0, 4.0, baseD - 12.0, 0x22262d, { cast: false }), 0, -7.6, 0));

  // 2. Open Sky-Blue Studio Room
  const roomW = 32;
  const roomH = 24;
  const roomD = 24;
  const bZ = -4.0;

  // Blue outer structural walls & light-blue interior
  // Back Wall
  g.add(put(box(roomW, roomH, 1.2, C.telegramSky), 0, roomH / 2 + 0.8, bZ - roomD / 2 + 0.6));
  // Left Wall
  g.add(put(box(1.2, roomH, roomD, C.telegramSky), -roomW / 2 + 0.6, roomH / 2 + 0.8, bZ));
  // Floor Inside Room
  g.add(put(box(roomW - 1.2, 0.6, roomD - 1.2, 0x8ed0f8, { cast: false }), 0, 1.1, bZ));
  // White/sky ceiling rim moulding
  g.add(put(box(roomW + 1.2, 0.8, 1.4, 0xbfe3fa), 0, roomH + 0.8, bZ - roomD / 2 + 0.6));
  g.add(put(box(1.4, 0.8, roomD + 1.2, 0xbfe3fa), -roomW / 2 + 0.6, roomH + 0.8, bZ));
  // Right front corner framing column
  g.add(put(box(1.4, roomH, 1.4, 0x3d91cf), roomW / 2 - 0.7, roomH / 2 + 0.8, bZ + roomD / 2 - 0.7));

  // Front Plinth: "Hero Telegram" White 3D Branding Sign
  const heroPlinth = put(
    box(24.0, 3.6, 0.4, 0x50a7ea, { texture: getTelegramHeroSignTexture() }),
    -3.5, 2.6, bZ + roomD / 2 + 0.2
  );
  g.add(heroPlinth);

  // 3. Wall Badges / Fluffy Scalloped Stickers (matching reference image)
  // Left Wall Stickers:
  const stickerPlay = put(
    box(0.15, 5.0, 5.0, C.white, { texture: getTelegramStickerTexture('play') }),
    -roomW / 2 + 1.28, 16.2, bZ - 3.5
  );
  g.add(stickerPlay);

  const stickerCamera = put(
    box(0.15, 5.0, 5.0, C.white, { texture: getTelegramStickerTexture('camera') }),
    -roomW / 2 + 1.28, 9.5, bZ - 3.5
  );
  g.add(stickerCamera);

  // Back Wall Stickers:
  const stickerHeart = put(
    box(5.0, 5.0, 0.15, C.white, { texture: getTelegramStickerTexture('heart') }),
    -8.5, 17.5, bZ - roomD / 2 + 1.28
  );
  g.add(stickerHeart);

  const stickerClapper = put(
    box(5.2, 5.0, 0.15, C.white, { texture: getTelegramStickerTexture('clapper') }),
    -2.0, 17.5, bZ - roomD / 2 + 1.28
  );
  g.add(stickerClapper);

  // Big Speech Bubble with Telegram Paper Plane Logo
  const speechLogo = put(
    box(8.2, 9.2, 0.25, C.white, { texture: getTelegramSpeechLogoTexture() }),
    8.5, 16.0, bZ - roomD / 2 + 1.35
  );
  g.add(speechLogo);

  // 4. Conveyor Machine & Colorful Video Circles ("Кружочки")
  const machG = new THREE.Group();
  machG.position.set(4.0, 0, bZ - 2.5);

  // Main machine table body
  machG.add(put(box(18.0, 3.2, 5.2, 0x3a485a), 0, 3.2, 0));
  machG.add(put(box(18.4, 0.4, 5.6, 0x242e3c), 0, 4.9, 0));
  // 4 Table legs
  for (const [lx, lz] of [[-8.2, -2.1], [8.2, -2.1], [-8.2, 2.1], [8.2, 2.1]]) {
    machG.add(put(box(0.8, 1.6, 0.8, 0x1a222c), lx, 0.8, lz));
  }
  // Front Button Panel with Colored LED Squares
  machG.add(put(box(17.2, 1.2, 0.15, 0x222a36, { texture: getTelegramConveyorControlsTexture() }), 0, 3.4, 2.68));

  // Conveyor Belt Ribbon
  machG.add(put(box(11.8, 0.2, 3.6, 0x1c242f), 3.0, 5.2, 0));

  // 3 Colored Video Circles (Macarons / "Кружочки"): Purple, Green, Coral Red
  machG.add(put(box(3.2, 1.2, 3.2, 0xa855f7, { emissive: 0x9333ea, ei: 0.35 }), -0.5, 5.8, 0));
  machG.add(put(box(2.6, 0.2, 2.6, 0xd8b4fe), -0.5, 6.45, 0));

  machG.add(put(box(3.2, 1.2, 3.2, 0x22c55e, { emissive: 0x16a34a, ei: 0.35 }), 3.4, 5.8, 0));
  machG.add(put(box(2.6, 0.2, 2.6, 0x86efac), 3.4, 6.45, 0));

  machG.add(put(box(3.2, 1.2, 3.2, 0xef4444, { emissive: 0xdc2626, ei: 0.35 }), 7.3, 5.8, 0));
  machG.add(put(box(2.6, 0.2, 2.6, 0xfca5a5), 7.3, 6.45, 0));

  // Left side cartridge feeder & document stack
  machG.add(put(box(4.5, 1.8, 4.8, 0x47586a), -6.6, 5.8, 0));
  machG.add(put(box(2.4, 0.3, 2.8, C.white), -6.6, 6.8, 0));
  machG.add(put(box(2.0, 0.2, 2.4, C.clockYellow), -6.6, 7.05, 0));

  // Underneath crate / battery server pack
  machG.add(put(box(4.8, 1.8, 2.8, 0x5078a8), 3.0, 1.2, 0));
  machG.add(put(box(5.0, 0.25, 3.0, C.metalDark), 3.0, 2.15, 0));

  g.add(machG);

  // 5. Front Standing Dashboard Console with 4 Glowing Cards (Red Megaphone, Cyan Nodes, Green Chat, Purple Clock)
  const consoleG = new THREE.Group();
  consoleG.position.set(-4.5, 0, bZ + 6.8);

  // Console Frame & Screen
  consoleG.add(put(box(17.2, 7.2, 0.8, 0x242e3c), 0, 5.8, 0));
  consoleG.add(put(box(16.4, 6.4, 0.25, 0x181f2a, { emissive: 0x50a7ea, ei: 0.35, texture: getTelegramConsoleIconsTexture() }), 0, 5.8, 0.45));
  // 2 Support Legs & Base Feet
  consoleG.add(put(box(0.8, 2.8, 0.8, 0x3d4b5c), -6.2, 1.4, 0));
  consoleG.add(put(box(0.8, 2.8, 0.8, 0x3d4b5c), 6.2, 1.4, 0));
  consoleG.add(put(box(2.4, 0.4, 2.4, 0x242e3c), -6.2, 0.2, 0));
  consoleG.add(put(box(2.4, 0.4, 2.4, 0x242e3c), 6.2, 0.2, 0));

  g.add(consoleG);

  // 6. Rigged Character & Roadside Furniture
  g.add(put(character({ shirt: 0x50a7ea, pants: C.white, scale: 0.92 }), 8.5, 1.0, bZ + 8.5, 0, Math.PI, 0));
  g.add(put(buildJourneyLamp(), -17.5, 1.8, bZ + 15.5));
  g.add(put(buildJourneyLamp(), 16.5, 1.8, bZ + 15.5));
  g.add(put(buildJourneyBench(), 8.5, 1.8, bZ + 15.5));
  g.add(put(buildJourneyShrub(), -13.5, 1.8, bZ + 15.5));
  g.add(put(buildJourneyShrub(), 13.5, 1.8, bZ + 15.5));

  return g;
}

/** Build the grand Postilka Omnichannel Export & Analytics Citadel at the journey destination */
function buildDetailedPostilkaCitadel() {
  const g = new THREE.Group();
  g.name = 'journey_pavilion_postilka_citadel';

  // Floating Sky Island Platform Base
  const baseW = 48;
  const baseD = 36;
  g.add(put(box(baseW, 1.6, baseD, C.groundSand, { cast: false }), 0, 0.8, 0));
  g.add(put(box(baseW + 1.2, 0.4, baseD + 1.2, C.groundShadow, { cast: false }), 0, 0.2, 0));
  // Stepped floating underside bedrock
  g.add(put(box(baseW - 2.0, 3.6, baseD - 2.0, C.groundTerrace, { cast: false }), 0, -1.8, 0));
  g.add(put(box(baseW - 6.0, 2.8, baseD - 6.0, C.groundShadow, { cast: false }), 0, -5.0, 0));
  g.add(put(box(baseW - 14.0, 5.0, baseD - 14.0, 0x22262d, { cast: false }), 0, -8.9, 0));

  const buildW = 36;
  const buildH = 26;
  const buildD = 22;
  const bZ = -4.0;

  // Main Royal Citadel Building
  g.add(put(box(buildW, buildH, buildD, 0x141e2e), 0, buildH / 2 + 0.8, bZ));

  // Golden Framing Pillars & Cornices framing the citadel facade
  const pillarZ = bZ + buildD / 2 + 0.5;
  for (const x of [-16.8, 16.8]) {
    g.add(put(box(1.8, buildH + 1.2, 1.8, 0xe6a117), x, buildH / 2 + 0.8, pillarZ));
  }
  g.add(put(box(buildW + 2.4, 1.2, 2.2, 0xe6a117), 0, buildH + 1.0, pillarZ));
  g.add(put(box(buildW + 1.0, 0.8, 1.2, 0xffd700), 0, buildH + 1.8, pillarZ));

  // Top Marquee: "POSTILKA CITADEL: 6 СОЦСЕТЕЙ В 1 КЛИК"
  const marquee = put(
    box(28.0, 6.2, 1.0, 0x0f1826, {
      texture: getPostilkaMasterSignTexture(),
    }),
    0, buildH + 6.2, bZ + 2.0
  );
  g.add(marquee);

  // Golden Communication Antenna Tower with Dish & Beacon
  const antennaTower = new THREE.Group();
  antennaTower.position.set(0, buildH + 8.8, bZ);
  antennaTower.add(put(box(2.0, 12.0, 2.0, 0xe6a117), 0, 6.0, 0));
  antennaTower.add(put(box(0.8, 8.0, 0.8, 0xffd700), 0, 16.0, 0));
  antennaTower.add(put(box(5.0, 5.0, 1.0, 0xffffff, { emissive: 0xe6a117, ei: 0.8 }), 0, 12.0, 1.0));
  antennaTower.add(put(box(2.0, 2.0, 2.0, 0x00ffcc, { emissive: 0x00ffcc, ei: 1.0 }), 0, 21.0, 0));
  g.add(antennaTower);

  // Analytics screen prominently centered on Citadel facade
  const analyticsZ = bZ + buildD / 2 + 0.62;
  const analyticsWall = put(
    box(28.0, 13.5, 0.35, 0xffffff, {
      texture: getPostilkaAnalyticsWallTexture(),
      emissive: 0x223355,
      ei: 0.35,
    }),
    0, 13.5, analyticsZ
  );
  analyticsWall.renderOrder = 2;
  g.add(analyticsWall);

  // Victory Winners Podium with Hero & AI Maestro
  const podium = new THREE.Group();
  podium.position.set(0, 0.8, bZ + buildD / 2 + 5.0);
  podium.add(put(box(12.0, 1.6, 6.0, 0xe6a117), 0, 0.8, 0));
  podium.add(put(box(5.0, 2.6, 5.0, 0xffd700), 0, 1.3, 0));
  podium.add(put(character({ shirt: C.orange, pants: C.white, scale: 1.1 }), 0, 2.6, 0));
  podium.add(put(character({ shirt: C.postilkaNavy, pants: C.vkBlue, scale: 0.95 }), -3.5, 1.6, 0));
  podium.add(put(character({ shirt: C.ytRed, pants: C.white, scale: 0.95 }), 3.5, 1.6, 0));
  g.add(podium);

  // Roadside Furniture
  g.add(put(buildJourneyLamp(), -20.5, 1.8, bZ + 16.0));
  g.add(put(buildJourneyLamp(), 20.5, 1.8, bZ + 16.0));
  g.add(put(buildJourneyBench(), -12.0, 1.8, bZ + 16.0));
  g.add(put(buildJourneyBench(), 12.0, 1.8, bZ + 16.0));
  g.add(put(buildJourneyShrub(), -16.0, 1.8, bZ + 16.0));
  g.add(put(buildJourneyShrub(), 16.0, 1.8, bZ + 16.0));

  return g;
}

/** 3D End-of-Road Cliff Barrier with "Скоро обновление!" billboard */
function buildRoadTerminusBarrier(track) {
  const g = new THREE.Group();
  g.name = 'journey_road_terminus_barrier';

  const endSample = sampleJourneyTrack(track, 1.0);
  const roadY = journeyRoadSurfaceY(endSample.y);
  g.position.set(endSample.x, roadY, endSample.z);
  // Tangent angle along road is endSample.angle.
  // Facing back towards oncoming characters: endSample.angle + Math.PI
  g.rotation.y = endSample.angle + Math.PI;

  const totalW = 20.4;

  // 1. Heavy Stone/Concrete Bumper Base across the road
  g.add(put(box(totalW, 2.2, 2.4, C.roadStoneDark, { cast: true }), 0, 1.1, 0));
  g.add(put(box(totalW + 0.8, 0.5, 2.8, C.groundShadow, { cast: false }), 0, 0.25, 0));

  // 2. Hazard Striped Steel Beam across the front
  g.add(put(box(totalW - 0.4, 1.2, 0.6, 0xffcc00, { texture: getHazardStripeTexture() }), 0, 1.2, 1.25));

  // 3. Sturdy Industrial Steel Support Posts
  const postPositions = [-8.8, 0, 8.8];
  for (const px of postPositions) {
    g.add(put(box(1.0, 11.0, 1.0, C.metalDark), px, 5.5, 0));
    g.add(put(box(1.4, 0.4, 1.4, 0x111622), px, 0.2, 0));
    // Hazard diagonal strut behind
    const strut = put(box(0.6, 6.0, 0.6, C.metalDark), px, 3.0, -1.8);
    strut.rotation.x = 0.5;
    g.add(strut);
  }

  // 4. Warning Flashing Beacons on top of side posts
  for (const px of [-8.8, 8.8]) {
    g.add(put(box(1.2, 0.4, 1.2, C.metalDark), px, 11.2, 0));
    g.add(put(box(0.8, 1.0, 0.8, 0xff3b30, { emissive: 0xff3b30, ei: 1.0 }), px, 11.8, 0));
  }
  // Center amber beacon
  g.add(put(box(1.2, 0.4, 1.2, C.metalDark), 0, 11.2, 0));
  g.add(put(box(0.8, 1.0, 0.8, 0xffaa00, { emissive: 0xffaa00, ei: 1.0 }), 0, 11.8, 0));

  // 5. Large 3D Billboard / Signboard: "СКОРО ОБНОВЛЕНИЕ!"
  const signW = 16.0;
  const signH = 6.8;
  const signZ = 0.5;
  const signY = 7.0;

  const billboardG = new THREE.Group();
  billboardG.position.set(0, signY, signZ);
  billboardG.rotation.x = -0.32; // Tilted back/upward for ideal readability from diorama camera

  // Sign backing plate & frame
  billboardG.add(put(box(signW + 0.8, signH + 0.8, 0.8, 0x0a101d), 0, 0, -0.1));
  billboardG.add(put(box(signW + 1.2, 0.4, 1.0, 0xffaa00), 0, signH / 2 + 0.3, 0));
  billboardG.add(put(box(signW + 1.2, 0.4, 1.0, 0xffaa00), 0, -signH / 2 - 0.3, 0));

  // Main textured sign face
  const signFace = put(
    box(signW, signH, 0.3, 0x0e1726, {
      texture: getRoadTerminusSignTexture(),
      emissive: 0x141e2e,
      ei: 0.3,
    }),
    0,
    0,
    0.25
  );
  billboardG.add(signFace);

  // Top overhead lamps illuminating billboard
  for (const lx of [-5.0, 5.0]) {
    billboardG.add(put(box(1.0, 0.4, 1.2, C.metalDark), lx, signH / 2 + 0.6, 0.3));
    billboardG.add(put(box(0.7, 0.2, 0.6, 0xfff5cc, { emissive: 0xfff5cc, ei: 1.0 }), lx, signH / 2 + 0.4, 0.4));
  }

  g.add(billboardG);

  // 6. Traffic Cones on curbs in front of barrier
  for (const cx of [-7.0, -3.5, 3.5, 7.0]) {
    const cone = new THREE.Group();
    cone.position.set(cx, 0, 2.6);
    cone.add(put(box(1.1, 0.2, 1.1, 0x222222), 0, 0.1, 0));
    cone.add(put(box(0.8, 0.6, 0.8, 0xff5500), 0, 0.5, 0));
    cone.add(put(box(0.6, 0.5, 0.6, 0xffffff), 0, 1.0, 0));
    cone.add(put(box(0.4, 0.5, 0.4, 0xff5500), 0, 1.45, 0));
    g.add(cone);
  }

  return g;
}

function easeInOutCubic(t) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

function dampAngle(current, target, lambda, dt) {
  let diff = (target - current) % (Math.PI * 2);
  if (diff < -Math.PI) diff += Math.PI * 2;
  if (diff > Math.PI) diff -= Math.PI * 2;
  return current + diff * (1 - Math.exp(-lambda * dt));
}

function journeyDogFlankPosition(heroSample, flank, lateral, backOffset = 0, facingDir = 1) {
  const nx = -Math.cos(heroSample.angle);
  const nz = Math.sin(heroSample.angle);
  const tx = Math.sin(heroSample.angle);
  const tz = Math.cos(heroSample.angle);
  return {
    x: heroSample.x + nx * flank * lateral - tx * facingDir * backOffset,
    z: heroSample.z + nz * flank * lateral - tz * facingDir * backOffset,
  };
}

function applyJourneyLocomotion(ja, heroRig, dogRig, t, dt, isMoving, worldSpeed) {
  if (isMoving) {
    ja.heroStridePhase = (ja.heroStridePhase ?? 0) + dt * worldSpeed * 0.38;
    const stride = Math.sin(ja.heroStridePhase);
    const bounce = Math.abs(Math.sin(ja.heroStridePhase)) * 0.06;

    heroRig.legL.rotation.x = stride * 0.65;
    heroRig.legR.rotation.x = -stride * 0.65;
    heroRig.armL.rotation.x = -stride * 0.48;
    heroRig.armR.rotation.x = stride * 0.48;
    heroRig.armL.rotation.z = 0.04;
    heroRig.armR.rotation.z = -0.04;
    heroRig.body.position.y = bounce;
    heroRig.body.rotation.z = Math.sin(ja.heroStridePhase) * 0.04;
    heroRig.body.rotation.x = THREE.MathUtils.damp(heroRig.body.rotation.x, 0, 8, dt);
    heroRig.head.rotation.y = Math.sin(t * 1.5) * 0.05;

    ja.dogStridePhase = (ja.dogStridePhase ?? 0) + dt * worldSpeed * 0.52;
    const dogStride = Math.sin(ja.dogStridePhase);
    dogRig.legFL.rotation.x = dogStride * 0.68;
    dogRig.legBR.rotation.x = dogStride * 0.68;
    dogRig.legFR.rotation.x = -dogStride * 0.68;
    dogRig.legBL.rotation.x = -dogStride * 0.68;
    dogRig.visual.position.y = Math.abs(Math.sin(ja.dogStridePhase)) * 0.05;
    dogRig.head.rotation.x = 0.04 + Math.sin(ja.dogStridePhase) * 0.04;
    dogRig.tail.rotation.z = Math.sin(t * 7.2) * 0.32;
    return;
  }

  heroRig.legL.rotation.x = THREE.MathUtils.damp(heroRig.legL.rotation.x, 0, 10, dt);
  heroRig.legR.rotation.x = THREE.MathUtils.damp(heroRig.legR.rotation.x, 0, 10, dt);
  heroRig.armL.rotation.x = THREE.MathUtils.damp(heroRig.armL.rotation.x, 0, 10, dt);
  heroRig.armR.rotation.x = THREE.MathUtils.damp(heroRig.armR.rotation.x, 0, 10, dt);
  heroRig.armL.rotation.z = THREE.MathUtils.damp(heroRig.armL.rotation.z, 0.04, 10, dt);
  heroRig.armR.rotation.z = THREE.MathUtils.damp(heroRig.armR.rotation.z, -0.04, 10, dt);
  heroRig.body.position.y = THREE.MathUtils.damp(heroRig.body.position.y, 0, 8, dt);
  heroRig.body.rotation.x = THREE.MathUtils.damp(heroRig.body.rotation.x, 0, 8, dt);
  heroRig.body.rotation.z = THREE.MathUtils.damp(heroRig.body.rotation.z, 0, 8, dt);
  heroRig.head.rotation.y = Math.sin(t * 0.6) * 0.06;

  dogRig.legFL.rotation.x = THREE.MathUtils.damp(dogRig.legFL.rotation.x, 0, 10, dt);
  dogRig.legFR.rotation.x = THREE.MathUtils.damp(dogRig.legFR.rotation.x, 0, 10, dt);
  dogRig.legBL.rotation.x = THREE.MathUtils.damp(dogRig.legBL.rotation.x, 0, 10, dt);
  dogRig.legBR.rotation.x = THREE.MathUtils.damp(dogRig.legBR.rotation.x, 0, 10, dt);
  dogRig.visual.position.y = THREE.MathUtils.damp(dogRig.visual.position.y, 0, 8, dt);
  dogRig.head.rotation.x = THREE.MathUtils.damp(dogRig.head.rotation.x, 0, 8, dt);
  dogRig.tail.rotation.z = Math.sin(t * 3.0) * 0.16;
}

function updateJourneyActors(ja, t, dt) {
  const hero = ja.hero;
  const dog = ja.dog;
  const heroRig = hero.userData.rig;
  const dogRig = dog.userData.rig;

  if (ja.mode === 'idle') {
    heroRig.body.position.y = Math.sin(t * 1.7) * 0.025;
    heroRig.body.rotation.z = Math.sin(t * 0.62) * 0.018;
    heroRig.head.rotation.y = Math.sin(t * 0.47) * 0.22;
    heroRig.head.rotation.x =
      Math.sin(t * 0.88) * 0.045 + Math.pow(Math.max(0, Math.sin(t * 0.31)), 12) * 0.12;
    // Stationary: legs firmly on ground, no swinging
    heroRig.legL.rotation.x = THREE.MathUtils.damp(heroRig.legL.rotation.x, 0, 10, dt);
    heroRig.legR.rotation.x = THREE.MathUtils.damp(heroRig.legR.rotation.x, 0, 10, dt);
    heroRig.armL.rotation.z = 0.05 + Math.sin(t * 0.9) * 0.035;
    const waveWindow = Math.pow(Math.max(0, Math.sin(t * 0.34)), 10);
    heroRig.armR.rotation.z = THREE.MathUtils.lerp(
      -0.05 - Math.sin(t * 0.9) * 0.025,
      2.35 + Math.sin(t * 8.0) * 0.22,
      waveWindow
    );
    heroRig.armR.rotation.x = Math.sin(t * 8.0) * 0.12 * waveWindow;
    dogRig.visual.position.y = Math.sin(t * 1.9 + 0.8) * 0.018;
    dogRig.head.rotation.y = Math.sin(t * 0.58 + 0.7) * 0.2;
    dogRig.head.rotation.x = Math.sin(t * 0.93) * 0.055;
    dogRig.tail.rotation.z = Math.sin(t * 4.4) * 0.28;
    dogRig.legFL.rotation.x = THREE.MathUtils.damp(dogRig.legFL.rotation.x, 0, 10, dt);
    dogRig.legFR.rotation.x = THREE.MathUtils.damp(dogRig.legFR.rotation.x, 0, 10, dt);
    dogRig.legBL.rotation.x = THREE.MathUtils.damp(dogRig.legBL.rotation.x, 0, 10, dt);
    dogRig.legBR.rotation.x = THREE.MathUtils.damp(dogRig.legBR.rotation.x, 0, 10, dt);
    return;
  }


  if (ja.mode === 'walking') {
    const deltaU = ja.walkTarget - ja.walkU;

    // Responsive velocity directly tracking walkTarget without lingering inertia
    const targetVelocity = THREE.MathUtils.clamp(deltaU * 14.0, -0.30, 0.30);
    ja.velocity = THREE.MathUtils.damp(ja.velocity, targetVelocity, 18.0, dt);
    ja.walkU += ja.velocity * dt;

    // Precise stop at target without overshoot or oscillation
    if (ja.velocity > 0 && ja.walkU >= ja.walkTarget) {
      ja.walkU = ja.walkTarget;
      ja.velocity = 0;
    } else if (ja.velocity < 0 && ja.walkU <= ja.walkTarget) {
      ja.walkU = ja.walkTarget;
      ja.velocity = 0;
    }
    ja.walkU = THREE.MathUtils.clamp(ja.walkU, 0, 1);

    // Smooth visual interpolation
    if (ja.displayU === undefined) ja.displayU = ja.walkU;
    ja.displayU += (ja.walkU - ja.displayU) * Math.min(1, dt * 22.0);

    const trackLength = ja.trackInfo.total;
    const worldSpeed = Math.abs(ja.velocity) * trackLength;
    const isMoving = worldSpeed > 0.25 || Math.abs(ja.walkTarget - ja.displayU) > 0.0003;

    if (deltaU > 0.0005) {
      ja.facingDirection = 1;
    } else if (deltaU < -0.0005) {
      ja.facingDirection = -1;
    }

    const heroSample = sampleJourneyTrack(ja.trackInfo, ja.displayU);
    const heroGroundY = landingHeroGroundY(heroSample.y);
    hero.position.x = heroSample.x;
    hero.position.z = heroSample.z;
    hero.position.y += (heroGroundY - hero.position.y) * Math.min(1, dt * 16.0);

    const targetHeroAngle = ja.facingDirection === 1 ? heroSample.angle : heroSample.angle + Math.PI;
    ja.heroAngle = dampAngle(ja.heroAngle ?? heroSample.angle, targetHeroAngle, 8.0, dt);
    hero.rotation.y = ja.heroAngle;

    const dogFlank = ja.facingDirection === 1 ? -1 : 1;
    const dogFlankPos = journeyDogFlankPosition(
      heroSample,
      dogFlank,
      LANDING_DOG_FLANK_OFFSET,
      LANDING_DOG_BACK_OFFSET,
      ja.facingDirection
    );
    const dogGroundY = landingDogGroundY(heroSample.y);
    dog.position.x = dogFlankPos.x;
    dog.position.z = dogFlankPos.z;
    dog.position.y += (dogGroundY - dog.position.y) * Math.min(1, dt * 16.0);

    ja.dogAngle = dampAngle(ja.dogAngle ?? heroSample.angle, targetHeroAngle, 8.0, dt);
    dog.rotation.y = ja.dogAngle;

    applyJourneyLocomotion(ja, heroRig, dogRig, t, dt, isMoving, worldSpeed);
  }
}

/** Build the complete stepped diorama city */
export function buildCity(reduced = false) {
  const city = new THREE.Group();
  const movers = [];
  movers.reduced = reduced;
  const screens = [];

  // ==========================================
  // 1. UNIFIED ARCHITECTURAL BASE & PORTICO (Ровный портик)
  // ==========================================
  const groundG = new THREE.Group();

  // Solid Main Platform Core (from y = -6 to 0, Z from -48 to +32.5, X from -56 to +56)
  const baseW = 112;
  const baseH = 6.0;
  const baseD = 80.5;
  const baseZ = -7.75; // Centers Z between -48 and +32.5

  // Main subterranean foundation core
  groundG.add(put(box(baseW, baseH, baseD, C.groundShadow, { cast: false }), 0, -baseH / 2, baseZ));

  // Top surface slab (Factory ground)
  groundG.add(put(box(baseW, 0.4, baseD, C.groundSand, { cast: false }), 0, 0.2, baseZ));

  // --- REFINED UNIFIED FRONT PORTICO FACADE (Ровный портик) ---
  const porticoZ = 32.5;

  // 1. Top Cornice Moulding (Верхний карниз портика)
  groundG.add(put(box(baseW + 1.2, 0.65, 1.4, C.wallBevel, { cast: false }), 0, -0.32, porticoZ));

  // 2. Main Vertical Portico Wall (Лицевая стена портика)
  groundG.add(put(box(baseW, baseH - 1.2, 0.9, C.wallCream, { cast: false }), 0, -(baseH / 2 + 0.1), porticoZ - 0.2));

  // 3. Portico Architectural Pilasters / Framing panels (Ритмичные пилястры портика)
  const pilasterPositions = [-52, -39, -26, -13, 0, 13, 26, 39, 52];
  for (const px of pilasterPositions) {
    groundG.add(put(box(1.6, baseH - 1.2, 0.35, C.wallBevel, { cast: false }), px, -(baseH / 2 + 0.1), porticoZ + 0.3));
  }

  // 4. Bottom Stylobate Plinth (Нижний стилобат/цоколь)
  groundG.add(put(box(baseW + 2.0, 0.9, 1.8, C.groundShadow, { cast: false }), 0, -(baseH - 0.45), porticoZ));

  // --- LEFT & RIGHT SIDE FACADES ---
  // Left flank facade
  groundG.add(put(box(1.2, baseH, baseD, C.wallCream, { cast: false }), -baseW / 2 - 0.5, -baseH / 2, baseZ));
  groundG.add(put(box(1.6, 0.65, baseD + 1.2, C.wallBevel, { cast: false }), -baseW / 2 - 0.5, -0.32, baseZ));
  // Right flank facade
  groundG.add(put(box(1.2, baseH, baseD, C.wallCream, { cast: false }), baseW / 2 + 0.5, -baseH / 2, baseZ));
  groundG.add(put(box(1.6, 0.65, baseD + 1.2, C.wallBevel, { cast: false }), baseW / 2 + 0.5, -0.32, baseZ));

  // Back Wall
  groundG.add(put(box(112, 18, 5, C.wallCream), 0, 9, -46));
  groundG.add(put(box(114, 1.2, 6, C.wallBevel), 0, 18.5, -46));

  // --- CLEAN SURFACE DISTRICT PADS (y >= 0, sitting flush on platform surface) ---
  // VK District surface floor pad (sitting on top, not hanging into base)
  groundG.add(put(box(24, 0.35, 23, C.vkBlue, { cast: false }), -29, 0.18, 20.5));

  // YouTube Shorts floor pad
  groundG.add(put(box(20, 0.35, 20, C.groundSand, { cast: false }), -8, 0.18, 22));

  // Zen Articles floor pad
  groundG.add(put(box(22, 0.35, 22, C.zenSand, { cast: false }), 12, 0.18, 21));

  // Photochka floor pad
  groundG.add(put(box(22, 0.35, 22, C.photoPink, { cast: false }), 31, 0.18, 21));

  // Telegram District elevated podium (top-left)
  groundG.add(put(box(26, 4.6, 28, C.wallCream, { cast: false }), -45, 2.3, 6));
  groundG.add(put(box(26.6, 0.4, 28.6, C.groundShadow, { cast: false }), -45, 4.8, 6));

  // Clean architectural ground foundation around the scene (supporting depots, perimeter road & stops)
  groundG.add(put(box(184, 1.4, 116, C.groundTerrace, { cast: false }), 0, -6.6, -4.0));

  city.add(groundG);

  // Journey protagonists group — heroes are placed on the floating road once the track exists.
  const journeyActors = new THREE.Group();
  journeyActors.name = 'landing_journey_actors';

  // --- MULTI-SCREEN FLOATING SKYWAY JOURNEY DISTRICT ---
  // A magnificent voxel highway and pavilion islands floating in the sky (Z from 48 to 325, Y from -8.5 to -16.0)
  const journeyLowerDeck = new THREE.Group();
  journeyLowerDeck.name = 'journey_lower_deck';

  // Catmull-Rom Spline Waypoints across multiple screens (Z: 36 -> 348)
  // Generously rounded turns (radius >= 25) for smooth flowing curves with zero kinks
  const splineControlPoints = [
    // Purple Zone: Extended road start on the far-left sweeping around the front-left corner with an elegant curve
    new THREE.Vector3(-96, -8.5, 36),
    new THREE.Vector3(-92, -8.5, 48),
    new THREE.Vector3(-72, -8.5, 58),
    new THREE.Vector3(-38, -8.5, 62),

    // Tier 1: Road directly opposite Central Bus Stop (x: -4, z: 62) and traverse rightward across screen
    new THREE.Vector3(-4, -8.5, 62),
    new THREE.Vector3(18, -8.5, 67),
    new THREE.Vector3(38, -8.5, 76),
    new THREE.Vector3(58, -8.5, 88),

    // Turn 1 around VK Hub Sky Plaza (Z: 96..128, Y: -8.8 -> -10.4)
    new THREE.Vector3(76, -8.8, 102),
    new THREE.Vector3(75, -9.6, 120),
    new THREE.Vector3(48, -10.4, 134),
    new THREE.Vector3(15, -11.0, 142),

    // Tier 2: Traverse leftward across screen (Z: 142..165, Y: -11.0)
    new THREE.Vector3(-25, -11.0, 150),
    new THREE.Vector3(-65, -11.0, 158),

    // Turn 2 around YouTube Shorts Studio (Z: 165..204, Y: -11.3 -> -13.0)
    new THREE.Vector3(-96, -11.3, 172),
    new THREE.Vector3(-95, -12.2, 192),
    new THREE.Vector3(-68, -13.0, 206),
    new THREE.Vector3(-25, -13.5, 216),

    // Tier 3: Traverse rightward across screen (Z: 216..242, Y: -13.5)
    new THREE.Vector3(15, -13.5, 226),
    new THREE.Vector3(55, -13.5, 236),

    // Turn 3 around Dzen Hub (Z: 242..280, Y: -13.8 -> -15.5)
    new THREE.Vector3(92, -13.8, 250),
    new THREE.Vector3(90, -14.8, 270),
    new THREE.Vector3(64, -15.5, 284),
    new THREE.Vector3(22, -16.0, 296),

    // Tier 4: Traverse leftward across screen (Z: 296..325, Y: -16.0)
    new THREE.Vector3(-25, -16.0, 306),
    new THREE.Vector3(-65, -16.0, 318),

    // Turn 4 around Telegram Hero Hub (Z: 325..368, Y: -16.3 -> -18.0)
    new THREE.Vector3(-96, -16.3, 332),
    new THREE.Vector3(-95, -17.2, 352),
    new THREE.Vector3(-68, -18.0, 368),
    new THREE.Vector3(-25, -18.5, 380),

    // Tier 5: Approach Postilka Citadel Plaza (Z: 380..458, Y: -18.5 -> -19.5)
    new THREE.Vector3(15, -18.5, 392),
    new THREE.Vector3(50, -18.8, 404),
    new THREE.Vector3(76, -19.2, 420),
    new THREE.Vector3(75, -19.5, 436),
    new THREE.Vector3(48, -19.5, 452),
    new THREE.Vector3(10, -19.5, 458),
  ];

  const journeySpline = new THREE.CatmullRomCurve3(splineControlPoints, false, 'centripetal', 0.4);
  const journeyRoadWaypoints = journeySpline.getPoints(300);
  const journeyTrack = buildTrackInfo(journeyRoadWaypoints);

  // Wide solid 3D floating road mesh with sandy roadway, green lawn borders, stone curbs, bottom plate & pillars
  const journeyRoad = buildJourneyWideRoadMesh(journeyRoadWaypoints, 20.0);
  journeyRoad.name = 'journey_road_reveal';
  journeyRoad.visible = true;
  journeyLowerDeck.add(journeyRoad);

  // Road furniture placed along verge edges (inside the green border, never overhanging)
  const roadFurniture = new THREE.Group();
  roadFurniture.name = 'journey_road_furniture';
  const furnitureUs = [];
  for (let u = 0.03; u <= 0.95; u += 0.048) furnitureUs.push(u);
  for (let i = 0; i < furnitureUs.length; i++) {
    const u = furnitureUs[i];
    const benchSide = i % 4 < 2 ? 1 : -1;
    const shrubSide = -benchSide;

    if (i % 2 === 0) {
      // Bench station: bench parallel to road edge, seat facing the roadway
      const benchEdge = sampleJourneyTrackEdge(journeyTrack, u, benchSide, 8.0);
      const bench = put(buildJourneyBench(), benchEdge.x, benchEdge.y, benchEdge.z);
      bench.rotation.y = benchSide === 1 ? benchEdge.angle : benchEdge.angle + Math.PI;
      roadFurniture.add(bench);

      // Lamp beside the bench (offset along the road), not behind it
      const lampOffsetU = THREE.MathUtils.clamp(u + 0.018, 0.02, 0.98);
      const lampEdge = sampleJourneyTrackEdge(journeyTrack, lampOffsetU, benchSide, 8.0);
      roadFurniture.add(put(buildJourneyLamp(), lampEdge.x, lampEdge.y, lampEdge.z));

      const shrubEdge = sampleJourneyTrackEdge(journeyTrack, u, shrubSide, 7.9);
      roadFurniture.add(put(buildJourneyShrub(), shrubEdge.x, shrubEdge.y, shrubEdge.z));
    } else {
      const lampEdge = sampleJourneyTrackEdge(journeyTrack, u, benchSide, 8.1);
      const shrubEdge = sampleJourneyTrackEdge(journeyTrack, u, shrubSide, 7.9);
      roadFurniture.add(put(buildJourneyLamp(), lampEdge.x, lampEdge.y, lampEdge.z));
      roadFurniture.add(put(buildJourneyShrub(), shrubEdge.x, shrubEdge.y, shrubEdge.z));
    }
  }
  journeyLowerDeck.add(roadFurniture);

  // Detailed Massive Floating Pavilions along each major turn (placed with ample clearance beside the road)
  const journeyPavilions = new THREE.Group();
  journeyPavilions.name = 'journey_pavilions';

  // 1. VK Hub (Turn 1, Right Corner, Z ≈ 114) — Floating sky island
  const vkHub = buildDetailedVKHub();
  vkHub.position.set(122, -8.5, 114);
  vkHub.rotation.y = 0.55;
  journeyPavilions.add(vkHub);

  // 2. YouTube Shorts & Creator Media Studio (Turn 2, Left Corner, Z ≈ 182) — Floating sky island
  const youtubeHub = buildDetailedYouTubeHub();
  youtubeHub.position.set(-138, -11.0, 182);
  youtubeHub.rotation.y = 0.55;
  journeyPavilions.add(youtubeHub);

  // 3. Dzen Personal Blogging & Publishing Pavilion (Turn 3, Right Corner, Z ≈ 265) — Floating sky island
  const dzenHub = buildDetailedDzenHub();
  dzenHub.position.set(142, -13.5, 265);
  dzenHub.rotation.y = 0.55;
  journeyPavilions.add(dzenHub);

  // 4. Hero Telegram Media & Video Circles Pavilion (Turn 4, Left Corner, Z ≈ 348) — Floating sky island
  const telegramHub = buildDetailedTelegramHub();
  telegramHub.position.set(-138, -16.0, 348);
  telegramHub.rotation.y = 0.55;
  journeyPavilions.add(telegramHub);

  // 5. Postilka Omnichannel Export & Analytics Citadel (Destination Plaza, Z ≈ 435) — Facade faces camera & road arrival
  const postilkaCitadel = buildDetailedPostilkaCitadel();
  postilkaCitadel.position.set(118, -19.0, 435);
  postilkaCitadel.rotation.y = 0.55;
  journeyPavilions.add(postilkaCitadel);

  // 6. Cliff End Terminus Barrier & "Скоро обновление!" Billboard Sign (Z ≈ 458)
  const terminusBarrier = buildRoadTerminusBarrier(journeyTrack);
  journeyPavilions.add(terminusBarrier);

  journeyLowerDeck.add(journeyPavilions);
  city.add(journeyLowerDeck);

  function getTrackUClosestTo(track, targetX, targetZ) {
    let bestU = 0;
    let minD2 = Infinity;
    const steps = 600;
    for (let i = 0; i <= steps; i++) {
      const u = i / steps;
      const pt = sampleJourneyTrack(track, u);
      const d2 = (pt.x - targetX) ** 2 + (pt.z - targetZ) ** 2;
      if (d2 < minD2) {
        minD2 = d2;
        bestU = u;
      }
    }
    return bestU;
  }

  const landingHero = buildLandingHero();
  const landingDog = buildLandingDog();
  const initialU = getTrackUClosestTo(journeyTrack, -4, 62);
  const journeyStart = sampleJourneyTrack(journeyTrack, initialU);
  const startDogFlank = -1;
  const startDogFlankPos = journeyDogFlankPosition(
    journeyStart,
    startDogFlank,
    LANDING_DOG_FLANK_OFFSET,
    LANDING_DOG_BACK_OFFSET,
    1
  );
  const CAMERA_FACING_ANGLE = 0.70;

  landingHero.position.set(
    journeyStart.x,
    landingHeroGroundY(journeyStart.y),
    journeyStart.z
  );
  landingHero.rotation.y = CAMERA_FACING_ANGLE;
  journeyActors.add(landingHero);

  landingDog.position.set(
    startDogFlankPos.x,
    landingDogGroundY(journeyStart.y),
    startDogFlankPos.z
  );
  landingDog.rotation.y = CAMERA_FACING_ANGLE;
  journeyActors.add(landingDog);

  journeyActors.userData = {
    hero: landingHero,
    dog: landingDog,
    journeyRoad,
    journeyLowerDeck,
    journeyTrack,
    trackInfo: journeyTrack,
    initialU,
    roadTop: journeyRoadSurfaceY(-8.5),
    startHero: landingHero.position.clone(),
    startDog: landingDog.position.clone(),
    mode: 'idle',
    walkU: initialU,
    walkTarget: initialU,
    displayU: initialU,
    velocity: 0,
    facingDirection: 1,
    heroAngle: CAMERA_FACING_ANGLE,
    dogAngle: CAMERA_FACING_ANGLE,
    heroStridePhase: 0,
    dogStridePhase: 0,
  };
  city.add(journeyActors);

  movers.push({
    fn: (t, dt) => {
      if (movers.reduced) return;
      updateJourneyActors(journeyActors.userData, t, dt);
    },
  });

  // ==========================================
  // 1B. PERIMETER BUS TRACK & BUS STOPS & DEPOTS (Haruni Shuttle Loop)
  // ==========================================
  const perimeterG = new THREE.Group();
  perimeterG.name = 'perimeter_bus_track';

  const busWaypoints = [];
  // 0. Inside Depot 1 (Left)
  busWaypoints.push({ x: -68, z: -53 });
  busWaypoints.push({ x: -68, z: -42 });
  busWaypoints.push({ x: -68, z: -20 });
  busWaypoints.push({ x: -68, z: 0 }); // Stop 1: Telegram
  busWaypoints.push({ x: -68, z: 24 }); // Start Left-Front corner arc

  // 1. Left-to-Front Rounded Corner Arc (Center: -50, 24, Radius: 18, 16 steps from 180° down to 90°)
  const arcSteps = 16;
  for (let i = 1; i <= arcSteps; i++) {
    const th = Math.PI - (i / arcSteps) * (Math.PI / 2);
    busWaypoints.push({
      x: -50 + 18 * Math.cos(th),
      z: 24 + 18 * Math.sin(th),
    });
  }

  // 2. Front Straight Segment
  busWaypoints.push({ x: 0, z: 42 }); // Stop 2: Center Postilka & Dzen
  busWaypoints.push({ x: 50, z: 42 }); // Start Front-Right corner arc

  // 3. Front-to-Right Rounded Corner Arc (Center: 50, 24, Radius: 18, 16 steps from 90° down to 0°)
  for (let i = 1; i <= arcSteps; i++) {
    const th = Math.PI / 2 - (i / arcSteps) * (Math.PI / 2);
    busWaypoints.push({
      x: 50 + 18 * Math.cos(th),
      z: 24 + 18 * Math.sin(th),
    });
  }

  // 4. Right Straight Segment into Depot 2
  busWaypoints.push({ x: 68, z: -5 }); // Stop 3: MAX Bot
  busWaypoints.push({ x: 68, z: -20 });
  busWaypoints.push({ x: 68, z: -42 });
  busWaypoints.push({ x: 68, z: -53 }); // Inside Depot 2

  const busTrackInfo = getTrackDistance(busWaypoints);

  // Construct continuous seamless road mesh along all smooth waypoints (no intersection lines, no middle rails)
  perimeterG.add(buildContinuousRoadMesh(busWaypoints, -5.85));

  // --- TWO BUS DEPOTS (ДЕПО №1 & ДЕПО №2) ---
  // 1. Left Bus Depot (Начало маршрута): x: -68, z: -53
  const depot1 = buildBusDepot('left', 'ДЕПО №1');
  depot1.position.set(-68, -5.85, -53);
  perimeterG.add(depot1);

  // 2. Right Bus Depot (Конец маршрута): x: 68, z: -53
  const depot2 = buildBusDepot('right', 'ДЕПО №2');
  depot2.position.set(68, -5.85, -53);
  perimeterG.add(depot2);

  // --- THREE BUS STOPS ALONG THE 3 SIDES ---
  // 1. Left Stop (Telegram District): x: -77, z: 0, facing +X (angle: Math.PI / 2)
  const stopTelegram = buildBusStop('telegram', 'ТЕЛЕГРАМ');
  stopTelegram.position.set(-77, -5.85, 0);
  stopTelegram.rotation.y = Math.PI / 2;
  perimeterG.add(stopTelegram);

  // 2. Front Center Stop (Postilka / Dzen): x: 0, z: 50.5, facing -Z (angle: Math.PI)
  const stopCenter = buildBusStop('center', 'ПОСТИЛКА');
  stopCenter.position.set(0, -5.85, 50.5);
  stopCenter.rotation.y = Math.PI;
  perimeterG.add(stopCenter);

  // 3. Right Stop (MAX Bot): x: 77, z: -5, facing -X (angle: -Math.PI / 2)
  const stopMax = buildBusStop('max', 'МАКС БОТ');
  stopMax.position.set(77, -5.85, -5);
  stopMax.rotation.y = -Math.PI / 2;
  perimeterG.add(stopMax);

  // Haruni Style Perimeter Trees (Cherry pink and green cube foliage)
  const treePositions = [
    { x: -77, z: 24, pink: true },
    { x: -77, z: -20, pink: false },
    { x: -36, z: 51, pink: true },
    { x: 36, z: 51, pink: false },
    { x: 77, z: 24, pink: true },
    { x: 77, z: -20, pink: false },
  ];
  for (const tp of treePositions) {
    const tree = new THREE.Group();
    // Trunk
    tree.add(put(box(0.9, 4.5, 0.9, C.woodLeg), 0, 2.25, 0));
    // Crown
    const leafCol = tp.pink ? C.photoPink : C.trackGreenDk;
    tree.add(put(box(3.6, 3.4, 3.6, leafCol), 0, 5.8, 0));
    tree.add(put(box(2.6, 1.2, 2.6, tp.pink ? 0xffb7b2 : C.trackGreen), 0, 7.8, 0));
    tree.position.set(tp.x, -5.85, tp.z);
    perimeterG.add(tree);
  }

  // Perimeter Streetlamps
  const lampPositions = [
    { x: -60, z: 47 },
    { x: 60, z: 47 },
    { x: -74, z: 12 },
    { x: 74, z: 8 },
  ];
  for (const lp of lampPositions) {
    const lamp = new THREE.Group();
    lamp.add(put(box(0.4, 5.5, 0.4, C.postilkaDark), 0, 2.75, 0));
    lamp.add(put(box(0.9, 0.3, 0.9, C.metalDark), 0, 5.4, 0));
    lamp.add(
      put(
        box(0.9, 0.9, 0.9, C.clockYellow, {
          emissive: 0xfff59d,
          ei: 0.95,
        }),
        0,
        6.0,
        0
      )
    );
    lamp.add(put(box(1.2, 0.25, 1.2, C.postilkaDark), 0, 6.6, 0)); // cap
    lamp.position.set(lp.x, -5.85, lp.z);
    perimeterG.add(lamp);
  }

  city.add(perimeterG);

  // Haruni Yellow Voxel Shuttle Bus
  const haruniBus = buildHaruniBus();
  haruniBus.position.y = -5.55;
  city.add(haruniBus);

  // ==========================================
  // 2. CENTRAL CONVEYOR SPINE & MACHINERY
  // ==========================================
  const factoryG = new THREE.Group();
  factoryG.name = 'conveyor_spine';

  // --- Start Tunnel & Alarm Clock (Left) ---
  const clockStation = new THREE.Group();
  // Tunnel furnace box
  clockStation.add(put(box(6, 7, 7, C.postilkaNavy), 0, 3.5, 0));
  clockStation.add(put(box(3.5, 4.5, 7.2, C.black), 1.3, 2.25, 0)); // tunnel arch opening

  // Alarm clock on top
  const clockBody = box(3.6, 3.6, 1.8, C.clockRed);
  clockBody.position.set(0, 8.8, 0);
  clockStation.add(clockBody);

  // Clock face with texture
  const clockFace = box(3.2, 3.2, 0.1, C.white, { texture: getClockFaceTexture() });
  clockFace.position.set(0, 8.8, 0.95);
  clockStation.add(clockFace);

  // Bells on top
  clockStation.add(put(box(1.2, 0.8, 1.2, C.clockYellow), -1.4, 11, 0, 0, 0, 0.35));
  clockStation.add(put(box(1.2, 0.8, 1.2, C.clockYellow), 1.4, 11, 0, 0, 0, -0.35));
  clockStation.add(put(box(0.3, 0.8, 0.3, C.metalGrey), 0, 11, 0)); // hammer

  clockStation.position.set(-36, 0, -14);
  clockStation.scale.setScalar(1.16);
  factoryG.add(clockStation);

  // --- Main Conveyor Belt (Running Left to Right) ---
  factoryG.add(makeConveyorSection(64, -2, 4.5, -14));

  // --- Robot Copywriter Station (Left of Lens) ---
  const writerG = new THREE.Group();
  // Red stool
  writerG.add(put(box(2.2, 0.5, 2.2, C.clockRed), 0, 2.8, 2.8));
  writerG.add(put(box(0.4, 2.8, 0.4, C.woodLeg), 0, 1.4, 2.8));

  // Robot sitting
  const copyBot = robot(C.botBody, C.screenGreen);
  copyBot.position.set(0, 3.1, 2.8);
  writerG.add(copyBot);

  // Retro Typewriter / Keyboard desk
  writerG.add(put(box(3.2, 0.5, 2.2, C.woodPlank), 0, 4.8, 0.5));
  writerG.add(put(box(2.6, 0.8, 1.8, C.metalDark), 0, 5.3, 0.5));

  // Floating paper sheet with wavy lines
  const paperSheet = box(3.0, 2.2, 0.1, C.white, { texture: getPaperSheetTexture() });
  paperSheet.position.set(0, 8.2, 0.5);
  paperSheet.rotation.set(-0.25, 0, 0);
  writerG.add(paperSheet);

  writerG.position.set(-24, 0, -14);
  writerG.scale.setScalar(1.12);
  factoryG.add(writerG);

  movers.push({
    fn: (t) => {
      if (!movers.reduced) {
        copyBot.rotation.y = Math.sin(t * 8) * 0.05;
        paperSheet.position.y = 8.2 + Math.sin(t * 2) * 0.3;
      }
    },
  });

  // --- Media Machine (Big Camera Lens & Film Reel) ---
  const mediaMachineG = new THREE.Group();
  // Main camera body
  mediaMachineG.add(put(box(9, 8, 8, C.metalDark), 0, 6.0, 0));
  mediaMachineG.add(put(box(9.2, 1.2, 8.2, C.postilkaLight), 0, 10.2, 0));

  // Huge camera lens pointing towards front
  const lensRim = box(5.2, 5.2, 2.2, C.metalGrey);
  lensRim.position.set(0, 6.2, 4.6);
  mediaMachineG.add(lensRim);

  const lensGlass = box(4.0, 4.0, 0.8, C.black, {
    unique: true,
    emissive: 0x112233,
    ei: 0.5,
  });
  lensGlass.position.set(0, 6.2, 5.8);
  mediaMachineG.add(lensGlass);
  screens.push(lensGlass);

  // High-contrast front control panel, matching the reference machine.
  const machinePanel = box(7.4, 6.2, 0.45, C.postilkaLight);
  machinePanel.position.set(0, 5.8, 6.25);
  mediaMachineG.add(machinePanel);
  mediaMachineG.add(put(box(2.4, 1.5, 0.25, C.black), 0, 3.7, 6.55));
  mediaMachineG.add(
    put(box(1.8, 0.6, 0.2, C.screenGreen, { emissive: C.screenGreen, ei: 0.7 }), 0, 3.7, 6.72)
  );

  // Two stylized reel hubs on the visible face.
  for (const rx of [-2.1, 2.1]) {
    const hub = new THREE.Group();
    hub.add(box(2.7, 2.7, 0.35, C.metalGrey));
    hub.add(put(box(0.45, 2.2, 0.45, C.black), 0, 0, 0.3));
    hub.add(put(box(2.2, 0.45, 0.45, C.black), 0, 0, 0.3));
    hub.add(put(box(0.65, 0.65, 0.55, C.clockYellow), 0, 0, 0.4));
    for (let voxel = 0; voxel < 12; voxel++) {
      const angle = (voxel / 12) * Math.PI * 2;
      hub.add(
        put(
          box(0.48, 0.48, 0.35, C.wallCream),
          Math.cos(angle) * 1.35,
          Math.sin(angle) * 1.35,
          0.55
        )
      );
    }
    hub.position.set(rx, 7.2, 6.55);
    mediaMachineG.add(hub);
    movers.push({
      fn: (_t, dt) => {
        if (!movers.reduced) hub.rotation.z += (rx < 0 ? 1 : -1) * 1.5 * dt;
      },
    });
  }

  // Colored process cables below the media machine.
  mediaMachineG.add(put(box(0.35, 3.0, 0.35, C.clockRed), -2.7, 2.0, 6.25));
  mediaMachineG.add(put(box(0.35, 3.6, 0.35, C.telegramSky), -1.6, 1.7, 6.25));
  mediaMachineG.add(put(box(0.35, 3.2, 0.35, C.clockYellow), 1.7, 1.9, 6.25));
  mediaMachineG.add(put(box(0.35, 2.8, 0.35, C.screenGreen), 2.8, 2.1, 6.25));

  // Spinning film reel on top
  const filmReel = new THREE.Group();
  filmReel.add(box(5.0, 5.0, 0.8, C.metalDark));
  // 6 radial spokes / holes
  for (let i = 0; i < 6; i++) {
    const a = (i * Math.PI) / 3;
    const hole = box(0.9, 0.9, 0.9, C.postilkaNavy);
    put(hole, Math.cos(a) * 1.6, Math.sin(a) * 1.6, 0);
    filmReel.add(hole);
  }
  filmReel.position.set(0, 12.8, 0);
  mediaMachineG.add(filmReel);

  mediaMachineG.position.set(-6, 0, -14);
  mediaMachineG.scale.setScalar(1.28);
  factoryG.add(mediaMachineG);

  movers.push({
    fn: (_t, dt) => {
      if (!movers.reduced) {
        filmReel.rotation.z += 2.2 * dt;
      }
    },
  });

  // --- Checkpoint Gate with Green [✓] Stamp & Inspector Bot ---
  const checkGateG = new THREE.Group();
  // Gate frame
  checkGateG.add(put(box(0.8, 6.5, 0.8, C.metalGrey), -2.4, 6.5, 0));
  checkGateG.add(put(box(0.8, 6.5, 0.8, C.metalGrey), 2.4, 6.5, 0));
  checkGateG.add(put(box(5.6, 0.8, 0.8, C.metalGrey), 0, 9.6, 0));

  // Green [✓] checkmark sign on top
  const checkSign = box(2.4, 2.4, 0.4, C.checkGreen, { texture: getCheckmarkTexture() });
  checkSign.position.set(0, 11.2, 0);
  checkGateG.add(checkSign);

  // Inspector Robot with Stamp
  const inspectorBot = robot(C.screenGreen, C.white);
  inspectorBot.position.set(3.2, 3.5, 1.8);
  checkGateG.add(inspectorBot);

  // Stamp in hand
  checkGateG.add(put(box(0.6, 1.4, 0.6, C.woodPlank), 2.4, 4.6, 1.8));

  checkGateG.position.set(14, 0, -14);
  checkGateG.scale.setScalar(1.12);
  factoryG.add(checkGateG);

  // --- Dispatch Launcher / Splitter Machine ---
  const dispatchStation = new THREE.Group();
  dispatchStation.add(put(box(8, 6.5, 6, C.postilkaNavy), 0, 6.0, 0));
  dispatchStation.add(put(box(8.4, 0.8, 6.4, C.metalGrey), 0, 9.5, 0));
  // Exit tray with parcel stacks
  dispatchStation.add(put(box(4, 0.4, 4, C.metalDark), 4.5, 4.6, 0));
  for (let i = 0; i < 3; i++) {
    for (let j = 0; j < 2; j++) {
      const p = parcel(1.1, 0.8, 1.0);
      p.position.set(3.4 + i * 1.2, 5.2, -1 + j * 1.4);
      dispatchStation.add(p);
    }
  }

  dispatchStation.position.set(28, 0, -14);
  dispatchStation.scale.setScalar(1.12);
  factoryG.add(dispatchStation);

  // Moving parcels on conveyor
  const conveyorParcels = [];
  for (let i = 0; i < 5; i++) {
    const p = parcel(1.5, 1.1, 1.3);
    p.userData = { offset: i * 14 };
    p.position.set(-32 + p.userData.offset, 5.2, -14);
    factoryG.add(p);
    conveyorParcels.push(p);
  }

  movers.push({
    fn: (_t, dt) => {
      if (movers.reduced) return;
      for (const p of conveyorParcels) {
        p.position.x += 6.5 * dt;
        if (p.position.x > 26) {
          p.position.x = -32;
        }
      }
    },
  });

  city.add(factoryG);

  // ==========================================
  // 3. BACK ROW FACILITIES
  // ==========================================
  const backRowG = new THREE.Group();

  // --- A. Media Studio (Back-Left) ---
  const mediaStudio = new THREE.Group();
  // Open studio: floor, rear wall and one side wall.
  mediaStudio.add(put(box(22, 0.7, 12, C.groundSand), 0, 0.35, 0));
  mediaStudio.add(put(box(22, 16, 0.7, C.wallCream), 0, 8, -5.65));
  mediaStudio.add(put(box(0.7, 16, 12, C.wallCream), -10.65, 8, 0));

  // "MEDIA STUDIO" sign on rear wall
  const msSign = box(14, 2.2, 0.4, C.postilkaNavy, {
    texture: getSignTexture('MEDIA STUDIO', '#24334f'),
  });
  msSign.position.set(0, 14.0, -5.1);
  mediaStudio.add(msSign);

  // Gauges on rear wall
  const gauges = box(12, 2.4, 0.3, C.postilkaNavy, { texture: getGaugesTexture() });
  gauges.position.set(0, 11.2, -5.15);
  mediaStudio.add(gauges);

  // Bright Green Screen backdrop on rear wall
  const greenScreen = box(16, 9.5, 0.3, C.screenGreen, {
    roughness: 0.5,
    emissive: C.screenGreen,
    ei: 0.15,
  });
  greenScreen.position.set(0, 5.2, -5.15);
  mediaStudio.add(greenScreen);

  // Studio softbox lights (left and right) angled towards green screen
  function makeSoftbox(x, z, ry) {
    const sb = new THREE.Group();
    sb.add(put(box(0.3, 8, 0.3, C.black), 0, 4, 0)); // stand
    sb.add(put(box(3.2, 4.2, 1.8, C.black), 0, 8, 0)); // shade
    sb.add(
      put(
        box(3.0, 4.0, 0.2, C.white, { unique: true, emissive: C.white, ei: 0.8 }),
        0,
        8,
        0.95
      )
    ); // white light panel
    sb.position.set(x, 0, z);
    sb.rotation.y = ry;
    return sb;
  }
  mediaStudio.add(makeSoftbox(-7.5, -0.5, Math.PI - 0.45));
  mediaStudio.add(makeSoftbox(7.5, -0.5, Math.PI + 0.45));

  // Camera on rail facing the green screen
  const studioCam = new THREE.Group();
  studioCam.add(put(box(0.4, 5.5, 0.4, C.black), 0, 2.75, 0));
  studioCam.add(put(box(2.2, 2.0, 3.2, C.metalDark), 0, 6.0, 0));
  studioCam.add(put(box(1.6, 1.6, 1.2, C.black), 0, 6.0, -1.8)); // lens pointing towards rear wall
  studioCam.position.set(0, 0, 4.2);
  mediaStudio.add(studioCam);

  mediaStudio.position.set(-43, 0, -38);
  backRowG.add(mediaStudio);

  // --- B. Sketch Booth (Back-Center) ---
  const sketchBooth = new THREE.Group();
  sketchBooth.add(put(box(14, 0.7, 10, C.groundSand), 0, 0.35, 0));
  sketchBooth.add(put(box(14, 16, 0.7, C.white), 0, 8, -4.65));
  sketchBooth.add(put(box(0.7, 16, 10, C.white), -6.65, 8, 0));
  sketchBooth.add(put(box(14.4, 1.2, 10.4, C.postilkaLight), 0, 16.5, 0));

  // "SKETCH BOOTH" sign
  const sbSign = box(12, 2.0, 0.3, C.postilkaNavy, {
    texture: getSignTexture('SKETCH BOOTH', '#334769'),
  });
  sbSign.position.set(0, 11.5, 5.2);
  sketchBooth.add(sbSign);

  // Top chamber: open tray receiving the source sketch.
  sketchBooth.add(put(box(8, 0.5, 6, C.postilkaLight), 0, 11.3, 2));
  sketchBooth.add(put(box(8, 4.5, 0.5, C.postilkaLight), 0, 13.5, -0.75));
  const childChar = character({
    shirt: C.white,
    pants: C.vkBlue,
    skin: C.skinLight,
    hair: C.hairBrown,
    scale: 0.7,
  });
  childChar.position.set(0, 11.6, 2.6);
  sketchBooth.add(childChar);

  // Bottom chamber: open tray with the polished rendered result.
  sketchBooth.add(put(box(8, 0.5, 6, C.groundSand), 0, 1.3, 2));
  sketchBooth.add(put(box(8, 6.5, 0.5, C.groundSand), 0, 4.5, -0.75));
  const renderChar = character({
    shirt: C.photoPink,
    pants: C.postilkaNavy,
    skin: C.skinWarm,
    hair: C.hairDark,
    scale: 0.9,
  });
  renderChar.position.set(0, 1.5, 2.6);
  sketchBooth.add(renderChar);

  sketchBooth.position.set(-26, 0, -38);
  backRowG.add(sketchBooth);

  // --- C. Central POSTILKA production tower ---
  const postilkaTower = new THREE.Group();
  postilkaTower.name = 'postilka_tower';

  // Narrow vertical body with an open, layered factory facade.
  postilkaTower.add(put(box(14, 27, 11, C.photoCoralDk), 0, 13.5, 0));
  postilkaTower.add(put(box(11.5, 23, 0.7, C.wallCream), 0, 12.5, 5.7));
  postilkaTower.add(put(box(14.6, 1.2, 11.6, C.postilkaNavy), 0, 27.5, 0));

  // Visible floor plates, windows, pipes and process screens.
  for (let floor = 0; floor < 4; floor++) {
    const y = 4 + floor * 5.3;
    postilkaTower.add(put(box(11.5, 0.55, 5, C.woodPlank), 0, y, 3.3));
    postilkaTower.add(put(box(3.3, 2.3, 0.25, C.telegramGlass), -3.1, y + 2, 5.95));
    postilkaTower.add(put(box(3.3, 2.3, 0.25, C.screenGreen), 2.2, y + 2, 5.95));
    postilkaTower.add(put(box(0.45, 4.2, 0.45, C.pipeGrey), 5, y + 2, 5.7));
  }

  // Side cables linking the tower to the conveyor.
  postilkaTower.add(put(box(0.55, 18, 0.55, C.clockYellow), -6.2, 10, 4.9));
  postilkaTower.add(put(box(0.55, 13, 0.55, C.screenGreen), 6.2, 8, 4.9));

  const postilkaSign = box(19, 5.2, 1.1, C.postilkaDark, {
    texture: getPostilkaSignTexture(),
  });
  postilkaSign.position.set(0, 31, 1.8);
  postilkaTower.add(postilkaSign);
  postilkaTower.add(put(box(0.4, 5.5, 0.4, C.postilkaDark), -8.2, 31, 0.8));
  postilkaTower.add(put(box(0.4, 5.5, 0.4, C.postilkaDark), 8.2, 31, 0.8));

  postilkaTower.position.set(-13, 0, -40);
  backRowG.add(postilkaTower);

  // --- D. Calendar Tower (Back-Right-Center) ---
  const calendarTower = new THREE.Group();
  calendarTower.name = 'calendar_tower';
  calendarTower.add(put(box(22, 24, 12, C.wallCream), 0, 12, 0));
  calendarTower.add(put(box(22.4, 1.2, 12.4, C.postilkaNavy), 0, 24.5, 0));

  // Exhaust chimney pipe on roof
  const pipe = box(2.4, 6.5, 2.4, C.pipeGrey);
  pipe.position.set(8.5, 27.5, -2);
  calendarTower.add(pipe);

  // "CALENDAR TOWER" sign
  const ctSign = box(18, 2.2, 0.4, C.postilkaNavy, {
    texture: getSignTexture('CALENDAR TOWER', '#24334f'),
  });
  ctSign.position.set(0, 22.5, 6.2);
  calendarTower.add(ctSign);

  // Large Monthly Grid board
  const calendarBoard = box(18, 17, 0.4, C.white, {
    texture: getCalendarGridTexture(),
  });
  calendarBoard.position.set(0, 12.5, 6.2);
  calendarTower.add(calendarBoard);

  calendarTower.position.set(29, 0, -38);
  backRowG.add(calendarTower);

  // --- E. Disk Warehouse (Back-Right) ---
  const diskWarehouse = new THREE.Group();
  diskWarehouse.add(put(box(16, 0.7, 10, C.groundSand), 0, 0.35, 0));
  diskWarehouse.add(put(box(16, 20, 0.7, C.wallCream), 0, 10, -4.65));
  diskWarehouse.add(put(box(0.7, 20, 10, C.wallCream), 7.65, 10, 0));
  diskWarehouse.add(put(box(16.4, 1.2, 10.4, C.woodDark), 0, 20.5, 0));

  // "DISK WAREHOUSE" sign
  const dwSign = box(14, 2.2, 0.4, C.woodDark, {
    texture: getSignTexture('DISK WAREHOUSE', '#5c3e20'),
  });
  dwSign.position.set(0, 18.5, 5.2);
  diskWarehouse.add(dwSign);

  // Wooden Shelves with server hard drives & crates
  for (let row = 0; row < 4; row++) {
    const sy = 3.5 + row * 3.8;
    diskWarehouse.add(put(box(14, 0.5, 4, C.woodPlank), 0, sy, 3));
    // Hard drives (blue) and wooden crates
    for (let c = 0; c < 3; c++) {
      const cx = -4 + c * 4;
      if (row % 2 === 0) {
        diskWarehouse.add(put(box(2.8, 2.2, 2.8, C.postilkaLight), cx, sy + 1.2, 3));
      } else {
        diskWarehouse.add(put(box(3.0, 2.4, 2.8, C.woodDark), cx, sy + 1.3, 3));
      }
    }
  }

  diskWarehouse.position.set(49, 0, -36);
  backRowG.add(diskWarehouse);

  // --- F. Ad Pavilion / Рекламный пост (Placed between Postilka Tower and Calendar Tower) ---
  const adPavilion = new THREE.Group();
  adPavilion.name = 'ad_pavilion';
  adPavilion.add(put(box(14, 0.7, 8, C.groundSand), 0, 0.35, 0));
  adPavilion.add(put(box(14, 14, 0.7, C.wallCream), 0, 7, -3.65));
  adPavilion.add(put(box(0.7, 14, 8, C.wallCream), -6.65, 7, 0));

  // "Рекламный пост" sign on pavilion
  const apSign = box(13.5, 2.2, 0.35, C.postilkaNavy, {
    texture: getSignTexture('РЕКЛАМНЫЙ ПОСТ', '#24334f'),
  });
  apSign.position.set(0, 12.8, 3.8);
  adPavilion.add(apSign);

  // Shelves with UGC video cassettes
  for (let r = 0; r < 2; r++) {
    const sy = 5.6 + r * 3.0;
    adPavilion.add(put(box(6.5, 0.4, 2.8, C.woodPlank), -2.6, sy, 2.2));
    for (let i = 0; i < 3; i++) {
      const col = [C.ytRed, C.telegramSky, C.photoPink][i];
      adPavilion.add(put(box(1.5, 1.6, 0.4, col), -4.0 + i * 1.6, sy + 0.9, 2.8));
    }
  }

  // Wooden Mannequin figure holding product box
  const mannequin = new THREE.Group();
  mannequin.add(put(box(1.2, 3.8, 1.2, C.skinLight), 0, 1.9, 0));
  mannequin.add(put(box(1.4, 1.4, 1.4, C.skinLight), 0, 4.2, 0));
  mannequin.add(put(box(1.2, 0.8, 1.0, C.clockYellow), 0, 2.4, 1.0)); // holding product
  mannequin.position.set(3.4, 0, 2.8);
  adPavilion.add(mannequin);

  // Billboard stand (указатель) placed prominently facing straight forward toward camera (+Z)
  const billboardStand = new THREE.Group();
  billboardStand.add(put(box(0.6, 7.8, 0.6, C.woodDark), 0, 3.9, 0)); // stand pole
  const adBoard = box(8.8, 5.2, 0.45, C.white, {
    unique: true,
    texture: getAdBillboardTexture(),
  });
  adBoard.position.set(0, 7.4, 0.25);
  billboardStand.add(adBoard);
  billboardStand.position.set(7.5, 0, 6.2);
  adPavilion.add(billboardStand);

  // Position between Postilka Tower (x: -13, z: -40) and Calendar Tower (x: 29, z: -38)
  adPavilion.position.set(7.5, 0, -38);
  backRowG.add(adPavilion);

  // --- Coffee Station between Postilka Tower and Рекламный пост ---
  const coffeeStation = new THREE.Group();
  coffeeStation.name = 'coffee_station';

  // Wooden cabinet / тумба
  coffeeStation.add(put(box(4.8, 4.2, 3.6, C.woodDark), 0, 2.1, 0));
  coffeeStation.add(put(box(5.2, 0.4, 4.0, C.woodPlank), 0, 4.4, 0)); // countertop

  // "КОФЕ" signboard on front of the cabinet
  const coffeeSign = box(4.2, 2.0, 0.25, C.woodDark, {
    unique: true,
    texture: getCoffeeSignTexture(),
  });
  coffeeSign.position.set(0, 2.2, 1.95);
  coffeeStation.add(coffeeSign);

  // Voxel Espresso Coffee Machine on countertop
  const coffeeMachine = new THREE.Group();
  // Machine body (red & metallic)
  coffeeMachine.add(put(box(2.8, 3.2, 2.4, C.clockRed), 0, 1.6, 0));
  coffeeMachine.add(put(box(2.9, 0.4, 2.5, C.metalGrey), 0, 3.4, 0));
  // Coffee bean hopper on top (transparent dark glass with brown coffee beans inside)
  coffeeMachine.add(put(box(1.4, 1.2, 1.4, C.postilkaDark), 0, 4.2, 0));
  // Dispenser spout & drip tray
  coffeeMachine.add(put(box(2.4, 0.3, 1.2, C.metalGrey), 0, 0.15, 1.0));
  coffeeMachine.add(put(box(0.6, 0.8, 0.6, C.metalDark), 0, 2.2, 1.0)); // portafilter spout
  // 2 Tiny Coffee Cups on drip tray
  coffeeMachine.add(put(box(0.5, 0.6, 0.5, C.white), -0.6, 0.6, 1.0));
  coffeeMachine.add(put(box(0.5, 0.6, 0.5, C.white), 0.6, 0.6, 1.0));
  // Machine gauges / steam knob
  coffeeMachine.add(put(box(0.4, 0.4, 0.2, C.clockYellow), 0.9, 2.8, 1.25));

  coffeeMachine.position.set(0, 4.6, 0);
  coffeeStation.add(coffeeMachine);

  // Positioned exactly between Postilka Tower (x: -13) and Рекламный пост (x: 7.5)
  coffeeStation.position.set(-2.8, 0, -37);
  backRowG.add(coffeeStation);

  city.add(backRowG);

  // ==========================================
  // 4. SIX DISTRICTS (Front & Sides)
  // ==========================================
  const districtsG = new THREE.Group();

  // --- 1. TELEGRAM DISTRICT (Top-Left Hero District) ---
  const tgDistrict = new THREE.Group();
  tgDistrict.name = 'district_telegram';

  // Open hero display room.
  tgDistrict.add(put(box(14, 0.7, 14, C.telegramSky), 0, 0.35, 0));
  tgDistrict.add(put(box(14, 15, 0.7, C.telegramSky), 0, 7.5, -6.65));
  tgDistrict.add(put(box(0.7, 15, 14, C.telegramSky), -6.65, 7.5, 0));

  // Telegram logo plaque on front wall
  const tgWallLogo = box(3.2, 3.2, 0.3, C.telegramSky, {
    texture: getTelegramLogoTexture(),
  });
  tgWallLogo.position.set(2.5, 11, 7.2);
  tgDistrict.add(tgWallLogo);

  // Mini-conveyor belt with Telegram channel post cards (text + image preview + reactions)
  tgDistrict.add(put(box(13, 0.45, 3.8, C.metalDark), 0, 3.5, 8.5));
  // Conveyor guide rails
  tgDistrict.add(put(box(13, 0.3, 0.2, C.metalGrey), 0, 3.85, 6.7));
  tgDistrict.add(put(box(13, 0.3, 0.2, C.metalGrey), 0, 3.85, 10.3));

  const tgPostCards = [];
  for (let i = 0; i < 3; i++) {
    const cardMesh = new THREE.Group();
    // Card base
    cardMesh.add(put(box(3.2, 0.15, 2.4, C.white), 0, 0.08, 0));
    // Card printed surface
    const cardTop = box(3.1, 0.04, 2.3, C.white, {
      unique: true,
      texture: getTelegramPostCardTexture(i),
    });
    cardTop.position.set(0, 0.18, 0);
    cardMesh.add(cardTop);

    cardMesh.position.set(-3.8 + i * 3.8, 3.75, 8.5);
    tgDistrict.add(cardMesh);
    tgPostCards.push(cardMesh);
  }

  // Button rack on the left (4x3 colorful glowing button grid)
  const buttonRack = new THREE.Group();
  buttonRack.add(put(box(6.5, 8.5, 1.2, C.white), 0, 4.25, 0));
  const rackColors = [
    C.ytRed, C.telegramSky, C.photoPink, C.screenGreen,
    C.clockYellow, C.vkBlue, C.photoCoralDk, C.clockRed,
    C.screenGreen, C.maxTeal, C.clockYellow, C.telegramSky,
  ];
  for (let r = 0; r < 4; r++) {
    for (let c = 0; c < 3; c++) {
      const bCol = rackColors[r * 3 + c];
      const btn = box(1.2, 1.2, 0.4, bCol, {
        emissive: bCol,
        ei: 0.5,
      });
      btn.position.set(-1.8 + c * 1.8, 1.8 + r * 1.8, 0.7);
      buttonRack.add(btn);
    }
  }
  buttonRack.position.set(-7.5, 0, 7.5);
  tgDistrict.add(buttonRack);

  const tgLabel = box(12, 1.5, 0.35, C.telegramDk, {
    texture: getSignTexture('HERO TELEGRAM', '#3888c7'),
  });
  tgLabel.position.set(0, 1.2, 7.25);
  tgDistrict.add(tgLabel);

  tgDistrict.position.set(-47, 5, 8);
  tgDistrict.scale.setScalar(1.12);
  districtsG.add(tgDistrict);

  movers.push({
    fn: (t, dt) => {
      if (movers.reduced) return;
      for (let i = 0; i < tgPostCards.length; i++) {
        tgPostCards[i].position.x += 1.6 * dt;
        if (tgPostCards[i].position.x > 5.5) {
          tgPostCards[i].position.x = -5.5;
        }
      }
    },
  });

  // --- 2. VK DISTRICT (Front-Left) ---
  const vkDistrict = new THREE.Group();
  vkDistrict.name = 'district_vk';

  // 3D VK Speech Bubble Landmark
  const vkBubble = new THREE.Group();
  vkBubble.add(put(box(10, 8, 3, C.vkBlue), 0, 4, 0));
  vkBubble.add(put(box(3, 3, 3, C.vkBlue), -2.5, 1.2, 0, 0, 0, 0.6)); // speech bubble tail

  // White 'VK' logo plaque on speech bubble
  const vkLogo = box(7, 6, 0.4, C.vkBlue, { texture: getVKLogoTexture() });
  vkLogo.position.set(0, 4.2, 1.6);
  vkBubble.add(vkLogo);

  vkBubble.position.set(0, 0, 0);
  vkDistrict.add(vkBubble);

  const vkParcel = parcel(1.4, 1.0, 1.2);
  vkParcel.position.set(-0.5, 0.6, 5);
  vkDistrict.add(vkParcel);

  const vkLabel = box(8, 1.35, 0.3, C.vkBlueDk, {
    texture: getSignTexture('VK', '#345b87'),
  });
  vkLabel.position.set(0, 0.9, 2.2);
  vkDistrict.add(vkLabel);

  vkDistrict.position.set(-29, 0, 20);
  vkDistrict.scale.setScalar(1.28);
  districtsG.add(vkDistrict);

  // --- 3. YOUTUBE SHORTS DISTRICT (Front-Center-Left) ---
  const ytDistrict = new THREE.Group();
  ytDistrict.name = 'district_youtube';

  const platformW = 18;
  const platformH = 3.2;
  const platformD = 18;

  ytDistrict.add(put(box(platformW, platformH, platformD, C.ytRed), 0, platformH / 2, 0));

  // White "YouTube Shorts" text label on the front top surface of the platform
  const ytFloorMat = new THREE.MeshBasicMaterial({
    map: getYouTubeFloorTexture(),
    transparent: true,
    depthWrite: false,
  });
  const ytFloorLabel = new THREE.Mesh(new THREE.PlaneGeometry(15.4, 3.85), ytFloorMat);
  ytFloorLabel.rotation.x = -Math.PI / 2;
  ytFloorLabel.rotation.z = -0.72;
  ytFloorLabel.position.set(-1.2, platformH + 0.04, 3.6);
  ytFloorLabel.renderOrder = 4;
  ytDistrict.add(ytFloorLabel);

  const phone = buildYtPhone();
  phone.position.set(-3.8, platformH, -3.2);
  phone.rotation.y = 0.06;
  ytDistrict.add(phone);

  const playIcon = buildYtPlayIcon();
  playIcon.position.set(4.4, platformH, -2.4);
  playIcon.rotation.y = -0.04;
  ytDistrict.add(playIcon);

  ytDistrict.position.set(-8, 0, 22);
  ytDistrict.scale.setScalar(1.15);
  districtsG.add(ytDistrict);

  // --- 4. ZEN ARTICLES DISTRICT (Front-Center-Right) ---
  const zenDistrict = new THREE.Group();
  zenDistrict.name = 'district_zen';

  // Wooden desk
  zenDistrict.add(put(box(8, 0.6, 4, C.woodPlank), 0, 2.5, 0));
  zenDistrict.add(put(box(0.5, 2.5, 0.5, C.woodLeg), -3.5, 1.25, -1.5));
  zenDistrict.add(put(box(0.5, 2.5, 0.5, C.woodLeg), 3.5, 1.25, -1.5));
  zenDistrict.add(put(box(0.5, 2.5, 0.5, C.woodLeg), -3.5, 1.25, 1.5));
  zenDistrict.add(put(box(0.5, 2.5, 0.5, C.woodLeg), 3.5, 1.25, 1.5));

  // Giant Rolled Paper Scroll of Articles
  const scroll = new THREE.Group();
  const scrollSheet = box(6.5, 9.0, 0.2, C.white, {
    texture: getArticleScrollTexture(),
  });
  scrollSheet.position.set(0, 4.5, 0);
  scroll.add(scrollSheet);
  // Rolled scroll cylinder on top
  scroll.add(put(box(7.0, 1.0, 1.0, C.white), 0, 9.2, 0));
  scroll.position.set(0, 2.8, -1.5);
  zenDistrict.add(scroll);

  // Stacks of books and newspapers
  zenDistrict.add(put(box(2.2, 1.2, 1.8, C.white), -2.2, 0.6, 4));
  zenDistrict.add(put(box(1.8, 0.8, 1.5, C.zenSand), 3.2, 0.4, 4));

  // Big 2x larger "ДЗЕН" signboard with wooden support legs
  const zenLabel = new THREE.Group();
  zenLabel.add(put(box(0.45, 2.0, 0.45, C.woodLeg), -4.5, 1.0, 0));
  zenLabel.add(put(box(0.45, 2.0, 0.45, C.woodLeg), 4.5, 1.0, 0));
  zenLabel.add(
    put(
      box(11.5, 2.7, 0.45, C.zenWood, {
        unique: true,
        texture: getZenSignTexture(),
      }),
      0,
      2.0,
      0.08
    )
  );
  zenLabel.position.set(0, 0, 5.4);
  zenDistrict.add(zenLabel);

  zenDistrict.position.set(12, 0, 22);
  zenDistrict.scale.setScalar(1.2);
  districtsG.add(zenDistrict);

  // --- 5. PHOTOCHKA DISTRICT (Front-Right) ---
  const photoDistrict = new THREE.Group();
  photoDistrict.name = 'district_photochka';

  // Coral/pink open display room (floor, rear wall, left wall)
  photoDistrict.add(put(box(18, 0.7, 18, C.photoPink), 0, 0.35, 0));
  photoDistrict.add(put(box(18, 14, 0.7, C.photoPink), 0, 7, -8.65));
  photoDistrict.add(put(box(0.7, 14, 18, C.photoPink), -8.65, 7, 0));

  // 1. Giant Center Polaroid Photo on rear wall
  const polaroid = new THREE.Group();
  polaroid.add(put(box(9.4, 11.4, 0.5, C.white), 0, 5.7, 0)); // outer white polaroid frame
  polaroid.add(
    put(
      box(7.6, 7.6, 0.2, C.white, {
        unique: true,
        texture: getPolaroidMainPhotoTexture(),
      }),
      0,
      7.0,
      0.3
    )
  );
  // Red 3D heart icon badge on the polaroid frame
  polaroid.add(put(box(1.3, 1.3, 0.4, C.clockRed, { emissive: C.clockRed, ei: 0.3 }), 3.4, 10.5, 0.45));
  polaroid.position.set(0.5, 2.5, -8.15);
  photoDistrict.add(polaroid);

  // 2. Voxel portrait & Reel post on rear wall (left and right of giant Polaroid)
  const rearBoyFrame = new THREE.Group();
  rearBoyFrame.add(put(box(4.0, 4.0, 0.4, C.white), 0, 0, 0));
  rearBoyFrame.add(
    put(box(3.4, 3.4, 0.2, C.white, { unique: true, texture: getPortraitBoyTexture() }), 0, 0, 0.25)
  );
  rearBoyFrame.position.set(-5.8, 9.2, -8.2);
  photoDistrict.add(rearBoyFrame);

  const rearReelFrame = new THREE.Group();
  rearReelFrame.add(put(box(3.4, 4.4, 0.4, C.metalDark), 0, 0, 0));
  rearReelFrame.add(
    put(box(2.8, 3.8, 0.2, C.white, { unique: true, texture: getPortraitVideoTexture() }), 0, 0, 0.25)
  );
  rearReelFrame.position.set(6.4, 9.0, -8.2);
  photoDistrict.add(rearReelFrame);

  // 3. Voxel portraits & Social speech bubble on left wall (facing +X)
  const leftGirlFrame = new THREE.Group();
  leftGirlFrame.add(put(box(4.0, 4.0, 0.4, C.white), 0, 0, 0));
  leftGirlFrame.add(
    put(box(3.4, 3.4, 0.2, C.white, { unique: true, texture: getPortraitGirlTexture() }), 0, 0, 0.25)
  );
  leftGirlFrame.position.set(-8.2, 9.2, -3.2);
  leftGirlFrame.rotation.y = Math.PI / 2;
  photoDistrict.add(leftGirlFrame);

  const leftVideoFrame = new THREE.Group();
  leftVideoFrame.add(put(box(3.4, 4.4, 0.4, C.metalDark), 0, 0, 0));
  leftVideoFrame.add(
    put(box(2.8, 3.8, 0.2, C.white, { unique: true, texture: getPortraitVideoTexture() }), 0, 0, 0.25)
  );
  leftVideoFrame.position.set(-8.2, 9.0, 3.6);
  leftVideoFrame.rotation.y = Math.PI / 2;
  photoDistrict.add(leftVideoFrame);

  // 3D Speech Bubble with Heart on left wall
  const leftHeartBubble = new THREE.Group();
  leftHeartBubble.add(put(box(3.2, 2.2, 0.35, C.white), 0, 0, 0));
  leftHeartBubble.add(put(box(0.5, 0.5, 0.35, C.white), -1.0, -1.2, 0));
  leftHeartBubble.add(put(box(1.3, 1.3, 0.3, C.clockRed, { emissive: C.clockRed, ei: 0.3 }), 0, 0, 0.25));
  leftHeartBubble.position.set(-8.2, 4.2, 0.2);
  leftHeartBubble.rotation.y = Math.PI / 2;
  photoDistrict.add(leftHeartBubble);

  // 4. Social content creation setup (Ring light + smartphone on tripod)
  const ringLightG = new THREE.Group();
  ringLightG.add(put(box(0.3, 5.0, 0.3, C.black), 0, 2.5, 0)); // tripod stand
  ringLightG.add(put(box(0.8, 0.2, 0.8, C.black), 0, 0.1, 0));
  // White glowing ring light
  ringLightG.add(
    put(
      box(2.2, 2.2, 0.25, C.white, { unique: true, emissive: C.white, ei: 0.95 }),
      0,
      5.6,
      0
    )
  );
  ringLightG.add(put(box(1.2, 1.2, 0.35, C.photoPink), 0, 5.6, 0)); // hollow center
  // Mounted smartphone with glowing red REC light
  ringLightG.add(put(box(0.85, 1.45, 0.18, C.black), 0, 5.6, 0.15));
  ringLightG.add(
    put(box(0.2, 0.2, 0.1, C.clockRed, { emissive: C.clockRed, ei: 1.0 }), 0.25, 6.1, 0.26)
  );
  ringLightG.position.set(5.8, 0.35, 4.6);
  ringLightG.rotation.y = -0.5;
  photoDistrict.add(ringLightG);

  // 5. Large prominent PHOTOCHKA Marquee Sign on front edge
  const photoLabel = new THREE.Group();
  // Support legs
  photoLabel.add(put(box(0.6, 2.5, 0.6, C.postilkaDark), -6.2, 1.25, 0));
  photoLabel.add(put(box(0.6, 2.5, 0.6, C.postilkaDark), 6.2, 1.25, 0));
  // Big Signboard
  photoLabel.add(
    put(
      box(16.8, 3.8, 0.6, C.photoCoralDk, {
        unique: true,
        texture: getPhotochkaSignTexture(),
      }),
      0,
      2.8,
      0.1
    )
  );
  photoLabel.position.set(0, 0.35, 8.85);
  photoDistrict.add(photoLabel);

  photoDistrict.position.set(31, 0, 21);
  districtsG.add(photoDistrict);

  // --- 6. MAX DISTRICT (Far-Right) ---
  const maxDistrict = new THREE.Group();
  maxDistrict.name = 'district_max';

  // Pale-lavender open diorama box: raised floor, back wall and right wall (flush on top of main platform)
  maxDistrict.add(put(box(16, 0.8, 16, C.maxRoom), 0, 0.4, 0));
  maxDistrict.add(put(box(16, 11, 0.8, C.maxRoom), 0, 5.5, -7.6));
  maxDistrict.add(put(box(0.8, 11, 16, C.maxRoom), 7.6, 5.5, 0));
  maxDistrict.add(put(box(16.8, 0.65, 1.2, C.maxRoomEdge), 0, 11.1, -7.6));
  maxDistrict.add(put(box(1.2, 0.65, 16.8, C.maxRoomEdge), 7.6, 11.1, 0));

  // Giant extruded message bubble attached to the rear wall.
  const maxBubble = new THREE.Group();
  maxBubble.add(put(box(12.8, 6.2, 1.0, 0xfffcf0), -1.1, 6.5, -6.65));
  maxBubble.add(put(box(1.7, 2.4, 1.0, 0xfffcf0), -6.65, 3.5, -6.65));
  for (const dotX of [-4.2, -1.1, 2.0]) {
    maxBubble.add(
      put(
        box(1.25, 1.25, 0.45, C.maxDot, {
          emissive: C.maxDot,
          ei: 0.12,
        }),
        dotX,
        6.4,
        -6.0
      )
    );
  }
  maxDistrict.add(maxBubble);

  // Detailed MAX bot: articulated legs, torso display, head display and antenna.
  const maxBot = new THREE.Group();
  // Feet and segmented legs.
  maxBot.add(put(box(1.45, 0.55, 1.9, C.maxRobotLight), -1.15, 0.3, 0.35));
  maxBot.add(put(box(1.45, 0.55, 1.9, C.maxRobotLight), 1.15, 0.3, 0.35));
  maxBot.add(put(box(0.65, 2.2, 0.7, C.maxRobot), -1.05, 1.55, 0));
  maxBot.add(put(box(0.65, 2.2, 0.7, C.maxRobot), 1.05, 1.55, 0));
  maxBot.add(put(box(2.8, 0.55, 1.2, C.maxRobotLight), 0, 2.8, 0));

  // Torso with luminous lower display.
  maxBot.add(put(box(3.6, 3.2, 2.4, C.maxRobot), 0, 4.35, 0));
  maxBot.add(put(box(2.55, 1.45, 0.25, C.black), 0, 4.2, 1.32));
  maxBot.add(
    put(
      box(2.05, 0.95, 0.18, 0x73e885, {
        emissive: 0x73e885,
        ei: 0.75,
      }),
      0,
      4.2,
      1.5
    )
  );
  maxBot.add(put(box(1.4, 0.18, 0.12, 0xd7ffe0), 0, 4.2, 1.62));

  // Neck and square head.
  maxBot.add(put(box(0.8, 0.65, 0.8, C.maxRobotLight), 0, 6.25, 0));
  maxBot.add(put(box(3.2, 2.8, 2.55, C.maxRobot), 0, 7.85, 0));
  maxBot.add(put(box(2.5, 1.35, 0.25, C.black), 0, 7.85, 1.4));
  maxBot.add(
    put(
      box(2.05, 0.9, 0.18, 0x54e871, {
        emissive: 0x54e871,
        ei: 0.9,
      }),
      0,
      7.85,
      1.56
    )
  );
  // Pixel eyes.
  maxBot.add(put(box(0.34, 0.32, 0.12, C.white), -0.55, 7.85, 1.68));
  maxBot.add(put(box(0.34, 0.32, 0.12, C.white), 0.55, 7.85, 1.68));

  // Antenna mast and ball.
  maxBot.add(put(box(0.18, 1.2, 0.18, C.metalDark), 0, 9.8, 0));
  maxBot.add(put(box(0.55, 0.55, 0.55, C.maxRobotLight), 0, 10.55, 0));

  // Segmented arms, shoulder blocks and simple grippers.
  for (const side of [-1, 1]) {
    maxBot.add(put(box(1.0, 1.25, 1.25, C.maxRobotLight), side * 2.25, 5.2, 0));
    maxBot.add(put(box(0.65, 2.4, 0.75, C.maxRobot), side * 2.25, 3.75, 0));
    maxBot.add(put(box(0.75, 0.65, 1.0, C.maxRobotLight), side * 2.25, 2.35, 0.25));
  }
  maxBot.position.set(3.6, 0.75, 1.8);
  maxBot.rotation.y = -0.16;
  maxBot.scale.setScalar(1.08);
  maxDistrict.add(maxBot);

  // Black italic MAX wordmark printed directly on the floor.
  const maxLabelMaterial = new THREE.MeshBasicMaterial({
    map: getMaxFloorTexture(),
    transparent: true,
    depthWrite: false,
  });
  const maxLabel = new THREE.Mesh(new THREE.PlaneGeometry(7.2, 2.7), maxLabelMaterial);
  maxLabel.rotation.x = -Math.PI / 2;
  maxLabel.rotation.z = -0.15;
  maxLabel.position.set(0, 0.83, 5.7);
  maxLabel.renderOrder = 4;
  maxDistrict.add(maxLabel);

  maxDistrict.position.set(46.5, 0, -5);
  maxDistrict.scale.setScalar(1.0);
  districtsG.add(maxDistrict);

  city.add(districtsG);

  // ==========================================
  // 5. WINDING RAILWAY & MOVING CARTS
  // ==========================================
  function getTrackDistance(waypoints) {
    let total = 0;
    const segs = [];
    for (let i = 0; i < waypoints.length - 1; i++) {
      const p1 = waypoints[i];
      const p2 = waypoints[i + 1];
      const dx = p2.x - p1.x;
      const dz = p2.z - p1.z;
      const len = Math.hypot(dx, dz);
      segs.push({ p1, p2, dx, dz, len, startDist: total });
      total += len;
    }
    return { total, segs };
  }

  function sampleTrack(trackInfo, u) {
    const targetDist = Math.max(0, Math.min(1, u)) * trackInfo.total;
    let seg = trackInfo.segs[trackInfo.segs.length - 1];
    for (let i = 0; i < trackInfo.segs.length; i++) {
      const s = trackInfo.segs[i];
      if (targetDist <= s.startDist + s.len || i === trackInfo.segs.length - 1) {
        seg = s;
        break;
      }
    }
    const segU = seg.len > 0 ? (targetDist - seg.startDist) / seg.len : 0;
    const x = seg.p1.x + seg.dx * segU;
    const z = seg.p1.z + seg.dz * segU;
    const angle = Math.atan2(seg.dx, seg.dz);
    return { x, z, angle };
  }

  const tracks = [
    // 1. To VK District
    {
      id: 'vk',
      waypoints: [
        { x: 24, z: -14 },
        { x: -29, z: -1 },
        { x: -29, z: 13 },
      ],
    },
    // 2. To YouTube Shorts
    {
      id: 'youtube',
      waypoints: [
        { x: 24, z: -14 },
        { x: 2, z: 1 },
        { x: -8, z: 12 },
      ],
    },
    // 3. To Zen Articles
    {
      id: 'zen',
      waypoints: [
        { x: 24, z: -14 },
        { x: 15, z: 2 },
        { x: 12, z: 15 },
      ],
    },
    // 4. To Photochka
    {
      id: 'photo',
      waypoints: [
        { x: 24, z: -14 },
        { x: 31, z: 2 },
        { x: 31, z: 14 },
      ],
    },
    // 5. To MAX
    {
      id: 'max',
      waypoints: [
        { x: 24, z: -14 },
        { x: 44, z: -7 },
      ],
    },
  ];

  const railsG = new THREE.Group();
  tracks.forEach((track) => {
    track.info = getTrackDistance(track.waypoints);
    for (let i = 0; i < track.waypoints.length - 1; i++) {
      const p1 = track.waypoints[i];
      const p2 = track.waypoints[i + 1];
      railsG.add(makeRail(p1.x, p1.z, p2.x, p2.z, 0.35));
    }
  });
  city.add(railsG);

  // Moving rail carts strictly traversing along rails
  const carts = [];
  tracks.forEach((track, i) => {
    const cart = new THREE.Group();
    // Metal wagon base (length 2.8 along track Z, width 2.2 across rails X)
    cart.add(put(box(2.2, 0.5, 2.8, C.metalDark), 0, 0.6, 0));
    cart.add(put(box(0.45, 0.45, 0.45, C.black), -0.75, 0.3, -0.9));
    cart.add(put(box(0.45, 0.45, 0.45, C.black), 0.75, 0.3, -0.9));
    cart.add(put(box(0.45, 0.45, 0.45, C.black), -0.75, 0.3, 0.9));
    cart.add(put(box(0.45, 0.45, 0.45, C.black), 0.75, 0.3, 0.9));

    // Parcel loaded on cart
    const p = parcel(1.6, 1.2, 1.4);
    p.position.set(0, 1.4, 0);
    cart.add(p);

    cart.userData = {
      track: track.info,
      progress: (i * 0.22) % 1,
      speed: 0.075 + (i % 3) * 0.015,
    };
    city.add(cart);
    carts.push(cart);
  });

  movers.push({
    fn: (_t, dt) => {
      if (movers.reduced) return;
      for (const c of carts) {
        c.userData.progress = (c.userData.progress + dt * c.userData.speed) % 1;
        const u = c.userData.progress;
        const sample = sampleTrack(c.userData.track, u);
        c.position.x = sample.x;
        c.position.z = sample.z;
        c.position.y = 0.4;
        c.rotation.y = sample.angle;
      }
    },
  });

  // --- Haruni Bus Movement along the 3 outer sides between Depots and Stops ---
  function getWaypointDist(targetX, targetZ) {
    let bestDist = 0;
    let minD2 = Infinity;
    let running = 0;
    for (let i = 0; i < busWaypoints.length; i++) {
      const wp = busWaypoints[i];
      const d2 = (wp.x - targetX) ** 2 + (wp.z - targetZ) ** 2;
      if (d2 < minD2) {
        minD2 = d2;
        bestDist = running;
      }
      if (i < busTrackInfo.segs.length) {
        running += busTrackInfo.segs[i].len;
      }
    }
    return bestDist;
  }

  const busStops = [
    { name: 'depot1', dist: 0, isDepot: true, title: 'ДЕПО №1' },
    { name: 'telegram', dist: getWaypointDist(-68, 0), isDepot: false, title: 'ТЕЛЕГРАМ' },
    { name: 'center', dist: getWaypointDist(0, 42), isDepot: false, title: 'ПОСТИЛКА' },
    { name: 'max', dist: getWaypointDist(68, -5), isDepot: false, title: 'МАКС БОТ' },
    { name: 'depot2', dist: busTrackInfo.total, isDepot: true, title: 'ДЕПО №2' },
  ];

  let currentStopIdx = 2; // Start at Center stop (front of camera)
  let busDist = busStops[2].dist;
  let busDir = 1; // +1: toward MAX/Depot 2, -1: toward Telegram/Depot 1
  let targetStopIdx = 3; // Heading toward MAX
  let busState = 'STOPPED'; // 'STOPPED' or 'DRIVING'
  let busStopTimer = 3.0;
  let busCurrentSpeed = 0;
  const busCruiseSpeed = 15.0;

  movers.push({
    fn: (t, dt) => {
      if (movers.reduced) return;

      if (busState === 'STOPPED') {
        busStopTimer -= dt;
        busCurrentSpeed = THREE.MathUtils.lerp(busCurrentSpeed, 0, 0.2);
        haruniBus.userData.currentSpeed = busCurrentSpeed;

        // Idle engine suspension breathing
        haruniBus.userData.body.position.y = Math.sin(t * 12) * 0.035;
        haruniBus.userData.body.rotation.z = 0;

        if (busStopTimer <= 0) {
          busState = 'DRIVING';
        }
      } else if (busState === 'DRIVING') {
        const targetStop = busStops[targetStopIdx];
        const targetDist = targetStop.dist;
        const distToTarget = Math.abs(targetDist - busDist);

        const decelDist = 14.0;
        let desiredSpeed = busCruiseSpeed;
        if (distToTarget < decelDist) {
          desiredSpeed = Math.max(1.8, (distToTarget / decelDist) * busCruiseSpeed);
        }

        busCurrentSpeed = THREE.MathUtils.lerp(busCurrentSpeed, desiredSpeed, 0.12);
        haruniBus.userData.currentSpeed = busCurrentSpeed;
        busDist += busDir * busCurrentSpeed * dt;

        // Spin wheels
        const wheelRotDelta = (busDir * busCurrentSpeed * dt) / 0.98;
        for (const w of haruniBus.userData.wheels) {
          w.rotation.x += wheelRotDelta;
        }

        // Suspension road bounce & turn lean
        haruniBus.userData.body.position.y = Math.sin(t * 14) * 0.06;
        haruniBus.userData.body.rotation.z = Math.sin(t * 7) * 0.015;

        // Check arrival at target stop
        const reached =
          distToTarget <= 0.4 ||
          (busDir > 0 && busDist >= targetDist) ||
          (busDir < 0 && busDist <= targetDist);

        if (reached) {
          busDist = targetDist;
          currentStopIdx = targetStopIdx;
          busState = 'STOPPED';

          if (targetStop.isDepot) {
            // Reached depot interior -> service turnaround pause
            busStopTimer = 3.5;
            if (targetStopIdx === busStops.length - 1) {
              busDir = -1;
              targetStopIdx = busStops.length - 2;
            } else {
              busDir = 1;
              targetStopIdx = 1;
            }
          } else {
            // Passenger stop
            busStopTimer = 3.0;
            targetStopIdx += busDir;
            if (targetStopIdx >= busStops.length) {
              targetStopIdx = busStops.length - 1;
            } else if (targetStopIdx < 0) {
              targetStopIdx = 0;
            }
          }
        }
      }

      // Update bus 3D transformation
      const u = Math.max(0, Math.min(1, busDist / busTrackInfo.total));
      const sample = sampleTrack(busTrackInfo, u);
      haruniBus.position.x = sample.x;
      haruniBus.position.z = sample.z;
      haruniBus.position.y = -5.47;
      haruniBus.rotation.y = busDir > 0 ? sample.angle : sample.angle + Math.PI;
    },
  });

  // ==========================================
  // 6. ANIMATED WALKING & FALLING CROWD
  // ==========================================
  const crowd = createCrowd(city, { reduced, bus: haruniBus });
  movers.push({
    fn: (t, dt, cam) => crowd.update(t, dt, cam),
  });

  return { city, movers, screens, carts, crowd, journeyActors };
}
