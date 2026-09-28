import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useSelector } from "react-redux";
import { toast } from "sonner";
import { ArrowLeft, CheckCircle2, Clock, Users, CalendarDays, Mic, PartyPopper, SearchX, LogIn, Save } from "lucide-react";
import { useFetch } from "@/hooks/useFetch";
import { api, errorMessage } from "@/lib/api";
import { MODE_META } from "@/lib/categories";
import { formatDate, timeLeft } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/misc";
import { ClubLogo, StatusBadge, EmptyState, DeadlinePill } from "@/components/clubs/ClubBits";
import AnswerChecker from "@/components/chat/AnswerChecker";

export default function OpeningPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useSelector((s) => s.auth);
  const { data, loading, error, reload } = useFetch(`/openings/${id}`);
  const draftKey = `joinclub:draft:${id}`;
  const [answers, setAnswers] = useState([]);
  const [submitting, setSubmitting] = useState(false);

  // Restore an unsent draft (kept in this browser only).
  useEffect(() => {
    if (!data?.opening) return;
    let saved = [];
    try {
      saved = JSON.parse(localStorage.getItem(draftKey) || "[]");
    } catch {
      /* storage unavailable */
    }
    setAnswers(data.opening.questions.map((_, i) => saved[i] || ""));
  }, [data?.opening, draftKey]);

  const setAnswer = (i, v) => {
    setAnswers((prev) => {
      const next = prev.map((a, j) => (j === i ? v : a));
      try {
        localStorage.setItem(draftKey, JSON.stringify(next));
      } catch {
        /* storage unavailable */
      }
      return next;
    });
  };

  if (loading && !data) return <div className="page"><Skeleton className="h-96" /></div>;
  if (error || !data)
    return (
      <div className="page">
        <EmptyState icon={SearchX} title="Opening not found" action={<Button asChild><Link to="/openings">See open positions</Link></Button>}>
          {error}
        </EmptyState>
      </div>
    );

  const { opening, myApplication } = data;
  const club = opening.club;
  const t = timeLeft(opening.deadline);
  const canApply = opening.isOpen && user?.role === "student" && (!myApplication || myApplication.status === "withdrawn");

  const submit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const { data: res } = await api.post(`/applications/opening/${opening._id}`, { answers });
      toast.success(res.message);
      try {
        localStorage.removeItem(draftKey);
      } catch {
        /* storage unavailable */
      }
      reload();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="page max-w-5xl">
      <button onClick={() => navigate(-1)} className="mb-6 inline-flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Back
      </button>

      <div className="grid gap-8 lg:grid-cols-[1fr_320px]">
        <div className="min-w-0">
          <Link to={`/clubs/${club.slug}`} className="inline-flex items-center gap-3 rounded-xl pr-3 transition-colors hover:bg-secondary">
            <ClubLogo club={club} />
            <div>
              <div className="font-semibold">{club.name}</div>
              <div className="text-xs text-muted-foreground">{club.tagline}</div>
            </div>
          </Link>
          <div className="mt-6 flex flex-wrap items-center gap-2">
            <Badge variant="muted">{MODE_META[opening.mode]?.label}</Badge>
            {opening.isOpen ? <Badge variant={t.urgent ? "destructive" : "success"}>{t.label}</Badge> : <Badge variant="muted">Closed</Badge>}
          </div>
          <h1 className="mt-3 text-3xl font-extrabold leading-tight md:text-4xl">{opening.title}</h1>
          <p className="mt-4 whitespace-pre-wrap leading-relaxed text-muted-foreground">{opening.description}</p>

          {opening.requirements?.length > 0 && (
            <div className="mt-8">
              <h2 className="text-lg font-bold">What they're looking for</h2>
              <ul className="mt-3 space-y-2">
                {opening.requirements.map((r) => (
                  <li key={r} className="flex items-start gap-2">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-success" /> {r}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Apply */}
          <div id="apply" className="mt-10 scroll-mt-24 rounded-2xl border bg-card p-5 shadow-soft md:p-6">
            {myApplication && myApplication.status !== "withdrawn" ? (
              <div className="text-center">
                <PartyPopper className="mx-auto h-10 w-10 text-accent" />
                <h2 className="mt-3 text-xl font-bold">You've applied!</h2>
                <p className="mt-1 text-sm text-muted-foreground">Sent {formatDate(myApplication.createdAt)}. Current status:</p>
                <div className="mt-3">
                  <StatusBadge status={myApplication.status} />
                </div>
                <div className="mt-5 flex flex-wrap justify-center gap-2">
                  <Button variant="outline" asChild>
                    <Link to="/applications">Track my applications</Link>
                  </Button>
                  <Button variant="secondary" asChild>
                    <Link to={`/assistant?tab=interview&club=${club.slug}&opening=${opening._id}`}>
                      <Mic /> Practise the interview
                    </Link>
                  </Button>
                </div>
              </div>
            ) : !opening.isOpen ? (
              <p className="text-center text-muted-foreground">Applications for this opening are closed. Follow {club.shortName || club.name} to catch the next one.</p>
            ) : !user ? (
              <div className="text-center">
                <h2 className="text-xl font-bold">Ready to apply?</h2>
                <p className="mt-1 text-sm text-muted-foreground">Log in with your PEC account. It takes a minute.</p>
                <Button className="mt-4" asChild>
                  <Link to={`/login?next=/openings/${opening._id}`}>
                    <LogIn /> Log in to apply
                  </Link>
                </Button>
              </div>
            ) : user.role !== "student" ? (
              <p className="text-center text-muted-foreground">Club admin accounts can't apply. Log in with a student account.</p>
            ) : (
              <form onSubmit={submit} className="space-y-6">
                <div>
                  <h2 className="text-xl font-bold">Your application</h2>
                  <p className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
                    <Save className="h-3.5 w-3.5" /> Drafts save automatically in this browser.
                  </p>
                </div>
                {opening.questions.map((q, i) => (
                  <div key={q} className="space-y-2">
                    <label htmlFor={`q${i}`} className="block font-semibold">
                      {i + 1}. {q}
                    </label>
                    <Textarea id={`q${i}`} value={answers[i] || ""} onChange={(e) => setAnswer(i, e.target.value)} rows={5} maxLength={4000} placeholder="Be specific. A real example beats adjectives." required />
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs text-muted-foreground">{(answers[i] || "").trim().split(/\s+/).filter(Boolean).length} words · 60 to 200 is a good length</span>
                      <AnswerChecker question={q} answer={answers[i] || ""} openingId={opening._id} onUseRewrite={(text) => setAnswer(i, text)} />
                    </div>
                  </div>
                ))}
                <Button type="submit" size="lg" variant="accent" className="w-full" loading={submitting} disabled={!canApply || answers.some((a) => a.trim().length < 2)}>
                  Submit application
                </Button>
              </form>
            )}
          </div>
        </div>

        <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">
          <div className="rounded-2xl border bg-card p-5 shadow-soft">
            <dl className="space-y-4 text-sm">
              <Fact icon={Clock} label="Deadline">
                {formatDate(opening.deadline)} <DeadlinePill deadline={opening.deadline} className="ml-1" />
              </Fact>
              <Fact icon={Users} label="Spots">
                {opening.positions} · {opening.applicantCount} applied so far
              </Fact>
              <Fact icon={CalendarDays} label="Time commitment">
                {club.commitment || "Flexible"}
              </Fact>
            </dl>
          </div>
          {club.lookingFor && (
            <div className="rounded-2xl border bg-secondary/50 p-5 text-sm">
              <div className="font-semibold">Who should apply</div>
              <p className="mt-1 text-muted-foreground">{club.lookingFor}</p>
            </div>
          )}
          <div className="rounded-2xl border bg-card p-5 text-sm shadow-soft">
            <div className="font-semibold">Nervous about the interview?</div>
            <p className="mt-1 text-muted-foreground">Practise with an AI senior from {club.shortName || club.name}.</p>
            <Button variant="secondary" size="sm" className="mt-3" asChild>
              <Link to={`/assistant?tab=interview&club=${club.slug}&opening=${opening._id}`}>
                <Mic /> Mock interview
              </Link>
            </Button>
          </div>
        </aside>
      </div>
    </div>
  );
}

function Fact({ icon: Icon, label, children }) {
  return (
    <div className="flex gap-3">
      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
      <div>
        <dt className="text-xs text-muted-foreground">{label}</dt>
        <dd className="font-medium">{children}</dd>
      </div>
    </div>
  );
}
