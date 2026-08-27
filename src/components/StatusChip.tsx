import type { SegmentStatus } from "../lib/schema";
import { formatStatus } from "../lib/format";

const TONE: Record<SegmentStatus, string> = {
  existing: "border-ink/20 text-ink bg-ink/5",
  "needs-work": "border-ink/20 text-ink/70 bg-ink/5",
  "under-construction": "border-muskeg text-tide bg-muskeg/15",
  proposed: "border-flagging text-flagging bg-flagging/10",
};

export function StatusChip({ status }: { status: SegmentStatus }) {
  return (
    <span
      className={`inline-flex items-center rounded-sm border px-2 py-0.5 font-mono text-[11px] uppercase tracking-wider ${TONE[status]}`}
    >
      {formatStatus(status)}
    </span>
  );
}
