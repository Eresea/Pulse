import { Activity, Bot, ChevronRight, MessageCirclePlus, MoreVertical, Radio, RefreshCcw, ShieldCheck, Smartphone, Trash2, Workflow } from "lucide-react-native";
import { router } from "expo-router";
import type { Href } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { ActivityIndicator, Pressable, Text, View } from "react-native";
import { Screen, ScreenScrollView } from "@/components/screen";
import { ActionSheet } from "@/components/ui/action-sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/drawer-shell";
import { cn } from "@/lib/cn";
import { triggerLongPressFeedback, triggerTapFeedback } from "@/lib/tactile-feedback";
import type { AiChatThread } from "@/services/types";
import { useAppState } from "@/state/app-state";
import { useTheme } from "@/theme/theme";

export default function HomeScreen() {
  const { session, realtime, push, polling, updates, aiChat, agents, actions } = useAppState();
  const { colors } = useTheme();
  const [creating, setCreating] = useState(false);
  const [actionThread, setActionThread] = useState<AiChatThread | undefined>();
  const didLoadThreads = useRef(false);
  const recentThreads = aiChat.threads.slice(0, 5);
  const latestThread = recentThreads[0];

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

  return (
    <Screen>
      <PageHeader title="Home" />
      <ScreenScrollView>
        <Card className="overflow-hidden">
          <CardContent className="gap-4 p-4">
            <View className="flex-row items-start gap-3">
              <View className="size-11 items-center justify-center rounded-full bg-primary">
                <Bot color={colors.primaryForeground} size={22} />
              </View>
              <View className="min-w-0 flex-1 gap-1">
                <Text className="text-xl font-bold text-foreground dark:text-slate-100">Ask Nexus</Text>
                <Text className="text-sm text-muted-foreground dark:text-slate-400">
                  Start a focused chat or continue where you left off.
                </Text>
              </View>
            </View>

            <View className="gap-2">
              <Button
                className="h-12"
                disabled={creating}
                onPress={() => {
                  void createThread();
                }}
              >
                {creating ? "Starting..." : "Start new chat"}
              </Button>
              {latestThread ? <ThreadAction thread={latestThread} onOpenActions={() => setActionThread(latestThread)} /> : null}
            </View>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <View className="flex-row items-center justify-between gap-3">
              <CardTitle>Continue</CardTitle>
              <Pressable accessibilityRole="button" accessibilityLabel="Open all AI chats" className="flex-row items-center gap-1" onPress={() => router.push("/(tabs)/chat" as Href)}>
                <Text className="text-sm font-semibold text-primary">All chats</Text>
                <ChevronRight color={colors.primary} size={16} />
              </Pressable>
            </View>
          </CardHeader>
          <CardContent className="gap-2">
            {aiChat.error ? <Text className="text-sm text-red-600 dark:text-red-400">{aiChat.error}</Text> : null}
            {aiChat.isLoadingThreads && !recentThreads.length ? (
              <View className="flex-row items-center gap-2 py-2">
                <ActivityIndicator color={colors.icon} />
                <Text className="text-sm text-muted-foreground dark:text-slate-400">Loading chats</Text>
              </View>
            ) : recentThreads.length ? (
              recentThreads.map((thread) => <ThreadRow key={thread.id} thread={thread} onOpenActions={() => setActionThread(thread)} />)
            ) : (
              <View className="items-center gap-2 rounded-md border border-dashed border-border bg-background p-5 dark:border-neutral-800 dark:bg-black">
                <MessageCirclePlus color={colors.muted} size={22} />
                <Text className="text-sm font-medium text-foreground dark:text-slate-100">No chats yet</Text>
                <Text className="text-center text-sm text-muted-foreground dark:text-slate-400">
                  Start with Nexus when you need an answer, plan, or operational summary.
                </Text>
                <Button
                  className="mt-1"
                  disabled={creating}
                  onPress={() => {
                    void createThread();
                  }}
                >
                  {creating ? "Starting..." : "Start chat"}
                </Button>
              </View>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Activity</CardTitle>
          </CardHeader>
          <CardContent className="gap-3">
            <View className="flex-row items-center justify-between gap-3">
              <View className="min-w-0 flex-1 flex-row items-center gap-2">
                <Workflow color={colors.icon} size={18} />
                <Text className="text-sm font-medium text-foreground dark:text-slate-100">Agent command stream</Text>
              </View>
              <Badge variant={agents.pendingApprovals.length ? "default" : "outline"}>{agents.pendingApprovals.length ? `${agents.pendingApprovals.length} approvals` : `${agents.items.length} agents`}</Badge>
            </View>
            <Text className="text-sm text-muted-foreground dark:text-slate-400">
              Running agents, approval requests, and blackboard updates are routed into the Agents surface.
            </Text>
            <Pressable accessibilityRole="button" accessibilityLabel="Open agents" className="h-11 flex-row items-center justify-between rounded-md border border-border px-3 dark:border-neutral-800" onPress={() => router.push("/(tabs)/agents" as Href)}>
              <Text className="text-sm font-semibold text-foreground dark:text-slate-100">Open Agents</Text>
              <ChevronRight color={colors.muted} size={18} />
            </Pressable>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <View className="flex-row items-center justify-between gap-3">
              <CardTitle>System status</CardTitle>
              <Pressable accessibilityRole="button" accessibilityLabel="Open settings" className="flex-row items-center gap-1" onPress={() => router.push("/(tabs)/settings" as Href)}>
                <Text className="text-sm font-semibold text-primary">Details</Text>
                <ChevronRight color={colors.primary} size={16} />
              </Pressable>
            </View>
          </CardHeader>
          <CardContent className="gap-3">
            <View className="flex-row flex-wrap gap-2">
              <StatusBadge label="Auth" value={session.isAuthenticated ? "Signed in" : "Guest"} healthy={session.isAuthenticated} />
              <StatusBadge label="Realtime" value={realtime.status} healthy={realtime.status === "connected"} />
              <StatusBadge label="Push" value={push.permissionStatus} healthy={push.permissionStatus === "registered"} />
              <StatusBadge label="Polling" value={polling.status} healthy={polling.status === "running"} />
              <StatusBadge label="Updates" value={updates.status} healthy={updates.status === "current" || updates.status === "idle"} />
            </View>
            <View className="gap-2">
              <StatusRow icon={ShieldCheck} label="Auth" value={session.isAuthenticated ? "Signed in" : "Guest"} iconColor={colors.icon} />
              <StatusRow icon={Radio} label="Realtime" value={realtime.detail ?? realtime.status} iconColor={colors.icon} />
              <StatusRow icon={Smartphone} label="Push" value={push.permissionStatus} iconColor={colors.icon} />
              <StatusRow icon={Activity} label="Polling" value={polling.status} iconColor={colors.icon} />
              <StatusRow icon={RefreshCcw} label="Updates" value={updates.status} iconColor={colors.icon} />
            </View>
          </CardContent>
        </Card>
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
      className="h-12 flex-row items-center justify-between gap-3 rounded-md border border-border bg-card px-3 dark:border-neutral-800 dark:bg-black"
      onLongPress={openActionsFromLongPress}
      onPress={() => router.push(threadHref(thread.id))}
    >
      <View className="min-w-0 flex-1">
        <Text className="text-sm font-semibold text-foreground dark:text-slate-100" numberOfLines={1}>
          Continue: {thread.title}
        </Text>
        <Text className="text-xs text-muted-foreground dark:text-slate-400" numberOfLines={1}>
          {thread.preview || "No messages yet"}
        </Text>
      </View>
      <Pressable accessibilityRole="button" accessibilityLabel={`Open actions for ${thread.title}`} className="size-9 items-center justify-center rounded-full bg-muted dark:bg-slate-800" onPress={openActionsFromButton}>
        <MoreVertical color={colors.muted} size={18} />
      </Pressable>
    </Pressable>
  );
}

function ThreadRow({ thread, onOpenActions }: { thread: AiChatThread; onOpenActions: () => void }) {
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
    <Pressable accessibilityRole="button" accessibilityLabel={`Open ${thread.title}`} className="rounded-md border border-border bg-background p-3 dark:border-neutral-800 dark:bg-black" onLongPress={openActionsFromLongPress} onPress={() => router.push(threadHref(thread.id))}>
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
