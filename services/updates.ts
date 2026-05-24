import * as Application from "expo-application";
import Constants from "expo-constants";
import { Linking, Platform } from "react-native";
import { appConfig } from "@/config/app-config";
import { buildApkUpdateCheckPath, parseApkUpdateResponse, type ApkUpdateResult } from "@/services/update-check";

type UpdateResult = ApkUpdateResult | {
  status: "checking";
  available: false;
};

export const updateService = {
  async checkForApkUpdate(): Promise<UpdateResult> {
    const currentVersion = Constants.expoConfig?.version ?? Application.nativeApplicationVersion ?? "0.0.0";
    const deviceId = Platform.OS === "android" ? Application.getAndroidId() : undefined;
    const path = buildApkUpdateCheckPath({
      appId: "pulse",
      platform: appConfig.updatePlatform,
      channel: appConfig.updateChannel,
      currentVersion,
      deviceId
    });

    const response = await fetch(`${appConfig.apiBaseUrl}${path}`, {
      headers: {
        Accept: "application/json"
      }
    });

    return parseApkUpdateResponse(response);
  },

  async openUpdate(url: string) {
    const supported = await Linking.canOpenURL(url);
    if (!supported) {
      throw new Error("Android cannot open the update URL.");
    }
    await Linking.openURL(url);
  }
};
