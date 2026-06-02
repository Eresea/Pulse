import { ActivityIndicator, Pressable, Text, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import type { Href } from "expo-router";
import { AlertCircle, Bot, CheckCircle2, ChevronLeft, CirclePause, Clock3, File, ListChecks, MessageSquare, MoreVertical, OctagonAlert, Pause, Play, RotateCcw, Send, ShieldAlert, StopCircle } from "lucide-react-native";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { PageHeader } from "@/components/drawer-shell";
import { Screen, ScreenScrollView } from "@/components/screen";
import { ActionSheet } from "@/components/ui/action-sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/cn";
import type { AgentApprovalRequest, AgentDetail, AgentStatus, AgentSummary, AgentTimelineEvent, AgentTimelineEventType } from "@/services/types";
import { useAppState } from "@/state/app-state";
import { useTheme } from "@/theme/theme";

const tabs: { id: "all" | AgentTimelineEventType; label: string }[] = [
  { id: "all", label: "All" },
  { id: "blackboard", label: "Blackboard" },
  { id: "message", label: "Messages" },
  { id: "approval", label: "Approvals" },
  { id: "log", label: "Logs" }
];

export default function AgentDetailScreen() {
  const { agentId } = useLocalSearchParams<{ agentId: string }>();
  const { agents, actions } = useAppState();
  const { colors } = useTheme();
  const [actionSheetOpen, setActionSheetOpen] = useState(false);
  const [instruction, setInstruction] = useState("");
  const [sending, setSending] = useState(false);
  const [respondingApprovalId, setRespondingApprovalId] = useState<string | undefined>();
  const [activeTab, setActiveTab] = useState<"all" | AgentTimelineEventType>("all");
  const didLoad = useRef(false);
  const detail = agentId ? agents.detailsById[agentId] : undefined;
  const summary = agentId ? agents.items.find((agent) => agent.id === agentId) : undefined;
  const visibleEvents = useMemo(() => {
    const events = detail?.timeline ?? [];
    return activeTab === "all" ? events : events.filter((event) => event.type === activeTab);
  }, [activeTab, detail?.timeline]);

  const loadDetail = useCallback(() => {
    if (agentId) {
      void actions.loadAgentDetail(agentId).catch(() => undefined);
    }
  }, [actions, agentId]);

  useEffect(() => {
    if (didLoad.current) {
      return;
    }
    didLoad.current = true;
    loadDetail();
  }, [loadDetail]);

  const sendInstruction = async () => {
    const trimmed = instruction.trim();
    if (!agentId || !trimmed) {
      return;
    }
    setSending(true);
    try {
      await actions.sendAgentInstruction(agentId, { message: trimmed });
      setInstruction("");
    } catch {
      // App state owns the user-facing error.
    } finally {
      setSending(false);
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

  const runControl = async (action: "pause" | "resume" | "stop") => {
    if (!agentId) {
      return;
    }
    try {
      if (action === "pause") {
        await actions.pauseAgent(agentId);
      } else if (action === "resume") {
        await actions.resumeAgent(agentId);
      } else {
        await actions.stopAgent(agentId);
      }
    } catch {
      // App state owns the user-facing error.
    }
  };

  const displayAgent = detail ?? summary;

  return (
    <Screen>
      <View>
        <PageHeader title="Agent" />
        <View className="flex-row items-center justify-between gap-3 px-4 pb-2">
          <Pressable accessibilityRole="button" accessibilityLabel="Back to agents" className="h-10 flex-row items-center gap-2 rounded-md border border-border px-3 dark:border-neutral-800" onPress={() => router.push("/(tabs)/agents" as Href)}>
            <ChevronLeft color={colors.icon} size={18} />
            <Text className="text-sm font-semibold text-foreground dark:text-slate-100">Agents</Text>
          </Pressable>
          <Pressable accessibilityRole="button" accessibilityLabel="Open agent controls" className="size-10 items-center justify-center rounded-full bg-muted dark:bg-slate-800" onPress={() => setActionSheetOpen(true)}>
            <MoreVertical color={colors.icon} size={18} />
          </Pressable>
        </View>
      </View>
      <ScreenScrollView>
        {agents.error ? (
          <View className="rounded-md border border-red-200 bg-red-50 p-3 dark:border-red-950 dark:bg-red-950/40">
            <Text className="text-sm text-red-700 dark:text-red-200">{agents.error}</Text>
          </View>
        ) : null}

        {!displayAgent && agents.loadingAgentId === agentId ? (
          <View className="flex-row items-center gap-2 py-6">
            <ActivityIndicator color={colors.icon} />
            <Text className="text-sm text-muted-foreground dark:text-slate-400">Loading agent</Text>
          </View>
        ) : displayAgent ? (
          <>
            <AgentHeader agent={displayAgent} onRefresh={loadDetail} />
            {detail ? (
              <>
                <BlackboardCard detail={detail} />
                {detail.approvals.filter((approval) => approval.status === "pending").length ? (
                  <Card>
                    <CardHeader>
                      <View className="flex-row items-center gap-2">
                        <ShieldAlert color="#dc2626" size={18} />
                        <CardTitle>Pending Approvals</CardTitle>
                      </View>
                    </CardHeader>
                    <CardContent className="gap-3">
                      {detail.approvals.filter((approval) => approval.status === "pending").map((approval) => (
                        <ApprovalCard key={approval.id} approval={approval} submitting={respondingApprovalId === approval.id} onRespond={respondToApproval} />
                      ))}
                    </CardContent>
                  </Card>
                ) : null}
                <Card>
                  <CardHeader>
                    <CardTitle>Command</CardTitle>
                  </CardHeader>
                  <CardContent className="gap-3">
                    <Input icon={MessageSquare} label="Instruction" placeholder="Send an instruction or correction" value={instruction} onChangeText={setInstruction} returnKeyType="send" onSubmitEditing={() => void sendInstruction()} />
                    <Button disabled={sending || !instruction.trim()} onPress={() => void sendInstruction()}>
                      {sending ? "Sending..." : "Send instruction"}
                    </Button>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader>
                    <CardTitle>Timeline</CardTitle>
                  </CardHeader>
                  <CardContent className="gap-3">
                    <View className="flex-row flex-wrap gap-2">
                      {tabs.map((tab) => (
                        <Pressable key={tab.id} accessibilityRole="button" className={cn("rounded-md border border-border px-3 py-2 dark:border-neutral-800", activeTab === tab.id ? "bg-primary" : "bg-background dark:bg-black")} onPress={() => setActiveTab(tab.id)}>
                          <Text className={cn("text-xs font-semibold", activeTab === tab.id ? "text-primary-foreground" : "text-muted-foreground dark:text-slate-400")}>{tab.label}</Text>
                        </Pressable>
                      ))}
                    </View>
                    {visibleEvents.length ? visibleEvents.map((event) => <TimelineRow key={event.id} event={event} />) : <Text className="text-sm text-muted-foreground dark:text-slate-400">No timeline events for this view.</Text>}
                  </CardContent>
                </Card>
              </>
            ) : (
              <Button variant="outline" onPress={loadDetail}>
                Load details
              </Button>
            )}
          </>
        ) : (
          <View className="items-center gap-2 rounded-md border border-dashed border-border bg-card p-6 dark:border-neutral-800 dark:bg-black">
            <Bot color={colors.muted} size={24} />
            <Text className="text-sm font-medium text-foreground dark:text-slate-100">Agent not loaded</Text>
            <Text className="text-center text-sm text-muted-foreground dark:text-slate-400">Nexus did not return this agent yet.</Text>
            <Button variant="outline" onPress={loadDetail}>Retry</Button>
          </View>
        )}
      </ScreenScrollView>
      <ActionSheet
        actions={[
          {
            label: "Pause agent",
            accessibilityLabel: "Pause agent",
            disabled: displayAgent?.status === "paused" || displayAgent?.status === "completed",
            icon: Pause,
            onPress: () => void runControl("pause")
          },
          {
            label: "Resume agent",
            accessibilityLabel: "Resume agent",
            disabled: displayAgent?.status === "running" || displayAgent?.status === "completed",
            icon: Play,
            onPress: () => void runControl("resume")
          },
          {
            label: "Stop agent",
            accessibilityLabel: "Stop agent",
            destructive: true,
            disabled: displayAgent?.status === "completed",
            icon: StopCircle,
            onPress: () => void runControl("stop")
          }
        ]}
        description="Controls are sent to Nexus and reflected here optimistically."
        onClose={() => setActionSheetOpen(false)}
        title={displayAgent?.name ?? "Agent controls"}
        visible={actionSheetOpen}
      />
    </Screen>
  );
}

function AgentHeader({ agent, onRefresh }: { agent: AgentDetail | AgentSummary; onRefresh: () => void }) {
  const { colors } = useTheme();
  const Icon = statusIcon(agent.status);
  return (
    <Card>
      <CardContent className="gap-3 p-4">
        <View className="flex-row items-start justify-between gap-3">
          <View className="min-w-0 flex-1 flex-row gap-3">
            <View className={cn("size-11 items-center justify-center rounded-full bg-muted dark:bg-slate-800", agent.status === "running" && "bg-primary")}>
              <Icon color={agent.status === "running" ? colors.primaryForeground : statusColor(agent.status)} size={20} />
            </View>
            <View className="min-w-0 flex-1 gap-1">
              <Text className="text-lg font-bold text-foreground dark:text-slate-100" numberOfLines={1}>{agent.name}</Text>
              <Text className="text-sm text-muted-foreground dark:text-slate-400">{agent.objective ?? "No objective reported"}</Text>
              <Text className="text-xs text-muted-foreground dark:text-slate-500" numberOfLines={1}>{[agent.location, agent.runtime, formatProgress(agent)].filter(Boolean).join(" - ")}</Text>
            </View>
          </View>
          <Pressable accessibilityRole="button" accessibilityLabel="Refresh agent" className="size-10 items-center justify-center rounded-full bg-muted dark:bg-slate-800" onPress={onRefresh}>
            <RotateCcw color={colors.icon} size={17} />
          </Pressable>
        </View>
        <View className="flex-row flex-wrap gap-2">
          <StatusBadge status={agent.status} />
          {agent.needsAttention ? <Badge variant="outline" className="border-amber-300 text-amber-700 dark:border-amber-900 dark:text-amber-300">Needs attention</Badge> : null}
        </View>
        {agent.lastUpdate ? <Text className="text-sm text-muted-foreground dark:text-slate-400">{agent.lastUpdate}</Text> : null}
      </CardContent>
    </Card>
  );
}

function BlackboardCard({ detail }: { detail: AgentDetail }) {
  return (
    <Card>
      <CardHeader>
        <View className="flex-row items-center gap-2">
          <ListChecks color="#0f766e" size={18} />
          <CardTitle>Blackboard</CardTitle>
        </View>
      </CardHeader>
      <CardContent className="gap-4">
        <InfoBlock label="Current objective" items={[detail.blackboard.objective ?? detail.objective ?? "No objective reported"]} />
        <InfoBlock label="Current plan" items={detail.blackboard.plan} empty="No plan reported" ordered />
        <InfoBlock label="Active step" items={[detail.blackboard.activeStep ?? "No active step reported"]} />
        <InfoBlock label="Blockers" items={detail.blackboard.blockers} empty="No blockers" attention={detail.blackboard.blockers.length > 0} />
        <InfoBlock label="Recent updates" items={detail.blackboard.recentUpdates} empty="No updates yet" />
        {detail.blackboard.decisions.length ? (
          <View className="gap-2">
            <Text className="text-xs font-semibold uppercase text-muted-foreground dark:text-slate-400">Decisions</Text>
            {detail.blackboard.decisions.map((decision) => (
              <View key={decision.id} className="rounded-md border border-border bg-background p-3 dark:border-neutral-800 dark:bg-black">
                <Text className="text-sm font-semibold text-foreground dark:text-slate-100">{decision.title}</Text>
                {decision.rationale ? <Text className="text-sm text-muted-foreground dark:text-slate-400">{decision.rationale}</Text> : null}
              </View>
            ))}
          </View>
        ) : null}
      </CardContent>
    </Card>
  );
}

function InfoBlock({ label, items, empty, ordered = false, attention = false }: { label: string; items: string[]; empty?: string; ordered?: boolean; attention?: boolean }) {
  const displayItems = items.length ? items : empty ? [empty] : [];
  return (
    <View className="gap-2">
      <Text className="text-xs font-semibold uppercase text-muted-foreground dark:text-slate-400">{label}</Text>
      {displayItems.map((item, index) => (
        <View key={`${label}-${index}`} className={cn("rounded-md border border-border bg-background p-3 dark:border-neutral-800 dark:bg-black", attention && "border-amber-300 dark:border-amber-900")}>
          <Text className="text-sm text-foreground dark:text-slate-100">{ordered ? `${index + 1}. ${item}` : item}</Text>
        </View>
      ))}
    </View>
  );
}

function ApprovalCard({ approval, submitting, onRespond }: { approval: AgentApprovalRequest; submitting: boolean; onRespond: (approval: AgentApprovalRequest, accepted: boolean) => void }) {
  return (
    <View className="gap-2 rounded-md border border-red-200 bg-red-50 p-3 dark:border-red-950 dark:bg-red-950/40">
      <Text className="text-sm font-semibold text-red-700 dark:text-red-300">{approval.title}</Text>
      <Text className="text-sm leading-5 text-red-700 dark:text-red-200">{approval.body}</Text>
      <View className="flex-row gap-2">
        <Button className="h-9 flex-1 bg-red-600" disabled={submitting} onPress={() => onRespond(approval, true)}>{approval.confirmLabel ?? "Approve"}</Button>
        <Button className="h-9 flex-1 border-red-200 dark:border-red-800" disabled={submitting} variant="outline" textClassName="text-red-700 dark:text-red-200" onPress={() => onRespond(approval, false)}>{approval.cancelLabel ?? "Reject"}</Button>
      </View>
    </View>
  );
}

function TimelineRow({ event }: { event: AgentTimelineEvent }) {
  const Icon = timelineIcon(event.type, event.severity);
  return (
    <View className={cn("rounded-md border border-border bg-background p-3 dark:border-neutral-800 dark:bg-black", event.severity === "error" && "border-red-200 dark:border-red-900")}>
      <View className="flex-row items-start gap-3">
        <Icon color={event.severity === "error" ? "#dc2626" : event.type === "approval" ? "#d97706" : "#64748b"} size={17} />
        <View className="min-w-0 flex-1 gap-1">
          <View className="flex-row items-center justify-between gap-3">
            <Text className="min-w-0 flex-1 text-sm font-semibold text-foreground dark:text-slate-100" numberOfLines={1}>{event.title}</Text>
            <Badge variant="outline">{event.type}</Badge>
          </View>
          {event.body ? <Text className="text-sm text-muted-foreground dark:text-slate-400">{event.body}</Text> : null}
          <Text className="text-xs text-muted-foreground dark:text-slate-500">{formatTime(event.createdAt)}</Text>
        </View>
      </View>
    </View>
  );
}

function StatusBadge({ status }: { status: AgentStatus }) {
  return (
    <Badge variant={status === "running" ? "default" : "outline"} className={cn(status === "failed" && "border-red-200 text-red-700 dark:border-red-900 dark:text-red-300", (status === "waiting_input" || status === "blocked") && "border-amber-300 text-amber-700 dark:border-amber-900 dark:text-amber-300")}>
      {status.replace("_", " ")}
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
      return CheckCircle2;
    default:
      return Clock3;
  }
}

function statusColor(status: AgentStatus) {
  if (status === "failed") {
    return "#dc2626";
  }
  if (status === "waiting_input" || status === "blocked") {
    return "#d97706";
  }
  return "#64748b";
}

function timelineIcon(type: AgentTimelineEventType, severity?: AgentTimelineEvent["severity"]) {
  if (severity === "error" || type === "error") {
    return AlertCircle;
  }
  if (type === "approval") {
    return ShieldAlert;
  }
  if (type === "message") {
    return Send;
  }
  if (type === "artifact") {
    return File;
  }
  if (type === "blackboard") {
    return ListChecks;
  }
  return MessageSquare;
}

function formatProgress(agent: AgentDetail | { progress?: AgentDetail["progress"] }) {
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

function formatTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }
  return date.toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}
