import { Stack } from "expo-router";
import { DrawerShell } from "@/components/drawer-shell";

export default function TabsLayout() {
  return (
    <DrawerShell>
      <Stack screenOptions={{ headerShown: false, animation: "fade" }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="inbox" />
        <Stack.Screen name="settings" />
      </Stack>
    </DrawerShell>
  );
}
