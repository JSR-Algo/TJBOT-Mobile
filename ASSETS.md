# TJBOT-Mobile build-critical assets

Media is normally disk-only. The files listed here are the narrow
build-critical exception: Metro imports them with static `require()` calls, so
a clean checkout cannot build or reproduce the verified app without them.

| Lane | Files | Why committed |
|---|---|---|
| Transparent greet loop | `src/assets/mascot/greet-frames/frame-*.png` (77 frames) | Build-critical Metro inputs for the Home hero. Derived from the registered legacy 77-frame loop with its locked alpha-matte method; the legacy stage, border, and debug badge are excluded. |

These PNGs are application build inputs only. Source artwork, generation
outputs, and other media remain disk-only in the canonical TeeBot asset
registry at `../ASSETS.md`.
