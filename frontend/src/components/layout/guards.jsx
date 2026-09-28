import { Navigate, useLocation } from "react-router-dom";
import { useSelector } from "react-redux";
import { Loader2 } from "lucide-react";
import { homeFor } from "@/lib/auth";

export function PageLoader() {
  return (
    <div className="grid min-h-[50vh] place-items-center text-muted-foreground">
      <Loader2 className="h-6 w-6 animate-spin" />
    </div>
  );
}

// Waits for the session check, then sends guests to login and wrong roles home.
export function RequireAuth({ roles, children }) {
  const { user, ready } = useSelector((s) => s.auth);
  const location = useLocation();
  if (!ready) return <PageLoader />;
  if (!user) return <Navigate to={`/login?next=${encodeURIComponent(location.pathname + location.search)}`} replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to={homeFor(user)} replace />;
  return children;
}
