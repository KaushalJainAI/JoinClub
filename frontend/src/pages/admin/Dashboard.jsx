import { useState } from "react";
import { Link } from "react-router-dom";
import { Inbox, Clock, CheckCircle2, Heart, Plus, PenSquare, CalendarPlus, ExternalLink, ArrowRight } from "lucide-react";
import { useFetch } from "@/hooks/useFetch";
import { formatDate, relativeTime } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/misc";
import { UserAvatar } from "@/components/ui/avatar";
import { ClubLogo, StatusBadge, EventCard } from "@/components/clubs/ClubBits";

// Single series, so one colour and no legend: the card title names it.
function DailyBars({ days }) {
  const [hover, setHover] = useState(null);
  const max = Math.max(1, ...days.map((d) => d.count));
  const label = (d) => new Date(`${d}T00:00:00+05:30`).toLocaleDateString("en-IN", { day: "numeric", month: "short", timeZone: "Asia/Kolkata" });
  return (
    <div>
      <div className="relative flex h-40 items-end gap-[2px] border-b border-border" role="img" aria-label={`Applications per day: ${days.map((d) => `${label(d.date)} ${d.count}`).join(", ")}`}>
        {days.map((d, i) => (
          // Mouse-only tooltip: keyboard and screen-reader users get every value from the chart's aria-label.
          // eslint-disable-next-line jsx-a11y/no-static-element-interactions
          <div key={d.date} className="group relative flex h-full flex-1 items-end" onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)}>
            {/* The hit target is the full column, larger than the bar itself. */}
            <div className="mx-auto w-full max-w-[22px] rounded-t-[4px] bg-primary transition-opacity" style={{ height: `${(d.count / max) * 100}%`, minHeight: d.count ? 3 : 0, opacity: hover === null || hover === i ? 1 : 0.45 }} />
            {hover === i && (
              <div className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-2 -translate-x-1/2 whitespace-nowrap rounded-lg border bg-popover px-2.5 py-1.5 text-xs shadow-lift">
                <div className="text-muted-foreground">{label(d.date)}</div>
                <div className="font-semibold text-foreground">
                  {d.count} application{d.count === 1 ? "" : "s"}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
      <div className="mt-2 flex justify-between text-[11px] text-muted-foreground">
        <span>{label(days[0].date)}</span>
        <span>Today</span>
      </div>
    </div>
  );
}

// Status is state, so it uses the reserved status colours, always with a label and count.
const STATUS_SEGMENTS = [
  ["pending", "Under review", "bg-warning"],
  ["shortlisted", "Shortlisted", "bg-primary"],
  ["accepted", "Accepted", "bg-success"],
  ["rejected", "Not selected", "bg-destructive"],
];

function StatusMeter({ stats }) {
  const total = STATUS_SEGMENTS.reduce((a, [k]) => a + (stats[k] || 0), 0);
  if (!total) return <p className="text-sm text-muted-foreground">No applications yet.</p>;
  return (
    <div>
      <div className="flex h-3 gap-[2px] overflow-hidden rounded-full">
        {STATUS_SEGMENTS.map(([k, label, color]) =>
          stats[k] ? <div key={k} className={`${color} first:rounded-l-full last:rounded-r-full`} style={{ width: `${(stats[k] / total) * 100}%` }} title={`${label}: ${stats[k]}`} /> : null
        )}
      </div>
      <ul className="mt-4 grid grid-cols-2 gap-3 text-sm">
        {STATUS_SEGMENTS.map(([k, label, color]) => (
          <li key={k} className="flex items-center gap-2">
            <span className={`h-2.5 w-2.5 rounded-full ${color}`} />
            <span className="text-muted-foreground">{label}</span>
            <span className="ml-auto font-semibold">{stats[k] || 0}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Stat({ icon: Icon, label, value, hint }) {
  return (
    <Card>
      <CardContent className="flex items-center gap-4 p-5">
        <div className="grid h-11 w-11 place-items-center rounded-xl bg-primary/10 text-primary">
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <div className="font-display text-2xl font-extrabold">{value}</div>
          <div className="text-xs text-muted-foreground">{label}</div>
          {hint && <div className="text-xs font-medium text-accent">{hint}</div>}
        </div>
      </CardContent>
    </Card>
  );
}

export default function Dashboard() {
  const { data, loading, error } = useFetch("/clubs/mine/dashboard");

  if (loading && !data)
    return (
      <div className="page space-y-4">
        <Skeleton className="h-16 w-80" />
        <div className="grid gap-4 md:grid-cols-4">
          {Array.from({ length: 4 }, (_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
        <Skeleton className="h-64" />
      </div>
    );
  if (error) return <div className="page text-destructive">{error}</div>;

  const { club, stats, perDay, recent, upcomingEvents } = data;
  const last7 = perDay.slice(-7).reduce((a, d) => a + d.count, 0);

  return (
    <div className="page space-y-8">
      <div className="flex flex-wrap items-center gap-4">
        <ClubLogo club={club} className="h-14 w-14" />
        <div className="flex-1">
          <p className="eyebrow">Club dashboard</p>
          <h1 className="text-2xl font-extrabold md:text-3xl">{club.name}</h1>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" asChild>
            <Link to={`/clubs/${club.slug}`} target="_blank">
              <ExternalLink /> View public page
            </Link>
          </Button>
          <Button asChild>
            <Link to="/admin/openings?new=1">
              <Plus /> New opening
            </Link>
          </Button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat icon={Inbox} label="Total applications" value={stats.totalApplications} hint={last7 ? `+${last7} this week` : null} />
        <Stat icon={Clock} label="Waiting for review" value={stats.pending} />
        <Stat icon={CheckCircle2} label={`Open opening${stats.openOpenings === 1 ? "" : "s"}`} value={stats.openOpenings} />
        <Stat icon={Heart} label="Followers" value={club.followerCount} />
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.6fr_1fr]">
        <Card>
          <CardHeader>
            <CardTitle>Applications per day</CardTitle>
            <CardDescription>Last 14 days</CardDescription>
          </CardHeader>
          <CardContent>
            <DailyBars days={perDay} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Where applicants stand</CardTitle>
            <CardDescription>All openings</CardDescription>
          </CardHeader>
          <CardContent>
            <StatusMeter stats={stats} />
            <Button variant="link" className="mt-3 px-0" asChild>
              <Link to="/admin/openings">
                Review applicants <ArrowRight />
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.6fr_1fr]">
        <Card>
          <CardHeader>
            <CardTitle>Latest applications</CardTitle>
          </CardHeader>
          <CardContent className="divide-y p-0">
            {recent.length === 0 && <p className="px-5 pb-5 text-sm text-muted-foreground">No applications yet. Publish an opening to get started.</p>}
            {recent.map((a) => (
              <Link key={a._id} to={`/admin/openings/${a.opening?._id}?app=${a._id}`} className="flex items-center gap-3 px-5 py-3 transition-colors hover:bg-muted/50">
                <UserAvatar user={a.applicant} className="h-9 w-9" />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-semibold">{a.applicant?.fullname}</div>
                  <div className="truncate text-xs text-muted-foreground">
                    {a.opening?.title} · {a.applicant?.profile?.branch}
                    {a.applicant?.profile?.year ? `, year ${a.applicant.profile.year}` : ""}
                  </div>
                </div>
                <div className="text-right">
                  <StatusBadge status={a.status} />
                  <div className="mt-1 text-xs text-muted-foreground">{relativeTime(a.createdAt)}</div>
                </div>
              </Link>
            ))}
          </CardContent>
        </Card>
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Quick actions</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-2">
              <Button variant="outline" className="justify-start" asChild>
                <Link to="/admin/club">
                  <PenSquare /> Edit your club page
                </Link>
              </Button>
              <Button variant="outline" className="justify-start" asChild>
                <Link to="/admin/events">
                  <CalendarPlus /> Add an event
                </Link>
              </Button>
              <Button variant="outline" className="justify-start" asChild>
                <Link to="/admin/openings?new=1">
                  <Plus /> Publish an opening
                </Link>
              </Button>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Upcoming events</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {upcomingEvents.length ? upcomingEvents.map((e) => <EventCard key={e._id} event={e} showClub={false} />) : <p className="text-sm text-muted-foreground">Nothing scheduled. Events show on your club page and the campus calendar.</p>}
              {upcomingEvents.length > 0 && <p className="text-xs text-muted-foreground">Next: {formatDate(upcomingEvents[0].date)}</p>}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
