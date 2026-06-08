import { Activity, AlertCircle, Bot, ChevronRight, MessageCirclePlus, MoreVertical, Radio, RefreshCcw, ShieldAlert, ShieldCheck, Smartphone, Trash2, Workflow } from "lucide-react-native";
import { router } from "expo-router";
import type { Href } from "expo-router";
import { type ReactNode, useCallback, useEffect, useRef, useState } from "react";
import { ActivityIndicator, Pressable, Text, View } from "react-native";
import { AgentCompactRow, ApprovalCard } from "@/components/agents/agent-command-ui";
import { Screen, ScreenScrollView } from "@/components/screen";
import { ActionSheet } from "@/components/ui/action-sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/drawer-shell";
import { cn } from "@/lib/cn";
import { triggerLongPressFeedback, triggerTapFeedback } from "@/lib/tactile-feedback";
import type { AgentApprovalRequest, AiChatThread } from "@/services/types";
import { useAppState } from "@/state/app-state";
import { useTheme } from "@/theme/theme";

export default function HomeScreen() {
  const { session, realtime, push, polling, updates, aiChat, agents, actions } = useAppState();
  const { colors } = useTheme();
  const [creating, setCreating] = useState(false);
  const [actionThread, setActionThread] = useState<AiChatThread | undefined>();
  const [respondingApprovalId, setRespondingApprovalId] = useState<string | undefined>();
  const didLoadThreads = useRef(false);
  const didLoadAgents = useRef(false);
  const recentThreads = aiChat.threads.slice(0, 5);
  const latestThread = recentThreads[0];
  const attentionAgents = agents.items.filter((agent) => agent.needsAttention || agent.status === "waiting_input" || agent.status === "blocked" || agent.status === "failed");
  const activeAgents = agents.items.filter((agent) => agent.status === "running" || agent.status === "waiting_input" || agent.status === "blocked");
  const leadAgent = attentionAgents[0] ?? activeAgents[0] ?? agents.items[0];
  const leadApproval = agents.pendingApprovals[0];

  const loadThreads = useCallback(() => {
    void actions.loadAiThreads().catch(() => undefined);
  }, [actions]);

  useEffect(() => {
    if (didLoadThreads.current) {
      return;
    }
    didLoadThreads.current = true;
    loadThreads();
  }, [loadThreads]);

  useEffect(() => {
    if (didLoadAgents.current) {
      return;
    }
    didLoadAgents.current = true;
    void actions.loadAgentProfiles().catch(() => undefined);
    void actions.loadAgents().catch(() => undefined);
  }, [actions]);

  const createThread = async () => {
    setCreating(true);
    try {
      const thread = await actions.createAiThread();
      router.push(threadHref(thread.id));
    } catch {
      // App state owns the user-facing AI error message.
    } finally {
      setCreating(false);
    }
  };

  const respondToApproval = async (approval: AgentApprovalRequest, accepted: boolean) => {
    setRespondingApprovalId(approval.id);
    try {
      await actions.respondToAgentApproval(approval.id, accepted);
    } catch {
      // App state owns the user-facing error message.
    } finally {
      setRespondingApprovalId(undefined);
    }
  };

  return (
    <Screen>
      <PageHeader title="Home" />
      <ScreenScrollView contentContainerClassName="gap-6 px-4 pb-5 pt-2">
        <View className="gap-4">
          <View className="flex-row items-start justify-between gap-4">
            <View className="min-w-0 flex-1 gap-1">
              <Text className="text-xl font-bold text-foreground dark:text-slate-100">Ask Nexus</Text>
              <Text className="text-sm leading-5 text-muted-foreground dark:text-slate-400">Start a focused chat or continue recent operational work.</Text>
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Start new chat"
              className="size-12 items-center justify-center rounded-full bg-primary"
              disabled={creating}
              onPress={() => {
                void createThread();
              }}
            >
              {creating ? <ActivityIndicator color={colors.primaryForeground} /> : <MessageCirclePlus color={colors.primaryForeground} size={22} />}
            </Pressable>
          </View>
          {latestThread ? <ThreadAction thread={latestThread} onOpenActions={() => setActionThread(latestThread)} /> : null}
        </View>

        <SectionHeader title="Agent command" actionLabel="Agents" accessibilityLabel="Open agents" onPress={() => router.push("/(tabs)/agents" as Href)} />
        <View className="gap-3">
          <View className="flex-row flex-wrap gap-2">
            <AgentMetric label="Approvals" value={agents.pendingApprovals.length} urgent={agents.pendingApprovals.length > 0} />
            <AgentMetric label="Waiting" value={agents.items.filter((agent) => agent.status === "waiting_input").length} urgent />
            <AgentMetric label="Blocked" value={agents.items.filter((agent) => agent.status === "blocked").length} urgent />
            <AgentMetric label="Active" value={activeAgents.length} />
          </View>
          {leadApproval ? (
            <View className="gap-2">
              <View className="flex-row items-center gap-2">
                <ShieldAlert color="#dc2626" size={18} />
                <Text className="text-sm font-semibold text-foreground dark:text-slate-100">Needs approval</Text>
              </View>
              <ApprovalCard approval={leadApproval} compact submitting={respondingApprovalId === leadApproval.id} onRespond={respondToApproval} />
            </View>
          ) : leadAgent ? (
            <AgentCompactRow agent={leadAgent} trailing="status" onPress={() => router.push(agentHref(leadAgent.id))} />
          ) : (
            <Pressable accessibilityRole="button" accessibilityLabel="Open agents" className="flex-row items-center justify-between gap-3 border-y border-border py-4 dark:border-neutral-800" onPress={() => router.push("/(tabs)/agents" as Href)}>
              <View className="min-w-0 flex-1 flex-row items-center gap-3">
                <View className="size-10 items-center justify-center rounded-full bg-muted dark:bg-slate-800">
                  <Workflow color={colors.icon} size={19} />
                </View>
                <View className="min-w-0 flex-1 gap-1">
                  <Text className="text-sm font-semibold text-foreground dark:text-slate-100">No active agents</Text>
                  <Text className="text-sm leading-5 text-muted-foreground dark:text-slate-400" numberOfLines={2}>Spawn or stage an agent when you need mobile oversight.</Text>
                </View>
              </View>
              <ChevronRight color={colors.muted} size={17} />
            </Pressable>
          )}
          {agents.error && !agents.apiUnavailable ? <Text className="text-sm text-red-600 dark:text-red-400">{agents.error}</Text> : null}
        </View>

        <SectionHeader title="Continue" actionLabel="All chats" accessibilityLabel="Open all AI chats" onPress={() => router.push("/(tabs)/chat" as Href)} />
        <View className="gap-0">
          {aiChat.error ? <Text className="pb-3 text-sm text-red-600 dark:text-red-400">{aiChat.error}</Text> : null}
          {aiChat.isLoadingThreads && !recentThreads.length ? (
            <View className="flex-row items-center gap-2 py-3">
              <ActivityIndicator color={colors.icon} />
              <Text className="text-sm text-muted-foreground dark:text-slate-400">Loading chats</Text>
            </View>
          ) : recentThreads.length ? (
            recentThreads.map((thread, index) => (
              <ThreadRow key={thread.id} bordered={index < recentThreads.length - 1} thread={thread} onOpenActions={() => setActionThread(thread)} />
            ))
          ) : (
            <EmptyPrompt
              icon={<MessageCirclePlus color={colors.muted} size={22} />}
              title="No chats yet"
              body="Start with Nexus when you need an answer, plan, or operational summary."
              actionLabel={creating ? "Starting..." : "Start chat"}
              disabled={creating}
              onPress={() => {
                void createThread();
              }}
            />
          )}
        </View>

        <SectionHeader title="Activity" actionLabel="Inbox" accessibilityLabel="Open inbox" onPress={() => router.push("/(tabs)/inbox" as Href)} />
        <Pressable accessibilityRole="button" accessibilityLabel="Open agents" className="flex-row items-center justify-between gap-3 border-y border-border py-4 dark:border-neutral-800" onPress={() => router.push("/(tabs)/agents" as Href)}>
          <View className="min-w-0 flex-1 flex-row items-center gap-3">
            <View className="size-10 items-center justify-center rounded-full bg-muted dark:bg-slate-800">
              <Workflow color={colors.icon} size={19} />
            </View>
            <View className="min-w-0 flex-1 gap-1">
              <Text className="text-sm font-semibold text-foreground dark:text-slate-100">Agent command stream</Text>
              <Text className="text-sm leading-5 text-muted-foreground dark:text-slate-400" numberOfLines={2}>
                Running agents, approvals, and blackboard updates route through Agents and Inbox.
              </Text>
            </View>
          </View>
          <View className="items-end gap-2">
            <Badge variant={agents.pendingApprovals.length ? "default" : "outline"}>{agents.pendingApprovals.length ? `${agents.pendingApprovals.length} approvals` : `${agents.items.length} agents`}</Badge>
            <ChevronRight color={colors.muted} size={17} />
          </View>
        </Pressable>

        <SectionHeader title="System" actionLabel="Details" accessibilityLabel="Open settings" onPress={() => router.push("/(tabs)/settings" as Href)} />
        <View className="gap-2">
          <View className="flex-row flex-wrap gap-2 pb-1">
            <StatusBadge label="Auth" value={session.isAuthenticated ? "Signed in" : "Guest"} healthy={session.isAuthenticated} />
            <StatusBadge label="Realtime" value={realtime.status} healthy={realtime.status === "connected"} />
            <StatusBadge label="Push" value={push.permissionStatus} healthy={push.permissionStatus === "registered"} />
            <StatusBadge label="Polling" value={polling.status} healthy={polling.status === "running"} />
            <StatusBadge label="Updates" value={updates.status} healthy={updates.status === "current" || updates.status === "idle"} />
          </View>
          <StatusRow icon={ShieldCheck} label="Auth" value={session.isAuthenticated ? "Signed in" : "Guest"} iconColor={colors.icon} />
          <StatusRow icon={Radio} label="Realtime" value={realtime.detail ?? realtime.status} iconColor={colors.icon} />
          <StatusRow icon={Smartphone} label="Push" value={push.permissionStatus} iconColor={colors.icon} />
          <StatusRow icon={Activity} label="Polling" value={polling.status} iconColor={colors.icon} />
          <StatusRow icon={RefreshCcw} label="Updates" value={updates.status} iconColor={colors.icon} />
        </View>
      </ScreenScrollView>
      <ActionSheet
        actions={[
          {
            label: "Delete chat",
            accessibilityLabel: "Delete AI chat",
            destructive: true,
            icon: Trash2,
            onPress: () => {
              if (actionThread) {
                void actions.deleteAiThread(actionThread.id).catch(() => undefined);
              }
            }
          }
        ]}
        description="This removes the chat history from Pulse and Nexus."
        onClose={() => setActionThread(undefined)}
        title={actionThread?.title ?? "Chat actions"}
        visible={Boolean(actionThread)}
      />
    </Screen>
  );
}

function AgentMetric({ label, value, urgent = false }: { label: string; value: number; urgent?: boolean }) {
  const activeUrgent = urgent && value > 0;
  return (
    <View className={cn("min-w-[47%] flex-1 rounded-md border border-border bg-card p-3 dark:border-neutral-800 dark:bg-black", activeUrgent && "border-amber-300 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/30")}>
      <View className="flex-row items-center justify-between gap-2">
        <Text className={cn("text-2xl font-bold text-foreground dark:text-slate-100", activeUrgent && "text-amber-700 dark:text-amber-300")}>{value}</Text>
        {activeUrgent ? <AlertCircle color="#d97706" size={17} /> : null}
      </View>
      <Text className="text-xs font-semibold uppercase text-muted-foreground dark:text-slate-400">{label}</Text>
    </View>
  );
}

function SectionHeader({
  title,
  actionLabel,
  accessibilityLabel,
  onPress
}: {
  title: string;
  actionLabel: string;
  accessibilityLabel: string;
  onPress: () => void;
}) {
  const { colors } = useTheme();
  return (
    <View className="flex-row items-center justify-between gap-3">
      <Text className="text-base font-semibold text-foreground dark:text-slate-100">{title}</Text>
      <Pressable accessibilityRole="button" accessibilityLabel={accessibilityLabel} className="flex-row items-center gap-1" onPress={onPress}>
        <Text className="text-sm font-semibold text-primary">{actionLabel}</Text>
        <ChevronRight color={colors.primary} size={16} />
      </Pressable>
    </View>
  );
}

function EmptyPrompt({
  icon,
  title,
  body,
  actionLabel,
  disabled,
  onPress
}: {
  icon: ReactNode;
  title: string;
  body: string;
  actionLabel: string;
  disabled: boolean;
  onPress: () => void;
}) {
  return (
    <View className="items-center gap-2 border-y border-dashed border-border py-6 dark:border-neutral-800">
      {icon}
      <Text className="text-sm font-medium text-foreground dark:text-slate-100">{title}</Text>
      <Text className="max-w-[280px] text-center text-sm leading-5 text-muted-foreground dark:text-slate-400">{body}</Text>
      <Button className="mt-1" disabled={disabled} onPress={onPress}>
        {actionLabel}
      </Button>
    </View>
  );
}

function ThreadAction({ thread, onOpenActions }: { thread: AiChatThread; onOpenActions: () => void }) {
  const { colors } = useTheme();
  const openActionsFromLongPress = () => {
    triggerLongPressFeedback();
    onOpenActions();
  };
  const openActionsFromButton = () => {
    triggerTapFeedback();
    onOpenActions();
  };

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Continue ${thread.title}`}
      className="-mx-4 flex-row items-center justify-between gap-3 border-y border-teal-200 bg-teal-50 px-4 py-3 dark:border-teal-950 dark:bg-teal-950/30"
      onLongPress={openActionsFromLongPress}
      onPress={() => router.push(threadHref(thread.id))}
    >
      <View className="min-w-0 flex-1">
        <Text className="text-sm font-semibold text-foreground dark:text-slate-100" numberOfLines={1}>
          Continue: {thread.title}
        </Text>
        <Text className="text-xs text-teal-700 dark:text-teal-200" numberOfLines={1}>
          {thread.preview || "No messages yet"}
        </Text>
      </View>
      <Pressable accessibilityRole="button" accessibilityLabel={`Open actions for ${thread.title}`} className="size-9 items-center justify-center rounded-full bg-teal-100 dark:bg-teal-900" onPress={openActionsFromButton}>
        <MoreVertical color={colors.icon} size={18} />
      </Pressable>
    </Pressable>
  );
}

function ThreadRow({ thread, bordered, onOpenActions }: { thread: AiChatThread; bordered: boolean; onOpenActions: () => void }) {
  const { colors } = useTheme();
  const openActionsFromLongPress = () => {
    triggerLongPressFeedback();
    onOpenActions();
  };
  const openActionsFromButton = () => {
    triggerTapFeedback();
    onOpenActions();
  };

  return (
    <Pressable accessibilityRole="button" accessibilityLabel={`Open ${thread.title}`} className={cn("py-3", bordered && "border-b border-border dark:border-neutral-800")} onLongPress={openActionsFromLongPress} onPress={() => router.push(threadHref(thread.id))}>
      <View className="flex-row items-center justify-between gap-3">
        <View className="min-w-0 flex-1 flex-row items-center gap-3">
          <View className="size-9 items-center justify-center rounded-full bg-muted dark:bg-slate-800">
            <Bot color={colors.icon} size={18} />
          </View>
          <View className="min-w-0 flex-1">
            <Text className="text-sm font-semibold text-foreground dark:text-slate-100" numberOfLines={1}>
              {thread.title}
            </Text>
            <Text className="text-sm text-muted-foreground dark:text-slate-400" numberOfLines={1}>
              {thread.preview || "No messages yet"}
            </Text>
          </View>
        </View>
        <View className="items-end gap-1">
          <Text className="text-xs text-muted-foreground dark:text-slate-400">{formatThreadTime(thread.lastActivityAt)}</Text>
          {thread.status === "streaming" ? <Badge>Live</Badge> : thread.unreadCount ? <Badge variant="secondary">{thread.unreadCount}</Badge> : <ChevronRight color={colors.muted} size={17} />}
        </View>
        <Pressable accessibilityRole="button" accessibilityLabel={`Open actions for ${thread.title}`} className="size-9 items-center justify-center rounded-full bg-muted dark:bg-slate-800" onPress={openActionsFromButton}>
          <MoreVertical color={colors.muted} size={18} />
        </Pressable>
      </View>
    </Pressable>
  );
}

function StatusBadge({ label, value, healthy }: { label: string; value: string; healthy: boolean }) {
  return (
    <Badge variant={healthy ? "secondary" : "outline"} className={cn(!healthy && "border-red-200 text-red-700 dark:border-red-900 dark:text-red-300")}>
      {label}: {value}
    </Badge>
  );
}

function StatusRow({
  icon: Icon,
  label,
  value,
  iconColor
}: {
  icon: React.ComponentType<{ color: string; size: number }>;
  label: string;
  value: string;
  iconColor: string;
}) {
  return (
    <View className="flex-row items-center justify-between gap-3">
      <View className="flex-row items-center gap-2">
        <Icon color={iconColor} size={18} />
        <Text className="text-sm font-medium text-foreground dark:text-slate-100">{label}</Text>
      </View>
      <Text className="text-sm text-muted-foreground dark:text-slate-400">{value}</Text>
    </View>
  );
}

function threadHref(threadId: string): Href {
  return { pathname: "/(tabs)/chat/[threadId]", params: { threadId } } as unknown as Href;
}

function agentHref(agentId: string): Href {
  return { pathname: "/(tabs)/agents/[agentId]", params: { agentId } } as unknown as Href;
}

function formatThreadTime(value?: string) {
  if (!value) {
    return "";
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}
