#!/bin/bash
# scripts/generate-pwa-icons.sh
# Regenerates every PWA/favicon icon from static/logo.png's deer-head mark.
# Re-run this whenever logo.png changes. Requires ImageMagick (`brew install
# imagemagick`) — a local tool, not a project dependency (see plan
# docs/superpowers/plans/2026-07-19-pwa-support.md, Global Constraints).
set -e

cd "$(dirname "$0")/.."

SRC="static/logo.png"
# Mark bounding box measured via Pillow alpha-channel scan (see Task 1):
# x:[64,392], y:[277,597] -> 328x320px. Re-measure if logo.png changes.
CROP="328x320+64+277"
BG="#f9f6f2"   # light-hybrid theme background (src/app.css :root, [data-theme='light-hybrid']) — Felix's decision 19.07.2026

mkdir -p static/icons
TMP=$(mktemp -t pwa-mark).png

echo "-> Cropping mark from $SRC ($CROP)..."
magick "$SRC" -crop "$CROP" +repage "$TMP"

echo "-> icon-192.png / icon-512.png (purpose: any, ~11% margin)..."
magick "$TMP" -background "$BG" -gravity center -extent 400x400 -resize 192x192 static/icons/icon-192.png
magick "$TMP" -background "$BG" -gravity center -extent 400x400 -resize 512x512 static/icons/icon-512.png

echo "-> icon-maskable-512.png (purpose: maskable, ~20% safe-zone margin)..."
magick "$TMP" -background "$BG" -gravity center -extent 560x560 -resize 512x512 static/icons/icon-maskable-512.png

echo "-> apple-touch-icon.png (180x180, opaque background required by iOS)..."
magick "$TMP" -background "$BG" -gravity center -extent 400x400 -resize 180x180 static/icons/apple-touch-icon.png

echo "-> favicon.png (48x48 — bonus fix, app.html has referenced a nonexistent favicon.png)..."
magick "$TMP" -background "$BG" -gravity center -extent 400x400 -resize 48x48 static/favicon.png

rm -f "$TMP"
echo "Done. Generated: $(ls static/icons/) + static/favicon.png"
