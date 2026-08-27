import { useMemo, useState } from "react";
import TrailMap from "./TrailMap";
import NetworkList from "./NetworkList";
import type { Corridor, Segment } from "../lib/schema";
import { formatStatus } from "../lib/format";

interface NetworkExplorerProps {
  segments: Segment[];
  corridors: Corridor[];
  landManagers: string[];
  initialView?: "map" | "list";
  initialCorridor?: string | null;
  initialSegmentId?: string | null;
}

export default function NetworkExplorer({
  segments,
  corridors,
  landManagers,
  initialView = "map",
  initialCorridor = null,
  initialSegmentId = null,
}: NetworkExplorerProps) {
  const [view, setView] = useState<"map" | "list">(initialView);
  const [status, setStatus] = useState("");
  const [manager, setManager] = useState("");
  const [corridorId, setCorridorId] = useState(initialCorridor ?? "");

  const filteredIds = useMemo(() => {
    return segments
      .filter((segment) => {
        if (status && segment.status !== status) return false;
        if (manager && !segment.landManagers.includes(manager)) return false;
        if (corridorId && segment.corridorId !== corridorId) return false;
        return true;
      })
      .map((segment) => segment.id);
  }, [segments, status, manager, corridorId]);

  const activeFilters = Boolean(status || manager || corridorId);

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-3 border-b border-contour/70 pb-4">
        <div className="flex flex-wrap gap-3">
          <label className="flex flex-col gap-1 font-mono text-[11px] uppercase tracking-wider text-tide">
            Status
            <select
              value={status}
              onChange={(event) => setStatus(event.target.value)}
              className="border border-contour bg-sheet px-2 py-2 font-body text-sm"
            >
              <option value="">All</option>
              {(["existing", "needs-work", "under-construction", "proposed"] as const).map((value) => (
                <option key={value} value={value}>
                  {formatStatus(value)}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 font-mono text-[11px] uppercase tracking-wider text-tide">
            Land manager
            <select
              value={manager}
              onChange={(event) => setManager(event.target.value)}
              className="min-w-52 border border-contour bg-sheet px-2 py-2 font-body text-sm"
            >
              <option value="">All</option>
              {landManagers.map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 font-mono text-[11px] uppercase tracking-wider text-tide">
            Corridor
            <select
              value={corridorId}
              onChange={(event) => setCorridorId(event.target.value)}
              className="min-w-52 border border-contour bg-sheet px-2 py-2 font-body text-sm"
            >
              <option value="">All</option>
              {corridors.map((corridor) => (
                <option key={corridor.id} value={corridor.id}>
                  {corridor.name}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div className="flex border border-contour font-mono text-[11px] uppercase tracking-wider">
          <button
            type="button"
            className={`px-3 py-2 ${view === "map" ? "bg-ink text-sheet" : "text-tide"}`}
            onClick={() => setView("map")}
          >
            Map
          </button>
          <button
            type="button"
            className={`px-3 py-2 ${view === "list" ? "bg-ink text-sheet" : "text-tide"}`}
            onClick={() => setView("list")}
          >
            List
          </button>
        </div>
      </div>

      {view === "map" ? (
        <div className="mt-4 h-[min(72vh,44rem)] border border-contour/70">
          <TrailMap
            urlSync
            initialSegmentId={initialSegmentId}
            filterIds={activeFilters ? filteredIds : null}
            corridors={corridors}
          />
        </div>
      ) : (
        <div className="mt-6">
          <NetworkList
            segments={segments}
            landManagers={landManagers}
            statuses={["existing", "needs-work", "under-construction", "proposed"]}
            initialStatus={status || null}
            initialManager={manager || null}
            initialCorridor={corridorId || null}
          />
        </div>
      )}
    </div>
  );
}
