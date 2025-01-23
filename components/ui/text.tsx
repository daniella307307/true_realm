import * as Slot from '@rn-primitives/slot';
import type { SlottableTextProps, TextRef } from '@rn-primitives/types';
import * as React from 'react';
import { Text as RNText } from 'react-native';
import { useTextSize } from '~/app/_layout';
import { cn } from '~/lib/utils';

const TextClassContext = React.createContext<string | undefined>(undefined);

const Text = React.forwardRef<TextRef, SlottableTextProps>(
  ({ className, asChild = false, ...props }, ref) => {
    const textClass = React.useContext(TextClassContext);
    const { textScale } = useTextSize();
    const Component = asChild ? Slot.Text : RNText;
    return (
      <Component
        className={cn('text-base text-foreground web:select-text', textClass, className)}
        ref={ref}
        style={{ fontSize: 16 * textScale }}
        {...props}
      />
    );
  }
);
Text.displayName = 'Text';

export { Text, TextClassContext };
