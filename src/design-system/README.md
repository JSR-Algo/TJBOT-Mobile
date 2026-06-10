# design-system

Pure UI primitives and tokens. Zero business logic. Zero API/store imports.

## Boundaries (enforced by eslint `no-restricted-imports` in PR-6)

- No imports from `@/features/**`
- No imports from `@/store/**`
- No imports from `@/services/**`
- No imports from `@/lib/**` (except `@/lib/i18n` for string literals)

## Exception

`AnimationProvider` may import `@/design-system/animations` only — documented here to prevent confusion.
