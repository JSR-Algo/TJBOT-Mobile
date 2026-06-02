<!-- HAND-CURATED. -->
# Robot Management Domain Flow

**Owner lane:** D  
**States:** 12 (10 happy, 2 edge)

## Happy path — Settings hub

`rm_my_robot` is the entry point — a summary card showing the paired robot's name, avatar, and health. From here the user navigates to individual settings panels:

- `rm_status` — connectivity and session health.
- `rm_battery` — charge level and charging guidance.
- `rm_wifi` — change or forget Wi-Fi network.
- `rm_storage` — installed courses and free space.
- `rm_firmware` — software version and update check.
- `rm_sound` — speaker volume and EQ preset.
- `rm_mic_test` — live microphone test playback.
- `rm_speaker_test` — speaker tone test.
- `rm_support` — contact support with device diagnostics attached.

All of the above are informational or low-risk settings and carry no edge templates.

## Edge states

| State | Templates | Trigger |
|---|---|---|
| `rm_factory` | cancel | Destructive action — factory reset wipes all local data. User must confirm twice; cancel returns them to `rm_my_robot`. |
| `rm_offline_help` | error | Robot is offline and cannot be reached; help content is served from cache but live diagnostics are unavailable. |

## Notes

- `rm_factory` is the only state in this domain requiring a multi-step confirmation guard. The `cancel` template covers the explicit "go back" branch; the confirm branch is handled inline within the state's own UI.
- `rm_offline_help` degrades gracefully — cached FAQ content is shown but any action requiring a live robot connection fails with an `error` template overlay.
