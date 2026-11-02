/**
 * Client-side Image Cropper & WebP Optimizer configuration and canvas export logic (US-11).
 * Enforces locked aspect ratios:
 * - result / testimonial: 1:1 (max 800x800)
 * - founder: 4:5 (max 960x1200)
 * - gallery / banner: 16:9 (max 1920x1080)
 * Exports compressed WebP at quality 0.8.
 */

export type CropKind = "result" | "testimonial" | "founder" | "gallery" | "banner";

export interface CropPreset {
  kind: CropKind;
  aspect: number;
  aspectLabel: string;
  maxWidth: number;
  maxHeight: number;
  quality: number;
  mimeType: "image/webp";
  locked: true;
}

export const MAX_SOURCE_FILE_BYTES = 15 * 1024 * 1024; // 15 MB (AC-11.5)
export const WEBP_EXPORT_QUALITY = 0.8; // (AC-11.3)

export const CROP_PRESETS: Record<CropKind, CropPreset> = {
  result: {
    kind: "result",
    aspect: 1.0,
    aspectLabel: "1:1",
    maxWidth: 800,
    maxHeight: 800,
    quality: WEBP_EXPORT_QUALITY,
    mimeType: "image/webp",
    locked: true,
  },
  testimonial: {
    kind: "testimonial",
    aspect: 1.0,
    aspectLabel: "1:1",
    maxWidth: 800,
    maxHeight: 800,
    quality: WEBP_EXPORT_QUALITY,
    mimeType: "image/webp",
    locked: true,
  },
  founder: {
    kind: "founder",
    aspect: 4 / 5,
    aspectLabel: "4:5",
    maxWidth: 960,
    maxHeight: 1200,
    quality: WEBP_EXPORT_QUALITY,
    mimeType: "image/webp",
    locked: true,
  },
  gallery: {
    kind: "gallery",
    aspect: 16 / 9,
    aspectLabel: "16:9",
    maxWidth: 1920,
    maxHeight: 1080,
    quality: WEBP_EXPORT_QUALITY,
    mimeType: "image/webp",
    locked: true,
  },
  banner: {
    kind: "banner",
    aspect: 16 / 9,
    aspectLabel: "16:9",
    maxWidth: 1920,
    maxHeight: 1080,
    quality: WEBP_EXPORT_QUALITY,
    mimeType: "image/webp",
    locked: true,
  },
};

export function getLockedPreset(kind: CropKind): CropPreset {
  const preset = CROP_PRESETS[kind];
  if (!preset) {
    throw new Error(`Unknown crop kind: ${kind}`);
  }
  return preset;
}

export function validateSourceImageFile(file: { size: number; name?: string; type?: string }): void {
  if (!file || typeof file.size !== "number" || file.size <= 0) {
    throw new Error("Please select a valid photo file.");
  }
  if (file.size > MAX_SOURCE_FILE_BYTES) {
    throw new Error("Photo too large (maximum 15 MB allowed before cropping).");
  }
}

export function computeOutputDimensions(
  kind: CropKind,
  requestedWidth?: number
): { width: number; height: number; aspect: number; mimeType: "image/webp"; quality: number } {
  const preset = getLockedPreset(kind);
  const targetW =
    requestedWidth && requestedWidth > 0
      ? Math.min(Math.round(requestedWidth), preset.maxWidth)
      : preset.maxWidth;
  const targetH = Math.min(Math.round(targetW / preset.aspect), preset.maxHeight);
  const adjustedW = Math.round(targetH * preset.aspect);
  return {
    width: adjustedW,
    height: targetH,
    aspect: preset.aspect,
    mimeType: preset.mimeType,
    quality: preset.quality,
  };
}

export interface CropTransformState {
  zoom: number;
  offsetX: number; // -100 to 100 percentage pan
  offsetY: number; // -100 to 100 percentage pan
  rotation: number; // multiples of 90 degrees
}

export async function exportCroppedWebp(
  img: HTMLImageElement,
  kind: CropKind,
  transform: CropTransformState
): Promise<Blob> {
  const dims = computeOutputDimensions(kind);
  const canvas = document.createElement("canvas");
  canvas.width = dims.width;
  canvas.height = dims.height;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("Canvas 2D context unavailable.");
  }

  ctx.fillStyle = "#0f172a";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.save();
  ctx.translate(canvas.width / 2, canvas.height / 2);
  const rad = ((transform.rotation % 360) * Math.PI) / 180;
  ctx.rotate(rad);

  const zoom = Math.max(1, Math.min(4, transform.zoom || 1));
  const natW = img.naturalWidth || img.width || dims.width;
  const natH = img.naturalHeight || img.height || dims.height;
  const baseScale = Math.max(canvas.width / natW, canvas.height / natH);
  const drawW = natW * baseScale * zoom;
  const drawH = natH * baseScale * zoom;
  const panX = ((transform.offsetX || 0) / 100) * (drawW - canvas.width) * 0.5;
  const panY = ((transform.offsetY || 0) / 100) * (drawH - canvas.height) * 0.5;

  ctx.drawImage(img, -drawW / 2 + panX, -drawH / 2 + panY, drawW, drawH);
  ctx.restore();

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error("Failed to export cropped WebP image."));
          return;
        }
        resolve(blob);
      },
      "image/webp",
      WEBP_EXPORT_QUALITY
    );
  });
}
