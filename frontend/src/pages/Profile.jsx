import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { toast } from "sonner";
import { Camera, FileText, ShieldCheck, MailCheck, MailWarning } from "lucide-react";
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
    if (hash === "#security") document.getElementById("security")?.scrollIntoView({ behavior: "smooth" });
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
    </div>
  );
}
