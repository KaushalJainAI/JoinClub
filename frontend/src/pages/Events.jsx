import { useSearchParams } from "react-router-dom";
import { CalendarX2 } from "lucide-react";
import { useFetch } from "@/hooks/useFetch";
import { CATEGORIES } from "@/lib/categories";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/misc";
import { EventCard, EmptyState } from "@/components/clubs/ClubBits";

const monthKey = (d) => new Date(d).toLocaleDateString("en-IN", { month: "long", year: "numeric", timeZone: "Asia/Kolkata" });

export default function Events() {
  const [params, setParams] = useSearchParams();
  const category = params.get("category") || "all";
  const { data, loading } = useFetch(`/events${category !== "all" ? `?category=${category}` : ""}`);
  const events = data?.events || [];

  const groups = events.reduce((acc, e) => {
    const k = monthKey(e.date);
    (acc[k] ||= []).push(e);
    return acc;
  }, {});

  return (
    <div className="page max-w-4xl">
      <p className="eyebrow">What's on</p>
      <h1 className="mt-1 text-3xl font-extrabold md:text-4xl">Campus events</h1>
      <p className="mt-2 text-muted-foreground">Orientations, workshops, competitions and performances from every club.</p>
      <div className="mt-6 flex gap-2 overflow-x-auto pb-1">
        {[["all", { label: "Everything" }], ...Object.entries(CATEGORIES)].map(([key, c]) => (
          <button
            key={key}
            onClick={() => setParams(key === "all" ? {} : { category: key }, { replace: true })}
            className={cn("shrink-0 rounded-full border px-3.5 py-1.5 text-sm font-medium", category === key ? "border-transparent text-white" : "bg-card hover:border-primary")}
            style={category === key ? { background: c.color || "hsl(var(--primary))" } : undefined}
          >
            {c.label}
          </button>
        ))}
      </div>
      <div className="mt-8 space-y-10">
        {loading && !data ? (
          Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="h-24" />)
        ) : events.length === 0 ? (
          <EmptyState icon={CalendarX2} title="Nothing scheduled yet">
            Check back soon. Clubs add events all the time.
          </EmptyState>
        ) : (
          Object.entries(groups).map(([month, list]) => (
            <section key={month}>
              <h2 className="mb-3 text-sm font-bold uppercase tracking-wider text-muted-foreground">{month}</h2>
              <div className="grid gap-3">
                {list.map((e) => (
                  <EventCard key={e._id} event={e} />
                ))}
              </div>
            </section>
          ))
        )}
      </div>
    </div>
  );
}
