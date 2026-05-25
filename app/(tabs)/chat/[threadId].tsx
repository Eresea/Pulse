import * as DocumentPicker from "expo-document-picker";
import * as Clipboard from "expo-clipboard";
import { ArrowLeft, Bot, Check, File, Pencil, Plus, SendHorizontal, X } from "lucide-react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Animated, Easing, FlatList, Keyboard, KeyboardAvoidingView, NativeScrollEvent, NativeSyntheticEvent, Platform, Pressable, ScrollView, Text, TextInput, useWindowDimensions, View } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { MessageRenderer } from "@/components/ai-chat/message-renderer";
import { ConfirmationCard, ErrorCard, FileEventCard, MessageActionButton, ReferenceEventCard, StatusCard, ToolCallCard, ToolResultCard } from "@/components/ai-chat/timeline-cards";
import { cn } from "@/lib/cn";
import type { AiChatMessage, AiChatModel, AiChatTimelineEvent } from "@/services/types";
import { useAppState } from "@/state/app-state";
import { useTheme } from "@/theme/theme";

type ComposerAttachment = {
  id: string;
  name: string;
  size?: number;
  mimeType?: string;
  uri: string;
  fileId?: string;
  status: "local" | "uploading" | "ready" | "error";
  error?: string;
};

const KEYBOARD_COMPOSER_GAP = 12;

export default function AiChatThreadScreen() {
  const params = useLocalSearchParams<{ threadId?: string }>();
  const threadId = Array.isArray(params.threadId) ? params.threadId[0] : params.threadId;
  const { aiChat, actions } = useAppState();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { height: windowHeight, width: windowWidth } = useWindowDimensions();
  const listRef = useRef<FlatList<TimelineItem>>(null);
  const stickToBottomRef = useRef(true);
  const didLoadModels = useRef(false);
  const [draft, setDraft] = useState("");
  const [sendError, setSendError] = useState<string | undefined>();
  const [attachments, setAttachments] = useState<ComposerAttachment[]>([]);
  const [submittingConfirmationId, setSubmittingConfirmationId] = useState<string | undefined>();
  const [attachmentMenuOpen, setAttachmentMenuOpen] = useState(false);
  const [keyboardOverlap, setKeyboardOverlap] = useState(0);
  const [renaming, setRenaming] = useState(false);
  const [renameDraft, setRenameDraft] = useState("");
  const [renameSaving, setRenameSaving] = useState(false);
  const [composerHeight, setComposerHeight] = useState(0);
  const messages = useMemo(() => (threadId ? aiChat.messagesByThread[threadId] ?? [] : []), [aiChat.messagesByThread, threadId]);
  const timelineEvents = useMemo(() => (threadId ? aiChat.timelineEventsByThread[threadId] ?? [] : []), [aiChat.timelineEventsByThread, threadId]);
  const lastMessageContent = messages.at(-1)?.content;
  const timelineItems = useMemo(() => buildTimeline(messages, timelineEvents), [messages, timelineEvents]);
  const thread = aiChat.threads.find((item) => item.id === threadId);
  const isStreaming = Boolean(threadId && aiChat.streamingThreadId === threadId);
  const isLoading = Boolean(threadId && aiChat.loadingThreadId === threadId && !messages.length);
  const canSend = Boolean(threadId && draft.trim() && !isStreaming);
  const selectedModel = aiChat.models.find((model) => model.id === aiChat.selectedModelId);

  const loadMessages = useCallback(() => {
    if (!threadId) {
      return;
    }
    if (!aiChat.messagesByThread[threadId]) {
      void actions.loadAiMessages(threadId).catch(() => undefined);
    }
    if (!aiChat.timelineEventsByThread[threadId]) {
      void actions.loadAiTimelineEvents(threadId).catch(() => undefined);
    }
  }, [actions, aiChat.messagesByThread, aiChat.timelineEventsByThread, threadId]);

  useEffect(() => {
    loadMessages();
  }, [loadMessages]);

  useEffect(() => {
    if (didLoadModels.current) {
      return;
    }
    didLoadModels.current = true;
    void actions.loadAiModels().catch(() => undefined);
  }, [actions]);

  useEffect(() => {
    requestAnimationFrame(() => listRef.current?.scrollToEnd({ animated: true }));
  }, [lastMessageContent, messages.length]);

  useEffect(() => {
    if (Platform.OS !== "android") {
      return;
    }

    const showSubscription = Keyboard.addListener("keyboardDidShow", (event) => {
      setKeyboardOverlap(Math.max(0, windowHeight - event.endCoordinates.screenY));
    });
    const hideSubscription = Keyboard.addListener("keyboardDidHide", () => {
      setKeyboardOverlap(0);
    });

    return () => {
      showSubscription.remove();
      hideSubscription.remove();
    };
  }, [windowHeight]);

  const title = useMemo(() => thread?.title || "AI Chat", [thread?.title]);
  const composerBottomPadding = Platform.OS === "android" && keyboardOverlap > 0 ? Math.max(8, keyboardOverlap - insets.bottom + KEYBOARD_COMPOSER_GAP) : 12;

  const sendMessage = async () => {
    if (!canSend || !threadId) {
      return;
    }
    const content = draft.trim();
    setSendError(undefined);
    stickToBottomRef.current = true;
    try {
      const uploadedAttachments = await uploadPendingAttachments();
      setDraft("");
      await actions.sendAiMessage(threadId, content, uploadedAttachments.map((attachment) => ({ fileId: attachment.fileId! })));
      setAttachments([]);
    } catch (err) {
      setSendError(err instanceof Error ? err.message : "Could not send message.");
      if (!draft.trim()) {
        setDraft(content);
      }
    }
  };

  const uploadPendingAttachments = async () => {
    const uploaded: ComposerAttachment[] = [];
    for (const attachment of attachments) {
      if (attachment.fileId) {
        uploaded.push(attachment);
        continue;
      }
      setAttachments((current) => current.map((item) => (item.id === attachment.id ? { ...item, status: "uploading", error: undefined } : item)));
      try {
        const file = await actions.uploadAiFile({ uri: attachment.uri, name: attachment.name, mimeType: attachment.mimeType });
        const nextAttachment = { ...attachment, fileId: file.id, status: "ready" as const, size: file.size ?? attachment.size, mimeType: file.mimeType ?? attachment.mimeType };
        uploaded.push(nextAttachment);
        setAttachments((current) => current.map((item) => (item.id === attachment.id ? nextAttachment : item)));
      } catch (err) {
        const message = err instanceof Error ? err.message : "Upload failed.";
        setAttachments((current) => current.map((item) => (item.id === attachment.id ? { ...item, status: "error", error: message } : item)));
        throw err;
      }
    }
    return uploaded;
  };

  const startRename = () => {
    setRenameDraft(title);
    setSendError(undefined);
    setRenaming(true);
  };

  const cancelRename = () => {
    setRenaming(false);
    setRenameDraft("");
  };

  const saveRename = async () => {
    const nextTitle = renameDraft.replace(/\s+/g, " ").trim();
    if (!threadId || !nextTitle || nextTitle === title) {
      cancelRename();
      return;
    }
    setRenameSaving(true);
    setSendError(undefined);
    try {
      await actions.renameAiThread(threadId, nextTitle);
      setRenaming(false);
      setRenameDraft("");
    } catch (err) {
      setSendError(err instanceof Error ? err.message : "Could not rename thread.");
    } finally {
      setRenameSaving(false);
    }
  };

  const retryFromMessage = async (message: AiChatMessage) => {
    if (!threadId || isStreaming) {
      return;
    }
    const messageIndex = messages.findIndex((item) => item.id === message.id);
    const prompt = [...messages.slice(0, Math.max(messageIndex, 0))].reverse().find((item) => item.role === "user")?.content;
    if (!prompt) {
      setSendError("Could not find the prompt to retry.");
      return;
    }
    setSendError(undefined);
    try {
      await actions.sendAiMessage(threadId, prompt);
    } catch (err) {
      setSendError(err instanceof Error ? err.message : "Could not retry message.");
    }
  };

  const pickFiles = async () => {
    setAttachmentMenuOpen(false);
    const result = await DocumentPicker.getDocumentAsync({
      copyToCacheDirectory: true,
      multiple: true
    });

    if (result.canceled) {
      return;
    }

    setAttachments((current) => [
      ...current,
      ...result.assets.map((asset) => ({
        id: `${asset.uri}-${asset.name}-${Date.now()}`,
        name: asset.name,
        size: asset.size,
        mimeType: asset.mimeType,
        uri: asset.uri,
        status: "local" as const
      }))
    ]);
  };

  const respondToConfirmation = async (confirmationId: string, accepted: boolean) => {
    setSubmittingConfirmationId(confirmationId);
    setSendError(undefined);
    try {
      await actions.respondToAiConfirmation(confirmationId, accepted);
      if (threadId) {
        await actions.loadAiTimelineEvents(threadId);
      }
    } catch (err) {
      setSendError(err instanceof Error ? err.message : "Could not submit confirmation.");
    } finally {
      setSubmittingConfirmationId(undefined);
    }
  };

  const removeAttachment = (id: string) => {
    setAttachments((current) => current.filter((attachment) => attachment.id !== id));
  };

  return (
    <SafeAreaView className="flex-1 bg-background dark:bg-black" edges={["top", "bottom"]}>
      <KeyboardAvoidingView className="flex-1" behavior={Platform.OS === "ios" ? "padding" : Platform.OS === "android" ? "height" : undefined}>
        <View className="flex-row items-center gap-3 px-4 pb-2 pt-2">
          <Pressable accessibilityRole="button" accessibilityLabel="Back to AI threads" className="size-11 items-center justify-center rounded-full border border-border bg-card dark:border-neutral-800 dark:bg-black" onPress={() => router.back()}>
            <ArrowLeft color={colors.foreground} size={20} />
          </Pressable>
          <View className="min-w-0 flex-1 gap-1">
            {renaming ? (
              <View className="flex-row items-center gap-2">
                <TextInput
                  accessibilityLabel="Thread title"
                  autoFocus
                  className="min-w-0 flex-1 rounded-md border border-input bg-card px-3 text-lg font-semibold text-foreground dark:border-neutral-800 dark:bg-black dark:text-slate-100"
                  editable={!renameSaving}
                  maxLength={120}
                  onChangeText={setRenameDraft}
                  onSubmitEditing={() => {
                    void saveRename();
                  }}
                  placeholder="Thread title"
                  placeholderTextColor={colors.muted}
                  returnKeyType="done"
                  selectionColor={colors.primary}
                  style={{ height: 44, lineHeight: 22, paddingBottom: 0, paddingTop: 0, textAlignVertical: "center" }}
                  value={renameDraft}
                />
                <Pressable accessibilityRole="button" accessibilityLabel="Save thread title" className="size-10 items-center justify-center rounded-full bg-primary" disabled={renameSaving} onPress={() => void saveRename()}>
                  {renameSaving ? <ActivityIndicator color={colors.primaryForeground} /> : <Check color={colors.primaryForeground} size={18} />}
                </Pressable>
                <Pressable accessibilityRole="button" accessibilityLabel="Cancel rename" className="size-10 items-center justify-center rounded-full border border-border bg-card dark:border-neutral-800 dark:bg-black" disabled={renameSaving} onPress={cancelRename}>
                  <X color={colors.foreground} size={18} />
                </Pressable>
              </View>
            ) : (
              <View className="flex-row items-center gap-2">
                <Text className="min-w-0 flex-1 text-2xl font-bold text-foreground dark:text-slate-100" numberOfLines={1}>
                  {title}
                </Text>
                <Pressable accessibilityRole="button" accessibilityLabel="Rename thread" className="size-9 items-center justify-center rounded-full bg-muted dark:bg-slate-800" onPress={startRename}>
                  <Pencil color={colors.muted} size={16} />
                </Pressable>
              </View>
            )}
            <Text className="text-sm text-muted-foreground dark:text-slate-400">{isStreaming ? "Nexus is responding" : "Nexus AI"}</Text>
          </View>
        </View>

        <View className="gap-2 px-4 pb-2">
          <View className="flex-row items-center justify-between gap-3">
            <Text className="text-xs font-semibold uppercase text-muted-foreground dark:text-slate-400">Model</Text>
            <Text className="min-w-0 flex-1 text-right text-xs text-muted-foreground dark:text-slate-400" numberOfLines={1}>
              {selectedModel?.name ?? (aiChat.isLoadingModels ? "Loading" : "No model")}
            </Text>
          </View>
          {aiChat.models.length ? (
            <ScrollView horizontal keyboardShouldPersistTaps="handled" showsHorizontalScrollIndicator={false}>
              <View className="flex-row gap-2">
                {aiChat.models.map((model) => (
                  <ModelChip
                    key={model.id}
                    disabled={isStreaming}
                    model={model}
                    selected={model.id === aiChat.selectedModelId}
                    onPress={() => actions.selectAiModel(model.id)}
                  />
                ))}
              </View>
            </ScrollView>
          ) : null}
        </View>

        <FlatList
          ref={listRef}
          className="flex-1"
          contentContainerStyle={{ gap: 12, paddingBottom: Math.max(16, composerHeight + 16), paddingHorizontal: 16, paddingTop: 8 }}
          data={timelineItems}
          keyExtractor={timelineKey}
          keyboardDismissMode="interactive"
          keyboardShouldPersistTaps="handled"
          ListEmptyComponent={<ChatEmptyState colors={colors} isLoading={isLoading} />}
          onContentSizeChange={() => {
            if (stickToBottomRef.current || isStreaming) {
              requestAnimationFrame(() => listRef.current?.scrollToEnd({ animated: true }));
            }
          }}
          onLayout={() => {
            if (stickToBottomRef.current) {
              requestAnimationFrame(() => listRef.current?.scrollToEnd({ animated: false }));
            }
          }}
          onScroll={handleTranscriptScroll(stickToBottomRef)}
          renderItem={({ item }) =>
            item.kind === "message" ? (
              <MessageBubble
                bubbleMaxWidth={Math.max(220, Math.min(560, windowWidth - 32) * 0.92)}
                message={item.message}
                onCopy={() => void Clipboard.setStringAsync(item.message.content)}
                onRetry={() => void retryFromMessage(item.message)}
              />
            ) : (
              <TimelineEventCard
                submittingConfirmationId={submittingConfirmationId}
                timelineEvent={item.event}
                onRespondToConfirmation={(confirmationId, accepted) => void respondToConfirmation(confirmationId, accepted)}
              />
            )
          }
          scrollEventThrottle={80}
        />

        <View
          className="border-t border-border bg-background px-4 pt-3 dark:border-neutral-800 dark:bg-black"
          onLayout={(event) => setComposerHeight(event.nativeEvent.layout.height)}
          style={{ paddingBottom: composerBottomPadding }}
        >
          {sendError || aiChat.error ? <Text className="mb-2 text-sm text-red-600 dark:text-red-400">{sendError ?? aiChat.error}</Text> : null}
          {attachments.length ? (
            <View className="mb-2 gap-2">
              <ScrollView horizontal keyboardShouldPersistTaps="handled" showsHorizontalScrollIndicator={false}>
                <View className="flex-row gap-2">
                  {attachments.map((attachment) => (
                    <AttachmentChip key={attachment.id} attachment={attachment} onRemove={() => removeAttachment(attachment.id)} />
                  ))}
                </View>
              </ScrollView>
            </View>
          ) : null}
          {attachmentMenuOpen ? (
            <View className="mb-2 self-start rounded-md border border-border bg-card p-1 dark:border-neutral-800 dark:bg-black">
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Add files"
                className="h-11 flex-row items-center gap-2 rounded-md px-3"
                onPress={() => {
                  void pickFiles().catch((err) => {
                    setSendError(err instanceof Error ? err.message : "Could not pick files.");
                  });
                }}
              >
                <File color={colors.icon} size={18} />
                <Text className="text-sm font-semibold text-foreground dark:text-slate-100">Files</Text>
              </Pressable>
            </View>
          ) : null}
          <View className="flex-row items-end gap-2">
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Add attachment"
              className={cn("size-11 items-center justify-center rounded-full border", attachmentMenuOpen ? "border-primary bg-primary" : "border-border bg-card dark:border-neutral-800 dark:bg-black")}
              onPress={() => setAttachmentMenuOpen((open) => !open)}
            >
              <Plus color={attachmentMenuOpen ? colors.primaryForeground : colors.foreground} size={20} />
            </Pressable>
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

function ModelChip({ disabled, model, selected, onPress }: { disabled: boolean; model: AiChatModel; selected: boolean; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected, disabled }}
      className={cn(
        "h-9 max-w-64 items-center justify-center rounded-md border px-3",
        selected ? "border-primary bg-primary" : "border-border bg-card dark:border-neutral-800 dark:bg-black",
        disabled && "opacity-60"
      )}
      disabled={disabled}
      onPress={onPress}
    >
      <Text className={cn("text-sm font-semibold", selected ? "text-primary-foreground" : "text-foreground dark:text-slate-100")} numberOfLines={1}>
        {model.name}
      </Text>
    </Pressable>
  );
}

function AttachmentChip({ attachment, onRemove }: { attachment: ComposerAttachment; onRemove: () => void }) {
  const { colors } = useTheme();
  const detail = formatAttachmentDetail(attachment);

  return (
    <View className="h-11 max-w-64 flex-row items-center gap-2 rounded-md border border-border bg-card px-3 dark:border-neutral-800 dark:bg-black">
      <File color={colors.icon} size={16} />
      <View className="min-w-0 flex-1">
        <Text className="text-sm font-medium text-foreground dark:text-slate-100" numberOfLines={1}>
          {attachment.name}
        </Text>
        {detail ? (
          <Text className="text-xs text-muted-foreground dark:text-slate-400" numberOfLines={1}>
            {detail}
          </Text>
        ) : null}
      </View>
      <Pressable accessibilityRole="button" accessibilityLabel={`Remove ${attachment.name}`} className="size-7 items-center justify-center rounded-full bg-muted dark:bg-slate-800" onPress={onRemove}>
        <X color={colors.muted} size={15} />
      </Pressable>
    </View>
  );
}

function formatAttachmentDetail(attachment: ComposerAttachment) {
  const status = attachment.status === "uploading" ? "Uploading" : attachment.status === "ready" ? "Ready" : attachment.status === "error" ? attachment.error ?? "Upload failed" : undefined;
  const details = [status, attachment.mimeType, formatFileSize(attachment.size)].filter(Boolean);
  return details.join(" - ");
}

function formatFileSize(size?: number) {
  if (!size && size !== 0) {
    return undefined;
  }
  if (size < 1024) {
    return `${size} B`;
  }
  if (size < 1024 * 1024) {
    return `${Math.round(size / 1024)} KB`;
  }
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

type TimelineItem = { kind: "message"; message: AiChatMessage } | { kind: "event"; event: AiChatTimelineEvent };

type TranscriptScrollRef = {
  current: boolean;
};

function buildTimeline(messages: AiChatMessage[], timelineEvents: AiChatTimelineEvent[]): TimelineItem[] {
  return [
    ...messages.map((message): TimelineItem => ({ kind: "message", message })),
    ...timelineEvents.map((event): TimelineItem => ({ kind: "event", event }))
  ].sort((a, b) => new Date(itemTime(a)).getTime() - new Date(itemTime(b)).getTime());
}

function itemTime(item: TimelineItem) {
  return item.kind === "message" ? item.message.createdAt : item.event.createdAt;
}

function timelineKey(item: TimelineItem) {
  return item.kind === "message" ? `message-${item.message.id}` : `event-${item.event.id}`;
}

function handleTranscriptScroll(stickToBottomRef: TranscriptScrollRef) {
  return (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const { contentOffset, contentSize, layoutMeasurement } = event.nativeEvent;
    stickToBottomRef.current = contentSize.height - (contentOffset.y + layoutMeasurement.height) < 96;
  };
}

function ChatEmptyState({ colors, isLoading }: { colors: ReturnType<typeof useTheme>["colors"]; isLoading: boolean }) {
  if (isLoading) {
    return (
      <View className="flex-row items-center gap-2 py-2">
        <ActivityIndicator color={colors.icon} />
        <Text className="text-sm text-muted-foreground dark:text-slate-400">Loading messages</Text>
      </View>
    );
  }

  return (
    <View className="items-center gap-2 rounded-md border border-dashed border-border bg-card p-6 dark:border-neutral-800 dark:bg-black">
      <Bot color={colors.muted} size={24} />
      <Text className="text-sm font-medium text-foreground dark:text-slate-100">Start the conversation</Text>
      <Text className="text-center text-sm text-muted-foreground dark:text-slate-400">
        Ask Nexus for a focused answer, plan, or operational summary.
      </Text>
    </View>
  );
}

function TimelineEventCard({
  timelineEvent,
  submittingConfirmationId,
  onRespondToConfirmation
}: {
  timelineEvent: AiChatTimelineEvent;
  submittingConfirmationId?: string;
  onRespondToConfirmation: (confirmationId: string, accepted: boolean) => void;
}) {
  const event = timelineEvent.event;
  if (event.type === "status") {
    return <StatusCard event={event} />;
  }
  if (event.type === "tool_call") {
    return <ToolCallCard toolCall={event.toolCall} />;
  }
  if (event.type === "tool_result") {
    return <ToolResultCard result={event.result} />;
  }
  if (event.type === "confirmation_request") {
    return <ConfirmationCard confirmation={event.confirmation} submitting={submittingConfirmationId === event.confirmation.id} onRespond={(accepted) => onRespondToConfirmation(event.confirmation.id, accepted)} />;
  }
  if (event.type === "file") {
    return <FileEventCard file={event.file} />;
  }
  if (event.type === "reference") {
    return <ReferenceEventCard reference={event.reference} />;
  }
  if (event.type === "error") {
    return <ErrorCard message={event.message} />;
  }
  if (event.type === "usage") {
    return null;
  }
  return null;
}

function MessageBubble({
  bubbleMaxWidth,
  message,
  onCopy,
  onRetry
}: {
  bubbleMaxWidth: number;
  message: AiChatMessage;
  onCopy: () => void;
  onRetry: () => void;
}) {
  const isUser = message.role === "user";
  const isPending = message.status === "sending" || message.status === "streaming";
  const isError = message.status === "error";
  const isAssistant = message.role === "assistant";

  return (
    <View className={cn("gap-1", isUser ? "self-end items-end" : "self-start items-start")} style={{ maxWidth: bubbleMaxWidth }}>
      <View
        className={cn(
          "rounded-lg border px-3 py-2",
          isUser ? "border-primary bg-primary" : "border-border bg-card dark:border-neutral-800 dark:bg-black",
          isError && "border-red-500"
        )}
        style={{ maxWidth: bubbleMaxWidth, overflow: "hidden" }}
      >
        {message.content ? (
          <MessageRenderer inverse={isUser} markdown={message.content} />
        ) : (
          <TypingDots inverse={isUser} />
        )}
      </View>
      {isAssistant && message.content ? (
        <View className="flex-row gap-2">
          <MessageActionButton icon="copy" label="Copy response" onPress={onCopy} />
          {(isError || !isPending) && <MessageActionButton icon="retry" label="Retry response" onPress={onRetry} />}
        </View>
      ) : null}
      {isPending || isError ? (
        <Text className={cn("text-xs", isError ? "text-red-600 dark:text-red-400" : "text-muted-foreground dark:text-slate-400")}>
          {isError ? "Not delivered" : message.status === "streaming" ? "Nexus is responding" : "Sending"}
        </Text>
      ) : null}
    </View>
  );
}

function TypingDots({ inverse }: { inverse: boolean }) {
  const { colors } = useTheme();
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.timing(progress, {
        toValue: 1,
        duration: 900,
        easing: Easing.inOut(Easing.ease),
        useNativeDriver: true
      })
    );
    animation.start();
    return () => animation.stop();
  }, [progress]);

  const dotColor = inverse ? colors.primaryForeground : colors.muted;

  return (
    <View className="h-6 flex-row items-center gap-1 px-1">
      {[0, 1, 2].map((index) => {
        const translateY = progress.interpolate({
          inputRange: [0, 0.33, 0.66, 1],
          outputRange: index === 0 ? [-3, 0, 0, -3] : index === 1 ? [0, -3, 0, 0] : [0, 0, -3, 0]
        });
        const opacity = progress.interpolate({
          inputRange: [0, 0.33, 0.66, 1],
          outputRange: index === 0 ? [1, 0.35, 0.35, 1] : index === 1 ? [0.35, 1, 0.35, 0.35] : [0.35, 0.35, 1, 0.35]
        });
        return (
          <Animated.View
            key={index}
            className="size-1.5 rounded-full"
            style={{
              backgroundColor: dotColor,
              opacity,
              transform: [{ translateY }]
            }}
          />
        );
      })}
    </View>
  );
}
