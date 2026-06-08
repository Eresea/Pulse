import { Pressable, Text, View } from "react-native";
import { GitBranch, ListChecks } from "lucide-react-native";
import { buildAgentGraph } from "@/services/agents-mapper";
import type { AgentGraphNode, AgentSummary } from "@/services/types";
import { cn } from "@/lib/cn";
import { useTheme } from "@/theme/theme";
import { StatusBadge, statusColor } from "@/components/agents/agent-command-ui";

export function AgentVisualBlackboard({
  agents,
  onOpenAgent
}: {
  agents: AgentSummary[];
  onOpenAgent: (agentId: string) => void;
}) {
  const { colors } = useTheme();
  const graph = buildAgentGraph(agents);
  const hasRelations = graph.edges.length > 0;
  const lanes = groupNodesByDepth(graph.nodes);

  return (
    <View className="gap-3 rounded-lg border border-border bg-card p-4 dark:border-neutral-800 dark:bg-black">
      <View className="flex-row items-start justify-between gap-3">
        <View className="min-w-0 flex-1">
          <Text className="text-base font-semibold text-foreground dark:text-slate-100">Visual blackboard</Text>
          <Text className="text-sm text-muted-foreground dark:text-slate-400">
            Nexus agents, child work, and task relationships.
          </Text>
        </View>
        <View className="size-10 items-center justify-center rounded-full bg-muted dark:bg-slate-800">
          <GitBranch color={colors.icon} size={18} />
        </View>
      </View>

      {graph.nodes.length ? (
        <View className="gap-3">
          {lanes.map((lane, index) => (
            <View key={index} className="gap-2">
              <Text className="text-xs font-semibold uppercase text-muted-foreground dark:text-slate-400">{index === 0 ? "Roots" : `Level ${index}`}</Text>
              <View className="flex-row flex-wrap gap-2">
                {lane.map((node) => (
                  <GraphNodeCard key={node.id} node={node} onOpenAgent={onOpenAgent} />
                ))}
              </View>
            </View>
          ))}
          {hasRelations ? (
            <View className="gap-1 border-t border-border pt-3 dark:border-neutral-800">
              {graph.edges.slice(0, 6).map((edge) => {
                const from = graph.nodes.find((node) => node.id === edge.fromId);
                const to = graph.nodes.find((node) => node.id === edge.toId);
                return (
                  <Text key={edge.id} className="text-xs text-muted-foreground dark:text-slate-400" numberOfLines={1}>
                    {from?.title ?? edge.fromId} {"->"} {to?.title ?? edge.toId} · {edge.type}
                  </Text>
                );
              })}
            </View>
          ) : (
            <Text className="text-sm text-muted-foreground dark:text-slate-400">
              No Nexus relation hints are loaded yet. Agents still appear as independent roots.
            </Text>
          )}
        </View>
      ) : (
        <View className="items-center gap-2 rounded-md border border-dashed border-border bg-background p-5 dark:border-neutral-800 dark:bg-black">
          <ListChecks color={colors.muted} size={23} />
          <Text className="text-sm font-medium text-foreground dark:text-slate-100">No agents on the board</Text>
          <Text className="text-center text-sm text-muted-foreground dark:text-slate-400">Spawn or load Nexus agents to see their working graph.</Text>
        </View>
      )}
    </View>
  );
}

function GraphNodeCard({
  node,
  onOpenAgent
}: {
  node: AgentGraphNode;
  onOpenAgent: (agentId: string) => void;
}) {
  const isAgent = node.type === "agent";
  const content = (
    <View
      className={cn(
        "min-h-24 w-[47%] min-w-[150px] flex-1 justify-between gap-2 rounded-md border bg-background p-3 dark:bg-black",
        isAgent ? "border-border dark:border-neutral-800" : "border-dashed border-teal-200 dark:border-teal-900"
      )}
    >
      <View className="gap-1">
        <View className="flex-row items-center gap-2">
          <View className="size-2 rounded-full" style={{ backgroundColor: statusColor(node.status ?? "idle") }} />
          <Text className="min-w-0 flex-1 text-sm font-semibold text-foreground dark:text-slate-100" numberOfLines={2}>{node.title}</Text>
        </View>
        <Text className="text-xs uppercase text-muted-foreground dark:text-slate-500">{node.type}</Text>
      </View>
      {node.status ? <StatusBadge status={node.status} /> : null}
    </View>
  );

  if (!isAgent || !node.agentId) {
    return content;
  }

  return (
    <Pressable accessibilityRole="button" accessibilityLabel={`Open ${node.title}`} className="min-w-[150px] flex-1" onPress={() => onOpenAgent(node.agentId!)}>
      {content}
    </Pressable>
  );
}

function groupNodesByDepth(nodes: AgentGraphNode[]) {
  const maxDepth = nodes.reduce((max, node) => Math.max(max, node.depth), 0);
  return Array.from({ length: maxDepth + 1 }, (_, depth) => nodes.filter((node) => node.depth === depth));
}
