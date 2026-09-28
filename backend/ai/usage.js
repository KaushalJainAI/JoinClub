// Token and cost bookkeeping. Called from llm.js after every model call.
//
// Nothing here may break an AI feature: a failed write costs a row in a reporting
// collection, so every error is swallowed and logged.
import mongoose from "mongoose";

export async function recordUsage({ user, feature, model, usage, durationMs }) {
  try {
    // Skip when there is no database (the offline llm wiring check) or no usage to record.
    if (!mongoose.connection.readyState) return;
    const { AiUsage } = await import("../model/aiUsage.model.js");
    await AiUsage.create({
      user: user || undefined,
      feature: feature || "unknown",
      model: model || "unknown",
      inputTokens: usage?.input_tokens ?? 0,
      outputTokens: usage?.output_tokens ?? 0,
      cacheReadTokens: usage?.cache_read_input_tokens ?? 0,
      cacheWriteTokens: usage?.cache_creation_input_tokens ?? 0,
      durationMs: durationMs ?? 0,
    });
  } catch (err) {
    console.error("[ai] could not record usage:", err.message);
  }
}
