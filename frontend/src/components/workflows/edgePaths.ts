export type EdgeStyle = "orthogonal" | "smooth";

export const EDGE_STYLE_STORAGE_KEY = "postilka.workflow.edgeStyle";

export type EdgePoint = { x: number; y: number };

function almostEqual(a: number, b: number, eps = 1.5): boolean {
  return Math.abs(a - b) < eps;
}

function collapsePoints(points: EdgePoint[]): EdgePoint[] {
  const out: EdgePoint[] = [];
  points.forEach((point) => {
    const prev = out[out.length - 1];
    if (!prev || !almostEqual(prev.x, point.x) || !almostEqual(prev.y, point.y)) {
      out.push(point);
    }
  });
  return out;
}

function polylineMidpoint(points: EdgePoint[]): EdgePoint {
  if (points.length === 0) return { x: 0, y: 0 };
  if (points.length === 1) return points[0];

  const lengths: number[] = [];
  let total = 0;
  for (let i = 0; i < points.length - 1; i++) {
    const len = Math.hypot(
      points[i + 1].x - points[i].x,
      points[i + 1].y - points[i].y
    );
    lengths.push(len);
    total += len;
  }
  if (total === 0) return points[0];

  let remain = total / 2;
  for (let i = 0; i < points.length - 1; i++) {
    if (remain <= lengths[i] || i === points.length - 2) {
      const t = lengths[i] === 0 ? 0 : remain / lengths[i];
      return {
        x: points[i].x + (points[i + 1].x - points[i].x) * t,
        y: points[i].y + (points[i + 1].y - points[i].y) * t,
      };
    }
    remain -= lengths[i];
  }
  return points[points.length - 1];
}

function roundedOrthogonalSvg(points: EdgePoint[], radius = 12): string {
  const pts = collapsePoints(points);
  if (pts.length === 0) return "";
  if (pts.length === 1) return `M ${pts[0].x} ${pts[0].y}`;
  if (pts.length === 2) {
    return `M ${pts[0].x} ${pts[0].y} L ${pts[1].x} ${pts[1].y}`;
  }

  let d = `M ${pts[0].x} ${pts[0].y}`;
  for (let i = 1; i < pts.length - 1; i++) {
    const prev = pts[i - 1];
    const curr = pts[i];
    const next = pts[i + 1];
    const inX = curr.x - prev.x;
    const inY = curr.y - prev.y;
    const outX = next.x - curr.x;
    const outY = next.y - curr.y;
    const inLen = Math.hypot(inX, inY);
    const outLen = Math.hypot(outX, outY);
    if (inLen < 0.01 || outLen < 0.01) continue;

    const r = Math.min(radius, inLen / 2, outLen / 2);
    const x1 = curr.x - (inX / inLen) * r;
    const y1 = curr.y - (inY / inLen) * r;
    const x2 = curr.x + (outX / outLen) * r;
    const y2 = curr.y + (outY / outLen) * r;
    d += ` L ${x1} ${y1} Q ${curr.x} ${curr.y} ${x2} ${y2}`;
  }
  const last = pts[pts.length - 1];
  d += ` L ${last.x} ${last.y}`;
  return d;
}

function routeOrthogonal(
  p1: EdgePoint,
  p2: EdgePoint,
  stub = 28
): EdgePoint[] {
  const { x: x1, y: y1 } = p1;
  const { x: x2, y: y2 } = p2;
  const sameRow = almostEqual(y1, y2, 3);

  if (sameRow && x2 >= x1 + 8) {
    return [p1, p2];
  }

  if (x2 >= x1 + stub * 2) {
    const midX = (x1 + x2) / 2;
    return [
      { x: x1, y: y1 },
      { x: midX, y: y1 },
      { x: midX, y: y2 },
      { x: x2, y: y2 },
    ];
  }

  const dir = sameRow ? (y2 >= y1 ? 1 : -1) : Math.sign(y2 - y1) || 1;
  const midY = sameRow ? y1 + dir * 48 : (y1 + y2) / 2;
  return [
    { x: x1, y: y1 },
    { x: x1 + stub, y: y1 },
    { x: x1 + stub, y: midY },
    { x: x2 - stub, y: midY },
    { x: x2 - stub, y: y2 },
    { x: x2, y: y2 },
  ];
}

export function buildSmoothPath(
  p1: EdgePoint,
  p2: EdgePoint
): { d: string; mid: EdgePoint } {
  const dx = Math.max(Math.abs(p2.x - p1.x) * 0.42, 32);
  const c1x = p1.x + dx;
  const c1y = p1.y;
  const c2x = p2.x - dx;
  const c2y = p2.y;
  return {
    d: `M ${p1.x} ${p1.y} C ${c1x} ${c1y}, ${c2x} ${c2y}, ${p2.x} ${p2.y}`,
    mid: {
      x: 0.125 * p1.x + 0.375 * c1x + 0.375 * c2x + 0.125 * p2.x,
      y: 0.125 * p1.y + 0.375 * c1y + 0.375 * c2y + 0.125 * p2.y,
    },
  };
}

export function buildOrthogonalPath(
  p1: EdgePoint,
  p2: EdgePoint
): { d: string; mid: EdgePoint } {
  const points = routeOrthogonal(p1, p2);
  return {
    d: roundedOrthogonalSvg(points, 14),
    mid: polylineMidpoint(points),
  };
}

export function buildEdgePath(
  style: EdgeStyle,
  p1: EdgePoint,
  p2: EdgePoint
): { d: string; mid: EdgePoint } {
  return style === "smooth" ? buildSmoothPath(p1, p2) : buildOrthogonalPath(p1, p2);
}
