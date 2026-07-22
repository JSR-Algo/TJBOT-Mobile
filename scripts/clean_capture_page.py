#!/usr/bin/env python3
"""Approved clean visual capture harness for TJBot mobile (iOS sim).

Method of record (supervisor-approved):
  1. terminate app (soft relaunch; auth retained) — wait out hot-reload Refreshing bar
  2. launch app
  3. two consecutive workspace OCR polls with no Metro / diagnostic / Refreshing overlay
  4. open deep link via `xcrun simctl openurl` (never Maestro openLink)
  5. optional conditional Open-in dismiss (short Maestro flow, not long optional tap)
  6. three consecutive settled clean OCR polls (no Metro / diagnostic / Refreshing)
  7. screenshot at initial scroll — NO swipe, NO product tap/back before shot
  8. SHA uniqueness vs home (optional), optional five-tab gate via tab_nav_gate

Negative gates (any one fails the frame): Metro banner, diagnostic dialog, and the
blue Fast Refresh "Refreshing..." bar (OCR + top-band blue pixel detect).

Probe and working-final PNGs live under the umbrella `.capture-scratch/`
(outside the Metro-watched `original-app/TJBOT-Mobile` tree). Writing probes
inside the mobile repo retriggers Fast Refresh and pins the blue Refreshing bar.
Final pack evidence is copied into `output/.../pack-clean-v3` only after the
frame is clean AND the app has been terminated. Never use /tmp for OCR probes.

Usage examples:
  python3 scripts/clean_capture_page.py \\
    --index 8 --name DeviceLostScreen \\
    --url tjbot://device/device-lost \\
    --out output/maestro/mobile-backend-first-pages/pack-clean-v3/08-DeviceLostScreen.png

  python3 scripts/clean_capture_page.py --from-manifest \\
    --only 8,12,15,16,17,19,20,21

  python3 scripts/clean_capture_page.py --from-manifest --all
"""

from __future__ import annotations

import argparse
import hashlib
import json
import re
import shutil
import subprocess
import sys
import time
from datetime import datetime, timezone
from pathlib import Path

# Nested mobile repo root (…/original-app/TJBOT-Mobile)
ROOT = Path(__file__).resolve().parents[1]
if str(ROOT / "scripts") not in sys.path:
    sys.path.insert(0, str(ROOT / "scripts"))

from tab_nav_gate import five_tabs_visible, tab_icon_slots_painted  # noqa: E402

DEFAULT_UDID = "E9E1C5A9-D77D-44B0-8F51-DBE7895C6D7A"
DEFAULT_BUNDLE = "net.jasonle.tjbot"
DEFAULT_PAGES_DIR = ROOT / "output" / "maestro" / "mobile-backend-first-pages"
# CRITICAL: probe PNGs must NOT live under the Metro-watched mobile root.
# Writing into original-app/TJBOT-Mobile retriggers Fast Refresh ("Refreshing...").
# Default scratch: umbrella worktree .capture-scratch (sibling of original-app/).
UMBRELLA_ROOT = ROOT.parents[0] if (ROOT.parents[0] / "original-app").exists() else ROOT.parent
# ROOT is .../original-app/TJBOT-Mobile → parent is original-app → parent is umbrella
UMBRELLA_ROOT = ROOT.parent.parent
DEFAULT_SCRATCH_DIR = UMBRELLA_ROOT / ".capture-scratch"
DEFAULT_PROBE_DIR = DEFAULT_SCRATCH_DIR / "probes"
DEFAULT_WORK_DIR = DEFAULT_SCRATCH_DIR / "work-finals"
DEFAULT_PACK_DIR = DEFAULT_PAGES_DIR / "pack-clean-v3"
DEFAULT_PREVIEW_DIR = DEFAULT_SCRATCH_DIR / "previews"  # also outside Metro root
DEFAULT_MANIFEST = DEFAULT_PAGES_DIR / "coverage-manifest.json"
DEFAULT_DISMISS_FLOW = ROOT / ".maestro" / "mobile-backend-first-pages" / "dismiss-open.yaml"

# Overlay / contamination markers (OCR-tolerant)
METRO_MARKERS = (
    "loading from metro",
    "loading from met",
    "metro bundl",
    "fetching js",
)
# Fast Refresh / HMR status bar — supervisor FAIL even when settle_ok was true before.
REFRESH_MARKERS = (
    "refreshing",
    "refreshing…",
    "refreshing...",
    "fast refresh",
)
# Keep diag detection tight: "dismiss" alone is too noisy. Prefer multi-token.
DIAG_STRONG = (
    "something went wrong",
    "diagnostic_report",
    "diag:api",
    "open debugger to view warnings",
)


def sh(cmd: list[str], timeout: float = 60, check: bool = False) -> subprocess.CompletedProcess:
    return subprocess.run(
        cmd,
        capture_output=True,
        text=True,
        timeout=timeout,
        check=check,
    )


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def sha256_file(path: Path) -> str:
    h = hashlib.sha256()
    with path.open("rb") as f:
        for chunk in iter(lambda: f.read(1024 * 1024), b""):
            h.update(chunk)
    return h.hexdigest()


def ensure_dismiss_flow(path: Path) -> Path:
    """Workspace-owned Open-in dismiss flow (conditional, short)."""
    path.parent.mkdir(parents=True, exist_ok=True)
    if not path.exists():
        path.write_text(
            """appId: net.jasonle.tjbot
---
- runFlow:
    when:
      visible: "Open"
    commands:
      - tapOn: "Open"
""",
            encoding="utf-8",
        )
    return path


def terminate_and_launch(udid: str, bundle: str) -> None:
    """Hard-clear in-memory Fast Refresh chrome, then cold-launch.

    After a source hot reload the blue "Refreshing..." bar can pin across the
    status/header region for several seconds. A bare terminate is not enough if
    we screenshot too early — caller must still poll until Refreshing is gone.
    """
    sh(["xcrun", "simctl", "terminate", udid, bundle], timeout=30)
    # Let RN/Metro drop the HMR overlay session before relaunch.
    time.sleep(2.0)
    sh(["xcrun", "simctl", "launch", udid, bundle], timeout=30)
    # Give first paint time; cleanliness still enforced by poll_clean.
    time.sleep(2.0)


def open_url(udid: str, url: str) -> None:
    sh(["xcrun", "simctl", "openurl", udid, url], timeout=30)


def screenshot(udid: str, dest: Path) -> None:
    dest.parent.mkdir(parents=True, exist_ok=True)
    # write atomically via temp sibling
    tmp = dest.with_suffix(dest.suffix + ".partial")
    if tmp.exists():
        tmp.unlink()
    r = sh(["xcrun", "simctl", "io", udid, "screenshot", str(tmp)], timeout=45)
    if r.returncode != 0 or not tmp.exists():
        raise RuntimeError(f"screenshot failed: {r.stderr or r.stdout}")
    tmp.replace(dest)


def ocr_text(png: Path) -> str:
    """OCR a workspace PNG. Prefer eng; diacritics may mangle VI — tab gate folds them."""
    r = sh(
        ["tesseract", str(png.resolve()), "stdout", "-l", "eng", "--psm", "6"],
        timeout=60,
    )
    return r.stdout or ""


def has_metro(text: str) -> bool:
    low = (text or "").lower()
    return any(m in low for m in METRO_MARKERS)


def has_refreshing(text: str) -> bool:
    """OCR gate for Fast Refresh status. Treat like Metro — hard blocker."""
    low = (text or "").lower()
    # compact form without punctuation: "refreshing..."
    compact = re.sub(r"[^a-z]", "", low)
    if "refreshing" in compact:
        return True
    return any(m in low for m in REFRESH_MARKERS)


def has_blue_refresh_bar(png: Path) -> bool:
    """Pixel backup when OCR misses the blue Refreshing strip across the top.

    RN Fast Refresh paints a saturated blue/cyan bar near the status region.
    We sample the top ~7% of the frame for a wide horizontal band of blue-ish
    pixels that are not the normal app chrome.
    """
    try:
        from PIL import Image
    except ImportError:
        return False
    try:
        im = Image.open(png).convert("RGB")
    except OSError:
        return False
    w, h = im.size
    y0 = int(h * 0.02)
    y1 = max(y0 + 1, int(h * 0.09))
    band = im.crop((0, y0, w, y1))
    px = band.load()
    bw, bh = band.size
    blueish = total = 0
    # sample every 2nd pixel for speed
    for y in range(0, bh, 2):
        for x in range(0, bw, 2):
            r, g, b = px[x, y]
            total += 1
            # saturated blue/cyan: B dominant, not near white/gray
            if b > 140 and b > r + 30 and b > g + 10 and (b - min(r, g)) > 40:
                blueish += 1
    if total == 0:
        return False
    ratio = blueish / total
    # A full-width refresh strip lights a large fraction of the top band.
    return ratio >= 0.12




def has_diag(text: str) -> bool:
    low = (text or "").lower()
    return any(m in low for m in DIAG_STRONG)


def is_clean(text: str, png: Path | None = None) -> bool:
    if has_metro(text) or has_diag(text) or has_refreshing(text):
        return False
    if png is not None and has_blue_refresh_bar(png):
        return False
    return True


def write_preview(src: Path, dest: Path, max_w: int = 480) -> None:
    try:
        from PIL import Image
    except ImportError:
        return
    dest.parent.mkdir(parents=True, exist_ok=True)
    im = Image.open(src)
    w, h = im.size
    if w > max_w:
        nh = int(h * (max_w / w))
        im = im.resize((max_w, nh))
    im.save(dest)


def poll_clean(
    udid: str,
    probe_dir: Path,
    tag: str,
    need_consecutive: int,
    timeout_s: float,
    interval_s: float = 0.9,
    require_tabs: bool = False,
) -> dict:
    """Poll workspace screenshots until need_consecutive consecutive clean frames."""
    probe_dir.mkdir(parents=True, exist_ok=True)
    consecutive = 0
    attempts = 0
    last = {
        "text": "",
        "metro": True,
        "diag": True,
        "refreshing": True,
        "blue_bar": True,
        "tabs": False,
        "path": None,
    }
    deadline = time.time() + timeout_s
    while time.time() < deadline:
        attempts += 1
        path = probe_dir / f"{tag}-poll-{attempts:03d}.png"
        screenshot(udid, path)
        text = ocr_text(path)
        metro = has_metro(text)
        diag = has_diag(text)
        refreshing = has_refreshing(text)
        blue_bar = has_blue_refresh_bar(path)
        tabs = five_tabs_visible(text) if require_tabs else None
        clean = is_clean(text, path) and (tabs is not False)
        last = {
            "text": text,
            "metro": metro,
            "diag": diag,
            "refreshing": refreshing,
            "blue_bar": blue_bar,
            "tabs": tabs,
            "path": str(path),
            "clean": clean,
            "ocr_head": [ln for ln in text.splitlines() if ln.strip()][:12],
        }
        if clean:
            consecutive += 1
            if consecutive >= need_consecutive:
                return {
                    "ok": True,
                    "attempts": attempts,
                    "consecutive": consecutive,
                    "last": last,
                }
        else:
            consecutive = 0
        time.sleep(interval_s)
    return {
        "ok": False,
        "attempts": attempts,
        "consecutive": consecutive,
        "last": last,
    }


def dismiss_open_if_present(dismiss_flow: Path) -> dict:
    if not dismiss_flow.exists():
        return {"ran": False, "reason": "no_flow"}
    r = sh(
        ["maestro", "test", str(dismiss_flow)],
        timeout=45,
    )
    # Conditional flow: non-zero is OK if Open not visible
    return {
        "ran": True,
        "exit": r.returncode,
        "stdout_tail": (r.stdout or "")[-400:],
        "stderr_tail": (r.stderr or "")[-400:],
    }


def capture_one(
    *,
    udid: str,
    bundle: str,
    index: int,
    name: str,
    url: str,
    out_path: Path,
    probe_dir: Path,
    preview_dir: Path | None,
    dismiss_flow: Path,
    home_sha: str | None,
    require_tabs: bool,
    launch_clean_n: int = 2,
    settled_clean_n: int = 3,
    launch_timeout: float = 70,
    settled_timeout: float = 80,
) -> dict:
    tag = f"{index:02d}-{name}"
    result: dict = {
        "index": index,
        "name": name,
        "url": url,
        "out": str(out_path),
        "started_at": now_iso(),
        "method": (
            "terminate/relaunch + 2 launch clean polls + openurl + optional Open dismiss "
            "+ 3 settled clean polls + screenshot; no swipe; workspace OCR only"
        ),
    }

    terminate_and_launch(udid, bundle)
    launch = poll_clean(
        udid,
        probe_dir,
        f"{tag}-launch",
        need_consecutive=launch_clean_n,
        timeout_s=launch_timeout,
        require_tabs=False,
    )
    result["launch_poll"] = {
        "ok": launch["ok"],
        "attempts": launch["attempts"],
        "consecutive": launch["consecutive"],
        "metro": launch["last"].get("metro"),
        "diag": launch["last"].get("diag"),
        "refreshing": launch["last"].get("refreshing"),
        "blue_bar": launch["last"].get("blue_bar"),
        "ocr_head": launch["last"].get("ocr_head"),
    }
    if not launch["ok"]:
        result["status"] = "FAIL_LAUNCH_SETTLE"
        result["settle_ok"] = False
        result["final_metro"] = launch["last"].get("metro")
        result["final_diag"] = launch["last"].get("diag")
        return result

    open_url(udid, url)
    # Allow navigation transition + status-bar chrome to settle before polls.
    time.sleep(1.8)
    result["dismiss_open"] = dismiss_open_if_present(dismiss_flow)

    settled = poll_clean(
        udid,
        probe_dir,
        f"{tag}-settled",
        need_consecutive=settled_clean_n,
        timeout_s=settled_timeout,
        require_tabs=require_tabs,
    )
    result["settled_poll"] = {
        "ok": settled["ok"],
        "attempts": settled["attempts"],
        "consecutive": settled["consecutive"],
        "metro": settled["last"].get("metro"),
        "diag": settled["last"].get("diag"),
        "refreshing": settled["last"].get("refreshing"),
        "blue_bar": settled["last"].get("blue_bar"),
        "tabs": settled["last"].get("tabs"),
        "ocr_head": settled["last"].get("ocr_head"),
    }
    if not settled["ok"]:
        result["status"] = "FAIL_SETTLE"
        result["settle_ok"] = False
        result["final_metro"] = settled["last"].get("metro")
        result["final_diag"] = settled["last"].get("diag")
        # still take a diagnostic shot for supervisor
        try:
            work_dir = Path(probe_dir).resolve().parent / "work-finals"
            work_dir.mkdir(parents=True, exist_ok=True)
            work_path = work_dir / f"{index:02d}-{name}-fail.png"
            screenshot(udid, work_path)
            result["work_path"] = str(work_path)
            result["sha256"] = sha256_file(work_path)
            result["size"] = work_path.stat().st_size
            # do NOT promote fail frames into pack while debugging overlays
            sh(["xcrun", "simctl", "terminate", udid, bundle], timeout=30)
        except Exception as exc:  # noqa: BLE001
            result["screenshot_error"] = str(exc)
        return result

        # Final clean shot into EXTERNAL scratch only (still no pack write while app live).
    work_dir = Path(probe_dir).resolve().parent / "work-finals"
    work_dir.mkdir(parents=True, exist_ok=True)
    work_path = work_dir / f"{index:02d}-{name}.png"
    screenshot(udid, work_path)
    digest = sha256_file(work_path)
    size = work_path.stat().st_size
    final_text = ocr_text(work_path)
    final_metro = has_metro(final_text)
    final_diag = has_diag(final_text)
    final_refreshing = has_refreshing(final_text)
    final_blue_bar = has_blue_refresh_bar(work_path)
    tabs = five_tabs_visible(final_text)
    painted_slots, slot_stats = tab_icon_slots_painted(work_path)

    # Only after the accepted frame is fully evaluated: terminate app, THEN promote
    # into the Metro-watched pack directory. Never write pack PNGs while app is live.
    sh(["xcrun", "simctl", "terminate", udid, bundle], timeout=30)
    time.sleep(0.4)
    promoted = False
    clean_enough = (
        not final_metro
        and not final_diag
        and not final_refreshing
        and not final_blue_bar
    )
    if clean_enough:
        out_path.parent.mkdir(parents=True, exist_ok=True)
        # copy bytes (not move) so scratch retains evidence
        out_path.write_bytes(work_path.read_bytes())
        promoted = True
        if preview_dir is not None:
            write_preview(work_path, preview_dir / f"{index:02d}-{name}.png")
    result["work_path"] = str(work_path)
    result["promoted_to_pack"] = promoted

    unique = True
    if home_sha:
        unique = digest != home_sha

    clean_final = (
        not final_metro
        and not final_diag
        and not final_refreshing
        and not final_blue_bar
        and unique
    )
    result.update(
        {
            "status": "CAPTURED" if clean_final else "CAPTURED_CONTAMINATED",
            "settle_ok": True,
            "sha256": digest,
            "size": size,
            "unique_vs_home": unique,
            "final_metro": final_metro,
            "final_diag": final_diag,
            "final_refreshing": final_refreshing,
            "final_blue_bar": final_blue_bar,
            "tabs_ocr": tabs,
            "painted_slots": painted_slots,
            "slot_stats": slot_stats,
            "ocr_head": [ln for ln in final_text.splitlines() if ln.strip()][:12],
            "ux_status": "NEEDS_SUPERVISOR",
            "finished_at": now_iso(),
        }
    )
    if final_metro or final_diag or final_refreshing or final_blue_bar:
        result["status"] = "FAIL_FINAL_OVERLAY"
        if final_refreshing or final_blue_bar:
            result["status"] = "FAIL_REFRESHING_OVERLAY"
    if home_sha and not unique:
        result["status"] = "FAIL_HOME_BOUNCE"
    return result


def load_manifest_pages(manifest: Path) -> list[dict]:
    data = json.loads(manifest.read_text(encoding="utf-8"))
    return list(data.get("pages") or [])


def parse_only(spec: str | None) -> set[int] | None:
    if not spec:
        return None
    out: set[int] = set()
    for part in re.split(r"[,\s]+", spec.strip()):
        if not part:
            continue
        out.add(int(part))
    return out


def main(argv: list[str] | None = None) -> int:
    ap = argparse.ArgumentParser(description="Approved clean capture harness for TJBot iOS sim")
    ap.add_argument("--udid", default=DEFAULT_UDID)
    ap.add_argument("--bundle", default=DEFAULT_BUNDLE)
    ap.add_argument("--index", type=int)
    ap.add_argument("--name")
    ap.add_argument("--url")
    ap.add_argument("--out", type=Path)
    ap.add_argument("--from-manifest", action="store_true")
    ap.add_argument("--manifest", type=Path, default=DEFAULT_MANIFEST)
    ap.add_argument("--only", help="Comma-separated page indexes when using --from-manifest")
    ap.add_argument("--all", action="store_true", help="Capture all pages from manifest")
    ap.add_argument("--pack-dir", type=Path, default=DEFAULT_PACK_DIR)
    ap.add_argument("--probe-dir", type=Path, default=DEFAULT_PROBE_DIR)
    ap.add_argument("--preview-dir", type=Path, default=DEFAULT_PREVIEW_DIR)
    ap.add_argument("--dismiss-flow", type=Path, default=DEFAULT_DISMISS_FLOW)
    ap.add_argument("--home-sha")
    ap.add_argument("--require-tabs", action="store_true", help="Require five-tab OCR during settle")
    ap.add_argument("--log", type=Path, help="Write JSON log of this run")
    ap.add_argument("--update-manifest", action="store_true", help="Patch coverage-manifest clean shot fields")
    args = ap.parse_args(argv)

    ensure_dismiss_flow(args.dismiss_flow)
    args.pack_dir.mkdir(parents=True, exist_ok=True)
    args.probe_dir.mkdir(parents=True, exist_ok=True)
    args.preview_dir.mkdir(parents=True, exist_ok=True)

    home_sha = args.home_sha
    if not home_sha:
        home_shot = args.pack_dir / "01-HomeHubScreen.png"
        if home_shot.exists():
            home_sha = sha256_file(home_shot)

    jobs: list[dict] = []
    if args.from_manifest or args.all or args.only:
        pages = load_manifest_pages(args.manifest)
        only = parse_only(args.only)
        if args.all:
            only = None
        for p in pages:
            idx = int(p["index"])
            if only is not None and idx not in only:
                continue
            name = p["name"]
            url = p["url"]
            out = args.pack_dir / f"{idx:02d}-{name}.png"
            jobs.append({"index": idx, "name": name, "url": url, "out": out, "require_tabs": args.require_tabs})
    else:
        if not (args.index and args.name and args.url and args.out):
            ap.error("Provide --index --name --url --out, or --from-manifest/--only/--all")
        jobs.append(
            {
                "index": args.index,
                "name": args.name,
                "url": args.url,
                "out": Path(args.out),
                "require_tabs": args.require_tabs,
            }
        )

    run_log: dict = {
        "generated_at": now_iso(),
        "method": "scripts/clean_capture_page.py approved harness",
        "device": args.udid,
        "bundle": args.bundle,
        "home_sha": home_sha,
        "pages": [],
    }

    for job in jobs:
        print(f"[capture] {job['index']:02d} {job['name']} {job['url']}", flush=True)
        # Never overwrite a supervisor-preserved PASS shot for page 03 unless forced
        if job["index"] == 3 and job["out"].exists():
            # Check manifest preserve flag
            try:
                pages = load_manifest_pages(args.manifest)
                row = next((x for x in pages if int(x["index"]) == 3), None)
                if row and row.get("clean_shot_status") == "SUPERVISOR_PASS_PRESERVE":
                    print("[capture] skip 03 — SUPERVISOR_PASS_PRESERVE", flush=True)
                    run_log["pages"].append(
                        {
                            "index": 3,
                            "name": job["name"],
                            "status": "SKIP_PRESERVE",
                            "sha256": sha256_file(job["out"]),
                            "ux_status": row.get("ux_status", "PASS"),
                        }
                    )
                    continue
            except Exception:  # noqa: BLE001
                pass

        res = capture_one(
            udid=args.udid,
            bundle=args.bundle,
            index=job["index"],
            name=job["name"],
            url=job["url"],
            out_path=job["out"],
            probe_dir=args.probe_dir,
            preview_dir=args.preview_dir,
            dismiss_flow=args.dismiss_flow,
            home_sha=home_sha,
            require_tabs=bool(job.get("require_tabs")),
        )
        run_log["pages"].append(res)
        print(
            f"  -> {res.get('status')} settle={res.get('settle_ok')} metro={res.get('final_metro')} "
            f"diag={res.get('final_diag')} refresh={res.get('final_refreshing')} "
            f"blue={res.get('final_blue_bar')} unique={res.get('unique_vs_home')} "
            f"sha={(res.get('sha256') or '')[:12]}",
            flush=True,
        )

    if args.update_manifest and args.manifest.exists():
        data = json.loads(args.manifest.read_text(encoding="utf-8"))
        by_idx = {int(p["index"]): p for p in data.get("pages") or []}
        for res in run_log["pages"]:
            if res.get("status") == "SKIP_PRESERVE":
                continue
            row = by_idx.get(int(res["index"]))
            if not row:
                continue
            if res.get("sha256"):
                row["sha256"] = res["sha256"]
            if res.get("out"):
                row["screenshot"] = res["out"]
                row["clean_screenshot"] = res["out"]
            row["clean_shot_status"] = res.get("status", "CAPTURED")
            # Never auto UX PASS
            if row.get("ux_status") != "PASS" or int(res["index"]) != 3:
                if res.get("status", "").startswith("FAIL"):
                    row["ux_status"] = "FAIL_CAPTURE"
                else:
                    row["ux_status"] = "NEEDS_SUPERVISOR"
            notes = list(row.get("ux_notes") or [])
            notes.append(f"clean_capture_page.py {res.get('status')} @ {res.get('finished_at') or now_iso()}")
            row["ux_notes"] = notes[-8:]
            row["final_metro"] = res.get("final_metro")
            row["settle_ok"] = res.get("settle_ok")
        data["updated_at"] = now_iso()
        data["last_clean_capture"] = {
            "script": "scripts/clean_capture_page.py",
            "generated_at": run_log["generated_at"],
            "page_count": len(run_log["pages"]),
        }
        tmp = args.manifest.with_suffix(".json.tmp")
        tmp.write_text(json.dumps(data, indent=2) + "\n", encoding="utf-8")
        tmp.replace(args.manifest)

    if args.log:
        args.log.parent.mkdir(parents=True, exist_ok=True)
        args.log.write_text(json.dumps(run_log, indent=2) + "\n", encoding="utf-8")
    else:
        # default log next to pack
        log_path = args.pack_dir.parent / f"clean-capture-run-{int(time.time())}.json"
        log_path.write_text(json.dumps(run_log, indent=2) + "\n", encoding="utf-8")
        print(f"[log] {log_path}")

    fails = [p for p in run_log["pages"] if str(p.get("status", "")).startswith("FAIL")]
    return 1 if fails else 0


if __name__ == "__main__":
    raise SystemExit(main())
