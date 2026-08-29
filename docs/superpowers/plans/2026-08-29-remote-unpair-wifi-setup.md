# Remote Unpair Wi-Fi Setup Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Huỷ ghép nối từ điện thoại làm Robot tự xoá quyền sở hữu và Wi-Fi, hiển thị "Đang khởi tạo...", rồi mở lại chế độ thiết lập mà không cần nhấn BOOT.

**Architecture:** `DELETE /devices/:deviceId` trở thành thao tác điều phối: xác thực chủ sở hữu, gọi endpoint nội bộ có xác thực trên ESP server đang sở hữu WebSocket của Robot, ESP server gửi payload cố định `{type:"system",command:"unpair"}` tới đúng kết nối đang online, rồi backend chờ firmware gọi endpoint factory-reset hiện có để chuyển database sang `UNPROVISIONED`. Firmware tái sử dụng `EnterRepairPairingMode()`; mobile chỉ xoá cache cục bộ sau khi request hoàn tất, nên không tạo trạng thái lệch khi Robot offline hoặc không phản hồi.

**Tech Stack:** NestJS/PostgreSQL/HTTP, Python aiohttp/WebSocket, React Native/React Query, ESP-IDF C++, Vitest/Jest/Pytest, Android ADB và ESP serial.

---

### Task 1: Backend remote-unpair coordinator

**Files:**
- Create: `tbot-backend/src/devices/remote-unpair.service.ts`
- Modify: `tbot-backend/src/devices/devices.controller.ts`
- Modify: `tbot-backend/src/devices/devices.module.ts`
- Test: `tbot-backend/tests/devices.remote-unpair.spec.ts`

- [x] Write failing tests proving owner validation, offline rejection, success only after `UNPROVISIONED`, and timeout without database deletion.
- [x] Run `npm test -- tests/devices.remote-unpair.spec.ts` and confirm RED because the coordinator does not exist.
- [x] Add authenticated ESP internal endpoint tests for exact command, offline rejection, and stale-connection rejection.
- [x] Implement the ESP endpoint using the existing backend UUID to live WebSocket resolution path.
- [x] Implement `RemoteUnpairService.request(deviceId, householdId, accountId)` with bounded polling and no credential logging.
- [x] Route owner `DELETE /devices/:deviceId` through the coordinator while preserving the public API path.
- [x] Run focused ESP and backend tests and confirm GREEN.

### Task 2: Firmware cloud command

**Files:**
- Modify: `robot/TBOT-Firmware/main/application.cc`
- Test: `robot/TBOT-Firmware/tests/test_tbot_remote_unpair_contract.py`

- [x] Write a failing contract test requiring system command `unpair`, lesson guard, and delegation to `EnterRepairPairingMode()`.
- [x] Run the focused Pytest and confirm RED because only `reboot` is handled.
- [x] Add the minimal `unpair` system-command branch and schedule the existing reset flow.
- [x] Verify the existing reset flow clears Wi-Fi, restarts, and boot renders `Lang::Strings::INITIALIZING` (`Đang khởi tạo...`).
- [x] Run firmware contract suites and build the LCDWiki target.

### Task 3: Mobile transactional UX

**Files:**
- Modify: `tbot-mobile/src/services/api/device.api.ts`
- Modify: `tbot-mobile/src/features/device/screens/DeviceHomeScreen.tsx`
- Modify: `tbot-mobile/src/features/robot-mgmt/screens/FactoryResetScreen.tsx`
- Test: `tbot-mobile/tests/api/device-api.test.ts`
- Test: `tbot-mobile/tests/features/device/device-home-screen.test.tsx`
- Test: `tbot-mobile/tests/features/robot-mgmt/factory-reset-screen.test.tsx`

- [ ] Write failing tests proving the local Robot remains visible while the remote operation is pending or fails.
- [ ] Add actionable Vietnamese/English pending and offline/timeout copy without instructing the user to press BOOT.
- [ ] Keep the existing DELETE contract and clear local pairing only after confirmed success.
- [ ] Run focused mobile tests, TypeScript, lint, and i18n checks.

### Task 4: Physical repeated E2E

**Files:**
- Create: `migrate-ui-ux-to-mobile-app-docs/qa/2026-08-29-remote-unpair-e2e.md`

- [ ] Deploy backend changes to the endpoint used by the phone.
- [ ] Flash firmware and install the Android build.
- [ ] For at least three cycles: pair Robot, confirm online, tap unpair once, observe "Đang khởi tạo...", confirm BLE/Wi-Fi setup becomes discoverable without BOOT, then pair again.
- [ ] Exercise offline Robot, backend timeout, repeated tap/idempotency, app background/foreground, and network loss during unpair.
- [ ] Capture sanitized timestamps/state transitions only; never record SSIDs, passwords, addresses, tokens, IDs, or serials.
