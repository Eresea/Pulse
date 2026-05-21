import { AlertCircle, CheckCircle2, Clock3, Copy, Loader2, RotateCcw, ShieldAlert, Wrench, XCircle } from "lucide-react-native";
import { Animated, Easing, Pressable, Text, View } from "react-native";
import { useRef, useState } from "react";
import { cn } from "@/lib/cn";
import type { AiChatConfirmationRequest, AiChatStatusEvent, AiChatToolCall, AiChatToolResult, AiToolLifecycleStatus } from "@/services/types";
import { useTheme } from "@/theme/theme";

type StatusCardProps = {
  event: AiChatStatusEvent;
};

type ToolCallCardProps = {
  toolCall: AiChatToolCall;
};

type ToolResultCardProps = {
  result: AiChatToolResult;
};

type ConfirmationCardProps = {
  confirmation: AiChatConfirmationRequest;
};

type ErrorCardProps = {
  message: string;
};

export function StatusCard({ event }: StatusCardProps) {
  const { colors } = useTheme();
  return (
    <View className="max-w-[92%] self-start rounded-md border border-border bg-card px-3 py-2 dark:border-neutral-800 dark:bg-black">
      <View className="flex-row items-start gap-2">
        <Loader2 color={colors.icon} size={16} />
        <View className="min-w-0 flex-1 gap-1">
          <Text className="text-sm font-semibold text-foreground dark:text-slate-100">{event.title ?? statusLabel(event.status)}</Text>
          {event.message ? <Text className="text-sm leading-5 text-muted-foreground dark:text-slate-400">{event.message}</Text> : null}
        </View>
      </View>
    </View>
  );
}

export function ToolCallCard({ toolCall }: ToolCallCardProps) {
  const { colors } = useTheme();
  return (
    <View className="max-w-[92%] self-start rounded-md border border-border bg-card px-3 py-3 dark:border-neutral-800 dark:bg-black">
      <View className="flex-row items-start gap-2">
        <Wrench color={colors.icon} size={17} />
        <View className="min-w-0 flex-1 gap-2">
          <View className="flex-row items-start justify-between gap-3">
            <View className="min-w-0 flex-1">
              <Text className="text-sm font-semibold text-foreground dark:text-slate-100" numberOfLines={1}>
                {toolCall.title ?? toolCall.name}
              </Text>
              <Text className="text-xs text-muted-foreground dark:text-slate-400" numberOfLines={1}>
                {toolCall.name}
              </Text>
            </View>
            <LifecycleBadge status={toolCall.status} />
          </View>
          {toolCall.summary ? <Text className="text-sm leading-5 text-muted-foreground dark:text-slate-400">{toolCall.summary}</Text> : null}
          {toolCall.risk ? (
            <View className={cn("self-start rounded px-2 py-1", toolCall.risk === "high" ? "bg-red-100 dark:bg-red-950" : "bg-muted dark:bg-slate-800")}>
              <Text className={cn("text-xs font-semibold", toolCall.risk === "high" ? "text-red-700 dark:text-red-300" : "text-muted-foreground dark:text-slate-300")}>
                {toolCall.risk.toUpperCase()} RISK
              </Text>
            </View>
          ) : null}
        </View>
      </View>
    </View>
  );
}

export function ToolResultCard({ result }: ToolResultCardProps) {
  const iconColor = result.status === "failed" ? "#dc2626" : result.status === "cancelled" ? "#64748b" : "#0f766e";
  const Icon = result.status === "failed" ? XCircle : result.status === "cancelled" ? AlertCircle : CheckCircle2;
  return (
    <View className="max-w-[92%] self-start rounded-md border border-border bg-card px-3 py-3 dark:border-neutral-800 dark:bg-black">
      <View className="flex-row items-start gap-2">
        <Icon color={iconColor} size={17} />
        <View className="min-w-0 flex-1 gap-2">
          <View className="flex-row items-center justify-between gap-3">
            <Text className="min-w-0 flex-1 text-sm font-semibold text-foreground dark:text-slate-100" numberOfLines={1}>
              Tool result
            </Text>
            <LifecycleBadge status={result.status} />
          </View>
          {result.summary ? <Text className="text-sm leading-5 text-muted-foreground dark:text-slate-400">{result.summary}</Text> : null}
          {result.details ? (
            <Text className="rounded-md bg-muted p-2 font-mono text-xs leading-5 text-muted-foreground dark:bg-slate-900 dark:text-slate-300" selectable>
              {formatDetails(result.details)}
            </Text>
          ) : null}
        </View>
      </View>
    </View>
  );
}

export function ConfirmationCard({ confirmation }: ConfirmationCardProps) {
  return (
    <View className="max-w-[92%] self-start rounded-md border border-red-200 bg-red-50 px-3 py-3 dark:border-red-950 dark:bg-red-950/40">
      <View className="flex-row items-start gap-2">
        <ShieldAlert color="#dc2626" size={17} />
        <View className="min-w-0 flex-1 gap-2">
          <Text className="text-sm font-semibold text-red-700 dark:text-red-300">{confirmation.title}</Text>
          <Text className="text-sm leading-5 text-red-700 dark:text-red-200">{confirmation.body}</Text>
          <View className="flex-row gap-2">
            <Pressable className="h-9 items-center justify-center rounded-md bg-red-600 px-3" disabled>
              <Text className="text-sm font-semibold text-white">{confirmation.confirmLabel ?? "Confirm"}</Text>
            </Pressable>
            <Pressable className="h-9 items-center justify-center rounded-md border border-red-200 px-3 dark:border-red-800" disabled>
              <Text className="text-sm font-semibold text-red-700 dark:text-red-200">{confirmation.cancelLabel ?? "Cancel"}</Text>
            </Pressable>
          </View>
          <Text className="text-xs text-red-600 dark:text-red-300">Nexus confirmation endpoint is not connected yet.</Text>
        </View>
      </View>
    </View>
  );
}

export function ErrorCard({ message }: ErrorCardProps) {
  return (
    <View className="max-w-[92%] self-start rounded-md border border-red-200 bg-red-50 px-3 py-2 dark:border-red-950 dark:bg-red-950/40">
      <View className="flex-row items-start gap-2">
        <AlertCircle color="#dc2626" size={17} />
        <Text className="min-w-0 flex-1 text-sm leading-5 text-red-700 dark:text-red-200" selectable>
          {message}
        </Text>
      </View>
    </View>
  );
}

export function MessageActionButton({ label, icon, onPress }: { label: string; icon: "copy" | "retry"; onPress: () => void }) {
  const { colors } = useTheme();
  const [confirmed, setConfirmed] = useState(false);
  const scale = useRef(new Animated.Value(1)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const Icon = confirmed ? CheckCircle2 : icon === "copy" ? Copy : RotateCcw;
  const color = confirmed ? colors.primary : colors.muted;

  const playFeedback = () => {
    setConfirmed(true);
    scale.setValue(0.86);
    opacity.setValue(1);
    Animated.parallel([
      Animated.sequence([
        Animated.timing(scale, {
          toValue: 1.12,
          duration: 120,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true
        }),
        Animated.spring(scale, {
          toValue: 1,
          damping: 8,
          stiffness: 220,
          useNativeDriver: true
        })
      ]),
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 1,
          duration: 80,
          useNativeDriver: true
        }),
        Animated.timing(opacity, {
          toValue: 0,
          delay: 520,
          duration: 180,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true
        })
      ])
    ]).start(() => setConfirmed(false));
  };

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      className="size-8 items-center justify-center rounded-full bg-muted dark:bg-slate-800"
      onPress={() => {
        onPress();
        playFeedback();
      }}
    >
      <Animated.View style={{ opacity, position: "absolute", transform: [{ scale: scale.interpolate({ inputRange: [0.86, 1.12], outputRange: [1, 1.35] }) }] }}>
        <View className="size-8 rounded-full bg-primary/20" />
      </Animated.View>
      <Animated.View style={{ transform: [{ scale }] }}>
        <Icon color={color} size={15} />
      </Animated.View>
    </Pressable>
  );
}

function LifecycleBadge({ status }: { status: AiToolLifecycleStatus }) {
  const Icon = status === "running" || status === "pending" || status === "waiting_confirmation" ? Clock3 : status === "failed" || status === "cancelled" ? XCircle : CheckCircle2;
  const tone = status === "failed" ? "text-red-700 dark:text-red-300" : status === "succeeded" ? "text-teal-700 dark:text-teal-300" : "text-muted-foreground dark:text-slate-300";
  return (
    <View className="flex-row items-center gap-1 rounded bg-muted px-2 py-1 dark:bg-slate-800">
      <Icon color={status === "failed" ? "#dc2626" : status === "succeeded" ? "#0f766e" : "#64748b"} size={12} />
      <Text className={cn("text-xs font-semibold", tone)}>{status.replace("_", " ")}</Text>
    </View>
  );
}

function statusLabel(status: AiChatStatusEvent["status"]) {
  return status === "thinking" ? "Thinking" : status === "completed" || status === "succeeded" ? "Completed" : "Working";
}

function formatDetails(details: unknown) {
  if (typeof details === "string") {
    return details;
  }
  try {
    return JSON.stringify(details, null, 2);
  } catch {
    return String(details);
  }
}
