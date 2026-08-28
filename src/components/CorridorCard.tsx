import type { Corridor, Segment } from "../lib/schema";

interface CorridorCardProps {
  corridor: Corridor;
  segments: Segment[];
}

export function CorridorCard({ corridor, segments }: CorridorCardProps) {
  const byId = new Map(segments.map((segment) => [segment.id, segment]));
  const members = corridor.segmentIds
    .map((id) => byId.get(id))
    .filter((segment): segment is Segment => Boolean(segment));

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
