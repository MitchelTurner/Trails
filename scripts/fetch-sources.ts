/**
 * Pull public trail and ownership layers into data/raw/.
 * Run manually (`npm run data`). Nothing fetches at runtime.
 *
 * Endpoints checked 2026-08-27. Do not invent replacements — if a URL 404s,
 * leave it commented and record the date + what you searched.
 */
import { mkdir } from "node:fs/promises";
import { fetchArcgisLayer } from "./lib/arcgis.ts";

const RAW = "data/raw";

/**
 * Ketchikan Gateway Borough — public FeatureServer hosted for kgbgisadmin
 * (Sidwell Portico / KetchikanAKFeatures). Checked 2026-08-27 via
 * https://www.arcgis.com/sharing/rest/search?q=owner:kgbgisadmin
 *
 * Layers:
 *   0 Tax Parcels   — ownership / assessment (used)
 *   1 Easements
 *   2 Street Centerline
 *   8 Lakes
 *
 * There is no trails layer on this service. Borough recreation trails
 * (Rainbird, Married Man's, Schoenbar, Whitman, Refuge Cove) are not
 * published as a FeatureServer as of 2026-08-27. Hand-drawn municipal
 * alignments live in data/proposed/municipal-existing.geojson until
 * the borough publishes one. GIS Viewer: https://www.kgbak.us/432/GIS-Viewer
 */
const KGB_PARCELS =
  "https://services2.arcgis.com/65jtiGuzdaRB5FxF/arcgis/rest/services/KetchikanAKFeatures/FeatureServer/0";

/**
 * USFS National Forest System Trails — FSGeodata / EDW.
 * Layer: Trans_Trail_NFS_Publish. Checked 2026-08-27.
 * https://apps.fs.usda.gov/arcx/rest/services/EDW/EDW_TrailNFSPublish_01/MapServer/0
 */
const USFS_TRAILS =
  "https://apps.fs.usda.gov/arcx/rest/services/EDW/EDW_TrailNFSPublish_01/MapServer/0";

/**
 * USFS Basic Ownership (dissolved by owner classification).
 * Checked 2026-08-27. The GeoJSON query returned HTTP 500 that day;
 * DNR + KGB parcels still cover land-manager intersection. Retry later.
 * https://apps.fs.usda.gov/arcx/rest/services/EDW/EDW_BasicOwnership_01/MapServer/0
 */
const USFS_OWNERSHIP =
  "https://apps.fs.usda.gov/arcx/rest/services/EDW/EDW_BasicOwnership_01/MapServer/0";

/**
 * Alaska DNR Mapper ownership layers. Checked 2026-08-27.
 * https://arcgis.dnr.alaska.gov/arcgis/rest/services/Mapper/Ownership_Layers/FeatureServer
 *   6  Mental Health Trust Land Poly
 *   7  Municipal Entitlement Poly
 *  13  State TA Patented All Poly
 */
const DNR_MHT =
  "https://arcgis.dnr.alaska.gov/arcgis/rest/services/Mapper/Ownership_Layers/FeatureServer/6";
const DNR_MUNICIPAL =
  "https://arcgis.dnr.alaska.gov/arcgis/rest/services/Mapper/Ownership_Layers/FeatureServer/7";
const DNR_STATE_TA =
  "https://arcgis.dnr.alaska.gov/arcgis/rest/services/Mapper/Ownership_Layers/FeatureServer/13";

async function main() {
  await mkdir(RAW, { recursive: true });
  console.log("Fetching source layers (Revilla bbox). Checked 2026-08-27.\n");

  const jobs: Array<Promise<unknown>> = [
    fetchArcgisLayer({
      name: "USFS NFS Trails",
      url: USFS_TRAILS,
      outPath: `${RAW}/usfs-trails.geojson`,
      outFields:
        "TRAIL_NAME,TRAIL_NO,TRAIL_CN,TRAIL_SURFACE,TRAIL_CLASS,GIS_MILES,ADMIN_ORG,MANAGING_ORG,ATTRIBUTESUBSET",
    }),
    fetchArcgisLayer({
      name: "USFS Basic Ownership",
      url: USFS_OWNERSHIP,
      outPath: `${RAW}/usfs-ownership.geojson`,
      outFields: "OWNERCLASSIFICATION,FORESTNAME",
    }),
    fetchArcgisLayer({
      name: "DNR Mental Health Trust",
      url: DNR_MHT,
      outPath: `${RAW}/dnr-mht.geojson`,
    }),
    fetchArcgisLayer({
      name: "DNR Municipal Entitlement",
      url: DNR_MUNICIPAL,
      outPath: `${RAW}/dnr-municipal.geojson`,
    }),
    fetchArcgisLayer({
      name: "DNR State TA Patented",
      url: DNR_STATE_TA,
      outPath: `${RAW}/dnr-state.geojson`,
    }),
    fetchArcgisLayer({
      name: "KGB Tax Parcels",
      url: KGB_PARCELS,
      outPath: `${RAW}/kgb-parcels.geojson`,
      outFields: "Owner_Name,Prop_Type,Exempt_1,CITY",
      pageSize: 1000,
    }),
  ];

  const results = await Promise.allSettled(jobs);
  let failed = 0;
  for (const result of results) {
    if (result.status === "rejected") {
      failed += 1;
      console.error(`\nFAILED: ${result.reason instanceof Error ? result.reason.message : result.reason}`);
    }
  }

  if (failed === results.length) {
    throw new Error("Every source layer failed. Check network / endpoint status.");
  }
  if (failed) {
    console.warn(`\n${failed} layer(s) failed. build-network.ts will use whatever landed in data/raw/.`);
  } else {
    console.log("\nAll source layers written to data/raw/.");
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
