# T17 run13: execute canonical parity

The test loader now uses explicit TBOT_BACKEND_DIR or the real workspace sibling
tbot-backend. It checks the declared local @tbot/contracts 1.1.0 package and exact
installed/vendor module equality, then runs the canonical modules with their
actual dependencies in native Node. There is no missing-input fallback or skip.

The original 19 assertions retain their expected values and bodies: six state,
four expression, six motion and three realtime checks. The native bridge evaluates
all 100 state pairs and legal-target sets, serializes canonical constants, and
constructs the original expression event from the test's unchanged arguments.
The wrapper's TypeScript shapes do not provide canonical data.

Native loader regressions exercise the full Jest suite with a missing configured
backend root and exact canonical modules with their Zod dependency omitted. The
former fails against the old silent-skip loader and passes after correction.
Failures preserve the configured root and original diagnostic. Temporary negative
inputs are exact copies of real modules, never substitute successful oracles.

Owned run13 evidence records raw commands, original 19-skip baseline, causal red,
final native 19-case parity and loader regressions, module/dependency provenance,
source/patch identities, scoped type/lint/validators and preservation.
The selected producer is the S19 run06 backend source package; canonical module
equality does not assert whole-server equivalence with the working backend.

Run12 full-unit and coverage results remain historical, bound to their own source.
This loader-only change does not rerun those broad checks or close the 100%
coverage failure. The structural mobile guard still differs from canonical enum
and integer bounds; these assertions do not prove full Zod equivalence.
Validator PARTIALs, all26/live/restart/native/device/media/rights/candidate/release
gates remain open. No product guard, producer contract or dependency was changed.
