/**
 * Harmony-style procedural brushes (ported from mrdoob/harmony).
 * Each brush draws incrementally on pointer move — not via stroke replay.
 */

export type SketchBrushId =
  | "simple"
  | "sketchy"
  | "shaded"
  | "ribbon"
  | "web"
  | "chrome"
  | "fur"
  | "grid";

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

type RGB = [number, number, number];

export interface HarmonyBrush {
  strokeStart(x: number, y: number): void;
  stroke(x: number, y: number): void;
  strokeEnd(): void;
  destroy(): void;
}

export interface HarmonyBrushSettings {
  color: RGB;
  size: number;
  pressure: number;
  canvasWidth: number;
  canvasHeight: number;
}

function rgba(color: RGB, alpha: number, pressure: number) {
  return `rgba(${color[0]}, ${color[1]}, ${color[2]}, ${alpha * pressure})`;
}

function isWebKit() {
  if (typeof navigator === "undefined") return false;
  return / AppleWebKit\//.test(navigator.userAgent);
}

class SimpleBrush implements HarmonyBrush {
  private points: { x: number; y: number }[] = [];
  private snapshot: ImageData | null = null;

  constructor(
    private ctx: CanvasRenderingContext2D,
    private settings: HarmonyBrushSettings,
  ) {
    ctx.globalCompositeOperation = "source-over";
  }

  strokeStart(x: number, y: number) {
    this.points = [{ x, y }];
    this.snapshot = this.ctx.getImageData(
      0,
      0,
      this.ctx.canvas.width,
      this.ctx.canvas.height,
    );
  }

  stroke(x: number, y: number) {
    if (!this.snapshot) return;
    const { ctx, settings } = this;
    this.points.push({ x, y });
    ctx.putImageData(this.snapshot, 0, 0);
    ctx.lineWidth = settings.size;
    ctx.lineCap = settings.size === 1 ? "butt" : "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = rgba(settings.color, 0.5, settings.pressure);
    ctx.beginPath();
    ctx.moveTo(this.points[0].x, this.points[0].y);
    for (let i = 1; i < this.points.length; i++) {
      ctx.lineTo(this.points[i].x, this.points[i].y);
    }
    ctx.stroke();
  }

  strokeEnd() {
    this.points = [];
    this.snapshot = null;
  }

  destroy() {}
}

abstract class PointsBrushBase implements HarmonyBrush {
  protected prevX = 0;
  protected prevY = 0;
  protected points: [number, number][] = [];
  protected count = 0;

  constructor(
    protected ctx: CanvasRenderingContext2D,
    protected settings: HarmonyBrushSettings,
  ) {
    ctx.globalCompositeOperation = "source-over";
  }

  strokeStart(x: number, y: number) {
    this.prevX = x;
    this.prevY = y;
    this.points = [];
    this.count = 0;
  }

  abstract stroke(x: number, y: number): void;

  strokeEnd() {}

  destroy() {}
}

class SketchyBrush extends PointsBrushBase {
  stroke(x: number, y: number) {
    const { ctx, settings } = this;
    this.points.push([x, y]);
    ctx.lineWidth = settings.size;
    ctx.strokeStyle = rgba(settings.color, 0.05, settings.pressure);
    ctx.beginPath();
    ctx.moveTo(this.prevX, this.prevY);
    ctx.lineTo(x, y);
    ctx.stroke();

    for (let i = 0; i < this.points.length; i++) {
      const dx = this.points[i][0] - this.points[this.count][0];
      const dy = this.points[i][1] - this.points[this.count][1];
      const d = dx * dx + dy * dy;
      if (d < 4000 && Math.random() > d / 2000) {
        ctx.beginPath();
        ctx.moveTo(
          this.points[this.count][0] + dx * 0.3,
          this.points[this.count][1] + dy * 0.3,
        );
        ctx.lineTo(this.points[i][0] - dx * 0.3, this.points[i][1] - dy * 0.3);
        ctx.stroke();
      }
    }

    this.prevX = x;
    this.prevY = y;
    this.count++;
  }
}

class ShadedBrush extends PointsBrushBase {
  stroke(x: number, y: number) {
    const { ctx, settings } = this;
    this.points.push([x, y]);
    ctx.lineWidth = settings.size;

    for (let i = 0; i < this.points.length; i++) {
      const dx = this.points[i][0] - this.points[this.count][0];
      const dy = this.points[i][1] - this.points[this.count][1];
      const d = dx * dx + dy * dy;
      if (d < 1000) {
        ctx.strokeStyle = rgba(
          settings.color,
          (1 - d / 1000) * 0.1,
          settings.pressure,
        );
        ctx.beginPath();
        ctx.moveTo(this.points[this.count][0], this.points[this.count][1]);
        ctx.lineTo(this.points[i][0], this.points[i][1]);
        ctx.stroke();
      }
    }

    this.prevX = x;
    this.prevY = y;
    this.count++;
  }
}

class WebBrush extends PointsBrushBase {
  stroke(x: number, y: number) {
    const { ctx, settings } = this;
    this.points.push([x, y]);
    ctx.lineWidth = settings.size;
    ctx.strokeStyle = rgba(settings.color, 0.5, settings.pressure);
    ctx.beginPath();
    ctx.moveTo(this.prevX, this.prevY);
    ctx.lineTo(x, y);
    ctx.stroke();

    ctx.strokeStyle = rgba(settings.color, 0.1, settings.pressure);
    for (let i = 0; i < this.points.length; i++) {
      const dx = this.points[i][0] - this.points[this.count][0];
      const dy = this.points[i][1] - this.points[this.count][1];
      const d = dx * dx + dy * dy;
      if (d < 2500 && Math.random() > 0.9) {
        ctx.beginPath();
        ctx.moveTo(this.points[this.count][0], this.points[this.count][1]);
        ctx.lineTo(this.points[i][0], this.points[i][1]);
        ctx.stroke();
      }
    }

    this.prevX = x;
    this.prevY = y;
    this.count++;
  }
}

class ChromeBrush extends PointsBrushBase {
  constructor(ctx: CanvasRenderingContext2D, settings: HarmonyBrushSettings) {
    super(ctx, settings);
    if (isWebKit()) {
      ctx.globalCompositeOperation = "darker";
    }
  }

  stroke(x: number, y: number) {
    const { ctx, settings } = this;
    this.points.push([x, y]);
    ctx.lineWidth = settings.size;
    ctx.strokeStyle = rgba(settings.color, 0.1, settings.pressure);
    ctx.beginPath();
    ctx.moveTo(this.prevX, this.prevY);
    ctx.lineTo(x, y);
    ctx.stroke();

    for (let i = 0; i < this.points.length; i++) {
      const dx = this.points[i][0] - this.points[this.count][0];
      const dy = this.points[i][1] - this.points[this.count][1];
      const d = dx * dx + dy * dy;
      if (d < 1000) {
        ctx.strokeStyle = rgba(
          [
            Math.floor(Math.random() * settings.color[0]),
            Math.floor(Math.random() * settings.color[1]),
            Math.floor(Math.random() * settings.color[2]),
          ],
          0.1,
          settings.pressure,
        );
        ctx.beginPath();
        ctx.moveTo(
          this.points[this.count][0] + dx * 0.2,
          this.points[this.count][1] + dy * 0.2,
        );
        ctx.lineTo(this.points[i][0] - dx * 0.2, this.points[i][1] - dy * 0.2);
        ctx.stroke();
      }
    }

    this.prevX = x;
    this.prevY = y;
    this.count++;
  }
}

class FurBrush extends PointsBrushBase {
  stroke(x: number, y: number) {
    const { ctx, settings } = this;
    this.points.push([x, y]);
    ctx.lineWidth = settings.size;
    ctx.strokeStyle = rgba(settings.color, 0.1, settings.pressure);
    ctx.beginPath();
    ctx.moveTo(this.prevX, this.prevY);
    ctx.lineTo(x, y);
    ctx.stroke();

    for (let i = 0; i < this.points.length; i++) {
      const dx = this.points[i][0] - this.points[this.count][0];
      const dy = this.points[i][1] - this.points[this.count][1];
      const d = dx * dx + dy * dy;
      if (d < 2000 && Math.random() > d / 2000) {
        ctx.beginPath();
        ctx.moveTo(x + dx * 0.5, y + dy * 0.5);
        ctx.lineTo(x - dx * 0.5, y - dy * 0.5);
        ctx.stroke();
      }
    }

    this.prevX = x;
    this.prevY = y;
    this.count++;
  }
}

class GridBrush implements HarmonyBrush {
  constructor(
    private ctx: CanvasRenderingContext2D,
    private settings: HarmonyBrushSettings,
  ) {
    if (isWebKit()) {
      ctx.globalCompositeOperation = "darker";
    }
  }

  strokeStart() {}
  strokeEnd() {}

  stroke(x: number, y: number) {
    const { ctx, settings } = this;
    const cx = Math.round(x / 100) * 100;
    const cy = Math.round(y / 100) * 100;
    const dx = (cx - x) * 10;
    const dy = (cy - y) * 10;
    ctx.lineWidth = settings.size;
    ctx.strokeStyle = rgba(settings.color, 0.01, settings.pressure);
    for (let i = 0; i < 50; i++) {
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.quadraticCurveTo(
        x + Math.random() * dx,
        y + Math.random() * dy,
        cx,
        cy,
      );
      ctx.stroke();
    }
  }

  destroy() {}
}

class RibbonBrush implements HarmonyBrush {
  private mouseX: number;
  private mouseY: number;
  private painters: {
    dx: number;
    dy: number;
    ax: number;
    ay: number;
    div: number;
    ease: number;
  }[];
  private interval: ReturnType<typeof setInterval> | null = null;

  constructor(
    private ctx: CanvasRenderingContext2D,
    private settings: HarmonyBrushSettings,
  ) {
    ctx.globalCompositeOperation = "source-over";
    const { canvasWidth, canvasHeight } = settings;
    this.mouseX = canvasWidth / 2;
    this.mouseY = canvasHeight / 2;
    this.painters = Array.from({ length: 50 }, () => ({
      dx: canvasWidth / 2,
      dy: canvasHeight / 2,
      ax: 0,
      ay: 0,
      div: 0.1,
      ease: Math.random() * 0.2 + 0.6,
    }));

    this.interval = setInterval(() => this.tick(), 1000 / 60);
  }

  private tick() {
    const { ctx, settings } = this;
    ctx.lineWidth = settings.size;
    ctx.strokeStyle = rgba(settings.color, 0.05, settings.pressure);
    for (const p of this.painters) {
      ctx.beginPath();
      ctx.moveTo(p.dx, p.dy);
      p.ax = (p.ax + (p.dx - this.mouseX) * p.div) * p.ease;
      p.ay = (p.ay + (p.dy - this.mouseY) * p.div) * p.ease;
      p.dx -= p.ax;
      p.dy -= p.ay;
      ctx.lineTo(p.dx, p.dy);
      ctx.stroke();
    }
  }

  strokeStart(x: number, y: number) {
    this.mouseX = x;
    this.mouseY = y;
    for (const p of this.painters) {
      p.dx = x;
      p.dy = y;
    }
  }

  stroke(x: number, y: number) {
    this.mouseX = x;
    this.mouseY = y;
  }

  strokeEnd() {}

  destroy() {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
  }
}

export function parseSketchColor(hex: string): RGB {
  const h = hex.replace("#", "");
  if (h.length === 3) {
    return [
      parseInt(h[0] + h[0], 16),
      parseInt(h[1] + h[1], 16),
      parseInt(h[2] + h[2], 16),
    ];
  }
  return [
    parseInt(h.slice(0, 2), 16),
    parseInt(h.slice(2, 4), 16),
    parseInt(h.slice(4, 6), 16),
  ];
}

export function createHarmonyBrush(
  id: SketchBrushId,
  ctx: CanvasRenderingContext2D,
  settings: HarmonyBrushSettings,
): HarmonyBrush {
  switch (id) {
    case "simple":
      return new SimpleBrush(ctx, settings);
    case "sketchy":
      return new SketchyBrush(ctx, settings);
    case "shaded":
      return new ShadedBrush(ctx, settings);
    case "web":
      return new WebBrush(ctx, settings);
    case "chrome":
      return new ChromeBrush(ctx, settings);
    case "fur":
      return new FurBrush(ctx, settings);
    case "grid":
      return new GridBrush(ctx, settings);
    case "ribbon":
      return new RibbonBrush(ctx, settings);
    default:
      return new SimpleBrush(ctx, settings);
  }
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
