# CR-0001: Initial Build of Shikshanama (शिक्षाNama) Official Website & Admin CMS

- **Status:** In review
- **Card:** https://github.com/akkiverse/product-think-tank/issues/7 · **Branch:** `cr/0001-initial-build` · **PR:** #1
- **Date:** 2026-11-02 · **Author:** engineer

## Why
Shikshanama (`शिक्षाNama`), a multi-branch coaching institute based in West Patel Nagar, New Delhi, needs a modern, Gen-Z-friendly, mobile-first public website (with English + Hindi/Devanagari Hinglish design, bento-grid layout, and hover/motion effects) coupled with a 100% self-service Admin CMS (`/admin`) featuring an enforced client-side + server-validated `1:1` / `4:5` / `16:9` WebP image cropper, WhatsApp-first lead generation, and parental consent management (via WhatsApp link or printable bilingual PDF) for student results.

## What changes
Initial build implementing all 23 user stories (`US-1`–`US-23`) and acceptance criteria (`AC-1.1`–`AC-23.5`) from `docs/SPEC.md`:
1. **Public Gen-Z Mobile-First Website (`US-1`–`US-9`, `US-19`, `US-22`, `US-23`):**
   - Toggleable top announcement marquee ticker (`AC-1.1`–`AC-1.3`) and sticky blurred-glass navbar with jump links, mobile sheet menu, and Light/Dark theme toggle (`AC-1.4`–`AC-1.6`, `AC-23.5`).
   - Hero section with bold `शिक्षाNama` Devanagari + Latin branding, count-up trust counters, and primary Demo + WhatsApp CTAs (`AC-2.1`–`AC-2.4`).
   - Filterable **Hall of Fame** (`Class`, `Stream`, `Academic Year`) synced with URL query params, showing only published results with parent consent (`AC-3.1`–`AC-3.8`).
   - **Courses & Live Upcoming Batches** with stream tabs (`Foundation`, `Science`, `Commerce`, `Humanities`), 30-day window check, pulsing `Filling Fast` badges, 1-click WhatsApp enrollment, and `Full` batch waitlist pre-fill (`AC-4.1`–`AC-4.5`).
   - **Founders & Leadership** section with `4:5` portraits, 280-char truncation toggle, and desktop 3D hover tilt (`AC-5.1`–`AC-5.3`).
   - **Multi-Branch Locator** pre-seeded with the West Patel Nagar flagship branch, Google Maps directions fallback, Call, and branch WhatsApp links (`AC-6.1`–`AC-6.4`).
   - **Campus Life, Testimonials Marquee, 16:9 Lightbox Gallery & `@shikshanamaofficial` Instagram Hub** (`AC-7.1`–`AC-7.3`).
   - **Floating WhatsApp & Call buttons** and **Book a Free Demo / Counselling** lead form with `+91` mobile normalization, honeypot spam protection, per-IP rate limiting (5 per 10 mins), and non-JS form fallback (`AC-8.1`–`AC-9.6`).
2. **Admin CMS & Enforced WebP Image Cropper (`US-10`–`US-18`, `US-20`, `US-21`):**
   - Stateless HMAC-SHA256 signed session cookies (`HttpOnly`, `Secure`, `SameSite=Lax`, 12h expiry) verified against DB active flag on every request (serverless multi-worker safe), CSRF protection, and 5-attempt login lockout (`AC-10.1`–`AC-10.7`).
   - Interactive client-side image cropper (`src/cropper.ts`, `ImageCropperModal.tsx`) + server-side Pillow WebP & aspect-ratio validator (`app/imaging.py`) enforcing `1:1` (`800x800`), `4:5` (`960x1200`), and `16:9` (`1920x1080`) ratios (`AC-11.1`–`AC-11.7`).
   - Full CRUD managers for Results, Founders, Homepage/Ticker/Headings, Courses, Batches, Branches, Contacts, Testimonials, Gallery, Staff, and Leads Inbox with formula-escaped UTF-8 BOM CSV export (`AC-12.1`–`AC-17.6`).
   - Parent consent workflow via 14-day signed WhatsApp link (`/consent/<token>`) and downloadable 1-page A4 bilingual PDF consent form (`AC-20.1`–`AC-21.4`), plus 1-click sample content removal (`AC-18.1`–`AC-18.4`).

## Acceptance criteria
| ID | Criterion | New / Changed / Removed | Test |
|---|---|---|---|
| AC-1.1–1.3 | Announcement ticker visibility, text, and optional link | New | `test_ac_1_1_and_1_2_and_1_3_ticker_visibility_and_link` |
| AC-1.4–1.6 | Sticky blurred navbar, reduced-motion static ticker, mobile sheet | New | `test_ac_1_4_and_1_5_and_1_6_sticky_navbar_reduced_motion_and_mobile_menu` |
| AC-2.1–2.4 | Hero `शिक्षाNama` branding, trust counters, Demo & WhatsApp CTAs | New | `test_ac_2_1_to_2_4_hero_branding_counters_and_ctas` |
| AC-3.1–3.8 | Hall of Fame filters, URL sync, ordering, max 8 pinned, consent gate | New | `test_ac_3_1_to_3_8_hall_of_fame_filtering_ordering_pinning_and_consent_gate` |
| AC-4.1–4.5 | Stream tabs, upcoming batches 30-day window, WhatsApp & waitlist | New | `test_ac_4_1_to_4_5_courses_and_batches_window_whatsapp_and_waitlist` |
| AC-5.1–5.3 | Founders 4:5 portraits, >280 char Read more toggle, 3D hover tilt | New | `test_ac_5_1_to_5_3_founders_display_and_long_vision_truncation` |
| AC-6.1–6.4 | Multi-branch locator, Flagship West Patel Nagar seed, Maps fallback | New | `test_ac_6_1_to_6_4_branches_flagship_seed_and_directions_fallback` |
| AC-7.1–8.3 | Testimonials marquee, 16:9 gallery, Instagram link, floating buttons | New | `test_ac_7_1_to_7_3_and_8_1_to_8_3_campus_instagram_and_floating_contacts` |
| AC-9.1–9.6 | Demo lead form, +91 normalization, honeypot, 5/10m rate limit, non-JS POST | New | `test_ac_9_1_to_9_6_lead_capture_validation_honeypot_and_rate_limit` |
| AC-10.1–10.7 | Admin auth, stateless HMAC cookie across worker resets, CSRF, lockout, staff | New | `test_ac_10_1_to_10_7_admin_auth_stateless_hmac_csrf_lockout_and_staff` |
| AC-11.1–11.7 | Client cropper (1:1, 4:5, 16:9 WebP) & server Pillow ratio/size check + Blob | New | `test_ac_11_4_and_11_6_server_webp_and_aspect_ratio_validation`, `test_ac_11_6_mocked_vercel_blob_upload_and_delete`, `src/__tests__/cropper.test.tsx` |
| AC-12.1–17.6 | Admin CRUD managers, 9th pin guard, branch active-batch guard, CSV escape | New | `test_ac_12_to_17_admin_managers_pin_limit_branch_protection_and_csv_escape` |
| AC-18.1–18.4 | First-run defaults, fictional sample content seed, 1-click sample removal | New | `test_ac_18_1_to_18_4_seed_once_and_remove_sample_content` |
| AC-19.1–23.5 | SEO, JSON-LD, sitemap, robots.txt, <200KB gzip JS, Hinglish, hover/theme | New | `test_ac_19_1_to_19_5_and_22_and_23_seo_jsonld_bundle_and_hinglish` |
| AC-20.1–21.4 | Parent consent via 14-day WhatsApp link, withdrawal, pre-filled/blank PDF | New | `test_ac_20_1_to_20_8_and_21_1_to_21_4_whatsapp_consent_and_pdf` |

## Out of scope
- Paid WhatsApp Business Cloud API automated sending (uses free `wa.me` click-to-chat links in v1).
- Online fee payment, student/parent LMS login, live Instagram API embed.

## Data and compatibility
Initial relational schema (`settings`, `hero_stats`, `courses`, `batches`, `branches`, `results`, `consents`, `founders`, `testimonials`, `gallery_images`, `leads`, `admin_users`, `rate_limits`, `blobs`) supporting Neon Postgres (`DATABASE_URL`) and SQLite fallback.

## Risks and rollback
Initial release; rollback via Vercel Instant Rollback and revert PR on `main`.

## Links
- Test report: `docs/test-reports/CR-0001.md`
- ADR: `docs/adr/ADR-0001-react-vite-and-fastapi-architecture.md`
