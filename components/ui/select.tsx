import React, { useCallback, useState, useEffect } from "react";
import { View, Text, TouchableOpacity, ScrollView, Platform, BackHandler } from "react-native";
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

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleBackPress = () => {
      if (expanded) {
        setExpanded(false);
        return true;
      }
      return false;
    };

    // Add listener for Android back button
    if (Platform.OS === 'android') {
      const backHandler = BackHandler.addEventListener('hardwareBackPress', handleBackPress);
      return () => backHandler.remove();
    }
  }, [expanded]);

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

  // Filter out N/A and Select options
  const filteredData = data.filter((item) => 
    item.label !== "N/A" && item.label !== "Select"
  );

  return (
    <View className={cn("relative", className)}>
      <TouchableOpacity
        activeOpacity={0.8}
        onPress={toggleExpanded}
        className={cn(
          "flex flex-row items-center bg-white justify-between h-12 px-4 bg-white rounded-lg border border-[#E4E4E7]",
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
        <View 
          className="mt-2 border rounded-lg border-[#E4E4E7] bg-white overflow-hidden absolute left-0 right-0"
          style={{
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.1,
            shadowRadius: 8,
            elevation: 5,
            height: Math.min(250, filteredData.length * 42), // Dynamic height based on items count with a maximum
            zIndex: 9999,
            position: 'absolute',
            width: '100%',
            backgroundColor: 'white',
          }}
        >
          <ScrollView 
            className="py-2 bg-white"
            showsVerticalScrollIndicator={true}
            contentContainerStyle={{
              paddingBottom: 4,
            }}
            nestedScrollEnabled={true}
            scrollEnabled={true}
          >
            {filteredData.map((item, index) => (
              <React.Fragment key={`${item.value}-${item.label}`}>
                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={() => onSelect(item)}
                  className={cn(
                    "flex flex-row items-center bg-white h-10 px-4 web:hover:bg-gray-100",
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
                {index < filteredData.length - 1 && <View className="h-1" />}
              </React.Fragment>
            ))}
          </ScrollView>
        </View>
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