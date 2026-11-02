# Shikshanama (शिक्षाNama) Official Website & Admin CMS

Modern, mobile-first website and full-featured Admin CMS for **Shikshanama (शिक्षाNama)**, a multi-branch coaching institute based in West Patel Nagar, New Delhi. Built by **AkkiVerse**.

## Features

- **Gen-Z Hinglish Public Website (`/`):**
  - Toggleable top announcement marquee banner & sticky blurred-glass navbar with Light/Dark theme switch.
  - Hero section with bold `शिक्षाNama` Devanagari + Latin typography, animated trust counters, and 1-tap Demo & WhatsApp CTAs.
  - **Hall of Fame (`/results`):** Filterable by Class, Stream (`Foundation`, `Science`, `Commerce`, `Humanities`), and Academic Year, synced with URL query parameters.
  - **Courses & Live Upcoming Batches (`/courses`):** Stream tabs, batch schedule with `Open` / `Filling Fast` / `Full` badges, 1-click WhatsApp enrollment, and waitlist pre-fill.
  - **Founders & Leadership (`/founders`):** `4:5` portraits, expandable vision messages, and desktop 3D hover tilt.
  - **Multi-Branch Locator (`/branches`):** Pre-seeded with the West Patel Nagar flagship branch (`E-42, Street Number 2, Block E, West Patel Nagar, New Delhi, 110008`), Google Maps directions, Call, and WhatsApp links.
  - **Campus Life, Testimonials Marquee, 16:9 Lightbox Gallery & `@shikshanamaofficial` Instagram Callout.**
  - **Lead Capture:** Inline and modal "Book a Free Demo Class" form with Indian mobile normalization (`+91XXXXXXXXXX`), honeypot spam guard, and per-IP rate limiting.
- **Admin CMS (`/admin`):**
  - Stateless HMAC-SHA256 signed session cookies (serverless multi-worker safe), CSRF protection, and login lockout.
  - **Mandatory Interactive WebP Image Cropper:** Locks aspect ratios to `1:1` (`800×800`) for Student Results & Testimonials, `4:5` (`960×1200`) for Founder Portraits, and `16:9` (`1920×1080`) for Gallery & Banners; verified server-side with Pillow.
  - **Parent Consent Workflow (DPDP Act 2023):** Results stay off public pages until consent is recorded via a 14-day signed WhatsApp link (`/consent/<token>`) or a downloadable 1-page A4 bilingual (English + Hindi) printable PDF form.
  - **Student Leads Inbox:** Filterable table with status tags (`New`, `Contacted`, `Enrolled`), 1-click WhatsApp follow-up, and formula-safe UTF-8 BOM CSV export.

## Local Development

```bash
# 1. Install frontend dependencies & build Vite bundle
npm install
npm run build

# 2. Run FastAPI server locally (uses SQLite automatically when DATABASE_URL is empty)
uv run uvicorn app.main:app --reload --port 8000
```

Generate a password hash for `ADMIN_PASSWORD_HASH`:

```bash
python3 scripts/hash_password.py "YourStrongPassword"
```

## Running Tests

```bash
uv run pytest -v
npm test
```

## Deployment (Vercel)

Deployed on Vercel team `akkiverse` (`sin1` region). Environment variables are documented in `.env.example`.
