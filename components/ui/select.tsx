import React, { useCallback, useRef, useState } from "react";
import { View, Text, TouchableOpacity, Modal, TouchableWithoutFeedback, Platform, FlatList } from "react-native";
import { Check } from "~/lib/icons/Check";
import { ChevronDown } from "~/lib/icons/ChevronDown";
import { ChevronUp } from "~/lib/icons/ChevronUp";
import { cn } from "~/lib/utils";

type OptionItem = {
  value: string;
  label: string;
};

interface DropdownProps {
  data: OptionItem[];
  onChange: (item: OptionItem) => void;
  placeholder: string;
  disabled?: boolean;
  className?: string;
}

export default function Dropdown({
  data,
  onChange,
  placeholder,
  disabled = false,
  className,
}: DropdownProps) {
  const [expanded, setExpanded] = useState(false);
  const [selectedItem, setSelectedItem] = useState<OptionItem | null>(null);
  const [top, setTop] = useState(0);
  
  const buttonRef = useRef<View>(null);

  const toggleExpanded = useCallback(() => {
    if (!disabled) {
      setExpanded(!expanded);
    }
  }, [expanded, disabled]);

  const onSelect = useCallback((item: OptionItem) => {
    onChange(item);
    setSelectedItem(item);
    setExpanded(false);
  }, [onChange]);

  return (
    <View
      ref={buttonRef}
      className={cn("relative", className)}
      onLayout={(event) => {
        const layout = event.nativeEvent.layout;
        const topOffset = layout.y;
        const heightOfComponent = layout.height;
        const finalValue = topOffset + heightOfComponent + (Platform.OS === "android" ? -32 : 3);
        setTop(finalValue);
      }}
    >
      <TouchableOpacity
        activeOpacity={0.8}
        onPress={toggleExpanded}
        className={cn(
          "flex flex-row items-center justify-between h-12 px-4 bg-white rounded-lg border border-[#E4E4E7]",
          disabled && "opacity-50"
        )}
      >
        <Text className="text-sm text-[#18181B] opacity-80">
          {selectedItem?.label || placeholder}
        </Text>
        {expanded ? (
          <ChevronUp size={16} className="text-foreground opacity-60" />
        ) : (
          <ChevronDown size={16} className="text-foreground opacity-60" />
        )}
      </TouchableOpacity>

      {expanded && (
        <Modal visible={expanded} transparent>
          <TouchableOpacity onPress={() => setExpanded(false)}>
            <View className="flex-1 justify-center items-center px-5">
              <View
                className="absolute bg-white w-full rounded-lg shadow-lg" 
                style={{ 
                  top,
                  shadowColor: "#000",
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.1,
                  shadowRadius: 8,
                  elevation: 5,
                  maxHeight: 250,
                }}
              >
                <FlatList
                  keyExtractor={(item) => 
                    // make a unique structure for the item
                    `${item.value}-${item.label}`
                  }
                  data={data}
                  renderItem={({ item }) => (
                    <TouchableOpacity
                      activeOpacity={0.8}
                      onPress={() => onSelect(item)}
                      className={cn(
                        "flex flex-row items-center h-10 px-4 web:hover:bg-gray-100",
                        selectedItem?.value === item.value && "bg-primary"
                      )}
                    >
                      <View className="flex-1">
                        <Text 
                          className={cn(
                            "text-sm",
                            selectedItem?.value === item.value && "text-white"
                          )}
                        >
                          {item.label}
                        </Text>
                      </View>
                      {selectedItem?.value === item.value && (
                        <Check size={16} strokeWidth={3} className="text-white" />
                      )}
                    </TouchableOpacity>
                  )}
                  ItemSeparatorComponent={() => (
                    <View className="h-1" />
                  )}
                  className="py-2"
                />
              </View>
            </View>
          </TouchableOpacity>
        </Modal>
      )}
    </View>
  );
}

// For use as a replacement for Select components
export const Select = Dropdown;
export const SelectTrigger = ({ children, ...props }: { children: React.ReactNode, props: any }) => <View {...props}>{children}</View>;
export const SelectValue = ({ placeholder }: { placeholder: string }) => <Text>{placeholder}</Text>;
export const SelectContent = ({ children }: { children: React.ReactNode }) => <>{children}</>;
export const SelectItem = ({ value, label }: { value: string, label: string }) => ({ value, label });