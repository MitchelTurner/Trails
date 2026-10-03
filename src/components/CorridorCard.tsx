import type { Corridor, Segment } from "../lib/schema";

interface CorridorCardProps {
  corridor: Corridor;
  segments: Segment[];
  /** Homepage list: name, walkable percent, and miles still to cut. */
  compact?: boolean;
}

export function CorridorCard({ corridor, segments, compact = false }: CorridorCardProps) {
  const byId = new Map(segments.map((segment) => [segment.id, segment]));
  const members = corridor.segmentIds
    .map((id) => byId.get(id))
    .filter((segment): segment is Segment => Boolean(segment));

  if (compact) {
    const percent = Math.round(corridor.percentComplete);
    return (
      <article className="card flex h-full flex-col p-6">
        <h3 className="headline text-xl">
          <a
            href={`/network?corridor=${corridor.id}`}
            className="transition-colors hover:text-tide"
          >
            {corridor.name}
            <span className="sr-only"> — open in the network map</span>
          </a>
        </h3>
        <div className="mt-5 flex items-center gap-3">
          <div
            className="h-2 min-w-0 flex-1 bg-contour/50"
            role="progressbar"
            aria-valuenow={percent}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={`${percent} percent walkable`}
          >
            <div className="h-full bg-ink" style={{ width: `${Math.min(100, Math.max(0, percent))}%` }} />
          </div>
          <span className="shrink-0 font-mono text-[11px] tabular-nums tracking-[0.08em] text-ink">
            {percent}%
          </span>
        </div>
        <p className="mt-3 font-mono text-[10px] uppercase tracking-[0.14em] text-tide">
          {corridor.gapMi.toFixed(1)} mi still to cut
        </p>
      </article>
    );
  }

  return (
    <article className="card card-hover flex h-full flex-col p-6">
      <p className="eyebrow">Corridor</p>
      <h3 className="headline mt-3 text-2xl">
        <a href={`/network?corridor=${corridor.id}`} className="transition-colors hover:text-tide">
          {corridor.name}
          <span className="sr-only"> — open in the network map</span>
        </a>
      </h3>

      <dl className="mt-6 grid grid-cols-2 gap-x-6 gap-y-4 border-y border-contour/50 py-5">
        <div>
          <dt className="font-mono text-[10px] uppercase tracking-[0.14em] text-tide">
            On the ground
          </dt>
          <dd className="font-display mt-1 text-2xl font-bold tracking-tight">
            {corridor.existingMi.toFixed(1)}
            <span className="text-sm"> mi</span>
          </dd>
        </div>
        <div>
          <dt className="font-mono text-[10px] uppercase tracking-[0.14em] text-tide">
            Still to cut
          </dt>
          <dd className="font-display mt-1 text-2xl font-bold tracking-tight text-flagging-deep">
            {corridor.gapMi.toFixed(1)}
            <span className="text-sm"> mi</span>
          </dd>
        </div>
      </dl>

      <ol className="mt-5 space-y-2">
        {members.map((segment) => (
          <li key={segment.id} className="flex items-start justify-between gap-3">
            <a
              href={`/network/${segment.id}`}
              className="text-sm leading-snug text-ink underline-offset-4 hover:underline hover:decoration-flagging"
            >
              {segment.name}
            </a>
            <span className="shrink-0 font-mono text-[10px] uppercase tracking-[0.1em] text-tide">
              {segment.lengthMi.toFixed(1)} mi
            </span>
          </li>
        ))}
      </ol>

      <p className="mt-auto pt-6 font-mono text-[10px] uppercase tracking-[0.14em] text-tide">
        {corridor.percentComplete.toFixed(0)}% of {corridor.totalMi.toFixed(1)} miles walkable
      </p>
    </article>
  );
}
