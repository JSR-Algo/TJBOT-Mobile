# Maestro — Nest + mobile spine

Requires:
- Nest on `http://localhost:3000/v1` (see `docs/runbooks/LOCAL_MOBILE_NEST.md`)
- App installed on simulator (`npm run ios`) with `appId: net.jasonle.tjbot`
- Maestro CLI `~/.maestro/bin/maestro` 2.4.0+

```bash
# from TJBOT-Mobile
~/.maestro/bin/maestro test .maestro/nest-spine-auth.yaml
~/.maestro/bin/maestro test .maestro/nest-spine-signup-home.yaml
```

Robot/ESP screens are intentionally not covered in this spine.
