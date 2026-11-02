# Changelog

All notable changes to **Shikshanama (शिक्षाNama) Official Website & Admin CMS** are documented in this file.
Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [Unreleased]

### Added
- **CR-0001:** Initial build of the Shikshanama (`शिक्षाNama`) mobile-first Gen-Z coaching website and full-featured Admin CMS (`/admin`) (`AC-1.1`–`AC-23.5`).
  - Public modules: Top Announcement Ticker, Sticky Blurred Navbar with Light/Dark theme toggle, Hero with `शिक्षाNama` branding & count-up trust counters, Filterable Hall of Fame (`/results`), Stream Courses & Live Upcoming Batches (`/courses`), Founders & Leadership (`/founders`), Multi-Branch Locator pre-seeded with West Patel Nagar Flagship (`/branches`), Testimonials Marquee, 16:9 Lightbox Gallery, Instagram Hub (`@shikshanamaofficial`), Floating WhatsApp/Call dock, and Book a Free Demo lead capture with `+91` validation, honeypot, and rate limiting.
  - Admin CMS (`/admin`): Stateless HMAC-SHA256 authentication, CSRF protection, login lockout, mandatory client-side + server-validated `1:1`, `4:5`, and `16:9` WebP image cropper, 10 content & lead managers, UTF-8 BOM CSV export with formula-injection escaping, Parent Consent via 14-day signed WhatsApp link (`/consent/<token>`) + printable A4 bilingual PDF generator, and 1-click sample content removal.
