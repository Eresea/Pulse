import { Text, TextProps } from "react-native";
import { cn } from "@/lib/cn";

type BadgeVariant = "default" | "secondary" | "outline";

export function Badge({
  className,
  variant = "default",
  ...props
}: TextProps & {
  variant?: BadgeVariant;
}) {
  return (
    <Text
      className={cn(
        "self-start rounded-sm px-2 py-1 text-xs font-semibold",
        variant === "default" && "bg-primary text-primary-foreground",
        variant === "secondary" && "bg-muted text-foreground",
        variant === "outline" && "border border-border bg-card text-muted-foreground",
        className
      )}
      {...props}
    />
  );
}
