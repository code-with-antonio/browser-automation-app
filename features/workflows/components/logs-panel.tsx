"use client"

import prettyMilliseconds from "pretty-ms"
import { MonitorPlay } from "lucide-react"

import { cn } from "@/lib/utils"

import { NodeIcon } from "@/features/workflows/components/node-icon"
import {
  useConsoleRuns,
  type ConsoleRun,
} from "@/features/workflows/components/workflow-runs-provider"
import type { RunStep } from "@/features/workflows/tasks/run-workflow"

// A step is identified across the whole console by which run it belongs to and
// which node it is — the same node id recurs across runs, so both are needed.
export interface StepSelection {
  kind: "step"
  runId: string
  nodeId: string
}

// The replay of a whole run, not a single step — identified by its run alone.
export interface ReplaySelection {
  kind: "replay"
  runId: string
}

// What the console can have selected: one step's output, or one run's replay.
// Only one is active at a time.
export type ConsoleSelection = StepSelection | ReplaySelection

// One step row: the node's icon, its title, and how long it took. It spins while
// running, reads red when it failed, and dims when it never ran. Clicking it
// toggles selection via the ConsolePanel above.
function StepRow({
  run,
  step,
  isSelected,
  onSelect,
}: {
  run: ConsoleRun
  step: RunStep
  isSelected: boolean
  onSelect: (selection: StepSelection) => void
}) {
  // Only spin while the run is actually live — a step left "running" by a run
  // that has since ended should stop rather than hang forever.
  const isRunning = step.status === "running" && run.isLive
  const isFailed = step.status === "failed"
  const isInactive = step.status === "pending"

  return (
    <button
      type="button"
      onClick={() => onSelect({ kind: "step", runId: run.id, nodeId: step.nodeId })}
      className={cn(
        "flex w-full items-center gap-2 rounded-md px-2 py-1 text-left text-xs hover:bg-accent",
        isSelected && "bg-accent",
        isInactive && "opacity-50"
      )}
    >
      <NodeIcon type={step.type} running={isRunning} />
      <span className={cn("truncate font-medium", isFailed && "text-destructive")}>
        {step.title}
      </span>
      {step.durationMs != null && (
        <span className="ml-auto shrink-0 tabular-nums text-muted-foreground">
          {prettyMilliseconds(step.durationMs)}
        </span>
      )}
    </button>
  )
}

// The replay row for a finished run: it sits with the step rows and selects the
// same way, but it stands for the whole run's recording rather than one step.
function ReplayRow({
  run,
  isSelected,
  onSelect,
}: {
  run: ConsoleRun
  isSelected: boolean
  onSelect: (selection: ReplaySelection) => void
}) {
  return (
    <button
      type="button"
      onClick={() => onSelect({ kind: "replay", runId: run.id })}
      className={cn(
        "flex w-full items-center gap-2 rounded-md px-2 py-1 text-left text-xs hover:bg-accent",
        isSelected && "bg-accent"
      )}
    >
      <span className="flex size-6 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
        <MonitorPlay className="size-3.5" />
      </span>
      <span className="truncate font-medium">Replay</span>
    </button>
  )
}

// The list of runs, newest first, each with its steps below it. Reads the shared
// realtime run history and reports step clicks up to the ConsolePanel, which owns
// the selection.
export function LogsPanel({
  selected,
  onSelect,
}: {
  selected: ConsoleSelection | null
  onSelect: (selection: ConsoleSelection) => void
}) {
  const runs = useConsoleRuns()

  if (runs.length === 0) {
    return (
      <div className="flex size-full items-center justify-center text-sm text-muted-foreground">
        No runs yet
      </div>
    )
  }

  return (
    <div className="flex size-full flex-col gap-3 overflow-y-auto p-2">
      {runs.map((run) => (
        <div key={run.id} className="flex flex-col gap-0.5">
          <div className="flex items-center gap-2 px-2 py-1 text-xs font-medium text-muted-foreground">
            <span>{run.createdAt.toLocaleTimeString()}</span>
            <span className="lowercase">{run.status}</span>
          </div>
          {run.steps.map((step) => (
            <StepRow
              key={step.nodeId}
              run={run}
              step={step}
              isSelected={
                selected?.kind === "step" &&
                selected.runId === run.id &&
                selected.nodeId === step.nodeId
              }
              onSelect={onSelect}
            />
          ))}
          {/* A recording only exists once the run has finished — its session id
              is present and it's no longer live. */}
          {run.browserbaseSessionId && !run.isLive && (
            <ReplayRow
              run={run}
              isSelected={
                selected?.kind === "replay" && selected.runId === run.id
              }
              onSelect={onSelect}
            />
          )}
        </div>
      ))}
    </div>
  )
}
