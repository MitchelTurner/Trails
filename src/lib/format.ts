import { STATUS_LABEL, SURFACE_LABEL, DIFFICULTY_LABEL } from "./constants";
import type { Segment, SegmentStatus } from "./schema";

export function formatMiles(mi: number, digits = 1): string {
  return `${mi.toFixed(digits)} mi`;
}

export function formatStatus(status: SegmentStatus): string {
  return STATUS_LABEL[status];
}

export function formatSurface(surface: Segment["surface"]): string {
  return SURFACE_LABEL[surface];
}

export function formatDifficulty(value: Segment["difficulty"]): string {
  return value ? DIFFICULTY_LABEL[value] : "—";
}

export function formatElevation(ft: number | null): string {
  return ft == null ? "—" : `${Math.round(ft).toLocaleString("en-US")} ft`;
}

export function formatCount(n: number): string {
  return n.toLocaleString("en-US");
}

export function isConceptual(sourceRef: string): boolean {
  return sourceRef === "hand-drawn-concept";
}

export function gapMilesOf(existingMi: number, totalMi: number): number {
  return Math.max(0, totalMi - existingMi);
}
