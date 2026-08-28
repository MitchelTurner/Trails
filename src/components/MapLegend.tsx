import { useState } from "react";
import type { SegmentStatus } from "../lib/schema";

const ROWS: Array<{
  status: SegmentStatus;
  label: string;
  dash: boolean;
  color: string;
  opacity: number;
}> = [
  { status: "existing", label: "Existing", dash: false, color: "#17211F", opacity: 1 },
  { status: "needs-work", label: "Needs work", dash: false, color: "#17211F", opacity: 0.55 },
  {
    status: "under-construction",
    label: "Under construction",
    dash: true,
    color: "#B4863C",
    opacity: 1,
  },
  {
    status: "proposed",
    label: "Proposed — not surveyed",
    dash: true,
    color: "#E8467C",
    opacity: 1,
  },
];

/** Only advertise statuses the data actually uses. */
export function MapLegend({ statuses }: { statuses?: SegmentStatus[] }) {
  const [open, setOpen] = useState(true);
  const rows = statuses?.length ? ROWS.filter((row) => statuses.includes(row.status)) : ROWS;
  if (rows.length === 0) return null;

  return (
    <div className="pointer-events-auto border border-contour/80 bg-sheet/92 backdrop-blur-sm">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        className="flex min-h-9 w-full items-center justify-between gap-6 px-3 font-mono text-[10px] uppercase tracking-[0.14em] text-tide hover:text-ink"
      >
        Legend
        <span aria-hidden>{open ? "–" : "+"}</span>
      </button>
      {open ? (
        <ul className="space-y-1.5 border-t border-contour/60 px-3 py-2.5">
          {rows.map((row) => (
            <li key={row.label} className="flex items-center gap-2.5">
              <svg width="30" height="4" viewBox="0 0 30 4" aria-hidden="true" className="shrink-0">
                <line
                  x1="0"
                  y1="2"
                  x2="30"
                  y2="2"
                  stroke={row.color}
                  strokeOpacity={row.opacity}
                  strokeWidth="3"
                  strokeDasharray={row.dash ? "6 5" : undefined}
                />
              </svg>
              <span className="font-mono text-[10px] uppercase tracking-[0.1em] text-ink">
                {row.label}
              </span>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
