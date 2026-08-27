import { useEffect, useRef } from "react";
import maplibregl, { type GeoJSONSource, type Map as MapLibreMap } from "maplibre-gl";
import type { Feature, FeatureCollection, LineString, MultiLineString } from "geojson";
import type { Segment } from "../lib/schema";
import { REVILLA_BBOX } from "../lib/constants";

export const USGS_TOPO =
  "https://basemap.nationalmap.gov/arcgis/rest/services/USGSTopo/MapServer/tile/{z}/{y}/{x}";
export const USGS_IMAGERY =
  "https://basemap.nationalmap.gov/arcgis/rest/services/USGSImageryTopo/MapServer/tile/{z}/{y}/{x}";

const USGS_ATTR =
  "USGS The National Map — USGSTopo / USGSImageryTopo. Tile endpoints confirmed 2026-08-27 on basemap.nationalmap.gov.";

const SOURCE_ID = "trails";
const HIGHLIGHT_SOURCE = "trails-highlight";

export type BasemapId = "topo" | "imagery";
export type TrailFeature = Feature<LineString | MultiLineString, Segment>;
export type TrailCollection = FeatureCollection<LineString | MultiLineString, Segment>;

export interface UseTrailMapOptions {
  container: HTMLDivElement | null;
  network: TrailCollection | null;
  selectedId: string | null;
  filterIds: string[] | null;
  basemap: BasemapId;
  onSelect: (id: string | null) => void;
  enabled: boolean;
}

const STATUS_PAINT: Record<
  Segment["status"],
  { color: string; dash?: number[]; opacity: number }
> = {
  existing: { color: "#17211F", opacity: 1 },
  "needs-work": { color: "#17211F", opacity: 0.55 },
  "under-construction": { color: "#B4863C", dash: [2, 2], opacity: 1 },
  proposed: { color: "#E8467C", dash: [2, 2], opacity: 1 },
};

function boundsFor(feature: TrailFeature): maplibregl.LngLatBounds {
  const bounds = new maplibregl.LngLatBounds();
  const lines =
    feature.geometry.type === "LineString"
      ? [feature.geometry.coordinates]
      : feature.geometry.coordinates;
  for (const line of lines) {
    for (const coord of line) bounds.extend(coord as [number, number]);
  }
  return bounds;
}

function boundsForCollection(collection: TrailCollection): maplibregl.LngLatBounds | null {
  const bounds = new maplibregl.LngLatBounds();
  let extended = false;
  for (const feature of collection.features) {
    const lines =
      feature.geometry.type === "LineString"
        ? [feature.geometry.coordinates]
        : feature.geometry.coordinates;
    for (const line of lines) {
      for (const coord of line) {
        bounds.extend(coord as [number, number]);
        extended = true;
      }
    }
  }
  return extended ? bounds : null;
}

export function webglAvailable(): boolean {
  try {
    const canvas = document.createElement("canvas");
    const gl =
      canvas.getContext("webgl2") ||
      canvas.getContext("webgl") ||
      canvas.getContext("experimental-webgl");
    return Boolean(gl);
  } catch {
    return false;
  }
}

export function useTrailMap({
  container,
  network,
  selectedId,
  filterIds,
  basemap,
  onSelect,
  enabled,
}: UseTrailMapOptions) {
  const mapRef = useRef<MapLibreMap | null>(null);
  const onSelectRef = useRef(onSelect);
  onSelectRef.current = onSelect;
  const selectedIdRef = useRef(selectedId);
  selectedIdRef.current = selectedId;

  useEffect(() => {
    if (!enabled || !container || !network || mapRef.current) return;

    const map = new maplibregl.Map({
      container,
      style: {
        version: 8,
        glyphs: "https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf",
        sources: {
          "usgs-topo": {
            type: "raster",
            tiles: [USGS_TOPO],
            tileSize: 256,
            maxzoom: 16,
            attribution: USGS_ATTR,
          },
          "usgs-imagery": {
            type: "raster",
            tiles: [USGS_IMAGERY],
            tileSize: 256,
            maxzoom: 16,
            attribution: USGS_ATTR,
          },
          [SOURCE_ID]: { type: "geojson", data: network, promoteId: "id" },
          [HIGHLIGHT_SOURCE]: {
            type: "geojson",
            data: { type: "FeatureCollection", features: [] },
          },
        },
        layers: [
          {
            id: "basemap-topo",
            type: "raster",
            source: "usgs-topo",
          },
          {
            id: "basemap-imagery",
            type: "raster",
            source: "usgs-imagery",
            layout: { visibility: "none" },
          },
          {
            id: "trails-casing",
            type: "line",
            source: SOURCE_ID,
            paint: {
              "line-color": "#E7E4D9",
              "line-width": 5,
              "line-opacity": 0.7,
            },
          },
          {
            id: "trails-existing",
            type: "line",
            source: SOURCE_ID,
            filter: ["==", ["get", "status"], "existing"],
            paint: {
              "line-color": STATUS_PAINT.existing.color,
              "line-width": 3,
              "line-opacity": STATUS_PAINT.existing.opacity,
            },
          },
          {
            id: "trails-needs-work",
            type: "line",
            source: SOURCE_ID,
            filter: ["==", ["get", "status"], "needs-work"],
            paint: {
              "line-color": STATUS_PAINT["needs-work"].color,
              "line-width": 3,
              "line-opacity": STATUS_PAINT["needs-work"].opacity,
            },
          },
          {
            id: "trails-under-construction",
            type: "line",
            source: SOURCE_ID,
            filter: ["==", ["get", "status"], "under-construction"],
            paint: {
              "line-color": STATUS_PAINT["under-construction"].color,
              "line-width": 3,
              "line-dasharray": [2, 2],
            },
          },
          {
            id: "trails-proposed",
            type: "line",
            source: SOURCE_ID,
            filter: ["==", ["get", "status"], "proposed"],
            paint: {
              "line-color": STATUS_PAINT.proposed.color,
              "line-width": 3,
              "line-dasharray": [2, 2],
            },
          },
          {
            id: "trails-highlight",
            type: "line",
            source: HIGHLIGHT_SOURCE,
            paint: {
              "line-color": "#E8467C",
              "line-width": 6,
              "line-opacity": 0.35,
            },
          },
          {
            id: "trails-labels",
            type: "symbol",
            source: SOURCE_ID,
            minzoom: 12,
            layout: {
              "symbol-placement": "line",
              "text-field": ["get", "name"],
              "text-size": 11,
              "text-font": ["Open Sans Regular", "Arial Unicode MS Regular"],
              "text-max-angle": 40,
            },
            paint: {
              "text-color": "#17211F",
              "text-halo-color": "#E7E4D9",
              "text-halo-width": 1.4,
            },
          },
        ],
      },
      bounds: [
        [REVILLA_BBOX.west, REVILLA_BBOX.south],
        [REVILLA_BBOX.east, REVILLA_BBOX.north],
      ],
      fitBoundsOptions: { padding: 40 },
      attributionControl: true,
    });

    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-right");
    const resize = () => map.resize();
    map.on("load", () => {
      resize();
      requestAnimationFrame(resize);
      window.setTimeout(resize, 150);
      // Frame the trails themselves; the island bbox leaves the network tiny on wide viewports.
      if (!selectedIdRef.current) {
        const dataBounds = boundsForCollection(network);
        if (dataBounds) map.fitBounds(dataBounds, { padding: 48, duration: 0 });
      }
    });
    const observer = new ResizeObserver(resize);
    observer.observe(container);

    map.on("click", (event) => {
      const hits = map.queryRenderedFeatures(event.point, {
        layers: [
          "trails-existing",
          "trails-needs-work",
          "trails-under-construction",
          "trails-proposed",
        ],
      });
      const id = hits[0]?.properties?.id;
      onSelectRef.current(typeof id === "string" ? id : null);
    });

    map.on("mouseenter", "trails-existing", () => {
      map.getCanvas().style.cursor = "pointer";
    });
    for (const layer of [
      "trails-existing",
      "trails-needs-work",
      "trails-under-construction",
      "trails-proposed",
    ]) {
      map.on("mouseenter", layer, () => {
        map.getCanvas().style.cursor = "pointer";
      });
      map.on("mouseleave", layer, () => {
        map.getCanvas().style.cursor = "";
      });
    }

    mapRef.current = map;
    return () => {
      observer.disconnect();
      map.remove();
      mapRef.current = null;
    };
  }, [container, network, enabled]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !network) return;
    const apply = () => {
      const source = map.getSource(SOURCE_ID) as GeoJSONSource | undefined;
      source?.setData(network);
    };
    if (map.isStyleLoaded()) apply();
    else map.once("load", apply);
  }, [network]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map?.isStyleLoaded()) return;
    map.setLayoutProperty("basemap-topo", "visibility", basemap === "topo" ? "visible" : "none");
    map.setLayoutProperty(
      "basemap-imagery",
      "visibility",
      basemap === "imagery" ? "visible" : "none",
    );
  }, [basemap]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const apply = () => {
      const expression =
        filterIds == null
          ? true
          : filterIds.length === 0
            ? false
            : ["in", ["get", "id"], ["literal", filterIds]];
      for (const layer of [
        "trails-casing",
        "trails-existing",
        "trails-needs-work",
        "trails-under-construction",
        "trails-proposed",
        "trails-labels",
      ]) {
        if (!map.getLayer(layer)) continue;
        if (layer.startsWith("trails-") && layer !== "trails-casing" && layer !== "trails-labels") {
          const status = layer.replace("trails-", "") as Segment["status"];
          const statusFilter = ["==", ["get", "status"], status];
          map.setFilter(
            layer,
            filterIds == null ? statusFilter : ["all", statusFilter, expression],
          );
        } else {
          map.setFilter(layer, filterIds == null ? null : expression);
        }
      }
    };
    if (map.isStyleLoaded()) apply();
    else map.once("load", apply);
  }, [filterIds]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !network) return;
    const feature = network.features.find((f) => f.properties.id === selectedId) ?? null;
    const apply = () => {
      const source = map.getSource(HIGHLIGHT_SOURCE) as GeoJSONSource | undefined;
      source?.setData({
        type: "FeatureCollection",
        features: feature ? [feature] : [],
      });
      if (feature) {
        map.fitBounds(boundsFor(feature), { padding: 80, maxZoom: 13, duration: 600 });
      }
    };
    if (map.isStyleLoaded()) apply();
    else map.once("load", apply);
  }, [selectedId, network]);

  return mapRef;
}
