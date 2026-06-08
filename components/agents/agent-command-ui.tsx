import { Pressable, Text, View } from "react-native";
import {
  AlertCircle,
  CheckCircle2,
  ChevronRight,
  CirclePause,
  Clock3,
  File,
  Link,
  ListChecks,
  MessageSquare,
  OctagonAlert,
  Play,
  Send,
  ShieldAlert,
  Square
} from "lucide-react-native";
import type { ComponentType } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/cn";
import type { AgentApprovalRequest, AgentDetail, AgentStatus, AgentSummary, AgentTimelineEvent, AgentTimelineEventType } from "@/services/types";
import { useTheme } from "@/theme/theme";

export const attentionStatuses: AgentStatus[] = ["waiting_input", "blocked", "failed"];

type IconComponent = ComponentType<{ color: string; size: number }>;

export function isAttentionAgent(agent: Pick<AgentSummary, "needsAttention" | "status">) {
  return agent.needsAttention || attentionStatuses.includes(agent.status);
}

export function statusLabel(status: AgentStatus) {
  return status.replace("_", " ");
}

export function statusIcon(status: AgentStatus): IconComponent {
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

export function statusColor(status: AgentStatus) {
  if (status === "failed") {
    return "#dc2626";
  }
  if (attentionStatuses.includes(status)) {
    return "#d97706";
  }
  return "#64748b";
}

export function formatAgentProgress(agent: { progress?: AgentDetail["progress"] }) {
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

export function StatusBadge({ status }: { status: AgentStatus }) {
  const danger = status === "failed";
  const attention = attentionStatuses.includes(status);
  return (
    <Badge
      variant={status === "running" ? "default" : "outline"}
      className={cn(danger && "border-red-200 text-red-700 dark:border-red-900 dark:text-red-300", attention && !danger && "border-amber-300 text-amber-700 dark:border-amber-900 dark:text-amber-300")}
    >
      {statusLabel(status)}
    </Badge>
  );
}

export function AgentCompactRow({
  agent,
  onPress,
  trailing = "chevron"
}: {
  agent: AgentSummary | AgentDetail;
  onPress: () => void;
  trailing?: "chevron" | "status";
}) {
  const { colors } = useTheme();
  const Icon = statusIcon(agent.status);
  const progress = formatAgentProgress(agent);
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={`Open ${agent.name}`} className={cn("rounded-md border border-border bg-background p-3 dark:border-neutral-800 dark:bg-black", isAttentionAgent(agent) && "border-amber-300 dark:border-amber-900")} onPress={onPress}>
      <View className="flex-row items-start justify-between gap-3">
        <View className="min-w-0 flex-1 flex-row gap-3">
          <View className={cn("size-10 items-center justify-center rounded-full bg-muted dark:bg-slate-800", agent.status === "running" && "bg-primary")}>
            <Icon color={agent.status === "running" ? colors.primaryForeground : statusColor(agent.status)} size={18} />
          </View>
          <View className="min-w-0 flex-1 gap-1">
            <View className="flex-row items-center gap-2">
              <Text className="min-w-0 flex-1 text-sm font-semibold text-foreground dark:text-slate-100" numberOfLines={1}>{agent.name}</Text>
              {isAttentionAgent(agent) ? <AlertCircle color="#d97706" size={15} /> : null}
            </View>
            <Text className="text-sm text-muted-foreground dark:text-slate-400" numberOfLines={2}>{agent.objective ?? "No objective reported"}</Text>
            {agent.profileName ? <Text className="text-xs font-semibold text-primary" numberOfLines={1}>{agent.profileName}</Text> : null}
            <Text className="text-xs text-muted-foreground dark:text-slate-500" numberOfLines={1}>{[agent.location, agent.runtime, progress].filter(Boolean).join(" - ")}</Text>
          </View>
        </View>
        <View className="items-end gap-2">
          {trailing === "status" ? <StatusBadge status={agent.status} /> : <ChevronRight color={colors.muted} size={17} />}
        </View>
      </View>
    </Pressable>
  );
}

export function ApprovalCard({
  approval,
  submitting,
  onRespond,
  compact = false
}: {
  approval: AgentApprovalRequest;
  submitting: boolean;
  onRespond: (approval: AgentApprovalRequest, accepted: boolean) => void;
  compact?: boolean;
}) {
  return (
    <View className="gap-2 rounded-md border border-red-200 bg-red-50 p-3 dark:border-red-950 dark:bg-red-950/40">
      <View className="flex-row items-start justify-between gap-3">
        <View className="min-w-0 flex-1">
          <Text className="text-sm font-semibold text-red-700 dark:text-red-300">{approval.title}</Text>
          <Text className="text-sm leading-5 text-red-700 dark:text-red-200" numberOfLines={compact ? 2 : undefined}>{approval.body}</Text>
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

export function BlackboardCard({ detail }: { detail: AgentDetail }) {
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
        <RecordBlock label="Decisions" records={detail.blackboard.decisions.map((item) => ({ id: item.id, title: item.title, body: item.rationale, meta: formatTime(item.createdAt) }))} />
        <RecordBlock label="Artifacts" records={detail.blackboard.artifacts.map((item) => ({ id: item.id, title: item.title, body: item.summary, meta: [item.type, formatTime(item.createdAt)].filter(Boolean).join(" - "), url: item.url }))} icon={File} />
        <RecordBlock label="Context references" records={detail.blackboard.contextReferences.map((item) => ({ id: item.id, title: item.title, body: item.summary, meta: item.type, url: item.url }))} icon={Link} />
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

function RecordBlock({
  label,
  records,
  icon: Icon
}: {
  label: string;
  records: { id: string; title: string; body?: string; meta?: string; url?: string }[];
  icon?: IconComponent;
}) {
  if (!records.length) {
    return null;
  }
  return (
    <View className="gap-2">
      <Text className="text-xs font-semibold uppercase text-muted-foreground dark:text-slate-400">{label}</Text>
      {records.map((record) => (
        <View key={record.id} className="rounded-md border border-border bg-background p-3 dark:border-neutral-800 dark:bg-black">
          <View className="flex-row items-start gap-2">
            {Icon ? <Icon color="#64748b" size={16} /> : null}
            <View className="min-w-0 flex-1 gap-1">
              <Text className="text-sm font-semibold text-foreground dark:text-slate-100">{record.title}</Text>
              {record.body ? <Text className="text-sm text-muted-foreground dark:text-slate-400">{record.body}</Text> : null}
              {[record.meta, record.url].filter(Boolean).map((item) => (
                <Text key={item} className="text-xs text-muted-foreground dark:text-slate-500" numberOfLines={1}>{item}</Text>
              ))}
            </View>
          </View>
        </View>
      ))}
    </View>
  );
}

export function TimelineRow({ event }: { event: AgentTimelineEvent }) {
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

function timelineIcon(type: AgentTimelineEventType, severity?: AgentTimelineEvent["severity"]): IconComponent {
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

export function formatTime(value?: string) {
  if (!value) {
    return "";
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }
  return date.toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

export function completedStatusIcon(): IconComponent {
  return Square;
}
