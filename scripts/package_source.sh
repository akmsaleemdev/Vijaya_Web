#!/usr/bin/env bash
# Package the complete VIJAYA website source code into a tar.gz archive.
# Includes: src, public (media + brand), scripts, prisma, tests, examples,
#           root configs, README.md, .env.example
# Excludes: node_modules, .next, .git, download, upload, skills, tool-results,
#           .zscripts, mini-services, the production SQLite DB (db/*.db — may
#           contain customer PII; recreate via prisma), the real .env, logs.
set -euo pipefail
cd /home/z/my-project
OUT="download/vijaya-website-source.tar.gz"
mkdir -p download

echo "Building source archive → $OUT"
tar -czf "$OUT" \
  --exclude='node_modules' \
  --exclude='.next' \
  --exclude='.git' \
  --exclude='download' \
  --exclude='upload' \
  --exclude='skills' \
  --exclude='tool-results' \
  --exclude='.zscripts' \
  --exclude='mini-services' \
  --exclude='db/*.db' \
  --exclude='db/*.db-journal' \
  --exclude='.env' \
  --exclude='server.log' \
  --exclude='*.log' \
  --exclude='.DS_Store' \
  src public scripts prisma tests examples \
  .env.example README.md .gitignore \
  package.json next.config.ts tsconfig.json tailwind.config.ts \
  components.json next-env.d.ts postcss.config.mjs eslint.config.mjs

SZ=$(stat -c%s "$OUT")
printf "Archive size: %d bytes (%.1f MB)\n" "$SZ" "$(python3 -c "print(round($SZ/1048576,1))")"
echo ""
echo "=== Archive contents (top-level) ==="
tar -tzf "$OUT" | awk -F/ '{print $1}' | sort -u
echo ""
echo "=== File count by top-level dir ==="
tar -tzf "$OUT" | awk -F/ 'NF>1{print $1} NF==1{print "(root file)"}' | sort | uniq -c | sort -rn
echo ""
echo "=== Sanity checks ==="
for f in src/app/\(site\)/page.tsx src/components/media/hero-background.tsx src/lib/fonts.ts next.config.ts package.json prisma/schema.prisma README.md .env.example public/media/vijaya-hero-desktop.mp4 public/media/vijaya-hero-mobile.mp4 public/brand/vijaya-logo-gold.png; do
  if tar -tzf "$OUT" | grep -q "^$f"; then echo "  ✓ $f"; else echo "  ✗ MISSING: $f"; fi
done
echo ""
echo "=== Excluded (must be absent) ==="
for f in node_modules .next .git db/custom.db .env server.log; do
  if tar -tzf "$OUT" | grep -q "^$f"; then echo "  ✗ INCLUDED (should be excluded): $f"; else echo "  ✓ excluded: $f"; fi
done
echo "PACKAGED"
