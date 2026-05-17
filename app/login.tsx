import { router, useLocalSearchParams } from "expo-router";
import * as Linking from "expo-linking";
import * as WebBrowser from "expo-web-browser";
import { Chrome, LockKeyhole, Mail, RadioTower, UserRound } from "lucide-react-native";
import { useCallback, useEffect, useRef, useState } from "react";
import { ActivityIndicator, Animated, Easing, KeyboardAvoidingView, Platform, Text, Pressable, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { appConfig } from "@/config/app-config";
import { parseAuthCallbackUrl } from "@/services/auth-callback";
import { useAppState } from "@/state/app-state";
import { useTheme } from "@/theme/theme";

export default function LoginScreen() {
  const { session, actions } = useAppState();
  const { colors } = useTheme();
  const params = useLocalSearchParams();
  const [email, setEmail] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [mode, setMode] = useState<"login" | "subscribe">("login");
  const [submitting, setSubmitting] = useState(false);
  const intro = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(intro, {
      toValue: 1,
      duration: 420,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true
    }).start();

  }, [intro]);

  useEffect(() => {
    if (session.isAuthenticated) {
      router.replace("/(tabs)/inbox");
    }
  }, [session.isAuthenticated]);

  useEffect(() => {
    if (typeof params.error === "string") {
      setError(params.error);
    }
  }, [params.error]);

  const handleUrl = useCallback(({ url }: { url: string }) => {
    let payload;
    try {
      payload = parseAuthCallbackUrl(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to complete Google sign-in.");
      return;
    }
    if (!payload) {
      return;
    }

    setSubmitting(true);
    void actions
      .completeLogin(payload.accessToken, payload.refreshToken)
      .then(() => router.replace("/(tabs)/inbox"))
      .catch((err) => setError(err instanceof Error ? err.message : "Unable to complete Google sign-in."))
      .finally(() => setSubmitting(false));
  }, [actions]);

  useEffect(() => {
    const subscription = Linking.addEventListener("url", handleUrl);
    void Linking.getInitialURL().then((url) => {
      if (url) {
        handleUrl({ url });
      }
    });
    return () => subscription.remove();
  }, [handleUrl]);

  const submit = async () => {
    setError("");
    setSubmitting(true);
    try {
      if (mode === "subscribe") {
        await actions.registerEmail(email.trim(), password, displayName.trim());
        setMode("login");
        setPassword("");
        setError("Account created. Check your email to verify it before signing in.");
        return;
      }
      await actions.loginEmail(email.trim(), password);
      router.replace("/(tabs)/inbox");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to sign in.");
    } finally {
      setSubmitting(false);
    }
  };

  const loginGoogle = async () => {
    setError("");
    setSubmitting(true);
    try {
      const callbackUrl = "pulse://auth/callback";
      const params = new URLSearchParams({ client_id: appConfig.auth.clientId, redirect_uri: callbackUrl });
      const result = await WebBrowser.openAuthSessionAsync(`${appConfig.apiBaseUrl}${appConfig.auth.loginGoogle}?${params.toString()}`, callbackUrl);
      if (result.type === "success") {
        handleUrl({ url: result.url });
      } else if (result.type === "cancel") {
        setError("Google sign-in was cancelled.");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to start Google sign-in.");
    } finally {
      setSubmitting(false);
    }
  };

  const ready = email.trim().length > 0 && password.length > 0 && (mode === "login" || displayName.trim().length > 0) && !submitting;
  const heroOpacity = intro.interpolate({ inputRange: [0, 1], outputRange: [0, 1] });
  const heroTranslate = intro.interpolate({ inputRange: [0, 1], outputRange: [18, 0] });
  const title = mode === "login" ? "Welcome back" : "Create subscription";
  const actionLabel = mode === "login" ? "Sign in" : "Subscribe";
  const switchLabel = mode === "login" ? "Subscribe instead" : "Sign in instead";

  if (session.isRestoring) {
    return (
      <View className="flex-1 items-center justify-center bg-background dark:bg-black">
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-background dark:bg-black">
      <View className="absolute left-0 right-0 top-0 h-56 bg-teal-50 dark:bg-slate-950" />
      <SafeAreaView className="flex-1" edges={["top", "bottom"]}>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} className="flex-1">
          <View className="flex-1 justify-center px-5 pb-6">
            <Animated.View className="gap-7" style={{ opacity: heroOpacity, transform: [{ translateY: heroTranslate }] }}>
              <View className="items-center gap-4">
                <View className="size-16 items-center justify-center rounded-2xl bg-primary shadow-sm">
                  <RadioTower color={colors.primaryForeground} size={28} />
                </View>
                <View className="items-center gap-1">
                  <Text className="text-4xl font-bold tracking-normal text-foreground dark:text-slate-100">Pulse</Text>
                  <Text className="text-sm text-muted-foreground dark:text-slate-400">{title}</Text>
                </View>
              </View>

              <Card className="shadow-sm">
                <CardContent className="gap-4 p-4">
                {mode === "subscribe" ? (
                  <Input icon={UserRound} label="Name" value={displayName} onChangeText={setDisplayName} placeholder="Your name" autoComplete="name" textContentType="name" />
                ) : null}
                <Input
                  icon={Mail}
                  label="Email"
                  value={email}
                  onChangeText={setEmail}
                  placeholder="you@example.com"
                  autoCapitalize="none"
                  autoComplete="off"
                  autoCorrect={false}
                  importantForAutofill="no"
                  keyboardType="email-address"
                  textContentType="none"
                />
                <Input
                  icon={LockKeyhole}
                  label="Password"
                  value={password}
                  onChangeText={setPassword}
                  placeholder="Password"
                  autoCapitalize="none"
                  autoComplete={mode === "login" ? "current-password" : "new-password"}
                  autoCorrect={false}
                  secureTextEntry
                  textContentType={mode === "login" ? "password" : "newPassword"}
                />

                {error ? <Text className="rounded-md bg-red-50 px-3 py-2 text-sm font-medium text-red-700 dark:bg-red-950 dark:text-red-200">{error}</Text> : null}

                <Button className="h-12" disabled={!ready} onPress={submit}>
                  {submitting ? "Please wait..." : actionLabel}
                </Button>

                <Pressable
                  accessibilityRole="button"
                  className="h-12 flex-row items-center justify-center gap-2 rounded-md border border-border bg-card px-4 dark:border-neutral-800 dark:bg-black"
                  disabled={submitting}
                  onPress={loginGoogle}
                >
                  <Chrome color={colors.foreground} size={18} />
                  <Text className="text-sm font-semibold text-foreground dark:text-slate-100">Continue with Google</Text>
                </Pressable>

                <Button
                  variant="ghost"
                  onPress={() => {
                    setError("");
                    setMode((current) => (current === "login" ? "subscribe" : "login"));
                  }}
                >
                  {switchLabel}
                </Button>
                </CardContent>
              </Card>
            </Animated.View>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}
