import React, { useState } from "react";
import { Text, TouchableOpacity, View } from "react-native";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "../ui/alert-dialog";
import { AntDesign } from "@expo/vector-icons";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";

interface ReportModalProps {
  onClose: () => void;
}

const reportReasons = [
  { label: "Inappropriate content", value: "inappropriate_content" },
  { label: "Spam", value: "spam" },
  { label: "Harassment", value: "harassment" },
  { label: "False information", value: "false_information" },
  { label: "Hate speech", value: "hate_speech" },
  { label: "Other", value: "other" },
];

const ReportModal: React.FC<ReportModalProps> = ({ onClose }) => {
  const [selectedReason, setSelectedReason] = useState<any>({});

  const handleSelectReason = (reason: string) => {
    setSelectedReason(reason);
  };

  const handleReport = () => {
    if (selectedReason) {
      console.log(`Reported for: ${selectedReason}`);
    }
    onClose();
  };

  return (
    <AlertDialog open onOpenChange={onClose}>
      <AlertDialogContent className="w-11/12 relative bg-white">
        <AlertDialogHeader>
          <View className="flex-row items-center justify-between">
            <AlertDialogTitle>Report Post</AlertDialogTitle>
            <TouchableOpacity onPress={onClose}>
              <AntDesign name="closecircleo" size={24} color="black" />
            </TouchableOpacity>
          </View>
        </AlertDialogHeader>
        <AlertDialogDescription>
          <Text className="font-semibold text-black">Select Issue Type</Text>
          <Select
            value={selectedReason}
            onValueChange={(value) => setSelectedReason(value)}
            className="w-full relative h-14 rounded-lg"
          >
            <SelectTrigger className="w-full h-full outline-none border-none bg-white">
              <SelectValue
                className="text-[#18181B] text-md"
                placeholder="Select issue type"
              />
            </SelectTrigger>
            <SelectContent>
              {reportReasons?.map((option, index) => (
                <SelectItem
                  key={index}
                  label={option.label}
                  value={option.value}
                />
              ))}
            </SelectContent>
          </Select>
        </AlertDialogDescription>
        <AlertDialogFooter>
          <AlertDialogAction onPress={handleReport}>
            <Text className="text-white font-semibold">Send Report</Text>
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export { ReportModal };
