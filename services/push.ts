import { Platform } from "react-native";
import * as Application from "expo-application";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import messaging from "@react-native-firebase/messaging";
import { appConfig } from "@/config/app-config";
import { rootsApi } from "@/services/roots-api";
import type { DeviceInfo } from "@/services/types";

export const pushService = {
  async requestToken(): Promise<{ token?: string; permissionStatus: string }> {
    if (!Device.isDevice) {
      return { permissionStatus: "simulator" };
    }

    const permission = await Notifications.requestPermissionsAsync();
    if (!permission.granted) {
      return { permissionStatus: permission.status };
    }

    const token = await messaging().getToken();
    return { token, permissionStatus: permission.status };
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
      userAgent: `${Device.manufacturer ?? "Unknown"} ${Device.modelName ?? "device"} / Pulse ${Application.nativeApplicationVersion ?? "0.1.0"}`
    };
  }
};
