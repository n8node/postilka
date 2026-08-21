import * as THREE from 'three';

/** Cache for canvas-generated textures */
const _textureCache = new Map();

const TEXT_SUPERSAMPLE = 4;
let _maxAnisotropy = 4;

/** Tune text texture quality once the WebGL renderer is ready. */
export function configureTextureQuality({ anisotropy = 4 } = {}) {
  _maxAnisotropy = anisotropy;
  for (const tex of _textureCache.values()) {
    tex.anisotropy = _maxAnisotropy;
  }
}

/** Pixel-art textures: icons, patterns, voxel illustrations (no text smoothing). */
function createPixelCanvas(w, h, drawFn) {
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = false;
  drawFn(ctx, w, h);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.magFilter = THREE.NearestFilter;
  texture.minFilter = THREE.NearestFilter;
  return texture;
}

/** Smooth anti-aliased text textures rendered at higher internal resolution. */
function createTextCanvas(w, h, drawFn, scale = TEXT_SUPERSAMPLE) {
  const canvas = document.createElement('canvas');
  canvas.width = w * scale;
  canvas.height = h * scale;
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.scale(scale, scale);
  drawFn(ctx, w, h);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.magFilter = THREE.LinearFilter;
  texture.minFilter = THREE.LinearFilter;
  texture.anisotropy = _maxAnisotropy;
  return texture;
}

/** 1. POSTILKA Marquee Sign */
export function getPostilkaSignTexture() {
  if (_textureCache.has('postilka_sign')) return _textureCache.get('postilka_sign');
  const tex = createTextCanvas(256, 64, (ctx, w, h) => {
    // Dark blue metallic border
    ctx.fillStyle = '#2b3b5c';
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#1c263c';
    ctx.fillRect(4, 4, w - 8, h - 8);

    // Voxel-style 3D block letters "POSTILKA"
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 36px "JetBrains Mono", monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('POSTILKA', w / 2, h / 2 + 2);

    // Inner bevel
    ctx.strokeStyle = '#4a628a';
    ctx.lineWidth = 2;
    ctx.strokeRect(6, 6, w - 12, h - 12);
  });
  _textureCache.set('postilka_sign', tex);
  return tex;
}

/** 2. Sign label headers (e.g., "CALENDAR TOWER", "MEDIA STUDIO", "SKETCH BOOTH", etc.) */
export function getSignTexture(text, bgColor = '#324263', textColor = '#ffffff') {
  const key = `sign_${text}_${bgColor}`;
  if (_textureCache.has(key)) return _textureCache.get(key);
  const tex = createTextCanvas(256, 48, (ctx, w, h) => {
    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(2, 2, w - 4, 2); // top highlight

    ctx.fillStyle = textColor;
    ctx.font = 'bold 22px "JetBrains Mono", monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.letterSpacing = '2px';
    ctx.fillText(text, w / 2, h / 2 + 1);
  });
  _textureCache.set(key, tex);
  return tex;
}

/** 3. Telegram paper plane logo */
export function getTelegramLogoTexture() {
  if (_textureCache.has('telegram_logo')) return _textureCache.get('telegram_logo');
  const tex = createPixelCanvas(128, 128, (ctx, w, h) => {
    ctx.fillStyle = '#4ea4e4';
    ctx.fillRect(0, 0, w, h);

    // Paper airplane
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.moveTo(w * 0.2, h * 0.52);
    ctx.lineTo(w * 0.82, h * 0.22);
    ctx.lineTo(w * 0.65, h * 0.8);
    ctx.lineTo(w * 0.48, h * 0.62);
    ctx.lineTo(w * 0.42, h * 0.74);
    ctx.lineTo(w * 0.38, h * 0.58);
    ctx.closePath();
    ctx.fill();

    // Fold shadow
    ctx.fillStyle = '#d2e9fa';
    ctx.beginPath();
    ctx.moveTo(w * 0.48, h * 0.62);
    ctx.lineTo(w * 0.82, h * 0.22);
    ctx.lineTo(w * 0.42, h * 0.74);
    ctx.closePath();
    ctx.fill();
  });
  _textureCache.set('telegram_logo', tex);
  return tex;
}

/** 4. VK Speech Bubble Logo */
export function getVKLogoTexture() {
  if (_textureCache.has('vk_logo')) return _textureCache.get('vk_logo');
  const tex = createTextCanvas(128, 128, (ctx, w, h) => {
    ctx.fillStyle = '#4473a8';
    ctx.fillRect(0, 0, w, h);

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 74px "Baloo 2", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('VK', w / 2, h / 2 + 6);
  });
  _textureCache.set('vk_logo', tex);
  return tex;
}

/** 5. YouTube Shorts vertical smartphone screen */
export function getYouTubeScreenTexture() {
  if (_textureCache.has('youtube_screen')) return _textureCache.get('youtube_screen');
  const tex = createPixelCanvas(128, 220, (ctx, w, h) => {
    // Dark phone screen
    ctx.fillStyle = '#1c1c1f';
    ctx.fillRect(0, 0, w, h);

    // Red banner/player card in middle
    ctx.fillStyle = '#e62117';
    ctx.roundRect ? ctx.roundRect(14, 40, w - 28, 90, 8) : ctx.fillRect(14, 40, w - 28, 90);
    ctx.fill();

    // White play ▶ icon
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.moveTo(w / 2 - 12, 40 + 28);
    ctx.lineTo(w / 2 + 16, 40 + 45);
    ctx.lineTo(w / 2 - 12, 40 + 62);
    ctx.closePath();
    ctx.fill();

    // Simulated UI bars
    ctx.fillStyle = '#555560';
    ctx.fillRect(16, 145, w - 32, 6);
    ctx.fillRect(16, 158, w - 48, 6);
    ctx.fillStyle = '#e62117';
    ctx.fillRect(16, 180, w - 32, 4); // red timeline
  });
  _textureCache.set('youtube_screen', tex);
  return tex;
}

/** 6. Calendar month grid texture */
export function getCalendarGridTexture() {
  if (_textureCache.has('calendar_grid')) return _textureCache.get('calendar_grid');
  const tex = createPixelCanvas(200, 200, (ctx, w, h) => {
    ctx.fillStyle = '#fbf8f2';
    ctx.fillRect(0, 0, w, h);

    const cols = 5;
    const rows = 5;
    const pad = 10;
    const cellW = (w - pad * 2) / cols;
    const cellH = (h - pad * 2) / rows;

    const colors = [
      '#4ea4e4', '#4473a8', '#e62117', '#ffaa33', '#f46b86',
      '#6cd18d', '#a262e8', '#e62117', '#4ea4e4', '#ffaa33',
      '#6cd18d', '#f46b86', '#a262e8', '#4473a8', '#6cd18d'
    ];

    let colorIdx = 0;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const x = pad + c * cellW;
        const y = pad + r * cellH;

        ctx.strokeStyle = '#d6cbba';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(x + 2, y + 2, cellW - 4, cellH - 4);

        if ((r + c) % 2 === 0 && colorIdx < colors.length) {
          ctx.fillStyle = colors[colorIdx++];
          ctx.fillRect(x + 5, y + 5, cellW - 10, cellH - 10);
        }
      }
    }
  });
  _textureCache.set('calendar_grid', tex);
  return tex;
}

/** 7. Media Studio triple gauge meters */
export function getGaugesTexture() {
  if (_textureCache.has('gauges')) return _textureCache.get('gauges');
  const tex = createPixelCanvas(192, 48, (ctx, w, h) => {
    ctx.fillStyle = '#26344d';
    ctx.fillRect(0, 0, w, h);

    const gaugeColors = ['#f5c842', '#38d948', '#e64949'];
    for (let i = 0; i < 3; i++) {
      const cx = 32 + i * 64;
      const cy = 26;
      const r = 18;

      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(cx, cy, r, Math.PI, 0);
      ctx.closePath();
      ctx.fill();

      // Colored arc
      ctx.strokeStyle = gaugeColors[i];
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(cx, cy, r - 3, Math.PI, 0);
      ctx.stroke();

      // Needle
      ctx.strokeStyle = '#1a1a2e';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      const angle = Math.PI + 0.5 + i * 0.8;
      ctx.lineTo(cx + Math.cos(angle) * (r - 4), cy + Math.sin(angle) * (r - 4));
      ctx.stroke();
    }
  });
  _textureCache.set('gauges', tex);
  return tex;
}

/** 8. Reference -> Ad Clip billboard texture */
export function getAdBillboardTexture() {
  if (_textureCache.has('ad_billboard')) return _textureCache.get('ad_billboard');
  const tex = createTextCanvas(256, 140, (ctx, w, h) => {
    // Crisp white signboard background
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = '#24334f';
    ctx.lineWidth = 5;
    ctx.strokeRect(3, 3, w - 6, h - 6);

    // Left: Reference photo face
    ctx.fillStyle = '#fceade';
    ctx.fillRect(20, 24, 68, 80);
    ctx.fillStyle = '#4a2810';
    ctx.fillRect(24, 28, 60, 24); // hair
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(36, 58, 10, 10); // eyes
    ctx.fillRect(62, 58, 10, 10);
    ctx.fillStyle = '#e11d48';
    ctx.fillRect(44, 82, 20, 6); // smile

    // Red arrow in center ->
    ctx.fillStyle = '#e63946';
    ctx.beginPath();
    ctx.moveTo(102, 64);
    ctx.lineTo(128, 64);
    ctx.lineTo(128, 54);
    ctx.lineTo(148, 70);
    ctx.lineTo(128, 86);
    ctx.lineTo(128, 76);
    ctx.lineTo(102, 76);
    ctx.closePath();
    ctx.fill();

    // Right: Video ad play card
    ctx.fillStyle = '#10b981';
    ctx.fillRect(162, 24, 72, 80);
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.moveTo(188, 48);
    ctx.lineTo(214, 64);
    ctx.lineTo(188, 80);
    ctx.closePath();
    ctx.fill();

    // Bottom badge text "UGC AD -> PROMO"
    ctx.fillStyle = '#24334f';
    ctx.font = 'bold 12px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('UGC ВИДЕО ➔ РЕКЛАМА', w / 2, h - 14);
  });
  _textureCache.set('ad_billboard', tex);
  return tex;
}

/** 9. Zen Article Paper Scroll texture with printed lines */
export function getArticleScrollTexture() {
  if (_textureCache.has('article_scroll')) return _textureCache.get('article_scroll');
  const tex = createPixelCanvas(128, 180, (ctx, w, h) => {
    ctx.fillStyle = '#fdfbf7';
    ctx.fillRect(0, 0, w, h);

    // Title banner
    ctx.fillStyle = '#3a342c';
    ctx.fillRect(14, 18, w - 28, 10);

    // Small article photo
    ctx.fillStyle = '#9cbcd6';
    ctx.fillRect(14, 34, 42, 34);

    // Headline lines
    ctx.fillStyle = '#6e6355';
    ctx.fillRect(62, 36, w - 76, 5);
    ctx.fillRect(62, 46, w - 76, 5);
    ctx.fillRect(62, 56, w - 88, 5);

    // Body paragraphs
    for (let y = 80; y < h - 18; y += 10) {
      const lw = y % 20 === 0 ? w - 44 : w - 28;
      ctx.fillStyle = '#7a6f60';
      ctx.fillRect(14, y, lw, 4);
    }
  });
  _textureCache.set('article_scroll', tex);
  return tex;
}

/** 10. Alarm Clock face texture */
export function getClockFaceTexture() {
  if (_textureCache.has('clock_face')) return _textureCache.get('clock_face');
  const tex = createPixelCanvas(128, 128, (ctx, w, h) => {
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(w / 2, h / 2, w / 2 - 4, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = '#e63946';
    ctx.lineWidth = 6;
    ctx.stroke();

    // Clock hands
    ctx.strokeStyle = '#1e1e24';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(w / 2, h / 2);
    ctx.lineTo(w / 2, h * 0.25); // 12 o'clock
    ctx.moveTo(w / 2, h / 2);
    ctx.lineTo(w * 0.72, h / 2); // 3 o'clock
    ctx.stroke();

    // Center pin
    ctx.fillStyle = '#e63946';
    ctx.beginPath();
    ctx.arc(w / 2, h / 2, 5, 0, Math.PI * 2);
    ctx.fill();
  });
  _textureCache.set('clock_face', tex);
  return tex;
}

/** 11. Typewriter paper sheet with wavy lines */
export function getPaperSheetTexture() {
  if (_textureCache.has('paper_sheet')) return _textureCache.get('paper_sheet');
  const tex = createPixelCanvas(128, 80, (ctx, w, h) => {
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = '#e2dbcc';
    ctx.lineWidth = 2;
    ctx.strokeRect(1, 1, w - 2, h - 2);

    ctx.fillStyle = '#4a5568';
    for (let y = 14; y < h - 10; y += 11) {
      ctx.fillRect(10, y, w - 20, 3);
    }
  });
  _textureCache.set('paper_sheet', tex);
  return tex;
}

/** 12. Green Checkmark [✓] badge */
export function getCheckmarkTexture() {
  if (_textureCache.has('check_badge')) return _textureCache.get('check_badge');
  const tex = createPixelCanvas(96, 96, (ctx, w, h) => {
    ctx.fillStyle = '#38d948';
    ctx.fillRect(0, 0, w, h);

    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 12;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(w * 0.22, h * 0.52);
    ctx.lineTo(w * 0.42, h * 0.74);
    ctx.lineTo(w * 0.78, h * 0.28);
    ctx.stroke();
  });
  _textureCache.set('check_badge', tex);
  return tex;
}

/** YouTube Shorts label on red platform top surface. */
export function getYouTubeFloorTexture() {
  if (_textureCache.has('youtube_floor')) return _textureCache.get('youtube_floor');
  const tex = createTextCanvas(512, 128, (ctx, w, h) => {
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 58px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('YouTube Shorts', w / 2, h / 2);
  });
  _textureCache.set('youtube_floor', tex);
  return tex;
}

/** White play triangle with stepped voxel edges for YouTube play-button block. */
export function getYouTubePlayTriangleTexture() {
  if (_textureCache.has('youtube_play_tri')) return _textureCache.get('youtube_play_tri');
  const tex = createPixelCanvas(256, 256, (ctx, w, h) => {
    ctx.fillStyle = '#e62117';
    ctx.fillRect(0, 0, w, h);

    const steps = 8;
    const x0 = 74;
    const y0 = 54;
    const triW = 118;
    const triH = 148;
    const halfH = triH / 2;

    // Helper to draw stepped triangle path
    function fillSteppedTri(offsetX, offsetY) {
      ctx.beginPath();
      ctx.moveTo(x0 + offsetX, y0 + offsetY);
      ctx.lineTo(x0 + offsetX, y0 + triH + offsetY);

      // Bottom-to-tip stepped edge
      for (let i = 0; i < steps; i++) {
        const curX = x0 + (i * triW) / steps + offsetX;
        const nextX = x0 + ((i + 1) * triW) / steps + offsetX;
        const curY = y0 + triH - (i * halfH) / steps + offsetY;
        const nextY = y0 + triH - ((i + 1) * halfH) / steps + offsetY;
        ctx.lineTo(curX, curY);
        ctx.lineTo(nextX, curY);
      }

      // Tip-to-top stepped edge
      for (let i = steps - 1; i >= 0; i--) {
        const curX = x0 + ((i + 1) * triW) / steps + offsetX;
        const nextX = x0 + (i * triW) / steps + offsetX;
        const curY = y0 + (i * halfH) / steps + offsetY;
        ctx.lineTo(curX, curY);
        ctx.lineTo(nextX, curY);
      }

      ctx.closePath();
      ctx.fill();
    }

    // Shadow
    ctx.fillStyle = '#b01008';
    fillSteppedTri(6, 7);

    // White foreground
    ctx.fillStyle = '#ffffff';
    fillSteppedTri(0, 0);
  });
  _textureCache.set('youtube_play_tri', tex);
  return tex;
}

/** MAX floor wordmark, matching the black italic label in the reference. */
export function getMaxFloorTexture() {
  if (_textureCache.has('max_floor')) return _textureCache.get('max_floor');
  const tex = createTextCanvas(256, 96, (ctx, w, h) => {
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = '#25202b';
    ctx.font = 'italic 800 58px Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('MAX', w / 2, h / 2 + 4);
  });
  _textureCache.set('max_floor', tex);
  return tex;
}

/** Pre-rendered thought bubbles for characters pondering hard work on the platform. */
export function getThoughtBubbleTexture(phrase) {
  const key = `thought_${phrase}`;
  if (_textureCache.has(key)) return _textureCache.get(key);

  const tex = createTextCanvas(
    512,
    256,
    (ctx, w, h) => {
      ctx.clearRect(0, 0, w, h);

      const bw = 472;
      const bh = 158;
      const bx = (w - bw) / 2;
      const by = 14;
      const br = 32;

      function drawRoundedRect(cx, cy, rw, rh, r) {
        ctx.beginPath();
        ctx.moveTo(cx + r, cy);
        ctx.lineTo(cx + rw - r, cy);
        ctx.quadraticCurveTo(cx + rw, cy, cx + rw, cy + r);
        ctx.lineTo(cx + rw, cy + rh - r);
        ctx.quadraticCurveTo(cx + rw, cy + rh, cx + rw - r, cy + rh);
        ctx.lineTo(cx + r, cy + rh);
        ctx.quadraticCurveTo(cx, cy + rh, cx, cy + rh - r);
        ctx.lineTo(cx, cy + r);
        ctx.quadraticCurveTo(cx, cy, cx + r, cy);
        ctx.closePath();
      }

      function drawBubble(ox, oy, fillCol, strokeCol, strokeWidth) {
        drawRoundedRect(bx + ox, by + oy, bw, bh, br);
        if (fillCol) {
          ctx.fillStyle = fillCol;
          ctx.fill();
        }
        if (strokeCol) {
          ctx.strokeStyle = strokeCol;
          ctx.lineWidth = strokeWidth;
          ctx.stroke();
        }

        const circles = [
          { x: bx + 80 + ox, y: by + bh + 16 + oy, r: 15 },
          { x: bx + 54 + ox, y: by + bh + 40 + oy, r: 10 },
          { x: bx + 34 + ox, y: by + bh + 58 + oy, r: 6 },
        ];
        for (const c of circles) {
          ctx.beginPath();
          ctx.arc(c.x, c.y, c.r, 0, Math.PI * 2);
          if (fillCol) {
            ctx.fillStyle = fillCol;
            ctx.fill();
          }
          if (strokeCol) {
            ctx.strokeStyle = strokeCol;
            ctx.lineWidth = strokeWidth;
            ctx.stroke();
          }
        }
      }

      drawBubble(6, 8, '#241b34', null, 0);
      drawBubble(0, 0, '#ffffff', '#1c1528', 7.0);

      ctx.save();
      ctx.beginPath();
      drawRoundedRect(bx + 7, by + 7, bw - 14, bh / 2 - 6, br - 4);
      ctx.fillStyle = '#f0f5ff';
      ctx.fill();
      ctx.restore();

      ctx.fillStyle = '#181224';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      const lines = phrase.split('\n');
      if (lines.length === 1 && phrase.length > 18) {
        const words = phrase.split(' ');
        const mid = Math.ceil(words.length / 2);
        lines[0] = words.slice(0, mid).join(' ');
        lines[1] = words.slice(mid).join(' ');
      }

      if (lines.length === 1) {
        ctx.font =
          'bold 44px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';
        ctx.fillText(lines[0], w / 2, by + bh / 2 + 2);
      } else {
        ctx.font =
          'bold 36px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';
        const lineHeight = 46;
        const startY = by + bh / 2 - (lines.length - 1) * (lineHeight / 2) + 2;
        for (let i = 0; i < lines.length; i++) {
          ctx.fillText(lines[i], w / 2, startY + i * lineHeight);
        }
      }
    },
    2
  );

  _textureCache.set(key, tex);
  return tex;
}

/** PHOTOCHKA Big Marquee / Sign Texture */
export function getPhotochkaSignTexture() {
  if (_textureCache.has('photochka_sign')) return _textureCache.get('photochka_sign');
  const tex = createTextCanvas(512, 128, (ctx, w, h) => {
    // Clean solid vibrant coral-pink background (no icons, no clutter)
    ctx.fillStyle = '#ea4c6a';
    ctx.fillRect(0, 0, w, h);

    // Clean white outer border
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 6;
    ctx.strokeRect(5, 5, w - 10, h - 10);

    // Big Bold High-Contrast Typography: "photochka.ru"
    ctx.fillStyle = '#ffffff';
    ctx.font = '900 64px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Montserrat", Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.letterSpacing = '2px';
    ctx.fillText('photochka.ru', w / 2, h / 2 + 2);
  });
  _textureCache.set('photochka_sign', tex);
  return tex;
}

/** Zen District "ДЗЕН" Big Signboard Texture */
export function getZenSignTexture() {
  if (_textureCache.has('zen_sign')) return _textureCache.get('zen_sign');
  const tex = createTextCanvas(512, 128, (ctx, w, h) => {
    // Warm wood plank background
    ctx.fillStyle = '#8f5f30';
    ctx.fillRect(0, 0, w, h);

    // Clean subtle border
    ctx.strokeStyle = '#5a391a';
    ctx.lineWidth = 6;
    ctx.strokeRect(4, 4, w - 8, h - 8);

    // Big bold high-contrast Cyrillic text
    ctx.fillStyle = '#ffffff';
    ctx.font = '900 86px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Montserrat", Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.letterSpacing = '6px';
    ctx.fillText('ДЗЕН', w / 2, h / 2 + 2);
  });
  _textureCache.set('zen_sign', tex);
  return tex;
}

/** Main Giant Polaroid Photo Texture */
export function getPolaroidMainPhotoTexture() {
  if (_textureCache.has('polaroid_main')) return _textureCache.get('polaroid_main');
  const tex = createPixelCanvas(256, 256, (ctx, w, h) => {
    // Background gradient (sunset sky)
    const sky = ctx.createLinearGradient(0, 0, 0, h);
    sky.addColorStop(0, '#ff7e5f');
    sky.addColorStop(0.55, '#feb47b');
    sky.addColorStop(1, '#56b4d3');
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, w, h);

    // Two smiling voxel characters taking a selfie
    // Character 1 (Left - Guy with brown hair & blue shirt)
    ctx.fillStyle = '#3a86ff'; // Shirt
    ctx.fillRect(36, 170, 78, 86);
    ctx.fillStyle = '#ffdfba'; // Neck & Face
    ctx.fillRect(52, 142, 46, 32);
    ctx.fillRect(44, 96, 62, 54);
    ctx.fillStyle = '#5c3a21'; // Hair
    ctx.fillRect(40, 82, 70, 26);
    ctx.fillRect(38, 100, 12, 28);
    ctx.fillStyle = '#222222'; // Eyes & smile
    ctx.fillRect(58, 118, 8, 8);
    ctx.fillRect(82, 118, 8, 8);
    ctx.fillRect(66, 134, 16, 6);

    // Character 2 (Right - Girl with pink hair & smile)
    ctx.fillStyle = '#ff006e'; // Shirt
    ctx.fillRect(138, 160, 82, 96);
    ctx.fillStyle = '#ffe0bd'; // Face
    ctx.fillRect(150, 92, 58, 52);
    ctx.fillStyle = '#f72585'; // Hair
    ctx.fillRect(144, 76, 70, 24);
    ctx.fillRect(140, 94, 12, 44);
    ctx.fillRect(202, 94, 12, 44);
    ctx.fillStyle = '#222222'; // Eyes & smile
    ctx.fillRect(162, 112, 7, 7);
    ctx.fillRect(185, 112, 7, 7);
    ctx.fillRect(170, 128, 14, 5);

    // Selfie camera flash / lens flare overlay
    ctx.fillStyle = 'rgba(255, 255, 255, 0.35)';
    ctx.beginPath();
    ctx.arc(128, 48, 32, 0, Math.PI * 2);
    ctx.fill();

    // Top social bar overlay
    ctx.fillStyle = 'rgba(20, 15, 30, 0.65)';
    ctx.fillRect(0, 0, w, 32);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 15px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('📸 @postilka_friends', 12, 21);

    // Bottom like & comment badge overlay
    ctx.fillStyle = 'rgba(20, 15, 30, 0.75)';
    ctx.fillRect(12, h - 38, 148, 28);
    ctx.fillStyle = '#ff3366';
    ctx.font = 'bold 15px sans-serif';
    ctx.fillText('❤️ 14.8k', 20, h - 19);
    ctx.fillStyle = '#ffffff';
    ctx.fillText('💬 420', 92, h - 19);
  });
  _textureCache.set('polaroid_main', tex);
  return tex;
}

/** Voxel Portrait 1: Boy with headphones selfie */
export function getPortraitBoyTexture() {
  if (_textureCache.has('portrait_boy')) return _textureCache.get('portrait_boy');
  const tex = createPixelCanvas(160, 160, (ctx, w, h) => {
    // Teal background
    ctx.fillStyle = '#2a9d8f';
    ctx.fillRect(0, 0, w, h);

    // Head & face
    ctx.fillStyle = '#264653'; // Shirt
    ctx.fillRect(35, 115, 90, 45);
    ctx.fillStyle = '#ffd166'; // Face
    ctx.fillRect(48, 52, 64, 58);
    ctx.fillStyle = '#e76f51'; // Hair
    ctx.fillRect(42, 36, 76, 26);
    // Cool sunglasses
    ctx.fillStyle = '#1d3557';
    ctx.fillRect(52, 68, 24, 16);
    ctx.fillRect(84, 68, 24, 16);
    ctx.fillRect(74, 72, 12, 6);
    // Headphones
    ctx.fillStyle = '#e63946';
    ctx.fillRect(36, 62, 12, 30);
    ctx.fillRect(112, 62, 12, 30);
    ctx.fillRect(42, 30, 76, 8);

    // Like overlay
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(8, h - 26, 80, 20);
    ctx.fillStyle = '#ff4d6d';
    ctx.font = 'bold 12px sans-serif';
    ctx.fillText('❤️ 3.4k', 14, h - 12);
  });
  _textureCache.set('portrait_boy', tex);
  return tex;
}

/** Voxel Portrait 2: Girl creator with pink glasses */
export function getPortraitGirlTexture() {
  if (_textureCache.has('portrait_girl')) return _textureCache.get('portrait_girl');
  const tex = createPixelCanvas(160, 160, (ctx, w, h) => {
    // Purple gradient
    ctx.fillStyle = '#7209b7';
    ctx.fillRect(0, 0, w, h);

    // Girl avatar
    ctx.fillStyle = '#4cc9f0'; // Shirt
    ctx.fillRect(32, 115, 96, 45);
    ctx.fillStyle = '#ffe5d9'; // Face
    ctx.fillRect(48, 50, 64, 56);
    ctx.fillStyle = '#f72585'; // Long hair
    ctx.fillRect(40, 32, 80, 28);
    ctx.fillRect(36, 54, 14, 52);
    ctx.fillRect(110, 54, 14, 52);
    // Pink glasses
    ctx.fillStyle = '#ff0054';
    ctx.fillRect(52, 66, 22, 16);
    ctx.fillRect(86, 66, 22, 16);
    ctx.fillRect(72, 70, 16, 5);
    ctx.fillStyle = '#222222';
    ctx.fillRect(68, 92, 24, 5); // Smile

    // Like overlay
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(8, h - 26, 80, 20);
    ctx.fillStyle = '#ff4d6d';
    ctx.font = 'bold 12px sans-serif';
    ctx.fillText('❤️ 8.9k', 14, h - 12);
  });
  _textureCache.set('portrait_girl', tex);
  return tex;
}

/** Voxel Portrait 3: Social Video Reel Post */
export function getPortraitVideoTexture() {
  if (_textureCache.has('portrait_video')) return _textureCache.get('portrait_video');
  const tex = createPixelCanvas(140, 180, (ctx, w, h) => {
    // Dark neon background
    ctx.fillStyle = '#110e1b';
    ctx.fillRect(0, 0, w, h);

    // Video content (Robot dancer)
    ctx.fillStyle = '#3a0ca3';
    ctx.fillRect(35, 80, 70, 70);
    ctx.fillStyle = '#4cc9f0';
    ctx.fillRect(48, 42, 44, 38);
    ctx.fillStyle = '#4361ee';
    ctx.fillRect(55, 52, 10, 10);
    ctx.fillRect(75, 52, 10, 10);

    // Play triangle overlay
    ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
    ctx.beginPath();
    ctx.moveTo(w / 2 - 12, h / 2 - 18);
    ctx.lineTo(w / 2 + 18, h / 2);
    ctx.lineTo(w / 2 - 12, h / 2 + 18);
    ctx.closePath();
    ctx.fill();

    // Top Reels badge
    ctx.fillStyle = 'rgba(255, 255, 255, 0.25)';
    ctx.fillRect(8, 8, 52, 18);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 11px sans-serif';
    ctx.fillText('▶ REELS', 12, 21);

    // Bottom stats
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(0, h - 26, w, 26);
    ctx.fillStyle = '#ff006e';
    ctx.font = 'bold 12px sans-serif';
    ctx.fillText('❤️ 25.1k', 10, h - 9);
  });
  _textureCache.set('portrait_video', tex);
  return tex;
}

/** YouTube Feed Screen on smartphone display (matching mobile YouTube app screenshot) */
export function getYouTubePhoneScreenTexture() {
  if (_textureCache.has('youtube_phone_screen')) return _textureCache.get('youtube_phone_screen');
  const tex = createTextCanvas(256, 512, (ctx, w, h) => {
    // Dark YouTube theme background
    ctx.fillStyle = '#0f0f0f';
    ctx.fillRect(0, 0, w, h);

    // 1. Top YouTube Header bar
    ctx.fillStyle = '#0f0f0f';
    ctx.fillRect(0, 0, w, 44);

    // Red YouTube Play Icon on top-left
    ctx.fillStyle = '#ff0000';
    ctx.fillRect(12, 12, 28, 20);
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.moveTo(22, 16);
    ctx.lineTo(30, 22);
    ctx.lineTo(22, 28);
    ctx.closePath();
    ctx.fill();

    // YouTube Title text
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 18px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('YouTube', 46, 28);

    // Filter Chips row (Все, Подкасты, Видеоигры)
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(10, 44, 38, 20); // 'Все' chip active
    ctx.fillStyle = '#0f0f0f';
    ctx.font = 'bold 11px sans-serif';
    ctx.fillText('Все', 18, 58);

    ctx.fillStyle = '#272727';
    ctx.fillRect(54, 44, 76, 20);
    ctx.fillStyle = '#ffffff';
    ctx.fillText('Подкасты', 62, 58);

    ctx.fillStyle = '#272727';
    ctx.fillRect(136, 44, 82, 20);
    ctx.fillStyle = '#ffffff';
    ctx.fillText('Видеоигры', 144, 58);

    // 2. VIDEO CARD 1 (Top Video with creator)
    // Video preview thumbnail (room with window & plant)
    ctx.fillStyle = '#e8ecf2';
    ctx.fillRect(10, 72, w - 20, 120);

    // Green plant on background
    ctx.fillStyle = '#2d6a4f';
    ctx.fillRect(80, 78, 40, 48);

    // Voxel character / creator in blue t-shirt with beard & glasses
    ctx.fillStyle = '#1d4ed8'; // Blue shirt
    ctx.fillRect(68, 140, 100, 52);
    ctx.fillStyle = '#ffd1b3'; // Neck & Face
    ctx.fillRect(94, 122, 48, 28);
    ctx.fillRect(86, 88, 64, 44);
    ctx.fillStyle = '#4a3525'; // Hair & Beard
    ctx.fillRect(82, 80, 72, 20);
    ctx.fillRect(84, 116, 68, 18);
    // Glasses & Eyes
    ctx.fillStyle = '#111827';
    ctx.fillRect(96, 98, 18, 12);
    ctx.fillRect(122, 98, 18, 12);
    ctx.fillRect(112, 102, 12, 4);

    // Time badge bottom-right
    ctx.fillStyle = 'rgba(0,0,0,0.8)';
    ctx.fillRect(w - 56, 170, 42, 18);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 11px sans-serif';
    ctx.fillText('19:28', w - 50, 183);

    // Video metadata below
    // Red creator avatar icon
    ctx.fillStyle = '#dc2626';
    ctx.beginPath();
    ctx.arc(26, 210, 14, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 11px sans-serif';
    ctx.fillText('▶', 22, 214);

    // Video Title lines
    ctx.fillStyle = '#f3f4f6';
    ctx.font = 'bold 12px sans-serif';
    ctx.fillText('Так кто их всех собрал? Кремль', 48, 206);
    ctx.fillText('или ИИ-фабрика контента?', 48, 220);
    ctx.fillStyle = '#9ca3af';
    ctx.font = '10px sans-serif';
    ctx.fillText('Анатолий • 491 тыс. просмотров • 9 ч назад', 48, 234);

    // Divider line
    ctx.fillStyle = '#272727';
    ctx.fillRect(0, 244, w, 3);

    // 3. VIDEO CARD 2 (Bottom Video with 4 voxel entrepreneurs)
    // Red curtain background
    ctx.fillStyle = '#7f1d1d';
    ctx.fillRect(10, 252, w - 20, 126);

    // 4 Voxel entrepreneurs facing forward
    const pX = [32, 78, 126, 176];
    for (let i = 0; i < 4; i++) {
      const cx = pX[i];
      ctx.fillStyle = '#e5e7eb'; // White/light shirts
      ctx.fillRect(cx - 18, 316, 36, 40);
      ctx.fillStyle = '#fed7aa'; // Faces
      ctx.fillRect(cx - 14, 276, 28, 32);
      ctx.fillStyle = '#374151'; // Hair
      ctx.fillRect(cx - 16, 268, 32, 12);
      // Eyes / Glasses
      ctx.fillStyle = '#111827';
      ctx.fillRect(cx - 10, 286, 6, 6);
      ctx.fillRect(cx + 4, 286, 6, 6);
    }

    // Yellow glowing lightbulb / dollar badges
    ctx.fillStyle = '#f59e0b';
    ctx.beginPath();
    ctx.arc(55, 332, 10, 0, Math.PI * 2);
    ctx.arc(150, 332, 10, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#000000';
    ctx.font = 'bold 12px sans-serif';
    ctx.fillText('$', 52, 336);
    ctx.fillText('$', 147, 336);

    // Big Banner "60 МЛН НА ПЧЕЛ" / "POSTILKA ИИ"
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(36, 342, w - 72, 26);
    ctx.fillStyle = '#111827';
    ctx.font = '900 13px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('60 МЛН НА НЕЙРОСЕТИ', w / 2, 359);
    ctx.textAlign = 'left';

    // Time badge bottom-right
    ctx.fillStyle = 'rgba(0,0,0,0.8)';
    ctx.fillRect(w - 64, 356, 50, 18);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 11px sans-serif';
    ctx.fillText('1:06:32', w - 58, 369);

    // Card 2 metadata below
    ctx.fillStyle = '#2563eb';
    ctx.beginPath();
    ctx.arc(26, 400, 14, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#f3f4f6';
    ctx.font = 'bold 12px sans-serif';
    ctx.fillText('Зачем блогерам ИИ? Этот бизнес', 48, 396);
    ctx.fillText('РАСТЕТ на 100% в год | Postilka', 48, 410);
    ctx.fillStyle = '#9ca3af';
    ctx.font = '10px sans-serif';
    ctx.fillText('Оскар • 26 тыс. просмотров • 20 ч назад', 48, 424);

    // 4. Bottom Navigation Bar (Главная, Shorts, +, Подписки, Вы)
    ctx.fillStyle = '#0f0f0f';
    ctx.fillRect(0, h - 42, w, 42);
    ctx.fillStyle = '#272727';
    ctx.fillRect(0, h - 43, w, 1);

    const navItems = ['🏠\nГлавная', '⚡\nShorts', '➕', '📺\nПодписки', '👤\nВы'];
    const navX = [26, 76, 128, 180, 230];
    for (let i = 0; i < navItems.length; i++) {
      ctx.fillStyle = i === 0 ? '#ffffff' : '#9ca3af';
      ctx.font = '10px sans-serif';
      ctx.textAlign = 'center';
      const parts = navItems[i].split('\n');
      if (parts.length === 1) {
        ctx.font = 'bold 18px sans-serif';
        ctx.fillText(parts[0], navX[i], h - 18);
      } else {
        ctx.fillText(parts[0], navX[i], h - 22);
        ctx.fillText(parts[1], navX[i], h - 10);
      }
    }
  });
  _textureCache.set('youtube_phone_screen', tex);
  return tex;
}

/** Telegram Conveyor Post Cards (Post text + image preview) */
export function getTelegramPostCardTexture(variant = 0) {
  const key = `tg_post_card_${variant}`;
  if (_textureCache.has(key)) return _textureCache.get(key);
  const tex = createTextCanvas(256, 180, (ctx, w, h) => {
    // White card background
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, w, h);

    // Subtle border
    ctx.strokeStyle = '#cce3f5';
    ctx.lineWidth = 4;
    ctx.strokeRect(2, 2, w - 4, h - 4);

    // Header bar (Telegram channel avatar + name + verified badge)
    ctx.fillStyle = variant === 0 ? '#50a7ea' : variant === 1 ? '#e63946' : '#2a9d8f';
    ctx.beginPath();
    ctx.arc(22, 22, 12, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#1c2536';
    ctx.font = 'bold 13px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(variant === 0 ? 'Postilka News' : variant === 1 ? 'Медиа Цех' : 'AI Бот Канал', 40, 20);

    ctx.fillStyle = '#50a7ea';
    ctx.fillText('✓', 142, 20);

    ctx.fillStyle = '#8b98a5';
    ctx.font = '10px sans-serif';
    ctx.fillText('14:20 • tg.me/postilka', 40, 32);

    // Post content photo thumbnail
    ctx.fillStyle = variant === 0 ? '#f07167' : variant === 1 ? '#0077b6' : '#9d4edd';
    ctx.fillRect(12, 42, w - 24, 76);

    // Voxel character / artwork on thumbnail
    ctx.fillStyle = '#ffeedd';
    ctx.fillRect(w / 2 - 20, 52, 40, 42);
    ctx.fillStyle = '#333333';
    ctx.fillRect(w / 2 - 16, 48, 32, 12);
    ctx.fillRect(w / 2 - 12, 64, 6, 6);
    ctx.fillRect(w / 2 + 6, 64, 6, 6);

    // Post text lines
    ctx.fillStyle = '#1f2937';
    ctx.font = 'bold 11px sans-serif';
    if (variant === 0) {
      ctx.fillText('🚀 Запущен новый конвейер автопостинга!', 12, 134);
      ctx.fillText('Интеграция со всеми соцсетями за секунды.', 12, 148);
    } else if (variant === 1) {
      ctx.fillText('🎬 Готовы 10 новых вертикальных роликов.', 12, 134);
      ctx.fillText('Медиамашина отрендерила всё в 4K.', 12, 148);
    } else {
      ctx.fillText('🤖 Чат-бот обучен на ваших статьях.', 12, 134);
      ctx.fillText('Мгновенные автоответы 24/7 в Telegram.', 12, 148);
    }

    // Bottom reactions (👍 1.2k  🔥 840  ❤️ 450)
    ctx.fillStyle = '#edf2f7';
    ctx.fillRect(12, 156, 64, 18);
    ctx.fillRect(80, 156, 56, 18);
    ctx.fillRect(140, 156, 56, 18);

    ctx.fillStyle = '#334155';
    ctx.font = 'bold 10px sans-serif';
    ctx.fillText('👍 1.2k', 18, 169);
    ctx.fillText('🔥 840', 86, 169);
    ctx.fillText('❤️ 450', 146, 169);
  });
  _textureCache.set(key, tex);
  return tex;
}

/** Coffee Shop / Coffee Machine Cup Texture */
export function getCoffeeSignTexture() {
  if (_textureCache.has('coffee_sign')) return _textureCache.get('coffee_sign');
  const tex = createTextCanvas(256, 128, (ctx, w, h) => {
    // Rich warm coffee brown background
    ctx.fillStyle = '#3d2314';
    ctx.fillRect(0, 0, w, h);

    // White border
    ctx.strokeStyle = '#d4a373';
    ctx.lineWidth = 6;
    ctx.strokeRect(5, 5, w - 10, h - 10);

    // Coffee Cup graphic
    ctx.fillStyle = '#faedcd';
    ctx.beginPath();
    ctx.moveTo(34, 46);
    ctx.lineTo(40, 88);
    ctx.lineTo(66, 88);
    ctx.lineTo(72, 46);
    ctx.closePath();
    ctx.fill();

    // Cup handle
    ctx.strokeStyle = '#faedcd';
    ctx.lineWidth = 4;
    ctx.strokeRect(68, 52, 14, 22);

    // Steam
    ctx.strokeStyle = '#fefae0';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(46, 38);
    ctx.quadraticCurveTo(42, 28, 48, 20);
    ctx.moveTo(58, 38);
    ctx.quadraticCurveTo(64, 28, 58, 20);
    ctx.stroke();

    // "КОФЕ" Bold Typography
    ctx.fillStyle = '#fefae0';
    ctx.font = '900 60px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Montserrat", Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.letterSpacing = '6px';
    ctx.fillText('КОФЕ', 160, h / 2 + 2);
  });
  _textureCache.set('coffee_sign', tex);
  return tex;
}

/** Bus Front & Rear Route Destination Marquee */
export function getBusDestinationTexture(text = 'POSTILKA') {
  const key = `bus_dest_${text}`;
  if (_textureCache.has(key)) return _textureCache.get(key);
  const tex = createTextCanvas(256, 64, (ctx, w, h) => {
    // Dark amber-lit destination box
    ctx.fillStyle = '#1c150c';
    ctx.fillRect(0, 0, w, h);

    // Subtle orange glowing border
    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 4;
    ctx.strokeRect(3, 3, w - 6, h - 6);

    // Glowing warm amber route text
    ctx.fillStyle = '#fbbf24';
    ctx.font = '900 32px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Montserrat", Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.letterSpacing = '4px';
    ctx.fillText(text, w / 2, h / 2 + 1);
  });
  _textureCache.set(key, tex);
  return tex;
}

/** Bus Side Windows with Passengers */
export function getBusSideWindowsTexture() {
  if (_textureCache.has('bus_side_windows')) return _textureCache.get('bus_side_windows');
  const tex = createPixelCanvas(512, 128, (ctx, w, h) => {
    // Yellow bus body background
    ctx.fillStyle = '#f5b324';
    ctx.fillRect(0, 0, w, h);

    // 4 Windows
    const winCount = 4;
    const winW = 100;
    const winH = 96;
    const gap = 24;
    const startX = 16;
    const winY = 16;

    for (let i = 0; i < winCount; i++) {
      const wx = startX + i * (winW + gap);

      // Dark window frame
      ctx.fillStyle = '#222226';
      ctx.fillRect(wx - 2, winY - 2, winW + 4, winH + 4);

      // Blue-grey glass
      ctx.fillStyle = '#475569';
      ctx.fillRect(wx, winY, winW, winH);

      // Glass shine diagonal
      ctx.fillStyle = 'rgba(255, 255, 255, 0.22)';
      ctx.beginPath();
      ctx.moveTo(wx + 10, winY + winH);
      ctx.lineTo(wx + 40, winY + winH);
      ctx.lineTo(wx + winW - 10, winY);
      ctx.lineTo(wx + winW - 40, winY);
      ctx.closePath();
      ctx.fill();

      // Voxel passenger silhouette inside
      if (i === 0) {
        // Driver with cap
        ctx.fillStyle = '#1e293b';
        ctx.fillRect(wx + 28, winY + 28, 44, 20); // Cap
        ctx.fillStyle = '#fed7aa';
        ctx.fillRect(wx + 34, winY + 44, 32, 28); // Face
        ctx.fillStyle = '#2563eb';
        ctx.fillRect(wx + 24, winY + 70, 52, 26); // Uniform
      } else if (i === 1) {
        // Girl passenger
        ctx.fillStyle = '#ec4899';
        ctx.fillRect(wx + 30, winY + 30, 40, 24); // Hair
        ctx.fillStyle = '#fde047';
        ctx.fillRect(wx + 34, winY + 50, 32, 26); // Face
        ctx.fillStyle = '#10b981';
        ctx.fillRect(wx + 26, winY + 74, 48, 22);
      } else if (i === 2) {
        // Guy with headphones
        ctx.fillStyle = '#475569';
        ctx.fillRect(wx + 32, winY + 32, 36, 22); // Hair
        ctx.fillStyle = '#ef4444';
        ctx.fillRect(wx + 24, winY + 44, 8, 22); // Headphones
        ctx.fillRect(wx + 68, winY + 44, 8, 22);
        ctx.fillRect(wx + 32, winY + 48, 36, 24); // Face
        ctx.fillStyle = '#f97316';
        ctx.fillRect(wx + 24, winY + 72, 52, 24);
      } else {
        // Robot passenger
        ctx.fillStyle = '#94a3b8';
        ctx.fillRect(wx + 32, winY + 36, 36, 32); // Robot head
        ctx.fillStyle = '#38bdf8';
        ctx.fillRect(wx + 38, winY + 46, 10, 8); // Cyan eyes
        ctx.fillRect(wx + 52, winY + 46, 10, 8);
        ctx.fillStyle = '#64748b';
        ctx.fillRect(wx + 26, winY + 68, 48, 28);
      }
    }
  });
  _textureCache.set('bus_side_windows', tex);
  return tex;
}

/** Bus Stop Signboard Texture */
export function getBusStopSignTexture(stopName = 'ОСТАНОВКА') {
  const key = `bus_stop_${stopName}`;
  if (_textureCache.has(key)) return _textureCache.get(key);
  const tex = createTextCanvas(256, 128, (ctx, w, h) => {
    // Clean bus blue stop sign
    ctx.fillStyle = '#0284c7';
    ctx.fillRect(0, 0, w, h);

    // White border
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 5;
    ctx.strokeRect(4, 4, w - 8, h - 8);

    // Bus Icon
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(16, 28, 52, 68);
    ctx.fillStyle = '#0284c7';
    ctx.fillRect(22, 38, 40, 24); // windshield
    // Headlights
    ctx.fillStyle = '#fef08a';
    ctx.fillRect(22, 74, 10, 10);
    ctx.fillRect(52, 74, 10, 10);
    // Wheels
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(24, 94, 10, 6);
    ctx.fillRect(50, 94, 10, 6);

    // Stop Title Text
    ctx.fillStyle = '#ffffff';
    ctx.font = '900 24px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Montserrat", Arial, sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText('POSTILKA', 78, 42);

    ctx.font = 'bold 20px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillStyle = '#fef08a';
    ctx.fillText(stopName, 78, 76);
  });
  _textureCache.set(key, tex);
  return tex;
}

/** Bus Depot / Garage Signboard Texture */
export function getBusDepotSignTexture(title = 'ДЕПО №1') {
  const key = `bus_depot_${title}`;
  if (_textureCache.has(key)) return _textureCache.get(key);
  const tex = createTextCanvas(384, 96, (ctx, w, h) => {
    // Dark industrial navy background
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(0, 0, w, h);

    // Hazard stripes border at bottom
    const stripeW = 16;
    for (let x = 0; x < w; x += stripeW * 2) {
      ctx.fillStyle = '#f59e0b';
      ctx.fillRect(x, h - 10, stripeW, 10);
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(x + stripeW, h - 10, stripeW, 10);
    }

    // Outer frame
    ctx.strokeStyle = '#cbd5e1';
    ctx.lineWidth = 4;
    ctx.strokeRect(3, 3, w - 6, h - 14);

    // Illuminated depot title
    ctx.fillStyle = '#38bdf8';
    ctx.font = '900 42px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Montserrat", Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.letterSpacing = '4px';
    ctx.fillText(title, w / 2, (h - 10) / 2 + 1);
  });
  _textureCache.set(key, tex);
  return tex;
}

/** VK Routing Screen Texture (upper floor of VK pavilion) */
export function getVKRoutingScreenTexture() {
  if (_textureCache.has('vk_routing_screen')) return _textureCache.get('vk_routing_screen');
  const tex = createTextCanvas(384, 256, (ctx, w, h) => {
    // Window frame & header
    ctx.fillStyle = '#2b3a4e';
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#4473a8';
    ctx.fillRect(6, 6, w - 12, 34);

    // Header title
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 20px "JetBrains Mono", sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText('РОУТИНГ', 16, 23);

    // Left sidebar
    ctx.fillStyle = '#1e2838';
    ctx.fillRect(6, 40, 96, h - 46);
    ctx.fillStyle = '#5c789f';
    for (let i = 0; i < 4; i++) {
      ctx.fillRect(14, 52 + i * 22, 80, 12);
    }

    // Main content area
    ctx.fillStyle = '#e8edf4';
    ctx.fillRect(104, 40, w - 110, h - 46);

    // Post card 1
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(114, 50, w - 130, 80);
    ctx.fillStyle = '#4473a8';
    ctx.beginPath();
    ctx.arc(130, 68, 10, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#2b3a4e';
    ctx.fillRect(146, 62, 100, 10);
    ctx.fillStyle = '#8b9bb0';
    ctx.fillRect(118, 86, w - 142, 6);
    ctx.fillRect(118, 98, w - 190, 6);
    ctx.fillRect(118, 110, 80, 12);

    // Post card 2
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(114, 138, w - 130, 72);
    ctx.fillStyle = '#dc5f5f';
    ctx.beginPath();
    ctx.arc(130, 154, 10, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#2b3a4e';
    ctx.fillRect(146, 148, 80, 10);
    ctx.fillStyle = '#8b9bb0';
    ctx.fillRect(118, 172, w - 142, 6);
    ctx.fillRect(118, 184, 120, 6);
  });
  _textureCache.set('vk_routing_screen', tex);
  return tex;
}

/** VK Post Feed Main Workstation Screen */
export function getVKPostFeedScreenTexture() {
  if (_textureCache.has('vk_post_feed_screen')) return _textureCache.get('vk_post_feed_screen');
  const tex = createTextCanvas(384, 256, (ctx, w, h) => {
    ctx.fillStyle = '#1c2636';
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#4473a8';
    ctx.fillRect(4, 4, w - 8, 30);

    // VK mini logo in header
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 16px "Baloo 2", sans-serif';
    ctx.fillText('VK', 18, 20);
    ctx.font = 'bold 13px "JetBrains Mono", sans-serif';
    ctx.fillText('СЛУЖБА ПОСТИНГА · ОЧЕРЕДЬ #418', 48, 20);

    // White body card
    ctx.fillStyle = '#f0f4f9';
    ctx.fillRect(12, 42, w - 24, h - 54);

    // Author header
    ctx.fillStyle = '#4473a8';
    ctx.beginPath();
    ctx.arc(32, 64, 14, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#1e293b';
    ctx.font = 'bold 15px sans-serif';
    ctx.fillText('Postilka Factory', 54, 59);
    ctx.fillStyle = '#64748b';
    ctx.font = '11px sans-serif';
    ctx.fillText('сегодня в 14:00', 54, 73);

    // Post text lines
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(24, 90, w - 48, 8);
    ctx.fillRect(24, 104, w - 80, 8);
    ctx.fillRect(24, 118, w - 120, 8);

    // Image preview banner
    ctx.fillStyle = '#3b82f6';
    ctx.fillRect(24, 134, w - 48, 64);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 16px "JetBrains Mono", monospace';
    ctx.textAlign = 'center';
    ctx.fillText('АВТОПОСТИНГ В VK', w / 2, 168);

    // Like & comments bar
    ctx.textAlign = 'left';
    ctx.fillStyle = '#ef4444';
    ctx.font = 'bold 13px sans-serif';
    ctx.fillText('❤️ 14.8k', 28, 218);
    ctx.fillStyle = '#64748b';
    ctx.fillText('💬 420  🔄 1.2k', 98, 218);
  });
  _textureCache.set('vk_post_feed_screen', tex);
  return tex;
}

/** VK Content Proof Screen */
export function getVKContentProofScreenTexture() {
  if (_textureCache.has('vk_content_proof')) return _textureCache.get('vk_content_proof');
  const tex = createTextCanvas(256, 320, (ctx, w, h) => {
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#38bdf8';
    ctx.fillRect(4, 4, w - 8, 32);

    ctx.fillStyle = '#0f172a';
    ctx.font = 'bold 16px "JetBrains Mono", monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('CONTENT PROOF', w / 2, 20);

    ctx.fillStyle = '#f8fafc';
    ctx.fillRect(10, 44, w - 20, h - 54);

    ctx.textAlign = 'left';
    ctx.fillStyle = '#0284c7';
    ctx.font = 'bold 13px sans-serif';
    ctx.fillText('✓ ТЕКСТ ПОСТА', 20, 68);
    ctx.fillText('✓ МЕДИА-СЕТКА', 20, 118);
    ctx.fillText('✓ CRON РАСПИСАНИЕ', 20, 168);
    ctx.fillText('✓ АВТОТЕГИ #AI', 20, 218);

    ctx.fillStyle = '#cbd5e1';
    for (const y of [80, 130, 180, 230]) {
      ctx.fillRect(20, y, w - 40, 16);
    }
    ctx.fillStyle = '#22c55e';
    ctx.fillRect(20, 80, (w - 40) * 0.9, 16);
    ctx.fillRect(20, 130, (w - 40) * 1.0, 16);
    ctx.fillRect(20, 180, (w - 40) * 0.85, 16);
    ctx.fillRect(20, 230, (w - 40) * 0.95, 16);

    ctx.fillStyle = '#4473a8';
    ctx.fillRect(20, 260, w - 40, 28);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 14px "JetBrains Mono", monospace';
    ctx.textAlign = 'center';
    ctx.fillText('ОДОБРЕНО', w / 2, 274);
  });
  _textureCache.set('vk_content_proof', tex);
  return tex;
}

/** Giant Glowing VK Thumbs Up Like Monument Screen */
export function getVKLikeMonumentTexture() {
  if (_textureCache.has('vk_like_monument')) return _textureCache.get('vk_like_monument');
  const tex = createTextCanvas(320, 320, (ctx, w, h) => {
    // Cyber blue scanline background
    ctx.fillStyle = '#16233b';
    ctx.fillRect(0, 0, w, h);

    // Subtle blue grid scanlines
    ctx.strokeStyle = '#22385e';
    ctx.lineWidth = 2;
    for (let y = 0; y < h; y += 12) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }
    for (let x = 0; x < w; x += 12) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
      ctx.stroke();
    }

    // Outer glow square
    ctx.fillStyle = 'rgba(74, 138, 244, 0.25)';
    ctx.beginPath();
    ctx.roundRect(20, 20, w - 40, h - 40, 32);
    ctx.fill();

    // White rounded like card
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.roundRect(36, 36, w - 72, h - 72, 28);
    ctx.fill();

    // Dark blue border around card
    ctx.strokeStyle = '#2d4d82';
    ctx.lineWidth = 6;
    ctx.stroke();

    // Voxel / blocky blue Thumbs Up 👍 icon in center
    ctx.fillStyle = '#3c6cb3';
    // Thumb
    ctx.fillRect(100, 88, 38, 52);
    ctx.fillRect(108, 72, 30, 22);
    // Hand body
    ctx.fillRect(80, 134, 150, 86);
    // 4 Finger ridges
    ctx.fillRect(224, 138, 22, 18);
    ctx.fillRect(224, 158, 20, 18);
    ctx.fillRect(224, 178, 18, 18);
    ctx.fillRect(224, 198, 16, 18);
    // Cuff
    ctx.fillStyle = '#223e6e';
    ctx.fillRect(72, 134, 16, 86);
  });
  _textureCache.set('vk_like_monument', tex);
  return tex;
}

/** Crisp Role / Area Badges (e.g. "МОДЕРАТОР", "КОНТЕНТ ПРУВОВ") */
export function getBadgeTexture(text, bgColor = '#181f2c', textColor = '#ffffff') {
  const key = `badge_${text}_${bgColor}`;
  if (_textureCache.has(key)) return _textureCache.get(key);
  const tex = createTextCanvas(256, 64, (ctx, w, h) => {
    ctx.fillStyle = bgColor;
    ctx.beginPath();
    ctx.roundRect(4, 4, w - 8, h - 8, 8);
    ctx.fill();

    ctx.strokeStyle = '#5a739c';
    ctx.lineWidth = 3;
    ctx.stroke();

    ctx.fillStyle = textColor;
    ctx.font = '900 24px "JetBrains Mono", monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.letterSpacing = '2px';
    ctx.fillText(text, w / 2, h / 2 + 1);
  });
  _textureCache.set(key, tex);
  return tex;
}

/** Journey pavilion facade: a compact voxel UI screen with content cards. */
export function getJourneyConsoleTexture(accent = '#4473a8') {
  const key = `journey_console_${accent}`;
  if (_textureCache.has(key)) return _textureCache.get(key);
  const tex = createTextCanvas(320, 200, (ctx, w, h) => {
    ctx.fillStyle = '#eaf0f6';
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#26364e';
    ctx.fillRect(0, 0, w, 28);
    ctx.fillStyle = accent;
    ctx.fillRect(12, 8, 70, 10);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(92, 9, 42, 8);
    ctx.fillRect(142, 9, 42, 8);
    ctx.fillStyle = '#c9d3df';
    ctx.fillRect(16, 46, 116, 96);
    ctx.fillStyle = accent;
    ctx.fillRect(24, 56, 100, 42);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(31, 64, 48, 8);
    ctx.fillRect(31, 79, 76, 6);
    ctx.fillStyle = '#bdc9d7';
    ctx.fillRect(148, 48, 142, 12);
    ctx.fillRect(148, 72, 112, 10);
    ctx.fillRect(148, 94, 130, 10);
    ctx.fillRect(148, 116, 82, 10);
    ctx.fillStyle = accent;
    ctx.fillRect(18, 158, w - 36, 20);
  });
  _textureCache.set(key, tex);
  return tex;
}

/** VK journey marquee, matching the tall roadside pavilion in the reference. */
export function getVKJourneySignTexture() {
  if (_textureCache.has('vk_journey_sign')) return _textureCache.get('vk_journey_sign');
  const tex = createTextCanvas(640, 160, (ctx, w, h) => {
    ctx.fillStyle = '#253653';
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = '#8ba7d4';
    ctx.lineWidth = 8;
    ctx.strokeRect(6, 6, w - 12, h - 12);
    ctx.fillStyle = '#ffffff';
    ctx.font = '900 52px "JetBrains Mono", monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('ВКОНТАКТЕ:', w / 2, 59);
    ctx.font = '700 29px "JetBrains Mono", monospace';
    ctx.fillText('СЛУЖБА ПОСТИНГА', w / 2, 108);
  });
  _textureCache.set('vk_journey_sign', tex);
  return tex;
}

/** YouTube Studio Marquee Sign */
export function getYouTubeStudioSignTexture() {
  if (_textureCache.has('yt_studio_sign')) return _textureCache.get('yt_studio_sign');
  const tex = createTextCanvas(640, 160, (ctx, w, h) => {
    ctx.fillStyle = '#b71c1c';
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = '#ff8a80';
    ctx.lineWidth = 8;
    ctx.strokeRect(6, 6, w - 12, h - 12);
    ctx.fillStyle = '#ffffff';
    ctx.font = '900 48px "JetBrains Mono", monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('YOUTUBE SHORTS:', w / 2, 58);
    ctx.font = '700 28px "JetBrains Mono", monospace';
    ctx.fillText('МЕДИА СТУДИЯ & МОНТАЖ', w / 2, 110);
  });
  _textureCache.set('yt_studio_sign', tex);
  return tex;
}

/** YouTube Multi-Camera Switcher Screen */
export function getYouTubeSwitcherScreenTexture() {
  if (_textureCache.has('yt_switcher_screen')) return _textureCache.get('yt_switcher_screen');
  const tex = createTextCanvas(384, 256, (ctx, w, h) => {
    ctx.fillStyle = '#181b22';
    ctx.fillRect(0, 0, w, h);

    // Top status bar
    ctx.fillStyle = '#242b38';
    ctx.fillRect(0, 0, w, 28);
    ctx.fillStyle = '#ff3344';
    ctx.beginPath();
    ctx.arc(20, 14, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 13px "JetBrains Mono", monospace';
    ctx.fillText('LIVE STREAM 4K · REC ON AIR', 36, 18);

    // 4 Camera Feeds
    const cols = 2;
    const rows = 2;
    const cw = (w - 36) / 2;
    const ch = 76;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const x = 12 + c * (cw + 12);
        const y = 36 + r * (ch + 10);
        ctx.fillStyle = (r === 0 && c === 0) ? '#283344' : '#1e2430';
        ctx.fillRect(x, y, cw, ch);
        ctx.strokeStyle = (r === 0 && c === 0) ? '#ff3344' : '#425570';
        ctx.lineWidth = 2;
        ctx.strokeRect(x, y, cw, ch);

        ctx.fillStyle = '#6b7f9e';
        ctx.font = 'bold 11px "JetBrains Mono", monospace';
        ctx.fillText(`CAM ${r * 2 + c + 1}`, x + 8, y + 16);

        // Graphic content in feed
        ctx.fillStyle = (r === 0 && c === 0) ? '#4caf50' : '#3d4d65';
        ctx.fillRect(x + 10, y + 26, cw - 20, ch - 34);
      }
    }

    // Bottom timeline & audio level bars
    ctx.fillStyle = '#ffaa00';
    ctx.fillRect(12, h - 34, w - 24, 6);
    ctx.fillStyle = '#00e676';
    for (let i = 0; i < 28; i++) {
      const barH = 4 + Math.sin(i * 0.7) * 8 + Math.random() * 4;
      ctx.fillRect(14 + i * 12, h - 22, 8, barH);
    }
  });
  _textureCache.set('yt_switcher_screen', tex);
  return tex;
}

/** Telegram Dispatcher Marquee Sign */
export function getTelegramDispatcherSignTexture() {
  if (_textureCache.has('tg_dispatch_sign')) return _textureCache.get('tg_dispatch_sign');
  const tex = createTextCanvas(640, 160, (ctx, w, h) => {
    ctx.fillStyle = '#1e5380';
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = '#50a7ea';
    ctx.lineWidth = 8;
    ctx.strokeRect(6, 6, w - 12, h - 12);
    ctx.fillStyle = '#ffffff';
    ctx.font = '900 48px "JetBrains Mono", monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('TELEGRAM: HERO ХАБ', w / 2, 54);
    ctx.fillStyle = '#78d5ff';
    ctx.font = '800 25px "JetBrains Mono", monospace';
    ctx.fillText('КАНАЛЫ · КРУЖОЧКИ · БОТЫ · АВТОПОСТИНГ', w / 2, 110);
  });
  _textureCache.set('tg_dispatch_sign', tex);
  return tex;
}

/** Telegram "Hero Telegram" Plinth Texture */
export function getTelegramHeroSignTexture() {
  if (_textureCache.has('tg_hero_sign')) return _textureCache.get('tg_hero_sign');
  const tex = createTextCanvas(512, 128, (ctx, w, h) => {
    ctx.fillStyle = '#50a7ea';
    ctx.fillRect(0, 0, w, h);

    ctx.fillStyle = '#ffffff';
    ctx.font = '900 62px "JetBrains Mono", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('Hero Telegram', w / 2, h / 2);
  });
  _textureCache.set('tg_hero_sign', tex);
  return tex;
}

/** Telegram Console 4 Glowing Icons: Red (Megaphone), Cyan (Network), Green (Chat), Purple (Clock) */
export function getTelegramConsoleIconsTexture() {
  if (_textureCache.has('tg_console_icons')) return _textureCache.get('tg_console_icons');
  const tex = createTextCanvas(512, 140, (ctx, w, h) => {
    // Dark console background
    ctx.fillStyle = '#181f2a';
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = '#2d3d52';
    ctx.lineWidth = 4;
    ctx.strokeRect(2, 2, w - 4, h - 4);

    const cards = [
      { color: '#e63946', border: '#ff6b7a', icon: 'megaphone' },
      { color: '#00b4d8', border: '#48cae4', icon: 'nodes' },
      { color: '#2ec4b6', border: '#64dfdf', icon: 'chat' },
      { color: '#9d4edd', border: '#c77dff', icon: 'clock' },
    ];

    const cardW = 100;
    const cardH = 106;
    const gap = 18;
    const startX = 22;
    const startY = 17;

    for (let i = 0; i < cards.length; i++) {
      const card = cards[i];
      const cx = startX + i * (cardW + gap);
      const cy = startY;

      // Rounded colored button card
      ctx.fillStyle = card.color;
      ctx.beginPath();
      ctx.roundRect ? ctx.roundRect(cx, cy, cardW, cardH, 16) : ctx.fillRect(cx, cy, cardW, cardH);
      ctx.fill();

      ctx.strokeStyle = card.border;
      ctx.lineWidth = 4;
      ctx.stroke();

      // Draw Icon in Center
      const midX = cx + cardW / 2;
      const midY = cy + cardH / 2;

      ctx.fillStyle = '#ffffff';
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 6;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      if (card.icon === 'megaphone') {
        // Speaker / Horn
        ctx.beginPath();
        ctx.moveTo(midX - 22, midY - 12);
        ctx.lineTo(midX - 22, midY + 12);
        ctx.lineTo(midX - 8, midY + 12);
        ctx.lineTo(midX + 16, midY + 24);
        ctx.lineTo(midX + 16, midY - 24);
        ctx.lineTo(midX - 8, midY - 12);
        ctx.closePath();
        ctx.fill();
        // Sound rays
        ctx.beginPath();
        ctx.arc(midX + 22, midY, 12, -Math.PI / 3, Math.PI / 3);
        ctx.stroke();
      } else if (card.icon === 'nodes') {
        // Share / 3 connected nodes
        ctx.beginPath();
        ctx.moveTo(midX + 14, midY - 16);
        ctx.lineTo(midX - 16, midY);
        ctx.lineTo(midX + 14, midY + 16);
        ctx.stroke();

        for (const [nx, ny] of [[midX - 16, midY], [midX + 14, midY - 16], [midX + 14, midY + 16]]) {
          ctx.beginPath();
          ctx.arc(nx, ny, 8, 0, Math.PI * 2);
          ctx.fill();
        }
      } else if (card.icon === 'chat') {
        // Chat speech bubble
        ctx.beginPath();
        ctx.roundRect ? ctx.roundRect(midX - 22, midY - 18, 44, 30, 8) : ctx.fillRect(midX - 22, midY - 18, 44, 30);
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(midX - 10, midY + 12);
        ctx.lineTo(midX - 16, midY + 24);
        ctx.lineTo(midX - 2, midY + 12);
        ctx.closePath();
        ctx.fill();
        // Inner dots
        ctx.fillStyle = card.color;
        for (const dx of [-10, 0, 10]) {
          ctx.beginPath();
          ctx.arc(midX + dx, midY - 3, 3.5, 0, Math.PI * 2);
          ctx.fill();
        }
      } else if (card.icon === 'clock') {
        // Monitor screen with clock inside
        ctx.beginPath();
        ctx.roundRect ? ctx.roundRect(midX - 24, midY - 22, 48, 36, 6) : ctx.fillRect(midX - 24, midY - 22, 48, 36);
        ctx.fill();
        // Screen base
        ctx.beginPath();
        ctx.moveTo(midX - 10, midY + 22);
        ctx.lineTo(midX + 10, midY + 22);
        ctx.stroke();

        // Inner clock
        ctx.strokeStyle = card.color;
        ctx.lineWidth = 3.5;
        ctx.beginPath();
        ctx.arc(midX, midY - 4, 11, 0, Math.PI * 2);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(midX, midY - 4);
        ctx.lineTo(midX, midY - 10);
        ctx.moveTo(midX, midY - 4);
        ctx.lineTo(midX + 5, midY - 4);
        ctx.stroke();
      }
    }
  });
  _textureCache.set('tg_console_icons', tex);
  return tex;
}

/** Telegram Conveyor Machine Control Buttons */
export function getTelegramConveyorControlsTexture() {
  if (_textureCache.has('tg_conveyor_ctrl')) return _textureCache.get('tg_conveyor_ctrl');
  const tex = createTextCanvas(512, 64, (ctx, w, h) => {
    ctx.fillStyle = '#26303d';
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = '#3e4e62';
    ctx.lineWidth = 2;
    ctx.strokeRect(2, 2, w - 4, h - 4);

    const colors = ['#9c27b0', '#00b4d8', '#22c55e', '#ffd600', '#ff9100', '#f43f5e'];
    for (let i = 0; i < colors.length; i++) {
      const bx = 16 + i * 38;
      ctx.fillStyle = colors[i];
      ctx.beginPath();
      ctx.roundRect ? ctx.roundRect(bx, 14, 26, 36, 4) : ctx.fillRect(bx, 14, 26, 36);
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }

    // Right side ventilation slots / label
    ctx.fillStyle = '#141a22';
    for (let x = 280; x < w - 20; x += 14) {
      ctx.fillRect(x, 16, 6, 32);
    }
  });
  _textureCache.set('tg_conveyor_ctrl', tex);
  return tex;
}

/** Telegram Speech Bubble Sticker on Wall */
export function getTelegramSpeechLogoTexture() {
  if (_textureCache.has('tg_speech_logo')) return _textureCache.get('tg_speech_logo');
  const tex = createTextCanvas(256, 256, (ctx, w, h) => {
    ctx.fillStyle = '#50a7ea';
    ctx.fillRect(0, 0, w, h);

    // White rounded speech bubble with pointer
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.roundRect ? ctx.roundRect(16, 16, 224, 180, 28) : ctx.fillRect(16, 16, 224, 180);
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(80, 196);
    ctx.lineTo(60, 240);
    ctx.lineTo(120, 196);
    ctx.closePath();
    ctx.fill();

    // Inner Telegram Blue Circle
    const cx = 128;
    const cy = 106;
    ctx.fillStyle = '#50a7ea';
    ctx.beginPath();
    ctx.arc(cx, cy, 68, 0, Math.PI * 2);
    ctx.fill();

    // White Paper Airplane
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.moveTo(cx - 36, cy + 2);
    ctx.lineTo(cx + 42, cy - 32);
    ctx.lineTo(cx + 18, cy + 34);
    ctx.lineTo(cx - 4, cy + 12);
    ctx.lineTo(cx - 12, cy + 24);
    ctx.lineTo(cx - 18, cy + 8);
    ctx.closePath();
    ctx.fill();

    // Fold Shadow
    ctx.fillStyle = '#d0ebff';
    ctx.beginPath();
    ctx.moveTo(cx - 4, cy + 12);
    ctx.lineTo(cx + 42, cy - 32);
    ctx.lineTo(cx - 12, cy + 24);
    ctx.closePath();
    ctx.fill();
  });
  _textureCache.set('tg_speech_logo', tex);
  return tex;
}

/** Telegram Scalloped Cloud Sticker: Heart, Video, Play, Camera */
export function getTelegramStickerTexture(type = 'heart') {
  const key = `tg_sticker_${type}`;
  if (_textureCache.has(key)) return _textureCache.get(key);
  const tex = createTextCanvas(256, 256, (ctx, w, h) => {
    ctx.fillStyle = '#50a7ea';
    ctx.fillRect(0, 0, w, h);

    const cx = 128;
    const cy = 128;
    const r = 90;

    // White scalloped fluffy cloud border
    ctx.fillStyle = '#ffffff';
    const lobes = 14;
    for (let i = 0; i < lobes; i++) {
      const angle = (i / lobes) * Math.PI * 2;
      const lx = cx + Math.cos(angle) * r;
      const ly = cy + Math.sin(angle) * r;
      ctx.beginPath();
      ctx.arc(lx, ly, 28, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();

    // Inner content depending on type
    if (type === 'heart') {
      ctx.fillStyle = '#ef4444';
      ctx.beginPath();
      ctx.moveTo(cx, cy + 44);
      ctx.bezierCurveTo(cx - 56, cy + 12, cx - 56, cy - 36, cx, cy - 20);
      ctx.bezierCurveTo(cx + 56, cy - 36, cx + 56, cy + 12, cx, cy + 44);
      ctx.closePath();
      ctx.fill();
    } else if (type === 'play') {
      ctx.fillStyle = '#50a7ea';
      ctx.beginPath();
      ctx.roundRect ? ctx.roundRect(cx - 42, cy - 42, 84, 84, 18) : ctx.fillRect(cx - 42, cy - 42, 84, 84);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.moveTo(cx - 14, cy - 22);
      ctx.lineTo(cx + 22, cy);
      ctx.lineTo(cx - 14, cy + 22);
      ctx.closePath();
      ctx.fill();
    } else if (type === 'camera') {
      ctx.fillStyle = '#f59e0b';
      ctx.beginPath();
      ctx.roundRect ? ctx.roundRect(cx - 42, cy - 35, 84, 70, 14) : ctx.fillRect(cx - 42, cy - 35, 84, 70);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(cx, cy, 21, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#f59e0b';
      ctx.beginPath();
      ctx.arc(cx, cy, 12, 0, Math.PI * 2);
      ctx.fill();
    } else if (type === 'clapper') {
      ctx.fillStyle = '#334155';
      ctx.beginPath();
      ctx.roundRect ? ctx.roundRect(cx - 44, cy - 32, 88, 64, 10) : ctx.fillRect(cx - 44, cy - 32, 88, 64);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      for (let s = -36; s < 36; s += 22) {
        ctx.beginPath();
        ctx.moveTo(cx + s, cy - 32);
        ctx.lineTo(cx + s + 9, cy - 32);
        ctx.lineTo(cx + s - 2, cy - 10);
        ctx.lineTo(cx + s - 11, cy - 10);
        ctx.closePath();
        ctx.fill();
      }
    }
  });
  _textureCache.set(key, tex);
  return tex;
}

/** Telegram Video Message (Кружочки) Screen */
export function getTelegramCirclesScreenTexture() {
  if (_textureCache.has('tg_circles_screen')) return _textureCache.get('tg_circles_screen');
  const tex = createTextCanvas(280, 280, (ctx, w, h) => {
    ctx.fillStyle = '#16233b';
    ctx.fillRect(0, 0, w, h);

    // Glowing circle
    ctx.fillStyle = '#223c66';
    ctx.beginPath();
    ctx.arc(w / 2, h / 2, 110, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = '#29b6f6';
    ctx.lineWidth = 8;
    ctx.beginPath();
    ctx.arc(w / 2, h / 2, 105, 0, Math.PI * 1.65);
    ctx.stroke();

    // Inner avatar / character preview
    ctx.fillStyle = '#e29c75';
    ctx.beginPath();
    ctx.arc(w / 2, h / 2 - 10, 42, 0, Math.PI * 2);
    ctx.fill();

    // Body
    ctx.fillStyle = '#3949ab';
    ctx.beginPath();
    ctx.arc(w / 2, h / 2 + 75, 55, Math.PI, 0);
    ctx.fill();

    // Recording timer badge
    ctx.fillStyle = 'rgba(0,0,0,0.75)';
    ctx.beginPath();
    ctx.roundRect(w / 2 - 45, h - 48, 90, 26, 12);
    ctx.fill();
    ctx.fillStyle = '#00e676';
    ctx.font = 'bold 15px "JetBrains Mono", monospace';
    ctx.textAlign = 'center';
    ctx.fillText('● 00:38', w / 2, h - 30);
  });
  _textureCache.set('tg_circles_screen', tex);
  return tex;
}

/** Postilka Omnichannel Master Station Sign */
export function getPostilkaMasterSignTexture() {
  if (_textureCache.has('postilka_master_sign')) return _textureCache.get('postilka_master_sign');
  const tex = createTextCanvas(680, 180, (ctx, w, h) => {
    ctx.fillStyle = '#182438';
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = '#f5c518';
    ctx.lineWidth = 10;
    ctx.strokeRect(6, 6, w - 12, h - 12);

    ctx.fillStyle = '#ffffff';
    ctx.font = '900 54px "JetBrains Mono", monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('POSTILKA CITADEL:', w / 2, 60);

    ctx.fillStyle = '#f5c518';
    ctx.font = '800 30px "JetBrains Mono", monospace';
    ctx.fillText('6 СОЦСЕТЕЙ В 1 КЛИК · 100% УСПЕХ', w / 2, 118);
  });
  _textureCache.set('postilka_master_sign', tex);
  return tex;
}

/** Postilka Live Analytics Wall */
export function getPostilkaAnalyticsWallTexture() {
  if (_textureCache.has('postilka_analytics_wall')) return _textureCache.get('postilka_analytics_wall');
  const tex = createTextCanvas(512, 280, (ctx, w, h) => {
    ctx.fillStyle = '#101622';
    ctx.fillRect(0, 0, w, h);

    // Header
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(0, 0, w, 36);
    ctx.fillStyle = '#38bdf8';
    ctx.font = 'bold 18px "JetBrains Mono", monospace';
    ctx.fillText('ОБЩАЯ СТАТИСТИКА ПУБЛИКАЦИЙ', 16, 24);

    // Social Network Pill Badges
    const nets = [
      { name: 'VK', color: '#2787f5', stat: '98,400' },
      { name: 'TG', color: '#2aabee', stat: '42,150' },
      { name: 'YT', color: '#ff0000', stat: '185,900' },
      { name: 'OK', color: '#ee8208', stat: '19,800' },
      { name: 'DZEN', color: '#ff542e', stat: '67,300' },
      { name: 'VC', color: '#e0e7ee', stat: '12,500' },
    ];

    for (let i = 0; i < nets.length; i++) {
      const net = nets[i];
      const px = 16 + (i % 3) * 160;
      const py = 48 + Math.floor(i / 3) * 44;
      ctx.fillStyle = '#1c2536';
      ctx.fillRect(px, py, 150, 36);
      ctx.fillStyle = net.color;
      ctx.fillRect(px, py, 8, 36);
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 14px "JetBrains Mono", monospace';
      ctx.fillText(net.name, px + 16, py + 22);
      ctx.fillStyle = '#4ade80';
      ctx.font = '12px "JetBrains Mono", monospace';
      ctx.fillText(net.stat, px + 75, py + 22);
    }

    // Bottom Graph Area
    const gy = 145;
    const gh = 115;
    ctx.fillStyle = '#151d2c';
    ctx.fillRect(16, gy, w - 32, gh);
    ctx.strokeStyle = '#27354d';
    ctx.lineWidth = 1;
    for (let y = gy + 20; y < gy + gh; y += 25) {
      ctx.beginPath();
      ctx.moveTo(16, y);
      ctx.lineTo(w - 16, y);
      ctx.stroke();
    }

    // Glowing green upward line
    ctx.strokeStyle = '#22c55e';
    ctx.lineWidth = 4;
    ctx.beginPath();
    const pts = [
      [24, gy + 90],
      [90, gy + 75],
      [160, gy + 82],
      [230, gy + 50],
      [310, gy + 42],
      [390, gy + 25],
      [480, gy + 12],
    ];
    for (let i = 0; i < pts.length; i++) {
      if (i === 0) ctx.moveTo(pts[i][0], pts[i][1]);
      else ctx.lineTo(pts[i][0], pts[i][1]);
    }
    ctx.stroke();

    ctx.fillStyle = '#f5c518';
    ctx.font = 'bold 15px "JetBrains Mono", monospace';
    ctx.fillText('ВСЕГО ОХВАТ: 1,480,200 ПРОСМОТРОВ ↗', 28, gy + gh - 12);
  });
  _textureCache.set('postilka_analytics_wall', tex);
  return tex;
}

/** Dzen Spark / 4-Point Star Logo */
export function getDzenLogoTexture() {
  if (_textureCache.has('dzen_logo')) return _textureCache.get('dzen_logo');
  const tex = createTextCanvas(256, 256, (ctx, w, h) => {
    // Modern sleek dark graphite background
    ctx.fillStyle = '#18181c';
    ctx.fillRect(0, 0, w, h);

    // Warm Dzen-yellow border
    ctx.strokeStyle = '#ffcc00';
    ctx.lineWidth = 10;
    ctx.strokeRect(6, 6, w - 12, h - 12);

    const cx = w / 2;
    const cy = h / 2 - 20;
    const r = 70;

    // Dzen iconic 4-pointed star ("Искра")
    ctx.fillStyle = '#ffcc00';
    ctx.beginPath();
    ctx.moveTo(cx, cy - r);
    ctx.quadraticCurveTo(cx, cy, cx + r, cy);
    ctx.quadraticCurveTo(cx, cy, cx, cy + r);
    ctx.quadraticCurveTo(cx, cy, cx - r, cy);
    ctx.quadraticCurveTo(cx, cy, cx, cy - r);
    ctx.closePath();
    ctx.fill();

    // Inner bright white core star
    ctx.fillStyle = '#ffffff';
    const rCore = 38;
    ctx.beginPath();
    ctx.moveTo(cx, cy - rCore);
    ctx.quadraticCurveTo(cx, cy, cx + rCore, cy);
    ctx.quadraticCurveTo(cx, cy, cx, cy + rCore);
    ctx.quadraticCurveTo(cx, cy, cx - rCore, cy);
    ctx.quadraticCurveTo(cx, cy, cx, cy - rCore);
    ctx.closePath();
    ctx.fill();

    // Bold "ДЗЕН" Cyrillic typography below star
    ctx.fillStyle = '#ffffff';
    ctx.font = '900 48px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Montserrat", Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.letterSpacing = '6px';
    ctx.fillText('ДЗЕН', cx, h - 42);
  });
  _textureCache.set('dzen_logo', tex);
  return tex;
}

/** Dzen Pavilion Marquee Sign */
export function getDzenJourneySignTexture() {
  if (_textureCache.has('dzen_journey_sign')) return _textureCache.get('dzen_journey_sign');
  const tex = createTextCanvas(640, 160, (ctx, w, h) => {
    ctx.fillStyle = '#18181c';
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = '#ffcc00';
    ctx.lineWidth = 8;
    ctx.strokeRect(6, 6, w - 12, h - 12);

    ctx.fillStyle = '#ffffff';
    ctx.font = '900 46px "JetBrains Mono", monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('ДЗЕН: ПЛАТФОРМА БЛОГОВ', w / 2, 54);

    ctx.fillStyle = '#ffcc00';
    ctx.font = '800 24px "JetBrains Mono", monospace';
    ctx.fillText('СТАТЬИ · ЛОНГРИДЫ · МЕДИА · АВТОРЫ', w / 2, 110);
  });
  _textureCache.set('dzen_journey_sign', tex);
  return tex;
}

/** Dzen Article & Personal Blog Editor Screen */
export function getDzenEditorScreenTexture() {
  if (_textureCache.has('dzen_editor_screen')) return _textureCache.get('dzen_editor_screen');
  const tex = createTextCanvas(960, 320, (ctx, w, h) => {
    // Dark editorial canvas background
    ctx.fillStyle = '#18181e';
    ctx.fillRect(0, 0, w, h);

    // Subtle sleek border
    ctx.strokeStyle = '#2d2d38';
    ctx.lineWidth = 4;
    ctx.strokeRect(2, 2, w - 4, h - 4);

    // 1. Top Editor Header & Toolbar
    ctx.fillStyle = '#22222c';
    ctx.fillRect(0, 0, w, 46);

    ctx.fillStyle = '#ffcc00';
    ctx.font = 'bold 16px "JetBrains Mono", monospace';
    ctx.fillText('✍ ДЗЕН СТУДИЯ · РЕДАКТОР СТАТЕЙ', 20, 29);

    // Format tools pills
    const tools = ['B', 'I', 'U', '❝❞', '🔗', '🖼', '📊'];
    for (let i = 0; i < tools.length; i++) {
      const tx = 390 + i * 36;
      ctx.fillStyle = '#2e2e3a';
      ctx.beginPath();
      ctx.roundRect ? ctx.roundRect(tx, 9, 30, 28, 4) : ctx.fillRect(tx, 9, 30, 28);
      ctx.fill();
      ctx.fillStyle = '#d0d0dc';
      ctx.font = 'bold 13px "JetBrains Mono", monospace';
      ctx.textAlign = 'center';
      ctx.fillText(tools[i], tx + 15, 28);
    }
    ctx.textAlign = 'left';

    ctx.fillStyle = '#4ade80';
    ctx.font = '13px "JetBrains Mono", monospace';
    ctx.fillText('● Черновик сохранён', 665, 29);

    // Yellow Publish CTA Button
    ctx.fillStyle = '#ffcc00';
    ctx.beginPath();
    ctx.roundRect ? ctx.roundRect(w - 180, 8, 160, 30, 6) : ctx.fillRect(w - 180, 8, 160, 30);
    ctx.fill();
    ctx.fillStyle = '#18181c';
    ctx.font = 'bold 13px "JetBrains Mono", monospace';
    ctx.fillText('Опубликовать ↗', w - 165, 28);

    // 2. Left / Center Main Article Workspace
    // Title
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 22px "JetBrains Mono", monospace';
    ctx.fillText('КАК ВЕСТИ ЛИЧНЫЙ БЛОГ В ДЗЕНЕ: ОТ ИДЕИ ДО 100K ЧИТАТЕЛЕЙ', 20, 82);

    // Subtitle & Body paragraphs
    ctx.fillStyle = '#b8b8c8';
    ctx.font = '14px "JetBrains Mono", monospace';
    ctx.fillText('Пошаговое руководство для авторов: как оформлять статьи и растить аудиторию.', 20, 110);
    ctx.fillText('Дзен объединяет миллионы читателей с персональной умной лентой рекомендаций.', 20, 132);

    // Highlighted Quote Box with Yellow Accent Bar
    ctx.fillStyle = '#ffcc00';
    ctx.fillRect(20, 150, 4, 48);
    ctx.fillStyle = '#23232e';
    ctx.fillRect(28, 150, 610, 48);
    ctx.fillStyle = '#ffe066';
    ctx.font = 'italic 13px "JetBrains Mono", monospace';
    ctx.fillText('«Увлекательный авторский контент и экспертная подача всегда', 40, 170);
    ctx.fillText('находят отклик читателей и дают стабильный рост блога.»', 40, 188);

    // Hashtags
    const tags = ['#личный_блог', '#статьи', '#дзен', '#монетизация', '#авторы'];
    let curTagX = 20;
    for (const tag of tags) {
      const tagW = tag.length * 10 + 18;
      ctx.fillStyle = '#282834';
      ctx.fillRect(curTagX, 212, tagW, 26);
      ctx.fillStyle = '#ffcc00';
      ctx.font = '12px "JetBrains Mono", monospace';
      ctx.fillText(tag, curTagX + 8, 229);
      curTagX += tagW + 10;
    }

    // 3. Right Column: Media Cover & Audience Prediction Card
    const cardX = 660;
    const cardY = 58;
    const cardW = 280;
    const cardH = 180;
    ctx.fillStyle = '#22222c';
    ctx.fillRect(cardX, cardY, cardW, cardH);
    ctx.strokeStyle = '#ffcc00';
    ctx.lineWidth = 2;
    ctx.strokeRect(cardX, cardY, cardW, cardH);

    // Cover Thumbnail inner gradient
    const grad = ctx.createLinearGradient(cardX + 12, cardY + 12, cardX + cardW - 24, cardY + 100);
    grad.addColorStop(0, '#2d2516');
    grad.addColorStop(1, '#4a3812');
    ctx.fillStyle = grad;
    ctx.fillRect(cardX + 12, cardY + 12, cardW - 24, 90);

    // Dzen Star inside Cover Card
    const scx = cardX + cardW / 2;
    const scy = cardY + 57;
    ctx.fillStyle = '#ffcc00';
    ctx.beginPath();
    ctx.moveTo(scx, scy - 28);
    ctx.quadraticCurveTo(scx, scy, scx + 28, scy);
    ctx.quadraticCurveTo(scx, scy, scx, scy + 28);
    ctx.quadraticCurveTo(scx, scy, scx - 28, scy);
    ctx.quadraticCurveTo(scx, scy, scx, scy - 28);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 12px "JetBrains Mono", monospace';
    ctx.fillText('ОБЛОЖКА СТАТЬИ · 16:9', cardX + 20, cardY + 125);

    ctx.fillStyle = '#4ade80';
    ctx.font = 'bold 12px "JetBrains Mono", monospace';
    ctx.fillText('Потенциальный охват: 50,000+ ↗', cardX + 20, cardY + 148);

    ctx.fillStyle = '#9e9eb0';
    ctx.font = '11px "JetBrains Mono", monospace';
    ctx.fillText('Рекомендация: добавить опрос', cardX + 20, cardY + 168);

    // 4. Bottom Stats Bar
    ctx.fillStyle = '#141418';
    ctx.fillRect(0, h - 44, w, 44);
    ctx.fillStyle = '#2d2d38';
    ctx.fillRect(0, h - 44, w, 2);

    ctx.fillStyle = '#4ade80';
    ctx.font = 'bold 14px "JetBrains Mono", monospace';
    ctx.fillText('👁 48.2K ПРОСМОТРОВ', 20, h - 17);

    ctx.fillStyle = '#ffcc00';
    ctx.fillText('⏱ 91% ДОЧИТЫВАНИЙ', 240, h - 17);

    ctx.fillStyle = '#38bdf8';
    ctx.fillText('💬 420 КОММЕНТАРИЕВ', 460, h - 17);

    ctx.fillStyle = '#f43f5e';
    ctx.fillText('❤️ 2.8K ЛАЙКОВ', 680, h - 17);

    ctx.fillStyle = '#f5c518';
    ctx.fillText('⭐ РЕЙТИНГ 4.9', 840, h - 17);
  });
  _textureCache.set('dzen_editor_screen', tex);
  return tex;
}

/** Dzen Digital Article Monument Card */
export function getDzenArticleMonumentTexture() {
  if (_textureCache.has('dzen_article_monument')) return _textureCache.get('dzen_article_monument');
  const tex = createTextCanvas(280, 280, (ctx, w, h) => {
    ctx.fillStyle = '#18181c';
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = '#ffcc00';
    ctx.lineWidth = 6;
    ctx.strokeRect(4, 4, w - 8, h - 8);

    // Header with Dzen Spark
    const cx = 32;
    const cy = 32;
    ctx.fillStyle = '#ffcc00';
    ctx.beginPath();
    ctx.moveTo(cx, cy - 16);
    ctx.quadraticCurveTo(cx, cy, cx + 16, cy);
    ctx.quadraticCurveTo(cx, cy, cx, cy + 16);
    ctx.quadraticCurveTo(cx, cy, cx - 16, cy);
    ctx.quadraticCurveTo(cx, cy, cx, cy - 16);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = '#ffffff';
    ctx.font = '900 18px "JetBrains Mono", monospace';
    ctx.fillText('ЛИЧНЫЙ БЛОГ', 58, 38);

    // Cover Illustration Box
    const grad = ctx.createLinearGradient(16, 60, w - 32, 160);
    grad.addColorStop(0, '#ffaa00');
    grad.addColorStop(1, '#ff5500');
    ctx.fillStyle = grad;
    ctx.fillRect(16, 60, w - 32, 100);

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 16px "JetBrains Mono", monospace';
    ctx.fillText('ИСТОРИЯ УСПЕХА', 30, 98);
    ctx.font = '13px "JetBrains Mono", monospace';
    ctx.fillText('КАК НАБРАТЬ 100K ЧИТАТЕЛЕЙ', 30, 126);

    // Bottom Article Body
    ctx.fillStyle = '#b0b0c0';
    ctx.font = '12px "JetBrains Mono", monospace';
    ctx.fillText('5 минут чтения · Топ авторов', 16, 185);

    // Progress Bar
    ctx.fillStyle = '#303038';
    ctx.fillRect(16, 202, w - 32, 8);
    ctx.fillStyle = '#ffcc00';
    ctx.fillRect(16, 202, (w - 32) * 0.78, 8);

    // Footer stats
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 13px "JetBrains Mono", monospace';
    ctx.fillText('👁 18.5K · 💬 340 · ⭐ 4.9', 16, 245);
  });
  _textureCache.set('dzen_article_monument', tex);
  return tex;
}

/** Hazard Stripe Pattern Texture for Road Barriers & Bumpers */
export function getHazardStripeTexture() {
  if (_textureCache.has('hazard_stripe')) return _textureCache.get('hazard_stripe');
  const tex = createPixelCanvas(128, 32, (ctx, w, h) => {
    ctx.fillStyle = '#ffcc00';
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#1e1e24';
    const stripeW = 16;
    for (let x = -h; x < w + h; x += stripeW * 2) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x + stripeW, 0);
      ctx.lineTo(x + stripeW - h, h);
      ctx.lineTo(x - h, h);
      ctx.closePath();
      ctx.fill();
    }
  });
  _textureCache.set('hazard_stripe', tex);
  return tex;
}

/** 3D Billboard Sign Texture at the End of the Road */
export function getRoadTerminusSignTexture() {
  if (_textureCache.has('road_terminus_sign')) return _textureCache.get('road_terminus_sign');
  const tex = createTextCanvas(512, 220, (ctx, w, h) => {
    // Deep dark background
    ctx.fillStyle = '#0e1726';
    ctx.fillRect(0, 0, w, h);

    // Warning hazard stripe border at top & bottom
    const stripeH = 14;
    ctx.fillStyle = '#ffcc00';
    ctx.fillRect(0, 0, w, stripeH);
    ctx.fillRect(0, h - stripeH, w, stripeH);

    ctx.fillStyle = '#1a1a24';
    const sW = 14;
    for (let x = -stripeH; x < w + stripeH; x += sW * 2) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x + sW, 0);
      ctx.lineTo(x + sW - stripeH, stripeH);
      ctx.lineTo(x - stripeH, stripeH);
      ctx.closePath();
      ctx.fill();

      ctx.beginPath();
      ctx.moveTo(x, h - stripeH);
      ctx.lineTo(x + sW, h - stripeH);
      ctx.lineTo(x + sW - stripeH, h);
      ctx.lineTo(x - stripeH, h);
      ctx.closePath();
      ctx.fill();
    }

    // Badge: 🚧 КОНЕЦ ОТКРЫТОГО МАРШРУТА
    ctx.fillStyle = '#ff9900';
    ctx.font = '900 16px "JetBrains Mono", monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('🚧 КОНЕЦ ОТКРЫТОГО МАРШРУТА', w / 2, 44);

    // Big Main Title: СКОРО ОБНОВЛЕНИЕ!
    ctx.fillStyle = '#ffffff';
    ctx.font = '900 44px "Baloo 2", "JetBrains Mono", sans-serif';
    ctx.fillText('СКОРО ОБНОВЛЕНИЕ!', w / 2, 94);

    // Friendly message / come back again
    ctx.fillStyle = '#38bdf8';
    ctx.font = 'bold 21px "Zen Maru Gothic", sans-serif';
    ctx.fillText('Строим новые павильоны · Приходите ещё! ✨', w / 2, 144);

    ctx.fillStyle = '#94a3b8';
    ctx.font = '600 13px "JetBrains Mono", monospace';
    ctx.fillText('POSTILKA 2026 · ФАБРИКА КОНТЕНТА', w / 2, 180);
  });
  _textureCache.set('road_terminus_sign', tex);
  return tex;
}







