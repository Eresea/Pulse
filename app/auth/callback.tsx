import { Redirect, useLocalSearchParams } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { parseAuthCallbackUrl } from "@/services/auth-callback";
import { useAppState } from "@/state/app-state";

export default function AuthCallbackScreen() {
  const params = useLocalSearchParams();
  const { session, actions } = useAppState();
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  const callbackUrl = useMemo(() => {
    const query = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
      const nextValue = Array.isArray(value) ? value[0] : value;
      if (typeof nextValue === "string") {
        query.set(key, nextValue);
      }
    }
    return `pulse://auth/callback?${query.toString()}`;
  }, [params]);

  useEffect(() => {
    try {
      const payload = parseAuthCallbackUrl(callbackUrl);
      if (!payload) {
        setError("Invalid authentication callback.");
        return;
      }
      void actions
        .completeLogin(payload.accessToken, payload.refreshToken)
        .then(() => setDone(true))
        .catch((err) => setError(err instanceof Error ? err.message : "Unable to complete Google sign-in."));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to complete Google sign-in.");
    }
  }, [actions, callbackUrl]);

  if (done || session.isAuthenticated) {
    return <Redirect href="/(tabs)" />;
  }

  if (error) {
    return <Redirect href={{ pathname: "/login", params: { error } }} />;
  }

  return (
    <SafeAreaView className="flex-1 bg-background dark:bg-black">
      <View className="flex-1 items-center justify-center gap-3 px-6">
        <ActivityIndicator />
        <Text className="text-sm font-medium text-foreground dark:text-slate-100">Completing sign-in...</Text>
      </View>
    </SafeAreaView>
  );
}
