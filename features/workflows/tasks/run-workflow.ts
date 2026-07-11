import toposort from "toposort"
import { logger, metadata, task } from "@trigger.dev/sdk"
import type { DeserializedJson } from "@trigger.dev/core"
import { Stagehand } from "@browserbasehq/stagehand"
import { nodeExecutors } from "@/features/workflows/nodes/node-executors"
import {
  interpolate,
  type NodeOutputs,
} from "@/features/workflows/lib/interpolate"
import { getWorkflow } from "@/features/workflows/data"
import type { NodeType } from "@/features/workflows/nodes/node-registry"

// One entry per node the run will walk, published to the run's metadata under
// "steps" so the canvas — and the run console below it — can watch each node
// move through its lifecycle live and inspect what it produced.
export type RunStep = {
  nodeId: string
  // The node's registry type (for its icon/accent) and title, denormalized so
  // the console can render a step without re-reading the graph.
  type: NodeType
  title: string
  status: "pending" | "running" | "done" | "failed"
  // Wall-clock time the executor took, set once the step leaves "running".
  durationMs?: number
  // Whatever the executor returned, kept for the console's per-step detail view.
  output?: unknown
  // The thrown error's message, set only when status is "failed".
  error?: string
}

// The Trigger.dev task the Run button fires. It loads the saved graph, works out
// what order the nodes should run in, and walks them. For now each node just
// announces itself — real execution (per-node executors, live progress, browser
// sessions) gets layered on from here.
export const runWorkflowTask = task({
  id: "run-workflow",
  run: async ({ workflowId, orgId }: { workflowId: string; orgId: string }) => {
    const workflow = await getWorkflow(orgId, workflowId)
    if (!workflow?.graph) throw new Error(`Workflow ${workflowId} has no graph`)

    const { nodes, edges } = workflow.graph
    const byId = new Map(nodes.map((n) => [n.id, n]))

    // Run only connected nodes — anything touching an edge. Orphans dropped on
    // the canvas are skipped. toposort orders them and throws on a cycle.
    const connected = new Set(edges.flatMap((e) => [e.source, e.target]))
    const order = toposort
      .array(
        nodes.map((n) => n.id),
        edges.map((e) => [e.source, e.target])
      )
      .filter((id) => connected.has(id))

    logger.log(`Running workflow ${workflow.name}`, { steps: order.length })

    // Seed every step as "pending" up front and publish, so the canvas can render
    // the full run as a list of spinners before any node starts. type and title
    // are denormalized from the graph so the console can label each step without
    // it. We mutate these entries in place and re-publish on every status change.
    const steps: RunStep[] = order.map((nodeId) => {
      const node = byId.get(nodeId)!
      return {
        nodeId,
        type: node.data.type,
        title: node.data.title,
        status: "pending",
      }
    })

    // steps carries an arbitrary `output`, which is wider than trigger's
    // DeserializedJson metadata type; the values are JSON at runtime, so cast at
    // this one boundary rather than constraining the shape the console reads.
    const publishSteps = () =>
      metadata.set("steps", steps as unknown as DeserializedJson[])

    publishSteps()

    // The run owns one Browserbase session, opened lazily on the first browser step
    // and reused by every later one, so the recording spans the whole flow. The
    // LLM routes through Browserbase's Model Gateway (BROWSERBASE_API_KEY), so no
    // separate provider key is needed.
    let stagehand: Stagehand | undefined
    // The Browserbase session id, captured the moment the session opens so it can
    // be returned in the run's output — a panel reads it there to fetch the replay
    // once the run finishes and the recording is available.
    let browserbaseSessionId: string | undefined
    const getStagehand = async () => {
      if (stagehand) return stagehand
      stagehand = new Stagehand({
        env: "BROWSERBASE",
        apiKey: process.env.BROWSERBASE_API_KEY!,
        model: "google/gemini-2.5-flash",
        // Pino's logging backend spawns a thread-stream worker (lib/worker.js)
        // that can't be resolved inside trigger.dev's bundled output. Disable it —
        // the option exists for exactly these minimal/bundled environments.
        disablePino: true,
      })
      await stagehand.init()
      browserbaseSessionId = stagehand.browserbaseSessionID
      return stagehand
    }

    // Each node's result, keyed by its id, so later nodes can pull from it.
    // Because we walk in dependency order, every id a node references is already
    // populated by the time we run it.
    const outputs: NodeOutputs = {}

    for (let i = 0; i < order.length; i++) {
      const id = order[i]
      const step = steps[i]
      const node = byId.get(id)!
      logger.log(`Running step: ${node.data.title}`)

      // A node with no executor (the start trigger) does no work and produces no
      // output — mark it done rather than leaving it "pending", which reads as
      // skipped forever in the console.
      const executor = nodeExecutors[node.data.type]
      if (!executor) {
        step.status = "done"
        publishSteps()
        continue
      }

      // Mark running before the executor and flush immediately: the "done" set
      // below happens before the SDK's next background flush, so without forcing
      // it here the "running" state is overwritten and the canvas never spins.
      step.status = "running"
      publishSteps()
      await metadata.flush()

      // Swap {{ nodeId.path }} placeholders for upstream output before running.
      const values = Object.fromEntries(
        Object.entries(node.data.values).map(([key, text]) => [
          key,
          interpolate({ text, outputs }),
        ])
      )

      // Time the executor so the console can show how long the step took, on
      // both the success and failure paths.
      const startedAt = Date.now()
      try {
        const output = await executor({ values, getStagehand })
        outputs[id] = output
        step.output = output
      } catch (error) {
        // Flush the "failed" state before the throw unwinds the run: a thrown run
        // returns no output, so this flushed metadata is the only way the canvas
        // ever learns which node failed — and the only place its error survives.
        step.status = "failed"
        step.durationMs = Date.now() - startedAt
        step.error = error instanceof Error ? error.message : String(error)
        publishSteps()
        await metadata.flush()
        await stagehand?.close()
        throw error
      }

      step.status = "done"
      step.durationMs = Date.now() - startedAt
      publishSteps()
    }

    await stagehand?.close()

    return { steps, browserbaseSessionId }
  },
})
