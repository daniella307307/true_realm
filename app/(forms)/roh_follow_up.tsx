import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Platform,
  KeyboardAvoidingView,
} from "react-native";
import { Picker } from "@react-native-picker/picker";

interface RohFollowUpFormProps {
  onSubmit: (data: {
    roh_feedback: string;
    roh_resolution_status: string;
  }) => void;
  initialData?: { roh_feedback: string; roh_resolution_status: string };
}

const RohFollowUp: React.FC<RohFollowUpFormProps> = ({
  onSubmit,
  initialData,
}) => {
  const [formData, setFormData] = useState({
    roh_feedback: initialData?.roh_feedback || "",
    roh_resolution_status: initialData?.roh_resolution_status || "pending",
  });

  const [errors, setErrors] = useState({
    roh_feedback: "",
    roh_resolution_status: "",
  });

  const handleSubmit = () => {
    // Validate form
    const newErrors = {
      roh_feedback: !formData.roh_feedback ? "Feedback is required" : "",
      roh_resolution_status: !formData.roh_resolution_status
        ? "Resolution status is required"
        : "",
    };

    setErrors(newErrors);

    // Only submit if there are no errors
    if (!newErrors.roh_feedback && !newErrors.roh_resolution_status) {
      onSubmit(formData);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      className={"flex-1 bg-white"}
    >
      <ScrollView showsVerticalScrollIndicator={false}>
        <View className={"p-5 max-w-lg w-full mx-auto"}>
          <Text className={"text-2xl font-bold mb-5 text-gray-800"}>
            Risk of Harm Follow-up
          </Text>

          <View className={"mb-5"}>
            <Text className={"text-base font-medium mb-2 text-gray-700"}>
              Feedback
            </Text>
            <TextInput
              className={`
                "border rounded-md p-3 text-base bg-white",
                ${errors.roh_feedback ? "border-red-500" : "border-gray-300"}
            `}
              multiline
              placeholder="Enter detailed feedback about the risk of harm incident..."
              value={formData.roh_feedback}
              onChangeText={(text) => {
                setFormData((prev) => ({ ...prev, roh_feedback: text }));
                if (errors.roh_feedback) {
                  setErrors((prev) => ({ ...prev, roh_feedback: "" }));
                }
              }}
            />
            {errors.roh_feedback ? (
              <Text className={"mt-1 text-sm text-red-500"}>
                {errors.roh_feedback}
              </Text>
            ) : null}
          </View>

          <View className={"mb-5"}>
            <Text className={"text-base font-medium mb-2 text-gray-700"}>
              Resolution Status
            </Text>
            <View
              className={`border rounded-md overflow-hidden",
              ${
                errors.roh_resolution_status
                  ? "border-red-500"
                  : "border-gray-300"
              },
            `}
            >
              <Picker
                selectedValue={formData.roh_resolution_status}
                style={{ height: 50 }}
                onValueChange={(itemValue) => {
                  setFormData((prev) => ({
                    ...prev,
                    roh_resolution_status: itemValue,
                  }));
                  if (errors.roh_resolution_status) {
                    setErrors((prev) => ({
                      ...prev,
                      roh_resolution_status: "",
                    }));
                  }
                }}
              >
                <Picker.Item label="Pending" value="pending" />
                <Picker.Item label="In Progress" value="in_progress" />
                <Picker.Item label="Resolved" value="resolved" />
                <Picker.Item label="Escalated" value="escalated" />
                <Picker.Item label="Closed" value="closed" />
              </Picker>
            </View>
            {errors.roh_resolution_status ? (
              <Text className={"mt-1 text-sm text-red-500"}>
                {errors.roh_resolution_status}
              </Text>
            ) : null}
          </View>

          <TouchableOpacity
            className={"bg-blue-600 rounded-md py-3 px-4 items-center mt-3"}
            onPress={handleSubmit}
          >
            <Text className={"text-white font-semibold text-base"}>Submit</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

export default RohFollowUp;
