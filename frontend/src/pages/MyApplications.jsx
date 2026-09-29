import { useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { FileText, Compass, Mic, Undo2 } from "lucide-react";
import { useFetch } from "@/hooks/useFetch";
import { api, errorMessage } from "@/lib/api";
import { STATUS_META } from "@/lib/categories";
import { cn, formatDate, formatDateTime } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/misc";
import { ClubLogo, StatusBadge, EmptyState, DeadlinePill } from "@/components/clubs/ClubBits";

const STEPS = ["pending", "shortlisted", "accepted"];
const FILTERS = [["all", "All"], ...Object.entries(STATUS_META).map(([k, v]) => [k, v.label])];

function Timeline({ status }) {
  if (status === "rejected" || status === "withdrawn") return null;
  const at = STEPS.indexOf(status);
  return (
    <div className="mt-4 flex items-center gap-2">
      {STEPS.map((s, i) => (
        <div key={s} className="flex flex-1 items-center gap-2">
          <div className={cn("h-2 flex-1 rounded-full", i <= at ? (status === "accepted" ? "bg-success" : "bg-primary") : "bg-muted")} />
          <span className={cn("hidden text-xs font-medium sm:inline", i <= at ? "text-foreground" : "text-muted-foreground")}>{STATUS_META[s].label}</span>
        </div>
      ))}
    </div>
  );
}

// What happened and when. The server strips who changed it: naming the admin would
// let a rejected student identify the person who rejected them.
function HistoryList({ history }) {
  if (!history?.length) return null;
  return (
    <details className="mt-3 text-sm">
      <summary className="cursor-pointer font-medium text-muted-foreground hover:text-foreground">
        History ({history.length})
      </summary>
      <ol className="mt-2 space-y-1.5 border-l-2 border-muted pl-4">
        {history.map((h, i) => (
          <li key={`${h.status}-${h.at}-${i}`} className="flex flex-wrap items-baseline gap-x-2 text-sm">
            <StatusBadge status={h.status} />
            <span className="text-xs text-muted-foreground">{formatDateTime(h.at)}</span>
          </li>
        ))}
      </ol>
    </details>
  );
}

export default function MyApplications() {
  const { data, loading, reload } = useFetch("/applications/mine");
  const [filter, setFilter] = useState("all");
  const [busy, setBusy] = useState(null);
  const apps = data?.applications || [];
  const shown = filter === "all" ? apps : apps.filter((a) => a.status === filter);
  const counts = apps.reduce((acc, a) => ((acc[a.status] = (acc[a.status] || 0) + 1), acc), {});

  const withdraw = async (id) => {
    if (!confirm("Withdraw this application? You can apply again while the opening is still open.")) return;
    setBusy(id);
    try {
      const { data: res } = await api.post(`/applications/${id}/withdraw`);
      toast.success(res.message);
      reload();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="page max-w-4xl">
      <p className="eyebrow">Your journey</p>
      <h1 className="mt-1 text-3xl font-extrabold md:text-4xl">My applications</h1>

      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {["pending", "shortlisted", "accepted", "rejected"].map((s) => (
          <div key={s} className="rounded-2xl border bg-card p-4 shadow-soft">
            <div className="font-display text-2xl font-extrabold">{counts[s] || 0}</div>
            <div className="text-xs text-muted-foreground">{STATUS_META[s].label}</div>
          </div>
        ))}
      </div>

      <div className="mt-6 flex gap-1 overflow-x-auto rounded-xl bg-muted p-1">
        {FILTERS.map(([k, label]) => (
          <button key={k} onClick={() => setFilter(k)} className={cn("shrink-0 rounded-lg px-3 py-1.5 text-sm font-semibold", filter === k ? "bg-card shadow-sm" : "text-muted-foreground")}>
            {label}
          </button>
        ))}
      </div>

      <div className="mt-6 space-y-4">
        {loading && !data ? (
          Array.from({ length: 3 }, (_, i) => <Skeleton key={i} className="h-36" />)
        ) : shown.length === 0 ? (
          <EmptyState
            icon={apps.length ? FileText : Compass}
            title={apps.length ? "Nothing here" : "You haven't applied yet"}
            action={
              <Button asChild>
                <Link to="/openings">See who's recruiting</Link>
              </Button>
            }
          >
            {apps.length ? "No applications with this status." : "Find a club you love and send your first application. It takes about five minutes."}
          </EmptyState>
        ) : (
          shown.map((a) => (
            <div key={a._id} className="rounded-2xl border bg-card p-5 shadow-soft">
              <div className="flex flex-wrap items-start gap-4">
                <ClubLogo club={a.club} />
                <div className="min-w-0 flex-1">
                  <Link to={`/openings/${a.opening?._id}`} className="font-semibold hover:text-primary">
                    {a.opening?.title}
                  </Link>
                  <div className="text-sm text-muted-foreground">
                    <Link to={`/clubs/${a.club?.slug}`} className="hover:underline">
                      {a.club?.name}
                    </Link>{" "}
                    · applied {formatDate(a.createdAt)}
                  </div>
                </div>
                <StatusBadge status={a.status} />
              </div>
              <Timeline status={a.status} />
              <HistoryList history={a.history} />
              <div className="mt-4 flex flex-wrap items-center gap-2">
                {a.opening && a.status !== "accepted" && a.status !== "rejected" && <DeadlinePill deadline={a.opening.deadline} className="mr-auto" />}
                {a.status === "accepted" && <p className="mr-auto text-sm font-medium text-success">🎉 Welcome to {a.club?.shortName || a.club?.name}! Watch your email for next steps.</p>}
                {a.status === "shortlisted" && (
                  <Button size="sm" variant="secondary" asChild>
                    <Link to={`/assistant?tab=interview&club=${a.club?.slug}&opening=${a.opening?._id}`}>
                      <Mic /> Prepare for the interview
                    </Link>
                  </Button>
                )}
                {["pending", "shortlisted"].includes(a.status) && (
                  <Button size="sm" variant="ghost" onClick={() => withdraw(a._id)} loading={busy === a._id}>
                    <Undo2 /> Withdraw
                  </Button>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
