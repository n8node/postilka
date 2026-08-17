export type SketchBrushId =
  | "simple"
  | "sketchy"
  | "shaded"
  | "ribbon"
  | "web"
  | "chrome"
  | "fur"
  | "grid";

export type SketchPoint = { x: number; y: number };

export type SketchStroke = {
  brush: SketchBrushId;
  color: string;
  size: number;
  points: SketchPoint[];
  opacity: number;
};

export const SKETCH_BRUSHES: {
  id: SketchBrushId;
  label: string;
  desc: string;
}[] = [
  { id: "simple", label: "Простая", desc: "Чистая линия" },
  { id: "sketchy", label: "Эскиз", desc: "Живой штрих" },
  { id: "shaded", label: "Тень", desc: "Штриховка" },
  { id: "ribbon", label: "Лента", desc: "Объёмный штрих" },
  { id: "web", label: "Паутина", desc: "Соединяет точки" },
  { id: "chrome", label: "Хром", desc: "Блики" },
  { id: "fur", label: "Мех", desc: "Текстура" },
  { id: "grid", label: "Сетка", desc: "Геометрия" },
];

export const SKETCH_COLORS = [
  "#111111",
  "#ef4444",
  "#f97316",
  "#eab308",
  "#22c55e",
  "#3b82f6",
  "#8b5cf6",
  "#ec4899",
];

function dist(a: SketchPoint, b: SketchPoint) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

function randOffset(amount: number) {
  return (Math.random() - 0.5) * amount * 2;
}

export function drawStroke(
  ctx: CanvasRenderingContext2D,
  stroke: SketchStroke,
  scale = 1,
) {
  const pts = stroke.points;
  if (pts.length === 0) return;

  const size = stroke.size * scale;
  const color = stroke.color;
  const opacity = stroke.opacity;

  ctx.save();
  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  switch (stroke.brush) {
    case "simple":
      drawSimpleLine(ctx, pts, color, size, opacity);
      break;
    case "sketchy":
      drawSketchy(ctx, pts, color, size, opacity);
      break;
    case "shaded":
      drawShaded(ctx, pts, color, size, opacity);
      break;
    case "ribbon":
      drawRibbon(ctx, pts, color, size, opacity);
      break;
    case "web":
      drawWeb(ctx, pts, color, size, opacity);
      break;
    case "chrome":
      drawChrome(ctx, pts, color, size, opacity);
      break;
    case "fur":
      drawFur(ctx, pts, color, size, opacity);
      break;
    case "grid":
      drawGrid(ctx, pts, color, size, opacity);
      break;
    default:
      drawSimpleLine(ctx, pts, color, size, opacity);
  }

  ctx.restore();
}

function drawSimpleLine(
  ctx: CanvasRenderingContext2D,
  pts: SketchPoint[],
  color: string,
  size: number,
  opacity: number,
) {
  if (pts.length === 1) {
    ctx.fillStyle = color;
    ctx.globalAlpha = opacity;
    ctx.beginPath();
    ctx.arc(pts[0].x, pts[0].y, size / 2, 0, Math.PI * 2);
    ctx.fill();
    return;
  }
  ctx.strokeStyle = color;
  ctx.globalAlpha = opacity;
  ctx.lineWidth = size;
  ctx.beginPath();
  ctx.moveTo(pts[0].x, pts[0].y);
  for (let i = 1; i < pts.length; i++) {
    ctx.lineTo(pts[i].x, pts[i].y);
  }
  ctx.stroke();
}

function drawSketchy(
  ctx: CanvasRenderingContext2D,
  pts: SketchPoint[],
  color: string,
  size: number,
  opacity: number,
) {
  const layers = 3;
  for (let layer = 0; layer < layers; layer++) {
    const offset = size * 0.15 * (layer - 1);
    const layerOpacity = opacity * (layer === 1 ? 1 : 0.35);
    ctx.strokeStyle = color;
    ctx.globalAlpha = layerOpacity;
    ctx.lineWidth = Math.max(1, size * (layer === 1 ? 1 : 0.6));
    ctx.beginPath();
    const start = pts[0];
    ctx.moveTo(start.x + randOffset(offset), start.y + randOffset(offset));
    for (let i = 1; i < pts.length; i++) {
      const p = pts[i];
      ctx.lineTo(p.x + randOffset(offset), p.y + randOffset(offset));
    }
    ctx.stroke();
  }
}

function drawShaded(
  ctx: CanvasRenderingContext2D,
  pts: SketchPoint[],
  color: string,
  size: number,
  opacity: number,
) {
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1];
    const b = pts[i];
    const speed = dist(a, b);
    const localOpacity = opacity * Math.min(1, 0.3 + speed / 12);
    ctx.strokeStyle = color;
    ctx.globalAlpha = localOpacity;
    ctx.lineWidth = size;
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.stroke();

    const steps = Math.min(4, Math.floor(speed / 8));
    for (let s = 0; s < steps; s++) {
      const t = (s + 1) / (steps + 1);
      const x = lerp(a.x, b.x, t) + randOffset(size * 0.2);
      const y = lerp(a.y, b.y, t) + randOffset(size * 0.2);
      ctx.globalAlpha = localOpacity * 0.4;
      ctx.lineWidth = Math.max(1, size * 0.35);
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + randOffset(size), y + randOffset(size));
      ctx.stroke();
    }
  }
}

function drawRibbon(
  ctx: CanvasRenderingContext2D,
  pts: SketchPoint[],
  color: string,
  size: number,
  opacity: number,
) {
  if (pts.length < 2) {
    drawSimpleLine(ctx, pts, color, size, opacity);
    return;
  }
  ctx.fillStyle = color;
  ctx.globalAlpha = opacity * 0.85;
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1];
    const b = pts[i];
    const angle = Math.atan2(b.y - a.y, b.x - a.x);
    const half = size * 0.55;
    const dx = Math.sin(angle) * half;
    const dy = Math.cos(angle) * half;
    ctx.beginPath();
    ctx.moveTo(a.x - dx, a.y + dy);
    ctx.lineTo(a.x + dx, a.y - dy);
    ctx.lineTo(b.x + dx, b.y - dy);
    ctx.lineTo(b.x - dx, b.y + dy);
    ctx.closePath();
    ctx.fill();
  }
}

function drawWeb(
  ctx: CanvasRenderingContext2D,
  pts: SketchPoint[],
  color: string,
  size: number,
  opacity: number,
) {
  drawSimpleLine(ctx, pts, color, size * 0.7, opacity);
  const threshold = size * 4;
  ctx.strokeStyle = color;
  ctx.globalAlpha = opacity * 0.35;
  ctx.lineWidth = Math.max(1, size * 0.25);
  for (let i = 0; i < pts.length; i++) {
    for (let j = i + 2; j < pts.length; j++) {
      if (dist(pts[i], pts[j]) < threshold) {
        ctx.beginPath();
        ctx.moveTo(pts[i].x, pts[i].y);
        ctx.lineTo(pts[j].x, pts[j].y);
        ctx.stroke();
      }
    }
  }
}

function drawChrome(
  ctx: CanvasRenderingContext2D,
  pts: SketchPoint[],
  color: string,
  size: number,
  opacity: number,
) {
  drawSimpleLine(ctx, pts, color, size, opacity * 0.9);
  ctx.strokeStyle = "#ffffff";
  ctx.globalAlpha = opacity * 0.35;
  ctx.lineWidth = Math.max(1, size * 0.25);
  ctx.beginPath();
  if (pts.length > 0) {
    ctx.moveTo(pts[0].x - size * 0.15, pts[0].y - size * 0.15);
    for (let i = 1; i < pts.length; i++) {
      ctx.lineTo(pts[i].x - size * 0.15, pts[i].y - size * 0.15);
    }
  }
  ctx.stroke();
}

function drawFur(
  ctx: CanvasRenderingContext2D,
  pts: SketchPoint[],
  color: string,
  size: number,
  opacity: number,
) {
  drawSimpleLine(ctx, pts, color, size * 0.6, opacity * 0.8);
  ctx.strokeStyle = color;
  for (let i = 0; i < pts.length; i += 2) {
    const p = pts[i];
    for (let k = 0; k < 3; k++) {
      const angle = Math.random() * Math.PI * 2;
      const len = size * (0.8 + Math.random() * 0.8);
      ctx.globalAlpha = opacity * (0.25 + Math.random() * 0.35);
      ctx.lineWidth = Math.max(1, size * 0.15);
      ctx.beginPath();
      ctx.moveTo(p.x, p.y);
      ctx.lineTo(p.x + Math.cos(angle) * len, p.y + Math.sin(angle) * len);
      ctx.stroke();
    }
  }
}

function drawGrid(
  ctx: CanvasRenderingContext2D,
  pts: SketchPoint[],
  color: string,
  size: number,
  opacity: number,
) {
  drawSimpleLine(ctx, pts, color, size * 0.5, opacity);
  const step = Math.max(6, size * 1.2);
  ctx.strokeStyle = color;
  ctx.globalAlpha = opacity * 0.3;
  ctx.lineWidth = 1;
  for (let i = 0; i < pts.length; i++) {
    const p = pts[i];
    ctx.beginPath();
    ctx.moveTo(p.x - step, p.y);
    ctx.lineTo(p.x + step, p.y);
    ctx.moveTo(p.x, p.y - step);
    ctx.lineTo(p.x, p.y + step);
    ctx.stroke();
  }
}

export function redrawSketchCanvas(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  strokes: SketchStroke[],
  backgroundColor: string,
  backgroundImage: HTMLImageElement | null,
  backgroundOpacity: number,
) {
  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = backgroundColor;
  ctx.fillRect(0, 0, width, height);

  if (backgroundImage) {
    ctx.save();
    ctx.globalAlpha = backgroundOpacity;
    const scale = Math.max(width / backgroundImage.width, height / backgroundImage.height);
    const w = backgroundImage.width * scale;
    const h = backgroundImage.height * scale;
    ctx.drawImage(backgroundImage, (width - w) / 2, (height - h) / 2, w, h);
    ctx.restore();
  }

  for (const stroke of strokes) {
    drawStroke(ctx, stroke);
  }
}

export function canvasHasContent(strokes: SketchStroke[]): boolean {
  return strokes.some((s) => s.points.length > 0 && s.brush !== "simple" || s.points.length > 1);
}

export function exportCanvasPNG(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error("Не удалось экспортировать холст"));
      },
      "image/png",
      1,
    );
  });
}

export function aspectRatioToSize(
  ratio: string,
  maxSide: number,
): { width: number; height: number } {
  switch (ratio) {
    case "9:16":
      return { width: Math.round(maxSide * 0.5625), height: maxSide };
    case "4:5":
      return { width: Math.round(maxSide * 0.8), height: maxSide };
    case "16:9":
      return { width: maxSide, height: Math.round(maxSide * 0.5625) };
    default:
      return { width: maxSide, height: maxSide };
  }
}
