import React, { useState, useEffect, useRef, useMemo } from "react";
import {
  View,
  ScrollView,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from "react-native";

import { router } from "expo-router";

import i18n from "~/utils/i18n";
import { useForm, useWatch } from "react-hook-form";
import { FormField, IFormSubmissionDetail } from "~/types";
import { Pencil } from "lucide-react-native";
import { RealmContext } from "~/providers/RealContextProvider";
import { SurveySubmission } from "~/models/surveys/survey-submission";
import { saveSurveySubmission } from "~/services/survey-submission";
import { useAuth } from "~/lib/hooks/useAuth";
import { useTranslation } from "react-i18next";

import DateTimePickerComponent from "./ui/date-time-picker";
import { Button } from "./ui/button";
import { FlowState } from "./FormFlowManager";
import { Text } from "./ui/text";
import {
  TextFieldComponent,
  TextAreaComponent,
  RadioBoxComponent,
  SelectBoxComponent,
  SwitchComponent,
  CheckBoxComponent,
} from "./DynamicComponents";
import { AnswerPreview } from "./AnswerPreview";
const { useRealm, useQuery } = RealmContext;

export interface DynamicFieldProps {
  field: FormField;
  control: any;
  language?: string;
  type?: string;
}

export const getLocalizedTitle = (
  title: { en: string; kn: string; default: string },
  locale = i18n.language
): string => {
  // Convert locale to the language code used in your title object
  const language = locale.startsWith("rw") ? "kn" : "en";
  return title[language as keyof typeof title] || title.default;
};

const DynamicField: React.FC<DynamicFieldProps> = ({
  field,
  control,
  language,
}) => {
  const { user } = useAuth({});
  const [isVisible, setIsVisible] = useState(true);

  const dependentFieldValue = useWatch({
    control,
    name: field.conditional?.when || "",
    defaultValue: "",
  });

  useEffect(() => {
    if (field.conditional) {
      const shouldShow = field.conditional?.eq === dependentFieldValue;
      setIsVisible(shouldShow);
    }
  }, [field.conditional, dependentFieldValue]);

  if (!isVisible) return null;

  if (
    field.key === "district" ||
    field.key === "sector" ||
    field.key === "cell" ||
    field.key === "village"
  ) {
    if (user?.location) {
      const locationKey = field.key as keyof typeof user.location;
      setTimeout(() => {
        control._setValue(field.key, user.location[locationKey], {
          shouldValidate: true,
        });
      }, 0);
    }
    return null;
  }

  switch (field.type) {
    case "textfield":
      return (
        <TextFieldComponent
          field={field}
          control={control}
          language={language}
        />
      );
    case "number":
      return (
        <TextFieldComponent
          field={field}
          type="number"
          control={control}
          language={language}
        />
      );
    case "phoneNumber":
      return (
        <TextFieldComponent
          field={field}
          type="phoneNumber"
          control={control}
          language={language}
        />
      );
    case "select":
      return (
        <SelectBoxComponent
          field={field}
          control={control}
          language={language}
        />
      );
    case "switch":
      return (
        <SwitchComponent field={field} control={control} language={language} />
      );
    case "checkbox":
    case "selectboxes":
      return (
        <CheckBoxComponent
          field={field}
          control={control}
          language={language}
        />
      );
    case "textarea":
      return (
        <TextAreaComponent
          field={field}
          control={control}
          language={language}
        />
      );
    case "radio":
      return (
        <RadioBoxComponent
          field={field}
          control={control}
          language={language}
        />
      );
    case "datetime":
    case "date":
    case "time":
      return (
        <DateTimePickerComponent
          field={field}
          control={control}
          language={language}
        />
      );

    default:
      return null;
  }
};

export const formatTime = (timeInSeconds: number): string => {
  const minutes = Math.floor(timeInSeconds / 60);
  const seconds = timeInSeconds % 60;
  return `${minutes}:${seconds < 10 ? "0" : ""}${seconds}`;
};
interface DynamicFormProps {
  fields: FormField[];
  wholeComponent?: boolean;
  language?: string;
  flowState: FlowState;
  formSubmissionMandatoryFields: IFormSubmissionDetail;
  timeSpent: number;
  onEditFlowState: (step: string) => void;
}

const DynamicForm: React.FC<DynamicFormProps> = ({
  fields,
  wholeComponent = false,
  flowState,
  formSubmissionMandatoryFields,
  language,
  timeSpent,
  onEditFlowState,
}) => {
  if (!Array.isArray(fields)) {
    console.error("Fields prop is not an array:", fields);
    return (
      <View className="flex-1 justify-center items-center">
        <Text className="text-red-500">Error: Invalid form fields</Text>
      </View>
    );
  }

  const { control, handleSubmit, getValues, trigger, formState, setValue } =
    useForm({
      mode: "onChange",
    });
  const { t, i18n: i18nInstance } = useTranslation();
  const [currentPage, setCurrentPage] = useState(0);
  const [showPreview, setShowPreview] = useState(false);
  const [formData, setFormData] = useState({});
  const [validationError, setValidationError] = useState(false);
  const [currentLanguage, setCurrentLanguage] = useState(
    language || i18nInstance.language
  );
  const [submitting, setSubmitting] = useState(false);
  const [editingFieldKey, setEditingFieldKey] = useState<string | null>(null);
  const [visibleFields, setVisibleFields] = useState<FormField[]>([]);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const realm = useRealm();

  const formValues = useWatch({
    control,
  });

  useEffect(() => {
    const filteredFields = fields
      .filter((field) => {
        if (!field || typeof field !== "object") {
          console.warn("Invalid field:", field);
          return false;
        }
        if (!field.key || typeof field.key !== "string") {
          console.warn("Field missing valid key:", field);
          return false;
        }
        return true;
      })
      .filter((field) => {
        // Skip flow state fields
        if (field.key === "izucode" || field.key === "izu_id") return false;
        if (["district", "sector", "cell", "village"].includes(field.key))
          return false;
        if (field.key === "submit") return false;

        // Check conditional visibility
        if (field.conditional) {
          const dependentValue = formValues[field.conditional.when];
          return field.conditional.eq === dependentValue;
        }

        return true;
      });

    setVisibleFields(filteredFields);
    
    // Only reset current page on initial load
    if (isInitialLoad) {
      setCurrentPage(0);
      setIsInitialLoad(false);
    }
  }, [fields, formValues, isInitialLoad]);

  const fieldIndexMap = useMemo(() => {
    const map: Record<string, number> = {};
    visibleFields.forEach((field, index) => {
      if (field && field.key) {
        map[field.key] = index;
      }
    });
    return map;
  }, [visibleFields]);

  useEffect(() => {
    if (!language) {
      setCurrentLanguage(i18nInstance.language);
    }
  }, [i18nInstance.language, language]);

  const onSubmit = async (data: any) => {
    if (submitting) return; // Prevent multiple submissions

    // Only process final submission when actually submitting (not when previewing)
    if (showPreview) {
      setSubmitting(true);

      try {
        const projectId = formSubmissionMandatoryFields.project_id || 0;
        const sourceModuleId =
          formSubmissionMandatoryFields.source_module_id || 0;
        const surveyId = formSubmissionMandatoryFields.id || 0;
        const familyId = flowState?.selectedValues?.families?.hh_id || null;

        // Check for existing submission before proceeding
        const existingSubmission = realm
          .objects<SurveySubmission>("SurveySubmission")
          .filtered(
            "project_id == $0 AND source_module_id == $1 AND survey_id == $2 AND family == $3",
            projectId,
            sourceModuleId,
            surveyId,
            familyId
          );

        if (existingSubmission.length > 0) {
          Alert.alert(
            t("SubmissionExists.title", "Submission Already Exists"),
            t(
              "SubmissionExists.message",
              "A submission for this form and family already exists."
            ),
            [{ text: t("Common.ok", "OK") }]
          );
          setSubmitting(false); // Reset submitting state
          return; // Stop the submission process
        }

        console.log("Final submission:", data);

        const dataWithTime = {
          ...data,
          table_name: formSubmissionMandatoryFields.table_name,
          project_module_id:
            formSubmissionMandatoryFields.project_module_id || 0,
          source_module_id: formSubmissionMandatoryFields.source_module_id || 0,
          project_id: formSubmissionMandatoryFields.project_id || 0,
          survey_id: formSubmissionMandatoryFields.id || 0,
          post_data: formSubmissionMandatoryFields.post_data,
          userId: formSubmissionMandatoryFields.userId || 0,
          province: flowState?.selectedValues?.locations?.province?.id
            ? Number(flowState.selectedValues.locations.province.id)
            : 0,
          district: flowState?.selectedValues?.locations?.district?.id
            ? Number(flowState.selectedValues.locations.district.id)
            : 0,
          sector: flowState?.selectedValues?.locations?.sector?.id
            ? Number(flowState.selectedValues.locations.sector.id)
            : 0,
          cell: flowState?.selectedValues?.locations?.cell?.id
            ? Number(flowState.selectedValues.locations.cell.id)
            : 0,
          village: flowState?.selectedValues?.locations?.village?.id
            ? Number(flowState.selectedValues.locations.village.id)
            : 0,
          family: familyId,
          izucode: flowState?.selectedValues?.izus?.user_code || null,
          cohort: flowState?.selectedValues?.cohorts?.id
            ? Number(flowState.selectedValues.cohorts.id)
            : 0,
          language: currentLanguage,
          timeSpentFormatted: formatTime(timeSpent),
        };

        dataWithTime.post_data;
        console.log("dataWithTime", dataWithTime);
        console.log("API URL:", dataWithTime.post_data);

        const result = await saveSurveySubmission(realm, dataWithTime, fields);
        console.log("Save result:", result);

        // Show success alert and navigate
        Alert.alert(
          "Submission Successful",
          "Your form has been submitted successfully.",
          [
            {
              text: "OK",
              onPress: () => router.push("/(history)/history"),
            },
          ]
        );
      } catch (error) {
        console.error("Error saving survey submission:", error);
        // Show error message to user
        Alert.alert(
          "Submission Error",
          "There was an error submitting your form. Please try again.",
          [{ text: "OK" }]
        );
      } finally {
        // This ensures submitting state is reset whether success or failure
        setSubmitting(false);
      }
    } else {
      // This is just for preview, set form data and show preview
      setFormData(data);
      setShowPreview(true);
    }
  };

  const validateAndProceed = async () => {
    if (visibleFields.length === 0) return;
    
    const currentField = visibleFields[currentPage];
    if (!currentField) return;

    const isValid = await trigger(currentField.key);
    if (isValid) {
      setValidationError(false);
      if (currentPage < visibleFields.length - 1) {
        setCurrentPage(currentPage + 1);
      }
    } else {
      setValidationError(true);
      setTimeout(() => setValidationError(false), 2000);
    }
  };

  const handleNext = () => {
    if (visibleFields.length === 0) return;
    if (currentPage < visibleFields.length - 1) {
      validateAndProceed();
    }
  };

  const handlePrevious = () => {
    if (visibleFields.length === 0) return;
    if (currentPage > 0) {
      const previousPage = currentPage - 1;
      const previousField = visibleFields[previousPage];
      
      // If the previous field controls conditional visibility, reset visible fields
      if (previousField && previousField.key) {
        const isConditionalControl = fields.some(field => 
          field.conditional?.when === previousField.key
        );
        
        if (isConditionalControl) {
          // Force a re-evaluation of visible fields
          const currentValues = getValues();
          const filteredFields = fields
            .filter((field) => {
              if (!field || typeof field !== "object") return false;
              if (!field.key || typeof field.key !== "string") return false;
              return true;
            })
            .filter((field) => {
              if (field.key === "izucode" || field.key === "izu_id") return false;
              if (["district", "sector", "cell", "village"].includes(field.key)) return false;
              if (field.key === "submit") return false;

              if (field.conditional) {
                const dependentValue = currentValues[field.conditional.when];
                return field.conditional.eq === dependentValue;
              }

              return true;
            });

          setVisibleFields(filteredFields);
        }
      }
      
      setCurrentPage(previousPage);
      setValidationError(false);
    }
  };

  const handleBackFromPreview = () => {
    setShowPreview(false);
  };

  const handlePreview = async () => {
    if (visibleFields.length === 0) return;

    let isValid = false;
    if (!wholeComponent) {
      const currentField = visibleFields[currentPage];
      if (!currentField) return;
      isValid = await trigger(currentField.key);
    } else {
      isValid = await trigger();
    }

    if (isValid) {
      const values = getValues();
      setFormData(values);
      setShowPreview(true);
    } else {
      setValidationError(true);
      setTimeout(() => setValidationError(false), 2000);
    }
  };

  const handleEditField = (fieldKey: string) => {
    setEditingFieldKey(fieldKey);
    setShowPreview(false);

    // Handle flow state fields
    if (fieldKey === "izucode" || fieldKey === "izu_id") {
      onEditFlowState("izus");
    } else if (fieldKey === "cohort") {
      onEditFlowState("cohorts");
    } else if (fieldKey === "family") {
      onEditFlowState("families");
    } else if (
      ["province", "district", "sector", "cell", "village"].includes(fieldKey)
    ) {
      onEditFlowState("locations");
    } else if (!wholeComponent && fieldKey in fieldIndexMap) {
      setCurrentPage(fieldIndexMap[fieldKey]);
    }
  };

  if (showPreview) {
    return (
      <AnswerPreview
        fields={visibleFields}
        formData={formData}
        language={currentLanguage}
        onBack={handleBackFromPreview}
        onSubmit={handleSubmit(onSubmit)}
        timeSpent={timeSpent}
        onEditField={handleEditField}
        flowState={flowState}
      />
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      className="flex-1"
    >
      <ScrollView className="bg-background">
        <View className="mt-4 p-4">
          {visibleFields.length === 0 && (
            <View className="mb-4 p-3 bg-yellow-100 rounded-lg">
              <Text className="text-yellow-800 text-center">
                {t("FormElementPage.noFields", "No fields to display")}
              </Text>
            </View>
          )}

          <View className="mb-4 p-3 bg-white rounded-lg flex flex-row justify-end items-center">
            <Text className="text-primary font-semibold">
              {formatTime(timeSpent)}
            </Text>
          </View>

          {!wholeComponent && visibleFields.length > 0 && (
            <>
              <Text className="text-center mb-2 text-md font-medium text-[#050F2B]">
                Page {currentPage + 1} of {visibleFields.length}
              </Text>
              <View className="w-full bg-gray-200 rounded-full h-2.5 mb-4">
                <View
                  className="bg-primary h-2.5 rounded-full"
                  style={{
                    width: `${
                      ((currentPage + 1) / visibleFields.length) * 100
                    }%`,
                  }}
                />
              </View>
            </>
          )}

          {validationError && (
            <View className="mb-4 p-3 bg-red-100 rounded-lg">
              <Text className="text-red-500 text-center">
                {t(
                  "FormElementPage.validation",
                  "Please complete all required fields before proceeding"
                )}
              </Text>
            </View>
          )}

          {wholeComponent ? (
            visibleFields.map((field) => (
              <DynamicField
                key={field.key}
                field={field}
                control={control}
                language={currentLanguage}
              />
            ))
          ) : visibleFields[currentPage] ? (
            <DynamicField
              key={visibleFields[currentPage].key}
              field={visibleFields[currentPage]}
              control={control}
              language={currentLanguage}
            />
          ) : (
            <View className="flex-1 justify-center items-center">
              <Text className="text-gray-500">
                {t("FormElementPage.noFields", "No fields to display")}
              </Text>
            </View>
          )}

          {!wholeComponent && (
            <View className="flex flex-row justify-between mt-4">
              <Button
                onPress={handlePrevious}
                disabled={currentPage === 0}
                className={`${currentPage === 0 ? "opacity-50" : ""}`}
              >
                <Text className="text-white font-semibold">
                  {t("FormElementPage.previous")}
                </Text>
              </Button>
              {currentPage < visibleFields.length - 1 ? (
                <Button onPress={handleNext}>
                  <Text className="text-white font-semibold">
                    {t("FormElementPage.next")}
                  </Text>
                </Button>
              ) : (
                <Button onPress={handlePreview}>
                  <Text className="text-white font-semibold">
                    {t("FormElementPage.preview", "Preview")}
                  </Text>
                </Button>
              )}
            </View>
          )}

          {wholeComponent && (
            <Button onPress={handlePreview} className="mt-4">
              <Text className="text-white font-semibold">
                {t("FormElementPage.preview", "Preview")}
              </Text>
            </Button>
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

export default DynamicForm;
