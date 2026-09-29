import { useCallback, useRef, useState } from "react";
import { api, API_BASE, errorMessage } from "@/lib/api";

let nextId = 0;
const uid = () => `m${++nextId}`;

// While streaming, hide a trailing "[[options: ...]]" marker the server turns into buttons.
export const visibleText = (text = "") => text.replace(/\[\[[^\]]*\]?\]?\s*$/, "").trimEnd();

/**
 * Drives one assistant conversation over the /ai/chat SSE endpoint.
 * mode: "helpdesk" | "interview". Guests (no session) send their history inline.
 */
export function useChatStream(mode, { loggedIn = false } = {}) {
  const [messages, setMessages] = useState([]);
  const [sessionId, setSessionId] = useState(null);
  const [meta, setMeta] = useState(null);
  const [stage, setStage] = useState(null);
  const [streaming, setStreaming] = useState(false);
  const abortRef = useRef(null);
  const runRef = useRef(0); // id of the newest send(); older streams stop touching the UI
  const messagesRef = useRef(messages);
  messagesRef.current = messages;

  const patchLast = (fn) =>
    setMessages((prev) => {
      const copy = [...prev];
      copy[copy.length - 1] = fn(copy[copy.length - 1]);
      return copy;
    });

  const send = useCallback(
    async (text = "", { setup, regenerate = false } = {}) => {
      if (streaming) return;
      const message = text.trim();
      // Regenerating drops the last reply (and, for guests, the question it answered from
      // the history sent along, since the question is re-sent as `message`).
      const kept = regenerate ? messagesRef.current.slice(0, messagesRef.current.at(-1)?.role === "assistant" ? -1 : undefined) : messagesRef.current;
      const history = (regenerate ? kept.slice(0, -1) : kept).filter((m) => !m.error).map((m) => ({ role: m.role, content: m.content }));
      setMessages(() => [
        // Tapping an option consumes the option row it came from.
        ...kept.map((m) => (m.options?.length ? { ...m, options: [] } : m)),
        ...(message && !regenerate ? [{ id: uid(), role: "user", content: message }] : []),
        { id: uid(), role: "assistant", content: "", pending: true },
      ]);
      setStreaming(true);
      setStage("thinking");
      const controller = new AbortController();
      abortRef.current = controller;
      // The server keeps the stream open for a moment after "done" to send follow-up chips,
      // and the student may already have sent the next message. Only the newest run may
      // touch the UI; an older one stops reading.
      const runId = ++runRef.current;
      const current = () => runRef.current === runId;

      try {
        const res = await fetch(`${API_BASE}/ai/chat`, {
          method: "POST",
          credentials: "include",
          signal: controller.signal,
          headers: { "Content-Type": "application/json", "X-Requested-With": "XMLHttpRequest" },
          body: JSON.stringify({ mode, sessionId, message, setup, regenerate: regenerate || undefined, history: loggedIn ? undefined : history }),
        });
        if (!res.ok || !res.body) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.message || `Request failed (${res.status})`);
        }

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        for (;;) {
          const { value, done } = await reader.read();
          if (done) break;
          if (!current()) {
            reader.cancel().catch(() => {});
            break;
          }
          buffer += decoder.decode(value, { stream: true });
          const frames = buffer.split("\n\n");
          buffer = frames.pop();
          for (const frame of frames) {
            const line = frame.split("\n").find((l) => l.startsWith("data: "));
            if (!line) continue;
            const ev = JSON.parse(line.slice(6));
            switch (ev.type) {
              case "session":
                setSessionId(ev.sessionId);
                if (ev.meta) setMeta(ev.meta);
                break;
              case "status":
                setStage(ev.stage);
                break;
              case "content_chunk":
                setStage(null);
                patchLast((m) => ({ ...m, content: m.content + ev.text }));
                break;
              case "options":
                patchLast((m) => ({ ...m, options: ev.options }));
                break;
              case "suggestions":
                patchLast((m) => ({ ...m, suggestions: ev.suggestions }));
                break;
              case "report":
                patchLast((m) => ({ ...m, report: ev.report }));
                break;
              case "done":
                patchLast((m) => ({ ...m, content: ev.content, pending: false }));
                if (ev.meta) setMeta((prev) => ({ ...prev, ...ev.meta }));
                // Free the input now; the chips (if any) arrive after this on the same stream.
                setStreaming(false);
                setStage(null);
                break;
              case "error":
                patchLast((m) => ({ ...m, pending: false, error: ev.message }));
                break;
            }
          }
        }
      } catch (err) {
        if (!current()) return;
        if (err.name === "AbortError") {
          patchLast((m) => ({ ...m, pending: false, content: visibleText(m.content) || "_Stopped._" }));
        } else {
          patchLast((m) => ({ ...m, pending: false, error: err.message || "Something went wrong." }));
        }
      } finally {
        if (current()) {
          patchLast((m) => (m.pending ? { ...m, pending: false } : m));
          setStreaming(false);
          setStage(null);
          abortRef.current = null;
        }
      }
    },
    [mode, sessionId, streaming, loggedIn]
  );

  const stop = useCallback(() => abortRef.current?.abort(), []);

  // Ask the last question again and replace the answer.
  const regenerate = useCallback(() => {
    const lastUser = [...messagesRef.current].reverse().find((m) => m.role === "user");
    if (lastUser) send(lastUser.content, { regenerate: true });
  }, [send]);

  const reset = useCallback(() => {
    runRef.current++; // detach whatever stream is still open (it may be just the chips)
    abortRef.current?.abort();
    setStreaming(false);
    setStage(null);
    setMessages([]);
    setSessionId(null);
    setMeta(null);
  }, []);

  const loadSession = useCallback(async (id) => {
    runRef.current++;
    abortRef.current?.abort();
    setStreaming(false);
    setStage(null);
    try {
      const { data } = await api.get(`/ai/sessions/${id}`);
      setSessionId(id);
      setMeta(data.session.meta || null);
      const msgs = data.messages.map((m) => ({ id: m._id, role: m.role, content: m.content, options: [], suggestions: [] }));
      // Restore the last message's buttons and an interview's report card.
      const last = data.messages.at(-1);
      if (msgs.length && last?.role === "assistant") {
        msgs[msgs.length - 1].options = last.options || [];
        msgs[msgs.length - 1].suggestions = last.suggestions || [];
        if (data.session.meta?.report) msgs[msgs.length - 1].report = data.session.meta.report;
      }
      setMessages(msgs);
    } catch (err) {
      throw new Error(errorMessage(err));
    }
  }, []);

  return { messages, send, stop, regenerate, reset, loadSession, streaming, stage, sessionId, meta };
}
