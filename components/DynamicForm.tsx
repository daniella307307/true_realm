import React, { useState, useEffect, useMemo } from "react";
import {
  View,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from "react-native";

import { router } from "expo-router";

import { useForm, useWatch } from "react-hook-form";
import { FormField } from "~/types";
import { RealmContext } from "~/providers/RealContextProvider";
import { saveSurveySubmissionToAPI } from "~/services/survey-submission";
import { useAuth } from "~/lib/hooks/useAuth";
import { useTranslation } from "react-i18next";
import { formatTime } from "~/utils/form-utils";

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
  PasswordComponent,
  ConfirmPasswordComponent,
} from "./DynamicComponents";
import { AnswerPreview } from "./AnswerPreview";
import { DynamicFieldProps, DynamicFormProps } from "~/types/form-types";
import { saveFamilyToAPI } from "~/services/families";
import { saveIzuToAPI } from "~/services/izus";
import { saveMonitoringResponseToAPI } from "~/services/monitoring/monitoring-responses";
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

  // Special logging for number fields
  useEffect(() => {
    if (field.type === "number") {
      console.log("Number field details:", {
        key: field.key,
        title: field.title,
        validation: field.validate,
        errorLabel: (field as any).errorLabel,
        min: field.validate?.min,
        max: field.validate?.max,
      });
    }
  }, [field]);

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
    case "password":
      return (
        <PasswordComponent
          field={field}
          control={control}
          language={language}
        />
      );
    case "confirmPassword":
      return (
        <ConfirmPasswordComponent
          field={field}
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
    case "dropdown":
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

  // Define fieldsPerPage at the component level for consistency
  const fieldsPerPage = 4;

  const { control, handleSubmit, getValues, trigger, formState, setValue } =
    useForm({
      mode: "onChange",
      reValidateMode: "onChange",
      criteriaMode: "all",
      shouldFocusError: true,
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
  const [resetSubmittingCallback, setResetSubmittingCallback] = useState<
    (() => void) | null
  >(null);
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
        // For fields without dependencies, just add them to the current group
        // until we reach fieldsPerPage, then start a new group
        if (currentDependency !== null) {
          // If we were collecting dependent fields, push the group and start fresh
          if (currentGroup.length > 0) {
            groups.push([...currentGroup]);
          }
          currentGroup = [];
          currentDependency = null;
        }

        currentGroup.push(field);

        // Only create a new group when we reach the fieldsPerPage limit
        if (currentGroup.length >= fieldsPerPage) {
          groups.push([...currentGroup]);
          currentGroup = [];
        }
      }
    });

    if (currentGroup.length > 0) {
      groups.push(currentGroup);
    }
    return groups;
  }, [visibleFields, fieldsPerPage]);

  // Calculate total pages based on groups
  const totalPages = groupedFields.length;
  const currentPageFields = groupedFields[currentPage] || [];

  // console.log json stringify
  // console.log(JSON.stringify(currentPageFields, null, 2));
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

        // Ensure all fields are included in the submission data
        const values = getValues();
        const completeData: Record<string, any> = {};

        // Include all visible fields in the data, even if they're empty
        visibleFields.forEach((field) => {
          if (field && field.key) {
            completeData[field.key] =
              values[field.key] !== undefined ? values[field.key] : "";
          }
        });

        // Format all day-type fields to proper YYYY-MM-DD format
        const formattedData = { ...completeData };
        visibleFields.forEach((field) => {
          if (
            field &&
            field.type === "day" &&
            field.key &&
            typeof formattedData[field.key] === "object"
          ) {
            const dateObj = formattedData[field.key];
            if (dateObj && dateObj.year && dateObj.month && dateObj.day) {
              formattedData[
                field.key
              ] = `${dateObj.year}-${dateObj.month}-${dateObj.day}`;
            }
          }
        });

        const dataWithTime = {
          ...formattedData,
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
          izucode: flowState?.selectedValues?.izus?.izucode || null,
          cohorts: flowState?.selectedValues?.cohorts?.cohort
            ? Number(flowState.selectedValues.cohorts.cohort)
            : 0,
          language: currentLanguage,
          timeSpentFormatted: formatTime(timeSpent),
        };

        const postData = dataWithTime.post_data || "";
        console.log(
          "Final Data submitted:",
          JSON.stringify(dataWithTime, null, 2)
        );
        console.log("API URL:", postData);

        if (postData === "/createFamily") {
          // Create a family instead of a survey submission
          await saveFamilyToAPI(realm, dataWithTime, postData, fields);

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
        } else if (postData === "/izucelldemography/create") {
          // Create an izu instead of a survey submission
          await saveIzuToAPI(realm, dataWithTime, postData, fields);

          Alert.alert(
            "Izu Created Successfully",
            "The izu has been created successfully.",
            [
              {
                text: "OK",
                onPress: () => router.push("/(history)/history"),
              },
            ]
          );
        } else if (
          postData === "/sendMonitoringData" ||
          postData.includes("sendMonitoringData")
        ) {
          const moduleId =
            formSubmissionMandatoryFields.source_module_id?.toString() || "";
          const formId = formSubmissionMandatoryFields.id?.toString() || "";
          const dateRecorded =
            formattedData.date_recorded ||
            new Date().toISOString().split("T")[0];
          const responseType = formattedData.type || "1";
          const cohort = flowState?.selectedValues?.cohorts?.cohort || "";

          // Calculate score based on answers
          let totalScore = 0;
          let totalPossibleScore = 0;
          let scoredFieldsCount = 0;
          let scoringDetails: Record<string, any> = {};

          // Score mapping based on provided value system
          const scoreMapping: Record<string, number> = {
            "Did not occur": 0,
            "Nta byabayeho": 0,
            "Nta Byabayeho": 0,
            Poor: 1,
            "Gacye cyane": 1,
            "Needs Improvement": 2,
            "Hackenewe kwikosora": 2,
            "Bikeneye kunozwa": 2,
            Average: 3,
            Biraringaniye: 3,
            Excellent: 4,
            "Byiza Cyane": 4,
          };

          // Count scorable fields and calculate total score
          Object.entries(formattedData).forEach(([key, value]) => {
            if (
              typeof value === "string" &&
              scoreMapping[value] !== undefined
            ) {
              const score = scoreMapping[value];
              totalScore += score;
              totalPossibleScore += 4; // Maximum possible score per field is 4
              scoredFieldsCount++;
              scoringDetails[key] = {
                answer: value,
                score: score,
                possible: 4,
              };
              console.log(
                `Field ${key} with answer "${value}" scored ${score}`
              );
            }
          });

          // Calculate percentage score
          const percentageScore =
            totalPossibleScore > 0
              ? Math.round((totalScore / totalPossibleScore) * 100)
              : 0;

          console.log(
            `Total score: ${totalScore}/${totalPossibleScore} (${percentageScore}%)`
          );

          // Create score_data object with all scoring information
          const scoreData = {
            total: totalScore,
            possible: totalPossibleScore,
            percentage: percentageScore,
            fields_count: scoredFieldsCount,
            details: scoringDetails,
          };

          const monitoringData = {
            family_id: flowState?.selectedValues?.families?.hh_id || null,
            family: flowState?.selectedValues?.families?.hh_id || null,
            module_id: moduleId,
            form_id: formId,
            project_id: formSubmissionMandatoryFields.project_id,
            date_recorded: dateRecorded,
            type: responseType,
            cohort: cohort || "1",
            izucode: flowState?.selectedValues?.izus?.izucode || null,
            user_id: formSubmissionMandatoryFields.userId || null,
            response: formattedData, // This includes all the form fields
            score_data: scoreData,
          };

          console.log(
            "Monitoring data:",
            JSON.stringify(monitoringData, null, 2)
          );

          await saveMonitoringResponseToAPI(
            realm,
            monitoringData,
            "/sendMonitoringData"
          );

          Alert.alert(
            "Monitoring Response Submitted Successfully",
            "Your monitoring response has been submitted successfully.",
            [
              {
                text: "OK",
                onPress: () => router.push("/(statistics)/"),
              },
            ]
          );
        } else {
          // Regular survey submission
          await saveSurveySubmissionToAPI(
            realm,
            dataWithTime,
            postData,
            fields
          );

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
      } finally {
        // Improved callback handling
        console.log("Submission completed, resetting state");

        // Reset our own submitting state
        setSubmitting(false);

        // Call the callback from AnswerPreview if it exists
        if (resetSubmittingCallback) {
          console.log("Calling reset submitting callback");
          resetSubmittingCallback();
          setResetSubmittingCallback(null);
        } else {
          console.log("No reset submitting callback found");
        }
      }
    } else {
      // This is just for preview, set form data and show preview
      const values = getValues();

      // Create complete formData with all fields, including those with empty values
      const completeFormData: Record<string, any> = {};

      // Ensure all visible fields have a value in the formData
      visibleFields.forEach((field) => {
        if (field && field.key) {
          completeFormData[field.key] =
            values[field.key] !== undefined ? values[field.key] : "";
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

    try {
      // Trigger validation on all fields from the current page
      const isValid = await trigger(currentPageFieldKeys, {
        shouldFocus: true,
      });
      console.log("Validation result:", isValid);

      // Log form state to see errors
      console.log("Form state errors:", formState.errors);

      if (isValid) {
        setValidationError(false);
        if (currentPage < totalPages - 1) {
          setCurrentPage(currentPage + 1);
        }
      } else {
        setValidationError(true);
        setTimeout(() => setValidationError(false), 2000);
      }
    } catch (error) {
      console.error("Validation error:", error);
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
        previousPage * fieldsPerPage,
        (previousPage + 1) * fieldsPerPage
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
      visibleFields.forEach((field) => {
        if (field && field.key) {
          completeFormData[field.key] =
            values[field.key] !== undefined ? values[field.key] : "";
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
    } else {
      // Find the page containing the field
      const fieldIndex = visibleFields.findIndex(field => field.key === fieldKey);
      if (fieldIndex !== -1) {
        const pageIndex = Math.floor(fieldIndex / fieldsPerPage);
        setCurrentPage(pageIndex);
      }
    }
  };

  const handleResetSubmitting = (callback: () => void) => {
    console.log("Registering reset submitting callback");
    // Store the callback directly rather than wrapping it
    setResetSubmittingCallback(() => callback);
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
            ? visibleFields.map((field) =>
                field && field.key ? (
                  <DynamicField
                    key={`field-${field.key}`}
                    field={field}
                    control={control}
                    language={currentLanguage}
                  />
                ) : null
              )
            : currentPageFields.map((field, index) => {
                // Skip fields without keys to prevent React duplicate key warnings
                if (!field || !field.key) return null;

                return (
                  <DynamicField
                    key={`field-${field.key}-${index}`}
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
