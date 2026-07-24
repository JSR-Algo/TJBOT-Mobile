# Design QA — First Five Mobile Pages

## Scope

- Owner-approved sources:
  - Overview: `/Users/thuanle/.agentsroom/pasted-images/pasted-1784799703800.png`
  - Five-screen board: `/Users/thuanle/.agentsroom/pasted-images/pasted-1784788366246.png`
- Native verification viewport: iPhone 17, iOS 26.3, 402 × 874 logical points (1206 × 2622 screenshots at 3×).
- Screens: Overview, Live lesson status, Report detail, Course library, Course detail.
- Locked decisions honored: existing robot art; floating glass pill; only the selected tab is colorful; Home owns Overview/Live/Report; Library owns Library/Detail; Mia, EN, and Settings stay in the global header.

## Evidence

- Final full-screen captures: `output/maestro/first-five/01-overview.png` through `05-course-detail.png`.
- Owner-facing five-screen sheet: `output/maestro/first-five/first-five-contact-sheet.png`.
- Same-input reference/build comparison: `/tmp/tbot-first-five-reference-vs-maestro.png`.
- Focus checks: global header alignment, hero copy/robot separation, card density, CTA visibility, safe-area clearance, and active/inactive navigation treatment on all five captures.

## Iteration history

1. Baseline: oversized shell/title treatment, overlong bottom pill, inconsistent course headers, and lower content clipped on Live, Report, and Course Detail.
2. First correction: shared symmetric header and compact floating navigation; all five screens fit, but Overview exposed a demo Home request error and wrapped the online state.
3. Final correction: investor-demo Home seed, one-line online state, reference `06:42` live state, and `5 of 6` report state. Maestro recaptured the complete journey.

## Final comparison

| Surface | Result |
|---|---|
| Typography | Hierarchy, weights, wrapping, and density match the approved direction; no clipped or cramped labels. |
| Spacing/layout | Symmetric header controls and floating pill; full cards and primary actions remain visible. |
| Color/state | Warm neutral canvas and pastel evidence cards retained; exactly one tab is colorful per screen. |
| Imagery | Locked TeeBot robot is unchanged; existing registered farm/course assets are reused with intentional crops. |
| Icons | Lucide controls and the approved colorful menu assets stay aligned and use consistent inactive gray. |
| Behavior | Maestro completes Overview → Live → Report → Library → Course Detail and confirms the primary course action is reachable. |
| Accessibility | Semantic buttons/tabs, selected state, labels, disabled states, and practical mobile tap targets retained. |
| Localization | No new hardcoded copy; English/Vietnamese key parity remains exact. |

Dynamic course counts and the `Add to Robot` action remain backend-state driven rather than being hardcoded to the static board. This is an intentional product-data difference, not a layout or component fidelity defect.

## Severity gate

- P0: none.
- P1: none.
- P2: none after the final capture.
- P3: static-board course catalog data differs from the current investor-demo catalog where backend state differs.

final result: passed
