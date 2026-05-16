import { cn } from "@/lib/cn";
import { ReactNode } from "react";
import { ScrollView, type ScrollViewProps } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

type ScreenProps = {
  children: ReactNode;
};

type ScreenScrollViewProps = ScrollViewProps & {
  contentContainerClassName?: string;
};

export function Screen({ children }: ScreenProps) {
  return (
    <SafeAreaView className="flex-1 bg-background dark:bg-black" edges={["top", "bottom"]}>
      {children}
    </SafeAreaView>
  );
}

export function ScreenScrollView({ contentContainerClassName, ...props }: ScreenScrollViewProps) {
  return <ScrollView contentContainerClassName={cn("gap-4 px-4 pb-4 pt-2", contentContainerClassName)} {...props} />;
}
