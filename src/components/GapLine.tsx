import { useEffect, useId, useState } from "react";
import type { Corridor, Segment } from "../lib/schema";

interface GapPart {
  id: string;
  name: string;
  status: Segment["status"];
  miles: number;
  isGap: boolean;
}

interface GapLineProps {
  parts: GapPart[];
  builtMi: number;
  gapMi: number;
  animate?: boolean;
  quiet?: boolean;
  className?: string;
}

export function partsFromSegments(segments: Segment[]): GapPart[] {
  return segments.map((segment) => ({
    id: segment.id,
    name: segment.name,
    status: segment.status,
    miles: segment.lengthMi,
    isGap: segment.status === "proposed",
  }));
}

export function partsFromCorridor(corridor: Corridor, segments: Segment[]): GapPart[] {
  const byId = new Map(segments.map((segment) => [segment.id, segment]));
  return corridor.segmentIds
    .map((id) => byId.get(id))
    .filter((segment): segment is Segment => Boolean(segment))
    .map((segment) => ({
      id: segment.id,
      name: segment.name,
      status: segment.status,
      miles: segment.lengthMi,
      isGap: segment.status === "proposed",
    }));
}

export function GapLine({
  parts,
  builtMi,
  gapMi,
  animate = true,
  quiet = false,
  className = "",
}: GapLineProps) {
  const reactId = useId();
  const clipId = `gap-draw-${reactId.replace(/:/g, "")}`;
  const titleId = `${clipId}-title`;
  const [drawn, setDrawn] = useState(!animate);
  const [hover, setHover] = useState<string | null>(null);
  const total = parts.reduce((sum, part) => sum + part.miles, 0) || 1;

  useEffect(() => {
    if (!animate) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (reduce.matches) {
      setDrawn(true);
      return;
    }
    const frame = requestAnimationFrame(() => setDrawn(true));
    return () => cancelAnimationFrame(frame);
  }, [animate]);

  let cursor = 0;
  const width = 1000;
  const height = 36;
  const y = 18;

  return (
    <figure className={`relative ${className}`}>
      <svg
        role="img"
        aria-labelledby={titleId}
        viewBox={`0 0 ${width} ${height}`}
        className="block h-9 w-full"
      >
        <title id={titleId}>
          {`${builtMi.toFixed(1)} miles built, ${gapMi.toFixed(1)} miles of gap.`}
        </title>
        <defs>
          <clipPath id={clipId}>
            <rect
              x="0"
              y="0"
              width={drawn ? width : 0}
              height={height}
              className="gapline-clip"
            />
          </clipPath>
        </defs>
        <g clipPath={`url(#${clipId})`}>
          {parts.map((part) => {
            const start = (cursor / total) * width;
            cursor += part.miles;
            const end = (cursor / total) * width;
            const length = Math.max(end - start, 2);
            return (
              <a
                key={part.id}
                href={`/network/${part.id}`}
                onMouseEnter={() => setHover(part.name)}
                onMouseLeave={() => setHover(null)}
                onFocus={() => setHover(part.name)}
                onBlur={() => setHover(null)}
              >
                <line
                  x1={start}
                  x2={start + length}
                  y1={y}
                  y2={y}
                  stroke={part.isGap ? "#E8467C" : "#17211F"}
                  strokeWidth={4}
                  strokeLinecap="butt"
                  strokeDasharray={part.isGap ? "7 6" : undefined}
                  opacity={part.status === "needs-work" && !part.isGap ? 0.55 : 1}
                >
                  <title>{part.name}</title>
                </line>
              </a>
            );
          })}
        </g>
      </svg>
      <figcaption className="mt-2 flex min-h-5 flex-wrap items-center justify-between gap-x-4 gap-y-1 font-mono text-[11px] uppercase tracking-wider text-tide/80">
        <span>{hover ?? `${builtMi.toFixed(1)} mi built · ${gapMi.toFixed(1)} mi gap`}</span>
        {quiet ? null : <span className="text-contour">Hover a dash for the missing connection</span>}
      </figcaption>
      <style>{`
        .gapline-clip {
          transition: width 900ms linear;
        }
        @media (prefers-reduced-motion: reduce) {
          .gapline-clip {
            transition: none;
          }
        }
      `}</style>
    </figure>
  );
}
