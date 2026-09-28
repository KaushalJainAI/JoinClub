import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { Plus, Pencil, Users, Lock, Unlock, Trash2, X, Inbox, GripVertical } from "lucide-react";
import { useFetch } from "@/hooks/useFetch";
import { api, errorMessage } from "@/lib/api";
import { MODE_META } from "@/lib/categories";
import { formatDate, toDateInput } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input, Textarea, Select } from "@/components/ui/input";
import { Field } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/misc";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { EmptyState, DeadlinePill } from "@/components/clubs/ClubBits";

const blank = () => ({
  title: "",
  mode: "recruitment",
  description: "",
  requirements: "",
  positions: 10,
  deadline: toDateInput(new Date(Date.now() + 14 * 86400_000)),
  questions: ["Why do you want to join us?", "Tell us about something you've built, made or organised."],
});

function OpeningForm({ initial, locked, onSaved, onCancel }) {
  const [form, setForm] = useState(initial);
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const setQ = (i, v) => setForm((f) => ({ ...f, questions: f.questions.map((q, j) => (j === i ? v : q)) }));

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    const body = {
      ...form,
      positions: Number(form.positions),
      questions: form.questions.map((q) => q.trim()).filter(Boolean),
    };
    // Unchanged questions are left out, since the server refuses edits once students have answered.
    if (locked) delete body.questions;
    try {
      const { data } = initial._id ? await api.put(`/openings/${initial._id}`, body) : await api.post("/openings", body);
      toast.success(data.message);
      onSaved();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      <Field label="Title" htmlFor="title">
        <Input id="title" value={form.title} onChange={set("title")} placeholder="Core Team Recruitment 2026" required />
      </Field>
      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="Type" htmlFor="mode">
          <Select id="mode" value={form.mode} onChange={set("mode")}>
            {Object.entries(MODE_META).map(([k, v]) => (
              <option key={k} value={k}>
                {v.label}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Spots" htmlFor="positions">
          <Input id="positions" type="number" min={1} max={500} value={form.positions} onChange={set("positions")} required />
        </Field>
        <Field label="Deadline" htmlFor="deadline" hint="Closes 11:59 pm IST">
          <Input id="deadline" type="date" value={form.deadline} onChange={set("deadline")} required />
        </Field>
      </div>
      <Field label="Description" htmlFor="desc" hint="Sell it! What will selected students do, learn and experience?">
        <Textarea id="desc" rows={5} value={form.description} onChange={set("description")} required minLength={10} />
      </Field>
      <Field label="Requirements" htmlFor="req" hint="One per line or comma-separated">
        <Textarea id="req" rows={3} value={form.requirements} onChange={set("requirements")} className="min-h-0" />
      </Field>
      <div>
        <div className="mb-2 flex items-center justify-between">
          <span className="text-sm font-medium">Application questions</span>
          {!locked && form.questions.length < 8 && (
            <Button type="button" size="sm" variant="ghost" onClick={() => setForm((f) => ({ ...f, questions: [...f.questions, ""] }))}>
              <Plus /> Add question
            </Button>
          )}
        </div>
        {locked && <p className="mb-2 text-xs text-muted-foreground">Students have already answered these, so they can't be changed.</p>}
        <div className="space-y-2">
          {form.questions.map((q, i) => (
            <div key={i} className="flex items-center gap-2">
              <GripVertical className="h-4 w-4 shrink-0 text-muted-foreground" />
              <Input value={q} onChange={(e) => setQ(i, e.target.value)} placeholder={`Question ${i + 1}`} disabled={locked} />
              {!locked && (
                <Button type="button" size="icon" variant="ghost" onClick={() => setForm((f) => ({ ...f, questions: f.questions.filter((_, j) => j !== i) }))} aria-label="Remove question">
                  <X />
                </Button>
              )}
            </div>
          ))}
        </div>
      </div>
      <DialogFooter>
        <Button type="button" variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" loading={busy}>
          {initial._id ? "Save changes" : "Publish opening"}
        </Button>
      </DialogFooter>
    </form>
  );
}

export default function Openings() {
  const [params, setParams] = useSearchParams();
  const { data, loading, reload } = useFetch("/openings/mine");
  const [editing, setEditing] = useState(null);

  useEffect(() => {
    if (params.get("new")) {
      setEditing(blank());
      setParams({}, { replace: true });
    }
  }, [params, setParams]);

  const openings = data?.openings || [];

  const toggle = async (o) => {
    try {
      const reopening = o.status === "closed";
      if (reopening && new Date(o.deadline) < new Date()) {
        toast.error("Move the deadline into the future (Edit) before reopening.");
        return;
      }
      await api.put(`/openings/${o._id}`, { status: reopening ? "open" : "closed" });
      toast.success(reopening ? "Opening reopened." : "Opening closed. Students can no longer apply.");
      reload();
    } catch (err) {
      toast.error(errorMessage(err));
    }
  };

  const remove = async (o) => {
    if (!confirm(`Delete "${o.title}"? This can't be undone.`)) return;
    try {
      await api.delete(`/openings/${o._id}`);
      toast.success("Opening deleted.");
      reload();
    } catch (err) {
      toast.error(errorMessage(err));
    }
  };

  return (
    <div className="page space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="eyebrow">Recruitment</p>
          <h1 className="text-2xl font-extrabold md:text-3xl">Openings</h1>
        </div>
        <Button onClick={() => setEditing(blank())}>
          <Plus /> New opening
        </Button>
      </div>

      {loading && !data ? (
        <Skeleton className="h-64" />
      ) : openings.length === 0 ? (
        <EmptyState icon={Inbox} title="No openings yet" action={<Button onClick={() => setEditing(blank())}>Publish your first opening</Button>}>
          Openings appear on your club page and in "Recruiting now" across the site.
        </EmptyState>
      ) : (
        <div className="grid gap-4">
          {openings.map((o) => (
            <div key={o._id} className="rounded-2xl border bg-card p-5 shadow-soft">
              <div className="flex flex-wrap items-start gap-3">
                <div className="min-w-0 flex-1">
                  <div className="mb-1 flex flex-wrap items-center gap-2">
                    <Badge variant="muted">{MODE_META[o.mode]?.label}</Badge>
                    {o.isOpen ? <Badge variant="success">Open</Badge> : <Badge variant="muted">Closed</Badge>}
                    {o.isOpen && <DeadlinePill deadline={o.deadline} />}
                  </div>
                  <h2 className="font-display text-lg font-bold">{o.title}</h2>
                  <p className="text-xs text-muted-foreground">
                    Deadline {formatDate(o.deadline)} · {o.positions} spots · created {formatDate(o.createdAt)}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" asChild>
                    <Link to={`/admin/openings/${o._id}`}>
                      <Users /> Applicants ({o.counts.total})
                    </Link>
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      setEditing({
                        _id: o._id,
                        title: o.title,
                        mode: o.mode,
                        description: o.description,
                        requirements: (o.requirements || []).join("\n"),
                        positions: o.positions,
                        deadline: toDateInput(o.deadline),
                        questions: o.questions,
                        locked: o.counts.total > 0,
                      })
                    }
                  >
                    <Pencil /> Edit
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => toggle(o)}>
                    {o.status === "closed" ? <Unlock /> : <Lock />} {o.status === "closed" ? "Reopen" : "Close"}
                  </Button>
                  {o.counts.total === 0 && (
                    <Button size="sm" variant="ghost" onClick={() => remove(o)} aria-label="Delete opening">
                      <Trash2 />
                    </Button>
                  )}
                </div>
              </div>
              {o.counts.total > 0 && (
                <div className="mt-4 flex flex-wrap gap-4 border-t pt-3 text-xs text-muted-foreground">
                  {["pending", "shortlisted", "accepted", "rejected", "withdrawn"].map((s) =>
                    o.counts[s] ? (
                      <span key={s}>
                        <strong className="text-foreground">{o.counts[s]}</strong> {s}
                      </span>
                    ) : null
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <Dialog open={Boolean(editing)} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editing?._id ? "Edit opening" : "New opening"}</DialogTitle>
            <DialogDescription>Students see this on your club page and in "Recruiting now".</DialogDescription>
          </DialogHeader>
          {editing && (
            <OpeningForm
              initial={editing}
              locked={editing.locked}
              onCancel={() => setEditing(null)}
              onSaved={() => {
                setEditing(null);
                reload();
              }}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
