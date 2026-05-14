import * as Linking from "expo-linking";

export type AuthCallbackPayload = {
  accessToken: string;
  refreshToken?: string;
};

export function parseAuthCallbackUrl(url: string): AuthCallbackPayload | null {
  const parsed = Linking.parse(url);
  if (parsed.hostname !== "auth" || parsed.path !== "callback") {
    return null;
  }

  const errorMessage = typeof parsed.queryParams?.error === "string" ? parsed.queryParams.error : undefined;
  if (errorMessage) {
    throw new Error(errorMessage);
  }

  const accessToken = typeof parsed.queryParams?.accessToken === "string" ? parsed.queryParams.accessToken : undefined;
  if (!accessToken) {
    throw new Error("Google sign-in did not return a Nexus session.");
  }

  const refreshToken = typeof parsed.queryParams?.refreshToken === "string" ? parsed.queryParams.refreshToken : undefined;
  return { accessToken, refreshToken };
}
