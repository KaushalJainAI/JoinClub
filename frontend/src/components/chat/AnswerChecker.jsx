import { useState } from "react";
import { toast } from "sonner";
import { Sparkles, ThumbsUp, Wrench, Wand2, RotateCcw } from "lucide-react";
import { api, errorMessage } from "@/lib/api";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/misc";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const TONES = [
  ["natural", "Natural"],
  ["formal", "Formal"],
  ["friendly", "Friendly"],
  ["concise", "Concise"],
];

export function ScoreRing({ score, max = 10, size = 96 }) {
  const pct = score / max;
  const r = 40;
  const c = 2 * Math.PI * r;
  const color = pct >= 0.75 ? "hsl(var(--success))" : pct >= 0.5 ? "hsl(var(--warning))" : "hsl(var(--destructive))";
  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg viewBox="0 0 100 100" className="-rotate-90">
        <circle cx="50" cy="50" r={r} fill="none" stroke="hsl(var(--muted))" strokeWidth="10" />
        <circle cx="50" cy="50" r={r} fill="none" stroke={color} strokeWidth="10" strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - pct)} className="transition-all duration-700" />
      </svg>
      <div className="absolute inset-0 grid place-items-center">
        <span className="font-display text-2xl font-extrabold">
          {score}
          <span className="text-sm font-semibold text-muted-foreground">/{max}</span>
        </span>
      </div>
    </div>
  );
}

export function CheckResult({ result, onUse, answer }) {
  return (
    <div className="space-y-5">
      <div className="flex items-center gap-5">
        <ScoreRing score={result.score} />
        <p className="flex-1 font-display text-lg font-bold leading-snug">{result.verdict}</p>
      </div>
      {result.rubric?.length > 0 && (
        <div className="grid gap-2.5 sm:grid-cols-2">
          {result.rubric.map((r) => (
            <div key={r.criterion}>
              <div className="mb-1 flex justify-between text-xs font-medium">
                <span>{r.criterion}</span>
                <span className="text-muted-foreground">{r.score}/5</span>
              </div>
              <Progress value={r.score * 20} barClassName={r.score >= 4 ? "bg-success" : r.score >= 3 ? "bg-warning" : "bg-destructive"} />
            </div>
          ))}
        </div>
      )}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-xl bg-success/10 p-4">
          <h4 className="mb-2 flex items-center gap-2 text-sm font-bold text-success">
            <ThumbsUp className="h-4 w-4" /> Working well
          </h4>
          <ul className="space-y-1.5 text-sm">
            {result.strengths.map((s) => (
              <li key={s}>• {s}</li>
            ))}
          </ul>
        </div>
        <div className="rounded-xl bg-warning/10 p-4">
          <h4 className="mb-2 flex items-center gap-2 text-sm font-bold text-warning">
            <Wrench className="h-4 w-4" /> Make it stronger
          </h4>
          <ul className="space-y-1.5 text-sm">
            {result.improvements.map((s) => (
              <li key={s}>• {s}</li>
            ))}
          </ul>
        </div>
      </div>
      {result.suggestedRewrite && (
        <div className="rounded-xl border-2 border-dashed border-primary/30 p-4">
          <h4 className="mb-2 flex items-center gap-2 text-sm font-bold text-primary">
            <Wand2 className="h-4 w-4" /> Suggested rewrite
          </h4>
          <p className="whitespace-pre-wrap text-sm leading-relaxed">{result.suggestedRewrite}</p>
          <p className="mt-2 text-xs text-muted-foreground">Replace anything in [brackets] with your own details. Never submit something that isn't true.</p>
          {onUse && (
            <div className="mt-3 flex gap-2">
              <Button size="sm" onClick={() => onUse(result.suggestedRewrite)}>
                Use this version
              </Button>
              <Button size="sm" variant="ghost" onClick={() => onUse(answer)}>
                Keep mine
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// "Check with AI" button + dialog, used next to each application answer.
export default function AnswerChecker({ question, answer, openingId, clubSlug, onUseRewrite, className }) {
  const [open, setOpen] = useState(false);
  const [tone, setTone] = useState("natural");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [demo, setDemo] = useState(false);

  const check = async (t = tone) => {
    setLoading(true);
    setResult(null);
    try {
      const { data } = await api.post("/ai/check-answer", { question, answer, openingId, clubSlug, tone: t });
      setResult(data.result);
      setDemo(Boolean(data.demo));
    } catch (err) {
      toast.error(errorMessage(err));
      setOpen(false);
    } finally {
      setLoading(false);
    }
  };

  const tooShort = (answer || "").trim().length < 10;

  return (
    <>
      <Button
        type="button"
        variant="secondary"
        size="sm"
        className={className}
        disabled={tooShort}
        title={tooShort ? "Write at least a sentence first" : undefined}
        onClick={() => {
          setOpen(true);
          check();
        }}
      >
        <Sparkles className="text-accent" /> Check with AI
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Answer check</DialogTitle>
            <DialogDescription className="line-clamp-2">“{question}”</DialogDescription>
          </DialogHeader>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-medium text-muted-foreground">Rewrite tone:</span>
            {TONES.map(([k, label]) => (
              <button
                key={k}
                type="button"
                disabled={loading}
                onClick={() => {
                  setTone(k);
                  check(k);
                }}
                className={cn("rounded-full border px-3 py-1 text-xs font-semibold transition-colors", tone === k ? "border-primary bg-primary text-primary-foreground" : "hover:border-primary")}
              >
                {label}
              </button>
            ))}
            {result && (
              <Button type="button" size="sm" variant="ghost" className="ml-auto" onClick={() => check()} disabled={loading}>
                <RotateCcw /> Re-check
              </Button>
            )}
          </div>
          {loading ? (
            <div className="space-y-3 py-6 text-center">
              <Sparkles className="mx-auto h-8 w-8 animate-pulse text-accent" />
              <p className="text-sm text-muted-foreground">Reading your answer like a club senior would…</p>
            </div>
          ) : (
            result && (
              <CheckResult
                result={result}
                answer={answer}
                onUse={(text) => {
                  onUseRewrite?.(text);
                  setOpen(false);
                }}
              />
            )
          )}
          {demo && !loading && <p className="text-xs text-muted-foreground">Demo mode: this is a rule-based check. Add an Anthropic API key on the server for full AI feedback.</p>}
        </DialogContent>
      </Dialog>
    </>
  );
}
