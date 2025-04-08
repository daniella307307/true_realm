import React, { useState, useRef, useEffect } from "react";
import { View, Text, Alert } from "react-native";

import DynamicForm from "./DynamicForm";
import IzuSelector from "./ui/izu-selector";
import CohortSelector from "./ui/cohort-selector";
import FamilySelector from "./ui/family-selector";
import LocationSelector from "./ui/location-selector";
import StakeholderSelector from "./ui/stakeholder-selector";
import { IFamilies, IFormSubmissionDetail } from "~/types";
import { ICell } from "~/models/locations/cell";
import { IDistrict } from "~/models/locations/district";
import { IProvince } from "~/models/locations/province";
import { IVillage } from "~/models/locations/village";
import { ISector } from "~/models/locations/sector";
import { IIzu } from "~/models/izus/izu";
import { ICohort } from "~/models/cohorts/cohort";
import FormNavigation from "./ui/form-navigation";
import { RealmContext } from "~/providers/RealContextProvider";
import { SurveySubmission } from "~/models/surveys/survey-submission";
import { useTranslation } from "react-i18next";

const { useRealm } = RealmContext;

interface FormFlowManagerProps {
  form: any;
  fields: any[];
  formSubmissionMandatoryFields: IFormSubmissionDetail;
}

type FlowStepKey =
  | "izus"
  | "cohorts"
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

  const flowSteps = Object.entries(loads)
    .filter(([key, value]) => value === true && key !== "onPhone")
    .map(([key]) => key);

  const handleNext = () => {
    const currentStepKey = flowSteps[currentStep] as FlowStepKey;

    if (currentStepKey === "families") {
      const familyId = flowState.selectedValues.families?.hh_id || null;
      const surveyId = formSubmissionMandatoryFields.id || 0;
      const projectId = formSubmissionMandatoryFields.project_id || 0;
      const sourceModuleId = formSubmissionMandatoryFields.source_module_id || 0;

      if (familyId && surveyId && projectId && sourceModuleId) {
        const existingSubmission = realm.objects<SurveySubmission>('SurveySubmission').filtered(
          'project_id == $0 AND source_module_id == $1 AND survey_id == $2 AND family == $3',
          projectId,
          sourceModuleId,
          surveyId,
          familyId
        );

        if (existingSubmission.length > 0) {
          Alert.alert(
            t("SubmissionExists.title", "Submission Already Exists"),
            t("SubmissionExists.message", "A submission for this form and family already exists."),
            [{ text: t("Common.ok", "OK") }]
          );
          return;
        }
      }
    }

    const nextStep = currentStep + 1;
    if (nextStep >= flowSteps.length) {
      // If we're at the last step, show the dynamic form
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
    const currentValue = flowState.selectedValues[currentStepKey as keyof typeof flowState.selectedValues];

    switch (currentStepKey) {
      case "izus":
        return (
          <IzuSelector
            onSelect={(value) => {
              setFlowState(prev => ({
                ...prev,
                selectedValues: {
                  ...prev.selectedValues,
                  izus: value
                }
              }));
            }}
            initialValue={currentValue as IIzu}
          />
        );
      case "cohorts":
        return (
          <CohortSelector
            onSelect={(value) => {
              setFlowState(prev => ({
                ...prev,
                selectedValues: {
                  ...prev.selectedValues,
                  cohorts: value
                }
              }));
            }}
            initialValue={currentValue as ICohort}
          />
        );
      case "families":
        return (
          <FamilySelector
            onSelect={(value) => {
              setFlowState(prev => ({
                ...prev,
                selectedValues: {
                  ...prev.selectedValues,
                  families: value
                }
              }));
            }}
            initialValue={currentValue as IFamilies}
          />
        );
      case "locations":
        return (
          <LocationSelector
            onSelect={(value) => {
              setFlowState(prev => ({
                ...prev,
                selectedValues: {
                  ...prev.selectedValues,
                  locations: value
                }
              }));
            }}
            initialValues={currentValue as FlowState["selectedValues"]["locations"]}
          />
        );
      case "stakeholders":
        return (
          <StakeholderSelector
            onSelect={(value) => {
              setFlowState(prev => ({
                ...prev,
                selectedValues: {
                  ...prev.selectedValues,
                  stakeholders: value
                }
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
    const value = flowState.selectedValues[stepKey as keyof typeof flowState.selectedValues];
    
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
      <View className="flex-1">
        {renderStep()}
      </View>
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
