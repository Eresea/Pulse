import { BellRing, Inbox, ShieldAlert, Workflow } from "lucide-react-native";
import { router } from "expo-router";
import type { Href } from "expo-router";
import { useState } from "react";
import { Pressable, Text, View } from "react-native";
import { AgentCompactRow, ApprovalCard, TimelineRow } from "@/components/agents/agent-command-ui";
import { PageHeader } from "@/components/drawer-shell";
import { Screen, ScreenScrollView } from "@/components/screen";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { AgentApprovalRequest } from "@/services/types";
import { useTheme } from "@/theme/theme";
import { useAppState } from "@/state/app-state";

const placeholderEvents = [
  { id: "chat", title: "Chat messages", source: "/ws/v1/user", state: "ready" },
  { id: "bellum", title: "Bellum session updates", source: "/ws/v1/user", state: "stub" },
  { id: "push", title: "Background notifications", source: "FCM", state: "pending config" }
];

export default function InboxScreen() {
  const { colors } = useTheme();
  const { agents, actions } = useAppState();
  const [respondingApprovalId, setRespondingApprovalId] = useState<string | undefined>();
  const attentionAgents = agents.items.filter((agent) => agent.needsAttention || agent.status === "waiting_input" || agent.status === "blocked" || agent.status === "failed");
  const recentAgentEvents = Object.values(agents.detailsById)
    .flatMap((detail) => detail.timeline.slice(0, 3))
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 8);

  const respondToApproval = async (approval: AgentApprovalRequest, accepted: boolean) => {
    setRespondingApprovalId(approval.id);
    try {
      await actions.respondToAgentApproval(approval.id, accepted);
    } catch {
      // App state owns the user-facing error.
    } finally {
      setRespondingApprovalId(undefined);
    }
  };

  return (
    <Screen>
      <PageHeader title="Inbox" />
      <ScreenScrollView>
        <View className="gap-2">
          <Text className="text-base text-muted-foreground dark:text-slate-400">
            Agent approvals, attention states, and blackboard updates that need quick triage.
          </Text>
        </View>

        <Card>
          <CardHeader>
            <View className="flex-row items-center justify-between gap-3">
              <View className="flex-row items-center gap-2">
                <ShieldAlert color={agents.pendingApprovals.length ? "#dc2626" : colors.icon} size={18} />
                <CardTitle>Approval Queue</CardTitle>
              </View>
              <Badge variant={agents.pendingApprovals.length ? "default" : "outline"}>{agents.pendingApprovals.length ? `${agents.pendingApprovals.length} pending` : "clear"}</Badge>
            </View>
          </CardHeader>
          <CardContent className="gap-3">
            {agents.pendingApprovals.length ? (
              agents.pendingApprovals.map((approval) => <ApprovalCard key={approval.id} approval={approval} submitting={respondingApprovalId === approval.id} onRespond={respondToApproval} />)
            ) : (
              <Text className="text-sm text-muted-foreground dark:text-slate-400">No agent approvals need a response.</Text>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <View className="flex-row items-center justify-between gap-3">
              <View className="flex-row items-center gap-2">
                <Workflow color={colors.icon} size={18} />
                <CardTitle>Attention</CardTitle>
              </View>
              <Badge variant={attentionAgents.length ? "default" : "outline"}>{attentionAgents.length ? `${attentionAgents.length} agents` : "clear"}</Badge>
            </View>
          </CardHeader>
          <CardContent className="gap-2">
            {attentionAgents.length ? (
              attentionAgents.map((agent) => <AgentCompactRow key={agent.id} agent={agent} trailing="status" onPress={() => router.push(agentHref(agent.id))} />)
            ) : (
              <Text className="text-sm text-muted-foreground dark:text-slate-400">No blocked, failed, or waiting agents are loaded.</Text>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <View className="flex-row items-center justify-between gap-3">
              <View className="flex-row items-center gap-2">
                <Workflow color={colors.icon} size={18} />
                <CardTitle>Blackboard Updates</CardTitle>
              </View>
              <Badge variant={recentAgentEvents.length ? "default" : "outline"}>{recentAgentEvents.length ? "active" : "ready"}</Badge>
            </View>
          </CardHeader>
          <CardContent className="gap-3">
            {recentAgentEvents.length ? (
              recentAgentEvents.map((event) => (
                <Pressable key={event.id} accessibilityRole="button" accessibilityLabel={`Open ${event.title}`} onPress={() => router.push(agentHref(event.agentId))}>
                  <TimelineRow event={event} />
                </Pressable>
              ))
            ) : (
              <Text className="text-sm text-muted-foreground dark:text-slate-400">Open an agent to load its detailed blackboard timeline.</Text>
            )}
          </CardContent>
        </Card>

        {placeholderEvents.map((event) => (
          <Card key={event.id}>
            <CardHeader>
              <View className="flex-row items-center justify-between gap-3">
                <View className="flex-row items-center gap-2">
                  <BellRing color={colors.icon} size={18} />
                  <CardTitle>{event.title}</CardTitle>
                </View>
                <Badge variant={event.state === "ready" ? "default" : "outline"}>{event.state}</Badge>
              </View>
            </CardHeader>
            <CardContent>
              <Text className="text-sm text-muted-foreground dark:text-slate-400">Source: {event.source}</Text>
            </CardContent>
          </Card>
        ))}

        {!agents.pendingApprovals.length && !attentionAgents.length && !recentAgentEvents.length ? <View className="items-center gap-2 rounded-md border border-dashed border-border bg-card p-6 dark:border-neutral-800 dark:bg-black">
          <Inbox color={colors.muted} size={24} />
          <Text className="text-sm font-medium text-foreground dark:text-slate-100">No live events yet</Text>
          <Text className="text-center text-sm text-muted-foreground dark:text-slate-400">
            Connect a signed-in Roots user and registered device to receive realtime activity.
          </Text>
        </View> : null}
      </ScreenScrollView>
    </Screen>
  );
}

function agentHref(agentId: string): Href {
  return { pathname: "/(tabs)/agents/[agentId]", params: { agentId } } as unknown as Href;
}
