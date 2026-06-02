import { BellRing, Inbox, ShieldAlert, Workflow } from "lucide-react-native";
import { Text, View } from "react-native";
import { PageHeader } from "@/components/drawer-shell";
import { Screen, ScreenScrollView } from "@/components/screen";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useTheme } from "@/theme/theme";
import { useAppState } from "@/state/app-state";

const placeholderEvents = [
  { id: "chat", title: "Chat messages", source: "/ws/v1/user", state: "ready" },
  { id: "bellum", title: "Bellum session updates", source: "/ws/v1/user", state: "stub" },
  { id: "push", title: "Background notifications", source: "FCM", state: "pending config" }
];

export default function InboxScreen() {
  const { colors } = useTheme();
  const { agents } = useAppState();
  const agentEvents = [
    { id: "agent-status", title: "Agent status updates", source: "agent.status_changed", state: agents.items.length ? "active" : "ready" },
    { id: "agent-approvals", title: "Agent approvals", source: "agent.approval_requested", state: agents.pendingApprovals.length ? `${agents.pendingApprovals.length} pending` : "ready" },
    { id: "agent-blackboard", title: "Blackboard updates", source: "agent.blackboard_updated", state: "ready" }
  ];

  return (
    <Screen>
      <PageHeader title="Inbox" />
      <ScreenScrollView>
        <View className="gap-2">
          <Text className="text-base text-muted-foreground dark:text-slate-400">
            Event streams will land here before being routed into focused screens.
          </Text>
        </View>

        {agentEvents.map((event) => (
          <Card key={event.id}>
            <CardHeader>
              <View className="flex-row items-center justify-between gap-3">
                <View className="flex-row items-center gap-2">
                  {event.id === "agent-approvals" ? <ShieldAlert color={agents.pendingApprovals.length ? "#dc2626" : colors.icon} size={18} /> : <Workflow color={colors.icon} size={18} />}
                  <CardTitle>{event.title}</CardTitle>
                </View>
                <Badge variant={event.state === "ready" || event.state === "active" ? "default" : "outline"}>{event.state}</Badge>
              </View>
            </CardHeader>
            <CardContent>
              <Text className="text-sm text-muted-foreground dark:text-slate-400">Source: {event.source}</Text>
            </CardContent>
          </Card>
        ))}

        {placeholderEvents.map((event) => (
          <Card key={event.id}>
            <CardHeader>
              <View className="flex-row items-center justify-between gap-3">
                <View className="flex-row items-center gap-2">
                  <BellRing color={colors.icon} size={18} />
                  <CardTitle>{event.title}</CardTitle>
                </View>
                <Badge variant={event.state === "ready" ? "default" : "outline"}>{event.state}</Badge>
              </View>
            </CardHeader>
            <CardContent>
              <Text className="text-sm text-muted-foreground dark:text-slate-400">Source: {event.source}</Text>
            </CardContent>
          </Card>
        ))}

        <View className="items-center gap-2 rounded-md border border-dashed border-border bg-card p-6 dark:border-neutral-800 dark:bg-black">
          <Inbox color={colors.muted} size={24} />
          <Text className="text-sm font-medium text-foreground dark:text-slate-100">No live events yet</Text>
          <Text className="text-center text-sm text-muted-foreground dark:text-slate-400">
            Connect a signed-in Roots user and registered device to receive realtime activity.
          </Text>
        </View>
      </ScreenScrollView>
    </Screen>
  );
}
