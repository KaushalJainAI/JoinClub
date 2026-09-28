import { Sparkles, Compass, Clock, FileText, HelpCircle } from "lucide-react";

const STARTERS = [
  { text: "Find a club for me", icon: Compass },
  { text: "Which clubs are recruiting now?", icon: Clock },
  { text: "What's the status of my applications?", icon: FileText },
  { text: "How does club recruitment work?", icon: HelpCircle },
];

// First screen of the help chatbot: a greeting and tap-to-ask starters.
export default function BuddyEmpty({ onPick, demo, compact }) {
  return (
    <div className="flex h-full flex-col items-center justify-center py-6 text-center">
      <div className="mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br from-primary to-accent text-white shadow-lift">
        <Sparkles className="h-7 w-7" />
      </div>
      <h2 className={compact ? "text-xl font-bold" : "text-2xl font-bold"}>Hi, I'm PEC Buddy 👋</h2>
      <p className="mt-1 max-w-sm text-sm text-muted-foreground">I know every club at PEC. Ask me what to join, who's recruiting, or where your applications stand.</p>
      <div className={`mt-6 grid w-full max-w-lg gap-2 ${compact ? "" : "sm:grid-cols-2"}`}>
        {STARTERS.map(({ text, icon: Icon }) => (
          <button key={text} onClick={() => onPick(text)} className="flex items-center gap-3 rounded-xl border bg-card px-4 py-3 text-left text-sm font-medium shadow-soft transition-all hover:-translate-y-0.5 hover:border-primary">
            <Icon className="h-4 w-4 shrink-0 text-accent" /> {text}
          </button>
        ))}
      </div>
      {demo && <p className="mt-5 text-xs text-muted-foreground">Demo mode: answers come from the club database. Add an Anthropic API key on the server for full AI answers.</p>}
    </div>
  );
}
