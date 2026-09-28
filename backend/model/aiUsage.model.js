import mongoose from "mongoose";

// One row per model call, written after the call finishes, so spend and abuse are visible.
// Tokens come from the API response's `usage`; cached tokens cost far less, which is why
// cache_read_input_tokens is recorded separately.
const aiUsageSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", index: true },
    // helpdesk, checker, interview, applicant-summary, suggestions, ...
    feature: { type: String, required: true, index: true },
    model: { type: String, required: true },
    inputTokens: { type: Number, default: 0 },
    outputTokens: { type: Number, default: 0 },
    cacheReadTokens: { type: Number, default: 0 },
    cacheWriteTokens: { type: Number, default: 0 },
    // Wall-clock milliseconds, to see which feature is slow.
    durationMs: { type: Number, default: 0 },
  },
  { timestamps: true }
);

// Today's totals per feature, and per user for a single day.
aiUsageSchema.index({ createdAt: -1 });
aiUsageSchema.index({ user: 1, createdAt: -1 });

export const AI_FEATURES = ["helpdesk", "checker", "interview", "applicant-summary", "suggestions"];

export const AiUsage = mongoose.model("AiUsage", aiUsageSchema);
