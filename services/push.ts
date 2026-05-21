import { appConfig } from "@/config/app-config";
import { rootsApi } from "@/services/roots-api";
import type { DeviceInfo } from "@/services/types";
import { getApp } from "@react-native-firebase/app";
import { getMessaging, getToken, onTokenRefresh, registerDeviceForRemoteMessages } from "@react-native-firebase/messaging";
import * as Application from "expo-application";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

type TokenRefreshListener = (token: string) => void;

export const pushService = {
  async requestToken(): Promise<{ token?: string; permissionStatus: string }> {
    if (!Device.isDevice) {
      return { permissionStatus: "simulator" };
    }

    const permission = await Notifications.requestPermissionsAsync();
    if (!permission.granted) {
      return { permissionStatus: permission.status };
    }

    if (Platform.OS !== "android") {
      return { permissionStatus: "unsupported-platform" };
    }

    try {
      const firebaseMessaging = getMessaging(getApp());
      await registerDeviceForRemoteMessages(firebaseMessaging);
      const token = await getToken(firebaseMessaging);
      return { token, permissionStatus: token ? "granted" : "token-missing" };
    } catch (error) {
      return { permissionStatus: error instanceof Error ? `fcm-error: ${error.message}` : "fcm-error" };
    }
  },

  onTokenRefresh(listener: TokenRefreshListener) {
    try {
      return onTokenRefresh(getMessaging(getApp()), listener);
    } catch {
      return () => undefined;
    }
  },

  async registerDevice(userId: string, fcmToken?: string) {
    const deviceInfo = await this.getDeviceInfo(fcmToken);
    await rootsApi.request<void>(appConfig.auth.device(userId), {
      method: "POST",
      body: JSON.stringify(deviceInfo)
    });
    return deviceInfo;
  },

  async getDeviceInfo(fcmToken?: string): Promise<DeviceInfo> {
    const fallbackDeviceId = `${Platform.OS}-${Application.applicationId ?? "pulse"}`;
    const androidId = Platform.OS === "android" ? Application.getAndroidId() : null;

    return {
      deviceId: androidId ?? fallbackDeviceId,
      fcmToken,
      platform: Platform.OS === "android" || Platform.OS === "ios" || Platform.OS === "web" ? Platform.OS : "unknown",
      userAgent: `${Device.manufacturer ?? "Unknown"} ${Device.modelName ?? "device"} / Pulse ${Application.nativeApplicationVersion ?? "0.1.2"}`
    };
  }
};
