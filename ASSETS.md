# Mobile Asset Registry

This repository normally keeps media outside Git. The files below are the
narrow build-critical exception: Metro imports them with static `require()`
calls, so a clean checkout cannot build or reproduce the verified Simulator UI
without them.

This file is the canonical registry for the consolidated mobile worktree.

| Lane | Files | Why committed |
|---|---|---|
| R4 mobile mascot | `src/assets/mascot/r4-head.png`, `src/assets/mascot/r4-wave.png` | Required by `src/assets/mascot/index.ts` for the Home and parent-facing mascot UI. |
| Five-tab artwork | `src/assets/tab-icons/*.png` | Required by `src/navigation/SleekTabBarVisuals.tsx` for active and idle tab states. |
| Transparent greet loop | `src/assets/mascot/greet-frames/frame-*.png` (77 frames) | Build-critical Metro inputs for the main Home hero. Derived from the legacy 77-frame JPEG loop with the locked alpha-matte method; the legacy stage, border, and debug badge are not included. |

These listed PNGs are approved only as application build inputs. Source artwork,
generation outputs, and other media remain disk-only and must be registered in
the canonical TeeBot asset registry.
