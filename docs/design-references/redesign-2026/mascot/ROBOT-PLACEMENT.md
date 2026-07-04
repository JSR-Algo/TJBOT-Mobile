# ROBOT PLACEMENT — where the TeeBot mascot appears (2026-06-25)

> One swappable pair drives all of it: `src/assets/mascot/tee-head.png` (small) +
> `tee-body.png` (hero). Swap the two PNGs → updates everywhere it's wired.
> Today the robot renders via 5 systems; this maps each to **head** or **body**.

## Rendering systems → swap target

| System | File | Today | New target |
|---|---|---|---|
| Image avatar (single source) | `components/RobotIcon.tsx` | `referenceImages.robotHead` (robot-head.png) | **mascot.head** |
| Onboarding hero character | `features/onboarding/components/OnboardingClayRobot.tsx` (wraps RobotIcon) | head img, shown large | **mascot.body** |
| Drawn live face | `components/robot/RobotFace.tsx` | View-drawn animated face (state colors, audio bars) | keep drawn for live states; **head** still for static |
| Drawn body | `components/robot/RobotBody.tsx` + `ClayRobotScreen.tsx` | View-drawn clay body | **mascot.body** |
| Emotion set | `assets/robot-faces/png/*` (20) | small emotion PNGs | separate set (future: head expressions) |
| Placeholder | `🤖` emoji (~17 screens) | emoji | `<RobotImage variant=…>` |

## BODY (full-body hero / character) — ~26 screens

| Area | Screens |
|---|---|
| Onboarding/Auth | WelcomeScreen ×2 (190+ring), FirstLessonEntry (190+ring), IntroCelebrate ×2 (160+ring), IntroListen ×2 (150), IntroSpeak ×2 (140), IntroRetry ×2 (140), ChildProfile ×2 |
| Home / Garden | HomeHubScreen (hero), Personality Garden companion |
| Lesson demo | RobotCompanionScreen, RobotFullscreenLessonScreen, FullscreenLessonScene, LessonScene |
| Lesson session | ActivityIntroScreen, ActivityDoneScreen, SuccessScreen, GentleScreen, OfftopicScreen |
| Progress | CelebrationScreen, LessonSummaryScreen, WordsPracticedScreen |
| Pairing | PairSuccessScreen, PairConnectingScreen, PairRenameScreen |
| Robot mgmt | MyRobotScreen, RobotStatusScreen |
| Purchase | OrderConfirmScreen, IncludedScreen, ArrivedScreen |

## HEAD (small avatar / chat / speaker) — ~12 spots

| Context | Screens |
|---|---|
| Header / profile avatar | HomeHub header, Parent Today/Account, profile rows |
| Chat bubbles | tee-chat / RobotCompanion message rows |
| Speaker chip in lesson | lesson-session step cards ("Watch Tee") |
| Live face (drawn, head-shaped) | RobotListeningScreen, RobotSpeakingScreen, ThinkingScreen, RetryScreen, ConnectingScreen, ReconnectingScreen |

## Emotion faces (separate set — not the head/body swap) — ~18 screens
course (Level/Unit/LessonDetail/DailyMission/ReviewEntry), robot-mgmt (RobotStatus/MicTest/SpeakerTest/RobotStorage/RobotFirmware/FactoryReset/MyRobot), fallback (AppError/MicMissing/VoiceFailed/LessonResume/KidSettings/Reconnecting), progress (ReviewNeeded), home hook.
