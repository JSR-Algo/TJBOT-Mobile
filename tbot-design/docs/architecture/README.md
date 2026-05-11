# Architecture

High-level entry-point for `tbot-design`. Authoritative source is the code under `src/`; this doc maps it.

## Overview

3-view shell prototype: **All Frames** (canvas), **Interactive** (jump-to prototype), **Nav Map** (graph). No backend wired. Stack: Vite + React 18 + ES modules. View toggle lives in `src/App.jsx`.

## Top-level layout

| Path | Role |
|---|---|
| `src/features/` | One folder per business domain. Pages, `states.js`, `index.js` barrel exporting `{ STATES, SCREEN_MAP }`. |
| `src/shared/` | Cross-domain primitives: `ui/`, `hooks/`, `utils/`. |
| `src/services/` | I/O surface: `api/<domain>.api.js` placeholders, `http/` (empty), `websocket/realtime.js` placeholder. |
| `src/store/` | Per-domain state placeholders (Zustand wiring TBD). |
| `src/lib/` | Cross-cutting libs. Currently `i18n/i18n.js` (DOM walker). |
| `src/devtools/` | NOT product surface. Currently empty — devtool migration pending; root `design-canvas.jsx` / `tweaks-panel.jsx` / `nav-map.jsx` / `ios-frame.jsx` still primary. |
| `src/config/` | Env + constants placeholder (empty). |

Root-level files preserved during refactor: `index.html`, `vite.config.js`, `tokens.css`, `nav-graph-data.json`, `locales/`, `scripts/i18n/`. Old `*.jsx` source files at root remain until Track 11 integration completes.

## Domain map

12 domains. Source-of-truth for each domain's screen set is `src/features/<domain>/states.js`; route composition is `src/features/<domain>/index.js`.

| Domain | Role | States file | Key user actions |
|---|---|---|---|
| `auth` | Sign-in + child profile | `src/features/auth/states.js` | login, login error, child profile |
| `onboarding` | First-run intro flow | `src/features/onboarding/states.js` | splash, welcome, intro listen/speak/retry/celebrate, trust, mic ask, first lesson entry |
| `home` | Home hub | `src/features/home/states.js` | hub idle/greet/daily/done/mic/offline |
| `course` | Course / level / unit / lesson catalog | `src/features/course/states.js` | browse course, level, unit, lesson detail, lesson list, review entry, daily mission |
| `course-library` | External course library | `src/features/course-library/states.js` | library, detail, buy, unlock confirm, added, send to robot, robot ready, running, companion, complete, needs sync, locked |
| `purchase` | Robot purchase + activation | `src/features/purchase/states.js` | intro, how, included, bundle, subs, privacy, checkout, confirm, shipping, arrived, activate, first course |
| `parent` | Parent area | `src/features/parent/states.js` | gate, summary, today, history, safety, settings |
| `progress` | Child progress views | `src/features/progress/states.js` | today, words practiced, lesson summary, review needed, celebration |
| `device` | Pairing + LCD + device runtime | `src/features/device/states.js` + `pairing/` | pair flow, device overview/home/session/lost/firmware, LCD library/lesson turn |
| `robot-mgmt` | Robot self-care | `src/features/robot-mgmt/states.js` | my robot, status, battery, wifi, storage, firmware, sound, mic test, speaker test, factory reset, offline help, support |
| `lesson-session` | Realtime activity loop | `src/features/lesson-session/states.js` | ready, connecting, greeting, activity intro, robot speaking/listening, user speaking, thinking, success, gentle, retry, silence, offtopic, bargein, activity done, lesson done, reconnecting, audio error, safety, exit confirm |
| `fallback` | Error + safety fallback | `src/features/fallback/states.js` | mic missing, network error, voice failed, safety redirect, help FAQ, reconnecting overlay, audio recovery, lesson resume, kid settings |

## Cross-cutting concerns

- **i18n** — DOM walker at `src/lib/i18n/i18n.js` plus root `i18n.js` preload. Locales live in `locales/{en,vi}.json`; bundle in `locales/bundle.js`. Persona resolver and MutationObserver run on every text node. Validated by `npm run i18n:check`.
- **Tokens** — `tokens.css` at repo root; gender-theme overrides via `:root[data-gender="girl"|"boy"]`.
- **Shared UI** — `src/shared/ui/` exports: `CircleBtn`, `LCDFace`, `PageHeader`, `PageScroll`, `PrimaryCTA`, `Robot`, `SpeechBubble`, `TBPhone`. Imported via `@/shared/ui/<name>`.

## Build + run

| Script | What it does |
|---|---|
| `npm run dev` | Start Vite dev server. |
| `npm run build` | Vite production build. |
| `npm run preview` | Serve production build locally. |
| `npm run i18n:check` | Aggregate: scan + parity + bundle freshness + walker smoke (see `package.json`). |

## Devtool surface

3-view toggle pill in `src/App.jsx`: **All Frames / Interactive / Nav Map**.

Host bridge contracts (preserved during refactor):

- `window.omelette` — read by `design-canvas.jsx` for canvas-host integration.
- `window.parent.postMessage` — `tweaks-panel.jsx` ↔ host iframe communication.
- `EDITMODE-BEGIN` / `EDITMODE-END` markers — preserved in legacy root tweak files.

When Track 10 lands, these devtool files move to `src/devtools/`. Until then, treat root `design-canvas.jsx`, `tweaks-panel.jsx`, `nav-map.jsx`, `ios-frame.jsx` as authoritative.

## See also

- `../flows/README.md` — navigation graph + how to add screens
- `../api/README.md` — backend wiring placeholders
- `../erd/README.md` — entity sketch (TBD)
- `../../.omc/plans/refactor-feature-based-architecture.md` — refactor plan + acceptance criteria
