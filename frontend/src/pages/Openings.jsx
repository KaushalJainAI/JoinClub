import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Search, Inbox } from "lucide-react";
import { usePaged, useDebounced } from "@/hooks/useFetch";
import { CATEGORIES } from "@/lib/categories";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/misc";
import { OpeningCard, EmptyState } from "@/components/clubs/ClubBits";

const MODES = [
  ["", "All types"],
  ["recruitment", "Recruitment"],
  ["event", "Event teams"],
  ["workshop", "Workshops"],
];

export default function Openings() {
  const [params, setParams] = useSearchParams();
  const [q, setQ] = useState(params.get("q") || "");
  const debouncedQ = useDebounced(q);
  const category = params.get("category") || "all";
  const mode = params.get("mode") || "";

  const set = (k, v) => {
    const next = new URLSearchParams(params);
    if (!v || v === "all") next.delete(k);
    else next.set(k, v);
    setParams(next, { replace: true });
  };

  const filters = new URLSearchParams({ ...(debouncedQ && { q: debouncedQ }), ...(category !== "all" && { category }), ...(mode && { mode }) }).toString();
  const { items: openings, total, loading, loadingMore, hasMore, loadMore } = usePaged(`/openings${filters ? `?${filters}` : ""}`, "openings", { pageSize: 24 });
  const closingSoon = openings.filter((o) => new Date(o.deadline) - Date.now() < 3 * 86400_000);

  return (
    <div className="page">
      <p className="eyebrow">Recruiting now</p>
      <h1 className="mt-1 text-3xl font-extrabold md:text-4xl">Open positions</h1>
      <p className="mt-2 max-w-2xl text-muted-foreground">Recruitment drives, event teams and workshops accepting applications right now, soonest deadline first.</p>

      <div className="mt-8 flex flex-col gap-3 md:flex-row md:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              set("q", e.target.value);
            }}
            placeholder="Search openings…"
            className="h-11 w-full rounded-xl border border-input bg-card pl-10 pr-3 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/30"
          />
        </div>
        <div className="flex gap-1 overflow-x-auto rounded-xl bg-muted p-1">
          {MODES.map(([k, label]) => (
            <button key={k} onClick={() => set("mode", k)} className={cn("shrink-0 rounded-lg px-3 py-1.5 text-sm font-semibold", mode === k ? "bg-card shadow-sm" : "text-muted-foreground")}>
              {label}
            </button>
          ))}
        </div>
      </div>
      <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
        {[["all", { label: "All clubs" }], ...Object.entries(CATEGORIES)].map(([key, c]) => (
          <button
            key={key}
            onClick={() => set("category", key)}
            className={cn("shrink-0 rounded-full border px-3.5 py-1.5 text-sm font-medium", category === key ? "border-transparent text-white" : "bg-card hover:border-primary")}
            style={category === key ? { background: c.color || "hsl(var(--primary))" } : undefined}
          >
            {c.label}
          </button>
        ))}
      </div>

      {closingSoon.length > 0 && !loading && (
        <div className="mt-6 rounded-2xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm">
          <strong className="text-destructive">{closingSoon.length} closing within 3 days.</strong> Don't leave it to the last minute!
        </div>
      )}

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {loading && openings.length === 0 ? (
          Array.from({ length: 6 }, (_, i) => <Skeleton key={i} className="h-56" />)
        ) : openings.length === 0 ? (
          <div className="sm:col-span-2 lg:col-span-3">
            <EmptyState icon={Inbox} title="No open positions match">
              Try another filter, or follow clubs to hear when they open.
            </EmptyState>
          </div>
        ) : (
          openings.map((o) => <OpeningCard key={o._id} opening={o} />)
        )}
      </div>
      {hasMore && (
        <div className="mt-8 text-center">
          <button onClick={loadMore} disabled={loadingMore} className="rounded-xl border bg-card px-5 py-2.5 text-sm font-semibold shadow-soft hover:border-primary disabled:opacity-60">
            {loadingMore ? "Loading…" : `Show more (${total - openings.length} left)`}
          </button>
        </div>
      )}
    </div>
  );
}
