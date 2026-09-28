import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowUpRight, CalendarDays, Clock, MapPin, Users, Heart } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { categoryMeta, STATUS_META, MODE_META } from "@/lib/categories";
import { cn, formatDateTime, initials, timeLeft } from "@/lib/utils";

// The club's logo, or its initials on its colour if the image is missing or broken.
export function ClubLogo({ club, className }) {
  const [broken, setBroken] = useState(false);
  const color = club?.color || categoryMeta(club?.category).color;
  if (club?.logo && !broken) {
    return <img src={club.logo} alt="" onError={() => setBroken(true)} className={cn("h-12 w-12 shrink-0 rounded-xl border bg-white object-contain p-1", className)} loading="lazy" />;
  }
  return (
    <div className={cn("grid h-12 w-12 shrink-0 place-items-center rounded-xl font-display text-sm font-extrabold text-white", className)} style={{ background: color }}>
      {initials(club?.shortName || club?.name)}
    </div>
  );
}

// `solid` puts the badge on white, for use over photos and colour.
export function CategoryBadge({ category, className, solid }) {
  const meta = categoryMeta(category);
  const Icon = meta.icon;
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold", className)} style={{ color: meta.color, background: solid ? "#fff" : `${meta.color}1a` }}>
      <Icon className="h-3 w-3" /> {meta.label}
    </span>
  );
}

export function StatusBadge({ status }) {
  const meta = STATUS_META[status] || { label: status, variant: "muted" };
  return <Badge variant={meta.variant}>{meta.label}</Badge>;
}

export function DeadlinePill({ deadline, className }) {
  const t = timeLeft(deadline);
  return (
    <span className={cn("inline-flex items-center gap-1 text-xs font-semibold", t.closed ? "text-muted-foreground" : t.urgent ? "text-destructive" : "text-success", className)}>
      <Clock className="h-3 w-3" /> {t.label}
    </span>
  );
}

export function ClubCard({ club, className }) {
  const color = club.color || categoryMeta(club.category).color;
  return (
    <Link
      to={`/clubs/${club.slug}`}
      className={cn("group relative flex flex-col overflow-hidden rounded-2xl border bg-card shadow-soft transition-all hover:-translate-y-1 hover:shadow-lift", className)}
    >
      <div className="relative h-24 overflow-hidden" style={{ background: `linear-gradient(135deg, ${color}, ${color}99)` }}>
        {club.cover && <img src={club.cover} alt="" loading="lazy" className="h-full w-full object-cover opacity-80 transition-transform duration-500 group-hover:scale-105" onError={(e) => (e.currentTarget.style.display = "none")} />}
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
        {club.openCount > 0 && (
          <span className="absolute right-3 top-3 inline-flex items-center gap-1 rounded-full bg-white/95 px-2.5 py-1 text-xs font-bold text-success shadow">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-success" /> Recruiting
          </span>
        )}
      </div>
      <div className="flex flex-1 flex-col p-5 pt-0">
        <ClubLogo club={club} className="-mt-6 mb-3 h-14 w-14 shadow-md" />
        <div className="mb-1 flex items-start justify-between gap-2">
          <h3 className="font-display text-lg font-bold leading-snug">{club.shortName && club.shortName !== club.name ? club.shortName : club.name}</h3>
          <ArrowUpRight className="h-5 w-5 shrink-0 text-muted-foreground transition-all group-hover:text-primary" />
        </div>
        {club.shortName && club.shortName !== club.name && <p className="-mt-1 mb-2 line-clamp-1 text-xs text-muted-foreground">{club.name}</p>}
        <p className="line-clamp-2 text-sm text-muted-foreground">{club.tagline}</p>
        <div className="mt-auto flex flex-wrap items-center gap-x-3 gap-y-2 pt-4 text-xs text-muted-foreground">
          <CategoryBadge category={club.category} />
          <span className="inline-flex items-center gap-1">
            <Heart className="h-3 w-3" /> {club.followerCount ?? 0}
          </span>
          {club.memberCount > 0 && (
            <span className="inline-flex items-center gap-1">
              <Users className="h-3 w-3" /> {club.memberCount}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}

export function OpeningCard({ opening, showClub = true, className }) {
  const club = opening.club;
  return (
    <Link to={`/openings/${opening._id}`} className={cn("group flex flex-col gap-3 rounded-2xl border bg-card p-5 shadow-soft transition-all hover:-translate-y-0.5 hover:shadow-lift", className)}>
      {showClub && club && (
        <div className="flex items-center gap-3">
          <ClubLogo club={club} className="h-10 w-10" />
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">{club.shortName || club.name}</p>
            <CategoryBadge category={club.category} className="px-0" />
          </div>
        </div>
      )}
      <div>
        <div className="mb-1 flex flex-wrap items-center gap-2">
          <Badge variant="muted">{MODE_META[opening.mode]?.label || opening.mode}</Badge>
          {opening.myStatus && <StatusBadge status={opening.myStatus} />}
        </div>
        <h3 className="font-display text-base font-bold leading-snug group-hover:text-primary">{opening.title}</h3>
        <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{opening.description}</p>
      </div>
      <div className="mt-auto flex items-center justify-between border-t pt-3 text-xs text-muted-foreground">
        <DeadlinePill deadline={opening.deadline} />
        <span>
          {opening.applicantCount ?? 0} applied · {opening.positions} spot{opening.positions === 1 ? "" : "s"}
        </span>
      </div>
    </Link>
  );
}

export function EventCard({ event, showClub = true }) {
  const d = new Date(event.date);
  const past = d < new Date();
  return (
    <div className={cn("flex gap-4 rounded-2xl border bg-card p-4 shadow-soft", past && "opacity-60")}>
      <div className="grid h-16 w-14 shrink-0 place-content-center rounded-xl bg-primary/10 text-center text-primary">
        <span className="text-xs font-semibold uppercase">{d.toLocaleDateString("en-IN", { month: "short", timeZone: "Asia/Kolkata" })}</span>
        <span className="font-display text-2xl font-extrabold leading-none">{d.toLocaleDateString("en-IN", { day: "numeric", timeZone: "Asia/Kolkata" })}</span>
      </div>
      <div className="min-w-0 flex-1">
        <h4 className="font-semibold leading-snug">{event.title}</h4>
        {showClub && event.club && (
          <Link to={`/clubs/${event.club.slug}`} className="text-xs font-medium text-primary hover:underline">
            {event.club.shortName || event.club.name}
          </Link>
        )}
        {event.description && <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{event.description}</p>}
        <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <CalendarDays className="h-3 w-3" /> {formatDateTime(event.date)}
          </span>
          <span className="inline-flex items-center gap-1">
            <MapPin className="h-3 w-3" /> {event.venue}
          </span>
        </div>
      </div>
    </div>
  );
}

export function EmptyState({ icon: Icon, title, children, action }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed bg-card/50 px-6 py-14 text-center">
      {Icon && (
        <div className="mb-4 grid h-12 w-12 place-items-center rounded-2xl bg-secondary text-primary">
          <Icon className="h-6 w-6" />
        </div>
      )}
      <h3 className="text-lg font-bold">{title}</h3>
      {children && <p className="mt-1 max-w-sm text-sm text-muted-foreground">{children}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
