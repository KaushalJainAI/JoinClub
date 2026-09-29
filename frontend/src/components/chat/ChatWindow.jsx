import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { ArrowUp, Square, Sparkles, AlertCircle, CornerDownRight, Copy, Check, RefreshCw, Mic, MicOff } from "lucide-react";
import { cn } from "@/lib/utils";
import { visibleText } from "@/hooks/useChatStream";
import { Button } from "@/components/ui/button";

const STAGE_LABEL = { thinking: "Thinking", scoring: "Reviewing your answer", report: "Writing your report card" };

// In-app paths open with the router; everything else in a new tab.
function MdLink({ href = "", children }) {
  if (href.startsWith("/")) return <Link to={href}>{children}</Link>;
  return (
    <a href={href} target="_blank" rel="noreferrer">
      {children}
    </a>
  );
}

export function Markdown({ children }) {
  return (
    <div className="prose-chat text-sm">
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={{ a: MdLink }}>
        {children}
      </ReactMarkdown>
    </div>
  );
}

function Typing({ stage }) {
  return (
    <div className="flex items-center gap-2 text-sm text-muted-foreground">
      <span className="flex gap-1">
        {[0, 1, 2].map((i) => (
          <span key={i} className="h-1.5 w-1.5 animate-blink rounded-full bg-current" style={{ animationDelay: `${i * 0.2}s` }} />
        ))}
      </span>
      {STAGE_LABEL[stage] || "Thinking"}…
    </div>
  );
}

function CopyButton({ text }) {
  const [done, setDone] = useState(false);
  return (
    <button
      className="rounded-md p-1 text-muted-foreground opacity-0 transition-opacity hover:bg-secondary hover:text-foreground group-hover:opacity-100"
      onClick={() => navigator.clipboard.writeText(text).then(() => (setDone(true), setTimeout(() => setDone(false), 1500)))}
      aria-label="Copy message"
    >
      {done ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
    </button>
  );
}

function Message({ m, stage, onPick, renderExtra, isLast, onRegenerate }) {
  if (m.role === "user") {
    return (
      <div className="flex justify-end animate-fade-up">
        <div className="max-w-[85%] whitespace-pre-wrap rounded-2xl rounded-br-md bg-primary px-4 py-2.5 text-sm text-primary-foreground">{m.content}</div>
      </div>
    );
  }
  const text = visibleText(m.content);
  return (
    <div className="group flex gap-3 animate-fade-up">
      <div className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-full bg-gradient-to-br from-primary to-accent text-white">
        <Sparkles className="h-4 w-4" />
      </div>
      <div className="min-w-0 flex-1 space-y-3">
        {m.pending && !text ? (
          <Typing stage={stage} />
        ) : (
          text && (
            <div className="rounded-2xl rounded-tl-md bg-card px-4 py-3 shadow-soft ring-1 ring-border">
              <Markdown>{text}</Markdown>
            </div>
          )
        )}
        {m.error && (
          <p className="flex items-start gap-2 rounded-xl bg-destructive/10 px-3 py-2 text-sm text-destructive">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" /> {m.error}
          </p>
        )}
        {renderExtra?.(m)}
        {isLast && m.options?.length > 0 && (
          <div className="grid gap-2 sm:grid-cols-2">
            {m.options.map((o) => (
              <button
                key={o}
                onClick={() => onPick(o)}
                className="rounded-xl border-2 border-primary/15 bg-card px-4 py-3 text-left text-sm font-semibold transition-all hover:-translate-y-0.5 hover:border-primary hover:shadow-soft"
              >
                {o}
              </button>
            ))}
          </div>
        )}
        {isLast && m.suggestions?.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {m.suggestions.map((s) => (
              <button key={s} onClick={() => onPick(s)} className="inline-flex items-center gap-1 rounded-full border bg-card px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:border-primary hover:text-primary">
                <CornerDownRight className="h-3 w-3" /> {s}
              </button>
            ))}
          </div>
        )}
        {!m.pending && (text || m.error) && (
          <div className="flex items-center gap-1">
            {text && <CopyButton text={text} />}
            {isLast && onRegenerate && (
              <button onClick={onRegenerate} className="inline-flex items-center gap-1 rounded-md px-1.5 py-1 text-xs text-muted-foreground hover:bg-secondary hover:text-foreground" aria-label="Regenerate answer">
                <RefreshCw className="h-3.5 w-3.5" /> Regenerate
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * chat: the object returned by useChatStream.
 * empty: shown before the first message. inputDisabled: e.g. a finished interview.
 */
// The browser's own speech recognition (Chrome, Edge, Safari). Nothing is sent to our server.
const SpeechRecognition = typeof window !== "undefined" ? window.SpeechRecognition || window.webkitSpeechRecognition : null;

/**
 * voice: show a microphone that dictates into the input (used for interview answers).
 * regenerate: offer "Regenerate" on the last answer.
 */
export default function ChatWindow({ chat, empty, placeholder = "Ask anything about clubs at PEC…", inputDisabled, disabledHint, renderExtra, className, compact, voice, regenerate }) {
  const [draft, setDraft] = useState("");
  const [listening, setListening] = useState(false);
  const recognitionRef = useRef(null);

  const toggleVoice = () => {
    if (listening) return recognitionRef.current?.stop();
    const r = new SpeechRecognition();
    r.lang = "en-IN";
    r.continuous = true;
    r.interimResults = false;
    r.onresult = (e) => {
      const said = Array.from(e.results)
        .slice(e.resultIndex)
        .map((res) => res[0].transcript)
        .join(" ");
      setDraft((d) => `${d}${d && !d.endsWith(" ") ? " " : ""}${said.trim()}`);
    };
    r.onend = () => setListening(false);
    r.onerror = () => setListening(false);
    recognitionRef.current = r;
    r.start();
    setListening(true);
  };
  useEffect(() => () => recognitionRef.current?.stop(), []);
  const endRef = useRef(null);
  const inputRef = useRef(null);
  const { messages, send, stop, streaming, stage } = chat;

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages]);

  const submit = (e) => {
    e?.preventDefault();
    if (!draft.trim() || streaming || inputDisabled) return;
    if (listening) recognitionRef.current?.stop();
    send(draft);
    setDraft("");
    if (inputRef.current) inputRef.current.style.height = "auto";
  };

  return (
    <div className={cn("flex h-full min-h-0 flex-col", className)}>
      <div className={cn("flex-1 space-y-5 overflow-y-auto", compact ? "p-4" : "p-4 md:p-6")}>
        {messages.length === 0
          ? empty
          : messages.map((m, i) => (
              <Message
                key={m.id}
                m={m}
                stage={stage}
                onPick={(o) => send(o)}
                renderExtra={renderExtra}
                isLast={i === messages.length - 1}
                onRegenerate={regenerate && !streaming && m.role === "assistant" && messages.some((x) => x.role === "user") ? chat.regenerate : null}
              />
            ))}
        <div ref={endRef} />
      </div>
      <form onSubmit={submit} className="border-t bg-background/80 p-3 backdrop-blur">
        {inputDisabled && disabledHint ? (
          <div className="py-1 text-center text-sm text-muted-foreground">{disabledHint}</div>
        ) : (
          <div className="flex items-end gap-2 rounded-2xl border bg-card p-2 shadow-soft focus-within:ring-2 focus-within:ring-ring/30">
            <textarea
              ref={inputRef}
              value={draft}
              rows={1}
              onChange={(e) => {
                setDraft(e.target.value);
                e.target.style.height = "auto";
                e.target.style.height = `${Math.min(e.target.scrollHeight, 160)}px`;
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) submit(e);
              }}
              placeholder={placeholder}
              className="max-h-40 flex-1 resize-none bg-transparent px-2 py-1.5 text-sm outline-none placeholder:text-muted-foreground"
              disabled={inputDisabled}
            />
            {voice && SpeechRecognition && !streaming && (
              <Button
                type="button"
                size="icon"
                variant={listening ? "destructive" : "ghost"}
                className="h-9 w-9 rounded-xl"
                onClick={toggleVoice}
                aria-label={listening ? "Stop dictation" : "Answer by voice"}
                title={listening ? "Stop dictation" : "Answer by voice"}
              >
                {listening ? <MicOff /> : <Mic />}
              </Button>
            )}
            {streaming ? (
              <Button type="button" size="icon" variant="secondary" onClick={stop} className="h-9 w-9 rounded-xl" aria-label="Stop">
                <Square className="fill-current" />
              </Button>
            ) : (
              <Button type="submit" size="icon" className="h-9 w-9 rounded-xl" disabled={!draft.trim()} aria-label="Send">
                <ArrowUp />
              </Button>
            )}
          </div>
        )}
      </form>
    </div>
  );
}
