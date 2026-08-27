import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import "maplibre-gl/dist/maplibre-gl.css";
import { loadNetworkClient } from "./map/loadNetwork";
import { SegmentPanel } from "./SegmentPanel";
import { useTrailMap, webglAvailable, type BasemapId, type TrailCollection } from "../hooks/useTrailMap";
import type { Corridor, Segment } from "../lib/schema";

interface TrailMapProps {
  initialSegmentId?: string | null;
  urlSync?: boolean;
  filterIds?: string[] | null;
  corridors?: Corridor[];
  className?: string;
}

function segmentFrom(
  network: TrailCollection | null,
  id: string | null,
): Segment | null {
  if (!network || !id) return null;
  return network.features.find((feature) => feature.properties.id === id)?.properties ?? null;
}

export default function TrailMap({
  initialSegmentId = null,
  urlSync = false,
  filterIds = null,
  corridors = [],
  className = "",
}: TrailMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [network, setNetwork] = useState<TrailCollection | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(initialSegmentId);
  const [basemap, setBasemap] = useState<BasemapId>("topo");
  const [gl, setGl] = useState<boolean | null>(null);
  const [cursor, setCursor] = useState(0);

  useEffect(() => {
    setGl(webglAvailable());
    loadNetworkClient().then(setNetwork).catch(() => setNetwork(null));
  }, []);

  useEffect(() => {
    setSelectedId(initialSegmentId);
  }, [initialSegmentId]);

  const visibleIds = useMemo(() => {
    if (!network) return [];
    const all = network.features.map((feature) => feature.properties.id);
    if (filterIds == null) return all;
    return all.filter((id) => filterIds.includes(id));
  }, [network, filterIds]);

  const select = useCallback(
    (id: string | null) => {
      setSelectedId(id);
      if (!urlSync || typeof window === "undefined") return;
      const next = id ? `/network/${id}` : "/network";
      if (window.location.pathname !== next) {
        window.history.pushState({ segmentId: id }, "", next);
      }
    },
    [urlSync],
  );

  useEffect(() => {
    if (!urlSync) return;
    const onPop = (event: PopStateEvent) => {
      const fromState = (event.state as { segmentId?: string | null } | null)?.segmentId;
      if (fromState !== undefined) {
        setSelectedId(fromState);
        return;
      }
      const match = window.location.pathname.match(/^\/network\/([^/]+)/);
      setSelectedId(match ? decodeURIComponent(match[1]) : null);
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, [urlSync]);

  useTrailMap({
    container: containerRef.current,
    network,
    selectedId,
    filterIds,
    basemap,
    onSelect: select,
    enabled: gl === true,
  });

  const selected = segmentFrom(network, selectedId);
  const corridor = selected
    ? corridors.find((item) => item.id === selected.corridorId) ?? null
    : null;

  const onKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (!visibleIds.length) return;
    if (event.key === "Tab") {
      event.preventDefault();
      const next = event.shiftKey
        ? (cursor - 1 + visibleIds.length) % visibleIds.length
        : (cursor + 1) % visibleIds.length;
      setCursor(next);
    }
    if (event.key === "Enter") {
      event.preventDefault();
      select(visibleIds[cursor] ?? null);
    }
    if (event.key === "Escape") {
      select(null);
    }
  };

  if (gl === false) {
    return (
      <div className={`flex h-full min-h-[28rem] flex-col items-center justify-center bg-sheet p-6 ${className}`}>
        <img
          src="/data/network-static.svg"
          alt="Static map of the Revilla trail network"
          className="max-h-[28rem] w-full object-contain"
        />
        <p className="mt-4 max-w-md text-center text-sm text-tide">
          This browser cannot draw the interactive map. The same network is in the list.
        </p>
        <a
          href="/network?view=list"
          className="mt-3 font-mono text-[12px] uppercase tracking-wider text-flagging underline underline-offset-4"
        >
          Open the list view
        </a>
      </div>
    );
  }

  return (
    <div className={`relative h-full min-h-[28rem] overflow-hidden bg-contour/20 ${className}`}>
      <div
        ref={containerRef}
        tabIndex={0}
        onKeyDown={onKeyDown}
        className="absolute inset-0"
        role="application"
        aria-label="Interactive trail network map. Tab cycles segments, Enter selects."
      />
      <div className="absolute left-3 top-3 z-10 flex gap-1 border border-contour bg-sheet/95 p-1 font-mono text-[11px] uppercase tracking-wider">
        <button
          type="button"
          className={`px-2 py-1 ${basemap === "topo" ? "bg-ink text-sheet" : "text-tide"}`}
          onClick={() => setBasemap("topo")}
        >
          Topo
        </button>
        <button
          type="button"
          className={`px-2 py-1 ${basemap === "imagery" ? "bg-ink text-sheet" : "text-tide"}`}
          onClick={() => setBasemap("imagery")}
        >
          Imagery
        </button>
      </div>
      {visibleIds[cursor] && !selectedId ? (
        <p className="pointer-events-none absolute bottom-3 left-3 z-10 border border-contour bg-sheet/95 px-2 py-1 font-mono text-[11px] uppercase tracking-wider text-tide">
          Focused: {network?.features.find((f) => f.properties.id === visibleIds[cursor])?.properties.name}
        </p>
      ) : null}
      <SegmentPanel segment={selected} corridor={corridor} onClose={() => select(null)} />
    </div>
  );
}
