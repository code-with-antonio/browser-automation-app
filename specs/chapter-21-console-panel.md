# Console Panel — prompts

The canvas already lights up nodes live (running / failed). Now we add the bottom
**console**: a logs list of every run's steps, and an output inspector for whichever
step you click. Three prompts, run one at a time.

First, install the duration formatter:

```
npm install pretty-ms
```

---

## Prompt 1 — get the run data in place

```
I want a console under the canvas that shows what each run did — a list of every
run and its steps, and clicking a step shows what that step produced, or its
error if it failed, plus how long it took.

Right now a run step only records its node id and status in
@features/workflows/tasks/run-workflow.ts, so there's nothing to show yet.

Make each step track everything the console will show: which node it is (for its
icon and title), its status as it moves from pending to running to done or failed,
how long it took, whatever it output, and its error if it threw.

Then expose that run data from
@features/workflows/components/workflow-runs-provider.tsx so a panel can read every
run and its steps.

Don't build the UI yet — just get the data in place.
```

---

## Prompt 2 — the logs list

```
Build a console panel below the canvas that lists workflow runs: every run and,
below it, its steps.

Each step shows its node's icon, its title, and how long it took (format the
duration with pretty-ms). A step spins while it's running, turns red if it failed,
and looks inactive if it never ran. Clicking a step selects it, clicking again
deselects.

The accent-colored node icon already exists as NodeIcon in
@features/workflows/components/right-sidebar.tsx — reuse it instead of building
another.

Build the runs list as a LogsPanel and wrap it in a ConsolePanel that owns the
selection, both new components in the workflows feature's components folder.

Then mount the ConsolePanel in
@features/workflows/components/workflow-shell.tsx, where it currently shows a "Logs"
placeholder.
```

---

## Prompt 3 — the output inspector

```
The workflow console below the canvas
(@features/workflows/components/console-panel.tsx) lists each run's steps and lets
you select one.

Add an output view showing the selected step's result: its output as formatted
JSON, its error if it failed, or a short note when there's nothing.

Build it as an InspectorPanel in the workflows feature's components folder,
rendered inside the ConsolePanel next to the logs and only while a step is
selected.
```

---

## Fixes — polishing what the agent got wrong

These aren't part of the build. They're the three things that needed fixing after I
ran the prompts above on camera, plus the one-line prompt that fixed each. The agent
doesn't reproduce its output byte-for-byte, so you may not hit the same three — treat
these as examples of correcting an agent by describing the symptom, not required steps.

### Fix 1 — the start node shows as skipped

The trigger node has no executor, so the run loop skipped it while it was still
"pending": it looked skipped in the logs and its inspector said it hadn't run.

```
In @features/workflows/tasks/run-workflow.ts, a node with no executor (the start
trigger) hits `if (!executor) continue` while still "pending", so it shows as
skipped forever and its inspector says it hasn't run. Instead of skipping it, mark
that step "done" and publish before continuing — the trigger does no work and has
no output, so it should read as completed.
```

### Fix 2 — spinner inside the accent chip

A running step showed a bare spinner that lost the node's color, and NodeIcon lived
inside the sidebar, so the panels had to import it from there.

```
Extract NodeIcon out of @features/workflows/components/right-sidebar.tsx into its
own file in the workflows components folder, and update right-sidebar,
@features/workflows/components/logs-panel.tsx, and
@features/workflows/components/inspector-panel.tsx to import it from there.

Add a `running` prop to NodeIcon that shows a spinner inside the accent chip in
place of the icon, and use it in the logs list so a running step spins inside its
colored chip instead of as a bare spinner.
```

### Fix 3 — a resizable logs/output split

The logs and the output view sat in a fixed 50/50 split; this makes the divider
draggable.

```
In @features/workflows/components/console-panel.tsx, replace the plain flex split
between the logs and the inspector with a horizontal resizable panel group and a
drag handle from @components/ui/resizable.tsx. Keep the inspector rendered only
while a step is selected.
```
