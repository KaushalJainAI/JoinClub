import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";

export default function Logo({ className, to = "/" }) {
  return (
    <Link to={to} className={cn("flex items-center gap-2 font-display text-lg font-extrabold tracking-tight", className)}>
      <img src="/favicon.svg" alt="" className="h-8 w-8" />
      <span>
        JoinClub<span className="text-accent">PEC</span>
      </span>
    </Link>
  );
}
