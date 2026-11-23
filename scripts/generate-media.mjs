import ZAI from 'z-ai-web-dev-sdk';
import fs from 'fs';
import path from 'path';

const OUT = '/home/z/my-project/public/media';
fs.mkdirSync(OUT, { recursive: true });

const STYLE =
  'Cinematic luxury hospitality photography, warm ivory and deep burgundy palette with champagne gold accents, soft natural light, elegant minimal composition, high-end architectural digest style, photorealistic, ultra detailed. No text, no watermark, no logo, no people facing camera.';

const JOBS = [
  ['hero-dusk', '1536x768', `Grand modern Indian convention centre exterior at blue-hour dusk, monumental minimal architecture with warm glowing interior light, reflecting pool in foreground, tall coconut palms, dramatic sky, wide cinematic angle. ${STYLE}`],
  ['hero-wedding', '864x1152', `Palatial wedding mandap setup inside a grand convention hall, ivory drapery and fresh jasmine floral decor, warm golden ambient lighting, aisle with brass lamps, distant elegant guests only. ${STYLE}`],
  ['hero-business', '864x1152', `Executive conference hall with long table, warm wood and ivory tones, subtle gold accent lighting, large presentation wall, empty chairs, refined corporate atmosphere. ${STYLE}`],
  ['hero-celebration', '864x1152', `Elegant intimate celebration dinner setup on an outdoor lawn at twilight, string lights, round tables with ivory linen and candles, tropical Kerala landscape backdrop. ${STYLE}`],
  ['space-periyar', '1344x768', `Vast grand banquet hall with soaring ceiling, crystal chandeliers, ivory columns, polished floor reflecting warm light, empty and pristine before an event. ${STYLE}`],
  ['space-nila', '1344x768', `Elegant mid-size event hall with warm wood panelling, modern minimal chandelier, ivory walls, stage with soft gold lighting, empty pristine setup. ${STYLE}`],
  ['space-pamba', '1344x768', `Bright versatile event hall with high ceiling and warm daylight through tall windows, neutral ivory palette, clean polished floor, minimal stage. ${STYLE}`],
  ['space-kabani', '1344x768', `Charming open-sided pavilion cabana beside a calm lake, wooden deck, rattan furniture, tropical greenery, golden afternoon light. ${STYLE}`],
  ['space-ballroom', '1344x768', `Refined hotel-style ballroom with layered cove lighting, burgundy and ivory tones, patterned carpet, elegant empty event setup. ${STYLE}`],
  ['space-boardroom', '1344x768', `Premium boardroom with long dark wood table, leather chairs, warm accent lighting, minimal artwork, city-greenery view through glass. ${STYLE}`],
  ['space-vip-dining', '1344x768', `Exclusive private dining room, sculptural chandelier, ivory tableware, deep burgundy velvet chairs, warm intimate lighting. ${STYLE}`],
  ['space-outdoor', '1344x768', `Expansive manicured event lawn framed by palm trees and tropical landscape at golden hour, minimal stage in distance, festive but elegant. ${STYLE}`],
  ['space-lake', '1344x768', `Serene lakefront event setting with wooden deck over still water, reflections at sunset, tropical palms, distant hills of Kerala. ${STYLE}`],
  ['exp-architecture', '1344x768', `Striking architectural detail of a modern luxury convention centre facade, geometric frames, ivory stone and warm wood, dramatic shadows. ${STYLE}`],
  ['exp-arrival', '1344x768', `Monumental arrival porte-cochere of a luxury convention centre, grand columns, warm lighting, red carpet, elegant driveway with tropical planting. ${STYLE}`],
  ['exp-landscape', '1344x768', `Lush tropical Kerala landscape gardens with winding pathways, flowering trees, manicured lawns, soft morning mist. ${STYLE}`],
  ['exp-helipad', '1344x768', `Modern helipad with clean markings beside a luxury resort-style convention property, tropical landscape, dramatic sky, no people. ${STYLE}`],
  ['pano-hall', '1536x768', `Ultra-wide equirectangular panorama of a grand empty convention hall interior, symmetrical composition, chandeliers, ivory and warm gold light, seamless horizon. ${STYLE}`],
  ['pano-lake', '1536x768', `Ultra-wide equirectangular panorama of a lakeside tropical garden at golden hour, calm water, palms, wooden deck, seamless horizon, symmetrical. ${STYLE}`],
  ['pano-lobby', '1536x768', `Ultra-wide equirectangular panorama of a luxurious convention centre lobby, double-height space, marble floor, warm wood and brass details, seamless horizon. ${STYLE}`],
  ['story-1', '1344x768', `Traditional Kerala wedding scene details: brass uruli with flowers, kasavu saree fabric texture, banana leaf decor, warm candle light, elegant close-up composition. ${STYLE}`],
  ['story-2', '1344x768', `Corporate gala dinner in a grand hall, stage with warm amber lighting, elegant table settings, atmosphere of achievement celebration. ${STYLE}`],
  ['story-3', '1344x768', `Behind the scenes event transformation: empty grand hall being dressed with floral installations and drapery by crew silhouettes, ladders and flowers, warm light. ${STYLE}`],
  ['about-hero', '1344x768', `Timeless portrait of a stately convention centre courtyard at dawn, architectural symmetry, banyan tree, warm first light, tranquil and grand. ${STYLE}`],
  ['weddings-wide', '1344x768', `Grand indoor wedding reception hall dressed in ivory and gold, long banquet tables, floral ceiling installation, warm romantic lighting, empty before guests arrive. ${STYLE}`],
  ['transform', '1344x768', `Dramatic before-and-after feel: half-dressed grand hall with floral arch installation in progress, warm work lights, elegant chaos becoming beauty. ${STYLE}`],
];

async function main() {
  const zai = await ZAI.create();
  const done = new Set(fs.readdirSync(OUT));
  let ok = 0, fail = 0;
  for (const [name, size, prompt] of JOBS) {
    const out = path.join(OUT, `${name}.jpg`);
    if (done.has(`${name}.jpg`)) { console.log(`skip ${name}`); ok++; continue; }
    let success = false;
    for (let attempt = 1; attempt <= 3 && !success; attempt++) {
      try {
        const res = await zai.images.generations.create({ prompt, size });
        const b64 = res?.data?.[0]?.base64;
        if (!b64) throw new Error('empty response');
        fs.writeFileSync(out, Buffer.from(b64, 'base64'));
        console.log(`ok ${name} (${size})`);
        success = true; ok++;
      } catch (e) {
        console.error(`err ${name} attempt ${attempt}: ${e.message}`);
        if (attempt < 3) await new Promise(r => setTimeout(r, 2000 * attempt));
      }
    }
    if (!success) fail++;
  }
  console.log(`DONE ok=${ok} fail=${fail}`);
}
main().catch(e => { console.error('FATAL', e); process.exit(1); });
