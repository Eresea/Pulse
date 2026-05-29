import * as Haptics from "expo-haptics";
import { Platform, Vibration } from "react-native";

export function triggerLongPressFeedback() {
  if (Platform.OS === "web") {
    return;
  }

  void performFeedback(async () => {
    if (Platform.OS === "android") {
      await Haptics.performAndroidHapticsAsync(Haptics.AndroidHaptics.Long_Press);
      return;
    }

    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  }, 45);
}

export function triggerTapFeedback() {
  if (Platform.OS === "web") {
    return;
  }

  void performFeedback(async () => {
    if (Platform.OS === "android") {
      await Haptics.performAndroidHapticsAsync(Haptics.AndroidHaptics.Context_Click);
      return;
    }

    await Haptics.selectionAsync();
  }, 20);
}

async function performFeedback(feedback: () => Promise<void>, fallbackDuration: number) {
  try {
    await feedback();
  } catch {
    Vibration.vibrate(fallbackDuration);
  }
}
