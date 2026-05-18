import { Bot, MessageCirclePlus } from "lucide-react-native";
import { router } from "expo-router";
import type { Href } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { ActivityIndicator, Pressable, Text, View } from "react-native";
import { PageHeader } from "@/components/drawer-shell";
import { Screen, ScreenScrollView } from "@/components/screen";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { AiChatThread } from "@/services/types";
import { useAppState } from "@/state/app-state";
import { useTheme } from "@/theme/theme";

export default function AiChatScreen() {
  const { aiChat, actions } = useAppState();
  const { colors } = useTheme();
  const [creating, setCreating] = useState(false);
  const didLoadThreads = useRef(false);

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
      <PageHeader title="AI Chat" />
      <ScreenScrollView>
        <View className="flex-row items-start justify-between gap-4">
          <Text className="min-w-0 flex-1 text-base text-muted-foreground dark:text-slate-400">
            Focused Nexus conversations for Roots work.
          </Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Start new AI chat"
            className="size-11 items-center justify-center rounded-full bg-primary"
            disabled={creating}
            onPress={() => {
              void createThread();
            }}
          >
            {creating ? <ActivityIndicator color={colors.primaryForeground} /> : <MessageCirclePlus color={colors.primaryForeground} size={21} />}
          </Pressable>
        </View>

        {aiChat.error ? <Text className="text-sm text-red-600 dark:text-red-400">{aiChat.error}</Text> : null}

        {aiChat.isLoadingThreads && !aiChat.threads.length ? (
          <View className="flex-row items-center gap-2 py-2">
            <ActivityIndicator color={colors.icon} />
            <Text className="text-sm text-muted-foreground dark:text-slate-400">Loading AI threads</Text>
          </View>
        ) : null}

        {aiChat.threads.length ? (
          <View className="gap-3">
            {aiChat.threads.map((thread) => (
              <ThreadRow key={thread.id} thread={thread} />
            ))}
          </View>
        ) : !aiChat.isLoadingThreads ? (
          <View className="items-center gap-2 rounded-md border border-dashed border-border bg-card p-6 dark:border-neutral-800 dark:bg-black">
            <Bot color={colors.muted} size={24} />
            <Text className="text-sm font-medium text-foreground dark:text-slate-100">No AI threads yet</Text>
            <Text className="text-center text-sm text-muted-foreground dark:text-slate-400">
              Start a Nexus chat when you need a focused assistant thread.
            </Text>
            <Button className="mt-2" onPress={() => void createThread()}>
              {creating ? "Starting..." : "Start Chat"}
            </Button>
          </View>
        ) : null}
      </ScreenScrollView>
    </Screen>
  );
}

function ThreadRow({ thread }: { thread: AiChatThread }) {
  const { colors } = useTheme();

  return (
    <Pressable accessibilityRole="button" onPress={() => router.push(threadHref(thread.id))}>
      <Card>
        <CardContent className="gap-3 p-4">
          <View className="flex-row items-center justify-between gap-3">
            <View className="min-w-0 flex-1 flex-row items-center gap-3">
              <View className="size-10 items-center justify-center rounded-full bg-muted dark:bg-slate-800">
                <Bot color={colors.icon} size={19} />
              </View>
              <View className="min-w-0 flex-1">
                <Text className="text-base font-semibold text-foreground dark:text-slate-100" numberOfLines={1}>
                  {thread.title}
                </Text>
                <Text className="text-sm text-muted-foreground dark:text-slate-400" numberOfLines={1}>
                  {thread.preview || "No messages yet"}
                </Text>
              </View>
            </View>
            <View className="items-end gap-2">
              <Text className="text-xs text-muted-foreground dark:text-slate-400">{formatThreadTime(thread.lastActivityAt)}</Text>
              {thread.status === "streaming" ? <Badge>Live</Badge> : thread.unreadCount ? <Badge variant="secondary">{thread.unreadCount}</Badge> : null}
            </View>
          </View>
        </CardContent>
      </Card>
    </Pressable>
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
