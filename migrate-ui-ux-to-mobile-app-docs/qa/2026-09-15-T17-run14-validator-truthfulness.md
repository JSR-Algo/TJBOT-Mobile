# T17 Run14 validator truthfulness QA

The screen-prop check now uses TypeScript compiler symbols to connect actual
exported component parameters to actual NativeStackScreenProps, the authoritative
RootStackParamList and feature navigation registrations. It rejects wrong valid
route keys, unused correct aliases, fake same-spelled types, missing arguments,
parse failures and unsupported/missing inputs. Imports may be aliased; optional
extra property intersections are supported without navigation/route overrides.
Navigation-only destructuring and typed _props remain valid. All scanned files
are checked. Unregistered files are reported without inventing runtime mappings.

The owned full-source pre-final control found 135 scanned/135 typed/127 registered/
8 unregistered/0 violations across 12 metadata files. UnlockConfirmModal uses its
actual UnlockConfirmScreen registration. The retained CourseDetail fixture changes
only its route argument to CourseLibraryScreen: original validator exit 0, fixed
validator exit 1 with expected/actual route and source line. Native regressions:
18 screen cases and 6 flow cases are selected for final verification.
A partial-missing-metadata regression copies the exact actual src tree, retains
featureRegistry imports, then removes only course-library/navigation.ts. The
pre-correction analyzer falsely passed 135 typed/115 registered/20 unregistered.
The fix checks required navigation imports from existing navigation source files;
it does not convert legitimately unregistered components into violations.
The actual AppErrorScreen intersection is a positive control. Final evidence is
recorded outside mobile under this run's checks and commands.json.

Flow Git results preserve process status separately from output. Missing branch,
root or required staged provenance reports UNAVAILABLE with the original reason.
Successful branch and valid empty-index controls remain distinguishable. Content
checks and their exit policy are unchanged; single-writer remains WARN-ONLY and
nonblocking. Historical guarded paths, commit-message lookup and extractor are
unchanged. This does not implement full lane enforcement. Console output uses
console.info to satisfy the existing lint rule without changing stdout text.

Final scoped proof includes native regressions, the existing navigation type test,
canonical parity/loader preservation, TypeScript, src/tests lint, explicit changed
script/helper/test lint, repository validators and the source-only API audit.
No full 3298-test or coverage rerun. Historical run12 broad results retain their
original source identity and 19 historical skips. Coverage remains FAIL at
97.31 statements / 96.30 branches / 97.78 functions / 97.82 lines.

No product, package, config, auth, quota, retention or schema changes. Unsupported
future syntax fails instead of silently passing. Fixture checks prove analyzer
behavior, not device or production contracts. Full T17, live/native/Detox/device/
media/service/release remain BLOCKED; candidate .74 remains NO_GO. The lightweight
realtime guard policy and accepted canonical parity correction are preserved.
