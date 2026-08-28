import { useMemo, useState } from "react";
import type { Segment } from "../lib/schema";
import { formatMiles, formatStatus } from "../lib/format";
import { StatusChip } from "./StatusChip";

type SortKey = "name" | "status" | "length" | "manager";

interface NetworkListProps {
  segments: Segment[];
  landManagers: string[];
  statuses: Segment["status"][];
  initialStatus?: string | null;
  initialManager?: string | null;
  initialCorridor?: string | null;
}

const STATUS_ORDER: Segment["status"][] = [
  "existing",
  "needs-work",
  "under-construction",
  "proposed",
];

export default function NetworkList({
  segments,
  landManagers,
  initialStatus = null,
  initialManager = null,
  initialCorridor = null,
}: NetworkListProps) {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState(initialStatus ?? "");
  const [manager, setManager] = useState(initialManager ?? "");
  const [sortKey, setSortKey] = useState<SortKey>("name");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const rows = segments.filter((segment) => {
      if (initialCorridor && segment.corridorId !== initialCorridor) return false;
      if (status && segment.status !== status) return false;
      if (manager && !segment.landManagers.includes(manager)) return false;
      if (!q) return true;
      return (
        segment.name.toLowerCase().includes(q) ||
        segment.summary.toLowerCase().includes(q) ||
        segment.landManagers.some((item) => item.toLowerCase().includes(q))
      );
    });
    const dir = sortDir === "asc" ? 1 : -1;
    rows.sort((a, b) => {
      if (sortKey === "length") return (a.lengthMi - b.lengthMi) * dir;
      if (sortKey === "status") {
        return (STATUS_ORDER.indexOf(a.status) - STATUS_ORDER.indexOf(b.status)) * dir;
      }
      if (sortKey === "manager") {
        return a.landManagers.join().localeCompare(b.landManagers.join()) * dir;
      }
      return a.name.localeCompare(b.name) * dir;
    });
    return rows;
  }, [segments, query, status, manager, sortKey, sortDir, initialCorridor]);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir((value) => (value === "asc" ? "desc" : "asc"));
    else {
      setSortKey(key);
      setSortDir("asc");
    }
  };

  const header = (key: SortKey, label: string) => (
    <button
      type="button"
      onClick={() => toggleSort(key)}
      aria-label={`Sort by ${label}`}
      className="inline-flex min-h-9 items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.14em] text-tide transition-colors hover:text-ink"
    >
      {label}
      <span aria-hidden className={sortKey === key ? "text-flagging-deep" : "text-tide"}>
        {sortKey === key ? (sortDir === "asc" ? "↑" : "↓") : "↕"}
      </span>
    </button>
  );

  return (
    <div>
      <div className="flex flex-wrap items-end gap-4">
        <label className="flex min-w-56 flex-1 flex-col gap-1.5 font-mono text-[10px] uppercase tracking-[0.14em] text-tide">
          Search segments
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Name, summary, or land manager"
            className="min-h-11 border border-contour bg-sheet px-3 font-body text-sm text-ink placeholder:text-contour"
          />
        </label>
        <label className="flex flex-col gap-1.5 font-mono text-[10px] uppercase tracking-[0.14em] text-tide">
          Status
          <select
            value={status}
            onChange={(event) => setStatus(event.target.value)}
            className="min-h-11 border border-contour bg-sheet px-3 font-body text-sm text-ink"
          >
            <option value="">All</option>
            {STATUS_ORDER.map((value) => (
              <option key={value} value={value}>
                {formatStatus(value)}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1.5 font-mono text-[10px] uppercase tracking-[0.14em] text-tide">
          Land manager
          <select
            value={manager}
            onChange={(event) => setManager(event.target.value)}
            className="min-h-11 min-w-48 border border-contour bg-sheet px-3 font-body text-sm text-ink"
          >
            <option value="">All</option>
            {landManagers.map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
        </label>
      </div>

      {filtered.length === 0 ? (
        <div className="card mt-8 p-8">
          <p className="font-display text-xl font-bold tracking-tight">No segments match.</p>
          <p className="mt-2 max-w-xl text-sm leading-relaxed text-ink/80">
            Clear the {manager ? "land manager" : status ? "status" : "search"} filter to see all{" "}
            {segments.length}.
          </p>
          <button
            type="button"
            onClick={() => {
              setQuery("");
              setStatus("");
              setManager("");
            }}
            className="btn btn-outline mt-6 !min-h-11"
          >
            Clear filters
          </button>
        </div>
      ) : (
        <div className="mt-6 overflow-x-auto">
          <table className="w-full min-w-[52rem] border-collapse text-left text-sm">
            <caption className="sr-only">
              Every trail segment with status, length, and land managers. Sortable.
            </caption>
            <thead>
              <tr className="border-b border-contour">
                <th scope="col" className="py-2 pr-4">{header("name", "Segment")}</th>
                <th scope="col" className="py-2 pr-4">{header("status", "Status")}</th>
                <th scope="col" className="py-2 pr-4">{header("length", "Length")}</th>
                <th scope="col" className="py-2 pr-4">{header("manager", "Land managers")}</th>
                <th scope="col" className="py-2">
                  <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-tide">
                    Surface
                  </span>
                </th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((segment) => (
                <tr
                  key={segment.id}
                  className="border-b border-contour/50 align-top transition-colors hover:bg-sheet-raised"
                >
                  <td className="py-4 pr-4">
                    <a
                      href={`/network/${segment.id}`}
                      className="font-display text-base font-bold tracking-tight text-ink underline-offset-4 hover:underline hover:decoration-flagging"
                    >
                      {segment.name}
                    </a>
                    <p className="mt-1 max-w-md text-xs leading-relaxed text-ink/70">
                      {segment.summary}
                    </p>
                  </td>
                  <td className="py-4 pr-4">
                    <StatusChip status={segment.status} />
                  </td>
                  <td className="py-4 pr-4 font-mono text-xs">{formatMiles(segment.lengthMi)}</td>
                  <td className="py-4 pr-4">
                    <ul className="flex flex-col gap-1">
                      {segment.landManagers.map((item) => (
                        <li
                          key={item}
                          className="font-mono text-[10px] uppercase tracking-[0.1em] text-tide"
                        >
                          {item}
                        </li>
                      ))}
                    </ul>
                  </td>
                  <td className="py-4 font-mono text-[10px] uppercase tracking-[0.1em] text-tide">
                    {segment.surface}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
