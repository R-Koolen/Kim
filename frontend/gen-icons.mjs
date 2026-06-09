// One-off icon generator for the "Waar is Kim?" PWA.
// Propaganda-style mark: cream star + block "KIM" on the accent-red field.
// Pure vector shapes (no fonts) so it rasterises identically everywhere.
// Run: npm install --no-save sharp && node gen-icons.mjs
import sharp from "sharp";
import { mkdirSync } from "node:fs";
import { join } from "node:path";

const RED = "#c1121f";   // --accent
const CREAM = "#f7eed4"; // --accent-ink
const OUT = "icons";
mkdirSync(OUT, { recursive: true });

// 5-point star as a polygon, centred at (cx,cy).
function star(cx, cy, R, r) {
  const pts = [];
  for (let k = 0; k < 10; k++) {
    const rad = (k % 2 === 0) ? R : r;
    const a = (-90 + k * 36) * (Math.PI / 180);
    pts.push(`${(cx + rad * Math.cos(a)).toFixed(1)},${(cy + rad * Math.sin(a)).toFixed(1)}`);
  }
  return `<polygon points="${pts.join(" ")}" fill="${CREAM}"/>`;
}

// Block "KIM" drawn with thick square-cap strokes (font-independent).
function kim() {
  const sw = 32, cap = `stroke="${CREAM}" stroke-width="${sw}" stroke-linecap="square" stroke-linejoin="miter" fill="none"`;
  return `
    <g ${cap}>
      <!-- K -->
      <line x1="120" y1="232" x2="120" y2="384"/>
      <line x1="120" y1="308" x2="178" y2="232"/>
      <line x1="120" y1="308" x2="190" y2="384"/>
      <!-- I -->
      <line x1="236" y1="232" x2="236" y2="384"/>
      <line x1="214" y1="232" x2="258" y2="232"/>
      <line x1="214" y1="384" x2="258" y2="384"/>
      <!-- M -->
      <line x1="300" y1="384" x2="300" y2="232"/>
      <line x1="300" y1="232" x2="346" y2="332"/>
      <line x1="346" y1="332" x2="392" y2="232"/>
      <line x1="392" y1="232" x2="392" y2="384"/>
    </g>`;
}

// rounded=true → transparent rounded corners (Android "any" / favicon).
// rounded=false → full-bleed square (maskable + iOS apple-touch, no transparency).
function svg(rounded) {
  const rx = rounded ? 96 : 0;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
    <rect x="0" y="0" width="512" height="512" rx="${rx}" ry="${rx}" fill="${RED}"/>
    ${star(256, 150, 66, 27)}
    ${kim()}
  </svg>`;
}

const rounded = Buffer.from(svg(true));
const square = Buffer.from(svg(false));

const jobs = [
  ["icon.svg", null], // source, written separately below
  ["icon-192.png", { buf: rounded, size: 192 }],
  ["icon-512.png", { buf: rounded, size: 512 }],
  ["icon-512-maskable.png", { buf: square, size: 512 }],
  ["apple-touch-icon-180.png", { buf: square, size: 180 }],
  ["favicon-32.png", { buf: rounded, size: 32 }],
];

import { writeFileSync } from "node:fs";
writeFileSync(join(OUT, "icon.svg"), svg(true));

for (const [name, job] of jobs) {
  if (!job) continue;
  await sharp(job.buf, { density: 384 })
    .resize(job.size, job.size)
    .png()
    .toFile(join(OUT, name));
  console.log("wrote", join(OUT, name));
}
console.log("done");
