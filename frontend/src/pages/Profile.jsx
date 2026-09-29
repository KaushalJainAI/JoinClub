import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { toast } from "sonner";
import { Camera, FileText, ShieldCheck, MailCheck, MailWarning, Download, Trash2 } from "lucide-react";
import { api, errorMessage } from "@/lib/api";
import { setUser } from "@/redux/authSlice";
import { Button } from "@/components/ui/button";
import { Input, Textarea, Select } from "@/components/ui/input";
import { Field } from "@/components/ui/label";
import { UserAvatar } from "@/components/ui/avatar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import ChangePassword from "@/components/layout/ChangePassword";
import { BRANCHES } from "@/lib/auth";

export default function Profile() {
  const { user } = useSelector((s) => s.auth);
  const dispatch = useDispatch();
  const { hash } = useLocation();
  const p = user.profile || {};
  const [form, setForm] = useState({
    fullname: user.fullname,
    phoneNumber: user.phoneNumber || "",
    bio: p.bio || "",
    skills: (p.skills || []).join(", "),
    interests: (p.interests || []).join(", "),
    branch: p.branch || "",
    year: p.year || "",
    sid: p.sid || "",
  });
  const [photo, setPhoto] = useState(null);
  const [resume, setResume] = useState(null);
  const [saving, setSaving] = useState(false);
  const isStudent = user.role === "student";

  useEffect(() => {
    if (hash) document.getElementById(hash.slice(1))?.scrollIntoView({ behavior: "smooth" });
  }, [hash]);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const save = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const fd = new FormData();
      Object.entries(form).forEach(([k, v]) => v !== "" && fd.append(k, v));
      if (photo) fd.append("file", photo);
      if (resume) fd.append("resume", resume);
      const { data } = await api.put("/users/profile", fd);
      dispatch(setUser(data.user));
      setPhoto(null);
      setResume(null);
      toast.success(data.message);
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="page max-w-4xl space-y-8">
      <div className="flex flex-wrap items-center gap-5">
        <label className="group relative cursor-pointer">
          <UserAvatar user={user} className="h-20 w-20 text-xl" />
          <span className="absolute inset-0 grid place-items-center rounded-full bg-black/50 text-white opacity-0 transition-opacity group-hover:opacity-100">
            <Camera className="h-5 w-5" />
          </span>
          <input type="file" accept="image/jpeg,image/png,image/webp,image/gif" className="sr-only" onChange={(e) => setPhoto(e.target.files?.[0] || null)} />
        </label>
        <div>
          <h1 className="text-2xl font-extrabold md:text-3xl">{user.fullname}</h1>
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            {user.email}
            {user.emailVerified ? (
              <Badge variant="success">
                <MailCheck /> Verified
              </Badge>
            ) : (
              <Badge variant="warning">
                <MailWarning /> Not verified
              </Badge>
            )}
          </p>
          {photo && <p className="mt-1 text-xs text-primary">New photo selected: save to upload it.</p>}
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Profile</CardTitle>
          <CardDescription>{isStudent ? "Clubs see this when you apply. A good profile helps you stand out." : "Your account details."}</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={save} className="grid gap-5 md:grid-cols-2">
            <Field label="Full name" htmlFor="fullname">
              <Input id="fullname" value={form.fullname} onChange={set("fullname")} required />
            </Field>
            <Field label="Phone" htmlFor="phone">
              <Input id="phone" value={form.phoneNumber} onChange={set("phoneNumber")} inputMode="tel" />
            </Field>
            {isStudent && (
              <>
                <Field label="Branch" htmlFor="branch">
                  <Select id="branch" value={form.branch} onChange={set("branch")}>
                    <option value="">Select your branch</option>
                    {BRANCHES.map((b) => (
                      <option key={b}>{b}</option>
                    ))}
                  </Select>
                </Field>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Year" htmlFor="year">
                    <Select id="year" value={form.year} onChange={set("year")}>
                      <option value="">–</option>
                      {[1, 2, 3, 4, 5].map((y) => (
                        <option key={y} value={y}>
                          Year {y}
                        </option>
                      ))}
                    </Select>
                  </Field>
                  <Field label="SID" htmlFor="sid">
                    <Input id="sid" value={form.sid} onChange={set("sid")} placeholder="24103001" />
                  </Field>
                </div>
                <Field label="About you" htmlFor="bio" className="md:col-span-2" hint="One or two lines. What do you love building, playing or making?">
                  <Textarea id="bio" value={form.bio} onChange={set("bio")} maxLength={500} rows={3} />
                </Field>
                <Field label="Skills" htmlFor="skills" hint="Comma-separated, e.g. Python, Guitar, Photoshop">
                  <Input id="skills" value={form.skills} onChange={set("skills")} />
                </Field>
                <Field label="Interests" htmlFor="interests" hint="PEC Buddy uses these to suggest clubs">
                  <Input id="interests" value={form.interests} onChange={set("interests")} placeholder="Robotics, Music, Debating" />
                </Field>
                <Field label="Resume (PDF, optional)" htmlFor="resume" className="md:col-span-2">
                  <div className="flex flex-wrap items-center gap-3">
                    <Input id="resume" type="file" accept="application/pdf" onChange={(e) => setResume(e.target.files?.[0] || null)} className="max-w-xs" />
                    {p.resume && (
                      <a href={p.resume} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline">
                        <FileText className="h-4 w-4" /> {p.resumeOriginalName || "Current resume"}
                      </a>
                    )}
                  </div>
                </Field>
              </>
            )}
            <div className="md:col-span-2">
              <Button type="submit" loading={saving}>
                Save changes
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card id="security" className="scroll-mt-24">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-success" /> Security
          </CardTitle>
          <CardDescription>Change your password. The easiest way is a one-time code sent to {user.email}.</CardDescription>
        </CardHeader>
        <CardContent className="max-w-md">
          <ChangePassword />
        </CardContent>
      </Card>

      <PrivacyCard />
    </div>
  );
}

function PrivacyCard() {
  const { user } = useSelector((s) => s.auth);
  const dispatch = useDispatch();
  const [busy, setBusy] = useState(null);

  const savePrefs = async (patch) => {
    setBusy("prefs");
    try {
      // JSON, not FormData: the toggles are real booleans, not multipart strings.
      const { data } = await api.put("/users/profile", patch);
      dispatch(setUser(data.user));
      toast.success("Privacy settings updated.");
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusy(null);
    }
  };

  const download = async () => {
    setBusy("export");
    try {
      const { data } = await api.get("/users/me/export");
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `joinclub-export-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(a.href);
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusy(null);
    }
  };

  const erase = async () => {
    const typed = prompt(`Type DELETE to erase your account${user.role === "student" ? " (your applications stay, anonymised)" : ""}. This can't be undone.`);
    if (typed !== "DELETE") return;
    setBusy("delete");
    try {
      const { data } = await api.delete("/users/me");
      toast.success(data.message);
      dispatch(setUser(null));
      location.href = "/";
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusy(null);
    }
  };

  return (
    <Card id="privacy" className="scroll-mt-24">
      <CardHeader>
        <CardTitle>Privacy and AI</CardTitle>
        <CardDescription>
          What the AI features may use, and everything we hold about you. Full details in the{" "}
          <Link to="/privacy" className="font-medium text-primary hover:underline">
            privacy notice
          </Link>
          .
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Toggle
          label="Let AI features use my data"
          hint="PEC Buddy, the answer checker and mock interviews send your profile and answers to Anthropic. Off means those features stay off; everything else works."
          checked={user.consentAi !== false}
          onChange={(v) => savePrefs({ consentAi: v })}
          busy={busy === "prefs"}
        />
        {user.role === "student" && (
          <Toggle
            label="Let clubs see an AI summary of my applications"
            hint="Club admins can generate a one-line AI summary of your answers. It is labelled as AI-generated; they still decide."
            checked={user.aiApplicantSummary !== false}
            onChange={(v) => savePrefs({ aiApplicantSummary: v })}
            busy={busy === "prefs"}
          />
        )}
        <div className="flex flex-wrap gap-2 pt-1">
          <Button variant="outline" onClick={download} loading={busy === "export"}>
            <Download /> Export my data (JSON)
          </Button>
          <Button variant="destructive" onClick={erase} loading={busy === "delete"}>
            <Trash2 /> Delete my account…
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function Toggle({ label, hint, checked, onChange, busy }) {
  return (
    <label className="flex cursor-pointer items-start justify-between gap-4 rounded-xl border p-4">
      <span>
        <span className="block text-sm font-semibold">{label}</span>
        <span className="mt-0.5 block text-sm text-muted-foreground">{hint}</span>
      </span>
      <input
        type="checkbox"
        checked={checked}
        disabled={busy}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-1 h-5 w-5 shrink-0 accent-primary"
        aria-label={label}
      />
    </label>
  );
}
