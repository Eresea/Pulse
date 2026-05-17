import { ArrowLeft, Bot, SendHorizontal } from "lucide-react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { cn } from "@/lib/cn";
import type { AiChatMessage } from "@/services/types";
import { useAppState } from "@/state/app-state";
import { useTheme } from "@/theme/theme";

export default function AiChatThreadScreen() {
  const params = useLocalSearchParams<{ threadId?: string }>();
  const threadId = Array.isArray(params.threadId) ? params.threadId[0] : params.threadId;
  const { aiChat, actions } = useAppState();
  const { colors } = useTheme();
  const scrollRef = useRef<ScrollView>(null);
  const [draft, setDraft] = useState("");
  const [sendError, setSendError] = useState<string | undefined>();
  const messages = threadId ? aiChat.messagesByThread[threadId] ?? [] : [];
  const lastMessageContent = messages.at(-1)?.content;
  const thread = aiChat.threads.find((item) => item.id === threadId);
  const isStreaming = Boolean(threadId && aiChat.streamingThreadId === threadId);
  const isLoading = Boolean(threadId && aiChat.loadingThreadId === threadId && !messages.length);
  const canSend = Boolean(threadId && draft.trim() && !isStreaming);

  const loadMessages = useCallback(() => {
    if (!threadId || aiChat.messagesByThread[threadId]) {
      return;
    }
    void actions.loadAiMessages(threadId).catch(() => undefined);
  }, [actions, aiChat.messagesByThread, threadId]);

  useEffect(() => {
    loadMessages();
  }, [loadMessages]);

  useEffect(() => {
    requestAnimationFrame(() => scrollRef.current?.scrollToEnd({ animated: true }));
  }, [lastMessageContent, messages.length]);

  const title = useMemo(() => thread?.title || "AI Chat", [thread?.title]);

  const sendMessage = async () => {
    if (!canSend || !threadId) {
      return;
    }
    const content = draft.trim();
    setDraft("");
    setSendError(undefined);
    try {
      await actions.sendAiMessage(threadId, content);
    } catch (err) {
      setSendError(err instanceof Error ? err.message : "Could not send message.");
      setDraft(content);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-background dark:bg-black" edges={["top", "bottom"]}>
      <KeyboardAvoidingView className="flex-1" behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <View className="flex-row items-center gap-3 px-4 pb-2 pt-2">
          <Pressable accessibilityRole="button" accessibilityLabel="Back to AI threads" className="size-11 items-center justify-center rounded-full border border-border bg-card dark:border-neutral-800 dark:bg-black" onPress={() => router.back()}>
            <ArrowLeft color={colors.foreground} size={20} />
          </Pressable>
          <View className="min-w-0 flex-1">
            <Text className="text-2xl font-bold text-foreground dark:text-slate-100" numberOfLines={1}>
              {title}
            </Text>
            <Text className="text-sm text-muted-foreground dark:text-slate-400">{isStreaming ? "Nexus is responding" : "Nexus AI"}</Text>
          </View>
        </View>

        <ScrollView ref={scrollRef} className="flex-1" contentContainerClassName="gap-3 px-4 pb-4 pt-2" keyboardShouldPersistTaps="handled">
          {isLoading ? (
            <View className="flex-row items-center gap-2 py-2">
              <ActivityIndicator color={colors.icon} />
              <Text className="text-sm text-muted-foreground dark:text-slate-400">Loading messages</Text>
            </View>
          ) : null}

          {!isLoading && !messages.length ? (
            <View className="items-center gap-2 rounded-md border border-dashed border-border bg-card p-6 dark:border-neutral-800 dark:bg-black">
              <Bot color={colors.muted} size={24} />
              <Text className="text-sm font-medium text-foreground dark:text-slate-100">Start the conversation</Text>
              <Text className="text-center text-sm text-muted-foreground dark:text-slate-400">
                Ask Nexus for a focused answer, plan, or operational summary.
              </Text>
            </View>
          ) : null}

          {messages.map((message) => (
            <MessageBubble key={message.id} message={message} />
          ))}
        </ScrollView>

        <View className="border-t border-border bg-background px-4 py-3 dark:border-neutral-800 dark:bg-black">
          {sendError || aiChat.error ? <Text className="mb-2 text-sm text-red-600 dark:text-red-400">{sendError ?? aiChat.error}</Text> : null}
          <View className="flex-row items-end gap-2">
            <View className="max-h-32 min-h-11 flex-1 rounded-md border border-input bg-card px-3 py-2 dark:border-neutral-800 dark:bg-black">
              <TextInput
                accessibilityLabel="Message Nexus AI"
                className="p-0 text-base text-foreground dark:text-slate-100"
                editable={!isStreaming}
                multiline
                onChangeText={setDraft}
                onSubmitEditing={() => {
                  if (Platform.OS !== "ios") {
                    void sendMessage();
                  }
                }}
                placeholder="Message Nexus"
                placeholderTextColor={colors.muted}
                returnKeyType="send"
                selectionColor={colors.primary}
                style={{ maxHeight: 112, backgroundColor: "transparent", textAlignVertical: "top" }}
                value={draft}
              />
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Send message"
              className={cn("size-11 items-center justify-center rounded-full", canSend ? "bg-primary" : "bg-muted dark:bg-slate-800")}
              disabled={!canSend}
              onPress={() => {
                void sendMessage();
              }}
            >
              {isStreaming ? <ActivityIndicator color={colors.primaryForeground} /> : <SendHorizontal color={canSend ? colors.primaryForeground : colors.muted} size={19} />}
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function MessageBubble({ message }: { message: AiChatMessage }) {
  const isUser = message.role === "user";
  const isPending = message.status === "sending" || message.status === "streaming";
  const isError = message.status === "error";

  return (
    <View className={cn("max-w-[86%] gap-1", isUser ? "self-end items-end" : "self-start items-start")}>
      <View
        className={cn(
          "rounded-lg border px-3 py-2",
          isUser ? "border-primary bg-primary" : "border-border bg-card dark:border-neutral-800 dark:bg-black",
          isError && "border-red-500"
        )}
      >
        <Text className={cn("text-base leading-6", isUser ? "text-primary-foreground" : "text-foreground dark:text-slate-100")}>
          {message.content || (isPending ? "Thinking..." : "")}
        </Text>
      </View>
      {isPending || isError ? (
        <Text className={cn("text-xs", isError ? "text-red-600 dark:text-red-400" : "text-muted-foreground dark:text-slate-400")}>
          {isError ? "Not delivered" : message.status === "streaming" ? "Streaming" : "Sending"}
        </Text>
      ) : null}
    </View>
  );
}
