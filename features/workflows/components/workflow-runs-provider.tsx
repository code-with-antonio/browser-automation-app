"use client"

import { createContext, useContext, useMemo } from "react"
import { useRealtimeRunsWithTag } from "@trigger.dev/react-hooks"

import type { RunStep, runWorkflowTask } from "@/features/workflows/tasks/run-workflow"

type WorkflowRun = ReturnType<
  typeof useRealtimeRunsWithTag<typeof runWorkflowTask>
>["runs"][number]

interface WorkflowRunsContextValue {
  runs: WorkflowRun[]
  error?: Error
}

const WorkflowRunsContext = createContext<WorkflowRunsContextValue | null>(null)

interface WorkflowRunsProviderProps {
  workflowId: string
  // A Public Access Token scoped to read this workflow's runs, minted on the
  // server (auth.createPublicToken) and handed down as a prop.
  accessToken: string
  children: React.ReactNode
}

// One shared realtime subscription to every run tagged workflow:<id>. Any
// component on the canvas reads it through the hooks below instead of opening
// its own socket.
export function WorkflowRunsProvider({
  workflowId,
  accessToken,
  children,
}: WorkflowRunsProviderProps) {
  const { runs, error } = useRealtimeRunsWithTag<typeof runWorkflowTask>(
    `workflow:${workflowId}`,
    { accessToken }
  )

  const value = useMemo<WorkflowRunsContextValue>(
    () => ({ runs, error }),
    [runs, error]
  )

  return (
    <WorkflowRunsContext.Provider value={value}>
      {children}
    </WorkflowRunsContext.Provider>
  )
}

function useWorkflowRuns() {
  const ctx = useContext(WorkflowRunsContext)
  if (!ctx) {
    throw new Error(
      "useWorkflowRuns must be used within a WorkflowRunsProvider"
    )
  }
  return ctx
}

// A run is still producing steps while it's queued or executing.
function isRunLive(run: WorkflowRun): boolean {
  return run.status === "QUEUED" || run.status === "EXECUTING"
}

// The steps of a run, wherever they live. Prefer the run's final output steps
// (guaranteed once it succeeds) and fall back to the live metadata steps the
// task publishes while it runs — a failed or in-flight run only has the latter.
function stepsForRun(run: WorkflowRun): RunStep[] {
  const metadataSteps = run.metadata?.steps as RunStep[] | undefined
  return run.output?.steps ?? metadataSteps ?? []
}

interface LatestRunSteps {
  steps: RunStep[]
  // True while the latest run is queued or executing — i.e. still producing steps.
  isLive: boolean
}

// The steps of the most recent run, plus whether it's still going.
export function useLatestRunSteps(): LatestRunSteps {
  const { runs } = useWorkflowRuns()

  return useMemo<LatestRunSteps>(() => {
    const latest = runs.reduce<WorkflowRun | undefined>((newest, run) => {
      if (!newest || run.createdAt > newest.createdAt) return run
      return newest
    }, undefined)

    if (!latest) return { steps: [], isLive: false }

    return { steps: stepsForRun(latest), isLive: isRunLive(latest) }
  }, [runs])
}

// The Browserbase session id a finished run drove, read from its final output so
// a panel can fetch the replay. Only the output carries it — the recording lags
// the session close, so the live metadata never has it — so an in-flight or
// failed run reports undefined.
function sessionIdForRun(run: WorkflowRun): string | undefined {
  return run.output?.browserbaseSessionId
}

// One run flattened for the console: its identity and status, whether it's still
// live, and its steps with everything each one produced.
export interface ConsoleRun {
  id: string
  status: WorkflowRun["status"]
  createdAt: Date
  isLive: boolean
  steps: RunStep[]
  // The Browserbase session id to replay, present only once the run has finished.
  browserbaseSessionId?: string
}

// Every run, newest first, with its steps resolved — the full history a console
// panel below the canvas renders as a list of runs to drill into.
export function useConsoleRuns(): ConsoleRun[] {
  const { runs } = useWorkflowRuns()

  return useMemo<ConsoleRun[]>(
    () =>
      [...runs]
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
        .map((run) => ({
          id: run.id,
          status: run.status,
          createdAt: run.createdAt,
          isLive: isRunLive(run),
          steps: stepsForRun(run),
          browserbaseSessionId: sessionIdForRun(run),
        })),
    [runs]
  )
}
