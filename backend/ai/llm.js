// The one place that talks to Claude. Everything else in ai/ builds prompts and
// calls streamText() or generateJSON().
import { AsyncLocalStorage } from "node:async_hooks";
import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { recordUsage } from "./usage.js";

export const MODEL = process.env.AI_MODEL || "claude-opus-5";
// Cheap, fast calls: follow-up chips and per-answer interview scores.
export const SMALL_MODEL = process.env.AI_SMALL_MODEL || "claude-haiku-4-5";

export const aiEnabled = () => Boolean(process.env.ANTHROPIC_API_KEY);

let client;
const getClient = () => (client ??= new Anthropic());

// Set by the caller for the request in flight, so every call made while handling it is
// attributed to the same user and feature, without threading it through every prompt
// builder. AsyncLocalStorage keeps one value per request even when requests overlap, and
// when a request runs two model calls at once (an answer streaming while a score is
// computed); a plain module variable would bill one of them to the other's feature.
const usageStore = new AsyncLocalStorage();
const DEFAULT_CONTEXT = { user: null, feature: "unknown" };
export const withUsageContext = (context, fn) => usageStore.run({ ...(usageStore.getStore() || DEFAULT_CONTEXT), ...context }, fn);
const context = () => usageStore.getStore() || DEFAULT_CONTEXT;

export class AiRefusal extends Error {
  constructor() {
    super("I can't help with that one. Try asking about clubs, openings, events or your applications.");
    this.status = 422;
  }
}

/**
 * Marks the last message of `history` as a prompt-cache breakpoint, so a long chat pays
 * for its earlier turns once and reads them from cache afterwards. Pass only the saved
 * history: the new user turn changes every time and goes after the breakpoint.
 */
export const cacheHistory = (history) => {
  const last = history.at(-1);
  if (!last || typeof last.content !== "string") return history;
  return [...history.slice(0, -1), { ...last, content: [{ type: "text", text: last.content, cache_control: { type: "ephemeral" } }] }];
};

// Server-side refusal fallbacks exist for the Opus 5 / Fable tier. "default" lets
// Anthropic pick the fallback model by refusal category.
const fallbackParams = (model) =>
  /^claude-(opus-5|fable)/.test(model) ? { betas: ["server-side-fallback-2026-07-01"], fallbacks: "default" } : {};

// Haiku 4.5 rejects the effort parameter.
const effortParams = (model, effort) => (effort && !/haiku-4-5/.test(model) ? { effort } : null);

/**
 * Streams the assistant's text as { type: "text", text } chunks.
 * If the model declines mid-stream, the server-side fallback continues on the same
 * stream from the partial text (a `fallback` block marks the switch), so the text
 * already sent stays valid and is simply continued.
 */
export async function* streamText({ system, messages, effort = "medium", maxTokens = 16000, signal, model = MODEL }) {
  const effortCfg = effortParams(model, effort);
  const startedAt = Date.now();
  const stream = getClient().beta.messages.stream(
    {
      model,
      max_tokens: maxTokens,
      system,
      messages,
      ...(effortCfg ? { output_config: effortCfg } : {}),
      ...fallbackParams(model),
    },
    { signal }
  );

  for await (const event of stream) {
    if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
      yield { type: "text", text: event.delta.text };
    }
  }
  const final = await stream.finalMessage();
  if (final.stop_reason === "refusal") throw new AiRefusal();
  await recordUsage({ ...context(), model, usage: final.usage, durationMs: Date.now() - startedAt });
}

/** One structured call; returns the object parsed and validated against the zod schema. */
export async function generateJSON({ system, messages, schema, model = MODEL, effort, maxTokens = 16000 }) {
  const effortCfg = effortParams(model, effort);
  const startedAt = Date.now();
  const response = await getClient().beta.messages.parse({
    model,
    max_tokens: maxTokens,
    system,
    messages,
    output_config: { format: zodOutputFormat(schema), ...(effortCfg || {}) },
    ...fallbackParams(model),
  });
  if (response.stop_reason === "refusal") throw new AiRefusal();
  if (!response.parsed_output) throw new Error(`Model returned no parseable output (stop_reason=${response.stop_reason})`);
  await recordUsage({ ...context(), model, usage: response.usage, durationMs: Date.now() - startedAt });
  return response.parsed_output;
}

// Maps SDK errors to messages a student can act on.
export function friendlyAiError(err) {
  if (err instanceof AiRefusal) return err.message;
  if (err?.name === "AbortError" || err instanceof Anthropic.APIUserAbortError) return null;
  if (err instanceof Anthropic.RateLimitError) return "The assistant is busy right now. Try again in a minute.";
  if (err instanceof Anthropic.AuthenticationError) return "The AI key on the server is invalid. Tell the site admin.";
  if (err instanceof Anthropic.APIConnectionError) return "Couldn't reach the AI service. Check the server's internet connection.";
  if (err instanceof Anthropic.APIError) return `The AI service returned an error (${err.status}). Try again.`;
  return "Something went wrong with the assistant. Try again.";
}
