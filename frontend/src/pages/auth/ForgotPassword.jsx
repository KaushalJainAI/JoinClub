import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useDispatch } from "react-redux";
import { toast } from "sonner";
import { ArrowLeft, Mail, ShieldCheck, KeyRound } from "lucide-react";
import { api, errorMessage } from "@/lib/api";
import { setUser } from "@/redux/authSlice";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/ui/label";
import OtpInput from "@/components/layout/OtpInput";
import { PasswordStrength } from "@/components/layout/ChangePassword";
import { homeFor, passwordProblems } from "@/lib/auth";
import AuthShell from "./AuthShell";

const STEPS = [
  [Mail, "Email"],
  [ShieldCheck, "Code"],
  [KeyRound, "New password"],
];

export default function ForgotPassword() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [token, setToken] = useState("");
  const [pw, setPw] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (!cooldown) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  const run = async (fn) => {
    setBusy(true);
    try {
      await fn();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const requestCode = () =>
    run(async () => {
      const { data } = await api.post("/auth/otp/request", { email, purpose: "reset_password" });
      toast.success(data.message);
      setStep(1);
      setCooldown(60);
    });

  const verify = () =>
    run(async () => {
      try {
        const { data } = await api.post("/auth/otp/verify", { email, code });
        setToken(data.resetToken);
        setStep(2);
      } catch (err) {
        setCode("");
        throw err;
      }
    });

  const reset = () =>
    run(async () => {
      if (pw !== confirm) throw new Error("The two passwords don't match.");
      const { data } = await api.post("/auth/password/reset", { resetToken: token, newPassword: pw });
      dispatch(setUser(data.user));
      toast.success(data.message);
      navigate(homeFor(data.user), { replace: true });
    });

  return (
    <AuthShell title="Reset your password" subtitle="We'll email you a one-time code. No links to click.">
      <ol className="mb-8 flex items-center gap-2">
        {STEPS.map(([Icon, label], i) => (
          <li key={label} className="flex flex-1 items-center gap-2">
            <span className={cn("grid h-8 w-8 shrink-0 place-items-center rounded-full text-xs font-bold", i <= step ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground")}>
              <Icon className="h-4 w-4" />
            </span>
            <span className={cn("hidden text-sm font-medium sm:block", i <= step ? "" : "text-muted-foreground")}>{label}</span>
            {i < 2 && <span className={cn("h-0.5 flex-1 rounded", i < step ? "bg-primary" : "bg-muted")} />}
          </li>
        ))}
      </ol>

      {step === 0 && (
        <form onSubmit={(e) => (e.preventDefault(), requestCode())} className="space-y-5">
          <Field label="Your account email" htmlFor="email">
            <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" required autoFocus />
          </Field>
          <Button type="submit" size="lg" className="w-full" loading={busy}>
            Send code
          </Button>
        </form>
      )}

      {step === 1 && (
        <form onSubmit={(e) => (e.preventDefault(), verify())} className="space-y-5">
          <p className="text-sm text-muted-foreground">
            Enter the 6-digit code sent to <strong className="text-foreground">{email}</strong>. It expires in 10 minutes.
          </p>
          <OtpInput value={code} onChange={setCode} disabled={busy} />
          <Button type="submit" size="lg" className="w-full" loading={busy} disabled={code.length !== 6}>
            Verify code
          </Button>
          <div className="flex items-center justify-between text-sm">
            <button type="button" onClick={() => setStep(0)} className="text-muted-foreground hover:text-foreground">
              Change email
            </button>
            <button type="button" onClick={requestCode} disabled={cooldown > 0 || busy} className="font-semibold text-primary disabled:text-muted-foreground">
              {cooldown > 0 ? `Resend in ${cooldown}s` : "Resend code"}
            </button>
          </div>
        </form>
      )}

      {step === 2 && (
        <form onSubmit={(e) => (e.preventDefault(), reset())} className="space-y-5">
          <Field label="New password" htmlFor="pw" error={pw && passwordProblems(pw).length ? `Needs ${passwordProblems(pw).join(", ")}` : null}>
            <Input id="pw" type="password" value={pw} onChange={(e) => setPw(e.target.value)} autoComplete="new-password" required autoFocus />
            <PasswordStrength value={pw} />
          </Field>
          <Field label="Confirm new password" htmlFor="cpw" error={confirm && confirm !== pw ? "Doesn't match" : null}>
            <Input id="cpw" type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} autoComplete="new-password" required />
          </Field>
          <Button type="submit" size="lg" className="w-full" loading={busy} disabled={passwordProblems(pw).length > 0 || pw !== confirm}>
            Set new password
          </Button>
        </form>
      )}

      <Link to="/login" className="mt-8 inline-flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Back to log in
      </Link>
    </AuthShell>
  );
}
