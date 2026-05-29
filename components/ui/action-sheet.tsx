import { useCallback, useEffect, useMemo, useState } from "react";
import { Modal, Pressable, Text, View } from "react-native";
import { Gesture, GestureDetector, GestureHandlerRootView } from "react-native-gesture-handler";
import Animated, { Easing, runOnJS, useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";
import { cn } from "@/lib/cn";
import { useTheme } from "@/theme/theme";

type ActionSheetAction = {
  label: string;
  accessibilityLabel?: string;
  destructive?: boolean;
  disabled?: boolean;
  icon?: React.ComponentType<{ color: string; size: number }>;
  onPress: () => void;
};

type ActionSheetProps = {
  visible: boolean;
  title: string;
  description?: string;
  actions: ActionSheetAction[];
  onClose: () => void;
};

const CLOSED_OFFSET = 420;

export function ActionSheet({ actions, description, onClose, title, visible }: ActionSheetProps) {
  const { colors } = useTheme();
  const [mounted, setMounted] = useState(visible);
  const translateY = useSharedValue(CLOSED_OFFSET);
  const dragStartY = useSharedValue(0);

  const finishClose = useCallback(() => {
    setMounted(false);
    onClose();
  }, [onClose]);

  const closeWithAnimation = () => {
    translateY.value = withTiming(CLOSED_OFFSET, { duration: 150, easing: Easing.out(Easing.cubic) }, (finished) => {
      if (finished) {
        runOnJS(finishClose)();
      }
    });
  };

  useEffect(() => {
    if (visible) {
      setMounted(true);
      translateY.value = CLOSED_OFFSET;
      requestAnimationFrame(() => {
        translateY.value = withTiming(0, { duration: 170, easing: Easing.out(Easing.cubic) });
      });
      return;
    }

    if (mounted) {
      translateY.value = withTiming(CLOSED_OFFSET, { duration: 140, easing: Easing.out(Easing.cubic) }, (finished) => {
        if (finished) {
          runOnJS(setMounted)(false);
        }
      });
    }
  }, [mounted, translateY, visible]);

  const panGesture = useMemo(
    () =>
      Gesture.Pan()
        .onBegin(() => {
          dragStartY.value = translateY.value;
        })
        .onUpdate((event) => {
          translateY.value = Math.max(0, dragStartY.value + event.translationY);
        })
        .onEnd((event) => {
          const projected = translateY.value + event.velocityY * 0.12;
          const shouldDismiss = event.velocityY > 650 || projected > 96;

          if (shouldDismiss) {
            translateY.value = withTiming(CLOSED_OFFSET, { duration: 150, easing: Easing.out(Easing.cubic) }, (finished) => {
              if (finished) {
                runOnJS(finishClose)();
              }
            });
            return;
          }

          translateY.value = withTiming(0, { duration: 150, easing: Easing.out(Easing.cubic) });
        }),
    [dragStartY, finishClose, translateY]
  );

  const sheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }]
  }));

  if (!mounted) {
    return null;
  }

  return (
    <Modal animationType="fade" onRequestClose={closeWithAnimation} transparent visible={mounted}>
      <GestureHandlerRootView className="flex-1">
        <View className="flex-1 justify-end bg-black/45">
          <Pressable accessibilityRole="button" accessibilityLabel="Close action sheet" className="flex-1" onPress={closeWithAnimation} />
          <GestureDetector gesture={panGesture}>
            <Animated.View style={sheetStyle}>
              <SafeAreaView className="bg-background dark:bg-black" edges={["bottom"]}>
                <View className="rounded-t-lg border-t border-border bg-background px-3 pb-2 pt-2 dark:border-neutral-800 dark:bg-black">
                  <View className="mb-2 items-center py-1">
                    <View className="h-1 w-10 rounded-full bg-muted dark:bg-slate-700" />
                  </View>

                  <View className="mb-2 px-1">
                    <View className="gap-1">
                      <Text className="text-lg font-bold text-foreground dark:text-slate-100" numberOfLines={2}>
                        {title}
                      </Text>
                      {description ? (
                        <Text className="text-sm text-muted-foreground dark:text-slate-400" numberOfLines={3}>
                          {description}
                        </Text>
                      ) : null}
                    </View>
                  </View>

                  <View className="gap-1">
                    {actions.map((action) => {
                      const Icon = action.icon;
                      const color = action.destructive ? "#dc2626" : colors.foreground;

                      return (
                        <Pressable
                          key={action.label}
                          accessibilityRole="button"
                          accessibilityLabel={action.accessibilityLabel ?? action.label}
                          className={cn("h-12 flex-row items-center gap-3 rounded-md px-3", action.disabled ? "opacity-50" : "active:bg-muted dark:active:bg-slate-800")}
                          disabled={action.disabled}
                          onPress={() => {
                            closeWithAnimation();
                            action.onPress();
                          }}
                        >
                          {Icon ? <Icon color={color} size={19} /> : null}
                          <Text className={cn("text-base font-semibold", action.destructive ? "text-red-600 dark:text-red-400" : "text-foreground dark:text-slate-100")}>{action.label}</Text>
                        </Pressable>
                      );
                    })}
                  </View>
                </View>
              </SafeAreaView>
            </Animated.View>
          </GestureDetector>
        </View>
      </GestureHandlerRootView>
    </Modal>
  );
}
