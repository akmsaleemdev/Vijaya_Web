#!/usr/bin/env bash
# Performance audit — robust against grep no-match (exit 1).
cd /home/z/my-project
SEP="============================================"

echo "$SEP FONTS"
find public src -type f \( -name "*.woff2" -o -name "*.woff" -o -name "*.ttf" -o -name "*.otf" \) -printf '%s %p\n' 2>/dev/null | awk '{printf "  %6.1f KB  %s\n", $1/1024, $2}' | head -30
echo "-- next/font usage:";        grep -rln "next/font" src 2>/dev/null || echo "  (none)"
echo "-- @fontsource imports:";    grep -rln "@fontsource" src 2>/dev/null || echo "  (none)"
echo "-- font refs in globals/layout:"; grep -n "@fontsource\|next/font\|font-family\|--font" src/app/globals.css "src/app/(site)/layout.tsx" src/app/layout.tsx 2>/dev/null | head -20 || echo "  (none)"

echo "$SEP CLIENT COMPONENTS"
printf "  total 'use client' files: "; grep -rl "^['\"]use client['\"]" src --include="*.tsx" --include="*.ts" 2>/dev/null | wc -l
grep -rl "^['\"]use client['\"]" src --include="*.tsx" --include="*.ts" 2>/dev/null | sort

echo "$SEP IMAGE TAG AUDIT"
printf "  next/image imports: "; grep -rln "from ['\"]next/image" src --include="*.tsx" 2>/dev/null | wc -l
printf "  plain <img> tags: ";   grep -rn "<img " src --include="*.tsx" 2>/dev/null | wc -l
echo "  plain <img> file locations:"; grep -rln "<img " src --include="*.tsx" 2>/dev/null | head -30 || echo "  (none)"

echo "$SEP IDENTIFY HEAVY LIBS IN CHUNKS"
for sig in "WebGLRenderer" "THREE." "recharts" "framer-motion" "syntax-highlighter" "prismjs" "mdxeditor" "@dnd-kit" "embla" "react-day-picker" "ResizablePanel" "react-syntax-highlighter"; do
  hits=$(grep -rl "$sig" .next/static/chunks 2>/dev/null | head -2)
  [ -n "$hits" ] && { printf "  %-26s -> " "$sig"; echo "$hits" | tr '\n' ' '; echo; }
done
echo "  (no output above = signatures minified away; will verify via import graph)"

echo "$SEP LAYOUT: scripts / fonts / html"
grep -n "Script\|analytics\|gtag\|gtm\|chat\|hotjar\|intercom\|next/font\|@fontsource\|<html\|<body\|metadata" "src/app/(site)/layout.tsx" src/app/layout.tsx 2>/dev/null | head -30 || echo "  (none)"

echo "$SEP PANORAMA / 360"
ls src/components/panorama/ 2>/dev/null || echo "  (no panorama dir)"
echo "-- who imports panorama / three:"
grep -rln "components/panorama\|from ['\"]three" src --include="*.tsx" --include="*.ts" 2>/dev/null || echo "  (none)"
echo "-- 360-tour page dynamic import?"
grep -rn "dynamic(" "src/app/(site)/360-tour/" 2>/dev/null | head || echo "  (no dynamic() in 360-tour)"
echo "-- is 360-tour linked from nav/footer?"
grep -rn "360-tour\|360-tour" src/components/layout/ src/lib/site-config.ts 2>/dev/null | head || echo "  (not linked)"

echo "$SEP GALLERY structure"
ls src/components/gallery/ 2>/dev/null || echo "  (no gallery dir)"
grep -rn "import\|next/image\|<img\|lazy\|lightbox\|embla\|loading=" src/components/gallery/*.tsx 2>/dev/null | head -30 || echo "  (none)"

echo "$SEP HERO VIDEO / MEDIA component"
ls src/components/media/ 2>/dev/null
echo "-- hero-background component (video attrs):"
grep -n "video\|preload\|poster\|autoPlay\|muted\|loop\|playsInline\|source\|mp4\|<Image\|<img" src/components/media/hero-background.tsx 2>/dev/null | head -40 || echo "  (none)"

echo "$SEP DYNAMIC IMPORTS across app (already code-split)"
grep -rn "next/dynamic\|dynamic(" src --include="*.tsx" --include="*.ts" 2>/dev/null | head -30 || echo "  (none found)"

echo "$SEP BUILD MANIFEST route->chunks"
python3 -c "
import json,os
for mf in ['.next/app-build-manifest.json','.next/build-manifest.json']:
    if os.path.exists(mf):
        print(f'-- {mf} --'); d=json.load(open(mf))
        if isinstance(d,dict):
            for k,v in list(d.items())[:8]:
                v=v if not isinstance(v,list) else (v[:6]+['...'] if len(v)>6 else v)
                print(f'  {k}: {v}')
" 2>/dev/null || echo "  (no manifest)"
echo "AUDIT DONE"
