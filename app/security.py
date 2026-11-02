"""Security, authentication, phone validation, and CSV sanitization helpers."""

from __future__ import annotations

import base64
import hashlib
import hmac
import json
import os
import re
import secrets
import time
from typing import Any

COOKIE_NAME = "shikshanama_session"
SESSION_TTL_SECONDS = 12 * 3600  # 12 hours (AC-10.3)
CONSENT_TTL_SECONDS = 14 * 86400  # 14 days (AC-20.2)

# Explicit in-memory cache dictionary to demonstrate that clearing worker memory
# never invalidates stateless HMAC sessions (Rule #10 & AC-10.3).
RUNTIME_MEMORY_CACHE: dict[str, Any] = {}


def clear_runtime_memory() -> None:
    """Clear any ephemeral worker memory to verify stateless multi-worker behavior."""
    RUNTIME_MEMORY_CACHE.clear()


def _session_secret() -> bytes:
    secret = os.environ.get("SESSION_SECRET", "").strip()
    if not secret:
        secret = "shikshanama-default-session-secret-change-in-production-2026"
    return secret.encode("utf-8")


def _ip_salt() -> str:
    salt = os.environ.get("IP_HASH_SALT", "").strip()
    if not salt:
        salt = "shikshanama-default-ip-salt-2026"
    return salt


def hash_ip(ip: str | None) -> str:
    raw = (ip or "0.0.0.0").strip()
    return hashlib.sha256(f"{_ip_salt()}:{raw}".encode("utf-8")).hexdigest()[:32]


def hash_token(token: str) -> str:
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


def hash_password(password: str, salt: str | None = None) -> str:
    salt_val = salt or secrets.token_hex(16)
    dk = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt_val.encode("utf-8"), 200_000)
    return f"pbkdf2_sha256$200000${salt_val}${dk.hex()}"


def verify_password(password: str, stored_hash: str) -> bool:
    if not password or not stored_hash:
        return False
    if stored_hash.startswith("pbkdf2_sha256$"):
        parts = stored_hash.split("$")
        if len(parts) != 4:
            return False
        _, iter_str, salt, expected_hex = parts
        try:
            iterations = int(iter_str)
        except ValueError:
            return False
        dk = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt.encode("utf-8"), iterations)
        return hmac.compare_digest(dk.hex(), expected_hex)
    if stored_hash.startswith("sha256$"):
        _, salt, expected_hex = stored_hash.split("$", 2)
        digest = hashlib.sha256(f"{salt}:{password}".encode("utf-8")).hexdigest()
        return hmac.compare_digest(digest, expected_hex)
    return False


def _b64url_encode(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).rstrip(b"=").decode("ascii")


def _b64url_decode(s: str) -> bytes:
    pad = "=" * ((4 - len(s) % 4) % 4)
    return base64.urlsafe_b64decode((s + pad).encode("ascii"))


def create_session_token(user_id: int, email: str, now: int | None = None) -> dict[str, Any]:
    issued_at = int(now if now is not None else time.time())
    expires_at = issued_at + SESSION_TTL_SECONDS
    csrf_token = hmac.new(
        _session_secret(),
        f"csrf:{user_id}:{email}:{issued_at}".encode("utf-8"),
        hashlib.sha256,
    ).hexdigest()[:32]
    payload = {
        "uid": user_id,
        "email": email.lower().strip(),
        "iat": issued_at,
        "exp": expires_at,
        "csrf": csrf_token,
    }
    payload_bytes = json.dumps(payload, separators=(",", ":"), sort_keys=True).encode("utf-8")
    payload_b64 = _b64url_encode(payload_bytes)
    sig = hmac.new(_session_secret(), payload_b64.encode("ascii"), hashlib.sha256).hexdigest()
    return {
        "token": f"{payload_b64}.{sig}",
        "csrf_token": csrf_token,
        "expires_at": expires_at,
    }


def verify_session_token(token: str | None, now: int | None = None) -> dict[str, Any] | None:
    if not token or "." not in token:
        return None
    try:
        payload_b64, sig = token.rsplit(".", 1)
        expected_sig = hmac.new(_session_secret(), payload_b64.encode("ascii"), hashlib.sha256).hexdigest()
        if not hmac.compare_digest(sig, expected_sig):
            return None
        payload = json.loads(_b64url_decode(payload_b64).decode("utf-8"))
        current_time = int(now if now is not None else time.time())
        if int(payload.get("exp", 0)) < current_time:
            return None
        return payload
    except Exception:
        return None


def create_consent_token(result_id: int, now: int | None = None) -> tuple[str, str, int]:
    """Return (signed_token, token_hash, expires_at_epoch)."""
    issued_at = int(now if now is not None else time.time())
    expires_at = issued_at + CONSENT_TTL_SECONDS
    nonce = secrets.token_urlsafe(12)
    payload = {"rid": result_id, "iat": issued_at, "exp": expires_at, "n": nonce}
    payload_b64 = _b64url_encode(json.dumps(payload, separators=(",", ":"), sort_keys=True).encode("utf-8"))
    sig = hmac.new(_session_secret(), f"consent:{payload_b64}".encode("ascii"), hashlib.sha256).hexdigest()
    token = f"{payload_b64}.{sig}"
    return token, hash_token(token), expires_at


def verify_consent_token(token: str | None, now: int | None = None) -> dict[str, Any] | None:
    if not token or "." not in token:
        return None
    try:
        payload_b64, sig = token.rsplit(".", 1)
        expected_sig = hmac.new(_session_secret(), f"consent:{payload_b64}".encode("ascii"), hashlib.sha256).hexdigest()
        if not hmac.compare_digest(sig, expected_sig):
            return None
        payload = json.loads(_b64url_decode(payload_b64).decode("utf-8"))
        current_time = int(now if now is not None else time.time())
        if int(payload.get("exp", 0)) < current_time:
            return None
        return payload
    except Exception:
        return None


def normalize_indian_mobile(raw: str) -> str:
    """Validate and normalize an Indian mobile number to +91XXXXXXXXXX (AC-9.2)."""
    if not raw or not isinstance(raw, str):
        raise ValueError("Mobile number is required.")
    cleaned = re.sub(r"[\s\-]", "", raw.strip())
    if cleaned.startswith("+91"):
        cleaned = cleaned[3:]
    elif cleaned.startswith("91") and len(cleaned) == 12:
        cleaned = cleaned[2:]
    elif cleaned.startswith("0") and len(cleaned) == 11:
        cleaned = cleaned[1:]
    if not re.fullmatch(r"[6-9]\d{9}", cleaned):
        raise ValueError("Enter a valid 10-digit Indian mobile number starting with 6–9.")
    return f"+91{cleaned}"


def normalize_indian_phone(raw: str) -> str:
    """Validate Indian mobile or landline with STD code and normalize to +91... (AC-15.4)."""
    if not raw or not isinstance(raw, str):
        raise ValueError("Phone number is required.")
    cleaned = re.sub(r"[\s\-()]", "", raw.strip())
    if cleaned.startswith("+91"):
        cleaned = cleaned[3:]
    elif cleaned.startswith("91") and len(cleaned) in (12, 11):
        cleaned = cleaned[2:]
    elif cleaned.startswith("0") and len(cleaned) in (10, 11):
        cleaned = cleaned[1:]
    # Mobile (10 digits starting 6-9) or STD landline (10 digits starting 1-5, e.g. 11xxxxxxxx for Delhi)
    if not re.fullmatch(r"[1-9]\d{9}", cleaned):
        raise ValueError("Enter a valid 10-digit Indian mobile or STD landline number.")
    return f"+91{cleaned}"


def digits_for_wa(phone: str) -> str:
    """Return digits-only representation (e.g. 919811004242) for wa.me URLs."""
    return re.sub(r"\D", "", phone or "")


def escape_csv_cell(value: Any) -> str:
    """Escape cells starting with =, +, -, or @ to prevent CSV formula injection (AC-17.3)."""
    text = "" if value is None else str(value)
    if text and text[0] in ("=", "+", "-", "@"):
        return f"'{text}"
    return text
