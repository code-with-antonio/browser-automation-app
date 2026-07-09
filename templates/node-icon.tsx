import { nodeRegistry, type NodeType } from "@/features/workflows/nodes/node-registry"
import { cn } from "@/lib/utils"

// The accent-colored icon chip for a node type, resolved from the registry.
// Shared by the canvas node, the toolbar palette, and the editor header — pass a
// `className` to override the size per usage.
export function NodeIcon({
  type,
  className,
}: {
  type: NodeType
  className?: string
}) {
  const def = nodeRegistry[type]
  const Icon = def.icon
  return (
    <span
      className={cn(
        "flex size-6 shrink-0 items-center justify-center rounded-md",
        def.accent,
        className
      )}
    >
      <Icon className="size-3.5" />
    </span>
  )
}
