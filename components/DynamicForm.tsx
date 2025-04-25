import React, { useState, useEffect, useRef, useMemo } from "react";
import {
  View,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from "react-native";

import { router } from "expo-router";

import { useForm, useWatch } from "react-hook-form";
import { FormField, IFormSubmissionDetail } from "~/types";
import { RealmContext } from "~/providers/RealContextProvider";
import { saveSurveySubmission } from "~/services/survey-submission";
import { useAuth } from "~/lib/hooks/useAuth";
import { useTranslation } from "react-i18next";
import { formatTime } from "~/utils/form-utils";
import { Families } from "~/models/family/families";
import { isOnline } from "~/services/network";
import { baseInstance } from "~/utils/axios";

import DateTimePickerComponent from "./ui/date-time-picker";
import { Button } from "./ui/button";
import { Text } from "./ui/text";
import {
  TextFieldComponent,
  TextAreaComponent,
  RadioBoxComponent,
  SelectBoxComponent,
  SwitchComponent,
  CheckBoxComponent,
  DayInputComponent,
  TimeInputComponent,
} from "./DynamicComponents";
import { AnswerPreview } from "./AnswerPreview";
import { DynamicFieldProps, DynamicFormProps } from "~/types/form-types";
import { saveFamilyToAPI } from "~/services/families";
const { useRealm } = RealmContext;

// Use the interface directly rather than exporting it
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

  if (field.type === "day") {
    return (
      <DayInputComponent field={field} control={control} language={language} />
    );
  }

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
    case "day":
      return (
        <DayInputComponent
          field={field}
          control={control}
          language={language}
        />
      );
    case "time":
      return (
        <TimeInputComponent
          field={field}
          control={control}
          language={language}
        />
      );
    case "datetime":
    case "date":
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
  const [, setEditingFieldKey] = useState<string | null>(null);
  const [visibleFields, setVisibleFields] = useState<FormField[]>([]);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [resetSubmittingCallback, setResetSubmittingCallback] = useState<(() => void) | null>(null);
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

        // Special case for dateOfFollowUp field
        if (field.key === "dateOfFollowUp" && field.type === "day") {
          console.log("Including dateOfFollowUp field due to special case");
          return true;
        }

        // Check conditional visibility
        if (field.conditional) {
          const dependentValue = formValues[field.conditional.when];
          let isVisible = false;

          // Special case for fields with conditional.show = true but no conditional.when/eq
          if (field.conditional.show === true && !field.conditional.when) {
            isVisible = true;
            console.log(
              `Field ${field.key} is visible due to conditional.show=true`
            );
            return true;
          }
          if (Array.isArray(dependentValue)) {
            isVisible = dependentValue.includes(field.conditional.eq);
          } else if (
            typeof dependentValue === "string" &&
            dependentValue.includes(",")
          ) {
            const values = dependentValue.split(",").map((v) => v.trim());
            isVisible = values.includes(field.conditional.eq);
          } else {
            isVisible = field.conditional.eq === dependentValue;
          }
          return isVisible;
        }

        return true;
      });

    setVisibleFields(filteredFields);

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

  const groupedFields = useMemo(() => {
    const groups: FormField[][] = [];
    let currentGroup: FormField[] = [];
    let currentDependency: string | null = null;

    if (visibleFields.length === 0) {
      return groups;
    }

    visibleFields.forEach((field) => {
      // Special handling for fields with conditional.show = true
      if (
        field.conditional &&
        field.conditional.show === true &&
        !field.conditional.when
      ) {
        // Put this field in its own group
        groups.push([field]);
        return; // Skip the rest of the processing for this field
      }

      if (field.conditional && field.conditional.when) {
        const dependency = field.conditional.when;
        if (currentDependency === null) {
          currentDependency = dependency;
          currentGroup.push(field);
        } else if (currentDependency === dependency) {
          currentGroup.push(field);
        } else {
          if (currentGroup.length > 0) {
            groups.push([...currentGroup]);
          }
          currentGroup = [field];
          currentDependency = dependency;
        }
      } else {
        if (currentGroup.length > 0) {
          groups.push([...currentGroup]);
          currentGroup = [];
          currentDependency = null;
        }
        currentGroup.push(field);
        if (currentGroup.length >= 3) {
          groups.push([...currentGroup]);
          currentGroup = [];
        }
      }
    });

    if (currentGroup.length > 0) {
      groups.push(currentGroup);
    }
    return groups;
  }, [visibleFields]);

  // Calculate total pages based on groups
  const totalPages = groupedFields.length;
  const currentPageFields = groupedFields[currentPage] || [];

  useEffect(() => {
    if (!language) {
      setCurrentLanguage(i18nInstance.language);
    }
  }, [i18nInstance.language, language]);

  // console.log("Location Selected Values:", JSON.stringify(flowState.selectedValues.locations, null, 2));
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

        // Ensure all fields are included in the submission data
        const values = getValues();
        const completeData: Record<string, any> = {};
        
        // Include all visible fields in the data, even if they're empty
        visibleFields.forEach(field => {
          if (field && field.key) {
            completeData[field.key] = values[field.key] !== undefined ? values[field.key] : "";
          }
        });

        const dataWithTime = {
          ...completeData,
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
          cohort: flowState?.selectedValues?.cohorts?.cohort
            ? Number(flowState.selectedValues.cohorts.cohort)
            : 0,
          language: currentLanguage,
          timeSpentFormatted: formatTime(timeSpent),
          // Ensure dateOfTheMeeting is a string in YYYY-MM-DD format
          dateOfTheMeeting:
            typeof completeData.dateOfTheMeeting === "object"
              ? `${completeData.dateOfTheMeeting.year}-${completeData.dateOfTheMeeting.month}-${completeData.dateOfTheMeeting.day}`
              : completeData.dateOfTheMeeting,
        };

        dataWithTime.post_data;
        console.log(
          "Final Data submitted:",
          JSON.stringify(dataWithTime, null, 2)
        );
        console.log("API URL:", dataWithTime.post_data);

        if (dataWithTime.post_data === '/createFamily') {
          // Create a family instead of a survey submission
          await saveFamilyToAPI(realm, dataWithTime, dataWithTime.post_data, fields);
          
          // Show success alert and navigate
          Alert.alert(
            "Family Created Successfully",
            "The family has been created successfully.",
            [
              {
                text: "OK",
                onPress: () => router.push("/(history)/history"),
              },
            ]
          );
        } else {
          // Regular survey submission
          await saveSurveySubmission(realm, dataWithTime, fields);
          
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
        }
      } catch (error) {
        console.error("Error saving data:", error);
        // Show error message to user
        Alert.alert(
          "Submission Error",
          "There was an error submitting your form. Please try again.",
          [{ text: "OK" }]
        );
        
        // Reset states immediately rather than waiting for finally block
        setSubmitting(false);
        if (resetSubmittingCallback) {
          resetSubmittingCallback();
          setResetSubmittingCallback(null);
        }
      } finally {
        // This ensures submitting state is reset whether success or failure
        // This is redundant for error case but ensures state is reset for success case
        setSubmitting(false);
        if (resetSubmittingCallback) {
          resetSubmittingCallback();
          setResetSubmittingCallback(null);
        }
      }
    } else {
      // This is just for preview, set form data and show preview
      const values = getValues();
      
      // Create complete formData with all fields, including those with empty values
      const completeFormData: Record<string, any> = {};
      
      // Ensure all visible fields have a value in the formData
      visibleFields.forEach(field => {
        if (field && field.key) {
          completeFormData[field.key] = values[field.key] !== undefined ? values[field.key] : "";
        }
      });
      
      setFormData(completeFormData);
      setShowPreview(true);
    }
  };

  const validateAndProceed = async () => {
    if (visibleFields.length === 0) return;

    // Validate all fields on the current page
    const currentPageFieldKeys = currentPageFields.map((field) => field.key);
    const isValid = await trigger(currentPageFieldKeys);

    if (isValid) {
      setValidationError(false);
      if (currentPage < totalPages - 1) {
        setCurrentPage(currentPage + 1);
      }
    } else {
      setValidationError(true);
      setTimeout(() => setValidationError(false), 2000);
    }
  };

  const handleNext = () => {
    if (visibleFields.length === 0) return;
    if (currentPage < totalPages - 1) {
      validateAndProceed();
    }
  };

  const handlePrevious = () => {
    if (visibleFields.length === 0) return;
    if (currentPage > 0) {
      const previousPage = currentPage - 1;
      const previousFields = visibleFields.slice(
        previousPage * 3,
        (previousPage + 1) * 3
      );

      // If the previous fields control conditional visibility, reset visible fields
      const hasConditionalControl = previousFields.some((field) =>
        fields.some((f) => f.conditional?.when === field.key)
      );

      if (hasConditionalControl) {
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
            if (["district", "sector", "cell", "village"].includes(field.key))
              return false;
            if (field.key === "submit") return false;

            if (field.conditional) {
              const dependentValue = currentValues[field.conditional.when];
              return field.conditional.eq === dependentValue;
            }

            return true;
          });

        setVisibleFields(filteredFields);
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
      
      // Create complete formData with all fields, including those with empty values
      const completeFormData: Record<string, any> = {};
      
      // Ensure all visible fields have a value in the formData
      visibleFields.forEach(field => {
        if (field && field.key) {
          completeFormData[field.key] = values[field.key] !== undefined ? values[field.key] : "";
        }
      });
      
      setFormData(completeFormData);
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

  // Function to register the reset callback from AnswerPreview
  const handleResetSubmitting = (callback: () => void) => {
    setResetSubmittingCallback(callback);
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
        resetSubmitting={handleResetSubmitting}
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
                Page {currentPage + 1} of {totalPages}
              </Text>
              <View className="w-full bg-gray-200 rounded-full h-2.5 mb-4">
                <View
                  className="bg-primary h-2.5 rounded-full"
                  style={{
                    width: `${((currentPage + 1) / totalPages) * 100}%`,
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

          {wholeComponent
            ? visibleFields.map((field) => (
                <DynamicField
                  key={field.key}
                  field={field}
                  control={control}
                  language={currentLanguage}
                />
              ))
            : currentPageFields.map((field) => {
                // console.log(`Rendering field ${field.key} of type ${field.type} on page ${currentPage}`);
                return (
                  <DynamicField
                    key={field.key}
                    field={field}
                    control={control}
                    language={currentLanguage}
                  />
                );
              })}

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
              {currentPage < totalPages - 1 ? (
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
