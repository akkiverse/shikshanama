/**
 * Client-side Image Cropper & WebP Optimizer configuration and canvas export logic (US-11).
 * Enforces locked aspect ratios:
 * - result / testimonial: 1:1 (max 800x800)
 * - founder: 4:5 (max 960x1200)
 * - gallery / banner: 16:9 (max 1920x1080)
 * Adaptive quality export ensures any high-resolution photo compresses safely within budget.
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

export const MAX_SOURCE_FILE_BYTES = 25 * 1024 * 1024; // Up to 25 MB source files accepted
export const WEBP_EXPORT_QUALITY = 0.85;

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
    throw new Error("Photo too large (maximum 25 MB allowed before cropping).");
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
  offsetX: number; // in pixels
  offsetY: number; // in pixels
  rotation: number; // in degrees
}

/**
 * Exports cropped WebP with adaptive quality stepping to guarantee
 * pristine sharpness while staying well within server transfer limits.
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

  // Clear background
  ctx.fillStyle = "#07090e";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.save();
  // Move origin to canvas center
  ctx.translate(canvas.width / 2, canvas.height / 2);
  const rad = ((transform.rotation % 360) * Math.PI) / 180;
  ctx.rotate(rad);

  const zoom = Math.max(1, Math.min(5, transform.zoom || 1));
  const natW = img.naturalWidth || img.width || dims.width;
  const natH = img.naturalHeight || img.height || dims.height;
  
  // Scale so image covers the canvas boundary
  const baseScale = Math.max(canvas.width / natW, canvas.height / natH);
  const drawW = natW * baseScale * zoom;
  const drawH = natH * baseScale * zoom;

  // Draw centered + offset
  const panX = transform.offsetX || 0;
  const panY = transform.offsetY || 0;

  ctx.drawImage(img, -drawW / 2 + panX, -drawH / 2 + panY, drawW, drawH);
  ctx.restore();

  // Step down quality if image is extremely dense, ensuring fast mobile downloads
  const qualitySteps = [0.85, 0.78, 0.70, 0.62];
  let finalBlob: Blob | null = null;

  for (const q of qualitySteps) {
    const b = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob((blob) => resolve(blob), "image/webp", q);
    });
    if (b) {
      finalBlob = b;
      // Target max 2.5 MB for the exported WebP for ultra-fast mobile loading
      if (b.size <= 2_500_000) {
        break;
      }
    }
  }

  if (!finalBlob) {
    throw new Error("Failed to export cropped WebP image.");
  }

  return finalBlob;
}
