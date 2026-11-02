# CR-0005: Branch Address Real-Time Reflection, Flagship Label Removal & Approved Toppers Consent Unpublishing Fix

- **Card:** [#7 Shikshanama (शिक्षाNama) Official Website & Admin CMS](https://github.com/akkiverse/product-think-tank/issues/7)
- **Author:** Product Think Tank Coding Agent
- **Date:** 2026-11-02
- **Status:** Proposed

## Why

1. When updating a branch address in the Admin CMS, the change took minutes to reflect on the public website because `/api/public/bootstrap` had a 60-120s CDN cache header, and the footer hardcoded the original address. Furthermore, the UI continued to display a "Flagship" badge and `(Flagship)` suffix which the user explicitly requested to remove.
2. In production (`DEMO_MODE=false`), when staff marked paper consent (or when parents approved via WhatsApp), the consent was recorded as `Given`, but the underlying result record remained flagged as `is_sample = 1`. Consequently, the public result query filtered out the consented toppers, preventing them from appearing in the Hall of Fame.

## Scope

1. **Approved Toppers Consent Display & Sample Unflagging:**
   - When consent is marked as `Given` (via paper consent `POST /api/admin/results/{id}/paper-consent` or online WhatsApp consent submission `POST /api/public/consent/{token}`), the result record is immediately updated: `is_sample = 0`, `published = 1`, and `pinned = 1`.
   - In `app/main.py` (`_fetch_public_results`), results with real approved consent (`consent_status == 'Given'`) are never skipped by the `is_sample` check, even if originally seeded.
   - On the homepage (`/`), if `pinned_results` is empty or unpinned, the Hall of Fame automatically displays all approved `filteredResults` instead of showing empty cards.

2. **Branch Address Instant Updates & "Flagship" Removal:**
   - Stripped all `(Flagship)` suffixes and removed the `<span className="badge">Flagship</span>` tag from public branch cards and admin forms.
   - Set `FLAGSHIP_NAME = "West Patel Nagar"` in `app/database.py`.
   - Updated the footer in `src/App.tsx` to dynamically render the active branch address rather than a static string.
   - Switched Cache-Control headers on `/api/public/bootstrap` and `/api/public/results` to `no-cache, no-store, must-revalidate` so that address edits and topper approvals reflect instantly on refresh without CDN cache delays.
   - In `PUT /api/admin/branches/{id}`, auto-regenerates the Google Maps directions query link whenever the street address changes.

## Acceptance Criteria Added / Modified

- `AC-3.9`: Approved toppers (via paper consent or online link) are immediately unflagged from sample status (`is_sample = 0, published = 1, pinned = 1`) and returned on public endpoints even in production (`DEMO_MODE=false`).
- `AC-6.5`: Branch address updates in Admin CMS reflect immediately on public endpoints and footer with `no-cache` response headers, auto-update Google Maps directions links, and display clean addresses without `(Flagship)` badges.

## Out of Scope

- Modifying existing lead capture or admin authentication schemas.
- Paid map geocoding APIs (standard Google Maps search queries used).
