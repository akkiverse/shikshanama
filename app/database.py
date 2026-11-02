"""Database and Blob storage layer supporting Neon Postgres (production) and SQLite (tests/local/demo)."""

from __future__ import annotations

from contextlib import contextmanager
from datetime import datetime, timedelta, timezone
import json
import os
import sqlite3
import time
from typing import Any, Iterator
import urllib.parse
import uuid

import httpx

from app.imaging import generate_sample_webp
from app.pdf_gen import CONSENT_TEXT_VERSION
from app.security import hash_password

IST = timezone(timedelta(hours=5, minutes=30))

FLAGSHIP_NAME = "West Patel Nagar"
FLAGSHIP_ADDRESS = (
    "Ground Floor, E-42, Street Number 2, near Government School, Block E, "
    "West Patel Nagar, Patel Nagar, New Delhi, Delhi, 110008"
)


def now_ist_iso() -> str:
    return datetime.now(IST).strftime("%Y-%m-%d %H:%M:%S IST")


def _database_url() -> str:
    return os.environ.get("DATABASE_URL", "").strip()


def is_postgres() -> bool:
    url = _database_url()
    return url.startswith("postgres://") or url.startswith("postgresql://")


def _sqlite_path() -> str:
    explicit = os.environ.get("SQLITE_PATH", "").strip()
    if explicit:
        return explicit
    url = _database_url()
    if url.startswith("sqlite:///"):
        return url[len("sqlite:///") :]
    return "/tmp/shikshanama.db"


class DBAdapter:
    """Thin relational adapter normalizing ? placeholders for SQLite and %s for Postgres."""

    def __init__(self, conn: Any, pg: bool) -> None:
        self.conn = conn
        self.pg = pg

    def _sql(self, sql: str) -> str:
        if self.pg:
            return sql.replace("?", "%s")
        return sql

    def execute(self, sql: str, params: tuple[Any, ...] | list[Any] = ()) -> Any:
        cur = self.conn.cursor()
        cur.execute(self._sql(sql), tuple(params))
        return cur

    def fetchone(self, sql: str, params: tuple[Any, ...] | list[Any] = ()) -> dict[str, Any] | None:
        cur = self.execute(sql, params)
        row = cur.fetchone()
        if row is None:
            return None
        if isinstance(row, dict):
            return dict(row)
        cols = [d[0] for d in cur.description]
        return dict(zip(cols, row))

    def fetchall(self, sql: str, params: tuple[Any, ...] | list[Any] = ()) -> list[dict[str, Any]]:
        cur = self.execute(sql, params)
        rows = cur.fetchall()
        if not rows:
            return []
        cols = [d[0] for d in cur.description]
        out: list[dict[str, Any]] = []
        for r in rows:
            out.append(dict(r) if isinstance(r, dict) else dict(zip(cols, r)))
        return out

    def insert_id(self, table: str, data: dict[str, Any]) -> int:
        keys = list(data.keys())
        cols_sql = ", ".join(keys)
        placeholders = ", ".join(["?"] * len(keys))
        vals = [data[k] for k in keys]
        if self.pg:
            sql = f"INSERT INTO {table} ({cols_sql}) VALUES ({placeholders}) RETURNING id"
            row = self.fetchone(sql, vals)
            return int(row["id"]) if row else 0
        cur = self.execute(f"INSERT INTO {table} ({cols_sql}) VALUES ({placeholders})", vals)
        return int(cur.lastrowid)


@contextmanager
def get_db() -> Iterator[DBAdapter]:
    if is_postgres():
        import psycopg

        conn = psycopg.connect(_database_url(), autocommit=False)
        try:
            yield DBAdapter(conn, pg=True)
            conn.commit()
        except Exception:
            conn.rollback()
            raise
        finally:
            conn.close()
    else:
        path = _sqlite_path()
        os.makedirs(os.path.dirname(os.path.abspath(path)), exist_ok=True)
        conn = sqlite3.connect(path, check_same_thread=False)
        conn.row_factory = sqlite3.Row
        try:
            yield DBAdapter(conn, pg=False)
            conn.commit()
        except Exception:
            conn.rollback()
            raise
        finally:
            conn.close()


SCHEMA_TABLES_SQLITE = [
    """
    CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL
    )
    """,
    """
    CREATE TABLE IF NOT EXISTS hero_stats (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        label TEXT NOT NULL,
        value TEXT NOT NULL,
        sort_order INTEGER NOT NULL DEFAULT 0,
        visible INTEGER NOT NULL DEFAULT 1
    )
    """,
    """
    CREATE TABLE IF NOT EXISTS courses (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        stream TEXT NOT NULL,
        name TEXT NOT NULL,
        classes TEXT NOT NULL,
        subjects_json TEXT NOT NULL DEFAULT '[]',
        highlights_json TEXT NOT NULL DEFAULT '[]',
        sort_order INTEGER NOT NULL DEFAULT 0,
        visible INTEGER NOT NULL DEFAULT 1,
        is_sample INTEGER NOT NULL DEFAULT 0
    )
    """,
    """
    CREATE TABLE IF NOT EXISTS branches (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        address TEXT NOT NULL,
        maps_url TEXT NOT NULL DEFAULT '',
        phone TEXT NOT NULL DEFAULT '',
        whatsapp TEXT NOT NULL DEFAULT '',
        is_flagship INTEGER NOT NULL DEFAULT 0,
        active INTEGER NOT NULL DEFAULT 1,
        sort_order INTEGER NOT NULL DEFAULT 0,
        is_sample INTEGER NOT NULL DEFAULT 0
    )
    """,
    """
    CREATE TABLE IF NOT EXISTS batches (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        class_name TEXT NOT NULL,
        stream TEXT NOT NULL,
        branch_id INTEGER NOT NULL,
        start_date TEXT NOT NULL,
        timings TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'Open',
        active INTEGER NOT NULL DEFAULT 1,
        is_sample INTEGER NOT NULL DEFAULT 0
    )
    """,
    """
    CREATE TABLE IF NOT EXISTS results (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        photo_url TEXT NOT NULL,
        name TEXT NOT NULL,
        class_name TEXT NOT NULL,
        stream TEXT NOT NULL,
        score_text TEXT NOT NULL,
        rank_text TEXT NOT NULL,
        year TEXT NOT NULL,
        published INTEGER NOT NULL DEFAULT 1,
        pinned INTEGER NOT NULL DEFAULT 0,
        sort_order INTEGER NOT NULL DEFAULT 0,
        is_sample INTEGER NOT NULL DEFAULT 0,
        parent_name TEXT NOT NULL DEFAULT '',
        parent_whatsapp TEXT NOT NULL DEFAULT ''
    )
    """,
    """
    CREATE TABLE IF NOT EXISTS consents (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        result_id INTEGER NOT NULL UNIQUE,
        status TEXT NOT NULL DEFAULT 'Not requested',
        method TEXT NOT NULL DEFAULT '',
        token_hash TEXT NOT NULL DEFAULT '',
        expires_at INTEGER NOT NULL DEFAULT 0,
        agreed_name TEXT NOT NULL DEFAULT '',
        agreed_at TEXT NOT NULL DEFAULT '',
        text_version TEXT NOT NULL DEFAULT 'v1',
        ip_hash TEXT NOT NULL DEFAULT '',
        recorded_by TEXT NOT NULL DEFAULT ''
    )
    """,
    """
    CREATE TABLE IF NOT EXISTS founders (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        photo_url TEXT NOT NULL,
        name TEXT NOT NULL,
        designation TEXT NOT NULL,
        vision TEXT NOT NULL,
        sort_order INTEGER NOT NULL DEFAULT 0,
        visible INTEGER NOT NULL DEFAULT 1,
        is_sample INTEGER NOT NULL DEFAULT 0
    )
    """,
    """
    CREATE TABLE IF NOT EXISTS testimonials (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        quote TEXT NOT NULL,
        name TEXT NOT NULL,
        role TEXT NOT NULL DEFAULT 'Student',
        class_year TEXT NOT NULL DEFAULT '',
        photo_url TEXT NOT NULL DEFAULT '',
        sort_order INTEGER NOT NULL DEFAULT 0,
        visible INTEGER NOT NULL DEFAULT 1,
        is_sample INTEGER NOT NULL DEFAULT 0
    )
    """,
    """
    CREATE TABLE IF NOT EXISTS gallery_images (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        image_url TEXT NOT NULL,
        caption TEXT NOT NULL DEFAULT '',
        sort_order INTEGER NOT NULL DEFAULT 0,
        visible INTEGER NOT NULL DEFAULT 1,
        is_sample INTEGER NOT NULL DEFAULT 0
    )
    """,
    """
    CREATE TABLE IF NOT EXISTS leads (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        created_at TEXT NOT NULL,
        student_name TEXT NOT NULL,
        mobile TEXT NOT NULL,
        class_name TEXT NOT NULL,
        stream TEXT NOT NULL,
        branch_id INTEGER NOT NULL,
        status TEXT NOT NULL DEFAULT 'New',
        note TEXT NOT NULL DEFAULT '',
        source TEXT NOT NULL DEFAULT '/',
        ip_hash TEXT NOT NULL DEFAULT ''
    )
    """,
    """
    CREATE TABLE IF NOT EXISTS admin_users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email TEXT NOT NULL UNIQUE,
        password_hash TEXT NOT NULL,
        active INTEGER NOT NULL DEFAULT 1,
        created_at TEXT NOT NULL
    )
    """,
    """
    CREATE TABLE IF NOT EXISTS rate_limits (
        key TEXT PRIMARY KEY,
        count INTEGER NOT NULL DEFAULT 0,
        window_start INTEGER NOT NULL DEFAULT 0
    )
    """,
    """
    CREATE TABLE IF NOT EXISTS blobs (
        filename TEXT PRIMARY KEY,
        data BLOB NOT NULL,
        content_type TEXT NOT NULL DEFAULT 'image/webp',
        is_sample INTEGER NOT NULL DEFAULT 0,
        created_at INTEGER NOT NULL DEFAULT 0
    )
    """,
]


def _pg_ddl(sql: str) -> str:
    return (
        sql.replace("INTEGER PRIMARY KEY AUTOINCREMENT", "SERIAL PRIMARY KEY")
        .replace("BLOB NOT NULL", "BYTEA NOT NULL")
    )


DEFAULT_SECTION_HEADINGS = {
    "results": {"en": "Hall of Fame", "hi": ""},
    "courses": {"en": "Courses & Streams", "hi": ""},
    "batches": {"en": "Live Upcoming Batches", "hi": ""},
    "founders": {"en": "Founders & Mentors", "hi": ""},
    "branches": {"en": "Our Branches", "hi": ""},
    "campus": {"en": "Campus Life & Voices", "hi": ""},
    "demo": {"en": "Book a Free Demo Class", "hi": ""},
}


DEFAULT_SETTINGS: dict[str, str] = {
    "brand_name": "Shikshanama (शिक्षाNama)",
    "instagram_handle": "shikshanamaofficial",
    "global_phone": "+919811004242",
    "global_whatsapp": "+919811004242",
    "whatsapp_template": "Hi Shikshanama (शिक्षाNama)! I want to book a Free Demo Class and counselling session.",
    "youtube_url": "",
    "facebook_url": "",
    "ticker_enabled": "false",
    "ticker_text": "Admissions Open 2026-27 · Scholarship Test This Sunday · Book your slot now!",
    "ticker_link": "#demo-form",
    "hero_image_url": "",
    "classes_list": json.dumps(["6", "7", "8", "9", "10", "11", "12"]),
    "streams_list": json.dumps(["Foundation", "Science", "Commerce", "Humanities"]),
    "section_headings": json.dumps(DEFAULT_SECTION_HEADINGS, ensure_ascii=False),
}


def store_blob_bytes(db: DBAdapter, data: bytes, is_sample: bool = False) -> str:
    """Save WebP bytes to Vercel Blob (if token set) or database-backed blob store with random UUID filename (AC-11.6)."""
    filename = f"{uuid.uuid4().hex}.webp"
    token = os.environ.get("BLOB_READ_WRITE_TOKEN", "").strip()
    if token:
        headers = {
            "authorization": f"Bearer {token}",
            "x-content-type": "image/webp",
            "x-add-random-suffix": "0",
        }
        resp = httpx.put(f"https://blob.vercel-storage.com/{filename}", content=data, headers=headers, timeout=15.0)
        resp.raise_for_status()
        payload = resp.json()
        url = payload.get("url") or f"/api/blobs/{filename}"
        # Also keep a local DB copy so delete tracking and local fallback work reliably
        db.execute(
            "INSERT INTO blobs (filename, data, content_type, is_sample, created_at) VALUES (?, ?, ?, ?, ?)",
            (filename, data, "image/webp", 1 if is_sample else 0, int(time.time())),
        )
        return str(url)

    db.execute(
        "INSERT INTO blobs (filename, data, content_type, is_sample, created_at) VALUES (?, ?, ?, ?, ?)",
        (filename, data, "image/webp", 1 if is_sample else 0, int(time.time())),
    )
    return f"/api/blobs/{filename}"


def delete_blob_by_url(db: DBAdapter, url: str | None) -> None:
    """Delete a stored image file from Vercel Blob and/or DB blob table when replaced or deleted (AC-11.6, AC-12.3)."""
    if not url:
        return
    token = os.environ.get("BLOB_READ_WRITE_TOKEN", "").strip()
    if token and url.startswith("https://"):
        try:
            httpx.post(
                "https://blob.vercel-storage.com/delete",
                json={"urls": [url]},
                headers={"authorization": f"Bearer {token}"},
                timeout=10.0,
            )
        except Exception:
            pass
    filename = url.rsplit("/", 1)[-1]
    if filename:
        db.execute("DELETE FROM blobs WHERE filename = ?", (filename,))


def init_and_seed_db() -> None:
    """Ensure tables exist and seed first-run defaults once without overwriting staff edits (US-18)."""
    with get_db() as db:
        for ddl in SCHEMA_TABLES_SQLITE:
            db.execute(_pg_ddl(ddl) if db.pg else ddl)

        # Ensure initial admin user exists from env (AC-10.6)
        admin_email = os.environ.get("ADMIN_EMAIL", "").strip().lower() or "admin@shikshanama.in"
        admin_hash = os.environ.get("ADMIN_PASSWORD_HASH", "").strip()
        if not admin_hash:
            admin_hash = hash_password("Shikshanama@2026", salt="shikshanamadefaultsalt")
        existing_admin = db.fetchone("SELECT id FROM admin_users WHERE email = ?", (admin_email,))
        if not existing_admin:
            db.insert_id(
                "admin_users",
                {
                    "email": admin_email,
                    "password_hash": admin_hash,
                    "active": 1,
                    "created_at": now_ist_iso(),
                },
            )

        # Check if first-run seeding has already completed (AC-18.4)
        already_seeded = db.fetchone("SELECT value FROM settings WHERE key = ?", ("seeded_v1",))
        if already_seeded:
            return

        for k, v in DEFAULT_SETTINGS.items():
            existing_k = db.fetchone("SELECT key FROM settings WHERE key = ?", (k,))
            if not existing_k:
                db.execute("INSERT INTO settings (key, value) VALUES (?, ?)", (k, v))

        # Seed Flagship Branch (AC-6.4 & AC-18.1)
        flagship_id = db.insert_id(
            "branches",
            {
                "name": FLAGSHIP_NAME,
                "address": FLAGSHIP_ADDRESS,
                "maps_url": (
                    "https://www.google.com/maps/search/?api=1&query="
                    + urllib.parse.quote_plus(FLAGSHIP_ADDRESS)
                ),
                "phone": "+919811004242",
                "whatsapp": "+919811004242",
                "is_flagship": 1,
                "active": 1,
                "sort_order": 1,
                "is_sample": 0,
            },
        )

        # Seed Hero Trust Counters (AC-18.1)
        hero_counters = [
            ("Total Toppers", "250+", 1, 1),
            ("Years of Excellence", "10+", 2, 1),
            ("Active Branches", "3", 3, 1),
            ("Board Pass Rate", "100%", 4, 1),
        ]
        for label, val, order, vis in hero_counters:
            db.insert_id(
                "hero_stats",
                {"label": label, "value": val, "sort_order": order, "visible": vis},
            )

        # Seed Four Streams Courses (AC-18.1)
        default_courses = [
            (
                "Foundation",
                "Class 6–10 Olympiad & Board Foundation",
                "6, 7, 8, 9, 10",
                ["Mathematics", "Science", "English", "Social Science", "Mental Ability (MAT)"],
                ["NCERT Line-by-Line Mastery", "Weekly OMR & Subjective Tests", "Doubt Counters Every Day"],
                1,
            ),
            (
                "Science",
                "Class 11–12 Science (PCM / PCB) + Board & CUET",
                "11, 12",
                ["Physics", "Chemistry", "Mathematics", "Biology", "English Core"],
                ["Concept-First Numericals Lab", "CBSE Board Answer-Writing Drills", "CUET Domain Mock Series"],
                2,
            ),
            (
                "Commerce",
                "Class 11–12 Commerce Toppers Program",
                "11, 12",
                ["Accountancy", "Economics", "Business Studies", "Applied / Core Maths", "English"],
                ["Case-Study & Balance Sheet Clinics", "100-Percentile CUET Prep", "Small Batch Personal Mentoring"],
                3,
            ),
            (
                "Humanities",
                "Class 11–12 Humanities & Liberal Arts Excellence",
                "11, 12",
                ["Political Science", "History", "Geography", "Economics", "Psychology", "Sociology"],
                ["Structured Answer Framing", "Map & Source-Based Question Mastery", "DU North Campus Target Prep"],
                4,
            ),
        ]
        for stream, name, classes, subjects, highlights, order in default_courses:
            db.insert_id(
                "courses",
                {
                    "stream": stream,
                    "name": name,
                    "classes": classes,
                    "subjects_json": json.dumps(subjects, ensure_ascii=False),
                    "highlights_json": json.dumps(highlights, ensure_ascii=False),
                    "sort_order": order,
                    "visible": 1,
                    "is_sample": 0,
                },
            )

        demo_mode = os.environ.get("DEMO_MODE", "true").strip().lower() in ("true", "1", "yes")
        db.execute("INSERT INTO settings (key, value) VALUES (?, ?)", ("demo_mode", "true" if demo_mode else "false"))

        if demo_mode:
            _seed_demo_sample_content(db, flagship_id)

        db.execute("INSERT INTO settings (key, value) VALUES (?, ?)", ("seeded_v1", "true"))


def _seed_demo_sample_content(db: DBAdapter, flagship_id: int) -> None:
    """Seed clearly fictional sample content (8 results, 2 founders, 6 batches, 4 testimonials, 6 gallery images) (AC-18.2)."""
    # 2 nearby sample branches
    east_branch_id = db.insert_id(
        "branches",
        {
            "name": "East Patel Nagar Center (Sample)",
            "address": "2nd Floor, Main Market Road, Block 14, East Patel Nagar, New Delhi, Delhi, 110008",
            "maps_url": "https://www.google.com/maps/search/?api=1&query=East+Patel+Nagar+New+Delhi+110008",
            "phone": "+919811004243",
            "whatsapp": "+919811004243",
            "is_flagship": 0,
            "active": 1,
            "sort_order": 2,
            "is_sample": 1,
        },
    )
    rajendra_branch_id = db.insert_id(
        "branches",
        {
            "name": "Rajendra Place Hub (Sample)",
            "address": "Plot 9, Near Metro Gate 2, Rajendra Place, New Delhi, Delhi, 110008",
            "maps_url": "https://www.google.com/maps/search/?api=1&query=Rajendra+Place+New+Delhi+110008",
            "phone": "+919811004244",
            "whatsapp": "+919811004244",
            "is_flagship": 0,
            "active": 1,
            "sort_order": 3,
            "is_sample": 1,
        },
    )

    # 8 fictional student results with illustrated WebP avatars and Consent = "Given (sample)"
    palette = [
        ((30, 41, 59), (249, 115, 22)),
        ((15, 23, 42), (56, 189, 248)),
        ((24, 24, 27), (168, 85, 247)),
        ((20, 83, 45), (74, 222, 128)),
        ((49, 46, 129), (251, 191, 36)),
        ((67, 20, 7), (251, 146, 60)),
        ((19, 78, 74), (45, 212, 191)),
        ((76, 5, 25), (244, 63, 94)),
    ]
    sample_results = [
        ("Aarav Verma (Sample)", "12", "Science", "98.8%", "Subject Topper · Physics 100/100", "2025-26", 1),
        ("Ananya Sharma (Sample)", "12", "Commerce", "98.4%", "District Rank 2 · Accountancy 100", "2025-26", 2),
        ("Kabir Malhotra (Sample)", "10", "Foundation", "99.0%", "School Topper · Maths 100/100", "2025-26", 3),
        ("Suhani Gupta (Sample)", "12", "Humanities", "97.8%", "Pol Science 100/100 · DU Hindu", "2025-26", 4),
        ("Rohan Kapoor (Sample)", "12", "Science", "97.6%", "Chemistry 99/100 · JEE Mains 99.4%ile", "2025-26", 5),
        ("Meera Nair (Sample)", "10", "Foundation", "98.2%", "Science 100/100 · Olympiad Gold", "2025-26", 6),
        ("Devansh Joshi (Sample)", "12", "Commerce", "97.2%", "Economics 99/100 · SRCC Qualifier", "2024-25", 7),
        ("Ishita Bansal (Sample)", "11", "Humanities", "96.8%", "History & Psychology Topper", "2024-25", 8),
    ]
    for idx, (name, cls_name, stream, score, rank, year, order) in enumerate(sample_results):
        bg, fg = palette[idx % len(palette)]
        photo_url = store_blob_bytes(db, generate_sample_webp("result", bg, fg), is_sample=True)
        rid = db.insert_id(
            "results",
            {
                "photo_url": photo_url,
                "name": name,
                "class_name": cls_name,
                "stream": stream,
                "score_text": score,
                "rank_text": rank,
                "year": year,
                "published": 1,
                "pinned": 1,
                "sort_order": order,
                "is_sample": 1,
                "parent_name": "Sample Parent Guardian",
                "parent_whatsapp": "+919811009000",
            },
        )
        db.insert_id(
            "consents",
            {
                "result_id": rid,
                "status": "Given (sample)",
                "method": "Sample",
                "token_hash": "",
                "expires_at": 0,
                "agreed_name": "Sample Parent Guardian",
                "agreed_at": now_ist_iso(),
                "text_version": CONSENT_TEXT_VERSION,
                "ip_hash": "sample",
                "recorded_by": "system_seed",
            },
        )

    # 2 fictional founders with >280 character vision messages so AC-5.2 truncation is testable immediately
    founders_data = [
        (
            "Dr. Vikramaditya Rao (Sample)",
            "Co-Founder & Senior Physics Mentor (M.Tech, 14+ Yrs Exp)",
            (
                "At Shikshanama (शिक्षाNama), we believe every student in West Patel Nagar deserves the same "
                "conceptual clarity, structured answer-writing practice, and personal mentorship as national toppers. "
                "We don't crowd 150 students into a hall—we keep batches focused, track every weekly test score, "
                "and partner directly with parents so no child ever falls behind in Class 9, 10, 11, or 12 boards."
            ),
            1,
            ((15, 23, 42), (249, 115, 22)),
        ),
        (
            "Prof. Nidhi Chawla (Sample)",
            "Co-Founder & Head of Commerce & Economics (CA, M.Com)",
            (
                "Board exams and CUET reward students who understand why concepts work rather than memorizing pages. "
                "Our Hinglish classroom culture makes complex Accountancy, Economics, and Humanities topics intuitive, "
                "interactive, and stress-free—turning average scorers into confident 95%+ achievers year after year."
            ),
            2,
            ((30, 41, 59), (56, 189, 248)),
        ),
    ]
    for name, desig, vision, order, (bg, fg) in founders_data:
        photo_url = store_blob_bytes(db, generate_sample_webp("founder", bg, fg), is_sample=True)
        db.insert_id(
            "founders",
            {
                "photo_url": photo_url,
                "name": name,
                "designation": desig,
                "vision": vision,
                "sort_order": order,
                "visible": 1,
                "is_sample": 1,
            },
        )

    # 6 sample upcoming batches with future dates (relative to current clock so AC-4.3 is always satisfied)
    today = datetime.now(IST).date()
    d1 = (today + timedelta(days=12)).isoformat()
    d2 = (today + timedelta(days=18)).isoformat()
    d3 = (today + timedelta(days=25)).isoformat()
    sample_batches = [
        ("10", "Foundation", flagship_id, d1, "Mon/Wed/Fri · 4:00 PM – 6:00 PM", "Filling Fast"),
        ("12", "Science", flagship_id, d1, "Tue/Thu/Sat · 3:30 PM – 6:30 PM", "Open"),
        ("12", "Commerce", flagship_id, d2, "Mon–Fri · 5:00 PM – 7:00 PM", "Filling Fast"),
        ("11", "Humanities", east_branch_id, d2, "Tue/Thu/Sat · 4:30 PM – 6:30 PM", "Open"),
        ("9", "Foundation", rajendra_branch_id, d3, "Mon/Wed/Fri · 4:00 PM – 5:30 PM", "Open"),
        ("12", "Science", east_branch_id, d3, "Weekend Crash · 10:00 AM – 1:00 PM", "Full"),
    ]
    for cls_name, stream, bid, sdate, timings, status in sample_batches:
        db.insert_id(
            "batches",
            {
                "class_name": cls_name,
                "stream": stream,
                "branch_id": bid,
                "start_date": sdate,
                "timings": timings,
                "status": status,
                "active": 1,
                "is_sample": 1,
            },
        )

    # 4 sample testimonials
    sample_testimonials = [
        (
            "Shikshanama's daily doubt counters and weekly board mock papers helped me jump from 78% in pre-boards to 98.8% in CBSE Class 12!",
            "Aarav Verma (Sample)",
            "Student",
            "Class 12 Science · 2025-26",
            1,
        ),
        (
            "As a parent, getting weekly test updates on WhatsApp and seeing how personally the teachers guide each child gave us complete peace of mind.",
            "Mrs. Sunita Sharma (Sample)",
            "Parent",
            "Parent of Class 12 Commerce Topper",
            2,
        ),
        (
            "Accountancy and Economics felt scary in Class 11, but Nidhi Ma'am's real-life examples made Commerce my favourite subject.",
            "Devansh Joshi (Sample)",
            "Student",
            "Class 12 Commerce · 97.2%",
            3,
        ),
        (
            "The Foundation batch built my Olympiad and NCERT base so strongly that Class 10 board exams felt effortless.",
            "Kabir Malhotra (Sample)",
            "Student",
            "Class 10 Foundation · 99.0%",
            4,
        ),
    ]
    for idx, (quote, name, role, cy, order) in enumerate(sample_testimonials):
        bg, fg = palette[(idx + 2) % len(palette)]
        t_photo = store_blob_bytes(db, generate_sample_webp("testimonial", bg, fg), is_sample=True)
        db.insert_id(
            "testimonials",
            {
                "quote": quote,
                "name": name,
                "role": role,
                "class_year": cy,
                "photo_url": t_photo,
                "sort_order": order,
                "visible": 1,
                "is_sample": 1,
            },
        )

    # 6 sample 16:9 gallery images
    gallery_captions = [
        "Interactive Smart Classroom at West Patel Nagar (Sample)",
        "Annual Board Toppers Felicitation Ceremony · सम्मान समारोह (Sample)",
        "One-on-One Doubt Solving & Mentorship Desk (Sample)",
        "Sunday OMR & CBSE Pattern Mock Test Session (Sample)",
        "Science & Numericals Workshop in Action (Sample)",
        "Parent-Teacher Academic Progress Meet (Sample)",
    ]
    for idx, caption in enumerate(gallery_captions, start=1):
        bg, fg = palette[idx % len(palette)]
        g_url = store_blob_bytes(db, generate_sample_webp("gallery", bg, fg), is_sample=True)
        db.insert_id(
            "gallery_images",
            {
                "image_url": g_url,
                "caption": caption,
                "sort_order": idx,
                "visible": 1,
                "is_sample": 1,
            },
        )


def remove_all_sample_content(db: DBAdapter) -> dict[str, int]:
    """Delete every sample record and its blob images in one go, leaving real content untouched (AC-18.3)."""
    sample_results = db.fetchall("SELECT id, photo_url FROM results WHERE is_sample = 1")
    for r in sample_results:
        delete_blob_by_url(db, r["photo_url"])
        db.execute("DELETE FROM consents WHERE result_id = ?", (r["id"],))
    db.execute("DELETE FROM results WHERE is_sample = 1")

    sample_founders = db.fetchall("SELECT id, photo_url FROM founders WHERE is_sample = 1")
    for f in sample_founders:
        delete_blob_by_url(db, f["photo_url"])
    db.execute("DELETE FROM founders WHERE is_sample = 1")

    sample_testimonials = db.fetchall("SELECT id, photo_url FROM testimonials WHERE is_sample = 1")
    for t in sample_testimonials:
        delete_blob_by_url(db, t["photo_url"])
    db.execute("DELETE FROM testimonials WHERE is_sample = 1")

    sample_gallery = db.fetchall("SELECT id, image_url FROM gallery_images WHERE is_sample = 1")
    for g in sample_gallery:
        delete_blob_by_url(db, g["image_url"])
    db.execute("DELETE FROM gallery_images WHERE is_sample = 1")

    sample_batches = db.fetchall("SELECT id FROM batches WHERE is_sample = 1")
    db.execute("DELETE FROM batches WHERE is_sample = 1")

    sample_courses = db.fetchall("SELECT id FROM courses WHERE is_sample = 1")
    db.execute("DELETE FROM courses WHERE is_sample = 1")

    sample_branches = db.fetchall("SELECT id FROM branches WHERE is_sample = 1 AND is_flagship = 0")
    db.execute("DELETE FROM branches WHERE is_sample = 1 AND is_flagship = 0")

    db.execute("DELETE FROM blobs WHERE is_sample = 1")
    db.execute("UPDATE settings SET value = 'false' WHERE key = 'demo_mode'")

    return {
        "results_removed": len(sample_results),
        "founders_removed": len(sample_founders),
        "testimonials_removed": len(sample_testimonials),
        "gallery_removed": len(sample_gallery),
        "batches_removed": len(sample_batches),
        "courses_removed": len(sample_courses),
        "branches_removed": len(sample_branches),
    }


def check_and_increment_rate_limit(
    db: DBAdapter,
    key: str,
    max_attempts: int,
    window_seconds: int,
    increment: bool = True,
    now: int | None = None,
) -> tuple[bool, int]:
    """Return (allowed, current_count) within rolling window stored in rate_limits table."""
    current = int(now if now is not None else time.time())
    row = db.fetchone("SELECT count, window_start FROM rate_limits WHERE key = ?", (key,))
    if not row or (current - int(row["window_start"])) >= window_seconds:
        new_count = 1 if increment else 0
        if row:
            db.execute(
                "UPDATE rate_limits SET count = ?, window_start = ? WHERE key = ?",
                (new_count, current, key),
            )
        else:
            db.execute(
                "INSERT INTO rate_limits (key, count, window_start) VALUES (?, ?, ?)",
                (key, new_count, current),
            )
        return (new_count <= max_attempts, new_count)

    count = int(row["count"])
    if count >= max_attempts:
        return (False, count)

    if increment:
        count += 1
        db.execute("UPDATE rate_limits SET count = ? WHERE key = ?", (count, key))
    return (count <= max_attempts, count)


def reset_rate_limit(db: DBAdapter, key: str) -> None:
    db.execute("DELETE FROM rate_limits WHERE key = ?", (key,))
