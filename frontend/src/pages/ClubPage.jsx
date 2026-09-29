import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useSelector } from "react-redux";
import { toast } from "sonner";
import {
  Heart,
  Share2,
  Users,
  CalendarDays,
  Clock,
  Sparkles,
  ArrowRight,
  Quote,
  CheckCircle2,
  Rocket,
  Target,
  Trophy,
  Lightbulb,
  Star,
  Mic,
  MessageCircle,
  ExternalLink,
  Instagram,
  Youtube,
  Facebook,
  Linkedin,
  Mail,
  Globe,
  ChevronDown,
  SearchX,
  BellRing,
  UserRound,
} from "lucide-react";
import { useFetch } from "@/hooks/useFetch";
import { api, errorMessage } from "@/lib/api";
import { categoryMeta } from "@/lib/categories";
import { cdnImg, cn, formatDate, plural, timeLeft } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/misc";
import { ClubLogo, CategoryBadge, ClubCard, EventCard, DeadlinePill, StatusBadge, EmptyState } from "@/components/clubs/ClubBits";
import { MODE_META } from "@/lib/categories";

const WHY_ICONS = [Rocket, Target, Trophy, Lightbulb, Star, Sparkles];

const FAQS = (c) => [
  ["Do I need prior experience?", c.lookingFor || "No. Clubs look for interest and commitment first."],
  ["How much time does it take?", `Typically ${c.commitment || "a few hours a week"}. It's more around big events and less during exams.`],
  ["How do I join?", `Apply through an open position on this page. ${c.shortName || c.name} reviews applications and may invite you for a short interview. You can practise for it with our AI mock interview.`],
  ["Can I be in more than one club?", "Yes. Many PEC students are in two or three. Just be honest about your time in your application."],
  ["I missed the recruitment. Now what?", "Follow the club. You'll see its next opening on your feed, and many clubs also run workshops that are open to everyone."],
];

const SOCIAL_ICONS = { instagram: Instagram, youtube: Youtube, facebook: Facebook, linkedin: Linkedin, website: Globe, email: Mail };

function Section({ id, eyebrow, title, children, className }) {
  return (
    <section id={id} className={cn("scroll-mt-24", className)}>
      {eyebrow && <p className="eyebrow">{eyebrow}</p>}
      {title && <h2 className="section-title mt-1">{title}</h2>}
      <div className="mt-5">{children}</div>
    </section>
  );
}

export default function ClubPage() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { user } = useSelector((s) => s.auth);
  const { data, loading, error, setData } = useFetch(`/clubs/${slug}`);
  const [aboutOpen, setAboutOpen] = useState(false);
  const [following, setFollowing] = useState(false);

  if (loading && !data) return <ClubSkeleton />;
  if (error || !data)
    return (
      <div className="page">
        <EmptyState icon={SearchX} title="Club not found" action={<Button asChild><Link to="/clubs">Browse all clubs</Link></Button>}>
          {error}
        </EmptyState>
      </div>
    );

  const { club, openings, pastOpenings, events, related } = data;
  const color = club.color || categoryMeta(club.category).color;
  const name = club.shortName || club.name;
  const isRecruiting = openings.length > 0;
  const upcoming = events.filter((e) => new Date(e.date) >= new Date());
  const socials = Object.entries(club.socials || {}).filter(([, v]) => v);
  const about = (club.about || []).filter(Boolean);
  const nextDeadline = openings[0]?.deadline;

  const toggleFollow = async () => {
    if (!user) return navigate(`/login?next=/clubs/${slug}`);
    setFollowing(true);
    try {
      const { data: res } = await api.post(`/clubs/${slug}/follow`);
      setData((d) => ({ ...d, club: { ...d.club, isFollowing: res.following, followerCount: d.club.followerCount + (res.following ? 1 : -1) } }));
      toast.success(res.message);
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setFollowing(false);
    }
  };

  const share = async () => {
    const url = window.location.href;
    try {
      if (navigator.share) await navigator.share({ title: club.name, text: club.tagline, url });
      else {
        await navigator.clipboard.writeText(url);
        toast.success("Link copied. Send it to your friends!");
      }
    } catch {
      /* share sheet dismissed */
    }
  };

  const applyTarget = openings.length === 1 ? `/openings/${openings[0]._id}` : "#positions";

  return (
    <div style={{ "--club": color }}>
      {/* ---------- Hero ---------- */}
      <section className="relative overflow-hidden border-b">
        <div className="absolute inset-0" style={{ background: `linear-gradient(135deg, ${color} 0%, ${color}cc 45%, hsl(221 70% 16%) 100%)` }} />
        {club.cover && <img src={cdnImg(club.cover, 1200)} alt="" className="absolute inset-0 h-full w-full object-cover opacity-30 mix-blend-luminosity" onError={(e) => (e.currentTarget.style.display = "none")} />}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
        <div className="container relative py-12 text-white md:py-20">
          <div className="flex flex-col gap-6 md:flex-row md:items-end">
            <ClubLogo club={club} className="h-24 w-24 rounded-2xl border-4 border-white/90 shadow-lift md:h-28 md:w-28" />
            <div className="flex-1 animate-fade-up">
              <div className="mb-3 flex flex-wrap items-center gap-2">
                <CategoryBadge category={club.category} solid />
                {isRecruiting ? (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-success px-2.5 py-0.5 text-xs font-bold text-white">
                    <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-white" /> Recruiting · {timeLeft(nextDeadline).label}
                  </span>
                ) : (
                  <span className="rounded-full bg-white/15 px-2.5 py-0.5 text-xs font-semibold">Not recruiting right now</span>
                )}
                {club.foundedYear && <span className="rounded-full bg-white/15 px-2.5 py-0.5 text-xs font-semibold">Since {club.foundedYear}</span>}
              </div>
              <h1 className="text-3xl font-extrabold leading-tight md:text-5xl">{club.name}</h1>
              <p className="mt-3 max-w-2xl font-display text-xl font-semibold text-white/95 md:text-2xl">{club.tagline}</p>
            </div>
          </div>
          <p className="mt-6 max-w-3xl text-base leading-relaxed text-white/85 md:text-lg">{club.pitch}</p>
          <div className="mt-8 flex flex-wrap gap-3">
            {isRecruiting ? (
              <Button size="lg" variant="accent" asChild>
                {applyTarget.startsWith("#") ? (
                  <a href={applyTarget}>
                    Apply to {name} <ArrowRight />
                  </a>
                ) : (
                  <Link to={applyTarget}>
                    Apply to {name} <ArrowRight />
                  </Link>
                )}
              </Button>
            ) : (
              <Button size="lg" variant="accent" onClick={toggleFollow} loading={following} disabled={club.isFollowing}>
                <BellRing /> {club.isFollowing ? "You'll hear when they recruit" : "Notify me when they recruit"}
              </Button>
            )}
            <Button size="lg" variant="outline" className="border-white/40 bg-white/10 text-white hover:bg-white/20 hover:text-white" onClick={toggleFollow} loading={following}>
              <Heart className={cn(club.isFollowing && "fill-current")} /> {club.isFollowing ? "Following" : "Follow"} · {club.followerCount}
            </Button>
            <Button size="lg" variant="ghost" className="text-white hover:bg-white/15 hover:text-white" onClick={share}>
              <Share2 /> Share
            </Button>
          </div>
        </div>
      </section>

      {/* ---------- Quick facts ---------- */}
      <div className="border-b bg-card">
        <div className="container grid grid-cols-2 divide-x divide-y md:grid-cols-4 md:divide-y-0">
          {[
            [Users, club.memberCount ? `${club.memberCount}+` : "–", "Active members"],
            [Heart, club.followerCount, "Students following"],
            [Clock, club.commitment || "Flexible", "Typical time"],
            [CalendarDays, upcoming.length ? plural(upcoming.length, "event") : "Soon", "Coming up"],
          ].map(([Icon, value, label]) => (
            <div key={label} className="flex items-center gap-3 px-4 py-5">
              <Icon className="h-5 w-5 shrink-0" style={{ color }} />
              <div>
                <div className="font-display text-lg font-bold leading-tight">{value}</div>
                <div className="text-xs text-muted-foreground">{label}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="container grid gap-12 py-12 lg:grid-cols-[1fr_360px]">
        {/* ---------- Main column ---------- */}
        <div className="min-w-0 space-y-16">
          {club.whyJoin?.length > 0 && (
            <Section eyebrow="The pitch" title={`Why students join ${name}`}>
              <div className="grid gap-4 sm:grid-cols-2">
                {club.whyJoin.map((w, i) => {
                  const Icon = WHY_ICONS[i % WHY_ICONS.length];
                  return (
                    <div key={w.title} className="group rounded-2xl border bg-card p-5 shadow-soft transition-all hover:-translate-y-0.5 hover:shadow-lift">
                      <div className="mb-3 grid h-10 w-10 place-items-center rounded-xl text-white" style={{ background: color }}>
                        <Icon className="h-5 w-5" />
                      </div>
                      <h3 className="font-display text-lg font-bold">{w.title}</h3>
                      <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{w.text}</p>
                    </div>
                  );
                })}
              </div>
            </Section>
          )}

          {(club.activities?.length > 0 || club.skills?.length > 0) && (
            <Section eyebrow="A week in the club" title="What you'll actually do">
              <div className="grid gap-6 md:grid-cols-2">
                {club.activities?.length > 0 && (
                  <ul className="space-y-2.5">
                    {club.activities.map((a) => (
                      <li key={a} className="flex items-start gap-3">
                        <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" style={{ color }} />
                        <span>{a}</span>
                      </li>
                    ))}
                  </ul>
                )}
                {club.skills?.length > 0 && (
                  <div className="rounded-2xl border bg-secondary/50 p-5">
                    <h3 className="font-semibold">Skills you'll walk away with</h3>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {club.skills.map((s) => (
                        <span key={s} className="rounded-full border bg-card px-3 py-1 text-sm font-medium">
                          {s}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </Section>
          )}

          {club.signatureEvents?.length > 0 && (
            <Section eyebrow="Mark your calendar" title="Signature events">
              <ol className="relative space-y-4 border-l-2 pl-6" style={{ borderColor: `${color}55` }}>
                {club.signatureEvents.map((e) => (
                  <li key={e.name} className="relative">
                    <span className="absolute -left-[33px] top-1.5 h-4 w-4 rounded-full border-4 border-background" style={{ background: color }} />
                    <h3 className="font-display text-lg font-bold">{e.name}</h3>
                    <p className="text-muted-foreground">{e.text}</p>
                  </li>
                ))}
              </ol>
            </Section>
          )}

          {club.testimonials?.length > 0 && (
            <Section eyebrow="Straight from members" title={`Life inside ${name}`}>
              <div className="grid gap-4 md:grid-cols-2">
                {club.testimonials.map((t) => (
                  <figure key={t.name} className="relative rounded-2xl border bg-card p-6 shadow-soft">
                    <Quote className="absolute right-5 top-5 h-8 w-8 opacity-15" style={{ color }} />
                    <blockquote className="pr-8 text-base leading-relaxed">“{t.quote}”</blockquote>
                    <figcaption className="mt-4 flex items-center gap-3">
                      <div className="grid h-9 w-9 place-items-center rounded-full text-sm font-bold text-white" style={{ background: color }}>
                        {t.name[0]}
                      </div>
                      <div className="text-sm">
                        <div className="font-semibold">{t.name}</div>
                        <div className="text-muted-foreground">
                          {t.branch}, year {t.year}
                        </div>
                      </div>
                    </figcaption>
                  </figure>
                ))}
              </div>
            </Section>
          )}

          {club.lookingFor && (
            <div className="relative overflow-hidden rounded-2xl border-2 p-6 md:p-8" style={{ borderColor: `${color}40`, background: `${color}0d` }}>
              <p className="eyebrow" style={{ color }}>
                Who should apply
              </p>
              <p className="mt-2 font-display text-xl font-bold leading-snug md:text-2xl">{club.lookingFor}</p>
              <div className="mt-5 flex flex-wrap gap-3">
                <Button variant="outline" asChild>
                  <Link to={`/assistant?tab=interview&club=${club.slug}`}>
                    <Mic /> Practise a {name} interview
                  </Link>
                </Button>
                <Button variant="ghost" asChild>
                  <Link to={`/assistant?q=${encodeURIComponent(`Is ${name} a good fit for me?`)}`}>
                    <MessageCircle /> Ask if it's right for you
                  </Link>
                </Button>
              </div>
            </div>
          )}

          {about.length > 0 && (
            <Section eyebrow="In their own words" title={`About ${name}`}>
              <div className={cn("relative space-y-4 leading-relaxed text-muted-foreground", !aboutOpen && about.join(" ").length > 900 && "max-h-72 overflow-hidden")}>
                {about.map((p, i) => (
                  <p key={i}>{p}</p>
                ))}
                {!aboutOpen && about.join(" ").length > 900 && <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-background to-transparent" />}
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-4">
                {about.join(" ").length > 900 && (
                  <Button variant="link" className="px-0" onClick={() => setAboutOpen((o) => !o)}>
                    {aboutOpen ? "Show less" : "Read the full story"} <ChevronDown className={cn("transition-transform", aboutOpen && "rotate-180")} />
                  </Button>
                )}
                {club.sourceUrl && (
                  <a href={club.sourceUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
                    Source: pec.ac.in <ExternalLink className="h-3 w-3" />
                  </a>
                )}
              </div>
            </Section>
          )}

          {upcoming.length > 0 && (
            <Section eyebrow="Come say hi" title="Upcoming events">
              <div className="grid gap-3">
                {upcoming.map((e) => (
                  <EventCard key={e._id} event={e} showClub={false} />
                ))}
              </div>
            </Section>
          )}

          <Section eyebrow="Good to know" title="Questions students ask">
            <div className="divide-y rounded-2xl border bg-card">
              {FAQS(club).map(([q, a]) => (
                <details key={q} className="group px-5 py-4 [&_summary::-webkit-details-marker]:hidden">
                  <summary className="flex cursor-pointer items-center justify-between gap-4 font-semibold">
                    {q}
                    <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180" />
                  </summary>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{a}</p>
                </details>
              ))}
            </div>
          </Section>
        </div>

        {/* ---------- Sidebar ---------- */}
        <aside className="space-y-6 lg:sticky lg:top-24 lg:self-start">
          <div id="positions" className="scroll-mt-24 rounded-2xl border bg-card p-5 shadow-lift">
            <h2 className="flex items-center justify-between font-display text-lg font-bold">
              Open positions
              <Badge variant={isRecruiting ? "success" : "muted"}>{openings.length}</Badge>
            </h2>
            {isRecruiting ? (
              <div className="mt-4 space-y-3">
                {openings.map((o) => (
                  <Link key={o._id} to={`/openings/${o._id}`} className="block rounded-xl border p-4 transition-all hover:border-primary hover:shadow-soft">
                    <div className="mb-1 flex items-center gap-2">
                      <Badge variant="muted">{MODE_META[o.mode]?.label}</Badge>
                      {o.myStatus && <StatusBadge status={o.myStatus} />}
                    </div>
                    <div className="font-semibold leading-snug">{o.title}</div>
                    <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
                      <DeadlinePill deadline={o.deadline} />
                      <span>{o.applicantCount} applied</span>
                    </div>
                  </Link>
                ))}
                <p className="text-xs text-muted-foreground">
                  <Sparkles className="mr-1 inline h-3 w-3 text-accent" />
                  Tip: use the AI answer checker on the application form before you submit.
                </p>
              </div>
            ) : (
              <div className="mt-4 text-sm text-muted-foreground">
                <p>{name} isn't recruiting right now. Follow to hear first when they open.</p>
                {pastOpenings.length > 0 && <p className="mt-2 text-xs">Last opening: {pastOpenings[0].title}, closed {formatDate(pastOpenings[0].deadline)}.</p>}
                <Button className="mt-4 w-full" onClick={toggleFollow} loading={following} variant={club.isFollowing ? "outline" : "default"}>
                  <Heart className={cn(club.isFollowing && "fill-current")} /> {club.isFollowing ? "Following" : "Follow for updates"}
                </Button>
              </div>
            )}
          </div>

          <div className="rounded-2xl border bg-card p-5 shadow-soft">
            <h3 className="font-semibold">Get interview-ready</h3>
            <p className="mt-1 text-sm text-muted-foreground">A 5-minute mock interview for {name}, with a report card at the end.</p>
            <Button variant="secondary" className="mt-3 w-full" asChild>
              <Link to={`/assistant?tab=interview&club=${club.slug}`}>
                <Mic /> Start mock interview
              </Link>
            </Button>
          </div>

          {club.leadership?.length > 0 && (
            <div className="rounded-2xl border bg-card p-5 shadow-soft">
              <h3 className="font-semibold">Leadership</h3>
              <ul className="mt-3 space-y-3">
                {club.leadership.map((l) => (
                  <li key={l.role + l.name} className="flex items-center gap-3 text-sm">
                    <div className="grid h-8 w-8 place-items-center rounded-full bg-secondary">
                      <UserRound className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div>
                      <div className="font-medium">{l.name}</div>
                      <div className="text-xs text-muted-foreground">{l.role}</div>
                    </div>
                  </li>
                ))}
              </ul>
              <p className="mt-3 text-xs text-muted-foreground">As listed on pec.ac.in.</p>
            </div>
          )}

          {socials.length > 0 && (
            <div className="rounded-2xl border bg-card p-5 shadow-soft">
              <h3 className="font-semibold">Find them online</h3>
              <div className="mt-3 flex flex-wrap gap-2">
                {socials.map(([k, v]) => {
                  const Icon = SOCIAL_ICONS[k] || Globe;
                  const href = k === "email" ? `mailto:${v}` : v.startsWith("http") ? v : `https://${v}`;
                  return (
                    <a key={k} href={href} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium capitalize hover:border-primary">
                      <Icon className="h-4 w-4" /> {k}
                    </a>
                  );
                })}
              </div>
            </div>
          )}
        </aside>
      </div>

      {related?.length > 0 && (
        <section className="border-t bg-secondary/30 py-12">
          <div className="container">
            <p className="eyebrow">Keep exploring</p>
            <h2 className="section-title mt-1">If you like {name}, try…</h2>
            <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {related.map((c) => (
                <ClubCard key={c._id} club={c} />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Mobile apply bar */}
      {isRecruiting && (
        <div className="fixed inset-x-0 bottom-0 z-30 border-t bg-background/95 p-3 backdrop-blur lg:hidden">
          <div className="flex items-center gap-3">
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-semibold">{name} is recruiting</div>
              <DeadlinePill deadline={nextDeadline} />
            </div>
            <Button variant="accent" asChild>
              {applyTarget.startsWith("#") ? <a href={applyTarget}>Apply</a> : <Link to={applyTarget}>Apply now</Link>}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function ClubSkeleton() {
  return (
    <>
      <Skeleton className="h-80 rounded-none" />
      <div className="container grid gap-10 py-10 lg:grid-cols-[1fr_360px]">
        <div className="space-y-4">
          <Skeleton className="h-8 w-64" />
          <div className="grid gap-4 sm:grid-cols-2">
            {Array.from({ length: 4 }, (_, i) => (
              <Skeleton key={i} className="h-36" />
            ))}
          </div>
        </div>
        <Skeleton className="h-72" />
      </div>
    </>
  );
}
