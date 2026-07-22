# Course Robot Connect Modal Design

## Goal

Replace the native Android alert shown from Course Detail when Robot is unavailable with a polished TBOT modal that explains the problem and lets the parent start Robot setup immediately.

## Chosen Approach

Render a screen-local React Native `Modal` from `CourseDetailScreen`. This keeps the unavailable-Robot decision and its recovery action next to the CTA that triggered it, avoids adding a navigation-only dialog route, and preserves the current fail-closed status check.

The alternatives considered were keeping the native alert with two actions, which cannot match TBOT's visual language, and creating a dedicated full-screen error route, which adds unnecessary navigation history for a lightweight decision.

## Visual Design

- Dim the Course Detail screen with a warm translucent scrim.
- Present a rounded white card with a subtle border and elevated shadow.
- Use the existing `RobotDevice` illustration with the `offline` LCD expression inside a warm coral-tinted hero area.
- Title: `Robot chưa sẵn sàng`.
- Body: `Kết nối Robot để gửi bài học và bắt đầu chơi cùng bé.`
- Add a small reassurance line: `Chỉ mất khoảng 3 phút.`
- Primary full-width CTA: `Kết nối Robot`.
- Secondary full-width CTA: `Để sau`.

The modal must fit on a small Android screen without scrolling and respect safe visual spacing.

## Interaction

1. Parent presses **Thêm vào Robot**.
2. The app reads `getDeviceStatus('primary', activeChildId)`.
3. Missing child, missing device id, offline/unknown status, or request failure opens the custom modal and does not navigate to unlock.
4. **Kết nối Robot** closes the modal and navigates to `ROUTES.DeviceOverviewScreen`, the public entry to Robot setup. From there, the parent can continue to new-pairing or offline-reconnect setup.
5. **Để sau**, Android back, or tapping the scrim closes the modal and leaves the parent on Course Detail.
6. An online Robot continues directly to `UnlockConfirmScreen` without showing the modal.

## Accessibility

- Use `Modal` with `transparent`, `statusBarTranslucent`, and `accessibilityViewIsModal`.
- Give the card `accessibilityRole="alert"` and an accessible label matching the title.
- Both actions use existing accessible `DeviceBigBtn` controls.
- Android hardware back invokes the same dismiss behavior as **Để sau**.

## Testing

- Offline and failed status checks render the custom modal and do not navigate to unlock.
- **Kết nối Robot** navigates exactly to `DeviceOverviewScreen`, which exposes the setup action leading into pairing.
- **Để sau** dismisses the modal and keeps Course Detail visible.
- Online status continues to `UnlockConfirmScreen` with the original course id.
- Typecheck, lint, focused course-library tests, Android build, install, and physical-device verification remain required.

## Scope

No backend, BLE protocol, device-status contract, or route definition changes are required. The existing user-owned production environment configuration remains untouched.
