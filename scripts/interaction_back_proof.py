#!/usr/bin/env python3
"""True in-app interaction/back proof (sole simulator actor).

Method of record:
  - Seed with `xcrun simctl openurl` when needed (never Maestro openLink)
  - Drive product taps via Maestro assert+tap YAML (no bare `back` endings)
  - Postcondition screenshots via `xcrun simctl io … screenshot`
  - Artifacts live outside Metro watch root under umbrella `.capture-scratch/`

Usage:
  python3 scripts/interaction_back_proof.py --all
  python3 scripts/interaction_back_proof.py --cluster parent
"""
from __future__ import annotations

import argparse
import json
import shutil
import subprocess
import time
from dataclasses import asdict, dataclass, field
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parents[1]
UMBRELLA = ROOT.parents[1]  # TbotREAL-mobile-backend-first
DEFAULT_UDID = "E9E1C5A9-D77D-44B0-8F51-DBE7895C6D7A"
ARTIFACT = UMBRELLA / ".capture-scratch" / "interaction-v1"
FLOW_DIR = ROOT / ".maestro" / "mobile-backend-first-pages" / "interaction"
DISMISS_OPEN = ROOT / ".maestro" / "mobile-backend-first-pages" / "dismiss-open.yaml"


@dataclass
class StepResult:
    step_id: str
    action: str
    ok: bool
    detail: str = ""
    screenshot: str | None = None
    log: str | None = None


@dataclass
class ClusterResult:
    cluster: str
    ok: bool
    steps: list[StepResult] = field(default_factory=list)
    error: str | None = None


def sh(cmd: list[str], timeout: int = 120) -> subprocess.CompletedProcess[str]:
    return subprocess.run(cmd, cwd=str(ROOT), text=True, capture_output=True, timeout=timeout)


def openurl(udid: str, url: str) -> None:
    r = sh(["xcrun", "simctl", "openurl", udid, url], timeout=30)
    if r.returncode != 0:
        raise RuntimeError(f"openurl failed: {url}\n{r.stderr}")


def dismiss_open(udid: str) -> None:
    if not DISMISS_OPEN.exists():
        return
    sh(["maestro", "--device", udid, "test", str(DISMISS_OPEN)], timeout=60)


def screenshot(udid: str, path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    r = sh(["xcrun", "simctl", "io", udid, "screenshot", str(path)], timeout=30)
    if r.returncode != 0 or not path.exists() or path.stat().st_size < 1000:
        raise RuntimeError(f"screenshot failed: {path}\n{r.stderr}")


def maestro_flow(udid: str, flow_path: Path, log_path: Path) -> None:
    log_path.parent.mkdir(parents=True, exist_ok=True)
    r = sh(["maestro", "--device", udid, "test", str(flow_path)], timeout=180)
    log_path.write_text(
        f"cmd: maestro --device {udid} test {flow_path}\n"
        f"rc={r.returncode}\n--- stdout ---\n{r.stdout}\n--- stderr ---\n{r.stderr}\n"
    )
    if r.returncode != 0:
        raise RuntimeError(
            f"maestro failed: {flow_path.name} rc={r.returncode}\n{r.stderr or r.stdout}"
        )


def run_step(
    udid: str,
    out_dir: Path,
    step_id: str,
    action: str,
    *,
    url: str | None = None,
    flow: str | None = None,
    shot: str | None = None,
    settle: float = 1.2,
) -> StepResult:
    shot_path = out_dir / "shots" / f"{shot}.png" if shot else None
    log_path = out_dir / "logs" / f"{step_id}.log"
    try:
        if action == "openurl":
            assert url
            openurl(udid, url)
            time.sleep(1.0)
            dismiss_open(udid)
            time.sleep(settle)
            detail = url
        elif action == "maestro":
            assert flow
            flow_path = FLOW_DIR / flow
            if not flow_path.exists():
                raise FileNotFoundError(flow_path)
            maestro_flow(udid, flow_path, log_path)
            time.sleep(settle)
            detail = flow
        elif action == "sleep":
            time.sleep(settle)
            detail = f"sleep {settle}s"
        else:
            raise ValueError(f"unknown action {action}")

        if shot_path is not None:
            screenshot(udid, shot_path)
        return StepResult(
            step_id=step_id,
            action=action,
            ok=True,
            detail=detail,
            screenshot=str(shot_path) if shot_path else None,
            log=str(log_path) if log_path.exists() else None,
        )
    except Exception as exc:  # noqa: BLE001 — ledger must record failures
        return StepResult(
            step_id=step_id,
            action=action,
            ok=False,
            detail=str(exc),
            screenshot=str(shot_path) if shot_path and shot_path.exists() else None,
            log=str(log_path) if log_path.exists() else None,
        )


CLUSTERS: dict[str, list[dict[str, Any]]] = {
    "parent": [
        {"id": "A00_home", "action": "openurl", "url": "tjbot://home/home-hub", "shot": "A00-home-hub"},
        {
            "id": "A01_to_summary",
            "action": "maestro",
            "flow": "A-parent-home-to-summary.yaml",
            "shot": "A01-parent-summary",
        },
        {
            "id": "A02_to_settings",
            "action": "maestro",
            "flow": "A-parent-summary-to-settings.yaml",
            "shot": "A02-parent-settings",
        },
        {
            "id": "A03_back_summary",
            "action": "maestro",
            "flow": "A-parent-settings-back-summary.yaml",
            "shot": "A03-parent-summary-return",
        },
        {
            "id": "A04_back_home",
            "action": "maestro",
            "flow": "A-parent-summary-to-home.yaml",
            "shot": "A04-home-return",
        },
    ],
    "device": [
        {
            "id": "B00_device_home",
            "action": "openurl",
            "url": "tjbot://device/device-home",
            "shot": "B00-device-home",
        },
        {
            "id": "B10_session_seed",
            "action": "openurl",
            "url": "tjbot://device/device-session",
            "shot": "B10-device-session",
        },
        {
            "id": "B11_browse_courses",
            "action": "maestro",
            "flow": "B-session-browse-courses.yaml",
            "shot": "B11-course-library",
        },
        {
            "id": "B12_reseed_session",
            "action": "openurl",
            "url": "tjbot://device/device-session",
            "shot": "B12-session-reseed",
        },
        {
            "id": "B13_back_device_home",
            "action": "maestro",
            "flow": "B-session-back-device-home.yaml",
            "shot": "B13-device-home-return",
        },
    ],
    "support": [
        {
            "id": "C00_my_robot",
            "action": "openurl",
            "url": "tjbot://robot-mgmt/my-robot",
            "shot": "C00-my-robot",
        },
        {
            "id": "C01_support",
            "action": "maestro",
            "flow": "C-myrobot-to-support.yaml",
            "shot": "C01-support",
        },
        {
            "id": "C02_help_faq",
            "action": "maestro",
            "flow": "C-support-to-help-faq.yaml",
            "shot": "C02-help-faq",
        },
        {
            "id": "C03_back_support",
            "action": "maestro",
            "flow": "C-help-faq-back-support.yaml",
            "shot": "C03-support-return",
        },
        {
            "id": "C04_back_my_robot",
            "action": "maestro",
            "flow": "C-support-back-my-robot.yaml",
            "shot": "C04-my-robot-return",
        },
    ],
    "course": [
        {
            "id": "D00_home_seed",
            "action": "openurl",
            "url": "tjbot://home/home-hub",
            "shot": "D00-home-seed",
        },
        {
            "id": "D00b_library_tab",
            "action": "maestro",
            "flow": "D-open-library-via-tab.yaml",
            "shot": "D00-course-library",
        },
        {
            "id": "D01_detail",
            "action": "maestro",
            "flow": "D-library-to-detail.yaml",
            "shot": "D01-course-detail",
        },
        {
            "id": "D02_detail_back",
            "action": "maestro",
            "flow": "D-detail-back-library.yaml",
            "shot": "D02-library-return",
        },
        {
            "id": "D10_needs_sync",
            "action": "openurl",
            "url": "tjbot://course-library/needs-sync",
            "shot": "D10-needs-sync",
        },
        {
            "id": "D11_later",
            "action": "maestro",
            "flow": "D-needs-sync-later.yaml",
            "shot": "D11-library-after-later",
        },
        {
            "id": "D20_locked",
            "action": "openurl",
            "url": "tjbot://course-library/course-locked",
            "shot": "D20-course-locked",
        },
        {
            "id": "D21_back_library",
            "action": "maestro",
            "flow": "D-locked-back-library.yaml",
            "shot": "D21-library-after-locked",
        },
        {
            "id": "D30_complete",
            "action": "openurl",
            "url": "tjbot://course-library/course-complete",
            "shot": "D30-course-complete",
        },
        {
            "id": "D31_done",
            "action": "maestro",
            "flow": "D-complete-done-device-home.yaml",
            "shot": "D31-device-home-after-done",
        },
    ],
    "tabs": [
        {"id": "E00_home", "action": "openurl", "url": "tjbot://home/home-hub", "shot": "E00-home-tabs"},
        {
            "id": "E01_tab_cycle",
            "action": "maestro",
            "flow": "E-five-tab-cycle.yaml",
            "shot": "E01-after-tab-cycle",
        },
    ],
}


def inventory_flows() -> dict[str, Any]:
    """Read-only self-check: every maestro flow file exists; no orphans required."""
    required: list[str] = []
    for steps in CLUSTERS.values():
        for step in steps:
            if step.get("action") == "maestro" and step.get("flow"):
                required.append(str(step["flow"]))
    missing = [f for f in required if not (FLOW_DIR / f).exists()]
    present = sorted({f for f in required if (FLOW_DIR / f).exists()})
    on_disk = sorted(p.name for p in FLOW_DIR.glob("*.yaml")) if FLOW_DIR.exists() else []
    unused = sorted(set(on_disk) - set(required))
    return {
        "flow_dir": str(FLOW_DIR),
        "artifact_dir": str(ARTIFACT),
        "artifact_outside_metro": str(ARTIFACT).startswith(str(UMBRELLA / ".capture-scratch")),
        "required_flows": sorted(set(required)),
        "present": present,
        "missing": missing,
        "on_disk_unused": unused,
        "ok": len(missing) == 0 and ARTIFACT.as_posix().find("/.capture-scratch/") >= 0,
    }



def run_cluster(name: str, udid: str, out_dir: Path) -> ClusterResult:
    result = ClusterResult(cluster=name, ok=True)
    for spec in CLUSTERS[name]:
        step = run_step(
            udid,
            out_dir / name,
            step_id=spec["id"],
            action=spec["action"],
            url=spec.get("url"),
            flow=spec.get("flow"),
            shot=spec.get("shot"),
            settle=float(spec.get("settle", 1.2)),
        )
        result.steps.append(step)
        if not step.ok:
            result.ok = False
            result.error = f"{step.step_id}: {step.detail}"
            break
    return result


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--udid", default=DEFAULT_UDID)
    ap.add_argument("--cluster", choices=sorted(CLUSTERS.keys()) + ["all"], default="all")
    ap.add_argument("--artifact-dir", type=Path, default=ARTIFACT)
    ap.add_argument(
        "--inventory",
        action="store_true",
        help="Read-only flow inventory + artifact path check; do not drive simulator",
    )
    args = ap.parse_args()

    if args.inventory:
        report = inventory_flows()
        print(json.dumps(report, indent=2))
        return 0 if report["ok"] else 2
    out_dir: Path = args.artifact_dir
    out_dir.mkdir(parents=True, exist_ok=True)

    names = list(CLUSTERS.keys()) if args.cluster == "all" else [args.cluster]
    results: list[ClusterResult] = []
    for name in names:
        print(f"[interaction] cluster={name}")
        res = run_cluster(name, args.udid, out_dir)
        results.append(res)
        status = "PASS" if res.ok else "FAIL"
        print(f"  -> {status}" + (f" ({res.error})" if res.error else ""))
        for s in res.steps:
            mark = "ok" if s.ok else "FAIL"
            print(f"     [{mark}] {s.step_id} {s.action} {s.detail[:120]}")

    ledger = {
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "udid": args.udid,
        "method": "openurl seed + Maestro product taps + simctl screenshots; no bare back endings",
        "artifact_dir": str(out_dir),
        "clusters": [
            {
                "cluster": r.cluster,
                "ok": r.ok,
                "error": r.error,
                "steps": [asdict(s) for s in r.steps],
            }
            for r in results
        ],
        "all_ok": all(r.ok for r in results),
    }
    ledger_path = out_dir / "interaction-ledger.json"
    ledger_path.write_text(json.dumps(ledger, indent=2) + "\n")
    pack_copy = (
        ROOT
        / "output"
        / "maestro"
        / "mobile-backend-first-pages"
        / "interaction-artifacts"
        / "interaction-ledger-v1.json"
    )
    pack_copy.parent.mkdir(parents=True, exist_ok=True)
    shutil.copyfile(ledger_path, pack_copy)
    print(f"[interaction] ledger={ledger_path} all_ok={ledger['all_ok']}")
    if not ledger["all_ok"]:
        # Explicit nonzero exit for shells that ignore intermediate status.
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
