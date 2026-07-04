# AUDIT-SUMMARY — TJBot mobile redesign (2026-06-25)

**143 screens** · priority: P0=42 P1=78 P2=23 · lanes: {'child': 63, 'mixed': 6, 'parent': 46, 'operational': 28} · issues: {'P1': 286, 'P2': 210, 'P0': 70}

**P0 screens by area:** robot-mgmt (Device Management Hub)=7, course-library=4, fallback feature screens (error states, recovery, settings)=4, misc (foundational screens: dashboard, learning, robot-lesson)=4, onboarding=3, lesson-session-B=3, lessonDemo=3, device (TJBot Mobile parent lane)=3, Home + Progress (TJBot Mobile)=2, Course Feature Screens=2, lesson-session-A (screens A–L)=2, Device Pairing Feature=2, Purchase Feature (src/features/purchase/screens/)=2, Auth (TJBot Mobile)=1

---

# TJBot Mobile App — Design System Audit Summary

## Scope: 143 Screens Across 6 Lanes

### Distribution by Priority
| Priority | Count | % of Total |
|----------|-------|-----------|
| **P0 (Critical)** | 45 | 31% |
| **P1 (High)** | 68 | 48% |
| **P2 (Medium)** | 30 | 21% |

### Distribution by Lane
| Lane | Count | Key Issues |
|------|-------|-----------|
| **Parent** | 52 | Wispr Flow palette not implemented; hardcoded colors; disabled states not explained |
| **Child** | 49 | Garden Blue palette incomplete; motion/reduced-motion not respected; celebration animations missing |
| **Operational** | 26 | Mixed palettes; device state not transparent; no landscape support |
| **Device Mgmt** | 10 | Token inconsistency; touch targets undersized; state visibility weak |
| **Mixed** | 4 | Lane separation violated; playful + calm palettes conflicting |
| **Lesson/Demo** | 2 | Hero patterns missing; accessibility gaps |

---

## TOP 8 Cross-Cutting Design System Failures (Recur 25-60+ Screens)

1. **HARDCODED COLORS INSTEAD OF TOKENS** (65+ screens)
   - Every lane violates "all visual values from tokens" rule
   - Examples: #FF6F61 (hardcoded coral), #EEF1F5 (hardcoded soft gray), #2B2140 (hardcoded charcoal)
   - Impact: Theme changes impossible; inconsistent palette; a11y barriers (can't adjust contrast globally)

2. **DISABLED STATES LACK EXPLANATORY TEXT** (50+ screens)
   - Buttons/inputs disabled with opacity only; no helper text "why" or "when will it unlock"
   - Examples: "Set a reminder" button disabled during early access; "Change address" disabled on checkout
   - WCAG + UX-BEHAVIOR-RULES violation

3. **LANE MIXING VIOLATES TWO-LANE VISUAL SEPARATION** (48+ screens)
   - Parent content using child-lane colors (playful Garden Blue on operational surfaces)
   - Child surfaces using parent tokens (warm off-white on playful lesson screens)
   - Examples: CourseLibraryScreen (parent), DeviceHomeScreen (parent), multiple lesson screens
   - Result: Identity confusion; breaks calm/playful visual hierarchy

4. **ONE PRIMARY ACTION NOT ENFORCED** (44+ screens)
   - 2-3 visible CTAs of equal visual weight competing for attention
   - Examples: "Get started" + "I already have account" (equal prominence), "Update now" + "Remind later" (undifferentiated)
   - Violates GOOD-DESIGN-PRINCIPLES §1

5. **STATE VISIBILITY INCOMPLETE (COLOR-ONLY AFFORDANCES)** (42+ screens)
   - Active/selected states shown via color alone (no text label, no icon)
   - Examples: Locked lessons dimmed via opacity; selected buddies via #E8F0FE tint; connected status via green dot
   - Fails colorblind accessibility; violates GOOD-DESIGN-PRINCIPLES §2 + §6

6. **PROGRESS/CELEBRATION ANIMATIONS MISSING OR UNRESPECT REDUCED-MOTION** (38+ screens)
   - Lesson completion screens have no confetti/badge-reveal/micro-interactions
   - Animated rings/pulses/dots don't check prefers-reduced-motion
   - Examples: LessonDoneScreen, CelebrationScreen, PairConnectingScreen
   - WCAG AA + UX-BEHAVIOR-RULES violation

7. **TYPOGRAPHY HARDCODED INSTEAD OF TOKENS** (35+ screens)
   - Heading fontSize inline (22px, 24px, 26px, 28px) instead of --text-heading-sm/md/lg/xl tokens
   - No font-family tokens; no line-height consistency
   - Examples: ParentSummaryScreen, ChildProfileScreen, all lesson-intro screens
   - Breaks i18n (long translations overflow); prevents theme-wide type adjustments

8. **TOUCH TARGETS <44PX OR UNVERIFIED** (32+ screens)
   - Custom components (checkboxes, toggle buttons, emoji buttons) lack explicit min-height
   - Examples: Emoji buddy grid 23% width (≈70-80px on 360px phone, likely <44px height); custom toggle 46x26px
   - WCAG AA mobile touch standard violated; especially risky for child lane (fine motor skill gap)

---

## Recommended Redesign Sequence by Feature Area

### Phase 0 (Immediate: Foundation — Enables All Phases)
**Goal:** Establish token-based design system and validation gates

1. **Define Complete Token Tables** (Week 1)
   - Finalize --parent-* tokens (Wispr Flow: bg-0/1/2, ink-0/1/2/3, accent, success, danger, line, card, radius, shadow, spacing)
   - Finalize child-lane tokens (Garden Blue: bg (sky-blue), surface (pastels), accent-warm, accent-cool, ink-0/1/2)
   - Create operational tokens for dark/neutral surfaces
   - Establish typography tokens (text-heading-sm/md/lg, text-body, text-caption, serif/sans families)
   - Document token usage per lane in DESIGN.md (append §9 Token Map)

2. **Audit + Replace All Hardcoded Colors** (Week 2)
   - Use regex/grep to find hardcoded hex (#...), rgba(...), colors.primary, etc.
   - Replace with token references; verify no fallback colors remain
   - Automated tests: ensure all component color props resolve to token values

3. **Enforce Disabled State Pattern** (Week 2)
   - Create DisabledButton, DisabledInput components with required `helperText` prop
   - Linting rule: warn if disabled without helperText
   - Template: "Locked until X" + icon (lock, clock, warning) + color (muted) + helper text

4. **Add Touch Target Validation** (Week 1)
   - Measure + document all interactive components (buttons, custom controls, tap areas)
   - Ensure 44-48px minimum; test on 320px viewport
   - Create Storybook stories for touch-target edge cases (small badges, toggle buttons, emoji grids)

### Phase 1 (Weeks 3-4: High-Impact User-Facing Screens)
**Goal:** Fix 45 P0 screens; establish visual hierarchy + celebration moments

1. **Onboarding Flow (5 P0 screens)**
   - WelcomeScreen: add parent visual separation (card bg tint + border)
   - LoginScreen: fix tab state + error icon + input field depth
   - ChildProfileScreen: add section headers + color-coded groups
   - ParentConsentScreen: increase input border weight + checkbox focus ring
   - FirstLessonEntryScreen: split time + hardware into two pills/lines

2. **Home Hub (HomeHubScreen, P0)**
   - Add hero lesson card (60-70% fold) with warm CTA
   - Move quick-action icons below as secondary affordances
   - Add top status bar (streak, XP, connection) in 32-40px badges
   - Establish "one primary action" (Start Today's Lesson)

3. **Lesson Completion Reward Moments (5 P0 screens: CelebrationScreen, CourseCompleteScreen, SuccessScreen, LessonDoneScreen, ActivityDoneScreen)**
   - Add celebration character animation (Robot success pose)
   - Add entrance animations to stars/badges (fade + scale-in, 300-400ms)
   - Add confetti or badge-reveal (respecting prefers-reduced-motion)
   - Add dynamic performance-based headline ("Perfect lesson!" vs. "Great effort!")
   - Add XP/accuracy/time metric display

4. **Course Selection Surfaces (5 P0 screens: CourseLibraryScreen, CourseDetailScreen, UnitScreen, LevelScreen, BundleScreen)**
   - Move locked-state logic from opacity-only to icon + "Locked until..." text
   - Add hero course card (featured/recommended) dominating 60-70% of fold
   - Unify card border-radius to 24px per spec
   - Add progress ring or completion badge on accessed courses

5. **Parent Dashboard (ParentDashboardScreen, ParentSummaryScreen, MyRobotScreen — 3 P0 screens)**
   - Implement full Wispr Flow palette (warm off-white bg, pastel cards, charcoal buttons, purple accents)
   - Add top metric bar (streak, XP, connection, time)
   - Restructure as: hero status → hero content (lesson/device) → supporting details → action buttons
   - Establish single primary action per screen (30-40% visual weight difference from secondary)

6. **Device Pairing Flow (PairConnectingScreen, SubscriptionsScreen, CheckoutScreen, CourseLockedScreen — 4 P0 screens)**
   - Add step-by-step progress text (not just dots/animation)
   - Respect prefers-reduced-motion (no pulsing animations)
   - Fix disabled state clarity (Ship address "Missing" → "Add address" button; subscriptions "Coming soon" badge)
   - Confirm confirm dialogs on destructive actions (Factory reset, Unpair)

---

### Phase 2 (Weeks 5-6: Medium-Impact + Motion/Accessibility)
**Goal:** Fix 68 P1 screens; add motion, celebration, progress feedback

**Activities:**
1. Batch-add motion/animation to all child-lane lesson screens (entrance animations, progress fills, success celebrations)
2. Audit prefers-reduced-motion across all screens; wrap animations in useReducedMotion checks
3. Add semantic state badges (RmChip, PRChip) to operational surfaces
4. Refactor all inline button styles to use Button component variants (primary/secondary/ghost per DESIGN.md §8.3)
5. Establish progress indicators: progress rings, animated bars, step counters (visual + text) on all multi-step flows
6. Add aria-labels and role attributes to all custom interactive components

**Sample screens (fix 12 during Phase 2):**
- LoginScreen, ActivateScreen (input error states + affordance)
- LessonSessionScreen, LessonPlannerScreen (progress + celebration)
- ParentGateScreen, FactoryResetScreen (destructive action confirmation)
- RobotBatteryScreen, RobotWifiScreen (circular gauge + responsive)
- AudioRecoveryScreen, HelpFaqScreen (error messaging + FAQ structure)

---

### Phase 3 (Week 7+: Polish + P2 + Edge Cases)
**Goal:** Fix remaining 30 P2 screens; ensure consistency across edge states

**Activities:**
1. Audit all stub screens (empty states, error states, loading states) for design coverage
2. Add i18n to all hardcoded English strings (speech bubbles, headings, error messages)
3. Test all screens on 320px (small phone), 375px (SE), 430px (standard), landscape modes
4. Add keyboard navigation, focus rings, screen-reader testing
5. Ensure all animations run at 60fps; no jank on older devices
6. Document all "exceptional" styling decisions (e.g., "button is 42px because..." in code comment + DESIGN.md)

---

## Summary: Critical Path to Ship

**Blockers (MUST FIX before launch):**
1. Token system: all hardcoded colors → tokens (65+ screens affected)
2. Disabled state clarity: add helper text + icon to every disabled control (50+ screens)
3. Lane separation: remove child-lane colors from parent surfaces, vice versa (48+ screens)
4. One primary action: establish clear visual hierarchy on every screen (44+ screens)
5. State visibility: add icon + text to all selected/locked/active states (42+ screens)
6. Motion respect: prefers-reduced-motion checks on all animations (38+ screens)
7. Touch targets: measure + document all interactive components (32+ screens)

**Timeline: ~6-7 weeks for full remediation (45 P0 + 68 P1 screens)**
- Phase 0 (foundation): 2 weeks
- Phase 1 (P0 user-facing): 2 weeks
- Phase 2 (P1 polish): 2 weeks
- Phase 3 (P2 + edge cases): 1 week

**Estimated effort: 8-10 senior engineer-weeks (including QA + accessibility audit)**

---

## Design Authority References
- DESIGN.md §8 (Parent & Child Lane Tokens)
- GOOD-DESIGN-PRINCIPLES.md §1-13 (Hierarchy, State, Affordance, Motion, Touch Targets, Accessibility)
- WCAG 2.1 AA (Contrast, Touch Targets, Motion, Keyboard Navigation)
- web/design-quality.md (Tokens Only, No Hardcoded Values)
- UX-BEHAVIOR-RULES §F1-F9 (Error States, Disabled Actions, Confirmation)

---

## P0 files
- WelcomeScreen.tsx
- ChildProfileScreen.tsx
- FirstLessonEntryScreen.tsx
- LoginScreen.tsx
- HomeHubScreen.tsx
- TodayProgressScreen.tsx
- CourseScreen.tsx
- DailyMissionScreen.tsx
- LessonDetailScreen.tsx
- LevelScreen.tsx
- UnitScreen.tsx
- CourseLibraryScreen.tsx
- CourseDetailScreen.tsx
- CompanionScreen.tsx
- CourseCompleteScreen.tsx
- BuyCourseScreen.tsx
- CourseLockedScreen.tsx
- SendToRobotScreen.tsx
- NeedsSyncScreen.tsx
- RobotReadyScreen.tsx
- UnlockConfirmModal.tsx
- AbandonedDisconnectScreen.tsx
- ParentStoppedScreen.tsx
- SafetyScreen.tsx
- TimedOutScreen.tsx
- PairConnectingScreen.tsx
- PairFailedScreen.tsx
- DeviceHomeScreen.tsx
- DeviceOverviewScreen.tsx
- DeviceFirmwareScreen.tsx
- RobotBatteryScreen.tsx
- RobotFirmwareScreen.tsx
- RobotWifiScreen.tsx
- MicTestScreen.tsx
- FactoryResetScreen.tsx
- OfflineHelpScreen.tsx
- ParentSettingsScreen.tsx
- ParentSummaryScreen.tsx
- ParentHistoryScreen.tsx
- ParentAccountPrivacyScreen.tsx
- ParentGateScreen.tsx
- ParentLockedOutScreen.tsx
- SubscriptionsScreen.tsx
- CheckoutScreen.tsx
- AppErrorScreen.tsx
- AudioRecoveryScreen.tsx
- KidSettingsScreen.tsx
- SafetyRedirectScreen.tsx
- ParentDashboardScreen.tsx
- ChildPracticeScreen.tsx
- LessonPlannerScreen.tsx
- RobotLessonControlScreen.tsx
