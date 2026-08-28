import { GapLine, partsFromCorridor } from "./GapLine";
import type { Corridor, Segment } from "../lib/schema";

interface CorridorCardProps {
  corridor: Corridor;
  segments: Segment[];
}

export function CorridorCard({ corridor, segments }: CorridorCardProps) {
  const parts = partsFromCorridor(corridor, segments);
  const pct = Math.round(corridor.percentComplete);

  return (
    <article className="card card-hover group flex h-full flex-col p-6">
      <div className="flex items-start justify-between gap-4">
        <p className="eyebrow">Corridor</p>
        <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-tide">{pct}% linked</p>
      </div>

      <h3 className="headline mt-3 text-2xl">
        <a href={`/network?corridor=${corridor.id}`} className="transition-colors hover:text-tide">
          {corridor.name}
          <span className="sr-only"> — open in the network map</span>
        </a>
      </h3>

      <p className="mt-3 text-sm leading-relaxed text-ink/80">{corridor.blurb}</p>

      <GapLine
        parts={parts}
        builtMi={corridor.existingMi}
        gapMi={corridor.gapMi}
        animate={false}
        quiet
        caption={false}
        className="mt-6"
      />

      <p className="mt-auto pt-5 font-mono text-xs uppercase tracking-[0.12em] text-ink">
        {corridor.existingMi.toFixed(1)} of {corridor.totalMi.toFixed(1)} mi connected
        <span className="ml-2 text-flagging-deep">{corridor.gapMi.toFixed(1)} mi gap</span>
      </p>
    </article>
  );
}
