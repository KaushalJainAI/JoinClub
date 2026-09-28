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
  const messagesRef = useRef(messages);
  messagesRef.current = messages;

  const patchLast = (fn) =>
    setMessages((prev) => {
      const copy = [...prev];
      copy[copy.length - 1] = fn(copy[copy.length - 1]);
      return copy;
    });

  const send = useCallback(
    async (text = "", { setup } = {}) => {
      if (streaming) return;
      const message = text.trim();
      const history = messagesRef.current.filter((m) => !m.error).map((m) => ({ role: m.role, content: m.content }));
      setMessages((prev) => [
        // Tapping an option consumes the option row it came from.
        ...prev.map((m) => (m.options?.length ? { ...m, options: [] } : m)),
        ...(message ? [{ id: uid(), role: "user", content: message }] : []),
        { id: uid(), role: "assistant", content: "", pending: true },
      ]);
      setStreaming(true);
      setStage("thinking");
      const controller = new AbortController();
      abortRef.current = controller;

      try {
        const res = await fetch(`${API_BASE}/ai/chat`, {
          method: "POST",
          credentials: "include",
          signal: controller.signal,
          headers: { "Content-Type": "application/json", "X-Requested-With": "XMLHttpRequest" },
          body: JSON.stringify({ mode, sessionId, message, setup, history: loggedIn ? undefined : history }),
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
                break;
              case "error":
                patchLast((m) => ({ ...m, pending: false, error: ev.message }));
                break;
            }
          }
        }
      } catch (err) {
        if (err.name === "AbortError") {
          patchLast((m) => ({ ...m, pending: false, content: visibleText(m.content) || "_Stopped._" }));
        } else {
          patchLast((m) => ({ ...m, pending: false, error: err.message || "Something went wrong." }));
        }
      } finally {
        patchLast((m) => (m.pending ? { ...m, pending: false } : m));
        setStreaming(false);
        setStage(null);
        abortRef.current = null;
      }
    },
    [mode, sessionId, streaming, loggedIn]
  );

  const stop = useCallback(() => abortRef.current?.abort(), []);

  const reset = useCallback(() => {
    abortRef.current?.abort();
    setMessages([]);
    setSessionId(null);
    setMeta(null);
  }, []);

  const loadSession = useCallback(async (id) => {
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

  return { messages, send, stop, reset, loadSession, streaming, stage, sessionId, meta };
}
