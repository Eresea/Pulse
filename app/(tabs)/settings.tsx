import Constants from "expo-constants";
import { router } from "expo-router";
import type { Href } from "expo-router";
import { Text, View } from "react-native";
import { PageHeader } from "@/components/drawer-shell";
import { Screen, ScreenScrollView } from "@/components/screen";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { appConfig } from "@/config/app-config";
import { useAppState } from "@/state/app-state";
import { ThemeMode, useTheme } from "@/theme/theme";

const themeOptions: { label: string; value: ThemeMode }[] = [
  { label: "System", value: "system" },
  { label: "Light", value: "light" },
  { label: "Dark", value: "dark" }
];

export default function SettingsScreen() {
  const { session, realtime, push, polling, updates, actions } = useAppState();
  const { mode, resolvedTheme, setMode } = useTheme();
  const runtimeVersion = Constants.expoConfig?.runtimeVersion;

  return (
    <Screen>
      <PageHeader title="Settings" />
      <ScreenScrollView>
        <View className="gap-2">
          <Text className="text-base text-muted-foreground dark:text-slate-400">Debug the Roots connection and update state.</Text>
        </View>

        <Card>
          <CardHeader>
            <CardTitle>Theme</CardTitle>
          </CardHeader>
          <CardContent className="gap-3">
            <View className="flex-row gap-2">
              {themeOptions.map((option) => (
                <Button
                  key={option.value}
                  className="flex-1"
                  variant={mode === option.value ? "default" : "outline"}
                  onPress={() => setMode(option.value)}
                >
                  {option.label}
                </Button>
              ))}
            </View>
            <SettingRow label="Current" value={resolvedTheme} />
          </CardContent>
        </Card>

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
            <Button onPress={() => router.push("/(tabs)/settings/ai-diagnostics" as Href)} variant="outline">
              AI Diagnostics
            </Button>
            <Button onPress={actions.checkForUpdates} variant="outline">
              Check for Updates
            </Button>
            <Button
              onPress={() => {
                void actions.signOut().then(() => router.replace("/login"));
              }}
              variant="ghost"
            >
              Sign Out
            </Button>
          </CardContent>
        </Card>
      </ScreenScrollView>
    </Screen>
  );
}

function SettingRow({ label, value }: { label: string; value: string }) {
  return (
    <View className="flex-row items-start justify-between gap-4">
      <Text className="text-sm font-medium text-foreground dark:text-slate-100">{label}</Text>
      <Text className="max-w-[68%] text-right text-sm text-muted-foreground dark:text-slate-400">{value}</Text>
    </View>
  );
}
