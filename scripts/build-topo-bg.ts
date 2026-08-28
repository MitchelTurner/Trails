/**
 * Generate public/topo-bg.svg — a quiet quad-sheet contour field for the homepage hero.
 *
 * Not a map of anywhere. It is paper: contour hairlines with every fifth line drawn heavy,
 * the way an index contour reads on a USGS sheet. Deterministic, so the output only changes
 * when this file does. Run with `npm run topo`.
 */
import { mkdir, writeFile } from "node:fs/promises";

const W = 1600;
const H = 1000;
const LEVELS = 34;
const STEP = 7;

const INK = "#17211F";
const CONTOUR = "#A9A695";

/** Deterministic value noise: a fixed sum of sines. No RNG, no seed to lose. */
function field(x: number, y: number): number {
  return (
    58 * Math.sin(x / 520 + 0.6) +
    34 * Math.sin(x / 240 - y / 900 + 1.9) +
    22 * Math.sin(x / 130 + y / 420 + 3.4) +
    12 * Math.sin(x / 71 - 2.2) +
    46 * Math.sin((x + y) / 700 + 0.3) +
    -0.16 * y
  );
}

function contour(level: number): string {
  const points: string[] = [];
  for (let x = -40; x <= W + 40; x += STEP) {
    const y = level + field(x, level);
    points.push(`${x},${y.toFixed(1)}`);
  }
  return `M${points.join(" L")}`;
}

/** A closed knot or two, the way a summit reads as nested rings. */
function summit(cx: number, cy: number, rings: number, scale: number): string {
  const paths: string[] = [];
  for (let r = 1; r <= rings; r += 1) {
    const rx = r * scale;
    const ry = r * scale * 0.62;
    const points: string[] = [];
    for (let a = 0; a <= 360; a += 12) {
      const rad = (a * Math.PI) / 180;
      const wobble = 1 + 0.13 * Math.sin(a / 34 + r) + 0.07 * Math.sin(a / 11);
      const x = cx + Math.cos(rad) * rx * wobble;
      const y = cy + Math.sin(rad) * ry * wobble;
      points.push(`${x.toFixed(1)},${y.toFixed(1)}`);
    }
    const heavy = r % 5 === 0;
    paths.push(
      `<path d="M${points.join(" L")}Z" fill="none" stroke="${CONTOUR}" stroke-width="${heavy ? 1.6 : 0.8}" stroke-opacity="${heavy ? 0.62 : 0.4}"/>`,
    );
  }
  return paths.join("\n    ");
}

async function main() {
  const lines: string[] = [];
  for (let i = 0; i < LEVELS; i += 1) {
    const level = -120 + (i * (H + 260)) / LEVELS;
    const heavy = i % 5 === 0;
    lines.push(
      `<path d="${contour(level)}" fill="none" stroke="${CONTOUR}" stroke-width="${heavy ? 1.7 : 0.85}" stroke-opacity="${heavy ? 0.6 : 0.36}" stroke-linecap="round"/>`,
    );
  }

  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}"
  preserveAspectRatio="xMidYMid slice" role="presentation" aria-hidden="true">
  <rect width="${W}" height="${H}" fill="#E7E4D9"/>
  <g>
    ${lines.join("\n    ")}
  </g>
  <g>
    ${summit(1210, 250, 7, 26)}
    ${summit(330, 760, 5, 22)}
  </g>
  <g stroke="${INK}" stroke-opacity="0.16">
    ${Array.from({ length: 17 }, (_, i) => {
      const x = (i * W) / 16;
      return `<line x1="${x}" y1="0" x2="${x}" y2="14"/><line x1="${x}" y1="${H - 14}" x2="${x}" y2="${H}"/>`;
    }).join("\n    ")}
    ${Array.from({ length: 11 }, (_, i) => {
      const y = (i * H) / 10;
      return `<line x1="0" y1="${y}" x2="14" y2="${y}"/><line x1="${W - 14}" y1="${y}" x2="${W}" y2="${y}"/>`;
    }).join("\n    ")}
  </g>
</svg>
`;

  await mkdir("public", { recursive: true });
  await writeFile("public/topo-bg.svg", svg, "utf8");
  console.log(`Wrote public/topo-bg.svg (${(svg.length / 1024).toFixed(0)} KB)`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
