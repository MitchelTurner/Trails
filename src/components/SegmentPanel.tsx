import type { Corridor, Segment } from "../lib/schema";
import { formatElevation, formatMiles, formatSurface, isConceptual } from "../lib/format";
import { StatusChip } from "./StatusChip";

interface SegmentPanelProps {
  segment: Segment | null;
  corridor?: Corridor | null;
  onClose: () => void;
}

export function SegmentPanel({ segment, corridor, onClose }: SegmentPanelProps) {
  return (
    <aside
      className={`absolute inset-y-0 right-0 z-20 flex w-full max-w-md flex-col border-l border-contour/60 bg-sheet shadow-[-12px_0_32px_rgba(23,33,31,0.12)] transition-transform duration-200 ${
        segment ? "translate-x-0" : "translate-x-full"
      }`}
      aria-hidden={!segment}
    >
      {segment ? (
        <div className="flex h-full flex-col overflow-y-auto p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="font-mono text-[11px] uppercase tracking-wider text-tide/70">Segment</p>
              <h2 className="font-display mt-1 text-2xl font-semibold tracking-tight text-ink">
                {segment.name}
              </h2>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="font-mono text-[11px] uppercase tracking-wider text-tide hover:text-ink"
            >
              Close
            </button>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <StatusChip status={segment.status} />
            <span className="font-mono text-[11px] uppercase tracking-wider text-tide">
              {formatMiles(segment.lengthMi)}
            </span>
          </div>

          {isConceptual(segment.sourceRef) ? (
            <p className="mt-4 border border-flagging bg-flagging/10 px-3 py-2 text-sm text-ink">
              Conceptual alignment only — not surveyed. This line is a planning statement, not an
              engineered route.
            </p>
          ) : null}

          <dl className="mt-5 grid grid-cols-2 gap-x-4 gap-y-3 font-mono text-[12px]">
            <div>
              <dt className="uppercase tracking-wider text-tide/70">Elevation gain</dt>
              <dd className="mt-1 text-ink">{formatElevation(segment.elevationGainFt)}</dd>
            </div>
            <div>
              <dt className="uppercase tracking-wider text-tide/70">Surface</dt>
              <dd className="mt-1 capitalize text-ink">{formatSurface(segment.surface)}</dd>
            </div>
            <div>
              <dt className="uppercase tracking-wider text-tide/70">Difficulty</dt>
              <dd className="mt-1 capitalize text-ink">{segment.difficulty ?? "—"}</dd>
            </div>
            <div>
              <dt className="uppercase tracking-wider text-tide/70">Season</dt>
              <dd className="mt-1 text-ink">{segment.seasonality ?? "—"}</dd>
            </div>
          </dl>

          <div className="mt-6">
            <p className="font-mono text-[11px] uppercase tracking-wider text-tide/70">
              Land managers
            </p>
            <ul className="mt-2 flex flex-wrap gap-2">
              {segment.landManagers.map((manager) => (
                <li
                  key={manager}
                  className="border border-tide/30 bg-tide/5 px-2 py-1 font-mono text-[11px] uppercase tracking-wider text-tide"
                >
                  {manager}
                </li>
              ))}
            </ul>
          </div>

          <p className="mt-6 text-sm leading-relaxed text-ink/90">{segment.summary}</p>

          {segment.status !== "existing" && segment.whatItNeeds ? (
            <div className="mt-5">
              <p className="font-mono text-[11px] uppercase tracking-wider text-flagging">
                What it needs
              </p>
              <p className="mt-2 text-sm leading-relaxed">{segment.whatItNeeds}</p>
            </div>
          ) : null}

          {corridor ? (
            <a
              href={`/vision#${corridor.id}`}
              className="mt-6 font-mono text-[12px] uppercase tracking-wider text-tide underline decoration-contour underline-offset-4 hover:text-ink"
            >
              Corridor: {corridor.name}
            </a>
          ) : null}

          <a
            href={`/network/${segment.id}`}
            className="mt-auto pt-8 font-mono text-[12px] uppercase tracking-wider text-ink underline decoration-flagging underline-offset-4"
          >
            Open full segment page
          </a>
        </div>
      ) : null}
    </aside>
  );
}
