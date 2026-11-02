import { describe, expect, it } from "vitest";
import {
  CROP_PRESETS,
  MAX_SOURCE_FILE_BYTES,
  WEBP_EXPORT_QUALITY,
  computeOutputDimensions,
  getLockedPreset,
  validateSourceImageFile,
} from "../cropper";

describe("US-11 Client-side Image Cropper & WebP Optimizer", () => {
  it("AC-11.1 & AC-11.2 locks aspect ratios per image type (1:1, 4:5, 16:9)", () => {
    expect(getLockedPreset("result").aspect).toBeCloseTo(1.0, 4);
    expect(getLockedPreset("result").locked).toBe(true);
    expect(getLockedPreset("testimonial").aspect).toBeCloseTo(1.0, 4);
    expect(getLockedPreset("founder").aspect).toBeCloseTo(4 / 5, 4);
    expect(getLockedPreset("gallery").aspect).toBeCloseTo(16 / 9, 4);
    expect(getLockedPreset("banner").aspect).toBeCloseTo(16 / 9, 4);
  });

  it("AC-11.3 exports WebP at quality 0.85 and resizes within 800x800, 960x1200, and 1920x1080", () => {
    expect(WEBP_EXPORT_QUALITY).toBe(0.85);

    const resDims = computeOutputDimensions("result", 2400);
    expect(resDims.width).toBe(800);
    expect(resDims.height).toBe(800);
    expect(resDims.mimeType).toBe("image/webp");

    const founderDims = computeOutputDimensions("founder", 2000);
    expect(founderDims.width).toBe(960);
    expect(founderDims.height).toBe(1200);

    const galleryDims = computeOutputDimensions("gallery", 3840);
    expect(galleryDims.width).toBe(1920);
    expect(galleryDims.height).toBe(1080);
  });

  it("AC-11.5 accepts source files up to 25 MB and rejects larger files with 'Photo too large'", () => {
    expect(() => validateSourceImageFile({ size: 2 * 1024 * 1024, name: "student.jpg" })).not.toThrow();
    expect(() => validateSourceImageFile({ size: MAX_SOURCE_FILE_BYTES, name: "max.png" })).not.toThrow();
    expect(() => validateSourceImageFile({ size: MAX_SOURCE_FILE_BYTES + 1024, name: "huge.png" })).toThrow(
      /Photo too large/i
    );
  });

  it("AC-11.7 provides presets for mobile & desktop touch/pinch card preview", () => {
    for (const kind of Object.keys(CROP_PRESETS) as Array<keyof typeof CROP_PRESETS>) {
      const preset = CROP_PRESETS[kind];
      expect(preset.mimeType).toBe("image/webp");
      expect(preset.quality).toBe(0.85);
      expect(preset.locked).toBe(true);
    }
  });
});
