export const SKETCH_THUMB_SIZE = 128;

const THUMB_MAX = SKETCH_THUMB_SIZE;

export function createSketchThumbnail(dataUrl: string, maxSize = THUMB_MAX): Promise<string> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => {
      const scale = Math.min(maxSize / image.width, maxSize / image.height, 1);
      const width = Math.max(1, Math.round(image.width * scale));
      const height = Math.max(1, Math.round(image.height * scale));
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("Не удалось создать превью"));
        return;
      }
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, width, height);
      ctx.drawImage(image, 0, 0, width, height);
      resolve(canvas.toDataURL("image/jpeg", 0.82));
    };
    image.onerror = () => reject(new Error("Не удалось создать превью"));
    image.src = dataUrl;
  });
}

export function sketchThumbnailSrc(item: { thumbnailDataUrl?: string; dataUrl: string }) {
  return item.thumbnailDataUrl || item.dataUrl;
}
