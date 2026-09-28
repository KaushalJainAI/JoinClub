// The one logger for the process. JSON lines in production (a log collector reads
// them), colourised single lines in development, silent under the test runner.
import pino from "pino";

const isTest = process.env.NODE_ENV === "test" || process.env.VITEST;
const isProd = process.env.NODE_ENV === "production";

const base = {
  level: process.env.LOG_LEVEL || (isProd ? "info" : "debug"),
  // Never log the auth cookie or an Authorization header.
  redact: {
    paths: ["req.headers.cookie", "req.headers.authorization", "res.headers['set-cookie']", "req.body.password", "req.body.code"],
    censor: "[redacted]",
  },
};

export const logger = isTest
  ? pino({ ...base, level: "silent" })
  : isProd
    ? pino(base)
    : pino({ ...base, transport: { target: "pino-pretty", options: { colorize: true, translateTime: "HH:MM:ss", ignore: "pid,hostname,baseUrl,reqId" } } });

export default logger;
