<!-- HAND-CURATED. -->
# Purchase Domain Flow

**Owner lane:** C  
**Entry:** `pr_intro` (from course-library via `go('pr_intro')` on buy CTA)  
**Exits:** → `cl_added` / `cl_library` (course-library, post-activation); → `dv_home` (device, cancel/skip)

## Purpose

End-to-end robot + course purchase funnel: discovery → privacy consent → payment → post-purchase setup. 12 screens covering the full commerce journey including bundle selection, subscription, checkout, shipping, physical arrival, and first-course activation.

## Journey narrative

A parent taps "Buy" in the course library. `go('pr_intro')` launches the purchase funnel.

**Discovery screens** (`pr_intro` → `pr_how` → `pr_included` → `pr_bundle` / `pr_subs`): The intro presents the robot value prop. "How it works" explains the lesson format. "What's included" details the hardware kit. From there, the parent chooses a bundle (`pr_bundle`) or subscription (`pr_subs`).

**Consent + checkout** (`pr_privacy` → `pr_checkout`): Privacy terms must be accepted before checkout. `pr_checkout` is the payment screen — classified `edge` because payment can fail (cancel or timeout), mapped to `cancel` + `timeout` edge-case templates.

**Order confirmation** (`pr_confirm`): Exempted happy-path screen (`kind: "happy"`) — this is the success screen, NOT an error confirmation. Shows order summary and estimated delivery.

**Physical delivery flow** (`pr_shipping` → `pr_arrived` → `pr_activate`): Shipping details, robot arrival confirmation, and activation steps. Post-activation the parent chooses to add a first course (`pr_first_course`) or exits to the device domain.

**First course** (`pr_first_course`): Routes to course-library (`cl_added` or `cl_library`) to complete the onboarding loop.

## States

| ID | Kind | Title | Role |
|----|------|-------|------|
| `pr_intro` | happy | Buy · Robot overview | Funnel entry; value prop |
| `pr_how` | happy | Buy · How lessons work | Lesson format explainer |
| `pr_included` | happy | Buy · What's included | Hardware kit details |
| `pr_bundle` | happy | Buy · Bundle picker | Bundle selection |
| `pr_subs` | happy | Buy · Course subscription | Subscription tier picker |
| `pr_privacy` | happy | Buy · Parent trust & privacy | Privacy consent (required before checkout) |
| `pr_checkout` | edge | Buy · Checkout | Payment; cancel/timeout edge |
| `pr_confirm` | happy | Buy · Order confirmed | **Happy-path exemption** — success screen |
| `pr_shipping` | happy | Buy · Shipping & delivery | Delivery details |
| `pr_arrived` | happy | Buy · Robot arrived · setup | Physical arrival confirmation |
| `pr_activate` | happy | Buy · Activate Robot | Robot activation steps |
| `pr_first_course` | happy | Buy · Add first course | First course selection → course-library |

## Edge-case mapping

`pr_checkout` maps to:
- `edge-cases/cancel.flow.mmd` — user cancels payment → confirm sheet → restore `pr_privacy`
- `edge-cases/timeout.flow.mmd` — payment gateway timeout → retry / abort → `pr_intro` or `dv_home`

`pr_confirm` is explicitly **not** an edge state — it is the purchase success screen (AC17 happy-path exemption).

## Entry / exit edges

| Direction | Edge | Trigger |
|-----------|------|---------|
| Inbound | course-library → `pr_intro` | "Buy" CTA on locked course |
| Outbound | `pr_intro` → `dv_home` | "Back" / cancel (cross-domain) |
| Outbound | `pr_checkout` → cancel path | cancel CTA |
| Outbound | `pr_confirm` → `pr_shipping` | "Track order" CTA |
| Outbound | `pr_confirm` → `dv_home` | "Done" CTA (cross-domain) |
| Outbound | `pr_first_course` → `cl_added` | course selected (cross-domain) |
| Outbound | `pr_first_course` → `cl_library` | "Browse all" (cross-domain) |
