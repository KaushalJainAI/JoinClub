import { Suspense, useEffect, useState } from "react";
import { Outlet, ScrollRestoration, useLocation, useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { toast } from "sonner";
import { MailCheck } from "lucide-react";
import { api, errorMessage } from "@/lib/api";
import { setUser } from "@/redux/authSlice";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import Navbar from "./Navbar";
import Footer from "./Footer";
import OtpInput from "./OtpInput";
import ChatLauncher from "@/components/chat/ChatLauncher";
import { PageLoader } from "./guards";

export default function AppLayout() {
  const { user } = useSelector((s) => s.auth);
  const { pathname } = useLocation();
  const navigate = useNavigate();

  // Accounts with a temporary password can only set a new one.
  useEffect(() => {
    if (user?.mustChangePassword && pathname !== "/set-password") navigate("/set-password", { replace: true });
  }, [user, pathname, navigate]);

  const showLauncher = !pathname.startsWith("/assistant") && !pathname.startsWith("/admin") && !pathname.startsWith("/super") && user?.role !== "club_admin";

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      {user?.role === "student" && !user.emailVerified && <VerifyEmailBanner />}
      <main className="flex-1">
        <Suspense fallback={<PageLoader />}>
          <Outlet />
        </Suspense>
      </main>
      <Footer />
      {showLauncher && <ChatLauncher />}
      <ScrollRestoration />
    </div>
  );
}

export function VerifyEmailBanner() {
  const dispatch = useDispatch();
  const { user } = useSelector((s) => s.auth);
  const [open, setOpen] = useState(false);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);

  const resend = async () => {
    try {
      const { data } = await api.post("/auth/otp/request", { purpose: "verify_email" });
      toast.success(data.message);
    } catch (err) {
      toast.error(errorMessage(err));
    }
  };

  const verify = async () => {
    setBusy(true);
    try {
      const { data } = await api.post("/auth/email/verify", { code });
      dispatch(setUser(data.user));
      toast.success(data.message);
      setOpen(false);
    } catch (err) {
      toast.error(errorMessage(err));
      setCode("");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="border-b bg-warning/10">
      <div className="container flex flex-wrap items-center justify-between gap-2 py-2 text-sm">
        <p className="flex items-center gap-2">
          <MailCheck className="h-4 w-4 text-warning" /> Verify <strong>{user.email}</strong> to start applying to clubs.
        </p>
        <Button size="sm" variant="outline" onClick={() => setOpen(true)}>
          Enter code
        </Button>
      </div>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Verify your email</DialogTitle>
            <DialogDescription>Enter the 6-digit code we sent to {user.email}.</DialogDescription>
          </DialogHeader>
          <OtpInput value={code} onChange={setCode} disabled={busy} />
          <Button onClick={verify} loading={busy} disabled={code.length !== 6}>
            Verify email
          </Button>
          <button onClick={resend} className="text-sm text-muted-foreground hover:text-foreground">
            Didn't get it? <span className="font-semibold text-primary">Send a new code</span>
          </button>
        </DialogContent>
      </Dialog>
    </div>
  );
}
