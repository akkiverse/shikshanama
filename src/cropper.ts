/**
 * Client-side Image Cropper configuration and canvas export logic (US-11).
 * Supports any source format (JPEG, PNG, WebP, HEIC) up to 25 MB.
 * Automatically exports optimized WebP for web delivery with fallback to JPEG.
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

export const MAX_SOURCE_FILE_BYTES = 25 * 1024 * 1024; // Up to 25 MB
export const WEBP_EXPORT_QUALITY = 0.85;
export const DEFAULT_EXPORT_QUALITY = 0.85;

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
    throw new Error("Photo too large (maximum 25 MB allowed).");
  }
}

export function computeOutputDimensions(
  kind: CropKind,
  requestedWidth?: number
): { width: number; height: number; aspect: number; quality: number; mimeType: "image/webp" } {
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
    quality: preset.quality,
    mimeType: "image/webp",
  };
}

export interface CropTransformState {
  zoom: number;
  offsetX: number;
  offsetY: number;
  rotation: number;
}

/**
 * Exports cropped image blob. Attempts WebP export with quality stepping;
 * if WebP is unsupported or fails, falls back gracefully to JPEG.
 */
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

  // Pure white/neutral background
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.save();
  ctx.translate(canvas.width / 2, canvas.height / 2);
  const rad = ((transform.rotation % 360) * Math.PI) / 180;
  ctx.rotate(rad);

  const zoom = Math.max(1, Math.min(5, transform.zoom || 1));
  const natW = img.naturalWidth || img.width || dims.width;
  const natH = img.naturalHeight || img.height || dims.height;
  
  const baseScale = Math.max(canvas.width / natW, canvas.height / natH);
  const drawW = natW * baseScale * zoom;
  const drawH = natH * baseScale * zoom;

  const panX = transform.offsetX || 0;
  const panY = transform.offsetY || 0;

  ctx.drawImage(img, -drawW / 2 + panX, -drawH / 2 + panY, drawW, drawH);
  ctx.restore();

  // Try exporting as WebP first, fallback to JPEG if browser doesn't produce valid WebP
  const formats: { type: string; ext: string }[] = [
    { type: "image/webp", ext: "webp" },
    { type: "image/jpeg", ext: "jpg" },
  ];

  for (const fmt of formats) {
    for (const q of [0.85, 0.78, 0.70]) {
      const b = await new Promise<Blob | null>((resolve) => {
        canvas.toBlob((blob) => resolve(blob), fmt.type, q);
      });
      if (b && b.size > 0 && b.size <= 8_000_000) {
        return b;
      }
    }
  }

  throw new Error("Failed to process cropped photo.");
}
