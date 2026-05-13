import "../global.css";

import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { AppStateProvider } from "@/state/app-state";
import { ThemeProvider, useTheme } from "@/theme/theme";

export default function RootLayout() {
  return (
    <ThemeProvider>
      <AppStateProvider>
        <RootStack />
      </AppStateProvider>
    </ThemeProvider>
  );
}

function RootStack() {
  const { resolvedTheme, colors } = useTheme();

  return (
    <>
      <StatusBar style={resolvedTheme === "dark" ? "light" : "dark"} />
      <Stack
        screenOptions={{
          headerShown: false,
          animation: "fade_from_bottom",
          contentStyle: { backgroundColor: colors.background }
        }}
      />
    </>
  );
}
