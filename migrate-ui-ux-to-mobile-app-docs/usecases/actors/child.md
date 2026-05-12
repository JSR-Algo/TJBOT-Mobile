# Actor — Child (Kid User)

**Type:** Internal, primary.

**Source evidence:** default actor for kid-mode screens — `src/features/home/HomeHubPage.jsx`, `src/features/lesson-session/*Page.jsx`, `src/features/course/*Page.jsx`, `src/features/progress/*Page.jsx`.

**Auth boundary:** none at router level. UI/copy is child-targeted; no role field in code.

**Generalization:** `Child` is a refinement of `Authenticated User` (per overview puml: `Child --|> AuthUser`).

## Domains touched

- `kid-hub` (entry surface)
- `course-browse` (read-only course tree)
- `lesson-session` (voice activity loop)
- `progress` (post-session retrospectives)
- `fallback-shell` (error / safety surfaces — Child surface)

## UCs initiated

See `domains/<d>/use-cases.md` for the full list. The Child is the actor in any UC where the screen is rendered in kid-mode (no PIN gate above it).

## Notes

- Child vs Parent distinction is a **scope-marker, not RBAC** (KD4). Treat as UI mode, not a security boundary.
