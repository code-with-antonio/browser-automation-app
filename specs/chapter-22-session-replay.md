# Session Replay — prompts

Chapter 21 built the console but left out replay. Now we add it: every run drives one
Browserbase browser session, and this lets you watch that session back inside the
console. Three prompts, run one at a time.

## Setup

The recording comes from the core Browserbase SDK and its observability docs. Paste this
pointer into your `AGENTS.md` so the agent knows where to look — the prompts then don't
carry the URL:

```markdown
## Browserbase observability

Session recordings, replays, live view, and logs come from the core Browserbase SDK
(`@browserbasehq/sdk`) — not Stagehand. Before building any observability feature, consult
Browserbase's observability docs:
https://docs.browserbase.com/platform/browser/observability

Session replay specifically — retrieving a session's recording as an HLS playlist — is
documented here:
https://docs.browserbase.com/platform/browser/observability/session-replay
The retrieval needs the secret API key, so it must be proxied server-side.
```

Then, before Prompt 2, install the HLS player:

```
npm install hls.js
```

---

## Prompt 1 — capture the session id

```
A run records its steps, but not the browser session it drove — so there's no way
to replay what happened yet.

In @features/workflows/tasks/run-workflow.ts, capture the Browserbase session id
when the run opens its session, and return it alongside the steps.

Then surface that session id on each run in
@features/workflows/components/workflow-runs-provider.tsx so a panel can read it.
It only exists once the run has finished — the recording lags the session close —
so read it from the run's final output, not the live metadata.
```

---

## Prompt 2 — play a recording from a session id

```
Given a Browserbase session id, play back that session's recording.

Browserbase serves the recording as an HLS playlist, and fetching it needs the
secret API key — so it has to be proxied server-side. Add a route at
app/api/replays/[sessionId] that retrieves the session's replay playlist through
the Browserbase SDK and returns it, available only to the signed-in org. Our
AGENTS.md points to the Browserbase docs for that retrieval API.

The recording isn't ready the instant the session closes — Browserbase answers
with a not-ready status until it is. Have the route pass that through, and build a
SessionReplay component in the workflows components folder that polls the route
until the playlist is ready, then plays it with hls.js.

Don't wire it into the console yet — just get playback working from a session id.
```

---

## Prompt 3 — the Replay row

```
Each finished run has a recording now — surface it in the console.

In @features/workflows/components/logs-panel.tsx, add a single "Replay" row under
each run that has a recording: its session id is present and the run has finished.
It sits with the step rows and is selectable the same way, but it stands for the
whole run, not one step.

Selecting it should play that run's recording in the output pane: in
@features/workflows/components/inspector-panel.tsx, render the SessionReplay for
the run's session id instead of a step's output when the replay row is selected.

The console currently tracks the selection as a run id plus node id
(@features/workflows/components/console-panel.tsx). Extend it so a selection can be
either a step or a run's replay, with only one active at a time.
```
