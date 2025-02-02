import * as Slot from "@rn-primitives/slot";
import type { SlottableTextProps, TextRef } from "@rn-primitives/types";
import * as React from "react";
import { Text as RNText } from "react-native";
import { cn } from "~/lib/utils";
import { useFontSize } from "~/providers/FontSizeContext";

const TextClassContext = React.createContext<string | undefined>(undefined);

const Text = React.forwardRef<TextRef, SlottableTextProps>(
  ({ className, asChild = false, style, ...props }, ref) => {
    const textClass = React.useContext(TextClassContext);
    const { fontSize } = useFontSize(); // Get global font size
    const Component = asChild ? Slot.Text : RNText;

    return (
      <Component
        className={cn("text-base text-foreground web:select-text", textClass, className)}
        ref={ref}
        style={[style, { fontSize }]} // Apply dynamic font size
        {...props}
      />
    );
  }
);
Text.displayName = "Text";

export { Text, TextClassContext };
