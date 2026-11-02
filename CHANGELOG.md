# Changelog

All notable changes to **Shikshanama (शिक्षाNama) Official Website & Admin CMS** are documented in this file.
Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [Unreleased]

### Added
- **CR-0004:** High-resolution photo upload support (up to 25 MB source files) with server-side limit raised from 1 MB to 10 MB, adaptive client-side canvas compression, and enhanced pointer drag-and-pan framing controls in the Image Cropper modal (`AC-11.4`, `AC-11.5`, `AC-11.8`).
- **CR-0003:** Full inline Edit and Reorder (`↑`/`↓`) across all React Admin CMS managers (`src/admin/AdminApp.tsx`), including Hero trust counters (Total Toppers, Years of Excellence), Section Headings, Branch addresses & contact details (including West Patel Nagar Flagship), Courses, Batches, Results, Founders, Testimonials, and Gallery (`AC-12.7`, `AC-14.6`, `AC-14.7`, `AC-15.5`, `AC-18.5`).
- **CR-0003:** Automatic filtering of sample content (`is_sample = 1`) on public pages when `DEMO_MODE=false` is set in the environment or toggled in Admin settings, while keeping the Flagship branch, Hero counters, and Courses live as institute defaults (`AC-18.5`).
- **CR-0003:** Sleek modern tech visual upgrade (electric-indigo/violet + cyan radial gradient glow, modern frosted-glass blur, refined borders and cards) and streamlined English-only UI, keeping Hindi script strictly for the brand logo **<span className="hi-part">शिक्षा</span>Nama**.

### Fixed
- **CR-0002:** Updated `pyproject.toml`, `requirements.txt`, and `uv.lock` to resolve `psycopg-binary` (`3.3.6`) and `pillow` (`12.x`) wheels compatible with Vercel's CPython 3.14 (`cp314`) runtime (`AC-19.2`).

### Added
- **CR-0001:** Initial build of the Shikshanama (`शिक्षाNama`) mobile-first Gen-Z coaching website and full-featured Admin CMS (`/admin`) (`AC-1.1`–`AC-23.5`).
  - Public modules: Top Announcement Ticker, Sticky Blurred Navbar with Light/Dark theme toggle, Hero with `शिक्षाNama` branding & count-up trust counters, Filterable Hall of Fame (`/results`), Stream Courses & Live Upcoming Batches (`/courses`), Founders & Leadership (`/founders`), Multi-Branch Locator pre-seeded with West Patel Nagar Flagship (`/branches`), Testimonials Marquee, 16:9 Lightbox Gallery, Instagram Hub (`@shikshanamaofficial`), Floating WhatsApp/Call dock, and Book a Free Demo lead capture with `+91` validation, honeypot, and rate limiting.
  - Admin CMS (`/admin`): Stateless HMAC-SHA256 authentication, CSRF protection, login lockout, mandatory client-side + server-validated `1:1`, `4:5`, and `16:9` WebP image cropper, 10 content & lead managers, UTF-8 BOM CSV export with formula-injection escaping, Parent Consent via 14-day signed WhatsApp link (`/consent/<token>`) + printable A4 bilingual PDF generator, and 1-click sample content removal.
