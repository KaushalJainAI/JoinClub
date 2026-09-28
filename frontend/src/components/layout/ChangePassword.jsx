import { useState } from "react";
import { useDispatch } from "react-redux";
import { toast } from "sonner";
import { Mail, KeyRound } from "lucide-react";
import { api, errorMessage } from "@/lib/api";
import { setUser } from "@/redux/authSlice";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/ui/label";
import OtpInput from "./OtpInput";
import { passwordProblems } from "@/lib/auth";

export function PasswordStrength({ value }) {
  const score = [value.length >= 8, /[A-Za-z]/.test(value) && /\d/.test(value), /[^A-Za-z0-9]/.test(value) || value.length >= 12].filter(Boolean).length;
  const labels = ["Too weak", "Okay", "Good", "Strong"];
  const colors = ["bg-destructive", "bg-warning", "bg-primary", "bg-success"];
  if (!value) return null;
  return (
    <div className="flex items-center gap-2">
      <div className="flex flex-1 gap-1">
        {[0, 1, 2].map((i) => (
          <div key={i} className={cn("h-1.5 flex-1 rounded-full", i < score ? colors[score] : "bg-muted")} />
        ))}
      </div>
      <span className="text-xs text-muted-foreground">{labels[score]}</span>
    </div>
  );
}

/**
 * Change password by proving identity with an emailed code (default) or the current password.
 * `forced` is the first-login screen for seeded accounts.
 */
export default function ChangePassword({ forced = false, onDone }) {
  const dispatch = useDispatch();
  const [method, setMethod] = useState(forced ? "current" : "otp");
  const [codeSent, setCodeSent] = useState(false);
  const [code, setCode] = useState("");
  const [current, setCurrent] = useState("");
  const [pw, setPw] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const problems = passwordProblems(pw);

  const sendCode = async () => {
    setBusy(true);
    try {
      const { data } = await api.post("/auth/otp/request", { purpose: "change_password" });
      setCodeSent(true);
      toast.success(data.message);
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const submit = async (e) => {
    e.preventDefault();
    if (pw !== confirm) return toast.error("The two passwords don't match.");
    setBusy(true);
    try {
      const body = method === "otp" ? { code, newPassword: pw } : { currentPassword: current, newPassword: pw };
      const { data } = await api.post("/auth/password/change", body);
      dispatch(setUser(data.user));
      toast.success(data.message);
      setPw("");
      setConfirm("");
      setCode("");
      setCurrent("");
      setCodeSent(false);
      onDone?.();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-5">
      <div className="grid grid-cols-2 gap-1 rounded-xl bg-muted p-1">
        {[
          ["otp", Mail, "Email me a code"],
          ["current", KeyRound, forced ? "Temporary password" : "Current password"],
        ].map(([k, Icon, label]) => (
          <button key={k} type="button" onClick={() => setMethod(k)} className={cn("inline-flex items-center justify-center gap-2 rounded-lg py-2 text-sm font-semibold", method === k ? "bg-card shadow-sm" : "text-muted-foreground")}>
            <Icon className="h-4 w-4" /> {label}
          </button>
        ))}
      </div>

      {method === "otp" ? (
        codeSent ? (
          <Field label="6-digit code from your email">
            <OtpInput value={code} onChange={setCode} />
            <button type="button" onClick={sendCode} className="mt-2 text-xs font-semibold text-primary" disabled={busy}>
              Send a new code
            </button>
          </Field>
        ) : (
          <div className="rounded-xl border bg-secondary/40 p-4 text-sm">
            <p>We'll email a 6-digit code to your registered address. It's valid for 10 minutes.</p>
            <Button type="button" className="mt-3" onClick={sendCode} loading={busy}>
              <Mail /> Send code
            </Button>
          </div>
        )
      ) : (
        <Field label={forced ? "Temporary password (from the credentials sheet)" : "Current password"} htmlFor="cur">
          <Input id="cur" type="password" value={current} onChange={(e) => setCurrent(e.target.value)} autoComplete="current-password" required />
        </Field>
      )}

      <Field label="New password" htmlFor="npw" error={pw && problems.length ? `Needs ${problems.join(", ")}` : null}>
        <Input id="npw" type="password" value={pw} onChange={(e) => setPw(e.target.value)} autoComplete="new-password" required />
        <PasswordStrength value={pw} />
      </Field>
      <Field label="Confirm new password" htmlFor="cpw" error={confirm && confirm !== pw ? "Doesn't match" : null}>
        <Input id="cpw" type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} autoComplete="new-password" required />
      </Field>
      <Button type="submit" className="w-full" loading={busy} disabled={problems.length > 0 || pw !== confirm || (method === "otp" ? code.length !== 6 : !current)}>
        {forced ? "Set my password" : "Change password"}
      </Button>
      {!forced && <p className="text-xs text-muted-foreground">Changing your password signs you out on other devices.</p>}
    </form>
  );
}
