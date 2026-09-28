import { useState } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { useTheme } from "next-themes";
import { toast } from "sonner";
import { Menu, Moon, Sun, LogOut, User2, FileText, LayoutDashboard, Sparkles, KeyRound, Shield } from "lucide-react";
import { api } from "@/lib/api";
import { setUser } from "@/redux/authSlice";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { UserAvatar } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuLabel } from "@/components/ui/misc";
import Logo from "./Logo";
import { homeFor } from "@/lib/auth";

function linksFor(user) {
  if (user?.role === "club_admin")
    return [
      { to: "/admin", label: "Dashboard", end: true },
      { to: "/admin/openings", label: "Openings" },
      { to: "/admin/events", label: "Events" },
      { to: "/admin/club", label: "Club page" },
    ];
  if (user?.role === "super_admin")
    return [
      { to: "/super", label: "Admin" },
      { to: "/clubs", label: "Clubs" },
    ];
  return [
    { to: "/clubs", label: "Clubs" },
    { to: "/openings", label: "Recruiting" },
    { to: "/events", label: "Events" },
    { to: "/assistant", label: "AI Assistant", ai: true },
    ...(user ? [{ to: "/applications", label: "My applications" }] : []),
  ];
}

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const dark = resolvedTheme === "dark";
  return (
    <Button variant="ghost" size="icon" onClick={() => setTheme(dark ? "light" : "dark")} aria-label={dark ? "Switch to light mode" : "Switch to dark mode"}>
      {dark ? <Sun /> : <Moon />}
    </Button>
  );
}

export default function Navbar() {
  const { user } = useSelector((s) => s.auth);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const links = linksFor(user);

  const logout = async () => {
    await api.post("/auth/logout").catch(() => {});
    dispatch(setUser(null));
    toast.success("Logged out. See you soon!");
    navigate("/");
  };

  const navClass = ({ isActive }) =>
    cn("relative rounded-lg px-3 py-2 text-sm font-medium transition-colors hover:bg-secondary hover:text-foreground", isActive ? "text-foreground" : "text-muted-foreground");

  return (
    <header className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur-lg">
      <div className="container flex h-16 items-center gap-4">
        <Logo to={homeFor(user)} />
        <nav className="ml-4 hidden items-center gap-1 lg:flex">
          {links.map((l) => (
            <NavLink key={l.to} to={l.to} end={l.end} className={navClass}>
              <span className="flex items-center gap-1.5">
                {l.ai && <Sparkles className="h-3.5 w-3.5 text-accent" />}
                {l.label}
              </span>
            </NavLink>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-1.5">
          <ThemeToggle />
          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger className="rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-ring" aria-label="Account menu">
                <UserAvatar user={user} className="h-9 w-9 ring-2 ring-background" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-60">
                <DropdownMenuLabel>
                  <p className="font-semibold">{user.fullname}</p>
                  <p className="truncate text-xs text-muted-foreground">{user.email}</p>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                {user.role === "student" && (
                  <DropdownMenuItem onSelect={() => navigate("/applications")}>
                    <FileText /> My applications
                  </DropdownMenuItem>
                )}
                {user.role === "club_admin" && (
                  <DropdownMenuItem onSelect={() => navigate("/admin")}>
                    <LayoutDashboard /> Club dashboard
                  </DropdownMenuItem>
                )}
                {user.role === "super_admin" && (
                  <DropdownMenuItem onSelect={() => navigate("/super")}>
                    <Shield /> Super admin
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem onSelect={() => navigate("/profile")}>
                  <User2 /> Profile
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => navigate("/profile#security")}>
                  <KeyRound /> Change password
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onSelect={logout} className="text-destructive focus:text-destructive [&_svg]:text-destructive">
                  <LogOut /> Log out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <div className="hidden items-center gap-2 sm:flex">
              <Button variant="ghost" asChild>
                <Link to="/login">Log in</Link>
              </Button>
              <Button asChild>
                <Link to="/signup">Join free</Link>
              </Button>
            </div>
          )}
          <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setOpen(true)} aria-label="Open menu">
            <Menu />
          </Button>
        </div>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent side="right" className="p-6">
          <DialogTitle className="sr-only">Menu</DialogTitle>
          <Logo />
          <nav className="mt-8 flex flex-col gap-1">
            {links.map((l) => (
              <NavLink key={l.to} to={l.to} end={l.end} onClick={() => setOpen(false)} className={({ isActive }) => cn("rounded-lg px-3 py-3 text-base font-medium", isActive ? "bg-secondary" : "hover:bg-secondary")}>
                <span className="flex items-center gap-2">
                  {l.ai && <Sparkles className="h-4 w-4 text-accent" />}
                  {l.label}
                </span>
              </NavLink>
            ))}
          </nav>
          {!user && (
            <div className="mt-auto grid gap-2">
              <Button variant="outline" asChild onClick={() => setOpen(false)}>
                <Link to="/login">Log in</Link>
              </Button>
              <Button asChild onClick={() => setOpen(false)}>
                <Link to="/signup">Join free</Link>
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </header>
  );
}
