#!/usr/bin/env bash
# Re-encode the 13 MB hero video into optimized desktop + mobile MP4 variants.
# The footage is high-detail, so we scale down + raise CRF. The video plays
# behind a dark vignette overlay, so 1280x720 desktop / 854x480 mobile is
# visually sufficient while cutting bytes ~90%.
set -uo pipefail
cd /home/z/my-project
SRC="public/media/vijaya-web-video-01.mp4"
DESK="public/media/vijaya-hero-desktop.mp4"
MOB="public/media/vijaya-hero-mobile.mp4"

echo "[1/2] desktop 1280x720 CRF 28..."
ffmpeg -y -i "$SRC" \
  -vf "scale=1280:720" \
  -c:v libx264 -profile:v high -level 4.0 -preset medium -crf 28 \
  -pix_fmt yuv420p -movflags +faststart -an \
  "$DESK"
echo "    desktop: $(du -h "$DESK" | cut -f1) ($(stat -c%s "$DESK") bytes)"

echo "[2/2] mobile 854x480 CRF 30..."
ffmpeg -y -i "$SRC" \
  -vf "scale=854:480" \
  -c:v libx264 -profile:v main -level 3.1 -preset medium -crf 30 \
  -pix_fmt yuv420p -movflags +faststart -an \
  "$MOB"
echo "    mobile: $(du -h "$MOB" | cut -f1) ($(stat -c%s "$MOB") bytes)"

echo ""
echo "=== RESULT ==="
printf "  original full-res source: %8s (%d bytes)\n" "$(du -h "$SRC"|cut -f1)" "$(stat -c%s "$SRC")"
printf "  desktop variant 1280x720: %8s (%d bytes)\n" "$(du -h "$DESK"|cut -f1)" "$(stat -c%s "$DESK")"
printf "  mobile variant 854x480:   %8s (%d bytes)\n" "$(du -h "$MOB"|cut -f1)" "$(stat -c%s "$MOB")"
echo "ENCODE_DONE"
