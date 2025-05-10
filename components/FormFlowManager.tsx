import React, { useState, useRef, useEffect, useCallback } from "react";
import { View, Text, Alert } from "react-native";
import { ICohort, IFamilies, Izus } from "~/types";

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
import {
  FlowState,
  FlowStepKey,
  FormFlowManagerProps,
} from "~/types/form-types";
import { formatTime } from "~/utils/form-utils";
import { Province } from "~/models/locations/province";
import { District } from "~/models/locations/district";
import { Sector } from "~/models/locations/sector";
import { Cell } from "~/models/locations/cell";
import { Village } from "~/models/locations/village";

const { useRealm } = RealmContext;

const FormFlowManager: React.FC<FormFlowManagerProps> = ({
  form,
  fields,
  formSubmissionMandatoryFields,
  isMonitoring = false,
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

  // console.log("Form fields: ", fields);
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
  // console.log("loads: ", loads);
  // console.log("New loads", loads);
  // Define the flow steps in the correct order: izu-family-location-cohorts-stakeholders
  // Start with izus as mandatory
  const flowSteps: FlowStepKey[] = [];

  // For monitoring forms, families, izus, and cohorts are mandatory
  if (isMonitoring) {
    flowSteps.push("families");
    flowSteps.push("izus");
    flowSteps.push("cohorts");
  } else {
    // Add family if project_id is 3 or if it's in loads
    const hasFamilies =
      formSubmissionMandatoryFields.project_id === 3 || loads.families;
    if (hasFamilies) {
      flowSteps.push("families");
    }

    // Add location only if families are not in the flow but locations are in loads
    if (loads.locations && !hasFamilies) {
      flowSteps.push("locations");
    }

    // Add remaining steps in the specified order based on loads
    if (loads.izus) flowSteps.push("izus");
    if (loads.cohorts) flowSteps.push("cohorts");
  }
  
  // Add stakeholders if in loads (for both monitoring and non-monitoring)
  if (loads.stakeholders) flowSteps.push("stakeholders");
  // console.log(flowSteps);
  const handleNext = () => {
    const currentStepKey = flowSteps[currentStep] as FlowStepKey;

    if (currentStepKey === "families") {
      const familyId = flowState.selectedValues.families?.hh_id || null;
      const surveyId = formSubmissionMandatoryFields.id || 0;
      const projectId = formSubmissionMandatoryFields.project_id || 0;
      const sourceModuleId =
        formSubmissionMandatoryFields.source_module_id || 0;
      const izuCode = flowState.selectedValues.izus?.izucode || null;

      if (familyId && surveyId && projectId && sourceModuleId) {
        const existingSubmission = realm
          .objects<SurveySubmission>(SurveySubmission)
          .filtered(
            "form_data.project_id == $0 AND form_data.source_module_id == $1 AND form_data.survey_id == $2 AND form_data.family == $3 AND form_data.izucode == $4",
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

      // Extract location from family and set it to flowState
      const selectedFamily = flowState.selectedValues.families;
      if (selectedFamily?.location) {
        const familyLocation = selectedFamily.location;
        console.log(
          "Selected family location",
          JSON.stringify(familyLocation, null, 2)
        );
        const now = new Date().toISOString();

        // find the province, district, sector, cell, village from the location object
        // Location object is a number
        const province = realm.objectForPrimaryKey(
          Province,
          familyLocation.province?.toString() || ""
        );
        const district = realm.objectForPrimaryKey(
          District,
          familyLocation.district?.toString() || ""
        );
        const sector = realm.objectForPrimaryKey(
          Sector,
          familyLocation.sector?.toString() || ""
        );
        const cell = realm.objectForPrimaryKey(
          Cell,
          familyLocation.cell?.toString() || ""
        );
        const village = realm.objectForPrimaryKey(
          Village,
          familyLocation.village?.toString() || ""
        );

        setFlowState((prev) => ({
          ...prev,
          selectedValues: {
            ...prev.selectedValues,
            locations: {
              province: {
                id: familyLocation?.province?.toString() || "",
                province_code: province?.province_code || "",
                province_name: province?.province_name || "",
                province_name_english: province?.province_name_english || "",
                created_at: now,
                updated_at: now,
              },
              district: {
                id: familyLocation?.district?.toString() || "",
                district_code: district?.district_code || "",
                district_name: district?.district_name || "",
                province_id: province?.id || "",
                created_at: now,
                updated_at: now,
              },
              sector: {
                id: familyLocation?.sector?.toString() || "",
                sector_code: sector?.sector_code || "",
                sector_name: sector?.sector_name || "",
                district_id: district?.id || "",
                created_at: now,
                updated_at: now,
              },
              cell: {
                id: familyLocation?.cell?.toString() || "",
                cell_code: cell?.cell_code || "",
                cell_name: cell?.cell_name || "",
                sector_id: sector?.id || "",
                created_at: now,
                updated_at: now,
              },
              village: {
                id: familyLocation?.village?.toString() || "",
                village_code: village?.village_code || "",
                village_name: village?.village_name || "",
                cells_id: cell?.id || "",
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

  const handleCohortSelect = useCallback((value: ICohort) => {
    setFlowState((prev) => ({
      ...prev,
      selectedValues: {
        ...prev.selectedValues,
        cohorts: value,
      },
    }));
  }, []);

  const handleFamilySelect = useCallback((value: IFamilies) => {
    setFlowState((prev) => ({
      ...prev,
      selectedValues: {
        ...prev.selectedValues,
        families: value,
      },
    }));
  }, []);

  const handleIzuSelect = useCallback((value: Izus) => {
    setFlowState((prev) => ({
      ...prev,
      selectedValues: {
        ...prev.selectedValues,
        izus: value,
      },
    }));
  }, []);

  const handleLocationSelect = useCallback((value: FlowState["selectedValues"]["locations"]) => {
    setFlowState((prev) => ({
      ...prev,
      selectedValues: {
        ...prev.selectedValues,
        locations: value,
      },
    }));
  }, []);

  const handleStakeholderSelect = useCallback((value: any[]) => {
    setFlowState((prev) => ({
      ...prev,
      selectedValues: {
        ...prev.selectedValues,
        stakeholders: value,
      },
    }));
  }, []);

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
            onSelect={handleCohortSelect}
            initialValue={currentValue as ICohort}
          />
        );
      case "families":
        return (
          <FamilySelector
            onSelect={handleFamilySelect}
            initialValue={currentValue as IFamilies}
          />
        );
      case "izus":
        return (
          <IzuSelector
            onSelect={handleIzuSelect}
            initialValue={currentValue as Izus}
          />
        );
      case "locations":
        return (
          <LocationSelector
            onSelect={handleLocationSelect}
            initialValues={
              currentValue as FlowState["selectedValues"]["locations"]
            }
          />
        );
      case "stakeholders":
        return (
          <StakeholderSelector
            onSelect={handleStakeholderSelect}
            initialValue={currentValue as any[]}
          />
        );
      case "onPhone":
        // Automatically skip this step as it's likely handled elsewhere
        setTimeout(() => handleNext(), 0);
        return (
          <View className="flex-1 items-center justify-center">
            <Text className="text-primary font-semibold">
              {t("OnPhone.label", "On Phone")}
            </Text>
          </View>
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
      case "onPhone":
        // For onPhone, consider it always complete if it exists in the flow
        return true;
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
