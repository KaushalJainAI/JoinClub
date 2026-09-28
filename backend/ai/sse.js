// Server-sent events: one JSON object per `data:` line, with a `type` field.
// Types: session, status, content_chunk, options, suggestions, report, done, error.
export function openSse(res) {
  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache, no-transform",
    Connection: "keep-alive",
    "X-Accel-Buffering": "no",
  });
  res.flushHeaders?.();
  return (type, data = {}) => {
    if (!res.writableEnded) res.write(`data: ${JSON.stringify({ type, ...data })}\n\n`);
  };
}

// The model can offer tap-able choices by ending with [[options: A | B | C]].
const OPTIONS_RE = /\[\[\s*options\s*:([^\]]*)\]\]\s*$/i;
export function extractOptions(text) {
  const m = text.match(OPTIONS_RE);
  if (!m) return { content: text.trim(), options: [] };
  const options = m[1]
    .split("|")
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 6);
  return { content: text.replace(OPTIONS_RE, "").trim(), options };
}
