// The Express app, without starting a server, so tests can import it.
import express from "express";
import mongoose from "mongoose";
import cookieParser from "cookie-parser";
import cors from "cors";
import helmet from "helmet";
import pinoHttp from "pino-http";
import { logger } from "./utils/logger.js";
import authRoute from "./routes/auth.route.js";
import userRoute from "./routes/user.route.js";
import clubRoute from "./routes/club.route.js";
import openingRoute from "./routes/opening.route.js";
import applicationRoute from "./routes/application.route.js";
import { eventRouter, statsRouter, adminRouter, aiRouter } from "./routes/misc.route.js";
import { previewRouter } from "./routes/preview.route.js";
import errorHandler from "./middlewares/errorHandler.js";

const app = express();
app.set("trust proxy", 1); // correct client IPs for rate limiting behind a proxy

// One log line per request. Health checks are noise; 4xx/5xx stand out.
app.use(
  pinoHttp({
    logger,
    autoLogging: { ignore: (req) => req.url === "/api/health" },
    customLogLevel: (_req, res, err) => (err || res.statusCode >= 500 ? "error" : res.statusCode >= 400 ? "warn" : "info"),
    serializers: { req: (req) => ({ method: req.method, url: req.url }) },
  })
);

// pino-http writes its own request id to `req.id`, which this app uses for the
// authenticated user's id (set in middlewares/auth.js). Left alone, every guest request
// would look logged-in with a numeric id. The loggers have already captured the log id
// by this point, so moving it aside here is safe.
app.use((req, _res, next) => {
  req.requestId = req.id;
  delete req.id;
  next();
});

app.use(helmet());
app.use(cors({ origin: (process.env.CLIENT_URL || "http://localhost:5173").split(","), credentials: true }));
app.use(express.json({ limit: "200kb" }));
app.use(cookieParser());

// CSRF guard: a cross-site HTML form can't set custom headers, and CORS only lets our
// own frontend send this one. Every state-changing API call must carry it.
app.use("/api", (req, res, next) => {
  if (["GET", "HEAD", "OPTIONS"].includes(req.method) || req.get("X-Requested-With") === "XMLHttpRequest") return next();
  res.status(403).json({ success: false, message: "Missing X-Requested-With header." });
});

app.get("/api/health", (req, res) => {
  const db = ["disconnected", "connected", "connecting", "disconnecting"][mongoose.connection.readyState] || "unknown";
  res.status(db === "connected" ? 200 : 503).json({ success: db === "connected", status: db === "connected" ? "ok" : "degraded", db });
});
app.use("/api/v1/auth", authRoute);
app.use("/api/v1/users", userRoute);
app.use("/api/v1/clubs", clubRoute);
app.use("/api/v1/openings", openingRoute);
app.use("/api/v1/applications", applicationRoute);
app.use("/api/v1/events", eventRouter);
app.use("/api/v1/stats", statsRouter);
app.use("/api/v1/admin", adminRouter);
app.use("/api/v1/ai", aiRouter);
// Crawlers and chat unfurlers only; the host rewrites the public URLs here.
app.use("/preview", previewRouter);

app.use("/api", (req, res) => res.status(404).json({ success: false, message: "Not found." }));
app.use(errorHandler);

export default app;
