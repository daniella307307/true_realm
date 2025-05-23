// @ts-nocheck
import React, { useCallback, useState, useEffect, useRef, useMemo } from "react";
import { 
  View, 
  Text, 
  TouchableOpacity, 
  ScrollView, 
  Platform, 
  BackHandler,
  Modal,
  StyleSheet,
  Dimensions
} from "react-native";
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
  const [dropdownLayout, setDropdownLayout] = useState({ x: 0, y: 0, width: 0, height: 0 });
  const dropdownRef = useRef(null);
  const { height: windowHeight } = Dimensions.get('window');

  // Memoize filtered data to prevent unnecessary recalculations
  const filteredData = useMemo(() => 
    data.filter((item) => item.label !== "N/A" && item.label !== "Select"),
    [data]
  );

  // Calculate if dropdown should open upward
  const calculateShouldOpenUpward = useCallback(() => {
    const dropdownBottom = dropdownLayout.y + dropdownLayout.height;
    const spaceBelow = windowHeight - dropdownBottom;
    return spaceBelow < 200 && dropdownBottom > 200;
  }, [dropdownLayout, windowHeight]);

  // Close dropdown when clicking outside or pressing back button
  useEffect(() => {
    const handleBackPress = () => {
      if (expanded) {
        setExpanded(false);
        return true;
      }
      return false;
    };

    if (Platform.OS === 'android') {
      const backHandler = BackHandler.addEventListener('hardwareBackPress', handleBackPress);
      return () => backHandler.remove();
    }
  }, [expanded]);

  const toggleExpanded = useCallback(() => {
    if (!disabled) {
      if (!expanded && dropdownRef.current) {
        dropdownRef.current.measure((x, y, width, height, pageX, pageY) => {
          setDropdownLayout({
            x: pageX,
            y: pageY,
            width: width,
            height: height
          });
        });
      }
      setExpanded(!expanded);
    }
  }, [expanded, disabled]);

  const onSelect = useCallback((item: OptionItem) => {
    onChange(item);
    setSelectedItem(item);
    setExpanded(false);
  }, [onChange]);

  // Memoize the dropdown content to prevent unnecessary re-renders
  const dropdownContent = useMemo(() => {
    if (!expanded) return null;

    const shouldOpenUpward = calculateShouldOpenUpward();
    const content = (
      <ScrollView
        nestedScrollEnabled={true}
        contentContainerStyle={{
          paddingVertical: 8,
        }}
        style={{
          maxHeight: 200,
        }}
      >
        {filteredData.map((item, index) => (
          <TouchableOpacity
            key={`${item.value}-${index}`}
            onPress={() => onSelect(item)}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              padding: 8,
              paddingHorizontal: 16,
              backgroundColor: selectedItem?.value === item.value ? '#A23A91' : 'white',
              marginBottom: 4,
            }}
          >
            <View style={{ flex: 1 }}>
              <Text
                style={{
                  fontSize: 14,
                  color: selectedItem?.value === item.value ? 'white' : '#18181B',
                }}
              >
                {item.label}
              </Text>
            </View>
            {selectedItem?.value === item.value && (
              <Check size={16} strokeWidth={3} color="white" />
            )}
          </TouchableOpacity>
        ))}
      </ScrollView>
    );

    if (Platform.OS === 'web') {
      return (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 50,
          }}
          onClick={() => setExpanded(false)}
        >
          <div
            style={{
              position: 'absolute',
              left: `${dropdownLayout.x}px`,
              top: shouldOpenUpward 
                ? `${dropdownLayout.y - Math.min(filteredData.length * 40 + 16, 216)}px` 
                : `${dropdownLayout.y + dropdownLayout.height + 8}px`,
              width: `${dropdownLayout.width}px`,
              maxHeight: '200px',
              backgroundColor: 'white',
              borderRadius: '8px',
              boxShadow: '0 2px 10px rgba(0, 0, 0, 0.1)',
              border: '1px solid #E4E4E7',
              overflow: 'hidden',
              zIndex: 999,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {content}
          </div>
        </div>
      );
    }

    return (
      <Modal
        visible={expanded}
        transparent={true}
        animationType="none"
        onRequestClose={() => setExpanded(false)}
      >
        <TouchableOpacity
          style={StyleSheet.absoluteFill}
          activeOpacity={1}
          onPress={() => setExpanded(false)}
        >
          <View
            style={{
              position: 'absolute',
              left: dropdownLayout.x,
              top: shouldOpenUpward
                ? dropdownLayout.y - Math.min(filteredData.length * 40 + 6, 216)
                : dropdownLayout.y + dropdownLayout.height / 1.5,
              width: dropdownLayout.width,
              maxHeight: 200,
              backgroundColor: 'white',
              borderRadius: 8,
              elevation: 4,
              shadowColor: "#949494",
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.1,
              shadowRadius: 8,
              borderWidth: 1,
              borderColor: '#E4E4E7',
            }}
          >
            {content}
          </View>
        </TouchableOpacity>
      </Modal>
    );
  }, [expanded, filteredData, selectedItem, dropdownLayout, calculateShouldOpenUpward, onSelect]);

  return (
    <View className={cn("relative", className)}>
      <TouchableOpacity
        ref={dropdownRef}
        activeOpacity={0.8}
        onPress={toggleExpanded}
        className={cn(
          "flex flex-row items-center bg-white justify-between h-14 px-4 rounded-lg border border-[#E4E4E7]",
          disabled && "opacity-50"
        )}
        style={{
          minHeight: 56,
          paddingVertical: 12,
        }}
      >
        <Text className="text-base text-[#18181B] opacity-80">
          {selectedItem?.label || placeholder}
        </Text>
        {expanded ? (
          <ChevronUp size={20} className="text-foreground opacity-60" />
        ) : (
          <ChevronDown size={20} className="text-foreground opacity-60" />
        )}
      </TouchableOpacity>

      {dropdownContent}
    </View>
  );
}

// For use as a replacement for Select components
export const Select = Dropdown;
export const SelectTrigger = ({ children, ...props }: { children: React.ReactNode, props: any }) => <View {...props}>{children}</View>;
export const SelectValue = ({ placeholder }: { placeholder: string }) => <Text>{placeholder}</Text>;
export const SelectContent = ({ children }: { children: React.ReactNode }) => <>{children}</>;
export const SelectItem = ({ value, label }: { value: string, label: string }) => ({ value, label });