// A per-student daily token budget for the AI features, on top of the hourly request
// limit: a handful of very long conversations can cost more than hundreds of short ones.
// Counts today's (India time) input + output tokens recorded in AiUsage. Guests are
// covered by the per-IP hourly limit instead.
import mongoose from "mongoose";
import { AiUsage } from "../model/aiUsage.model.js";
import { HttpError } from "../utils/http.js";
import { startOfIstDay } from "../utils/time.js";

// 0 turns the budget off.
export const dailyBudget = () => Number(process.env.AI_DAILY_TOKEN_BUDGET ?? 200_000);

export async function tokensUsedToday(userId) {
  const [row] = await AiUsage.aggregate([
    { $match: { user: new mongoose.Types.ObjectId(String(userId)), createdAt: { $gte: startOfIstDay() } } },
    { $group: { _id: null, total: { $sum: { $add: ["$inputTokens", "$outputTokens"] } } } },
  ]);
  return row?.total || 0;
}

export const aiDailyBudget = async (req, res, next) => {
  try {
    const budget = dailyBudget();
    if (!req.id || !(budget > 0)) return next();
    if ((await tokensUsedToday(req.id)) >= budget) {
      const err = new HttpError(429, "You've used today's AI allowance. It resets at midnight, and your saved chats are still here.");
      err.code = "AI_DAILY_BUDGET";
      return next(err);
    }
    next();
  } catch (err) {
    next(err);
  }
};
