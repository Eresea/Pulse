import { Mail, PlugZap, ShieldCheck, UserRound } from "lucide-react-native";
import { router } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Image, Text, View } from "react-native";
import { Screen, ScreenScrollView } from "@/components/screen";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { ConnectorCatalogItem, ConnectorStatus, UserInfo, UserPermission } from "@/services/types";
import { useAppState } from "@/state/app-state";
import { useTheme } from "@/theme/theme";

export default function ProfileScreen() {
  const { session, actions } = useAppState();
  const { connectors } = useAppState();
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

  const refreshConnectors = useCallback(async () => {
    await actions.refreshConnectors();
  }, [actions]);

  useEffect(() => {
    if (didLoadProfile.current) {
      return;
    }
    if (session.user) {
      didLoadProfile.current = true;
      setProfile(session.user);
      void refreshConnectors().catch(() => undefined);
      return;
    }

    didLoadProfile.current = true;
    void refreshProfile();
    void refreshConnectors().catch(() => undefined);
  }, [refreshConnectors, refreshProfile, session.user]);

  return (
    <Screen>
      <ScreenScrollView contentContainerClassName="pt-20">
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
              <Badge variant="secondary">{connectors.items.length} connectors</Badge>
              <Badge variant="secondary">{profile?.permissions.length ?? 0} permissions</Badge>
            </View>

            {error ? <Text className="text-sm text-red-600 dark:text-red-400">{error}</Text> : null}

            <Button onPress={refreshProfile} variant="outline">
              {loading ? "Refreshing..." : "Refresh Profile"}
            </Button>
            <Button onPress={() => void refreshConnectors()} variant="outline">
              {connectors.isLoading ? "Refreshing Connectors..." : "Refresh Connectors"}
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
            <CardTitle>Connectors</CardTitle>
          </CardHeader>
          <CardContent className="gap-3">
            {connectors.error ? <Text className="text-sm text-red-600 dark:text-red-400">{connectors.error}</Text> : null}
            {connectors.isLoading && !connectors.items.length ? (
              <View className="flex-row items-center gap-2">
                <ActivityIndicator color={colors.icon} />
                <Text className="text-sm text-muted-foreground dark:text-slate-400">Loading connectors</Text>
              </View>
            ) : connectors.items.length ? (
              connectors.items.map((connector) => <ConnectorRow key={connector.id} connector={connector} />)
            ) : (
              <Text className="text-sm text-muted-foreground dark:text-slate-400">No connectors reported by Nexus.</Text>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Permissions</CardTitle>
          </CardHeader>
          <CardContent className="gap-3">
            {profile?.permissions.length ? (
              profile.permissions.map((permission) => <PermissionRow key={permission.id} permission={permission} />)
            ) : (
              <Text className="text-sm text-muted-foreground dark:text-slate-400">No permissions reported by Nexus.</Text>
            )}
          </CardContent>
        </Card>
      </ScreenScrollView>
    </Screen>
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

function ConnectorRow({ connector }: { connector: ConnectorCatalogItem }) {
  const { colors } = useTheme();

  return (
    <View className="gap-3 rounded-md border border-border p-3 dark:border-neutral-800">
      <View className="flex-row items-center gap-3">
      <View className="size-10 items-center justify-center rounded-full bg-muted dark:bg-slate-800">
        <PlugZap color={colors.icon} size={19} />
      </View>
      <View className="min-w-0 flex-1">
        <Text className="text-sm font-semibold capitalize text-foreground dark:text-slate-100" numberOfLines={1}>
          {connector.displayName}
        </Text>
        <Text className="text-xs text-muted-foreground dark:text-slate-400" numberOfLines={1}>
          {connector.accountEmail || connector.accountName || connector.statusMessage || connector.providerType || "No account connected"}
        </Text>
      </View>
        <Badge variant={statusBadgeVariant(connector.status)}>{formatStatus(connector.status)}</Badge>
      </View>
      {connector.connectedAt ? <ProfileRow label="Connected" value={formatDate(connector.connectedAt)} /> : null}
      <ProfileRow label="Scope" value={connector.supportMode || (connector.localAvailable ? "Local" : "Pulse")} />
      {connector.capabilities.length || connector.supportedModules.length ? (
        <View className="flex-row flex-wrap gap-2">
          {[...connector.capabilities, ...connector.supportedModules].slice(0, 5).map((tag) => (
            <Badge key={tag} variant="secondary">
              {tag}
            </Badge>
          ))}
        </View>
      ) : null}
    </View>
  );
}

function PermissionRow({ permission }: { permission: UserPermission }) {
  return (
    <View className="gap-1 rounded-md border border-border p-3 dark:border-neutral-800">
      <View className="flex-row items-center justify-between gap-3">
        <View className="min-w-0 flex-1 flex-row items-center gap-2">
          <ShieldCheck size={16} className="text-muted-foreground dark:text-slate-400" />
          <Text className="min-w-0 flex-1 text-sm font-semibold text-foreground dark:text-slate-100" numberOfLines={1}>
            {permission.name}
          </Text>
        </View>
        {permission.granted === undefined ? null : (
          <Badge variant={permission.granted ? "default" : "outline"}>{permission.granted ? "Granted" : "Not granted"}</Badge>
        )}
      </View>
      {permission.description ? (
        <Text className="text-xs text-muted-foreground dark:text-slate-400" numberOfLines={2}>
          {permission.description}
        </Text>
      ) : null}
    </View>
  );
}

function statusBadgeVariant(status: ConnectorStatus) {
  return status === "connected" ? "default" : status === "unknown" ? "secondary" : "outline";
}

function formatStatus(status: ConnectorStatus) {
  return status
    .split("_")
    .map((part) => part[0]?.toUpperCase() + part.slice(1))
    .join(" ");
}

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return date.toLocaleDateString();
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
