# Maestro — Nest + mobile spine

Requires:
- Hosted backend healthy at `https://report.tjbot.vn/v1/health`
- App installed on simulator (`npm run ios`) with `appId: net.jasonle.tjbot`
- Maestro CLI `~/.maestro/bin/maestro` 2.7.0+

```bash
# from TJBOT-Mobile
~/.maestro/bin/maestro test .maestro/nest-spine-auth.yaml
~/.maestro/bin/maestro test .maestro/nest-spine-signup-home.yaml

# Full Nest onboarding → HomeHub → phone lesson completion on one simulator.
# A unique email is required so backend onboarding state cannot leak across runs.
# This one-device flow also dismisses iOS 26 Password AutoFill sheets; keep the
# simulator model/viewport fixed when reviewing its coordinate fallback.
UDID="replace-with-single-booted-simulator-udid"
~/.maestro/bin/maestro --device "$UDID" test \
  -e MAESTRO_TEST_EMAIL="maestro.full.$(date +%s)@example.com" \
  .maestro/nest-spine-onboard-home-lesson.yaml

# Authenticated persistent-pill regression: Home → Devices → Library →
# Progress → Profile → Home, with the shell asserted after every page change.
~/.maestro/bin/maestro --device "$UDID" test \
  .maestro/persistent-tab-pill.yaml
```

Robot/ESP screens are intentionally not covered in this spine.

## Suite order + robot fixture laws (verified 2026-07-30)

1. Run `nest-spine-signup-home` FIRST (unique email per run; it mints the
   authenticated session). Run session flows (`persistent-tab-pill`,
   `next-five-mvp`, `pairing-setup-blueprint`) middle. Run keychain-clearing
   flows (`nest-spine-auth`) LAST.
2. After each signup, re-point the seeded robot at the NEW account's household
   AND restore its post-activation state:
   `update devices set current_household_id='<hh>', claimed_by='<account>',
   state='CLAIMED', status='active', lifecycle_state='assigned'
   where serial_number='TBT-2026-004217';`
3. Any flow that mounts PairFoundScreen (`tjbot://device/pair-found?...` deep
   link) fires the zero-code claim, which flips the device to
   `status='provisioning'`; the hub then shows "No Robot connected"
   (`online` maps from `status==='active'`). Re-run the seed SQL above before
   any later hub-dependent flow.
4. Hub content asserts must use `extendedWaitUntil` (cold-cache fetch), never
   bare `assertVisible`.
