import Constants from "expo-constants";
import { ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { appConfig } from "@/config/app-config";
import { useAppState } from "@/state/app-state";

export default function SettingsScreen() {
  const { session, realtime, push, polling, updates, actions } = useAppState();
  const runtimeVersion = Constants.expoConfig?.runtimeVersion;

  return (
    <SafeAreaView className="flex-1 bg-background" edges={["top"]}>
      <ScrollView contentContainerClassName="gap-4 px-4 pb-8 pt-3">
        <View className="gap-2">
          <Text className="text-3xl font-bold text-foreground">Settings</Text>
          <Text className="text-base text-muted-foreground">Debug the Roots connection and update state.</Text>
        </View>

        <Card>
          <CardHeader>
            <CardTitle>Environment</CardTitle>
          </CardHeader>
          <CardContent className="gap-2">
            <SettingRow label="API" value={appConfig.apiBaseUrl} />
            <SettingRow label="Update URL" value={appConfig.updateUrl} />
            <SettingRow label="Update channel" value={appConfig.updateChannel} />
            <SettingRow label="Runtime" value={typeof runtimeVersion === "string" ? runtimeVersion : "appVersion"} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Services</CardTitle>
          </CardHeader>
          <CardContent className="gap-2">
            <SettingRow label="Auth" value={session.isAuthenticated ? "authenticated" : "guest"} />
            <SettingRow label="SignalR" value={realtime.status} />
            <SettingRow label="FCM token" value={push.token ? "available" : "missing"} />
            <SettingRow label="FCM permission" value={push.permissionStatus} />
            <SettingRow label="Polling" value={polling.status} />
            <SettingRow label="Updates" value={updates.status} />
            <Button onPress={actions.checkForUpdates} variant="outline">
              Check for Updates
            </Button>
          </CardContent>
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}

function SettingRow({ label, value }: { label: string; value: string }) {
  return (
    <View className="flex-row items-start justify-between gap-4">
      <Text className="text-sm font-medium text-foreground">{label}</Text>
      <Text className="max-w-[68%] text-right text-sm text-muted-foreground">{value}</Text>
    </View>
  );
}
