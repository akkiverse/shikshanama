# CR-0003: Full Admin Inline Edit, Reorder & DEMO_MODE=false Filtering

- **Card:** [#7 Shikshanama (शिक्षाNama) Official Website & Admin CMS](https://github.com/akkiverse/product-think-tank/issues/7)
- **Author:** Product Think Tank Coding Agent
- **Date:** 2026-11-02
- **Status:** Proposed

## Why

When Abhishek turned `DEMO_MODE=false` in Vercel environment variables to inspect how the live site looks without fictional sample data, he also needed the ability to easily view and edit real institute details from the `/admin` CMS (such as editing the Flagship West Patel Nagar branch address/phone numbers, editing Hero trust counters like Total Toppers and Years of Excellence, and modifying Courses and Batches).

While FastAPI backend `PUT` and reorder endpoints existed in `app/main.py`, the React Admin UI (`src/admin/AdminApp.tsx`) was missing inline **Edit** and **Reorder (↑/↓)** forms for existing items, and public listing queries were not filtering out records marked `is_sample = 1` when `DEMO_MODE=false` in the environment.

## Scope

1. **Environment & Admin `DEMO_MODE=false` Public Filtering:**
   - When `DEMO_MODE=false` in environment variables or toggled in Admin settings, public endpoints (`/api/public/bootstrap`, `/api/public/results`, `/api/public/branches`, `/api/public/batches`) automatically hide sample records (`is_sample = 1`).
   - The Flagship West Patel Nagar branch, core Hero trust counters, and the 4 stream Courses remain visible as real institute defaults.
   - Any sample record edited and saved by staff via Admin `PUT` has its `is_sample` flag automatically updated to `0` (converting it into real content).
2. **Full Inline Edit & Reorder Across React Admin CMS (`src/admin/AdminApp.tsx`):**
   - **Hero Trust Counters:** Inline editing of `label`, `value`, `visible` checkbox, `Save` button (`PUT /api/admin/hero-stats/{id}`), `↑`/`↓` reorder (`POST /api/admin/hero-stats/reorder`), `Delete`, and an "Add Counter" form.
   - **Section Headings:** Inline inputs for English heading (`en`) and Hindi accent line (`hi`) across all 7 sections (`results`, `courses`, `batches`, `founders`, `branches`, `campus`, `demo`), saved via `PUT /api/admin/settings`.
   - **Branches:** Full inline Edit form on every branch card (including the Flagship West Patel Nagar address, phone, WhatsApp, and Google Maps link) via `PUT /api/admin/branches/{id}`, plus `↑`/`↓` reorder.
   - **Courses:** Inline Edit on stream name, course title, classes, comma-separated subjects, comma-separated highlights, and `visible` toggle via `PUT /api/admin/courses/{id}`, plus `↑`/`↓` reorder.
   - **Batches:** Inline Edit on class, stream, branch, start date, timings, status, and active toggle via `PUT /api/admin/batches/{id}`.
   - **Results:** Inline Edit with 1:1 image replacement cropper, marks, stream, and year via `PUT /api/admin/results/{id}`, `↑`/`↓` reorder, and multi-filter controls (`Class`, `Stream`, `Consent Status`).
   - **Founders, Testimonials & Gallery:** Inline Edit forms (with image cropper re-crop modal) and `↑`/`↓` reordering.
   - **Leads Inbox:** Filter bar (`Status`, `Branch`) and counsellor notes saved via `PATCH /api/admin/leads/{id}`.
   - **Dashboard:** Direct one-click toggle to switch Demo Sample Mode on/off.
3. **UI Modern Tech Overhaul & English Language Focus:**
   - Switched design system from orange to a sleek dark obsidian/slate aesthetic with electric indigo (`#6366f1`) and cyan (`#06b6d4`) glowing accents and modern frosted-glass cards (`styles.css`).
   - Cleaned all page body copy and button CTAs to English-only (e.g. "Book Free Demo Class"), preserving Hindi script strictly for the brand name **शिक्षाNama** (`<span className="hi-part">शिक्षा</span>Nama`).

## Acceptance Criteria Added / Modified

- `AC-12.7`: Admin can edit existing student results inline, including replacing photos via 1:1 WebP cropper and updating student details, and reorder them with `↑`/`↓` controls.
- `AC-14.6`: Admin can edit and reorder Hero trust counters inline and modify section headings (English + Hindi accent line) from the Homepage manager.
- `AC-14.7`: Admin can add, edit, and reorder courses inline (stream, title, classes, subjects, and highlights).
- `AC-15.5`: Admin can edit any branch inline, including the Flagship West Patel Nagar street address, phone, WhatsApp, and Google Maps URL, and reorder branches with `↑`/`↓` controls.
- `AC-18.5`: When `DEMO_MODE=false` is set in the environment or toggled in Admin settings, all sample items (`is_sample = 1`) are hidden on public views while preserving the Flagship branch, Hero stats, and Courses. Editing an item clears its sample status.
