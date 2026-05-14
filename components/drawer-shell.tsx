import { cn } from "@/lib/cn";
import { useTheme } from "@/theme/theme";
import { router, usePathname } from "expo-router";
import { Bell, Bot, CalendarClock, ChevronRight, Home, Menu, Settings, UserRound } from "lucide-react-native";
import { ReactNode, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Animated, PanResponder, Pressable, Text, useWindowDimensions, View } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

type DrawerDestination = {
  label: string;
  href: "/(tabs)" | "/(tabs)/inbox" | "/(tabs)/settings";
  icon: React.ComponentType<{ color: string; size: number }>;
  match: (pathname: string) => boolean;
};

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

function getPageTitle(pathname: string) {
  if (pathname.includes("/settings")) {
    return "Settings";
  }
  if (pathname.includes("/inbox")) {
    return "Inbox";
  }
  return "Home";
}

export function DrawerShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const insets = useSafeAreaInsets();
  const { width: screenWidth } = useWindowDimensions();
  const { colors } = useTheme();
  const pageTitle = getPageTitle(pathname);
  const drawerWidth = Math.min(screenWidth * 0.86, 360);
  const openThreshold = drawerWidth * 0.28;
  const slideX = useRef(new Animated.Value(0)).current;
  const [open, setOpen] = useState(false);

  useEffect(() => {
    slideX.setValue(open ? drawerWidth : 0);
  }, [drawerWidth, open, slideX]);

  const animateDrawer = useCallback(
    (nextOpen: boolean) => {
      Animated.spring(slideX, {
        toValue: nextOpen ? drawerWidth : 0,
        useNativeDriver: true,
        damping: 28,
        stiffness: 260,
        mass: 0.75,
        overshootClamping: true,
        restDisplacementThreshold: 0.5,
        restSpeedThreshold: 0.5,
      }).start(() => setOpen(nextOpen));
    },
    [drawerWidth, slideX],
  );

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, gesture) => {
          const horizontal = Math.abs(gesture.dx) > Math.abs(gesture.dy) && Math.abs(gesture.dx) > 5;
          const openingSwipe = !open && gesture.dx > 5;
          const closingSwipe = open && gesture.dx < -5;
          return horizontal && (openingSwipe || closingSwipe);
        },
        onPanResponderMove: (_, gesture) => {
          const next = Math.min(drawerWidth, Math.max(0, (open ? drawerWidth : 0) + gesture.dx));
          slideX.setValue(next);
        },
        onPanResponderRelease: (_, gesture) => {
          const next = Math.min(drawerWidth, Math.max(0, (open ? drawerWidth : 0) + gesture.dx));
          const projectedOpen = open ? !(gesture.vx < -0.18 || next < drawerWidth - openThreshold) : gesture.vx > 0.18 || next > openThreshold;
          animateDrawer(projectedOpen);
        },
        onPanResponderTerminate: () => animateDrawer(open),
      }),
    [animateDrawer, drawerWidth, open, openThreshold, slideX],
  );

  const navigate = (href: DrawerDestination["href"]) => {
    animateDrawer(false);
    router.push(href);
  };

  const drawerTranslateX = Animated.subtract(slideX, drawerWidth);

  return (
    <View className="flex-1 overflow-hidden bg-background dark:bg-black" {...panResponder.panHandlers}>
      <Animated.View
        className="absolute bottom-0 left-0 top-0 bg-card dark:bg-black"
        renderToHardwareTextureAndroid
        shouldRasterizeIOS
        style={{ width: drawerWidth, transform: [{ translateX: drawerTranslateX }] }}
      >
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
              <Pressable accessibilityRole="button" className={cn("flex-row items-center gap-3 rounded-md border border-border p-3", profileDestination.match(pathname) ? "bg-primary" : "bg-background dark:bg-black")} onPress={() => navigate(profileDestination.href)}>
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
        style={{
          transform: [{ translateX: slideX }],
          shadowColor: "#000",
          shadowOpacity: 0.12,
          shadowRadius: 14,
          elevation: 8,
        }}
      >
        {children}

        {!open ? (
          <SafeAreaView pointerEvents="box-none" className="absolute left-0 right-0 top-0" edges={["top"]}>
            <View className="flex-row items-center gap-3 px-4 pb-2 pt-2">
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Open menu"
                className="size-11 items-center justify-center rounded-full border border-border bg-card dark:border-neutral-800 dark:bg-black"
                onPress={() => animateDrawer(true)}
              >
                <Menu color={colors.foreground} size={20} />
              </Pressable>
              <Text className="text-3xl font-bold text-foreground dark:text-slate-100">{pageTitle}</Text>
            </View>
          </SafeAreaView>
        ) : null}
      </Animated.View>
    </View>
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
