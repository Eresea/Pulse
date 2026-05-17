import { Redirect } from "expo-router";
import { ActivityIndicator, View } from "react-native";
import { useAppState } from "@/state/app-state";

export default function Index() {
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

  return <Redirect href="/(tabs)/inbox" />;
}
