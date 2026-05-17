import { Redirect, Stack } from "expo-router";
import { ActivityIndicator, View } from "react-native";
import { DrawerShell } from "@/components/drawer-shell";
import { useAppState } from "@/state/app-state";

export default function TabsLayout() {
  const { session } = useAppState();

  if (session.isRestoring) {
    return (
      <View className="flex-1 items-center justify-center bg-background dark:bg-black">
        <ActivityIndicator />
      </View>
    );
  }

  if (!session.isAuthenticated) {
    return <Redirect href="/login" />;
  }

  return (
    <DrawerShell>
      <Stack screenOptions={{ headerShown: false, animation: "none" }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="inbox" />
        <Stack.Screen name="chat/index" />
        <Stack.Screen name="chat/[threadId]" />
        <Stack.Screen name="profile" />
        <Stack.Screen name="settings" />
      </Stack>
    </DrawerShell>
  );
}
