import { cn } from "@/lib/cn";
import { useAppState } from "@/state/app-state";
import { useTheme } from "@/theme/theme";
import { router, usePathname } from "expo-router";
import { Bell, Bot, CalendarClock, ChevronRight, Home, Menu, Settings, UserRound } from "lucide-react-native";
import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { BackHandler, Image, Pressable, Text, useWindowDimensions, View } from "react-native";
import { Gesture, GestureDetector, GestureHandlerRootView } from "react-native-gesture-handler";
import Animated, { cancelAnimation, Easing, runOnJS, useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

type DrawerDestination = {
  label: string;
  href: "/(tabs)" | "/(tabs)/inbox" | "/(tabs)/profile" | "/(tabs)/settings";
  icon: React.ComponentType<{ color: string; size: number }>;
  match: (pathname: string) => boolean;
};

type PrimaryDrawerHref = "/(tabs)" | "/(tabs)/inbox";

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
  label: "Profile",
  href: "/(tabs)/profile",
  icon: UserRound,
  match: (pathname) => pathname.includes("/profile"),
};

const drawerRoutes = [...mainDestinations.map((item) => item.href), profileDestination.href, "/(tabs)/settings" as const];

function getPrimaryHref(pathname: string): PrimaryDrawerHref | undefined {
  if (pathname.includes("/inbox")) {
    return "/(tabs)/inbox";
  }

  if (pathname === "/" || pathname === "/(tabs)") {
    return "/(tabs)";
  }

  return undefined;
}

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
      <Pressable accessibilityRole="button" accessibilityLabel="Open menu" className="size-11 items-center justify-center rounded-full border border-border bg-card dark:border-neutral-800 dark:bg-black" onPress={openMenu}>
        <Menu color={colors.foreground} size={20} />
      </Pressable>
      <Text className="text-3xl font-bold text-foreground dark:text-slate-100">{title}</Text>
    </View>
  );
}

export function DrawerShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const insets = useSafeAreaInsets();
  const { session, actions } = useAppState();
  const { width: screenWidth } = useWindowDimensions();
  const { colors } = useTheme();
  const profileLabel = session.user?.name || session.user?.email || "Profile";
  const profileSubLabel = session.user?.providers.length ? `${session.user.providers.length} connected provider${session.user.providers.length === 1 ? "" : "s"}` : "Account details";
  const slideX = useSharedValue(0);
  const dragStartX = useSharedValue(0);
  const lastPrimaryHref = useRef<PrimaryDrawerHref>("/(tabs)");
  const [open, setOpen] = useState(false);

  const setOpenState = useCallback((nextOpen: boolean) => {
    setOpen(nextOpen);
  }, []);

  useEffect(() => {
    const primaryHref = getPrimaryHref(pathname);

    if (primaryHref) {
      lastPrimaryHref.current = primaryHref;
    }
  }, [pathname]);

  const restorePrimaryRoute = useCallback(() => {
    if (!getPrimaryHref(pathname)) {
      if (router.canGoBack()) {
        router.back();
      } else {
        router.replace(lastPrimaryHref.current);
      }
    }
  }, [pathname]);

  const snapTo = useCallback(
    (nextOpen: boolean) => {
      slideX.value = withTiming(
        nextOpen ? screenWidth : 0,
        {
          duration: 220,
          easing: Easing.out(Easing.cubic),
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

    requestAnimationFrame(() => {
      drawerRoutes.forEach((href) => {
        router.prefetch(href);
      });
      void actions.prefetchUser();
      restorePrimaryRoute();
    });
  }, [actions, restorePrimaryRoute, snapTo]);

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
              duration: 220,
              easing: Easing.out(Easing.cubic),
            },
            (finished) => {
              if (finished) {
                runOnJS(setOpenState)(nextOpen);

                if (nextOpen) {
                  runOnJS(restorePrimaryRoute)();
                }
              }
            },
          );
        }),
    [dragStartX, restorePrimaryRoute, screenWidth, setOpenState, slideX],
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
    const primaryHref = getPrimaryHref(href);

    if (primaryHref) {
      lastPrimaryHref.current = primaryHref;
    }

    router.push(href);

    if (open) {
      snapTo(false);
    }
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
                    <View className="flex-row items-center gap-2">
                      <Pressable accessibilityRole="button" accessibilityLabel="Open profile" className={cn("min-w-0 flex-1 flex-row items-center gap-3 rounded-md px-2 py-2", profileDestination.match(pathname) ? "bg-primary" : "bg-transparent")} onPress={() => navigate(profileDestination.href)}>
                        {session.user?.avatarUrl ? (
                          <Image source={{ uri: session.user.avatarUrl }} className="size-11 rounded-full bg-muted dark:bg-slate-800" />
                        ) : (
                          <View className="size-11 items-center justify-center rounded-full bg-muted dark:bg-slate-800">
                            <UserRound color={profileDestination.match(pathname) ? colors.primaryForeground : colors.icon} size={22} />
                          </View>
                        )}
                        <View className="min-w-0 flex-1">
                          <Text className={cn("text-sm font-semibold", profileDestination.match(pathname) ? "text-primary-foreground" : "text-foreground dark:text-slate-100")} numberOfLines={1}>
                            {profileLabel}
                          </Text>
                          <Text className={cn("text-xs", profileDestination.match(pathname) ? "text-primary-foreground" : "text-muted-foreground")} numberOfLines={1}>
                            {profileSubLabel}
                          </Text>
                        </View>
                        <ChevronRight color={profileDestination.match(pathname) ? colors.primaryForeground : colors.muted} size={18} />
                      </Pressable>

                      <Pressable accessibilityRole="button" accessibilityLabel="Open settings" className={cn("size-11 items-center justify-center rounded-full border border-border bg-card dark:border-neutral-800 dark:bg-black", pathname.includes("/settings") ? "border-primary bg-primary dark:border-primary dark:bg-primary" : undefined)} onPress={() => navigate("/(tabs)/settings")}>
                        <Settings color={pathname.includes("/settings") ? colors.primaryForeground : colors.icon} size={22} />
                      </Pressable>
                    </View>
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
