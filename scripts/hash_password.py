#!/usr/bin/env python3
"""Generate a salted PBKDF2-HMAC-SHA256 password hash for ADMIN_PASSWORD_HASH."""

import getpass
import hashlib
import secrets
import sys


def hash_password(password: str, salt: str | None = None) -> str:
    salt_val = salt or secrets.token_hex(16)
    dk = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt_val.encode("utf-8"), 200_000)
    return f"pbkdf2_sha256$200000${salt_val}${dk.hex()}"


if __name__ == "__main__":
    pw = sys.argv[1] if len(sys.argv) > 1 else getpass.getpass("Admin password: ")
    print(hash_password(pw))
