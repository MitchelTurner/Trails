import { GapLine, partsFromCorridor } from "./GapLine";
import type { Corridor, Segment } from "../lib/schema";

interface CorridorCardProps {
  corridor: Corridor;
  segments: Segment[];
}

export function CorridorCard({ corridor, segments }: CorridorCardProps) {
  const parts = partsFromCorridor(corridor, segments);
  return (
    <article className="border border-contour/70 bg-sheet/40 p-5">
      <p className="font-mono text-[11px] uppercase tracking-wider text-tide/70">Corridor</p>
      <h3 className="font-display mt-1 text-xl font-semibold tracking-tight">
        <a href={`/network?corridor=${corridor.id}`} className="hover:text-tide">
          {corridor.name}
        </a>
      </h3>
      <p className="mt-3 text-sm leading-relaxed text-ink/85">{corridor.blurb}</p>
      <GapLine
        parts={parts}
        builtMi={corridor.existingMi}
        gapMi={corridor.gapMi}
        animate={false}
        quiet
        className="mt-5"
      />
      <p className="mt-3 font-mono text-[12px] uppercase tracking-wider text-ink">
        {corridor.existingMi.toFixed(1)} of {corridor.totalMi.toFixed(1)} miles connected
      </p>
      <a
        href={`/network?corridor=${corridor.id}`}
        className="mt-4 inline-block font-mono text-[12px] uppercase tracking-wider text-tide underline decoration-contour underline-offset-4 hover:text-ink"
      >
        View on the map
      </a>
    </article>
  );
}
