import { SurveySubmission } from "~/models/surveys/survey-submission";
import { FormField } from "~/types";
import { Realm } from "@realm/react";
import { isOnline } from "./network";
import { baseInstance } from "~/utils/axios";
import { RealmContext } from "~/providers/RealContextProvider";
const { useRealm, useQuery } = RealmContext;

export const createSurveySubmission = (
  formData: Record<string, any>,
  fields: FormField[]
) => {
  const answers = Object.fromEntries(
    fields
      .filter((field) => field.key !== "submit")
      .map((field) => {
        const value = formData[field.key];

        // Handle different field types
        switch (field.type) {
          case "switch":
            return [field.key, value ? true : false];
          case "number":
            return [field.key, Number(value)];
          case "date":
          case "datetime":
            return [field.key, value ? new Date(value).toISOString() : null];
          default:
            return [field.key, value ?? null];
        }
      })
  );

  return {
    _id: new Realm.BSON.ObjectId(),
    submittedAt: new Date(),
    timeSpentFormatted: formData.timeSpentFormatted,
    answers,
    userId: formData.userId,
    metadata: {
      language: formData.language || "en-US",
    },

    table_name: formData.table_name,
    project_module_id: formData.project_module_id,
    source_module_id: formData.source_module_id,
    project_id: formData.project_id,
    survey_id: formData.survey_id,
    post_data: formData.post_data,
    province: formData.province,
    district: formData.district,
    sector: formData.sector,
    cell: formData.cell,
    village: formData.village,
    izucode: formData.izucode,
    family: formData.family,
  };
};

export const saveSurveySubmission = async (
  realm: Realm,
  formData: Record<string, any>,
  fields: FormField[]
) => {
  try {
    const submission = createSurveySubmission(formData, fields);
    const isConnected = isOnline();
    let result;

    // If online, first try to submit to API
    if (isConnected) {
      try {
        const response = await baseInstance.post(formData.post_data, {
          ...submission,
        });

        // If API submission is successful and has result object
        if (response.data || response.data.result) {
          realm.write(() => {
            const submissionWithSyncStatus = {
              ...submission,
              sync_status: true,
              syncStatus: "synced",
              formStatus: "followup",
              lastSyncAttempt: new Date(),
            };
            console.log(
              "Submission with sync status:",
              submissionWithSyncStatus
            );
            result = realm.create(SurveySubmission, submissionWithSyncStatus);
          });
          console.log("Submission saved to realm.");
          return result; // Return the result
        }
      } catch (apiError) {
        console.error("Error submitting to API:", apiError);
        // If API submission fails, fall back to offline mode
      }
    }

    // If offline or API submission failed, save locally with pending status
    let offlineResult;
    realm.write(() => {
      const submissionWithSyncStatus = {
        ...submission,
        sync_status: false,
        syncStatus: "pending",
        formStatus: "followup",
        lastSyncAttempt: new Date(),
      };
      offlineResult = realm.create(SurveySubmission, submissionWithSyncStatus);
    });

    console.log("Survey submission saved locally!");
    return offlineResult; // Return the result for offline submissions
  } catch (error) {
    console.error("Error saving survey submission:", error);
    throw error;
  }
};

const syncWithRemote = async (submission: any) => {
  try {
    // TODO: Implement your remote API call here
    // This is where you would make the actual HTTP request to your backend
    console.log("Syncing submission with remote server:", submission);

    // After successful sync, update the local record
    const realm = useRealm();
    realm.write(() => {
      const localSubmission = realm.objectForPrimaryKey(
        SurveySubmission,
        submission._id
      );
      if (localSubmission) {
        localSubmission.sync_status = true;
        localSubmission.syncStatus = "synced";
        localSubmission.lastSyncAttempt = new Date();
        localSubmission.formStatus = "followup";
      }
    });
  } catch (error) {
    console.error("Error syncing with remote server:", error);
    // Update sync status to failed
    const realm = useRealm();
    realm.write(() => {
      const localSubmission = realm.objectForPrimaryKey(
        SurveySubmission,
        submission._id
      );
      if (localSubmission) {
        localSubmission.sync_status = false;
        localSubmission.syncStatus = "failed";
        localSubmission.lastSyncAttempt = new Date();
        localSubmission.formStatus = "followup";
      }
    });
  }
};

export const syncPendingSubmissions = async () => {
  const realm = useRealm();
  const pendingSubmissions = realm
    .objects(SurveySubmission)
    .filtered('syncStatus == "pending"');

  for (const submission of pendingSubmissions) {
    await syncWithRemote(submission);
  }
};

export const useGetAllSurveySubmissions = () => {
  const surveySubmissions = useQuery(SurveySubmission);
  return {
    surveySubmissions: surveySubmissions.map((submission) => ({
      ...submission,
      answers: Object.fromEntries(
        Object.entries(submission.answers).map(([key, value]) => [
          key,
          value?.toString() ?? "",
        ])
      ),
    })),
    isLoading: surveySubmissions.length === 0,
    error: null,
    refetch: () => {
      const realm = useRealm();
      const surveySubmissions = realm.objects(SurveySubmission);
      return {
        surveySubmissions: surveySubmissions.map((submission) => ({
          ...submission,
          answers: Object.fromEntries(
            Object.entries(submission.answers).map(([key, value]) => [
              key,
              value?.toString() ?? "",
            ])
          ),
        })),
        isLoading: surveySubmissions.length === 0,
        error: null,
      };
    },
  };
};
