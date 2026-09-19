# Canonical parity inputs

Run the parity suite with `TBOT_BACKEND_DIR` pointing to the verified backend
checkout containing `vendor/contracts` and its existing dependencies. The default
is the workspace sibling `../tbot-backend` relative to the mobile repository;
an explicit root is required for isolated copies. A configured root is never
replaced by a fallback.

```sh
TBOT_BACKEND_DIR=/path/to/verified/tbot-backend npm test -- --runInBand --watchman=false --runTestsByPath tests/contracts/parity.test.ts
TBOT_BACKEND_DIR=/path/to/verified/tbot-backend node --test --test-concurrency=1 tests/scripts/canonical-parity-loader.test.mjs
```

The native Node bridge loads only robot-state, expression, motion and
realtime-events from canonical `@tbot/contracts` 1.1.0. It verifies that the
backend declares its local vendor package and that the installed producer modules
match the vendor bytes. It uses the canonical package's real dependency resolution.
Missing packages, mismatched copies or unloadable dependencies fail with the root
and original error. No package index or backend application service is imported.

Jest 29 replaces `module.createRequire`; the separate Node process avoids applying
the mobile Babel pipeline to canonical server modules. It serializes actual
constants, all state-pair function results and legal-target sets. The existing
event assertion sends its original constructor arguments through a second bridge
call. The bridge imports no mobile projection. Type-only declarations in the
wrapper describe the serialized result; they supply no expected values.

Set `TBOT_CANONICAL_ORIGINS_PATH` to an owned JSONL output path to retain package,
module/installed-copy hashes, loaded dependency hashes, Node identity and operation
counts. Qualification must compare those origins to the selected source revision;
the package version and installed/vendor equality alone do not select a candidate.

The 19 assertions check constants, 100 state pairs, 144 motion cells, metadata and
one constructed event. They do not establish strict Zod equivalence: the mobile
guard intentionally omits some enum and integer bounds. Test-loader correction
does not authorize changing that product policy or claim live backend/device proof.
