import { useState } from "react";
import { Link, Navigate, useNavigate, useSearchParams } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { toast } from "sonner";
import { Eye, EyeOff } from "lucide-react";
import { api, errorMessage } from "@/lib/api";
import { setUser } from "@/redux/authSlice";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/ui/label";
import { homeFor, safeNext } from "@/lib/auth";
import AuthShell from "./AuthShell";

export default function Login() {
  const { user } = useSelector((s) => s.auth);
  const [params] = useSearchParams();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: "", password: "" });
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const next = safeNext(params.get("next"));

  if (user) return <Navigate to={user.mustChangePassword ? "/set-password" : next || homeFor(user)} replace />;

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      const { data } = await api.post("/auth/login", form);
      dispatch(setUser(data.user));
      toast.success(data.message);
      navigate(data.user.mustChangePassword ? "/set-password" : next || homeFor(data.user), { replace: true });
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthShell title="Welcome back" subtitle="Log in to apply, follow clubs and track your applications.">
      <form onSubmit={submit} className="space-y-5">
        <Field label="Email" htmlFor="email">
          <Input id="email" type="email" autoComplete="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="you@pec.edu.in" required autoFocus />
        </Field>
        <Field label="Password" htmlFor="password">
          <div className="relative">
            <Input id="password" type={show ? "text" : "password"} autoComplete="current-password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required className="pr-10" />
            <button type="button" onClick={() => setShow((s) => !s)} className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-muted-foreground hover:text-foreground" aria-label={show ? "Hide password" : "Show password"}>
              {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </Field>
        <div className="flex justify-end">
          <Link to="/forgot-password" className="text-sm font-medium text-primary hover:underline">
            Forgot password?
          </Link>
        </div>
        <Button type="submit" size="lg" className="w-full" loading={busy}>
          Log in
        </Button>
      </form>
      <p className="mt-6 text-center text-sm text-muted-foreground">
        New to JoinClub?{" "}
        <Link to={`/signup${next ? `?next=${encodeURIComponent(next)}` : ""}`} className="font-semibold text-primary hover:underline">
          Create a free account
        </Link>
      </p>
      <p className="mt-3 text-center text-xs text-muted-foreground">Club admins: use the credentials your club was given.</p>
    </AuthShell>
  );
}
