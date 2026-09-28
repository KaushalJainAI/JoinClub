import { rateLimit, ipKeyGenerator } from "express-rate-limit";
import mongoose from "mongoose";
import RateLimitMongo from "rate-limit-mongo";

const json = (message) => ({ success: false, message });
// Per-IP limits would trip during the test suite, where every request comes from one IP.
const skipInTests = () => process.env.NODE_ENV === "test";

// Only ever a signed-in user's id. Anything else (a logging middleware setting req.id, a
// stray query value) would key a limit on a value that changes per request, which silently
// disables the limit.
const userId = (req) => (typeof req.id === "string" && req.id ? req.id : null);

// express-rate-limit counts in memory by default, so every deploy restarts the counters
// and a second instance gets its own. Sharing the counters through Mongo keeps the limits
// working across restarts and replicas. Falls back to memory when there is no connection
// yet, or when the store is turned off, so the app still boots without a database.
let store;
let warned = false;
const sharedStore = () => {
  if (process.env.RATE_LIMIT_STORE === "memory") return undefined;
  if (!mongoose.connection.readyState) return undefined;
  if (!store) {
    try {
      store = new RateLimitMongo({
        uri: process.env.MONGO_URI,
        collectionName: "rateLimits",
        expireTimeMs: 60 * 60 * 1000, // house keys for an hour; each limiter's window still applies
      });
    } catch (err) {
      if (!warned) {
        warned = true;
        console.error(`[rate-limit] Mongo store unavailable, using memory: ${err.message}`);
      }
      return undefined;
    }
  }
  return store;
};

// Per account/email and per IP, so one address can't be spammed from many IPs and one
// IP can't enumerate many addresses. Logged-in requests (change password, verify email)
// carry no email in the body, so they are keyed by user. Runs after optionalAuth.
export const otpByEmail = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 3,
  keyGenerator: (req) => (userId(req) ? `otp:user:${userId(req)}` : `otp:email:${String(req.body?.email || "").toLowerCase()}`),
  store: sharedStore(),
  message: json("Too many codes requested for this email. Try again in 15 minutes."),
  standardHeaders: "draft-8",
  legacyHeaders: false,
});

export const otpByIp = rateLimit({
  skip: skipInTests,
  windowMs: 15 * 60 * 1000,
  limit: 10,
  store: sharedStore(),
  message: json("Too many requests. Try again in a few minutes."),
  standardHeaders: "draft-8",
  legacyHeaders: false,
});

export const authLimiter = rateLimit({
  skip: skipInTests,
  windowMs: 15 * 60 * 1000,
  limit: 30,
  store: sharedStore(),
  message: json("Too many attempts. Try again in a few minutes."),
  standardHeaders: "draft-8",
  legacyHeaders: false,
});

// Logged-in users are limited per account; guests per IP, with a lower cap.
export const aiLimiter = rateLimit({
  skip: skipInTests,
  windowMs: 60 * 60 * 1000,
  limit: (req) => (userId(req) ? Number(process.env.AI_HOURLY_LIMIT || 40) : Number(process.env.AI_GUEST_HOURLY_LIMIT || 8)),
  keyGenerator: (req) => (userId(req) ? `ai:user:${userId(req)}` : `ai:ip:${ipKeyGenerator(req.ip)}`),
  store: sharedStore(),
  message: json("You've hit the hourly AI limit. Take a break and try again later."),
  standardHeaders: "draft-8",
  legacyHeaders: false,
});
