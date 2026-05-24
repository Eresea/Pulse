export type ApkUpdateCheckParams = {
  appId: string;
  platform: string;
  channel: string;
  currentVersion: string;
  deviceId?: string;
};

export type ApkUpdateResult = {
  status: "current" | "available";
  available: boolean;
  version?: string;
  url?: string;
  signature?: string;
  notes?: string;
};

export function buildApkUpdateCheckPath(params: ApkUpdateCheckParams) {
  const query = new URLSearchParams({
    appId: params.appId,
    platform: params.platform,
    channel: params.channel,
    currentVersion: params.currentVersion
  });

  if (params.deviceId) {
    query.set("deviceId", params.deviceId);
  }

  return `/api/v1/updates/check?${query.toString()}`;
}

export async function parseApkUpdateResponse(response: Response): Promise<ApkUpdateResult> {
  if (response.status === 204) {
    return { status: "current", available: false };
  }

  if (!response.ok) {
    throw new Error(`Nexus APK update check failed with ${response.status}`);
  }

  const payload = (await response.json()) as {
    version?: string;
    url?: string;
    signature?: string;
    notes?: string;
  };

  if (!payload.version || !payload.url) {
    throw new Error("Nexus APK update response was missing version or URL.");
  }

  return {
    status: "available",
    available: true,
    version: payload.version,
    url: payload.url,
    signature: payload.signature,
    notes: payload.notes
  };
}
