# Mobile Asset Registry

This repository normally keeps media outside Git. The files below are the
narrow build-critical exception: Metro imports them with static `require()`
calls, so a clean checkout cannot build or reproduce the verified Simulator UI
without them.

The canonical cross-project registry remains
`../TbotREAL-mobile-backend-first/ASSETS.md`.

| Lane | Files | Why committed |
|---|---|---|
| R4 mobile mascot | `src/assets/mascot/r4-head.png`, `src/assets/mascot/r4-wave.png` | Required by `src/assets/mascot/index.ts` for the Home and parent-facing mascot UI. |
| Five-tab artwork | `src/assets/tab-icons/*.png` | Required by `src/navigation/SleekTabBarVisuals.tsx` for active and idle tab states. |

These 12 PNGs are approved only as application build inputs. Source artwork,
generation outputs, and other media remain disk-only and must be registered in
the canonical TeeBot asset registry.
