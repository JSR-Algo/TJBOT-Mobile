#!/usr/bin/env bash
# v3 — 20 soft-3D-mascot variants of "Bibo".
# Same Pixar-style clay-like character, vary palette + small form details.
# Requires: MINIMAX_KEY env var. Never commit the key.
set -euo pipefail
cd "$(dirname "$0")"
mkdir -p out

: "${MINIMAX_KEY:?Set MINIMAX_KEY env var before running}"
ENDPOINT="https://api.minimax.io/v1/image_generation"
MODEL="image-01"

# Common style kernel — keeps the look consistent across variants.
# Variant prompts only override palette + minor form details.
BASE='A friendly kid-robot mascot character named Bibo, soft 3D rendered, Pixar-style soft studio lighting, glossy clay-like material, big shiny round happy eyes with sparkling highlights, small cute smile, soft blush cheek dots, headphone-style speakers on the sides of the head, plump round body with tiny arms and little feet, single centered character full body, plain pastel background, square 1:1 composition, no text, no watermark.'

gen() {
  local key="$1" extra="$2"
  local prompt="${BASE} ${extra}"
  local body resp url
  body=$(python3 -c "import json,sys; print(json.dumps({'model':sys.argv[1],'prompt':sys.argv[2],'aspect_ratio':'1:1','n':1,'response_format':'url'}))" "$MODEL" "$prompt")
  resp=$(curl -sS --max-time 120 -X POST "$ENDPOINT" \
    -H "Authorization: Bearer $MINIMAX_KEY" \
    -H "Content-Type: application/json" \
    --data "$body")
  printf '%s\n' "$resp" > "out/${key}.json"
  url=$(python3 -c "import json,sys; d=json.load(sys.stdin); print(d.get('data',{}).get('image_urls',[''])[0])" <<<"$resp")
  if [[ -z "$url" ]]; then
    echo "✗ $key — no image URL. See out/${key}.json"
    return 1
  fi
  curl -sS --max-time 120 -o "out/${key}.jpg" "$url"
  echo "✓ $key"
}

# Batches of 5 to be polite to the API.
batch1() {
  gen 01-mint-peach        "Mint green head plate with peach pink accents and limbs, cream body, peach-cream background." &
  gen 02-sky-cream         "Sky blue head plate with warm cream accents, vanilla body, soft pale blue background." &
  gen 03-lavender-butter   "Lavender purple head plate with butter yellow accents, cream body, lilac background." &
  gen 04-coral-mint        "Coral pink head plate with mint green accents, cream body, soft coral background." &
  gen 05-rose-cream        "Rose pink head plate with cream accents, blush body, dusty rose background." &
  wait
}
batch2() {
  gen 06-lemon-mint        "Pale lemon yellow head plate with mint green accents, cream body, very soft yellow background." &
  gen 07-lilac-peach       "Lilac head plate with peach accents, cream body, soft lilac background." &
  gen 08-aqua-sand         "Aqua teal head plate with warm sand-tan accents, cream body, sandy aqua background." &
  gen 09-bubblegum-vanilla "Bubblegum pink head plate with vanilla cream accents, white body, baby pink background." &
  gen 10-periwinkle-cream  "Periwinkle blue head plate with cream accents, cream body, periwinkle background." &
  wait
}
batch3() {
  gen 11-pistachio-blush   "Pistachio green head plate with blush pink accents, cream body, pistachio background." &
  gen 12-cornflower-cream  "Cornflower blue head plate with cream accents, cream body, soft cornflower background." &
  gen 13-apricot-sage      "Apricot orange head plate with sage green accents, cream body, soft apricot background." &
  gen 14-cherry-mint       "Cherry blossom pink head plate with mint accents, cream body, soft cherry blossom background." &
  gen 15-mint-coral        "Mint green head plate with coral pink accents on a slightly taller round body, cream body, mint background." &
  wait
}
batch4() {
  gen 16-sky-rose          "Sky blue head plate with rose pink accents, cream body, soft sky background, slightly squat body." &
  gen 17-lemon-lilac       "Lemon head plate with lilac accents, cream body, lemon background, with a tiny pom-pom antenna on top." &
  gen 18-mocha-cream       "Soft mocha brown head plate with cream accents, cream body, mocha latte background, with cute round bear-style ears instead of headphones." &
  gen 19-seafoam-blush     "Seafoam green head plate with blush pink accents, cream body, seafoam background, with a small heart-shaped antenna." &
  gen 20-lavender-mint     "Lavender head plate with mint green accents, cream body, lavender background, with a small star-shaped antenna." &
  wait
}

batch1
batch2
batch3
batch4
echo "all 20 done — outputs in out/"
