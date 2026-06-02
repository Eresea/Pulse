import { ActivityIndicator, Pressable, Text, View } from "react-native";
import { router } from "expo-router";
import type { Href } from "expo-router";
import { AlertCircle, Bot, ChevronRight, CirclePause, Clock3, OctagonAlert, Play, RefreshCcw, ShieldAlert, Square } from "lucide-react-native";
import { useCallback, useEffect, useRef, useState } from "react";
import { PageHeader } from "@/components/drawer-shell";
import { Screen, ScreenScrollView } from "@/components/screen";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/cn";
import type { AgentApprovalRequest, AgentStatus, AgentSummary } from "@/services/types";
import { useAppState } from "@/state/app-state";
import { useTheme } from "@/theme/theme";

const attentionStatuses: AgentStatus[] = ["waiting_input", "blocked", "failed"];

export default function AgentsScreen() {
  const { agents, actions } = useAppState();
  const { colors } = useTheme();
  const [spawnOpen, setSpawnOpen] = useState(false);
  const [objective, setObjective] = useState("");
  const [spawning, setSpawning] = useState(false);
  const [respondingApprovalId, setRespondingApprovalId] = useState<string | undefined>();
  const didLoad = useRef(false);

  const loadAgents = useCallback(() => {
    void actions.loadAgents().catch(() => undefined);
  }, [actions]);

  useEffect(() => {
    if (didLoad.current) {
      return;
    }
    didLoad.current = true;
    loadAgents();
  }, [loadAgents]);

  const counts = {
    running: agents.items.filter((agent) => agent.status === "running").length,
    waiting: agents.items.filter((agent) => agent.status === "waiting_input").length,
    blocked: agents.items.filter((agent) => agent.status === "blocked").length,
    failed: agents.items.filter((agent) => agent.status === "failed").length
  };

  const spawnAgent = async () => {
    const trimmed = objective.trim();
    if (!trimmed) {
      return;
    }
    setSpawning(true);
    try {
      const detail = await actions.spawnAgent({ objective: trimmed });
      setObjective("");
      setSpawnOpen(false);
      router.push(agentHref(detail.id));
    } catch {
      // App state owns the user-facing error.
    } finally {
      setSpawning(false);
    }
  };

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
      <PageHeader title="Agents" />
      <ScreenScrollView>
        <Card>
          <CardContent className="gap-4 p-4">
            <View className="flex-row items-start justify-between gap-3">
              <View className="min-w-0 flex-1">
                <Text className="text-base font-semibold text-foreground dark:text-slate-100">Command surface</Text>
                <Text className="text-sm text-muted-foreground dark:text-slate-400">Monitor active agents and intervene when needed.</Text>
              </View>
              <Pressable accessibilityRole="button" accessibilityLabel="Refresh agents" className="size-10 items-center justify-center rounded-full bg-muted dark:bg-slate-800" onPress={loadAgents}>
                <RefreshCcw color={colors.icon} size={18} />
              </Pressable>
            </View>
            <View className="grid-cols-2 flex-row flex-wrap gap-2">
              <Metric label="Running" value={counts.running} />
              <Metric label="Waiting" value={counts.waiting} attention={counts.waiting > 0} />
              <Metric label="Blocked" value={counts.blocked} attention={counts.blocked > 0} />
              <Metric label="Failed" value={counts.failed} danger={counts.failed > 0} />
            </View>
            <Button className="h-12" onPress={() => setSpawnOpen(true)}>
              Quick spawn
            </Button>
          </CardContent>
        </Card>

        {spawnOpen ? (
          <Card>
            <CardHeader>
              <CardTitle>Quick Spawn</CardTitle>
            </CardHeader>
            <CardContent className="gap-3">
              <Input icon={Bot} label="Objective" placeholder="What should this agent do?" value={objective} onChangeText={setObjective} returnKeyType="done" />
              <View className="flex-row gap-2">
                <Button className="flex-1" disabled={spawning || !objective.trim()} onPress={() => void spawnAgent()}>
                  {spawning ? "Spawning..." : "Spawn"}
                </Button>
                <Button className="flex-1" disabled={spawning} variant="outline" onPress={() => setSpawnOpen(false)}>
                  Cancel
                </Button>
              </View>
            </CardContent>
          </Card>
        ) : null}

        {agents.error ? (
          <View className="rounded-md border border-red-200 bg-red-50 p-3 dark:border-red-950 dark:bg-red-950/40">
            <Text className="text-sm text-red-700 dark:text-red-200">{agents.error}</Text>
          </View>
        ) : null}

        {agents.pendingApprovals.length ? (
          <Card>
            <CardHeader>
              <View className="flex-row items-center justify-between gap-3">
                <View className="flex-row items-center gap-2">
                  <ShieldAlert color="#dc2626" size={18} />
                  <CardTitle>Approval Queue</CardTitle>
                </View>
                <Badge variant="outline">{agents.pendingApprovals.length}</Badge>
              </View>
            </CardHeader>
            <CardContent className="gap-3">
              {agents.pendingApprovals.map((approval) => (
                <ApprovalRow key={approval.id} approval={approval} submitting={respondingApprovalId === approval.id} onRespond={respondToApproval} />
              ))}
            </CardContent>
          </Card>
        ) : null}

        <Card>
          <CardHeader>
            <CardTitle>Active Agents</CardTitle>
          </CardHeader>
          <CardContent className="gap-2">
            {agents.isLoading && !agents.items.length ? (
              <View className="flex-row items-center gap-2 py-2">
                <ActivityIndicator color={colors.icon} />
                <Text className="text-sm text-muted-foreground dark:text-slate-400">Loading agents</Text>
              </View>
            ) : agents.items.length ? (
              agents.items.map((agent) => <AgentRow key={agent.id} agent={agent} />)
            ) : (
              <View className="items-center gap-2 rounded-md border border-dashed border-border bg-background p-5 dark:border-neutral-800 dark:bg-black">
                <Bot color={colors.muted} size={24} />
                <Text className="text-sm font-medium text-foreground dark:text-slate-100">No agents running</Text>
                <Text className="text-center text-sm text-muted-foreground dark:text-slate-400">Spawn an agent when you need Pulse to watch or steer autonomous work.</Text>
                <Button className="mt-1" onPress={() => setSpawnOpen(true)}>
                  Spawn agent
                </Button>
              </View>
            )}
          </CardContent>
        </Card>
      </ScreenScrollView>
    </Screen>
  );
}

function Metric({ label, value, attention = false, danger = false }: { label: string; value: number; attention?: boolean; danger?: boolean }) {
  return (
    <View className={cn("min-w-[47%] flex-1 rounded-md border border-border bg-background p-3 dark:border-neutral-800 dark:bg-black", attention && "border-amber-300 dark:border-amber-900", danger && "border-red-300 dark:border-red-900")}>
      <Text className={cn("text-2xl font-bold text-foreground dark:text-slate-100", danger && "text-red-700 dark:text-red-300")}>{value}</Text>
      <Text className="text-xs font-semibold uppercase text-muted-foreground dark:text-slate-400">{label}</Text>
    </View>
  );
}

function AgentRow({ agent }: { agent: AgentSummary }) {
  const { colors } = useTheme();
  const Icon = statusIcon(agent.status);
  const progress = formatProgress(agent);
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={`Open ${agent.name}`} className={cn("rounded-md border border-border bg-background p-3 dark:border-neutral-800 dark:bg-black", agent.needsAttention && "border-amber-300 dark:border-amber-900")} onPress={() => router.push(agentHref(agent.id))}>
      <View className="flex-row items-start justify-between gap-3">
        <View className="min-w-0 flex-1 flex-row gap-3">
          <View className={cn("size-10 items-center justify-center rounded-full bg-muted dark:bg-slate-800", agent.status === "running" && "bg-primary")}>
            <Icon color={agent.status === "running" ? colors.primaryForeground : statusColor(agent.status)} size={18} />
          </View>
          <View className="min-w-0 flex-1 gap-1">
            <View className="flex-row items-center gap-2">
              <Text className="min-w-0 flex-1 text-sm font-semibold text-foreground dark:text-slate-100" numberOfLines={1}>{agent.name}</Text>
              {agent.needsAttention ? <AlertCircle color="#d97706" size={15} /> : null}
            </View>
            <Text className="text-sm text-muted-foreground dark:text-slate-400" numberOfLines={2}>{agent.objective ?? "No objective reported"}</Text>
            <Text className="text-xs text-muted-foreground dark:text-slate-500" numberOfLines={1}>{[agent.location, agent.runtime, progress].filter(Boolean).join(" - ")}</Text>
          </View>
        </View>
        <View className="items-end gap-2">
          <StatusBadge status={agent.status} />
          <ChevronRight color={colors.muted} size={17} />
        </View>
      </View>
    </Pressable>
  );
}

function ApprovalRow({ approval, submitting, onRespond }: { approval: AgentApprovalRequest; submitting: boolean; onRespond: (approval: AgentApprovalRequest, accepted: boolean) => void }) {
  return (
    <View className="gap-2 rounded-md border border-red-200 bg-red-50 p-3 dark:border-red-950 dark:bg-red-950/40">
      <View className="flex-row items-start justify-between gap-3">
        <View className="min-w-0 flex-1">
          <Text className="text-sm font-semibold text-red-700 dark:text-red-300">{approval.title}</Text>
          <Text className="text-sm leading-5 text-red-700 dark:text-red-200">{approval.body}</Text>
        </View>
        {approval.risk ? <Badge variant="outline" className="border-red-200 text-red-700 dark:border-red-900 dark:text-red-300">{approval.risk}</Badge> : null}
      </View>
      <View className="flex-row gap-2">
        <Button className="h-9 flex-1 bg-red-600" disabled={submitting} onPress={() => onRespond(approval, true)}>{approval.confirmLabel ?? "Approve"}</Button>
        <Button className="h-9 flex-1 border-red-200 dark:border-red-800" disabled={submitting} variant="outline" textClassName="text-red-700 dark:text-red-200" onPress={() => onRespond(approval, false)}>{approval.cancelLabel ?? "Reject"}</Button>
      </View>
    </View>
  );
}

function StatusBadge({ status }: { status: AgentStatus }) {
  const danger = status === "failed";
  const attention = attentionStatuses.includes(status);
  return (
    <Badge variant={status === "running" ? "default" : "outline"} className={cn(danger && "border-red-200 text-red-700 dark:border-red-900 dark:text-red-300", attention && !danger && "border-amber-300 text-amber-700 dark:border-amber-900 dark:text-amber-300")}>
      {statusLabel(status)}
    </Badge>
  );
}

function statusIcon(status: AgentStatus) {
  switch (status) {
    case "running":
      return Play;
    case "waiting_input":
      return ShieldAlert;
    case "blocked":
      return OctagonAlert;
    case "paused":
      return CirclePause;
    case "failed":
      return AlertCircle;
    case "completed":
      return Square;
    default:
      return Clock3;
  }
}

function statusColor(status: AgentStatus) {
  if (status === "failed") {
    return "#dc2626";
  }
  if (attentionStatuses.includes(status)) {
    return "#d97706";
  }
  return "#64748b";
}

function statusLabel(status: AgentStatus) {
  return status.replace("_", " ");
}

function formatProgress(agent: AgentSummary) {
  if (!agent.progress) {
    return undefined;
  }
  if (agent.progress.label) {
    return agent.progress.label;
  }
  if (agent.progress.percent !== undefined) {
    return `${agent.progress.percent}%`;
  }
  if (agent.progress.current !== undefined && agent.progress.total !== undefined) {
    return `${agent.progress.current}/${agent.progress.total}`;
  }
  return undefined;
}

function agentHref(agentId: string): Href {
  return { pathname: "/(tabs)/agents/[agentId]", params: { agentId } } as unknown as Href;
}
