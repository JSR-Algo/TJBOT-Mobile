#!/usr/bin/env bash
# Parallel image generation against MiniMax image-01.
# Requires: MINIMAX_KEY env var. Never commit the key.
set -euo pipefail
cd "$(dirname "$0")"
mkdir -p out

: "${MINIMAX_KEY:?Set MINIMAX_KEY env var before running}"
ENDPOINT="https://api.minimax.io/v1/image_generation"
MODEL="image-01"

# Encode JSON via python3 to dodge shell quoting hell.
gen() {
  local key="$1" prompt="$2"
  local body resp url
  body=$(python3 -c "import json,sys; print(json.dumps({'model':sys.argv[1],'prompt':sys.argv[2],'aspect_ratio':'1:1','n':1,'response_format':'url'}))" "$MODEL" "$prompt")
  resp=$(curl -sS --max-time 90 -X POST "$ENDPOINT" \
    -H "Authorization: Bearer $MINIMAX_KEY" \
    -H "Content-Type: application/json" \
    --data "$body")
  printf '%s\n' "$resp" > "out/${key}.json"
  url=$(python3 -c "import json,sys; d=json.load(sys.stdin); print(d.get('data',{}).get('image_urls',[''])[0])" <<<"$resp")
  if [[ -z "$url" ]]; then
    echo "✗ $key — no image URL returned. Response saved to out/${key}.json"
    return 1
  fi
  curl -sS --max-time 90 -o "out/${key}.jpg" "$url"
  echo "✓ $key"
}

# 5 distinct style directions, all of the same HAPPY expression,
# so we can compare style apples-to-apples at production sizes.
gen glow-vector "A friendly kid-robot face on a small LCD screen: two large glowing cyan rounded-square eyes with a soft smile-arc, deep navy background #05081C, soft cyan bloom and gentle inner gradient, flat vector illustration, no head and no body just floating eyes, Cozmo Vector RoboEyes aesthetic, ultra clean, square 1:1, no text" &
gen pixel-retro "A friendly kid-robot face on a small LCD screen: chunky 8-bit pixel-art happy eyes with a pixelated smile, bright cyan and magenta pixels on pure black background, Tamagotchi Game Boy aesthetic, crisp pixel grid, super kawaii, no head and no body just the face, square 1:1, no text" &
gen neon-kawaii "A friendly kid-robot face on a small LCD screen: huge sparkling kawaii anime-style eyes glowing magenta and cyan with star-shaped highlights, soft purple-to-pink gradient background, neon glow, very cute, big eye highlights, no head no body just face, square 1:1, no text" &
gen mono-oled "A friendly kid-robot face on a small monochrome OLED display: single-color pure white minimalist rounded-square eyes with a tiny smile mouth on solid black background, no gradients, ultra-minimal high-contrast pictogram, clean Vector-robot vibe, no head no body just eyes, square 1:1, no text" &
gen soft3d-mascot "A friendly kid robot mascot character, soft 3D rendered cute kawaii face, big shiny round eyes with sparkling highlights and a cute smile, pastel mint-and-peach palette, Pixar-style soft studio lighting, clay-like material, plain pastel background, square 1:1, no text" &
wait
echo "all done — outputs in out/"
