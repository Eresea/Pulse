import { Mail, ShieldCheck, UserRound } from "lucide-react-native";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Image, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { ConnectedProvider, UserInfo } from "@/services/types";
import { useAppState } from "@/state/app-state";
import { useTheme } from "@/theme/theme";

export default function ProfileScreen() {
  const { session, actions } = useAppState();
  const { colors } = useTheme();
  const [profile, setProfile] = useState<UserInfo | undefined>(session.user);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | undefined>();
  const didLoadProfile = useRef(false);

  const displayName = profile?.name || profile?.email || "Signed in account";
  const initials = useMemo(() => getInitials(profile), [profile]);

  const refreshProfile = useCallback(async () => {
    setLoading(true);
    setError(undefined);
    try {
      setProfile(await actions.refreshUser());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load profile.");
    } finally {
      setLoading(false);
    }
  }, [actions]);

  useEffect(() => {
    if (didLoadProfile.current) {
      return;
    }
    if (session.user) {
      didLoadProfile.current = true;
      setProfile(session.user);
      return;
    }

    didLoadProfile.current = true;
    void refreshProfile();
  }, [refreshProfile, session.user]);

  return (
    <SafeAreaView className="flex-1 bg-background dark:bg-black" edges={["top"]}>
      <ScrollView contentContainerClassName="gap-4 px-4 pb-8 pt-20">
        <View className="gap-2">
          <Text className="text-base text-muted-foreground dark:text-slate-400">Account details from Nexus.</Text>
        </View>

        <Card>
          <CardContent className="gap-4 pt-4">
            <View className="flex-row items-center gap-4">
              {profile?.avatarUrl ? (
                <Image source={{ uri: profile.avatarUrl }} className="size-20 rounded-full bg-muted dark:bg-slate-800" />
              ) : (
                <View className="size-20 items-center justify-center rounded-full bg-muted dark:bg-slate-800">
                  {initials ? (
                    <Text className="text-2xl font-bold text-foreground dark:text-slate-100">{initials}</Text>
                  ) : (
                    <UserRound color={colors.icon} size={32} />
                  )}
                </View>
              )}
              <View className="min-w-0 flex-1 gap-1">
                <Text className="text-2xl font-bold text-foreground dark:text-slate-100" numberOfLines={2}>
                  {displayName}
                </Text>
                {profile?.email ? (
                  <View className="flex-row items-center gap-2">
                    <Mail color={colors.muted} size={16} />
                    <Text className="min-w-0 flex-1 text-sm text-muted-foreground dark:text-slate-400" numberOfLines={1}>
                      {profile.email}
                    </Text>
                  </View>
                ) : null}
              </View>
            </View>

            <View className="flex-row flex-wrap gap-2">
              <Badge variant={profile?.emailVerified ? "default" : "outline"}>{profile?.emailVerified ? "Email verified" : "Email not verified"}</Badge>
              <Badge variant="secondary">{profile?.providers.length ?? 0} providers</Badge>
            </View>

            {error ? <Text className="text-sm text-red-600 dark:text-red-400">{error}</Text> : null}

            <Button onPress={refreshProfile} variant="outline">
              {loading ? "Refreshing..." : "Refresh Profile"}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Account</CardTitle>
          </CardHeader>
          <CardContent className="gap-2">
            <ProfileRow label="User ID" value={profile?.userId || "unknown"} />
            <ProfileRow label="Name" value={profile?.name || "not set"} />
            <ProfileRow label="Email" value={profile?.email || "not set"} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Connected Providers</CardTitle>
          </CardHeader>
          <CardContent className="gap-3">
            {loading && !profile ? (
              <View className="flex-row items-center gap-2">
                <ActivityIndicator color={colors.icon} />
                <Text className="text-sm text-muted-foreground dark:text-slate-400">Loading profile</Text>
              </View>
            ) : profile?.providers.length ? (
              profile.providers.map((provider) => <ProviderRow key={`${provider.id}-${provider.email ?? ""}`} provider={provider} />)
            ) : (
              <Text className="text-sm text-muted-foreground dark:text-slate-400">No connected providers reported by Nexus.</Text>
            )}
          </CardContent>
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}

function ProfileRow({ label, value }: { label: string; value: string }) {
  return (
    <View className="flex-row items-start justify-between gap-4">
      <Text className="text-sm font-medium text-foreground dark:text-slate-100">{label}</Text>
      <Text className="max-w-[68%] text-right text-sm text-muted-foreground dark:text-slate-400">{value}</Text>
    </View>
  );
}

function ProviderRow({ provider }: { provider: ConnectedProvider }) {
  const { colors } = useTheme();

  return (
    <View className="flex-row items-center gap-3 rounded-md border border-border p-3 dark:border-neutral-800">
      <View className="size-10 items-center justify-center rounded-full bg-muted dark:bg-slate-800">
        <ShieldCheck color={colors.icon} size={19} />
      </View>
      <View className="min-w-0 flex-1">
        <Text className="text-sm font-semibold capitalize text-foreground dark:text-slate-100" numberOfLines={1}>
          {provider.name}
        </Text>
        <Text className="text-xs text-muted-foreground dark:text-slate-400" numberOfLines={1}>
          {provider.email || provider.connectedAt || "Connected account"}
        </Text>
      </View>
    </View>
  );
}

function getInitials(user?: UserInfo) {
  const source = user?.name ?? user?.email;
  if (!source) {
    return "";
  }
  return source
    .split(/[ @._-]/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}
