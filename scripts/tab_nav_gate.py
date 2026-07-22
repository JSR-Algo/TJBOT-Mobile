"""Bottom-tab stability helpers for clean capture harness.

Supervisor note: OCR often mangles Vietnamese diacritics (H6 so, Tien de, Thiet bi).
Match on ASCII-folded labels and common OCR confusions — never require perfect diacritics.
"""
from __future__ import annotations
import re
import unicodedata
from pathlib import Path
from PIL import Image

# Five main shell tabs in order: Home, Devices, Library, Progress, Profile
TAB_GROUPS = [
    ("home", ["trang chu", "home", "trangchủ", "trangchu"]),
    ("devices", ["thiet bi", "thietbi", "device", "devices", "thiết bị"]),
    ("library", ["thu vien", "thuvien", "library", "thư viện", "thu vién", "thu vien"]),
    ("progress", ["tien do", "tiendo", "progress", "tiến độ", "tien de", "tién do", "tien dé", "tién dé"]),
    ("profile", ["ho so", "hoso", "profile", "hồ sơ", "h6 so", "hồso", "ho só", "h6só", "hồ sọ"]),
]


def fold_vi(text: str) -> str:
    """Lowercase + strip diacritics + collapse OCR noise for VI/EN tab labels."""
    if not text:
        return ""
    t = text.lower()
    # NFKD strip combining marks
    t = unicodedata.normalize("NFKD", t)
    t = "".join(ch for ch in t if not unicodedata.combining(ch))
    # common OCR confusions
    t = t.replace("đ", "d")
    t = (
        t.replace("6", "o")  # H6 so -> Ho so (OCR often uses 6 for ô)
        .replace("0", "o")
    )
    # keep letters/spaces only for matching
    t = re.sub(r"[^a-z\s]", " ", t)
    t = re.sub(r"\s+", " ", t).strip()
    return t


def five_tabs_visible(text: str) -> bool:
    """Return True when all five main-shell tab labels are present (OCR-tolerant)."""
    folded = fold_vi(text)
    # also keep raw lower for english
    raw = (text or "").lower()
    blob = folded + " " + raw
    found = 0
    for _name, variants in TAB_GROUPS:
        ok = False
        for v in variants:
            vf = fold_vi(v)
            if vf and vf in blob:
                ok = True
                break
            if v.lower() in raw:
                ok = True
                break
        if ok:
            found += 1
    return found >= 5


def tab_icon_slots_painted(path: Path) -> tuple[int, list]:
    im = Image.open(path).convert("RGB")
    w, h = im.size
    y0, y1 = h - 200, h - 40
    band = im.crop((0, y0, w, y1))
    bw, bh = band.size
    px = band.load()
    stats = []
    for s in range(5):
        x0 = int(bw * s / 5)
        x1 = int(bw * (s + 1) / 5)
        cx0 = x0 + int((x1 - x0) * 0.2)
        cx1 = x1 - int((x1 - x0) * 0.2)
        iy1 = int(bh * 0.55)
        ink = total = 0
        max_dev = 0
        for y in range(0, iy1):
            for x in range(cx0, cx1):
                r, g, b = px[x, y]
                total += 1
                dev = abs(r - 240) + abs(g - 240) + abs(b - 235)
                if dev > max_dev:
                    max_dev = dev
                if (r + g + b) / 3 < 200:
                    ink += 1
        ink_ratio = ink / total if total else 0
        painted = ink_ratio > 0.03 and max_dev > 100
        stats.append({"slot": s, "ink": round(ink_ratio, 4), "max_dev": max_dev, "painted": painted})
    return sum(1 for s in stats if s["painted"]), stats


def self_test() -> None:
    sample = "fe) | Trang chu Thiét bi Thu vién Tién do H6 so"
    assert five_tabs_visible(sample), sample
    sample2 = "Trang chủ Thiết bị Thư viện Tiến độ Hồ sơ"
    assert five_tabs_visible(sample2), sample2
    print("tab_nav_gate self_test OK")


if __name__ == "__main__":
    self_test()
