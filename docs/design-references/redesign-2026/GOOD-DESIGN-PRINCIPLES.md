# GOOD-DESIGN-PRINCIPLES — TJBot mobile redesign

> Synthesized from **Mobbin** best-in-class apps across 8 archetypes (study run 2026-06-25).
> EXTENDS `DESIGN.md` — never overrides the locked Garden-Blue (child) or Wispr-Flow (parent) palettes.
> Audit yardstick for the full screen redesign. Source workflow: `tjbot-study-good-design`.
> Exemplar evidence: `STUDY-EXEMPLARS.md`.

## Top principles (highest leverage)
1. One Primary Action Per Screen — Every screen has exactly one visually dominant call-to-action. Secondary actions are 30-40% less prominent. Reduces choice paralysis.
2. State Is Visible Before Decoration — Connected, pairing, listening, offline, error states visible via text + icon, never color alone. Pair all colors with semantic labels.
3. Mobile-First Density with Scalable Whitespace — 16-24px padding; 44px touch targets minimum (48px preferred). Line-length max 38 characters for parent surfaces.
4. Hierarchy via Scale & Typographic Weight — Primary content 1.5–2x secondary. Bold serif headings (parent), rounded sans (child); consistent font weights (600 bold, 400 regular).
5. Progressive Disclosure & Scannable Organization — One question/action per screen. Section headers group content. Lists max 5-8 items per fold. Expandable details for advanced options.
6. Information Architecture: Status → Hero → Details → Action — Top metrics (4-6 badges) → hero card (60-70% fold) → supporting details → primary button (always visible or near-fold).
7. Consistent Interactive Affordances & Feedback — All tappable elements show tap feedback (shadow, scale, color shift) within 100ms. Loading spinners paired with text. Success/error inline within 200ms.
8. WCAG AA Accessibility: 4.5:1 Contrast, 44px Touch, VoiceOver Labels — Body text 4.5:1 minimum. Interactive elements 3:1. Touch targets 44-48px. All buttons/icons have aria-labels. Reduced-motion respected.
9. Lesson Controls Stay Near Content & Respect Safe Zones — Primary action at bottom-center or inline with card. Landscape mode: video fills; controls float as overlay (<36% height). No hidden bottom nav.
10. Reward Celebration Is Earned, Legible & Respectful — Celebrate with badge + micro-interaction (fill animation, confetti respecting reduced-motion). Dynamic headlines validate performance ('High scorer!' not 'Great job!'). Streak isolated with flame icon + calendar.
11. Device State & Pairing Is Transparent & Reversible — Status always visible (online/offline/pairing) with timestamp. Pairing states: Searching → Found → Connecting → Connected ✓. Failures show actionable next step ('Move closer', 'Restart', 'Enable Bluetooth').
12. Two-Lane Visual Separation (Child ≠ Parent) — Child lane: playful Garden Blue palette, character-rich, animated, storybook. Parent lane: calm Wispr Flow (warm off-white, serif headings, purple accents, operational tone). Never mix palettes on same screen.
13. Motion Respects Reduced-Motion & Never Replaces Feedback — Animations ≤400ms. Micro-interactions always pair with visible state change. Confetti/parallax disabled when prefers-reduced-motion set. Haptics supplement, never replace, visual feedback.
14. Locale & Internationalization From Day One — All strings in i18n bundles (never hardcoded). Vietnamese parent copy direct & explanatory. Child copy short & mostly English. Text fields constrain to 32-38 chars. Date/time locale-aware.
15. Design Review Gate: Accessibility + State Visibility + Safe Zones — Before ship: verify 4.5:1 contrast, device state visible, no content hidden by notch/keyboard, tap targets 44px+, reduced-motion tested, landscape mode safe, color-blind simulator passed.

---

# GOOD-DESIGN-PRINCIPLES.md

## TJBot Design Rubric: Child (Garden Blue) + Parent (Wispr Flow) Lanes

This rubric synthesizes Mobbin exemplars (Duolingo, Khan Academy, Babbel, Apple Home, Fitbit, Universe) with TJBot's existing DESIGN.md authority (tokens, component rules, parent palette, landscape mode, Personality Garden). All principles must align with the locked Wispr Flow palette for parent surfaces and the Garden Blue palette for child surfaces.

---

## CROSS-CUTTING PRINCIPLES (Top 10-15 Rules)

These apply across archetype, lane, and context. They are non-negotiable.

### 1. **One Primary Action Per Screen**
- Every screen has exactly one visually dominant call-to-action (CTA).
- Child lane: use warm color (yellow accent from Garden Blue) or playful button styling.
- Parent lane: use charcoal pill button (`--parent-ink-0`, 48px height, full-width).
- Secondary actions (cancel, skip, help) are 30-40% less prominent in size/saturation.
- All other buttons and links are tertiary or minimal (ghost, text-only).
- **Why:** Reduces choice paralysis and ensures users know what to do next.

### 2. **State Is Visible Before Decoration**
- Connected, pairing, listening, speaking, syncing, offline, blocked states must be visually obvious via text + icon, never color alone.
- Use semantic colors consistently: green for success/connected, cyan for listening/realtime, yellow for warning, red for error.
- Pair color with a text label or glyph ("● Online", "⚠ Setup needed", "🎤 Listening").
- Disabled buttons must show adjacent helper text explaining why ("Complete step 1 first").
- **Why:** Accessibility, clarity for all ages, and reduces user anxiety.

### 3. **Mobile-First Density with Scalable Whitespace**
- Default padding: 16px between content areas, 24px between major sections.
- Touch targets: minimum 44px (children), 48px preferred for primary actions.
- On child surfaces: generously spaced cards (avoid cognitive overload for ages 5-8).
- On parent surfaces: calm operational density — 16-24px gutters, no crowding.
- Line-length constraint: 34-38 characters for body text (parent surfaces) to maintain reading comfort.
- **Why:** Usable on small phones and tablets; respects child development (motor skills); prevents fatigue on parent dashboards.

### 4. **Hierarchy via Scale, Not Just Color**
- Primary content 1.5–2x the size of secondary content.
- Headings serif (parent), rounded sans (child); body always sans-serif.
- Use typographic weight + size together: bold 20px (hero heading) > medium 16px (body) > regular 13px (caption).
- Color hierarchy follows: dark text (primary), muted text (secondary), system gray (tertiary).
- Never use color as the only differentiator between states.
- **Why:** Prioritizes information; supports color-blind users; creates visual rhythm.

### 5. **Progressive Disclosure and Scannable Organization**
- Show only what the user needs on the current screen; hide advanced options.
- Use section headers to group related content.
- Expandable/collapsible sections for optional detail ("See benefits >", "+ More").
- Lists max 5-8 items per fold; longer lists scroll or paginate.
- **Why:** Reduces cognitive load; makes screens feel approachable, not overwhelming.

### 6. **Information Architecture: Top Status → Hero Content → Supporting Details → Primary Action**
- **Top status bar** (4-6 small icons or metric chips): streak, XP, connection, time.
- **Hero card** (60-70% of initial viewport): primary lesson, device status, or daily progress.
- **Supporting details** (grid, list, or carousel): secondary content, options, or sub-lessons.
- **Primary action button** (always visible or just below fold): next action, continue, subscribe.
- **Why:** Ensures key metrics and next action are discoverable without scrolling; supports rapid scanning.

### 7. **Consistent Interactive Affordances and Feedback**
- All tappable elements have clear tap feedback (shadow, scale, color shift within 100ms).
- Buttons use consistent shapes: rounded pills (parent), playful rounded rects (child).
- Icons + text labels for navigation (no orphan icons without labels).
- Loading spinners always paired with text ("Connecting...", "Saving...").
- Success/error feedback appears inline (toast, inline banner, or badge) within 200ms.
- **Why:** Confirms interaction registration; reduces user uncertainty; builds trust.

### 8. **Accessibility: WCAG AA Minimum (4.5:1 Contrast, 44px Touch, Semantic HTML)**
- Body text: 4.5:1 contrast ratio minimum (parent ink on parent bg, child text on child bg).
- Large text (18px+): 3:1 contrast ratio minimum.
- Interactive elements (buttons, icons, cards): 3:1 contrast ratio minimum.
- All buttons, links, icons have `aria-label` or semantic text.
- Touch targets: 44px square minimum (children); preferred 48px.
- Support `prefers-reduced-motion`: disable all animation when set.
- Screen reader testing for both parent and child surfaces.
- **Why:** COPPA compliance; inclusive design for diverse learners; legal safety.

### 9. **Lesson Controls Stay Near Content & Respect Safe Zones**
- Primary lesson action (next, check, continue) positioned at bottom-center or inline with the answer card.
- Floating elements (FAB, lesson progress button) never overlap notch or system gesture zones.
- Landscape mode: video/scene fills screen; controls float as compact overlay (bottom, <36% height).
- No hidden bottom navigation that requires scroll to access.
- **Why:** Reduces cognitive load during focused learning; prevents accidental system gestures.

### 10. **Reward Celebration Is Earned, Legible, and Respectful**
- Celebrate completion with visual + micro-interaction: badge reveal, progress ring fill, confetti sparkle (respects `prefers-reduced-motion`).
- Streak visualization: flame icon + calendar grid + daily checks + motivational copy.
- Reward text is warm but never patronizing ("Looking good!" vs. "Great job!").
- Rewards always map to learning progress, never to engagement dark patterns.
- Parent view of rewards: calm metrics (streak count, total XP) without noise.
- **Why:** Sustains intrinsic motivation; builds habit loop without manipulation.

### 11. **Device State & Pairing Is Transparent and Reversible**
- Device status always visible (connected/offline/pairing/error) with timestamp.
- Connection progress shown via animated scanning rings or percentage bar.
- Pairing states: Searching → Found → Connecting → Connected ✓ — each with text + icon feedback.
- Confirm before destructive actions (reset, unpair, factory reset).
- Failed pairing shows actionable next step ("Move closer", "Restart robot", "Enable Bluetooth").
- **Why:** Parents need confidence in device health; children need reassurance that their bot is listening.

### 12. **Two-Lane Visual Separation (Child ≠ Parent)**
- **Child lane (Garden Blue palette):** playful, colorful, character-rich, animated, storybook aesthetic.
- **Parent lane (Wispr Flow palette):** calm, operational, warm off-white, serif headings, muted accents.
- Never mix palettes on the same screen.
- Shared components use a `surface: "parent" | "child"` prop to render correct tokens.
- Default shared components to parent tokens if context is ambiguous (non-child).
- **Why:** Clear cognitive separation; trust-building for parents; delight for children.

### 13. **Motion Respects Reduced-Motion and Never Replaces Feedback**
- All animations ≤400ms duration; easing: ease-out-cubic or linear for clarity.
- Micro-interactions (button press, card expand) always pair with visible state change, not animation alone.
- Confetti, scroll parallax, and fancy effects disabled when `prefers-reduced-motion` is set.
- Haptic feedback (vibration) supplements visible feedback; never the only feedback channel.
- Audio cues (lesson complete sound, pairing success) are optional; visual feedback is mandatory.
- **Why:** Inclusive of vestibular/motion sensitivities; motion enhances, never distracts.

### 14. **Locale & Internationalization Planning From Day One**
- All UI strings in i18n bundles (never hardcoded).
- Vietnamese parent copy is direct and explanatory ("Hôm nay con học 5 bài" = "Today child learned 5 lessons").
- Child-facing copy remains short and mostly English (familiar vocabulary, low reading load).
- Text fields constrain to 32-38 characters per line to avoid truncation in Vietnamese.
- Date/time formats respect locale (DD/MM/YYYY for Vietnamese, MM/DD/YYYY for US).
- **Why:** Supports global expansion; respects cultural preferences; reduces translation friction.

### 15. **Design Review Gate: Accessibility + Device State Visibility + Safe Zones**
Before any screen ships:
- [ ] High-contrast text (4.5:1) verified with WCAG Contrast Checker.
- [ ] Device/connection state visible (not just decorative status bar).
- [ ] No content hidden by notch, safe area, or system keyboard.
- [ ] Tap targets 44px minimum; buttons 48px preferred.
- [ ] Reduced-motion mode tested (animations disabled or minimal).
- [ ] Landscape mode tested if applicable; video/scene dominates.
- [ ] Color-blind simulator tested (no color-only distinction).
- **Why:** Catches accessibility regressions before launch; prevents COPPA violations.

---

## PER-ARCHETYPE PRINCIPLES

### A. Home Dashboard (Child & Parent Lanes)

#### Child Lane (Garden Blue – TBot-Child-Companion)

**Pattern:** Diorama-style scene (room, garden, or playful background) with mascot (Teebot character) at 30-40% of screen. Large hero lesson card dominates the fold. Mascot expression changes with learning progress (happy, curious, surprised). Status bar shows streak (flame icon + "Day 5") and quick-access metrics (XP, level, or skill count).

**Adopted from Mobbin Exemplars:**
- Duolingo ABC: mascots on shelf (30-40% screen), warm brown/orange palette, diorama aesthetics.
- Duolingo: lesson hero card 60-70% of fold, yellow daily-goal alert, modular grid below.

**Concrete Rules:**
1. **Top status bar** (max 10% height): five 32-40px badges — streak flame, XP total, current level, daily-goal flag, optional profile avatar.
2. **Diorama scene** (30-40% of screen): storybook illustration with Teebot character positioned naturally (shelf, garden, cozy corner). Teebot expression animates subtly (eye blink, smile, gesture wave) when the app loads.
3. **Hero lesson card** (55-65% of screen, centered horizontally): includes title ("Today's Lesson: Colors"), progress ring (animated fill on completion), warm-colored button (yellow or orange from Garden Blue palette), and optional mascot thumbnail.
4. **Module grid below** (2-3 columns, 80-120px thumbnails): next 3-5 lessons color-coded (blue, purple, pink), with lock icons for inaccessible lessons, no text labels (visual pattern recognition for young learners).
5. **One reward alert** (if applicable): bright yellow banner with countdown timer ("Daily goal in 2 hours!") and pulsing confetti sparkle (respects reduced-motion).
6. **Whitespace rhythm:** 16px between elements; diorama and lesson card separated by generous space (creates breathing room).

**Anti-patterns to Avoid:**
- Flat card grids where all lesson cards are uniform size/color; children cannot distinguish priority.
- Mascot taking 60%+ of screen or floating mid-air without anchoring; breaks narrative immersion.
- Streak buried in a "Stats" tab; make it visible on first load (flame icon + count).
- Lesson entry as a thin list row; use large tappable cards instead.
- Color-only locked-state indicator (no text, no pattern); colorblind children confused.

**Implementation Notes:**
- Use `borderRadius: 16-20px` on lesson cards; 8-12px on small badges.
- Garden Blue palette: playful primary color, warm secondary (orange/yellow), sky-blue accents.
- Icon library: use Feather or Ionicons for consistency; size 20-24px for top badges, 32px for primary actions.
- Animated mascot: Lottie or Rive, 60-100 frames per second, seamless loop (blink, gesture, or micro-expression).

---

#### Parent Lane (Wispr Flow – Operational Dashboard)

**Pattern:** Warm off-white background, large-radius pastel cards (blush for action, cream for info, white for list), charcoal pill buttons, serif display headings, floating pill tab bar. Parent opens app for 1-2 min daily check-ins; show summary (child completed X lessons today, streak Y, next step Z) without overwhelming detail.

**Adopted from Mobbin Exemplars:**
- Duolingo Family/Goals: micro-goals, streak calendar, weekly XP chart, emoji badges.
- Finch: discovery feed (chronological progress moments), warm pastoral palette.
- GoHenry: earning/progress bar with gradient fill, clear deadline, status chips.
- Greenlight: greeting + quick-action cards, progress circle, muted navigation.

**Concrete Rules:**
1. **Greeting card** (top, `--parent-blush`, 28px radius): serif heading "Welcome back!" or "Good morning!" + quick status ("Emma completed today's lesson", "Streak: 5 days").
2. **Hero stats card** (`--parent-bg-2`, 28px radius): large serif number (40-44px, `--parent-success`) showing daily/weekly metric (lessons completed, XP earned). Sub-text in body style. Three mini-stat chips below (e.g., "🔥 5-day streak", "⭐ 340 XP", "📅 Mon–Fri").
3. **Discovery feed** (chronological list of learning moments): card rows with timestamp ("Just now", "Today", "1 day ago"), emoji icon, brief learning moment ("Emma learned 5 new words"), and optional optional CTA ("See lesson", "Celebrate").
4. **Primary action button** (blush card, `--parent-ink-0` text, full-width pill, 48px): "Review today's lesson" or "Finish setup" — clearly visible, high contrast.
5. **Bottom pill navigation** (5-6 tabs: home, lessons, progress, settings, maybe shop): active tab highlighted in `--parent-accent-soft` with `--parent-accent` icon/label.
6. **Empty state** (if no lessons today or new account): centered illustration (64px), serif heading, body text, optional CTA ("Start first lesson").

**Anti-patterns to Avoid:**
- Dense data table or "dashboard" grid with 20+ metrics; parents get cognitive overload.
- Vague progress ("On track", "Good job") without numbers; parents need specificity.
- Aggressive color or urgency ("MUST COMPLETE TODAY"); triggers anxiety instead of calm.
- Floating mascot taking up screen space; keep mascot small or absent (parent lane is operational, not playful).
- "Overstuffed primary view": beyond 6-7 sections, parent loses focus.

**Implementation Notes:**
- Use `--parent-bg-0` for page background (warm off-white).
- Cards: `--parent-bg-1` (white) for lists/settings, `--parent-blush` for action CTAs, `--parent-cream` for feature intros, `--parent-bg-2` for muted sections.
- Buttons: charcoal pill (`--parent-ink-0`, 48px height) for primary actions; light pill (`--parent-bg-2`) for secondary.
- Typography: serif (Georgia, "New York") for headings; system sans for body.
- Animation: subtle fade-ins, no parallax or confetti.

---

### B. Interactive Spoken Language Lesson Screen

#### Pattern Across Lanes

**Child:** Character (animated Teebot or speaking avatar) center-stage with dynamic expression. Word/picture card prominent. Audio playback paired with speaker icon. Single instruction in one sentence. Primary "Next/Check/Continue" button at bottom, large and inviting. Progress dots or step indicator at top.

**Parent (if a parent view exists):** Calm version same lesson with muted color, operational metrics (time on lesson, words learned), and progress indicator.

**Adopted from Mobbin Exemplars:**
- Duolingo: character feedback screens, large mascot, speech bubble, green continue button, progress bar.
- Khan Academy: picture-matching tasks, instruction + interactive card + demo video, checkmark feedback.
- Babbel: dialogue with speaker icons on left/right, audio playback buttons, oral practice emphasis.

**Concrete Rules (Child Lane):**
1. **Progress indicator** (top, <10% height): thin bar or dot carousel showing lesson position (step 3 of 5).
2. **Character as scene anchor** (center-stage, 30-50% screen height): animated mascot or avatar with expressive eyes/mouth. Expression updates with lesson state (ready → speaking → reacting to answer).
3. **Instruction text** (above card, 1 sentence max, 16px body weight): "Count the apples and tap the right number." Paired with audio icon; tap to hear voiced instruction.
4. **Content card** (central, 180-240px wide, subtle border/shadow): picture, word, or dialogue. High-contrast, hand-crafted illustration (never stock photos). Tappable area with clear border highlight on selection.
5. **Audio icon** (inline with card, 40-48px, brand color): speaker button with play affordance. For dialogue, place small avatar (16-20px circle) left/right of each line to clarify speaker.
6. **Primary action button** (bottom-center, full-width pill, 48-56px, warm accent color): "Continue", "Check", "Next", "Let's Go". Green for success, yellow/orange for neutral.
7. **Feedback** (inline, 100ms latency): "Nice job!" badge or celebratory tone on correct; "Let's try again" on struggle. Never shame language.
8. **Whitespace:** generous vertical gaps (24px between sections); no horizontal scrolling on instruction/card/button.

**Anti-patterns:**
- Auto-playing audio on screen load (disrespectful to pace).
- Multiple buttons visible simultaneously (continue, skip, hint, repeat); choose paralysis.
- Unclear speaker in dialogue (no avatar, no left/right position, no color).
- Text-only instructions (ignore audio channel for language learning).
- Scrolling lesson content (everything fits above fold; split if needed).
- Harsh error ("Wrong") instead of encouraging ("Good try!").

**Implementation Notes:**
- Lottie or Rive for character animation (eye blink loop, mouth movement sync to audio, gesture reactions).
- Card border: 8-12px radius; shadow: 0 2px 8px rgba (kids).
- Button: `borderRadius: 9999px` (pill), `height: 56px`, brand warm color.
- Audio playback: Web Audio API or native (iOS AVAudioPlayer); sync animation to playback time for lip-sync effect (if applicable).
- Landscape mode: video/scene fills; controls float at bottom as compact overlay (24-28% height).

---

#### Parent Lane (Operational Lesson View)

If a parent opens a lesson in progress or reviews what the child did:

1. **Lesson metadata** (top): lesson name, topic, child's name, time spent, date.
2. **Word/skill focus** (hero card): large, clear list of words or concepts learned (3-5 items).
3. **Performance summary** (after card): accuracy % (95%), speed (6 min), audio clarity score (if applicable).
4. **Next recommendation**: "Fluency review suggested" or "Ready for next lesson" (calm, data-driven).
5. **Primary CTA**: "Review with child" or "Archive" (optional parent action).
6. **Copy style**: operational, warm tone ("Your child learned 5 new words about colors today").

---

### C. Onboarding Flow (Child & Parent)

#### Child Onboarding (TBot-Child-Companion)

**Pattern:** Playful multi-step flow with mascot as visual anchor. Progressive disclosure: role selection (are you a new learner?) → age input → character customization → first lesson intro. One question per screen; skip/back buttons visible but not prominent. Celebration after profile complete.

**Adopted from Mobbin Exemplars:**
- Duolingo ABC: role selection, age input, character customization grid (15 avatar options), progress bar, playful copy.

**Concrete Rules:**
1. **Welcome splash** (optional, <3s): Teebot character waving, "Let's start learning!", skip button.
2. **Role selection** (one screen): "Are you new to learning?" / "Have you tried English before?" — two large button options.
3. **Age or profile input** (numeric keyboard, max 2 fields): "How old are you?" with visual confirmation (number display + emoji face matching age).
4. **Character customization** (grid of 9-15 avatar options): "Which friend will help you learn?" Radio-button on each option, animated border highlight on selection. Confirmation button below grid.
5. **Permissions** (contextual, if needed): "Can we use your microphone to hear your pronunciation?" with warm explanation ("We'll give you feedback on your voice").
6. **First lesson intro** (celebratory card): "You're all set! Ready to learn?" with Teebot celebration animation (jump, confetti sparkle).
7. **Progress bar** (top of every screen): green fill indicator showing position (e.g., "Step 2 of 4").

**Anti-patterns:**
- Long-form signup on single screen (name, email, password, age, avatar, all at once).
- Silent form validation (red underline, no explanation).
- Generic copy ("Complete this step"); use warm, playful language ("Pick your new friend!").
- No visual feedback on form actions; buttons must show tap state.
- Disabled CTAs without explanation ("You need to complete step 1 first").

**Implementation Notes:**
- `borderRadius: 16-20px` on cards; 28px on hero/onboarding cards.
- Button colors: warm (orange, yellow) for primary; muted for secondary.
- Customization grid: 3 columns (120px avatar tiles, 12px gaps), scrollable if >9 options.
- Animations: icon entrance (fade + scale), character reaction (wave, nod), confetti on final screen.

---

#### Parent Onboarding (Wispr Flow)

**Pattern:** Operational two-lane setup (parent + child management). Role/family setup early. Mobile verification via SMS. Child profile creation. Device pairing (optional upfront, can defer). Permission requests with context. Account confirmation & review.

**Adopted from Mobbin Exemplars:**
- Greenlight: dual-account setup (parent + child), form fields with helper text, mobile verification, confirmation screen.
- Spotify Kids: family account linking, PIN setup, account creation with birthday.

**Concrete Rules:**
1. **Welcome greeting** (blush card): "Set up your family account" + charm copy ("Let's get your child learning English").
2. **Account type** (two large button options): "I'm a parent/guardian" vs. "I'm a teacher" — sets context for subsequent screens.
3. **Parent profile** (2-3 fields): name, email, password (optional on first visit); collect later if needed.
4. **Mobile verification** (optional): SMS code entry (numeric pad), "Resend code" fallback, clear context ("We'll send a 6-digit code").
5. **Child profile creation** (required): name (field), age (numeric), optional birthday, optional photo/avatar. Fields have helper text ("As it will appear on the app").
6. **Device pairing prompt** (optional, deferrable): "Pair your robot now or skip" with "Set up later" button. If selected, navigate to pairing flow (see section D).
7. **Permission requests** (contextual): Microphone ("We need your mic for pronunciation feedback"), camera (if applicable).
8. **Confirmation screen** (cream card): review & edit pattern. "Ready to start?" with primary CTA.
9. **Progress indicator** (top, filled pill): shows position (Step 3 of 5).

**Anti-patterns:**
- Hardcoded English; all strings must be in i18n bundles.
- Asking for device pairing before parent account is confirmed; sequence parent → child → device.
- No skip/optional paths; parents feel forced through steps.
- Silent validation errors ("Invalid email") without remediation path.

**Implementation Notes:**
- Use `--parent-*` token palette throughout.
- Cards: blush for action CTAs, cream for informational.
- Typography: serif headings (22-28px), sans body (16px).
- Form fields: 52-56px height, clear labels above, helper text below.
- Buttons: charcoal pill for primary, light pill for secondary/cancel.

---

### D. Bluetooth & WiFi Device Pairing Setup Flow

**Pattern:** Progressive state clarity. Scanning → Found → Connecting → Connected ✓. Each state has text + icon feedback. Optional scanning animation (pulsing rings, radar sweep). Auto-pairing encouraged where possible. Celebration feedback on success. Timeout & retry with actionable next steps on failure.

**Adopted from Mobbin Exemplars:**
- Apple AirPods: rapid contextual pairing, auto-detection animation, celebration feedback.
- Apple Home: scanning animation (radar rings), found-device list, contextual setup guides.
- Google Home: multi-device discovery, signal strength ranking, visual hierarchy.
- Fitbit: step-by-step wizard, progress indicator, confirmatory feedback at each milestone.

**Concrete Rules:**
1. **Start Setup screen** (full-width): large device illustration, heading "Pair your robot", instruction (1-2 sentences), primary "Start Pairing" button (warm color, 48px).
2. **Scanning state** (animated, 10-30 seconds): pulsing radar rings or wavefront animation, text "Searching for your robot..." with optional elapsed time. Landscape orientation supported (animation scaled).
3. **Found device screen** (if single device detected auto-advance): device icon, device name, signal strength bars (1-3), "Connecting..." button or auto-connect.
4. **Multiple devices detected** (list of discovered devices, ranked by signal): each row shows device name + signal bars; tap to select. Highlight currently-selected device with border or background.
5. **Connecting state** (spinner + text): "Connecting to [Device Name]..." + optional "This usually takes 10-15 seconds". Never hang without progress indication.
6. **Connected success screen** (celebration tone): ✓ checkmark badge, Teebot character celebration (jump, eyes widen, confetti sparkle respects reduced-motion), text "Connected!", primary "Next" button.
7. **Error handling** (inline, not modal): If pairing fails, show "Didn't connect. Make sure your robot is ON, then tap Retry." + "Retry" button visible immediately. Offer "Check setup guide" link after 2 failed attempts.
8. **Parent-lane pairing** (operational tone): same flow but muted colors (blues, grays), calm language ("Your child's robot will pair with Wi-Fi in a moment").

**Anti-patterns:**
- Spinner-only state without progress text.
- "Try again" button buried after failure; show immediately on same screen.
- No visual affordance for scrollable device list (if multiple).
- Forced WiFi setup upfront; defer to post-pairing if possible.
- Timeout error without remedy ("Bluetooth connection timeout" is useless); always suggest next step.

**Implementation Notes:**
- Scanning animation: `setInterval` or Lottie, 200-400ms frame rate, pulsing opacity or scale.
- Device illustration: 80-120px, center-top of screen.
- Button: warm accent color for child lane; charcoal for parent lane.
- Timeout logic: 30-45 seconds default; show "Searching..." message at 10s, 20s, 30s if needed.
- Accessibility: VoiceOver labels for each state ("Device found", "Connecting to TJBot").

---

### E. Lesson Complete & Reward Celebration Screen

**Pattern:** Celebratory character illustration + three info pills (XP, quality %, time/level). Headline dynamically validates performance ("Perfect lesson!", "High scorer!", "Learning legend!"). Prominent continue button. Optional confetti animation, streak countdown, or milestone badge unlock. Streak info isolated with flame icon + calendar grid + motivational copy.

**Adopted from Mobbin Exemplars:**
- Duolingo: confetti rays, celebratory character, three horizontal metric pills, blue continue button.
- Khan Academy: full-screen confetti burst, dark background, "Awesome!" tone, energy points breakdown.
- Babbel: streak calendar with daily checks, orange highlight, flame icon, motivational text.

**Concrete Rules:**
1. **Focal illustration** (top-quarter, 40-60% screen height): celebratory character (Teebot) + companion mascot, playful pose (jump, thumbs-up, arms-raised). Motion: entrance animation (fade + scale-in, 300-400ms).
2. **Dynamic headline** (bold, 24-28px, warm accent color): "Perfect lesson!" (if 100%), "High scorer!" (if 90-99%), "Learning legend!" (if streak milestone unlocked), or "Great effort!" (if < 90%). Not generic "Great job!".
3. **Supporting micro-copy** (14px, body color): "Take a bow!" or "You're on a roll!" — warm, brief encouragement.
4. **Three metric pills** (horizontal layout, 80-100px each, background `--parent-bg-2` or tinted, border-radius 12px):
   - Pill 1 (yellow/warm): XP icon + large number (e.g., "+50 XP").
   - Pill 2 (green): checkmark icon + accuracy % (e.g., "98%").
   - Pill 3 (blue): clock/timer icon + time spent or level (e.g., "3 min" or "Level 5").
5. **Streak (optional, isolated)** (if applicable, separate card below pills):
   - Flame icon + "Day 5 streak" (large, bold).
   - Mini calendar grid showing week with checkmarks (daily completion).
   - Current day highlighted with warm accent.
   - Motivational copy: "Keep it up! Learn every day to keep your streak alive."
6. **Primary action button** (full-width warm pill, 48-56px): "Continue" or "Claim XP" or "Done". Links to next lesson or home dashboard.
7. **Confetti animation** (optional, respects `prefers-reduced-motion`):
   - Full-screen confetti rain (dark background) or corner sparkle rays.
   - Duration: 0.6-0.8 seconds; auto-advance after animation completes or on button tap.
8. **Whitespace:** generous padding (20-24px) around all elements; breathing room around headline and character.

**Anti-patterns:**
- Generic "Great job!" headline without performance context.
- Vertical metric stacking (one metric per row); use horizontal pills for scannability.
- Small or non-prominent primary button; should be largest interactive element.
- Instant dismissal or auto-advance without giving user time to celebrate.
- Mixing too many colors in metric pills (visual chaos).
- Placing streak info inline with other metrics; isolate for emphasis.
- Text-only information; always pair with icons + visuals.

**Implementation Notes:**
- Character illustration: professional hand-drawn or 3D (not generic clipart).
- Metric pills: 12px border-radius, 12px horizontal padding, 28px height, center-aligned icon + text.
- Confetti: Lottie animation or Canvas API (simple falling circles + color variation).
- Typography: headline serif (24-28px, bold), pills (16px, medium), micro-copy (14px, regular).
- Color: headline warm accent (from Garden Blue palette), pills semantic (yellow, green, blue).

---

### F. Parent Dashboard: Weekly Summary & Learning Progress

**Pattern:** Calm operational surface. Hero stats card (large serif number showing weekly lessons or cumulative progress). Discovery feed showing learning moments (chronological, emoji icons, timestamps, optional CTAs). Quick-action cards (finish setup, review progress, manage subscription). No gamification noise; focus on factual progress + next step.

**Adopted from Mobbin Exemplars:**
- Finch: discovery feed with timestamps, emoji icons, warm palette.
- GoHenry: earning progress bar with gradient, clear deadline, status chips.
- Duolingo Parents: goals/challenges with date tags, progress carousels, weekly XP chart.
- Khan Academy: skill mastery report (leveled up/down counts), visual comparisons.

**Concrete Rules:**
1. **Greeting + quick status** (blush card, top): "Good morning, [Parent Name]!" + one-liner ("Emma completed 3 lessons this week. Streak: 7 days.").
2. **Hero stats card** (`--parent-bg-2`, 28px radius, 24px padding):
   - Large serif stat number (40-44px, `--parent-success` green): "12 lessons" (weekly total) or "5-day streak".
   - Supporting line (body style, `--parent-ink-1`): "Completed this week".
   - Three mini-stat chips below (28-32px height, white bg, 12px radius): "🔥 5-day streak", "⭐ 340 XP total", "📅 Mon–Fri".
3. **Discovery feed** (scrollable, cards for each learning moment):
   - Timestamp (right-aligned, caption style, `--parent-ink-2`): "Just now", "Today 2pm", "2 days ago".
   - Emoji icon (left, 20px): colored circle or emoji representing the learning moment.
   - Headline (card-title style): "Emma learned 5 new words about animals".
   - Optional CTA (ghost button, right): "See lesson" or "Celebrate" (low visual weight).
4. **Quick-action cards** (if applicable):
   - Blush card if action needed: "Complete device setup" + primary button.
   - Cream card if info: "Words learned this month: 47" + ghost "View all" link.
5. **Bottom pill navigation** (5-6 tabs): Home, Lessons, Progress, Settings, optional Shop.
6. **Whitespace:** 16-20px between feed items; 24px between hero card and feed.

**Anti-patterns:**
- Dense metric table; use cards and discovery feed instead.
- Vague language ("On track", "Good week") without numbers.
- Aggressive urgency ("MUST COMPLETE"); calm operational tone.
- Showing parent the child's raw lesson-player screenshots or clinical skill breakdowns.
- Multiple primary actions on one screen; one clear next action.

**Implementation Notes:**
- Use `--parent-*` token palette throughout.
- Cards: blush for action CTAs, cream for feature intros, white for list items.
- Feed item row: 16px leading icon, flexible body area, 16px trailing CTA or timestamp.
- Buttons: charcoal pill for primary, ghost for secondary.
- Typography: serif headings, sans body text.
- Animation: feed items stagger in on load (50ms delay per item).

---

### G. Device Management & Status Screen

**Pattern:** Device hero (icon + name + status chip). Battery % visually prominent (circular gauge or bar with color gradient). Last-seen timestamp. Firmware version & build info. Toggles for settings (notifications, broadcast, etc.). Destructive actions (reset, unpair) with confirmation. Parent-lane calm, operational tone; child-lane (if applicable) uses playful visual language.

**Adopted from Mobbin Exemplars:**
- WHOOP: status banner with "Connected" label, battery bar with gradient, firmware-update CTA.
- Oura Ring: concentric circular battery indicator, "Ring connected" text, toggles below.
- IKEA Home: device photo, specs as label/value pairs, tools section (reset/setup/copy info).
- Withings: device list with battery badge (top-right), compact card rows, tappable for detail.

**Concrete Rules:**
1. **Device hero banner** (blush or white card, 28px radius, 20px padding):
   - Device icon/photo (40px) or emoji top-left.
   - Device name (card-title style, `--parent-ink-0`) below icon.
   - Status chip (24px height, pill shape, inline): "● Online" (`#E6F9EC` bg, `#1A7F3C` text), "● Offline" (muted bg/text), or "⚠ Setup needed" (`#FFF3E0` bg, orange text).
   - Last-seen timestamp (caption style, `--parent-ink-2`) below name: "Last seen 2 hours ago".
2. **Battery indicator** (prominent, hero-level visual):
   - Circular gauge (80px diameter): arc fill color gradient (green 80-100%, yellow 30-79%, red <30%).
   - Center text: "78%" in bold.
   - Alternative (if horizontal space): full-width progress bar with color gradient.
3. **Firmware & build info** (white card, 28px radius, list-row style):
   - Model: label on left, value on right (caption style, `--parent-ink-2`).
   - Firmware: label on left, value on right. If update available, badge "Update" in red/orange.
   - Serial: label on left, value on right (optional copy-to-clipboard button).
   - MAC address: label on left, value on right (optional).
4. **Status toggles** (white card, 28px radius, list rows):
   - Notifications: toggle on/off, no label needed (icon + system toggle).
   - Broadcast heart-rate / sensor data (if applicable): toggle + helper text ("This will share sensor data with compatible apps").
   - Do not collect >5-8 toggles per screen.
5. **Primary action button** (if needed): "Firmware Update Available" (red/orange, full-width), "Pair again" (warm), "Restart device" (charcoal).
6. **Destructive actions** (bottom, white card, red trailing text):
   - "Unpair device" — trailing chevron or icon in `--parent-danger`.
   - "Factory reset" — trailing chevron in `--parent-danger`.
   - Both require confirmation dialog before execution.

**Anti-patterns:**
- Battery status buried in body text; make it a visual centerpiece.
- No visual distinction between online/offline/setup-needed states.
- Firmware version shown without "Update available" badge if update exists.
- No last-sync timestamp; users unsure if data is fresh.
- 20+ toggles or settings on one screen; split into groups or tabs.

**Implementation Notes:**
- Battery circular gauge: SVG `<circle>` for arc fill, percentage text center, color transitions smooth.
- Status chip: 24px height, 12px horizontal padding, rounded border-radius: 20px.
- Toggles: system-native iOS/Android (UISwitch, SwitchCompat) with active track `--parent-accent`.
- Destructive rows: trailing icon/text in `--parent-danger` red; confirm dialog before action.
- Accessibility: ARIA labels for toggles, color + text (not color alone) for status chips.

---

### H. Subscription Paywall & Checkout

**Pattern:** Semantic badges guide tier selection ("Most Popular", "Best for Families"). Stacked plan cards (vertical on mobile, horizontal on tablet). Plan name + price + description + features list. Billing toggle at top (Month/Annual) with "Save X%" callout. Single full-width "Subscribe" button per plan or global button at bottom. Social proof (user count, discount highlight). Dark background paywall elevates the offering; muted error/secondary actions.

**Adopted from Mobbin Exemplars:**
- Paramount+: "MOST POPULAR" badge, monthly/annual toggle with savings callout, checkmark-based feature list.
- GO Club: dark blue gradient background, "Save 60%" badge on Yearly, white full-width button.
- Linktree: radio-button selection state, "Free trial" badge, expandable "See benefits" links.
- Universe: color-coded tier badges, stacked plan cards, price anchor, "What's included" expandable.

**Concrete Rules:**
1. **Paywall context** (top, optional): brief value prop ("Unlimited lessons, offline mode, no ads") in body style, centered.
2. **Billing toggle** (Month/Annual, top, centered):
   - Two pill-shaped buttons side-by-side: "Monthly" and "Annually".
   - Active pill highlighted (`--parent-accent` or brand warm color).
   - Adjacent value callout: "Save 20%" in small text aligned below or inline.
3. **Plan cards** (stacked vertically on mobile):
   - Card background: white or subtle tint (`--parent-bg-1`).
   - Semantic badge (top-right): "Most Popular" (`--parent-accent-soft` bg, `--parent-accent` text) or "Best for Families".
   - Plan name (card-title style, bold, 18px): "Pro", "Family", "Premium".
   - Price (large serif number, 24-28px, bold, `--parent-ink-0`): "$9.99" + supporting text "(per month)" in caption style.
   - Plan description (body style, 2-3 words): "For serious learners" or "Perfect for families".
   - Feature list (bullet points, 13px, caption style):
     * ✓ Unlimited lessons
     * ✓ Offline mode
     * ✓ Custom learning goals
     * + More (expandable "See benefits >" link)
   - Selection state: radio button on left OR subtle highlight border when selected.
4. **Primary action button** (bottom of all plans, full-width charcoal pill, 48px):
   - Text: "Subscribe" or "Continue" (action verb, not generic "OK").
   - High contrast against card background.
5. **Secondary actions** (below primary button, ghost style):
   - "Restore purchase" (text link, `--parent-accent`).
   - "Redeem code" (text link, `--parent-accent`).
   - "Learn more about plans" (text link, `--parent-accent`).
6. **Trust & legal** (bottom, caption style, center-aligned):
   - "Auto-renews at $X.XX per month. You can cancel anytime."
   - "Terms & Conditions" link.
   - Optional SSL badge icon.
7. **Background:** light (`--parent-bg-0`) or optional dark gradient for premium elevation effect.

**Anti-patterns:**
- Ambiguous selection state (no visual feedback on which plan selected).
- Color as sole differentiator (colorblind users cannot distinguish tiers).
- Overwhelming feature list (10+ features per plan); limit to 4-6 key features.
- No billing frequency default or savings callout; user doesn't see annual value upfront.
- Small or unclear primary button; should be 48px+ and full-width.
- Button color conflicts with tier colors; keep button visually distinct.
- Sticky button that overlaps notch/safe zone; respect screen edges.
- No confirmation before purchase; include review/confirmation screen.

**Implementation Notes:**
- Toggle: two pill buttons, 48px height, active state with accent color fill.
- Plan cards: `border-radius: 24px`, `border: 1px solid var(--parent-line)`, `padding: 20px`.
- Badge: small pill, `border-radius: 12px`, `padding: 6px 12px`, caption style (13px).
- Feature list: bullet points or checkmark icons (16px), 16px line-height for readability.
- Button: `border-radius: 9999px`, `height: 48px`, `font-weight: 600`, full-width.
- Accessibility: radio buttons semantic (screen readers); color + text for tier distinction.

---

## TWO-LANE MAPPING

### Child Lane (Garden Blue – TBot-Child-Companion)
- **Home:** Diorama with Teebot, large hero lesson card, playful mascot expressions, status badges (streak, XP), warm palette (sky-blue, orange, green).
- **Lessons:** Character-driven, single action per screen, audio-first instruction, reward celebrations with confetti, Personality Garden (magical learning surface).
- **Onboarding:** Playful character customization, progressive disclosure, celebration on profile complete, emoji-forward copy.
- **Rewards:** Confetti animations, dynamic headlines, streak calendar, character celebration pose.
- **Device (if visible):** Child never manages device directly; parents do. Optional child-facing "Teebot is ready!" confirmation.

### Parent Lane (Wispr Flow – Operational Dashboard)
- **Home:** Warm off-white, blush/cream cards, serif headings, discovery feed, hero stats card, calm tone, purple accents.
- **Lessons:** Operational summary (words learned, accuracy %, time spent), calm tone, data-driven feedback, next-step recommendations.
- **Onboarding:** Dual-lane setup (parent + child), role selection, mobile verification, child profile, device pairing (optional upfront).
- **Device Management:** Battery visibility, firmware status, status chips (online/offline/setup-needed), toggles for settings, destructive-action confirmation.
- **Paywall:** Dark or light background, semantic badges, billing toggle with savings callout, feature checkmarks, trust signals.

**Never mix lanes:** No Garden Blue colors on parent screens; no parent serif headings on child screens. Shared components use `surface: "parent" | "child"` prop to render correct token set.

---

## IMPLEMENTATION CHECKLIST

Before shipping any screen:

- [ ] **Hierarchy verified:** primary content 1.5–2x secondary; no color-only state distinctions.
- [ ] **Accessibility tested:** 4.5:1 contrast (body text), 3:1 (interactive), 44px touch targets, WCAG Contrast Checker used.
- [ ] **Motion respect:** `prefers-reduced-motion` honored; animations ≤400ms; haptic feedback supplements, not replaces, visual feedback.
- [ ] **State legibility:** device/connection state visible via text + icon, not color alone; all buttons have labels; disabled states explained.
- [ ] **Safe zones:** no content hidden by notch; landscape mode prioritizes video/scene; bottom nav doesn't require scroll to access.
- [ ] **Device state visible:** battery %, online/offline/pairing status, last-seen timestamp all present on device screens.
- [ ] **Lane separation:** no parent tokens on child screens, no child colors on parent screens.
- [ ] **Density appropriate:** whitespace rhythm consistent (16-24px), touch targets 44-48px, line-length <40 chars for body.
- [ ] **One primary action per screen:** single dominant button; secondary actions 30-40% less prominent.
- [ ] **Reduced-motion tested:** animations disabled in system preferences; reduced versions render correctly.
- [ ] **Color-blind simulation:** app tested with color-blind simulator (Sim Daltonism, WCAG Contrast Checker); no color-only states.
- [ ] **Landscape mode tested:** video/scene fills screen; controls float at bottom (<36% height); no text hidden.
- [ ] **Error states designed:** every validation/error has text explanation + remediation path, not just red color.
- [ ] **Empty states designed:** new account / no lessons today / no data shows illustration + explanation + optional CTA.
- [ ] **i18n ready:** all strings in i18n bundles; Vietnamese translations verified for length (32-38 char/line); date/time formats locale-aware.

---

## REFERENCES & EXEMPLAR APPS

- **Duolingo / Duolingo ABC:** Home layout, lesson hero card, reward celebration, streaks, diorama scenes.
- **Khan Academy / Khan Academy Kids:** Picture-matching UX, progress indicators, empty states, skill reports.
- **Babbel:** Dialogue with speaker icons, pronunciation practice, streak calendars.
- **Apple AirPods / Apple Home:** Device pairing flows, scanning animations, progress feedback.
- **Fitbit / WHOOP / Oura:** Device status screens, battery indicators, firmware updates, toggles.
- **Universe / Paramount+ / GO Club:** Paywall design, billing toggle, feature lists, social proof.
- **Greenlight / GoHenry:** Parent dashboards, progress bars, quick-action cards, discovery feeds.
- **Wispr Flow (reference images):** Parent palette (warm off-white, pastel cards, charcoal buttons, serif headings, purple accents).

---

## DEFINITIONS

- **Moment of Truth:** Critical user interaction where confidence/trust is established or broken (pairing success, lesson reward, device status).
- **Discovery Feed:** Chronological list of learning milestones (Emma learned X, completed Y, reached streak Z) with timestamps and optional CTAs.
- **Diorama:** Illustrated scene with characters anchored naturally (shelf, garden, room), creating narrative immersion.
- **Hero Card / Hero Content:** Primary visual element on screen, 60-70% of viewport, dominating attention (lesson card, stats card, device status).
- **Semantic Colors:** colors tied to meaning (green = success, cyan = listening, yellow = warning, red = error), consistent across app.
- **Progressive Disclosure:** revealing information in stages; one question per screen, advanced options hidden until needed.
- **Safe Zone / Safe Area Inset:** screen area respected by system UI (notch, home indicator, status bar); never hide interactive content here.
- **Moment Card / Moment Row:** small card or row showing a single learning milestone (e.g., "Emma learned 5 animals", timestamp, emoji icon, optional CTA).
