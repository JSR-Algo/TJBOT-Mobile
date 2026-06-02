# 03-device-runtime — Device runtime + local interaction

**System spec:** `docs/site/software/systems/03-device-runtime-local-interaction.md`
**Sequences:** `docs/sequences/03-device-runtime/*.sequence.mmd`
**Owning service(s):** `RuntimeApp` (largely device-local; backend persists only uploaded reports).
**Lane:** C (worker-2, Phase 2)
**Status:** complete (Phase 2 Lane C).

## Entities

| Entity | Role |
|---|---|
| `runtime_boot_reports` | Upload-batch boot event records; fleet boot success / safe-mode rate monitoring; 30-day retention. |
| `runtime_local_event_log` | Upload-batch on-device runtime events (audio overruns, WS disconnects, fault codes); 30-day retention. |
| `safe_mode_entries` | Safe-mode entry/exit records; longer 180-day retention for support diagnostics. |
