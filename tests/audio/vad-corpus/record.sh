#!/usr/bin/env bash
# record.sh — capture a single VAD corpus sample via sox.
#
# Usage:
#   ./record.sh --category=child --duration_s=2
#   ./record.sh --category=ambient --duration_s=3 --environment="office fan"
#   ./record.sh --help
#
# Requirements:
#   macOS: sox (brew install sox)
#   Linux: sox with alsa support (apt install sox libsox-fmt-all)
#           change SOX_INPUT_DRIVER below to "alsa" and SOX_INPUT_DEVICE to "default"
#
# Output:
#   <category>/<category>_NNN.wav   — 16 kHz mono Int16 PCM
#   <category>/<category>_NNN.json  — VadSampleSidecar (labelState: "unlabeled")
#
# Each invocation records one sample. Run again for the next sample.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# ── Platform audio driver ─────────────────────────────────────────────────
# macOS CoreAudio default input device:
SOX_INPUT_DRIVER="coreaudio"
SOX_INPUT_DEVICE="default"
# Linux ALSA — uncomment and comment the two lines above:
# SOX_INPUT_DRIVER="alsa"
# SOX_INPUT_DEVICE="default"

# ── Argument parsing ──────────────────────────────────────────────────────
CATEGORY=""
DURATION_S=2
ENVIRONMENT="not specified"
SPEAKER_AGE_GROUP=""

usage() {
  cat <<EOF
Usage: $0 --category=CATEGORY [--duration_s=N] [--environment="DESC"]

  --category=CATEGORY   Required. One of: child, adult, ambient, mixed
  --duration_s=N        Recording duration in seconds (default: 2, range: 1-10)
  --environment=DESC    Free-text description of the recording environment
  --help                Show this help and exit

Examples:
  $0 --category=child --duration_s=2 --environment="quiet bedroom"
  $0 --category=ambient --duration_s=3 --environment="kitchen, refrigerator hum"
EOF
  exit 0
}

for arg in "$@"; do
  case "$arg" in
    --category=*)      CATEGORY="${arg#*=}" ;;
    --duration_s=*)    DURATION_S="${arg#*=}" ;;
    --environment=*)   ENVIRONMENT="${arg#*=}" ;;
    --help|-h)         usage ;;
    *) echo "Unknown argument: $arg" >&2; usage ;;
  esac
done

# ── Validate inputs ───────────────────────────────────────────────────────
if [[ -z "$CATEGORY" ]]; then
  echo "Error: --category is required." >&2
  usage
fi

if [[ ! "$CATEGORY" =~ ^(child|adult|ambient|mixed)$ ]]; then
  echo "Error: --category must be one of: child, adult, ambient, mixed" >&2
  exit 1
fi

if ! [[ "$DURATION_S" =~ ^[0-9]+$ ]] || [[ "$DURATION_S" -lt 1 ]] || [[ "$DURATION_S" -gt 10 ]]; then
  echo "Error: --duration_s must be an integer between 1 and 10" >&2
  exit 1
fi

if ! command -v sox &>/dev/null; then
  echo "Error: 'sox' not found. Install with: brew install sox (macOS) or apt install sox (Linux)" >&2
  exit 1
fi

# ── Determine next index ──────────────────────────────────────────────────
CATEGORY_DIR="$SCRIPT_DIR/$CATEGORY"
mkdir -p "$CATEGORY_DIR"

# Find existing wav files, extract their indices, take max+1.
NEXT_INDEX=1
while IFS= read -r f; do
  # Extract trailing digits from basename (e.g. child_042 → 42).
  base="$(basename "$f" .wav)"
  num="${base##*_}"
  if [[ "$num" =~ ^[0-9]+$ ]]; then
    idx=$((10#$num))
    if [[ $idx -ge $NEXT_INDEX ]]; then
      NEXT_INDEX=$((idx + 1))
    fi
  fi
done < <(find "$CATEGORY_DIR" -maxdepth 1 -name "${CATEGORY}_*.wav" 2>/dev/null || true)

INDEX_PADDED=$(printf "%03d" "$NEXT_INDEX")
BASE_NAME="${CATEGORY}_${INDEX_PADDED}"
WAV_PATH="$CATEGORY_DIR/${BASE_NAME}.wav"
JSON_PATH="$CATEGORY_DIR/${BASE_NAME}.json"

# ── Speaker age group ─────────────────────────────────────────────────────
case "$CATEGORY" in
  child)   SPEAKER_AGE_GROUP='"child"' ;;
  adult)   SPEAKER_AGE_GROUP='"adult"' ;;
  mixed)   SPEAKER_AGE_GROUP='"child"' ;;  # default; edit JSON if adult-mixed
  ambient) SPEAKER_AGE_GROUP='null' ;;
esac

CONTAINS_SPEECH="true"
if [[ "$CATEGORY" == "ambient" ]]; then
  CONTAINS_SPEECH="false"
fi

# ── Record ────────────────────────────────────────────────────────────────
echo "Recording ${DURATION_S}s of ${CATEGORY} audio → ${WAV_PATH}"
echo "Speak into the microphone after the beep..."
sleep 0.3

# sox: read from the platform input driver, write 16kHz mono Int16 WAV.
sox -t "$SOX_INPUT_DRIVER" "$SOX_INPUT_DEVICE" \
    -r 16000 -c 1 -b 16 -e signed-integer \
    "$WAV_PATH" \
    trim 0 "$DURATION_S"

if [[ ! -f "$WAV_PATH" ]]; then
  echo "Error: sox did not produce output file." >&2
  exit 1
fi

# Measure actual duration via soxi.
ACTUAL_DURATION="$(soxi -D "$WAV_PATH" 2>/dev/null || echo "$DURATION_S")"
# Round to 3 decimal places using awk.
ACTUAL_DURATION="$(awk "BEGIN { printf \"%.3f\", $ACTUAL_DURATION }")"

# ── Write JSON sidecar ────────────────────────────────────────────────────
CAPTURED_AT="$(date -u +"%Y-%m-%dT%H:%M:%S.000Z")"

cat > "$JSON_PATH" <<EOF
{
  "schemaVersion": "1.0",
  "capturedAt": "${CAPTURED_AT}",
  "category": "${CATEGORY}",
  "index": ${NEXT_INDEX},
  "baseName": "${BASE_NAME}",
  "sampleRateHz": 16000,
  "channels": 1,
  "bitDepth": 16,
  "durationSec": ${ACTUAL_DURATION},
  "environment": "${ENVIRONMENT}",
  "speakerAgeGroup": ${SPEAKER_AGE_GROUP},
  "containsSpeech": ${CONTAINS_SPEECH},
  "labelState": "unlabeled",
  "markers": [],
  "labeledAt": null
}
EOF

echo ""
echo "Done."
echo "  WAV:  $WAV_PATH"
echo "  JSON: $JSON_PATH"
echo ""
echo "Next step: open label.html in a browser to add onset/offset markers."
