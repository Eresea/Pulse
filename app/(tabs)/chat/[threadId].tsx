import * as DocumentPicker from "expo-document-picker";
import { ArrowLeft, Bot, File, Plus, SendHorizontal, X } from "lucide-react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Keyboard, KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, TextInput, useWindowDimensions, View } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { cn } from "@/lib/cn";
import type { AiChatMessage, AiChatModel } from "@/services/types";
import { useAppState } from "@/state/app-state";
import { useTheme } from "@/theme/theme";

type ComposerAttachment = {
  id: string;
  name: string;
  size?: number;
  mimeType?: string;
  uri: string;
};

export default function AiChatThreadScreen() {
  const params = useLocalSearchParams<{ threadId?: string }>();
  const threadId = Array.isArray(params.threadId) ? params.threadId[0] : params.threadId;
  const { aiChat, actions } = useAppState();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { height: windowHeight } = useWindowDimensions();
  const scrollRef = useRef<ScrollView>(null);
  const didLoadModels = useRef(false);
  const [draft, setDraft] = useState("");
  const [sendError, setSendError] = useState<string | undefined>();
  const [attachments, setAttachments] = useState<ComposerAttachment[]>([]);
  const [attachmentMenuOpen, setAttachmentMenuOpen] = useState(false);
  const [keyboardOverlap, setKeyboardOverlap] = useState(0);
  const messages = threadId ? aiChat.messagesByThread[threadId] ?? [] : [];
  const lastMessageContent = messages.at(-1)?.content;
  const thread = aiChat.threads.find((item) => item.id === threadId);
  const isStreaming = Boolean(threadId && aiChat.streamingThreadId === threadId);
  const isLoading = Boolean(threadId && aiChat.loadingThreadId === threadId && !messages.length);
  const canSend = Boolean(threadId && draft.trim() && !isStreaming);
  const selectedModel = aiChat.models.find((model) => model.id === aiChat.selectedModelId);

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
    if (didLoadModels.current) {
      return;
    }
    didLoadModels.current = true;
    void actions.loadAiModels().catch(() => undefined);
  }, [actions]);

  useEffect(() => {
    requestAnimationFrame(() => scrollRef.current?.scrollToEnd({ animated: true }));
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
  const composerBottomPadding = Platform.OS === "android" && keyboardOverlap > 0 ? Math.max(8, keyboardOverlap - insets.bottom) : 12;

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
        uri: asset.uri
      }))
    ]);
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
          <View className="min-w-0 flex-1">
            <Text className="text-2xl font-bold text-foreground dark:text-slate-100" numberOfLines={1}>
              {title}
            </Text>
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

        <ScrollView
          ref={scrollRef}
          className="flex-1"
          contentContainerClassName="gap-3 px-4 pb-4 pt-2"
          keyboardDismissMode="interactive"
          keyboardShouldPersistTaps="handled"
        >
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

        <View
          className="border-t border-border bg-background px-4 pt-3 dark:border-neutral-800 dark:bg-black"
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
              <Text className="text-xs text-muted-foreground dark:text-slate-400">Files are staged locally and will not be sent yet.</Text>
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
  const details = [attachment.mimeType, formatFileSize(attachment.size)].filter(Boolean);
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
