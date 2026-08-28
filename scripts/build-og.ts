/**
 * Render Open Graph cards to public/og/. Shared links are how this map travels between a
 * borough packet and a Forest Service inbox, so each card carries the segment's name,
 * status, mileage, land managers, and its own shape.
 *
 * Run with `npm run og` after `npm run data`. Output is committed.
 */
import { mkdir, writeFile } from "node:fs/promises";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import sharp from "sharp";
import type { Position } from "geojson";
import { CorridorList, NetworkCollection, type Segment } from "../src/lib/schema.ts";
import { site } from "../src/config/site.ts";

const OUT_DIR = "public/og";
const W = 1200;
const H = 630;

const INK = "#17211F";
const SHEET = "#E7E4D9";
const TIDE = "#24404A";
const FLAGGING = "#E8467C";
const MUSKEG = "#B4863C";

const read = (relative: string) =>
  JSON.parse(readFileSync(resolve(process.cwd(), relative), "utf8"));

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function statusColor(status: Segment["status"]): string {
  if (status === "proposed") return FLAGGING;
  if (status === "under-construction") return MUSKEG;
  return INK;
}

function statusDash(status: Segment["status"]): string {
  return status === "proposed" || status === "under-construction" ? "10 8" : "none";
}

/** Fit the segment's own geometry into the card's right side. */
function shapePath(lines: Position[][], box: { x: number; y: number; w: number; h: number }) {
  const all = lines.flat();
  if (all.length < 2) return "";
  const xs = all.map((p) => p[0]);
  const ys = all.map((p) => p[1]);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  const spanX = maxX - minX || 1e-6;
  const spanY = maxY - minY || 1e-6;
  // Keep aspect: latitude degrees are longer than longitude degrees at 55°N.
  const latScale = Math.cos((((minY + maxY) / 2) * Math.PI) / 180);
  const scale = Math.min(box.w / (spanX * latScale), box.h / spanY);
  const offsetX = box.x + (box.w - spanX * latScale * scale) / 2;
  const offsetY = box.y + (box.h - spanY * scale) / 2;

  return lines
    .filter((line) => line.length >= 2)
    .map((line) =>
      line
        .map((position, index) => {
          const x = offsetX + (position[0] - minX) * latScale * scale;
          const y = offsetY + (maxY - position[1]) * scale;
          return `${index === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
        })
        .join(" "),
    )
    .join(" ");
}

function wrap(text: string, maxChars: number, maxLines: number): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    if (!current) current = word;
    else if (`${current} ${word}`.length <= maxChars) current += ` ${word}`;
    else {
      lines.push(current);
      current = word;
      if (lines.length === maxLines) break;
    }
  }
  if (current && lines.length < maxLines) lines.push(current);
  return lines;
}

function card(options: {
  eyebrow: string;
  title: string;
  facts: string[];
  chips: string[];
  accent: string;
  dash: string;
  path: string;
  note?: string;
}): string {
  const titleLines = wrap(options.title, 22, 3);
  const titleSize = titleLines.length > 2 ? 66 : 82;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <rect width="${W}" height="${H}" fill="${SHEET}"/>
  <rect x="0" y="0" width="${W}" height="10" fill="${options.accent}"/>

  <g opacity="0.5">
    <path d="${options.path}" fill="none" stroke="${options.accent}" stroke-width="7"
      stroke-dasharray="${options.dash}" stroke-linecap="round" stroke-linejoin="round"/>
  </g>

  <text x="64" y="106" font-family="IBM Plex Mono, DejaVu Sans Mono, monospace" font-size="20"
    letter-spacing="4" fill="${TIDE}">${escapeXml(options.eyebrow.toUpperCase())}</text>

  ${titleLines
    .map(
      (line, index) =>
        `<text x="64" y="${196 + index * (titleSize + 8)}" font-family="Archivo, DejaVu Sans, sans-serif" font-size="${titleSize}" font-weight="700" fill="${INK}">${escapeXml(line)}</text>`,
    )
    .join("\n  ")}

  <text x="64" y="${H - 132}" font-family="IBM Plex Mono, DejaVu Sans Mono, monospace" font-size="24"
    fill="${INK}">${escapeXml(options.facts.join("   ·   "))}</text>

  ${options.chips
    .slice(0, 3)
    .map(
      (chip, index) =>
        `<text x="64" y="${H - 92 + index * 30}" font-family="IBM Plex Mono, DejaVu Sans Mono, monospace" font-size="19" letter-spacing="2" fill="${TIDE}">${escapeXml(chip.toUpperCase())}</text>`,
    )
    .join("\n  ")}

  ${
    options.note
      ? `<text x="${W - 64}" y="${H - 40}" text-anchor="end" font-family="IBM Plex Mono, DejaVu Sans Mono, monospace" font-size="19" letter-spacing="2" fill="${FLAGGING}">${escapeXml(options.note.toUpperCase())}</text>`
      : ""
  }
  <text x="${W - 64}" y="106" text-anchor="end" font-family="Archivo, DejaVu Sans, sans-serif"
    font-size="26" font-weight="700" fill="${INK}">${escapeXml(site.name)}</text>
</svg>`;
}

async function render(name: string, svg: string) {
  const png = await sharp(Buffer.from(svg)).png({ compressionLevel: 9 }).toBuffer();
  await writeFile(`${OUT_DIR}/${name}.png`, png);
}

async function main() {
  await mkdir(OUT_DIR, { recursive: true });

  const network = NetworkCollection.parse(read("public/data/network.geojson"));
  const corridors = CorridorList.parse(read("public/data/corridors.json"));

  const totalMi = network.features.reduce((sum, f) => sum + f.properties.lengthMi, 0);
  const gapMi = network.features
    .filter((f) => f.properties.status === "proposed")
    .reduce((sum, f) => sum + f.properties.lengthMi, 0);

  // Whole-network default card.
  const allLines = network.features.flatMap((feature) =>
    feature.geometry.type === "LineString"
      ? [feature.geometry.coordinates as Position[]]
      : (feature.geometry.coordinates as Position[][]),
  );
  await render(
    "default",
    card({
      eyebrow: "Revillagigedo Island · Alaska",
      title: site.tagline,
      facts: [
        `${(totalMi - gapMi).toFixed(0)} mi built`,
        `${gapMi.toFixed(0)} mi gap`,
        `${network.features.length} segments`,
      ],
      chips: ["Existing and proposed trails, with land ownership attached"],
      accent: FLAGGING,
      dash: "none",
      path: shapePath(allLines, { x: 560, y: 120, w: 560, h: 380 }),
    }),
  );

  for (const feature of network.features) {
    const segment = feature.properties;
    const lines =
      feature.geometry.type === "LineString"
        ? [feature.geometry.coordinates as Position[]]
        : (feature.geometry.coordinates as Position[][]);

    await render(
      `segment-${segment.id}`,
      card({
        eyebrow: segment.status.replace("-", " "),
        title: segment.name,
        facts: [
          `${segment.lengthMi.toFixed(1)} mi`,
          segment.elevationGainFt != null ? `${segment.elevationGainFt} ft gain` : "elevation n/a",
          segment.surface,
        ],
        chips: segment.landManagers,
        accent: statusColor(segment.status),
        dash: statusDash(segment.status),
        path: shapePath(lines, { x: 640, y: 150, w: 480, h: 320 }),
        note: segment.sourceRef === "hand-drawn-concept" ? "Not surveyed" : undefined,
      }),
    );
  }

  const byId = new Map(network.features.map((f) => [f.properties.id, f]));
  for (const corridor of corridors) {
    const lines = corridor.segmentIds.flatMap((id) => {
      const feature = byId.get(id);
      if (!feature) return [];
      return feature.geometry.type === "LineString"
        ? [feature.geometry.coordinates as Position[]]
        : (feature.geometry.coordinates as Position[][]);
    });
    await render(
      `corridor-${corridor.id}`,
      card({
        eyebrow: "Priority corridor",
        title: corridor.name,
        facts: [
          `${corridor.existingMi.toFixed(1)} of ${corridor.totalMi.toFixed(1)} mi connected`,
          `${corridor.percentComplete.toFixed(0)}%`,
        ],
        chips: [`${corridor.gapMi.toFixed(1)} mi still unbuilt`],
        accent: FLAGGING,
        dash: "none",
        path: shapePath(lines, { x: 620, y: 150, w: 500, h: 320 }),
      }),
    );
  }

  console.log(
    `Wrote ${network.features.length + corridors.length + 1} Open Graph cards → ${OUT_DIR}/`,
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
