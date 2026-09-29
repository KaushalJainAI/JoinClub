import { lazy, useEffect } from "react";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import { useDispatch } from "react-redux";
import { toast } from "sonner";
import { api, setAuthHandlers } from "@/lib/api";
import { setUser, patchUser } from "@/redux/authSlice";
import AppLayout from "@/components/layout/AppLayout";
import { RequireAuth } from "@/components/layout/guards";
import Home from "@/pages/Home";
import Clubs from "@/pages/Clubs";
import ClubPage from "@/pages/ClubPage";
import Openings from "@/pages/Openings";
import OpeningPage from "@/pages/OpeningPage";
import Events from "@/pages/Events";
import MyApplications from "@/pages/MyApplications";
import Privacy from "@/pages/Privacy";
import NotFound from "@/pages/NotFound";
import Login from "@/pages/auth/Login";
import Signup from "@/pages/auth/Signup";
import ForgotPassword from "@/pages/auth/ForgotPassword";
import SetPassword from "@/pages/auth/SetPassword";

const Assistant = lazy(() => import("@/pages/Assistant"));
const AdminDashboard = lazy(() => import("@/pages/admin/Dashboard"));
const AdminOpenings = lazy(() => import("@/pages/admin/Openings"));
const AdminApplicants = lazy(() => import("@/pages/admin/Applicants"));
const AdminClubEditor = lazy(() => import("@/pages/admin/ClubEditor"));
const AdminEvents = lazy(() => import("@/pages/admin/Events"));
const SuperAdmin = lazy(() => import("@/pages/admin/SuperAdmin"));
const Profile = lazy(() => import("@/pages/Profile"));

const router = createBrowserRouter([
  {
    element: <AppLayout />,
    children: [
      { path: "/", element: <Home /> },
      { path: "/clubs", element: <Clubs /> },
      { path: "/clubs/:slug", element: <ClubPage /> },
      { path: "/openings", element: <Openings /> },
      { path: "/openings/:id", element: <OpeningPage /> },
      { path: "/events", element: <Events /> },
      { path: "/privacy", element: <Privacy /> },
      { path: "/assistant", element: <Assistant /> },
      { path: "/login", element: <Login /> },
      { path: "/signup", element: <Signup /> },
      { path: "/forgot-password", element: <ForgotPassword /> },
      { path: "/set-password", element: <RequireAuth><SetPassword /></RequireAuth> },
      { path: "/applications", element: <RequireAuth roles={["student"]}><MyApplications /></RequireAuth> },
      { path: "/profile", element: <RequireAuth><Profile /></RequireAuth> },
      { path: "/admin", element: <RequireAuth roles={["club_admin"]}><AdminDashboard /></RequireAuth> },
      { path: "/admin/openings", element: <RequireAuth roles={["club_admin"]}><AdminOpenings /></RequireAuth> },
      { path: "/admin/openings/:id", element: <RequireAuth roles={["club_admin"]}><AdminApplicants /></RequireAuth> },
      { path: "/admin/club", element: <RequireAuth roles={["club_admin"]}><AdminClubEditor /></RequireAuth> },
      { path: "/admin/events", element: <RequireAuth roles={["club_admin"]}><AdminEvents /></RequireAuth> },
      { path: "/super", element: <RequireAuth roles={["super_admin"]}><SuperAdmin /></RequireAuth> },
      { path: "*", element: <NotFound /> },
    ],
  },
]);

export default function App() {
  const dispatch = useDispatch();

  useEffect(() => {
    // Restore the session from the cookie on every page load.
    api
      .get("/auth/me")
      .then((res) => dispatch(setUser(res.data.user)))
      .catch(() => dispatch(setUser(null)));

    setAuthHandlers({
      onUnauthorized: () => {
        dispatch(setUser(null));
        toast.error("Your session has ended. Please log in again.");
      },
      onMustChangePassword: () => {
        dispatch(patchUser({ mustChangePassword: true }));
        if (location.pathname !== "/set-password") router.navigate("/set-password");
      },
    });
  }, [dispatch]);

  return <RouterProvider router={router} />;
}
