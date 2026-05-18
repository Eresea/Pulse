import { Wifi, WifiOff } from "lucide-react-native";
import { Text, View } from "react-native";
import { useAppState } from "@/state/app-state";
import { useTheme } from "@/theme/theme";

export function ConnectionStatus() {
  const { realtime, polling } = useAppState();
  const { colors } = useTheme();
  const connected = realtime.status === "connected";

  return (
    <View className="flex-row items-center justify-between rounded-md border border-border bg-card p-4 dark:border-neutral-800 dark:bg-black">
      <View className="flex-row items-center gap-3">
        {connected ? <Wifi color={colors.icon} size={20} /> : <WifiOff color={colors.muted} size={20} />}
        <View>
          <Text className="text-sm font-semibold text-foreground dark:text-slate-100">
            {connected ? "Realtime connected" : "Realtime standby"}
          </Text>
          <Text className="text-xs text-muted-foreground dark:text-slate-400">
            {realtime.detail ? realtime.detail : `Fallback: ${polling.status}`}
          </Text>
        </View>
      </View>
      <View className={connected ? "size-2 rounded-full bg-primary" : "size-2 rounded-full bg-muted-foreground"} />
    </View>
  );
}
