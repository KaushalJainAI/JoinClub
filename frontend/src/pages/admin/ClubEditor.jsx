import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { Plus, X, ExternalLink, CheckCircle2, Circle, ImageUp } from "lucide-react";
import { useFetch } from "@/hooks/useFetch";
import { api, errorMessage } from "@/lib/api";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
import { Field } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress, Skeleton } from "@/components/ui/misc";
import { ClubLogo } from "@/components/clubs/ClubBits";

const toForm = (c) => ({
  tagline: c.tagline || "",
  pitch: c.pitch || "",
  lookingFor: c.lookingFor || "",
  commitment: c.commitment || "",
  foundedYear: c.foundedYear || "",
  memberCount: c.memberCount || "",
  color: c.color || "#2563eb",
  activities: (c.activities || []).join("\n"),
  skills: (c.skills || []).join(", "),
  whyJoin: c.whyJoin?.length ? c.whyJoin : [{ title: "", text: "" }],
  signatureEvents: c.signatureEvents?.length ? c.signatureEvents : [{ name: "", text: "" }],
  socials: { instagram: "", youtube: "", linkedin: "", facebook: "", website: "", email: "", ...(c.socials || {}) },
});

// A nudge toward a club page that sells itself.
function strength(f) {
  const checks = [
    ["A punchy tagline", f.tagline.length >= 10],
    ["A pitch of 2 to 3 sentences", f.pitch.length >= 120],
    ["At least 3 reasons to join", f.whyJoin.filter((w) => w.title && w.text).length >= 3],
    ["What members do each week", f.activities.split("\n").filter(Boolean).length >= 3],
    ["Skills students gain", f.skills.split(",").filter((s) => s.trim()).length >= 3],
    ["Signature events", f.signatureEvents.filter((e) => e.name).length >= 2],
    ["Who should apply", f.lookingFor.length >= 20],
    ["Time commitment", Boolean(f.commitment)],
    ["A social link", Object.values(f.socials).some(Boolean)],
  ];
  return { checks, score: Math.round((checks.filter(([, ok]) => ok).length / checks.length) * 100) };
}

function PairList({ items, onChange, a, b, aLabel, bLabel, max }) {
  const update = (i, key, v) => onChange(items.map((it, j) => (j === i ? { ...it, [key]: v } : it)));
  return (
    <div className="space-y-3">
      {items.map((it, i) => (
        <div key={i} className="flex gap-2 rounded-xl border bg-secondary/30 p-3">
          <div className="flex-1 space-y-2">
            <Input value={it[a]} onChange={(e) => update(i, a, e.target.value)} placeholder={aLabel} maxLength={80} />
            <Textarea value={it[b]} onChange={(e) => update(i, b, e.target.value)} placeholder={bLabel} rows={2} maxLength={300} className="min-h-0" />
          </div>
          <Button type="button" size="icon" variant="ghost" onClick={() => onChange(items.filter((_, j) => j !== i))} aria-label="Remove">
            <X />
          </Button>
        </div>
      ))}
      {items.length < max && (
        <Button type="button" size="sm" variant="ghost" onClick={() => onChange([...items, { [a]: "", [b]: "" }])}>
          <Plus /> Add
        </Button>
      )}
    </div>
  );
}

export default function ClubEditor() {
  const { data, loading } = useFetch("/clubs/mine");
  const [form, setForm] = useState(null);
  const [logo, setLogo] = useState(null);
  const [cover, setCover] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (data?.club) setForm(toForm(data.club));
  }, [data]);

  if (loading || !form) return <div className="page"><Skeleton className="h-96" /></div>;
  const club = data.club;
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const { checks, score } = strength(form);

  const save = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      const fd = new FormData();
      for (const k of ["tagline", "pitch", "lookingFor", "commitment", "color", "activities", "skills"]) fd.append(k, form[k]);
      if (form.foundedYear) fd.append("foundedYear", form.foundedYear);
      if (form.memberCount !== "") fd.append("memberCount", form.memberCount);
      fd.append("whyJoin", JSON.stringify(form.whyJoin.filter((w) => w.title.trim())));
      fd.append("signatureEvents", JSON.stringify(form.signatureEvents.filter((e) => e.name.trim())));
      fd.append("socials", JSON.stringify(form.socials));
      if (logo) fd.append("logo", logo);
      if (cover) fd.append("cover", cover);
      const { data: res } = await api.put("/clubs/mine", fd);
      toast.success(res.message);
      setLogo(null);
      setCover(null);
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={save} className="page grid gap-8 lg:grid-cols-[1fr_320px]">
      <div className="min-w-0 space-y-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="eyebrow">Your club page</p>
            <h1 className="text-2xl font-extrabold md:text-3xl">Make {club.shortName || club.name} irresistible</h1>
            <p className="text-sm text-muted-foreground">This is what every PEC student sees before deciding to apply.</p>
          </div>
          <Button variant="outline" asChild>
            <Link to={`/clubs/${club.slug}`} target="_blank">
              <ExternalLink /> Preview
            </Link>
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>First impression</CardTitle>
            <CardDescription>The top of your page. Lead with what makes you exciting, not your history.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Field label="Tagline" htmlFor="tagline" hint={`${form.tagline.length}/120. E.g. "Design it. Build it. Race it."`}>
              <Input id="tagline" value={form.tagline} onChange={set("tagline")} maxLength={120} />
            </Field>
            <Field label="Pitch" htmlFor="pitch" hint="2 to 3 sentences: what members do and what they get out of it.">
              <Textarea id="pitch" value={form.pitch} onChange={set("pitch")} maxLength={600} rows={3} />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <MediaInput label="Logo" current={club.logo} file={logo} onFile={setLogo} square />
              <MediaInput label="Cover image" current={club.cover} file={cover} onFile={setCover} />
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <Field label="Brand colour" htmlFor="color">
                <div className="flex items-center gap-2">
                  <input id="color" type="color" value={form.color} onChange={set("color")} className="h-10 w-12 cursor-pointer rounded-lg border bg-card" />
                  <Input value={form.color} onChange={set("color")} className="font-mono" />
                </div>
              </Field>
              <Field label="Founded" htmlFor="founded">
                <Input id="founded" type="number" value={form.foundedYear} onChange={set("foundedYear")} placeholder="2014" />
              </Field>
              <Field label="Active members" htmlFor="members">
                <Input id="members" type="number" value={form.memberCount} onChange={set("memberCount")} />
              </Field>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Why join</CardTitle>
            <CardDescription>3 to 4 concrete reasons. Name real events, results and experiences.</CardDescription>
          </CardHeader>
          <CardContent>
            <PairList items={form.whyJoin} onChange={(v) => setForm((f) => ({ ...f, whyJoin: v }))} a="title" b="text" aLabel="Race on a real F1 circuit" bLabel="One or two sentences that make it real." max={6} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>What members do</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <Field label="Weekly activities" htmlFor="acts" hint="One per line">
              <Textarea id="acts" value={form.activities} onChange={set("activities")} rows={5} />
            </Field>
            <div className="space-y-4">
              <Field label="Skills students gain" htmlFor="skills" hint="Comma-separated">
                <Textarea id="skills" value={form.skills} onChange={set("skills")} rows={2} className="min-h-0" />
              </Field>
              <Field label="Time commitment" htmlFor="commit">
                <Input id="commit" value={form.commitment} onChange={set("commitment")} placeholder="4 to 6 hrs / week" />
              </Field>
            </div>
            <Field label="Who should apply" htmlFor="lf" className="md:col-span-2">
              <Textarea id="lf" value={form.lookingFor} onChange={set("lookingFor")} rows={2} maxLength={300} className="min-h-0" placeholder="Every branch is welcome. The one requirement is curiosity." />
            </Field>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Signature events</CardTitle>
          </CardHeader>
          <CardContent>
            <PairList items={form.signatureEvents} onChange={(v) => setForm((f) => ({ ...f, signatureEvents: v }))} a="name" b="text" aLabel="Event name" bLabel="What happens there?" max={8} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Links</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            {Object.keys(form.socials).map((k) => (
              <Field key={k} label={k[0].toUpperCase() + k.slice(1)} htmlFor={`s-${k}`}>
                <Input id={`s-${k}`} value={form.socials[k] || ""} onChange={(e) => setForm((f) => ({ ...f, socials: { ...f.socials, [k]: e.target.value } }))} placeholder={k === "email" ? "club@pec.edu.in" : "https://…"} />
              </Field>
            ))}
          </CardContent>
        </Card>
      </div>

      <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              Page strength <span className={cn("font-display", score >= 80 ? "text-success" : score >= 50 ? "text-warning" : "text-destructive")}>{score}%</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Progress value={score} barClassName={score >= 80 ? "bg-success" : score >= 50 ? "bg-warning" : "bg-destructive"} />
            <ul className="space-y-2 text-sm">
              {checks.map(([label, ok]) => (
                <li key={label} className={cn("flex items-center gap-2", ok ? "text-foreground" : "text-muted-foreground")}>
                  {ok ? <CheckCircle2 className="h-4 w-4 text-success" /> : <Circle className="h-4 w-4" />} {label}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
        <div className="overflow-hidden rounded-2xl border shadow-soft">
          <div className="h-16" style={{ background: `linear-gradient(135deg, ${form.color}, hsl(var(--primary)))` }} />
          <div className="bg-card p-4 pt-0">
            <ClubLogo club={{ ...club, color: form.color }} className="-mt-6 mb-2 h-12 w-12 shadow" />
            <div className="font-display font-bold">{club.shortName || club.name}</div>
            <p className="line-clamp-2 text-sm text-muted-foreground">{form.tagline || "Your tagline here"}</p>
          </div>
        </div>
        <Button type="submit" size="lg" className="w-full" loading={busy}>
          Save club page
        </Button>
      </aside>
    </form>
  );
}

function MediaInput({ label, current, file, onFile, square }) {
  const preview = file ? URL.createObjectURL(file) : current;
  return (
    <label className="block cursor-pointer">
      <span className="text-sm font-medium">{label}</span>
      <div className={cn("mt-1.5 grid place-items-center overflow-hidden rounded-xl border-2 border-dashed bg-secondary/30 transition-colors hover:border-primary", square ? "h-28 w-28" : "h-28")}>
        {preview ? <img src={preview} alt="" className="h-full w-full object-cover" /> : <ImageUp className="h-6 w-6 text-muted-foreground" />}
      </div>
      <input type="file" accept="image/jpeg,image/png,image/webp,image/gif" className="sr-only" onChange={(e) => onFile(e.target.files?.[0] || null)} />
      <span className="mt-1 block text-xs text-muted-foreground">{file ? file.name : "JPG, PNG or WebP · max 5 MB"}</span>
    </label>
  );
}
