import { Navigate, useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import { ShieldAlert } from "lucide-react";
import ChangePassword from "@/components/layout/ChangePassword";
import { homeFor } from "@/lib/auth";

// First login for seeded accounts: they must replace the temporary password.
export default function SetPassword() {
  const { user } = useSelector((s) => s.auth);
  const navigate = useNavigate();
  if (!user.mustChangePassword) return <Navigate to={homeFor(user)} replace />;

  return (
    <div className="page grid min-h-[70vh] place-items-center">
      <div className="w-full max-w-md">
        <div className="mb-6 flex items-start gap-3 rounded-2xl border border-warning/40 bg-warning/10 p-4">
          <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-warning" />
          <div className="text-sm">
            <p className="font-semibold">Set your own password to continue</p>
            <p className="text-muted-foreground">You signed in with a temporary password from the credentials sheet. Replace it before managing {user.club?.name || "your account"}.</p>
          </div>
        </div>
        <h1 className="mb-6 text-2xl font-extrabold">Choose a new password</h1>
        <ChangePassword forced onDone={() => navigate(homeFor(user), { replace: true })} />
      </div>
    </div>
  );
}
