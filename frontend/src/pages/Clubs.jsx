import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Search, SlidersHorizontal, SearchX, X } from "lucide-react";
import { useFetch, useDebounced } from "@/hooks/useFetch";
import { CATEGORIES } from "@/lib/categories";
import { cn } from "@/lib/utils";
import { Select } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/misc";
import { Button } from "@/components/ui/button";
import { ClubCard, EmptyState } from "@/components/clubs/ClubBits";

export default function Clubs() {
  const [params, setParams] = useSearchParams();
  const category = params.get("category") || "all";
  const sort = params.get("sort") || "popular";
  const recruiting = params.get("recruiting") === "true";
  const [q, setQ] = useState(params.get("q") || "");
  const debouncedQ = useDebounced(q);

  // Filters live in the URL so results can be shared and survive a refresh.
  const set = (key, value) => {
    const next = new URLSearchParams(params);
    if (value === null || value === "" || value === "all" || value === false) next.delete(key);
    else next.set(key, value);
    setParams(next, { replace: true });
  };

  const query = new URLSearchParams({ sort, ...(category !== "all" && { category }), ...(recruiting && { recruiting: "true" }), ...(debouncedQ && { q: debouncedQ }) });
  const { data, loading, error } = useFetch(`/clubs?${query}`);
  const clubs = data?.clubs || [];
  const filtersOn = category !== "all" || recruiting || q;

  return (
    <div className="page">
      <div className="max-w-2xl">
        <p className="eyebrow">Directory</p>
        <h1 className="mt-1 text-3xl font-extrabold md:text-4xl">Every club at PEC</h1>
        <p className="mt-2 text-muted-foreground">Technical societies, cultural clubs, editorial boards and service bodies. Tap one to see why students join.</p>
      </div>

      <div className="sticky top-16 z-20 -mx-4 mt-8 border-b bg-background/85 px-4 py-4 backdrop-blur-lg">
        <div className="flex flex-col gap-3 md:flex-row md:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={q}
              onChange={(e) => {
                setQ(e.target.value);
                set("q", e.target.value);
              }}
              placeholder="Search by name, skill or activity…"
              className="h-11 w-full rounded-xl border border-input bg-card pl-10 pr-3 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/30"
              aria-label="Search clubs"
            />
          </div>
          <div className="flex items-center gap-2">
            <label className={cn("flex h-11 cursor-pointer items-center gap-2 rounded-xl border px-3 text-sm font-medium transition-colors", recruiting ? "border-success bg-success/10 text-success" : "bg-card")}>
              <input type="checkbox" checked={recruiting} onChange={(e) => set("recruiting", e.target.checked ? "true" : null)} className="accent-[hsl(var(--success))]" />
              Recruiting now
            </label>
            <div className="flex items-center gap-2">
              <SlidersHorizontal className="h-4 w-4 text-muted-foreground" />
              <Select value={sort} onChange={(e) => set("sort", e.target.value === "popular" ? null : e.target.value)} className="h-11 w-40 rounded-xl" aria-label="Sort clubs">
                <option value="popular">Most followed</option>
                <option value="recruiting">Recruiting first</option>
                <option value="name">A to Z</option>
              </Select>
            </div>
          </div>
        </div>
        <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
          {[["all", { label: "All" }], ...Object.entries(CATEGORIES)].map(([key, c]) => {
            const active = category === key;
            const Icon = c.icon;
            return (
              <button
                key={key}
                onClick={() => set("category", key)}
                className={cn("inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-sm font-medium transition-all", active ? "border-transparent text-white shadow" : "bg-card hover:border-primary")}
                style={active ? { background: c.color || "hsl(var(--primary))" } : undefined}
              >
                {Icon && <Icon className="h-3.5 w-3.5" />} {c.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="mt-6 flex items-center justify-between text-sm text-muted-foreground">
        <span>{loading ? "Loading…" : `${clubs.length} club${clubs.length === 1 ? "" : "s"}`}</span>
        {filtersOn && (
          <button
            onClick={() => {
              setQ("");
              setParams({}, { replace: true });
            }}
            className="inline-flex items-center gap-1 font-medium text-primary hover:underline"
          >
            <X className="h-3.5 w-3.5" /> Clear filters
          </button>
        )}
      </div>

      {error ? (
        <EmptyState icon={SearchX} title="Couldn't load clubs">
          {error}
        </EmptyState>
      ) : loading && !data ? (
        <div className="mt-4 grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 8 }, (_, i) => (
            <Skeleton key={i} className="h-64" />
          ))}
        </div>
      ) : clubs.length === 0 ? (
        <div className="mt-4">
          <EmptyState
            icon={SearchX}
            title="No clubs match"
            action={
              <Button
                variant="outline"
                onClick={() => {
                  setQ("");
                  setParams({}, { replace: true });
                }}
              >
                Show all clubs
              </Button>
            }
          >
            Try a broader word, or ask PEC Buddy to suggest a club for you.
          </EmptyState>
        </div>
      ) : (
        <div className={cn("mt-4 grid gap-5 transition-opacity sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4", loading && "opacity-60")}>
          {clubs.map((c) => (
            <ClubCard key={c._id} club={c} />
          ))}
        </div>
      )}
    </div>
  );
}
