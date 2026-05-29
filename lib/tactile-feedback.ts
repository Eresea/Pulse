import { Platform, Vibration } from "react-native";

export function triggerLongPressFeedback() {
  if (Platform.OS === "web") {
    return;
  }
  Vibration.vibrate([0, 45]);
}

export function triggerTapFeedback() {
  if (Platform.OS === "web") {
    return;
  }
  Vibration.vibrate([0, 20]);
}
