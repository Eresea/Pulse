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
        variant === "outline" && "border border-border bg-card dark:border-neutral-800 dark:bg-black",
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
          variant === "outline" && "text-foreground dark:text-slate-100",
          variant === "ghost" && "text-foreground dark:text-slate-100",
          textClassName
        )}
      >
        {children}
      </Text>
    </Pressable>
  );
}
