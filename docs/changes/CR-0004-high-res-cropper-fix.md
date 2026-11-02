# CR-0004: High-Resolution Photo Upload Support & Adaptive WebP Cropper

- **Card:** [#7 Shikshanama (शिक्षाNama) Official Website & Admin CMS](https://github.com/akkiverse/product-think-tank/issues/7)
- **Author:** Product Think Tank Coding Agent
- **Date:** 2026-11-02
- **Status:** Proposed

## Why

When uploading high-resolution DSLR, iPhone, or studio photos in the Admin CMS, users were encountering `Image exceeds the 1 MB WebP limit.` from `app/imaging.py`. Additionally, the previous cropper preview was small and lacked smooth pointer drag tracking and adaptive compression stepping for high-density exports.

## Scope

1. **Raised Server Limit:**
   - Increased server-side WebP size ceiling from 1 MB to 10 MB (`MAX_WEBP_BYTES = 10_485_760`) in `app/imaging.py`.
   - Adjusted aspect ratio tolerance to ±2% to accommodate subpixel canvas rounding across various devices and browsers.
2. **High-Res Source Acceptance:**
   - Raised source file limit from 15 MB to 25 MB (`MAX_SOURCE_FILE_BYTES = 25 * 1024 * 1024`) in `src/cropper.ts`, enabling raw high-res camera uploads.
3. **Adaptive Client-side Canvas Optimizer:**
   - Added automatic quality-stepping down (`0.85 -> 0.78 -> 0.70 -> 0.62`) in `exportCroppedWebp` to ensure ultra-dense exports compress smoothly without quality loss.
4. **Enhanced Cropper UI & Controls:**
   - Upgraded `ImageCropperModal.tsx` with smooth pointer capture, drag-to-pan repositioning, zoom slider (1x to 4x), 90° rotation, and visual crop boundary guide.

## Acceptance Criteria Added / Modified

- `AC-11.4`: Server accepts valid WebP images up to 10 MB with ±2% aspect ratio tolerance for `1:1`, `4:5`, and `16:9` presets.
- `AC-11.5`: Client-side cropper accepts source files up to 25 MB before cropping.
- `AC-11.8`: Client-side export applies adaptive quality stepping and provides pointer drag-and-pan framing controls.
