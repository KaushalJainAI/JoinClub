import { useEffect, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useSelector } from "react-redux";
import { toast } from "sonner";
import { MessageSquareText, ClipboardCheck, Mic, Plus, Trash2, History, LogIn, Sparkles, RotateCcw, Trophy, TrendingUp, BookMarked, Settings2 } from "lucide-react";
import { useChatStream } from "@/hooks/useChatStream";
import { useFetch } from "@/hooks/useFetch";
import { api, errorMessage } from "@/lib/api";
import { cn, relativeTime } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Textarea, Select } from "@/components/ui/input";
import { Field } from "@/components/ui/label";
import { Progress } from "@/components/ui/misc";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/misc";
import ChatWindow from "@/components/chat/ChatWindow";
import BuddyEmpty from "@/components/chat/BuddyEmpty";
import { CheckResult, ScoreRing } from "@/components/chat/AnswerChecker";
import { ClubLogo } from "@/components/clubs/ClubBits";

export default function Assistant() {
  const [params, setParams] = useSearchParams();
  const tab = params.get("tab") || "buddy";
  const { data: status } = useFetch("/ai/status");
  const demo = status && !status.enabled;

  return (
    <div className="page">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow flex items-center gap-1.5">
            <Sparkles className="h-3.5 w-3.5" /> AI assistant
          </p>
          <h1 className="mt-1 text-3xl font-extrabold md:text-4xl">Get into the club you want</h1>
        </div>
        {demo && <span className="rounded-full bg-warning/15 px-3 py-1 text-xs font-semibold text-warning">Demo mode · no API key on the server</span>}
      </div>
      <Tabs value={tab} onValueChange={(v) => setParams({ tab: v }, { replace: true })} className="mt-6">
        <TabsList className="w-full justify-start overflow-x-auto sm:w-auto">
          <TabsTrigger value="buddy">
            <MessageSquareText /> PEC Buddy
          </TabsTrigger>
          <TabsTrigger value="checker">
            <ClipboardCheck /> Answer checker
          </TabsTrigger>
          <TabsTrigger value="interview">
            <Mic /> Mock interview
          </TabsTrigger>
        </TabsList>
        <TabsContent value="buddy">
          <BuddyTab demo={demo} />
        </TabsContent>
        <TabsContent value="checker">
          <CheckerTab />
        </TabsContent>
        <TabsContent value="interview">
          <InterviewTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ---------- shared: saved conversations ----------

function SessionList({ mode, activeId, onOpen, onNew, refreshKey }) {
  const { data, reload } = useFetch(`/ai/sessions?mode=${mode}`);
  useEffect(() => {
    reload();
  }, [refreshKey, reload]);

  const remove = async (id, e) => {
    e.stopPropagation();
    try {
      await api.delete(`/ai/sessions/${id}`);
      reload();
      if (id === activeId) onNew();
    } catch (err) {
      toast.error(errorMessage(err));
    }
  };

  return (
    <div className="flex h-full flex-col">
      <Button variant="outline" className="mb-3 w-full" onClick={onNew}>
        <Plus /> New {mode === "interview" ? "interview" : "chat"}
      </Button>
      <p className="mb-2 flex items-center gap-1.5 px-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        <History className="h-3.5 w-3.5" /> History
      </p>
      <div className="-mx-1 flex-1 space-y-1 overflow-y-auto px-1">
        {data?.sessions?.length ? (
          data.sessions.map((s) => (
            <div key={s._id} className={cn("group flex items-center gap-1 rounded-lg pr-1 transition-colors", s._id === activeId ? "bg-secondary font-medium" : "hover:bg-secondary/60")}>
              <button onClick={() => onOpen(s._id)} className="min-w-0 flex-1 rounded-lg px-3 py-2 text-left text-sm">
                <div className="truncate">{s.title}</div>
                <div className="text-xs text-muted-foreground">{relativeTime(s.updatedAt)}</div>
              </button>
              <button
                onClick={(e) => remove(s._id, e)}
                className="rounded p-1 text-muted-foreground opacity-0 hover:text-destructive focus-visible:opacity-100 group-hover:opacity-100"
                aria-label={`Delete chat "${s.title}"`}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ))
        ) : (
          <p className="px-1 text-xs text-muted-foreground">Your conversations will appear here.</p>
        )}
      </div>
    </div>
  );
}

// ---------- PEC Buddy ----------

function BuddyTab({ demo }) {
  const { user } = useSelector((s) => s.auth);
  const [params, setParams] = useSearchParams();
  const chat = useChatStream("helpdesk", { loggedIn: Boolean(user) });
  const [refreshKey, setRefreshKey] = useState(0);
  const sentPrefill = useRef(false);

  // Links like /assistant?q=... start the conversation with that question.
  useEffect(() => {
    const q = params.get("q");
    if (q && !sentPrefill.current) {
      sentPrefill.current = true;
      chat.send(q);
      params.delete("q");
      setParams(params, { replace: true });
    }
  }, [params, setParams, chat]);

  useEffect(() => {
    if (!chat.streaming && chat.sessionId) setRefreshKey((k) => k + 1);
  }, [chat.streaming, chat.sessionId]);

  return (
    <div className="grid h-[calc(100vh-15rem)] min-h-[520px] gap-4 lg:grid-cols-[260px_1fr]">
      <aside className="hidden rounded-2xl border bg-card p-3 lg:block">
        {user ? (
          <SessionList mode="helpdesk" activeId={chat.sessionId} onOpen={(id) => chat.loadSession(id).catch((e) => toast.error(e.message))} onNew={chat.reset} refreshKey={refreshKey} />
        ) : (
          <div className="p-2 text-sm text-muted-foreground">
            <p>
              <Link to="/login?next=/assistant" className="font-semibold text-primary">
                Log in
              </Link>{" "}
              to save your chats and get answers about your own applications.
            </p>
          </div>
        )}
      </aside>
      <div className="overflow-hidden rounded-2xl border bg-muted/30">
        <ChatWindow regenerate chat={chat} empty={<BuddyEmpty demo={demo} onPick={(t) => chat.send(t)} />} />
      </div>
    </div>
  );
}

// ---------- Answer checker ----------

function CheckerTab() {
  const { data: clubsData } = useFetch("/clubs?sort=name");
  const [form, setForm] = useState({ clubSlug: "", question: "Why do you want to join this club?", answer: "", tone: "natural" });
  const [result, setResult] = useState(null);
  const [demo, setDemo] = useState(false);
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const words = form.answer.trim().split(/\s+/).filter(Boolean).length;

  const check = async (e) => {
    e?.preventDefault();
    setBusy(true);
    try {
      const { data } = await api.post("/ai/check-answer", { ...form, clubSlug: form.clubSlug || undefined });
      setResult(data.result);
      setDemo(Boolean(data.demo));
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <form onSubmit={check} className="space-y-4 rounded-2xl border bg-card p-5 shadow-soft">
        <div>
          <h2 className="text-lg font-bold">Polish an application answer</h2>
          <p className="text-sm text-muted-foreground">Paste a draft. You'll get a score, what's working, what to fix, and a stronger version in your own voice.</p>
        </div>
        <Field label="Club (optional, but makes feedback sharper)" htmlFor="club">
          <Select id="club" value={form.clubSlug} onChange={set("clubSlug")}>
            <option value="">Any club</option>
            {clubsData?.clubs.map((c) => (
              <option key={c.slug} value={c.slug}>
                {c.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="The question" htmlFor="question">
          <Textarea id="question" rows={2} value={form.question} onChange={set("question")} className="min-h-0" required />
        </Field>
        <Field label="Your answer" htmlFor="answer" hint={`${words} words · aim for 60 to 200`}>
          <Textarea id="answer" rows={8} value={form.answer} onChange={set("answer")} placeholder="Write it like you'd say it to a senior you respect…" required />
        </Field>
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-medium text-muted-foreground">Rewrite tone:</span>
          {["natural", "formal", "friendly", "concise"].map((t) => (
            <button key={t} type="button" onClick={() => setForm((f) => ({ ...f, tone: t }))} className={cn("rounded-full border px-3 py-1 text-xs font-semibold capitalize", form.tone === t ? "border-primary bg-primary text-primary-foreground" : "hover:border-primary")}>
              {t}
            </button>
          ))}
        </div>
        <Button type="submit" className="w-full" loading={busy} disabled={form.answer.trim().length < 10}>
          <Sparkles /> Check my answer
        </Button>
      </form>
      <div className="rounded-2xl border bg-card p-5 shadow-soft">
        {result ? (
          <>
            <CheckResult result={result} answer={form.answer} onUse={(text) => setForm((f) => ({ ...f, answer: text }))} />
            {demo && <p className="mt-4 text-xs text-muted-foreground">Demo mode: rule-based check. Add an Anthropic API key for full AI feedback.</p>}
          </>
        ) : (
          <div className="grid h-full min-h-[300px] place-items-center text-center text-muted-foreground">
            <div>
              <ClipboardCheck className="mx-auto h-10 w-10 opacity-40" />
              <p className="mt-3 max-w-xs text-sm">Your feedback appears here: a score out of 10, a rubric, and a suggested rewrite you can use with one click.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ---------- Mock interview ----------

const TYPES = [
  ["mixed", "Mixed", "A bit of everything"],
  ["hr", "Behavioural", "Motivation, teamwork, time"],
  ["technical", "Technical", "Domain and problem solving"],
];

function ReportCard({ report, onRetry, onNew }) {
  return (
    <div className="rounded-2xl border-2 border-primary/20 bg-card p-5 shadow-lift">
      <div className="flex items-center gap-4">
        <ScoreRing score={report.overall} />
        <div>
          <p className="eyebrow">Report card</p>
          <p className="font-display text-lg font-bold leading-snug">{report.headline}</p>
        </div>
      </div>
      <div className="mt-5 grid gap-4 md:grid-cols-3">
        {[
          [Trophy, "Strengths", report.strengths, "text-success"],
          [TrendingUp, "Work on", report.improvements, "text-warning"],
          [BookMarked, "Before the real one", report.resources, "text-primary"],
        ].map(([Icon, title, items, color]) => (
          <div key={title} className="rounded-xl bg-secondary/50 p-4">
            <h4 className={cn("mb-2 flex items-center gap-2 text-sm font-bold", color)}>
              <Icon className="h-4 w-4" /> {title}
            </h4>
            <ul className="space-y-1.5 text-sm">
              {items.map((s) => (
                <li key={s}>• {s}</li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="mt-5 flex flex-wrap gap-2">
        <Button onClick={onRetry}>
          <RotateCcw /> Try again
        </Button>
        <Button variant="outline" onClick={onNew}>
          <Settings2 /> Change settings
        </Button>
      </div>
    </div>
  );
}

function InterviewTab() {
  const { user } = useSelector((s) => s.auth);
  const [params] = useSearchParams();
  const { data: clubsData } = useFetch(user ? "/clubs?sort=name" : null);
  const [setup, setSetup] = useState({ clubSlug: params.get("club") || "", openingId: params.get("opening") || "", type: "mixed", difficulty: "medium", total: 5 });
  const chat = useChatStream("interview", { loggedIn: true });
  const [refreshKey, setRefreshKey] = useState(0);
  const started = chat.messages.length > 0 || chat.sessionId;
  const meta = chat.meta;
  const club = clubsData?.clubs.find((c) => c.slug === (meta?.club?.slug || setup.clubSlug));

  useEffect(() => {
    if (!chat.streaming && chat.sessionId) setRefreshKey((k) => k + 1);
  }, [chat.streaming, chat.sessionId]);

  if (!user)
    return (
      <div className="rounded-2xl border bg-card p-10 text-center shadow-soft">
        <Mic className="mx-auto h-10 w-10 text-accent" />
        <h2 className="mt-3 text-xl font-bold">Practise with an AI senior</h2>
        <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">Pick a club and a style, answer one question at a time, and get a report card at the end. Log in to start; your practice runs are saved.</p>
        <Button className="mt-5" asChild>
          <Link to="/login?next=/assistant?tab=interview">
            <LogIn /> Log in to practise
          </Link>
        </Button>
      </div>
    );

  const start = (s = setup) => chat.send("", { setup: s });
  const retry = () => {
    const s = meta ? { clubSlug: meta.club.slug, type: meta.type, difficulty: meta.difficulty, total: meta.total, openingId: setup.openingId } : setup;
    chat.reset();
    setTimeout(() => start(s), 0);
  };

  return (
    <div className="grid gap-4 lg:grid-cols-[260px_1fr]">
      <aside className="hidden rounded-2xl border bg-card p-3 lg:block lg:h-[calc(100vh-15rem)] lg:min-h-[520px]">
        <SessionList mode="interview" activeId={chat.sessionId} onOpen={(id) => chat.loadSession(id).catch((e) => toast.error(e.message))} onNew={chat.reset} refreshKey={refreshKey} />
      </aside>

      {!started ? (
        <div className="rounded-2xl border bg-card p-5 shadow-soft md:p-8">
          <h2 className="text-xl font-bold">Set up your mock interview</h2>
          <p className="text-sm text-muted-foreground">Answer like it's real. You'll get quick feedback after each answer and a report card at the end.</p>
          <div className="mt-6 space-y-6">
            <Field label="Which club?" htmlFor="iclub">
              <Select id="iclub" value={setup.clubSlug} onChange={(e) => setSetup((s) => ({ ...s, clubSlug: e.target.value, openingId: "" }))}>
                <option value="">Choose a club</option>
                {clubsData?.clubs.map((c) => (
                  <option key={c.slug} value={c.slug}>
                    {c.name}
                  </option>
                ))}
              </Select>
            </Field>
            <div>
              <p className="mb-2 text-sm font-medium">Interview style</p>
              <div className="grid gap-2 sm:grid-cols-3">
                {TYPES.map(([k, label, blurb]) => (
                  <button key={k} type="button" onClick={() => setSetup((s) => ({ ...s, type: k }))} className={cn("rounded-xl border-2 p-3 text-left transition-all", setup.type === k ? "border-primary bg-primary/5" : "hover:border-primary/40")}>
                    <div className="font-semibold">{label}</div>
                    <div className="text-xs text-muted-foreground">{blurb}</div>
                  </button>
                ))}
              </div>
            </div>
            <div className="grid gap-6 sm:grid-cols-2">
              <div>
                <p className="mb-2 text-sm font-medium">Difficulty</p>
                <div className="grid grid-cols-3 gap-1 rounded-xl bg-muted p-1">
                  {["easy", "medium", "hard"].map((d) => (
                    <button key={d} type="button" onClick={() => setSetup((s) => ({ ...s, difficulty: d }))} className={cn("rounded-lg py-1.5 text-sm font-semibold capitalize", setup.difficulty === d ? "bg-card shadow-sm" : "text-muted-foreground")}>
                      {d}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <p className="mb-2 text-sm font-medium">Length</p>
                <div className="grid grid-cols-4 gap-1 rounded-xl bg-muted p-1">
                  {[3, 5, 8, 10].map((n) => (
                    <button key={n} type="button" onClick={() => setSetup((s) => ({ ...s, total: n }))} className={cn("rounded-lg py-1.5 text-sm font-semibold", setup.total === n ? "bg-card shadow-sm" : "text-muted-foreground")}>
                      {n} Qs
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <Button size="lg" className="w-full" disabled={!setup.clubSlug} onClick={() => start()}>
              <Mic /> Start interview
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex h-[calc(100vh-15rem)] min-h-[520px] flex-col overflow-hidden rounded-2xl border bg-muted/30">
          {meta && (
            <div className="flex items-center gap-3 border-b bg-card px-4 py-3">
              {club && <ClubLogo club={club} className="h-9 w-9" />}
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-semibold">{meta.club?.name}</div>
                <div className="text-xs capitalize text-muted-foreground">
                  {meta.type === "hr" ? "Behavioural" : meta.type} · {meta.difficulty} · {meta.role}
                </div>
              </div>
              <div className="w-32 text-right">
                <div className="text-xs font-semibold">{meta.done ? "Finished" : `Question ${Math.max(1, meta.asked)} of ${meta.total}`}</div>
                <Progress value={((meta.done ? meta.total : Math.max(0, meta.asked - 1)) / meta.total) * 100} className="mt-1 h-1.5" />
              </div>
            </div>
          )}
          <ChatWindow
            voice
            chat={chat}
            placeholder="Type or speak your answer… (Shift+Enter for a new line)"
            inputDisabled={meta?.done}
            disabledHint="Interview complete. Your report card is above."
            renderExtra={(m) => (m.report ? <ReportCard report={m.report} onRetry={retry} onNew={chat.reset} /> : null)}
          />
        </div>
      )}
    </div>
  );
}
