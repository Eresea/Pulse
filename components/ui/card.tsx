import { Text, TextProps, View, ViewProps } from "react-native";
import { cn } from "@/lib/cn";

export function Card({ className, ...props }: ViewProps) {
  return <View className={cn("rounded-lg border border-border bg-card", className)} {...props} />;
}

export function CardHeader({ className, ...props }: ViewProps) {
  return <View className={cn("p-4 pb-2", className)} {...props} />;
}

export function CardContent({ className, ...props }: ViewProps) {
  return <View className={cn("p-4 pt-2", className)} {...props} />;
}

export function CardTitle({ className, ...props }: TextProps) {
  return <Text className={cn("text-base font-semibold text-card-foreground", className)} {...props} />;
}
