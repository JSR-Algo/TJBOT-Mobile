#!/usr/bin/env node
// check-bundle-freshness.mjs
// bundle.js was a web-only artifact (Vite). Now that the project is bare RN,
// locales are imported statically in src/services/i18n/i18n.ts.
// This check is a no-op — kept so `npm run i18n:bundle:check` doesn't break.
console.log('bundle check: N/A (bare RN — locales imported statically)');
process.exit(0);
