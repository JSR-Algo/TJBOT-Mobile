# Maestro — Nest + mobile spine

Requires:
- Nest on `http://localhost:3000/v1` (see `docs/runbooks/LOCAL_MOBILE_NEST.md`)
- App installed on simulator (`npm run ios`) with `appId: net.jasonle.tjbot`
- Maestro CLI `~/.maestro/bin/maestro` 2.4.0+

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
```

Robot/ESP screens are intentionally not covered in this spine.
