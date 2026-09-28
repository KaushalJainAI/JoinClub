import "dotenv/config";
import connectDB from "./utils/db.js";

if (!process.env.SECRET_KEY) {
  console.error("SECRET_KEY is not set. Copy .env.example to .env and fill it in.");
  process.exit(1);
}

// Imported after dotenv so modules that read env at load time see it.
const { default: app } = await import("./app.js");
const { logger } = await import("./utils/logger.js");
const { initSentry } = await import("./utils/sentry.js");
const PORT = process.env.PORT || 8000;

await initSentry();

// A rejection nobody awaited is a bug, not a crash: log it and keep serving.
process.on("unhandledRejection", (reason) => logger.error({ err: reason }, "unhandled promise rejection"));
process.on("uncaughtException", (err) => {
  logger.fatal({ err }, "uncaught exception");
  process.exit(1);
});

connectDB()
  .then(() => {
    app.listen(PORT, () => logger.info(`JoinClub API on http://localhost:${PORT}`));
  })
  .catch((error) => {
    logger.fatal({ err: error }, "MongoDB connection failed");
    process.exit(1);
  });
