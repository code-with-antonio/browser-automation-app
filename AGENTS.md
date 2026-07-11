<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## Browserbase observability

Session recordings, replays, live view, and logs come from the core Browserbase SDK
(`@browserbasehq/sdk`) — not Stagehand. Before building any observability feature, consult
Browserbase's observability docs:
https://docs.browserbase.com/platform/browser/observability

Session replay specifically — retrieving a session's recording as an HLS playlist — is
documented here:
https://docs.browserbase.com/platform/browser/observability/session-replay
The retrieval needs the secret API key, so it must be proxied server-side.

# Adding a workflow node

Three edits, all under `features/workflows/nodes/`:

1. the impl file (e.g. `open-url.ts`) — the node's executor logic,
2. register it in `node-executors.ts` — the `satisfies` contract makes a missing
   executor a compile error for action nodes,
3. add its manifest entry in `node-registry.ts` — kind, label, icon, accent, its
   input `fields`, and the `outputs` downstream nodes can reference.

The run task and the canvas step node are registry-driven — never touch them to add
a node.

# ReactFlow — don't trust training data

This project uses ReactFlow (React Flow / `@xyflow/react`) for the canvas. Its
APIs, components, hooks, and props change across versions and may differ from
your training data. Before writing or changing any ReactFlow code, fetch and
consult the official LLM docs index at https://reactflow.dev/llms.txt and follow
the linked pages relevant to what you're building. Do not rely on memory for
component names, props, hook signatures, or usage patterns.

# JSX text escaping

Escape apostrophes and quotes in JSX text content — raw `'` and `"` trip the
`react/no-unescaped-entities` lint rule. Use `&apos;` for apostrophes and
`&quot;` for quotes (e.g. `you&apos;re`, `doesn&apos;t`). This applies only to
literal text between JSX tags, not to string attribute values or JS strings.

# Database types

Derive database types from the Drizzle schema — never hand-write custom or partial
shapes for table rows. Export `typeof table.$inferSelect` (and `$inferInsert` when
needed) from `lib/schema.ts` and import it. When a consumer needs only some
columns, narrow with `Pick<Row, ...>` / `Omit<Row, ...>` rather than redeclaring a
literal type. Don't add an insert type where `db.insert(...).values()` already
enforces the shape.

<!-- TRIGGER.DEV SKILLS START -->

## Trigger.dev agent skills

This project has Trigger.dev agent skills installed in `.agents/skills/`. Before writing or changing Trigger.dev code (background tasks, scheduled tasks, realtime, or chat.agent AI agents), load the most relevant skill: `trigger-authoring-chat-agent`, `trigger-authoring-tasks`, `trigger-chat-agent-advanced`, `trigger-cost-savings`, `trigger-getting-started`, `trigger-realtime-and-frontend`.
<!-- TRIGGER.DEV SKILLS END -->

# Stagehand Project

This is a project that uses Stagehand V3, a browser automation framework with AI-powered `act`, `extract`, `observe`, and `agent` methods.

The main class can be imported as `Stagehand` from `@browserbasehq/stagehand`.

**Key Classes:**

- `Stagehand`: Main orchestrator class providing `act`, `extract`, `observe`, and `agent` methods
- `context`: A `V3Context` object that manages browser contexts and pages
- `page`: Individual page objects accessed via `stagehand.context.pages()[i]` or created with `stagehand.context.newPage()`

## Initialize

```typescript
import { Stagehand } from "@browserbasehq/stagehand";

const stagehand = new Stagehand({
  env: "LOCAL", // or "BROWSERBASE"
  verbose: 2, // 0, 1, or 2
  model: "openai/gpt-4.1-mini", // or any supported model
});

await stagehand.init();

// Access the browser context and pages
const page = stagehand.context.pages()[0];
const context = stagehand.context;

// Create new pages if needed
const page2 = await stagehand.context.newPage();
```

## Act

Actions are called on the `stagehand` instance (not the page). Use atomic, specific instructions:

```typescript
// Act on the current active page
await stagehand.act("click the sign in button");

// Act on a specific page (when you need to target a page that isn't currently active)
await stagehand.act("click the sign in button", { page: page2 });
```

**Important:** Act instructions should be atomic and specific:

- ✅ Good: "Click the sign in button" or "Type 'hello' into the search input"
- ❌ Bad: "Order me pizza" or "Type in the search bar and hit enter" (multi-step)

### Observe + Act Pattern (Recommended)

Cache the results of `observe` to avoid unexpected DOM changes:

```typescript
const instruction = "Click the sign in button";

// Get candidate actions
const actions = await stagehand.observe(instruction);

// Execute the first action
await stagehand.act(actions[0]);
```

To target a specific page:

```typescript
const actions = await stagehand.observe("select blue as the favorite color", {
  page: page2,
});
await stagehand.act(actions[0], { page: page2 });
```

## Extract

Extract data from pages using natural language instructions. The `extract` method is called on the `stagehand` instance.

### Basic Extraction (with schema)

```typescript
import { z } from "zod";

// Extract with explicit schema
const data = await stagehand.extract(
  "extract all apartment listings with prices and addresses",
  z.object({
    listings: z.array(
      z.object({
        price: z.string(),
        address: z.string(),
      }),
    ),
  }),
);

console.log(data.listings);
```

### Simple Extraction (without schema)

```typescript
// Extract returns a default object with 'extraction' field
const result = await stagehand.extract("extract the sign in button text");

console.log(result);
// Output: { extraction: "Sign in" }

// Or destructure directly
const { extraction } = await stagehand.extract(
  "extract the sign in button text",
);
console.log(extraction); // "Sign in"
```

### Targeted Extraction

Extract data from a specific element using a selector:

```typescript
const reason = await stagehand.extract(
  "extract the reason why script injection fails",
  z.string(),
  { selector: "/html/body/div[2]/div[3]/iframe/html/body/p[2]" },
);
```

### URL Extraction

When extracting links or URLs, use `z.string().url()`:

```typescript
const { links } = await stagehand.extract(
  "extract all navigation links",
  z.object({
    links: z.array(z.string().url()),
  }),
);
```

### Extracting from a Specific Page

```typescript
// Extract from a specific page (when you need to target a page that isn't currently active)
const data = await stagehand.extract(
  "extract the placeholder text on the name field",
  { page: page2 },
);
```

## Observe

Plan actions before executing them. Returns an array of candidate actions:

```typescript
// Get candidate actions on the current active page
const [action] = await stagehand.observe("Click the sign in button");

// Execute the action
await stagehand.act(action);
```

Observing on a specific page:

```typescript
// Target a specific page (when you need to target a page that isn't currently active)
const actions = await stagehand.observe("find the next page button", {
  page: page2,
});
await stagehand.act(actions[0], { page: page2 });
```

## Agent

Use the `agent` method to autonomously execute complex, multi-step tasks.

### Basic Agent Usage

```typescript
const page = stagehand.context.pages()[0];
await page.goto("https://www.google.com");

const agent = stagehand.agent({
  model: "google/gemini-2.0-flash",
  executionModel: "google/gemini-2.0-flash",
});

const result = await agent.execute({
  instruction: "Search for the stock price of NVDA",
  maxSteps: 20,
});

console.log(result.message);
```

### Computer Use Agent (CUA)

For more advanced scenarios using computer-use models:

```typescript
const agent = stagehand.agent({
  mode: "cua", // Enable Computer Use Agent mode
  model: "anthropic/claude-sonnet-4-6",
  // or "google/gemini-2.5-computer-use-preview-10-2025"
  systemPrompt: `You are a helpful assistant that can use a web browser.
    Do not ask follow up questions, the user will trust your judgement.`,
});

await agent.execute({
  instruction: "Apply for a library card at the San Francisco Public Library",
  maxSteps: 30,
});
```

### Agent with Custom Model Configuration

```typescript
const agent = stagehand.agent({
  mode: "cua",
  model: {
    modelName: "google/gemini-2.5-computer-use-preview-10-2025",
    apiKey: process.env.GEMINI_API_KEY,
  },
  systemPrompt: `You are a helpful assistant.`,
});
```

### Agent with Integrations (MCP/External Tools)

```typescript
const agent = stagehand.agent({
  integrations: [`https://mcp.exa.ai/mcp?exaApiKey=${process.env.EXA_API_KEY}`],
  systemPrompt: `You have access to the Exa search tool.`,
});
```

## Advanced Features

### DeepLocator (XPath Targeting)

Target specific elements across shadow DOM and iframes:

```typescript
await page
  .deepLocator("/html/body/div[2]/div[3]/iframe/html/body/p")
  .highlight({
    durationMs: 5000,
    contentColor: { r: 255, g: 0, b: 0 },
  });
```

### Multi-Page Workflows

```typescript
const page1 = stagehand.context.pages()[0];
await page1.goto("https://example.com");

const page2 = await stagehand.context.newPage();
await page2.goto("https://example2.com");

// Act/extract/observe operate on the current active page by default
// Pass { page } option to target a specific page
await stagehand.act("click button", { page: page1 });
await stagehand.extract("get title", { page: page2 });
```
