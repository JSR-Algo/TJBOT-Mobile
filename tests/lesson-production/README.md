# Lesson-production regression suite

CI runs the portable mobile software probes from this directory. The T5.2 and T5.2b cross-repo
contract checks are represented by the existing blocking `api:contract-sync:check` job and its
Jest contract suite; `t54-mobile.sh` retains its campaign `SKIP_REGATE` classification.

Physical H1 robot/phone evidence remains outside software CI. This suite changes no mobile product,
BLE, authentication, or API behavior.
