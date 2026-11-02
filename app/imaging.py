"""Server-side WebP validation, aspect ratio enforcement, and sample WebP generator (US-11)."""

from __future__ import annotations

from io import BytesIO
from typing import Any
from PIL import Image, ImageDraw

MAX_WEBP_BYTES = 1_048_576  # 1 MB (AC-11.4)
ASPECT_TOLERANCE = 0.01  # ±1% (AC-11.4)

CROP_SPECS: dict[str, dict[str, Any]] = {
    "result": {"ratio": 1.0, "max_w": 800, "max_h": 800, "label": "1:1"},
    "testimonial": {"ratio": 1.0, "max_w": 800, "max_h": 800, "label": "1:1"},
    "founder": {"ratio": 4.0 / 5.0, "max_w": 960, "max_h": 1200, "label": "4:5"},
    "gallery": {"ratio": 16.0 / 9.0, "max_w": 1920, "max_h": 1080, "label": "16:9"},
    "banner": {"ratio": 16.0 / 9.0, "max_w": 1920, "max_h": 1080, "label": "16:9"},
}


def validate_and_inspect_webp(data: bytes, kind: str) -> dict[str, Any]:
    """Verify data is a real WebP image <= 1 MB matching the target aspect ratio within ±1%."""
    if kind not in CROP_SPECS:
        raise ValueError(f"Unsupported image kind '{kind}'. Must be one of: {', '.join(CROP_SPECS)}.")
    if not data:
        raise ValueError("Uploaded image file is empty.")
    if len(data) > MAX_WEBP_BYTES:
        raise ValueError("Image exceeds the 1 MB WebP limit.")

    try:
        with Image.open(BytesIO(data)) as img:
            img_format = (img.format or "").upper()
            width, height = img.size
            img.verify()
    except Exception as exc:
        raise ValueError("File is not a valid decodable image.") from exc

    if img_format != "WEBP":
        raise ValueError("Image must be in WebP format (.webp) exported by the built-in cropper.")
    if width <= 0 or height <= 0:
        raise ValueError("Invalid image dimensions.")

    spec = CROP_SPECS[kind]
    expected_ratio = float(spec["ratio"])
    actual_ratio = width / float(height)
    rel_diff = abs(actual_ratio - expected_ratio) / expected_ratio
    if rel_diff > ASPECT_TOLERANCE:
        raise ValueError(
            f"Image aspect ratio ({width}x{height}) does not match required {spec['label']} ratio (±1%)."
        )
    if width > spec["max_w"] or height > spec["max_h"]:
        raise ValueError(
            f"Image dimensions ({width}x{height}) exceed maximum allowed {spec['max_w']}x{spec['max_h']}."
        )

    return {"width": width, "height": height, "format": "WEBP", "size_bytes": len(data), "kind": kind}


def generate_sample_webp(
    kind: str = "result",
    bg_color: tuple[int, int, int] = (30, 41, 59),
    accent_color: tuple[int, int, int] = (249, 115, 22),
) -> bytes:
    """Create a valid, small WebP placeholder matching the exact locked aspect ratio for kind."""
    dims = {
        "result": (400, 400),
        "testimonial": (400, 400),
        "founder": (400, 500),
        "gallery": (640, 360),
        "banner": (640, 360),
    }
    w, h = dims.get(kind, (400, 400))
    img = Image.new("RGB", (w, h), color=bg_color)
    draw = ImageDraw.Draw(img)
    # Draw decorative geometric accent shapes (illustrated avatar/card look)
    pad = min(w, h) // 8
    draw.rectangle([pad, pad, w - pad, h - pad], outline=accent_color, width=4)
    cx, cy = w // 2, h // 2
    r = min(w, h) // 5
    draw.ellipse([cx - r, cy - r - 15, cx + r, cy + r - 15], fill=accent_color)
    draw.pieslice([cx - int(r * 1.6), cy + r // 2, cx + int(r * 1.6), cy + int(r * 2.5)], 180, 360, fill=accent_color)
    buf = BytesIO()
    img.save(buf, format="WEBP", quality=80)
    return buf.getvalue()
