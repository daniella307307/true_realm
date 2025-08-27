import React, { useState, useRef, useEffect } from "react";
import { View, Text, Alert, ScrollView } from "react-native";
import { ICohort, IFamilies, Izus } from "~/types";
import { useLocalSearchParams } from "expo-router";

import { RealmContext } from "~/providers/RealContextProvider";
import { useTranslation } from "react-i18next";

import CohortSelector from "./ui/cohort-selector";
import DynamicForm from "./DynamicForm";
import FamilySelector from "./ui/family-selector";
import FormNavigation from "./ui/form-navigation";
import FormSiblingSelector from "./ui/form-sibling-selector";
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
import { useGetAllSurveySubmissions } from "~/services/survey-submission";
import { useGetMonitoringResponses } from "~/services/monitoring/monitoring-responses";

const { useRealm } = RealmContext;

interface ExtendedFormFlowManagerProps extends FormFlowManagerProps {
  initialFamily?: IFamilies | null;
}

const FormFlowManager = ({
  form,
  fields,
  formSubmissionMandatoryFields,
  isMonitoring = false,
  initialFamily = null,
}: ExtendedFormFlowManagerProps) => {
  const { reset } = useLocalSearchParams<{ reset: string }>();
  const [currentStep, setCurrentStep] = useState(0);
  const [timeSpent, setTimeSpent] = useState(0);
  const [showSiblingForms, setShowSiblingForms] = useState(false);
  const [flowState, setFlowState] = useState<FlowState>({
    currentStep: 0,
    selectedValues: {
      izus: null,
      cohorts: null,
      families: initialFamily,
      locations: initialFamily?.location ? {
        province: null,
        district: null,
        sector: null,
        cell: null,
        village: null,
      } : undefined,
    },
  });
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number>(Date.now());
  const realm = useRealm();
  const { t } = useTranslation();
  const { submissions } = useGetAllSurveySubmissions();
  const { responses: monitoringResponses } = useGetMonitoringResponses();

  useEffect(() => {
    startTimeRef.current = Date.now();
    // @ts-ignore
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

  useEffect(() => {
    if (reset === "true") {
      setCurrentStep(0);
      setTimeSpent(0);
      setShowSiblingForms(false);
      setFlowState({
        currentStep: 0,
        selectedValues: {
          izus: null,
          cohorts: null,
          families: initialFamily,
          locations: initialFamily?.location ? {
            province: null,
            district: null,
            sector: null,
            cell: null,
            village: null,
          } : undefined,
        },
      });
      startTimeRef.current = Date.now();
    }
  }, [reset, initialFamily]);

  // Effect to handle initial family data
  useEffect(() => {
    if (initialFamily && initialFamily.location) {
      const locationData = initialFamily.location;
      const now = new Date().toISOString();

      const province = realm.objectForPrimaryKey(
        Province,
        locationData.province?.toString() || ""
      );
      const district = realm.objectForPrimaryKey(
        District,
        locationData.district?.toString() || ""
      );
      const sector = realm.objectForPrimaryKey(
        Sector,
        locationData.sector?.toString() || ""
      );
      const cell = realm.objectForPrimaryKey(
        Cell,
        locationData.cell?.toString() || ""
      );
      const village = realm.objectForPrimaryKey(
        Village,
        locationData.village?.toString() || ""
      );

      setFlowState(prev => ({
        ...prev,
        selectedValues: {
          ...prev.selectedValues,
          families: initialFamily,
          locations: {
            province: province ? {
              id: locationData.province?.toString() || "",
              province_code: province.province_code || "",
              province_name: province.province_name || "",
              province_name_english: province.province_name_english || "",
              created_at: now,
              updated_at: now,
            } : null,
            district: district ? {
              id: locationData.district?.toString() || "",
              district_code: district.district_code || "",
              district_name: district.district_name || "",
              province_id: province?.id || "",
              created_at: now,
              updated_at: now,
            } : null,
            sector: sector ? {
              id: locationData.sector?.toString() || "",
              sector_code: sector.sector_code || "",
              sector_name: sector.sector_name || "",
              district_id: district?.id || "",
              created_at: now,
              updated_at: now,
            } : null,
            cell: cell ? {
              id: locationData.cell?.toString() || "",
              cell_code: cell.cell_code || "",
              cell_name: cell.cell_name || "",
              sector_id: sector?.id || "",
              created_at: now,
              updated_at: now,
            } : null,
            village: village ? {
              id: locationData.village?.toString() || "",
              village_code: village.village_code || "",
              village_name: village.village_name || "",
              cells_id: cell?.id || "",
              created_at: now,
              updated_at: now,
            } : null,
          },
        },
      }));

      // Skip the family selection step if we have an initial family
      if (currentStep === 0 && flowSteps[0] === "families") {
        setCurrentStep(1);
      }
    }
  }, [initialFamily]);

  const loads = form.loads ? JSON.parse(form.loads) : {};
  const flowSteps: FlowStepKey[] = [];

  if (isMonitoring) {
    // Only add families step if we don't have an initial family
    if (!initialFamily) {
      flowSteps.push("families");
    }
    flowSteps.push("izus");
    flowSteps.push("cohorts");
  } else {
    const hasFamilies =
      formSubmissionMandatoryFields.project_id === 3 || loads.families;
    if (hasFamilies && !initialFamily) {
      flowSteps.push("families");
    }

    if (loads.locations && !hasFamilies) {
      flowSteps.push("locations");
    }

    if (loads.izus) flowSteps.push("izus");
    if (loads.cohorts) flowSteps.push("cohorts");
  }

  if (loads.stakeholders) flowSteps.push("stakeholders");

  const handleNext = () => {
    const currentStepKey = flowSteps[currentStep] as FlowStepKey;

    if (currentStepKey === "families") {
      const familyId = flowState.selectedValues.families?.hh_id || null;
      const surveyId = formSubmissionMandatoryFields.id || 0;
      const projectId = formSubmissionMandatoryFields.project_id || 0;
      const sourceModuleId =
        formSubmissionMandatoryFields.source_module_id || 0;
      const izuCode = flowState.selectedValues.izus?.izucode || null;

      if (projectId === 3 || isMonitoring) {
        if (familyId && surveyId && projectId && sourceModuleId) {
          if (isMonitoring) {
            console.log("Is Monitoring", isMonitoring);
            console.log("Source Module ID", sourceModuleId);
            console.log("Survey ID", surveyId);
            console.log("Family ID", familyId);
            console.log("Monitoring Responses: ", JSON.stringify(monitoringResponses, null, 2));
            const existingMonitoringResponse = monitoringResponses.filter(
              (response) =>
                response.module_id.toString() === sourceModuleId.toString() &&
                response.form_id.toString() === surveyId.toString() &&
                response.family_id.toString() === familyId?.toString()
            );

            if (existingMonitoringResponse.length > 0) {
              setShowSiblingForms(true);
              return;
            }
          } else {
            const existingSubmission = submissions.filter(
              (submission) =>
                submission.form_data.project_id === projectId &&
                submission.form_data.source_module_id === sourceModuleId &&
                submission.form_data.survey_id === surveyId &&
                submission.form_data.family === familyId &&
                submission.form_data.izucode === izuCode
            );

            if (existingSubmission.length > 0) {
              setShowSiblingForms(true);
              return;
            }
          }
        }
      }

      const selectedFamily = flowState.selectedValues.families;
      if (selectedFamily?.location) {
        const locationData = selectedFamily.location;
        const now = new Date().toISOString();

        const province = realm.objectForPrimaryKey(
          Province,
          locationData.province?.toString() || ""
        );
        const district = realm.objectForPrimaryKey(
          District,
          locationData.district?.toString() || ""
        );
        const sector = realm.objectForPrimaryKey(
          Sector,
          locationData.sector?.toString() || ""
        );
        const cell = realm.objectForPrimaryKey(
          Cell,
          locationData.cell?.toString() || ""
        );
        const village = realm.objectForPrimaryKey(
          Village,
          locationData.village?.toString() || ""
        );

        setFlowState((prev) => ({
          ...prev,
          selectedValues: {
            ...prev.selectedValues,
            locations: {
              province: province ? {
                id: locationData.province?.toString() || "",
                province_code: province.province_code || "",
                province_name: province.province_name || "",
                province_name_english: province.province_name_english || "",
                created_at: now,
                updated_at: now,
              } : null,
              district: district ? {
                id: locationData.district?.toString() || "",
                district_code: district.district_code || "",
                district_name: district.district_name || "",
                province_id: province?.id || "",
                created_at: now,
                updated_at: now,
              } : null,
              sector: sector ? {
                id: locationData.sector?.toString() || "",
                sector_code: sector.sector_code || "",
                sector_name: sector.sector_name || "",
                district_id: district?.id || "",
                created_at: now,
                updated_at: now,
              } : null,
              cell: cell ? {
                id: locationData.cell?.toString() || "",
                cell_code: cell.cell_code || "",
                cell_name: cell.cell_name || "",
                sector_id: sector?.id || "",
                created_at: now,
                updated_at: now,
              } : null,
              village: village ? {
                id: locationData.village?.toString() || "",
                village_code: village.village_code || "",
                village_name: village.village_name || "",
                cells_id: cell?.id || "",
                created_at: now,
                updated_at: now,
              } : null,
            },
          },
        }));
      }
    }

    setCurrentStep((prev) => prev + 1);
  };

  const handleBack = () => {
    setCurrentStep((prev) => prev - 1);
  };

  const handleCohortSelect = (cohort: ICohort) => {
    setFlowState((prev) => ({
      ...prev,
      selectedValues: {
        ...prev.selectedValues,
        cohorts: cohort,
      },
    }));
  };

  const handleFamilySelect = (family: IFamilies) => {
    setFlowState((prev) => ({
      ...prev,
      selectedValues: {
        ...prev.selectedValues,
        families: family,
      },
    }));
  };

  const handleIzuSelect = (izu: Izus) => {
    setFlowState((prev) => ({
      ...prev,
      selectedValues: {
        ...prev.selectedValues,
        izus: izu,
      },
    }));
  };

  const handleLocationSelect = (location: any) => {
    setFlowState((prev) => ({
      ...prev,
      selectedValues: {
        ...prev.selectedValues,
        locations: location,
      },
    }));
  };

  const handleStakeholderSelect = (stakeholders: any[]) => {
    setFlowState((prev) => ({
      ...prev,
      selectedValues: {
        ...prev.selectedValues,
        stakeholders,
      },
    }));
  };

  const handleEditFlowState = (step: string) => {
    const stepIndex = flowSteps.indexOf(step as FlowStepKey);
    if (stepIndex !== -1) {
      setCurrentStep(stepIndex);
    }
  };

  const renderStep = () => {
    if (showSiblingForms) {
      return (
        <FormSiblingSelector
          projectId={formSubmissionMandatoryFields.project_id || 0}
          sourceModuleId={formSubmissionMandatoryFields.source_module_id || 0}
          projectModuleId={formSubmissionMandatoryFields.project_module_id || 0}
          familyId={flowState.selectedValues.families?.hh_id || ""}
          currentFormId={formSubmissionMandatoryFields.id || 0}
          isMonitoring={isMonitoring}
        />
      );
    }

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

    let isComplete = false;
    switch (stepKey) {
      case "izus":
        isComplete = value !== null && value !== undefined;
        break;
      case "cohorts":
        isComplete = value !== null && value !== undefined;
        break;
      case "families":
        isComplete = value !== null && value !== undefined;
        break;
      case "locations":
        const locations = value as FlowState["selectedValues"]["locations"];
        isComplete = Boolean(
          locations?.province &&
            locations?.district &&
            locations?.sector &&
            locations?.cell &&
            locations?.village
        );
        break;
      case "stakeholders":
        isComplete = Array.isArray(value) && value.length > 0;
        break;
      case "onPhone":
        isComplete = true;
        break;
      default:
        isComplete = false;
    }
    return isComplete;
  };

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
      {flowSteps[currentStep] === "locations" ? (
        <ScrollView
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          className="flex-1"
        >
          {renderStep()}
        </ScrollView>
      ) : (
        <View className="flex-1">{renderStep()}</View>
      )}
      {!showSiblingForms && (
        <FormNavigation
          onBack={handleBack}
          onNext={handleNext}
          isNextDisabled={!isStepComplete(flowSteps[currentStep] as FlowStepKey)}
          showBack={currentStep > 0}
        />
      )}
    </View>
  );
};

export default FormFlowManager;
