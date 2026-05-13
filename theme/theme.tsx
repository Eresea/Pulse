import { createContext, ReactNode, useContext, useMemo, useState } from "react";
import { useColorScheme, View } from "react-native";

export type ThemeMode = "system" | "light" | "dark";
type ResolvedTheme = "light" | "dark";

type ThemeContextValue = {
  mode: ThemeMode;
  resolvedTheme: ResolvedTheme;
  setMode: (mode: ThemeMode) => void;
  colors: {
    background: string;
    card: string;
    foreground: string;
    muted: string;
    primary: string;
    primaryForeground: string;
    border: string;
    icon: string;
  };
};

const lightColors = {
  background: "#f8fafc",
  card: "#ffffff",
  foreground: "#0f172a",
  muted: "#64748b",
  primary: "#0f766e",
  primaryForeground: "#ffffff",
  border: "#e2e8f0",
  icon: "#0f766e"
};

const darkColors = {
  background: "#000000",
  card: "#000000",
  foreground: "#e2e8f0",
  muted: "#94a3b8",
  primary: "#2dd4bf",
  primaryForeground: "#042f2e",
  border: "#1f2937",
  icon: "#5eead4"
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const systemScheme = useColorScheme();
  const [mode, setMode] = useState<ThemeMode>("system");
  const resolvedTheme: ResolvedTheme = mode === "system" ? (systemScheme === "dark" ? "dark" : "light") : mode;
  const colors = resolvedTheme === "dark" ? darkColors : lightColors;

  const value = useMemo(
    () => ({
      mode,
      resolvedTheme,
      setMode,
      colors
    }),
    [colors, mode, resolvedTheme]
  );

  return (
    <ThemeContext.Provider value={value}>
      <View className={resolvedTheme === "dark" ? "dark flex-1" : "flex-1"}>{children}</View>
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const value = useContext(ThemeContext);
  if (!value) {
    throw new Error("useTheme must be used within ThemeProvider");
  }
  return value;
}
