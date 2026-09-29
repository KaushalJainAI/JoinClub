import * as Sentry from "@sentry/react";

// Error monitoring, off unless configured: nothing leaves the machine until
// VITE_SENTRY_DSN is set. Mirrors backend/utils/sentry.js — the browser SDK never
// sees cookies or auth headers, and PII sending stays off.
let started = false;

export function initSentry() {
  const dsn = import.meta.env.VITE_SENTRY_DSN;
  if (!dsn || started) return;
  started = true;
  Sentry.init({
    dsn,
    environment: import.meta.env.MODE,
    sendDefaultPii: false,
    tracesSampleRate: 0,
    beforeSend(event) {
      // Belt and braces: drop request bodies if an integration ever attaches them.
      if (event.request?.data) delete event.request.data;
      return event;
    },
  });
}

export function captureUiError(error, context) {
  try {
    if (started) Sentry.captureException(error, { extra: context });
  } catch {
    // Reporting must never break the page it reports on.
  }
}
