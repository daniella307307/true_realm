import React, { useState, useRef, useEffect } from "react";

import { View, Text, Alert } from "react-native";

import { ICell } from "~/models/locations/cell";
import { ICohort } from "~/models/cohorts/cohort";
import { IDistrict } from "~/models/locations/district";
import { IFamilies, IFormSubmissionDetail } from "~/types";
import { IIzu } from "~/models/izus/izu";
import { IProvince } from "~/models/locations/province";
import { ISector } from "~/models/locations/sector";
import { IVillage } from "~/models/locations/village";
import { RealmContext } from "~/providers/RealContextProvider";
import { SurveySubmission } from "~/models/surveys/survey-submission";
import { useTranslation } from "react-i18next";

import CohortSelector from "./ui/cohort-selector";
import DynamicForm from "./DynamicForm";
import FamilySelector from "./ui/family-selector";
import FormNavigation from "./ui/form-navigation";
import IzuSelector from "./ui/izu-selector";
import LocationSelector from "./ui/location-selector";
import StakeholderSelector from "./ui/stakeholder-selector";

const { useRealm } = RealmContext;

interface FormFlowManagerProps {
  form: any;
  fields: any[];
  formSubmissionMandatoryFields: IFormSubmissionDetail;
}

type FlowStepKey =
  | "cohorts"
  | "izus"
  | "families"
  | "locations"
  | "stakeholders"
  | "onPhone";

export interface FlowState {
  [key: string]: any;
  currentStep: number;
  selectedValues: {
    izus?: IIzu | null;
    cohorts?: ICohort | null;
    families?: IFamilies | null;
    locations?: {
      province?: IProvince | null;
      district?: IDistrict | null;
      sector?: ISector | null;
      cell?: ICell | null;
      village?: IVillage | null;
    };
    stakeholders?: any[] | null;
  };
}

const formatTime = (timeInSeconds: number): string => {
  const minutes = Math.floor(timeInSeconds / 60);
  const seconds = timeInSeconds % 60;
  return `${minutes}:${seconds < 10 ? "0" : ""}${seconds}`;
};

const FormFlowManager: React.FC<FormFlowManagerProps> = ({
  form,
  fields,
  formSubmissionMandatoryFields,
}) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [timeSpent, setTimeSpent] = useState(0);
  const [flowState, setFlowState] = useState<FlowState>({
    currentStep: 0,
    selectedValues: {
      izus: null,
      cohorts: null,
      families: null,
      locations: {
        province: null,
        district: null,
        sector: null,
        cell: null,
        village: null,
      },
    },
  });
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number>(Date.now());
  const realm = useRealm();
  const { t } = useTranslation();

  useEffect(() => {
    startTimeRef.current = Date.now();
    timerRef.current = setInterval(() => {
      const elapsedSeconds = Math.floor(
        (Date.now() - startTimeRef.current) / 1000
      );
      setTimeSpent(elapsedSeconds);
    }, 1000);

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, []);

  const loads = form.loads ? JSON.parse(form.loads) : {};
  if (formSubmissionMandatoryFields.project_id === 3) {
    loads.families = true;
  }

  // Define the mandatory order of steps
  const mandatorySteps: FlowStepKey[] = ["izus"];

  // Add optional steps based on loads
  const optionalSteps: FlowStepKey[] = [];
  if (loads.cohorts) optionalSteps.push("cohorts");
  if (loads.stakeholders) optionalSteps.push("stakeholders");

  // Combine mandatory and optional steps
  const flowSteps = [...mandatorySteps, ...optionalSteps];

  // Function to check if we need to show location selector
  const needsLocationSelector = () => {
    const selectedFamily = flowState.selectedValues.families;
    if (!selectedFamily) return false;
    // Check if family has complete location data
    const familyLocation = selectedFamily.location
      ? JSON.parse(selectedFamily.location)
      : null;
    return !(
      familyLocation?.province?.id &&
      familyLocation?.district?.id &&
      familyLocation?.sector?.id &&
      familyLocation?.cell?.id &&
      familyLocation?.village?.id
    );
  };

  // If location is needed and family doesn't have it, add location step
  if (loads.locations && needsLocationSelector()) {
    flowSteps.push("locations");
  }

  const handleNext = () => {
    const currentStepKey = flowSteps[currentStep] as FlowStepKey;

    // Check for existing submissions after IZU selection if the form doesn't load families
    if (currentStepKey === "izus" && !loads.families) {
      const izuCode = flowState.selectedValues.izus?.user_code || null;
      const surveyId = formSubmissionMandatoryFields.id || 0;
      const projectId = formSubmissionMandatoryFields.project_id || 0;
      const sourceModuleId = formSubmissionMandatoryFields.source_module_id || 0;

      console.log("Survey Submissions", JSON.stringify(realm.objects(SurveySubmission).filtered("izucode == $0", izuCode), null, 2));
      console.log("izuCode", izuCode);
      console.log("surveyId", surveyId);
      console.log("projectId", projectId);
      console.log("sourceModuleId", sourceModuleId);

      if (izuCode && surveyId && projectId && sourceModuleId) {
        const existingSubmission = realm
          .objects<SurveySubmission>(SurveySubmission)
          .filtered(
            "project_id == $0 AND source_module_id == $1 AND survey_id == $2 AND izucode == $3",
            projectId,
            sourceModuleId,
            surveyId, 
            izuCode
          );

        if (existingSubmission.length > 0) {
          Alert.alert(
            t("SubmissionExists.title", "Submission Already Exists"),
            t(
              "SubmissionExists.message",
              "A submission for this form and IZU already exists."
            ),
            [{ text: t("Common.ok", "OK") }]
          );
          return;
        }
      }
    }

    if (currentStepKey === "families") {
      const familyId = flowState.selectedValues.families?.hh_id || null;
      const surveyId = formSubmissionMandatoryFields.id || 0;
      const projectId = formSubmissionMandatoryFields.project_id || 0;
      const sourceModuleId =
        formSubmissionMandatoryFields.source_module_id || 0;
      const izuCode = flowState.selectedValues.izus?.user_code || null;

      if (familyId && surveyId && projectId && sourceModuleId) {
        const existingSubmission = realm
          .objects<SurveySubmission>(SurveySubmission)
          .filtered(
            "project_id == $0 AND source_module_id == $1 AND survey_id == $2 AND family == $3 AND izucode == $4",
            projectId,
            sourceModuleId,
            surveyId,
            familyId,
            izuCode
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
          return;
        }
      }

      const selectedFamily = flowState.selectedValues.families;
      if (selectedFamily?.location) {
        const familyLocation = JSON.parse(selectedFamily.location);
        const now = new Date().toISOString();

        setFlowState((prev) => ({
          ...prev,
          selectedValues: {
            ...prev.selectedValues,
            locations: {
              province: {
                id: familyLocation?.province?.id.toString(),
                province_code: familyLocation?.province?.id.toString(),
                province_name: familyLocation?.province?.province_name,
                province_name_english: familyLocation?.province?.province_name,
                created_at: now,
                updated_at: now,
              },
              district: {
                id: familyLocation?.district?.id.toString(),
                district_code: familyLocation?.district?.id.toString(),
                district_name: familyLocation?.district?.district_name,
                province_id: familyLocation?.province?.id.toString(),
                created_at: now,
                updated_at: now,
              },
              sector: {
                id: familyLocation?.sector?.id.toString(),
                sector_code: familyLocation?.sector?.id.toString(),
                sector_name: familyLocation?.sector?.sector_name,
                district_id: familyLocation?.district?.id.toString(),
                created_at: now,
                updated_at: now,
              },
              cell: {
                id: familyLocation?.cell?.id.toString(),
                cell_code: familyLocation?.cell?.id.toString(),
                cell_name: familyLocation?.cell?.cell_name,
                sector_id: familyLocation?.sector?.id.toString(),
                created_at: now,
                updated_at: now,
              },
              village: {
                id: familyLocation?.village?.id.toString(),
                village_code: familyLocation?.village?.id.toString(),
                village_name: familyLocation?.village?.village_name,
                cells_id: familyLocation?.cell?.id.toString(),
                created_at: now,
                updated_at: now,
              },
            },
          },
        }));
      }
    }

    const nextStep = currentStep + 1;
    if (nextStep >= flowSteps.length) {
      setCurrentStep(nextStep);
    } else {
      setCurrentStep(nextStep);
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleEditFlowState = (step: string) => {
    const stepIndex = flowSteps.findIndex((s) => s === step);
    if (stepIndex !== -1) {
      setCurrentStep(stepIndex);
    }
  };

  const renderStep = () => {
    const currentStepKey = flowSteps[currentStep] as FlowStepKey;
    const currentValue =
      flowState.selectedValues[
        currentStepKey as keyof typeof flowState.selectedValues
      ];

    switch (currentStepKey) {
      case "cohorts":
        return (
          <CohortSelector
            onSelect={(value) => {
              setFlowState((prev) => ({
                ...prev,
                selectedValues: {
                  ...prev.selectedValues,
                  cohorts: value,
                },
              }));
            }}
            initialValue={currentValue as ICohort}
          />
        );
      case "families":
        return (
          <FamilySelector
            onSelect={(value) => {
              setFlowState((prev) => ({
                ...prev,
                selectedValues: {
                  ...prev.selectedValues,
                  families: value,
                },
              }));
            }}
            initialValue={currentValue as IFamilies}
          />
        );
      case "izus":
        return (
          <IzuSelector
            onSelect={(value) => {
              setFlowState((prev) => ({
                ...prev,
                selectedValues: {
                  ...prev.selectedValues,
                  izus: value,
                },
              }));
            }}
            initialValue={currentValue as IIzu}
          />
        );
      case "locations":
        return (
          <LocationSelector
            onSelect={(value) => {
              setFlowState((prev) => ({
                ...prev,
                selectedValues: {
                  ...prev.selectedValues,
                  locations: value,
                },
              }));
            }}
            initialValues={
              currentValue as FlowState["selectedValues"]["locations"]
            }
          />
        );
      case "stakeholders":
        return (
          <StakeholderSelector
            onSelect={(value) => {
              setFlowState((prev) => ({
                ...prev,
                selectedValues: {
                  ...prev.selectedValues,
                  stakeholders: value,
                },
              }));
            }}
            initialValue={currentValue as any[]}
          />
        );
      default:
        return null;
    }
  };

  const isStepComplete = (stepKey: FlowStepKey) => {
    const value =
      flowState.selectedValues[
        stepKey as keyof typeof flowState.selectedValues
      ];

    switch (stepKey) {
      case "izus":
        return value !== null && value !== undefined;
      case "cohorts":
        return value !== null && value !== undefined;
      case "families":
        return value !== null && value !== undefined;
      case "locations":
        const locations = value as FlowState["selectedValues"]["locations"];
        return (
          locations?.province &&
          locations?.district &&
          locations?.sector &&
          locations?.cell &&
          locations?.village
        );
      case "stakeholders":
        return Array.isArray(value) && value.length > 0;
      default:
        return false;
    }
  };

  // If we've completed all steps, show the dynamic form
  if (currentStep >= flowSteps.length) {
    return (
      <DynamicForm
        flowState={flowState}
        fields={fields}
        formSubmissionMandatoryFields={formSubmissionMandatoryFields}
        timeSpent={timeSpent}
        onEditFlowState={handleEditFlowState}
      />
    );
  }

  return (
    <View className="flex-1">
      <View className="mb-4 p-3 bg-white rounded-lg flex flex-row justify-end items-center">
        <Text className="text-primary font-semibold">
          {formatTime(timeSpent)}
        </Text>
      </View>
      <View className="flex-1">{renderStep()}</View>
      <FormNavigation
        onBack={handleBack}
        onNext={handleNext}
        isNextDisabled={!isStepComplete(flowSteps[currentStep] as FlowStepKey)}
        showBack={currentStep > 0}
      />
    </View>
  );
};

export default FormFlowManager;
