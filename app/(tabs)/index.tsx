import { Activity, Radio, RefreshCcw, ShieldCheck, Smartphone } from "lucide-react-native";
import { Text, View } from "react-native";
import { Screen, ScreenScrollView } from "@/components/screen";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ConnectionStatus } from "@/components/connection-status";
import { PageHeader } from "@/components/drawer-shell";
import { useAppState } from "@/state/app-state";
import { useTheme } from "@/theme/theme";

export default function HomeScreen() {
  const { session, realtime, push, polling, updates } = useAppState();
  const { colors } = useTheme();

  return (
    <Screen>
      <PageHeader title="Home" />
      <ScreenScrollView>
        <View className="gap-2">
          <Text className="text-base text-muted-foreground dark:text-slate-400">
            Native Roots activity, notifications, and realtime status.
          </Text>
        </View>

        <ConnectionStatus />

        <Card>
          <CardHeader>
            <CardTitle>Session Boundary</CardTitle>
          </CardHeader>
          <CardContent className="gap-3">
            <StatusRow icon={ShieldCheck} label="Auth" value={session.isAuthenticated ? "Signed in" : "Guest shell"} iconColor={colors.icon} />
            <StatusRow icon={Radio} label="SignalR" value={realtime.status} iconColor={colors.icon} />
            <StatusRow icon={Smartphone} label="FCM" value={push.permissionStatus} iconColor={colors.icon} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Event Flow</CardTitle>
          </CardHeader>
          <CardContent className="gap-3">
            <View className="flex-row flex-wrap gap-2">
              <Badge>SignalR first</Badge>
              <Badge variant="secondary">FCM wakeups</Badge>
              <Badge variant="outline">Polling fallback</Badge>
            </View>
            <StatusRow icon={Activity} label="Polling" value={polling.status} iconColor={colors.icon} />
            <StatusRow icon={RefreshCcw} label="Updates" value={updates.status} iconColor={colors.icon} />
          </CardContent>
        </Card>
      </ScreenScrollView>
    </Screen>
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
