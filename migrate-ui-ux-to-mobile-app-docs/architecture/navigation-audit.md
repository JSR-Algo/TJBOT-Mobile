# Navigation Audit

Production navigation is centralized in `src/navigation` and feature-owned route metadata lives in `src/features/*/navigation.ts`.

## Current Layout

| Layer | Source |
|---|---|
| App container | `src/navigation/AppNavigator.tsx` |
| Root branch gate | `src/navigation/RootStackNavigator.tsx` |
| Auth branch | `src/navigation/AuthNavigator.tsx` |
| Onboarding branch | `src/navigation/OnboardingNavigator.tsx` |
| Protected tab host | `src/navigation/MainTabNavigator.tsx` |
| Protected stack + modals | `src/navigation/ModalNavigator.tsx` |
| Route constants | `src/navigation/routes.ts` |
| Deep links | `src/navigation/linking.ts` |

## Source Of Truth

`FEATURE_NAVIGATION_REGISTRY`, `ROUTE_MAP`, and `NAVIGATION_TREE` are generated from feature navigation metadata.
Generated architecture artifacts are reproducible from npm scripts:

- `npm run navigation:route-map`
- `npm run navigation:tree`
- `npm run navigation:forward-edges`

## Coverage

The current route map exports 122 route constants.
`scripts/check-route-coverage.mjs` reports 130 screen files, 122 registered routes, 122 feature route registrations, and 0 duplicate screen registrations.

## Review Result

The production shell uses React Navigation native stacks with a single protected tab host.
Auth invalidation clears tokens and flips the root branch through the auth context.
Deep links are derived from route ownership and remain aligned with `route-mapping.json`.
