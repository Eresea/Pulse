import { Wifi, WifiOff } from "lucide-react-native";
import { Text, View } from "react-native";
import { useAppState } from "@/state/app-state";

export function ConnectionStatus() {
  const { realtime, polling } = useAppState();
  const connected = realtime.status === "connected";

  return (
    <View className="flex-row items-center justify-between rounded-md border border-border bg-card p-4">
      <View className="flex-row items-center gap-3">
        {connected ? <Wifi color="#0f766e" size={20} /> : <WifiOff color="#64748b" size={20} />}
        <View>
          <Text className="text-sm font-semibold text-foreground">
            {connected ? "Realtime connected" : "Realtime standby"}
          </Text>
          <Text className="text-xs text-muted-foreground">Fallback: {polling.status}</Text>
        </View>
      </View>
      <View className={connected ? "size-2 rounded-full bg-primary" : "size-2 rounded-full bg-muted-foreground"} />
    </View>
  );
}
