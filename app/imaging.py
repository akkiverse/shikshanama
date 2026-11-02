"""Server-side image validation, aspect ratio enforcement, and format conversion (US-11)."""

from __future__ import annotations

from io import BytesIO
from typing import Any
from PIL import Image, ImageDraw, ImageOps

MAX_IMAGE_BYTES = 25 * 1024 * 1024  # Accept up to 25 MB images
ASPECT_TOLERANCE = 0.05  # ±5% tolerance for aspect ratio

CROP_SPECS: dict[str, dict[str, Any]] = {
    "result": {"ratio": 1.0, "max_w": 800, "max_h": 800, "label": "1:1"},
    "testimonial": {"ratio": 1.0, "max_w": 800, "max_h": 800, "label": "1:1"},
    "founder": {"ratio": 4.0 / 5.0, "max_w": 960, "max_h": 1200, "label": "4:5"},
    "gallery": {"ratio": 16.0 / 9.0, "max_w": 1920, "max_h": 1080, "label": "16:9"},
    "banner": {"ratio": 16.0 / 9.0, "max_w": 1920, "max_h": 1080, "label": "16:9"},
}


def process_and_convert_to_webp(data: bytes, kind: str) -> tuple[bytes, dict[str, Any]]:
    """
    Accept any decodable image format (JPEG, PNG, WebP, HEIF/HEIC, TIFF, etc.).
    Validates dimensions, respects EXIF orientation, crops/scales to target aspect if needed,
    and returns optimized WebP bytes ready for storage.
    """
    if kind not in CROP_SPECS:
        raise ValueError(f"Unsupported image kind '{kind}'. Must be one of: {', '.join(CROP_SPECS)}.")
    if not data:
        raise ValueError("Uploaded image file is empty.")
    if len(data) > MAX_IMAGE_BYTES:
        raise ValueError("Image exceeds the 25 MB limit.")

    try:
        img = Image.open(BytesIO(data))
        # Handle EXIF orientation (common on iPhones and DSLRs)
        img = ImageOps.exif_transpose(img)
    except Exception as exc:
        raise ValueError("File is not a valid decodable image (JPEG, PNG, WebP, etc.).") from exc

    spec = CROP_SPECS[kind]
    target_ratio = float(spec["ratio"])

    # Convert mode to RGB or RGBA
    if img.mode not in ("RGB", "RGBA"):
        img = img.convert("RGB")

    width, height = img.size
    if width <= 0 or height <= 0:
        raise ValueError("Invalid image dimensions.")

    actual_ratio = width / float(height)
    rel_diff = abs(actual_ratio - target_ratio) / target_ratio

    if rel_diff > ASPECT_TOLERANCE:
        raise ValueError(
            f"Image aspect ratio {actual_ratio:.2f} does not match {spec['label']} ({target_ratio:.2f}) required for {kind}."
        )

    # Downscale if larger than maximum allowed dimensions (preserving high quality)
    max_w = spec["max_w"]
    max_h = spec["max_h"]
    if width > max_w or height > max_h:
        img.thumbnail((max_w, max_h), Image.Resampling.LANCZOS)
        width, height = img.size

    # Convert to WebP format
    out_buf = BytesIO()
    # Save as high quality WebP
    img.save(out_buf, format="WEBP", quality=85, method=4)
    webp_bytes = out_buf.getvalue()

    info = {
        "width": width,
        "height": height,
        "format": "WEBP",
        "size_bytes": len(webp_bytes),
        "kind": kind,
    }
    return webp_bytes, info


def validate_and_inspect_webp(data: bytes, kind: str) -> dict[str, Any]:
    """Compatibility wrapper that validates or converts image data to WebP."""
    _, info = process_and_convert_to_webp(data, kind)
    return info


def generate_sample_webp(
    kind: str = "result",
    bg_color: tuple[int, int, int] = (11, 37, 69),
    accent_color: tuple[int, int, int] = (201, 162, 39),
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
    pad = min(w, h) // 8
    draw.rectangle([pad, pad, w - pad, h - pad], outline=accent_color, width=4)
    cx, cy = w // 2, h // 2
    r = min(w, h) // 5
    draw.ellipse([cx - r, cy - r - 15, cx + r, cy + r - 15], fill=accent_color)
    draw.pieslice([cx - int(r * 1.6), cy + r // 2, cx + int(r * 1.6), cy + int(r * 2.5)], 180, 360, fill=accent_color)
    buf = BytesIO()
    img.save(buf, format="WEBP", quality=85)
    return buf.getvalue()
