import { useState } from "react";
import { Link, Navigate, useNavigate, useSearchParams } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { toast } from "sonner";
import { api, errorMessage } from "@/lib/api";
import { setUser } from "@/redux/authSlice";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/input";
import { Field } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { PasswordStrength } from "@/components/layout/ChangePassword";
import OtpInput from "@/components/layout/OtpInput";
import { BRANCHES, passwordProblems, safeNext } from "@/lib/auth";
import AuthShell from "./AuthShell";

export default function Signup() {
  const { user } = useSelector((s) => s.auth);
  const [params] = useSearchParams();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [form, setForm] = useState({ fullname: "", email: "", phoneNumber: "", password: "", branch: "", year: "" });
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [verifyOpen, setVerifyOpen] = useState(false);
  const [code, setCode] = useState("");
  const [verifying, setVerifying] = useState(false);
  const next = safeNext(params.get("next"));
  const problems = passwordProblems(form.password);

  if (user && !verifyOpen) return <Navigate to={next || "/"} replace />;

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    if (!consent) {
      toast.error("Please accept the privacy notice to create an account.");
      return;
    }
    setBusy(true);
    try {
      const body = Object.fromEntries(Object.entries(form).filter(([, v]) => v !== ""));
      const { data } = await api.post("/auth/register", { ...body, consentAi: consent });
      dispatch(setUser(data.user));
      toast.success(data.message);
      // The welcome email with the code is already on its way; verify now instead
      // of leaving it to the banner.
      if (data.user?.emailVerified) navigate(next || "/clubs", { replace: true });
      else setVerifyOpen(true);
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const verify = async () => {
    setVerifying(true);
    try {
      const { data } = await api.post("/auth/email/verify", { code });
      dispatch(setUser(data.user));
      toast.success(data.message);
      setVerifyOpen(false);
      navigate(next || "/clubs", { replace: true });
    } catch (err) {
      toast.error(errorMessage(err));
      setCode("");
    } finally {
      setVerifying(false);
    }
  };

  const resend = async () => {
    try {
      const { data } = await api.post("/auth/otp/request", { purpose: "verify_email" });
      toast.success(data.message);
    } catch (err) {
      toast.error(errorMessage(err));
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
        <label htmlFor="consent" className="flex cursor-pointer items-start gap-2.5 text-sm text-muted-foreground">
          <input id="consent" type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} className="mt-1 h-4 w-4 shrink-0 accent-primary" required />
          <span>
            I agree to the{" "}
            <Link to="/privacy" target="_blank" className="font-medium text-primary hover:underline">
              privacy notice
            </Link>
            , including AI processing of my answers and profile by Anthropic. I can withdraw this any time in my
            profile.
          </span>
        </label>
        <Button type="submit" size="lg" className="w-full" loading={busy} disabled={problems.length > 0 || !consent}>
          Create account
        </Button>
      </form>
      <Dialog open={verifyOpen} onOpenChange={setVerifyOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Verify your email</DialogTitle>
            <DialogDescription>
              Enter the 6-digit code we sent to {form.email}. You need this before you can apply to clubs.
            </DialogDescription>
          </DialogHeader>
          <OtpInput value={code} onChange={setCode} disabled={verifying} />
          <Button onClick={verify} loading={verifying} disabled={code.length !== 6}>
            Verify email
          </Button>
          <button onClick={resend} className="text-sm text-muted-foreground hover:text-foreground">
            Didn&apos;t get it? <span className="font-semibold text-primary">Send a new code</span>
          </button>
          <Button variant="ghost" onClick={() => navigate(next || "/clubs", { replace: true })}>
            Skip for now
          </Button>
        </DialogContent>
      </Dialog>
      <p className="mt-6 text-center text-sm text-muted-foreground">
        Already have an account?{" "}
        <Link to={`/login${next ? `?next=${encodeURIComponent(next)}` : ""}`} className="font-semibold text-primary hover:underline">
          Log in
        </Link>
      </p>
    </AuthShell>
  );
}
