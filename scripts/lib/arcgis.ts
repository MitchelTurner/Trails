import { writeFile, mkdir } from "node:fs/promises";
import { dirname } from "node:path";
import type { FeatureCollection } from "geojson";
import { REVILLA_BBOX } from "../../src/lib/constants.ts";

export interface FetchLayerOptions {
  url: string;
  outPath: string;
  outFields?: string;
  pageSize?: number;
  name: string;
}

function bboxGeometry(): string {
  return `${REVILLA_BBOX.west},${REVILLA_BBOX.south},${REVILLA_BBOX.east},${REVILLA_BBOX.north}`;
}

export async function fetchArcgisLayer({
  url,
  outPath,
  outFields = "*",
  pageSize = 1000,
  name,
}: FetchLayerOptions): Promise<FeatureCollection> {
  const features: FeatureCollection["features"] = [];
  let offset = 0;
  let page = 0;

  while (true) {
    const params = new URLSearchParams({
      where: "1=1",
      geometry: bboxGeometry(),
      geometryType: "esriGeometryEnvelope",
      inSR: "4326",
      spatialRel: "esriSpatialRelIntersects",
      outFields,
      returnGeometry: "true",
      outSR: "4326",
      f: "geojson",
      resultOffset: String(offset),
      resultRecordCount: String(pageSize),
    });

    const endpoint = `${url.replace(/\/$/, "")}/query?${params.toString()}`;
    process.stdout.write(`  ${name}: page ${page + 1} (offset ${offset})… `);

    const response = await fetch(endpoint, {
      headers: { Accept: "application/geo+json, application/json" },
    });

    if (!response.ok) {
      throw new Error(`${name} HTTP ${response.status} ${response.statusText} — ${endpoint}`);
    }

    const body = (await response.json()) as FeatureCollection & {
      error?: { message?: string; details?: string[] };
      exceededTransferLimit?: boolean;
      properties?: { exceededTransferLimit?: boolean };
    };

    if (body.error) {
      throw new Error(
        `${name} ArcGIS error: ${body.error.message ?? "unknown"} ${(body.error.details ?? []).join(" ")}`,
      );
    }

    const batch = body.features ?? [];
    console.log(`${batch.length} features`);
    features.push(...batch);

    const exceeded =
      body.exceededTransferLimit === true || body.properties?.exceededTransferLimit === true;

    if (batch.length < pageSize && !exceeded) break;
    if (batch.length === 0) break;

    offset += batch.length;
    page += 1;
    if (page > 200) {
      throw new Error(`${name}: pagination exceeded 200 pages — check the query.`);
    }
  }

  const collection: FeatureCollection = {
    type: "FeatureCollection",
    features,
  };

  await mkdir(dirname(outPath), { recursive: true });
  await writeFile(outPath, `${JSON.stringify(collection)}\n`, "utf8");
  console.log(`  wrote ${features.length} features → ${outPath}`);
  return collection;
}
