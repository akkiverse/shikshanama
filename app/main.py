"""FastAPI application for Shikshanama (शिक्षाNama) Official Website & Admin CMS."""

from __future__ import annotations

import csv
from datetime import datetime, timedelta
import html
from io import StringIO
import json
import os
import re
from typing import Any
import urllib.parse

from fastapi import Depends, FastAPI, File, Form, HTTPException, Query, Request, Response, UploadFile
from fastapi.responses import FileResponse, HTMLResponse, JSONResponse, PlainTextResponse, RedirectResponse

from app.database import (
    DEFAULT_SECTION_HEADINGS,
    IST,
    check_and_increment_rate_limit,
    delete_blob_by_url,
    get_db,
    init_and_seed_db,
    now_ist_iso,
    remove_all_sample_content,
    reset_rate_limit,
    store_blob_bytes,
)
from app.imaging import process_and_convert_to_webp, validate_and_inspect_webp
from app.pdf_gen import CONSENT_TEXT_EN, CONSENT_TEXT_HI, CONSENT_TEXT_VERSION, generate_consent_pdf
from app.security import (
    COOKIE_NAME,
    SESSION_TTL_SECONDS,
    create_consent_token,
    create_session_token,
    digits_for_wa,
    escape_csv_cell,
    hash_ip,
    hash_password,
    hash_token,
    normalize_indian_mobile,
    normalize_indian_phone,
    verify_consent_token,
    verify_password,
    verify_session_token,
)

from contextlib import asynccontextmanager


@asynccontextmanager
async def _lifespan(_app: FastAPI):
    init_and_seed_db()
    yield


app = FastAPI(title="Shikshanama (शिक्षाNama) Official Website & Admin CMS", version="0.1.0", lifespan=_lifespan)


def _ensure_ready() -> None:
    init_and_seed_db()


def _parse_numeric_score(score_text: str) -> float:
    m = re.search(r"(\d+(?:\.\d+)?)", score_text or "")
    return float(m.group(1)) if m else 0.0


def _format_batch_date(iso_date: str) -> str:
    try:
        dt = datetime.strptime(iso_date.strip(), "%Y-%m-%d")
        return dt.strftime("%d %b %Y").lstrip("0")
    except Exception:
        return iso_date


def _is_batch_within_window(iso_date: str) -> bool:
    """Return False if batch start date is more than 30 days in the past (AC-4.3)."""
    try:
        start_d = datetime.strptime(iso_date.strip(), "%Y-%m-%d").date()
        cutoff = datetime.now(IST).date() - timedelta(days=30)
        return start_d >= cutoff
    except Exception:
        return True


def _load_settings_dict(db: Any) -> dict[str, Any]:
    rows = db.fetchall("SELECT key, value FROM settings")
    raw = {r["key"]: r["value"] for r in rows}
    try:
        headings = json.loads(raw.get("section_headings", "{}"))
    except Exception:
        headings = DEFAULT_SECTION_HEADINGS
    merged_headings = {}
    for k, default_val in DEFAULT_SECTION_HEADINGS.items():
        val = headings.get(k) if isinstance(headings, dict) else None
        if isinstance(val, dict):
            merged_headings[k] = {"en": str(val.get("en", default_val["en"])), "hi": str(val.get("hi", default_val["hi"]))}
        else:
            merged_headings[k] = dict(default_val)

    try:
        classes_list = json.loads(raw.get("classes_list", '["6","7","8","9","10","11","12"]'))
    except Exception:
        classes_list = ["6", "7", "8", "9", "10", "11", "12"]

    try:
        streams_list = json.loads(raw.get("streams_list", '["Foundation","Science","Commerce","Humanities"]'))
    except Exception:
        streams_list = ["Foundation", "Science", "Commerce", "Humanities"]

    global_wa = raw.get("global_whatsapp", "")
    wa_template = raw.get(
        "whatsapp_template",
        "Hi Shikshanama (शिक्षाNama)! I want to book a Free Demo Class and counselling session.",
    )
    wa_digits = digits_for_wa(global_wa)
    global_wa_url = (
        f"https://wa.me/{wa_digits}?text={urllib.parse.quote(wa_template)}" if wa_digits else ""
    )

    ig_handle = (raw.get("instagram_handle", "shikshanamaofficial") or "shikshanamaofficial").lstrip("@")

    env_demo = os.environ.get("DEMO_MODE", "").strip().lower()
    admin_override = raw.get("demo_mode_admin_override", "").strip().lower()
    if admin_override in ("true", "false"):
        is_demo_mode = admin_override == "true"
    elif env_demo in ("false", "0", "no"):
        is_demo_mode = False
    elif env_demo in ("true", "1", "yes"):
        is_demo_mode = raw.get("demo_mode", "true").lower() == "true"
    else:
        is_demo_mode = raw.get("demo_mode", "false").lower() == "true"

    return {
        "brand_name": raw.get("brand_name", "Shikshanama (शिक्षाNama)"),
        "instagram_handle": ig_handle,
        "instagram_url": f"https://instagram.com/{ig_handle}",
        "global_phone": raw.get("global_phone", ""),
        "global_whatsapp": global_wa,
        "whatsapp_template": wa_template,
        "global_whatsapp_url": global_wa_url,
        "youtube_url": raw.get("youtube_url", ""),
        "facebook_url": raw.get("facebook_url", ""),
        "ticker_enabled": raw.get("ticker_enabled", "false").lower() == "true",
        "ticker_text": raw.get("ticker_text", ""),
        "ticker_link": raw.get("ticker_link", ""),
        "hero_image_url": raw.get("hero_image_url", ""),
        "demo_mode": is_demo_mode,
        "classes_list": classes_list,
        "streams_list": streams_list,
        "section_headings": merged_headings,
    }


def _fetch_public_results(
    db: Any,
    class_filter: str | None = None,
    stream_filter: str | None = None,
    year_filter: str | None = None,
    pinned_only: bool = False,
) -> list[dict[str, Any]]:
    """Fetch only published results whose consent status is 'Given' or 'Given (sample)' (AC-3.7)."""
    demo_mode = _load_settings_dict(db)["demo_mode"]
    rows = db.fetchall(
        """
        SELECT r.id, r.photo_url, r.name, r.class_name, r.stream,
               r.score_text, r.rank_text, r.year, r.pinned, r.sort_order, r.is_sample,
               c.status AS consent_status
        FROM results r
        INNER JOIN consents c ON c.result_id = r.id
        WHERE r.published = 1
          AND c.status IN ('Given', 'Given (sample)')
        """
    )
    filtered: list[dict[str, Any]] = []
    for r in rows:
        if not demo_mode and int(r["is_sample"]):
            continue
        if class_filter and class_filter.lower() != "all" and str(r["class_name"]).lower() != class_filter.lower():
            continue
        if stream_filter and stream_filter.lower() != "all" and str(r["stream"]).lower() != stream_filter.lower():
            continue
        if year_filter and year_filter.lower() != "all" and str(r["year"]).lower() != year_filter.lower():
            continue
        if pinned_only and not int(r["pinned"]):
            continue
        # Never expose parent_name or parent_whatsapp on public responses (AC-20.8)
        filtered.append(
            {
                "id": int(r["id"]),
                "photo_url": r["photo_url"],
                "name": r["name"],
                "class_name": r["class_name"],
                "stream": r["stream"],
                "score_text": r["score_text"],
                "rank_text": r["rank_text"],
                "year": r["year"],
                "pinned": bool(r["pinned"]),
                "sort_order": int(r["sort_order"]),
                "is_sample": bool(r["is_sample"]),
            }
        )

    # Order by admin sort_order ASC, then by numeric marks highest first (AC-3.5)
    filtered.sort(key=lambda item: (item["sort_order"], -_parse_numeric_score(item["score_text"])))
    if pinned_only:
        return filtered[:8]
    return filtered


def _fetch_public_branches(db: Any) -> list[dict[str, Any]]:
    demo_mode = _load_settings_dict(db)["demo_mode"]
    rows = db.fetchall(
        "SELECT * FROM branches WHERE active = 1 ORDER BY is_flagship DESC, sort_order ASC, id ASC"
    )
    out: list[dict[str, Any]] = []
    for b in rows:
        if not demo_mode and int(b["is_sample"]) and not int(b["is_flagship"]):
            continue
        maps_url = (b["maps_url"] or "").strip()
        if not maps_url:
            maps_url = "https://www.google.com/maps/search/?api=1&query=" + urllib.parse.quote_plus(b["address"])
        wa_digits = digits_for_wa(b["whatsapp"] or b["phone"])
        wa_msg = urllib.parse.quote(
            f"Hi Shikshanama (शिक्षाNama)! I have an enquiry regarding the {b['name']} branch."
        )
        out.append(
            {
                "id": int(b["id"]),
                "name": b["name"],
                "address": b["address"],
                "maps_url": maps_url,
                "phone": b["phone"],
                "tel_url": f"tel:{b['phone']}" if b["phone"] else "",
                "whatsapp": b["whatsapp"],
                "whatsapp_url": f"https://wa.me/{wa_digits}?text={wa_msg}" if wa_digits else "",
                "is_flagship": bool(b["is_flagship"]),
                "sort_order": int(b["sort_order"]),
                "is_sample": bool(b["is_sample"]),
            }
        )
    return out


def _fetch_public_batches(db: Any, settings: dict[str, Any]) -> list[dict[str, Any]]:
    demo_mode = settings.get("demo_mode", False)
    rows = db.fetchall(
        """
        SELECT b.*, br.name AS branch_name, br.whatsapp AS branch_whatsapp, br.phone AS branch_phone
        FROM batches b
        LEFT JOIN branches br ON br.id = b.branch_id
        WHERE b.active = 1
        ORDER BY b.start_date ASC, b.id ASC
        """
    )
    out: list[dict[str, Any]] = []
    for b in rows:
        if not demo_mode and int(b["is_sample"]):
            continue
        if not _is_batch_within_window(b["start_date"]):
            continue
        formatted_date = _format_batch_date(b["start_date"])
        branch_name = b.get("branch_name") or "West Patel Nagar (Flagship)"
        wa_raw = b.get("branch_whatsapp") or b.get("branch_phone") or settings.get("global_whatsapp", "")
        wa_digits = digits_for_wa(wa_raw)
        enroll_text = (
            f"Hi Shikshanama (शिक्षाNama)! I want to enrol in Class {b['class_name']} {b['stream']} "
            f"batch at {branch_name} starting {formatted_date}."
        )
        wa_url = f"https://wa.me/{wa_digits}?text={urllib.parse.quote(enroll_text)}" if wa_digits else ""
        out.append(
            {
                "id": int(b["id"]),
                "class_name": b["class_name"],
                "stream": b["stream"],
                "branch_id": int(b["branch_id"]),
                "branch_name": branch_name,
                "start_date": b["start_date"],
                "start_date_formatted": formatted_date,
                "timings": b["timings"],
                "status": b["status"],
                "enroll_whatsapp_url": wa_url if b["status"] in ("Open", "Filling Fast") else "",
                "is_sample": bool(b["is_sample"]),
            }
        )
    return out


def _fetch_public_payload(
    db: Any,
    class_filter: str | None = None,
    stream_filter: str | None = None,
    year_filter: str | None = None,
) -> dict[str, Any]:
    settings = _load_settings_dict(db)
    hero_stats = [
        {"id": int(s["id"]), "label": s["label"], "value": s["value"], "sort_order": int(s["sort_order"])}
        for s in db.fetchall("SELECT * FROM hero_stats WHERE visible = 1 ORDER BY sort_order ASC, id ASC")
    ]
    courses = []
    for c in db.fetchall("SELECT * FROM courses WHERE visible = 1 ORDER BY sort_order ASC, id ASC"):
        courses.append(
            {
                "id": int(c["id"]),
                "stream": c["stream"],
                "name": c["name"],
                "classes": c["classes"],
                "subjects": json.loads(c["subjects_json"] or "[]"),
                "highlights": json.loads(c["highlights_json"] or "[]"),
                "sort_order": int(c["sort_order"]),
            }
        )
    branches = _fetch_public_branches(db)
    batches = _fetch_public_batches(db, settings)
    pinned_results = _fetch_public_results(db, pinned_only=True)
    all_results = _fetch_public_results(db, class_filter=class_filter, stream_filter=stream_filter, year_filter=year_filter)
    all_unfiltered_results = _fetch_public_results(db)
    available_years = sorted({r["year"] for r in all_unfiltered_results}, reverse=True)
    available_classes = sorted({r["class_name"] for r in all_unfiltered_results}, key=lambda x: (len(x), x))

    founders = [
        {
            "id": int(f["id"]),
            "photo_url": f["photo_url"],
            "name": f["name"],
            "designation": f["designation"],
            "vision": f["vision"],
            "sort_order": int(f["sort_order"]),
            "is_sample": bool(f["is_sample"]),
        }
        for f in db.fetchall("SELECT * FROM founders WHERE visible = 1 ORDER BY sort_order ASC, id ASC")
        if settings["demo_mode"] or not int(f["is_sample"])
    ]
    testimonials = [
        {
            "id": int(t["id"]),
            "quote": t["quote"],
            "name": t["name"],
            "role": t["role"],
            "class_year": t["class_year"],
            "photo_url": t["photo_url"],
            "sort_order": int(t["sort_order"]),
            "is_sample": bool(t["is_sample"]),
        }
        for t in db.fetchall("SELECT * FROM testimonials WHERE visible = 1 ORDER BY sort_order ASC, id ASC")
        if settings["demo_mode"] or not int(t["is_sample"])
    ]
    gallery = [
        {
            "id": int(g["id"]),
            "image_url": g["image_url"],
            "caption": g["caption"],
            "sort_order": int(g["sort_order"]),
            "is_sample": bool(g["is_sample"]),
        }
        for g in db.fetchall("SELECT * FROM gallery_images WHERE visible = 1 ORDER BY sort_order ASC, id ASC")
        if settings["demo_mode"] or not int(g["is_sample"])
    ]

    return {
        "settings": settings,
        "hero_stats": hero_stats,
        "pinned_results": pinned_results,
        "results": all_results,
        "available_years": available_years or ["2025-26", "2024-25"],
        "available_classes": available_classes or ["10", "12"],
        "courses": courses,
        "batches": batches,
        "founders": founders,
        "branches": branches,
        "testimonials": testimonials,
        "gallery": gallery,
    }


# ---------------------------------------------------------------------------
# Admin Auth & CSRF Dependencies (US-10)
# ---------------------------------------------------------------------------


def require_admin(request: Request) -> dict[str, Any]:
    _ensure_ready()
    token = request.cookies.get(COOKIE_NAME)
    payload = verify_session_token(token)
    if not payload:
        raise HTTPException(status_code=401, detail="Authentication required.")

    with get_db() as db:
        user = db.fetchone(
            "SELECT id, email, active FROM admin_users WHERE id = ? AND email = ?",
            (int(payload["uid"]), str(payload["email"]).lower()),
        )
        if not user or not int(user["active"]):
            raise HTTPException(status_code=401, detail="Account disabled or session invalid.")

    if request.method in ("POST", "PUT", "PATCH", "DELETE"):
        header_csrf = (request.headers.get("x-csrf-token") or "").strip()
        expected_csrf = str(payload.get("csrf", ""))
        if not header_csrf or header_csrf != expected_csrf:
            raise HTTPException(status_code=403, detail="Invalid or missing CSRF token.")

    return {
        "id": int(user["id"]),
        "email": user["email"],
        "csrf_token": str(payload["csrf"]),
    }


# ---------------------------------------------------------------------------
# Public APIs
# ---------------------------------------------------------------------------


@app.get("/api/public/bootstrap")
def api_public_bootstrap(
    response: Response,
    class_name: str | None = Query(default=None, alias="class"),
    stream: str | None = Query(default=None),
    year: str | None = Query(default=None),
) -> dict[str, Any]:
    _ensure_ready()
    response.headers["Cache-Control"] = "public, s-maxage=60, stale-while-revalidate=120"
    with get_db() as db:
        return _fetch_public_payload(db, class_filter=class_name, stream_filter=stream, year_filter=year)


@app.get("/api/public/results")
def api_public_results(
    response: Response,
    class_name: str | None = Query(default=None, alias="class"),
    stream: str | None = Query(default=None),
    year: str | None = Query(default=None),
    pinned_only: bool = Query(default=False),
) -> dict[str, Any]:
    _ensure_ready()
    response.headers["Cache-Control"] = "public, s-maxage=60, stale-while-revalidate=120"
    with get_db() as db:
        items = _fetch_public_results(
            db,
            class_filter=class_name,
            stream_filter=stream,
            year_filter=year,
            pinned_only=pinned_only,
        )
        return {"results": items, "count": len(items)}


def _process_lead_submission(
    request: Request,
    student_name: str,
    mobile: str,
    class_name: str,
    stream: str,
    branch_id: int,
    source: str = "/",
    honeypot: str = "",
) -> dict[str, Any]:
    _ensure_ready()
    # Honeypot check: discard silently and return thank-you (AC-9.4)
    if (honeypot or "").strip():
        return {
            "ok": True,
            "thank_you": True,
            "discarded": True,
            "message": "Thank you! Our academic counsellor will contact you shortly.",
            "whatsapp_url": "https://wa.me/919811004242",
        }

    client_ip = request.headers.get("x-forwarded-for", "").split(",")[0].strip() or (
        request.client.host if request.client else "127.0.0.1"
    )
    ip_digest = hash_ip(client_ip)

    with get_db() as db:
        allowed, _ = check_and_increment_rate_limit(
            db, key=f"lead:{ip_digest}", max_attempts=5, window_seconds=600, increment=True
        )
        if not allowed:
            raise HTTPException(
                status_code=429,
                detail="Too many demo requests from your connection. Please try again later.",
            )

        clean_name = (student_name or "").strip()
        if not clean_name:
            raise HTTPException(status_code=422, detail="Student Name is required.")
        try:
            normalized_mobile = normalize_indian_mobile(mobile)
        except ValueError as exc:
            raise HTTPException(status_code=422, detail=str(exc)) from exc

        clean_class = (class_name or "").strip()
        clean_stream = (stream or "").strip()
        if not clean_class or not clean_stream:
            raise HTTPException(status_code=422, detail="Class and Stream are required.")

        branch = db.fetchone("SELECT id, name, whatsapp, phone, active FROM branches WHERE id = ?", (int(branch_id),))
        if not branch or not int(branch["active"]):
            raise HTTPException(status_code=422, detail="Please select an active preferred branch.")

        lead_id = db.insert_id(
            "leads",
            {
                "created_at": now_ist_iso(),
                "student_name": clean_name,
                "mobile": normalized_mobile,
                "class_name": clean_class,
                "stream": clean_stream,
                "branch_id": int(branch["id"]),
                "status": "New",
                "note": "",
                "source": (source or "/")[:120],
                "ip_hash": ip_digest,
            },
        )
        settings = _load_settings_dict(db)
        wa_target = digits_for_wa(branch["whatsapp"] or branch["phone"] or settings.get("global_whatsapp", ""))
        wa_text = (
            f"Hi Shikshanama (शिक्षाNama)! I just booked a Free Demo for {clean_name} "
            f"(Class {clean_class} - {clean_stream}) at {branch['name']}."
        )
        wa_url = f"https://wa.me/{wa_target}?text={urllib.parse.quote(wa_text)}" if wa_target else ""
        return {
            "ok": True,
            "thank_you": True,
            "lead_id": lead_id,
            "mobile": normalized_mobile,
            "message": "Thank you! Your Free Demo Class request is confirmed.",
            "whatsapp_url": wa_url,
        }


@app.post("/api/public/leads")
async def api_public_create_lead(request: Request) -> dict[str, Any]:
    body = await request.json()
    try:
        branch_id = int(body.get("branch_id", 0))
    except (TypeError, ValueError):
        branch_id = 0
    return _process_lead_submission(
        request=request,
        student_name=str(body.get("student_name", "")),
        mobile=str(body.get("mobile", "")),
        class_name=str(body.get("class_name", "")),
        stream=str(body.get("stream", "")),
        branch_id=branch_id,
        source=str(body.get("source", "/")),
        honeypot=str(body.get("website_url", "") or body.get("honeypot", "")),
    )


@app.post("/api/public/leads/form")
def api_public_create_lead_form(
    request: Request,
    student_name: str = Form(""),
    mobile: str = Form(""),
    class_name: str = Form(""),
    stream: str = Form(""),
    branch_id: int = Form(0),
    source: str = Form("/"),
    website_url: str = Form(""),
) -> Response:
    """Non-JS form POST fallback redirecting to /thank-you (AC-9.6)."""
    res = _process_lead_submission(
        request=request,
        student_name=student_name,
        mobile=mobile,
        class_name=class_name,
        stream=stream,
        branch_id=branch_id,
        source=source,
        honeypot=website_url,
    )
    wa_q = urllib.parse.quote(res.get("whatsapp_url", ""))
    return RedirectResponse(url=f"/thank-you?wa={wa_q}", status_code=303)


# ---------------------------------------------------------------------------
# Public Parent Consent Endpoints (US-20)
# ---------------------------------------------------------------------------


def _validate_active_consent_token(db: Any, token: str) -> tuple[dict[str, Any], dict[str, Any]]:
    payload = verify_consent_token(token)
    if not payload:
        raise HTTPException(
            status_code=410,
            detail="This link is no longer valid, please contact Shikshanama",
        )
    rid = int(payload.get("rid", 0))
    t_hash = hash_token(token)
    consent = db.fetchone("SELECT * FROM consents WHERE result_id = ?", (rid,))
    if (
        not consent
        or consent["status"] != "Requested"
        or not consent["token_hash"]
        or consent["token_hash"] != t_hash
        or int(consent["expires_at"]) < int(datetime.now().timestamp())
    ):
        raise HTTPException(
            status_code=410,
            detail="This link is no longer valid, please contact Shikshanama",
        )
    result = db.fetchone("SELECT * FROM results WHERE id = ?", (rid,))
    if not result:
        raise HTTPException(
            status_code=410,
            detail="This link is no longer valid, please contact Shikshanama",
        )
    return result, consent


@app.get("/api/public/consent/{token}")
def api_public_get_consent(token: str) -> dict[str, Any]:
    _ensure_ready()
    with get_db() as db:
        result, _ = _validate_active_consent_token(db, token)
        settings = _load_settings_dict(db)
        return {
            "valid": True,
            "student": {
                "name": result["name"],
                "photo_url": result["photo_url"],
                "class_name": result["class_name"],
                "stream": result["stream"],
                "score_text": result["score_text"],
                "rank_text": result["rank_text"],
                "year": result["year"],
            },
            "consent_text_version": CONSENT_TEXT_VERSION,
            "consent_text_en": CONSENT_TEXT_EN,
            "consent_text_hi": CONSENT_TEXT_HI,
            "withdrawal_info": (
                f"You may withdraw consent anytime by messaging or calling Shikshanama at "
                f"{settings.get('global_whatsapp') or settings.get('global_phone') or 'our West Patel Nagar office'}."
            ),
        }


@app.post("/api/public/consent/{token}")
async def api_public_submit_consent(token: str, request: Request) -> dict[str, Any]:
    _ensure_ready()
    body = await request.json()
    decision = str(body.get("decision", "")).strip().lower()
    parent_name = str(body.get("parent_name", "")).strip()

    client_ip = request.headers.get("x-forwarded-for", "").split(",")[0].strip() or (
        request.client.host if request.client else "127.0.0.1"
    )
    ip_digest = hash_ip(client_ip)

    with get_db() as db:
        result, _ = _validate_active_consent_token(db, token)
        rid = int(result["id"])
        if decision == "agree":
            if not parent_name:
                raise HTTPException(status_code=422, detail="Please type your full name to confirm consent.")
            db.execute(
                """
                UPDATE consents
                SET status = 'Given',
                    method = 'WhatsApp link',
                    token_hash = '',
                    agreed_name = ?,
                    agreed_at = ?,
                    text_version = ?,
                    ip_hash = ?,
                    recorded_by = 'parent_online'
                WHERE result_id = ?
                """,
                (parent_name, now_ist_iso(), CONSENT_TEXT_VERSION, ip_digest, rid),
            )
            return {
                "ok": True,
                "status": "Given",
                "message": "Thank you! Your consent has been recorded. धन्यवाद, आपकी सहमति दर्ज हो गई है।",
            }
        elif decision == "decline":
            db.execute(
                """
                UPDATE consents
                SET status = 'Declined',
                    method = 'WhatsApp link',
                    token_hash = '',
                    agreed_name = ?,
                    agreed_at = ?,
                    text_version = ?,
                    ip_hash = ?,
                    recorded_by = 'parent_online'
                WHERE result_id = ?
                """,
                (parent_name, now_ist_iso(), CONSENT_TEXT_VERSION, ip_digest, rid),
            )
            return {
                "ok": True,
                "status": "Declined",
                "message": "We have recorded that you do not consent. This profile will not be published.",
            }
        else:
            raise HTTPException(status_code=422, detail="Decision must be 'agree' or 'decline'.")


# ---------------------------------------------------------------------------
# Blob Serving & SEO (robots.txt, sitemap.xml)
# ---------------------------------------------------------------------------


@app.get("/api/blobs/{filename}")
def api_get_blob(filename: str) -> Response:
    _ensure_ready()
    clean_name = os.path.basename(filename)
    with get_db() as db:
        row = db.fetchone("SELECT data, content_type FROM blobs WHERE filename = ?", (clean_name,))
        if not row:
            raise HTTPException(status_code=404, detail="Image not found")
        raw_bytes = bytes(row["data"])
        return Response(
            content=raw_bytes,
            media_type=row["content_type"] or "image/webp",
            headers={"Cache-Control": "public, max-age=31536000, immutable"},
        )


@app.get("/robots.txt", response_class=PlainTextResponse)
def robots_txt(request: Request) -> str:
    base = str(request.base_url).rstrip("/")
    return f"User-agent: *\nDisallow: /admin\nAllow: /\nSitemap: {base}/sitemap.xml\n"


@app.get("/sitemap.xml")
def sitemap_xml(request: Request) -> Response:
    base = str(request.base_url).rstrip("/")
    paths = ["/", "/results", "/courses", "/founders", "/branches"]
    urls_xml = "".join(f"<url><loc>{html.escape(base + p)}</loc></url>" for p in paths)
    xml = (
        '<?xml version="1.0" encoding="UTF-8"?>'
        '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'
        f"{urls_xml}"
        "</urlset>"
    )
    return Response(content=xml, media_type="application/xml")


# ---------------------------------------------------------------------------
# Admin Auth & Staff Endpoints (US-10)
# ---------------------------------------------------------------------------


@app.post("/api/admin/login")
async def api_admin_login(request: Request, response: Response) -> dict[str, Any]:
    _ensure_ready()
    body = await request.json()
    email = str(body.get("email", "")).strip().lower()
    password = str(body.get("password", ""))
    if not email or not password:
        raise HTTPException(status_code=401, detail="Email or password is wrong")

    rate_key = f"login:{email}"
    error_status = 0
    error_detail = ""
    session_data: dict[str, Any] | None = None
    user_info: dict[str, Any] | None = None

    with get_db() as db:
        # Check if already locked out (5 failed attempts in 15 mins -> 15 min block, AC-10.4)
        allowed, count = check_and_increment_rate_limit(
            db, key=rate_key, max_attempts=5, window_seconds=900, increment=False
        )
        if not allowed and count >= 5:
            error_status = 429
            error_detail = "Too many failed login attempts for this email. Try again in 15 minutes."
        else:
            user = db.fetchone("SELECT id, email, password_hash, active FROM admin_users WHERE email = ?", (email,))
            if not user or not int(user["active"]) or not verify_password(password, user["password_hash"]):
                _, new_count = check_and_increment_rate_limit(
                    db, key=rate_key, max_attempts=5, window_seconds=900, increment=True
                )
                if new_count > 5:
                    error_status = 429
                    error_detail = "Too many failed login attempts for this email. Try again in 15 minutes."
                else:
                    error_status = 401
                    error_detail = "Email or password is wrong"
            else:
                reset_rate_limit(db, rate_key)
                session_data = create_session_token(user_id=int(user["id"]), email=user["email"])
                user_info = {"id": int(user["id"]), "email": user["email"]}

    if error_status:
        raise HTTPException(status_code=error_status, detail=error_detail)

    assert session_data is not None and user_info is not None
    response.set_cookie(
        key=COOKIE_NAME,
        value=session_data["token"],
        max_age=SESSION_TTL_SECONDS,
        httponly=True,
        secure=True,
        samesite="lax",
        path="/",
    )
    return {
        "ok": True,
        "user": user_info,
        "csrf_token": session_data["csrf_token"],
    }


@app.post("/api/admin/logout")
def api_admin_logout(response: Response) -> dict[str, Any]:
    response.delete_cookie(key=COOKIE_NAME, path="/")
    return {"ok": True}


@app.get("/api/admin/session")
def api_admin_session(admin: dict[str, Any] = Depends(require_admin)) -> dict[str, Any]:
    return {
        "authenticated": True,
        "user": {"id": admin["id"], "email": admin["email"]},
        "csrf_token": admin["csrf_token"],
    }


@app.get("/api/admin/staff")
def api_admin_list_staff(admin: dict[str, Any] = Depends(require_admin)) -> dict[str, Any]:
    with get_db() as db:
        rows = db.fetchall("SELECT id, email, active, created_at FROM admin_users ORDER BY id ASC")
        return {
            "staff": [
                {
                    "id": int(r["id"]),
                    "email": r["email"],
                    "active": bool(r["active"]),
                    "created_at": r["created_at"],
                }
                for r in rows
            ]
        }


@app.post("/api/admin/staff")
async def api_admin_create_staff(request: Request, admin: dict[str, Any] = Depends(require_admin)) -> dict[str, Any]:
    body = await request.json()
    email = str(body.get("email", "")).strip().lower()
    password = str(body.get("password", ""))
    if not email or "@" not in email or len(password) < 6:
        raise HTTPException(status_code=422, detail="Valid email and password (min 6 chars) are required.")
    with get_db() as db:
        existing = db.fetchone("SELECT id FROM admin_users WHERE email = ?", (email,))
        if existing:
            raise HTTPException(status_code=422, detail="A staff account with this email already exists.")
        uid = db.insert_id(
            "admin_users",
            {
                "email": email,
                "password_hash": hash_password(password),
                "active": 1,
                "created_at": now_ist_iso(),
            },
        )
        return {"ok": True, "id": uid, "email": email, "active": True}


@app.patch("/api/admin/staff/{staff_id}")
async def api_admin_update_staff(
    staff_id: int, request: Request, admin: dict[str, Any] = Depends(require_admin)
) -> dict[str, Any]:
    body = await request.json()
    with get_db() as db:
        target = db.fetchone("SELECT id, email, active FROM admin_users WHERE id = ?", (staff_id,))
        if not target:
            raise HTTPException(status_code=404, detail="Staff account not found.")
        if "active" in body:
            new_active = 1 if body["active"] else 0
            db.execute("UPDATE admin_users SET active = ? WHERE id = ?", (new_active, staff_id))
        if body.get("password"):
            new_pw = str(body["password"])
            if len(new_pw) < 6:
                raise HTTPException(status_code=422, detail="Password must be at least 6 characters.")
            db.execute("UPDATE admin_users SET password_hash = ? WHERE id = ?", (hash_password(new_pw), staff_id))
        updated = db.fetchone("SELECT id, email, active FROM admin_users WHERE id = ?", (staff_id,))
        return {
            "ok": True,
            "id": int(updated["id"]),
            "email": updated["email"],
            "active": bool(updated["active"]),
        }


# ---------------------------------------------------------------------------
# Admin Image Upload & Cropper Validation (US-11)
# ---------------------------------------------------------------------------


@app.post("/api/admin/upload")
async def api_admin_upload(
    file: UploadFile = File(...),
    kind: str = Form("result"),
    admin: dict[str, Any] = Depends(require_admin),
) -> dict[str, Any]:
    raw_bytes = await file.read()
    try:
        webp_bytes, info = process_and_convert_to_webp(raw_bytes, kind=kind.strip().lower())
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc

    with get_db() as db:
        url = store_blob_bytes(db, webp_bytes, is_sample=False)
        return {
            "ok": True,
            "url": url,
            "width": info["width"],
            "height": info["height"],
            "size_bytes": info["size_bytes"],
            "kind": info["kind"],
        }


# ---------------------------------------------------------------------------
# Admin Dashboard & Sample Content Removal (US-17, US-18)
# ---------------------------------------------------------------------------


@app.get("/api/admin/dashboard")
def api_admin_dashboard(admin: dict[str, Any] = Depends(require_admin)) -> dict[str, Any]:
    with get_db() as db:
        new_leads = db.fetchone("SELECT COUNT(*) AS c FROM leads WHERE status = 'New'")
        pending_consents = db.fetchone(
            "SELECT COUNT(*) AS c FROM consents WHERE status IN ('Not requested', 'Requested')"
        )
        declined_consents = db.fetchone("SELECT COUNT(*) AS c FROM consents WHERE status = 'Declined'")
        total_results = db.fetchone("SELECT COUNT(*) AS c FROM results")
        total_batches = db.fetchone("SELECT COUNT(*) AS c FROM batches WHERE active = 1")
        total_branches = db.fetchone("SELECT COUNT(*) AS c FROM branches WHERE active = 1")
        sample_results = db.fetchone("SELECT COUNT(*) AS c FROM results WHERE is_sample = 1")
        settings = _load_settings_dict(db)
        return {
            "new_leads_count": int(new_leads["c"]) if new_leads else 0,
            "pending_consents_count": int(pending_consents["c"]) if pending_consents else 0,
            "declined_consents_count": int(declined_consents["c"]) if declined_consents else 0,
            "total_results": int(total_results["c"]) if total_results else 0,
            "total_batches": int(total_batches["c"]) if total_batches else 0,
            "total_branches": int(total_branches["c"]) if total_branches else 0,
            "has_sample_content": bool(sample_results and int(sample_results["c"]) > 0) or settings["demo_mode"],
            "demo_mode": settings["demo_mode"],
        }


@app.post("/api/admin/sample-content/remove")
def api_admin_remove_sample(admin: dict[str, Any] = Depends(require_admin)) -> dict[str, Any]:
    with get_db() as db:
        summary = remove_all_sample_content(db)
        _upsert_setting(db, "demo_mode_admin_override", "false")
        return {"ok": True, "removed": summary}


# ---------------------------------------------------------------------------
# Admin Results & Consent Manager (US-12, US-20, US-21)
# ---------------------------------------------------------------------------


@app.get("/api/admin/results")
def api_admin_list_results(
    class_name: str | None = Query(default=None, alias="class"),
    stream: str | None = Query(default=None),
    year: str | None = Query(default=None),
    consent_status: str | None = Query(default=None),
    admin: dict[str, Any] = Depends(require_admin),
) -> dict[str, Any]:
    with get_db() as db:
        rows = db.fetchall(
            """
            SELECT r.*, c.status AS consent_status, c.method AS consent_method,
                   c.agreed_name, c.agreed_at, c.text_version, c.recorded_by
            FROM results r
            LEFT JOIN consents c ON c.result_id = r.id
            ORDER BY r.sort_order ASC, r.id DESC
            """
        )
        items: list[dict[str, Any]] = []
        for r in rows:
            c_status = r.get("consent_status") or "Not requested"
            if class_name and class_name.lower() != "all" and str(r["class_name"]).lower() != class_name.lower():
                continue
            if stream and stream.lower() != "all" and str(r["stream"]).lower() != stream.lower():
                continue
            if year and year.lower() != "all" and str(r["year"]).lower() != year.lower():
                continue
            if consent_status and consent_status.lower() != "all" and c_status.lower() != consent_status.lower():
                continue
            items.append(
                {
                    "id": int(r["id"]),
                    "photo_url": r["photo_url"],
                    "name": r["name"],
                    "class_name": r["class_name"],
                    "stream": r["stream"],
                    "score_text": r["score_text"],
                    "rank_text": r["rank_text"],
                    "year": r["year"],
                    "published": bool(r["published"]),
                    "pinned": bool(r["pinned"]),
                    "sort_order": int(r["sort_order"]),
                    "is_sample": bool(r["is_sample"]),
                    "parent_name": r["parent_name"],
                    "parent_whatsapp": r["parent_whatsapp"],
                    "consent_status": c_status,
                    "consent_method": r.get("consent_method") or "",
                    "agreed_name": r.get("agreed_name") or "",
                    "agreed_at": r.get("agreed_at") or "",
                    "is_live": bool(r["published"]) and c_status in ("Given", "Given (sample)"),
                }
            )
        return {"results": items}


@app.post("/api/admin/results")
async def api_admin_create_result(
    request: Request, admin: dict[str, Any] = Depends(require_admin)
) -> dict[str, Any]:
    body = await request.json()
    name = str(body.get("name", "")).strip()
    photo_url = str(body.get("photo_url", "")).strip()
    class_name = str(body.get("class_name", "")).strip()
    stream = str(body.get("stream", "")).strip()
    score_text = str(body.get("score_text", "")).strip()
    rank_text = str(body.get("rank_text", "")).strip()
    year = str(body.get("year", "2025-26")).strip()
    parent_name = str(body.get("parent_name", "")).strip()
    parent_wa_raw = str(body.get("parent_whatsapp", "")).strip()
    published = bool(body.get("published", True))
    pinned = bool(body.get("pinned", False))

    if not name or not photo_url or not class_name or not stream or not score_text:
        raise HTTPException(status_code=422, detail="Photo, student name, class, stream, and marks are required.")

    parent_whatsapp = ""
    if parent_wa_raw:
        try:
            parent_whatsapp = normalize_indian_mobile(parent_wa_raw)
        except ValueError as exc:
            raise HTTPException(status_code=422, detail=f"Parent WhatsApp: {exc}") from exc

    with get_db() as db:
        if pinned:
            pinned_count = db.fetchone("SELECT COUNT(*) AS c FROM results WHERE pinned = 1")
            if pinned_count and int(pinned_count["c"]) >= 8:
                raise HTTPException(status_code=422, detail="Max 8 pinned on homepage; unpin one first")

        max_order = db.fetchone("SELECT COALESCE(MAX(sort_order), 0) AS m FROM results")
        next_order = (int(max_order["m"]) if max_order else 0) + 1
        rid = db.insert_id(
            "results",
            {
                "photo_url": photo_url,
                "name": name,
                "class_name": class_name,
                "stream": stream,
                "score_text": score_text,
                "rank_text": rank_text,
                "year": year,
                "published": 1 if published else 0,
                "pinned": 1 if pinned else 0,
                "sort_order": next_order,
                "is_sample": 0,
                "parent_name": parent_name,
                "parent_whatsapp": parent_whatsapp,
            },
        )
        initial_consent = "Given" if body.get("consent_given") is True else "Not requested"
        db.insert_id(
            "consents",
            {
                "result_id": rid,
                "status": initial_consent,
                "method": "Paper" if initial_consent == "Given" else "",
                "token_hash": "",
                "expires_at": 0,
                "agreed_name": parent_name if initial_consent == "Given" else "",
                "agreed_at": now_ist_iso() if initial_consent == "Given" else "",
                "text_version": CONSENT_TEXT_VERSION,
                "ip_hash": "",
                "recorded_by": admin["email"] if initial_consent == "Given" else "",
            },
        )
        warning = (
            "Will go live once parent consent is received"
            if published and initial_consent not in ("Given", "Given (sample)")
            else ""
        )
        return {"ok": True, "id": rid, "consent_status": initial_consent, "warning": warning}


@app.put("/api/admin/results/{result_id}")
async def api_admin_update_result(
    result_id: int, request: Request, admin: dict[str, Any] = Depends(require_admin)
) -> dict[str, Any]:
    body = await request.json()
    with get_db() as db:
        existing = db.fetchone("SELECT * FROM results WHERE id = ?", (result_id,))
        if not existing:
            raise HTTPException(status_code=404, detail="Result not found.")

        new_pinned = bool(body.get("pinned", existing["pinned"]))
        if new_pinned and not int(existing["pinned"]):
            pinned_count = db.fetchone(
                "SELECT COUNT(*) AS c FROM results WHERE pinned = 1 AND id != ?", (result_id,)
            )
            if pinned_count and int(pinned_count["c"]) >= 8:
                raise HTTPException(status_code=422, detail="Max 8 pinned on homepage; unpin one first")

        new_photo = str(body.get("photo_url", existing["photo_url"])).strip()
        if new_photo and new_photo != existing["photo_url"]:
            delete_blob_by_url(db, existing["photo_url"])

        parent_wa_raw = str(body.get("parent_whatsapp", existing["parent_whatsapp"])).strip()
        parent_whatsapp = ""
        if parent_wa_raw:
            try:
                parent_whatsapp = normalize_indian_mobile(parent_wa_raw)
            except ValueError as exc:
                raise HTTPException(status_code=422, detail=f"Parent WhatsApp: {exc}") from exc

        new_published = bool(body.get("published", existing["published"]))
        db.execute(
            """
            UPDATE results
            SET photo_url = ?, name = ?, class_name = ?, stream = ?,
                score_text = ?, rank_text = ?, year = ?,
                published = ?, pinned = ?, parent_name = ?, parent_whatsapp = ?,
                is_sample = 0
            WHERE id = ?
            """,
            (
                new_photo,
                str(body.get("name", existing["name"])).strip(),
                str(body.get("class_name", existing["class_name"])).strip(),
                str(body.get("stream", existing["stream"])).strip(),
                str(body.get("score_text", existing["score_text"])).strip(),
                str(body.get("rank_text", existing["rank_text"])).strip(),
                str(body.get("year", existing["year"])).strip(),
                1 if new_published else 0,
                1 if new_pinned else 0,
                str(body.get("parent_name", existing["parent_name"])).strip(),
                parent_whatsapp,
                result_id,
            ),
        )
        consent = db.fetchone("SELECT status FROM consents WHERE result_id = ?", (result_id,))
        c_status = consent["status"] if consent else "Not requested"
        warning = (
            "Will go live once parent consent is received"
            if new_published and c_status not in ("Given", "Given (sample)")
            else ""
        )
        return {"ok": True, "id": result_id, "consent_status": c_status, "warning": warning}


@app.delete("/api/admin/results/{result_id}")
def api_admin_delete_result(result_id: int, admin: dict[str, Any] = Depends(require_admin)) -> dict[str, Any]:
    with get_db() as db:
        existing = db.fetchone("SELECT id, photo_url FROM results WHERE id = ?", (result_id,))
        if not existing:
            raise HTTPException(status_code=404, detail="Result not found.")
        delete_blob_by_url(db, existing["photo_url"])
        db.execute("DELETE FROM consents WHERE result_id = ?", (result_id,))
        db.execute("DELETE FROM results WHERE id = ?", (result_id,))
        return {"ok": True}


@app.post("/api/admin/results/reorder")
async def api_admin_reorder_results(
    request: Request, admin: dict[str, Any] = Depends(require_admin)
) -> dict[str, Any]:
    body = await request.json()
    ids = body.get("ids", [])
    with get_db() as db:
        for order, rid in enumerate(ids, start=1):
            db.execute("UPDATE results SET sort_order = ? WHERE id = ?", (order, int(rid)))
    return {"ok": True}


@app.post("/api/admin/results/{result_id}/request-consent")
def api_admin_request_consent(
    result_id: int, request: Request, admin: dict[str, Any] = Depends(require_admin)
) -> dict[str, Any]:
    with get_db() as db:
        result = db.fetchone("SELECT * FROM results WHERE id = ?", (result_id,))
        if not result:
            raise HTTPException(status_code=404, detail="Result not found.")
        parent_wa = (result["parent_whatsapp"] or "").strip()
        if not parent_wa:
            raise HTTPException(
                status_code=422,
                detail="Save the parent's WhatsApp number on this result before requesting consent.",
            )
        token, t_hash, expires_at = create_consent_token(result_id)
        existing_c = db.fetchone("SELECT id FROM consents WHERE result_id = ?", (result_id,))
        if existing_c:
            db.execute(
                """
                UPDATE consents
                SET status = 'Requested', method = 'WhatsApp link',
                    token_hash = ?, expires_at = ?, text_version = ?
                WHERE result_id = ?
                """,
                (t_hash, expires_at, CONSENT_TEXT_VERSION, result_id),
            )
        else:
            db.insert_id(
                "consents",
                {
                    "result_id": result_id,
                    "status": "Requested",
                    "method": "WhatsApp link",
                    "token_hash": t_hash,
                    "expires_at": expires_at,
                    "agreed_name": "",
                    "agreed_at": "",
                    "text_version": CONSENT_TEXT_VERSION,
                    "ip_hash": "",
                    "recorded_by": admin["email"],
                },
            )

        base_url = str(request.base_url).rstrip("/")
        consent_url = f"{base_url}/consent/{token}"
        bilingual_msg = (
            f"नमस्ते / Hello {result['parent_name'] or 'Parent'},\n"
            f"Shikshanama (शिक्षाNama) would like your consent to feature {result['name']} "
            f"(Class {result['class_name']} {result['stream']} · {result['score_text']}) on our Hall of Fame.\n"
            f"कृपया इस लिंक पर क्लिक करके अपनी सहमति दें (लिंक 14 दिनों के लिए मान्य है):\n{consent_url}"
        )
        wa_digits = digits_for_wa(parent_wa)
        whatsapp_url = f"https://wa.me/{wa_digits}?text={urllib.parse.quote(bilingual_msg)}"
        return {
            "ok": True,
            "status": "Requested",
            "token": token,
            "consent_url": consent_url,
            "whatsapp_url": whatsapp_url,
            "expires_at": expires_at,
        }


@app.post("/api/admin/results/{result_id}/paper-consent")
async def api_admin_paper_consent(
    result_id: int, request: Request, admin: dict[str, Any] = Depends(require_admin)
) -> dict[str, Any]:
    body = await request.json()
    staff_name = str(body.get("staff_name", "")).strip() or admin["email"]
    received_date = str(body.get("received_date", "")).strip() or now_ist_iso()
    parent_name = str(body.get("parent_name", "")).strip()
    with get_db() as db:
        result = db.fetchone("SELECT * FROM results WHERE id = ?", (result_id,))
        if not result:
            raise HTTPException(status_code=404, detail="Result not found.")
        db.execute(
            """
            UPDATE consents
            SET status = 'Given', method = 'Paper', token_hash = '',
                agreed_name = ?, agreed_at = ?, text_version = ?, recorded_by = ?
            WHERE result_id = ?
            """,
            (parent_name or result["parent_name"] or "Paper Signatory", received_date, CONSENT_TEXT_VERSION, staff_name, result_id),
        )
        return {"ok": True, "status": "Given", "method": "Paper", "recorded_by": staff_name}


@app.post("/api/admin/results/{result_id}/withdraw-consent")
def api_admin_withdraw_consent(
    result_id: int, admin: dict[str, Any] = Depends(require_admin)
) -> dict[str, Any]:
    with get_db() as db:
        result = db.fetchone("SELECT id FROM results WHERE id = ?", (result_id,))
        if not result:
            raise HTTPException(status_code=404, detail="Result not found.")
        db.execute(
            """
            UPDATE consents
            SET status = 'Declined', token_hash = '', recorded_by = ?
            WHERE result_id = ?
            """,
            (admin["email"], result_id),
        )
        return {"ok": True, "status": "Declined"}


@app.get("/api/admin/results/{result_id}/consent-pdf")
def api_admin_result_consent_pdf(
    result_id: int, admin: dict[str, Any] = Depends(require_admin)
) -> Response:
    with get_db() as db:
        result = db.fetchone("SELECT * FROM results WHERE id = ?", (result_id,))
        if not result:
            raise HTTPException(status_code=404, detail="Result not found.")
        pdf_bytes = generate_consent_pdf(result)
        return Response(
            content=pdf_bytes,
            media_type="application/pdf",
            headers={
                "Content-Disposition": f'attachment; filename="shikshanama-consent-result-{result_id}.pdf"'
            },
        )


@app.get("/api/admin/consent-pdf/blank")
def api_admin_blank_consent_pdf(admin: dict[str, Any] = Depends(require_admin)) -> Response:
    pdf_bytes = generate_consent_pdf(None)
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": 'attachment; filename="shikshanama-consent-form-blank.pdf"'},
    )


# ---------------------------------------------------------------------------
# Admin Founders Manager (US-13)
# ---------------------------------------------------------------------------


@app.get("/api/admin/founders")
def api_admin_list_founders(admin: dict[str, Any] = Depends(require_admin)) -> dict[str, Any]:
    with get_db() as db:
        rows = db.fetchall("SELECT * FROM founders ORDER BY sort_order ASC, id ASC")
        return {
            "founders": [
                {
                    "id": int(f["id"]),
                    "photo_url": f["photo_url"],
                    "name": f["name"],
                    "designation": f["designation"],
                    "vision": f["vision"],
                    "sort_order": int(f["sort_order"]),
                    "visible": bool(f["visible"]),
                    "is_sample": bool(f["is_sample"]),
                }
                for f in rows
            ]
        }


@app.post("/api/admin/founders")
async def api_admin_create_founder(
    request: Request, admin: dict[str, Any] = Depends(require_admin)
) -> dict[str, Any]:
    body = await request.json()
    name = str(body.get("name", "")).strip()
    photo_url = str(body.get("photo_url", "")).strip()
    designation = str(body.get("designation", "")).strip()
    vision = str(body.get("vision", "")).strip()
    visible = bool(body.get("visible", True))
    if not name or not photo_url or not designation:
        raise HTTPException(status_code=422, detail="Name, photo, and designation are required.")
    if len(vision) > 1200:
        raise HTTPException(status_code=422, detail="Vision message cannot exceed 1,200 characters.")
    with get_db() as db:
        max_o = db.fetchone("SELECT COALESCE(MAX(sort_order), 0) AS m FROM founders")
        fid = db.insert_id(
            "founders",
            {
                "photo_url": photo_url,
                "name": name,
                "designation": designation,
                "vision": vision,
                "sort_order": (int(max_o["m"]) if max_o else 0) + 1,
                "visible": 1 if visible else 0,
                "is_sample": 0,
            },
        )
        return {"ok": True, "id": fid}


@app.put("/api/admin/founders/{founder_id}")
async def api_admin_update_founder(
    founder_id: int, request: Request, admin: dict[str, Any] = Depends(require_admin)
) -> dict[str, Any]:
    body = await request.json()
    with get_db() as db:
        existing = db.fetchone("SELECT * FROM founders WHERE id = ?", (founder_id,))
        if not existing:
            raise HTTPException(status_code=404, detail="Founder not found.")
        name = str(body.get("name", existing["name"])).strip()
        photo_url = str(body.get("photo_url", existing["photo_url"])).strip()
        designation = str(body.get("designation", existing["designation"])).strip()
        vision = str(body.get("vision", existing["vision"])).strip()
        if not name or not photo_url or not designation:
            raise HTTPException(status_code=422, detail="Name, photo, and designation are required.")
        if len(vision) > 1200:
            raise HTTPException(status_code=422, detail="Vision message cannot exceed 1,200 characters.")
        if photo_url != existing["photo_url"]:
            delete_blob_by_url(db, existing["photo_url"])
        db.execute(
            """
            UPDATE founders
            SET photo_url = ?, name = ?, designation = ?, vision = ?, visible = ?, is_sample = 0
            WHERE id = ?
            """,
            (photo_url, name, designation, vision, 1 if body.get("visible", existing["visible"]) else 0, founder_id),
        )
        return {"ok": True, "id": founder_id}


@app.delete("/api/admin/founders/{founder_id}")
def api_admin_delete_founder(founder_id: int, admin: dict[str, Any] = Depends(require_admin)) -> dict[str, Any]:
    with get_db() as db:
        existing = db.fetchone("SELECT id, photo_url FROM founders WHERE id = ?", (founder_id,))
        if not existing:
            raise HTTPException(status_code=404, detail="Founder not found.")
        delete_blob_by_url(db, existing["photo_url"])
        db.execute("DELETE FROM founders WHERE id = ?", (founder_id,))
        return {"ok": True}


@app.post("/api/admin/founders/reorder")
async def api_admin_reorder_founders(
    request: Request, admin: dict[str, Any] = Depends(require_admin)
) -> dict[str, Any]:
    body = await request.json()
    with get_db() as db:
        for order, fid in enumerate(body.get("ids", []), start=1):
            db.execute("UPDATE founders SET sort_order = ? WHERE id = ?", (order, int(fid)))
    return {"ok": True}


# ---------------------------------------------------------------------------
# Admin Homepage, Hero Counters, Courses & Batches (US-14)
# ---------------------------------------------------------------------------


@app.get("/api/admin/hero-stats")
def api_admin_list_hero_stats(admin: dict[str, Any] = Depends(require_admin)) -> dict[str, Any]:
    with get_db() as db:
        rows = db.fetchall("SELECT * FROM hero_stats ORDER BY sort_order ASC, id ASC")
        return {
            "hero_stats": [
                {
                    "id": int(s["id"]),
                    "label": s["label"],
                    "value": s["value"],
                    "sort_order": int(s["sort_order"]),
                    "visible": bool(s["visible"]),
                }
                for s in rows
            ]
        }


@app.post("/api/admin/hero-stats")
async def api_admin_create_hero_stat(
    request: Request, admin: dict[str, Any] = Depends(require_admin)
) -> dict[str, Any]:
    body = await request.json()
    label = str(body.get("label", "")).strip()
    value = str(body.get("value", "")).strip()
    if not label or not value:
        raise HTTPException(status_code=422, detail="Label and value are required.")
    with get_db() as db:
        max_o = db.fetchone("SELECT COALESCE(MAX(sort_order), 0) AS m FROM hero_stats")
        sid = db.insert_id(
            "hero_stats",
            {
                "label": label,
                "value": value,
                "sort_order": (int(max_o["m"]) if max_o else 0) + 1,
                "visible": 1 if body.get("visible", True) else 0,
            },
        )
        return {"ok": True, "id": sid}


@app.put("/api/admin/hero-stats/{stat_id}")
async def api_admin_update_hero_stat(
    stat_id: int, request: Request, admin: dict[str, Any] = Depends(require_admin)
) -> dict[str, Any]:
    body = await request.json()
    with get_db() as db:
        existing = db.fetchone("SELECT * FROM hero_stats WHERE id = ?", (stat_id,))
        if not existing:
            raise HTTPException(status_code=404, detail="Counter not found.")
        db.execute(
            "UPDATE hero_stats SET label = ?, value = ?, visible = ? WHERE id = ?",
            (
                str(body.get("label", existing["label"])).strip(),
                str(body.get("value", existing["value"])).strip(),
                1 if body.get("visible", existing["visible"]) else 0,
                stat_id,
            ),
        )
        return {"ok": True}


@app.delete("/api/admin/hero-stats/{stat_id}")
def api_admin_delete_hero_stat(stat_id: int, admin: dict[str, Any] = Depends(require_admin)) -> dict[str, Any]:
    with get_db() as db:
        db.execute("DELETE FROM hero_stats WHERE id = ?", (stat_id,))
        return {"ok": True}


@app.post("/api/admin/hero-stats/reorder")
async def api_admin_reorder_hero_stats(
    request: Request, admin: dict[str, Any] = Depends(require_admin)
) -> dict[str, Any]:
    body = await request.json()
    with get_db() as db:
        for order, sid in enumerate(body.get("ids", []), start=1):
            db.execute("UPDATE hero_stats SET sort_order = ? WHERE id = ?", (order, int(sid)))
    return {"ok": True}


@app.get("/api/admin/settings")
def api_admin_get_settings(admin: dict[str, Any] = Depends(require_admin)) -> dict[str, Any]:
    with get_db() as db:
        return {"settings": _load_settings_dict(db)}


@app.put("/api/admin/settings")
async def api_admin_update_settings(
    request: Request, admin: dict[str, Any] = Depends(require_admin)
) -> dict[str, Any]:
    body = await request.json()
    with get_db() as db:
        current = _load_settings_dict(db)

        if "ticker_text" in body:
            t_text = str(body["ticker_text"] or "").strip()
            if len(t_text) > 200:
                raise HTTPException(status_code=422, detail="Ticker text cannot exceed 200 characters.")
            _upsert_setting(db, "ticker_text", t_text)

        if "ticker_enabled" in body:
            _upsert_setting(db, "ticker_enabled", "true" if body["ticker_enabled"] else "false")

        if "ticker_link" in body:
            _upsert_setting(db, "ticker_link", str(body["ticker_link"] or "").strip())

        if "hero_image_url" in body:
            new_hero = str(body["hero_image_url"] or "").strip()
            if current["hero_image_url"] and current["hero_image_url"] != new_hero:
                delete_blob_by_url(db, current["hero_image_url"])
            _upsert_setting(db, "hero_image_url", new_hero)

        if "brand_name" in body:
            _upsert_setting(db, "brand_name", str(body["brand_name"]).strip())

        if "global_phone" in body:
            raw_phone = str(body["global_phone"] or "").strip()
            norm_phone = normalize_indian_phone(raw_phone) if raw_phone else ""
            _upsert_setting(db, "global_phone", norm_phone)

        if "global_whatsapp" in body:
            raw_wa = str(body["global_whatsapp"] or "").strip()
            norm_wa = normalize_indian_phone(raw_wa) if raw_wa else ""
            _upsert_setting(db, "global_whatsapp", norm_wa)

        if "whatsapp_template" in body:
            _upsert_setting(db, "whatsapp_template", str(body["whatsapp_template"] or "").strip())

        if "instagram_handle" in body:
            _upsert_setting(db, "instagram_handle", str(body["instagram_handle"] or "").strip().lstrip("@"))

        if "youtube_url" in body:
            _upsert_setting(db, "youtube_url", str(body["youtube_url"] or "").strip())

        if "facebook_url" in body:
            _upsert_setting(db, "facebook_url", str(body["facebook_url"] or "").strip())

        if "demo_mode" in body:
            val = "true" if body["demo_mode"] else "false"
            _upsert_setting(db, "demo_mode", val)
            _upsert_setting(db, "demo_mode_admin_override", val)

        if "section_headings" in body and isinstance(body["section_headings"], dict):
            merged = dict(current["section_headings"])
            for sec_key, sec_val in body["section_headings"].items():
                if isinstance(sec_val, dict):
                    merged[sec_key] = {
                        "en": str(sec_val.get("en", "")).strip(),
                        "hi": str(sec_val.get("hi", "")).strip(),
                    }
            _upsert_setting(db, "section_headings", json.dumps(merged, ensure_ascii=False))

        return {"ok": True, "settings": _load_settings_dict(db)}


def _upsert_setting(db: Any, key: str, value: str) -> None:
    existing = db.fetchone("SELECT key FROM settings WHERE key = ?", (key,))
    if existing:
        db.execute("UPDATE settings SET value = ? WHERE key = ?", (value, key))
    else:
        db.execute("INSERT INTO settings (key, value) VALUES (?, ?)", (key, value))


# Courses CRUD (AC-14.3)
@app.get("/api/admin/courses")
def api_admin_list_courses(admin: dict[str, Any] = Depends(require_admin)) -> dict[str, Any]:
    with get_db() as db:
        rows = db.fetchall("SELECT * FROM courses ORDER BY sort_order ASC, id ASC")
        return {
            "courses": [
                {
                    "id": int(c["id"]),
                    "stream": c["stream"],
                    "name": c["name"],
                    "classes": c["classes"],
                    "subjects": json.loads(c["subjects_json"] or "[]"),
                    "highlights": json.loads(c["highlights_json"] or "[]"),
                    "sort_order": int(c["sort_order"]),
                    "visible": bool(c["visible"]),
                }
                for c in rows
            ]
        }


@app.post("/api/admin/courses")
async def api_admin_create_course(
    request: Request, admin: dict[str, Any] = Depends(require_admin)
) -> dict[str, Any]:
    body = await request.json()
    stream = str(body.get("stream", "")).strip()
    name = str(body.get("name", "")).strip()
    classes = str(body.get("classes", "")).strip()
    subjects = body.get("subjects", [])
    highlights = body.get("highlights", [])
    if not stream or not name or not classes:
        raise HTTPException(status_code=422, detail="Stream, course name, and classes are required.")
    with get_db() as db:
        max_o = db.fetchone("SELECT COALESCE(MAX(sort_order), 0) AS m FROM courses")
        cid = db.insert_id(
            "courses",
            {
                "stream": stream,
                "name": name,
                "classes": classes,
                "subjects_json": json.dumps(subjects, ensure_ascii=False),
                "highlights_json": json.dumps(highlights, ensure_ascii=False),
                "sort_order": (int(max_o["m"]) if max_o else 0) + 1,
                "visible": 1 if body.get("visible", True) else 0,
                "is_sample": 0,
            },
        )
        return {"ok": True, "id": cid}


@app.put("/api/admin/courses/{course_id}")
async def api_admin_update_course(
    course_id: int, request: Request, admin: dict[str, Any] = Depends(require_admin)
) -> dict[str, Any]:
    body = await request.json()
    with get_db() as db:
        existing = db.fetchone("SELECT * FROM courses WHERE id = ?", (course_id,))
        if not existing:
            raise HTTPException(status_code=404, detail="Course not found.")
        subjects = body.get("subjects", json.loads(existing["subjects_json"] or "[]"))
        highlights = body.get("highlights", json.loads(existing["highlights_json"] or "[]"))
        db.execute(
            """
            UPDATE courses
            SET stream = ?, name = ?, classes = ?, subjects_json = ?, highlights_json = ?, visible = ?
            WHERE id = ?
            """,
            (
                str(body.get("stream", existing["stream"])).strip(),
                str(body.get("name", existing["name"])).strip(),
                str(body.get("classes", existing["classes"])).strip(),
                json.dumps(subjects, ensure_ascii=False),
                json.dumps(highlights, ensure_ascii=False),
                1 if body.get("visible", existing["visible"]) else 0,
                course_id,
            ),
        )
        return {"ok": True}


@app.delete("/api/admin/courses/{course_id}")
def api_admin_delete_course(course_id: int, admin: dict[str, Any] = Depends(require_admin)) -> dict[str, Any]:
    with get_db() as db:
        db.execute("DELETE FROM courses WHERE id = ?", (course_id,))
        return {"ok": True}


@app.post("/api/admin/courses/reorder")
async def api_admin_reorder_courses(
    request: Request, admin: dict[str, Any] = Depends(require_admin)
) -> dict[str, Any]:
    body = await request.json()
    with get_db() as db:
        for order, cid in enumerate(body.get("ids", []), start=1):
            db.execute("UPDATE courses SET sort_order = ? WHERE id = ?", (order, int(cid)))
    return {"ok": True}


# Batches CRUD (AC-14.4)
@app.get("/api/admin/batches")
def api_admin_list_batches(admin: dict[str, Any] = Depends(require_admin)) -> dict[str, Any]:
    with get_db() as db:
        rows = db.fetchall(
            """
            SELECT b.*, br.name AS branch_name
            FROM batches b
            LEFT JOIN branches br ON br.id = b.branch_id
            ORDER BY b.start_date ASC, b.id DESC
            """
        )
        return {
            "batches": [
                {
                    "id": int(b["id"]),
                    "class_name": b["class_name"],
                    "stream": b["stream"],
                    "branch_id": int(b["branch_id"]),
                    "branch_name": b.get("branch_name") or "",
                    "start_date": b["start_date"],
                    "start_date_formatted": _format_batch_date(b["start_date"]),
                    "timings": b["timings"],
                    "status": b["status"],
                    "active": bool(b["active"]),
                    "is_sample": bool(b["is_sample"]),
                }
                for b in rows
            ]
        }


@app.post("/api/admin/batches")
async def api_admin_create_batch(
    request: Request, admin: dict[str, Any] = Depends(require_admin)
) -> dict[str, Any]:
    body = await request.json()
    class_name = str(body.get("class_name", "")).strip()
    stream = str(body.get("stream", "")).strip()
    branch_id = int(body.get("branch_id", 0))
    start_date = str(body.get("start_date", "")).strip()
    timings = str(body.get("timings", "")).strip()
    status = str(body.get("status", "Open")).strip()
    if status not in ("Open", "Filling Fast", "Full"):
        raise HTTPException(status_code=422, detail="Batch status must be Open, Filling Fast, or Full.")
    if not class_name or not stream or not branch_id or not start_date or not timings:
        raise HTTPException(status_code=422, detail="Class, stream, branch, start date, and timings are required.")
    with get_db() as db:
        bid = db.insert_id(
            "batches",
            {
                "class_name": class_name,
                "stream": stream,
                "branch_id": branch_id,
                "start_date": start_date,
                "timings": timings,
                "status": status,
                "active": 1 if body.get("active", True) else 0,
                "is_sample": 0,
            },
        )
        return {"ok": True, "id": bid}


@app.put("/api/admin/batches/{batch_id}")
async def api_admin_update_batch(
    batch_id: int, request: Request, admin: dict[str, Any] = Depends(require_admin)
) -> dict[str, Any]:
    body = await request.json()
    with get_db() as db:
        existing = db.fetchone("SELECT * FROM batches WHERE id = ?", (batch_id,))
        if not existing:
            raise HTTPException(status_code=404, detail="Batch not found.")
        status = str(body.get("status", existing["status"])).strip()
        if status not in ("Open", "Filling Fast", "Full"):
            raise HTTPException(status_code=422, detail="Batch status must be Open, Filling Fast, or Full.")
        db.execute(
            """
            UPDATE batches
            SET class_name = ?, stream = ?, branch_id = ?, start_date = ?, timings = ?, status = ?, active = ?, is_sample = 0
            WHERE id = ?
            """,
            (
                str(body.get("class_name", existing["class_name"])).strip(),
                str(body.get("stream", existing["stream"])).strip(),
                int(body.get("branch_id", existing["branch_id"])),
                str(body.get("start_date", existing["start_date"])).strip(),
                str(body.get("timings", existing["timings"])).strip(),
                status,
                1 if body.get("active", existing["active"]) else 0,
                batch_id,
            ),
        )
        return {"ok": True}


@app.delete("/api/admin/batches/{batch_id}")
def api_admin_delete_batch(batch_id: int, admin: dict[str, Any] = Depends(require_admin)) -> dict[str, Any]:
    with get_db() as db:
        db.execute("DELETE FROM batches WHERE id = ?", (batch_id,))
        return {"ok": True}


# ---------------------------------------------------------------------------
# Admin Branches Manager (US-15)
# ---------------------------------------------------------------------------


@app.get("/api/admin/branches")
def api_admin_list_branches(admin: dict[str, Any] = Depends(require_admin)) -> dict[str, Any]:
    with get_db() as db:
        rows = db.fetchall("SELECT * FROM branches ORDER BY is_flagship DESC, sort_order ASC, id ASC")
        return {
            "branches": [
                {
                    "id": int(b["id"]),
                    "name": b["name"],
                    "address": b["address"],
                    "maps_url": b["maps_url"],
                    "phone": b["phone"],
                    "whatsapp": b["whatsapp"],
                    "is_flagship": bool(b["is_flagship"]),
                    "active": bool(b["active"]),
                    "sort_order": int(b["sort_order"]),
                    "is_sample": bool(b["is_sample"]),
                }
                for b in rows
            ]
        }


@app.post("/api/admin/branches")
async def api_admin_create_branch(
    request: Request, admin: dict[str, Any] = Depends(require_admin)
) -> dict[str, Any]:
    body = await request.json()
    name = str(body.get("name", "")).strip()
    address = str(body.get("address", "")).strip()
    maps_url = str(body.get("maps_url", "")).strip()
    raw_phone = str(body.get("phone", "")).strip()
    raw_wa = str(body.get("whatsapp", "")).strip()
    is_flagship = bool(body.get("is_flagship", False))
    active = bool(body.get("active", True))

    if not name or not address:
        raise HTTPException(status_code=422, detail="Branch name and address are required.")
    if maps_url and not maps_url.startswith("https://"):
        raise HTTPException(status_code=422, detail="Google Maps URL must start with https://")

    try:
        phone = normalize_indian_phone(raw_phone) if raw_phone else ""
        whatsapp = normalize_indian_phone(raw_wa) if raw_wa else ""
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc

    with get_db() as db:
        if is_flagship:
            db.execute("UPDATE branches SET is_flagship = 0")
        max_o = db.fetchone("SELECT COALESCE(MAX(sort_order), 0) AS m FROM branches")
        bid = db.insert_id(
            "branches",
            {
                "name": name,
                "address": address,
                "maps_url": maps_url,
                "phone": phone,
                "whatsapp": whatsapp,
                "is_flagship": 1 if is_flagship else 0,
                "active": 1 if active else 0,
                "sort_order": (int(max_o["m"]) if max_o else 0) + 1,
                "is_sample": 0,
            },
        )
        return {"ok": True, "id": bid, "phone": phone, "whatsapp": whatsapp}


@app.put("/api/admin/branches/{branch_id}")
async def api_admin_update_branch(
    branch_id: int, request: Request, admin: dict[str, Any] = Depends(require_admin)
) -> dict[str, Any]:
    body = await request.json()
    with get_db() as db:
        existing = db.fetchone("SELECT * FROM branches WHERE id = ?", (branch_id,))
        if not existing:
            raise HTTPException(status_code=404, detail="Branch not found.")

        maps_url = str(body.get("maps_url", existing["maps_url"])).strip()
        if maps_url and not maps_url.startswith("https://"):
            raise HTTPException(status_code=422, detail="Google Maps URL must start with https://")

        raw_phone = str(body.get("phone", existing["phone"])).strip()
        raw_wa = str(body.get("whatsapp", existing["whatsapp"])).strip()
        try:
            phone = normalize_indian_phone(raw_phone) if raw_phone else ""
            whatsapp = normalize_indian_phone(raw_wa) if raw_wa else ""
        except ValueError as exc:
            raise HTTPException(status_code=422, detail=str(exc)) from exc

        is_flagship = bool(body.get("is_flagship", existing["is_flagship"]))
        if is_flagship:
            db.execute("UPDATE branches SET is_flagship = 0 WHERE id != ?", (branch_id,))

        db.execute(
            """
            UPDATE branches
            SET name = ?, address = ?, maps_url = ?, phone = ?, whatsapp = ?, is_flagship = ?, active = ?, is_sample = 0
            WHERE id = ?
            """,
            (
                str(body.get("name", existing["name"])).strip(),
                str(body.get("address", existing["address"])).strip(),
                maps_url,
                phone,
                whatsapp,
                1 if is_flagship else 0,
                1 if body.get("active", existing["active"]) else 0,
                branch_id,
            ),
        )
        return {"ok": True, "id": branch_id, "phone": phone, "whatsapp": whatsapp}


@app.delete("/api/admin/branches/{branch_id}")
def api_admin_delete_branch(branch_id: int, admin: dict[str, Any] = Depends(require_admin)) -> dict[str, Any]:
    with get_db() as db:
        active_batches = db.fetchall(
            "SELECT id, class_name, stream, start_date FROM batches WHERE branch_id = ? AND active = 1",
            (branch_id,),
        )
        if active_batches:
            names = ", ".join(f"Class {b['class_name']} {b['stream']} ({b['start_date']})" for b in active_batches)
            raise HTTPException(
                status_code=409,
                detail=f"Cannot delete branch while it has active batches: {names}. Deactivate the branch or remove those batches first.",
            )
        db.execute("DELETE FROM branches WHERE id = ?", (branch_id,))
        return {"ok": True}


@app.post("/api/admin/branches/reorder")
async def api_admin_reorder_branches(
    request: Request, admin: dict[str, Any] = Depends(require_admin)
) -> dict[str, Any]:
    body = await request.json()
    with get_db() as db:
        for order, bid in enumerate(body.get("ids", []), start=1):
            db.execute("UPDATE branches SET sort_order = ? WHERE id = ?", (order, int(bid)))
    return {"ok": True}


# ---------------------------------------------------------------------------
# Admin Testimonials & Gallery Managers (US-16)
# ---------------------------------------------------------------------------


@app.get("/api/admin/testimonials")
def api_admin_list_testimonials(admin: dict[str, Any] = Depends(require_admin)) -> dict[str, Any]:
    with get_db() as db:
        rows = db.fetchall("SELECT * FROM testimonials ORDER BY sort_order ASC, id ASC")
        return {
            "testimonials": [
                {
                    "id": int(t["id"]),
                    "quote": t["quote"],
                    "name": t["name"],
                    "role": t["role"],
                    "class_year": t["class_year"],
                    "photo_url": t["photo_url"],
                    "sort_order": int(t["sort_order"]),
                    "visible": bool(t["visible"]),
                    "is_sample": bool(t["is_sample"]),
                }
                for t in rows
            ]
        }


@app.post("/api/admin/testimonials")
async def api_admin_create_testimonial(
    request: Request, admin: dict[str, Any] = Depends(require_admin)
) -> dict[str, Any]:
    body = await request.json()
    quote = str(body.get("quote", "")).strip()
    name = str(body.get("name", "")).strip()
    role = str(body.get("role", "Student")).strip()
    if role not in ("Student", "Parent"):
        raise HTTPException(status_code=422, detail="Role must be Student or Parent.")
    if not quote or not name:
        raise HTTPException(status_code=422, detail="Quote and name are required.")
    if len(quote) > 500:
        raise HTTPException(status_code=422, detail="Testimonial quote cannot exceed 500 characters.")
    with get_db() as db:
        max_o = db.fetchone("SELECT COALESCE(MAX(sort_order), 0) AS m FROM testimonials")
        tid = db.insert_id(
            "testimonials",
            {
                "quote": quote,
                "name": name,
                "role": role,
                "class_year": str(body.get("class_year", "")).strip(),
                "photo_url": str(body.get("photo_url", "")).strip(),
                "sort_order": (int(max_o["m"]) if max_o else 0) + 1,
                "visible": 1 if body.get("visible", True) else 0,
                "is_sample": 0,
            },
        )
        return {"ok": True, "id": tid}


@app.put("/api/admin/testimonials/{testimonial_id}")
async def api_admin_update_testimonial(
    testimonial_id: int, request: Request, admin: dict[str, Any] = Depends(require_admin)
) -> dict[str, Any]:
    body = await request.json()
    with get_db() as db:
        existing = db.fetchone("SELECT * FROM testimonials WHERE id = ?", (testimonial_id,))
        if not existing:
            raise HTTPException(status_code=404, detail="Testimonial not found.")
        quote = str(body.get("quote", existing["quote"])).strip()
        if len(quote) > 500:
            raise HTTPException(status_code=422, detail="Testimonial quote cannot exceed 500 characters.")
        new_photo = str(body.get("photo_url", existing["photo_url"])).strip()
        if existing["photo_url"] and new_photo != existing["photo_url"]:
            delete_blob_by_url(db, existing["photo_url"])
        db.execute(
            """
            UPDATE testimonials
            SET quote = ?, name = ?, role = ?, class_year = ?, photo_url = ?, visible = ?, is_sample = 0
            WHERE id = ?
            """,
            (
                quote,
                str(body.get("name", existing["name"])).strip(),
                str(body.get("role", existing["role"])).strip(),
                str(body.get("class_year", existing["class_year"])).strip(),
                new_photo,
                1 if body.get("visible", existing["visible"]) else 0,
                testimonial_id,
            ),
        )
        return {"ok": True}


@app.delete("/api/admin/testimonials/{testimonial_id}")
def api_admin_delete_testimonial(
    testimonial_id: int, admin: dict[str, Any] = Depends(require_admin)
) -> dict[str, Any]:
    with get_db() as db:
        existing = db.fetchone("SELECT id, photo_url FROM testimonials WHERE id = ?", (testimonial_id,))
        if not existing:
            raise HTTPException(status_code=404, detail="Testimonial not found.")
        delete_blob_by_url(db, existing["photo_url"])
        db.execute("DELETE FROM testimonials WHERE id = ?", (testimonial_id,))
        return {"ok": True}


@app.post("/api/admin/testimonials/reorder")
async def api_admin_reorder_testimonials(
    request: Request, admin: dict[str, Any] = Depends(require_admin)
) -> dict[str, Any]:
    body = await request.json()
    with get_db() as db:
        for order, tid in enumerate(body.get("ids", []), start=1):
            db.execute("UPDATE testimonials SET sort_order = ? WHERE id = ?", (order, int(tid)))
    return {"ok": True}


@app.get("/api/admin/gallery")
def api_admin_list_gallery(admin: dict[str, Any] = Depends(require_admin)) -> dict[str, Any]:
    with get_db() as db:
        rows = db.fetchall("SELECT * FROM gallery_images ORDER BY sort_order ASC, id ASC")
        return {
            "gallery": [
                {
                    "id": int(g["id"]),
                    "image_url": g["image_url"],
                    "caption": g["caption"],
                    "sort_order": int(g["sort_order"]),
                    "visible": bool(g["visible"]),
                    "is_sample": bool(g["is_sample"]),
                }
                for g in rows
            ]
        }


@app.post("/api/admin/gallery")
async def api_admin_create_gallery(
    request: Request, admin: dict[str, Any] = Depends(require_admin)
) -> dict[str, Any]:
    body = await request.json()
    image_url = str(body.get("image_url", "")).strip()
    caption = str(body.get("caption", "")).strip()
    if not image_url:
        raise HTTPException(status_code=422, detail="Gallery image is required.")
    if len(caption) > 120:
        raise HTTPException(status_code=422, detail="Gallery caption cannot exceed 120 characters.")
    with get_db() as db:
        max_o = db.fetchone("SELECT COALESCE(MAX(sort_order), 0) AS m FROM gallery_images")
        gid = db.insert_id(
            "gallery_images",
            {
                "image_url": image_url,
                "caption": caption,
                "sort_order": (int(max_o["m"]) if max_o else 0) + 1,
                "visible": 1 if body.get("visible", True) else 0,
                "is_sample": 0,
            },
        )
        return {"ok": True, "id": gid}


@app.put("/api/admin/gallery/{gallery_id}")
async def api_admin_update_gallery(
    gallery_id: int, request: Request, admin: dict[str, Any] = Depends(require_admin)
) -> dict[str, Any]:
    body = await request.json()
    with get_db() as db:
        existing = db.fetchone("SELECT * FROM gallery_images WHERE id = ?", (gallery_id,))
        if not existing:
            raise HTTPException(status_code=404, detail="Gallery image not found.")
        caption = str(body.get("caption", existing["caption"])).strip()
        if len(caption) > 120:
            raise HTTPException(status_code=422, detail="Gallery caption cannot exceed 120 characters.")
        new_url = str(body.get("image_url", existing["image_url"])).strip()
        if existing["image_url"] and new_url != existing["image_url"]:
            delete_blob_by_url(db, existing["image_url"])
        db.execute(
            "UPDATE gallery_images SET image_url = ?, caption = ?, visible = ?, is_sample = 0 WHERE id = ?",
            (new_url, caption, 1 if body.get("visible", existing["visible"]) else 0, gallery_id),
        )
        return {"ok": True}


@app.delete("/api/admin/gallery/{gallery_id}")
def api_admin_delete_gallery(gallery_id: int, admin: dict[str, Any] = Depends(require_admin)) -> dict[str, Any]:
    with get_db() as db:
        existing = db.fetchone("SELECT id, image_url FROM gallery_images WHERE id = ?", (gallery_id,))
        if not existing:
            raise HTTPException(status_code=404, detail="Gallery image not found.")
        delete_blob_by_url(db, existing["image_url"])
        db.execute("DELETE FROM gallery_images WHERE id = ?", (gallery_id,))
        return {"ok": True}


@app.post("/api/admin/gallery/reorder")
async def api_admin_reorder_gallery(
    request: Request, admin: dict[str, Any] = Depends(require_admin)
) -> dict[str, Any]:
    body = await request.json()
    with get_db() as db:
        for order, gid in enumerate(body.get("ids", []), start=1):
            db.execute("UPDATE gallery_images SET sort_order = ? WHERE id = ?", (order, int(gid)))
    return {"ok": True}


# ---------------------------------------------------------------------------
# Admin Student Leads Inbox & CSV Export (US-17)
# ---------------------------------------------------------------------------


def _query_filtered_leads(
    db: Any,
    status: str | None = None,
    branch_id: int | None = None,
    date_from: str | None = None,
    date_to: str | None = None,
) -> list[dict[str, Any]]:
    rows = db.fetchall(
        """
        SELECT l.*, br.name AS branch_name
        FROM leads l
        LEFT JOIN branches br ON br.id = l.branch_id
        ORDER BY l.id DESC
        """
    )
    out: list[dict[str, Any]] = []
    for l in rows:
        if status and status.lower() != "all" and str(l["status"]).lower() != status.lower():
            continue
        if branch_id and int(l["branch_id"]) != int(branch_id):
            continue
        created_date = str(l["created_at"])[:10]
        if date_from and created_date < date_from:
            continue
        if date_to and created_date > date_to:
            continue

        wa_digits = digits_for_wa(l["mobile"])
        greeting = (
            f"Hi {l['student_name']}! This is the academic counsellor from Shikshanama (शिक्षाNama) "
            f"following up on your Free Demo Class enquiry for Class {l['class_name']} ({l['stream']})."
        )
        out.append(
            {
                "id": int(l["id"]),
                "created_at": l["created_at"],
                "student_name": l["student_name"],
                "mobile": l["mobile"],
                "class_name": l["class_name"],
                "stream": l["stream"],
                "branch_id": int(l["branch_id"]),
                "branch_name": l.get("branch_name") or "West Patel Nagar (Flagship)",
                "status": l["status"],
                "note": l["note"] or "",
                "source": l["source"] or "/",
                "whatsapp_url": f"https://wa.me/{wa_digits}?text={urllib.parse.quote(greeting)}",
            }
        )
    return out


@app.get("/api/admin/leads")
def api_admin_list_leads(
    status: str | None = Query(default=None),
    branch_id: int | None = Query(default=None),
    date_from: str | None = Query(default=None),
    date_to: str | None = Query(default=None),
    admin: dict[str, Any] = Depends(require_admin),
) -> dict[str, Any]:
    with get_db() as db:
        leads = _query_filtered_leads(db, status=status, branch_id=branch_id, date_from=date_from, date_to=date_to)
        return {"leads": leads, "count": len(leads)}


@app.patch("/api/admin/leads/{lead_id}")
async def api_admin_update_lead(
    lead_id: int, request: Request, admin: dict[str, Any] = Depends(require_admin)
) -> dict[str, Any]:
    body = await request.json()
    with get_db() as db:
        existing = db.fetchone("SELECT * FROM leads WHERE id = ?", (lead_id,))
        if not existing:
            raise HTTPException(status_code=404, detail="Lead not found.")
        new_status = str(body.get("status", existing["status"])).strip()
        if new_status not in ("New", "Contacted", "Enrolled"):
            raise HTTPException(status_code=422, detail="Lead status must be New, Contacted, or Enrolled.")
        new_note = str(body.get("note", existing["note"])).strip()
        db.execute("UPDATE leads SET status = ?, note = ? WHERE id = ?", (new_status, new_note, lead_id))
        return {"ok": True, "id": lead_id, "status": new_status, "note": new_note}


@app.delete("/api/admin/leads/{lead_id}")
def api_admin_delete_lead(lead_id: int, admin: dict[str, Any] = Depends(require_admin)) -> dict[str, Any]:
    with get_db() as db:
        db.execute("DELETE FROM leads WHERE id = ?", (lead_id,))
        return {"ok": True}


@app.get("/api/admin/leads/export.csv")
def api_admin_export_leads_csv(
    status: str | None = Query(default=None),
    branch_id: int | None = Query(default=None),
    date_from: str | None = Query(default=None),
    date_to: str | None = Query(default=None),
    admin: dict[str, Any] = Depends(require_admin),
) -> Response:
    """Export filtered leads as UTF-8 with BOM CSV, escaping formula-injection characters (AC-17.3, AC-20.8)."""
    with get_db() as db:
        leads = _query_filtered_leads(db, status=status, branch_id=branch_id, date_from=date_from, date_to=date_to)
        sio = StringIO()
        writer = csv.writer(sio)
        writer.writerow(["ID", "Timestamp (IST)", "Student Name", "Mobile", "Class", "Stream", "Preferred Branch", "Status", "Note"])
        for l in leads:
            writer.writerow(
                [
                    l["id"],
                    escape_csv_cell(l["created_at"]),
                    escape_csv_cell(l["student_name"]),
                    escape_csv_cell(l["mobile"]),
                    escape_csv_cell(l["class_name"]),
                    escape_csv_cell(l["stream"]),
                    escape_csv_cell(l["branch_name"]),
                    escape_csv_cell(l["status"]),
                    escape_csv_cell(l["note"]),
                ]
            )
        csv_bytes = ("\ufeff" + sio.getvalue()).encode("utf-8")
        return Response(
            content=csv_bytes,
            media_type="text/csv; charset=utf-8",
            headers={"Content-Disposition": 'attachment; filename="shikshanama-leads.csv"'},
        )


# ---------------------------------------------------------------------------
# Dynamic HTML / SPA Route Serving with Route-Specific SEO & JSON-LD (AC-19.4)
# ---------------------------------------------------------------------------

ROUTE_SEO: dict[str, tuple[str, str]] = {
    "/": (
        "Shikshanama (शिक्षाNama) | West Patel Nagar's Premier Coaching Institute (Class 6–12)",
        "Join Shikshanama (शिक्षाNama) in West Patel Nagar, New Delhi for Class 6–10 Foundation & Class 11–12 Science, Commerce, and Humanities. Explore our Hall of Fame and book a Free Demo Class.",
    ),
    "/results": (
        "Hall of Fame | Shikshanama (शिक्षाNama) Student Results",
        "Filter Shikshanama toppers and distinction holders by Class (10th, 12th), Stream (Science, Commerce, Humanities, Foundation), and Academic Year.",
    ),
    "/courses": (
        "Courses & Live Upcoming Batches | Shikshanama (शिक्षाNama) Coaching",
        "Explore Foundation, Science, Commerce, and Humanities courses and live upcoming batch schedules at Shikshanama West Patel Nagar.",
    ),
    "/founders": (
        "Founders & Leadership | Shikshanama (शिक्षाNama)",
        "Meet the founders and senior subject mentors leading Shikshanama (शिक्षाNama) in New Delhi.",
    ),
    "/branches": (
        "Multi-Branch Locator | Shikshanama (शिक्षाNama) West Patel Nagar",
        "Find directions, phone numbers, and WhatsApp links for Shikshanama's West Patel Nagar flagship center and nearby branches.",
    ),
    "/thank-you": (
        "Thank You | Free Demo Class Request Confirmed - Shikshanama (शिक्षाNama)",
        "Your Shikshanama (शिक्षाNama) Free Demo Class request has been received.",
    ),
}


def _build_json_ld(branches: list[dict[str, Any]], brand_name: str, base_url: str) -> str:
    """Build LocalBusiness / EducationalOrganization JSON-LD for each active branch (AC-19.4)."""
    items = []
    for b in branches:
        items.append(
            {
                "@context": "https://schema.org",
                "@type": ["EducationalOrganization", "LocalBusiness"],
                "name": f"{brand_name} - {b['name']}",
                "url": base_url,
                "telephone": b["phone"],
                "address": {
                    "@type": "PostalAddress",
                    "streetAddress": b["address"],
                    "addressLocality": "New Delhi",
                    "addressRegion": "Delhi",
                    "postalCode": "110008",
                    "addressCountry": "IN",
                },
                "hasMap": b["maps_url"],
            }
        )
    return json.dumps(items, ensure_ascii=False)


def _render_spa_html(
    request: Request,
    path: str,
    class_filter: str | None = None,
    stream_filter: str | None = None,
    year_filter: str | None = None,
) -> HTMLResponse:
    _ensure_ready()
    static_dist = os.path.join(os.path.dirname(__file__), "static", "dist")
    index_path = os.path.join(static_dist, "index.html")
    if os.path.exists(index_path):
        with open(index_path, "r", encoding="utf-8") as f:
            template_html = f.read()
    else:
        template_html = (
            "<!doctype html><html lang='en'><head><meta charset='utf-8'/>"
            "<meta name='viewport' content='width=device-width,initial-scale=1'/>"
            "<!--SEO_HEAD--></head><body><div id='root'><!--SSR_FALLBACK--></div></body></html>"
        )

    clean_path = "/" + path.strip("/") if path.strip("/") else "/"
    title, desc = ROUTE_SEO.get(
        clean_path,
        (
            "Shikshanama (शिक्षाNama) | Official Website & Admin CMS",
            "Shikshanama (शिक्षाNama) Coaching Institute in West Patel Nagar, New Delhi.",
        ),
    )
    base_url = str(request.base_url).rstrip("/")
    with get_db() as db:
        payload = _fetch_public_payload(
            db, class_filter=class_filter, stream_filter=stream_filter, year_filter=year_filter
        )

    json_ld = _build_json_ld(payload["branches"], payload["settings"]["brand_name"], base_url)
    seo_tags = (
        f"<title>{html.escape(title)}</title>\n"
        f'<meta name="description" content="{html.escape(desc)}" />\n'
        f'<meta property="og:title" content="{html.escape(title)}" />\n'
        f'<meta property="og:description" content="{html.escape(desc)}" />\n'
        f'<meta property="og:type" content="website" />\n'
        f'<meta property="og:url" content="{html.escape(base_url + clean_path)}" />\n'
        f'<meta property="og:image" content="{html.escape(base_url)}/og-image.jpg" />\n'
        f'<meta name="twitter:card" content="summary_large_image" />\n'
        f'<meta name="twitter:title" content="{html.escape(title)}" />\n'
        f'<meta name="twitter:description" content="{html.escape(desc)}" />\n'
        f'<meta name="twitter:image" content="{html.escape(base_url)}/og-image.jpg" />\n'
        f'<script type="application/ld+json">{json_ld}</script>\n'
        f"<script>window.__SHIKSHANAMA_BOOTSTRAP__ = {json.dumps(payload, ensure_ascii=False)};</script>"
    )

    # Also render semantic SSR fallback markup inside #root so non-JS crawlers & AC-3.3/AC-9.6 tests see live content immediately
    settings = payload["settings"]
    ticker_html = ""
    if settings["ticker_enabled"] and settings["ticker_text"]:
        t_inner = html.escape(settings["ticker_text"])
        if settings["ticker_link"]:
            ticker_html = f'<div data-testid="announcement-ticker"><a href="{html.escape(settings["ticker_link"])}">{t_inner}</a></div>'
        else:
            ticker_html = f'<div data-testid="announcement-ticker">{t_inner}</div>'

    results_cards_html = "".join(
        f'<article data-testid="result-card"><h3>{html.escape(r["name"])}</h3>'
        f'<span>Class {html.escape(r["class_name"])}</span> · <span>{html.escape(r["stream"])}</span> · '
        f'<strong>{html.escape(r["score_text"])}</strong> · <span>{html.escape(r["rank_text"])}</span> · '
        f'<span>{html.escape(r["year"])}</span>'
        f'<img src="{html.escape(r["photo_url"])}" alt="{html.escape(r["name"])}" width="400" height="400" loading="lazy" /></article>'
        for r in payload["results"]
    )
    if not results_cards_html:
        results_cards_html = '<p data-testid="no-results-msg">No results yet for this filter. Book a Free Demo Class!</p>'

    branches_html = "".join(
        f'<div data-testid="branch-card"><h3>{html.escape(b["name"])}</h3>'
        f'<p>{html.escape(b["address"])}</p>'
        f'<a href="{html.escape(b["maps_url"])}">Get Directions</a>'
        f'<a href="{html.escape(b["tel_url"])}">Call</a>'
        f'<a href="{html.escape(b["whatsapp_url"])}">WhatsApp</a></div>'
        for b in payload["branches"]
    )

    branch_options_html = "".join(
        f'<option value="{b["id"]}">{html.escape(b["name"])}</option>' for b in payload["branches"]
    )

    ssr_fallback = (
        f"{ticker_html}"
        f'<header><h1>{html.escape(settings["brand_name"])}</h1>'
        f'<a href="#demo-form">Book a Free Demo Class</a>'
        f'<a href="{html.escape(settings["global_whatsapp_url"])}">Chat on WhatsApp</a></header>'
        f'<section id="hall-of-fame"><h2>{html.escape(settings["section_headings"]["results"]["en"])}</h2>{results_cards_html}</section>'
        f'<section id="branches">{branches_html}</section>'
        f'<section id="instagram"><a href="{html.escape(settings["instagram_url"])}" target="_blank" rel="noopener">@{html.escape(settings["instagram_handle"])}</a></section>'
        f'<form id="demo-form" method="post" action="/api/public/leads/form">'
        f'<input name="student_name" required placeholder="Student Name" />'
        f'<input name="mobile" required placeholder="Mobile Number" />'
        f'<input name="class_name" required value="12" />'
        f'<input name="stream" required value="Science" />'
        f'<select name="branch_id" required>{branch_options_html}</select>'
        f'<input type="text" name="website_url" style="display:none" tabIndex="-1" autoComplete="off" />'
        f"<p>We use your number only to contact you about classes.</p>"
        f'<button type="submit">Book Free Demo Class</button></form>'
    )

    out_html = template_html.replace("<!--SEO_HEAD-->", seo_tags).replace("<!--SSR_FALLBACK-->", ssr_fallback)
    return HTMLResponse(content=out_html)


@app.get("/assets/{asset_path:path}")
def serve_vite_asset(asset_path: str) -> Response:
    static_dist = os.path.join(os.path.dirname(__file__), "static", "dist", "assets")
    full_path = os.path.abspath(os.path.join(static_dist, asset_path))
    if not full_path.startswith(os.path.abspath(static_dist)) or not os.path.isfile(full_path):
        raise HTTPException(status_code=404, detail="Asset not found")
    return FileResponse(full_path, headers={"Cache-Control": "public, max-age=31536000, immutable"})


@app.get("/{full_path:path}", response_class=HTMLResponse)
def serve_spa_routes(
    full_path: str,
    request: Request,
    class_name: str | None = Query(default=None, alias="class"),
    stream: str | None = Query(default=None),
    year: str | None = Query(default=None),
) -> Response:
    # Check if a direct static file exists in app/static/dist
    static_dist = os.path.join(os.path.dirname(__file__), "static", "dist")
    if full_path and "." in os.path.basename(full_path):
        candidate = os.path.abspath(os.path.join(static_dist, full_path))
        if candidate.startswith(os.path.abspath(static_dist)) and os.path.isfile(candidate):
            return FileResponse(candidate)

    # Admin page guard: if unauthenticated visitor visits /admin (other than /admin/login), redirect to /admin/login (AC-10.1)
    clean = "/" + full_path.strip("/") if full_path.strip("/") else "/"
    if clean.startswith("/admin") and clean != "/admin/login":
        token = request.cookies.get(COOKIE_NAME)
        payload = verify_session_token(token)
        valid_session = False
        if payload:
            _ensure_ready()
            with get_db() as db:
                user = db.fetchone(
                    "SELECT id, active FROM admin_users WHERE id = ? AND email = ?",
                    (int(payload["uid"]), str(payload["email"]).lower()),
                )
                if user and int(user["active"]):
                    valid_session = True
        if not valid_session:
            return RedirectResponse(url="/admin/login", status_code=302)

    return _render_spa_html(
        request=request,
        path=clean,
        class_filter=class_name,
        stream_filter=stream,
        year_filter=year,
    )
