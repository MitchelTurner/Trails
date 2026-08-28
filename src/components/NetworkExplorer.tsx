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

const STATUSES = ["existing", "needs-work", "under-construction", "proposed"] as const;

const SELECT =
  "min-h-11 w-full appearance-none border border-contour bg-sheet px-3 pr-8 font-body text-sm text-ink";
const LABEL = "flex flex-col gap-1.5 font-mono text-[10px] uppercase tracking-[0.14em] text-tide";

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

  const filtered = useMemo(
    () =>
      segments.filter((segment) => {
        if (status && segment.status !== status) return false;
        if (manager && !segment.landManagers.includes(manager)) return false;
        if (corridorId && segment.corridorId !== corridorId) return false;
        return true;
      }),
    [segments, status, manager, corridorId],
  );

  const filteredIds = useMemo(() => filtered.map((segment) => segment.id), [filtered]);
  const activeFilters = Boolean(status || manager || corridorId);
  const miles = filtered.reduce((sum, segment) => sum + segment.lengthMi, 0);

  const clearAll = () => {
    setStatus("");
    setManager("");
    setCorridorId("");
  };

  return (
    <div>
      <div className="sticky top-16 z-30 -mx-5 border-y border-contour/60 bg-sheet/95 px-5 py-4 backdrop-blur-md md:-mx-8 md:px-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="grid flex-1 gap-3 sm:grid-cols-3 lg:max-w-3xl">
            <label className={LABEL}>
              Status
              <select
                value={status}
                onChange={(event) => setStatus(event.target.value)}
                className={SELECT}
              >
                <option value="">All statuses</option>
                {STATUSES.map((value) => (
                  <option key={value} value={value}>
                    {formatStatus(value)}
                  </option>
                ))}
              </select>
            </label>
            <label className={LABEL}>
              Land manager
              <select
                value={manager}
                onChange={(event) => setManager(event.target.value)}
                className={SELECT}
              >
                <option value="">All managers</option>
                {landManagers.map((value) => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ))}
              </select>
            </label>
            <label className={LABEL}>
              Corridor
              <select
                value={corridorId}
                onChange={(event) => setCorridorId(event.target.value)}
                className={SELECT}
              >
                <option value="">All corridors</option>
                {corridors.map((corridor) => (
                  <option key={corridor.id} value={corridor.id}>
                    {corridor.name}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div
            role="group"
            aria-label="View"
            className="flex shrink-0 overflow-hidden rounded-full border border-contour p-1"
          >
            {(["map", "list"] as const).map((option) => (
              <button
                key={option}
                type="button"
                aria-pressed={view === option}
                className={`min-h-9 rounded-full px-5 font-mono text-[10px] uppercase tracking-[0.14em] transition-colors ${
                  view === option ? "bg-ink text-sheet" : "text-tide hover:text-ink"
                }`}
                onClick={() => setView(option)}
              >
                {option}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-3">
          <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink">
            {filtered.length} of {segments.length} segments · {miles.toFixed(1)} mi
          </p>
          {activeFilters ? (
            <button
              type="button"
              onClick={clearAll}
              className="flex min-h-8 items-center font-mono text-[10px] uppercase tracking-[0.14em] text-tide underline decoration-flagging underline-offset-4 hover:text-ink"
            >
              Clear filters
            </button>
          ) : null}
        </div>
      </div>

      {view === "map" ? (
        <div className="mt-6 h-[min(72vh,44rem)] border border-contour/70">
          <TrailMap
            urlSync
            initialSegmentId={initialSegmentId}
            filterIds={activeFilters ? filteredIds : null}
            corridors={corridors}
          />
        </div>
      ) : (
        <div className="mt-8">
          <NetworkList
            segments={segments}
            landManagers={landManagers}
            statuses={[...STATUSES]}
            initialStatus={status || null}
            initialManager={manager || null}
            initialCorridor={corridorId || null}
          />
        </div>
      )}
    </div>
  );
}
