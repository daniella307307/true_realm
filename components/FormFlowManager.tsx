import React, { useState, useRef, useEffect } from "react";
import { View, Text } from "react-native";

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

  const flowSteps = Object.entries(loads)
    .filter(([key, value]) => value === true && key !== "onPhone")
    .map(([key]) => key);

  const handleNext = (value?: any) => {
    const currentStepKey = flowSteps[currentStep] as FlowStepKey;
    console.log("value", value);
    if (value) {
      setFlowState((prev) => {
        const newSelectedValues = { ...prev.selectedValues };
        if (currentStepKey === "locations") {
          newSelectedValues.locations = {
            ...newSelectedValues.locations,
            ...value,
          };
        } else {
          switch (currentStepKey) {
            case "izus":
              newSelectedValues.izus = value;
              break;
            case "cohorts":
              console.log("VAlues of cohorts", value);
              newSelectedValues.cohorts = value;
              break;
            case "families":
              newSelectedValues.families = value;
              break;
            case "stakeholders":
              newSelectedValues.stakeholders = value;
              break;
          }
        }
        return {
          currentStep: currentStep + 1,
          selectedValues: newSelectedValues,
        };
      });
    }

    // Update currentStep and check if we're at the end
    const nextStep = currentStep + 1;
    setCurrentStep(nextStep);

    // If this was the last step, force a re-render to show the dynamic form
    if (nextStep >= flowSteps.length) {
      setFlowState((prev) => ({
        ...prev,
        currentStep: nextStep,
      }));
    }
  };

  const handleBack = () => {
    setFlowState((prev) => ({
      ...prev,
      currentStep: prev.currentStep - 1,
    }));
  };

  const handleEditFlowState = (step: string) => {
    const stepIndex = flowSteps.findIndex((s) => s === step);
    if (stepIndex !== -1) {
      setCurrentStep(stepIndex);
    }
  };

  const renderStep = () => {
    switch (flowSteps[currentStep]) {
      case "izus":
        return (
          <IzuSelector
            onSelect={(value) => handleNext(value)}
            onBack={handleBack}
            initialValue={flowState.selectedValues.izus ?? undefined}
            onNext={() =>
              handleNext(
                flowState.selectedValues[
                  flowSteps[
                    currentStep
                  ] as keyof typeof flowState.selectedValues
                ]
              )
            }
          />
        );
      case "cohorts":
        return (
          <CohortSelector
            onSelect={(value) => {
              console.log("Cohort selected:", value);
              handleNext(value);
            }}
            onBack={handleBack}
            initialValue={flowState.selectedValues.cohorts ?? undefined}
          />
        );
      case "families":
        return (
          <FamilySelector
            onSelect={(value) => handleNext(value)}
            onBack={handleBack}
            initialValue={flowState.selectedValues.families ?? undefined}
          />
        );
      case "locations":
        return (
          <LocationSelector
            onSelect={(value) => handleNext(value)}
            onBack={handleBack}
            initialValues={flowState.selectedValues.locations ?? undefined}
          />
        );
      case "stakeholders":
        return (
          <StakeholderSelector
            onSelect={(value) => handleNext(value)}
            onBack={handleBack}
            initialValue={flowState.selectedValues.stakeholders ?? undefined}
          />
        );
      default:
        return null;
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
      {renderStep()}
    </View>
  );
};

export default FormFlowManager;
