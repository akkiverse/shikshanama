# Spec: Shikshanama (शिक्षाNama) Official Website & Admin CMS

- **Card:** https://github.com/akkiverse/product-think-tank/issues/7 · **Brief:** [BRIEF.md](BRIEF.md) · **Version:** 2 · **Date:** 2026-11-02

> **v2 changes (Abhishek's feedback, 2026-11-02):** this is a **free demo / portfolio build** to pitch to Shikshanama (paid
> launch only if they like it); front end is now **React + Vite** with rich hover and motion effects; **Hinglish design**
> (English + Hindi mixed, designed to look good); **parent consent** by WhatsApp link from Shikshanama's number or a
> downloadable printable form (US-20, US-21, US-22 added).

## Goal
Give Shikshanama a fast, mobile-first, Gen-Z-styled website (bento-grid layout, bold "शिक्षाNama" brand, English headings with
Hindi accent lines, rich hover and scroll animations) that shows real results, live batches and every branch, and turns visitors
into demo bookings and WhatsApp chats. Give non-technical staff an admin panel at `/admin` to change 100% of the content, with a
built-in cropper that forces uniform image shapes and saves WebP, and a simple parent-consent flow for student results.
**Demo success:** Shikshanama's owners see a polished, working site with sample content and say "yes, launch it".
**Launch success (later):** homepage LCP < 2.5 s on mobile 4G; ≥ 30 demo leads/month in admission season; staff publish a
result or batch in < 2 minutes without help.

Terms: **visitor** = student or parent on the public site; **admin** = logged-in staff member.
"Stream" values: Foundation, Science, Commerce, Humanities. "Class" values: 6–12 (editable list).

## User stories and acceptance criteria

### US-1: Announcement ticker and sticky navbar
As a visitor, I want urgent news and quick links always visible, so that I don't miss admissions or test dates.
- **AC-1.1** Given the ticker is switched on and has text, when any public page loads, then a scrolling banner shows that text above the navbar.
- **AC-1.2** Given the ticker is switched off (or its text is empty), when any public page loads, then no banner is rendered.
- **AC-1.3** Given an optional ticker link is set, when the visitor taps the banner, then it opens that link.
- **AC-1.4** When the visitor scrolls down, then the navbar stays fixed at the top (shrinking with a blurred glass background) with jump links (Results, Courses, Founders, Branches, Contact) and a "Book Free Demo" button that opens the demo form.
- **AC-1.5** Given the visitor's device has "reduce motion" on, then the ticker does not scroll (text shown static) and all non-essential animations from US-21 are disabled.
- **AC-1.6** On screens < 768 px the jump links collapse into a hamburger menu that opens a full-screen animated sheet and closes on link tap or Escape.

### US-2: Hero and trust counters
As a parent, I want to see at a glance why this institute is trusted, so that I consider booking a demo.
- **AC-2.1** The hero shows the brand "शिक्षाNama" with Devanagari and Latin glyphs rendered from self-hosted fonts (no missing-glyph boxes).
- **AC-2.2** The hero shows each visible trust counter (label + number, e.g. "Total Toppers 250+") from the database in admin order; numbers count up from 0 when the hero first enters the screen.
- **AC-2.3** The hero shows a "Book a Free Demo Class" button that opens the demo form.
- **AC-2.4** The hero shows a "Chat on WhatsApp" button linking to `https://wa.me/<global WhatsApp number>?text=<URL-encoded inquiry template>`.

### US-3: Hall of Fame (results)
As a parent, I want to browse toppers by class, stream and year, so that I can judge results for my child's exact situation.
- **AC-3.1** The Hall of Fame page lists every **public** result (see AC-3.7) as a card with: 1:1 photo (circle or square), student name, class, stream, marks/percentage badge, rank/distinction text, academic year.
- **AC-3.2** When the visitor picks a Class, Stream and/or Year filter, then only results matching **all** chosen filters show, with an animated re-layout; "All" clears that filter.
- **AC-3.3** Filters are kept in the URL query (e.g. `?class=12&stream=Science&year=2025-26`), so opening that URL directly shows the same filtered list.
- **AC-3.4** Given no result matches, then a friendly "No results yet for this filter" message shows with the demo CTA.
- **AC-3.5** Results are ordered by admin-set order, then by marks (highest first).
- **AC-3.6** The homepage shows only **pinned** public results (max 8) in a swipeable carousel on mobile and a bento grid on desktop, linking to the full Hall of Fame.
- **AC-3.7** A result is **public** only if it is published **and** its consent status is "Given" (US-20). Any other result never appears on a public page or in any public API response.
- **AC-3.8** Hovering (desktop) or tapping (mobile) a result card lifts it, zooms the photo slightly and reveals a highlight strip (e.g. "Subject Topper · Maths 100/100").

### US-4: Courses and upcoming batches
As a student, I want to see subjects and the next batches near me, so that I can enrol quickly.
- **AC-4.1** Courses appear under animated stream tabs (Foundation, Science, Commerce, Humanities); each course shows name, classes, subjects offered and key highlights.
- **AC-4.2** The "Upcoming Batches" list shows each active batch with class, stream, branch name, start date (e.g. "15 Apr 2027"), timings and a seat-status badge (Open / Filling Fast / Full); "Filling Fast" badges pulse gently.
- **AC-4.3** Batches whose start date is more than 30 days in the past, or which are switched off, are not shown.
- **AC-4.4** Each batch with status Open or Filling Fast has an "Enrol on WhatsApp" button linking to the batch's branch WhatsApp number with a pre-filled message naming the class, stream, branch and start date.
- **AC-4.5** A batch with status "Full" shows the badge but no enrol button; instead "Join waitlist" opens the demo form with class, stream and branch pre-selected.

### US-5: Founders and leadership
As a parent, I want to know who teaches and leads, so that I can trust the institute.
- **AC-5.1** The Founders section/page lists each visible founder in admin order with a 4:5 portrait, name, designation/subject expertise and vision message.
- **AC-5.2** Vision messages longer than 280 characters are truncated with a "Read more" toggle that expands smoothly to the full text.
- **AC-5.3** Hovering a founder card (desktop) applies a subtle 3D tilt and shows a quote mark overlay; on touch devices the tilt is off.

### US-6: Multi-branch locator
As a parent, I want the nearest branch's address, phone and directions, so that I can visit.
- **AC-6.1** The Branches section shows every active branch as a card with name, full address, phone number, "Get Directions", "Call" and "WhatsApp" buttons; the flagship branch is first with a "Flagship" badge.
- **AC-6.2** "Get Directions" opens the branch's saved Google Maps URL; if none is saved, it opens `https://www.google.com/maps/search/?api=1&query=<URL-encoded address>`.
- **AC-6.3** "Call" uses a `tel:+91…` link and "WhatsApp" uses `https://wa.me/91…` with the branch's own numbers.
- **AC-6.4** On first run (empty database) the flagship branch is seeded as "West Patel Nagar (Flagship)" with address "Ground Floor, E-42, Street Number 2, near Government School, Block E, West Patel Nagar, Patel Nagar, New Delhi, Delhi, 110008".

### US-7: Campus life, testimonials and Instagram hub
As a visitor, I want to see real classrooms and reviews, so that I feel confident.
- **AC-7.1** The section shows visible testimonials (quote, name, role "Student"/"Parent", optional class/year, optional 1:1 photo) in admin order as an auto-sliding marquee that pauses on hover/touch.
- **AC-7.2** The gallery shows visible 16:9 images with captions in admin order, lazy-loaded, opening a swipeable lightbox on tap.
- **AC-7.3** A prominent callout links to `https://instagram.com/shikshanamaofficial` (handle editable in admin), opening in a new tab with `rel="noopener"`.

### US-8: Floating WhatsApp and Call buttons
As a visitor on any page, I want one-tap contact, so that I can ask a question immediately.
- **AC-8.1** Every public page shows floating WhatsApp and Call buttons that do not cover the demo form's submit button on a 360 px-wide screen; on hover they expand to show a label ("Chat with us" / "Call now").
- **AC-8.2** WhatsApp opens `https://wa.me/<global WhatsApp number>?text=<URL-encoded admin-editable inquiry template>`; Call opens `tel:` with the global phone number.
- **AC-8.3** Given a global number is empty, then that button is hidden (no broken link).

### US-9: Book a Free Demo / Counselling (lead capture)
As a parent, I want to request a demo in a few taps, so that someone calls me back.
- **AC-9.1** The form (in a slide-up sheet on mobile, modal on desktop, plus an inline section on the homepage) asks for Student Name, Mobile Number, Class, Stream and Preferred Branch (active branches only); all are required.
- **AC-9.2** Mobile numbers are accepted as 10 digits starting 6–9, with optional `+91`/`0`/spaces/dashes, and stored normalised as `+91XXXXXXXXXX`; anything else shows an inline error and nothing is saved. The API applies the same check (client checks are not trusted).
- **AC-9.3** On valid submit, a lead is saved with timestamp (IST), status "New" and source page, and the visitor sees an animated thank-you state with a "Chat on WhatsApp now" button.
- **AC-9.4** Submissions with the hidden honeypot field filled are discarded silently (visitor still sees thank-you).
- **AC-9.5** More than 5 submissions from the same IP within 10 minutes are rejected with a polite "try again later" message (HTTP 429).
- **AC-9.6** The form shows a short privacy note: "We use your number only to contact you about classes. / आपका नंबर सिर्फ़ क्लास की जानकारी के लिए।"

### US-10: Secure admin login
As the owner, I want only my staff to reach `/admin`, so that content and leads are safe.
- **AC-10.1** Any admin API call without a valid session returns 401, and the admin app then shows `/admin/login`.
- **AC-10.2** Login checks email + password against a stored bcrypt/argon2 hash; a wrong password shows a generic "Email or password is wrong".
- **AC-10.3** Sessions are stateless HMAC-signed, HttpOnly, Secure, SameSite=Lax cookies that expire after 12 hours; a valid cookie keeps working when the server's in-memory state is cleared (serverless multi-worker safe).
- **AC-10.4** After 5 failed logins for one email in 15 minutes, further attempts for that email are blocked for 15 minutes (counter stored in the database).
- **AC-10.5** All admin state-changing requests (POST/PUT/PATCH/DELETE) require a valid CSRF token header; requests without it are rejected (403).
- **AC-10.6** The first admin is created from `ADMIN_EMAIL` + `ADMIN_PASSWORD_HASH` on first run; a logged-in admin can add, disable and reset passwords for other staff accounts (all staff have the same permissions in v1).
- **AC-10.7** "Log out" clears the cookie, and a disabled account's existing session stops working on its next request.

### US-11: Built-in image cropper and WebP optimiser
As a staff member, I want every uploaded photo cropped to the right shape and made small automatically, so that the site looks uniform and loads fast.
- **AC-11.1** Every image field in the admin opens an interactive cropper (drag, pinch/zoom, rotate 90°) before saving; there is no way to upload an image without passing through it.
- **AC-11.2** The aspect ratio is locked per type: student result photo and testimonial photo **1:1**, founder portrait **4:5**, gallery and banner images **16:9**; the user cannot change it.
- **AC-11.3** The cropped image is exported in the browser as WebP (quality 0.8) and resized to at most 800×800 (1:1), 960×1200 (4:5) or 1920×1080 (16:9).
- **AC-11.4** The server accepts the upload only if it is a real WebP file (checked by decoding, not by file name), ≤ 1 MB, and its width/height ratio matches the field's ratio within ±1%; otherwise it returns 422 with a clear message and saves nothing.
- **AC-11.5** Source files can be JPG, PNG or WebP up to 15 MB; larger files show "Photo too large" before cropping.
- **AC-11.6** Saved images get a random file name (no student name in the URL), are stored in Blob storage, and replacing or deleting an image also deletes the old file.
- **AC-11.7** The cropper works on a phone (touch drag/pinch) as well as desktop, and shows a live preview of how the image will look on the public card.

### US-12: Results manager
As a staff member, I want to add and manage results, so that the Hall of Fame stays current.
- **AC-12.1** Staff can create a result with photo (1:1), name, class, stream, marks/percentage, rank/badge text, academic year, parent name and parent WhatsApp number (both admin-only), published and pinned switches.
- **AC-12.2** Saving with "published" on while consent status is not "Given" is allowed but shows a warning "Will go live once parent consent is received", and the result stays off public pages (AC-3.7).
- **AC-12.3** Staff can edit and delete results; delete asks for confirmation and removes the photo file and any consent record.
- **AC-12.4** Staff can reorder results (drag and drop) and the new order is reflected on public pages.
- **AC-12.5** Pinning a 9th result shows "Max 8 pinned on homepage; unpin one first".
- **AC-12.6** The admin list can be filtered by class, stream, year and consent status, and shows a coloured consent badge per result.

### US-13: Founders manager
As a staff member, I want to manage founder profiles, so that the leadership section is accurate.
- **AC-13.1** Staff can add, edit, delete and reorder founders with photo (4:5), name, designation/subject, vision message and visible switch.
- **AC-13.2** Name, photo and designation are required; vision message is limited to 1,200 characters.

### US-14: Homepage and batch controller
As a staff member, I want to change the hero, ticker, courses and batches, so that the homepage reflects this week's reality.
- **AC-14.1** Staff can add, edit, hide, reorder and delete hero counters (label, value text such as "250+").
- **AC-14.2** Staff can switch the ticker on/off and edit its text (max 200 characters, English and/or Hindi) and optional link; the change is visible on public pages within 60 seconds.
- **AC-14.3** Staff can add, edit, hide, reorder and delete courses (stream, name, classes, subjects list, highlights list).
- **AC-14.4** Staff can add, edit, hide and delete batches (class, stream, branch, start date, timings, status Open/Filling Fast/Full).
- **AC-14.5** Staff can upload an optional 16:9 hero/banner image through the cropper and remove it.
- **AC-14.6** Staff can edit each section's English heading and optional Hindi accent line (US-22).

### US-15: Branch and contact manager
As a staff member, I want to manage branches and global contacts, so that every call and WhatsApp reaches the right desk.
- **AC-15.1** Staff can add, edit, deactivate, reorder and delete branches (name, address, Google Maps URL, phone, WhatsApp number, flagship switch).
- **AC-15.2** Exactly one branch can be flagship; marking another as flagship removes the badge from the previous one.
- **AC-15.3** A branch that still has active batches cannot be deleted (only deactivated), with a message naming the batches.
- **AC-15.4** Phone and WhatsApp numbers are validated (Indian mobile, or landline with STD code) and stored in `+91…` form; a Google Maps URL must start with `https://`.
- **AC-15.5** Staff can edit global settings: main phone, main WhatsApp number, WhatsApp inquiry template, Instagram handle, other social links (YouTube, Facebook; optional).

### US-16: Testimonials and gallery manager
As a staff member, I want to post reviews and classroom photos, so that the site feels alive.
- **AC-16.1** Staff can add, edit, hide, reorder and delete testimonials (quote ≤ 500 characters, name, Student/Parent, optional class/year, optional 1:1 photo).
- **AC-16.2** Staff can add, edit caption, hide, reorder and delete gallery images (16:9, caption ≤ 120 characters).

### US-17: Student leads inbox
As a counsellor, I want all demo requests in one list, so that no parent is left without a call back.
- **AC-17.1** The inbox lists leads newest first with timestamp (IST), student name, mobile, class, stream, preferred branch and status.
- **AC-17.2** Staff can change a lead's status to New, Contacted or Enrolled and add a short note; the list can be filtered by status, branch and date range.
- **AC-17.3** "Export CSV" downloads the currently filtered leads with a header row, UTF-8 with BOM (opens correctly in Excel with Devanagari names), and cells starting with `=`, `+`, `-` or `@` are escaped to stop formula injection.
- **AC-17.4** Each lead has a "WhatsApp" button opening `https://wa.me/<lead mobile>?text=<greeting naming the student and class>`.
- **AC-17.5** Staff can delete a lead (with confirmation); deleted leads no longer appear in the list or exports.
- **AC-17.6** The admin dashboard shows the count of "New" leads and results waiting for consent.

### US-18: First-run defaults and demo content
As Abhishek, I want the site to look complete on day one, so that the pitch to Shikshanama is convincing.
- **AC-18.1** On an empty database, the app seeds: brand name "Shikshanama (शिक्षाNama)", Instagram handle `shikshanamaofficial`, the flagship branch (AC-6.4), the four streams, hero counters, the ticker switched off, and Hinglish section headings (US-22).
- **AC-18.2** When `DEMO_MODE=true`, the seed also adds clearly fictional sample content (≥ 8 results, 2 founders, 6 batches, 4 testimonials, 6 gallery images) using illustrated/generated avatars, never real students' photos, with consent status "Given (sample)"; a small "Demo content" ribbon shows on public pages.
- **AC-18.3** An admin button "Remove all sample content" deletes every sample record and its images in one go, leaving real content untouched.
- **AC-18.4** Seeding runs only once; it never overwrites content staff have edited.

### US-19: Mobile-first, fast, accessible and findable
As a parent on a budget phone, I want the site to load fast and be easy to read, so that I don't give up.
- **AC-19.1** All public pages render correctly with no horizontal scroll from 360 px to 1440 px wide.
- **AC-19.2** Lighthouse (mobile) on the preview homepage scores Performance ≥ 85 and Accessibility ≥ 90; the public JavaScript bundle is ≤ 200 KB gzipped (admin code is split into a separate chunk and never loaded on public pages).
- **AC-19.3** All images have width/height (no layout shift), `alt` text (student/founder name or caption) and below-the-fold images use `loading="lazy"`.
- **AC-19.4** Every public route sets its own title, meta description and Open Graph tags; the API serves `sitemap.xml` and `robots.txt` (disallowing `/admin`), and the page includes LocalBusiness/EducationalOrganization JSON-LD for each active branch.
- **AC-19.5** All interactive elements are keyboard-reachable with a visible focus ring, and colour contrast meets WCAG AA.

### US-20: Parent consent by WhatsApp link
As a staff member, I want to ask a parent for consent on WhatsApp from Shikshanama's number, so that a result can go live legally without paperwork.
- **AC-20.1** Each result has a consent status: Not requested, Requested, Given, Declined (and "Given (sample)" for demo content).
- **AC-20.2** Given a parent WhatsApp number is saved, when staff click "Ask consent on WhatsApp", then the app creates a unique, signed consent link valid for 14 days, sets status to Requested and opens `https://wa.me/<parent number>?text=<bilingual consent message with the link>` so staff send it from the institute's WhatsApp (phone or WhatsApp Web logged in with Shikshanama's number).
- **AC-20.3** The consent link opens a mobile page (no login) showing the student's name, photo preview, exactly what will be published (name, class, stream, marks, rank, year, photo) and the consent text in English and Hindi, with "I agree / मैं सहमत हूँ" and "I do not agree" buttons.
- **AC-20.4** "I agree" requires the parent to type their name; it records status Given, parent-typed name, timestamp (IST), consent text version and a hashed IP, and the result becomes public on the next load if published.
- **AC-20.5** "I do not agree" records status Declined; the result never goes public and the dashboard flags it for staff.
- **AC-20.6** An expired, already-used or tampered link shows "This link is no longer valid, please contact Shikshanama" and changes nothing.
- **AC-20.7** Staff can withdraw consent on a parent's request (status → Declined, result removed from public pages immediately), and the consent page tells parents how to ask for withdrawal.
- **AC-20.8** The parent's WhatsApp number and name are admin-only and never appear on public pages, public APIs or CSV exports of leads.

### US-21: Downloadable consent form (paper option)
As a staff member, I want a printable consent form, so that parents without WhatsApp can sign on paper.
- **AC-21.1** From a result, staff can download a one-page A4 PDF consent form in English and Hindi, pre-filled with student name, class, stream, marks, rank and year, with blanks for parent name, signature and date, and Shikshanama's branding.
- **AC-21.2** A blank (not pre-filled) version of the same form can be downloaded from the Results manager.
- **AC-21.3** Staff can mark "Paper form received" with the date and the staff member's name; this sets status Given with method "Paper".
- **AC-21.4** The consent page and PDF both include the same versioned consent text (v1), and the record stores which version was agreed.

### US-22: Hinglish design (English + Hindi mix that looks good)
As a Delhi parent or student, I want a site that feels local but modern, so that it speaks to me.
- **AC-22.1** Each public section shows an English heading with an optional Hindi accent line (e.g. "Hall of Fame · नतीजे जो बोलते हैं"), both editable in admin; if the Hindi line is empty, nothing extra shows.
- **AC-22.2** Latin and Devanagari text use a matched font pair (a geometric Latin display face + a Devanagari face with similar weight), self-hosted and subset; Devanagari lines get a taller line-height so matras are never clipped.
- **AC-22.3** Key CTAs carry a short Hindi sub-label (e.g. "Book Free Demo · फ्री डेमो बुक करें") without wrapping on a 360 px screen.
- **AC-22.4** All content fields accept Devanagari input and render it correctly on public pages, in the CSV export and in the consent PDF.

### US-23: Interactive look and feel (hover and motion)
As a Gen-Z student, I want the site to feel alive and premium, so that I trust it and share it.
- **AC-23.1** Bento cards, course cards, batch cards and branch cards lift with a soft shadow/glow on hover (desktop) and show a pressed state on tap (mobile).
- **AC-23.2** Sections fade/slide in once as they scroll into view; each animation lasts ≤ 600 ms and never blocks reading or clicking.
- **AC-23.3** Primary CTAs have a hover effect (gradient shift or magnetic pull) and a ripple on click/tap.
- **AC-23.4** Animations use only transform/opacity (no layout-shifting properties) and are all disabled under "reduce motion" (AC-1.5).
- **AC-23.5** A light/dark theme follows the device setting, with a toggle in the navbar that remembers the choice.

## Screens
| Screen | Purpose | Stories |
|---|---|---|
| Home `/` | Ticker, navbar, hero + counters, pinned results, courses/batches, founders preview, branches, testimonials/gallery/Instagram, demo form | US-1–9, 19, 22, 23 |
| Hall of Fame `/results` | Full filterable results | US-3 |
| Courses `/courses` | Stream tabs + upcoming batches | US-4 |
| Founders `/founders` | Leadership page | US-5 |
| Branches `/branches` | Branch locator | US-6 |
| Consent `/consent/<token>` | Parent agrees/declines | US-20 |
| Admin login `/admin/login` | Staff sign-in | US-10 |
| Admin dashboard `/admin` | New-lead count, pending consents, quick links | US-17, 20 |
| Admin managers `/admin/results`, `/founders`, `/homepage`, `/courses`, `/batches`, `/branches`, `/settings`, `/testimonials`, `/gallery`, `/staff` | Content CRUD with cropper, consent actions, PDF download | US-10–16, 20–22 |
| Leads inbox `/admin/leads` | Leads table, status, CSV, WhatsApp | US-17 |

## Data
| Entity | Fields | Stored where | Personal data? |
|---|---|---|---|
| Setting | key, value (brand, phones, WhatsApp, template, Instagram, socials, ticker on/text/link, hero image, section headings EN/HI) | Postgres | No (business contacts only) |
| HeroStat | id, label, value, order, visible | Postgres | No |
| Course | id, stream, name, classes, subjects[], highlights[], order, visible | Postgres | No |
| Batch | id, class, stream, branch_id, start_date, timings, status, active | Postgres | No |
| Branch | id, name, address, maps_url, phone, whatsapp, is_flagship, active, order | Postgres | No (business numbers) |
| Result | id, photo_url, name, class, stream, score_text, rank_text, year, published, pinned, order, is_sample, parent_name, parent_whatsapp | Postgres + photo in Blob | **Yes, minors' data; public only with consent; parent fields admin-only** |
| Consent | id, result_id, status, method (WhatsApp link / Paper / Sample), token_hash, expires_at, agreed_name, agreed_at, text_version, ip_hash, recorded_by | Postgres | **Yes, admin-only** |
| Founder | id, photo_url, name, designation, vision, order, visible, is_sample | Postgres + Blob | Yes (public by choice) |
| Testimonial | id, quote, name, role, class_year, photo_url, order, visible, is_sample | Postgres + Blob | Yes (public by choice) |
| GalleryImage | id, image_url, caption, order, visible, is_sample | Postgres + Blob | Possibly (faces in photos) |
| Lead | id, created_at, student_name, mobile, class, stream, branch_id, status, note, source, ip_hash | Postgres | **Yes, admin-only, never public** |
| AdminUser | id, email, password_hash, active, created_at | Postgres | Yes (staff emails, admin-only) |
| RateLimit | key, count, window_start | Postgres | IP stored hashed only |

Schema changes after launch only add tables/nullable columns (AGENTS.md §5).

## Integrations
- **Neon Postgres** (Vercel Marketplace, free tier 0.5 GB): all content, consents and leads. Tests use SQLite.
- **Vercel Blob**: WebP images (public read, random names). Mocked in tests with a fake store.
- **WhatsApp click-to-chat** (`wa.me` links): enquiries, enrolment, lead follow-up and consent requests. Free, no API key.
  Messages go from whichever WhatsApp account staff are logged in with (Shikshanama's number). Staff tap "Send" themselves.
- **Google Maps** URLs: plain links, no API key.
- **Instagram**: link only.
- **PDF**: generated server-side in Python (e.g. WeasyPrint or ReportLab with an embedded Devanagari font); no outside service.
- All outside services are mocked in tests; no real keys or network needed.

## Non-functional
- **Privacy:** no personal data on public pages except consented results, founders and testimonials; leads, parent details,
  consents and staff data admin-only; IPs stored only as salted hashes; recommend deleting leads older than 12 months.
  Demo uses fictional sample people only. Branch/global numbers must be business numbers, not anyone's personal phone.
- **Security:** HMAC-signed sessions (no in-memory session store), CSRF header on admin writes, password hashing, login lockout,
  signed single-use consent tokens (only a hash stored), server-side image validation, React output escaping, `/admin` excluded
  from search engines.
- **Speed:** homepage LCP < 2.5 s on mobile 4G; public JS ≤ 200 KB gzipped; public API responses cached at the edge for 60 s
  (`s-maxage=60, stale-while-revalidate`); self-hosted subset fonts.
- **Stack** (Abhishek chose React for a richer, more dynamic UI; the engineer records this in an ADR at build time):
  - Front end: **React + TypeScript + Vite**, Tailwind CSS, Framer Motion (`motion`) for animations, React Router, a
    touch-friendly cropper library (e.g. `react-easy-crop`, MIT). Public site and admin are one app with code-split admin routes.
  - Back end: **Python FastAPI** JSON API under `/api` (Vercel Python function), SQLAlchemy/SQLModel + Alembic migrations, Pillow
    for WebP validation, a PDF library for consent forms.
  - Pinned deps (`pyproject.toml` + lock, `package-lock.json`). Tests: `pytest` (API) and `vitest` + React Testing Library
    (front end, including cropper ratio/export logic). Deploy: Vercel team `akkiverse`, Hobby plan for the non-commercial demo,
    preview per PR.
  - Before handing the preview over: full E2E on the live preview URL (login → admin GETs → create result with cropped upload →
    consent link → agree → public Hall of Fame shows it → demo form submit → lead appears in inbox).

## Out of scope (v1)
- **Automatic** WhatsApp sending from Shikshanama's number (WhatsApp Business Platform / Cloud API). It needs a Meta Business
  account, business verification (GST/Udyam documents), approved templates and costs about ₹0.115 per utility message. That's a
  later CR after a paid launch; v1 uses free tap-to-send links.
- Full language toggle (separate complete Hindi site); v1 is a designed English + Hindi mix.
- Online fee payment, student/parent login, attendance, LMS, test series or video classes.
- Live Instagram feed embed, embedded Google Map widget (links only), Google reviews sync.
- SMS/email notifications for new leads; role-based permissions; audit log; blog/news.
- Custom domain purchase and paid Vercel plan (only at a paid launch, Abhishek arranges).
- Multi-tenant template for other institutes.

## Environment variables needed (names only; Abhishek sets them in Vercel)
| Name | What for |
|---|---|
| `DATABASE_URL` | Neon Postgres connection (added by the Neon Marketplace integration) |
| `BLOB_READ_WRITE_TOKEN` | Vercel Blob store for uploaded images |
| `SESSION_SECRET` | Signs admin session cookies, CSRF tokens and consent links (long random string) |
| `ADMIN_EMAIL` | Email of the first admin account |
| `ADMIN_PASSWORD_HASH` | Hash of the first admin's password (the repo includes a small script to generate it locally) |
| `IP_HASH_SALT` | Salt for hashing visitor IPs in rate limits, leads and consents |
| `DEMO_MODE` | `true` to seed fictional sample content and show the "Demo content" ribbon; `false` for a real launch |
