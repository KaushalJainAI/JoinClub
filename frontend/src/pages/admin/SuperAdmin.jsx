import { useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { KeyRound, Copy, ShieldCheck, AlertTriangle, Plus, Pencil, Archive, ArchiveRestore, UserPlus } from "lucide-react";
import { useFetch, useDebounced } from "@/hooks/useFetch";
import { api, errorMessage } from "@/lib/api";
import { CATEGORIES } from "@/lib/categories";
import { cn, formatDate, plural } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input, Select, Textarea } from "@/components/ui/input";
import { Field } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/misc";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { ClubLogo, CategoryBadge } from "@/components/clubs/ClubBits";

const TABS = [
  ["clubs", "Clubs & admins"],
  ["people", "People"],
  ["ai", "AI usage"],
];

export default function SuperAdmin() {
  const [tab, setTab] = useState("clubs");
  return (
    <div className="page space-y-6">
      <div>
        <p className="eyebrow">Super admin</p>
        <h1 className="text-2xl font-extrabold md:text-3xl">Run the site</h1>
      </div>
      <div className="flex gap-1 overflow-x-auto rounded-xl bg-muted p-1">
        {TABS.map(([k, label]) => (
          <button key={k} onClick={() => setTab(k)} className={cn("shrink-0 rounded-lg px-3 py-1.5 text-sm font-semibold", tab === k ? "bg-card shadow-sm" : "text-muted-foreground")}>
            {label}
          </button>
        ))}
      </div>
      {tab === "clubs" && <ClubsTab />}
      {tab === "people" && <PeopleTab />}
      {tab === "ai" && <AiTab />}
    </div>
  );
}

// ---------- clubs & admins ----------

function ClubsTab() {
  const { data, loading, reload } = useFetch("/admin/clubs");
  const { data: stats } = useFetch("/stats");
  const [issued, setIssued] = useState(null);
  const [busy, setBusy] = useState(null);
  const [editing, setEditing] = useState(null); // club object or "new"
  const [inviting, setInviting] = useState(false);
  const [reassigning, setReassigning] = useState(null); // admin object

  const call = async (key, fn, ok) => {
    setBusy(key);
    try {
      const res = await fn();
      toast.success(ok || res.data.message);
      reload();
      return res.data;
    } catch (err) {
      toast.error(errorMessage(err));
      return null;
    } finally {
      setBusy(null);
    }
  };

  const reset = async (admin) => {
    if (!confirm(`Generate a new temporary password for ${admin.email}? Their current password stops working.`)) return;
    const res = await call(admin._id, () => api.post(`/admin/admins/${admin._id}/reset-password`));
    if (res) setIssued(res);
  };

  const archive = (club) =>
    confirm(club.archivedAt ? `Restore ${club.name} to the site?` : `Archive ${club.name}? It disappears from lists; its history stays.`) &&
    call(`arch-${club._id}`, () => api.post(`/admin/clubs/${club._id}/archive`));

  const setActive = (admin, active) =>
    confirm(active ? `Reactivate ${admin.email}?` : `Deactivate ${admin.email}? They are signed out and can't sign in.`) &&
    call(`act-${admin._id}`, () => api.post(`/admin/admins/${admin._id}/active`, { active }));

  return (
    <div className="space-y-6">
      {stats && (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
          {Object.entries(stats.stats).map(([k, v]) => (
            <div key={k} className="rounded-2xl border bg-card p-4 shadow-soft">
              <div className="font-display text-2xl font-extrabold">{v}</div>
              <div className="text-xs capitalize text-muted-foreground">{k}</div>
            </div>
          ))}
        </div>
      )}
      <div className="flex flex-wrap gap-2">
        <Button onClick={() => setEditing("new")}>
          <Plus /> New club
        </Button>
        <Button variant="outline" onClick={() => setInviting(true)}>
          <UserPlus /> Invite admin
        </Button>
      </div>
      <div className="overflow-hidden rounded-2xl border bg-card shadow-soft">
        {loading && !data ? (
          <Skeleton className="m-4 h-64" />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Club</TableHead>
                <TableHead className="hidden md:table-cell">Category</TableHead>
                <TableHead>Admin</TableHead>
                <TableHead className="hidden sm:table-cell">Applications</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {data?.clubs.map((c) =>
                (c.admins.length ? c.admins : [null]).map((a, i) => (
                  <TableRow key={`${c._id}-${a?._id || i}`}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Link to={`/clubs/${c.slug}`} className="flex items-center gap-3 hover:text-primary">
                          <ClubLogo club={c} className="h-9 w-9" />
                          <span className="font-medium">{c.shortName || c.name}</span>
                        </Link>
                        {c.archivedAt && <Badge variant="muted">Archived</Badge>}
                      </div>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      <CategoryBadge category={c.category} />
                    </TableCell>
                    <TableCell>
                      {a ? (
                        <div>
                          <div className="text-sm">{a.email}</div>
                          <div className="mt-1 flex flex-wrap gap-1">
                            {a.active === false ? (
                              <Badge variant="destructive">Deactivated</Badge>
                            ) : a.mustChangePassword ? (
                              <Badge variant="warning">Temporary password</Badge>
                            ) : (
                              <Badge variant="success">
                                <ShieldCheck /> Active since {formatDate(a.updatedAt)}
                              </Badge>
                            )}
                          </div>
                        </div>
                      ) : (
                        <span className="text-sm text-muted-foreground">No admin</span>
                      )}
                    </TableCell>
                    <TableCell className="hidden sm:table-cell">{c.applications}</TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-1.5">
                        <Button size="sm" variant="ghost" onClick={() => setEditing(c)} aria-label={`Edit ${c.name}`}>
                          <Pencil />
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => archive(c)} loading={busy === `arch-${c._id}`} aria-label={c.archivedAt ? `Restore ${c.name}` : `Archive ${c.name}`}>
                          {c.archivedAt ? <ArchiveRestore /> : <Archive />}
                        </Button>
                        {a && (
                          <>
                            <Button size="sm" variant="outline" onClick={() => reset(a)} loading={busy === a._id}>
                              <KeyRound /> Reset password
                            </Button>
                            <Button size="sm" variant="ghost" onClick={() => setReassigning(a)}>
                              Move
                            </Button>
                            <Button size="sm" variant="ghost" onClick={() => setActive(a, a.active === false)} loading={busy === `act-${a._id}`}>
                              {a.active === false ? "Reactivate" : "Deactivate"}
                            </Button>
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        )}
      </div>

      <Dialog open={Boolean(issued)} onOpenChange={(o) => !o && setIssued(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New temporary password</DialogTitle>
            <DialogDescription>{issued?.message}</DialogDescription>
          </DialogHeader>
          <div className="flex items-center gap-2 rounded-xl border bg-secondary/50 p-3 font-mono text-lg">
            <span className="flex-1 select-all">{issued?.password}</span>
            <Button
              size="icon"
              variant="ghost"
              onClick={() => navigator.clipboard.writeText(`${issued.email} / ${issued.password}`).then(() => toast.success("Copied."))}
              aria-label="Copy"
            >
              <Copy />
            </Button>
          </div>
          <p className="flex items-start gap-2 text-sm text-warning">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" /> This is shown only once. It isn&apos;t stored anywhere in plain text.
          </p>
        </DialogContent>
      </Dialog>

      <Dialog open={editing !== null} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent>{editing && <ClubForm club={editing === "new" ? null : editing} onDone={() => (setEditing(null), reload())} />}</DialogContent>
      </Dialog>

      <Dialog open={inviting} onOpenChange={setInviting}>
        <DialogContent>
          <InviteForm clubs={data?.clubs || []} onDone={() => (setInviting(false), reload())} />
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(reassigning)} onOpenChange={(o) => !o && setReassigning(null)}>
        <DialogContent>
          {reassigning && <ReassignForm admin={reassigning} clubs={data?.clubs || []} onDone={() => (setReassigning(null), reload())} />}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ClubForm({ club, onDone }) {
  const [form, setForm] = useState({
    name: club?.name || "",
    shortName: club?.shortName || "",
    category: club?.category || "technical",
    tagline: club?.tagline || "",
    email: club?.socials?.email || club?.email || "",
    about: (club?.about || []).join("\n\n"),
  });
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      const body = { ...form, about: form.about.split(/\n\s*\n/).map((s) => s.trim()).filter(Boolean) };
      const { data } = club ? await api.put(`/admin/clubs/${club._id}`, body) : await api.post("/admin/clubs", body);
      toast.success(data.message);
      onDone();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      <DialogHeader>
        <DialogTitle>{club ? `Edit ${club.name}` : "New club"}</DialogTitle>
        <DialogDescription>{club ? "The slug stays put: it is already in club URLs." : "A slug is made from the name."}</DialogDescription>
      </DialogHeader>
      <Field label="Name" htmlFor="club-name">
        <Input id="club-name" value={form.name} onChange={set("name")} required minLength={2} />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Short name" htmlFor="club-short">
          <Input id="club-short" value={form.shortName} onChange={set("shortName")} placeholder="IEEE" />
        </Field>
        <Field label="Category" htmlFor="club-cat">
          <Select id="club-cat" value={form.category} onChange={set("category")}>
            {Object.entries(CATEGORIES).map(([k, v]) => (
              <option key={k} value={k}>
                {v.label}
              </option>
            ))}
          </Select>
        </Field>
      </div>
      <Field label="Tagline" htmlFor="club-tag">
        <Input id="club-tag" value={form.tagline} onChange={set("tagline")} maxLength={120} />
      </Field>
      <Field label="Contact email" htmlFor="club-email">
        <Input id="club-email" type="email" value={form.email} onChange={set("email")} />
      </Field>
      <Field label="About (blank line between paragraphs)" htmlFor="club-about">
        <Textarea id="club-about" value={form.about} onChange={set("about")} rows={5} />
      </Field>
      <Button type="submit" loading={busy} className="w-full">
        {club ? "Save club" : "Create club"}
      </Button>
    </form>
  );
}

function InviteForm({ clubs, onDone }) {
  const [form, setForm] = useState({ email: "", fullname: "", club: "" });
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      const { data } = await api.post("/admin/admins", { ...form, club: form.club || undefined });
      toast.success(data.message);
      onDone();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      <DialogHeader>
        <DialogTitle>Invite a club admin</DialogTitle>
        <DialogDescription>
          They get an emailed code to set their password — no plain-text password is ever sent or stored.
        </DialogDescription>
      </DialogHeader>
      <Field label="Email" htmlFor="inv-email">
        <Input id="inv-email" type="email" value={form.email} onChange={set("email")} required />
      </Field>
      <Field label="Full name (optional)" htmlFor="inv-name">
        <Input id="inv-name" value={form.fullname} onChange={set("fullname")} />
      </Field>
      <Field label="Club (optional — the yearly handover can set it later)" htmlFor="inv-club">
        <Select id="inv-club" value={form.club} onChange={set("club")}>
          <option value="">No club yet</option>
          {clubs.map((c) => (
            <option key={c._id} value={c.slug}>
              {c.name}
            </option>
          ))}
        </Select>
      </Field>
      <Button type="submit" loading={busy} className="w-full">
        Send invite
      </Button>
    </form>
  );
}

function ReassignForm({ admin, clubs, onDone }) {
  const current = clubs.find((c) => c.admins.some((a) => a._id === admin._id));
  const [club, setClub] = useState(current?.slug || "");
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      const { data } = await api.post(`/admin/admins/${admin._id}/reassign`, { club: club || null });
      toast.success(data.message);
      onDone();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      <DialogHeader>
        <DialogTitle>Move {admin.email}</DialogTitle>
        <DialogDescription>
          The yearly handover: point the account at this year&apos;s club. They are signed out everywhere.
        </DialogDescription>
      </DialogHeader>
      <Field label="Club" htmlFor="reas-club">
        <Select id="reas-club" value={club} onChange={(e) => setClub(e.target.value)}>
          <option value="">No club (remove admin access)</option>
          {clubs.map((c) => (
            <option key={c._id} value={c.slug}>
              {c.name}
            </option>
          ))}
        </Select>
      </Field>
      <Button type="submit" loading={busy} className="w-full">
        Move admin
      </Button>
    </form>
  );
}

// ---------- people ----------

function PeopleTab() {
  const [q, setQ] = useState("");
  const [role, setRole] = useState("all");
  const dq = useDebounced(q);
  const query = new URLSearchParams({ ...(dq && { q: dq }), ...(role !== "all" && { role }) });
  const { data, loading, reload } = useFetch(`/admin/users?${query}`);
  const [busy, setBusy] = useState(null);

  const setActive = async (u, active) => {
    setBusy(u._id);
    try {
      const { data: res } = await api.post(`/admin/admins/${u._id}/active`, { active });
      toast.success(res.message);
      reload();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 md:flex-row">
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Name or email…" className="md:max-w-xs" aria-label="Search users" />
        <Select value={role} onChange={(e) => setRole(e.target.value)} className="md:max-w-[12rem]" aria-label="Filter by role">
          <option value="all">Every role</option>
          <option value="student">Students</option>
          <option value="club_admin">Club admins</option>
          <option value="super_admin">Super admins</option>
        </Select>
      </div>
      <div className="overflow-hidden rounded-2xl border bg-card shadow-soft">
        {loading && !data ? (
          <Skeleton className="m-4 h-64" />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead className="hidden md:table-cell">Role</TableHead>
                <TableHead className="hidden sm:table-cell">Club</TableHead>
                <TableHead className="hidden lg:table-cell">Joined</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {(data?.users || []).map((u) => (
                <TableRow key={u._id}>
                  <TableCell>
                    <div className="font-medium">{u.fullname}</div>
                    <div className="text-xs text-muted-foreground">{u.email}</div>
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    <div className="flex gap-1">
                      <Badge variant="muted">{u.role}</Badge>
                      {u.active === false && <Badge variant="destructive">off</Badge>}
                    </div>
                  </TableCell>
                  <TableCell className="hidden text-sm sm:table-cell">{u.club?.name || "—"}</TableCell>
                  <TableCell className="hidden text-sm text-muted-foreground lg:table-cell">{formatDate(u.createdAt)}</TableCell>
                  <TableCell className="text-right">
                    {u.role !== "super_admin" && (
                      <Button size="sm" variant="ghost" onClick={() => setActive(u, u.active === false)} loading={busy === u._id}>
                        {u.active === false ? "Reactivate" : "Deactivate"}
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
      <p className="text-sm text-muted-foreground">{plural(data?.users?.length || 0, "account")} shown (latest 200).</p>
    </div>
  );
}

// ---------- AI usage ----------

const TOK = (n) => (n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n || 0));

function AiTab() {
  const [days, setDays] = useState(7);
  const { data, loading } = useFetch(`/admin/ai-usage?days=${days}`);
  const t = data?.totals;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <p className="text-sm text-muted-foreground">Token spend and traffic per AI feature.</p>
        <Select value={String(days)} onChange={(e) => setDays(Number(e.target.value))} className="ml-auto max-w-[10rem]" aria-label="Days">
          <option value="7">Last 7 days</option>
          <option value="30">Last 30 days</option>
        </Select>
      </div>
      {loading && !data ? (
        <Skeleton className="h-64" />
      ) : !data ? (
        <p className="text-sm text-muted-foreground">Couldn&apos;t load usage.</p>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
            <Stat label="Calls" value={t.calls} />
            <Stat label="Input tokens" value={TOK(t.inputTokens)} />
            <Stat label="Output tokens" value={TOK(t.outputTokens)} />
            <Stat label="Cache reads" value={TOK(t.cacheReadTokens)} hint="Non-zero proves prompt caching works" />
            <Stat label="Cache writes" value={TOK(t.cacheWriteTokens)} />
          </div>
          <div className="overflow-hidden rounded-2xl border bg-card shadow-soft">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Feature</TableHead>
                  <TableHead className="text-right">Calls</TableHead>
                  <TableHead className="text-right">Input</TableHead>
                  <TableHead className="text-right">Output</TableHead>
                  <TableHead className="hidden text-right sm:table-cell">Cache read</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.byFeature.map((f) => (
                  <TableRow key={f.feature}>
                    <TableCell className="font-medium">{f.feature}</TableCell>
                    <TableCell className="text-right">{f.calls}</TableCell>
                    <TableCell className="text-right">{TOK(f.inputTokens)}</TableCell>
                    <TableCell className="text-right">{TOK(f.outputTokens)}</TableCell>
                    <TableCell className="hidden text-right sm:table-cell">{TOK(f.cacheReadTokens)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          {data.topUsers.length > 0 && (
            <div className="overflow-hidden rounded-2xl border bg-card shadow-soft">
              <h3 className="border-b px-5 py-3 text-sm font-bold">Heaviest users (spot abuse before the bill)</h3>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead className="text-right">Calls</TableHead>
                    <TableHead className="text-right">Tokens in/out</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.topUsers.map((r) => (
                    <TableRow key={r.user?._id || r.user?.email}>
                      <TableCell>
                        <div className="font-medium">{r.user?.fullname || "Guest/removed"}</div>
                        <div className="text-xs text-muted-foreground">{r.user?.email}</div>
                      </TableCell>
                      <TableCell className="text-right">{r.calls}</TableCell>
                      <TableCell className="text-right">
                        {TOK(r.inputTokens)} / {TOK(r.outputTokens)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
          {data.byDay.length > 1 && (
            <div className="rounded-2xl border bg-card p-5 shadow-soft">
              <h3 className="text-sm font-bold">Calls per day</h3>
              <div className="mt-3 flex h-24 items-end gap-1">
                {data.byDay.map((d) => (
                  <div key={d._id} className="flex flex-1 flex-col items-center gap-1" title={`${d._id}: ${d.calls} calls`}>
                    <div className="w-full rounded-t bg-primary/70" style={{ height: `${Math.max(4, (d.calls / Math.max(...data.byDay.map((x) => x.calls))) * 88)}px` }} />
                    <span className="text-[10px] text-muted-foreground">{d._id.slice(5)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function Stat({ label, value, hint }) {
  return (
    <div className="rounded-2xl border bg-card p-4 shadow-soft" title={hint}>
      <div className="font-display text-2xl font-extrabold">{value}</div>
      <div className="text-xs text-muted-foreground">{label}</div>
    </div>
  );
}
