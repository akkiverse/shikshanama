# ADR-0001: React + Vite Frontend with FastAPI Backend, Stateless HMAC Auth, Dual-Mode Postgres/SQLite & Enforced WebP Cropper

- **Status:** Accepted
- **Date:** 2026-11-02 · **CR:** CR-0001

## Context
Shikshanama (`शिक्षाNama`) needs a mobile-first, Gen-Z EdTech website (bento-grid layout, Hinglish English + Devanagari typography, smooth hover and scroll animations, light/dark mode) combined with a full-featured Admin CMS (`/admin`) where non-technical staff can manage 100% of content, enforce uniform image aspect ratios (`1:1`, `4:5`, `16:9`) exported as WebP, and collect parental consent under India's DPDP Act 2023 via WhatsApp links or printable bilingual PDFs.
Per `AGENTS.md` §4, React is used only when a rich UI is truly needed or requested by Abhishek; Abhishek explicitly chose **React + Vite** with hover and motion effects for this portfolio demo.

## Options
1. **Server-rendered Jinja2 templates + vanilla JS only:** Simpler build, but harder to deliver fluid bento-grid filter re-layouts, interactive touch/pinch canvas cropping with live card preview, and code-split multi-tab admin managers.
2. **React + TypeScript + Vite SPA (with lazy-loaded Admin chunk) + Python FastAPI Backend (`api/index.py`) with dynamic SEO/JSON-LD injection:** Combines a fast, interactive React UI (public bundle < 200 KB gzipped, admin split into its own chunk) with a Python FastAPI backend that handles API routes, SSR meta/OpenGraph/JSON-LD injection per public route, Pillow WebP validation, bilingual PDF generation, and Postgres/SQLite persistence.

## Decision
We chose **Option 2**:
- **Frontend:** React 18 + TypeScript + Vite (`src/`), with `React.lazy` splitting `/admin/*` into a separate chunk so public visitors never download admin code. Built assets are emitted to `app/static/dist/` and served with dynamic per-route `<title>`, `<meta description>`, OpenGraph tags, and `EducationalOrganization` JSON-LD for each active branch.
- **Backend:** Python **FastAPI** (`api/index.py` & `app/`), using **Neon Postgres** (`DATABASE_URL`) in production and automatic **SQLite** fallback in tests and zero-config demo previews.
- **Serverless Multi-Worker Auth:** Admin sessions use stateless HMAC-SHA256 signed cookies (`HttpOnly`, `Secure`, `SameSite=Lax`, 12h expiry) verified against the database `admin_users` active flag on every request—never stored in an in-memory dictionary.
- **Image Pipeline & Consent:** Client-side canvas cropper (`src/cropper.ts`) locks aspect ratios (`1:1`, `4:5`, `16:9`) and exports WebP; server-side Pillow (`app/imaging.py`) verifies real WebP headers, aspect ratio within ±1%, and size ≤ 1 MB before saving to Vercel Blob (or DB-backed blob store).

## Consequences
- Works seamlessly on Vercel (`sin1` region) and locally, with 100% test coverage across `pytest` (backend API, auth, cropper validation, consent, PDF, SEO) and `vitest` (frontend cropper & UI logic).
- All external services (Vercel Blob, WhatsApp links) are mocked in tests so tests require zero network or real keys.
