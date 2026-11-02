# CR-0004: Universal High-Resolution Photo Upload Support & Premium Navy/Gold Visual Restyle

- **Card:** [#7 Shikshanama (शिक्षाNama) Official Website & Admin CMS](https://github.com/akkiverse/product-think-tank/issues/7)
- **Author:** Product Think Tank Coding Agent
- **Date:** 2026-11-02
- **Status:** Proposed

## Why

1. When uploading high-resolution photos in Admin CMS, users were restricted by strict client and server WebP-only guards and hit `Image exceeds the 1 MB WebP limit.` or `Image must be in WebP format (.webp) exported by the built-in cropper.`
2. The website visual identity needed a complete premium, trustworthy upgrade for parents and students in West Patel Nagar, replacing the purple/neon gradients with a distinguished Navy and Muted Gold design system, custom typography, brand favicons, and OpenGraph assets.

## Scope

1. **Universal Image Format & High-Res Source Acceptance:**
   - Both client cropper (`src/cropper.ts`) and backend (`app/imaging.py`, `app/main.py`) accept any standard image format (JPEG, PNG, WebP, HEIC/HEIF) up to 25 MB.
   - Automatically transposes EXIF orientation (fixing rotated mobile uploads) and converts uploaded images to high-quality WebP server-side.
   - Preserves strict aspect ratio requirements (`1:1` for results/testimonials, `4:5` for founders, `16:9` for gallery/banners).
2. **Adaptive Cropper & Controls:**
   - Client-side pointer drag-to-pan, zoom slider (1x to 4x), 90° rotation, and visual framing boundaries.
   - Automatic canvas export to WebP with adaptive quality stepping.
3. **Design System & Navy/Muted Gold Visual Restyle:**
   - Centralized CSS variable tokens in `src/styles.css` (`#0B2545`, `#C9A227`, `#F8F6F1`, `#FFFFFF`, `#0A1424`, `#111E33`).
   - Removed all purple gradients and blurred neon glows; applied solid primary buttons, subtle shadows, and gold top-border accents on trust counter cards.
   - Google Fonts loaded with `font-display: swap`: Playfair Display & Poppins for headings, DM Sans for body text, and Noto Sans Devanagari for "शिक्षा" in the brand logo.
   - Favicons and brand assets generated in `public/`: `favicon.ico`, `favicon.svg`, `favicon-16x16.png`, `favicon-32x32.png`, `apple-touch-icon.png`, `android-chrome-192x192.png`, `android-chrome-512x512.png`, `site.webmanifest`, and `og-image.jpg` (1200x630).
   - Responsive and accessible in both Light and Dark themes with WCAG AA compliance.

## Acceptance Criteria Added / Modified

- `AC-11.4`: Server accepts any decodable image format (JPEG, PNG, WebP) up to 25 MB and converts to WebP with aspect ratio enforcement.
- `AC-11.5`: Client-side cropper accepts source files up to 25 MB before cropping without format restriction.
- `AC-11.8`: Client-side export applies adaptive quality stepping and provides pointer drag-and-pan framing controls.
- `AC-24.1`: Navy & Muted Gold theme token system implemented across Light & Dark modes without hard-coded colors or purple glows.
- `AC-24.2`: Full favicon, apple-touch-icon, webmanifest, and 1200x630 OpenGraph assets generated and linked.
