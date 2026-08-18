export function computeSketchDisplaySize(
  width: number,
  height: number,
  maxHeight: number,
  maxWidth?: number,
): { width: number; height: number } {
  let w = width;
  let h = height;
  if (h > maxHeight) {
    const scale = maxHeight / h;
    h = maxHeight;
    w = Math.round(width * scale);
  }
  if (maxWidth !== undefined && w > maxWidth) {
    const scale = maxWidth / w;
    w = maxWidth;
    h = Math.round(h * scale);
  }
  return { width: Math.max(1, w), height: Math.max(1, h) };
}

export function sketchCanvasMaxHeight(windowHeight: number): number {
  return Math.max(280, windowHeight - 224);
}
