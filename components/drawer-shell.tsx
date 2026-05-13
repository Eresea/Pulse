import { cn } from "@/lib/cn";
import { useTheme } from "@/theme/theme";
import { router, usePathname } from "expo-router";
import { Bell, Bot, CalendarClock, ChevronRight, Home, Menu, Settings, UserRound } from "lucide-react-native";
import { ReactNode, useCallback, useMemo, useRef, useState } from "react";
import { Animated, Dimensions, PanResponder, Pressable, Text, View } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

const screenWidth = Dimensions.get("window").width;
const pageWidth = screenWidth;
const openThreshold = pageWidth * 0.14;

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

export function DrawerShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const slideX = useRef(new Animated.Value(0)).current;
  const [open, setOpen] = useState(false);

  const animateDrawer = useCallback(
    (nextOpen: boolean) => {
      setOpen(nextOpen);
      Animated.spring(slideX, {
        toValue: nextOpen ? pageWidth : 0,
        useNativeDriver: true,
        damping: 25,
        stiffness: 300,
        mass: 0.9,
      }).start();
    },
    [slideX],
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
          const next = Math.min(pageWidth, Math.max(0, (open ? pageWidth : 0) + gesture.dx));
          slideX.setValue(next);
        },
        onPanResponderRelease: (_, gesture) => {
          const next = Math.min(pageWidth, Math.max(0, (open ? pageWidth : 0) + gesture.dx));
          const projectedOpen = open ? !(gesture.vx < -0.18 || next < pageWidth - openThreshold) : gesture.vx > 0.18 || next > openThreshold;
          animateDrawer(projectedOpen);
        },
        onPanResponderTerminate: () => animateDrawer(open),
      }),
    [animateDrawer, open, slideX],
  );

  const navigate = (href: DrawerDestination["href"]) => {
    animateDrawer(false);
    router.push(href);
  };

  const drawerTranslateX = Animated.subtract(slideX, pageWidth);

  return (
    <View className="flex-1 overflow-hidden bg-background dark:bg-black" {...panResponder.panHandlers}>
      <Animated.View className="absolute bottom-0 left-0 top-0 bg-card dark:bg-black" style={{ width: pageWidth, transform: [{ translateX: drawerTranslateX }] }}>
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
        style={{
          transform: [{ translateX: slideX }],
          shadowColor: "#000",
          shadowOpacity: open ? 0.12 : 0,
          shadowRadius: 14,
          elevation: open ? 8 : 0,
        }}
      >
        {children}

        {!open ? (
          <Pressable accessibilityRole="button" accessibilityLabel="Open menu" className="absolute left-3 top-12 size-11 items-center justify-center rounded-md border border-border bg-card dark:border-neutral-800 dark:bg-black" onPress={() => animateDrawer(true)}>
            <Menu color={colors.foreground} size={20} />
          </Pressable>
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
