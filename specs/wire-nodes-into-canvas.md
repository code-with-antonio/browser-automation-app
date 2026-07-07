# Wire the custom node into the Canvas

The registry (features/workflows/nodes/node-registry.ts) and the StepNode
component (features/workflows/components/step-node.tsx) already exist.

Make the Canvas render real registry-driven step nodes instead of the default placeholder nodes, keeping the existing useNodesState and useEdgesState.

Register StepNode as the step node type. Define the node types map at module scope
so its reference stays stable across renders, which React Flow requires.

Seed the canvas with a single start node, written as a plain object with a fixed id
so it renders identically every time. Give it type "step", a position, and its
data: type "start", kind "trigger", title "Start", and empty values. Every workflow
needs its entry node; more nodes get added from the toolbar later.

Clear the initial edges, since the old edge referenced the placeholder nodes that
are now gone.
