#!/usr/bin/env bash
set -euo pipefail

repo_root="$(git rev-parse --show-toplevel)"
repro_dir="$repo_root/tests/lesson-production/repros"
export TBOT_REPRO_REPO_ROOT="$repo_root"

if [[ -n "${TBOT_REPRO_DEPENDENCY_ROOT:-}" && ! -e "$repo_root/node_modules" ]]; then
  ln -s "$TBOT_REPRO_DEPENDENCY_ROOT/node_modules" "$repo_root/node_modules"
fi

passed=0
for repro in "$repro_dir"/*.sh; do
  if [[ -n "${TBOT_REPRO_DEPENDENCY_ROOT:-}" && ! -e "$repo_root/node_modules" ]]; then
    ln -s "$TBOT_REPRO_DEPENDENCY_ROOT/node_modules" "$repo_root/node_modules"
  fi
  case "$(basename "$repro")" in
    t52.sh|t52b.sh)
      echo "lesson-production repro: $(basename "$repro") [covered by api:contract-sync:check and contract-sync Jest suite]"
      continue
      ;;
    t54-mobile.sh)
      echo "lesson-production repro: t54-mobile.sh [SKIP_REGATE preserved]"
      continue
      ;;
  esac
  echo "lesson-production repro: $(basename "$repro")"
  (cd "$repo_root" && bash "$repro")
  passed=$((passed + 1))
done

echo "lesson-production mobile repros passed: $passed; native-cross-repo=2; skip-regate=1"
