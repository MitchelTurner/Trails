import { useCallback, useEffect, useMemo, useState } from "react";
import "maplibre-gl/dist/maplibre-gl.css";
import { loadNetworkClient } from "./map/loadNetwork";
import { SegmentPanel } from "./SegmentPanel";
import { MapLegend } from "./MapLegend";
import { useTrailMap, webglAvailable, type BasemapId, type TrailCollection } from "../hooks/useTrailMap";
import type { Corridor, Segment } from "../lib/schema";

interface TrailMapProps {
  initialSegmentId?: string | null;
  urlSync?: boolean;
  filterIds?: string[] | null;
  corridors?: Corridor[];
  className?: string;
  showLegend?: boolean;
  /** Segment pages already show the detail in the page, so the panel starts closed there. */
  openPanelForInitial?: boolean;
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
  showLegend = true,
  openPanelForInitial = true,
}: TrailMapProps) {
  const [container, setContainer] = useState<HTMLDivElement | null>(null);
  const [network, setNetwork] = useState<TrailCollection | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(initialSegmentId);
  const [basemap, setBasemap] = useState<BasemapId>("topo");
  const [gl, setGl] = useState<boolean | null>(null);
  const [cursor, setCursor] = useState(0);
  const [keyboardActive, setKeyboardActive] = useState(false);
  const [panelOpen, setPanelOpen] = useState(Boolean(initialSegmentId) && openPanelForInitial);

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
      setPanelOpen(Boolean(id));
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
    container,
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
          className="mt-3 font-mono text-[12px] uppercase tracking-wider text-ink underline decoration-flagging underline-offset-4"
        >
          Open the list view
        </a>
      </div>
    );
  }

  return (
    <div className={`relative h-full min-h-[28rem] overflow-hidden bg-contour/20 ${className}`}>
      {/* Sized with h/w, not inset: maplibre-gl.css forces position:relative on .maplibregl-map. */}
      <div
        ref={setContainer}
        tabIndex={0}
        onKeyDown={onKeyDown}
        onFocus={() => setKeyboardActive(true)}
        onBlur={() => setKeyboardActive(false)}
        className="h-full w-full"
        role="application"
        aria-label="Interactive trail network map. Tab cycles segments, Enter selects."
      />
      {/* Left column only: maplibre owns top-right (nav, fullscreen, geolocate). */}
      <div className="pointer-events-none absolute left-3 top-3 z-10 flex max-w-[calc(100%-5rem)] flex-col items-start gap-2">
        <div
          role="group"
          aria-label="Basemap"
          className="pointer-events-auto flex overflow-hidden rounded-full border border-contour/80 bg-sheet/92 p-1 backdrop-blur-sm"
        >
          {(["topo", "imagery"] as const).map((option) => (
            <button
              key={option}
              type="button"
              aria-pressed={basemap === option}
              className={`min-h-9 rounded-full px-4 font-mono text-[10px] uppercase tracking-[0.14em] transition-colors ${
                basemap === option ? "bg-ink text-sheet" : "text-tide hover:text-ink"
              }`}
              onClick={() => setBasemap(option)}
            >
              {option === "topo" ? "Topo" : "Imagery"}
            </button>
          ))}
        </div>
        {showLegend ? (
          <div className="hidden sm:block">
            <MapLegend />
          </div>
        ) : null}
      </div>
      {keyboardActive && visibleIds[cursor] && !selectedId ? (
        <p className="pointer-events-none absolute bottom-16 left-3 z-10 border border-contour bg-sheet/95 px-2 py-1 font-mono text-[10px] uppercase tracking-[0.12em] text-ink">
          Focused: {network?.features.find((f) => f.properties.id === visibleIds[cursor])?.properties.name}
        </p>
      ) : null}
      <SegmentPanel
        segment={panelOpen ? selected : null}
        corridor={corridor}
        onClose={() => select(null)}
      />
    </div>
  );
}
