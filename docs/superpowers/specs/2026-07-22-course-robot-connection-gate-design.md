# Course Robot Connection Gate Design

Date: 2026-07-22
Task: `adhoc-2026-07-22-course-robot-connection-gate`
Owner: TJBot-mobile / sys-16

## Goal

Prevent a parent from leaving Course Detail through **Add to Robot** when the
active child's robot is not currently connected. The app must explain that the
robot needs to be connected and keep the parent on the same course page.

## Selected Approach

Check the authoritative household-device status when the parent presses **Add
to Robot**. Resolve the robot for the active child through the existing
`getDeviceStatus('primary', childId)` API helper.

- When a device ID exists and `online === true`, navigate to the existing unlock
  confirmation flow with the selected `courseId`.
- When no matching device exists, the device is offline, connectivity is
  unavailable, or the status request fails, show a native alert and do not
  navigate.
- While the request is running, ignore repeated presses so one tap cannot create
  duplicate status requests or navigation events.

This button-time check is preferred over a mount-time check because robot
connectivity can change while the parent reads the course page.

## User Experience

The blocking alert uses concise Vietnamese copy:

- Title: `Robot chưa sẵn sàng`
- Message: `Hãy kết nối Robot trước nhé. Sau đó bạn có thể thêm bài học ngay.`
- Action: `Đã hiểu`

Dismissal leaves the parent on Course Detail. There is no automatic navigation
to pairing or robot settings.

## Components And Data Flow

1. `CourseDetailScreen` reads the active child from the optional household
   context.
2. Pressing **Add to Robot** starts one status check.
3. `getDeviceStatus('primary', activeChildId)` resolves the child's household
   robot and normalizes its operational connectivity state.
4. The screen either presents the blocking alert or navigates to
   `UnlockConfirmScreen`.

No new API endpoint, route, global store, BLE operation, or state machine is
introduced.

## Error Handling

Fail closed. A missing child-to-device binding, absent device ID, explicit
offline state, unknown connectivity state, or request failure all produce the
same connection-required alert. This avoids implying that a lesson can be added
when the app cannot confirm robot availability.

## Testing

Use test-driven development:

1. RED: pressing **Add to Robot** with an offline robot shows the alert and does
   not navigate.
2. RED: a failed status request shows the alert and does not navigate.
3. RED: an online robot navigates once with the selected `courseId`.
4. GREEN: implement the smallest screen-level handler that satisfies the tests.
5. Run focused tests, the required repository validation gates, build Android,
   install on the connected physical device, and verify both the blocked and
   allowed paths where physical robot state permits.

## Documentation Impact

Update the course-library use case so UC-CL02 records the new online-robot gate
before transitioning to the add/unlock flow. No route or API mapping changes are
required.
