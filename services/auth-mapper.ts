import type {
  ConnectedProvider,
  ConnectorActionState,
  ConnectorCatalogItem,
  ConnectorStatus,
  NexusConnector,
  NexusConnectorListResponse,
  NexusPermission,
  NexusProvider,
  NexusUser,
  UserInfo,
  UserPermission
} from "@/services/types";

export function mapNexusUser(user: NexusUser): UserInfo {
  const providers = user.connectors ?? user.connectedProviders ?? user.providers ?? user.externalLogins ?? [];

  return {
    userId: user.id ?? user.userId ?? "",
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    name: user.displayName ?? user.name ?? ([user.firstName, user.lastName].filter(Boolean).join(" ") || undefined),
    avatarUrl: user.avatarUrl ?? user.imageUrl ?? user.picture ?? user.avatar,
    emailVerified: user.emailVerified,
    providers: providers.map(mapProvider),
    permissions: mapPermissions(user.permissions ?? user.scopes ?? [])
  };
}

function mapProvider(provider: NexusProvider): ConnectedProvider {
  const id = provider.id ?? provider.provider ?? provider.providerName ?? provider.name ?? provider.displayName ?? "unknown";
  return {
    id,
    name: provider.displayName ?? provider.providerName ?? provider.name ?? provider.provider ?? id,
    email: provider.email,
    connectedAt: provider.connectedAt,
    status: mapConnectorStatus(provider),
    permissions: mapPermissions(provider.permissions ?? provider.scopes ?? [])
  };
}

function mapPermissions(permissions: NexusPermission[]): UserPermission[] {
  return permissions.map((permission) => {
    if (typeof permission === "string") {
      return { id: permission, name: permission };
    }

    const id = permission.id ?? permission.key ?? permission.scope ?? permission.name ?? permission.displayName ?? "unknown";
    return compactPermission({
      id,
      name: permission.displayName ?? permission.name ?? permission.scope ?? permission.key ?? id,
      description: permission.description,
      granted: permission.granted ?? permission.enabled ?? permission.allowed
    });
  });
}

function compactPermission(permission: UserPermission): UserPermission {
  return Object.fromEntries(Object.entries(permission).filter(([, value]) => value !== undefined)) as UserPermission;
}

function mapConnectorStatus(provider: NexusProvider): ConnectorStatus {
  if (provider.isConnected === false || provider.connected === false) {
    return "disconnected";
  }
  if (provider.isConnected === true || provider.connected === true) {
    return "connected";
  }

  switch ((provider.status ?? provider.state ?? "").toLowerCase()) {
    case "connected":
    case "active":
    case "ok":
      return "connected";
    case "disconnected":
    case "inactive":
    case "disabled":
      return "disconnected";
    case "degraded":
    case "warning":
      return "degraded";
    case "error":
    case "failed":
      return "error";
    case "pending":
    case "connecting":
      return "pending";
    default:
      return provider.connectedAt ? "connected" : "unknown";
  }
}

export function mapNexusConnectorList(response: NexusConnectorListResponse): ConnectorCatalogItem[] {
  const connectors = Array.isArray(response) ? response : response.connectors ?? [];
  return connectors.map(mapNexusConnector);
}

function mapNexusConnector(connector: NexusConnector): ConnectorCatalogItem {
  const displayName = connector.displayName ?? connector.display_name ?? connector.name;
  const id = connector.id ?? connector.connectorId ?? connector.connector_id ?? connector.key ?? connector.name ?? displayName ?? "unknown";
  const supportMode = connector.supportMode ?? connector.support_mode ?? connector.mode;
  const status = mapCatalogStatus(connector.status, supportMode);
  const localAvailable = connector.localAvailable ?? connector.local_available ?? status === "locallyAvailable";

  return {
    id,
    displayName: displayName ?? id,
    providerType: connector.providerType ?? connector.provider_type,
    authMethod: connector.authMethod ?? connector.auth_method,
    capabilities: connector.capabilities ?? [],
    supportedApps: connector.supportedApps ?? connector.supported_apps ?? [],
    supportedModules: connector.supportedModules ?? connector.supported_modules ?? [],
    supportMode,
    status,
    rawStatus: connector.status,
    statusMessage: connector.statusMessage ?? connector.status_message ?? connector.error,
    accountEmail: connector.accountEmail ?? connector.account_email,
    accountName: connector.accountName ?? connector.account_name,
    connectedAt: connector.connectedAt ?? connector.connected_at,
    updatedAt: connector.updatedAt ?? connector.updated_at,
    expiresAt: connector.expiresAt ?? connector.expires_at,
    localAvailable,
    actions: mapConnectorActions(connector, status),
    actionUrl: connector.actionUrl ?? connector.action_url
  };
}

function mapCatalogStatus(status: string | undefined, supportMode: string | undefined): ConnectorStatus {
  const normalized = (status ?? "disconnected").trim().toLowerCase().replace(/-/g, "_");
  switch (normalized) {
    case "connected":
    case "active":
    case "ok":
      return "connected";
    case "disconnected":
    case "not_connected":
    case "missing":
      return "disconnected";
    case "expired":
    case "token_expired":
      return "expired";
    case "error":
    case "failed":
      return "error";
    case "needs_reauth":
    case "needs_re_authorization":
    case "reauth_required":
    case "reauthorize":
      return "needsReauth";
    case "locally_available":
    case "local_available":
    case "available_locally":
      return "locallyAvailable";
    case "remote_only":
    case "nexus_managed":
      return "remoteOnly";
    case "unsupported":
      return "unsupported";
    default:
      return supportMode?.toLowerCase() === "unsupported" ? "unsupported" : "error";
  }
}

function mapConnectorActions(connector: NexusConnector, status: ConnectorStatus): ConnectorActionState {
  return {
    canConnect: connector.canConnect ?? connector.can_connect ?? status === "disconnected",
    canDisconnect:
      connector.canDisconnect ??
      connector.can_disconnect ??
      ["connected", "expired", "error", "needsReauth", "locallyAvailable"].includes(status),
    canRefresh:
      connector.canRefresh ??
      connector.can_refresh ??
      ["connected", "expired", "error", "needsReauth", "locallyAvailable", "remoteOnly"].includes(status),
    canReauth: connector.canReauth ?? connector.can_reauth ?? ["expired", "needsReauth"].includes(status)
  };
}
