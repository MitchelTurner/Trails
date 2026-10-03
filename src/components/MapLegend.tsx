import { useState } from "react";
import type { SegmentStatus } from "../lib/schema";

const ROWS: Array<{
  status: SegmentStatus;
  label: string;
  note?: string;
  dash: boolean;
  color: string;
  opacity: number;
}> = [
  {
    status: "existing",
    label: "Existing",
    note: "Walk it this weekend",
    dash: false,
    color: "#24344F",
    opacity: 1,
  },
  {
    status: "needs-work",
    label: "Needs work",
    note: "There, but the alders won",
    dash: false,
    color: "#24344F",
    opacity: 0.55,
  },
  {
    status: "under-construction",
    label: "Under construction",
    dash: true,
    color: "#A86A32",
    opacity: 1,
  },
  {
    status: "proposed",
    label: "Proposed",
    note: "Not cut, not surveyed",
    dash: true,
    color: "#D47C1F",
    opacity: 1,
  },
];

const LINE_NOTE = "Status is in the line, not just the color.";

function LegendRows({ rows }: { rows: typeof ROWS }) {
  return (
    <>
      <p className="px-3 pt-2.5 font-mono text-[10px] uppercase leading-relaxed tracking-[0.12em] text-tide">
        {LINE_NOTE}
      </p>
      <ul className="space-y-2 px-3 py-2.5">
        {rows.map((row) => (
          <li key={row.status} className="flex items-center gap-2.5">
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
            <span className="min-w-0">
              <span className="block font-mono text-[10px] uppercase tracking-[0.1em] text-ink">
                {row.label}
              </span>
              {row.note ? (
                <span className="block font-mono text-[10px] uppercase tracking-[0.08em] text-tide">
                  {row.note}
                </span>
              ) : null}
            </span>
          </li>
        ))}
      </ul>
    </>
  );
}

/** Only advertise statuses the data actually uses. */
export function MapLegend({
  statuses,
  collapsible = true,
}: {
  statuses?: SegmentStatus[];
  /** Map overlay keeps its own toggle. The mobile "How to read the map" control supplies one. */
  collapsible?: boolean;
}) {
  const [open, setOpen] = useState(true);
  const rows = statuses?.length ? ROWS.filter((row) => statuses.includes(row.status)) : ROWS;
  if (rows.length === 0) return null;

  if (!collapsible) {
    return (
      <div className="pointer-events-auto bg-sheet">
        <LegendRows rows={rows} />
      </div>
    );
  }

  return (
    <div className="pointer-events-auto border border-contour/80 bg-sheet/92 backdrop-blur-sm">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        className="flex min-h-11 w-full items-center justify-between gap-6 px-3 font-mono text-[10px] uppercase tracking-[0.14em] text-tide hover:text-ink"
      >
        Legend
        <span aria-hidden>{open ? "–" : "+"}</span>
      </button>
      {open ? (
        <div className="border-t border-contour/60">
          <LegendRows rows={rows} />
        </div>
      ) : null}
    </div>
  );
}
