import { ActivityIndicator, Pressable, Text, View } from "react-native";
import { router } from "expo-router";
import type { Href } from "expo-router";
import { Bot, RefreshCcw, ServerOff, ShieldAlert } from "lucide-react-native";
import { useCallback, useEffect, useRef, useState } from "react";
import { AgentCompactRow, ApprovalCard } from "@/components/agents/agent-command-ui";
import { AgentVisualBlackboard } from "@/components/agents/agent-visual-blackboard";
import { PageHeader } from "@/components/drawer-shell";
import { Screen, ScreenScrollView } from "@/components/screen";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/cn";
import type { AgentApprovalRequest } from "@/services/types";
import { useAppState } from "@/state/app-state";
import { useTheme } from "@/theme/theme";

export default function AgentsScreen() {
  const { agents, actions } = useAppState();
  const { colors } = useTheme();
  const [spawnOpen, setSpawnOpen] = useState(false);
  const [objective, setObjective] = useState("");
  const [selectedProfileId, setSelectedProfileId] = useState<string | undefined>();
  const [spawning, setSpawning] = useState(false);
  const [respondingApprovalId, setRespondingApprovalId] = useState<string | undefined>();
  const didLoad = useRef(false);

  const loadAgents = useCallback(() => {
    void actions.loadAgentProfiles().catch(() => undefined);
    void actions.loadAgents().catch(() => undefined);
  }, [actions]);

  const selectedProfile = agents.profiles.find((profile) => profile.id === selectedProfileId) ?? agents.profiles[0];

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
      const detail = await actions.spawnAgent({
        objective: trimmed,
        profileId: selectedProfile?.id,
        runtime: selectedProfile?.runtime,
        location: selectedProfile?.location
      });
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
              {spawnOpen ? "Compose spawn" : "Quick spawn"}
            </Button>
          </CardContent>
        </Card>

        {agents.apiUnavailable ? (
          <Card>
            <CardContent className="gap-3 p-4">
              <View className="flex-row items-start gap-3">
                <View className="size-10 items-center justify-center rounded-full bg-muted dark:bg-slate-800">
                  <ServerOff color={colors.icon} size={19} />
                </View>
                <View className="min-w-0 flex-1 gap-1">
                  <Text className="text-sm font-semibold text-foreground dark:text-slate-100">Nexus agent API pending</Text>
                  <Text className="text-sm text-muted-foreground dark:text-slate-400">
                    Pulse will stage spawned agents locally until Nexus exposes the agent endpoints.
                  </Text>
                </View>
              </View>
            </CardContent>
          </Card>
        ) : null}

        {spawnOpen ? (
          <Card>
            <CardHeader>
              <CardTitle>Quick Spawn</CardTitle>
            </CardHeader>
            <CardContent className="gap-3">
              <View className="gap-2">
                <Text className="text-xs font-semibold uppercase text-muted-foreground dark:text-slate-400">Blackboard profile</Text>
                <View className="flex-row flex-wrap gap-2">
                  {agents.profiles.map((profile) => (
                    <Pressable
                      key={profile.id}
                      accessibilityRole="button"
                      className={cn("rounded-md border border-border px-3 py-2 dark:border-neutral-800", selectedProfile?.id === profile.id ? "bg-primary" : "bg-background dark:bg-black")}
                      onPress={() => {
                        setSelectedProfileId(profile.id);
                        if (!objective.trim() && profile.defaultObjective) {
                          setObjective(profile.defaultObjective);
                        }
                      }}
                    >
                      <Text className={cn("text-xs font-semibold", selectedProfile?.id === profile.id ? "text-primary-foreground" : "text-foreground dark:text-slate-100")}>{profile.name}</Text>
                    </Pressable>
                  ))}
                </View>
                {selectedProfile?.description ? <Text className="text-sm text-muted-foreground dark:text-slate-400">{selectedProfile.description}</Text> : null}
                {selectedProfile?.capabilities.length ? (
                  <View className="flex-row flex-wrap gap-1">
                    {selectedProfile.capabilities.slice(0, 4).map((capability) => (
                      <Badge key={capability} variant="outline">{capability}</Badge>
                    ))}
                  </View>
                ) : null}
              </View>
              <Input icon={Bot} label="Objective" placeholder="What should this agent do?" value={objective} onChangeText={setObjective} returnKeyType="done" />
              <View className="flex-row gap-2">
                <Button className="flex-1" disabled={spawning || !objective.trim()} onPress={() => void spawnAgent()}>
                  {spawning ? "Staging..." : agents.apiUnavailable ? "Stage draft" : "Spawn"}
                </Button>
                <Button className="flex-1" disabled={spawning} variant="outline" onPress={() => setSpawnOpen(false)}>
                  Cancel
                </Button>
              </View>
            </CardContent>
          </Card>
        ) : null}

        {agents.error && !agents.apiUnavailable ? (
          <View className="rounded-md border border-red-200 bg-red-50 p-3 dark:border-red-950 dark:bg-red-950/40">
            <Text className="text-sm text-red-700 dark:text-red-200">{agents.error}</Text>
          </View>
        ) : null}

        <AgentVisualBlackboard agents={agents.items} onOpenAgent={(agentId) => router.push(agentHref(agentId))} />

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
              {agents.pendingApprovals.map((approval) => <ApprovalCard key={approval.id} approval={approval} submitting={respondingApprovalId === approval.id} onRespond={respondToApproval} />)}
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
              agents.items.map((agent) => <AgentCompactRow key={agent.id} agent={agent} trailing="status" onPress={() => router.push(agentHref(agent.id))} />)
            ) : (
              <View className="items-center gap-2 rounded-md border border-dashed border-border bg-background p-5 dark:border-neutral-800 dark:bg-black">
                <Bot color={colors.muted} size={24} />
                <Text className="text-sm font-medium text-foreground dark:text-slate-100">{agents.apiUnavailable ? "No staged agents" : "No agents running"}</Text>
                <Text className="text-center text-sm text-muted-foreground dark:text-slate-400">
                  {agents.apiUnavailable ? "Create a local draft to preserve the objective until Nexus is ready." : "Spawn an agent when you need Pulse to watch or steer autonomous work."}
                </Text>
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

function agentHref(agentId: string): Href {
  return { pathname: "/(tabs)/agents/[agentId]", params: { agentId } } as unknown as Href;
}
