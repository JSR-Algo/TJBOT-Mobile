# 0006 Lesson-Session Ownership

Date: 2026-05-12

## Status

Accepted

## Context

The current `tbot-design` prototype contains **two parallel implementations** of the same lesson-session concept:

- **Phone-runtime** (`src/features/lesson-session/screens/*.tsx`) — 24 screens covering the full turn loop (ConnectingScreen → GreetingScreen → RobotSpeakingScreen → RobotListeningScreen → UserSpeakingScreen → ThinkingScreen → SuccessScreen / GentleScreen / RetryScreen / etc., plus 6 terminal states). The phone holds the conversation as if it were the robot.
- **Robot-mirror** (`src/features/course-library/screens/RunningScreen.tsx`, `CompanionScreen.tsx`) — the phone shows "Lesson is on Robot. Your phone can stay in your pocket." (RunningScreen line 22). `CompanionScreen.tsx` cycles phase indicators (speak / listen / think / success / happy) driven by a fake timer (line 26: `setTimeout(setPhase(p+1), 1800)`).

The state-machine plan (`.omc/plans/state-machines-mobile-ux.md` §2.2 + §8.2) describes ONE session entity (`realtime_sessions`) with these schema clues:

- Columns: `user_id`, `device_id`, `child_id`, `device_session_id UUID NOT NULL`. Three identifiers, one session.
- Unique partial index: `CREATE UNIQUE INDEX realtime_sessions_active_idx ON realtime_sessions (user_id, device_id) WHERE state IN ('CONNECTING','ACTIVE','RECONNECTING','PAUSED','INTERRUPTED')` — **one active session per (user, device) pair**.
- `realtime-orchestrator` (sys-04) is named the **sole writer** to `realtime_sessions`.
- `RECONNECTING → ACTIVE` resume uses "the same `device_session_id`" — i.e., the device identity is the session-anchor, not the phone identity.

The schema implies device-anchored sessions, but the prototype phone code makes the phone look like the WS client. The 2026-05-12 readiness audit (AN-16, AN-21) flagged this as **NEEDS MAJOR REWORK** and the highest-severity arch ambiguity blocking backend.

Background facts that constrain the choice:

- TBot's value proposition is **kids talking to a physical robot**. Mic + speaker + LCD live on the robot. Voice latency budgets (sub-second turn-around) work best on a single device pipeline, not phone-as-relay.
- The phone is the parent's device. Parents are not in the conversation; they are observers / controllers.
- Phone-only "no robot yet" mode exists as a trial / first-experience path (the lesson-session screens were prototyped to demo the product without a robot in hand).
- Realtime cost attribution: one session = one billable interaction. Two concurrent claims on the same session = double-billed or worse, conflicting safety actions from two clients.

## Decision

**Robot owns the WebSocket; phone is a read-only mirror. `realtime-orchestrator` and `realtime_sessions` are anchored to `device_id`. Phone-runtime lesson-session screens are retained as a phone-without-robot demo mode and clearly fenced from the production lesson path.**

Concrete commitments:

| # | Commitment |
|---|---|
| D1 | **The robot (sys-03 RuntimeApp) holds the realtime WS** to RealtimeService (sys-04). Phone NEVER opens a realtime WS in production lesson flow. |
| D2 | `realtime_sessions` is keyed by `device_id` (with `user_id`/`child_id` denormalised for query). The active-session unique partial index stays as written (per user, per device). |
| D3 | `POST /v1/sessions/start` is callable by either parent app OR robot, but the resulting WS handshake is always initiated by the robot. Parent-app-initiated start = "tell the robot to start" via MQTT/control-plane; the robot then connects WS. Idempotency-Key minted at the originating client (parent app or robot) covers both paths. |
| D4 | Phone observes session state via push (FCM) + a read-only WS lane (`wss://realtime/v1/observer/{session_id}`) that emits `session.observer_event` messages (turn state, end_reason, safety_event). This lane does **not** count as an active connection for the uniqueness index; it is multi-subscriber. |
| D5 | `src/features/lesson-session/screens/*` is **renamed in concept**: in production mode, these screens are NEVER reached. They remain only behind a `__USE_PHONE_RUNTIME__` build flag for trial-without-robot demos. Domain ownership stays Lane B; lane-B README adds a "production vs demo mode" section. |
| D6 | `src/features/course-library/screens/RunningScreen.tsx` and `CompanionScreen.tsx` become the **production mirror surfaces**. CompanionScreen's fake `setTimeout` phase cycle is replaced with subscriber events on the observer WS lane. |
| D7 | If the parent app loses connectivity, the lesson does **not** stop. Robot owns the WS; phone disconnection is invisible to the conversation. On phone reconnect, phone subscribes again to the observer lane and shows current state. |
| D8 | If the robot loses Wi-Fi mid-session, standard `RECONNECTING` rules apply (`state-machines-mobile-ux.md` §2.2). 10-s server resume window; same `device_session_id` resumes. Phone shows a "Robot reconnecting…" banner via observer event. |
| D9 | A new "trial / no-robot" experience is **out of scope for v1 backend**. The phone-runtime lesson-session screens stay in the prototype for design + design-system exploration but are not wired to a sequence diagram or backend route until a separate ADR commits to a phone-only product surface. |
| D10 | A new use-case `UC-L22 Lesson Handoff (Parent App → Robot Start)` is added — covers the parent-initiates-from-phone path (phone calls `POST /v1/sessions/start` → server tells robot via MQTT/control-plane → robot opens WS → phone receives `session.started` observer event). |

## Drivers

In priority order:

1. **Voice latency.** Sub-second mic→server→speaker round-trip lives best on the device with the mic and the speaker. Routing audio through the phone adds 100–300 ms hop latency and battery cost.
2. **Cost attribution clarity.** One device, one session, one billable interaction. `realtime_sessions` unique index already encodes this.
3. **Conversation continuity.** Parent putting phone down (or losing battery) must not interrupt the child's lesson. Robot-anchored WS makes this automatic.
4. **Safety + parental oversight.** Robot terminations (cost cap, time cap, safety filter) and parent-initiated stops (`PARENT_STOPPED`) are server-driven. Whether phone is online or not, the safety contract holds.
5. **Backend simplicity.** One realtime client per session = one WS lane to harden, one state machine to debug, one cost model.

## Alternatives Considered

1. **Phone owns WS; robot is a dumb speaker over BLE/MQTT.** REJECTED. Implications: (a) phone must stay foregrounded for the entire lesson — kid puts down phone, session breaks; (b) phone-to-robot audio bridging over BLE has bandwidth + latency cliffs; (c) phone battery drains in a 30-min lesson; (d) the realtime-sessions unique index becomes (user, phone-installation-id), which conflicts with phone-replacement and multi-device scenarios; (e) safety-supervisor on the robot (sys-03) has no role.

2. **Handoff: phone starts, robot owns once in-range.** REJECTED for v1. Implications: (a) requires a session-ownership-transfer protocol nobody has designed yet; (b) doubles the failure-mode matrix (transfer-in-progress states, transfer-failed states, race conditions on simultaneous claim); (c) increases the realtime-orchestrator's sole-writer contract complexity (now multiple legitimate first-writers). Could revisit as a Phase-3 enhancement once the single-owner model is shipped and observed.

3. **Both can own; first-writer wins.** REJECTED. The unique partial index already enforces this implicitly, but ambiguity at the user layer ("why did my session start on the phone today and the robot yesterday?") is bad UX. Determinism > flexibility here.

4. **Phone-runtime is the canonical product, drop course-library mirror screens.** REJECTED. The CompanionScreen "your child is talking with Robot, your phone can stay in your pocket" UX is the parent-friendly mental model the team has converged on. Phone-runtime is great for trial; not great as the primary product story.

5. **Defer the decision; let backend implement both and pick later.** REJECTED. The audit explicitly tagged this as the **highest-severity arch ambiguity blocking backend** (AN-16). Without this ADR, the realtime-orchestrator team cannot land sys-04 sequences with confidence in which client they're handshaking with.

## Consequences

### Positive

- **One canonical owner for `realtime_sessions`.** Backend can implement the sole-writer rule (`state-machines-mobile-ux.md` §8.2 line 521) without "but also the phone…" caveats.
- **Phone disconnection is invisible to the conversation.** Battery anxiety, network handoffs, parent walking around — none of these break a lesson.
- **Cost model is clean.** One device, one session. Metering attributes to the device that's actually speaking.
- **Safety supervisor on the robot (sys-03) becomes meaningful.** Local safety filters fire at the device boundary, not at a distant client.
- **Observer WS lane is multi-subscriber.** Multiple parent devices (mom's phone + dad's phone + parent dashboard web) can all watch a single lesson without conflict.
- **Closes audit anomaly AN-16** (two-runtime ambiguity) and unblocks sys-04 sequence implementation.
- **Closes audit anomaly AN-21** for the lesson-session group (or at least clarifies that lesson-session's *production* mobile-surface flow is the parent-start handoff in D10, not the phone-runtime turn loop).

### Negative

- **Phone-runtime lesson-session screens become demo-only / orphaned.** Lane B owns 24 screens that don't power the production lesson. Mitigated by D5 (build flag) and lane-B README clarification.
- **Trial / no-robot UX is not v1.** Users without a paired robot cannot use the lesson loop. Mitigated: onboarding gates lesson entry until a robot is paired (already true in nav-graph — `onb_first_lesson` requires `dv_pair_first_lesson`).
- **Phone-cannot-be-WS-client constraint** rules out a future "use your phone as a backup robot" product mode without an ADR amendment.
- **Observer WS lane adds a second WS endpoint** for backend to maintain. Mitigated: read-only fan-out is simpler than the bidirectional turn protocol; same `realtime_sessions` table, no new state machine.
- **`UC-L01..L21` (existing 21 lesson UCs) need re-evaluation.** Many were written assuming phone-as-actor. Lane B P3.D task should re-survey and tag each UC as `device-driven` or `parent-app-initiated`.

### Neutral

- The `lesson-session` domain remains in Lane B per AGENTS.md; ownership boundary unchanged.
- `course-library` remains in Lane C per the 2026-05-11 re-balance; CompanionScreen / RunningScreen edits are Lane C work.
- The 4 unreachable terminal lesson screens (`timed_out`, `cost_capped`, `parent_stopped`, `abandoned_disconnect`) get wired in production via observer events surfaced into CompanionScreen — they may become inline banners rather than full screens (P3.D design call).
- No change to the realtime state machine itself — `state-machines-mobile-ux.md` §2.2 stays as written; just clarifies who runs it.

## Implementation Pointers (informational, not part of the ADR commitment)

| Layer | Change |
|---|---|
| `state-machines-mobile-ux.md` §2.2 intro | Add "authoritative ownership: device. See `docs/decisions/0006`." |
| `state-machines-mobile-ux.md` §8.2 services row | Already lists `realtime-orchestrator` as sole writer; no edit needed. |
| `src/features/lesson-session/index.js` | Add comment block: "Phone-runtime screens. Production path is `course-library/RunningScreen`. Gated by `__USE_PHONE_RUNTIME__`." |
| `src/features/course-library/screens/CompanionScreen.tsx` | Replace fake `setTimeout` phase cycle with observer-WS event subscription. |
| `src/services/websocket/realtime.ts` | Currently stub. Re-spec: client side opens **observer** lane only (`wss://realtime/v1/observer/{session_id}`). |
| `docs/sequences/04-realtime/session-start-mobile.sequence.mmd` | NEW. ParentApp → Gateway → RealtimeService → MQTT publish → Device. surface=`mobile`. |
| `docs/sequences/04-realtime/observer-attach.sequence.mmd` | NEW. ParentApp → Gateway → RealtimeService → observer WS upgrade. surface=`mobile`. |
| `docs/sequences/04-realtime/turn-pipeline.sequence.mmd` | EXISTS, surface=`device`. Add note: phone is downstream observer subscriber, not a turn-pipeline participant. |
| `docs/architecture/use-case-diagram.md` | Add `UC-L22 Lesson Handoff (Parent App → Robot Start)`. |
| `docs/usecases/domains/lesson-session/use-cases.md` | Tag each existing UC-L01..L21 as `device-driven` vs `parent-app-initiated` (P3.D triage). |
| `docs/usecases/reference/actor-glossary.md` §3 | Note that "Realtime Voice Service" (UC actor) maps to `RealtimeService` orchestrator (mobile observer lane) **and** `RealtimeService` + `GoogleLiveFlash` (device turn-pipeline). Same service, two surfaces. |

## Verification

After implementation (P3.D + later):

- Integration test: parent app calls `POST /v1/sessions/start`, robot receives MQTT push, robot opens WS, parent app receives `session.started` observer event. End-to-end latency < 2 s.
- Integration test: parent app force-quit during ACTIVE session does NOT terminate the session. Robot continues; on parent app re-launch, observer lane resubscribes and shows current state.
- Integration test: robot Wi-Fi drop → `state='RECONNECTING'` → 10 s window → resume. Parent app observer lane emits `session.reconnecting` → `session.resumed` events.
- Unit test: realtime-orchestrator rejects second WS connect attempt from a different device for the same `(user_id, device_id)` pair with 409 Conflict.
- Test: cost cap, safety halt, parent-stop, timeout all surface to parent app observer lane as terminal events with `end_reason` ∈ ENUM set.
- Phone-runtime build flag: `__USE_PHONE_RUNTIME__=false` (production default) routes "start lesson" CTA to robot-handoff path; `__USE_PHONE_RUNTIME__=true` routes to demo lesson-session screens. Both work, only one is shippable.

## Follow-ups

- **P3.D authoring tasks** (already listed in `.omc/plans/flow-system-immediate-fixes.md`): UC-L22, session-start-mobile sequence, observer-attach sequence, CompanionScreen rewire, phone-runtime build flag.
- **Multi-device parent observer.** Mom's phone + dad's phone + web dashboard simultaneously observing — verify observer-WS subscription model handles N>1.
- **Trial / no-robot product surface.** Separate ADR if/when the team decides to ship phone-runtime as a real product (free-tier teaser, demo store, etc.).
- **Robot WS handshake hardening.** mTLS / device-attestation / certificate pinning for the realtime WS — decide as part of sys-04 implementation.
- **Phone-as-parent-control-surface protocol.** Beyond start/observe: pause, end, override, change difficulty mid-session, cost-cap override. Each maps to a control-plane RPC, not a WS message.
- **Lesson-session terminal-screen UX.** Decide whether the 4 terminal states (`timed_out`, `cost_capped`, `parent_stopped`, `abandoned_disconnect`) are full screens or inline banners on CompanionScreen — design call during P3.D.
