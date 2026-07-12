import * as Sentry from "@sentry/nextjs"

Sentry.init({
  dsn:
    process.env.SENTRY_DSN ??
    "https://823c7538ac0e5e4e897b0933bfc0eaf4@o4511411455262720.ingest.us.sentry.io/4511724384354304",

  tracesSampleRate: process.env.NODE_ENV === "development" ? 1.0 : 0.1,

  // Attach local variable values to stack frames
  includeLocalVariables: true,

  enableLogs: true,
})
