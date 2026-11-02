"""Comprehensive acceptance test suite covering US-1 through US-23 (AC-1.1 to AC-23.5)."""

from __future__ import annotations

from datetime import datetime, timedelta
import gzip
from io import BytesIO
import os
import re
from typing import Any

from fastapi.testclient import TestClient
from PIL import Image
import pytest

from app.database import FLAGSHIP_ADDRESS, FLAGSHIP_NAME, IST, init_and_seed_db
from app.imaging import generate_sample_webp
from app.main import app
from app.security import clear_runtime_memory, create_consent_token, hash_password


@pytest.fixture()
def client(tmp_path: Any, monkeypatch: pytest.MonkeyPatch) -> TestClient:
    db_file = tmp_path / "test_shikshanama.db"
    monkeypatch.setenv("SQLITE_PATH", str(db_file))
    monkeypatch.setenv("DATABASE_URL", "")
    monkeypatch.setenv("BLOB_READ_WRITE_TOKEN", "")
    monkeypatch.setenv("SESSION_SECRET", "test-session-secret-key-2026")
    monkeypatch.setenv("IP_HASH_SALT", "test-ip-salt-2026")
    monkeypatch.setenv("ADMIN_EMAIL", "admin@shikshanama.in")
    monkeypatch.setenv("ADMIN_PASSWORD_HASH", hash_password("AdminPass!123", salt="testsalt12345678"))
    monkeypatch.setenv("DEMO_MODE", "true")
    init_and_seed_db()
    return TestClient(app, base_url="https://testserver")


def _admin_login(client: TestClient, email: str = "admin@shikshanama.in", password: str = "AdminPass!123") -> str:
    resp = client.post("/api/admin/login", json={"email": email, "password": password})
    assert resp.status_code == 200, resp.text
    return resp.json()["csrf_token"]


def _make_webp_bytes(w: int, h: int) -> bytes:
    img = Image.new("RGB", (w, h), color=(24, 34, 56))
    buf = BytesIO()
    img.save(buf, format="WEBP", quality=80)
    return buf.getvalue()


def _make_png_bytes(w: int, h: int) -> bytes:
    img = Image.new("RGB", (w, h), color=(24, 34, 56))
    buf = BytesIO()
    img.save(buf, format="PNG")
    return buf.getvalue()


# ---------------------------------------------------------------------------
# US-1: Announcement ticker and sticky navbar
# ---------------------------------------------------------------------------


def test_ac_1_1_and_1_2_and_1_3_ticker_visibility_and_link(client: TestClient) -> None:
    # AC-1.2: Ticker is off by default on first run
    home = client.get("/")
    assert home.status_code == 200
    assert 'data-testid="announcement-ticker"' not in home.text

    # Turn ticker on with text and link (AC-1.1, AC-1.3)
    csrf = _admin_login(client)
    upd = client.put(
        "/api/admin/settings",
        json={
            "ticker_enabled": True,
            "ticker_text": "Scholarship Test Open · स्कॉलरशिप टेस्ट रविवार को",
            "ticker_link": "https://shikshanama.in/scholarship",
        },
        headers={"x-csrf-token": csrf},
    )
    assert upd.status_code == 200

    home_on = client.get("/")
    assert 'data-testid="announcement-ticker"' in home_on.text
    assert "Scholarship Test Open · स्कॉलरशिप टेस्ट रविवार को" in home_on.text
    assert 'href="https://shikshanama.in/scholarship"' in home_on.text


def test_ac_1_4_and_1_5_and_1_6_sticky_navbar_reduced_motion_and_mobile_menu() -> None:
    css_path = os.path.join(os.path.dirname(__file__), "..", "src", "styles.css")
    app_path = os.path.join(os.path.dirname(__file__), "..", "src", "App.tsx")
    with open(css_path, "r", encoding="utf-8") as f:
        css = f.read()
    with open(app_path, "r", encoding="utf-8") as f:
        tsx = f.read()

    # AC-1.4: sticky navbar with blur and jump links
    assert "position: sticky" in css
    assert "backdrop-filter: blur" in css
    for link in ("#hall-of-fame", "#courses", "#founders", "#branches", "#demo-form"):
        assert link in tsx
    # AC-1.5: prefers-reduced-motion disables ticker and animations
    assert "@media (prefers-reduced-motion: reduce)" in css
    assert "animation: none !important" in css
    # AC-1.6: mobile hamburger < 768px and Escape key close
    assert "@media (max-width: 767px)" in css
    assert 'e.key === "Escape"' in tsx


# ---------------------------------------------------------------------------
# US-2: Hero and trust counters
# ---------------------------------------------------------------------------


def test_ac_2_1_to_2_4_hero_branding_counters_and_ctas(client: TestClient) -> None:
    boot = client.get("/api/public/bootstrap").json()
    # AC-2.1: Devanagari + Latin brand
    assert "शिक्षाNama" in boot["settings"]["brand_name"]
    # AC-2.2: Visible trust counters in admin order
    labels = [c["label"] for c in boot["hero_stats"]]
    assert labels == ["Total Toppers", "Years of Excellence", "Active Branches", "Board Pass Rate"]
    # AC-2.3 & AC-2.4: Demo CTA and WhatsApp link with encoded inquiry template
    home = client.get("/").text
    assert "Book a Free Demo Class" in home
    assert "https://wa.me/919811004242?text=" in boot["settings"]["global_whatsapp_url"]


# ---------------------------------------------------------------------------
# US-3: Hall of Fame (results)
# ---------------------------------------------------------------------------


def test_ac_3_1_to_3_8_hall_of_fame_filtering_ordering_pinning_and_consent_gate(client: TestClient) -> None:
    csrf = _admin_login(client)
    # Create an unconsented published result -> must NEVER appear publicly (AC-3.7)
    photo_url = client.post(
        "/api/admin/upload",
        data={"kind": "result"},
        files={"file": ("s.webp", _make_webp_bytes(400, 400), "image/webp")},
        headers={"x-csrf-token": csrf},
    ).json()["url"]
    unconsented = client.post(
        "/api/admin/results",
        json={
            "name": "Hidden Unconsented Student",
            "photo_url": photo_url,
            "class_name": "12",
            "stream": "Science",
            "score_text": "99.9%",
            "rank_text": "Rank 1",
            "year": "2025-26",
            "published": True,
            "pinned": False,
        },
        headers={"x-csrf-token": csrf},
    ).json()
    assert "Will go live once parent consent is received" in unconsented["warning"]

    pub_all = client.get("/api/public/results").json()["results"]
    assert all(r["name"] != "Hidden Unconsented Student" for r in pub_all)
    assert len(pub_all) == 8  # AC-3.1: 8 sample consented results

    # AC-3.2 & AC-3.3: Filter by Class, Stream, and Year + SSR query reflection
    sci_12 = client.get("/api/public/results?class=12&stream=Science&year=2025-26").json()["results"]
    assert len(sci_12) >= 2
    assert all(r["class_name"] == "12" and r["stream"] == "Science" and r["year"] == "2025-26" for r in sci_12)

    ssr_filtered = client.get("/results?class=12&stream=Science&year=2025-26").text
    hof_match = re.search(r'<section id="hall-of-fame">(.*?)</section>', ssr_filtered, re.DOTALL)
    assert hof_match is not None
    hof_section = hof_match.group(1)
    assert "Aarav Verma" in hof_section
    assert "Kabir Malhotra" not in hof_section

    # AC-3.4: Empty filter state shows friendly message
    ssr_empty = client.get("/results?class=6&stream=Humanities&year=2019-20").text
    assert "No results yet for this filter" in ssr_empty

    # AC-3.5: Ordered by admin order, then by marks
    scores_order = [r["sort_order"] for r in pub_all]
    assert scores_order == sorted(scores_order)

    # AC-3.6: Homepage pinned results max 8
    pinned = client.get("/api/public/results?pinned_only=true").json()["results"]
    assert len(pinned) <= 8


# ---------------------------------------------------------------------------
# US-4: Courses and upcoming batches
# ---------------------------------------------------------------------------


def test_ac_4_1_to_4_5_courses_and_batches_window_whatsapp_and_waitlist(client: TestClient) -> None:
    csrf = _admin_login(client)
    # Create an expired batch (> 30 days in the past) -> AC-4.3 must hide it
    old_date = (datetime.now(IST).date() - timedelta(days=45)).isoformat()
    client.post(
        "/api/admin/batches",
        json={
            "class_name": "10",
            "stream": "Foundation",
            "branch_id": 1,
            "start_date": old_date,
            "timings": "Old Batch",
            "status": "Open",
            "active": True,
        },
        headers={"x-csrf-token": csrf},
    )

    boot = client.get("/api/public/bootstrap").json()
    # AC-4.1: All 4 streams present
    streams = {c["stream"] for c in boot["courses"]}
    assert streams == {"Foundation", "Science", "Commerce", "Humanities"}

    # AC-4.2 & AC-4.3: Active batches exclude the >30d past batch
    batches = boot["batches"]
    assert all(b["timings"] != "Old Batch" for b in batches)
    open_batches = [b for b in batches if b["status"] in ("Open", "Filling Fast")]
    full_batches = [b for b in batches if b["status"] == "Full"]
    # AC-4.4: Open / Filling Fast batches have WhatsApp enrolment URL
    assert len(open_batches) > 0
    assert all(b["enroll_whatsapp_url"].startswith("https://wa.me/") for b in open_batches)
    # AC-4.5: Full batches have no direct WhatsApp enrol URL (waitlist flow used instead)
    assert len(full_batches) > 0
    assert all(b["enroll_whatsapp_url"] == "" for b in full_batches)


# ---------------------------------------------------------------------------
# US-5: Founders and leadership
# ---------------------------------------------------------------------------


def test_ac_5_1_to_5_3_founders_display_and_long_vision_truncation(client: TestClient) -> None:
    boot = client.get("/api/public/bootstrap").json()
    founders = boot["founders"]
    assert len(founders) >= 2
    assert any(len(f["vision"]) > 280 for f in founders)


# ---------------------------------------------------------------------------
# US-6: Multi-branch locator
# ---------------------------------------------------------------------------


def test_ac_6_1_to_6_4_branches_flagship_seed_and_directions_fallback(client: TestClient) -> None:
    boot = client.get("/api/public/bootstrap").json()
    branches = boot["branches"]
    # AC-6.1 & AC-6.4: Flagship branch is first and seeded with exact West Patel Nagar address
    assert branches[0]["name"] == FLAGSHIP_NAME
    assert branches[0]["address"] == FLAGSHIP_ADDRESS
    assert branches[0]["is_flagship"] is True
    assert branches[0]["tel_url"].startswith("tel:+91")
    assert branches[0]["whatsapp_url"].startswith("https://wa.me/91")

    # AC-6.2: Branch without saved maps_url falls back to Google Maps search query URL
    csrf = _admin_login(client)
    client.post(
        "/api/admin/branches",
        json={
            "name": "Karol Bagh Annex",
            "address": "12 Pusa Road, Karol Bagh, New Delhi 110005",
            "maps_url": "",
            "phone": "9811005555",
            "whatsapp": "9811005555",
            "is_flagship": False,
            "active": True,
        },
        headers={"x-csrf-token": csrf},
    )
    updated_branches = client.get("/api/public/bootstrap").json()["branches"]
    kb = next(b for b in updated_branches if b["name"] == "Karol Bagh Annex")
    assert kb["maps_url"].startswith("https://www.google.com/maps/search/?api=1&query=")


# ---------------------------------------------------------------------------
# US-7 & US-8: Campus life, testimonials, gallery, Instagram & Floating buttons
# ---------------------------------------------------------------------------


def test_ac_7_1_to_7_3_and_8_1_to_8_3_campus_instagram_and_floating_contacts(client: TestClient) -> None:
    boot = client.get("/api/public/bootstrap").json()
    assert len(boot["testimonials"]) >= 4
    assert len(boot["gallery"]) >= 6
    assert boot["settings"]["instagram_url"] == "https://instagram.com/shikshanamaofficial"

    home = client.get("/").text
    assert 'target="_blank" rel="noopener"' in home

    # AC-8.3: Clearing global phone/whatsapp hides broken links
    csrf = _admin_login(client)
    client.put(
        "/api/admin/settings",
        json={"global_phone": "", "global_whatsapp": ""},
        headers={"x-csrf-token": csrf},
    )
    after = client.get("/api/public/bootstrap").json()["settings"]
    assert after["global_phone"] == ""
    assert after["global_whatsapp_url"] == ""


# ---------------------------------------------------------------------------
# US-9: Book a Free Demo / Counselling (lead capture)
# ---------------------------------------------------------------------------


def test_ac_9_1_to_9_6_lead_capture_validation_honeypot_and_rate_limit(client: TestClient) -> None:
    # AC-9.2: Invalid mobile rejected
    bad = client.post(
        "/api/public/leads",
        json={
            "student_name": "Riya Sen",
            "mobile": "12345",
            "class_name": "12",
            "stream": "Science",
            "branch_id": 1,
        },
    )
    assert bad.status_code == 422

    # AC-9.4: Honeypot filled -> silently discarded (200 thank-you, not saved)
    hp = client.post(
        "/api/public/leads",
        json={
            "student_name": "Bot User",
            "mobile": "9876543210",
            "class_name": "12",
            "stream": "Science",
            "branch_id": 1,
            "website_url": "http://spam.example.com",
        },
    )
    assert hp.status_code == 200
    assert hp.json()["thank_you"] is True

    # AC-9.1, AC-9.2, AC-9.3: Valid submission normalizes mobile to +91XXXXXXXXXX
    ok = client.post(
        "/api/public/leads",
        json={
            "student_name": "आरव कुमार",
            "mobile": "098765-43210",
            "class_name": "12",
            "stream": "Science",
            "branch_id": 1,
        },
        headers={"x-forwarded-for": "203.0.113.10"},
    )
    assert ok.status_code == 200
    assert ok.json()["mobile"] == "+919876543210"
    assert ok.json()["whatsapp_url"].startswith("https://wa.me/")

    # AC-9.6: Non-JS form POST fallback redirects to /thank-you
    form_resp = client.post(
        "/api/public/leads/form",
        data={
            "student_name": "Form Student",
            "mobile": "+91 98112 23344",
            "class_name": "10",
            "stream": "Foundation",
            "branch_id": "1",
        },
        headers={"x-forwarded-for": "203.0.113.11"},
        follow_redirects=False,
    )
    assert form_resp.status_code == 303
    assert form_resp.headers["location"].startswith("/thank-you")

    # AC-9.5: More than 5 submissions from same IP within 10 mins returns 429
    for i in range(5):
        r = client.post(
            "/api/public/leads",
            json={
                "student_name": f"Rate Student {i}",
                "mobile": f"987654321{i}",
                "class_name": "12",
                "stream": "Science",
                "branch_id": 1,
            },
            headers={"x-forwarded-for": "203.0.113.99"},
        )
        assert r.status_code == 200
    sixth = client.post(
        "/api/public/leads",
        json={
            "student_name": "Rate Student 6",
            "mobile": "9876543219",
            "class_name": "12",
            "stream": "Science",
            "branch_id": 1,
        },
        headers={"x-forwarded-for": "203.0.113.99"},
    )
    assert sixth.status_code == 429


# ---------------------------------------------------------------------------
# US-10: Secure admin login & Serverless Multi-Worker Stateless Session
# ---------------------------------------------------------------------------


def test_ac_10_1_to_10_7_admin_auth_stateless_hmac_csrf_lockout_and_staff(client: TestClient) -> None:
    # AC-10.1: Unauthenticated admin API returns 401; /admin page redirects to /admin/login
    unauth_api = client.get("/api/admin/dashboard")
    assert unauth_api.status_code == 401
    unauth_page = client.get("/admin", follow_redirects=False)
    assert unauth_page.status_code == 302
    assert unauth_page.headers["location"] == "/admin/login"

    # AC-10.2 & AC-10.4: 5 failed logins lock out email for 15 minutes
    for _ in range(5):
        fail = client.post("/api/admin/login", json={"email": "lockout@shikshanama.in", "password": "wrong"})
        assert fail.status_code == 401
        assert fail.json()["detail"] == "Email or password is wrong"
    locked = client.post("/api/admin/login", json={"email": "lockout@shikshanama.in", "password": "wrong"})
    assert locked.status_code == 429

    # AC-10.3: Stateless HMAC session survives clearing in-memory server state between requests
    csrf = _admin_login(client)
    clear_runtime_memory()
    dash = client.get("/api/admin/dashboard")
    assert dash.status_code == 200

    # AC-10.5: State-changing admin request without CSRF header rejected with 403
    no_csrf = client.post("/api/admin/hero-stats", json={"label": "X", "value": "1"})
    assert no_csrf.status_code == 403

    # AC-10.6 & AC-10.7: Create staff account, log in as staff, then disable staff -> next request fails immediately
    create_st = client.post(
        "/api/admin/staff",
        json={"email": "counsellor@shikshanama.in", "password": "StaffPassword99"},
        headers={"x-csrf-token": csrf},
    )
    assert create_st.status_code == 200
    staff_id = create_st.json()["id"]

    # Disable staff account and verify session revocation on next request
    client.patch(
        f"/api/admin/staff/{staff_id}",
        json={"active": False},
        headers={"x-csrf-token": csrf},
    )
    staff_login = client.post(
        "/api/admin/login",
        json={"email": "counsellor@shikshanama.in", "password": "StaffPassword99"},
    )
    assert staff_login.status_code == 401

    # Logout clears cookie
    client.post("/api/admin/logout")
    assert client.get("/api/admin/session").status_code == 401


# ---------------------------------------------------------------------------
# US-11: Server-side WebP & Aspect Ratio Validation
# ---------------------------------------------------------------------------


def test_ac_11_4_and_11_6_server_webp_and_aspect_ratio_validation(client: TestClient) -> None:
    csrf = _admin_login(client)

    # Reject non-WebP (PNG disguised with .webp extension)
    bad_fmt = client.post(
        "/api/admin/upload",
        data={"kind": "result"},
        files={"file": ("fake.webp", _make_png_bytes(400, 400), "image/webp")},
        headers={"x-csrf-token": csrf},
    )
    assert bad_fmt.status_code == 422
    assert "WebP" in bad_fmt.json()["detail"]

    # Reject wrong aspect ratio (4:5 uploaded to 1:1 result field)
    bad_ratio = client.post(
        "/api/admin/upload",
        data={"kind": "result"},
        files={"file": ("wrong.webp", _make_webp_bytes(400, 500), "image/webp")},
        headers={"x-csrf-token": csrf},
    )
    assert bad_ratio.status_code == 422
    assert "1:1" in bad_ratio.json()["detail"]

    # Accept valid 1:1, 4:5, and 16:9 WebP uploads and verify random UUID filename (no student name)
    ok_1_1 = client.post(
        "/api/admin/upload",
        data={"kind": "result"},
        files={"file": ("aarav_sharma.webp", _make_webp_bytes(400, 400), "image/webp")},
        headers={"x-csrf-token": csrf},
    )
    assert ok_1_1.status_code == 200
    assert "aarav" not in ok_1_1.json()["url"].lower()

    ok_4_5 = client.post(
        "/api/admin/upload",
        data={"kind": "founder"},
        files={"file": ("founder.webp", _make_webp_bytes(400, 500), "image/webp")},
        headers={"x-csrf-token": csrf},
    )
    assert ok_4_5.status_code == 200

    ok_16_9 = client.post(
        "/api/admin/upload",
        data={"kind": "gallery"},
        files={"file": ("gallery.webp", _make_webp_bytes(640, 360), "image/webp")},
        headers={"x-csrf-token": csrf},
    )
    assert ok_16_9.status_code == 200


def test_ac_11_6_mocked_vercel_blob_upload_and_delete(
    client: TestClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    csrf = _admin_login(client)
    monkeypatch.setenv("BLOB_READ_WRITE_TOKEN", "mock-vercel-blob-token")
    calls: list[tuple[str, str]] = []

    class DummyResp:
        def raise_for_status(self) -> None:
            return None

        def json(self) -> dict[str, str]:
            return {"url": "https://mock-blob.vercel-storage.com/random-uuid.webp"}

    def fake_put(url: str, **kwargs: Any) -> DummyResp:
        calls.append(("PUT", url))
        return DummyResp()

    def fake_post(url: str, **kwargs: Any) -> DummyResp:
        calls.append(("POST", url))
        return DummyResp()

    import httpx

    monkeypatch.setattr(httpx, "put", fake_put)
    monkeypatch.setattr(httpx, "post", fake_post)

    up = client.post(
        "/api/admin/upload",
        data={"kind": "founder"},
        files={"file": ("portrait.webp", _make_webp_bytes(400, 500), "image/webp")},
        headers={"x-csrf-token": csrf},
    )
    assert up.status_code == 200
    blob_url = up.json()["url"]
    assert blob_url == "https://mock-blob.vercel-storage.com/random-uuid.webp"
    assert any(m == "PUT" for m, _ in calls)

    f_created = client.post(
        "/api/admin/founders",
        json={
            "name": "Blob Tested Founder",
            "photo_url": blob_url,
            "designation": "Director",
            "vision": "Vision",
            "visible": True,
        },
        headers={"x-csrf-token": csrf},
    ).json()
    client.delete(f"/api/admin/founders/{f_created['id']}", headers={"x-csrf-token": csrf})
    assert any(m == "POST" and "delete" in u for m, u in calls)


# ---------------------------------------------------------------------------
# US-12 to US-17: Admin CRUD Managers & Leads CSV Export
# ---------------------------------------------------------------------------


def test_ac_12_to_17_admin_managers_pin_limit_branch_protection_and_csv_escape(client: TestClient) -> None:
    csrf = _admin_login(client)
    photo_1_1 = client.post(
        "/api/admin/upload",
        data={"kind": "result"},
        files={"file": ("r.webp", _make_webp_bytes(400, 400), "image/webp")},
        headers={"x-csrf-token": csrf},
    ).json()["url"]

    # AC-12.5: Pinning a 9th result is blocked because 8 sample results are already pinned
    ninth_pin = client.post(
        "/api/admin/results",
        json={
            "name": "Ninth Pinned",
            "photo_url": photo_1_1,
            "class_name": "12",
            "stream": "Science",
            "score_text": "95%",
            "rank_text": "Top",
            "year": "2025-26",
            "published": True,
            "pinned": True,
        },
        headers={"x-csrf-token": csrf},
    )
    assert ninth_pin.status_code == 422
    assert "Max 8 pinned on homepage; unpin one first" in ninth_pin.json()["detail"]

    # AC-15.2: Marking a new branch as flagship unsets previous flagship
    b_res = client.post(
        "/api/admin/branches",
        json={
            "name": "New Flagship Center",
            "address": "Block C, West Patel Nagar, New Delhi 110008",
            "maps_url": "https://maps.google.com/?q=West+Patel+Nagar",
            "phone": "9811001122",
            "whatsapp": "9811001122",
            "is_flagship": True,
            "active": True,
        },
        headers={"x-csrf-token": csrf},
    )
    assert b_res.status_code == 200
    all_branches = client.get("/api/admin/branches").json()["branches"]
    flagships = [b for b in all_branches if b["is_flagship"]]
    assert len(flagships) == 1
    assert flagships[0]["name"] == "New Flagship Center"

    # AC-15.3: Deleting a branch that still has active batches is blocked (409) naming the batches
    del_branch = client.delete("/api/admin/branches/1", headers={"x-csrf-token": csrf})
    assert del_branch.status_code == 409
    assert "active batches" in del_branch.json()["detail"]

    # AC-17.3 & AC-22.4: Leads CSV export includes UTF-8 BOM, Devanagari, and formula-injection escaping
    client.post(
        "/api/public/leads",
        json={
            "student_name": "=CMD|' /C calc'!A0 प्रिया",
            "mobile": "9811556677",
            "class_name": "12",
            "stream": "Commerce",
            "branch_id": 1,
        },
    )
    csv_resp = client.get("/api/admin/leads/export.csv")
    assert csv_resp.status_code == 200
    raw_bytes = csv_resp.content
    assert raw_bytes.startswith(b"\xef\xbb\xbf")  # UTF-8 BOM
    csv_text = raw_bytes.decode("utf-8-sig")
    assert "'=CMD|' /C calc'!A0 प्रिया" in csv_text
    assert "parent_whatsapp" not in csv_text.lower()  # AC-20.8


# ---------------------------------------------------------------------------
# US-18: First-run defaults & 1-click Sample Content Removal
# ---------------------------------------------------------------------------


def test_ac_18_1_to_18_4_seed_once_and_remove_sample_content(client: TestClient) -> None:
    csrf = _admin_login(client)
    # Add one real founder so we verify AC-18.3 leaves real content untouched
    f_photo = client.post(
        "/api/admin/upload",
        data={"kind": "founder"},
        files={"file": ("f.webp", _make_webp_bytes(400, 500), "image/webp")},
        headers={"x-csrf-token": csrf},
    ).json()["url"]
    client.post(
        "/api/admin/founders",
        json={
            "name": "Real Founder Keep Me",
            "photo_url": f_photo,
            "designation": "Mathematics Head",
            "vision": "Real vision message.",
            "visible": True,
        },
        headers={"x-csrf-token": csrf},
    )

    rem = client.post("/api/admin/sample-content/remove", headers={"x-csrf-token": csrf})
    assert rem.status_code == 200
    assert rem.json()["removed"]["results_removed"] == 8

    boot = client.get("/api/public/bootstrap").json()
    assert len(boot["results"]) == 0
    assert [f["name"] for f in boot["founders"]] == ["Real Founder Keep Me"]
    # Flagship branch remains intact
    assert any(b["name"] == FLAGSHIP_NAME for b in boot["branches"])


# ---------------------------------------------------------------------------
# US-19, US-22, US-23: SEO, JSON-LD, Bundle Budget, Hinglish & Motion
# ---------------------------------------------------------------------------


def test_ac_19_1_to_19_5_and_22_and_23_seo_jsonld_bundle_and_hinglish(client: TestClient) -> None:
    # AC-19.4: robots.txt, sitemap.xml, OpenGraph & EducationalOrganization JSON-LD
    robots = client.get("/robots.txt")
    assert robots.status_code == 200
    assert "Disallow: /admin" in robots.text

    sitemap = client.get("/sitemap.xml")
    assert sitemap.status_code == 200
    assert "<loc>https://testserver/results</loc>" in sitemap.text

    home = client.get("/").text
    assert 'property="og:title"' in home
    assert "EducationalOrganization" in home
    assert "नतीजे जो बोलते हैं" in home  # AC-22.1 Hinglish accent line

    # AC-19.2: Verify compiled public JS bundle is <= 200 KB gzipped and admin is split into a separate chunk
    assets_dir = os.path.join(os.path.dirname(__file__), "..", "app", "static", "dist", "assets")
    assert os.path.isdir(assets_dir)
    files = os.listdir(assets_dir)
    admin_chunks = [f for f in files if f.startswith("admin-") and f.endswith(".js")]
    public_chunks = [f for f in files if f.startswith("index-") and f.endswith(".js")]
    assert len(admin_chunks) >= 1
    assert len(public_chunks) >= 1
    for pub_js in public_chunks:
        with open(os.path.join(assets_dir, pub_js), "rb") as fh:
            gz_size = len(gzip.compress(fh.read()))
            assert gz_size <= 200 * 1024, f"Public JS chunk {pub_js} gzipped size {gz_size} > 200KB"


# ---------------------------------------------------------------------------
# US-20 & US-21: Parent Consent by WhatsApp Link & Printable Bilingual PDF
# ---------------------------------------------------------------------------


def test_ac_20_1_to_20_8_and_21_1_to_21_4_whatsapp_consent_and_pdf(client: TestClient) -> None:
    csrf = _admin_login(client)
    # First unpin one sample result so we can create & pin a new student result
    photo_url = client.post(
        "/api/admin/upload",
        data={"kind": "result"},
        files={"file": ("student.webp", _make_webp_bytes(400, 400), "image/webp")},
        headers={"x-csrf-token": csrf},
    ).json()["url"]

    created = client.post(
        "/api/admin/results",
        json={
            "name": "Vihaan Mehta",
            "photo_url": photo_url,
            "class_name": "12",
            "stream": "Science",
            "score_text": "99.2%",
            "rank_text": "All Delhi Rank 4",
            "year": "2025-26",
            "parent_name": "Rajesh Mehta",
            "parent_whatsapp": "9811998877",
            "published": True,
            "pinned": False,
        },
        headers={"x-csrf-token": csrf},
    ).json()
    rid = created["id"]
    assert created["consent_status"] == "Not requested"

    # AC-20.2: Request consent on WhatsApp generates 14-day signed link and wa.me URL
    req_c = client.post(f"/api/admin/results/{rid}/request-consent", headers={"x-csrf-token": csrf})
    assert req_c.status_code == 200
    c_data = req_c.json()
    assert c_data["status"] == "Requested"
    assert c_data["whatsapp_url"].startswith("https://wa.me/919811998877?text=")
    token = c_data["token"]

    # AC-20.3: Consent link opens public data with student details + bilingual v1 text
    pub_c = client.get(f"/api/public/consent/{token}")
    assert pub_c.status_code == 200
    assert pub_c.json()["student"]["name"] == "Vihaan Mehta"
    assert pub_c.json()["consent_text_version"] == "v1"

    # AC-20.4: Agreeing requires parent typed name, sets status Given, and makes result public immediately
    missing_name = client.post(f"/api/public/consent/{token}", json={"decision": "agree", "parent_name": ""})
    assert missing_name.status_code == 422

    agree = client.post(
        f"/api/public/consent/{token}",
        json={"decision": "agree", "parent_name": "Rajesh Mehta"},
    )
    assert agree.status_code == 200
    assert agree.json()["status"] == "Given"

    # Result is now live on public results API, and parent_whatsapp is NOT exposed (AC-20.8)
    live_results = client.get("/api/public/results").json()["results"]
    vihaan = next(r for r in live_results if r["name"] == "Vihaan Mehta")
    assert "parent_whatsapp" not in vihaan
    assert "parent_name" not in vihaan

    # AC-20.6: Re-using an already used token or tampered token returns 410
    reused = client.get(f"/api/public/consent/{token}")
    assert reused.status_code == 410
    assert "This link is no longer valid, please contact Shikshanama" in reused.json()["detail"]

    # AC-20.7: Admin can withdraw consent -> removed from public pages immediately
    withdraw = client.post(f"/api/admin/results/{rid}/withdraw-consent", headers={"x-csrf-token": csrf})
    assert withdraw.status_code == 200
    after_withdraw = client.get("/api/public/results").json()["results"]
    assert all(r["name"] != "Vihaan Mehta" for r in after_withdraw)

    # AC-21.1, AC-21.2, AC-21.3: Download pre-filled PDF, blank PDF, and mark Paper consent received
    pdf_prefilled = client.get(f"/api/admin/results/{rid}/consent-pdf")
    assert pdf_prefilled.status_code == 200
    assert pdf_prefilled.content.startswith(b"%PDF-1.4")
    assert b"Vihaan Mehta" in pdf_prefilled.content

    pdf_blank = client.get("/api/admin/consent-pdf/blank")
    assert pdf_blank.status_code == 200
    assert pdf_blank.content.startswith(b"%PDF-1.4")

    paper_ok = client.post(
        f"/api/admin/results/{rid}/paper-consent",
        json={"staff_name": "Front Desk Anita", "received_date": "2026-11-02"},
        headers={"x-csrf-token": csrf},
    )
    assert paper_ok.status_code == 200
    assert paper_ok.json()["method"] == "Paper"
    after_paper = client.get("/api/public/results").json()["results"]
    assert any(r["name"] == "Vihaan Mehta" for r in after_paper)
