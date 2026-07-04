# SCREEN-AUDIT — TJBot mobile (2026-06-25)

> Every screen audited vs `GOOD-DESIGN-PRINCIPLES.md` + `DESIGN.md`. 143 screens, 15 areas.
> Source workflow: `tjbot-audit-screens`. P0 = breaks authority/top principle · P1 = clear improvement · P2 = polish.


---

## onboarding

_The onboarding flow spans three lanes: Child (Screens 1-5, 7-9: playful, warm pastels, character-forward), Parent (Screens 2-3, 6: operational, trust-building, role clarity), and Operational (Screens 4-6: consent, permission management, compliance). The flow correctly separates concerns—child introduction is visual and playful, parent trust is explicitly called out, and operational gates (consent, permission) are clearly framed. All lanes use the onboarding token system (OB colors) appropriately._


### SplashScreen.tsx  · `child` · **P1**
- **Purpose:** 1.7-second splash introducing TJBot logo and welcoming tone with tagline 'Voice English for kids'
- **Now:** Full-screen absolute-fill layout with centered TJBot logo (280x271) and 15px muted tagline below. Uses warm peach background (#FFF5E6), referenceColors.bg, referenceShadow.card. Auto-navigates after 1.7s via legacyNavigate.
- **Issues:**
  - `P1` Tagline color (muted text, implied rgba(0,0,0,0.5)) may not provide sufficient contrast ratio on warm peach (#FFF5E6) against WCAG AA standard (4.5:1 for small text). Test with accessibility audit (GOOD-DESIGN-PRINCIPLES.md §Accessibility: WCAG AA).
  - `P2` No visible loading indicator or progress feedback during 1.7s delay. Consider a subtle pulse on logo or progress bar to signal non-frozen state.
- **Redesign:**
  - Verify tagline contrast: test #FFF5E6 + rgba(0,0,0,0.5) combo with WCAG analyzer; if <4.5:1, darken muted color or slightly warm the bg.
  - Optional: Add subtle pulse or fade-in animation to logo to signal loading state (DESIGN.md: Motion/Audio UX).

### WelcomeScreen.tsx  · `mixed` · **P0**
- **Purpose:** Introduce Robot character and clearly separate child + parent roles, orient user to onboarding flow
- **Now:** ScreenShell with child illustration (OnboardingClayRobot 190px with ring) center-top, followed by hero title (32px, 800 weight, child-facing greeting). Parent note card below title (22px radius, explanatory tone). Footer: PrimaryCTA 'Get started' + secondary text link 'I already have an account'. Uses referenceColors.bg (dark base), warm greeting tone for child, clear operational note for parent.
- **Issues:**
  - `P0` Parent note card lacks visual hierarchy separation from child content. Per GOOD-DESIGN-PRINCIPLES.md §Two-Lane Visual Separation, parent content should use a distinct visual lane (e.g., parent-token background, operator color badge, or clear visual boundary). Currently blends with child content and may confuse which is which lane.
  - `P1` Secondary text link 'I already have an account' lacks visual affordance (underline, icon, or color change on hover). Per GOOD-DESIGN-PRINCIPLES.md §State Is Visible Before Decoration, link state must be obvious.
  - `P1` Hero title (32px, 800 weight) uses child language ('Hi! I'm Robot. I help kids talk in English.') but no explicit child visual marker (e.g., color, icon) differentiates it from parent-facing operational text below. Risk of skimming confusion.
- **Redesign:**
  - Wrap parent note card in parent-lane token background (--parent-bg-elevated or equivalent) to visually separate from child zone per DESIGN.md parent tokens and GOOD-DESIGN-PRINCIPLES.md §Two-Lane Visual Separation.
  - Add underline or color to secondary 'I already have an account' link; hover state should darken or add icon to signal interactivity.
  - Consider adding a small icon or subtle color tint (e.g., garden-blue accent) to hero title to reinforce child lane.

### ParentConsentScreen.tsx  · `parent` · **P1**
- **Purpose:** Capture COPPA-compliant parent consent for child profile and voice lessons with legal signature
- **Now:** OnbShell with title 'Parent consent', heading 'Parent signature needed' (22px, 600 weight). 3 consent points in card rows with checkmark icons. Text input field (52px height, 1px border, 12px radius) for parent name. Checkbox with full-width consent statement. OnbBigBtn 'Sign and continue' disabled until name ≥2 chars and checkbox checked. Error handling: 3 retry attempts, specific auth token / validation / network error messages. Dev mode: consent-bypass token.
- **Issues:**
  - `P1` Input field (52px height, 1px border) uses thin border (#ccc implied) that may not provide sufficient visual emphasis for a critical legal field. Per GOOD-DESIGN-PRINCIPLES.md §State Is Visible Before Decoration, the input should feel weighted and distinct.
  - `P1` Checkbox for consent statement lacks visible focus ring for keyboard navigation. Per DESIGN.md Accessibility (WCAG AA), all interactive elements must have focus-visible styling.
  - `P2` 3 consent points are card rows but lack clear visual separation (gap, shadow, or border). Per GOOD-DESIGN-PRINCIPLES.md §Mobile-First Density, each point should be scannable at a glance.
- **Redesign:**
  - Increase input border weight (2px) and use parent-token color (--parent-accent or --parent-border) to signal importance; add bg color shift (subtle --parent-bg-elevated) on focus.
  - Add focus-visible ring (2–3px, parent-accent color) to checkbox; ensure keyboard tab order is correct.
  - Add 8–12px gap between consent point cards and subtle shadow (--parent-shadow-card) per DESIGN.md component rules.

### TrustScreen.tsx  · `parent` · **P1**
- **Purpose:** Build parent trust by communicating privacy, safety, and design philosophy through 4 promise cards
- **Now:** OnbShell with back button, heading 'Made for kids 6–10. Designed with parents.' (22px, 600 weight). 4 promise cards in flex row (icon + title + body text). Footer note 'Full details any time in Parent Space → Safety & Privacy'. OnbBigBtn 'Continue'. Uses accessible icons, high-contrast promise cards, trust-building copy aligned with parent lane.
- **Issues:**
  - `P1` 4 promise cards in flex row may wrap awkwardly on smaller screens (320px). Per GOOD-DESIGN-PRINCIPLES.md §Mobile-First Density, test layout at 320w; if cards stack, ensure gap and touch targets (44px min) are maintained.
  - `P2` Promise card bodies use small text (implied 14px or less) on dark bg. Contrast ratio should be verified (WCAG AA ≥4.5:1). Test against actual bg color.
  - `P2` Footer note uses arrow notation ('→') which may not translate well in all languages. Consider icon or localized separator per GOOD-DESIGN-PRINCIPLES.md §i18n.
- **Redesign:**
  - Test card layout at 320w, 375w; if cards must wrap, use 2×2 or stacked grid with 8–12px gap and maintain 44px+ touch targets.
  - Verify promise card body text contrast ratio (likely 13–14px light text on dark); if <4.5:1, lighten text or bg slightly.
  - Replace '→' with icon or i18n key; document expected translation length in i18n strings.

### ChildProfileScreen.tsx  · `child` · **P0**
- **Purpose:** Collect child profile: buddy emoji selection, age band, and starting English level via playful multi-selection UI
- **Now:** OnbShell with title 'Your child's buddy'. 3 sections: (1) BUDDY: 8 emoji buttons grid, 23% width, 2px border, 14px radius; active: accent border + #E8F0FE bg. (2) AGE RANGE: 4 button row; active: accent border + #E8F0FE bg. (3) STARTING LEVEL: card list 3 rows with radio button + title + body; active row: #E8F0FE bg. Explanatory text: 'We don't ask for your child's name or photo' + 'Robot will say: [buddy] friend!'. Uses COPPA minimization; i18n with translateTemplate. All buttons 44px+ touch target.
- **Issues:**
  - `P0` No visual indication (heading, icon, or color) differentiates the 3 sections (BUDDY, AGE RANGE, STARTING LEVEL). Per GOOD-DESIGN-PRINCIPLES.md §One Primary Action Per Screen and §State Is Visible Before Decoration, sections must be visually grouped and labeled clearly. Risk of user confusion on what to select and in what order.
  - `P1` Active state uses #E8F0FE (light blue) on multiple buttons simultaneously. Per GOOD-DESIGN-PRINCIPLES.md §State Is Visible, if multiple selections are allowed, this is correct; if only one per section, verify radio vs. checkbox semantics are clear (radio = single, checkbox = multiple). JSX shows 'radio button' but flex grid may imply toggle. Clarify visually.
  - `P1` STARTING LEVEL cards use 3 rows without clear visual separation (gap, shadow, or subtle border). Per GOOD-DESIGN-PRINCIPLES.md §Mobile-First Density, each card should be easily scannable.
- **Redesign:**
  - Add section headings above BUDDY, AGE RANGE, and STARTING LEVEL; use child-lane color (e.g., garden-blue or accent) for each heading to reinforce visual separation.
  - Clarify radio vs. checkbox semantics: if each section allows only one selection, use radio icons; if multiple, use checkboxes. Ensure native form semantics (radio / checkbox HTML elements or ARIA) are wired for a11y.
  - Add 8–12px gap + subtle shadow (--card-shadow) between STARTING LEVEL card rows.

### MicAskScreen.tsx  · `child` · **P2**
- **Purpose:** Request microphone permission consent with child-friendly framing ('Robot needs the mic to listen')
- **Now:** OnbShell with centered mic icon (96x96, 24px radius card), heading 'Robot needs the mic to listen' (22px, 600 weight), body text explaining permission prompt, 4 point rows with checkmark icons (16px, green stroke #1F8A5B). OnbBigBtn 'Continue'. Error handling: retry logic, specific error message for permission denial. Frames permission as necessity for interaction, not surveillance.
- **Issues:**
  - `P2` 4 point rows lack visual separation (gap, shadow, border). Per GOOD-DESIGN-PRINCIPLES.md §Mobile-First Density, each point should be scannable without visual clutter.
  - `P2` Green checkmark color (#1F8A5B) may not be accessible on all backgrounds. Verify contrast ratio (WCAG AA ≥3:1 for graphics / icons). If bg is light, test actual rendering.
- **Redesign:**
  - Add 8px gap + subtle bg fill (--card-bg-elevated or white with 2px radius) to each point row for visual separation.
  - Test green checkmark (#1F8A5B) contrast on actual bg; if <3:1, use darker green or higher-contrast icon.

### IntroListenScreen.tsx  · `child` · **P1**
- **Purpose:** Educate on step 1 of 'How it works' flow: Robot listens to child's voice input
- **Now:** IntroFrame idx=0 with kicker 'How it works · 1', title 'Robot listens', body 'Kids tap the mic and speak. Robot listens patiently — no reading, no typing.' Bg #E8F4FF (light blue, sky theme). Illustration: PulseRing (200px) with centered OnboardingClayRobot (150px). Step counter signals progression.
- **Issues:**
  - `P1` Kicker 'How it works · 1' uses bullet separator (·) which is commonly used but non-semantic. Per GOOD-DESIGN-PRINCIPLES.md §State Is Visible, progress should be explicit (e.g., '1 of 4', 'Step 1 of 4', or progress bar). Bullet separator is unclear to screen readers.
  - `P2` Body text 'no reading, no typing' may confuse users who haven't seen a lesson yet. Consider linking to what happens next or pairing with visual hint of speech output.
- **Redesign:**
  - Change kicker to 'Step 1 of 4' or use semantic progress indicator (progress bar below title); if retaining bullet, add ARIA label 'Step 1 of 4 steps' for screen readers.
  - Optional: Add brief visual cue (e.g., small icon hinting at speech output) or transition animation to next step to set expectation.

### IntroSpeakScreen.tsx  · `child` · **P2**
- **Purpose:** Educate on step 2 of 'How it works' flow: Robot speaks back to child
- **Now:** IntroFrame idx=1, kicker 'How it works · 2', title 'Robot speaks back', bg #E8F8F0 (mint). Illustration: OnboardingClayRobot (140px) + white speech bubble ('Hello!' with 14px radius shadow) + WaveBars (8 bars, 26px height). Uses color coding (mint bg) to differentiate from step 1 (sky-blue).
- **Issues:**
  - `P2` Speech bubble text 'Hello!' is hardcoded English and does not reflect i18n. Per DESIGN.md i18n integration, all user-visible text including speech bubbles must be translatable via i18n keys.
  - `P2` WaveBars (8 bars, 26px) visualization is static. Per DESIGN.md Motion/Audio UX, audio visualizations should animate (e.g., bar heights oscillate) to reinforce audio metaphor.
- **Redesign:**
  - Replace hardcoded 'Hello!' with i18n key (e.g., i18n('intro.robotSaysHello')) to support translation.
  - Add animation to WaveBars: use oscillating heights (Animated or react-native-reanimated) to simulate audio playback, 200–300ms cycle time per DESIGN.md Motion spec.

### IntroRetryScreen.tsx  · `child` · **P2**
- **Purpose:** Educate on step 3 of 'How it works' flow: Child can try again if Robot misunderstands
- **Now:** IntroFrame idx=2, kicker 'How it works · 3', title 'It's okay to try again', bg #FFF1D6 (warm cream). Illustration: OnboardingClayRobot (140px) + speech bubble with refresh icon ('Once more!'). Reassurance messaging, refresh icon reinforces retry concept.
- **Issues:**
  - `P1` Speech bubble text 'Once more!' is hardcoded English, not i18n-able. Per DESIGN.md i18n, all text must use i18n keys.
  - `P2` Refresh icon is presented without explicit label. Per GOOD-DESIGN-PRINCIPLES.md §Disabled Actions Must Explain Themselves, icon meaning should be supplemented by text or tooltip. Currently relies on UX convention alone.
- **Redesign:**
  - Replace 'Once more!' with i18n key (e.g., i18n('intro.retryMessage')).
  - Add small text label below or next to refresh icon: 'Try again', 'Retry', or similar, to reinforce meaning for users unfamiliar with refresh icon.

### IntroCelebrateScreen.tsx  · `child` · **P2**
- **Purpose:** Educate on step 4 of 'How it works' flow and celebrate completion of intro sequence with motivational messaging
- **Now:** IntroFrame idx=3, kicker 'How it works · 4', title 'Small wins, every day', bg #FFF8E1 (pale yellow, celebration tone). Illustration: OnboardingClayRobot (160px with ring) + sparkle emoji (28px, gold color from referenceColors.gold). Celebration messaging reinforces habit-building and progress.
- **Issues:**
  - `P2` Sparkle emoji (28px, gold) may not render consistently across platforms (iOS vs. Android). Per DESIGN.md Personality / Character rules, emojis should be avoided in favor of vector illustrations for consistency. Consider replacing with custom SVG sparkle graphic.
  - `P2` Ring animation on robot (showRing) is not documented. Per DESIGN.md Motion/Audio UX, animation spec should be explicit (duration, easing, curve). Clarify in design doc.
- **Redesign:**
  - Replace sparkle emoji with custom SVG sparkle graphic (hand-drawn or asset-consistent with OnboardingClayRobot style) to ensure cross-platform consistency and design coherence.
  - Document ring animation spec in DESIGN.md: duration (e.g., 800ms), easing (e.g., cubic-bezier), cycle (infinite or single). Verify animation pairs with celebration moment (triggers at screen show vs. on CTA).

### FirstLessonEntryScreen.tsx  · `mixed` · **P0**
- **Purpose:** Hand off from onboarding to child's first lesson with parent reminder pill + Robot greeting + time/resource note
- **Now:** ScreenShell bg #FFF8E1 (pale yellow, celebration). Parent reminder pill (absolute top, 64pt, rgba(255,255,255,0.85) bg, 14px icon + 13px text 'Hand the phone to your child', lock icon). Hero section: OnboardingClayRobot (190px with ring), SpeechBubble ('Hi there!\nWant to play?'), time pill (rgba(255,255,255,0.7), 13px text 'About 3 minutes · headphones if you have them'). Footer: PrimaryCTA 'Yes!' (#FF6F61 coral). Bridges child + parent concerns in single screen.
- **Issues:**
  - `P1` Parent pill text 'Hand the phone to your child' is small (13px) and high-contrast may be lost on warm yellow bg if not tested. Per WCAG AA, contrast ratio should be ≥4.5:1. Test rgba(0,0,0,0.5) on #FFF8E1.
  - `P1` Speech bubble text 'Hi there!\nWant to play?' is hardcoded English, not i18n-able. Per DESIGN.md i18n, all user-facing text must use i18n keys, including speech bubbles.
  - `P0` Time pill content 'About 3 minutes · headphones if you have them' uses bullet separator (·) and mixes lesson duration with hardware recommendation in a single, cramped line. Per GOOD-DESIGN-PRINCIPLES.md §One Primary Action Per Screen and §State Is Visible, these are two distinct pieces of info that should be visually separated. Risk of user skipping the headphones hint.
  - `P2` CTA button color #FF6F61 (coral) was not seen in design tokens (referenceColors). Clarify if this is a hardcoded exception or missing token alias. Per GOOD-DESIGN-PRINCIPLES.md §Tokens Only, all colors must use token references.
- **Redesign:**
  - Test parent pill text contrast (rgba(0,0,0,0.5) on #FFF8E1); if <4.5:1, darken text color or adjust pill bg opacity to rgba(255,255,255,0.95) for better contrast.
  - Replace hardcoded speech bubble text 'Hi there!\nWant to play?' with i18n keys (e.g., i18n('firstLesson.robotGreeting') and i18n('firstLesson.readyQuestion')).
  - Redesign time pill: split into two lines or two pills: Line 1: 'About 3 minutes' (duration icon). Line 2: 'Headphones recommended' (headphones icon). Or use 2×1 grid of info cards for clarity.
  - Replace #FF6F61 with token reference (e.g., referenceColors.accent or referenceColors.cta) or define as new token if coral is intentional; document in DESIGN.md.

---

## Auth (TJBot Mobile)

_Mixed child/operational onboarding lane. Child introduction screens (IntroListenScreen, IntroSpeakScreen, IntroRetryScreen, IntroCelebrateScreen) use playful Garden Blue palette with clay robot illustrations. Parent operational screens (LoginScreen, ChildProfileScreen, TrustScreen, WelcomeScreen, SplashScreen) use reference theme tokens. Auth flow spans both lanes without enforcing lane separation rule per DESIGN.md §8.6._


### SplashScreen.tsx  · `operational` · **P2**
- **Purpose:** 1.7-second boot screen showing TJBot logo and tagline before transitioning to WelcomeScreen
- **Now:** Centered logo (280×271, borderRadius 36) with tagline 'Voice English for kids' (15px, inkSoft color). Uses referenceColors.bg background and referenceShadow.card on logo. Passive timer-driven navigation.
- **Issues:**
  - `P1` No accessibility label on tagline text; only logo has accessibilityLabel. Add semantic label to tagline for screen readers.
  - `P2` Hard-coded 1700ms timeout has no user affordance. Consider deferring to WelcomeScreen onPress instead of time-based auto-advance, or adding skip button (low visual weight) if splash is mandatory.
- **Redesign:**
  - Add aria-label to Text tagline: 'Voice English for kids'
  - Consider adding an invisible skip button (opacity: 0, accessible hit-target) to let users advance manually instead of waiting 1.7s

### WelcomeScreen.tsx  · `child` · **P1**
- **Purpose:** Hero screen introducing Robot character and onboarding sequence. Sets tone: warm, reassuring, with parent-reassurance callout.
- **Now:** OnboardingClayRobot (190px, showRing=true) centered. Hero title (32px, bold, ink color, 37px line-height) with line break. Parent-note card (inline, flex row, gap 10, icon + text, referenceColors.card bg, 22px radius, 1px border, card shadow). Primary CTA 'Get started' (PrimaryCTA component with primary color).
- **Issues:**
  - `P0` Parent-note card interior text is 'inkSoft' (captions role) at 13px on referenceColors.card bg. If contrast ratio is less than 4.5:1, this violates WCAG AA. Verify contrast or bump text color to darker ink.
  - `P1` Line break in hero title ('Hi! I'm Robot.\nI help kids talk in English.') is hardcoded. In other languages, this line break may orphan words. Use i18n string with dynamic line breaks.
- **Redesign:**
  - Measure contrast: referenceColors.card (bg) vs. OB.inkSoft (text). If less than 4.5:1, increase text weight to 600 or change to OB.ink (darker).
  - Refactor hero title to use i18n key with safe character length (max 35 chars). Remove hardcoded \n line break.

### LoginScreen.tsx  · `operational` · **P0**
- **Purpose:** Dual-mode email/password signup and login form. Tab-based mode switching (signup/login). Includes forgot-password flow.
- **Now:** OnbShell container with title 'Parent account'. Heading (22px, 600 weight, OB.ink, 28px line-height). Tab bar (flex row, semi-transparent bg, active tab has card bg). Two TextInput fields (email, password) with error states using OB.danger border. Mode-conditional confirm password field for signup. Error messages (13px, OB.danger). PasswordChecklist component (signup only).
- **Issues:**
  - `P0` Tab bar background is semi-transparent ('rgba(255,255,255,0.62)'), which violates GOOD-DESIGN-PRINCIPLES §4 'State Is Visible Before Decoration'. Tab state should be visible via solid color, not transparency.
  - `P0` Input field error state uses OB.danger border only. Per GOOD-DESIGN-PRINCIPLES §2, error state must pair text label + icon + color, never color alone. Missing inline error icon (⚠).
  - `P1` Form labels are placeholders only. Per WCAG best practices, labels should be separate from input (above or outside). Use separate Text label above each input.
  - `P1` CTA button label changes to '…' during submission. This violates GOOD-DESIGN-PRINCIPLES §7 'Consistent Interactive Affordances'. Button should show spinner icon + 'Signing up…' text.
- **Redesign:**
  - Replace semi-transparent tab bar bg with solid color: use OB.card for entire bar, then highlight active tab with border-bottom (2px OB.accent) or pill-shaped bg.
  - Add ⚠ icon (16px, OB.danger) inline with error border on TextInput. Pair with error text below.
  - Move labels outside input: render separate Text above each TextInput. Add input `accessibilityLabel` to match.
  - Replace '…' CTA label with dynamic text + spinner: `submitting ? 'Signing up…' : 'Create account'`.

### ChildProfileScreen.tsx  · `child` · **P1**
- **Purpose:** Onboarding step: child buddy selection (emoji-based, 8 options) and starting level selection (3 radio-button options). Sets initial lesson difficulty and buddy for Robot greeting.
- **Now:** OnbShell with title 'Your child's buddy'. Heading (22px, 600 weight) + subtitle (14px, ink2). Buddy grid (flexWrap, gap 8, 23% width buttons). Buttons: 2px border, borderRadius 14, aspectRatio 1, 30px emoji centered. Active buddy: OB.accent border, '#E8F0FE' bg; inactive: OB.hair border, OB.card bg. Level section: list card (borderRadius 14, 1px border). Level rows (52px-ish, radio button + text).
- **Issues:**
  - `P0` Buddy grid buttons lack text labels. Per GOOD-DESIGN-PRINCIPLES §8 and WCAG AA, buttons must have aria-label or semantic text. Current emoji-only buttons fail accessibility.
  - `P1` Buddy selection visual feedback is color-only (border + bg). Per GOOD-DESIGN-PRINCIPLES §2 'State Is Visible Before Decoration', selection state should pair text label + icon, never color alone. Missing checkmark icon.
  - `P1` Level descriptions (13px) may not wrap correctly in Vietnamese or longer languages. No max-width constraint documented.
- **Redesign:**
  - Add aria-label to each buddy button and visible text label below emoji. Adjust button width to accommodate label.
  - Add checkmark icon (✓, 16px) in top-right corner of selected buddy button.
  - Constrain level body text to max-width or add ellipsis: set `numberOfLines={2}` on description Text.

### TrustScreen.tsx  · `operational` · **P1**
- **Purpose:** Privacy assurance and trust-building step before parent login. Four promise cards (voice privacy, short sessions, no social/ads, parent control) with icons and descriptions.
- **Now:** OnbShell with title 'Our promise'. Heading + subtitle. Four promise cards (flexDirection row, gap 12, OB.card bg, 1px OB.hair border, borderRadius 22, padding 14). Each card: icon wrap (34×34, borderRadius 12, referenceColors.secondarySoft bg) + text (title 14px, body 13px). Privacy note with inline emphasis (OB.accent color). Primary CTA 'Continue'.
- **Issues:**
  - `P1` Icon wrapper bg (referenceColors.secondarySoft) contrast against icon stroke color (OB.ink) is untested. Verify contrast ratio is at least 3:1.
  - `P1` Promise body text (13px, OB.ink2) on OB.card bg may have insufficient contrast. Verify OB.ink2 vs. OB.card contrast is at least 4.5:1.
  - `P2` Privacy note link ('Parent Space → Safety & Privacy') is visual-only; tapping does nothing. Add TouchableOpacity wrapper + navigation or replace with ghost button.
- **Redesign:**
  - Verify SVG icons use `stroke='currentColor'` to inherit OB.ink color. Measure contrast: referenceColors.secondarySoft vs. OB.ink.
  - Measure contrast: OB.ink2 (promise body) vs. OB.card bg. If less than 4.5:1, use OB.ink for body text.
  - Make privacy note link interactive: wrap in TouchableOpacity with navigation handler or render as ghost button.

### IntroListenScreen.tsx  · `child` · **P1**
- **Purpose:** First 'How it works' step. Introduces listening interaction: child taps mic and speaks, Robot listens. Uses clay robot + pulsing ring illustration.
- **Now:** IntroFrame wrapper (idx=0). Hardcoded: bg='#E8F4FF', kicker='How it works · 1', title='Robot listens', body='Kids tap the mic and speak. Robot listens patiently — no reading, no typing.' Illustration: PulseRing (200px, primary color) + OnboardingClayRobot (150px) inside Box.
- **Issues:**
  - `P1` Hardcoded bg color '#E8F4FF' is not tokenized. Per DESIGN.md §4, all colors must reference design-system tokens.
  - `P1` Title and body text are hardcoded English strings. Per GOOD-DESIGN-PRINCIPLES §14 'Locale & Internationalization', all UI strings must be in i18n bundles.
  - `P1` PulseRing animation does not respect `prefers-reduced-motion` setting. Per GOOD-DESIGN-PRINCIPLES §13, animations must be disabled for reduced-motion users.
- **Redesign:**
  - Extract bg color '#E8F4FF' to design-system/tokens/colors.ts as `intro.listen` token.
  - Move title and body to i18n bundle: 'onboarding.intro.listen.title', 'onboarding.intro.listen.body'.
  - Verify PulseRing respects reduced-motion. Conditionally render static ring if `useReducedMotion()` returns true.

### IntroSpeakScreen.tsx  · `child` · **P1**
- **Purpose:** Second 'How it works' step. Introduces Robot's spoken response: Robot replies with audio feedback. Uses clay robot + speech bubble + wave bars animation.
- **Now:** IntroFrame wrapper (idx=1). Hardcoded: bg='#E8F8F0', kicker='How it works · 2', title='Robot speaks back', body='Robot replies out loud, so kids hear how words really sound.' Illustration: flex row with ClayRobot (140px) + bubble (white bg, 14px padding, '\"Hello!\"' text) + WaveBars.
- **Issues:**
  - `P1` Hardcoded bg color '#E8F8F0' is not tokenized. Must reference design-system token.
  - `P1` Title and body are hardcoded English strings without i18n keys.
  - `P1` WaveBars animation does not check `prefers-reduced-motion`. Per GOOD-DESIGN-PRINCIPLES §13, animation must be disabled when user has reduced-motion preference.
  - `P1` Bubble text '\"Hello!\"' is hardcoded with no i18n key. Language-appropriate punctuation (e.g., Vietnamese guillemets) will not be applied.
- **Redesign:**
  - Tokenize bg color. Add 'speak' entry to intro colors map.
  - Move title, body, and bubble text to i18n bundle.
  - Verify WaveBars respects reduced-motion. Conditionally render static bars if reduced-motion is ON.

### IntroRetryScreen.tsx  · `child` · **P1**
- **Purpose:** Third 'How it works' step. Introduces retry/patience interaction: if word is tricky, Robot repeats slowly. Uses clay robot + speech bubble with retry icon.
- **Now:** IntroFrame wrapper (idx=2). Hardcoded: bg='#FFF1D6', kicker='How it works · 3', title='It's okay to try again', body='If a word is tricky, Robot says it once more — slowly, with no pressure.' Illustration: flex row with ClayRobot (140px) + bubble (white bg, retry icon SVG + 'Once more!' text).
- **Issues:**
  - `P1` Hardcoded bg color '#FFF1D6' is not tokenized. Must reference design-system token.
  - `P1` Title and body are hardcoded English strings without i18n keys.
  - `P1` Bubble text 'Once more!' is hardcoded with no i18n key.
- **Redesign:**
  - Tokenize bg color. Add 'retry' entry to intro colors map.
  - Move title, body, and bubble text to i18n bundle.

### IntroCelebrateScreen.tsx  · `child` · **P1**
- **Purpose:** Fourth 'How it works' step. Introduces reward/celebration interaction: short lessons (3–5 min) ending with celebration. Uses clay robot + celebration emoji.
- **Now:** IntroFrame wrapper (idx=3). Hardcoded: bg='#FFF8E1', kicker='How it works · 4', title='Small wins, every day', body='Each lesson is short and ends with a celebration. Built for 3–5 minutes a day.' Illustration: flex col with ClayRobot (160px, showRing) + '🎉' emoji (28px).
- **Issues:**
  - `P1` Hardcoded bg color '#FFF8E1' is not tokenized. Must reference design-system token.
  - `P1` Title and body are hardcoded English strings without i18n keys.
  - `P1` Celebration emoji '🎉' is hardcoded text with no accessibility label. Emoji rendering may vary by platform (iOS vs. Android).
- **Redesign:**
  - Tokenize bg color. Add 'celebrate' entry to intro colors map.
  - Move title and body to i18n bundle.
  - For celebration emoji: add `accessibilityLabel='You did it! Celebration'` to Text, or replace emoji with SVG icon (party popper, star).

---

## Home + Progress (TJBot Mobile)

_Mixed-lane audit: HomeHubScreen (child lane — Garden Blue palette) + 5 progress screens spanning child lane (celebration/lesson summary) and parent-facing surfaces (today progress shown with parent operational styling). Design authority: GOOD-DESIGN-PRINCIPLES.md (Mobbin exemplars) + DESIGN.md (§6–8 Garden Blue + Wispr Flow tokens). Primary issues: (1) HomeHubScreen lacks clear hero lesson card — robot dominates but no prominent "Today's Lesson" CTA matching rubric §A.1; (2) CelebrationScreen violates state visibility (confetti alone, no dynamic performance headline per §E); (3) TodayProgressScreen uses parent palette colors (#2B2140, #5C4F77) but is child-facing, mixing lanes; (4) multiple screens lack 48px touch targets on primary actions; (5) ReviewNeededScreen has secondary button without clear affordance contrast._


### src/features/home/screens/HomeHubScreen.tsx  · `child` · **P0**
- **Purpose:** Child home hub — robot greeting + daily lesson entry point + quick-action navigation (course, review, progress, device)
- **Now:** Sky-blue diorama background with greeting text. Robot image (228x228px) at center in concentric rings with optional pulse animation. Responsive state chip above robot. Robot name 'Robot' + tap hint below. Four 80-120px square quick-action icons (course, review, progress, robot management) in bottom row. Primary CTA button positioned absolutely (~44-48px) above secondary row. Top bar has parent-dashboard + settings circle buttons (44px).
- **Issues:**
  - `P0` Missing hero lesson card. Rubric §A.1 requires hero lesson card (55-65% screen) with title, progress ring, warm button. Currently robot dominates (30-40%) with no lesson entry point. Violates §1 One Primary Action — unclear if primary action is robot tap or CTA button.
  - `P0` Primary CTA button position unclear. Positioned absolutely 220px from bottom, competing with secondary row 116px from bottom. No visible separation on rendering surface. Violates §9 Lesson Controls Near Content — button should be visually dominant and accessible.
  - `P1` Quick-action buttons visual-only with labels. Rubric §A.1 specifies no text labels, but these are labeled. Touch targets appear ~80-120px visually but may be less than 44px minimum if padding is sparse.
  - `P1` State chip renders without clear icon semantics. Rubric §2 requires text+icon never color alone. HomeStateChip appears text-only; missing icon for online/offline state.
  - `P2` Greeting text 'Hi, friend!' lacks context subtitle. Rubric §6 requires Information Architecture Top Status→Hero→Details→Action. Greeting should be followed by status (e.g., Ready for todays lesson).
- **Redesign:**
  - Move robot to 30-40% screen. Introduce prominent Todays Lesson card (55-65% screen, warm-colored button) with title, description, Start Lesson button in yellow/orange.
  - Clarify primary vs secondary CTAs. Start Lesson should be single dominant action. Primary CTA below should be secondary (30-40% less prominent) or de-duplicated.
  - Ensure quick-action buttons have 44px+ touch targets with subtle border/highlight on press. Verify HomeStateChip renders both text AND icon.
  - Add status chips to top bar (streak flame, XP badge, daily-goal flag). Rubric §A.1 requires five 32-40px badges at top.
  - Increase visual hierarchy: enlarge greeting text, add context copy, ensure bottom CTA has 48px height and prominent visual weight.

### src/features/progress/screens/TodayProgressScreen.tsx  · `child` · **P0**
- **Purpose:** Child-facing progress summary for todays lessons — celebrate completed/active lessons, show step counts and state
- **Now:** PageScroll with sky-blue background (or parent colors #2B2140/#5C4F77). PageHeader title You practiced speaking! (or No practice yet) + subtitle Today. Conditional render: loading spinner, error card with retry, empty state, or ProgressBody with lesson title + two stat chips (steps right/steps done) + state card (state label + X of Y steps detail). PrimaryCTA Back home button (coral/warm color). Stat chips are white cards (18px radius) with large centered numbers.
- **Issues:**
  - `P0` Lane violation: Colors are parent-lane (#2B2140, #5C4F77) on child-facing screen. DESIGN.md §8.6 No parent-* token may appear in child-facing screen component. Should use Garden Blue palette (sky-blue bg, warm accents).
  - `P0` Missing celebration tone. Rubric §E requires celebratory character illustration + dynamic headline validating performance (Perfect lesson! High scorer! Learning legend!). TodayProgressScreen has no character, no confetti, no dynamic headline.
  - `P1` Stat chips lack visual hierarchy. Two chips side-by-side but unclear which is more important. No icon or color semantics. Should use semantic colors (green for success, yellow for progress) + icons (checkmark, progress ring).
  - `P1` State card text-only. Finished/In progress/Paused states lack icon affordance. Per DESIGN.md §2 State visible before decoration: text+icon never color alone.
  - `P1` PrimaryCTA button height unknown (~44-48px) with unclear visual prominence. Buried at bottom after scrollable content. Should feel prominent per rubric §1.
- **Redesign:**
  - Recolor entire screen to Garden Blue palette: sky-blue background, warm orange/yellow accents. Change #2B2140 to warm dark, #5C4F77 to playful secondary color.
  - Add celebratory character (Robot mascot) in success pose. Add conditional confetti animation on full lesson completion (respects prefers-reduced-motion).
  - Replace generic You practiced speaking! with dynamic copy based on accuracy: Perfect lesson! (100%), High scorer! (90-99%), Great effort! (<90%).
  - Add semantic colors + icons to stat chips: checkmark+green for steps right, progress bar for steps done. Use warm accent color from Garden Blue.
  - Add icon to state card: green checkmark for Finished, yellow pause for Paused, blue play for In progress. Per DESIGN.md state visibility rules.
  - Reposition CTA: float/prominent near top-of-fold or add secondary action (Practice more or Garden) alongside Back home.

### src/features/progress/screens/CelebrationScreen.tsx  · `child` · **P1**
- **Purpose:** Full-screen celebration after lesson completion — motivate child with character pose, confetti, sticker reward, clear next-action buttons
- **Now:** Full-screen warm yellow (#FFC857) background. Absolute-positioned confetti layer (24 colored rectangles with rotation, opacity 0.85, scattered 0-100% left / 0-80% top). Centered hero headline You did it! (48px bold with text-shadow). Robot component (emotion=success, 240px, accent orange #FF6F61). White message card with celebratory copy. White sticker card with emoji-filled icon circle (light pink bg) + NEW STICKER label + Brave Speaker title. PrimaryCTA (coral #FF6F61, 48+px) Back to Robot Home + secondary white ghost button Practice review words.
- **Issues:**
  - `P0` Confetti violates prefers-reduced-motion. No media query check for reduced-motion preference. Confetti should be disabled if user has reduced-motion set. Per rubric §13 Motion Respects Reduced-Motion.
  - `P1` Hero headline You did it! is generic, not performance-validated. Rubric §E requires dynamic headline validating performance (Perfect lesson! High scorer! Learning legend!). Should check lesson accuracy/speed and render appropriate headline.
  - `P1` Secondary button Practice review words (white semi-transparent, unclear touch target). Looks like decorative link, not tappable button. Should be 30-40% less prominent per rubric §1 but still feel tappable. Needs clear button affordance (border, darker bg, or text styling).
  - `P1` Sticker card layout unclear affordance. If tappable should have clear press state (shadow, scale, color shift within 100ms per rubric §7). No activeOpacity or onPress handler visible.
  - `P2` No performance metrics displayed. Rubric §E specifies three metric pills: XP icon+large number (+50 XP), checkmark icon+accuracy % (98%), clock icon+time spent (3 min). Currently only showing sticker reward, no XP/accuracy/time metrics.
- **Redesign:**
  - Add prefers-reduced-motion media query check. If true, disable confetti animation or render static celebration (single sticker/badge) instead.
  - Replace You did it! with dynamic headline based on lesson performance: Perfect lesson! (100%), High scorer! (90-99%), Great effort! (<90%). Fetch accuracy/time metrics from lesson API.
  - Add three horizontal metric pills below character: +50 XP (yellow icon+number), 98% accuracy (green checkmark+number), 3 min (blue clock+number). Per rubric §E layout.
  - Improve secondary button affordance: add border (2px, rgba(0,0,0,0.12)) or increase bg opacity (0.85+) to make tappable. Ensure 44px+ touch target height.
  - Add tappable state to sticker card if interactive (zoom/view detail). Otherwise remove press handler and label as display-only reward.
  - Consider adding streak indicator: Day 5 streak! with flame icon + calendar mini-grid if applicable.

### src/features/progress/screens/LessonSummaryScreen.tsx  · `child` · **P1**
- **Purpose:** Lesson completion summary showing performance metrics (attempts, stars earned, words learned) with next-action buttons
- **Now:** Pastel green (#C5F1DD) background. LESSON DONE tag (14px uppercase), Great effort! headline (32px bold), Robot emotion=success (200px). Summary white card (24px radius, 18px padding) with three rows: emoji icon (22px) + icon circle (42x42px, tan bg #FFF5E6) + label+value. Rows: 8 English turns / 12 stars / 3 new friends. PrimaryCTA (coral #FF6F61) Keep going → + secondary ghost button (border, 2px light) Stop for today.
- **Issues:**
  - `P1` Headline Great effort! is generic, not dynamic per performance. Rubric §E requires performance-validated headlines (Perfect lesson! High scorer! Learning legend!) based on accuracy/speed metrics.
  - `P1` Metric pills horizontal row layout (icon+label+value) has inconsistent text colors. Label #5C4F77 (muted), value #2B2140 (dark) — visual hierarchy unclear. Rubric §4 requires Primary 1.5-2x size secondary. Values (18px) only 1.4x larger than labels (13px).
  - `P1` Secondary button Stop for today uses border-only style (2px light border, no background). Touch target may be unclear; lacks visual affordance. Per rubric §1 secondary should be 30-40% less prominent but still tappable.
  - `P2` No streak or progress ring visible. Rubric §10 Reward Celebration specifies streak isolation with flame icon + calendar grid. LessonSummaryScreen shows no progress context (e.g., Day 3 streak!) or progress to next milestone.
- **Redesign:**
  - Replace Great effort! with dynamic headline based on performance metrics. Query lesson API for accuracy % and time before rendering.
  - Increase visual hierarchy on metric pills: enlarge value font (22-28px), reduce label font (11-13px), use bolder weight on values (800 vs 600). Pair each metric with semantic color (yellow for tries, green for earned, blue for words).
  - Improve secondary button: add soft bg tint (rgba(0,0,0,0.05)) and keep border. Or use filled light pill style per rubric (secondary pill with light bg).
  - Add streak indicator card below metrics if applicable: flame icon + Day 3 streak (bold, large) + Keep it up! motivational copy. Use garden blue accent color.
  - Consider adding progress ring or milestone badge if child approaching level/tier threshold (e.g., Almost Level 5!).

### src/features/progress/screens/WordsPracticedScreen.tsx  · `child` · **P1**
- **Purpose:** Word-level progress showing stronger words vs words to revisit soon, with metrics (bar chart for strength, seeding indicators), practice CTA
- **Now:** Warm background (default page bg). PageHeader with back button + Today subtitle + Words Practiced title. Robot (emotion=happy, 80px) + SpeechBubble These words got stronger today. Two sections: STRONGER label + three WordTile cards (white bg, 20px radius, emoji icon 34px, word 20px bold, strength indicator with 2 filled bars + stronger label). VISIT AGAIN SOON label + 2 word tiles (same structure with visit again dot indicator). PrimaryCTA (yellow #FFC857, full-width) Practice 2 words.
- **Issues:**
  - `P1` Section labels (STRONGER VISIT AGAIN SOON) are uppercase captions lacking clear visual grouping. No section headers per rubric §5 Progressive Disclosure & Scannable Organization. Labels inline with emoji but no background/border to group related tiles.
  - `P1` Strength indicator (bar chart) uses hardcoded 2/3 filled logic (i<2 green : gray). No visual scale explanation. Rubric §4 Hierarchy via Scale — bars should be labeled (Strength: 2/3) or have legend explaining meaning. Users may not understand what bars represent.
  - `P1` WordTile touch targets unclear. Cards are flex:1 within row, likely 100-120px width on mobile. Height likely less than 44px minimum (fit-content). Per rubric §3 touch targets must be 44px minimum.
  - `P2` No clear primary vs secondary distinction between STRONGER and VISIT AGAIN sections. Both use same card styling; users dont know which to focus on. Rubric §1 requires hierarchy/color/size indicating STRONGER is primary.
- **Redesign:**
  - Add section grouping: wrap each section (STRONGER / VISIT AGAIN) in light-colored card or add border + background color to visually separate. Use subtle tint (e.g., #f5f5f5).
  - Add strength legend or label: display Strength: 2/3 below bars or add small icon/tooltip explaining bar meaning. Use semantic colors consistently (green=strong, yellow=growing, gray=new).
  - Increase WordTile touch targets: set min-height to 56px or add more vertical padding. Ensure text and icon centered within 44px+ square.
  - Visual hierarchy between sections: STRONGER primary (larger font, bolder, more prominent), VISIT AGAIN secondary (smaller, muted color, lighter styling). Or reorder with STRONGER first visually dominating.
  - Add practice progress indicator: show Practice 2 words button with checkmark or progress count (e.g., Practice 2 of 5 words).

### src/features/progress/screens/ReviewNeededScreen.tsx  · `child` · **P1**
- **Purpose:** Spaced-repetition nudge showing words needing review (visit again soon), with robot/speech bubble charm and practice CTA
- **Now:** Warm orange background (#FFE6BD). PageHeader back button + A friendly nudge subtitle + Lets visit again title. Robot (emotion=curious, 120px, accent #FFC857) + SpeechBubble 3 words miss you!. Word-list section (18px padding): three white word cards (20px radius, 14px padding), emoji icon (28px), word text (20px bold), Last seen X days ago label (12px muted), seedling icon on right (36x36px circle, orange bg #FFC857). PrimaryCTA (warm orange #FFC857) Practice together (full-width 48px+) + secondary ghost button (no bg, 16px font, muted text) Maybe later.
- **Issues:**
  - `P1` Secondary button Maybe later lacks affordance clarity. No border, no background, just text in muted color (#5C4F77). Rubric §1 secondary should be 30-40% less prominent but still tappable-looking. Should have border or slight bg tint.
  - `P1` Word cards use flexDirection=row with emoji (28px) on left but no clear visual separation. Rubric §5 Progressive Disclosure & Scannable Organization should group related info. Cards readable but lack hierarchy — icon/word/timestamp/seedling all same visual weight. Word should be larger/bolder; timestamp secondary.
  - `P2` SpeechBubble component styling unknown from code (imported but not defined). No clear affordance (tappable? animates?). If decorative label clearly. If interactive add press state.
  - `P2` No progress indicator on seedling icon. Seedling static orange circle (36x36px) on right but unclear if represents growth stage. Rubric §6 Information Architecture should show progress context (e.g., Ready to grow or Stage 1 seedling).
- **Redesign:**
  - Improve secondary button affordance: add border (1px, rgba(0,0,0,0.1)) and light bg tint (rgba(0,0,0,0.02)) to Maybe later. Or use secondary pill style (light gray bg) per DESIGN.md button rules.
  - Increase visual hierarchy in word cards: enlarge word text (24px, bold #2B2140), reduce timestamp font (11px, muted #5C4F77). Add subtle divider or spacing between word and timestamp. Keep seedling on right as fixed visual accent.
  - Verify SpeechBubble styling: ensure clear text formatting (white or light bg, dark text, rounded corners). If decorative label clearly. If interactive add onPress handler and press state feedback.
  - Add progress context to seedling: show Ready to grow! label or small badge next to seedling (e.g., Stage 1 or Ready to bloom). Tie to spaced-repetition algorithm output.
  - Consider adding count badge to PrimaryCTA (e.g., Practice 3 words instead of Practice together) to increase clarity of action scope.

---

## Course Feature Screens

_Mixed child and parent lanes. Screens are predominantly child-facing (Garden Blue palette) with no parent operational dashboard. Current design lacks clear two-lane separation and operational vs. playful intent clarity per GOOD-DESIGN-PRINCIPLES §12._


### CourseScreen.tsx  · `child` · **P1**
- **Purpose:** Course catalog entry point listing available courses/levels with locked/unlocked state indicator
- **Now:** White row cards (16px padding, 18px border-radius) with course title (800 weight, 18px dark), lesson count metadata (12px gray), and status text (14px warm orange or muted gray). Loading/error states show text messages. Uses inline styles with hardcoded colors (#2B2140, #5C4F77, #FF6F61, #8B8B96). No mascot anchor. One-column flat list layout.
- **Issues:**
  - `P0` Violates GOOD-DESIGN-PRINCIPLES §1 (One Primary Action): no visually dominant primary CTA per screen. Status text ('Continue'/'Locked') is secondary and competes with row container for interaction focus.
  - `P0` Violates GOOD-DESIGN-PRINCIPLES §12 (Two-Lane Visual Separation): uses colors that feel operationally neutral, not garden-playful. No child-lane Garden Blue palette tokens. Hardcoded hex colors bypass design system.
  - `P1` Violates GOOD-DESIGN-PRINCIPLES §2 (State Is Visible Before Decoration): locked state shown by opacity (0.62) + text only. Colorblind users may not distinguish locked vs. unlocked. Add icon or pattern visual cue before text.
  - `P1` Missing hero card pattern per GOOD-DESIGN-PRINCIPLES §6 (Information Architecture). Catalog should have a hero section at top (60-70% fold) highlighting 'Today's course' or current progression before list of courses.
  - `P2` No status bar badges (streak, XP, level) per GOOD-DESIGN-PRINCIPLES §6. Would ground child in learning context and celebrate progress.
- **Redesign:**
  - Add Garden Blue palette tokens (sky-blue bg, warm yellow primary action). Remove hardcoded hex colors.
  - Restructure as: (1) top status bar with streak flame + XP badge, (2) hero card showing 'Today's Course' with 60-70% viewport height, warm primary CTA, (3) list of other courses below.
  - Make 'Continue' button 48px primary pill button, not secondary text. Full-width or prominent within card.
  - Add lock icon + pattern visual to locked rows (not opacity + text alone). Pair color with semantic meaning.
  - Add playful copy ('Almost there!' vs. generic 'Locked'). Warm tone throughout.

### DailyMissionScreen.tsx  · `child` · **P1**
- **Purpose:** Daily mission checklist showing 3 tasks (lesson, review, game) with completion state, robot mascot, and reward progress tracker
- **Now:** Robot component (180px size) centered at top. White mission cards (14px padding, 20px border-radius) with icon-badge (44x44 rounded, color-coded: green for done, orange for pending), title (17px bold), subtitle (13px gray). Reward card (16px padding, 24px radius) showing gift icon, title, subtitle, and progress (1/3). Uses PrimaryCTA component (48px warm button). Inline styles with hardcoded colors.
- **Issues:**
  - `P0` Violates GOOD-DESIGN-PRINCIPLES §3 (Mobile-First Density): excessive horizontal padding (24px left/right) reduces usable width, especially on small phones. Line-length for mission titles and subtitles may exceed 38 chars per parent rule.
  - `P1` Violates GOOD-DESIGN-PRINCIPLES §7 (Consistent Interactive Affordances): mission row has no clear tap feedback. Icon-badge + text touch target unclear; no hover/active state styling defined.
  - `P1` Violates GOOD-DESIGN-PRINCIPLES §2 (State Is Visible Before Decoration): completed mission marked by green icon + check, but strikethrough text color (#8B8B96) is subtle. State should be more obvious (e.g., dimming entire card or adding 'Complete' badge).
  - `P2` Inconsistent card styling: mission rows use 20px radius, reward card uses 24px, PageHeader likely different. Token-driven border-radius missing.
  - `P2` Missing celebration affordance per GOOD-DESIGN-PRINCIPLES §10 (Reward Celebration): reward card shows progress (1/3) but no celebration animation or dynamic headline on completion. Copy is generic ('Finish all 3').
- **Redesign:**
  - Adopt consistent card border-radius from design tokens (e.g., 20px standard, 24px hero).
  - Increase touch target clarity: make entire mission row tappable with clear active state (scale, shadow, color shift within 100ms).
  - Strengthen done-state visual: add full-card opacity reduction (0.5) or 'Complete' badge + icon, not just strikethrough text.
  - Reduce horizontal padding to 16px to improve density on small phones; constrain line-length to <38 chars.
  - Add dynamic headline on reward progress (e.g., 'Almost there!' at 2/3, not just 'Finish all 3').
  - Add micro-animation on reward progress increment (fill animation or confetti respecting prefers-reduced-motion).

### LessonDetailScreen.tsx  · `child` · **P1**
- **Purpose:** Lesson overview showing mascot, title, activities list (listen/say/game), duration/XP metrics, and start CTA
- **Now:** Robot centered (170px). SpeechBubble component (warm text). Section label (13px uppercase, gray, 1.2px letter-spacing). Activity rows: white cards (14px padding, 18px radius) with emoji icon (22px), title (17px bold), count (13px gray). Meta line: icons + text (13px gray). PrimaryCTA button (warm color, 48px). Uses Box + Text primitives. Hardcoded colors (#2B2140, #FF6F61, etc.).
- **Issues:**
  - `P0` Violates GOOD-DESIGN-PRINCIPLES §8 (Accessibility): activity count (×5) is small (13px) and uses color (#8B8B96) as only differentiator. Touch target for activity rows is 56px+ but visual hierarchy is flat — all activities equally weighted.
  - `P1` Violates GOOD-DESIGN-PRINCIPLES §6 (Information Architecture): activities listed at same visual weight as if equally important. Primary activity (listen) should be visually dominant (1.5–2x secondary).
  - `P1` Missing progress indicator per GOOD-DESIGN-PRINCIPLES §9 (Lesson Controls): no step indicator (e.g., 'Step 1 of X') at top showing lesson position within unit.
  - `P2` Meta line (duration + XP) uses bullet separator (4px dot) which is not a semantic separator. Use divider icon or text ('·') instead.
  - `P2` SpeechBubble styling not documented in DESIGN.md. Border-radius, padding, and font may vary from canonical component library.
- **Redesign:**
  - Restructure activity list: highlight primary activity (Listen) with larger icon (28-32px), bold title (20px), and nested sub-activities below (Say back ×5, Game ×1).
  - Add thin progress bar or dot carousel at top: 'Step 1 of 5' or 3 dots, 1 filled, others outlined.
  - Increase touch target clarity for activity rows: add active state (scale 0.95, shadow shift) on tap.
  - Replace bullet separator with semantic icon (÷ or thin dash).
  - Verify SpeechBubble component inherits Garden Blue palette + consistent border-radius (e.g., 18px).
  - Add i18n labels for 'activities' section heading (currently hardcoded).

### LessonListScreen.tsx  · `child` · **P2**
- **Purpose:** Paginated list of lessons within a unit, with duration/word-count metadata and template i18n
- **Now:** PageHeader component (subtitle 'All lessons', title 'Hello Friends'). Lesson rows: white cards (16px padding, 18px radius) with title (18px bold, #2B2140), metadata (12px gray, translated template: 'X min · Y words'). Gap between rows: 10px. Uses i18n service (translateTemplate) for duration/word labels. Hardcoded colors; no Garden Blue tokens.
- **Issues:**
  - `P1` Violates GOOD-DESIGN-PRINCIPLES §2 (State Is Visible Before Decoration): no visual indicator of lesson lock state, current lesson, or completion state. All lessons appear equally interactive.
  - `P1` Violates GOOD-DESIGN-PRINCIPLES §3 (Mobile-First Density): gap between rows is only 10px, creating dense packed list. Should be 12-16px per GOOD-DESIGN-PRINCIPLES §3.
  - `P2` Missing hero pattern per GOOD-DESIGN-PRINCIPLES §6: no 'Today's Lesson' or current-lesson highlight card above the list.
  - `P2` Metadata translation is functional but could be clearer: '5 min · 3 words' doesn't visually prioritize which metric matters more (duration vs. vocabulary count).
- **Redesign:**
  - Add lesson status icons: checkmark circle for done, lock for locked, flame/star for current. Color-code each state (green, gray, warm).
  - Increase gap between rows to 14px for breathing room.
  - Add hero card at top showing 'Today's Lesson' or current lesson (full-width, 60-70% fold).
  - Improve metadata hierarchy: use icon + text for duration and words (distinct visual weight).
  - Add lock badge or opacity reduction (0.6) for locked lessons; ensure text label confirms state.

### LevelScreen.tsx  · `child` · **P0**
- **Purpose:** Level progression map showing unit nodes (done/current/locked states) in a visual tree layout with unit names and mascot anchor
- **Now:** PageHeader. Robot (80px) + SpeechBubble. Units rendered as circular nodes (88-112px) with state-dependent colors (locked: #E5E0D6, done: #6CE2B6, current: color + shadow). Locked nodes show lock icon, done nodes show checkmark, current nodes show emoji. Nodes arranged vertically with alternating left/right alignment (i % 2). Unit labels below nodes. Review state shows badge (!) on node. Uses hardcoded colors; no design tokens.
- **Issues:**
  - `P0` Violates GOOD-DESIGN-PRINCIPLES §11 (Device State Clarity) and §2 (State Is Visible Before Decoration): node colors alone distinguish state (locked = beige, done = green, current = custom color). Color-blind users cannot distinguish locked vs. unlocked nodes. Add text label or pattern (e.g., lock icon + opacity).
  - `P0` Violates GOOD-DESIGN-PRINCIPLES §9 (Lesson Controls): current-state node is large (112px) and has drop shadow, but UI hierarchy is unclear. Current unit should have explicit text label ('Now') or highlighted badge, not just visual size/shadow.
  - `P1` Violates GOOD-DESIGN-PRINCIPLES §7 (Consistent Interactive Affordances): tap feedback on nodes not defined. Locked nodes are disabled (activeOpacity={0.8}) but no visual affordance of disabled state beyond lower opacity on unlock.
  - `P1` Review badge (!) is small (30px circle) and positioned top-right with 3px border. Lacks context ('! = Review needed'). Should have tooltip or adjacent text label.
  - `P2` Vertical layout with alternating left/right alignment may cause layout shift on rotation or different screen sizes. No responsive breakpoints documented.
- **Redesign:**
  - Add semantic state labels: 'Complete ✓', 'Now →', or 'Locked 🔒' as text badges inside or near nodes, not just color.
  - Add explicit visual feedback on node press: scale (0.95), shadow shift, or border highlight.
  - Improve review badge: enlarge (40px), add tooltip text ('Review: 2 words'), or use adjacent label.
  - Strengthen current-unit affordance: add 'Now playing' text below node + animated pulse or glow effect (respecting prefers-reduced-motion).
  - Document responsive behavior for landscape/tablet modes.
  - Replace hardcoded colors with Garden Blue palette tokens.

### ReviewEntryScreen.tsx  · `child` · **P1**
- **Purpose:** Quick review entry showing words to revisit in a 2-column grid with emoji, word text, and practice indicator
- **Now:** PageHeader (subtitle 'Quick review', title 'Words to revisit'). Robot (170px) centered + SpeechBubble. Word cards: white (20px radius, 18px padding, shadow) in 2-column flex layout (~47% width each, 12px gap). Each card shows emoji (34px), word (22px bold), dot + 'Practice' label (12px gray). PrimaryCTA button (warm #FFC857) at bottom.
- **Issues:**
  - `P1` Violates GOOD-DESIGN-PRINCIPLES §3 (Mobile-First Density): 2-column grid may cause word cards to be too narrow on small phones (<375px). Text and emoji may truncate or stack awkwardly. Add responsive breakpoint (1 column on <375px, 2 columns on ≥375px).
  - `P1` Violates GOOD-DESIGN-PRINCIPLES §7 (Consistent Interactive Affordances): word cards have no tap feedback or clear indication they are tappable. Are cards clickable to preview or just visual display?
  - `P1` Missing celebration affordance per GOOD-DESIGN-PRINCIPLES §10: 'Quick review' title feels generic. Should have dynamic headline based on context ('4 friends want to chat!' vs. generic 'Words to revisit').
  - `P2` Inconsistent card styling: word cards use 20px radius, hero-level cards elsewhere use 24-28px. Token-driven radius missing.
- **Redesign:**
  - Add responsive grid: 1 column on <375px screens, 2 columns on ≥375px. Use CSS media query or RN dimension listener.
  - Clarify card interactivity: if tappable, add onPress handler + active state (scale, shadow). If display-only, document no interaction.
  - Add dynamic headline: 'Emma's 4 best friends want to say hi!' (warm, playful tone).
  - Unify card border-radius with design tokens (e.g., 20px standard card, 24px hero).
  - Add word-count badge or indicator if more words exist ('4 words · Ready to go!').

### UnitScreen.tsx  · `child` · **P0**
- **Purpose:** Unit overview showing summary stats (progress bar, word/phrase counts), lesson list with state indicators, and replay/now badges
- **Now:** PageHeader. Summary card: white (24px radius, 18px padding), flex-row layout with stats (14px gray text '2 of 5 done', MiniProgress component, two chips for words/phrases) and Robot (86px) right-aligned. Lesson rows: white (22px radius, 14px padding), flex-row with icon-badge (54x54 circle, state-colored), lesson meta (uppercase 12px label, 18px bold title), and conditional badges ('NOW' pill or 'Replay' border-pill). Uses hardcoded colors, gap={12} between rows.
- **Issues:**
  - `P0` Violates GOOD-DESIGN-PRINCIPLES §6 (Information Architecture): progress summary card and lesson list are at same visual weight. Summary card should dominate (hero pattern, 60-70% fold) before lesson list scrolls below.
  - `P1` Violates GOOD-DESIGN-PRINCIPLES §2 (State Is Visible Before Decoration): locked lessons have reduced opacity (0.6) but no adjacent text label. Colorblind users cannot distinguish locked state reliably. Add lock icon + 'Locked' text.
  - `P1` Violates GOOD-DESIGN-PRINCIPLES §1 (One Primary Action): no clear primary CTA visible at bottom or inline with unit. 'NOW' badge hints at current lesson but no 'Start Lesson' button visible. User may be unsure what to do next.
  - `P1` Inconsistent badge styling: 'NOW' badge is warm pill (border-radius 999), 'Replay' badge is outlined pill. Both should use same design token for button styles.
  - `P2` Summary card layout (flex-row with Robot on right) may cause text truncation on narrow screens. Line-length for '2 of 5 done' + micro-progress may exceed layout bounds.
- **Redesign:**
  - Restructure as hero card + lesson list: (1) summary card 60-70% viewport at top, (2) lesson rows below.
  - Add lock icon + 'Locked' text to locked lesson rows. Do not rely on opacity alone.
  - Add explicit primary CTA: 'Continue to Lesson 3' or 'Start Now' button (48px, full-width warm pill) positioned above or inline with current lesson.
  - Unify badge/button styling: use design tokens for pill shapes (border-radius: 999px), colors (primary = warm, secondary = outlined), and heights (48px standard).
  - Test summary card layout on narrow screens (<320px). Ensure Robot doesn't overflow or text truncate.
  - Add optional section header ('Lessons in this unit') above lesson rows for clarity.

---

## course-library

_Mixed-lane area spanning child and parent surfaces. Child screens (CourseLibraryScreen, CourseDetailScreen, CompanionScreen, CourseCompleteScreen) use Garden Blue palette (CL tokens: #F5F5F2 bg, white card, navy ink, accent blue). Parent screens (BuyCourseScreen, CourseLockedScreen, SendToRobotScreen, NeedsSyncScreen, RobotReadyScreen) use warm operational palette with CL tokens that shift based on context. UnlockConfirmModal is parent-facing with security context (lock icon). State visibility is present via CLChip and LCD emotion indicators but lacks full semantic labeling in some screens. Primary actions are generally clear (DeviceBigBtn), but secondary action density varies._


### CourseLibraryScreen.tsx  · `child` · **P0**
- **Purpose:** Child-facing course library discovery and browsing. Primary action: tap a course card to view details. Shows list of available courses with icons, synced/locked state indicators, and metadata.
- **Now:** Sky-blue-ish hero section with heading 'Course Library' (navy #2D3436), intro text in secondary gray (#636E72). Search input 52px height, 26px border-radius, white bg with shadow. Course cards in flex row with 56px images, title (14px), meta (12px), and status icons (CheckCircle2, Lock, ChevronRight). States: loading (spinner), error (text), empty (text message). Root bg #FAF5EB, card borderRadius 28, shadow colored #A98F77. CL tokens used throughout (ink, ink2, ink3 colors from CL.ts).
- **Issues:**
  - `P0` No clear primary action per screen. Search input is foreground element but no CTA button. Library browsing is passive discovery — users must tap cards. Principle §1 violated: should have one visually dominant action (e.g., 'Recommended lesson' card at top or 'Browse all' primary button).
  - `P0` State visibility incomplete. Lock icons appear on cards but lack text label ('Locked', 'In progress', 'Completed'). Color-only lock state violates Principle §2 (state via text + icon, not color alone). Child may not understand why a course is unavailable.
  - `P1` Card density and visual hierarchy weak. All course cards are uniform size/shadow. No visual weight differentiation between recommended, new, and in-progress courses. Principle §5 (progressive disclosure) suggests featured course should dominate first fold, then grid below.
  - `P1` Missing hero section narrative. GOOD-DESIGN-PRINCIPLES §A.1 calls for diorama-style scene (Teebot character) at 30-40% and hero lesson card. Current hero is text-only. Opportunity to delight with character and seasonal context ('Summer colors' or 'Meet new friends').
  - `P2` Meta text (lessons, weeks) shown on each card but could use scannable badges (small colored chips) to speed parsing. Current format is text-dense for young learners.
- **Redesign:**
  - Add a featured 'Today's suggested course' card at top (60-65% fold) with Teebot character emotion matching course theme, warm button ('Start today'), and progress ring. GOOD-DESIGN-PRINCIPLES §A.1 diorama pattern.
  - Below featured card, show 3-5 course grid (80-120px thumbnails, color-coded by theme: blue, purple, pink). Lock icons paired with text ('Locked', 'In progress', 'Complete'). Principle §2.
  - Elevate primary action: move 'Search' to secondary affordance or remove in favor of 'Featured + grid' discovery. If search stays, pair with visible CTA ('Browse all courses').
  - Replace card icon sets with CLChip state badges (already defined CLChip.tsx with 6 state styles). Pair color with label text.
  - Verify touch targets: course cards should be ≥44px tall (currently flex row, may be too dense for child tap accuracy). GOOD-DESIGN-PRINCIPLES §3.

### CourseDetailScreen.tsx  · `child` · **P0**
- **Purpose:** Child-facing course detail & enrollment preview. Shows course info (title, blurb, lessons, pacing), LCD face emotion (lesson feel), and key learning outcomes. Primary action: 'Add to Robot' to enroll.
- **Now:** DeviceShell wrapper (nav chrome). Hero card: LCD face 140px (emotion param), CLChip state badge, title (20px serif), blurb (13px). 'What Robot will teach' section: 4 emoji items (🗣️ 🎯 💛 🔢) in flex list. Stats row: three stat cards (Lessons, Pace, Per day) in flex. Note card: parent-facing disclaimer. Primary button 'Add to Robot' (DeviceBigBtn), secondary 'Back to library'. CL.card bg, CL.hair borders, borderRadius 14, CL tokens for text colors.
- **Issues:**
  - `P0` Primary action 'Add to Robot' is visually clear (large DeviceBigBtn) but context state unclear: is course already added? Locked? In progress? CLChip shows state but user must parse chip color + label. Principle §2 violated: state should precede action visibility. If locked, button should be greyed with 'Locked until...' helper text. If added, button text should change to 'Open in Robot' or similar.
  - `P1` Emoji-only learning outcomes (🗣️ 🎯 💛 🔢) rely on visual pattern recognition for child comprehension. 5-8yo may not infer 'speaking', 'goal-setting', 'emotional learning', 'counting'. Add brief labels or replace with icons + text.
  - `P1` Parent note card (bottom) breaks child lane aesthetic. Text is operational/parental in tone ('Robot will suggest this when they're ready...'). Child should see only child-centric copy and emotion. Parent context should never leak to child surface.
  - `P1` Stats row (Lessons, Pace, Per day) uses small cards (12-13px meta text). Hierarchy is weak — stats should be larger and more scannable. Principle §4 (hierarchy via scale). Consider 20-24px numbers with small label below.
  - `P2` Missing visual connection between LCD emotion and course theme. Emotion is rendered but not explained — child doesn't know if 'happy' means 'fun' or just the emotion of the robot character in the lesson.
- **Redesign:**
  - Gate primary action on course state: if locked, show disabled button + 'Complete 'Hello Friends' first' label (Principle §2). If added, change button to 'View in Robot' with secondary 'Remove' (non-prominent). If new, show 'Add to Robot' as active.
  - Replace emoji-only outcomes with icon + label: use Feather icons (MessageCircle for 'Speaking', Target for 'Goal-setting', Heart for 'Feelings', Numbers for 'Counting'). Each 20-24px tall. Principle §4.
  - Move parent note to a separate parent-facing card or remove entirely from child surface. If parity needed, show child-centric copy only ('This course teaches you to...') and hide parent rationale.
  - Enlarge stats row: 24-28px numbers (white on CL.card bg), small 11px labels below. Use CLChip-style badges instead of stat cards to reduce visual weight.
  - Add brief course theme explanation: 'This course is all about animals — you'll learn sounds, move like them, and share favorites.' Connects emotion + content for child.
  - Ensure LCD face emotion matches course category (happy for playful, calm for learning, curious for exploration). Document emotion→theme mapping in CL component guidelines.

### CompanionScreen.tsx  · `child` · **P1**
- **Purpose:** Live mirror of robot's LCD face during lesson execution (polling every 2.5s). Parent watches alongside child to understand lesson progress and robot state (speaking, listening, thinking). Dismisses when assignment null after live observed. Primary action: 'Volume' or 'Pause' row buttons (if needed); main purpose is passive monitoring.
- **Now:** Dark hero area: RobotDevice emotion (220px) driven by live state (speak/happy/think), live indicator (red dot + 'Live' label, uppercase 11px). Progress card: lesson title, instructional text ('Robot is leading...'). Section 'If you need to' with two rows (volume, pause), each with icon + label. Polling every 2.5s via getCurrentAssignment; updates emotion based on state machine. #0E1116 dark bg for LCD, CL tokens for text. Completion detected when assignment null after sawLiveRef=true.
- **Issues:**
  - `P0` Primary action intent ambiguous. No clear CTA button. 'Live' indicator is passive. User (parent) may not know what to do if they want to volume-adjust or pause — row buttons ('volume', 'pause') are secondary affordances. Principle §1 violated: one primary action should be obvious. If this is a monitoring-only screen, CTA should be 'Done watching' or 'Go back'. If interactive, 'Pause lesson' should be primary.
  - `P1` Lesson title and instructional text ('Robot is leading your child through...') are present but may be too small (13px) for quick scanning during active lesson. Parent is watching their child interact with robot; copy should be highly visible and brief.
  - `P1` State transitions (emotion changes) driven by live data but not explicitly labeled. Parent sees robot emotion shift (speak → happy) but no text confirmation ('Lesson progressing...' → 'Lesson complete'). Principle §2: state via text + icon, not visual change alone.
  - `P2` 'If you need to' section feels like a fallback menu. Rows (volume, pause) are secondary but positioned prominently. Hierarchy suggests these are optional, yet they're styled as cards. Could be ghost buttons or collapsed menu.
- **Redesign:**
  - Clarify screen intent: is this active monitoring (parent watches) or interactive control? If monitoring only, CTA should be 'Back to dashboard' (secondary) and live indicator should be prominent. If interactive, 'Pause lesson' should be primary button at bottom.
  - Enlarge and bold lesson title (18-20px) and replace generic 'Robot is leading...' with dynamic state text: 'Robot is listening to your child' or 'Robot is celebrating!' Principle §2.
  - Add explicit state label above emotion: color-coded badge (speaking → cyan + text 'Listening', listening → yellow + 'Your turn', happy → green + 'Celebrating'). Principle §2.
  - Move 'If you need to' rows to a collapsed section or footer area. If interactive, elevate 'Pause' to primary button; 'Volume' to secondary control.
  - Ensure accessibility: all state changes (emotion, badge, text) happen simultaneously. No visual change without text confirmation.

### CourseCompleteScreen.tsx  · `child` · **P0**
- **Purpose:** Lesson completion celebration. Child sees earned words, confidence-sorted (green/yellow chips), time spent, progress metrics. Reinforces learning loop without noise or dark patterns. Primary action: 'Plan tomorrow's lesson', secondary 'Done'.
- **Now:** Hero: RobotDevice emotion='celebrate' (200px+), celebrates completion. Heading 'A lovely 4 minutes' (24px serif), sub-text. Stats grid 2x2: Words, Tried out loud, Time, Words to revisit. Words section: flex-wrapped colored chips (green #E6F4EE/#1F8A5B for confident, yellow #FFF4D9/#8A6A12 for learning). Legend explains chip colors. Buttons: 'Plan tomorrow's lesson' (primary, warm color), 'Done' (secondary). Styling: 12px wordChip borderRadius, white/pastels.
- **Issues:**
  - `P0` Color-only chip distinction (green vs yellow) violates Principle §2. Child sees green and yellow word chips but legend is small (likely 11-12px) and requires reading. For 5-8yo, add icon (✓ for confident, 🌱 for learning) or label each chip inline. Principle §8 (accessibility).
  - `P1` Stats grid (2x2) is dense and text-heavy. Four metrics (Words, Tried out loud, Time, Words to revisit) compete for attention. One metric should visually dominate (e.g., 'Words learned: 12' at 32px, others secondary at 14px). Principle §4 (hierarchy via scale).
  - `P1` Celebration reward feels earned (RobotDevice emotion) but micro-interaction missing. No badge reveal animation, no progress ring fill, no confetti pulse (even respecting prefers-reduced-motion). Principle §10: 'reward celebration is earned, legible, and respectful'. Current implementation is static.
  - `P1` 'Plan tomorrow's lesson' button is warm and primary, but next action is unclear to child. Button copy should be child-centric: 'Let's learn again tomorrow' or 'See you tomorrow!'. Current copy sounds parental.
  - `P2` Stats labels ('Tried out loud', 'Words to revisit') are operational language. For child, use warmer labels: 'Your voice', 'Practice more'.
- **Redesign:**
  - Add icon + label to word chips: green ✓ 'Confident' and yellow 🌱 'Learning'. Replace legend with inline chip format or brief caption ('Green = you know it, Yellow = let's practice more'). Principle §2, §8.
  - Rebalance stats grid: enlarge primary metric (words learned) to 28-32px, secondary metrics (time, tried aloud) to 16-18px. Use visual weight (size + color) to establish hierarchy. Principle §4.
  - Add micro-interaction: badge reveal animation on screen load (bouncy scale-in, 300ms, respects prefers-reduced-motion). Pair with subtle confetti sparkle respecting OS setting. Principle §10.
  - Change button copy from 'Plan tomorrow's lesson' to 'Let's learn more tomorrow' (child voice). Keep secondary 'Done for today' (child friendly).
  - Relabel stats: 'Words learned' (primary, big), 'Your voice' (tried aloud), 'Session time' (duration), 'Practice more' (words to revisit).
  - Verify touch targets: stat cards and word chips should be ≥44px tall. Current implementation may be too dense. Principle §3, §8.

### BuyCourseScreen.tsx  · `operational` · **P1**
- **Purpose:** Parent-facing course purchase confirmation (currently free-tier placeholder). Shows course summary (LCD face, title, metadata), free-course banner, parent-centric copy, primary action 'Add free course'.
- **Now:** DeviceShell wrapper. Course tile: LCD face 64px (accent #FF6F61), title (14px, 600wt), meta (12px, 600wt). Free-mode card: 'Included for now' (700wt), blurb text. Promise text: 'Your child sees only courses you've added...' CL.card bg, CL.hair borders, borderRadius 14. Buttons: 'Add free course' (primary), 'Not now' (secondary). Minimal parent-operational feel.
- **Issues:**
  - `P0` Lane ambiguity: screen uses CL tokens (child-lane colors #FFFFFF card, navy ink) but content is parent-facing (parent permission check). DESIGN.md §12 prohibits lane mixing. Should use parent tokens (Wispr Flow palette: warm off-white bg, serif headings, purple accents) not child tokens. Currently feels like child surface dressed as parent operational.
  - `P1` Course preview (LCD + title + metadata) feels sparse. Parent may want to know: age range, lesson count, pacing, curriculum link, or skill focus. Current view is minimal — parent buying decision lacks context. Add brief description or defer to CourseDetailScreen.
  - `P1` Free-mode banner ('Included for now') is placeholder UI. Copy is vague: 'courses are free in this build'. Parent doesn't know pricing timeline or SKU structure. Consider: remove placeholder and show real pricing UI, or add date ('Free until [date]') and upgrade path.
  - `P2` Primary action button text 'Add free course' is accurate but not warm. Parent voice: 'Add to Robot' or 'Let's start this course' feels more conversational.
- **Redesign:**
  - Migrate to parent token set (Wispr Flow): warm off-white bg, serif heading, charcoal button, purple accents. Principle §12 (lane separation).
  - Expand course preview: add age range (e.g., '4-6 years'), curriculum tags ('Speaking + Listening'), and 1-2 sentence parent-centric description ('Builds foundational listening and response skills in familiar contexts'). GOOD-DESIGN-PRINCIPLES §4 (hierarchy via scale).
  - Replace placeholder 'Included for now' with real pricing UI or timeline. If free, say 'Free in early access — [date]. Upgrade to unlock more.' If future premium, show: 'Premium course — $X.99/month. Free trial first 3 days.'. Principle §2 (state visibility).
  - Change primary button copy to 'Add to Robot' (consistent with CourseDetailScreen) or 'Start learning' (warmer). Keep 'Not now' as secondary.
  - Consider: is this screen necessary or should 'Add' CTA live on CourseDetailScreen only? If buy flow adds friction, test removing this intermediate step.

### CourseLockedScreen.tsx  · `operational` · **P0**
- **Purpose:** Parent-facing course prerequisite explanation. Shows locked state (LCD face opacity 0.5, lock badge), course metadata, 'Why is this locked?' explanation, and suggestions (try easier course). Primary action: 'Add free course' (allow override), secondary: 'Back to library', 'Contact support'.
- **Now:** DeviceShell title 'Locked for now'. Hero card: LCD face 140px (opacity 0.5), lock badge (white stroke SVG, 'Locked' uppercase label, transparent bg). Chip row: CLChip state='locked' (purple bg, label), ages text. Title (20px), blurb (13px). 'Why is this locked?' explanation card (#F8F6F1 bg). 'Try first' section: link to easier course. Three buttons: 'Add free course' (primary), 'Back to library' (secondary), 'Contact support' (secondary). CL tokens used (card, hair, ink, ink2, ink3).
- **Issues:**
  - `P0` Lane ambiguity: uses child tokens (CL palette) but content is parent-operational ('Why is this locked?' explanatory text). Parent needs clear reasoning, but tokens/styling feel child-lane. Should use Wispr Flow palette for parent context. Principle §12.
  - `P0` Three buttons create choice paralysis. 'Add free course' (primary), 'Back to library' (secondary), 'Contact support' (secondary) are visually indistinct (all DeviceBigBtn secondary style). Principle §1: one primary action. Clear hierarchy should be: 'Try [easier course] first' (primary), 'Back to library' (secondary), 'Contact support' (ghosted or collapsed).
  - `P1` Lock badge overlay on LCD is subtle (white stroke, small 11px text). Parent may miss the 'Locked' state at a glance. Badge should be more prominent (larger, color-filled, not just stroke). CLChip (already defined) would be clearer than custom SVG badge.
  - `P1` 'Why is this locked?' explanation is educational but generic example: 'Story Time uses past-tense...Robot will suggest when ready after Hello Friends.' Parent doesn't know: when is 'ready'? How long? Can I unlock early? Explanation lacks clarity.
  - `P1` CTA 'Add free course' contradicts 'Locked' state. If locked, button should be disabled with tooltip 'Complete Hello Friends first.' Current button text misleads parent — it implies they can add a locked course.
- **Redesign:**
  - Migrate to parent token set (Wispr Flow palette). Warm bg, serif heading, charcoal buttons, muted colors. Principle §12.
  - Replace custom lock badge with CLChip state='locked' for visual consistency and accessibility. Ensure badge is color-filled (purple from CLChip map) not just stroke.
  - Rebalance button hierarchy: primary 'Try Hello Friends first' (with course preview), secondary 'Back to library', tertiary/ghosted 'Contact support'. Remove confusing 'Add free course' button (course is locked — allow no action or show disabled state with reasoning).
  - Enhance 'Why is this locked?' explanation: add specificity. 'Story Time builds on concepts from Hello Friends. We recommend completing Hello Friends (usually 2-3 weeks) before starting. [Learn more →]'. Include estimated timeline.
  - Add 'Unlock early' disclosure for accessibility: 'If your child is ready, contact support to unlock manually.' This acknowledges parental override need.
  - Verify accessibility: lock badge should have aria-label 'Locked: prerequisite course required.' CLChip already supports this.

### SendToRobotScreen.tsx  · `operational` · **P1**
- **Purpose:** Parent selects lesson and child for today's session. Fetches published course catalog and lessons. Multi-child household support (picker row). Multi-course support (picker rows). Lesson selection with readiness state (manifestReady, profile validation). Primary action: 'Send to Robot' (disabled until lesson ready and child selected). Handles error states (no child, no device, catalog load failures).
- **Now:** DeviceShell title 'Today's lesson'. Intro text (13px, 20px lineHeight). Conditional child picker (if >1 child): rows with name, checkmark on selected. Conditional course picker (if >1 course): rows with title, lesson count meta, checkmark on selected. Lesson picker: rows with LCDPreview (48px), title, meta ('Ready to send' or 'Preparing on server'), optional fitMeta, checkmark on selected. States: loading (text 'Loading lessons…'), empty (text 'No published courses yet...'), error (error.message), ready (picker rows). Error text inline (red #C0392B). Primary button 'Send to Robot' (disabled=!canSend), secondary 'Pick a different lesson'. CL tokens for colors (ink, ink2, ink3, card, hair, accent for checkmark).
- **Issues:**
  - `P0` No clear primary visual action until child + lesson selected. Button starts disabled. Parent opens screen and sees disabled button — no guidance on what to do first. Principle §1: primary action should guide user. Add instructional text or highlight 'Pick a lesson' as the first action (maybe section header 'Step 1: Choose your child' with visual indicator).
  - `P1` Three picker sections (child, course, lesson) create dense list UI. On small phones (320px width), parsing three sections + rows may be overwhelming. Progressive disclosure: show child picker only if >1 child (good), but course + lesson both mandatory. Consider collapsing course picker into breadcrumb if only 1 course.
  - `P1` Lesson status ('Ready to send' vs 'Preparing on server') uses text only. Parent doesn't know: does 'Preparing' mean wait 30 seconds or 10 minutes? Add visual indicator (spinner, progress % or time estimate). Principle §7 (feedback within 100-200ms).
  - `P1` Row height/touch target may be too small. Each picker row (pickRow style: paddingVertical 12px) = ~48px total, acceptable, but visual density is high. No whitespace between sections. Principle §3 (scalable whitespace: 16-24px padding).
  - `P1` Error handling shows text ('Add a child first', 'No lessons ready...') but no recovery path. Parent doesn't know: click where to add a child? Go to settings? Back button? Error copy should include action: 'Add a child: [Settings button]' or 'Go to: Device Home'.
- **Redesign:**
  - Add instructional header: 'Pick a lesson to send (Step 1 → Step 2 → Step 3)' with visual progress indicator (3 circles, highlight current step). Guides parent through picker flow. Principle §1, §5.
  - Enhance section labels with visual hierarchy: use larger fonts, bold, and color (purple accent) for 'Child', 'Course', 'Lesson' headers. Principle §4.
  - Add 'Preparing...' visual: spinner icon + animated text ('Preparing · 30%') or countdown timer ('Ready in ~2 min') for lessons in PRELOAD state. Principle §7.
  - Increase section spacing: paddingTop 20-24px between sections (child/course/lesson pickers) to aid scanability. Principle §3.
  - Enhance error copy with recovery action: 'Add a child to this household before sending a lesson. [Go to Settings] or [Cancel and go back]'. Use button or link affordance. Principle §2.
  - Consider: collapse course picker to breadcrumb if only 1 published course (show 'Lesson from: [Course name]' instead of full picker). Reduces visual load. Principle §5.
  - Verify touch targets: picker rows should be ≥44px (currently 12px padding top+bottom = ~48px with text height, acceptable but tight). Test on 6yo motor skills (hit rate <80% = too small).

### NeedsSyncScreen.tsx  · `operational` · **P1**
- **Purpose:** Robot is offline; course enroll is pending sync. Shows pending items (course + today's lesson waiting to send) and troubleshooting steps. Primary action: 'Reconnect Robot now', secondary: 'I'll do it later'. Handles reconnection attempt with sync check (getRobotSyncStatus).
- **Now:** DeviceShell title 'Robot needs to catch up'. Hero: RobotDevice emotion='reconnect' (170px), CLChip state='needs_sync' (tan/orange colors from CLChip map). Heading 'Robot is offline right now' (20px), sub text. 'Waiting to send' section: pendingCard with two rows (course + today's lesson), LCDPreview 56px, title/meta text. 'Try this' section: DeviceRow (icon + title + body text) x3: battery check, network check, restart. Note text. Optional syncMsg (red #C0392B). Buttons: 'Reconnect Robot now' (primary), 'I'll do it later' (secondary). CL tokens (card, hair, ink, ink2, ink3).
- **Issues:**
  - `P0` Primary action 'Reconnect Robot now' is only visual CTA, but screen is informational (robot offline). User may not know: does 'Reconnect' require manual WiFi setup? Or just app-side polling? Principle §2: state should be explicit. Add clarity: 'Reconnect Robot now: Check WiFi and battery, then tap to retry.' Or split into two actions: 'Go to WiFi Settings' (primary action), 'Retry' (secondary).
  - `P1` Troubleshooting 'Try this' section (3 DeviceRow items) is static instruction list with emoji icons. Parent may not understand: are these steps sequential or parallel? Must parent complete all three or just one? Add numbering (Step 1, Step 2, etc.) or clarify: 'If your WiFi changed, update Robot connection. Otherwise, check battery and restart.' Principle §5 (progressive disclosure).
  - `P1` Pending items (course + lesson) show LCDPreview but no visual indication of wait time. Parent doesn't know: sync immediately when connected, or require manual 'Send' action? Add note: 'We'll send these automatically when Robot comes online.' Principle §2.
  - `P1` CLChip state='needs_sync' (tan/orange from map) is color-filled pill. State is visible but label 'Needs sync' is small (11px). For urgent state, chip could be larger or paired with warning icon. Principle §2.
  - `P2` DeviceRow items (battery, network, restart) have onClick handler only on one row ('Check Robot connection' → DeviceHomeScreen). Other rows are read-only instructions. Inconsistent affordance: some rows are tappable, others aren't. Parent may not know which rows are actionable.
- **Redesign:**
  - Clarify primary action intent: change button text from 'Reconnect Robot now' to 'Check WiFi & retry' or 'Go to WiFi Settings'. Add subtext: 'Make sure Robot is plugged in and on the same network.' Principle §2.
  - Add numbered troubleshooting steps: '1. Check WiFi', '2. Restart Robot', '3. Retry'. Use visual badges (circle numbers 1, 2, 3). Parent knows order.
  - Add explicit sync behavior note: 'Once Robot is online, your course and today's lesson will send automatically (within 2 minutes).' Removes ambiguity. Principle §2.
  - Enlarge CLChip or pair with warning icon (⚠️) to emphasize urgent state. Principle §2.
  - Standardize DeviceRow affordance: if some are tappable, show visual cue (chevron, button style) consistently. If read-only, remove onClick and use plain text cards. Principle §7.
  - Add optional 'Don't wait — go back to other activities' copy to reduce parent anxiety: 'No rush — your child can pick up tomorrow.'

### RobotReadyScreen.tsx  · `operational` · **P1**
- **Purpose:** Lesson preload ready or preparing. Polls preload status (getPreloadStatus, getCurrentAssignment). Shows check card with battery, WiFi, volume (static emojis), and lesson-loaded (driven by real preload state). Primary action: 'Hand it to your child' (enabled when ready), secondary: 'Pick a different lesson'. Navigates to RunningScreen on success.
- **Now:** DeviceShell title 'Robot is ready'. Hero: RobotDevice emotion='happy' (200px). CLChip state='ready' (yellow colors) if ready, else plain text status ('Getting things ready…'). Heading lesson title (22px), sub (13px, 20px lineHeight). CheckCard: static rows (battery 🔋, WiFi 📶, volume 🔉) with checkmarks (SVG), plus dynamic lesson-loaded row with emoji 📚 and status text. Buttons: 'Hand it to your child' (disabled=!ready, primary), 'Pick a different lesson' (secondary). CL tokens (card, hair, ink, ink2, good color for checkmarks). Polling 2.5s interval; stops when preload state is READY, FAILED, COMPLETED, or has errorCode.
- **Issues:**
  - `P0` Primary action 'Hand it to your child' is disabled until READY, but parent sees no visual progress. Button text changes ('Preparing…' vs 'Hand it to your child') but no animated indicator (spinner, progress bar, time estimate). Parent waits blind. Principle §7: feedback within 100-200ms. Add spinner or countdown ('Ready in ~30 seconds').
  - `P1` Static check rows (battery, WiFi, volume) are hardcoded with placeholder values ('78% · plenty', 'Casa-Familia · strong'). Real device state (battery %, WiFi name, volume level) is never fetched or shown. Parent sees fake checkmarks and assumes robot is ready — but actual device state unknown. Principle §2 (state visibility). Either fetch real state or remove static checks.
  - `P1` Lesson-loaded row is the only real preload state indicator. Other rows (battery, WiFi, volume) break the pattern. Parent attention is split: are all 4 rows required to proceed, or just lesson-loaded? Use CLChip or visual weight to elevate lesson-loaded above static checks. Principle §4 (hierarchy).
  - `P1` Error state (preload.errorCode) shows error text at bottom (13px red #C0392B) but disables button. Parent doesn't know: can they retry? Must they contact support? Error copy should include action: 'Lesson failed to load: [Retry] or [Contact support]'.
  - `P2` CLChip state='ready' is positioned above heading (marginTop 22px). Chip label 'Ready for today' is accurate but could be warmer for parent ('Everything set — let's go!').
- **Redesign:**
  - Add spinner + countdown when preparing: show animated spinner (200-300ms loop, respects prefers-reduced-motion) and estimated time ('Ready in ~15 seconds'). Update every 2.5s with new estimate. Principle §7.
  - Remove static check rows or fetch real device state (battery%, WiFi SSID, volume level). If real state not available, show single explanatory row: 'Robot is ready' with checkmark when preload=READY, or 'Getting things ready… 40%' with progress bar during preload. Principle §2.
  - Elevate lesson-loaded row visually: use larger text (16px title vs 13px for others), bold weight, or distinct card color. Make it clear this is the gate to proceed. Principle §4.
  - Enhance error handling: 'Lesson failed to load. [Retry now] · [Pick a different lesson] · [Contact support]'. Use button affordance for primary recovery action.
  - Warm up CLChip label: 'Ready for today' → 'All set — let's go!' or 'Ready to hand over'.
  - Verify accessibility: error state, preparing state, and ready state should all have distinct aria-labels and semantic text labels (not visual change alone).

### UnlockConfirmModal.tsx  · `operational` · **P1**
- **Purpose:** Parent security confirmation (enter 4-digit code). Prevents accidental child enrollment. Target code shown visually (hardcoded for demo: ['7', '3', '5', '1']). Numpad input with delete. Primary action: 'Confirm add' (enabled when code matches). Handles household context (activeChild resolution) and error states (no child, no device, enrollment failure).
- **Now:** DeviceShell title 'Quick parent check'. Lock icon (28x28 SVG, #5A5A66 stroke) in rounded bg (#EEF1F5). Heading 'Type the number below' (20px, 600wt), sub text. Target number displayed (42px, monospace, CL.ink). Digit input row: 4 digit boxes (54wx64h, 12px borderRadius, colored border: green if ok, accent if filled, hair if empty). Numpad: 12-key grid (3 cols × 4 rows), gap 8px, 30% width each, 54px height, key text 20px (600wt). Delete key shows '⌫' symbol. Error text (red #C0392B, 13px). Button: 'Confirm add' (DeviceBigBtn, disabled=!ok or pending), secondary copy changes based on state ('Enter the number', 'Try again', 'Adding...'). CL tokens used.
- **Issues:**
  - `P0` Target code is hardcoded visual (42px monospace ['7', '3', '5', '1']). Parent must remember 4-digit code while tapping numpad. Visual is large but no affordance to hide code or confirm before tapping (to prevent watching eyes). Principle §2: security state should be explicit. Consider: 'Tap below to verify you're the parent' + small obscured code reveal button, or one-time SMS code instead of visual target.
  - `P1` Error handling shows generic text ('Cannot unlock course. Try again.') in Vietnamese. Copy doesn't match error code: no distinction between 'no device', 'no child', 'enrollment conflict', 'network error'. Parent doesn't know root cause. Principle §2. Use granular error messages: 'No Robot connected. [Settings]' vs 'Network timeout. [Retry]'.
  - `P1` Button state transitions are subtle: copy changes ('Enter the number' → 'Try again' → 'Confirm add' → 'Adding...'). For parent focused on code entry, button state changes may be missed. Add visual feedback (checkmark, color shift, animation) when code is fully entered and valid. Principle §7.
  - `P1` Numpad layout (3-col grid, 30% width each) may be too dense on very small phones (320px). Keys are 54px wide (good touch target) but horizontal spacing tight. Numpad should be tested on small-phone landscape and portrait modes. Principle §3.
  - `P2` Delete key (⌫) uses symbol instead of word. Icon-only affordance. Add aria-label 'Delete last digit' (good), but visual label could be 'Backspace' for clarity, not just symbol.
- **Redesign:**
  - Consider security UX: hide target code and show 'Tap verify code below' prompt + small obscured code button. Parent taps to reveal code, memorizes, then enters on numpad. Removes 'watching eyes' vulnerability. Or use SMS one-time code instead (better security, less memorization).
  - Use granular error messages matching normalized error codes: 'ROBOT_OFFLINE' → 'No Robot connected. [Go to settings]', 'NO_CHILD' → 'Add a child first. [Go to settings]', 'ENROLLMENT_CONFLICT' → 'Course already queued. Tap to continue.', 'NETWORK_ERROR' → 'Network timeout. [Retry]'. Principle §2.
  - Add visual feedback when code fully entered: highlight all digit boxes in green, add checkmark icon, or brief 'Ready to confirm!' text. Animate button to highlight state (pulse or scale-in). Principle §7.
  - Test numpad on 320px phone (landscape + portrait). If too dense, consider: reduce key height to 48px, or use 4-col layout on landscape. Principle §3.
  - Replace delete symbol (⌫) with word 'Delete' or larger backspace icon (←). Keep aria-label 'Delete last digit'. Principle §4, §8.

---

## lesson-session-A (screens A–L)

_All 12 screens in the lesson-session-A range are exclusively **child lane** (Garden Blue palette). No parent/operational screens present. The lane is consistent: sky-blue/pastel backgrounds, playful robot character, warm accent colors (orange #FF6F61, green #7BD389, cyan #6FC1FF), animated progress indicators, speech bubbles, large touch targets, emoji rewards. Child-specific pattern: one primary action per screen, robot-as-anchor character, conversational tone, celebration-focused rewards, low-density layouts. Lane separation verified — no Wispr Flow parent tokens present._


### AbandonedDisconnectScreen.tsx  · `child` · **P0**
- **Purpose:** Error state when lesson connection is lost / disconnected. Minimal acknowledgment of disconnection.
- **Now:** Stub screen. Returns bare Screen + Text component with hardcoded message 'Connection paused after disconnect.' No styling, no design system tokens, no visual hierarchy, no robot character, no actionable next steps.
- **Issues:**
  - `P0` Violates GOOD-DESIGN-PRINCIPLES §2 (State Visible Before Decoration) — bare text without icon or semantic visual language. No error color, no status indicator.
  - `P0` Violates GOOD-DESIGN-PRINCIPLES §7 (One Primary Action Per Screen) — no CTA button, user left stranded. No 'Try again', no 'Home', no next step.
  - `P1` Not using ScreenShell, LessonHeader, or any design system components. Inconsistent with all other lesson screens.
- **Redesign:**
  - Use ScreenShell with background color (#E8F4FF or #FDECEA for error tone).
  - Add Robot character with 'sad' or 'concerned' emotion.
  - Add SpeechBubble with conversational error message ('Oh no! I lost connection. Let's try again.').
  - Add semantic error icon + text label ('Connection lost') at top.
  - Add PrimaryCTA button ('Try again') + secondary ghost button ('Go home').
  - Use garden-blue palette (sky-blue #E8F4FF background, warm accent #FF6F61 for primary button).

### ActivityDoneScreen.tsx  · `child` · **P1**
- **Purpose:** Celebration screen at end of activity/lesson segment. Displays animals learned and motivational copy.
- **Now:** Well-structured celebratory screen. Uses ScreenShell (#E8F4FF), Robot (success, 220px), three emoji reward cards (animals) in row layout, celebratory text ('Activity done!', '3 new word friends!'), LessonHeader with progress 0.6, PrimaryCTA ('Keep going →') in footer.
- **Issues:**
  - `P1` Title color (#7BD389 green) and background (#E8F8F0 teal) may not meet 4.5:1 WCAG AA contrast standard.
  - `P2` Animal emoji cards (64px) are icon-only, no labels. Consider adding word labels below cards.
- **Redesign:**
  - Verify title color contrast against background using WCAG Contrast Checker.
  - Add word labels below emoji cards ('cat', 'dog', 'bunny') or use combined card with emoji + label.
  - Add subtle confetti animation on mount (respects prefers-reduced-motion).
  - Consider progressive disclosure: show animals one-by-one with stagger animation.

### ActivityIntroScreen.tsx  · `child` · **P2**
- **Purpose:** Intro screen for activity segment. Sets context before content. Displays progress dots, emoji preview, and motivational copy.
- **Now:** Clean intro screen. Uses ScreenShell (default blue), LessonHeader (progress 0.15), custom ProgressDots component (5 dots: done green, active orange, pending gray). ActivityBadge pill. Robot (happy, 200px). Title 'Let's name some animals!' Emoji preview. PrimaryCTA 'Start'.
- **Issues:**
  - `P2` ProgressDots component uses hardcoded colors. These should be tokenized for maintainability.
  - `P2` ActivityBadge has uppercase text ('Activity 1 of 5'). Should use sentence case.
  - `P2` Emoji preview lacks visual affordance (no border, no label, no context).
- **Redesign:**
  - Extract color constants into design system tokens.
  - Change ActivityBadge text from uppercase to sentence case ('Activity 1 of 5').
  - Add optional label above emoji preview ('You'll learn these animals').
  - Add aria-label to ProgressDots for accessibility.

### AudioErrorScreen.tsx  · `child` · **P1**
- **Purpose:** Error state when microphone is not available or permission denied. Guides child/parent to enable microphone.
- **Now:** Well-structured error screen. Uses ScreenShell (#FDECEA pinkish error tone), Robot (sad, 220px, accent #FF6F61), SpeechBubble ('I can't hear my microphone. Let's check it together.'), HelpCard (white bg, emoji 🎤). Two CTAs: PrimaryCTA 'Try again' + ghost 'Go home'. LessonHeader.
- **Issues:**
  - `P1` SpeechBubble doesn't explain WHY microphone is unavailable. Message is vague for a child.
  - `P2` Ghost 'Go home' button is muted and may be hard to notice on light background.
- **Redesign:**
  - Update SpeechBubble copy to be more specific ('I need your microphone to hear you. Ask a grown-up to turn it on in settings.').
  - Add status indicator at top (e.g., '⚠ Microphone off').
  - Increase 'Go home' button contrast (add subtle border or darker color).

### BargeinScreen.tsx  · `child` · **P2**
- **Purpose:** Interactive listening state. Robot is actively listening; child can 'barge in' (interrupt) to say their word/answer.
- **Now:** Well-designed interactive state. Uses ScreenShell (#E8F4FF cyan), Robot (listen, 200px, accent #6FC1FF), PulseRing animation (260px, #6FC1FF). Text 'Oh — go ahead!' + 'I'm listening 👂'. MicButton component. LessonHeader.
- **Issues:**
  - `P2` PulseRing animation component may not respect prefers-reduced-motion.
  - `P2` MicButton component implementation not verified for accessibility (aria-label, 44px touch target).
- **Redesign:**
  - Verify PulseRing respects prefers-reduced-motion.
  - Confirm MicButton meets 48px touch target and has proper aria-label.
  - Consider adding optional haptic feedback when PulseRing animates.

### ConnectingScreen.tsx  · `child` · **P2**
- **Purpose:** Connecting/tuning state. Establishes lesson session with robot device. Routes to next screen on success.
- **Now:** Well-structured loading state. Uses ScreenShell (#E8F4FF), Robot (curious, 220px), custom WaveBars animation (cyan #6FC1FF, 28px height, 10 bars). Text 'Tuning in…'. Accessibility wrapper with labels. Session state machine integration. No LessonHeader.
- **Issues:**
  - `P2` WaveBars animation may not respect prefers-reduced-motion.
  - `P2` No timeout feedback. If connection takes >15 seconds, user has no indication of progress.
- **Redesign:**
  - Verify WaveBars respects prefers-reduced-motion.
  - Add optional elapsed-time counter ('Connecting… 12 seconds').
  - Add optional cancel button if user wants to abort.

### CostCappedScreen.tsx  · `child` · **P0**
- **Purpose:** Error/limit state when daily cost/time limit is reached. Session pauses.
- **Now:** Stub screen. Returns bare Screen + Text component with hardcoded message 'Session paused after reaching the daily limit.' No styling, no robot, no next steps.
- **Issues:**
  - `P0` Violates GOOD-DESIGN-PRINCIPLES §2 (State Visible Before Decoration) — bare text without icon or semantic language.
  - `P0` Violates GOOD-DESIGN-PRINCIPLES §7 (One Primary Action Per Screen) — no CTA button.
  - `P1` Message is vague ('daily limit'). Does not explain WHAT limit (time? cost? energy?).
- **Redesign:**
  - Use ScreenShell with warm background color (#FFF3E0 warning tone).
  - Add Robot character with 'gentle' or 'neutral' emotion.
  - Add SpeechBubble with encouraging message ('Great work today! You've reached your daily limit. See you tomorrow!').
  - Add semantic warning icon + text label.
  - Add PrimaryCTA button ('See what you learned').
  - Consider optional 'Share with parent' secondary action.

### ExitConfirmScreen.tsx  · `child` · **P2**
- **Purpose:** Confirmation modal when user attempts to exit/abandon lesson mid-session. Prevents accidental exits.
- **Now:** Well-structured confirmation modal. Uses ScreenShell overlay (semi-transparent #2B2140 at 45% opacity), bottom sheet card (white, 32px radius, 24px padding). Robot (sad, 140px) above sheet. Title 'Stop the lesson?' + subtitle 'We can finish later.' Two CTAs: PrimaryCTA 'Keep playing' (green) + secondary 'Stop for now' (border-based).
- **Issues:**
  - `P2` Secondary button border is very faint (borderColor: rgba(0,0,0,0.08)). Almost invisible on white.
  - `P2` Robot positioned with negative margin (-90px). Fragile layout on different screen sizes.
- **Redesign:**
  - Darken secondary button border to rgba(0,0,0,0.2) or add subtle background fill.
  - Use absolute positioning instead of negative margin for Robot placement.
  - Tokenize modal overlay color and bump opacity to 65% for better emphasis.
  - Add optional 'Save progress' mention in subtitle.

### GentleScreen.tsx  · `child` · **P2**
- **Purpose:** Gentle retry/correction state. Robot offers encouraging re-attempt with word/phrase example.
- **Now:** Clean retry screen. Uses ScreenShell (#F5F5F2 warm neutral), Robot (gentle, 220px, accent #E8A33C). SpeechBubble ('Let's try that together. "cat" 🐱'). Two CTAs: PrimaryCTA 'Try again' + ghost 'Hear it again'.
- **Issues:**
  - `P2` Background color #F5F5F2 is neutral gray. Lacks the playful Garden Blue palette used in other screens.
  - `P2` Example text uses double quotes which may be unclear to young children.
- **Redesign:**
  - Update copy format to 'Try: "cat" 🐱' or 'Say: cat 🐱' for clarity.
  - Change background to warmer garden-blue tone (e.g., #E8F8F0 or light blue) to match aesthetic.

### GreetingScreen.tsx  · `child` · **P2**
- **Purpose:** Lesson intro/greeting. Robot welcomes child. Sets tone for lesson session.
- **Now:** Minimalist greeting screen. Uses ScreenShell (default blue), Robot (greet, 240px), SpeechBubble ('Hi friend! 👋 Ready to play with words?'), LessonHeader (progress 0.05). Single PrimaryCTA 'Yes, let's go!' (green).
- **Issues:**
  - `P2` SpeechBubble text uses emoji 👋. While playful, emoji may not render consistently across devices. Consider explicit icon or animation.
  - `P2` Robot emotion 'greet' not verified in code snippet.
- **Redesign:**
  - Verify Robot emotion 'greet' is defined and renders a welcoming expression.
  - Consider replacing emoji 👋 with explicit hand-wave animation or icon.
  - Add optional personalization: if child name available, use 'Hi [Name]! 👋'.

### LessonDoneScreen.tsx  · `child` · **P1**
- **Purpose:** Celebration screen at lesson completion. Shows summary of learning (words learned, stars), routes to summary or home.
- **Now:** Celebratory completion screen. Uses ScreenShell (#FFF8E1 warm yellow), Robot (success, 240px), large title 'You did it!' (48px bold), three stars ⭐ (emoji), summary card (white semi-transparent bg). Summary text 'You learned 3 words today. See you tomorrow! 👋'. Two CTAs.
- **Issues:**
  - `P1` Stars are static emoji without animation. GOOD-DESIGN-PRINCIPLES §10 recommends micro-interactions (entrance animations, confetti).
  - `P2` Summary card uses semi-transparent background (rgba(255,255,255,0.7)). Fragile on different backgrounds.
- **Redesign:**
  - Add entrance animation to stars: fade + scale-in over 300-400ms with 100ms stagger.
  - Add confetti animation on mount (respects prefers-reduced-motion).
  - Replace semi-transparent card with solid white card and subtle shadow.
  - Dynamically populate summary text from lesson data.
  - Add i18n keys for all text.

### LessonReadyScreen.tsx  · `child` · **P2**
- **Purpose:** Pre-lesson prep screen. Shows lesson title, robot, headphones reminder before starting interaction.
- **Now:** Clean pre-lesson screen. Uses ScreenShell (default blue), Robot (happy, 240px), lesson context text ('Today's lesson' 18px muted, 'Animal Friends' 30px bold), headphones pill (white bg, 🎧 emoji). LessonHeader (progress 0.05). Single PrimaryCTA 'I'm ready!' (routes to ConnectingScreen).
- **Issues:**
  - `P2` Lesson title 'Animal Friends' is hardcoded. Should be dynamic from lesson data.
  - `P2` Headphones pill uses emoji 🎧 only. Text + icon pair recommended. Emoji may not be universally clear.
- **Redesign:**
  - Make lesson title dynamic (pull from lesson data/props).
  - Add i18n keys for all text strings.
  - Update headphones pill to use semantic icon + text ('Headphones recommended').
  - Consider optional illustration or scene decoration for excitement.

---

## lesson-session-B

_Child lane (Garden Blue palette) with playful vocal turn states. All screens render robot character expressions + speech bubbles + prompt cards. Four screens are operational stubs (empty); eight are substantive._


### OfftopicScreen.tsx  · `child` · **P1**
- **Purpose:** Positive off-topic recovery: child attempted off-topic response; robot accepts gently, redirects back to lesson focus (cat).
- **Now:** Robot (happy, 220px) + speech bubble ('Oh fun! 🐱 Let's stay with the cat for now.') centered, yellow PrimaryCTA button (Back to the cat, #7BD389) at bottom. LessonHeader with progress 0.34. Padding 24px sides, footer absolute positioned.
- **Issues:**
  - `P1` One Primary Action rule: button color #7BD389 is green (success), but context is 'stay on lesson', not a success state. Color should be warm accent (yellow/orange from Garden Blue, e.g., #FFD700 or #FF9A44) to signal 'continue forward' rather than 'success achieved'. Violates §1 GOOD-DESIGN-PRINCIPLES: primary action should use warm color (yellow accent).
  - `P2` Hierarchy: Robot size 220px is good focal point. Button at 48px height is fine but text lacks visual weight—consider slight size increase (16→18px) to match other screens' prominence.
- **Redesign:**
  - Change PrimaryCTA color from #7BD389 (green) to a warm accent like #FF9A44 (orange) or #FFD700 (yellow) to match GOOD-DESIGN-PRINCIPLES §1 'warm color' rule for child CTAs.
  - Verify button text 'Back to the cat' reads as a forward action, not a backward retreat—rename to 'Keep learning!' or 'Let's go!' if context supports it.

### ParentStoppedScreen.tsx  · `operational` · **P0**
- **Purpose:** Stub screen: session ended because parent stopped from Parent Space dashboard.
- **Now:** Bare text-only component: '<Screen><Text>{Session stopped from Parent Space}</Text></Screen>'. Uses generic Screen wrapper, no styling, no visual hierarchy, no robot character, no CTA.
- **Issues:**
  - `P0` Violates DESIGN.md §7 'Child learning surfaces' rule: no reward/feedback UX. This is a termination state that demands clear visual feedback (not just text) that the session is over and what to do next. Should include robot character, calm tone, and CTA (e.g., 'Go home', 'Talk to grown-up').
  - `P0` Violates GOOD-DESIGN-PRINCIPLES §2 'State Is Visible Before Decoration': no icon, color, or visual indicator that the session ended from parent action. Text alone is insufficient for a child user (age 5–8).
  - `P1` No primary action visible. Child left in empty state with no next-step CTA. Should have prominent button to return home or restart.
- **Redesign:**
  - Add robot character (emotion: gentle/goodbye, size 200px) as focal anchor.
  - Replace bare text with speech bubble or card: 'All done for now! Your grown-up ended the lesson.' in warm, reassuring tone.
  - Add one prominent PrimaryCTA button: 'Back to home' (#7BD389 or warm accent) at bottom to route child back to home dashboard.
  - Match ScreenShell + LessonHeader pattern from sibling screens for consistency (do not use bare Screen component).

### ReconnectingScreen.tsx  · `child` · **P1**
- **Purpose:** Reconnection state: robot lost voice connection (BLE/audio pathway issue), searching for reconnect. Child waits with visual reassurance.
- **Now:** ScreenShell bg #E8E5F0 (lavender). Robot (worry, 220px, accent #9B8FB8) + speech bubble ('One sec — finding my voice again.') + three animated dots (10px circles, #9B8FB8). Bottom button (Wait with Robot, 60px height, bordered, low contrast text #8B8DB3 on transparent). LessonHeader with progress 0.34. Accessible labels present.
- **Issues:**
  - `P1` Wait button styling (borderWidth 2, borderColor rgba(0,0,0,0.1), low-contrast text rgba(0,0,0,0.5)) violates GOOD-DESIGN-PRINCIPLES §8 'Consistent Interactive Affordances': button lacks clear tap feedback (no active state, color shift, or scale feedback visible in code). Should have :active/pressed state to confirm interaction registration.
  - `P1` Button is not a primary action but styled like one (60px height, full-width). Per GOOD-DESIGN-PRINCIPLES §1, primary action should be dominant (48-56px warm color). This is a 'wait/hold' action—should be smaller, secondary-style (light pill or text link), not full-width primary.
  - `P2` Three-dot animation (thinkDot) has no animation frame defined in styles. Code shows static 10×10 circles, not animated dots. Per GOOD-DESIGN-PRINCIPLES §13, motion should ≤400ms and be visible. Either add Lottie/RN animation or replace with a loading spinner component.
- **Redesign:**
  - Convert 'Wait with Robot' button to secondary/text-link style (ghost button, ~12-16px, no border, text-only #8B8FB8) to de-emphasize it as a non-action (the reconnect happens server-side).
  - Add pressed/active state to button: slight opacity shift, scale-down feedback (press: 0.95 scale) to signal interaction within 100ms.
  - Replace static three-dot circles with animated pulsing dots or a spinner component (Lottie/RN Animated) to show active searching. Duration ≤400ms per cycle.

### RetryScreen.tsx  · `child` · **P1**
- **Purpose:** Retry state: child's response was not recognized/too quiet. Robot gently asks for another attempt with the same prompt.
- **Now:** ScreenShell default bg (white). Robot (curious, 220px, accent #E8A33C orange) + speech bubble ('I heard you trying. One more time?') + prompt text ('Say: "cat"', 18px, muted color, with 'cat' in dark bold). PrimaryCTA button (I'll try!, #FF6F61 coral red, 48px). LessonHeader progress 0.34.
- **Issues:**
  - `P1` Prompt styling: 'cat' is inlined bold but uses inline style (color: #1A1A1F, fontWeight: '700') instead of a semantic design token. Violates DESIGN.md §4 'All visual values should come from tokens'. Child accent or semantic answer-highlight token should be used.
  - `P2` Button color #FF6F61 (coral) is used for 'I'll try!', but per GOOD-DESIGN-PRINCIPLES §1, primary CTA on child surfaces should use 'warm accent' (yellow, orange, gold). #FF6F61 reads as coral/salmon, not a classic warm accent. #FF9A44 (warm orange) or #FFD700 (gold) would be stronger.
- **Redesign:**
  - Extract 'cat' text styling into a component or semantic token (e.g., <HighlightText> or color from a child token like --child-answer-highlight). Replace inline #1A1A1F with token reference.
  - Change button color from #FF6F61 to #FF9A44 (warm orange) or #FFD700 (warm gold) to align with GOOD-DESIGN-PRINCIPLES §1 warm-accent rule and match OfftopicScreen.

### RobotListeningScreen.tsx  · `child` · **P1**
- **Purpose:** Active listening state: robot ear is open, child is prompted to speak. Primary interaction screen.
- **Now:** ScreenShell default bg. Large 'Your turn!' label (30px, #FF6F61 coral). Prompt ('Say: "cat" 🐱', 18px, muted). PulseRing animation (240px, #FF6F61) with Robot (listen, 200px) centered. MicButton below (on state, onClick → UserSpeakingScreen) + 'I'm listening…' label. LessonHeader progress 0.3.
- **Issues:**
  - `P1` Heading 'Your turn!' is 30px #FF6F61, but no weight specified (defaulting to 400). Per GOOD-DESIGN-PRINCIPLES §4 'Hierarchy via Scale', primary content headings should be bold (600-700 weight). Lacking weight makes it less visually dominant than it should be.
  - `P1` MicButton component is used without visible <PrimaryCTA> wrapper. Per GOOD-DESIGN-PRINCIPLES §1, the mic button should feel like a primary action, but the code shows a <MicButton on> with custom onClick logic. No color prop visible—need to confirm MicButton renders with warm accent and 44-48px+ touch target.
  - `P2` Inline prompt style with 'cat' uses nested Text + inline color { color: '#1A1A1F' } instead of token. Matches RetryScreen issue—inconsistent tokenization.
- **Redesign:**
  - Add fontWeight: '800' to 'Your turn!' heading to match GOOD-DESIGN-PRINCIPLES §4 (primary content 1.5–2x secondary, bold weight).
  - Verify MicButton component has a 48px+ touch target, responds to tap within 100ms, and renders in a warm accent color (#7BD389 or similar from the palette).
  - Replace inline color { color: '#1A1A1F' } in prompt with a semantic child token for answer text.

### RobotSpeakingScreen.tsx  · `child` · **P1**
- **Purpose:** Robot is speaking/teaching: child listens to robot's audio. Shows waveform visualization of robot speech.
- **Now:** ScreenShell default bg. 'Listen 👂' label (14px, caps, uppercase, muted color, 1.5px letter-spacing). Robot (speak, 220px) + speech bubble ('This is a cat. 🐱'). WaveBars animation (#6FC1FF cyan, 12 bars, 20px height). Dashed border button at bottom ('🤖 Robot is talking…', 60px, no color prop, low-contrast text rgba(0,0,0,0.5)). LessonHeader progress 0.25.
- **Issues:**
  - `P1` Listen label is 14px, uppercase, muted color. Per GOOD-DESIGN-PRINCIPLES §4, hierarchy should be clear. This label is too small and visually minimal for a key state (robot speaking). Should be larger (18-20px), bolder, and use a semantic label color (e.g., --child-label or --cyan for 'listening' per DESIGN.md §4).
  - `P1` Bottom button ('Robot is talking…') has no color, dashed border, and low-contrast text. This is NOT a primary action (robot is auto-playing), so secondary style is correct. However, the button is 60px tall, full-width, and feels like a primary action visually. Should be 44px, taller text, or styled as a text link to de-emphasize.
  - `P2` WaveBars visualization (#6FC1FF) is correct for 'listening/audio' state per DESIGN.md §4 (cyan for listening/realtime). No issue, but ensure animation frame rate is smooth (not choppy) for 12 bars.
- **Redesign:**
  - Increase 'Listen' label to 18-20px, fontWeight 600-700, and change color from muted (rgba(0,0,0,0.5)) to a semantic cyan token or brand accent (#6FC1FF to match waveform).
  - Reduce button height from 60px to 44px, change border from dashed to solid, and increase text size from 18px to match semantic button text (e.g., via a secondary Button component).
  - Alternatively, replace the button with a text label 'Robot is speaking…' (non-interactive) to avoid confusion with actionable buttons.

### SafetyScreen.tsx  · `child` · **P0**
- **Purpose:** Safety checkpoint: robot pauses lesson and invites child to take a break or ask for a grown-up. Safety guardrail state.
- **Now:** ScreenShell bg #E8E5F0 (lavender). Robot (gentle, 220px, accent #9B8FB8). Speech bubble ('Let's pause for a moment. A grown-up can help if you need.'). Help card (white, 20px radius, 16px padding, icon shield + text 'We can take a break or ask for a grown-up.'). Two buttons: PrimaryCTA 'Take a break' (#9B8FB8 purple) + TouchableOpacity 'Get a grown-up' (text-only, muted color, center-aligned). LessonHeader omitted.
- **Issues:**
  - `P0` Missing LessonHeader: all other screens in the lesson player have LessonHeader (progress bar + exit button). This screen omits it. Per GOOD-DESIGN-PRINCIPLES §9 'Lesson Controls Stay Near Content', the exit path must remain visible even on safety screens. Child should be able to exit without calling a grown-up. This is a COPPA + child-safety violation.
  - `P1` Two buttons violate GOOD-DESIGN-PRINCIPLES §1 'One Primary Action Per Screen'. Both 'Take a break' and 'Get a grown-up' are styled as high-prominence actions. One should be primary (colored), one secondary (text/ghost). Currently, both feel equal weight.
  - `P1` PrimaryCTA button color #9B8FB8 (muted purple) is not a warm accent (yellow/orange). Per GOOD-DESIGN-PRINCIPLES §1, child primary CTAs should use warm color. Purple is the parent palette accent. This screen should use Garden Blue warm accent, not Wispr Flow purple.
  - `P2` Shield icon is custom SVG (inline). No accessibility label on the icon itself—screen reader will only see the adjacent text. Should add aria-label to the SVG or use an accessible icon component.
- **Redesign:**
  - Add LessonHeader (progress bar, exit button) to this screen at the top (even though it's a safety checkpoint, child must retain control to exit the lesson).
  - Demote 'Get a grown-up' to a secondary/ghost button (text-only, no background) to signal it's a fallback, not the primary action. 'Take a break' should be the primary warm-accent button (#FF9A44 or #FFD700).
  - Change 'Take a break' button color from #9B8FB8 (purple) to warm accent (#FF9A44 orange or #FFD700 gold) per GOOD-DESIGN-PRINCIPLES §1.
  - Add aria-label='Shield icon' to the SVG for accessibility.

### SilenceScreen.tsx  · `child` · **P1**
- **Purpose:** No-voice state: robot did not detect clear audio input. Encourages child to speak louder.
- **Now:** ScreenShell default bg. Robot (curious, 220px). Speech bubble ('Hmm, I didn't hear that clearly. Let's try again.'). 'Louder' pill (white bg, 10px V + 16px H padding, 999px radius, light shadow, text 'Speak a little louder' 14px muted). PrimaryCTA button ('I'm here!', #FF6F61 coral, 48px). LessonHeader progress 0.34.
- **Issues:**
  - `P1` Louder pill styling is inconsistent: uses inline shadow (shadowColor, shadowOpacity, shadowRadius) instead of token-based elevation. Per DESIGN.md §4, all visual values should come from tokens. Should reference a semantic shadow token (e.g., --shadow-sm or similar).
  - `P2` Button color #FF6F61 (coral) is used again. Consistency issue across screens—should standardize to a single warm accent color (e.g., #FF9A44 or #FFD700) per GOOD-DESIGN-PRINCIPLES §1.
  - `P2` Louder pill with emoji 🤫 and text is clever, but the emoji itself is 20px (fontSize: 20). Text is 14px, creating visual imbalance. Should align emoji and text size or use a consistent scale (e.g., both 16px).
- **Redesign:**
  - Replace inline shadow definition with a semantic shadow token from design system (e.g., elevation.sm or shadow.card).
  - Change button color from #FF6F61 to #FF9A44 (warm orange) for consistency across child CTAs.
  - Reduce emoji font size from 20px to 16px or increase text from 14px to 16px to balance visual weight.

### SuccessScreen.tsx  · `child` · **P1**
- **Purpose:** Celebration state: child successfully completed the lesson turn (spoke word correctly). Reward feedback.
- **Now:** ScreenShell bg #E8F8F0 (mint green). Robot (success, 240px, accent #E8A33C orange). Speech bubble (white bg, text 'Nice speaking!' 7BD389 green + 'You said "cat" 🐱' muted). Three star emojis (⭐, 32px each, gap 6). PrimaryCTA button ('Next →', #7BD389 green, 48px). LessonHeader progress 0.45.
- **Issues:**
  - `P1` Confetti/celebration animation is missing. Per GOOD-DESIGN-PRINCIPLES §10 'Reward Celebration Is Earned, Legible & Respectful', success should include a micro-interaction (badge reveal, progress ring fill, confetti sparkle respecting reduced-motion). Three star emojis alone are insufficient—should pair with entrance animation (fade + scale-in, 300-400ms).
  - `P1` Speech bubble has inline color styling: text 'Nice speaking!' uses { color: '#7BD389' } and saidText uses inline color 'rgba(0,0,0,0.5)'. Should use semantic child success token + secondary text token instead of hardcoding colors.
  - `P2` Star emoji size (32px) vs. button text size (16px) creates a visual hierarchy where the stars seem more important than the action button. Per GOOD-DESIGN-PRINCIPLES §1, primary CTA should be largest interactive element. Stars should be 20-24px, button text 16-18px.
- **Redesign:**
  - Add entrance animation to the success card (fade + scale-in, 300-400ms) and optional confetti sparkle (respecting prefers-reduced-motion). See GOOD-DESIGN-PRINCIPLES §10 for reference exemplars (Duolingo, Khan Academy).
  - Replace inline color styles { color: '#7BD389' } and rgba(0,0,0,0.5) with semantic child tokens (e.g., --child-success for green, --child-secondary for muted).
  - Reduce star emoji size from 32px to 20px, increase button text to 16-18px to create clear CTA prominence.

### ThinkingScreen.tsx  · `child` · **P1**
- **Purpose:** Processing state: robot is processing child's response (AI inference). Auto-advances to SuccessScreen after 1.6s.
- **Now:** ScreenShell bg #E8F4FF (pale blue). Robot (think, 220px). Text 'Thinking…' (20px, muted color). Auto-navigates to SuccessScreen via useEffect(setTimeout, 1600ms). LessonHeader present (progress 0.34). No visible CTA button.
- **Issues:**
  - `P1` Hard-coded 1.6-second timeout (setTimeout 1600ms) is a brittle affordance. Per GOOD-DESIGN-PRINCIPLES §7 'Consistent Interactive Affordances', loading states should pair a spinner with text + optional timeout. If the AI is slow (>2s), the child is left staring at 'Thinking…' with no indication of progress. Should add a skeleton/spinner animation or progress indicator (e.g., pulsing dots, loading ring, or animated ellipsis).
  - `P2` No accessibility announcement when auto-navigating. useEffect setTimeout with navigation may trap screen-reader users or users relying on touch/gesture control. Should emit an accessible announcement (announceForAccessibility or aria-live region) before auto-advance.
  - `P2` 'Thinking…' text is minimal (20px, muted). Per GOOD-DESIGN-PRINCIPLES §4, secondary content should be visibly hierarchical but clear. Should increase size or add a loading animation to make it feel active, not frozen.
- **Redesign:**
  - Replace hard-coded 1.6-second auto-advance with a server-driven state machine or at minimum add a visual progress indicator (pulsing dots, spinner, animated ellipsis) during the wait. Keep the 1.6s as a fallback timeout with a longer visible max-wait (e.g., 'Thinking… (this may take a few seconds)').
  - Add animated spinner or pulsing effect to the 'Thinking…' label (e.g., opacity animation or Lottie spinner) to indicate active processing.
  - Emit an accessible announcement (announceForAccessibility('Robot is thinking, this will complete in a moment')) to help screen-reader users and those relying on gesture.

### TimedOutScreen.tsx  · `operational` · **P0**
- **Purpose:** Stub screen: session ended after child did not respond within timeout window.
- **Now:** Bare text-only component: '<Screen><Text>{Session ended after no response}</Text></Screen>'. No styling, no robot character, no CTA, no visual hierarchy.
- **Issues:**
  - `P0` Violates DESIGN.md §7 'Child learning surfaces' and GOOD-DESIGN-PRINCIPLES §2 'State Is Visible Before Decoration'. This is a lesson termination state (timeout) that demands clear visual feedback beyond plain text. Child needs to understand 'the robot waited but didn't hear you' and have a clear next action.
  - `P1` No primary action button visible. Child is left in empty state with no way forward (no 'Try again', 'Go home', or 'Talk to grown-up' button). Should have at least one prominent CTA.
  - `P1` Uses generic <Screen> component instead of ScreenShell. Inconsistent with all other lesson-session screens, which use ScreenShell + LessonHeader + visual hierarchy.
- **Redesign:**
  - Add robot character (emotion: patient/neutral, size 200px) as focal anchor.
  - Replace text with speech bubble: 'I waited, but I didn't hear you. Let's try again?' or similar warm, non-shaming copy.
  - Add one prominent PrimaryCTA button (warm accent color, 48px) with options: 'Try again' (→ RobotListeningScreen) or 'Go home' (→ HomeHubScreen).
  - Match ScreenShell + LessonHeader pattern from sibling screens (include progress bar and exit button for consistency).
  - Optionally include a timeout icon or indicator to help child understand what happened.

### UserSpeakingScreen.tsx  · `child` · **P2**
- **Purpose:** Active speaking state: child is speaking/recording. Robot listens and provides real-time visual feedback (waveform).
- **Now:** ScreenShell bg #E8F8F0 (mint green). Large 'I hear you!' label (30px, #7BD389 green, bold). PulseRing animation (260px, #7BD389) with Robot (listen, 200px, accent #7BD389) centered. WaveBars animation (#7BD389, 18 bars, 56px height) below robot. MicButton at bottom (on state, onClick → ThinkingScreen, label 'stop') + 'Tap when done' text. LessonHeader progress 0.32.
- **Issues:**
  - `P1` Heading 'I hear you!' is 30px, fontWeight '800', #7BD389, but no access to verify fontWeight rendering. Per GOOD-DESIGN-PRINCIPLES §4 'Hierarchy via Scale & Weight', this should be 1.5–2x secondary content. Text '800' weight is correct. No issue here, but verify rendering in runtime.
  - `P2` WaveBars height is 56px with 18 bars, creating a large, dominant visualization. This is correct for an active speaking state (per GOOD-DESIGN-PRINCIPLES §7), but verify the animation frame rate is smooth and bars are evenly spaced to avoid visual jank.
  - `P2` MicButton component is used without visible color prop. Need to confirm MicButton renders in #7BD389 green or a warm accent and has a 48px+ touch target. Code shows onClick → ThinkingScreen, which is correct.
- **Redesign:**
  - Verify MicButton has 48px+ touch target, renders in semantic accent color, and provides clear active state feedback (scale, opacity, color shift) when pressed.
  - Confirm WaveBars animation is smooth (60fps if possible) and bars are evenly distributed to avoid visual glitches during rapid audio input.
  - Optional: add haptic feedback (vibration pulse) when the child starts speaking (on UserSpeakingScreen load) to reinforce that the mic is active.

---

## lessonDemo

_Eight screens span three lanes: child lane (LessonSessionScreen, LessonShowcaseScreen, RobotCompanionScreen, RobotFullscreenLessonScreen) with Garden Blue playfulness and character-driven interactivity; parent lane (ParentLessonSummaryScreen) with warm off-white Wispr Flow surface and operational clarity; and mixed/operational (LessonDemoHomeScreen, LessonPickScreen, LessonRoadmapScreen) serving either persona depending on context. Lane separation is inconsistently enforced—child screens ship with hardcoded accent colors (#FF6B6F, #4CC9F0) rather than tokens, and parent surfaces use generic light backgrounds instead of --parent-bg-0 tokens. Two landscape screens (RobotCompanionScreen, RobotFullscreenLessonScreen) partially follow DESIGN.md Rule §7 (video fills screen; controls float as overlay) but choice rendering and control placement need refinement._


### LessonDemoHomeScreen.tsx  · `operational` · **P1**
- **Purpose:** Home and entry point showing today's lesson, age band selection, completion progress, and navigation to lesson types (session, roadmap, robot, showcase).
- **Now:** Scrollable home screen using theme tokens (colors.background, colors.primary, colors.surface, spacing.lg/md/sm, typography.h1/h2/caption). Segment button toggles for age band selection (4-6, 7-9, 10-12, etc.). Today's lesson card contains theme, objective, focus items, and primary 'Start today's lesson' button. Three stat cards show 24 weeks, 120 sessions, completion count. Three secondary buttons (roadmap, robot, showcase) use variant='secondary' and variant='ghost'. Typography is sans-serif, colors are semantic (primary, textPrimary, textSecondary, surface, border). No Garden Blue or parent lane tokens visible.
- **Issues:**
  - `P1` Missing lane clarity: LessonDemoHomeScreen is operational/mixed but uses generic theme tokens (colors.primary, colors.surface) instead of lane-specific tokens. DESIGN.md requires two-lane separation: either map to --parent-* tokens for operational tone, or add surface='parent' prop to distinguish from child-lane colors. Currently no visual boundary exists between operational and child/parent surfaces.
  - `P1` Missing device state visibility: no connection status, battery %, firmware version, or pairing state indicator. GOOD-DESIGN-PRINCIPLES.md §D Device Pairing and Management and DESIGN.md state-visibility rule mandate status display before primary content. User cannot see robot connectivity or readiness.
  - `P2` Age band segment buttons lack focus/active state contrast: segmentTextActive uses colors.surface (white) on colors.primary (likely blue), but contrast ratio and affordance on selection need verification. WCAG 4.5:1 minimum required for text; visually compare against WCAG Contrast Checker.
  - `P1` Stat cards (24 weeks, 120 sessions, completed count) lack visual hierarchy or semantic meaning: all three rendered identically with stat value + label. GOOD-DESIGN-PRINCIPLES.md §A.1 requires metric differentiation—e.g., 'completed' should carry success color (--parent-success or green) and visual prominence over passive counts. Currently no visual distinction.
  - `P2` Multiple buttons with ambiguous priority: 'Start today's lesson' (primary, blue), 'Open roadmap' (secondary), 'Start lesson on robot' (secondary), 'Investor showcase' (ghost). DESIGN.md One Primary Action rule states exactly one primary action per screen. Here, two high-value CTAs compete (lesson + robot). Roadmap also draws attention. Suggest consolidating or demoting secondary CTAs.
- **Redesign:**
  - Add device state badge below title (connection, battery %, firmware) using semantic status colors per DESIGN.md. Example: 'Online • 87% battery • v2.1' in charcoal pill with green checkmark.
  - Map segment buttons and card styles to parent lane (--parent-bg-0, --parent-blush surfaces, --parent-pill buttons) to signal operational tone rather than generic theme tokens.
  - Re-style stat cards: 'completed' card gets --parent-success color + larger font weight; other two remain neutral. OR replace with progress ring visual (e.g., 3/120 sessions) as in GOOD-DESIGN-PRINCIPLES.md metric badges.
  - Consolidate CTAs: keep 'Start today's lesson' as sole primary action; demote 'robot' and 'roadmap' to card-level taps or move below fold. Maintain one hero action on screen.
  - Add focus states and accessibility labels (aria-label) for segment buttons; test contrast in dark mode + reduced-motion.

### LessonPickScreen.tsx  · `child` · **P0**
- **Purpose:** Lesson catalog picker allowing user to select a lesson by week/day/theme before entering robot companion chat or fullscreen lesson.
- **Now:** Scrollable lesson grid (gap: 14) of white cards with border (rgba(255,107,111,0.16), borderRadius: 20). Each card shows week, day, title, theme, focus items, and 'Tap to start →' CTA. Uses referenceColors (bg, primary, ink, inkSoft, inkMuted) and referenceShadow.card. Typography is sans-serif, sizes hardcoded (fontSize: 30, 22, 15, 14, 13, 11). Card border color references #FF6B6F (red accent, not Garden Blue). No child-lane visual indicators (sky-blue bg, playful characters, warm accents).
- **Issues:**
  - `P0` Lane violation — missing Garden Blue palette: LessonPickScreen is child lane but uses white card surfaces, gray text (referenceColors.inkMuted), and a pinkish border (#FF6B6F, rgba variant). DESIGN.md and GOOD-DESIGN-PRINCIPLES.md demand Garden Blue (sky-blue, warm pastels, playful tones) for child-lane surfaces. Current styling is neutral/parent-like, not playful. Background is generic (referenceColors.bg, no sky-blue).
  - `P1` Missing character presence: GOOD-DESIGN-PRINCIPLES.md §A.1 Home Dashboard and §B Interactive Spoken Language Lesson require Teebot character on screen (left or center) to orient child user and add personality. LessonPickScreen has no character asset, mascot icon, or playful visual anchor. Pure list view.
  - `P1` Disabled/loading state not shown: no skeleton loaders, spinners, or disabled visual for lessons user cannot yet access. DESIGN.md state-visibility rule and GOOD-DESIGN-PRINCIPLES.md require explicit state for locked/unavailable lessons (e.g., 'Week 3 unlocks after Week 2'). Cards are all tappable with no indication of gating.
  - `P2` Typography hardcoded, not tokenized: cardTitle fontSize 22, focus fontSize 13, week fontSize 11. DESIGN.md and GOOD-DESIGN-PRINCIPLES.md require design tokens (--text-heading, --text-body, --text-caption). Hardcoded sizes break responsive consistency and prevent theme-wide adjustments.
  - `P1` No clear primary action affordance: 'Tap to start →' text is small (fontSize 13, color: referenceColors.inkMuted) and low contrast. WCAG 4.5:1 minimum; inkMuted likely fails on white bg. Button-like appearance lacking (no background, padding, or rounded edge). GOOD-DESIGN-PRINCIPLES.md requires obvious, high-contrast CTA per card.
  - `P2` Focus items truncated without explanation: lesson.focusItems.join(' · ') may wrap or overflow on small screens. No ellipsis, tooltip, or expandable view. Accessibility tools cannot read full list.
- **Redesign:**
  - Adopt Garden Blue palette: change bg to sky-blue gradient (similar to 03-lesson-player.png), card surfaces to warm pastels (cream, blush), and accent borders to warm yellow/orange instead of #FF6B6F.
  - Add Teebot character asset (left or center) with idle animation or playful pose to anchor screen and signal child experience.
  - Implement lesson gating visual: locked lessons render with gray overlay, lock icon, and explanatory text ('Unlock by completing Week 2'). GOOD-DESIGN-PRINCIPLES.md §A.
  - Tokenize typography: replace hardcoded fontSize with --text-heading (title), --text-body (theme), --text-caption (week, focus). Update referenceTheme.ts to export tokens.
  - Upgrade CTA to button: add background (--accent-warm-yellow or Garden Blue secondary), padding (horizontal 12, vertical 8), rounded corners (radius.sm), visible touch target (44px min height). Match affordance in 03-lesson-player.png.
  - Truncate focus items to 2 lines; add '... more' indicator if overflow. Provide full list in modal or expandable view for a11y.

### LessonRoadmapScreen.tsx  · `operational` · **P1**
- **Purpose:** 24-week progression roadmap showing all weeks, months, themes, and per-week completion progress (X of Y sessions complete).
- **Now:** Scrollable list of week rows (gap: spacing.md). Each week shows header (Week N, Month M), theme text, completion detail ('X of Y complete'). Uses theme tokens (colors.background, colors.surface, colors.primary, colors.primaryLight, colors.primaryDark, spacing.lg/md/sm, typography.h1/body1/caption). Badge at top shows '120 sessions'. Rows are styled as cards (borderRadius, border, padding). No landscape mode or visual roadmap graphic.
- **Issues:**
  - `P1` Missing progression visualization: GOOD-DESIGN-PRINCIPLES.md §E Lesson Reward and roadmap patterns require visual progress indicator (e.g., timeline, progress ring, flame streak). Current text-only '3 of 5 complete' does not celebrate progress or show momentum. No visual anchor for user location within 24-week arc.
  - `P1` No lane clarity: roadmap is operational/parent-facing but uses generic theme tokens (colors.primary, colors.surface) instead of --parent-* tokens (--parent-bg-0, --parent-blush, --parent-accent). DESIGN.md requires two-lane surfaces; operational should map to parent lane styling for consistency.
  - `P2` Badge ('120 sessions') positioned above content but not tied to page hierarchy: no visual relationship to week list below. DESIGN.md Information Architecture requires clear flow (Status → Hero → Details → Action). Badge could be integrated into header with eyebrow, title, subtitle.
  - `P2` Month labels ('Month 1', 'Month 2', etc.) not synchronized with real calendar: no visual indication of weeks/month alignment or time-based progression. User cannot understand seasonal/temporal structure of curriculum.
  - `P1` Tap target unclear on week rows: entire row is tappable to navigate to LessonSessionScreen, but no CTA text or button affordance. WCAG 44px rule; rows may be too small on mobile. No 'Open Week' button or → arrow cue.
- **Redesign:**
  - Add visual progress timeline: replace text-only completion with a horizontal progress bar per week (e.g., 5 dots, 3 filled green, 2 empty) or vertical timeline along left edge with completed weeks highlighted in --parent-success color.
  - Map to parent lane: replace colors.primary with --parent-accent (purple), colors.surface with --parent-blush or --parent-cream, colors.primaryLight with --parent-success. Use serif headings (Week N) per DESIGN.md parent typography.
  - Relocate badge into header section: restructure as eyebrow ('Six-month roadmap'), h1 title, subtitle, then status badges (120 sessions, X completed) before week list.
  - Add calendar grid or month separator: visually group weeks by month with dividers or month header cards. Display expected real dates (e.g., 'Week 1–5 January').
  - Upgrade week rows to explicit tappable cards with affordance: add 'Begin Week' or → button, increase row height to 44px+ touch target, add hover/active states.

### LessonSessionScreen.tsx  · `child` · **P0**
- **Purpose:** Primary lesson player for child—step-by-step interactive practice with character state visibility, practice cards, multi-choice interactions, and navigation controls.
- **Now:** ScrollView with lesson header (theme, focus items), LessonScene (animated character/scene renderer), practice card (step type, title, prompt, helper text, optional choices), and footer with Back/Repeat/Next buttons. Uses theme tokens (colors.background, colors.primary, colors.surface, spacing.lg/xl, typography.h1/h2/h3/caption). Status bar shows robot state label ('TeeBot models', 'TeeBot listens', etc.) and step count. Choice buttons use colors.primaryLight (bg) and colors.primaryDark (border) with selected state. Footer bar is transparent with button layout (flex 1).
- **Issues:**
  - `P1` Lane violation — missing Garden Blue palette: LessonSessionScreen is core child experience but uses generic theme tokens (colors.primary blue, colors.surface light gray) instead of Garden Blue (sky-blue bg, warm pastels, playful accents). Background should be sky-blue; practice card should be cream/blush; accent should be warm yellow/orange. Current palette is neutral, not playful per age 5-8 archetype.
  - `P1` Practice card insufficient visual hierarchy: step type, title, prompt, helper, and choices all in same card without size/color differentiation. DESIGN.md Information Architecture (Status → Hero → Details → Action) and GOOD-DESIGN-PRINCIPLES.md §B require: robot state at top (Status), lesson theme prominent (Hero), practice prompt large (Details), choices at bottom (Action). Current layout flattens these.
  - `P1` Choice styling lacks selection affordance: unselected choices are borderColor colors.primary (light), backgroundColor colors.primaryLight (very light). Selected choices use colors.primaryDark border and colors.primary background. Contrast is insufficient; selection change is subtle. WCAG 4.5:1 minimum for text; compare choice text on primaryLight bg (likely fails).
  - `P2` Footer button layout may fail on landscape: footer uses flex row with three equal buttons (flex 1) without accounting for landscape screen rotation. DESIGN.md landscape rule (§7) requires controls <36% height at bottom; three buttons side-by-side may exceed safe zone. Buttons may be unreachable on tall portrait or too cramped on wide landscape.
  - `P2` No explicit reward/celebration at lesson completion: 'Finish' button navigates to ParentLessonSummaryScreen without any celebratory animation, confetti, or praise. GOOD-DESIGN-PRINCIPLES.md §E Lesson Reward requires dynamic headline, character animation, metric pills (XP, accuracy, time), optional confetti. Current experience is silent.
  - `P1` Missing focus/reduced-motion states: no indication that animations in LessonScene (robot breathing, etc.) respect prefers-reduced-motion. DESIGN.md Motion rule and WCAG a11y require motion opt-out. No accessible pause/resume control visible for animations.
  - `P2` Robot state label uses generic text only: stateLabel() returns plain strings ('TeeBot models', 'TeeBot listens'). No icon, color coding, or visual indicator. User cannot quickly parse state; non-readers cannot identify state. Add icon (speak bubble, ear, think, celebrate) and semantic color (--accent-primary for listening, --accent-success for celebration).
- **Redesign:**
  - Apply Garden Blue palette: sky-blue background (similar to 03-lesson-player.png), cream or blush practice card, warm yellow/orange accent for buttons and borders. Replace all colors.* tokens with Garden Blue equivalents (define --child-bg, --child-surface, --child-accent in theme).
  - Restructure practice card with clear IA: (1) robot state label + icon at top (Status), (2) lesson theme (Hero, large), (3) step prompt (Details, readable), (4) choices grid or list (Action, bottom). Add visual breathing room (gap: spacing.lg between sections).
  - Upgrade choice buttons: increase padding (16px vertical, 12px horizontal), use button affordance (rounded, high-contrast border), verify 4.5:1 text contrast on primaryLight bg. Selected state should be bold (e.g., background to --child-accent, white text). Test on small screens for touch target (44px).
  - Adapt footer for landscape: detect orientation and adjust layout—on landscape, move controls to overlay (bottom 10% safe zone) as floating action buttons (Back, Repeat, Next) rather than flex row. Per DESIGN.md §7.
  - Add celebration on lesson completion: before navigating to ParentLessonSummaryScreen, play confetti animation (or static celebratory graphic if reduced-motion), display dynamic headline ('Perfect lesson!' or 'Great job!'), and show metric summary (accuracy %, time, XP) for 2-3 seconds. Then fade to summary screen.
  - Add robot state visual: use icon + color per state (listening = ear icon, blue; thinking = lightbulb icon, yellow; celebrating = party icon, green). Make state machine visually parsable for non-readers.
  - Implement motion respect: wrap LessonScene animations in prefers-reduced-motion media query. Provide a 'Pause animations' toggle in header or footer for manual control.

### LessonShowcaseScreen.tsx  · `mixed` · **P1**
- **Purpose:** Investor/demo showcase mode highlighting polished lesson moments (weeks 1, 4, 13, 21, 24) for external stakeholders. Navigates to lesson player on selection.
- **Now:** Scrollable list of showcase lessons (Card components with onPress navigation). Each card displays title (e.g., 'Week 1 Day 1', 'Week 24 final showcase'), theme, objective, and 'Launch' CTA text. Uses theme tokens (colors.background, colors.primary, colors.textPrimary, spacing.lg, typography.h1/h3/caption). Eyebrow labels 'Investor mode'. No special visual treatment for showcase moments.
- **Issues:**
  - `P1` Lane classification ambiguous: LessonShowcaseScreen serves investors (operational/parent lane) but is labeled 'Investor mode' (not child-facing). Cards use theme tokens without lane-specific styling. Purpose is demo/showcase, not teaching. Should explicitly map to parent lane (--parent-* tokens, Wispr Flow palette) to signal external, professional use.
  - `P1` Missing showcase visual differentiation: no icon, badge, or visual marker indicating these are 'highlight' lessons vs. regular sessions. User cannot distinguish showcase moments from roadmap. GOOD-DESIGN-PRINCIPLES.md §A.1 and §E require special visual treatment for showcase (e.g., star, badge, highlight color) and reward moments.
  - `P2` Objective text truncated without indication: lesson.objective may wrap or overflow; no truncation, ellipsis, or tooltip visible. Multi-line text may be cropped on small screens.
  - `P2` 'Launch' CTA is text-only: no button affordance (no background, padding, or rounded border). Text color (colors.primary) may not contrast sufficiently on light bg. WCAG 4.5:1 required; text-only CTA fails affordance heuristics.
  - `P1` showcaseLabel() logic hardcodes week numbers and doesn't scale: function checks specific weeks (1, 4, 13, 21, 24) with literal strings ('Week 4 review', 'Week 13 showcase'). If curriculum changes or new showcase weeks are added, logic must be updated. No data-driven approach.
  - `P2` No context for non-English speakers: labels use English only ('Week 1 Day 1', 'Week 4 review'). DESIGN.md locale & i18n rule requires translations. No i18n keys visible (e.g., i18n.t('showcase.week1Label')).
- **Redesign:**
  - Explicitly map to parent lane: replace theme tokens with --parent-* (--parent-bg-0, --parent-blush surfaces, --parent-accent purple). Use serif headings and operational tone per DESIGN.md parent surfaces.
  - Add showcase visual marker: render star icon (★) or 'Featured' badge on each card in high-contrast color (--parent-accent or gold). Highlight first/last showcase (Week 1, Week 24) with larger card or border.
  - Truncate objective to 2 lines with ellipsis; add expandable modal or tooltip to show full text on tap.
  - Upgrade 'Launch' to button: add background (--parent-accent or subtle --parent-blush), padding (12px h, 8px v), rounded corners, visible touch target (44px). Ensure 4.5:1 contrast.
  - Refactor showcaseLabel() to data-driven approach: define showcase weeks in a config array (e.g., [{week: 1, label: 'start'}, {week: 4, label: 'review'}, ...]). Logic becomes a lookup, not hardcoded literals.
  - Add i18n: wrap all labels in i18n.t() calls (e.g., i18n.t('showcase.week1Label'), i18n.t('showcase.week4Label')). Provide translations in i18n/en.json, vi.json, etc.

### ParentLessonSummaryScreen.tsx  · `parent` · **P1**
- **Purpose:** Post-lesson summary for parent showing lesson objective, practiced vocabulary, Vietnamese support guidance, and next review recommendations. Displays overall progress (lessons completed in demo).
- **Now:** ScrollView with eyebrow ('Completed today', color: colors.success), title ('Parent summary'), and four cards: Objective, Practiced, Vietnamese support, Next review. Each card uses colors.surface, spacing.md, typography.body2 (section title) + body1 (content). Progress card at bottom shows colors.primaryLight background with completion count (white text). 'Open roadmap' button below. Uses theme tokens throughout (spacing, typography, border-radius). Layout is simple vertical stack.
- **Issues:**
  - `P1` Not mapped to parent lane tokens: ParentLessonSummaryScreen is parent-facing but uses generic colors.success (for eyebrow) and colors.primaryLight (for progress card) instead of --parent-* tokens (--parent-success green, --parent-accent purple, --parent-bg-0 warm off-white). DESIGN.md parent lane requires --parent-* palette throughout. Background should be warm off-white, not generic.
  - `P1` Missing device state/pairing visibility: no connection status, battery %, or robot readiness displayed. DESIGN.md state-visibility rule and GOOD-DESIGN-PRINCIPLES.md §D Device Pairing require transparency on device state before presenting lesson data. Parent cannot verify robot is connected/available for next session.
  - `P2` Information Architecture lacks hierarchy: four cards (Objective, Practiced, Vietnamese support, Next review) are rendered identically with no visual weighting. DESIGN.md IA (Status → Hero → Details → Action) suggests objective should be Hero (larger, prominent), Vietnamese support should be secondary detail. Current treatment is flat.
  - `P2` Vietnamese support content not localized: text is hardcoded in English ('Vietnamese support'). DESIGN.md locale & i18n rule requires translations. Card content (lesson.parentSummary.vietnameseSupport) is generated data, not i18n-aware.
  - `P1` Progress metric lacks context: 'X lessons completed in this demo' is standalone without cumulative progress or next-session guidance. GOOD-DESIGN-PRINCIPLES.md §A.1 Parent Dashboard requires actionable next steps. Parent sees completion count but not 'Complete Week 2 to unlock Week 3' or 'Next lesson ready tomorrow'.
  - `P2` No visual celebration of lesson completion: summary is functional/transactional. Parent has no sense of learner achievement. GOOD-DESIGN-PRINCIPLES.md §E Lesson Reward (for parent context) could include celebratory headline ('Great work today!'), learner metrics (accuracy, time, engagement), or visual progress indicator (e.g., week streak, badge).
- **Redesign:**
  - Apply parent lane tokens: replace colors.background with --parent-bg-0 (warm off-white), colors.surface with --parent-blush or --parent-cream, colors.success with --parent-success (green), colors.primaryLight with --parent-accent-light. Use serif headings (h1, h2) per DESIGN.md parent typography.
  - Add device state banner above summary: show connection status (online/offline), battery %, last sync time. Use semantic colors (green for online, orange for low battery, red for offline). Example: 'Connected • 72% battery • Synced 2 mins ago'.
  - Restructure cards with clear IA: (1) Objective card as Hero (larger h2, full-width, --parent-blush bg), (2) Practiced as Details (h3, list format), (3) Vietnamese support as actionable tip (yellow/warning color, icon+text), (4) Next review as CTA ('Schedule Week 2 for tomorrow' button).
  - Localize all labels: wrap 'Completed today', 'Parent summary', 'Objective', 'Practiced', 'Vietnamese support', 'Next review' in i18n.t() calls. Support English, Vietnamese.
  - Enhance progress context: replace 'X lessons completed' with '3 of 120 lessons complete (2.5% of six-month journey)' and add progress ring visual. Include next-lesson guidance ('Week 1 Day 2 is ready. Set a time for tomorrow morning?').
  - Add soft celebration: display a congratulatory message tied to learner performance ('Excellent listening today! Your child caught 8 new words.') and suggest next action ('Continue with Week 1 Day 2 tomorrow morning').

### RobotCompanionScreen.tsx  · `mixed` · **P1**
- **Purpose:** Pre-lesson chat screen where child talks freely to robot before fullscreen lesson begins. Shows robot head (animated breathing), real-time voice transcript, error handling, and 'Start lesson' CTA that appears after ~4.5 seconds.
- **Now:** Full-screen immersive experience with dark background (#1A2430), scrim overlay (rgba 58% opacity), ImageBackground (poster/robot head image). Animated robot head (scale breathing via Animated.Value), PulseRing (cyan #4CC9F0 when listening, pink #FF6B6F when speaking). Top bar has close (✕) and voice toggle (🤖/🎙️) buttons (44x44 circular, semi-transparent bg). Header shows eyebrow ('Just chatting'), 'Up next: [lesson]', hint text. Voice transcript displayed above footer. Error banner with 'Open Settings' and 'Open diagnostic log' actions. Footer has pulsing 'Start lesson' button (appears after CTA_REVEAL_MS = 4500) and 'Robot is saying hi…' hint.
- **Issues:**
  - `P1` Lane classification unclear: RobotCompanionScreen is pre-lesson, mixed-lane (child-speaking, but parent may oversee). Visual identity is neither Garden Blue (child playful) nor parent operational. Dark background (#1A2430) is sophisticated/premium but not pedagogically aligned with either lane. No clear visual signal of what lane user is in or what mode lesson is in.
  - `P2` PulseRing colors hardcoded, not tokenized: listening uses #4CC9F0 (cyan, arbitrary), speaking uses #FF6B6F (pink, arbitrary). DESIGN.md and GOOD-DESIGN-PRINCIPLES.md require token-based colors (e.g., --accent-listening, --accent-speaking). Colors may not match Garden Blue or parent lane tokens if theme changes.
  - `P1` Voice state machine visual feedback insufficient: enum states (IDLE, CONNECTING, PREPARING_AUDIO, WAITING_AI, ASSISTANT_SPEAKING, etc.) are shown via icon change (🤖 → 🎙️) and optional spinner. Text-only state indicators fail non-readers. No visual animation or persistent indicator of which step robot is in (preparing? listening? thinking? responding?).
  - `P2` Error banner styling raw: backgroundColor rgba(120, 24, 24, 0.82) (dark red, hardcoded). Should use --parent-danger or --child-danger token. Error text and actions use hardcoded white; no style consistency with rest of app.
  - `P1` CTA_REVEAL_MS delay (4.5s) not user-controlled: 'Start lesson' button hidden for ~4.5 seconds to allow robot greeting. No visual countdown, progress indicator, or skip option. User may think app froze. GOOD-DESIGN-PRINCIPLES.md and DESIGN.md require transparency—show 'Robot is saying hi… 2s remaining' or provide skip button.
  - `P2` AI transcript truncated without affordance: aiTranscript displayed with numberOfLines={4}; if longer, text is cut off with no expansion or modal. User cannot read full robot message if it exceeds 4 lines.
  - `P1` No indication when voice is actually active: voiceActive state is managed internally (useState, Zustand). User sees icon change (🤖 → 🎙️) but no audio level meter, animated waveform, or continuous feedback that mic is recording. Uncertainty: is robot listening now?
  - `P2` Landscape mode not considered: RobotCompanionScreen uses absolute positioning (robotStage bottom: height * 0.22) and fixed header layout. On landscape, image may be distorted, header text may be cut off, buttons may overlap. DESIGN.md landscape rule requires testing and responsive layout.
- **Redesign:**
  - Clarify lane: if mixed (child + parent), add visual layer—e.g., soft Garden Blue tint over dark bg to signal child-facing, or parent badge in corner. OR explicitly separate into child (LessonCompanionScreen) vs. parent-oversight (RobotOversightScreen) screens.
  - Tokenize pulse colors: define --voice-listening (cyan) and --voice-speaking (pink) in theme. Replace #4CC9F0 and #FF6B6F with token references.
  - Enhance voice state feedback: add animated icon per state (mic icon with waveform for listening, speaker icon for speaking, lightbulb for thinking). Include semantic color per state. Example: listening (blue + mic waveform), thinking (yellow + lightbulb), speaking (pink + speaker).
  - Token-based error styling: use --parent-danger (or --child-danger) for error banner background. Use standard error typography from theme.
  - Implement CTA countdown: show 'Robot is saying hi… 3s' or a visual timer (progress bar, dots) instead of silent 4.5s wait. Provide skip button ('Start now') to override delay for impatient users.
  - Add transcript expansion: if AI transcript exceeds 4 lines, render a 'Show more' button or modal link to view full conversation.
  - Add audio level meter: during voice-active state, show animated waveform or bars (using useGeminiConversation's audio level, if available) to give real-time feedback that mic is actively recording.
  - Adapt for landscape: detect screen orientation and reposition robot stage, header, and footer to safe zones. Test on iPad landscape mode (likely 16:9 ratio).

### RobotFullscreenLessonScreen.tsx  · `child` · **P0**
- **Purpose:** Full-screen immersive lesson player on robot screen (landscape-optimized) with video/scene filling viewport, choice overlays, and minimal controls in floating footer.
- **Now:** Full-screen experience (StatusBar hidden, root backgroundColor #000000). FullscreenLessonScene component fills viewport (lesson, step, voice state, speaking state). Choices rendered as floating buttons (position absolute, bottom: insets.bottom + 96) in modal-style overlay if step.choices exist (gap: 10, borderColor rgba(255,255,255,0.55), backgroundColor rgba(0,0,0,0.35)). Top bar has close (✕) and voice toggle (🤖/🎙️) buttons (44x44, semi-transparent). AI transcript displayed mid-screen (position absolute, bottom: insets.bottom + 168). Error banner (position absolute, top: insets.top + 64). Footer with Back (disabled if step 0) and Next/Finish buttons (flex row, gap: 12, backgroundColor transparent, borderRadius 18).
- **Issues:**
  - `P1` Scene rendering implementation opacity: FullscreenLessonScene component not provided; cannot audit actual lesson video/content rendering. Assuming it fills viewport correctly, but if it renders scaled/cropped content, landscape rule violated. Requires visual verification.
  - `P2` Choice positioning too high: choices positioned at bottom: insets.bottom + 96. On landscape (say, iPad), safe zone may extend higher; choices could overlap video content or be in unsafe zone. DESIGN.md §7 landscape rule: controls <36% screen height at bottom. If video fills upper 64% and choices occupy lower 36%, safe zone is respected. But exact positioning suggests hardcoded offset, not responsive.
  - `P1` Lane violation — child screen lacks Garden Blue palette: RobotFullscreenLessonScreen is full-screen child lesson (peak engagement moment) but background is pure black (#000000), not sky-blue Garden Blue. GOOD-DESIGN-PRINCIPLES.md §B requires playful, warm, age-appropriate visual language. Black is stark and neutral, not playful.
  - `P2` Choice button styling inconsistent with mobile lesson: RobotFullscreenLessonScreen choices use borderColor rgba(255,255,255,0.55), backgroundColor rgba(0,0,0,0.35), white text. LessonSessionScreen choices use colors.primaryLight and colors.primary. No unified child-lane choice styling. If user switches between mobile and fullscreen lesson in same session, visual inconsistency is jarring.
  - `P1` Footer buttons not visually distinguished for mobile safe zone on portrait fallback: footer flex row layout assumes landscape. On portrait (if screen rotates), three buttons side-by-side may be unreachable or hidden. No responsive logic to stack buttons on portrait orientation.
  - `P2` AI transcript truncated: numberOfLines={3} limits visible transcript. If response is longer, user cannot see full message without scrolling or expansion. No affordance for full-text view.
  - `P1` No celebration or reward at lesson finish: 'Finish' button navigates directly to ParentLessonSummaryScreen without celebratory animation, confetti, or praise. GOOD-DESIGN-PRINCIPLES.md §E Lesson Reward requires dynamic moment of achievement, especially on full-screen immersive experience where emotional weight is high.
  - `P2` Voice state feedback same as RobotCompanionScreen (icon-only): voiceState icon changes (🤖/🎙️) without animated or animated waveform. User uncertain if mic is actively recording during critical speaking moment.
- **Redesign:**
  - Verify FullscreenLessonScene rendering: visually confirm that scene content (video, character, lesson visuals) fills viewport correctly on iPad landscape and phones in landscape. If scene is scaled down or centered with black bars, fix to fullscreen-fill.
  - Implement responsive choice positioning: detect screen aspect ratio (landscape vs. portrait); on landscape, position choices at bottom: insets.bottom + 96 (current); on portrait, reflow to single column or modal overlay above footer. Test on both orientations.
  - Apply Garden Blue to background: replace black (#000000) with sky-blue or gradient (e.g., linear-gradient from sky-blue top to lighter blue bottom). Or render a subtle sky-texture behind video to maintain playful tone.
  - Unify choice styling: extract choice button styles into a shared component or theme token. RobotFullscreenLessonScreen and LessonSessionScreen should render identical choice affordances, just in different contexts (floating vs. stacked).
  - Responsive footer: detect orientation; on landscape, keep flex row layout; on portrait, stack buttons vertically or render as floating action buttons at safe zone (bottom 10%, not full-width). Ensure 44px touch targets.
  - Add transcript expansion: render 'Show more' link if transcript exceeds 3 lines; tapping opens modal or expanded view.
  - Implement celebration on finish: before navigating to summary, play confetti (if !prefers-reduced-motion), show celebratory headline, and display learner metrics for 2-3s. Then fade to summary.
  - Enhance voice state visual: add animated icon (mic with waveform during recording, speaker during playback) instead of emoji-only. Use semantic color (blue = listening, pink = speaking, yellow = thinking).

---

## Device Pairing Feature

_Mixed parent-operational lane throughout. PairAddScreen, PairIntroScreen, PairFoundScreen, PairQrScanScreen, PairCodeScreen, PairConnectingScreen, PairFailedScreen, PairWifiScreen, PairWifiPasswordScreen are operational/parent-facing setup screens. PairRenameScreen is parent-operational hybrid (COPPA-safe child profile selection without collecting name/photo, robot naming optional). PairSearchScreen is operational (BLE scanning, picker for multiple devices). PairSuccessScreen is parent celebratory. PairOfflineScreen is parent reconnection guidance. PairFirstLessonScreen is parent expectation-setting. PairChildProfileScreen is child-lane bridge (thin wrapper to onboarding ChildProfileScreen reuse)._


### PairAddScreen.tsx  · `parent` · **P1**
- **Purpose:** Entry point for adding a new robot to an existing account; presents two contextual paths (new robot vs. offline reconnect)
- **Now:** DeviceShell wrapper with RobotDevice (charging emotion, 88px), heading 'Add a Robot', calm explanatory text (3-minute pairing estimate), two TouchableOpacity card options with robot icon, title, subtitle, chevron. Uses DV tokens (card, ink, ink2, ink3, hair, accent). Card styling: borderRadius 14, padding 16, borders via DV.hair token.
- **Issues:**
  - `P1` Two equal-weight cards violate One Primary Action Per Screen (GOOD-DESIGN-PRINCIPLES §1). Cards are same size/weight; 'I have a new Robot' (new pairing) should be 30-40% more prominent since it's the primary path. Subtitle text for 'new Robot' is weaker (DV.ink3) than for 'offline' path, reversing the visual hierarchy.
  - `P2` Missing subtle state-change feedback. No indication that touching a card creates a loading/transition state. Cards should have active opacity feedback for mobile touch confirmation.
- **Redesign:**
  - Redesign to One Primary Action: Make 'I have a new Robot' the primary DeviceBigBtn (full width, prominent). Move 'My Robot is offline' to a secondary button (30-40% less prominent per DESIGN.md). Rationale: Primary path is more common; secondary is recovery only (GOOD-DESIGN-PRINCIPLES §1).
  - Verify touch target sizes are 44px minimum (current CardButtons appear ~60px tall with padding, which is acceptable; verify with inspection).

### PairIntroScreen.tsx  · `parent` · **P1**
- **Purpose:** Power-on instructions before pairing; explains how to activate robot and optimal distance
- **Now:** DeviceShell with RobotDevice (charging emotion, 180px), bold heading 'Power on your Robot' (22px, -0.3 letterSpacing), descriptive body text (13px, DV.ink2), three numbered step cards in a vertical list. Each step has a circular numBadge (26px diameter, DV.accent bg, #fff text) and left-aligned step text. Cards use DV.card background, DV.hair borders, borderRadius 12.
- **Issues:**
  - `P0` Step numbering is purely numeric (1, 2, 3) without visual confirmation of sequence or current position. Violates State Visibility Before Decoration (GOOD-DESIGN-PRINCIPLES §3). Parent has no indication which step they are on or whether they've completed a step. This is especially important in a multi-step pairing funnel.
  - `P1` No reduced-motion support for RobotDevice animation (180px celebration animation may be distracting to neurodivergent users). GOOD-DESIGN-PRINCIPLES §10 requires prefers-reduced-motion override. Component likely lacks this check.
  - `P2` Body text is 13px (DV.ink2 secondary color). For a procedural instruction screen, body should be 14px DV.ink (primary) to ensure contrast and readability. Current styling relegates instructions to secondary priority.
- **Redesign:**
  - Add Visual Progress: Replace numeric badges with check + completed-step styling. Show current step with a different visual state (e.g., highlighted ring) and completed steps with a checkmark. This signals progress and current location (GOOD-DESIGN-PRINCIPLES §3, State Visibility).
  - Verify RobotDevice respects prefers-reduced-motion in LCDFace component. If animation plays on all users, wrap with useReducedMotion hook and replace with static pose when motion is disabled (GOOD-DESIGN-PRINCIPLES §10).
  - Change body text color from DV.ink2 to DV.ink and increase font size to 14px to emphasize procedural importance.

### PairFoundScreen.tsx  · `operational` · **P1**
- **Purpose:** Confirm found robot identity and initiate pairing claim; orchestrates zero-code or QR/code fallback paths
- **Now:** DeviceShell with horizontal card showing RobotDevice (paired emotion, 84px), serial number, green dot + 'Ready to pair' status, signal/battery metadata. Warning text: 'Make sure this is your Robot' (bolded 'your'). Conditional status box with title/body for claim phase messaging. Three buttons: primary 'This is my Robot' (changes label during claiming), secondary 'Try again' (only on retryable fail), secondary 'Scan QR or enter code' (only on zero-code fail), secondary 'Search again'. Uses DV tokens throughout.
- **Issues:**
  - `P1` Three secondary buttons create cognitive overload and violate One Primary Action Per Screen (GOOD-DESIGN-PRINCIPLES §1). 'Search again' and 'Scan QR...' are both visible simultaneously with different meaning (retry vs. fallback). Only one should be visible based on claim state.
  - `P1` Signal/Battery metadata (DV.ink3 muted) is visually de-emphasized but operationally important. Parent may miss a low-battery warning that leads to pairing failure. Should be more prominent or have conditional alert styling (orange/red) if <20%.
  - `P2` Green dot for 'Ready to pair' is color-only status (WCAG violation per GOOD-DESIGN-PRINCIPLES §6, State Visibility Before Decoration). No text label on the dot itself; only adjacent 'Ready to pair' text. If text is removed or wraps differently on small screens, status is lost.
- **Redesign:**
  - Reduce visible buttons: Show only primary CTA + conditional secondary (retry OR fallback, not both). When claim fails and is retryable, show 'Try again' primary + 'Search again' secondary. When fallback is needed, show 'Scan QR or enter code' primary + 'Search again' secondary. Never show 3+ actions (GOOD-DESIGN-PRINCIPLES §1).
  - Elevate battery/signal: If battery <20% or signal weak, show warning card above robot details with orange/red styling + actionable text ('Charge Robot to 20%+' or 'Move Robot closer'). Otherwise keep metadata as secondary info (DV.ink3).
  - Combine status indicator: Replace green-dot-only with icon + label combo (green circle + 'Ready' or icon + text), ensuring status is never color-only (GOOD-DESIGN-PRINCIPLES §6).

### PairIntroScreen.tsx  · `parent` · **P0**
- **Purpose:** [DUPLICATE ENTRY - see prior PairIntroScreen]
- **Now:** [See prior entry]

### PairOfflineScreen.tsx  · `parent` · **P1**
- **Purpose:** Reconnection guidance when robot is offline; provides troubleshooting tips and reconnect flow
- **Now:** DeviceShell with RobotDevice (reconnect emotion, 170px), heading 'Robot needs a reconnect' (20px), explanatory text. Section 'Try this' with three tips in a bordered card: each tip has emoji icon (32x32 bg), title (14px, bold), body (12px, DV.ink2). Tips map to specific problems (charging, WiFi, setup mode). Two buttons: primary 'Reconnect now', secondary 'Contact support'. Uses DV tokens.
- **Issues:**
  - `P1` Emoji icons (🔌, 📶, 🔄) are not semantic state indicators; they are decorative Unicode symbols. Violates WCAG accessibility (GOOD-DESIGN-PRINCIPLES §6, State Visibility). A screen reader announces 'plug emoji' not 'charging recommended.' Tips should have aria-labels or icon text equivalents.
  - `P1` One tip ('Open setup mode') has no actionable link (nav: null). Parent reads the tip but has no way to act on it immediately—they must manually navigate to settings. Only 'Update Wi-Fi' has a nav link (PairWifiScreen). This inconsistency violates Progressive Disclosure (GOOD-DESIGN-PRINCIPLES §4): all tips should either be actionable or equally non-actionable.
  - `P2` Tip card is a static layout list, not an interactive checklist. No indication which tips apply to the user's specific problem. Parent must manually try all three steps.
- **Redesign:**
  - Replace emoji icons with symbol system: Use semantic icons (charging icon, WiFi icon, refresh/cycle icon) + alt text. Assign proper accessibility labels for each tip (e.g., 'Charging recommendation', 'Wi-Fi update', 'Setup mode').
  - Make all tips interactive: Add primary action buttons to all tips ('Charge now' → link to system settings, 'Update Wi-Fi' → PairWifiScreen, 'Open setup mode' → instructions in bottom sheet or modal). If action can't be taken in-app, replace with clear instructional text (GOOD-DESIGN-PRINCIPLES §4, Progressive Disclosure).
  - Optional: Add conditional visibility. If battery API indicates <20%, highlight 'Charging' tip visually. If WiFi is unstable, highlight 'Update WiFi' tip. Match guidance to actual system state (GOOD-DESIGN-PRINCIPLES §3, State Visibility).

### PairQrScanScreen.tsx  · `operational` · **P1**
- **Purpose:** Scan robot's QR code for pairing code extraction; fallback manual entry path
- **Now:** DeviceShell with instruction text (14px, DV.ink2, centered). CameraView component with overlay: black #000 background, 220x220 viewfinder square with 3px accent-colored border, borderRadius 12. Below camera: error message (red #E53E3E, 14px) with 'Try again' dismiss button (secondary link, DV.accent). Manual entry link at bottom ('Enter code manually'). Camera permission handling with conditional UI for 'Checking' vs. 'Denied' states.
- **Issues:**
  - `P1` Viewfinder preview (220x220 square on camera) is not centered visually on the camera sensor FOV. Parent may frame the QR code incorrectly. No alignment guides (e.g., corner markers or grid lines) to help parent position the code within the viewfinder (GOOD-DESIGN-PRINCIPLES §7, Mobile-First Density).
  - `P1` Error message color is bare red (#E53E3E) without icon or state label. Violates WCAG AA contrast + color-only state signal (GOOD-DESIGN-PRINCIPLES §6). Should have an error icon (⚠️ or ❌) + text prefix 'Error:'.
  - `P2` No reduced-motion consideration for camera stream or UI animations (unlikely, but if camera has autoexposure pulse animations, they should be testable for motion sensitivity).
- **Redesign:**
  - Enhance viewfinder: Add corner markers (small lines at 4 corners of the 220x220 square) to help parent align QR code. Add subtle grid or center cross-hair to guide framing (GOOD-DESIGN-PRINCIPLES §7, Mobile-First Density).
  - Fix error messaging: Change 'This QR code is not...' to 'Error: Invalid QR code. Please try again.' Add a ⚠️ or ❌ icon (12px) left of text. Ensure red + icon = accessible error signal (GOOD-DESIGN-PRINCIPLES §6).
  - Add camera permission prompting: Current 'Allow Camera' button is secondary (line 96). Make it primary when permissions are needed, since scanning can't proceed without it (GOOD-DESIGN-PRINCIPLES §1, One Primary Action).

### PairCodeScreen.tsx  · `operational` · **P1**
- **Purpose:** Manual entry of 6-digit code displayed on robot's LCD screen
- **Now:** DeviceShell. LCD-style mock display (black #0E1116 bg, 48px monospace digits) showing '------' as placeholder. TextInput with keyboardType='number-pad', maxLength 6, validation via regex. 'Confirm & continue' primary button (enabled only when 6 digits entered). 'Codes don't match' secondary text link for error recovery. Uses DV tokens for text, custom styles for LCD.
- **Issues:**
  - `P1` LCD mock display is not semantic. It visually mimics the robot's screen but provides no accessible label. Screen reader announces 'image' or text value '------', not 'Robot code display' (WCAG violation per GOOD-DESIGN-PRINCIPLES §6). No aria-label on the LCD box.
  - `P1` TextInput placeholder 'e.g. 123456' or similar is missing. User sees empty field, not a hint about 6-digit format. Current code shows no placeholder attribute; validation happens silently (button disabled until 6 chars).
  - `P2` No visual feedback when code is entered vs. waiting. User types 6 digits; button goes from disabled to enabled. No confirmation UX (e.g., 'Code entered. Confirming...' or success highlight). Violates Motion + Affordance (GOOD-DESIGN-PRINCIPLES §8).
  - `P2` 'Codes don't match' secondary link appears to be hardcoded as a label, not a dynamic error. Should only appear after a failed submission attempt.
- **Redesign:**
  - Add semantic LCD label: Wrap LCD box with aria-label='Code shown on Robot's screen (do not share this code)'. Add small text below display: 'Enter the 6-digit code shown on your Robot.' (GOOD-DESIGN-PRINCIPLES §6).
  - Add TextInput placeholder: Set placeholder='000000' (greyed out, shows digit positions). On focus, highlight all text so user can type immediately (selectTextOnFocus already set; good).
  - Add code-entered feedback: When user enters 6 digits, briefly highlight the code field (green border or background tint) or show a checkmark next to the input. Once confirm is tapped, show 'Verifying code...' loading state on button (GOOD-DESIGN-PRINCIPLES §8, Motion + Affordance).
  - Conditional error display: Only render 'Codes don't match' link if there was a prior failed submission (track in component state: const [codeError, setCodeError] = useState(false)).

### PairConnectingScreen.tsx  · `operational` · **P0**
- **Purpose:** Orchestrate provisioning workflow; poll for device authentication and guide parent through multi-step process with animated feedback
- **Now:** DeviceShell. RobotDevice (reconnect emotion, variable size), animated heading (changes text: 'Hang tight', 'Robot authenticated', 'Pairing failed' based on status). Vertical step list: 4 steps with animated dots (pending=gray, active=blinking white, done=green checkmark). Complex state management: two provisioning paths (BLE local vs. backend), polling loops (3000ms interval, 5min timeout), claim confirmation recovery. Error handling with recovery attempt ID. Uses DV tokens, RobotDevice for emotion.
- **Issues:**
  - `P0` Animated heading text changes without visual transition guidance. Parent sees 'Hang tight' then suddenly 'Robot authenticated' without knowing what triggered the change or how long to wait. Violates State Visibility Before Decoration (GOOD-DESIGN-PRINCIPLES §3). No progress bar, ETA, or 'step X of 4' label to indicate progression.
  - `P0` Animated dots (blinking white for active step) are motion-heavy and may violate prefers-reduced-motion expectations (GOOD-DESIGN-PRINCIPLES §10). No check for useReducedMotion hook; animation likely plays unconditionally. User with vestibular sensitivity may experience discomfort.
  - `P1` No timeout indication to parent. Polling timeout is 5 minutes (300000ms), but screen shows no countdown, 'Waiting...' message, or 'Still waiting?' reassurance text. After 2 minutes of silence, parent assumes pairing is stuck. Should show 'This can take up to 5 minutes' or a progress indicator.
  - `P1` Step labels are unclear. 'Ensure Robot in range', 'WiFi credentials queued', 'Device online', 'Provisioning claimed' (inferred from code) are invisible to parent. Only visual dots show progression; no text explains what each step is doing.
- **Redesign:**
  - Add text-based progress: Replace/supplement animated dots with a numbered step list: 'Step 1 of 4: Connecting to Robot...' → 'Step 2 of 4: WiFi configured...' etc. Update heading + step number simultaneously so parent always knows where in the flow they are (GOOD-DESIGN-PRINCIPLES §3, State Visibility).
  - Add time guidance: Display 'This usually takes 30-60 seconds' or 'Can take up to 5 minutes if your WiFi is busy'. After 60 seconds of waiting, show friendly message: 'Still connecting... patience is great!' (GOOD-DESIGN-PRINCIPLES §5, Warmth & Reassurance).
  - Respect reduced motion: Wrap RobotDevice and animated dots in a useReducedMotion hook. When motion is disabled, replace blinking animation with a static checkmark or progress ring (not animated). Dots should just appear/change state without motion (GOOD-DESIGN-PRINCIPLES §10).
  - Label steps clearly: Add text under step list: '1. Connecting | 2. Setting WiFi | 3. Checking cloud | 4. Finalizing'. Update dynamically as parent progresses (GOOD-DESIGN-PRINCIPLES §1, One Primary Action / Clear Step).

### PairFailedScreen.tsx  · `operational` · **P1**
- **Purpose:** Error recovery screen with actionable diagnostics; matches error codes to reason cards and recovery paths
- **Now:** DeviceShell. RobotDevice (gentle emotion). Heading + body copy specific to error code (e.g., 'WiFi password was wrong'). Four emoji-icon reason cards (Robot asleep, Wrong WiFi password, Too far, Battery low) with problem/solution text. Multiple secondary buttons: 'Open WiFi settings', 'Open Bluetooth settings', 'Open app settings', 'Try again', 'Contact support'. Late-claim recovery effect re-checks claim status and auto-advances if CLAIM_CONFIRMED. Uses DV tokens.
- **Issues:**
  - `P1` Reason cards use bare emoji icons (🤖, 🔐, 📶, 🔋) without semantic labels. Violates WCAG accessibility (GOOD-DESIGN-PRINCIPLES §6, State Visibility Before Decoration). Screen reader announces 'robot emoji' not 'Robot disconnected or in sleep mode'.
  - `P1` Four visible reason cards + multiple secondary buttons (6+ actions) create severe cognitive overload. Violates One Primary Action Per Screen (GOOD-DESIGN-PRINCIPLES §1). Parent doesn't know which reason applies to their situation without reading all four.
  - `P1` App-settings button is conditional but not all error codes have a mapped action button (some only have text guidance). Inconsistent Progressive Disclosure (GOOD-DESIGN-PRINCIPLES §4): some errors are fixable in-app, others require manual steps. UX boundary is unclear.
  - `P2` Late-claim recovery effect auto-advances parent without showing a success screen. Parent taps 'Try again', and suddenly navigates to PairRenameScreen without explanation. Should show intermediate 'Claim successful!' screen first (GOOD-DESIGN-PRINCIPLES §8, Affordance & Feedback).
- **Redesign:**
  - Match error code to single prominent card: Instead of 4 always-visible reason cards, show only the most likely reason card for the detected error code. Keep other reasons in a collapsible 'Other possible causes' section (GOOD-DESIGN-PRINCIPLES §1, Progressive Disclosure).
  - Replace emoji with semantic icons: Change 🤖 → device icon + label 'Robot disconnected', 🔐 → lock icon + 'WiFi password error', etc. Add aria-labels for accessibility (GOOD-DESIGN-PRINCIPLES §6).
  - Reduce button count: Show only the primary recovery action for the detected error (e.g., 'Open WiFi Settings' for WIFI_AUTH_FAILED). Add a secondary 'Try again' button and a tertiary 'Contact support' link. Hide unrelated buttons (GOOD-DESIGN-PRINCIPLES §1, One Primary Action).
  - Add success confirmation: Before auto-advancing from late-claim recovery, show 'Claim confirmed. Moving to next step...' for 1-2 seconds, then navigate. Or show PairSuccessScreen briefly before PairRenameScreen (GOOD-DESIGN-PRINCIPLES §8, Affordance).

### PairRenameScreen.tsx  · `parent` · **P1**
- **Purpose:** COPPA-safe child profile avatar selection and robot naming; carries pairing context forward if no active child profile exists
- **Now:** DeviceShell. Intro text explaining avatar selection (COPPA note: 'We don't ask for child name or photo'). Section 'Buddy' with 8 emoji-button grid (22% width each, aspect ratio 1:1, borderRadius 14, with selection state highlighting: #FFF1C2 bg, 2px coral border). Section 'Robot's name (optional)' with pressable card: emoji icon (🤖) + TextInput (18px, maxLength 40, placeholder 'Living-room Robot'). Hint text below. Primary button 'Save & continue'. Uses DV tokens.
- **Issues:**
  - `P1` Buddy grid buttons are too small on mobile (22% width ≈ 70-80px on 360px viewport). Selection hit target is below 44px minimum (WCAG AA per GOOD-DESIGN-PRINCIPLES §2, Mobile-First Density). Active opacity feedback (0.7) is insufficient; no clear visual selection confirmation.
  - `P1` Selected buddy button has inline style (hardcoded #FFF1C2 bg, #FF6F61 border) instead of using DV tokens. Violates design token consistency (DESIGN.md §3, Tokens Only). If theme changes, this button won't follow.
  - `P2` Robot name input has 40-char maxLength but no character count display. Parent can't see how many characters remain. TextInput is 18px (large), which is good for mobile, but no visual feedback when text reaches limit.
  - `P2` Emoji icons (🐼, 🦊, etc.) are not localized. If app supports RTL languages (Arabic, Hebrew), emoji display and grid layout may break. Current grid assumes LTR.
- **Redesign:**
  - Increase buddy button sizes: Change width from '22%' to '30%' or use fixed 80px (with gap: 8) to ensure 44px+ touch target. Test on 320px viewport; may need to show 3 columns instead of 4. Selection state should use a 2-3px accent ring + subtle background tint (not just border).
  - Use DV tokens for selection: Replace hardcoded #FFF1C2 and #FF6F61 with theme-aware tokens (e.g., DV.accent + semi-transparent overlay). Define these in Device-tokens if missing.
  - Add character count to robot name input: Display 'X / 40' below the TextInput so parent knows remaining capacity. When maxLength is reached, show count in a secondary color (DV.ink3).
  - Test RTL support: Verify grid layout and emoji display on RTL languages. If RTL causes issues, add direction-aware styling or document RTL limitations.

### PairSearchScreen.tsx  · `operational` · **P1**
- **Purpose:** BLE scanning for nearby robots; single-device fast path or multi-device picker for disambiguation
- **Now:** DeviceShell. Three states: 'searching' (BLE scan in progress), 'choosing' (multi-robot picker), 'bluetoothOff' (Bluetooth disabled state). Searching state: three concentric pulse rings (200x200px, borderRadius 100, opacity 0.5 fading), center Bluetooth SVG icon, heading 'Looking nearby...', explanation text (13px, DV.ink2, 280px max width), 'I don't see my Robot' link. Choosing state: ScrollView with robot list (each row: name + serial, chevron, DV.card bg, DV.hair border). Bluetooth-off state: heading + explanation + 'Try again' link. Uses DV tokens throughout.
- **Issues:**
  - `P1` Pulse ring animation (200x200px circles with borderWidth 2) is continuous and not respecting prefers-reduced-motion. Parent with vestibular sensitivity may experience discomfort during the 3-second+ BLE scan loop (GOOD-DESIGN-PRINCIPLES §10). No reduced-motion override in code.
  - `P1` Multi-device picker (choosing state) shows serial number only if different from display name (line 264: conditional render). If displayName === serialNumber, no fallback is shown. Parent with multiple identical robots (same serial display) can't distinguish them. Should always show both name and serial, or add last-seen timestamp as tiebreaker.
  - `P2` No ETA for scan completion. Searching state says 'Looking nearby...' but doesn't say 'This takes about 10 seconds' or show a progress bar. Parent may think the app is frozen.
  - `P2` Bluetooth-off state explanation is brief. No link to open system Bluetooth settings directly (iOS Settings app can't be deep-linked easily, but Android can). Current 'Try again' link just retries the BLE scan, not opening settings.
- **Redesign:**
  - Respect reduced motion: Wrap pulse ring animation in useReducedMotion hook. When motion is disabled, replace animated rings with a static search icon or indeterminate progress bar (static or very subtle pulse <0.2 opacity). Animation should never play on motion-sensitive users (GOOD-DESIGN-PRINCIPLES §10).
  - Show both name and serial always: Even if displayName === serialNumber, show both fields. Add timestamp or signal strength below to help parent disambiguate (GOOD-DESIGN-PRINCIPLES §3, State Visibility). Example: 'Living room Robot / ABC123 · Signal: Strong'.
  - Add scan ETA: Display 'Scanning for Robot (about 10 seconds)' at the top of the searching state. When user taps 'I don't see my Robot' after 10 seconds, transition to a failure screen with retry + manual fallback options.
  - Deep-link Bluetooth settings: For Android, attempt to launch Android Settings app with ACTION_BLUETOOTH_SETTINGS intent. For iOS, add a 'Open Settings' button that opens Settings URL (prefs:root=Bluetooth for iOS 16+, fallback to manual instructions).

### PairSuccessScreen.tsx  · `parent` · **P2**
- **Purpose:** Celebratory confirmation after robot authentication; sets expectations for next steps (child lesson play on robot)
- **Now:** DeviceShell. RobotDevice (celebrate emotion, 200px, coral accent). Heading 'Your Robot is ready' (24px, -0.3 letterSpacing). Explanatory body (14px, DV.ink2, 300px max width). Three-item fact card (DV.card bg, DV.hair border, borderRadius 14) with emoji icons ('OK', 'Wi', 'ID') and fact title + body. Icons are plain text (16px), no background. Button 'Continue' routes to PairFirstLessonScreen. Uses DV tokens.
- **Issues:**
  - `P1` Fact icons are bare text ('OK', 'Wi', 'ID') without semantic meaning. Not accessible (screen reader announces 'O K' not 'authentication' or 'verification'). Violates WCAG accessibility (GOOD-DESIGN-PRINCIPLES §6, State Visibility Before Decoration).
  - `P2` Body text mentions 'Robot authenticated with the cloud' and 'provisioning attempt' (technical jargon). Parent audience doesn't need this detail. Simplify to 'Your Robot is connected and ready for your child's first lesson' (GOOD-DESIGN-PRINCIPLES §5, Warmth & Clarity).
  - `P2` No visual indication that 'Continue' is the primary action. Button styling should make it prominent (primary DeviceBigBtn already applied; acceptable). But preceding text and fact cards don't de-emphasize; all elements have equal visual weight.
- **Redesign:**
  - Replace plain-text icons with semantic symbols: Change 'OK' → checkmark circle ✓, 'Wi' → WiFi icon, 'ID' → device/identity icon. Add aria-labels: 'Robot authenticated', 'Network configured', 'Device linked'. Icons should have small colored backgrounds (e.g., DV.accent at 10% opacity) for visual separation (GOOD-DESIGN-PRINCIPLES §6).
  - Simplify body text: Remove technical terms. Change to 'Your Robot is now ready for your child. The next lesson will play on the Robot, not your phone.' (GOOD-DESIGN-PRINCIPLES §5, Warmth & Clarity).
  - Optional: Replace fact card with celebratory visual. Instead of a dry list, show a simple illustration or animated checkmarks appearing one-by-one. Tone-match the celebratory RobotDevice emotion (GOOD-DESIGN-PRINCIPLES §5, Warmth).

### PairWifiPasswordScreen.tsx  · `operational` · **P1**
- **Purpose:** Capture WiFi password and optional custom network name; submit to pairing connecting flow
- **Now:** DeviceShell. Intro text: 'Enter the Wi-Fi password. Robot will remember it...' (14px, DV.ink2). Conditional section for manual network name (if manualSsid). TextInput for password (18px, secureTextEntry toggle, placeholder translatable, minHeight 44, paddingVertical 8). Show/hide toggle: checkbox-styled TouchableOpacity (18x18 checkBox with white checkmark SVG, label 'Show password'). Primary button 'Connect Robot' (disabled if !ssid || !password). Uses DV tokens.
- **Issues:**
  - `P1` Show/hide toggle checkbox (18x18) is below 44px touch target minimum. Violates WCAG AA mobile touch guidance (GOOD-DESIGN-PRINCIPLES §2, Mobile-First Density). Parent with large fingers may struggle to toggle visibility.
  - `P1` Checkbox styling is custom (white checkmark on DV.accent bg). When unchecked, no visual state is shown—it's just empty space. Should have a visible border or outline when unchecked (WCAG accessibility). Current 'selected' state is only accessible via aria-state, not visually clear.
  - `P2` Network name input (manualSsid case) uses same TextInput styling as password but lacks minHeight 44. Verify touch target is adequate. Placeholder text is translatable but no visible label above input; section label 'Network name' is small (11px, uppercase).
  - `P2` No password strength indicator. Parent enters weak password (e.g., 'password') with no warning. Could show real-time feedback: 'Weak password' → 'OK' → 'Strong' based on entropy.
- **Redesign:**
  - Increase toggle target: Expand checkbox to 44x44 touchable area (visual checkbox 18x18 centered within the larger tap target). Add padding around the checkbox so label + checkbox together hit 44px height (GOOD-DESIGN-PRINCIPLES §2, Mobile-First Density).
  - Add visual unchecked state: When visibility toggle is OFF, show a bordered rectangle (gray DV.hair border) with unchecked appearance. When ON, show filled DV.accent checkbox with checkmark. Ensure contrast ≥ 3:1 for unchecked state (GOOD-DESIGN-PRINCIPLES §6).
  - Elevate network name label: If manualSsid, make 'Network name' label larger (14px, bold, DV.ink) with textAlign 'left'. Match styling to password label for consistency.
  - Optional: Add password strength indicator: Real-time feedback showing 'Password is weak' → 'OK' → 'Strong' based on length + entropy. Use green DV.good for 'Strong', orange for 'OK', red for 'Weak'. Do NOT require strong passwords; WiFi passwords are low-risk entropy.

### PairWifiScreen.tsx  · `operational` · **P1**
- **Purpose:** Scan and display nearby WiFi networks; allow manual entry for unlisted networks
- **Now:** DeviceShell. Info box (light gray #EEF1F5, borderRadius 12, padding 14): 'Why Wi-Fi?' explanation with justified text (13px, DV.ink2, lineHeight 22). 'Networks nearby' section label (11px, uppercase, DV.ink3). Network card (DV.card bg, DV.hair border, borderRadius 12) listing scanned networks. Each network row: TouchableOpacity with SSID + signal strength (DV.ink3, 12px). Scanning state shows 'Scanning from Robot...' placeholder. Failed state shows 'Robot scan unavailable' or 'No networks found' (same row styling). Conditional 'Rescan networks' link. 'Other network...' link for manual entry. Uses DV tokens.
- **Issues:**
  - `P1` Network list rows are interactive TouchableOpacity but touch target is minimal (paddingVertical 12, paddingHorizontal 14, fontSize 15). Measured height ≈ 48px (acceptable), but on wide phones, network name may wrap, reducing visual hit area. Verify 44px minimum on all screen widths.
  - `P1` Signal strength label (Strong/OK/Weak) is in DV.ink3 (muted color). Parent may not notice signal quality. If signal is 'Weak', should be orange/warning color to alert parent that network may drop (GOOD-DESIGN-PRINCIPLES §3, State Visibility Before Decoration).
  - `P2` Scanning state placeholder text 'Scanning from Robot...' stays visible until scan completes. No progress indication (e.g., percentage, spinner, or animated dots) to reassure parent the scan is in progress. After 5+ seconds of 'Scanning', parent assumes it's frozen.
  - `P2` Info box explanation 'Why Wi-Fi?' uses justified text with uneven spacing. Text color is DV.ink2 (secondary), making the explanation feel less important. Should be DV.ink (primary) for emphasis.
- **Redesign:**
  - Verify touch targets on all widths: Ensure network row height is ≥44px even if SSID wraps. Add paddingVertical 14 (currently 12) to guarantee hit area.
  - Color-code signal strength: Change DV.ink3 (muted) to conditional color: Strong = DV.good (green), OK = DV.ink3 (muted), Weak = #FF6F61 (warning orange). Visually signals network quality to parent (GOOD-DESIGN-PRINCIPLES §3, State Visibility).
  - Add progress indication during scan: Replace 'Scanning from Robot...' placeholder with animated scanning indicator (e.g., '⊙ Scanning... 30%' with animated dot, or spinner). Show elapsed time: 'Scanning for 8 seconds...' after 5 seconds to reassure parent.
  - Elevate Why-WiFi box: Change text color from DV.ink2 to DV.ink. Add a 'ℹ️' icon (12px) left of text to emphasize importance. Or move the box below the network list as a note (currently it's above, which may be overlooked).

### PairFirstLessonScreen.tsx  · `parent` · **P2**
- **Purpose:** Set expectations for first lesson; explain that lesson plays on robot, not phone; provide reassurance for parents
- **Now:** DeviceShell. 'For grown-ups' banner (top, coral background). RobotDevice (happy emotion, 220px). Hero title 'Robot is waiting!' (24px, serif font implied by Wispr Flow aesthetic). Subtitle explaining the next step. Three-step numbered list in card: step items with coral 24x24 numbered badge. NEXT_STEPS constant defines steps: '1. Robot greets child', '2. 4-minute lesson plays on robot', '3. You'll see summary here'. Primary button 'Hand it to your child' (warm coral #FF6F61 accent). Reassuring note at bottom. Uses DV tokens, warm parent-lane aesthetic.
- **Issues:**
  - `P1` Numbered badges (24x24) are too small and don't follow 44px touch target minimum. Not interactive (display-only), but visual prominence is low. Number '1', '2', '3' in white on coral (#FF6F61) background: contrast is acceptable (4.5:1) but small text (10px inferred) may be hard to read on small screens.
  - `P2` Subtitle text and step descriptions are in DV.ink2 (secondary color). For a key expectation-setting screen, body copy should be DV.ink (primary) to ensure emphasis. Current styling relegates the message to secondary priority.
  - `P2` No indication of lesson duration on the robot. Step says '4-minute lesson plays on robot' but parent may be confused if lesson is shorter or longer. No visual progress bar or timer shown. Parent should know what to expect (GOOD-DESIGN-PRINCIPLES §3, State Visibility).
  - `P2` CTA 'Hand it to your child' is warm but may be unclear to parent. Does clicking this button immediately start the lesson, or just navigate? Should add subtext: 'Robot will greet your child and start the lesson' to clarify action.
- **Redesign:**
  - Enlarge step badges: Change 24x24 to 32x32 (increase from 24px to 32px diameter, font to 14px bold). Keep coral background + white text for contrast. Increase visual hierarchy of the numbered list (GOOD-DESIGN-PRINCIPLES §2, Mobile-First Density).
  - Emphasize step descriptions: Change DV.ink2 to DV.ink for step text. Keep secondary color only for the 'For grown-ups' label and optional subtext.
  - Add lesson duration clarity: Change step 2 to '2. Robot guides a short 4-minute lesson (your child can do this!)' to reassure parent the time is appropriate for young children. Or show a [⏱ ~4 min] icon next to the step (GOOD-DESIGN-PRINCIPLES §3, State Visibility).
  - Clarify CTA action: Add subtext under button: 'Robot will greet your child and start learning' or 'Hand Robot to your child to begin'. Make the action explicit (GOOD-DESIGN-PRINCIPLES §1, One Primary Action / Clear Affordance).

### PairChildProfileScreen.tsx  · `child` · **P2**
- **Purpose:** Thin wrapper routing from pairing flow to child profile creation; bridges pairing context to onboarding (when no active child exists)
- **Now:** Simple passthrough component (14 lines). No UI of its own—navigates to ChildProfileScreen from onboarding, carrying pairing context in params. Used only when PairRenameScreen detects no active child profile (CHILD_PROFILE_NOT_FOUND or zero childId). Reuses existing ChildProfileScreen from onboarding flow.
- **Issues:**
  - `P2` No transitional UI or loading state. Parent navigates to this screen (appears blank) then immediately switches to ChildProfileScreen. No indication that the app is bridging contexts or that a child profile is about to be created. Could show a brief 'Creating profile...' message or transition animation.
- **Redesign:**
  - Optional: Add transitional screen. Instead of a blank passthrough, show a brief 'Let's create a profile for your child' message or animated progression indicator (1-2 seconds) before navigating to ChildProfileScreen. Improves UX continuity (GOOD-DESIGN-PRINCIPLES §5, Warmth & Clarity).
  - Alternatively: Ensure ChildProfileScreen is configured to know it's in pairing context (via params.pairing) and shows appropriate messaging (e.g., 'Finish setup by creating a child profile'). This educates parent that the child profile is required to complete pairing.

---

## device (TJBot Mobile parent lane)

_The device feature area is classified as OPERATIONAL/PARENT LANE (Wispr Flow). All screens serve device management, status monitoring, firmware updates, and pairing flows for parents. No child-facing content. Should consistently use parent tokens (--parent-*) with warm off-white bg, pastel cards, charcoal pill buttons, and serif headings. Current implementation uses a non-standard dark theme (DV tokens from Device-tokens.ts) that conflicts with Wispr Flow authority._


### DeviceHomeScreen.tsx  · `parent` · **P0**
- **Purpose:** Primary device status dashboard. Shows connected device hero (icon, name, online/offline status, battery %, Wi-Fi), sectioned rows for Today's lessons, Robot settings (chime, quiet hours, sync, firmware), and This Robot (buddy avatar, safety, unpair). Central hub for parent device management.
- **Now:** Dark-mode card UI using DV tokens (dark ink, muted text, card fills). Hero card displays robot emoji + device name + status label + battery/Wi-Fi metadata. Row-based sections with emoji icons and gray-on-dark text. Empty states show RobotDevice component (animated mascot face) with centered text and action buttons. No serif typography; sans-serif throughout. Status indicator uses color (green/gray) + text. Cards have 14-18px border radius and subtle shadow.
- **Issues:**
  - `P0` LANE VIOLATION: Uses dark theme (DV tokens) instead of Wispr Flow palette (--parent-bg-0 warm off-white, --parent-bg-1 white cards, --parent-accent purple). Design authority (DESIGN.md §8.1-8.2) mandates parent surfaces use Wispr Flow warm aesthetic. Dark theme is child-lane only or operational-terminal only, not parent dashboard.
  - `P0` NO SERIF TYPOGRAPHY: All text is sans-serif (system font). Design authority (DESIGN.md §8.4) requires serif display for hero headings (28-32px, Georgia/New York stack) and section headings (22-24px serif). Current approach is neutral/clinical, loses premium/warm feel of Wispr Flow.
  - `P1` BATTERY INDICATOR NOT HERO-LEVEL: Battery shown as small emoji '🔋 78%' in metadata text (12px, muted color). Design authority (GOOD-DESIGN-PRINCIPLES.md §G.2) specifies battery as prominent visual centerpiece (circular gauge 80px diameter, color gradient green/yellow/red, large bold percent). Current presentation buries critical device health metric.
  - `P1` STATUS CHIP AMBIGUITY: Online/offline state shown as text label 'Online' or 'Offline' with color change (green/gray). Should pair with semantic icon (●) per Design authority (GOOD-DESIGN-PRINCIPLES.md §2): 'Connected, pairing, offline states visible via text + icon, never color alone.' Current is text + color but lacks visual icon marker.
  - `P1` SECTION ORGANIZATION UNCLEAR: Four sections (Today, Robot, This Robot) flow vertically with small caps labels. Hero card should dominate 60-70% of fold per (GOOD-DESIGN-PRINCIPLES.md §6), but sections are equal-weight. Discovery feed pattern (per Parent Dashboard §F) not applied; learning moments mixed with settings.
  - `P2` ROW CARD TOUCH TARGETS: DeviceRow components use text-only labels with emoji icons. No clear 44px minimum touch target verification visible in JSX. Trailing chevron and icon spacing may be too tight on mobile.
- **Redesign:**
  - Swap dark DV tokens for --parent-* Wispr Flow palette: --parent-bg-0 page bg, --parent-bg-1 white card fills, --parent-accent purple accents, --parent-success green for online status.
  - Add serif typography: Device name (22-24px serif, bold, --parent-ink-0), section headings (11px sans uppercase for labels), body text (16px sans) per §8.4.
  - Redesign battery indicator as hero-level visual: Circular gauge (80px dia) with SVG arc fill, color gradient (green >80%, yellow 30-79%, red <30%), center text '78%' bold serif, positioned in hero card or as separate metric card per (GOOD-DESIGN-PRINCIPLES.md §G.2).
  - Add semantic status icon: Change 'Online' label to '● Online' (bullet + text, green color) or use a status-badge pill (24px height, #E6F9EC fill, #1A7F3C text) per §G.1 Device Status Card spec.
  - Restructure info hierarchy: Hero device card (blush per §8.1 or white) dominates top 60-70%; collapse Today/Robot/This Robot into discovery-feed style moments (emoji, headline, timestamp, optional CTA) scrolling below, or use tabs to separate concerns.
  - Ensure 48px touch targets: DeviceRow wrappers should be ≥48px tall with clear tap feedback (color shift, shadow, scale).
  - Add last-seen timestamp below device name per §G.1: 'Last seen 2 hours ago' in caption style (--parent-ink-2, 13px).

### DeviceOverviewScreen.tsx  · `parent` · **P1**
- **Purpose:** Onboarding/educational screen explaining what the robot device does vs. what the phone does. Three-column layout: hero robot card, two-column feature matrix (Robot does / Phone does), and three Why cards (no phone in hands, eyes up, bounded experience). Call-to-action to set up robot. NOT a status screen; a marketing/education piece.
- **Now:** Light-mode card UI using reference design tokens (reference colors bg, card, ink, line). Hero robot card shows robot photo (154×154 rounded), device name, online status, two metric tiles (Battery/Wi-Fi with color-coded backgrounds). Two-column feature matrix with colored checkmarks (coral, teal). Three why-cards with emoji icons in rounded boxes, title + body text, border separators. Full-width serif heading 'Robot' (30px, dark ink), body subtitle. Button at bottom for CTA. Uses system fonts, no child palette colors.
- **Issues:**
  - `P1` TOKEN SYSTEM INCONSISTENCY: Uses 'referenceColors' and 'referenceTheme' tokens instead of --parent-* Wispr Flow tokens. Design authority (DESIGN.md §8.2) specifies exclusive use of parent token table for parent surfaces. 'referenceColors.cardSoft', 'referenceColors.ink' are non-standard aliases that bypass the design system.
  - `P1` FEATURE MATRIX HIERARCHY: Checkmark colors (coral #FF6F61, teal #2C7E87) are custom inline colors, not Wispr Flow tokens. Should use --parent-accent (#6B4EFF) or semantic colors. Colored checkmarks create visual complexity when DESIGN.md §3 advocates for 'calm operational surfaces' without decorative color.
  - `P1` WHY CARDS LACK SEMANTIC BACKGROUND: Icons in rounded boxes use 'referenceColors.primarySoft' fill (light teal), inconsistent with Wispr Flow card treatment. Should use --parent-bg-2 (muted gray) or --parent-accent-soft (light purple) per §8.3 Card rules.
  - `P2` STATUS TILE DESIGN: Two metric tiles (Battery 78%, Wi-Fi Home) use tone-based coloring (gold/teal) with custom color values. Per §G.1, status should use semantic chips (--parent-success green, --parent-warning orange). Tone-based colors don't align with parent palette.
  - `P2` BUTTON STYLING: DeviceBigBtn component not examined, but CTA 'Set up your Robot' at bottom should be charcoal pill (#1C1C1E, 48px, full-width) per §8.3 Buttons. Current component may not match spec.
- **Redesign:**
  - Replace referenceColors with --parent-* tokens throughout: --parent-bg-0 (page bg), --parent-bg-1 (card white), --parent-accent (hero headings), --parent-ink-0/1/2 (text hierarchy).
  - Feature matrix: Keep checkmarks but recolor both to --parent-accent (purple) or --parent-success (green) to reduce color noise. Remove custom coral/teal; unify to one semantic color per column or use purple accents only.
  - Why-cards: Replace 'referenceColors.primarySoft' with --parent-bg-2 (muted gray) icon backgrounds. Keep emoji inside, add light rounded rect wrapper (12-16px radius, 36×36px).
  - Status tiles: Recolor tone-based fills to --parent-bg-2 (muted) with semantic text colors (--parent-ink-1 for labels). Or convert to small 24px pills with background gradients (green/yellow/red) per Battery spec in §G.2.
  - Typography: Verify serif heading 'Robot' uses font-family from system serif stack (Georgia, 'New York', ui-serif) per §8.4; ensure 30px size matches hero-heading range (28-32px).
  - CTA button: Confirm DeviceBigBtn renders as charcoal pill (--parent-ink-0 background, white text, 48px height, full-width, font-weight 600) per §8.3.

### DeviceFirmwareScreen.tsx  · `operational` · **P0**
- **Purpose:** Firmware update notification and staging screen. Shows update badge (v1.5.0 · 24 MB), what's new changelog (4 bullet points with checkmarks), two CTA buttons (Update tonight recommended / Update now), and disclaimer about quiet hours. Time estimate and availability callout.
- **Now:** Dark-mode UI using DV tokens (dark background, muted card fills). Hero card (16px padding) with RobotDevice emoji (charging emotion, #FF6F61 accent), update badge (11px uppercase 'Update available', warn color), version text (16px), and meta text (12px). Section label 'What's new' (11px uppercase, muted). List card with 4 checkmark items (14px stroke accent color, 14px text). Two buttons below (primary 'Update tonight', secondary 'Update now'), plus disclaimer (12px centered text).
- **Issues:**
  - `P0` LANE VIOLATION: Uses dark DV tokens (dark operational theme) for a parent-facing critical action screen. Design authority (DESIGN.md §8 Parent & Operational Surfaces) specifies parent-lane screens use Wispr Flow warm palette. Firmware updates are a parent responsibility, not an operational terminal view. Should use --parent-* tokens.
  - `P1` UPDATE BADGE VISUAL TREATMENT: 'Update available' shown as 11px uppercase label with warn color. Should be a semantic badge per §G.1: small pill (24px height, #FFF3E0 orange fill, #B35900 text) positioned top-right of hero card per Device Status Card spec.
  - `P1` PRIMARY BUTTON PRIORITY UNCLEAR: Two buttons stacked ('Update tonight', 'Update now') without clear visual hierarchy. Primary should be 30-40% more prominent per (GOOD-DESIGN-PRINCIPLES.md §1). Both use similar styling; secondary should be light pill (--parent-bg-2 fill, --parent-ink-0 text) instead of equal weight.
  - `P1` INFORMATION ARCHITECTURE: Update explanation buried at bottom. Per §6 (Information Architecture), key info should appear top → hero → details → action. Currently: badge/card → list → buttons. Hero card should include 'Why update? (reason)' and 'When will happen' inline, not deferred.
  - `P2` CHANGELOG CHECKMARKS: Styled with DV.accent stroke, 14px SVG. Should use --parent-success (green) or --parent-accent (purple) per parent tokens. List items lack semantic grouping; 'What's new' should be a 'Benefits' card with subheading if 4+ items.
- **Redesign:**
  - Swap dark DV tokens for --parent-* palette: --parent-bg-0 page, --parent-bg-1 card white, --parent-accent purple, --parent-warning orange for update badge.
  - Hero card: Add semantic update badge (24px pill, #FFF3E0 fill, #B35900 text, top-right) per §G.1. Include inline reason ('Bug fixes, better voice recognition') in 16px body text below version.
  - Update timing: Add 'Scheduled for tonight (11 PM) during quiet hours' as clear callout text below hero card, not buried in disclaimer.
  - Button hierarchy: Primary 'Update tonight (recommended)' should be charcoal pill (--parent-ink-0, 48px, full-width, 600 weight). Secondary 'Update now' should be light pill (--parent-bg-2, 48px, full-width, 400 weight) below with reduced visual weight. Add optional 'Schedule for later' ghost link (--parent-accent text).
  - Changelog: If >3 items, group into 'Benefits' or 'Improvements' section with small gray label. Keep checkmarks but recolor to --parent-success (green) per semantic success color.
  - Disclaimer: Move 'Quiet hours' explanation above buttons as helper text (13px, --parent-ink-2) so parent understands timing before tapping.
  - Overall tone: Shift from operational (dark terminal) to operational-but-warm (light Wispr Flow) per parent responsibility framing.

### DeviceSessionScreen.tsx  · `operational` · **P1**
- **Purpose:** Live lesson monitoring screen. Shows real-time LCD face state (listen/think/speak/success via RobotDevice component), current lesson metadata (Unit 2 · Animals, Lesson 4, time remaining, progress bar), and lesson controls (volume, pause, end). Live transcription of what robot sees/says. Streaming/session monitoring surface.
- **Now:** Mix of dark and light tokens. Live LCD card (#1A1A1F dark background, 18px padding, 12px label 'Live · what Robot sees' with muted white text). RobotDevice component (200px size) animated through lesson states. 'Now playing' card below (DV.card fill, 14px padding, progress bar with #EEF1F5 track and DV.accent fill at 62%). Row card with three DeviceRow items (volume, pause, end lesson). Centered disclaimer (12px, muted) at bottom.
- **Issues:**
  - `P1` MIXED PALETTES: Live LCD card uses custom dark background (#1A1A1F, not DV token), while Now Playing uses DV.card. Design authority requires consistent token usage. If operational, use DV throughout; if parent-facing, use --parent-*.
  - `P1` LIVE LABEL TREATMENT: 'Live · what Robot sees' (12px, muted white text) lacks clear visual affordance. Per DESIGN.md §3, state must be visible before decoration. Should add 'Live' badge (green dot + text) or animated pulsing indicator (border, scale) to show streaming status.
  - `P1` PROGRESS BAR COLOR: Uses DV.accent (blue-ish) for fill. Per (GOOD-DESIGN-PRINCIPLES.md §2), progress should use semantic color: --parent-success (green) for lesson progress, or a neutral blue. Current color lacks semantic meaning.
  - `P2` LESSON METADATA DENSITY: 'Unit 2 · Animals', 'Lesson 4 · about 2 minutes left' stacked with progress bar in 14px padding card. Spacing feels tight; no clear hierarchy between lesson title and time remaining. Should separate unit/lesson (card-title 17px) from time (caption 13px).
  - `P2` CONTROL ROWS: Three DeviceRow items (volume, pause, end) lack visual separation from typical settings. 'End lesson' marked danger (red icon), but no confirmation dialog visible; should warn parent before ending active session.
  - `P2` DISCLAIMER POSITIONING: 'Audio stays between Robot and your child...' placed at bottom without visual emphasis. Should be above fold (small 12px icon + text) if privacy is a critical assurance for parents.
- **Redesign:**
  - Standardize palette: If parent-facing lesson monitoring, use --parent-* tokens. If operational/staff view, use consistent DV tokens. Currently mixes both.
  - Live indicator: Add animated 'Live' badge (12px green dot + 'Live' text, pulsing 1.5s scale 1.0 → 1.1) top-left of LCD card. Or add red recording-light animation (small circle, pulsing opacity) per live-streaming UX convention.
  - Progress bar: Recolor from DV.accent to --parent-success (green #34C759) or semantic progress color. Increase track height to 8px for better visibility (currently 6px).
  - Lesson metadata hierarchy: Separate into two lines: (1) Card-title style unit/lesson name (15px, --parent-ink-0), (2) Caption style time remaining (13px, --parent-ink-2). Add optional 'Next up: Unit 3' preview below progress bar.
  - Control rows: Confirm DeviceRow components render at 48px+ touch targets. Add optional chevron indicators or subtle highlighting on tap.
  - End lesson safety: Add confirmation dialog before 'End lesson' press: 'End this lesson? Robot will say goodbye.' with Cancel / End buttons (modal or inline warning toast).
  - Privacy assurance: Move disclaimer above rows or into a small info card (13px, --parent-ink-2 text, light background) near top. Option: 'Lock icon' + 'Your conversations stay private' as compact inline badge.
  - Overall: If this is parent-facing, shift to warm parent palette (--parent-bg-1 card white, --parent-ink-0 dark text). If operational-only, document that explicitly in nav path.

### DeviceLostScreen.tsx  · `parent` · **P0**
- **Purpose:** Find-my-device screen. Parents can trigger robot to play a chime melody for 30 seconds to locate it. Shows robot mascot (sleeping or happy based on chiming state), heading, subheading, last-seen info (time, Wi-Fi, battery), location guess (living room), and CTA button to toggle chiming. Stateful UI with immediate feedback.
- **Now:** Light-to-medium tone. RobotDevice component (180px, emotion toggles between 'sleep' and 'happy', accent #FF6F61). Heading (20px, dark ink, centered, 280px max-width) and subheading (14px, muted ink, 300px max-width, centered, 22px line-height). Two info cards (#12px, dark border, 12px radius, 14px padding): one with green dot + metadata ('Last seen: 2 min ago · Wi-Fi · 78%'), one with location guess ('📍 Probably in: the living room' in bold). Full-width button at bottom (CTA toggles 'Make Robot chime' / 'Stop chime').
- **Issues:**
  - `P0` LANE VIOLATION: Uses DV tokens (dark operational palette) for a parent-facing utility screen. Should use --parent-* Wispr Flow tokens (--parent-bg-0, --parent-bg-1, --parent-ink-0). Parent needs calm, warm reassurance while locating device, not dark operational interface.
  - `P1` INFO CARDS STYLING: Custom inline styling (DV.card, DV.hair border) instead of semantic card component per §8.3. Cards should follow Wispr Flow pattern: white (--parent-bg-1) with --parent-line border, 24px radius, 16px padding.
  - `P1` LOCATION PREDICTION CLARITY: Info card with emoji + text 'Probably in: the living room' lacks visual hierarchy or icon treatment. Should be a clear location pill (icon + rounded box) with higher visual weight per Design authority (GOOD-DESIGN-PRINCIPLES.md §2) 'State Is Visible Before Decoration': location state should be obvious (not buried in text).
  - `P1` CHIMING STATE FEEDBACK: Robot emoji changes from 'sleep' to 'happy' on chiming, heading text toggles ('Can't find Robot?' → 'Robot is chiming!'). No loading/spinner state shown during API call to trigger chime. Should show 'Activating chime...' with spinner while request is in flight per (GOOD-DESIGN-PRINCIPLES.md §7) 'Consistent Interactive Affordances': tap feedback within 100ms.
  - `P2` BUTTON STYLING: DeviceBigBtn component (not examined) should be charcoal pill per parent spec. Visual weight and size must match primary action (48px, full-width, #1C1C1E fill).
  - `P2` SAFE ZONE HAZARD: Robot emoji (180px) positioned top-center with 30px top padding. On notched devices, may conflict with status bar if nav is full-screen. Verify content respects safe-area-inset-top.
- **Redesign:**
  - Swap DV tokens for --parent-* palette: --parent-bg-0 (page), --parent-bg-1 (card white), --parent-ink-0 (dark text), --parent-line (border), --parent-success (green for online dot).
  - Info cards: Use semantic card styling (--parent-bg-1 white fill, --parent-line border, border-radius 24px, padding 16px) per §8.3 Card rules. Remove custom DV.card and DV.hair references.
  - Location prediction: Redesign as prominent location pill (top info card, larger text 16px, icon + location name in bold). Add optional 'Signal strength: strong' metadata below. Format: '📍 Last seen: the living room (just now)' with green status indicator.
  - Chiming feedback: Add 'Activating...' spinner state while API call is pending. Once active, show 'Robot is chiming!' with pulsing animation (optional, respects prefers-reduced-motion). Optional: add countdown timer 'Chiming for 28 seconds' below button.
  - Button: Confirm DeviceBigBtn is charcoal pill (--parent-ink-0, 48px height, full-width, white text) with tap feedback (shadow/scale within 100ms). Secondary 'Stop chime' button should be light pill (--parent-bg-2) if visible simultaneously.
  - Safe zones: Add inset from notch/status bar. Test on iPhone 14+ with Dynamic Island.
  - Tone: Shift from operational dark to warm parent reassurance (off-white background, friendly heading tone, playful robot emoji to reduce anxiety about lost device).

### LCDLessonTurnScreen.tsx  · `operational` · **P2**
- **Purpose:** Technical documentation/reference screen showing the five-state lesson turn sequence (Robot speaks → listens → child speaks → thinks → celebrates). Educational walkthrough with LCD face states, frame timing, transitions, and technical captions. For parent education or staff reference (not a user-facing control screen). Scrollable gallery of lesson turn mechanics.
- **Now:** Light-mode scrollable documentation. Header section (56px top padding, 20px sides, bottom border): kicker (11px, #FF6F61 accent, uppercase), title (22px, dark ink, -0.4 letter-spacing), subtitle (13px, muted, 20px line-height). Five cards (16px padding, 14px radius, dark border) each showing LCDFace (300px size in dark bg), frame badge (top-left, 10px muted text), timing badge (top-right, 10px muted text), and info section (padding 14px): turn label (14px bold), caption (13px, muted), word example (13px italic in light background box). Transitions section below (same card styling, rows with title/body text).
- **Issues:**
  - `P2` LANE AMBIGUITY: Marked 'operational' but visual treatment (light, serif title, clean cards) doesn't match dark DV operational theme or --parent-* parent theme. Screen appears to be internal documentation, not user-facing. Should clarify if this is staff/engineer reference (hide from parents) or parent education (redesign with parent palette).
  - `P2` LCDFace SIZE CONSISTENCY: Each card renders LCDFace at 300px (fullscreen mobile), creating very large cards. On a typical mobile (375px width), card width is ~340px after padding; 300px face leaves only ~20px margin on each side, creating visual tension. Should reduce face size to 200-240px or make cards horizontally scrollable for desktop use.
  - `P2` FRAME/TIMING BADGE TREATMENT: Two small badges (10px text, muted white on transparent) positioned absolutely top-left/right of LCD background. Low contrast against dark bg. Should move badges below LCD or use light backgrounds (pill shapes) for clarity per (GOOD-DESIGN-PRINCIPLES.md §2) 'State Is Visible Before Decoration'.
  - `P2` WORD EXAMPLE BOX STYLING: 'Word' section (13px italic text in #F5F5F2 background, 8px radius). Color is not a design token; should use --parent-bg-2 or DV.cardLight. Also, italic text for code examples is unconventional; consider monospace or light gray background for better semantic distinction.
  - `P1` TRANSITIONS SECTION DENSITY: Below five lesson-turn cards, Transitions section lists 5 state changes (title + body). Each row is 12px padding, 12px top. Text-heavy layout (13px title, 12px body, 20px line-height) may be overwhelming after visual cards above. Should use expandable/collapsible sections or separate scrollable tab.
- **Redesign:**
  - Clarify purpose: If internal/staff documentation, move to separate staff-only section and mark explicitly. If parent education ('How Robot learns'), redesign with --parent-* palette and simplified copy for non-technical parents.
  - Reduce LCDFace size: Change from 300px to 200px or 180px for better mobile card fit. Or allow horizontal scroll for medium/large faces on desktop.
  - Badge repositioning: Move 'frame · 1/5' and timing '~1.4s' below LCD face (in content section) instead of positioned absolutely. Or use light pill backgrounds (--parent-bg-2 or DV.cardLight) for better readability against dark LCD background.
  - Word example styling: Replace custom #F5F5F2 with design token (--parent-bg-2 or DV.cardLight). Consider removing italic style; use monospace font-family or light gray text (--parent-ink-2) instead for semantic distinction.
  - Transitions organization: Either (1) move to collapsible section ('Show transitions >' / 'Hide transitions'), or (2) split into separate tab/screen 'Technical Deep Dive', or (3) place above lesson cards as reference layer.
  - Typography: Verify serif font usage (title 22px, -0.4 letter-spacing suggests intentional serif). If this is staff/engineer-only, consider sans serif for clarity. If parent-facing, use serif per §8.4 and increase size to 28px for hero-level heading.
  - Overall: Determine audience (parents vs. staff) and redesign accordingly. Current design doesn't clearly signal intent.

### LCDLibraryScreen.tsx  · `operational` · **P2**
- **Purpose:** Complete reference catalog of 20 LCD face states (emotions) grouped by category (Conversation, Feedback, System, Safety, Lifecycle). Shows each face state with id, usage description, animation notes, and group membership. Design rules section (4 cards) and anti-patterns section (4 rows). Educational/reference material for engineers or designers (not user-facing). Scrollable gallery of face designs.
- **Now:** Light-mode scrollable reference. Header (56px top, 20px sides, bottom border): kicker (11px, #FF6F61, uppercase), title (22px, -0.4 letter-spacing), subtitle (13px, muted). Design rules section: 4 small cards in 2-column grid (47% width, dark border, 12px padding, 10px radius), each with title (12px bold) + body (11px muted). Group sections (22px padding): group label (11px, bold, uppercase, --parent-ink-2), dot indicator, count, divider line. Face cards (14px radius, 1px border): LCDFace (300px in dark bg), content section (14px padding) with face label (15px bold), id (10px muted), group chip (10px uppercase text, light bg), usage description (12px, muted). Anti-patterns section (24px padding): title, 4 rows with red X icon, title (13px bold), body (12px, muted).
- **Issues:**
  - `P2` LANE AMBIGUITY: Operational/reference screen but uses light theme (not dark DV operational theme). Suggests internal documentation rather than parent-facing content. Should clarify audience and route (is this hidden from parents?). Currently appears to be design system reference, not user-facing screen.
  - `P2` DESIGN RULES CARDS LAYOUT: 2-column grid (47% width each, 8px gap) creates unequal layout on phones >390px wide. At 390px container, each card is ~180px, text feels cramped. Should use single-column on mobile (100% width, 16px padding) and 2-column on tablet per responsive design principles not evident here.
  - `P2` FACE CARD SIZE CONSISTENCY: LCDFace rendered at 300px (same as LCDLessonTurnScreen.tsx). Creates very tall cards on mobile; container width ~340px after padding means 300px face with only 20px margins. Cards stack vertically without horizontal scroll. Should reduce to 200px or allow overflow:scroll.
  - `P2` GROUP CHIP STYLING: Small colored tag (10px text, light background with GROUP_COLORS overlay). Custom inline styling (color applied to text) doesn't use design tokens. Should use --parent-accent-soft fill with --parent-accent text per §8.3, or use DV.cardLight with semantic label color.
  - `P1` ANTI-PATTERNS SECTION CONTRAST: Red X icon on light background (#F4E5DF blush). Red #C0392B may not meet 3:1 contrast ratio per (GOOD-DESIGN-PRINCIPLES.md §8) WCAG AA minimum on light background. Should verify color contrast or use darker red (#7D1E1E) or semantic --parent-danger.
  - `P2` INFORMATION DENSITY: 20 face states grouped by category, each with LCDFace (300px), label, id, group chip, usage description. Heavy scrolling burden (likely 3000px+ page height on mobile). Should use tabs or collapsible groups (show first 3 faces per group, '+ 2 more' expandable link) to reduce cognitive load.
- **Redesign:**
  - Clarify purpose and audience: If internal design system documentation (for engineers/designers), mark as hidden from user nav and use dark theme (DV tokens) for consistency. If parent education, redesign with --parent-* palette and simplified descriptions.
  - Design rules layout: Use responsive grid: 1 column on mobile (100% width, 16px padding), 2 columns on tablet 768px+. Current 47% width is fixed and doesn't adapt.
  - Face card size: Reduce LCDFace from 300px to 180px or 200px for better mobile card proportions. Verify cards are scrollable (within containers) if content exceeds viewport.
  - Group chip styling: Replace custom inline color with design tokens. Use --parent-accent-soft (light purple fill) with --parent-accent text, or DV.cardLight fill with DV.accent text for operational context.
  - Anti-patterns red X: Verify #C0392B meets 3:1 contrast on #F4E5DF background (currently fails per WCAG). Use darker red (#7D1E1E) or semantic --parent-danger (if parent-facing) per §15 Design Review Gate.
  - Information organization: Replace long scrolling list with either (1) collapsible groups ('Conversation' expandable, shows first 2 faces, '+ 3 more' link), or (2) tab bar (Conversation / Feedback / System / Safety / Lifecycle) with 4 faces visible per tab.
  - Pagination: If face library grows, implement 'Load more' or pagination (e.g., '1–5 of 20 faces') below groups.
  - Overall: If this screen stays user-facing, it needs major UX simplification. Current design is more suited to internal design documentation site (Figma, Notion, or dedicated portal).

---

## robot-mgmt (Device Management Hub)

_Parent lane exclusively (Wispr Flow). All 12 screens are operational device management interfaces for adult users managing a paired robot. Consistent use of RM token system (RM.card, RM.ink, RM.ink1-3, RM.hair, RM.good, RM.accent, RM.warn). Pattern: hero/context section → settings/status rows → action buttons. No child-lane screens present in this feature area._


### MyRobotScreen.tsx  · `parent` · **P0**
- **Purpose:** Hub screen showing paired robot status, metrics dashboard (battery/Wi-Fi/courses/microphone), care settings (sound, tests, firmware), help links, and factory reset
- **Now:** Hero card displays robot icon (96px) + name + status chip. Four RmStat components in 2-column grid (47% width each) showing battery, Wi-Fi, courses, microphone. Three DeviceRow sections: Care (sound, mic test, speaker test, firmware), Help (offline help, support, articles), Destructive (factory reset). Tokens: RM.card (bg), RM.ink (primary), RM.ink2 (secondary), RM.ink3 (muted). Styles: borderRadius 14-16, serif headings, sans body.
- **Issues:**
  - `P1` Missing primary action prominence — hub lists 10 rows + factory reset without clear user intent hierarchy. GOOD-DESIGN-PRINCIPLES §1 (One Primary Action) violated. Screen should guide user to most common next action (e.g., 'Test Robot' or 'Help') via size/color/position prominence.
  - `P1` Status chip visual treatment inconsistent with DESIGN.md §8 chip specs. Current status chip is inline; should be a proper RmChip component with semantic color (RM.good for healthy, RM.warn for issues). Enables at-a-glance device state.
  - `P2` Help section (offline help, support, articles) buried at row 7–9 of a 10-row layout. Progressive disclosure (GOOD-DESIGN-PRINCIPLES §9) suggests help section should be collapsible or accessed via a separate 'Help & Support' card to unclutter main hub.
- **Redesign:**
  - Redesign row arrangement to create visual hierarchy: (1) Status chip prominently at top of hero, (2) Quick actions section (test buttons) as primary cards, (3) Settings section below, (4) Help + destructive actions in collapsible or lower-priority area. Cite GOOD-DESIGN-PRINCIPLES §1 and §9.
  - Replace inline status text with RmChip using RM token colors. 'Connected' → chip with RM.good; 'Offline' → chip with RM.warn. Cite DESIGN.md §8 chip specification.
  - Consider extracting Help & Support into a separate screen accessible via a 'Help' action button or card, reducing cognitive load on the hub. Justification: GOOD-DESIGN-PRINCIPLES §5 (Progressive Disclosure) and §7 (Density).

### RobotStatusScreen.tsx  · `parent` · **P1**
- **Purpose:** Detailed diagnostics dashboard showing 8 system metrics (Battery, Wi-Fi, Courses, Microphone, Speaker, Software, Temperature, Uptime) with status indicators and privacy reassurance note
- **Now:** Hero card with robot icon (72px) + status chip 'Everything is working'. Eight scrollable DeviceRow items showing detailed metrics. Privacy note card (#EEF1F5 bg, borderRadius 12). Tokens: RM.card, RM.ink, RM.ink2, RM.hair. Visual hierarchy via row spacing and icon usage.
- **Issues:**
  - `P2` Privacy note card uses hardcoded background color (#EEF1F5) instead of a design token. DESIGN.md §8 and web/design-quality.md state all visual values must use tokens. Should be a semantic token like RM.surface or RM.infoCardBg.
  - `P2` Eight-item scrollable list with no visual grouping/section dividers. GOOD-DESIGN-PRINCIPLES §7 (Density & Scanability) suggests grouping related metrics (connectivity: Wi-Fi, Microphone, Speaker; system: Software, Temperature, Uptime). Current layout is a flat list.
  - `P1` Status chip 'Everything is working' is static text, not a semantic RmChip. If any metric is degraded, the chip should reflect the worst status (yellow/red). Currently no conditional styling for partial degradation.
- **Redesign:**
  - Replace hardcoded #EEF1F5 with a tokenized semantic color. Define RM.infoCardBg = okLch value (e.g., soft blue-gray) in RM tokens. Cite web/design-quality.md requirement: 'all hardcoded values prohibited'.
  - Group eight metrics into 3 logical sections: (1) Connectivity (Wi-Fi, Microphone, Speaker), (2) System (Software, Temperature, Uptime), (3) Content (Courses). Use section headers (11px, uppercase, RM.ink3, letterSpacing 0.5). Cites GOOD-DESIGN-PRINCIPLES §7 (Density) and §8 (Grouping).
  - Update status chip to be a real RmChip with conditional color: all green → RM.good, any warning → RM.warn, any error → RM.danger. Reflect the app's diagnostic intelligence. Cite GOOD-DESIGN-PRINCIPLES §3 (State Is Visible Before Decoration).

### RobotBatteryScreen.tsx  · `parent` · **P0**
- **Purpose:** Battery status dashboard with visual circular progress indicator (SVG ring, 78% filled), charging status, estimated lesson time, health info, and care tips
- **Now:** 180x180 SVG circular progress ring (RM.good color, 14px stroke) with center percentage text (42px, RM.ink). Status chip 'On dock · 32 min to full'. Four informational DeviceRow. Tips card with bullet list (borderRadius 14). Tokens: RM.good (progress color), RM.ink, RM.ink2. Responsive layout with absolute-fill centering.
- **Issues:**
  - `P2` Circular progress ring uses hardcoded dimensions (180x180, stroke 14px, radius 78). No responsive scaling for smaller devices (320px width). GOOD-DESIGN-PRINCIPLES §6 (Mobile-First Density) requires scaling for SE/iPhone 8 viewports. Ring should clamp to max 60% of viewport width.
  - `P1` Tips section is a plain card with bullet text; should use a consistent help/info card pattern (e.g., icon-first list or RmChip badges). Mixes TextList pattern with card pattern, causing visual inconsistency. DESIGN.md §8 requires consistent component shapes.
  - `P2` Status chip shows charging state but no indication of health status (e.g., 'Good health', 'Degraded'). Battery health is a key parent concern. Chip should include icon + status text (e.g., '⚡ Healthy · 78%'). Cites GOOD-DESIGN-PRINCIPLES §3 (State Visibility).
- **Redesign:**
  - Use responsive sizing for circular ring: ring diameter = clamp(140px, 40vw, 200px). Recalculate SVG viewBox and stroke dynamically. Test on 320px viewport. Cite GOOD-DESIGN-PRINCIPLES §6 (Mobile-First Density).
  - Replace bullet-list Tips with RmChip list pattern: each tip becomes an inline RmChip with icon (e.g., '💡', '🔌'). Alternatively, use horizontal scrollable chip row. Cite DESIGN.md §8 (Component consistency).
  - Enhance status chip with health indicator: change text from 'On dock · 32 min to full' to '⚡ Healthy · 78% · 32 min to full'. If health is 'Degraded', change icon to '⚠️' and color to RM.warn. Cite GOOD-DESIGN-PRINCIPLES §3 (State Is Visible Before Decoration).

### RobotFirmwareScreen.tsx  · `parent` · **P0**
- **Purpose:** Firmware update availability screen with version comparison, changelog preview, safety assurance, and action buttons (Update Now / Remind Me)
- **Now:** Dark background (#0E1116) with LCDFace (emotion='thinking', 130px). Warning chip 'New version available' (RM.warn bg #FFF4D9). Centered heading (22px, font-weight 600). Version comparison card (v1.4.2 → v1.5.0 with arrow). Three-item bullet list. Two action buttons (primary 'Update Robot now', secondary 'Remind me tomorrow'). Tokens: RM.accent, RM.warn, RM.hair.
- **Issues:**
  - `P1` Dark background (#0E1116) violates Wispr Flow parent-lane palette (warm off-white, pastel cards, charcoal pill buttons). DESIGN.md §8 parent-lane specs require light backgrounds. Dark bg is robot-only (LCDFace container), but it consumes 50% screen height, creating wrong tone. Should be a light hero with robot inset.
  - `P1` Warning chip and version comparison card are inconsistent in styling. Chip is inline with small text; card is larger with arrow divider. Both convey update information but use different visual weight. Should unify to one pattern: either a single update-notification card or a chip + summary row combo.
  - `P2` Three-item bullet list (What's new) is plain text inside card. Should use icon-first pattern (🎉 for improvements, 🔧 for fixes) or RmChip list for scannability. GOOD-DESIGN-PRINCIPLES §4 (Hierarchy via Scale) and §8 (Scannability).
  - `P1` Primary action 'Update Robot now' is full-width pill button, but no indication of consequence/duration (e.g., 'Takes ~90 seconds, Robot goes offline'). Users need expectation-setting before committing to update. Cite GOOD-DESIGN-PRINCIPLES §3 (State Is Visible Before Decoration) and UX-BEHAVIOR-RULES §F2 (Disabled/Gated Actions Must Explain).
- **Redesign:**
  - Change dark background to light warm off-white (e.g., RM.card or a hero-specific pale cream). Embed LCDFace in a subtle rounded container (light gray #F5F5F3) instead of a dark panel. Justification: DESIGN.md §8 (parent-lane backgrounds must be warm/light). This preserves robot emotion accent while maintaining visual hierarchy.
  - Consolidate update messaging into a single 'Update Available' card: (1) Robot icon + version badge on left, (2) 'Update available' + version comparison (v1.4.2 → v1.5.0) on right, (3) Expandable 'What's new' section below. Cite GOOD-DESIGN-PRINCIPLES §5 (Progressive Disclosure).
  - Replace bullet list with icon-first items: '🎉 Better microphone wake-up', '🔧 Fixes audio cutout issue', '⚡ Faster lesson loading'. Use RmChip or simple flex row + icon. Cite GOOD-DESIGN-PRINCIPLES §4 (Hierarchy via Scale) and §8 (Scannability).
  - Add consequence/duration text to primary button: 'Update Robot now (takes ~90s, goes offline)'. Or add helper text below button: 'This update takes about 90 seconds. Robot will restart automatically.' Cite UX-BEHAVIOR-RULES §F2 (Disabled/Gated Actions).

### RobotWifiScreen.tsx  · `parent` · **P0**
- **Purpose:** Wi-Fi network management dashboard showing current connection strength, speed, IP, network switching, password updates, and conditional 'Other networks nearby' expansion
- **Now:** Hero card with Wi-Fi icon (54x54) in green background (#E6F4EE). Connected SSID 'Casa-Familia' + signal 'Strong signal · 5 GHz'. Three informational DeviceRow (Signal, Speed, IP). Three action DeviceRow (Switch, Update password, Forget). Conditional expandable section (showOthers state) with 3 additional network rows. Privacy note at footer. Tokens: RM.good (green), RM.ink, RM.ink2, RM.ink3, RM.hair.
- **Issues:**
  - `P2` Green icon background (#E6F4EE) is hardcoded instead of using a token like RM.surface or RM.bgAccent. DESIGN.md §8 and web/design-quality.md require all colors to be tokenized. Hardcoded colors create maintenance burden and prevent dark-mode support.
  - `P1` 'Other networks nearby' section is collapsed by default (showOthers = false). If the user wants to switch networks, they must first tap 'Switch network' (which should navigate to a separate Wi-Fi selection screen), OR expand the section and see 3 hardcoded networks. Interaction is ambiguous. GOOD-DESIGN-PRINCIPLES §2 (Clear Navigation) and §9 (Progressive Disclosure) suggest either (1) one clear 'Change network' action, or (2) always-visible nearby networks (collapsed first 3, expandable).
  - `P2` Privacy note uses small gray text (12px, RM.ink2) at footer. Important privacy assurance for parents should be more prominent (e.g., info card with icon, or RmChip). Current placement is low visual weight despite being a trust signal. Cite GOOD-DESIGN-PRINCIPLES §3 (State Visibility).
- **Redesign:**
  - Define a tokenized background color for icon containers: RM.bgSuccess = okLch(85% 0.1 200) or similar light green. Replace #E6F4EE with RM.bgSuccess. Cite web/design-quality.md ('All visual values must use tokens').
  - Clarify network switching flow: either (A) 'Switch network' button opens a separate Wi-Fi selection screen (recommended), OR (B) 'Other networks nearby' is always visible/expanded with a primary CTA on each network. Current mixed state is confusing. Recommend (A) with label 'Switch to a different network' for clarity. Cite GOOD-DESIGN-PRINCIPLES §2 (Clear Navigation).
  - Elevate privacy note: change from footer text to a prominent info card or RmChip with icon (e.g., '🔒 Wi-Fi passwords are stored locally on Robot'). Place after hero, before signal details. Justification: trust/privacy is a primary parent concern. Cite GOOD-DESIGN-PRINCIPLES §3 (State Visibility Before Decoration).

### RobotSoundScreen.tsx  · `parent` · **P1**
- **Purpose:** Sound settings panel for volume control (1-10 slider), voice selection (Warm/Calm/Bright), and sound toggles (chimes, quiet hours)
- **Now:** Volume card with number display (24px font) + 10-segment bar (each 36px tall, flex layout, rounded 6px). Voice selection as three horizontal cards (flex 1, borderRadius 12). Selected voice has #E8F0FE bg + 2px accent border. Sounds section with two Toggle components (custom 46x26 pill track + thumb) + Play test sound row. Tokens: RM.accent (active), RM.card, RM.ink, RM.ink2, RM.ink3, RM.hair. RM.good used for toggle active state.
- **Issues:**
  - `P2` Volume bar uses custom flex layout with 10 segments. Bar is not proportional/continuous (e.g., segment widths don't scale with active count). At volumes 3-7, visual bar may not accurately represent value due to flex: 1 equal spacing. GOOD-DESIGN-PRINCIPLES §3 (State Is Visible Before Decoration) requires visual bar to precisely map to numeric value.
  - `P2` Voice selection uses hardcoded background (#E8F0FE) for selected state instead of a token. Should use RM.surface or RM.bgPrimary token. Cite DESIGN.md §8 (No hardcoded values).
  - `P1` Custom Toggle component is not WCAG-compliant: no accessible label, no active state aria-label. Toggle is 46x26px — below 48px minimum touch target. GOOD-DESIGN-PRINCIPLES §10 (Touch targets 48x48px+) violated. Should wrap Toggle in a larger row with label + semantic role.
  - `P2` Volume hint labels ('Quiet', 'Living-room', 'Loud') are hard-coded positions (space-between layout), not tied to segment heights. On smaller viewports, labels may misalign. Should use segment-indexed layout or flex-based positioning with dynamic label width.
- **Redesign:**
  - Replace 10-segment bar with a continuous progress bar (height 8px, borderRadius 4) with accurate fill width: (vol / 10) * 100%. Alternatively, keep segments but ensure each segment width is proportional to its value. Cite GOOD-DESIGN-PRINCIPLES §3 (State Visibility).
  - Replace hardcoded #E8F0FE with a tokenized color (RM.bgPrimary or RM.surface). Define in RM tokens. Cite DESIGN.md §8.
  - Redesign Toggle: (A) Increase hit target to 48x48px by wrapping in a flex row with label + description, OR (B) Use a native RN Switch component styled with RM tokens. Current custom Toggle is too small and lacks a11y labels. Cite GOOD-DESIGN-PRINCIPLES §10 (Touch Targets).
  - Anchor volume hint labels to segment midpoints or use a labeled axis (left = 'Quiet', right = 'Loud', center = 'Living-room'). Avoid hard-coded space-between positioning. Use dynamic flex layout.

### MicTestScreen.tsx  · `parent` · **P0**
- **Purpose:** Microphone diagnostic test with animated waveform meter, pass/fail states, and remediation guidance (6-foot distance, background noise assessment)
- **Now:** LCDFace (emotion: idle/listening/pass/fail/sleep, 140px) in light box (borderRadius 14, padding 8). Heading 22px + sub text. Animated bar meter (14 bars, height varies by phase, RM.accent during listening, RM.good on pass, RM.warn on fail). Two informational DeviceRow. Action buttons vary by phase (Start, Listening…, Looks good + Run again, Run again, Back). Conditional error/disabled states with explanatory text. Tokens: RM.accent, RM.good, RM.warn, RM.ink, RM.ink2.
- **Issues:**
  - `P1` Four distinct phases (idle, listening, pass, fail) + disabled state = 5 visual states. Only heading + buttons change; meter colors/heights vary. GOOD-DESIGN-PRINCIPLES §3 (State Is Visible Before Decoration) requires that state changes be immediately obvious. Current waveform color + height + heading combo is clear, but no explicit state badge/chip. Consider adding a semantic RmChip showing phase name ('Ready', 'Listening', 'Success', 'Try again', 'Offline').
  - `P2` Meter bars compute height dynamically: h = phase === 'listening' ? 6 + (1 - dist * 0.6) * 50 : ... This creates a pseudo-animated waveform, but animation is instantaneous (no requestAnimationFrame smoothing). Appearance is jerky on fast device-to-app communication. GOOD-DESIGN-PRINCIPLES §9 (Smooth Motion) suggests real-time height updates should be animated (Animated.Value or react-native-reanimated).
  - `P1` Button text changes context-dependently ('Start mic test', 'Listening…', 'Looks good', 'Run test again', 'Back to Robot'). No single primary action established. On 'idle' state, user sees only 'Start'. But success shows two buttons ('Looks good', 'Run test again'). Hierarchy is unclear. Cite GOOD-DESIGN-PRINCIPLES §1 (One Primary Action Per Screen).
  - `P2` Disabled state shows 'Device tools are off' with explanatory text, but button is secondary gray. Users may miss that device management is disabled. Should use a more prominent visual (e.g., alert card with warning icon + 'Feature unavailable' RmChip). Cite UX-BEHAVIOR-RULES §F2 (Disabled Actions Must Explain).
- **Redesign:**
  - Add a state-indicating RmChip above or beside the heading: 'Ready to listen' (RM.ink2), 'Listening…' (RM.accent), 'Test passed' (RM.good), 'Try again' (RM.warn), 'Offline' (RM.danger). Cite GOOD-DESIGN-PRINCIPLES §3 (State Is Visible Before Decoration).
  - Animate waveform bar height transitions using react-native-reanimated or Animated.timing(). Create smooth 50-150ms easing (ease-out) for height changes. Cite GOOD-DESIGN-PRINCIPLES §9 (Smooth Motion).
  - Establish primary action per phase: idle → 'Start mic test' (full-width), pass → 'Looks good' (primary) + 'Run again' (secondary), fail → 'Run test again' (primary). Ensure one button per phase is visually dominant. Cite GOOD-DESIGN-PRINCIPLES §1 (One Primary Action).
  - Replace disabled-state button with a prominent alert card: 'Feature Unavailable' heading + 'Device management is disabled in this build. Enable it in feature flags.' + 'Back to Robot' button. Use RM.danger color for header bar. Cite UX-BEHAVIOR-RULES §F2 (Disabled/Gated Actions).

### SpeakerTestScreen.tsx  · `parent` · **P1**
- **Purpose:** Speaker audio test dashboard allowing user to play test sounds (chime, voice sample) and verify Robot can be heard at current volume
- **Now:** LCDFace (emotion: idle/happy, 140px) on light bg. Heading 'Can you hear Robot?'. Two sound-card selections (Soft chime, Robot's voice) with custom flex layout (icon box on left, title + sub on right, play icon SVG on far right). Selected card has 2px accent border. Each sound has icon bg color (#E8F0FE for chime, #E6F4EE for voice). Two action buttons (primary 'I can hear Robot', secondary 'sounds quiet or muffled'). Tokens: RM.card, RM.accent, RM.good.
- **Issues:**
  - `P2` Sound card icon backgrounds are hardcoded (#E8F0FE, #E6F4EE) instead of tokenized. Inconsistent with DESIGN.md §8 requirement. Should use semantic tokens like RM.bgInfo or RM.bgSuccess, or a variant function (e.g., RM.bgColor('accent'), RM.bgColor('good')).
  - `P1` Selected sound card is indicated by 2px border + unchanged bg. Visual selection feedback is subtle (border only). On high-contrast displays, may be hard to see. Should add background color change (e.g., light tint of RM.accent) in addition to border. Cite GOOD-DESIGN-PRINCIPLES §3 (State Is Visible Before Decoration).
  - `P2` Sound-card layout uses hardcoded gap (14px) and padding (14px). On very small devices (320px width), cards may have minimal padding. No responsive adjustment. Should use clamp(12px, 3vw, 16px) for padding. Cite GOOD-DESIGN-PRINCIPLES §6 (Mobile-First Density).
  - `P1` No visual feedback when a sound is played (state 'played'). Card shows 'played === X', but UI doesn't change to indicate 'now playing' or 'just played'. User may not know if tap registered. Should add a spinner/pulse animation or haptic feedback on tap. Cite GOOD-DESIGN-PRINCIPLES §3 (State Visibility).
- **Redesign:**
  - Replace hardcoded icon background colors with tokenized values. Create RM variants: RM.bgInfo (blue tint for chime), RM.bgSuccess (green tint for voice). Or use single token RM.cardBg with color prop override. Cite DESIGN.md §8 (No hardcoded values).
  - Enhance selected sound card with background tint: change from 'borderWidth 2, borderColor accent' to 'borderWidth 2, borderColor accent, backgroundColor: RM.accent + 8% opacity'. Provides stronger visual feedback. Cite GOOD-DESIGN-PRINCIPLES §3 (State Visibility).
  - Use responsive padding: paddingHorizontal={clamp(12, 3vw, 16)} for sound cards. Ensures consistent breathing room on all device sizes. Cite GOOD-DESIGN-PRINCIPLES §6 (Mobile-First Density).
  - Add loading/playing state feedback: on tap, render a spinner icon inside play SVG, or trigger triggerHapticFeedback('light') to give tactile feedback. Show 'Playing…' text briefly below or beside the card. Cite GOOD-DESIGN-PRINCIPLES §3 (State Is Visible Before Decoration).

### RobotStorageScreen.tsx  · `parent` · **P1**
- **Purpose:** Course storage dashboard showing total device capacity (1.21 GB of 4 GB used), per-course breakdown with icons, sync progress indicator, and course management actions
- **Now:** Storage gauge card showing capacity (1.21 GB used / 4 GB total) with horizontal stacked bar chart (three colored segments #9BC2EB, #B8D4A6, #E5C56F for three courses). Legend with colored dots. Three course cards showing LCDFace (48px), course name, metadata (lessons + download state), and size. Syncing course shows mini progress bar (height 4, fill 60%). Two action rows (Sync now, Browse Course Library). Tokens: RM.card, RM.ink, RM.ink2, RM.ink3, RM.hair.
- **Issues:**
  - `P1` Gauge bar segment colors are hardcoded (#9BC2EB, #B8D4A6, #E5C56F) and not tokenized. Colors have no semantic meaning (are they theme-aware?). DESIGN.md §8 requires all colors to be tokens. Current approach breaks in dark mode and complicates maintenance. Should use a color array from RM tokens or a courseColorMap.
  - `P2` LCDFace components (48px) are rendered for each course. This creates 3 small robot faces, which may be overwhelming. Alternative: use emoji icons (📚, 🎓, 🌟) or a single icon per course type. Cite GOOD-DESIGN-PRINCIPLES §4 (Hierarchy via Scale) — repetition reduces visual impact.
  - `P1` Sync progress bar (width 60%) is hardcoded instead of derived from course.syncProgress state. If syncing state updates, component must re-render to update bar width. Current implementation assumes static 60%. Should be dynamic: syncFill width = `${syncing ? syncing.progress : 100}%`. Cite GOOD-DESIGN-PRINCIPLES §3 (State Is Visible Before Decoration).
  - `P2` Course storage breakdown via stacked bar is not a standard chart pattern for RN apps. Bar segments may be misaligned on rotation or small screens. Should add explicit percentage labels (e.g., '30% · 420 MB') below bar for clarity. Cite GOOD-DESIGN-PRINCIPLES §4 (Hierarchy) and §8 (Scannability).
- **Redesign:**
  - Define a tokenized color array for course indicators: RM.courseColors = [RM.accent, RM.good, RM.warn] or a dedicated courseColor palette. Replace hardcoded hex values. Cite DESIGN.md §8 (All colors must be tokens).
  - Replace 3x LCDFace with emoji icons or simple colored circles (24px, borderRadius 50%, backgroundColor: RM.courseColors[i]). Reduces visual noise and speeds up render. Keep small LCDFace only if animated (lip-sync). Cite GOOD-DESIGN-PRINCIPLES §4 (Hierarchy).
  - Make sync progress bar dynamic: syncFill width = `${course.syncProgress || 100}%`. Add real-time updates via polling or WebSocket. Display percentage next to progress bar (e.g., '60% · 12 of 20 lessons'). Cite GOOD-DESIGN-PRINCIPLES §3 (State Visibility).
  - Add percentage labels to stacked bar segments: render three Text components overlaid or below segments ('30%', '27%', '29%'). Or add a table-like breakdown below the bar showing Course name · Size · Sync status. Cite GOOD-DESIGN-PRINCIPLES §4 (Hierarchy) and §8 (Scannability).

### FactoryResetScreen.tsx  · `parent` · **P0**
- **Purpose:** Three-step destructive flow (Warning → Parent Gate → Confirmation) to factory-reset paired Robot with safety gates, data reassurance, and rollback prevention
- **Now:** Step 1 (Warning): Red danger icon (64x64, #FBE6E2 bg), heading 'This will erase your Robot', four DeviceRow items explaining consequences, warning note card (#FBE6E2, #7B2A1F text). Two buttons (secondary 'Try smaller fixes', danger 'I understand · continue'). Step 2 (Gate): 3-digit keypad challenge to verify parent intent. Step 3 (Confirm): RobotDevice emotion='gentle' (150px), confirmation heading, two rows (account kept, 90s restart), conditional error states, two buttons (danger 'Yes erase Robot', secondary 'Cancel'). Tokens: RM.card, RM.ink, RM.ink2, RM.ink3, RM.hair, RM.danger (implied).
- **Issues:**
  - `P0` No explicit RM.danger token defined in code. Danger color is hardcoded (#FBE6E2 for bg, #7B2A1F for text, RM.danger for icon stroke). DESIGN.md §8 requires all colors to be tokenized. RM.danger should be explicitly defined (e.g., RM.danger = okLch(65% 0.2 25)) and reused throughout. Missing token is a CRITICAL DESIGN SYSTEM DEBT.
  - `P1` Step 2 (Parent Gate) uses custom 3x3 keypad layout with 10 numbered keys. No visual indication of which key is hovered/pressed. Touch target for each key is ~54px (30% of width in 3-column grid on 360px device), below 48px recommended minimum for some buttons. Cite GOOD-DESIGN-PRINCIPLES §10 (Touch Targets). Consider increasing to 60px.
  - `P1` Warning note (Step 1) uses hardcoded color (#7B2A1F) instead of a semantic token. Should use RM.dangerText or RM.ink (with warning context). Cite DESIGN.md §8 (No hardcoded values).
  - `P1` Confirmation heading (Step 3) 'Erase Robot {robotName}?' uses dynamic text injection. If robotName is long (>20 chars), heading may overflow or wrap awkwardly. No ellipsis or truncation logic. Should use maxWidth constraint or truncateText utility. Cite GOOD-DESIGN-PRINCIPLES §6 (Responsive Density).
  - `P2` Three conditional error states (deviceQuery.isError, no Robot, resetMutation.isError) render error text below action buttons. No visual hierarchy — all three errors use same color/style. Should unify into a single error card (icon + heading + remediation) placed above buttons. Cite GOOD-DESIGN-PRINCIPLES §5 (Progressive Disclosure) and UX-BEHAVIOR-RULES §F3 (Error Taxonomy).
- **Redesign:**
  - Define RM.danger token explicitly in RM components: RM.danger = 'okLch(65% 0.2 25)' (or equivalent warm red). Define RM.dangerBg = 'okLch(97% 0.04 25)' for soft error backgrounds. Replace all hardcoded danger colors (#FBE6E2, #7B2A1F, RM.danger assumption). Cite DESIGN.md §8 (Token System).
  - Increase keypad button size: use width: '32%' (instead of 30%) to reach ~60px on 360px device. Test touch target compliance (min 48x48). Alternatively, render keys in 4-column grid (25% each) for 90px targets. Cite GOOD-DESIGN-PRINCIPLES §10 (Touch Targets).
  - Replace hardcoded #7B2A1F warning text with RM.dangerText (once defined). Consistent application of token. Cite DESIGN.md §8.
  - Add maxWidth and ellipsis to Step 3 heading: 'Erase Robot ' + truncateText(robotName, 16) + '?'. Or use flex: 1 with numberOfLines={2}. Test with long names (e.g., 'Robot-HomeOffice-Demo'). Cite GOOD-DESIGN-PRINCIPLES §6 (Responsive Density).
  - Consolidate error states into a single error card: if (error), render <ErrorCard icon='⚠️' heading='Unable to erase' body={errorMessage} />. Place above buttons. Use RM.dangerBg + RM.dangerText. Cite UX-BEHAVIOR-RULES §F3 (Error Taxonomy) and GOOD-DESIGN-PRINCIPLES §5 (Progressive Disclosure).

### SupportScreen.tsx  · `parent` · **P1**
- **Purpose:** Contact support hub with multiple channels (chat, email, articles), support form with topic categorization, device diagnostics auto-attach, and message submission
- **Now:** Intro text (13px, RM.ink2). Three support channel rows (Chat, Email, Help articles). Form section with topic selector (6 TouchableOpacity buttons with state-based styling: border 1px RM.hair, selected gets border 1.5px RM.accent + #E8F0FE bg). Text area placeholder (minHeight 90, #F8F8F5 bg, 1px RM.hair border). Auto-attach note (11px, RM.ink2). Five tech-info tags (device, software, Wi-Fi, battery, app). Two action buttons (primary 'Send to support', secondary 'Cancel'). Tokens: RM.card, RM.ink, RM.ink2, RM.ink3, RM.hair.
- **Issues:**
  - `P2` Topic selector uses TouchableOpacity buttons with conditional styling (border, background). Selected button is visually distinguished by border width (1 → 1.5px) + background color (#E8F0FE). Border-width change is subtle on smaller screens. Should use a larger visual cue (e.g., checkbox icon + semantic RmChip for selected). Cite GOOD-DESIGN-PRINCIPLES §3 (State Is Visible Before Decoration).
  - `P1` Text area is a Box with hardcoded background (#F8F8F5) instead of a token. Should use RM.surface or RM.inputBg. Cite DESIGN.md §8 (No hardcoded values).
  - `P2` Auto-attach tech info tags are displayed as static badges with hardcoded #EEF1F5 background. No indication that data is being collected/sent. Should include a privacy note or lock icon 🔒 to reassure users. Cite GOOD-DESIGN-PRINCIPLES §3 (State Visibility) and UX-BEHAVIOR-RULES §F2 (Disabled/Gated Actions Explain).
  - `P1` Text area is not a standard TextInput component — it's a Box with placeholder Text. Users cannot actually type into this field. This is a mockup/stub. Real implementation must use TextInput with multiline={true} and state management. Cite GOOD-DESIGN-PRINCIPLES §1 (One Primary Action) — primary action is 'Send to support', which requires a working text input.
  - `P2` Topic buttons have no feedback on press (activeOpacity={0.8}). Should include visual feedback (ripple effect or background flash). Also, no indication that topic selection is required before submission. 'Send to support' button should be disabled if topic is not selected. Cite UX-BEHAVIOR-RULES §F2 (Disabled Actions Must Explain).
- **Redesign:**
  - Replace TouchableOpacity topic buttons with RmChip or Checkbox pattern: selected topic shows checkmark icon ✓ + semantic color (RM.accent bg + white text). Unselected shows RM.card bg. Provides stronger visual state feedback. Cite GOOD-DESIGN-PRINCIPLES §3 (State Is Visible Before Decoration).
  - Replace hardcoded #F8F8F5 text area background with RM.surface or RM.inputBg token. Cite DESIGN.md §8.
  - Add lock icon 🔒 or privacy reassurance to tech-info tags section: 'Attached device info (auto-collected, encrypted)'+ info icon. Reassures parents about data sharing. Cite GOOD-DESIGN-PRINCIPLES §3 (State Visibility) and security best practices.
  - Implement TextInput component with multiline={true}, numberOfLines={4}, placeholderTextColor={RM.ink3}, onChangeText={setText}. Wire to a form state. Cite GOOD-DESIGN-PRINCIPLES §1 (One Primary Action — send support message).
  - Disable 'Send to support' button if topic is not selected or message is empty: disabled={!topic || !message.trim()}. Add disabled-state text: 'Select a topic and tell us what's happening'. Cite UX-BEHAVIOR-RULES §F2 (Disabled/Gated Actions Must Explain).

### OfflineHelpScreen.tsx  · `parent` · **P0**
- **Purpose:** Step-by-step troubleshooting flow for when Robot is offline, with numbered remediation steps (power, Wi-Fi, distance, restart, Wi-Fi update) and escalation to support
- **Now:** RobotDevice emotion='reconnect' (150px). RmChip warning indicator '⚠️ Robot is offline' (RM.warn color, #FFF4D9 bg). Heading 'Let's bring Robot back online' (22px, centered). Subheading 'Try these in order...' Five numbered step cards (height varies, each with step number in circle (30x30, RM.accent bg, white text), title, body, optional CTA link 'Update Wi-Fi →'). Two action buttons (primary 'Try connecting again', secondary 'Still stuck · contact support'). Tokens: RM.warn, RM.accent, RM.card, RM.ink, RM.ink2, RM.hair.
- **Issues:**
  - `P1` Step number circles are fixed 30x30px. On very small devices (320px width), circles may overlap with step titles or be misaligned in flex layout. Should use responsive sizing: size = clamp(28px, 8vw, 36px). Cite GOOD-DESIGN-PRINCIPLES §6 (Mobile-First Density).
  - `P2` Step CTA link ('Update Wi-Fi →') is a TouchableOpacity with color RM.accent (implied). No visual distinction from regular text (link underline, icon, etc.). Should use a more explicit link pattern: RmChip with right arrow icon, or underlined text with icon. Cite GOOD-DESIGN-PRINCIPLES §3 (State Visibility).
  - `P1` All five steps are always visible. No progressive disclosure. If Robot is already powered on (step 1), user must scroll past unnecessary steps to reach more relevant ones (steps 3-5). Should implement collapsible steps or a conditional skip logic (e.g., 'Already done this? Skip to step 4'). Cite GOOD-DESIGN-PRINCIPLES §9 (Progressive Disclosure).
  - `P2` No indication of which step the user should prioritize or which is most likely to solve the issue. All steps are equally weighted. Should add a confidence indicator (e.g., '🔥 Most likely to fix' badge on step 2-3) or estimated success rate. Cite GOOD-DESIGN-PRINCIPLES §1 (One Primary Action — emphasize the most important step).
- **Redesign:**
  - Use responsive circle sizing: stepNum width={clamp(28, 8vw, 36)} height={clamp(28, 8vw, 36)}. Test on 320px viewport to ensure circles don't overlap. Cite GOOD-DESIGN-PRINCIPLES §6 (Mobile-First Density).
  - Enhance step CTA links: use RmChip pattern with right arrow icon (→), or render as underlined text + icon in RM.accent color. Example: <Box style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}><Text style={{ textDecorationLine: 'underline' }}>Update Wi-Fi</Text><Text> →</Text></Box>. Cite GOOD-DESIGN-PRINCIPLES §3 (State Visibility).
  - Implement conditional step display: use useState(activeStep) and render each step with 'Skip this step →' link if already done. Or render a collapsed card for steps 1-3 and expanded card for 4-5. Reduces cognitive load. Cite GOOD-DESIGN-PRINCIPLES §9 (Progressive Disclosure).
  - Add confidence badge to step 2 ('Restart Robot'): render a 🔥 'Most likely to fix' chip or 'Solves 70% of offline issues' tag. Guides parent to most effective action first. Cite GOOD-DESIGN-PRINCIPLES §1 (One Primary Action).

---

## Parent Lane Mobile App Screens

_Parent lane screens use Wispr Flow design system (warm off-white backgrounds, large-radius cards 24-28px, charcoal pill buttons, serif display headings, purple accent). All screens are operational/administrative in nature with calm, deliberate interaction patterns. However, implementation deviates from design authority in border-radius consistency, token usage, primary action visibility, spacing, and color hardcoding._


### ParentSettingsScreen.tsx  · `parent` · **P1**
- **Purpose:** Manage app settings, child profile, personality filters, audio/feedback preferences, privacy, support access, and sign out
- **Now:** Uses ParentScroll wrapper with PRowGroup sections for Language (pill button toggle), Profile & Plan, Personality filters (career/interests chip toggles), Audio & Feedback, Privacy, Support. Cards use 12-14px border-radius with 1px borders and PA.hair/PA.card tokens. Language pills use PA.accent on selected state. Typography: 13-14px body, 16px section headers. Error color hardcoded as #C0392B instead of token.
- **Issues:**
  - `P0` Border-radius 12-14px violates DESIGN.md §8.3 (spec: 24px standard cards, 28px hero). Systematic undersizing undermines card hierarchy and visual system coherence.
  - `P1` Error color hardcoded #C0392B instead of --parent-danger token. Breaks semantic token adoption and future palette changes.
  - `P1` No clear primary action per screen. Settings is browsable but lacks a dominant call-to-action pattern (e.g., Save Profile, Apply Settings). Feels exploratory rather than task-driven.
  - `P1` Personality filter chips lack visual feedback state (hover/active). Touch targets appear adequate (chips ~40-50px) but interaction affordance is muted.
- **Redesign:**
  - Increase all card border-radius to 24px per DESIGN.md §8.3 component rules. This applies to PRowGroup backgrounds and nested cards.
  - Replace hardcoded #C0392B with --parent-danger token. Search entire file for color literals and migrate to semantic tokens: --parent-success, --parent-warning, --parent-danger, --parent-accent.
  - Identify and highlight the primary action for each section (e.g., 'Save profile changes' button at bottom of Profile section, or floating save pill). GOOD-DESIGN-PRINCIPLES §1 mandates one primary action per screen.
  - Add explicit active/focus states to Personality filter chips (e.g., darker bg on selected career, visible outline on focus). Ensure 48px minimum touch height per DESIGN.md §5.

### ParentSummaryScreen.tsx  · `parent` · **P1**
- **Purpose:** Main parent dashboard showing weekly summary, activity stats, course insights, links to history/account/settings
- **Now:** Uses ParentScroll with header (Settings link, date, child name), three sections: (1) stat cards row (minutes/lessons/streak) with 12px radius, 1px borders, 12px padding; (2) Today's practice card with chevron; (3) Course quality dashboard band (14px radius) with step success%, completion%, learning path, pronunciation trend; (4) History and Account row groups. Typography: 22px serif headline, 22px serif stat values, 12-13px labels. Info Architecture is present (status → hero → details) but card styling is inconsistent.
- **Issues:**
  - `P0` Cards use 12-14px border-radius instead of 24px spec (DESIGN.md §8.3). Stat cards (12px) and dashboard band (14px) both undersized. Creates visual incoherence across primary content.
  - `P1` Padding inconsistent: stat cards 12px, dashboard band 14px. DESIGN.md §8.3 specifies minimum 20px, prefer 24px. This creates visual crowding and poor information breathing room.
  - `P1` No visually dominant primary action. Screen has multiple sections but no clear call-to-action (e.g., 'Start Today's Lesson' button). GOOD-DESIGN-PRINCIPLES §1 requires one primary action per screen.
  - `P1` Course quality dashboard section uses 24px serif headline but feels secondary in visual hierarchy. Takes significant screen real estate without clear next action or interactive affordance.
  - `P2` Section spacing appears ad-hoc (marginBottom varies). No consistent rhythm defined per GOOD-DESIGN-PRINCIPLES §4.
- **Redesign:**
  - Upgrade all stat cards to 24px border-radius and increase padding to 20-24px. This is the hero section and should dominate the visual hierarchy.
  - Consolidate Today's practice card into a larger, more prominent hero card (28px border-radius per DESIGN.md §8.3 hero spec). Make it the clear primary action target.
  - Course quality dashboard: either promote it to a card-based interface with interactive drill-down, or reduce it to a secondary status bar (smaller, muted colors). Current prominence without interaction is confusing.
  - Add a floating action button or prominent button (48px height, full-width) below hero section: 'Start Today's Lesson' or similar. This serves as the screen's primary action per GOOD-DESIGN-PRINCIPLES §1.
  - Establish consistent section spacing rhythm (e.g., 24px gap between card groups). Document in tokens if not already present.

### ParentTodayScreen.tsx  · `parent` · **P1**
- **Purpose:** Show today's active/in-flight lessons only (not terminal states), with lesson metadata, status, and steps completed
- **Now:** Uses ParentScroll with Back link, lesson metadata (started time, lesson title), PRowGroup with Status + Steps completed, optional 'Also in progress' section. Utilitarian layout with minimal styling. No hero card or primary action pattern. Content-focused but lacks Wispr Flow operational tone and interaction clarity.
- **Issues:**
  - `P1` No hero card or visual entrance. Screen feels utilitarian/list-like rather than operational/calm (Wispr Flow tone). GOOD-DESIGN-PRINCIPLES §2 requires state visibility; here, lesson status is plain text, not visually surfaced.
  - `P1` No primary action. Screen presents information but does not guide parent toward next step (e.g., no 'Resume lesson' or 'View detailed progress' button). GOOD-DESIGN-PRINCIPLES §1 violation.
  - `P1` Missing empty state handling. If no lessons in progress, screen likely shows blank/error. Should have a friendly empty state with CTA (e.g., 'No lessons in progress. Check history or schedule.') per GOOD-DESIGN-PRINCIPLES §9.
  - `P2` Typography lacks hierarchy. Back link and lesson metadata use default sizes without emphasis. Consider serif display for lesson title to match Summary screen style.
- **Redesign:**
  - Add a hero card at the top (28px border-radius, 24px padding) displaying the active lesson title, time elapsed, and progress bar. This establishes Wispr Flow calm operational tone.
  - Add a primary action button below the hero card: 'Continue lesson' or 'View progress' (48px height, charcoal pill per DESIGN.md §8.3). This addresses GOOD-DESIGN-PRINCIPLES §1.
  - Implement empty state: if no active lessons, show a centered card with icon, headline ('No lessons in progress'), and CTA ('View lesson history' link). Tie into GOOD-DESIGN-PRINCIPLES §9.
  - Upgrade lesson title typography to serif display (Georgia, 20-22px) to establish hierarchy and visual coherence with Summary screen.
  - Add visual state indicator (color + icon) for lesson status (e.g., 'In progress' with green dot, or animated indicator per device capability).

### ParentHistoryScreen.tsx  · `parent` · **P1**
- **Purpose:** Show terminal lessons (completed/failed/cancelled) in reverse chronological order with outcome and stats
- **Now:** Uses ParentScroll with stat counts (completed vs total), list of finished lessons with date chip (month/day, 42px width, #EEF1F5 hardcoded bg, 8px border-radius). Lesson rows use 14px border-radius, 1px borders, 12px padding. List rows dimmed with opacity for non-completed outcomes. Accessibility labels on back button present.
- **Issues:**
  - `P0` Date chip uses hardcoded color #EEF1F5 instead of token. Violates token-only color rule (DESIGN.md §8.2). Also, border-radius 8px is undersized; should be 12-14px minimum.
  - `P1` List rows use 14px border-radius instead of 24px spec (DESIGN.md §8.3). Undersized and inconsistent with other parent screens.
  - `P1` Opacity dimming for non-completed lessons is inaccessible. GOOD-DESIGN-PRINCIPLES §2 requires state visibility via color + text + icon, not color alone. Current approach fails color-blind simulation.
  - `P1` No primary action per item. Lesson rows are read-only lists with no interaction affordance (tap to view detail? no indication). GOOD-DESIGN-PRINCIPLES §7 requires consistent interactive affordances.
  - `P2` Date chip is narrow (42px). On wider phones (landscape), could be larger and more informative (e.g., full date + weekday). Responsive design not addressed.
- **Redesign:**
  - Replace hardcoded #EEF1F5 with --parent-bg-2 or --parent-card token. Increase date chip border-radius to 12px for consistency with other components.
  - Upgrade list row border-radius to 24px per DESIGN.md §8.3. Ensure 20px minimum padding per DESIGN.md §8.3.
  - Replace opacity dimming with semantic color + icon treatment. For non-completed lessons: use --parent-ink-2 (muted text), add a status badge (e.g., 'incomplete' in --parent-warning color), and a status icon (checkmark, X, or pause).
  - Add subtle tap affordance to lesson rows (e.g., slight background change on press, or chevron indicator on right edge). Clarify whether tapping navigates to detail or is read-only. Per GOOD-DESIGN-PRINCIPLES §7, interaction must be unambiguous.
  - Extend date chip on landscape: show full date (Month day, year) or weekday abbreviation. Use horizontal padding responsiveness to keep chip readable.

### ParentSafetyScreen.tsx  · `parent` · **P2**
- **Purpose:** Explain microphone, voice data privacy, child safety, data collection practices to parents in compliance with COPPA/GDPR-K
- **Now:** Uses ParentScroll with title 'Safety & Privacy'. Content organized into sections: Microphone, Voice data, Child safety, What we collect (each with title + body text or bullet list). Section typography: 16px bold title, 14px body text, bullets with 14px text. PRowGroup at bottom with Privacy Policy, Terms of Service, Contact privacy team links (icons + chevrons). Legal notice at bottom (12px gray). No custom styling; relies on ParentScroll defaults.
- **Issues:**
  - `P1` Information-dense layout without visual hierarchy. All sections blend together. Missing section card containers (DESIGN.md §8.3 card rules) to create visual breathing room and Wispr Flow calm tone.
  - `P1` No primary action. Screen is informational (read-only) but should guide parent toward next step (e.g., 'I understand' acknowledgment button, or link to request data export). GOOD-DESIGN-PRINCIPLES §1 requires clarity.
  - `P2` Bullet lists lack visual styling (no icons, just text bullets). GOOD-DESIGN-PRINCIPLES recommends icon + text pairs for scannability and accessibility.
  - `P2` Padding inconsistent: sections have paddingHorizontal={20} but vary in paddingTop. Consider establishing a consistent vertical rhythm.
- **Redesign:**
  - Wrap each section (Microphone, Voice data, etc.) in a card (24px border-radius, --parent-card bg, 24px padding, 1px --parent-line border). This creates visual hierarchy and Wispr Flow calm tone.
  - For bullet lists, consider replacing text bullets with icon + text pairs (e.g., a mic icon for 'Microphone off during non-lesson', a checkmark for data practices). Improves scannability per GOOD-DESIGN-PRINCIPLES.
  - Add a secondary action at the bottom: 'Request data export' button or link to ParentAccountPrivacyScreen. Clarifies parent's next step if they have privacy concerns.
  - Establish consistent section spacing (e.g., 16px paddingTop, 12px paddingBottom per section). Document in design tokens.

### ParentAccountPrivacyScreen.tsx  · `parent` · **P1**
- **Purpose:** Allow parents to export account data, request account deletion, manage subscription blocks, and handle grace period cancellation
- **Now:** Uses ParentScroll with title 'Account privacy'. Content organized into two PRowGroup sections: Export and Delete account. Each section contains: heading (export/deletion status), body text, confirmation TextInput (uppercase text for 'EXPORT' or 'DELETE my account'), password input (for deletion), button row with action buttons (Request export, Refresh status, Download export for export; Request deletion, Refresh status, Cancel for deletion). Message/warning state display at top (red #C0392B for errors, accent color for success). Subscription status checks block deletion. Button styling varies: primary buttons use PA.accent (purple), danger use #C0392B (red), secondary use borders. Touch targets 44px minimum (inferred from button styles).
- **Issues:**
  - `P0` Danger button color hardcoded as #C0392B instead of --parent-danger token (DESIGN.md §8.2). Also used for error messages. Violates token-only rule and breaks design system consistency.
  - `P1` Button styling inconsistent across three types: primary (solid PA.accent), secondary (border + transparent), danger (solid #C0392B). Padding/height vary (11px vs 10px vs 11px vertical). DESIGN.md §8.3 specifies charcoal pill buttons 48px height, full-width. Current buttons are inline flex-row, smaller, and non-standard.
  - `P1` Confirmation inputs are low-friction (single TextInput) but lack visual weight and clarity. User might not recognize the gravity of account deletion. Consider adding explicit warning card with icon + larger confirmation prompt (per GOOD-DESIGN-PRINCIPLES §7).
  - `P1` Multiple state indicators (subscription checking, blocked, failed) use red color (#C0392B) for both error and warning. Not semantically distinct. GOOD-DESIGN-PRINCIPLES §3 (error taxonomy) requires --parent-warning (orange) for cautions and --parent-danger (red) for critical actions.
  - `P2` Button layout flex-row with wrap may break on small phones (landscape). Consider stacked layout or full-width buttons per mobile best practice (GOOD-DESIGN-PRINCIPLES §3 mobile-first density).
- **Redesign:**
  - Replace #C0392B with --parent-danger token throughout. For warnings (subscription checking, rate limits), use --parent-warning token instead. This ensures semantic color distinction and future palette changes propagate correctly.
  - Redesign button rows to full-width, stacked layout (48px height per button, 12px gap). Use charcoal pill style per DESIGN.md §8.3. Primary action uses PA.accent, secondary uses border + PA.ink2 text, danger uses --parent-danger.
  - Add explicit warning card for account deletion section: 24px radius card with red/danger border, red header icon (trash/warning), bold headline ('Account deletion cannot be undone'), body text describing grace period and consequences. Move confirmation input inside this card to emphasize gravity.
  - Distinct warning vs error messaging: red (#C0392B / --parent-danger) for error states (request failed, cannot complete), orange (--parent-warning) for cautions (subscription blocks deletion, grace period countdown).

### ParentGateScreen.tsx  · `parent` · **P1**
- **Purpose:** Authenticate parent with PIN before accessing parent-restricted screens (Settings, Safety, Account Privacy, etc.). Implements rate limiting and lockout with retry cooldown.
- **Now:** Uses ParentScroll with centered layout. Top: Back link (14px, PA.ink2). Center: lock icon in rounded box (48x48px, #EEF1F5 bg, 12px radius), title 'Parent Space' (24px, PA.ink, -0.4 letter spacing), subtitle explaining PIN purpose. Input card (14px radius, PA.card bg, 1px PA.hair border, 22px padding) with label 'PARENT PIN' (12px uppercase), numeric TextInput (secureTextEntry, 6 digit max), confirm button (PA.accent bg, 10px radius, 12px padding vertical). Feedback message (13px, #B42318 red) and disclaimer (13px, PA.ink3 gray). Rate limiting and cooldown handled with message display.
- **Issues:**
  - `P0` Lock icon background color hardcoded as #EEF1F5 instead of token. Also, border-radius 12px is undersized; should be 24px (DESIGN.md §8.3).
  - `P0` Feedback/error color hardcoded as #B42318 instead of --parent-danger token (DESIGN.md §8.2). Another color literal violation undermining design system adoption.
  - `P1` Card uses 14px border-radius instead of 24px spec. Input styling uses custom border-bottom (2px) instead of standard card border pattern. Inconsistent with other parent screens.
  - `P1` Confirm button uses 10px border-radius, PA.accent, 12px padding. Non-standard (should be 24px radius pill, 48px height per DESIGN.md §8.3). Button is undersized and lacks visual weight for a security-critical action.
  - `P1` Disabled state uses opacity 0.5 (styles.confirmDisabled). Not accessible; disabled controls need explicit color + text treatment per GOOD-DESIGN-PRINCIPLES §2 (state visibility) and WCAG AA.
  - `P2` Input label 'PARENT PIN' uses 12px. Body uses 15px. Inconsistent typography hierarchy. Consider 14px body, 13px label per DESIGN.md §8.4 typography rules.
- **Redesign:**
  - Replace all hardcoded colors: #EEF1F5 → --parent-bg-2, #B42318 → --parent-danger. Ensure color tokens are applied consistently across lock icon bg, feedback message, and disabled states.
  - Upgrade lock icon container to 24px border-radius and increase to 64x64px for better visual presence. Use --parent-card bg instead of hardcoded.
  - Redesign input card to use full-width 24px border-radius card with 24px padding. Remove custom border-bottom; use standard 1px --parent-line border.
  - Upgrade confirm button to charcoal pill style (24px border-radius, 48px height, full-width) per DESIGN.md §8.3. When disabled, use --parent-ink-2 (muted) text + --parent-bg-2 bg, not opacity.
  - Improve disabled feedback: instead of opacity, show text message 'Try again in X seconds' near button and disable the input field as well. Clear state visibility per GOOD-DESIGN-PRINCIPLES §2.

### ParentLockedOutScreen.tsx  · `parent` · **P1**
- **Purpose:** Display when parent account is locked (too many failed PIN attempts) and provide unlock action or support escalation
- **Now:** Uses ParentScroll with title 'Parent area locked' (22px, PA.ink). Optional error message (13px, #B42318 red). Two TouchableOpacity actions: 'Unlock with parent account' (charcoal pill-like style, --accent bg, 12px padding, 10px radius, white text) and 'Contact support' (accent color text, 15px, 500 weight). Minimal styling, focused on clarity.
- **Issues:**
  - `P0` Error message color hardcoded as #B42318 instead of --parent-danger token (DESIGN.md §8.2). Consistent pattern of color literal violations across parent screens.
  - `P1` Primary action button ('Unlock') uses 10px border-radius, 12px padding. Non-standard vs DESIGN.md §8.3 spec (24px radius, 48px height pill). Button is undersized and lacks visual weight for a critical recovery action.
  - `P1` Button styling ad-hoc (inline-like, small padding, 10px radius). Should follow charcoal pill standard (24px radius, 48px height, full-width) per DESIGN.md §8.3.
  - `P1` No visual emphasis or explanation card. Screen presents error state without context (why locked? how to recover?). Should have a hero card explaining lockout duration and recovery steps per GOOD-DESIGN-PRINCIPLES §2 (state visibility).
  - `P2` Secondary action ('Contact support') is text-only link. Could be more visible (e.g., secondary button with border). Improves accessibility and clarity per GOOD-DESIGN-PRINCIPLES §7.
- **Redesign:**
  - Replace #B42318 with --parent-danger token in error message styling.
  - Redesign primary action to full-width charcoal pill (24px border-radius, 48px height, PA.accent bg, white text) per DESIGN.md §8.3.
  - Add explanation card at top (24px border-radius, --parent-bg-2 bg, 24px padding): icon (lock/warning), headline 'Parent area locked', body text explaining temporary lockout and recovery steps (e.g., 'Too many failed attempts. Try again in [time].' or 'Account locked for security. Contact support to unlock.').
  - Redesign secondary action to secondary button style (24px border-radius, 48px height, 1px --parent-line border, PA.ink text) instead of text-only link. Improves visual hierarchy and tap target clarity.
  - Use timer/countdown display if lockout is temporary. Show explicit unlock time (e.g., 'Unlock available in 5 minutes') per GOOD-DESIGN-PRINCIPLES §2 state visibility.

---

## Purchase Feature (src/features/purchase/screens/)

_All 12 screens operate in PARENT lane (operational, parent-gate confirmation, device/subscription management). One screen (HowItWorksScreen) mixes PARENT + CHILD contexts through LCDFace emotion animation. Lane classification: 11 pure PARENT, 1 mixed PARENT/CHILD._


### OrderConfirmScreen.tsx  · `parent` · **P1**
- **Purpose:** Confirmation screen after successful robot + course purchase. Shows order number, device shipped status timeline (📦 → 🚚 → 🤖), email confirmation, tracking action.
- **Now:** Uses RobotHero (84px, #FF6F61 accent), PRChip for status badge, DeviceBigBtn for primary CTA. Status state machine ('loading'|'error'|'ready'). Calls refreshEntitlementsAfterPurchase() on paid status. Check circle badge + success text hardcoded (#E6F4EE) instead of PR tokens.
- **Issues:**
  - `P1` Check circle background (#E6F4EE) and success text color hardcoded instead of using --parent-success token (--parent-success #34C759). Violates DESIGN.md 'Tokens Only' rule.
  - `P1` Heading fontSize 26 hardcoded inline (styles.successHeading) instead of using type-scale token. Violates DESIGN.md typography standard; may overflow on i18n expansion.
  - `P2` Email confirmation card lacks visual hierarchy — same font sizes for label and value. Should use caption + body distinction per GOOD-DESIGN-PRINCIPLES §3 (hierarchy via scale/weight).
- **Redesign:**
  - Replace hardcoded #E6F4EE with --parent-success token #34C759 for check circle background.
  - Replace inline fontSize 26 with semantic type-scale token (e.g., --text-heading-sm or --text-28); add margin for expansion room.
  - Add accessibilityLabel='Order confirmation' to heading for screen reader clarity (WCAG AA).
  - Visually separate 'Order #' label from number via caption style; use semantic spacing per design tokens.

### FirstCourseScreen.tsx  · `parent` · **P1**
- **Purpose:** Step 2 of 3 — 'Add your first course'. Shows robot activation status (green chip), Hello Friends course card, course tags, course selector.
- **Now:** PRStepTab(2,3) at top. Course card has 2px border in PR.accent instead of 1px. Ages text hardcoded fontSize 11. Uses PRChip for activation status, DeviceBigBtn for primary action. No loading state visible.
- **Issues:**
  - `P2` Course card border 2px (styles.courseCardBorder) instead of 1px. Inconsistent with other card styles in purchase flow. Violates visual consistency principle.
  - `P1` Ages text (e.g., '3-5 years') hardcoded fontSize 11 instead of caption token (--text-caption or --text-11). May overflow with longer i18n translations.
  - `P2` No affordance indicating 'Explore the library first' secondary action is available. Button uses default style, lacks visual distinction from primary.
- **Redesign:**
  - Standardize course card border to 1px (match BundleScreen, CheckoutScreen card styles).
  - Replace inline fontSize 11 with --text-caption token; verify line-height accommodates i18n.
  - Add accessibilityRole='button' to 'Explore the library first' link; upgrade visual affordance with underline or icon.
  - Add loading state feedback during course fetch (skeleton card or spinner) per GOOD-DESIGN-PRINCIPLES §4 (state visibility before decoration).

### BundleScreen.tsx  · `parent` · **P1**
- **Purpose:** Step 2 of 3 — 'Pick your bundle'. Two selectable options (Robot+Hello Friends $149 vs Robot+All Courses 1yr $219) with radio buttons, price, description.
- **Now:** Radio selection with visual highlight (selected: #E8F0FE bg, 2px accent border). Price text hardcoded fontSize 20. Bundle options show tag ('Most parents pick' vs 'Saves more'), title, description. Note text at bottom uses caption style.
- **Issues:**
  - `P1` Price text hardcoded fontSize 20 instead of semantic type-scale token. Violates DESIGN.md 'Tokens Only' rule.
  - `P1` Bundle tags ('Most parents pick' vs 'Saves more') use color alone to distinguish (orange #FF9500 vs purple #6B4EFF). Violates 'State visible before decoration' — color alone is insufficient for accessibility (WCAG AA). Needs additional differentiator (icon, label, or pattern).
  - `P2` Selected state highlight color #E8F0FE hardcoded instead of using design token. Inconsistent with parent-lane palette.
  - `P2` No clear affordance that bundles are radio-selectable — only visual highlight on tap. Should add radio icon + aria-label for accessibility.
- **Redesign:**
  - Replace inline fontSize 20 with --text-heading-xs or semantic price token.
  - Add icon or pattern differentiator to tags ('Most parents pick' = 🌟 icon, 'Saves more' = 💰 icon) + semantic label. Color alone fails WCAG AA (§12 Slow Down principle).
  - Replace #E8F0FE with --parent-surface-active or --parent-bg-secondary token.
  - Add radio icon + accessibilityRole='radio' + accessibilityState={{ checked: isSelected }} to each bundle option.

### SubscriptionsScreen.tsx  · `parent` · **P0**
- **Purpose:** Step 2 of 3 — 'Add courses?' optional subscription screen. Three radio-button options (No subscription Free, All Courses $8.99/mo 7-day free, Starter pack $48 one-time). Shows current plan, billing status, mutation handlers.
- **Now:** Complex state management: current subscription, billing end date, cancel/pause/reactivate/resume mutations. Status lines hardcoded inline without semantic tokens. Error text #B42318 hardcoded instead of --parent-danger. Feature-flagged with isSubscriptionFeatureEnabled(). Multiple status messages compete for space.
- **Issues:**
  - `P1` Status lines (e.g., 'Billing ends 2024-12-31') hardcoded inline without semantic color/styling. No distinction between success/warning/error states. Violates GOOD-DESIGN-PRINCIPLES §8 (info architecture: status→hero→details→action).
  - `P1` Error text color hardcoded #B42318 instead of --parent-danger token. Inconsistent palette across app.
  - `P2` Multiple subscription status + mutation messages (current plan, end date, mutation result) compete for same space without clear visual hierarchy. Can confuse user state.
  - `P2` Subscription options lack affordance indicating radio selection — no icon, no focus state, only touch area. Violates F2 (disabled actions must explain); active states must be obvious.
  - `P2` Feature-flag condition (isSubscriptionFeatureEnabled()) with no fallback UI shown to user. If feature is off, screen shows nothing — no explanation.
- **Redesign:**
  - Create semantic status panel: separate success (green), warning (yellow), error (red) states using --parent-success, --parent-warning, --parent-danger tokens.
  - Move 'Your child never sees prices' note to callout card with info icon + better visual separation. It's the key trust signal — prioritize.
  - Replace error color #B42318 with --parent-danger token throughout.
  - Add radio icon + accessibilityRole='radio' to each subscription option. Highlight active selection with blue border + 2px thickness.
  - Add feature-flag fallback UI: 'Subscriptions available soon. Current plan: Free trial ends Dec 31.'

### PurchaseIntroScreen.tsx  · `parent` · **P1**
- **Purpose:** Entry point to purchase flow — 'Meet Robot' intro. Hero robot image (220px RobotHero), feature cards (3 rows with emoji), CTAs ('See how it works' + 'Privacy & safety first').
- **Now:** Uses RobotHero (220px, #FF6F61 accent). Chip reads 'A gentle English buddy'. Feature cards with emoji icons in light gray boxes. Primary CTA uses custom TouchableOpacity style instead of DeviceBigBtn. Privacy link is text-only with no affordance.
- **Issues:**
  - `P1` Primary CTA ('See how it works') uses custom TouchableOpacity style (styles.primaryCta: borderRadius 12, manual colors) instead of DeviceBigBtn component. Violates component consistency principle — should use design-system primitive.
  - `P2` Privacy link ('Privacy & safety first') is text-only with no visual affordance (no underline, no icon, no container). Violates F1 principle — 'disabled actions must explain' applies to all interactive surfaces. This looks disabled but is active.
  - `P2` Feature card emoji background color hardcoded #F3F5F7 instead of design token (should be --parent-bg-secondary or --parent-surface-calm).
  - `P2` Heading fontSize 30 may violate line-length constraint in i18n (e.g., Chinese translations). No max-width or fluid sizing on heading.
- **Redesign:**
  - Replace custom TouchableOpacity primary CTA with DeviceBigBtn component. Remove inline styles.
  - Upgrade privacy link to container button: add subtle background (--parent-bg-secondary), 1px border (--parent-hair), padding (12px), accessibilityRole='button'.
  - Replace hardcoded #F3F5F7 emoji background with --parent-bg-secondary token.
  - Add max-width or fluid sizing to heading; test with 3-4 i18n locales before ship.

### ActivateScreen.tsx  · `parent` · **P1**
- **Purpose:** Step 1 of 3 — 'Activate your Robot'. Takes 6-character activation code. Visual: lock icon (24x24 SVG), six code input boxes with border animation on fill, keyboard-style buttons, help row.
- **Now:** Code input uses Courier New font hardcoded (fontFamily) for visual distinction. Help row ('Can't find the code?') styling reuses .helpRow class inconsistently. No error state for invalid activation code — silent failure risk.
- **Issues:**
  - `P1` Code input fontFamily hardcoded as 'Courier New' instead of using token (--font-mono or design token). Violates DESIGN.md 'Tokens Only' rule.
  - `P1` No visible error state for invalid activation code — user enters code, submits, and nothing happens. Violates GOOD-DESIGN-PRINCIPLES §4 (state visibility) and F3 (error taxonomy: must show U_INVALID_CODE error with remediation).
  - `P2` Help row ('Can't find the code?') uses generic .helpRow style class applied inconsistently. Text color and size not tied to semantic token.
  - `P2` Keyboard button styling (CODE_CHARS layout) is custom-hardcoded; should use reusable button token component to match parent-lane design.
- **Redesign:**
  - Replace hardcoded 'Courier New' with --font-mono design token.
  - Add visible error state: red border + red text 'Invalid code. Check the label and try again.' + refocus on first input box per F3 error taxonomy.
  - Wrap help row in semantic caption token; use --parent-ink-2 color instead of hardcoded gray.
  - Replace custom keyboard button styles with semantic button token or DeviceBigBtn (secondary variant) for consistency.

### HowItWorksScreen.tsx  · `mixed` · **P1**
- **Purpose:** Step 1 of 3 — 'How it works'. Shows 3-step lesson flow: (1) Robot talks, (2) Child practices, (3) Parent sees summary. Each step has numbered badge (1, 2, 3 in accent circles), title, body, LCDFace emotion animation.
- **Now:** Uses PARENT-lane layout + step cards. LCDFace emotion prop (speak/listen/happy) maps to Lottie animation. Step card styling hardcoded: backgroundColor PR.card, borderWidth 1, borderRadius 16. LCD backgrounds hardcoded #0E1116 (dark) instead of token. Mixes parent (step explanation) with child (emotion visualization) context.
- **Issues:**
  - `P1` Lane mixing: screen is predominantly PARENT (step instruction flow) but LCDFace emotion animation is CHILD-focused (targets child's emotional engagement). Violates DESIGN.md 'Never mix lanes' prohibition. If child emotion is required, move to separate CHILD-lane screen.
  - `P1` LCD background #0E1116 hardcoded instead of design token. Should use --parent-bg-0 or --parent-surface-alt token for consistency.
  - `P2` Step card styling hardcoded (backgroundColor PR.card, borderWidth 1, borderRadius 16) instead of using semantic card token. Inconsistent with other screens (FirstCourseScreen, BundleScreen use same inline styles).
  - `P2` LCDFace emotion prop has no documented fallback if Lottie asset missing. Could crash or show blank. Violates error-handling principle.
- **Redesign:**
  - Declare as MIXED lane, with clear separation: PARENT section (top) explains steps for parent, CHILD section (bottom) shows emotion visualization for child context. Add visual divider or whitespace break.
  - Replace hardcoded #0E1116 LCD background with --parent-bg-0 token (or --dark-0 if dark mode is locked).
  - Extract step card styling to reusable token/component: --card-bg, --card-border, --card-radius instead of inline.
  - Add fallback UI for LCDFace: if emotion asset missing, show emoji (😊, 🗣️, 👂) instead of animation. Add try-catch in emotion prop handler.

### CheckoutScreen.tsx  · `parent` · **P0**
- **Purpose:** Step 2 of 3 — 'Checkout'. Shows order items (Robot + Hello Friends + All Courses subscription + Free shipping), total $149. Ship-to address card + payment options (Apple Pay + Visa card 4421).
- **Now:** Order items listed with prices. Ship-to address shows placeholder 'Missing' (SAVED_SHIPPING_PROFILE is null, edit button disabled). Payment section hardcoded mock (Apple Pay + Visa). Feature-flagged. Note: '30-day return, 2-year warranty, no auto-renew without notice'.
- **Issues:**
  - `P0` Ship-to address hardcoded 'Missing' and edit button is DISABLED without explanation. Violates F2 (disabled actions must explain themselves) AND blocks checkout workflow. User cannot see how to proceed. This is a critical UX failure.
  - `P1` Payment options (Apple Pay, Visa card 4421) are hardcoded mock data, not fetched from API. User cannot change payment method. Incomplete checkout implementation.
  - `P2` Edit button on address card has no tooltip or helper text explaining why it's disabled. Should say 'Address will be added at checkout' or link to address manager.
  - `P2` Order item prices not using semantic price token — inline fontSize and color.
- **Redesign:**
  - CRITICAL: Add visible path to input shipping address. Either (a) enable edit button + show address form overlay, or (b) replace 'Missing' with 'Add address' CTA button.
  - Add helper text below disabled edit button: 'Enter your address to continue. We ship to US addresses only.' (inline, using --parent-ink-2 color).
  - Wire payment options to API (Stripe, Square, or Apple Pay SDK). Do not hardcode mock data in shipping screen — checkout MUST be complete before merge.
  - Replace hardcoded order item prices with semantic token; group items in visual hierarchy (product → quantity → price per line).

### PrivacyScreen.tsx  · `parent` · **P2**
- **Purpose:** Trust/assurance screen — 'What we promise parents'. Lists 6 privacy + safety commitments (no audio storage, no ads, parent gates, offline-safe, data export/delete, COPPA/GDPR-K compliance).
- **Now:** Uses PRChip for 'Privacy first · always' badge with hardcoded colors (#E6F4EE background, PR.good text). List rows with emoji icons in light-gray boxes (backgroundColor #E6F4EE hardcoded). Heading 'Your child's voice stays your child's' with fontSize 24 inline.
- **Issues:**
  - `P2` PRChip background hardcoded #E6F4EE instead of using --parent-success token (#34C759 or --parent-bg-success background).
  - `P2` List icon backgrounds hardcoded #E6F4EE instead of design token. Inconsistent across privacy commitments.
  - `P2` Heading fontSize 24 hardcoded inline instead of type-scale token. May overflow on i18n.
  - `P2` List items lack semantic affordance — text-only, no icons beyond emoji. Could be clearer with checkmark or lock icon for visual scan.
- **Redesign:**
  - Replace hardcoded #E6F4EE with --parent-success or --parent-bg-success token throughout.
  - Replace heading inline fontSize 24 with --text-heading-sm token; add fluid sizing for i18n expansion.
  - Add checkmark icon (✓ or 🔒) to each commitment line to reinforce trust signal visually (emoji + icon combo).
  - Wrap each commitment in accessible list item: <li role='listitem'> with aria-label summarizing commitment.

### ShippingScreen.tsx  · `parent` · **P1**
- **Purpose:** Post-purchase tracking screen — 'Robot is on its way'. Shows order tracking timeline (Order placed → Packed → In transit → Out for delivery → Delivered) with status dots/lines. Track with carrier + change delivery address rows.
- **Now:** RobotHero (84px) with PRChip 'Arriving <date>'. Timeline uses custom dots (2px border, 24px size, filled green when done, pulse when active). Lines connect steps (background color animated based on done/active state). Uses DeviceRow for 'Track with carrier' + 'Change delivery address'.
- **Issues:**
  - `P1` Timeline line color for inactive steps hardcoded 'rgba(0,0,0,0.1)' instead of design token (--parent-hair or --parent-border-faint). Violates semantic color principle.
  - `P2` Active pulse animation (width 8, height 8, borderRadius 4, backgroundColor PR.accent) uses hardcoded dimensions instead of design token. Should use --space-xs and --radius-full tokens.
  - `P2` 'Change delivery address' row shows 'Until Tuesday at 6 PM' without explanation. User doesn't know what action is required. Lacks affordance clarity (F1 principle).
  - `P2` Error state (status==='error') shows generic 'Shipping needs a retry' without context. Should show specific error (network timeout, API failure, tracking not found) with remediation.
- **Redesign:**
  - Replace hardcoded 'rgba(0,0,0,0.1)' line color with --parent-border-faint or --parent-hair token.
  - Replace hardcoded pulse dimensions (8, 8, 4) with --space-xs and --radius-full tokens.
  - Add helper text to 'Change delivery address': 'Modify address until Tuesday at 6 PM' (caption style, --parent-ink-2 color).
  - Improve error state: parse API error code, show 'Tracking unavailable. Your carrier hasn't updated yet. Check again in 2 hours.' with retry timer.

### IncludedScreen.tsx  · `parent` · **P2**
- **Purpose:** Step 2 of 3 — 'In the box'. Lists 6 items included with robot (device, dock, app, starter course, booklet, warranty) with emoji icons + descriptions.
- **Now:** Uses PRStepTab(2,3) at top. List items have emoji icons in boxes (backgroundColor PR.warm, borderRadius 10, 32px size). Heading fontSize 24 inline. Note at bottom 'Hardware is yours. The starter course is included forever.' uses caption style inline.
- **Issues:**
  - `P2` List icon background uses PR.warm token (good), but borderRadius 10 hardcoded instead of semantic token (--radius-md or --radius-sm).
  - `P2` Heading fontSize 24 hardcoded inline instead of type-scale token.
  - `P2` Note text 'Hardware is yours...' at bottom lacks visual emphasis. Could be highlighted in a callout box to reinforce ownership messaging (key differentiator from subscription models).
  - `P1` List items missing semantic structure — no aria-label on emoji, no accessibility role. Emoji alone may not be clear to screen-reader users.
- **Redesign:**
  - Replace hardcoded borderRadius 10 with --radius-md token (or 8-10px semantic value).
  - Replace heading fontSize 24 with --text-heading-sm token.
  - Move 'Hardware is yours...' note into a highlighted callout card: background --parent-bg-secondary, left border 3px --parent-accent, padding 14px, rounded 12px.
  - Add aria-label to each emoji icon: 'Robot device', 'Charging dock', etc. Wrap emoji + description in semantic <li> with role='listitem'.

### ArrivedScreen.tsx  · `parent` · **P2**
- **Purpose:** Final confirmation after delivery — 'Robot is here'. Shows large RobotHero (220px), PRChip 'Delivered today', heading 'Your Robot has arrived', 3-step setup flow (Open box, Plug in dock, Connect Wi-Fi), defer-setup option.
- **Now:** RobotHero (220px, #FF6F61 accent). PRChip using PR.good + #E6F4EE background (hardcoded). Heading fontSize 28 inline. Setup steps in DeviceRow rows (icon + title + body). Defer note in noteCard (backgroundColor PR.warm).
- **Issues:**
  - `P2` PRChip background #E6F4EE hardcoded instead of design token (should be --parent-success or --parent-bg-success).
  - `P1` Heading fontSize 28 hardcoded inline instead of type-scale token. May overflow on i18n.
  - `P2` Setup step list uses icon emoji in DeviceRow; no affordance indicating steps are sequential/required. Could add step numbers or visual connector lines.
  - `P2` Defer note 'Setting up later? Robot will wait quietly in its box.' lacks visual distinction — background PR.warm is subtle. Could be bolder to ensure parent reads commitment.
- **Redesign:**
  - Replace hardcoded #E6F4EE PRChip background with --parent-success token.
  - Replace heading fontSize 28 with --text-heading-lg or --text-32 token; add fluid sizing.
  - Add visual numbering to setup steps: '1. Open the box', '2. Plug in...', '3. Connect...' instead of emoji icons alone. Use semantic counter-style or numbered circles.
  - Increase visual weight of defer note: add left border 3px --parent-accent, background --parent-bg-secondary, padding 14px, border-radius 12px to match callout pattern.

---

## fallback feature screens (error states, recovery, settings)

_Mixed lane — screens serve both child-facing (playful garden-blue) and operational contexts. AppErrorScreen and AudioRecoveryScreen are operational (parent/operational lane). MicMissingScreen, NetworkErrorScreen, SafetyRedirectScreen, VoiceFailedScreen are child-facing (garden-blue lane). KidSettingsScreen is child lane. LessonResumeScreen and HelpFaqScreen serve both._


### AppErrorScreen.tsx  · `operational` · **P0**
- **Purpose:** Generic app crash/critical error handler. Shows Robot (worry emotion), message, and three CTAs (Try again, Back home, Contact support).
- **Now:** Robot character centered (worry emotion, 180px size). Title 'Something went wrong' (fontSize 28, color #2B2140, fontWeight 800). Message body (fontSize 16, color #5C4F77). Three horizontal buttons (flex row, gap 12) with hardcoded colors (#FF6F61 warm, #6FC1FF cool). ScreenShell container with no explicit padding structure violations.
- **Issues:**
  - `P0` LANE VIOLATION: Screen uses child lane (playful Robot emotion + warm/cool hardcoded colors) but serves operational error context. Should use Wispr Flow parent lane tokens (--parent-ink-0, --parent-danger, --parent-bg-0) for calm operational tone. Robot character appropriate for child, but palette is inconsistent with DESIGN.md §8 (parent operational rule).
  - `P0` HARDCODED COLORS: Three CTAs use hardcoded #FF6F61, #6FC1FF instead of design tokens. Should map to semantic tokens: primary action → --parent-ink-0 (charcoal pill) or child-warm-accent; secondary → --parent-bg-2. Violates DESIGN.md §4 (all visual values from tokens).
  - `P1` PRIMARY ACTION CLARITY: Three buttons of equal prominence in horizontal flex row violates GOOD-DESIGN-PRINCIPLES §1 (One Primary Action Per Screen). 'Try again' should be the dominant action; others secondary or ghost. Current layout is choice paralysis.
  - `P1` TOUCH TARGET: Buttons appear in flex row with gap 12, but no explicit height set. Should be 48px minimum per DESIGN.md §5. Unclear if tap area meets 44-48px requirement.
  - `P2` ERROR STATE GUIDANCE: Message says 'Your account and progress are safe' but no actionable next step or explanation of what caused the error. GOOD-DESIGN-PRINCIPLES §2 (State Is Visible Before Decoration) requires text + clarity, not just reassurance.
- **Redesign:**
  - Shift to parent lane tokens if this is an operational error (likely). Use --parent-bg-0 (warm off-white bg), --parent-ink-0 (charcoal text), --parent-danger (red for error badge if applicable).
  - Make 'Try again' the full-width primary button (48px, charcoal pill). Move 'Back home' and 'Contact support' to secondary (ghost) or stacked below as text links.
  - Replace hardcoded colors: #FF6F61 → semantic error/warm token; #6FC1FF → secondary action token.
  - Consider replacing playful Robot emotion with neutral 'worry' or 'gentle' and frame the screen in calm, operational language ('An error occurred. We're keeping your progress safe.').
  - Add explicit error code or category visible (e.g., 'E_APP_CRASH' per GOOD-DESIGN-PRINCIPLES §3 F3) if appropriate for user debugging.

### AudioRecoveryScreen.tsx  · `operational` · **P0**
- **Purpose:** Step-by-step instruction for parents/kids to enable microphone permission in device settings. Headed by TopBar, scrollable list of 3 steps, two CTAs at bottom.
- **Now:** TopBar with back nav. Padding 20px horizontal, 18px top. Heading (fontSize 18, fontWeight 600, color #2B2140) + sub-body (fontSize 14, color #5C4F77). Steps rendered in white card (backgroundColor #fff, borderRadius 14, borderWidth 1, borderColor rgba(0,0,0,0.07)). Each step is a flex row with numbered circle (28×28, bg #EEF1F5), step title (fontSize 15, fontWeight 500), body text (fontSize 13, color #5C4F77). Bottom buttons: primary (fontSize 15, fontWeight 600, minHeight 48, borderRadius 10, bg #2A6FDB, disabled) and secondary (borderWidth 1, bg #fff).
- **Issues:**
  - `P0` HARDCODED BUTTON COLORS: Primary button uses #2A6FDB (blue), secondary uses #fff + border. Should use design tokens: primary → --parent-ink-0 (charcoal) for parent operational lane, not arbitrary blue. DESIGN.md §4 + §8.3 mandate all visual values from tokens.
  - `P0` DISABLED STATE CLARITY MISSING: Primary button 'Open device Settings' is `disabled` with no explanation visible to user. GOOD-DESIGN-PRINCIPLES §2 (Disabled Actions Must Explain Themselves) requires adjacent helper text ('This action requires manual device setup'). Current state leaves user confused about why button is inactive.
  - `P1` BORDER COLOR OPACITY: Steps + input cards use `borderColor: rgba(0,0,0,0.07)` (subtle gray). Should use --parent-line token for consistency. Hardcoded rgba value instead of token violates DESIGN.md §4.
  - `P1` FOOTER LEGAL TEXT: Very small (fontSize 12) and muted (#8B8B96). While appropriate for secondary legal copy, placement at bottom after CTAs is good, but should use --parent-ink-2 token instead of hardcoded color.
  - `P2` STEP NUMBER STYLING: Background #EEF1F5 is hardcoded. Should use --parent-bg-2 (muted section) token for consistency.
- **Redesign:**
  - Replace #2A6FDB with --parent-ink-0 (charcoal) for primary button. Use 48px height and full-width pill style per DESIGN.md §8.3 (Buttons).
  - Add visible helper text below disabled button: 'You'll need to leave this app and change device settings manually.' Or, if enabling is possible, provide direct device-settings URL/deep-link.
  - Standardize all hardcoded colors to design tokens: #fff → --parent-bg-1, #EEF1F5 → --parent-bg-2, rgba(0,0,0,0.07) → --parent-line.
  - Ensure secondary button uses --parent-bg-2 fill or ghost style (no fill, --parent-accent text) per DESIGN.md §8.3.
  - Review i18n: heading and footer are hardcoded English; use i18n bundle (t() function) for all user-facing strings per GOOD-DESIGN-PRINCIPLES §14.

### HelpFaqScreen.tsx  · `mixed` · **P1**
- **Purpose:** Parent/child-facing help center with FAQ search, expandable Q&A list, and 'Still Need Help' section with contact support link.
- **Now:** TopBar with back nav. Search input (padding 12, borderRadius 10, bg #fff, borderColor rgba(0,0,0,0.07)). FAQ list card (bg #fff, borderRadius 14, borderWidth 1, borderColor rgba(0,0,0,0.07)). Each FAQ item is a flex row with title (fontSize 15, fontWeight 500, color #2B2140), chevron icon (fontSize 14, color #8B8B96). Expandable body text (fontSize 14, color #5C4F77, lineHeight 21). Help list below with similar styling. Section header (fontSize 12, color #8B8B96, fontWeight 600, letterSpacing 0.8).
- **Issues:**
  - `P1` SEARCH INPUT STYLING: Hardcoded colors (bg #fff, borderColor rgba(0,0,0,0.07), color #2B2140). Should use --parent-bg-1, --parent-line, --parent-ink-0 tokens. Also no placeholder styling for accessibility (currentColor should be --parent-ink-2 for muted).
  - `P1` LIST STYLING HARDCODED: FAQ and help lists use #fff background, rgba(0,0,0,0.07) borders, #2B2140 text. Should use token palette: --parent-bg-1, --parent-line, --parent-ink-0. Violates DESIGN.md §4.
  - `P2` SECONDARY TEXT COLORS: Help list chevron (#8B8B96) and section header (#8B8B96) are hardcoded. Should use --parent-ink-2 token for muted text.
  - `P2` MIXED LANE (CHILD + PARENT): Screen serves both lanes with no visual lane separation. GOOD-DESIGN-PRINCIPLES §12 (Two-Lane Visual Separation) prohibits mixing palettes. If this is parent-operational, standardize to Wispr Flow. If child-accessible, clarify which FAQs are child-facing vs. parent-only.
  - `P2` EMPTY SEARCH STATE: No empty state handling for search results (0 matches). Current code does not show 'No results found' message.
- **Redesign:**
  - Tokenize all hardcoded colors: #fff → --parent-bg-1, rgba(0,0,0,0.07) → --parent-line, #2B2140 → --parent-ink-0, #8B8B96 → --parent-ink-2, #5C4F77 → --parent-ink-1.
  - Clarify lane: if parent operational, standardize to parent tokens + serif headings. If supporting child access, add visual lane marker (e.g., child-facing FAQs in playful section, parent copy in serif section).
  - Implement empty search state: when search yields no results, show 'No help found. Try a different search or contact support.' with CTA link.
  - Ensure expand/collapse chevron rotation is smooth (add animation duration) and uses semantic color (--parent-ink-2).
  - Review i18n for all hardcoded English FAQs; move to i18n bundle and use t(faq.q) and t(faq.a) for full localization support.

### KidSettingsScreen.tsx  · `child` · **P0**
- **Purpose:** Child-facing settings surface with toggle controls (Sound, Microphone) and navigation to Parent Area + Help.
- **Now:** PageScroll wrapper. PageHeader with back nav. Robot character (happy emotion, 140px size, no accent override). Two SettingRows rendered as flex-row cards (bg #fff, borderRadius 20, padding 14, shadow). Each row has icon emoji (fontSize 24), label (fontSize 18, fontWeight 700, color #2B2140), flex spacer, and Switch toggle (active trackColor #6CE2B6). Parent Area button styled as dashed-border card (bg #fff, borderWidth 2, borderColor rgba(0,0,0,0.15), borderStyle dashed, borderRadius 20). Help button as plain text link. Bottom spacing 24px.
- **Issues:**
  - `P0` HARDCODED COLORS IN GARDEN BLUE CONTEXT: Switch trackColor uses #6CE2B6 (cyan success tone) hardcoded instead of design token. Should use child-lane equivalent (likely defined in theme.ts as a garden-blue accent). All colors should source from design-system tokens, not hardcoded hex.
  - `P1` DASHED BORDER STYLING: Parent Area button uses `borderStyle: 'dashed'` (iOS only support; Android may not render consistently). Per GOOD-DESIGN-PRINCIPLES §8 (Accessible Affordances), dashed borders are not accessible enough for a primary affordance. Should use solid border + icon + semantic color to signal 'access restricted' state.
  - `P1` SETTING ROW TOUCH TARGET: SettingRow is a flex-row card (padding 14) but no explicit min-height. Switch toggle is a system component (assume 44px min), but total row height unclear. Ensure 44px+ per GOOD-DESIGN-PRINCIPLES §8 (Touch Targets).
  - `P1` EMOJI ICONS: Using raw emoji (🔊, 🎤, 🔒) instead of proper icon components. While emotionally appropriate for child lane, emoji rendering is inconsistent across devices/fonts. Should use icon library (Feather, Ionicons) for consistency. GOOD-DESIGN-PRINCIPLES §12 (Hierarchy via Scale & Weight) expects consistent iconography.
  - `P2` HELP BUTTON STYLING: Plain text link with no visual affordance (no background, border, or color change on press). Should have visible tap feedback (e.g., color shift, opacity change) within 100ms per GOOD-DESIGN-PRINCIPLES §7 (Interactive Affordances).
- **Redesign:**
  - Replace hardcoded #6CE2B6 with child-lane token (check theme.ts for token name; likely --child-accent-success or similar). Define all visual values in token layer, never hardcoded.
  - Replace dashed-border Parent Area button with solid border + lock icon + semantic color (muted or accent). Add tooltip or helper text on press: 'Parent area is password-protected.' Or use a visually distinct card style (bg tint + color shift).
  - Ensure all SettingRows have explicit minHeight={48} to meet touch-target requirement. Verify Switch component meets 44px+ minimum.
  - Replace emoji icons with proper icon components from project's icon library. Maintain playful tone via color choice (warm garden-blue accent).
  - Add activeOpacity={0.7} to Help button and visible color shift (e.g., textColor → muted-accent on press) to signal interactivity.
  - Review i18n: labels ('Sounds', 'Microphone', 'Grown-up area', 'For parents', 'Need help?') should use i18n bundle, not hardcoded English.

### LessonResumeScreen.tsx  · `child` · **P1**
- **Purpose:** Checkpoint resume prompt shown after a lesson is paused. Displays Robot (happy emotion), SpeechBubble, lesson progress card, and 'Keep going' / 'Stop for now' CTAs.
- **Now:** ScreenShell with bg #C5F1DD (light green/teal). Robot character (happy emotion, 220px, accent #6CE2B6). SpeechBubble ('Welcome back! Want to keep going?'). Centered card (bg #fff, borderRadius 24, padding 18, shadow elevation 2, 90% width). Card flex-row contains book emoji icon (54x54, bg #FFB3A8), lesson info (WHERE WE STOPPED label, lesson title fontSize 18 fontWeight 800, progress label, progress bar). Two CTAs: PrimaryCTA 'Keep going' (color #FF6F61 warm), secondary text link 'Stop for now'. Absolute positioning for layout (content paddingTop 90, paddingBottom 240, cta absolute bottom 48).
- **Issues:**
  - `P1` HARDCODED ACCENT COLORS: Robot accent=#6CE2B6 (cyan) and card icon bg #FFB3A8 (salmon) are hardcoded. Should source from design-system tokens (child-lane palette defined in theme.ts). DESIGN.md §4 mandates token-based visual values.
  - `P1` PRIMARY CTA COLOR: PrimaryCTA color={#FF6F61} (warm salmon) is hardcoded. Should use child-lane token (likely --child-accent-warm or child theme's primary color). Colors hardcoded instead of tokens violate DESIGN.md §4.
  - `P1` PROGRESS BAR STYLING: Progress track (backgroundColor 'rgba(0,0,0,0.06)') and fill (backgroundColor '#6CE2B6') are hardcoded. Should use design tokens for semantic progress visualization.
  - `P2` LABEL CASE: 'WHERE WE STOPPED' is uppercase (fontSize 11, fontWeight 700, letterSpacing 1). While visually distinctive, it violates DESIGN.md §8.4 (Sentence case in all headings; all-caps prohibited on parent surfaces). Unclear if this rule applies to child lane, but mixed-case is safer for readability and i18n.
  - `P2` SECONDARY CTA AFFORDANCE: 'Stop for now' is a plain text link (no background, minimal styling). While appropriate for secondary action, no visual feedback on press (no activeOpacity, no color shift). Should add opacity change or subtle background tint to signal interactivity per GOOD-DESIGN-PRINCIPLES §7.
- **Redesign:**
  - Replace all hardcoded colors with design tokens: #6CE2B6 → child-accent-teal token, #FFB3A8 → child-accent-salmon, #FF6F61 → child-accent-warm. Import tokens from design-system/theme.ts.
  - Verify Robot component respects design-system tokens for emotion/accent rendering. Check if accent prop should accept token names instead of hardcoded hex.
  - Update progress bar fill color to use semantic token (success/teal) instead of #6CE2B6.
  - Consider lowercase 'Where we stopped' (sentence case) for better i18n and readability. If uppercase is intentional for visual hierarchy, document the design rationale.
  - Add activeOpacity={0.7} + onPress color shift to 'Stop for now' text link. Example: default color --child-ink-1, press color --child-accent-soft.
  - Verify SpeechBubble component is child-lane aware (uses correct tokens for background + text color).

### MicMissingScreen.tsx  · `child` · **P1**
- **Purpose:** Error state for missing/disabled microphone. Shows Robot (sad emotion), SpeechBubble, hint card, and CTAs ('Get a grown-up', 'Need help?').
- **Now:** ScreenShell with bg #FFE5DC (light coral/salmon). Robot character (sad emotion, 220px size, accent #FF6F61). SpeechBubble ('Hmm, I can't hear yet. Let's check the microphone.'). Hint card (bg #fff, padding 18, borderRadius 20, maxWidth 300, centered). Hint text (fontSize 15, fontWeight 700, color #5C4F77, textAlign center, lineHeight 21). Two CTAs positioned absolutely bottom 48: PrimaryCTA 'Get a grown-up' (color #FF6F61), text link 'Need help?'.
- **Issues:**
  - `P1` HARDCODED ACCENT COLOR: Robot accent=#FF6F61 (salmon) is hardcoded. Should use design token (child-lane warm error accent from theme.ts). DESIGN.md §4 requires all colors from tokens.
  - `P1` CTA COLOR HARDCODED: PrimaryCTA color={#FF6F61} (warm salmon). Should use child-lane token for consistency. Hardcoded values violate token-first design.
  - `P1` SECONDARY CTA NO AFFORDANCE: 'Need help?' text link has no visible press feedback (no activeOpacity, no color shift). Should add opacity change or semantic color shift to signal interactivity per GOOD-DESIGN-PRINCIPLES §7.
  - `P2` HINT CARD STYLING: Hardcoded bg #fff. Should use --child-bg-1 (light surface) or similar token. Background padding + border appear correct, but color should not be hardcoded.
  - `P2` COPY CLARITY: 'No recordings are saved.' is reassuring but does not clearly state the next action. GOOD-DESIGN-PRINCIPLES §2 (State Is Visible Before Decoration) requires text + actionable guidance. Should add: 'Tell a grown-up so they can turn on the microphone.' to hint card.
- **Redesign:**
  - Replace hardcoded #FF6F61 with child-lane token (--child-accent-warm or theme equivalent). Ensure consistent use across Robot emotion accent and CTA button.
  - Replace hardcoded #fff (hint card bg) with --child-bg-1 token.
  - Add activeOpacity={0.7} to 'Need help?' text link. Consider subtle background fill on press to improve affordance.
  - Enhance hint card copy: 'No recordings are saved. Tell a grown-up to turn on the microphone, and we can try again.'
  - Verify Robot component sad emotion rendering uses correct child-lane color palette.
  - Review i18n: SpeechBubble, CTA, and hint text should use i18n bundle (t() function) for full localization.

### NetworkErrorScreen.tsx  · `child` · **P1**
- **Purpose:** Network/connectivity error state. Shows Robot (worry emotion), SpeechBubble, WiFi status badge, and CTAs ('Try again', 'Back home').
- **Now:** ScreenShell with bg #E8E5F0 (light purple). Robot character (worry emotion, 220px, accent #6B4A9B). SpeechBubble ('Oops — I lost my signal. Let's try again in a sec.'). Safe text message (fontSize 14, color #5C4F77, lineHeight 20, textAlign center, maxWidth 320). WiFi icon indicator (flex row with WifiIcon SVG, text 'No internet connection' fontSize 13 fontWeight 700, color #5C4F77, bg rgba(255,255,255,0.7), paddingVertical 8, paddingHorizontal 14, borderRadius 999). Two CTAs: PrimaryCTA 'Try again' (color #6B4A9B), text link 'Back home'. Absolute positioning (cta bottom 48).
- **Issues:**
  - `P0` HARDCODED ACCENT COLOR: Robot accent=#6B4A9B (purple). Should use design token (child-lane accent for warning/network state). DESIGN.md §4 + §8 (Parent palette) lists --parent-ink-1 as charcoal, but this screen is child-lane, so should use child token equivalent (check theme.ts).
  - `P1` CTA COLOR HARDCODED: PrimaryCTA color={#6B4A9B} (purple). Should source from design token for consistency. Hardcoded color violates DESIGN.md §4.
  - `P1` WIFI STATUS BADGE COLOR: bg rgba(255,255,255,0.7) is hardcoded. Should use semantic token (e.g., --child-surface-overlay or --child-bg-2). Text color #5C4F77 hardcoded; should use --child-ink-2 (muted).
  - `P1` SECONDARY CTA NO AFFORDANCE: 'Back home' text link has no visible press feedback. Should add activeOpacity={0.7} and semantic color shift per GOOD-DESIGN-PRINCIPLES §7.
  - `P2` WifiIcon SVG RENDERING: Icon has stroke=#6B4A9B (hardcoded). Should use design token variable for icon color. Icons should respect theme tokens dynamically.
  - `P2` SAFE TEXT CONTENT: Message 'Your place is saved. Try again, or go home and keep your lesson ready.' is reassuring but vague. Should include specific guidance: 'Check your WiFi connection and try again. If the problem continues, restart your device.'.
- **Redesign:**
  - Replace hardcoded #6B4A9B (accent), rgba(255,255,255,0.7) (badge bg), #5C4F77 (text) with design tokens from child-lane palette. Verify token names in theme.ts (likely --child-accent-purple, --child-surface-muted, --child-ink-2).
  - Update WifiIcon SVG stroke color to use design token (dynamic color injection or CSS variable).
  - Add activeOpacity={0.7} to 'Back home' link. Consider adding subtle background fill on press for better affordance.
  - Enhance safe text copy with specific remediation: 'Check your WiFi connection. Restart your device if the issue continues.'
  - Ensure WiFi badge uses semantic icon (not SVG, but proper icon component) for consistency. Icon should be system-native or icon library standard (Feather, Ionicons).
  - Review i18n: all text should use i18n bundle for localization support.

### SafetyRedirectScreen.tsx  · `child` · **P0**
- **Purpose:** Safety/pause screen for child session timeout or safety trigger. Shows Robot (gentle emotion), SpeechBubble, hint card, and CTAs ('Take a break', 'Need help?', 'Get a grown-up').
- **Now:** ScreenShell with bg #E8E5F0 (light purple). Robot character (gentle emotion, 220px, accent #6B4A9B). SpeechBubble ('Let's take a tiny pause. A grown-up can help if you need.'). Hint card (bg rgba(255,255,255,0.85), borderRadius 20, padding 18, maxWidth 300, centered). Three CTAs positioned absolutely bottom 48: PrimaryCTA 'Take a break' (color #6B4A9B), text link 'Need help?', text link 'Get a grown-up'.
- **Issues:**
  - `P0` VIOLATION OF §1 (ONE PRIMARY ACTION): Three CTAs with no clear primary action. 'Take a break' is PrimaryCTA styled, but 'Get a grown-up' and 'Need help?' are text links of equal visual weight. Current layout violates GOOD-DESIGN-PRINCIPLES §1 (Reduces choice paralysis). 'Take a break' should dominate; others should be secondary or ghost.
  - `P1` HARDCODED ACCENT: Robot accent=#6B4A9B, PrimaryCTA color=#6B4A9B. Should source from design token (child-lane accent). DESIGN.md §4 requires token-based colors.
  - `P1` HINT CARD BG HARDCODED: rgba(255,255,255,0.85) (semi-transparent white). Should use design token (--child-bg-overlay or --child-surface-muted). Hardcoded RGBA violates token-first design.
  - `P1` SECONDARY CTA AFFORDANCES: 'Need help?' and 'Get a grown-up' are plain text links (no activeOpacity, no color shift). Should add visible press feedback per GOOD-DESIGN-PRINCIPLES §7.
  - `P2` DUPLICATE ACTIONS: 'Take a break' and 'Get a grown-up' both navigate to ROUTES.HomeHubScreen (same destination). Redundant CTAs confuse the user. One should navigate elsewhere (e.g., 'Get a grown-up' → ParentSummaryScreen or SupportScreen).
- **Redesign:**
  - Restructure CTAs to clarify hierarchy: 'Take a break' primary (full-width charcoal pill, 48px, child-accent highlight). 'Need help?' and 'Get a grown-up' secondary (stacked below as ghost text links or smaller pills).
  - Replace hardcoded #6B4A9B with design token (child-accent token from theme.ts). Ensure Robot gentle emotion uses token-based colors.
  - Replace hardcoded rgba(255,255,255,0.85) with --child-bg-overlay or --child-surface-muted token.
  - Add activeOpacity={0.7} and semantic color shift to text links.
  - Clarify CTA destinations: 'Take a break' → HomeHubScreen, 'Get a grown-up' → HelpFaqScreen or SupportScreen (not duplicate Home nav).
  - Review hint card messaging: 'Your place is saved. A grown-up can help, or you can take a break.' — add clarity on what 'pause' means (session saved, can resume later).
  - Review i18n: all text should use i18n bundle.

### VoiceFailedScreen.tsx  · `child` · **P1**
- **Purpose:** Audio/voice processing failure state. Shows Robot (gentle emotion), title 'Robot voice paused', SpeechBubble, and CTAs ('Resume lesson' or 'Back home', checkpoint-dependent).
- **Now:** ScreenShell with bg #FFF1DA (light yellow/cream). Robot character (gentle emotion, 220px, accent #FFC857). Title text (fontSize 22, fontWeight 800, color #2B2140, textAlign center). SpeechBubble (checkpoint-conditional message). Two CTAs: PrimaryCTA 'Resume lesson' (color #FF6F61, conditional on checkpoint), text link 'Back home'. Absolute positioning (content paddingTop 100, paddingBottom 220, cta absolute bottom 48).
- **Issues:**
  - `P1` HARDCODED COLORS: Robot accent=#FFC857 (yellow), PrimaryCTA color=#FF6F61 (salmon). Should source from design tokens (child-lane accent palette). DESIGN.md §4 mandates token-based visual values.
  - `P1` TITLE COLOR HARDCODED: fontSize 22, color #2B2140 (dark charcoal). Should use design token (--child-ink-0 or equivalent from theme.ts). Hardcoded hex violates token-first design.
  - `P1` SECONDARY CTA NO AFFORDANCE: 'Back home' text link has no visible press feedback (no activeOpacity, no color shift). Should add opacity change and semantic color shift per GOOD-DESIGN-PRINCIPLES §7.
  - `P2` CONDITIONAL CTA LOGIC: Resume button only appears if checkpoint exists. Good for conditional rendering, but no empty-state guidance if checkpoint is missing. User sees only 'Back home' with no explanation of why resume is unavailable.
  - `P2` TITLE VS SPEECHBUBBLE: Both communicate the same error (voice paused). Redundant messaging. Consider removing title or using title as headline and SpeechBubble as conversational sub-message.
- **Redesign:**
  - Replace hardcoded #FFC857, #FF6F61, #2B2140 with design tokens from child-lane palette (--child-accent-yellow, --child-accent-warm, --child-ink-0).
  - Add activeOpacity={0.7} to 'Back home' text link. Consider subtle color shift on press.
  - If checkpoint is missing, show secondary message: 'Your progress is safe. Start a new lesson or go home.' + primary button to HomeHubScreen. Current logic leaves user without clear next action.
  - Consolidate title + SpeechBubble messaging. Example: remove standalone title, use SpeechBubble with context ('Robot voice paused. Your progress is safe.').
  - Verify Robot gentle emotion uses token-based colors dynamically.
  - Review i18n: title and SpeechBubble text should use i18n bundle (t() function).

---

## misc (foundational screens: dashboard, learning, robot-lesson)

_Mixed lane coverage: ParentDashboardScreen and LessonPlannerScreen are parent lane (Wispr Flow); ChildPracticeScreen is child lane (Garden Blue); RobotLessonControlScreen is operational lane. Current implementation uses legacy dark-mode theme tokens instead of lane-specific palettes — Wispr Flow parent tokens (--parent-bg-*, --parent-ink-*) and Garden Blue child tokens are not wired into these screens. This creates a P0 compliance gap: screens do not visually separate parent from child lane via palette authority._


### ParentDashboardScreen.tsx  · `parent` · **P0**
- **Purpose:** Parent-facing summary dashboard showing child progress and entry points to lesson planning and demo. Displays loading state, error handling, and two CTAs (View today's lesson, Open lesson demo).
- **Now:** Basic card layout with eyebrow ('Progress'), title (child's name + 'learning'), subtitle explaining function. LoadingSpinner and ErrorMessage states. Single Card component with cardTitle, cardBody text, and two buttons (primary: 'View today's lesson' in full width, secondary: 'Open lesson demo'). Uses theme.colors.background (dark), theme.typography styles, and theme.spacing for layout. No visible Wispr Flow palette tokens (--parent-bg-0, --parent-ink-0, --parent-accent). Typography hierarchy present but minimal visual differentiation from dark mode default.
- **Issues:**
  - `P0` Does not implement Wispr Flow parent palette — uses legacy dark-mode theme tokens (background, primary, textPrimary) instead of --parent-bg-0 (warm off-white), --parent-ink-0 (charcoal), --parent-accent (purple). Violates §12 Two-Lane Visual Separation (parent ≠ child) and DESIGN.md §8.2 parent token table. Screen should render warm off-white background, charcoal headings, pastel card fills, and purple accents for parent surfaces.
  - `P0` Violates §1 One Primary Action Per Screen — two buttons rendered with unclear visual hierarchy. 'View today's lesson' is labeled primary but no clear size/saturation differentiation from secondary button. Parent principle requires one dominant CTA at 48px full-width, secondary 30-40% less prominent. Current implementation shows both at similar visual weight.
  - `P1` Missing information hierarchy per §6 — no top status bar showing key metrics (streak, XP, connection, time). Parent dashboard should show 4-6 metric chips at top before hero content. Current structure jumps directly to eyebrow + title + subtitle without status signals.
  - `P1` Card layout lacks hero content structure — §6 requires hero card (60-70% of fold) + supporting details + primary action. Current Card feels like a thin single-purpose container without visual emphasis or hero card treatment. Title should feel larger/more dominant.
  - `P1` Accessibility: no aria-labels on buttons. WCAG AA requirement (§8) mandates all buttons have accessible names. Buttons use only label text; navigation intent unclear to screen readers.
- **Redesign:**
  - Implement Wispr Flow palette: set backgroundColor to --parent-bg-0 (#F5F5F0 warm off-white), change card fill to --parent-bg-1 or --parent-accent-soft (pastel blush), update text colors to --parent-ink-0 and --parent-ink-1.
  - Strengthen primary CTA: 'View today's lesson' should be 48px full-width charcoal pill button with --parent-ink-0 text. Make secondary button 40% less prominent (secondary variant, medium gray pill).
  - Add top status bar: before eyebrow, render 5 metric chips (e.g., streak flame + count, XP total, connection status, time, optional avatar) using 32-40px badge sizes in layout row with 16px gaps.
  - Restructure card hierarchy: Title should scale to h1 (28-32px serif) with optional purple emphasis word. Card should use large-radius (24-28px) pastel fill, not default surface color. Apply hero card treatment (60-70% visual dominance) to lesson-entry card.
  - Add aria-labels: Button onPress handlers should include accessible names ('View today's lesson for Emma' instead of bare 'View today's lesson').

### ChildPracticeScreen.tsx  · `child` · **P0**
- **Purpose:** Child-facing step-by-step practice walkthrough for lesson execution. Displays practice step counter ('Step X of 3'), step label (Listen/Try/Finish), and dynamic prompt text. Primary action advances to next step or finishes practice.
- **Now:** Three-step practice stepper with title ('Practice Time'), subtitle ('One small step at a time.'), and loading/error Card states. Step counter renders as 'Step N of 3' caption text. activeStep.label shows step name (Listen/Try/Finish), activeStep.prompt shows instruction text. Card wraps all content in single container. Two buttons: primary 'Next step' (or 'Finish practice' on last step), secondary 'Back to lesson'. Uses theme.colors.background (dark), theme.typography for text, theme.spacing for gaps. No clear child-lane (Garden Blue) palette implementation — colors are dark-mode defaults, not playful/colorful palette.
- **Issues:**
  - `P0` Does not implement Garden Blue child palette — uses legacy dark-mode theme tokens (background, textPrimary) instead of child-specific colors (playful primary, warm orange/yellow accent, sky-blue accents). Violates §12 Two-Lane Visual Separation and DESIGN.md §7 learning surfaces rule (child learning surfaces are 'focused and low-density' with 'playful' character). Screen should use bright, warm Garden Blue palette, not dark operational tone.
  - `P0` Violates §5 Progressive Disclosure — step content is bare text without visual playfulness or character. Child lane principle requires 'character-rich, animated, storybook' aesthetic. Current implementation shows plain typography on dark background with no illustration, mascot, icon visual feedback, or micro-animation for step transitions.
  - `P1` Missing visual progress feedback — step counter is caption text ('Step 1 of 3'), not a visual progress ring or animated bar. §6 and exemplars (Duolingo) show animated progress ring fill on completion. Current counter is low-salience text; children may not perceive progress.
  - `P1` Button hierarchy unclear — primary action ('Next step') not visually distinguished from secondary ('Back to lesson'). Child principle §1 requires warm-colored (yellow/orange from Garden Blue) button for primary CTA. Secondary should be 30-40% less prominent (ghost or minimal style).
  - `P1` No celebration/reward micro-interaction — on final step, UI should trigger badge reveal, confetti sparkle (respecting reduced-motion), or success animation. Current implementation shows 'Finish practice' button as plain text action with no reward visuals.
- **Redesign:**
  - Implement Garden Blue palette: set backgroundColor to child lane primary color (playful, warm tone from theme), update text to child lane colors. Use warm orange/yellow accent for primary button, sky-blue for secondary accents. Introduce storybook visual treatment.
  - Add mascot/illustration: position a Teebot character (30-40% of screen) expressing emotion based on step (curious/listening on step 1, thinking on step 2, happy on step 3). Animate entrance with fade or scale-in.
  - Replace text counter with visual progress indicator: render animated progress ring (3-circle stepper: unfilled → filled → checked) showing current step visually. Ring animates 200-400ms when step advances.
  - Style primary CTA as large warm-colored pill button (48px+, full-width or prominent size) with yellow/orange from Garden Blue. Secondary button should be ghost or minimal (30% text opacity, no fill).
  - Add step-transition micro-interaction: on 'Next step' press, fade out current prompt, animate in next prompt with 200ms ease-out transition. On final step, trigger brief confetti sparkle or badge-fill animation (respecting prefers-reduced-motion).
  - Use short, warm child-friendly copy: 'Good listening!' or 'Keep going!' as encouragement text instead of plain 'Step N of 3'.

### LessonPlannerScreen.tsx  · `parent` · **P0**
- **Purpose:** Parent-visible lesson planning view showing structured lesson breakdown. Displays lesson objective, meta info (difficulty, focus words count, reward stars), focus items as word pills, lesson steps as numbered rows (Warm up, Review, Practice, Reward), and Vietnamese support guidance. Primary action starts child practice.
- **Now:** Complex parent dashboard with eyebrow (child's name + 'plan'), title ('Today's Lesson'), subtitle, and conditional loading/error/session Card states. On success, renders: summary card with objective + 'Safe' badge + meta row (3 boxes: difficulty, focus words, reward); focus items card with word pills in flexWrap; lesson steps card with 4 numbered step rows (step number circle + label + detail); Vietnamese support info card. Primary button 'Start child practice' at bottom. Uses theme.colors.background (dark), theme.colors.primary (blue), theme.colors.success (green), theme.typography, theme.spacing. No Wispr Flow palette tokens — colors are dark-mode defaults, not warm off-white + charcoal + purple.
- **Issues:**
  - `P0` Does not implement Wispr Flow parent palette — uses legacy dark-mode theme tokens (background, primary blue, success green) instead of --parent-bg-0 (warm off-white), --parent-ink-0 (charcoal), --parent-accent (purple), --parent-success (green). Violates §12 Two-Lane Visual Separation and DESIGN.md §8.2. Parent surfaces require calm operational aesthetic (warm off-white bg, pastel card fills, charcoal buttons, serif headings). Current dark-mode appearance is operationally dense, not calm/spacious.
  - `P0` Violates §1 One Primary Action Per Screen — four prominent cards + multiple interactive elements (word pills, step rows) compete for attention. 'Safe' badge, meta boxes, word pills, and step rows all rendered with similar visual weight. Parent principle requires single dominant 'Start child practice' CTA (48px full-width charcoal pill) with supporting details de-emphasized. Current multi-card layout feels overwhelming for brief check-in workflow.
  - `P1` Meta boxes use theme.colors.primaryLight background — not a Wispr Flow token. Meta visualization should use pastel card fills (--parent-bg-2 or soft accent color). Current blue fill is child-lane color palette, not parent operational aesthetic.
  - `P1` Word pills styled with primary color + primaryLight bg — playful child-lane colors, not parent-lane palette. Pills should use --parent-accent (purple) and --parent-accent-soft (purple fill) or neutral pill style per parent design system.
  - `P1` Step number circles use theme.colors.primary (blue) — child-lane color. Parent principle requires step visualization with charcoal or accent color (--parent-ink-0 or --parent-accent). Visual inconsistency signals mixed design intent.
  - `P1` Accessibility: step rows have no clear tap targets or aria-labels. §8 requires 44-48px touch targets; step rows may be too vertically compact. Step detail text is small caption; contrast may not meet 4.5:1 WCAG AA minimum.
  - `P1` Information hierarchy violated — summary card headline scales to h3, not h1 or h2. §6 requires hero content (objective) to dominate at 60-70% visual weight. Current objective text is small relative to supporting details, reducing scanability.
- **Redesign:**
  - Implement Wispr Flow palette: set backgroundColor to --parent-bg-0 (#F5F5F0), card fills to --parent-bg-1 or --parent-accent-soft (pastel), text colors to --parent-ink-0/--parent-ink-1, buttons to charcoal --parent-ink-0. Replace all child-lane primary/primaryLight colors.
  - Simplify card layout per §1: collapse supporting details (meta, focus words, Vietnamese note) into expandable sections or remove from primary view. Hero card (objective + badge) should dominate initial fold. Primary button 'Start child practice' as 48px full-width charcoal pill at bottom, always visible.
  - Upgrade meta boxes: use pastel fills (--parent-bg-2 or cool gray), increase padding to 44px+ touch targets, pair each metric with clear label. Render as row of 3 equal-width boxes, not tight flex boxes.
  - Restyle word pills: use purple accent (--parent-accent) and soft purple fill (--parent-accent-soft), increase padding for legibility. Or render as simple text list if space is tight (respect parent density preference).
  - Fix step visualization: use charcoal circle (--parent-ink-0) for step number, not primary blue. Increase row height to ensure 44px+ tap target for accessibility. Add aria-label to each step row describing its action.
  - Restore information hierarchy: objective text should scale to h1/h2 (28-32px serif) with optional purple emphasis word. Summary card should feel like hero card (60-70% of fold visual dominance) before scrolling to supporting details.
  - Add refresh affordance: pull-to-refresh already implemented; ensure RefreshControl uses --parent-accent (purple) tint color, not dark-mode primary.

### RobotLessonControlScreen.tsx  · `operational` · **P0**
- **Purpose:** Operational control screen for sending English lessons to physical robot via Gemini Live. Displays lesson selection info (session index, lesson ID, device ID) in inactive state; on active state, shows session details (sessionId, lessonId, deviceId, startedAt timestamp) with Stop button. 'How it works' info card explains 5-step workflow. Primary actions: Start Lesson on Robot (inactive) or Stop Lesson (active).
- **Now:** Single-card operational interface with eyebrow ('Robot Lesson'), title ('Voice Lesson on TBOT'), subtitle explaining function. Conditional rendering: inactive state shows lesson selection info (3 text details) + 'Start Lesson on Robot' button; active state shows status dot + 'Lesson Active' label + session details (4 key-value rows) + 'Stop Lesson' button (red). Separate infoCard below with title 'How it works' + 5 numbered steps (text-only). Uses colors.background (dark), colors.primary (blue), colors.error (red), colors.success (green), typography and spacing from theme. No clear operational palette or safety-zone awareness for robot control context.
- **Issues:**
  - `P0` Violates §11 Device State & Pairing Is Transparent and Reversible — status shown via colored dot (green #3ddc84) with text label 'Lesson Active', but lacks animation, timestamp clarity, or actionable next steps. When lesson is inactive, no status indicator shown. Robot control requires continuous visibility of device health (connected/offline/error) even when no lesson is active. Current design omits device-pairing/connection status entirely.
  - `P1` Violates §9 Lesson Controls Stay Near Content & Respect Safe Zones — no mention of landscape-mode behavior or safe-zone awareness. Robot lesson control may be used while monitoring robot activity; landscape orientation should prioritize video/scene view if device has camera. Current implementation has no landscape-mode rules or safe-zone handling for notch/system gestures.
  - `P1` Error state visibility is weak — error text rendered at bottom as plain red text, easy to miss. §2 State Is Visible Before Decoration requires error states paired with icon + text label, not color alone. Error should appear in prominent banner or modal, not as trailing text.
  - `P1` Button hierarchy unclear on inactive state — 'Start Lesson on Robot' primary button shown, but lesson selection details ('Session Index: 1', 'Lesson ID: ...') are rendered as plain text details. No visual distinction between what is editable/selectable and what is display-only. Parent would benefit from clear affordance (e.g., tap to change lesson, not just showing current value).
  - `P1` Missing confirmation before destructive action — 'Stop Lesson' button has no confirm dialog. §11 principle requires confirm before destructive actions ('reset', 'unpair', 'factory reset'). Stopping a lesson is not as critical, but a 1-2 second loading state + success feedback would improve confidence.
  - `P1` Accessibility: status row flex layout may not maintain 44px touch target height. Status dot (10px) is too small; should be at least 20-24px for visibility. aria-label missing on status indicator and stop button.
  - `P2` Typography inconsistency — cardLabel uses uppercase (text-transform: 'uppercase'), creating visual noise. Operational screens should use clear sentence-case labels, not UPPERCASE captions. UPPERCASE works for small badges, not full-width labels.
- **Redesign:**
  - Add persistent device state indicator: render connection status (Connected / Offline / Pairing / Error) with icon + text + timestamp at top of screen, even when no lesson is active. Use semantic colors (green for connected, cyan for pairing, yellow for warning, red for error). Update every 5-10 seconds if polling device status.
  - Improve error handling: replace bottom error text with prominent banner (top or center) using error envelope structure (code + title + message + remediation). Example: 'Failed to start lesson' with 'Move robot closer to WiFi' as actionable next step.
  - Add landscape-mode rules: comment or document expected behavior when device enters landscape (if robot has camera feed). Example: 'Video fills screen; controls float as bottom overlay <36% height.' Current implementation has no landscape guidance.
  - Clarify inactive state affordances: if lesson selection is editable, render lesson/device selector as tappable pills or dropdown, not plain text. If read-only, label clearly ('Current Lesson: w01-d01-hello-greetings' with lock icon if immutable).
  - Add confirmation on Stop: render brief 1-2 second loading indicator with text ('Stopping...' → 'Stopped') before clearing activeSession. Or show confirmation modal ('Stop lesson? This will end the robot session.').
  - Fix status indicator sizing: status dot should be 20-24px (not 10px), easily tappable. Pair with aria-label ('Device connected at 14:32' or similar).
  - Remove UPPERCASE from cardLabel: use sentence-case ('Lesson Selection', 'Session Details') instead of all-caps. Reserve UPPERCASE for small badges/tags only.
  - Add success feedback: when lesson starts, show brief toast or inline success state ('Lesson started on TBOT' with checkmark icon) before rendering active-state card.
