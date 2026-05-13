import { Pressable, PressableProps, Text } from "react-native";
import { cn } from "@/lib/cn";

type ButtonVariant = "default" | "outline" | "ghost";
type ButtonProps = Omit<PressableProps, "children"> & {
  children: string;
  textClassName?: string;
  variant?: ButtonVariant;
};

export function Button({
  className,
  textClassName,
  variant = "default",
  children,
  disabled,
  ...props
}: ButtonProps) {
  return (
    <Pressable
      className={cn(
        "h-11 items-center justify-center rounded-md px-4",
        variant === "default" && "bg-primary",
        variant === "outline" && "border border-border bg-card",
        variant === "ghost" && "bg-transparent",
        disabled && "opacity-50",
        className
      )}
      disabled={disabled}
      {...props}
    >
      <Text
        className={cn(
          "text-sm font-semibold",
          variant === "default" && "text-primary-foreground",
          variant === "outline" && "text-foreground",
          variant === "ghost" && "text-foreground",
          textClassName
        )}
      >
        {children}
      </Text>
    </Pressable>
  );
}
