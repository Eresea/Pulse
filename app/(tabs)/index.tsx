import { Activity, Radio, RefreshCcw, ShieldCheck, Smartphone } from "lucide-react-native";
import { ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ConnectionStatus } from "@/components/connection-status";
import { useAppState } from "@/state/app-state";

export default function HomeScreen() {
  const { session, realtime, push, polling, updates, actions } = useAppState();

  return (
    <SafeAreaView className="flex-1 bg-background" edges={["top"]}>
      <ScrollView contentContainerClassName="gap-4 px-4 pb-8 pt-3">
        <View className="gap-2">
          <Text className="text-3xl font-bold text-foreground">Pulse</Text>
          <Text className="text-base text-muted-foreground">
            Native Roots activity, notifications, and realtime status.
          </Text>
        </View>

        <ConnectionStatus />

        <Card>
          <CardHeader>
            <CardTitle>Session Boundary</CardTitle>
          </CardHeader>
          <CardContent className="gap-3">
            <StatusRow icon={ShieldCheck} label="Auth" value={session.isAuthenticated ? "Signed in" : "Guest shell"} />
            <StatusRow icon={Radio} label="SignalR" value={realtime.status} />
            <StatusRow icon={Smartphone} label="FCM" value={push.permissionStatus} />
            <Button onPress={actions.bootstrap} variant="default">
              Bootstrap Services
            </Button>
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
            <StatusRow icon={Activity} label="Polling" value={polling.status} />
            <StatusRow icon={RefreshCcw} label="Updates" value={updates.status} />
          </CardContent>
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}

function StatusRow({
  icon: Icon,
  label,
  value
}: {
  icon: React.ComponentType<{ color: string; size: number }>;
  label: string;
  value: string;
}) {
  return (
    <View className="flex-row items-center justify-between gap-3">
      <View className="flex-row items-center gap-2">
        <Icon color="#0f766e" size={18} />
        <Text className="text-sm font-medium text-foreground">{label}</Text>
      </View>
      <Text className="text-sm text-muted-foreground">{value}</Text>
    </View>
  );
}
