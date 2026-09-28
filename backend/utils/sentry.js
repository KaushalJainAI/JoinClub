// Error monitoring. Inert until SENTRY_DSN is set, so local work and the test suite are
// unaffected and no event can leave the machine without someone choosing that.
//
// Cookies, the Authorization header, request bodies and reset codes are stripped before an
// event is sent: they carry auth tokens, passwords and OTPs.
import { logger } from "./logger.js";
const enabled = () => Boolean(process.env.SENTRY_DSN);

let sentry = null;

export async function initSentry() {
  if (!enabled()) return null;
  try {
    const Sentry = await import("@sentry/node");
    Sentry.init({
      dsn: process.env.SENTRY_DSN,
      environment: process.env.NODE_ENV || "development",
      tracesSampleRate: 0,
      // No cookies, no auth header, no request bodies.
      sendDefaultPii: false,
      beforeSend(event) {
        if (event.request) {
          delete event.request.cookies;
          delete event.request.data;
          if (event.request.headers) {
            delete event.request.headers.cookie;
            delete event.request.headers.authorization;
          }
        }
        return event;
      },
    });
    sentry = Sentry;
    logger.info("Sentry error monitoring enabled.");
    return Sentry;
  } catch (err) {
    logger.error(`Sentry is enabled by SENTRY_DSN but could not start: ${err.message}`);
    return null;
  }
}

/** Reports an error that a request handled, e.g. a 500. */
export function captureException(err, context = {}) {
  if (!sentry) return;
  sentry.captureException(err, { extra: context });
}
