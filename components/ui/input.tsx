import { ComponentType, forwardRef, useState } from "react";
import { Text, TextInput, TextInputProps, View } from "react-native";
import { cn } from "@/lib/cn";
import { useTheme } from "@/theme/theme";

type InputProps = TextInputProps & {
  icon?: ComponentType<{ color: string; size: number }>;
  label?: string;
};

export const Input = forwardRef<TextInput, InputProps>(function Input(
  { className, icon: Icon, label, onBlur, onFocus, placeholderTextColor, style, ...props },
  ref
) {
  const { colors } = useTheme();
  const [focused, setFocused] = useState(false);

  return (
    <View className="gap-2">
      {label ? <Text className="text-xs font-semibold uppercase text-muted-foreground dark:text-slate-400">{label}</Text> : null}
      <View
        className={cn(
          "h-12 flex-row items-center gap-3 rounded-md border bg-card px-3 dark:bg-black",
          focused ? "border-primary" : "border-input dark:border-neutral-800",
          className
        )}
      >
        {Icon ? <Icon color={focused ? colors.icon : colors.muted} size={18} /> : null}
        <TextInput
          ref={ref}
          className="min-w-0 flex-1 p-0 text-base text-foreground dark:text-slate-100"
          placeholderTextColor={placeholderTextColor ?? colors.muted}
          selectionColor={colors.primary}
          underlineColorAndroid="transparent"
          onBlur={(event) => {
            setFocused(false);
            onBlur?.(event);
          }}
          onFocus={(event) => {
            setFocused(true);
            onFocus?.(event);
          }}
          style={[{ backgroundColor: "transparent" }, style]}
          {...props}
        />
      </View>
    </View>
  );
});
