import type { SegmentStatus } from "../lib/schema";
import { formatStatus } from "../lib/format";

const TONE: Record<SegmentStatus, string> = {
  existing: "border-ink text-ink bg-ink/5",
  "needs-work": "border-ink/50 text-ink bg-ink/5",
  "under-construction": "border-muskeg text-ink bg-muskeg/20",
  proposed: "border-flagging text-ink bg-flagging/20",
};

export function StatusChip({ status }: { status: SegmentStatus }) {
  return (
    <span
      className={`status-chip inline-flex min-h-7 items-center rounded-full border px-2.5 font-mono text-[10px] uppercase tracking-[0.12em] ${TONE[status]}`}
      data-status={status}
    >
      {formatStatus(status)}
    </span>
  );
}
