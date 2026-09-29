import { useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { ArrowLeft, Download, Search, Sparkles, Check, X, Star, Mail, Phone, FileText, Users } from "lucide-react";
import { usePaged, useDebounced } from "@/hooks/useFetch";
import { api, API_BASE, errorMessage } from "@/lib/api";
import { STATUS_META } from "@/lib/categories";
import { cn, formatDate, formatDateTime, relativeTime } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/misc";
import { UserAvatar } from "@/components/ui/avatar";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { StatusBadge, EmptyState } from "@/components/clubs/ClubBits";

const FILTERS = ["all", "pending", "shortlisted", "accepted", "rejected", "withdrawn"];

function ApplicantPanel({ app, onChanged, onClose }) {
  const [note, setNote] = useState(app.adminNote || "");
  const [busy, setBusy] = useState(null);
  const [summary, setSummary] = useState(null);
  const [summaryBusy, setSummaryBusy] = useState(false);
  const u = app.applicant || {};
  const p = u.profile || {};

  const update = async (body, key) => {
    setBusy(key);
    try {
      const { data } = await api.patch(`/applications/${app._id}/status`, body);
      toast.success(data.message);
      onChanged(data.application);
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusy(null);
    }
  };

  const summarise = async () => {
    setSummaryBusy(true);
    try {
      const { data } = await api.post(`/ai/applicant-summary/${app._id}`);
      setSummary(data.result);
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setSummaryBusy(false);
    }
  };

  const locked = app.status === "withdrawn";

  return (
    <div className="flex h-full flex-col">
      <div className="border-b p-5 pr-12">
        <div className="flex items-center gap-3">
          <UserAvatar user={u} className="h-12 w-12" />
          <div className="min-w-0">
            <DialogTitle className="truncate">{u.fullname}</DialogTitle>
            <DialogDescription>
              {p.branch || "Branch not set"}
              {p.year ? `, year ${p.year}` : ""} {p.sid ? `· SID ${p.sid}` : ""}
            </DialogDescription>
          </div>
        </div>
        <div className="mt-3 flex flex-wrap gap-2 text-xs">
          <a href={`mailto:${u.email}`} className="inline-flex items-center gap-1 rounded-md border px-2 py-1 hover:border-primary">
            <Mail className="h-3 w-3" /> {u.email}
          </a>
          {u.phoneNumber && (
            <a href={`tel:${u.phoneNumber}`} className="inline-flex items-center gap-1 rounded-md border px-2 py-1 hover:border-primary">
              <Phone className="h-3 w-3" /> {u.phoneNumber}
            </a>
          )}
          {p.resume && (
            <a href={p.resume} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 rounded-md border px-2 py-1 hover:border-primary">
              <FileText className="h-3 w-3" /> Resume
            </a>
          )}
        </div>
      </div>

      <div className="flex-1 space-y-6 overflow-y-auto p-5">
        <div className="flex items-center justify-between">
          <StatusBadge status={app.status} />
          <span className="text-xs text-muted-foreground">Applied {formatDate(app.createdAt)}</span>
        </div>

        {app.history?.length > 0 && (
          <div>
            <p className="mb-1.5 text-sm font-semibold">Status history</p>
            <ol className="space-y-1.5 border-l-2 border-muted pl-4">
              {app.history.map((h, i) => (
                <li key={`${h.status}-${h.at}-${i}`} className="flex flex-wrap items-baseline gap-x-2 text-sm">
                  <StatusBadge status={h.status} />
                  <span className="text-xs text-muted-foreground">
                    {formatDateTime(h.at)}
                    {h.by && ` · by ${typeof h.by === "object" ? h.by.fullname || h.by.email : "admin"}`}
                  </span>
                </li>
              ))}
            </ol>
          </div>
        )}

        {p.bio && <p className="rounded-xl bg-secondary/50 p-3 text-sm italic">“{p.bio}”</p>}
        {p.skills?.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {p.skills.map((s) => (
              <Badge key={s} variant="muted">
                {s}
              </Badge>
            ))}
          </div>
        )}

        <div className="rounded-xl border border-accent/30 bg-accent/5 p-4">
          {summary ? (
            <div className="space-y-2 text-sm">
              <p className="flex items-center gap-1.5 text-xs font-semibold text-accent">
                <Sparkles className="h-3.5 w-3.5" /> AI summary · a starting point, you decide
              </p>
              <p>{summary.summary}</p>
              {summary.highlights?.length > 0 && (
                <ul className="list-disc space-y-1 pl-4 text-muted-foreground">
                  {summary.highlights.map((h) => (
                    <li key={h}>{h}</li>
                  ))}
                </ul>
              )}
              {summary.questionsToAsk?.length > 0 && (
                <>
                  <p className="pt-1 text-xs font-semibold">Ask in the interview:</p>
                  <ul className="list-disc space-y-1 pl-4 text-muted-foreground">
                    {summary.questionsToAsk.map((q) => (
                      <li key={q}>{q}</li>
                    ))}
                  </ul>
                </>
              )}
            </div>
          ) : (
            <Button size="sm" variant="ghost" onClick={summarise} loading={summaryBusy} className="text-accent hover:text-accent">
              <Sparkles /> Summarise this applicant with AI
            </Button>
          )}
        </div>

        <div className="space-y-4">
          {app.answers.map((a) => (
            <div key={a.question}>
              <p className="text-sm font-semibold">{a.question}</p>
              <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">{a.answer}</p>
            </div>
          ))}
        </div>

        <div>
          <p className="mb-1.5 text-sm font-semibold">Private note (only your club sees this)</p>
          <Textarea value={note} onChange={(e) => setNote(e.target.value)} rows={3} placeholder="Strong portfolio; ask about time commitment…" disabled={locked} />
          <Button size="sm" variant="outline" className="mt-2" onClick={() => update({ adminNote: note }, "note")} loading={busy === "note"} disabled={locked || note === (app.adminNote || "")}>
            Save note
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 border-t p-4">
        {locked ? (
          <p className="col-span-3 text-center text-sm text-muted-foreground">The student withdrew this application.</p>
        ) : (
          <>
            <Button variant="outline" onClick={() => update({ status: "shortlisted" }, "shortlisted")} loading={busy === "shortlisted"} disabled={app.status === "shortlisted"}>
              <Star /> Shortlist
            </Button>
            <Button variant="success" onClick={() => update({ status: "accepted" }, "accepted")} loading={busy === "accepted"} disabled={app.status === "accepted"}>
              <Check /> Accept
            </Button>
            <Button variant="destructive" onClick={() => update({ status: "rejected" }, "rejected")} loading={busy === "rejected"} disabled={app.status === "rejected"}>
              <X /> Reject
            </Button>
          </>
        )}
      </div>
      <button onClick={onClose} className="sr-only">
        Close
      </button>
    </div>
  );
}

export default function Applicants() {
  const { id } = useParams();
  const [params, setParams] = useSearchParams();
  const [status, setStatus] = useState("all");
  const [q, setQ] = useState("");
  const dq = useDebounced(q);
  const query = new URLSearchParams({ ...(status !== "all" && { status }), ...(dq && { q: dq }) }).toString();
  const { items: apps, first, meta, total, loading, loadingMore, hasMore, loadMore, patchItems } = usePaged(`/openings/${id}/applicants${query ? `?${query}` : ""}`, "applications", { pageSize: 50 });
  const data = first; // the opening's own fields are the same on every page
  const selectedId = params.get("app");
  const selected = apps.find((a) => a._id === selectedId);
  // Per-status totals for the whole opening come from the server, whatever the filter.
  const counts = meta?.counts || {};

  const open = (appId) => setParams(appId ? { app: appId } : {}, { replace: true });

  const onChanged = (updated) => {
    patchItems((list) =>
      list.map((a) =>
        a._id === updated._id ? { ...a, status: updated.status, adminNote: updated.adminNote, history: updated.history?.length ? updated.history : a.history } : a
      )
    );
  };

  return (
    <div className="page space-y-6">
      <Link to="/admin/openings" className="inline-flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> All openings
      </Link>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="eyebrow">Applicants</p>
          <h1 className="text-2xl font-extrabold md:text-3xl">{data?.opening?.title || " "}</h1>
          {data?.opening && <p className="text-sm text-muted-foreground">Deadline {formatDate(data.opening.deadline)} · {data.opening.positions} spots</p>}
        </div>
        <Button variant="outline" asChild>
          <a href={`${API_BASE}/openings/${id}/applicants.csv${status !== "all" ? `?status=${status}` : ""}`}>
            <Download /> Export CSV
          </a>
        </Button>
      </div>

      <div className="flex flex-col gap-3 md:flex-row md:items-center">
        <div className="flex gap-1 overflow-x-auto rounded-xl bg-muted p-1">
          {FILTERS.map((f) => (
            <button key={f} onClick={() => setStatus(f)} className={cn("shrink-0 rounded-lg px-3 py-1.5 text-sm font-semibold", status === f ? "bg-card shadow-sm" : "text-muted-foreground")}>
              {f === "all" ? "All" : STATUS_META[f].label} <span className="text-xs opacity-60">{f === "all" ? counts.all ?? "" : counts[f] || 0}</span>
            </button>
          ))}
        </div>
        <div className="relative flex-1 md:max-w-xs md:ml-auto">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Name, email, branch, skill…" className="h-10 w-full rounded-xl border bg-card pl-9 pr-3 text-sm outline-none focus:ring-2 focus:ring-ring/30" />
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border bg-card shadow-soft">
        {loading && !data ? (
          <Skeleton className="m-4 h-48" />
        ) : apps.length === 0 ? (
          <div className="p-6">
            <EmptyState icon={Users} title="No applicants here">
              {status === "all" && !q ? "Share your club page to get applications flowing." : "Try another filter."}
            </EmptyState>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Applicant</TableHead>
                <TableHead className="hidden md:table-cell">Branch</TableHead>
                <TableHead className="hidden lg:table-cell">Skills</TableHead>
                <TableHead className="hidden sm:table-cell">Applied</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {apps.map((a) => (
                <TableRow key={a._id} onClick={() => open(a._id)} className="cursor-pointer" data-state={a._id === selectedId ? "selected" : undefined}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <UserAvatar user={a.applicant} className="h-8 w-8" />
                      <div className="min-w-0">
                        <div className="truncate font-medium">{a.applicant?.fullname}</div>
                        <div className="truncate text-xs text-muted-foreground">{a.applicant?.email}</div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="hidden text-sm md:table-cell">
                    {a.applicant?.profile?.branch}
                    {a.applicant?.profile?.year ? <span className="text-muted-foreground"> · Y{a.applicant.profile.year}</span> : null}
                  </TableCell>
                  <TableCell className="hidden lg:table-cell">
                    <div className="flex max-w-xs flex-wrap gap-1">
                      {(a.applicant?.profile?.skills || []).slice(0, 3).map((s) => (
                        <Badge key={s} variant="muted">
                          {s}
                        </Badge>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell className="hidden text-sm text-muted-foreground sm:table-cell">{relativeTime(a.createdAt)}</TableCell>
                  <TableCell>
                    <StatusBadge status={a.status} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      {hasMore && (
        <div className="text-center">
          <Button variant="outline" onClick={loadMore} loading={loadingMore}>
            Load more ({total - apps.length} more)
          </Button>
        </div>
      )}

      <Dialog open={Boolean(selected)} onOpenChange={(o) => !o && open(null)}>
        <DialogContent side="right" className="p-0">
          {selected && <ApplicantPanel key={selected._id} app={selected} onChanged={onChanged} onClose={() => open(null)} />}
        </DialogContent>
      </Dialog>
    </div>
  );
}
