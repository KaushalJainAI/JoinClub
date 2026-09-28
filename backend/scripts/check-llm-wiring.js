// Offline check of ai/llm.js: runs a fake Anthropic API on localhost, points the SDK
// at it, and verifies the requests we send and how we read the responses.
//
//   node scripts/check-llm-wiring.js
import http from "http";
import assert from "assert/strict";
import { z } from "zod";

const seen = [];
const server = http.createServer((req, res) => {
  let body = "";
  req.on("data", (c) => (body += c));
  req.on("end", () => {
    const json = JSON.parse(body);
    seen.push({ url: req.url, headers: req.headers, body: json });
    const usage = { input_tokens: 10, output_tokens: 5 };
    if (json.stream) {
      res.writeHead(200, { "content-type": "text/event-stream" });
      const ev = (type, data) => res.write(`event: ${type}\ndata: ${JSON.stringify({ type, ...data })}\n\n`);
      ev("message_start", { message: { id: "msg_1", type: "message", role: "assistant", model: json.model, content: [], stop_reason: null, stop_sequence: null, usage } });
      ev("content_block_start", { index: 0, content_block: { type: "text", text: "" } });
      ev("content_block_delta", { index: 0, delta: { type: "text_delta", text: "Hello " } });
      ev("content_block_delta", { index: 0, delta: { type: "text_delta", text: "PEC!" } });
      ev("content_block_stop", { index: 0 });
      ev("message_delta", { delta: { stop_reason: "end_turn", stop_sequence: null }, usage });
      ev("message_stop", {});
      return res.end();
    }
    res.writeHead(200, { "content-type": "application/json" });
    res.end(
      JSON.stringify({
        id: "msg_2",
        type: "message",
        role: "assistant",
        model: json.model,
        content: [{ type: "text", text: JSON.stringify({ suggestions: ["a", "b", "c"] }) }],
        stop_reason: "end_turn",
        stop_sequence: null,
        usage,
      })
    );
  });
});

await new Promise((r) => server.listen(0, r));
process.env.ANTHROPIC_API_KEY = "test-key";
process.env.ANTHROPIC_BASE_URL = `http://127.0.0.1:${server.address().port}`;
const { streamText, generateJSON, MODEL, SMALL_MODEL } = await import("../ai/llm.js");

let text = "";
for await (const chunk of streamText({ system: "sys", messages: [{ role: "user", content: "hi" }], effort: "medium" })) text += chunk.text || "";
assert.equal(text, "Hello PEC!");
const s = seen[0];
assert.equal(s.body.model, MODEL);
assert.equal(s.body.fallbacks, "default");
assert.match(s.headers["anthropic-beta"], /server-side-fallback-2026-07-01/);
assert.deepEqual(s.body.output_config, { effort: "medium" });
assert.equal(s.body.thinking, undefined, "Opus 5 runs adaptive thinking by default");

const out = await generateJSON({ model: SMALL_MODEL, system: "s", messages: [{ role: "user", content: "q" }], schema: z.object({ suggestions: z.array(z.string()) }), maxTokens: 1024 });
assert.deepEqual(out.suggestions, ["a", "b", "c"]);
const g = seen[1];
assert.equal(g.body.model, SMALL_MODEL);
assert.equal(g.body.output_config.format.type, "json_schema");
assert.equal(g.body.output_config.effort, undefined, "Haiku 4.5 must not get effort");
assert.equal(g.body.fallbacks, undefined, "no server-side fallbacks for Haiku");

console.log("llm wiring OK:", { stream: s.body.model, json: g.body.model });
server.close();
