/**
 * TeeBot mascot — the single swappable source of the robot picture.
 *
 * The app shows the robot in two sizes:
 *   • head  → small spots (nav/profile avatars, chat bubbles, speaker chips)
 *   • body  → hero / character spots (home hero, onboarding, lesson companion,
 *             garden, celebration, pairing success, My Robot)
 *
 * To restyle the robot EVERYWHERE, replace these two files in place
 * (keep the same names) — nothing else needs to change:
 *   src/assets/mascot/tee-head.png
 *   src/assets/mascot/tee-body.png
 *
 * Wiring targets (done during the "populate everywhere" step, after preview approval):
 *   - RobotIcon.tsx           → mascot.head   (currently referenceImages.robotHead)
 *   - OnboardingClayRobot.tsx → mascot.body   (hero character in onboarding/auth)
 *   - ClayRobotScreen / RobotBody (lessonDemo) → mascot.body
 *   - 🤖 emoji placeholders (~17 screens)      → <RobotImage variant="head|body" />
 */
export const teeBody = require('./tee-body.png'); // ① full body — hero / character
export const teeHead = require('./tee-head.png'); // ② head — chat, speaker, large avatars
export const teeIcon = require('./tee-icon.png'); // ③ icon — small circular avatars / badge

export const mascot = { body: teeBody, head: teeHead, icon: teeIcon } as const;

export default mascot;
