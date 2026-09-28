import { useState } from "react";
import { Link, Navigate, useNavigate, useSearchParams } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { toast } from "sonner";
import { api, errorMessage } from "@/lib/api";
import { setUser } from "@/redux/authSlice";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/input";
import { Field } from "@/components/ui/label";
import { PasswordStrength } from "@/components/layout/ChangePassword";
import { BRANCHES, passwordProblems, safeNext } from "@/lib/auth";
import AuthShell from "./AuthShell";

export default function Signup() {
  const { user } = useSelector((s) => s.auth);
  const [params] = useSearchParams();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [form, setForm] = useState({ fullname: "", email: "", phoneNumber: "", password: "", branch: "", year: "" });
  const [busy, setBusy] = useState(false);
  const next = safeNext(params.get("next"));
  const problems = passwordProblems(form.password);

  if (user) return <Navigate to={next || "/"} replace />;

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      const body = Object.fromEntries(Object.entries(form).filter(([, v]) => v !== ""));
      const { data } = await api.post("/auth/register", body);
      dispatch(setUser(data.user));
      toast.success(data.message);
      navigate(next || "/clubs", { replace: true });
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthShell title="Join JoinClub PEC" subtitle="Free for every PEC student. Takes 30 seconds.">
      <form onSubmit={submit} className="space-y-4">
        <Field label="Full name" htmlFor="fullname">
          <Input id="fullname" value={form.fullname} onChange={set("fullname")} autoComplete="name" required autoFocus />
        </Field>
        <Field label="College email" htmlFor="email" hint="We'll send a code to verify it.">
          <Input id="email" type="email" value={form.email} onChange={set("email")} autoComplete="email" placeholder="you@pec.edu.in" required />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Branch" htmlFor="branch">
            <Select id="branch" value={form.branch} onChange={set("branch")}>
              <option value="">Select</option>
              {BRANCHES.map((b) => (
                <option key={b}>{b}</option>
              ))}
            </Select>
          </Field>
          <Field label="Year" htmlFor="year">
            <Select id="year" value={form.year} onChange={set("year")}>
              <option value="">Select</option>
              {[1, 2, 3, 4, 5].map((y) => (
                <option key={y} value={y}>
                  Year {y}
                </option>
              ))}
            </Select>
          </Field>
        </div>
        <Field label="Phone (optional)" htmlFor="phone">
          <Input id="phone" value={form.phoneNumber} onChange={set("phoneNumber")} inputMode="tel" autoComplete="tel" />
        </Field>
        <Field label="Password" htmlFor="password" error={form.password && problems.length ? `Needs ${problems.join(", ")}` : null}>
          <Input id="password" type="password" value={form.password} onChange={set("password")} autoComplete="new-password" required />
          <PasswordStrength value={form.password} />
        </Field>
        <Button type="submit" size="lg" className="w-full" loading={busy} disabled={problems.length > 0}>
          Create account
        </Button>
      </form>
      <p className="mt-6 text-center text-sm text-muted-foreground">
        Already have an account?{" "}
        <Link to={`/login${next ? `?next=${encodeURIComponent(next)}` : ""}`} className="font-semibold text-primary hover:underline">
          Log in
        </Link>
      </p>
    </AuthShell>
  );
}
