"""Printable 1-page A4 bilingual (English + Hindi) Parent Consent PDF generator (US-21)."""

from __future__ import annotations

from typing import Any

CONSENT_TEXT_VERSION = "v1"

CONSENT_TEXT_EN = (
    "I, as the parent/legal guardian of the student named above, hereby give my free and informed consent "
    "under the Digital Personal Data Protection Act, 2023 (DPDP Act) to Shikshanama (West Patel Nagar, New Delhi) "
    "to publish my ward's photograph, name, class, stream, academic year, and exam score/rank on the official "
    "Shikshanama website Hall of Fame. I understand that I can withdraw this consent at any time by contacting "
    "the Shikshanama front desk or messaging the official institute WhatsApp number, upon which the profile will "
    "be removed from public pages immediately."
)

CONSENT_TEXT_HI = (
    "मैं, उपरोक्त विद्यार्थी के माता-पिता / अभिभावक के रूप में, डिजिटल पर्सनल डेटा प्रोटेक्शन एक्ट 2023 (DPDP Act) के अंतर्गत "
    "शिक्षाNama (Shikshanama, वेस्ट पटेल नगर, नई दिल्ली) को अपने बच्चे का नाम, फोटो, कक्षा, स्ट्रीम, शैक्षणिक वर्ष और परीक्षा "
    "अंक/रैंक आधिकारिक वेबसाइट के 'Hall of Fame' पर प्रकाशित करने की सहमति देता/देती हूँ। मैं किसी भी समय संस्थान के व्हाट्सएप "
    "या ऑफिस में संपर्क करके यह सहमति वापस ले सकता/सकती हूँ, जिसके बाद प्रोफाइल तुरंत हटा दी जाएगी।"
)


def _pdf_escape(text: str) -> str:
    return text.replace("\\", "\\\\").replace("(", "\\(").replace(")", "\\)")


def generate_consent_pdf(result: dict[str, Any] | None = None) -> bytes:
    """Build a valid 1-page A4 PDF document with English & Hindi (UTF-8 + printable) consent text."""
    student_name = (result or {}).get("name") or "____________________________________"
    class_name = (result or {}).get("class_name") or "____________"
    stream = (result or {}).get("stream") or "____________________"
    score_text = (result or {}).get("score_text") or "________________"
    rank_text = (result or {}).get("rank_text") or "________________________"
    year = (result or {}).get("year") or "____________"

    lines = [
        ("F2", 18, 50, 790, "Shikshanama (शिक्षाNama) - Parent / Guardian Consent Form"),
        ("F1", 10, 50, 772, f"Consent Text Version: {CONSENT_TEXT_VERSION}  |  Flagship: E-42, West Patel Nagar, New Delhi - 110008"),
        ("F2", 13, 50, 742, "1. Student & Achievement Details to be Published"),
        ("F1", 11, 60, 720, f"Student Name : {student_name}"),
        ("F1", 11, 60, 702, f"Class        : {class_name}      Stream : {stream}"),
        ("F1", 11, 60, 684, f"Score / Marks: {score_text}      Rank / Distinction : {rank_text}"),
        ("F1", 11, 60, 666, f"Academic Year: {year}      Photo : 1:1 Student Portrait"),
        ("F2", 13, 50, 634, "2. Parent / Guardian Declaration (English)"),
        ("F1", 9, 50, 616, "I, as the parent/legal guardian of the student named above, hereby give my free and informed consent"),
        ("F1", 9, 50, 603, "under the Digital Personal Data Protection Act, 2023 (DPDP Act) to Shikshanama (West Patel Nagar,"),
        ("F1", 9, 50, 590, "New Delhi) to publish my ward's photograph, name, class, stream, academic year, and exam score/rank"),
        ("F1", 9, 50, 577, "on the official Shikshanama website Hall of Fame. I understand that I can withdraw this consent at"),
        ("F1", 9, 50, 564, "any time by contacting Shikshanama, upon which the result will be removed immediately."),
        ("F2", 13, 50, 532, "3. अभिभावक सहमति घोषणा (Hindi / Hinglish)"),
        ("F1", 9, 50, 514, CONSENT_TEXT_HI),
        ("F1", 9, 50, 498, "Main uparokt vidyarthi ke mata-pita/abhibhavak ke roop mein Shikshanama (शिक्षाNama) ko apne bacche"),
        ("F1", 9, 50, 485, "ka naam, photo, class, stream, aur marks/rank website ke Hall of Fame par prakashit karne ki"),
        ("F1", 9, 50, 472, "sahmati deta/deti hoon. Main kisi bhi samay Shikshanama se sampark karke sahmati wapas le sakta/sakti hoon."),
        ("F2", 13, 50, 435, "4. Parent / Guardian Signature (माता-पिता / अभिभावक के हस्ताक्षर)"),
        ("F1", 11, 50, 405, "Decision:   [  ] I Agree / मैं सहमत हूँ       [  ] I Do Not Agree / मैं सहमत नहीं हूँ"),
        ("F1", 11, 50, 372, "Parent / Guardian Full Name : ________________________________________________"),
        ("F1", 11, 50, 342, "Parent Mobile / WhatsApp No : ________________________________________________"),
        ("F1", 11, 50, 312, "Signature of Parent/Guardian: ___________________________   Date: ____/____/202_"),
        ("F2", 11, 50, 265, "For Office Use Only (Shikshanama Staff):"),
        ("F1", 10, 50, 245, "Verified By Staff Name: ___________________________   Date Received: ____/____/202_"),
    ]

    content_ops = ["BT"]
    for font_ref, size, x, y, text in lines:
        content_ops.append(f"/{font_ref} {size} Tf")
        content_ops.append(f"1 0 0 1 {x} {y} Tm")
        content_ops.append(f"({_pdf_escape(text)}) Tj")
    content_ops.append("ET")
    stream_bytes = "\n".join(content_ops).encode("utf-8")

    objects: list[bytes] = []
    objects.append(b"1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n")
    objects.append(b"2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n")
    objects.append(
        b"3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] "
        b"/Resources << /Font << /F1 4 0 R /F2 5 0 R >> >> /Contents 6 0 R >>\nendobj\n"
    )
    objects.append(b"4 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n")
    objects.append(b"5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>\nendobj\n")
    objects.append(
        f"6 0 obj\n<< /Length {len(stream_bytes)} >>\nstream\n".encode("ascii")
        + stream_bytes
        + b"\nendstream\nendobj\n"
    )

    out = bytearray(b"%PDF-1.4\n%\xe2\xe3\xcf\xd3\n")
    offsets: list[int] = [0]
    for obj in objects:
        offsets.append(len(out))
        out.extend(obj)
    xref_pos = len(out)
    out.extend(f"xref\n0 {len(offsets)}\n".encode("ascii"))
    out.extend(b"0000000000 65535 f \n")
    for off in offsets[1:]:
        out.extend(f"{off:010d} 00000 n \n".encode("ascii"))
    out.extend(
        f"trailer\n<< /Size {len(offsets)} /Root 1 0 R >>\nstartxref\n{xref_pos}\n%%EOF\n".encode("ascii")
    )
    return bytes(out)
