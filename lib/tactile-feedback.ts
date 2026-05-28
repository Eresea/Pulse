import * as Haptics from "expo-haptics";
import { Platform, Vibration } from "react-native";

export function triggerLongPressFeedback() {
  if (Platform.OS === "web") {
    return;
  }
  Vibration.vibrate(18);
  void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => undefined);
}

export function triggerTapFeedback() {
  if (Platform.OS === "web") {
    return;
  }
  Vibration.vibrate(8);
  void Haptics.selectionAsync().catch(() => undefined);
}
