import { Redirect, Stack } from "expo-router";
import { DrawerShell } from "@/components/drawer-shell";
import { useAppState } from "@/state/app-state";

export default function TabsLayout() {
  const { session } = useAppState();

  if (!session.isAuthenticated) {
    return <Redirect href="/login" />;
  }

  return (
    <DrawerShell>
      <Stack screenOptions={{ headerShown: false, animation: "fade" }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="inbox" />
        <Stack.Screen name="profile" />
        <Stack.Screen name="settings" />
      </Stack>
    </DrawerShell>
  );
}
