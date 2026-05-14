import { cn } from "@/lib/cn";
import { useTheme } from "@/theme/theme";
import { router, usePathname } from "expo-router";
import { Bell, Bot, CalendarClock, ChevronRight, Home, Menu, Settings, UserRound } from "lucide-react-native";
import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { BackHandler, Pressable, Text, useWindowDimensions, View } from "react-native";
import { Gesture, GestureDetector, GestureHandlerRootView } from "react-native-gesture-handler";
import Animated, {
  cancelAnimation,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

type DrawerDestination = {
  label: string;
  href: "/(tabs)" | "/(tabs)/inbox" | "/(tabs)/settings";
  icon: React.ComponentType<{ color: string; size: number }>;
  match: (pathname: string) => boolean;
};

type DrawerShellContextValue = {
  openMenu: () => void;
};

const DrawerShellContext = createContext<DrawerShellContextValue | null>(null);

const mainDestinations: DrawerDestination[] = [
  {
    label: "Home",
    href: "/(tabs)",
    icon: Home,
    match: (pathname) => pathname === "/",
  },
  {
    label: "Inbox",
    href: "/(tabs)/inbox",
    icon: Bell,
    match: (pathname) => pathname.includes("/inbox"),
  },
];

const profileDestination: DrawerDestination = {
  label: "Profile / Settings",
  href: "/(tabs)/settings",
  icon: Settings,
  match: (pathname) => pathname.includes("/settings"),
};

export function useDrawerShell() {
  const context = useContext(DrawerShellContext);

  if (!context) {
    throw new Error("useDrawerShell must be used within DrawerShell");
  }

  return context;
}

export function PageHeader({ title }: { title: string }) {
  const { openMenu } = useDrawerShell();
  const { colors } = useTheme();

  return (
    <View className="flex-row items-center gap-3 px-4 pb-2 pt-2">
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Open menu"
        className="size-11 items-center justify-center rounded-full border border-border bg-card dark:border-neutral-800 dark:bg-black"
        onPress={openMenu}
      >
        <Menu color={colors.foreground} size={20} />
      </Pressable>
      <Text className="text-3xl font-bold text-foreground dark:text-slate-100">{title}</Text>
    </View>
  );
}

export function DrawerShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const insets = useSafeAreaInsets();
  const { width: screenWidth } = useWindowDimensions();
  const { colors } = useTheme();
  const slideX = useSharedValue(0);
  const dragStartX = useSharedValue(0);
  const [open, setOpen] = useState(false);

  const setOpenState = useCallback((nextOpen: boolean) => {
    setOpen(nextOpen);
  }, []);

  const snapTo = useCallback(
    (nextOpen: boolean) => {
      slideX.value = withTiming(
        nextOpen ? screenWidth : 0,
        {
          duration: 170,
        },
        (finished) => {
          if (finished) {
            runOnJS(setOpenState)(nextOpen);
          }
        },
      );
    },
    [screenWidth, setOpenState, slideX],
  );

  const openMenu = useCallback(() => {
    snapTo(true);
  }, [snapTo]);

  const closeMenu = useCallback(() => {
    snapTo(false);
  }, [snapTo]);

  useEffect(() => {
    if (open) {
      slideX.value = screenWidth;
    } else {
      slideX.value = 0;
    }
  }, [open, screenWidth, slideX]);

  useEffect(() => {
    const subscription = BackHandler.addEventListener("hardwareBackPress", () => {
      if (!open) {
        return false;
      }

      closeMenu();
      return true;
    });

    return () => subscription.remove();
  }, [closeMenu, open]);

  const panGesture = useMemo(
    () =>
      Gesture.Pan()
        .activeOffsetX([-12, 12])
        .failOffsetY([-16, 16])
        .onBegin(() => {
          cancelAnimation(slideX);
          dragStartX.value = slideX.value;
        })
        .onUpdate((event) => {
          const next = Math.min(screenWidth, Math.max(0, dragStartX.value + event.translationX));
          slideX.value = next;
        })
        .onEnd((event) => {
          const projected = slideX.value + event.velocityX * 0.12;
          const fastOpen = event.velocityX > 520;
          const fastClose = event.velocityX < -520;
          const nextOpen = fastOpen || (!fastClose && projected > screenWidth * 0.36);

          slideX.value = withTiming(
            nextOpen ? screenWidth : 0,
            {
              duration: 170,
            },
            (finished) => {
              if (finished) {
                runOnJS(setOpenState)(nextOpen);
              }
            },
          );
        }),
    [dragStartX, screenWidth, setOpenState, slideX],
  );

  const pageStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: slideX.value }],
  }));

  const menuStyle = useAnimatedStyle(() => ({
    opacity: 0.92 + (slideX.value / Math.max(screenWidth, 1)) * 0.08,
    transform: [{ translateX: (slideX.value / Math.max(screenWidth, 1) - 1) * 24 }],
  }));

  const contextValue = useMemo(() => ({ openMenu }), [openMenu]);

  const navigate = (href: DrawerDestination["href"]) => {
    closeMenu();
    router.push(href);
  };

  return (
    <GestureHandlerRootView className="flex-1">
      <DrawerShellContext.Provider value={contextValue}>
        <GestureDetector gesture={panGesture}>
          <View className="flex-1 overflow-hidden bg-background dark:bg-black">
            <Animated.View className="absolute inset-0 bg-card dark:bg-black" renderToHardwareTextureAndroid shouldRasterizeIOS style={menuStyle}>
              <SafeAreaView className="flex-1" edges={["top", "bottom"]}>
                <View className="flex-1 px-4 pb-4 pt-2">
                  <View className="mb-5">
                    <Text className="text-2xl font-bold text-foreground dark:text-slate-100">Pulse</Text>
                    <Text className="text-sm text-muted-foreground dark:text-slate-400">Roots command stream</Text>
                  </View>

                  <View className="gap-1">
                    {mainDestinations.map((item) => (
                      <DrawerItem key={item.label} item={item} active={item.match(pathname)} onPress={() => navigate(item.href)} />
                    ))}
                  </View>

                  <View className="mt-6 gap-3">
                    <SectionTitle>Recent AI Threads</SectionTitle>
                    <ReservedRow icon={Bot} label="No active threads" />
                    <ReservedRow icon={Bot} label="Reserved for Roots AI" muted />
                  </View>

                  <View className="mt-6 gap-3">
                    <SectionTitle>Recent Events</SectionTitle>
                    <ReservedRow icon={CalendarClock} label="No recent events" />
                    <ReservedRow icon={Bell} label="SignalR and FCM events" muted />
                  </View>

                  <View className="mt-auto pt-4" style={{ paddingBottom: Math.max(insets.bottom - 8, 0) }}>
                    <Pressable
                      accessibilityRole="button"
                      className={cn(
                        "flex-row items-center gap-3 rounded-md border border-border p-3",
                        profileDestination.match(pathname) ? "bg-primary" : "bg-background dark:bg-black",
                      )}
                      onPress={() => navigate(profileDestination.href)}
                    >
                      <View className="size-11 items-center justify-center rounded-full bg-muted dark:bg-slate-800">
                        <UserRound color={profileDestination.match(pathname) ? colors.primaryForeground : colors.icon} size={22} />
                      </View>
                      <View className="min-w-0 flex-1">
                        <Text className={cn("text-sm font-semibold", profileDestination.match(pathname) ? "text-primary-foreground" : "text-slate-100")}>Profile / Settings</Text>
                        <Text className={cn("text-xs", profileDestination.match(pathname) ? "text-primary-foreground" : "text-muted-foreground")}>Guest profile</Text>
                      </View>
                      <ChevronRight color={profileDestination.match(pathname) ? colors.primaryForeground : colors.muted} size={18} />
                    </Pressable>
                  </View>
                </View>
              </SafeAreaView>
            </Animated.View>

            <Animated.View
              className="absolute inset-0 bg-background dark:bg-black"
              renderToHardwareTextureAndroid
              style={[
                pageStyle,
                {
                  shadowColor: "#000",
                  shadowOpacity: 0.12,
                  shadowRadius: 14,
                  elevation: 8,
                },
              ]}
            >
              {children}
            </Animated.View>
          </View>
        </GestureDetector>
      </DrawerShellContext.Provider>
    </GestureHandlerRootView>
  );
}

function DrawerItem({ item, active, onPress }: { item: DrawerDestination; active: boolean; onPress: () => void }) {
  const Icon = item.icon;
  const { colors } = useTheme();

  return (
    <Pressable accessibilityRole="button" className={cn("h-12 flex-row items-center gap-3 rounded-md px-3", active ? "bg-primary" : "bg-transparent")} onPress={onPress}>
      <Icon color={active ? colors.primaryForeground : colors.icon} size={20} />
      <Text className={cn("text-base font-semibold", active ? "text-primary-foreground" : "text-foreground dark:text-slate-100")}>{item.label}</Text>
    </Pressable>
  );
}

function SectionTitle({ children }: { children: ReactNode }) {
  return <Text className="px-1 text-xs font-semibold uppercase text-muted-foreground dark:text-slate-400">{children}</Text>;
}

function ReservedRow({ icon: Icon, label, muted = false }: { icon: React.ComponentType<{ color: string; size: number }>; label: string; muted?: boolean }) {
  const { colors } = useTheme();

  return (
    <View className={cn("flex-row items-center gap-3 rounded-md px-3 py-2", muted ? "opacity-60" : undefined)}>
      <Icon color={colors.muted} size={17} />
      <Text className="text-sm text-muted-foreground dark:text-slate-400">{label}</Text>
    </View>
  );
}
