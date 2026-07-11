import Browserbase from "@browserbasehq/sdk"

// Server-only Browserbase client for observability calls (session replays, logs).
// It carries the secret API key, so it must never be imported into client code.
export const browserbase = new Browserbase({
  apiKey: process.env.BROWSERBASE_API_KEY!,
})
