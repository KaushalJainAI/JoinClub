import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Search, ArrowRight, Compass, Send, PartyPopper, Sparkles, MessageSquareText, ClipboardCheck, Mic } from "lucide-react";
import { useFetch } from "@/hooks/useFetch";
import { CATEGORIES } from "@/lib/categories";
import { Button } from "@/components/ui/button";
import { plural } from "@/lib/utils";
import { Skeleton } from "@/components/ui/misc";
import { ClubCard, OpeningCard, EventCard } from "@/components/clubs/ClubBits";

export default function Home() {
  const navigate = useNavigate();
  const [q, setQ] = useState("");
  const { data: stats } = useFetch("/stats");
  const { data: clubs, loading: clubsLoading } = useFetch("/clubs?sort=popular");
  const { data: openings, loading: openingsLoading } = useFetch("/openings");
  const { data: events } = useFetch("/events");
  const { data: cats } = useFetch("/clubs/categories");
  const catCount = Object.fromEntries((cats?.categories || []).map((c) => [c.category, c.count]));

  const search = (e) => {
    e.preventDefault();
    navigate(`/clubs${q.trim() ? `?q=${encodeURIComponent(q.trim())}` : ""}`);
  };

  return (
    <>
      {/* Hero */}
      <section className="hero-grid relative overflow-hidden border-b">
        <div className="pointer-events-none absolute -right-40 -top-40 h-[480px] w-[480px] rounded-full bg-accent/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-40 -left-40 h-[420px] w-[420px] rounded-full bg-primary/15 blur-3xl" />
        <div className="container relative py-16 md:py-24">
          <div className="mx-auto max-w-3xl text-center animate-fade-up">
            <Link to="/openings" className="mb-6 inline-flex items-center gap-2 rounded-full border bg-card px-4 py-1.5 text-sm font-medium shadow-soft transition-colors hover:border-primary">
              <span className="h-2 w-2 animate-pulse rounded-full bg-success" />
              {stats ? `${stats.stats.openings} open positions right now` : "See who's recruiting"}
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
            <h1 className="text-4xl font-extrabold leading-[1.1] sm:text-5xl md:text-6xl">
              Find your people at <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">PEC</span>
            </h1>
            <p className="mx-auto mt-5 max-w-xl text-lg text-muted-foreground">
              Race a BAJA buggy. Direct a short film. Debate at TRIVIUM. Every club and society on campus, with what they do, who they're looking for, and how to get in.
            </p>
            <form onSubmit={search} className="mx-auto mt-8 flex max-w-xl items-center gap-2 rounded-2xl border bg-card p-2 shadow-lift">
              <Search className="ml-2 h-5 w-5 shrink-0 text-muted-foreground" />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Try robotics, dance, debating, photography…"
                className="h-10 flex-1 bg-transparent text-base outline-none placeholder:text-muted-foreground"
                aria-label="Search clubs"
              />
              <Button type="submit" size="lg" className="h-11 rounded-xl">
                Explore
              </Button>
            </form>
            <div className="mt-10 grid grid-cols-2 gap-4 sm:grid-cols-4">
              {[
                ["clubs", "Clubs & societies"],
                ["openings", "Open positions"],
                ["events", "Upcoming events"],
                ["students", "Students joined"],
              ].map(([k, label]) => (
                <div key={k} className="rounded-2xl border bg-card/70 p-4 backdrop-blur">
                  <div className="font-display text-3xl font-extrabold">{stats ? stats.stats[k] : "–"}</div>
                  <div className="text-xs font-medium text-muted-foreground">{label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Categories */}
      <section className="container py-14">
        <p className="eyebrow">Browse by vibe</p>
        <h2 className="section-title mt-1">What are you into?</h2>
        <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-5">
          {Object.entries(CATEGORIES).map(([key, c]) => {
            const Icon = c.icon;
            return (
              <Link
                key={key}
                to={`/clubs?category=${key}`}
                className="group rounded-2xl border bg-card p-5 shadow-soft transition-all hover:-translate-y-1 hover:shadow-lift"
                style={{ "--c": c.color }}
              >
                <div className="mb-3 grid h-11 w-11 place-items-center rounded-xl text-white transition-transform group-hover:scale-110" style={{ background: c.color }}>
                  <Icon className="h-5 w-5" />
                </div>
                <div className="font-semibold">{c.label}</div>
                <div className="text-xs text-muted-foreground">{c.blurb}</div>
                <div className="mt-2 text-xs font-semibold" style={{ color: c.color }}>
                  {catCount[key] === undefined ? "…" : plural(catCount[key], "club")} →
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      {/* Recruiting now */}
      <section className="border-y bg-secondary/40 py-14">
        <div className="container">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="eyebrow">Don't miss out</p>
              <h2 className="section-title mt-1">Recruiting now</h2>
            </div>
            <Button variant="outline" asChild>
              <Link to="/openings">
                All openings <ArrowRight />
              </Link>
            </Button>
          </div>
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {openingsLoading
              ? Array.from({ length: 3 }, (_, i) => <Skeleton key={i} className="h-56" />)
              : openings?.openings.slice(0, 6).map((o) => <OpeningCard key={o._id} opening={o} />)}
          </div>
        </div>
      </section>

      {/* Featured clubs */}
      <section className="container py-14">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="eyebrow">Most followed</p>
            <h2 className="section-title mt-1">Clubs students love</h2>
          </div>
          <Button variant="outline" asChild>
            <Link to="/clubs">
              All {stats?.stats.clubs || ""} clubs <ArrowRight />
            </Link>
          </Button>
        </div>
        <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {clubsLoading ? Array.from({ length: 8 }, (_, i) => <Skeleton key={i} className="h-64" />) : clubs?.clubs.slice(0, 8).map((c) => <ClubCard key={c._id} club={c} />)}
        </div>
      </section>

      {/* AI */}
      <section className="container pb-14">
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-navy to-navy-deep p-8 text-white md:p-12">
          <div className="pointer-events-none absolute -right-20 -top-20 h-72 w-72 rounded-full bg-accent/30 blur-3xl" />
          <div className="relative grid gap-10 md:grid-cols-[1.1fr_1fr] md:items-center">
            <div>
              <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold">
                <Sparkles className="h-3.5 w-3.5" /> AI-powered
              </span>
              <h2 className="mt-4 text-3xl font-extrabold md:text-4xl">Walk into recruitment prepared</h2>
              <p className="mt-3 max-w-md text-white/80">Not sure where you fit? Nervous about the interview? Three AI tools help you pick, apply and practise.</p>
              <Button variant="accent" size="lg" className="mt-6" asChild>
                <Link to="/assistant">
                  Try the assistant <ArrowRight />
                </Link>
              </Button>
            </div>
            <div className="grid gap-3">
              {[
                [MessageSquareText, "PEC Buddy", "Ask which club fits you, who's recruiting, or where your application stands.", "/assistant"],
                [ClipboardCheck, "Answer checker", "Get a score, specific fixes and a stronger rewrite before you hit submit.", "/assistant?tab=checker"],
                [Mic, "Mock interview", "Practise with a senior-style interviewer for any club, then get a report card.", "/assistant?tab=interview"],
              ].map(([Icon, title, text, to]) => (
                <Link key={title} to={to} className="flex gap-4 rounded-2xl bg-white/10 p-4 transition-colors hover:bg-white/15">
                  <Icon className="mt-0.5 h-5 w-5 shrink-0 text-accent" />
                  <div>
                    <div className="font-semibold">{title}</div>
                    <div className="text-sm text-white/75">{text}</div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Events + how it works */}
      <section className="container grid gap-10 pb-6 lg:grid-cols-[1.3fr_1fr]">
        <div>
          <div className="flex items-end justify-between">
            <div>
              <p className="eyebrow">On campus</p>
              <h2 className="section-title mt-1">Coming up</h2>
            </div>
            <Link to="/events" className="text-sm font-semibold text-primary hover:underline">
              All events →
            </Link>
          </div>
          <div className="mt-6 grid gap-3">{events?.events.slice(0, 4).map((e) => <EventCard key={e._id} event={e} />)}</div>
        </div>
        <div>
          <p className="eyebrow">How it works</p>
          <h2 className="section-title mt-1">Three steps to your club</h2>
          <ol className="mt-6 space-y-4">
            {[
              [Compass, "Explore", "Read what each club really does, why members join, and what a week looks like."],
              [Send, "Apply in minutes", "Answer the club's questions. Check your answers with AI before you send."],
              [PartyPopper, "Get in", "Track every application live, from under review to shortlisted to accepted."],
            ].map(([Icon, title, text], i) => (
              <li key={title} className="flex gap-4 rounded-2xl border bg-card p-4 shadow-soft">
                <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-accent/15 font-display font-extrabold text-accent">{i + 1}</div>
                <div>
                  <div className="flex items-center gap-2 font-semibold">
                    <Icon className="h-4 w-4 text-primary" /> {title}
                  </div>
                  <p className="text-sm text-muted-foreground">{text}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>
    </>
  );
}
