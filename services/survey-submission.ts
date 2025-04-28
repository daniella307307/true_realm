import { FormField, ISurveySubmission } from "~/types";
import { Realm } from "@realm/react";
import { isOnline } from "./network";
import { baseInstance } from "~/utils/axios";
import { RealmContext } from "~/providers/RealContextProvider";
import { useState, useCallback, useEffect } from "react";
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

  // Create structured submission according to new interface
  return {
    _id: new Realm.BSON.ObjectId(),
    answers,
    form_data: {
      time_spent_filling_the_form: formData.timeSpentFormatted,
      user_id: formData.userId,
      table_name: formData.table_name,
      project_module_id: formData.project_module_id,
      source_module_id: formData.source_module_id,
      project_id: formData.project_id,
      survey_id: formData.survey_id,
      post_data: formData.post_data,
      izucode: formData.izucode,
      family: formData.family,
      form_status: "followup",
      cohort: formData.cohort,
    },
    location: {
      province: formData.province,
      district: formData.district,
      sector: formData.sector,
      cell: formData.cell,
      village: formData.village,
    },
    sync_data: {
      sync_status: false,
      sync_reason: "pending",
      sync_attempts: 0,
      last_sync_attempt: new Date(),
      submitted_at: new Date(),
    },
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
        // Prepare data for API submission - flatten the structure
        const apiSubmission = {
          ...submission.answers,
          _id: submission._id,
          Time_spent_filling_the_form:
            submission.form_data?.time_spent_filling_the_form,
          userId: submission.form_data?.user_id,
          table_name: submission.form_data?.table_name,
          project_module_id: submission.form_data?.project_module_id,
          source_module_id: submission.form_data?.source_module_id,
          project_id: submission.form_data?.project_id,
          survey_id: submission.form_data?.survey_id,
          post_data: submission.form_data?.post_data,
          izucode: submission.form_data?.izucode,
          family: submission.form_data?.family,
          province: submission.location?.province,
          district: submission.location?.district,
          sector: submission.location?.sector,
          cell: submission.location?.cell,
          village: submission.location?.village,
          submittedAt: submission.sync_data?.submitted_at,
        };

        const response = await baseInstance.post(
          formData.post_data,
          apiSubmission
        );
        console.log("response data:", JSON.stringify(response.data, null, 2));

        if (response.data.result) {
          console.log("API submission successful and has result object");
          realm.write(() => {
            // Update sync data to reflect successful sync
            const syncedSubmission = {
              ...submission,
              sync_data: {
                ...submission.sync_data,
                sync_status: true,
                sync_reason: "Success",
                sync_attempts: 1,
                last_sync_attempt: new Date(),
              },
              form_data: {
                ...submission.form_data,
                form_status: "followup",
              },
            };
            // console.log("Submission with sync status:", syncedSubmission);
            result = realm.create("SurveySubmission", syncedSubmission);
          });
          console.log("Submission saved to realm.", response.data);
          return result;
        }
      } catch (error: any) {
        console.log(`Sync status changed to saved ${submission._id}`);
        if (error.response?.status === 400) {
          // Handle 400 error specifically
          realm.write(() => {
            const syncedSubmission = {
              ...submission,
              sync_data: {
                ...submission.sync_data,
                sync_status: true,
                sync_reason: "Already, accepted",
                sync_attempts: 1,
                last_sync_attempt: new Date(),
              },
              form_data: {
                ...submission.form_data,
                form_status: "followup",
              },
            };
            result = realm.create("SurveySubmission", syncedSubmission);
          });
          console.log("Submission saved to offline realm.", error.response);
          console.log("Advanced error:", error.response.data);
          return result;
        }
        console.log("Error submitting to API:", error);
      }
    }

    // Save offline if online submission failed or device is offline
    let offlineResult;
    realm.write(() => {
      // Create with pending sync status
      offlineResult = realm.create("SurveySubmission", submission);
    });

    return offlineResult;
  } catch (error) {
    console.error("Error saving survey submission:", error);
    throw error;
  }
};

const syncWithRemote = async (
  submission: ISurveySubmission,
  apiUrl: string,
  realm: Realm
) => {
  try {
    let result;
    // Prepare data for API submission
    const apiSubmission = {
      ...submission.answers,
      _id: submission._id,
      Time_spent_filling_the_form:
        submission.form_data?.time_spent_filling_the_form,
      userId: submission.form_data?.user_id,
      table_name: submission.form_data?.table_name,
      project_module_id: submission.form_data?.project_module_id,
      source_module_id: submission.form_data?.source_module_id,
      project_id: submission.form_data?.project_id,
      survey_id: submission.form_data?.survey_id,
      post_data: submission.form_data?.post_data,
      izucode: submission.form_data?.izucode,
      family: submission.form_data?.family,
      province: submission.location?.province,
      district: submission.location?.district,
      sector: submission.location?.sector,
      cell: submission.location?.cell,
      village: submission.location?.village,
      submittedAt: submission.sync_data?.submitted_at,
    };

    // console.log("Syncing submission with remote server:", apiSubmission);

    const response = await baseInstance.post(apiUrl, apiSubmission);
    console.log("Response data: ", JSON.stringify(response.data, null, 2));

    if (response.data.result) {
      console.log("API submission successful and has result object");
      realm.write(() => {
        // Update sync data to reflect successful sync
        if (submission.sync_data) {
          submission.sync_data.sync_status = true;
          submission.sync_data.sync_reason = "Success";
          submission.sync_data.sync_attempts =
            (submission.sync_data.sync_attempts || 0) + 1;
          submission.sync_data.last_sync_attempt = new Date();
        }

        if (submission.form_data) {
          submission.form_data.form_status = "followup";
        }
      });
      console.log("Submission updated in realm.");
      return submission;
    }
  } catch (error: any) {
    console.log("Error syncing with remote server:", error);
    // When status is 400, update sync status to failed
    if (error.response?.status === 400) {
      if (error.response.data.isSaved === true) {
        console.log("Submission already exists in the database");
        // Update the submission in the realm
        realm.write(() => {
          if (submission.sync_data) {
            submission.sync_data.sync_status = true;
            submission.sync_data.sync_reason = "Already, accepted";
            submission.sync_data.sync_attempts =
              (submission.sync_data.sync_attempts || 0) + 1;
            submission.sync_data.last_sync_attempt = new Date();
          }

          if (submission.form_data) {
            submission.form_data.form_status = "followup";
          }
        });
        console.log("Submission updated in offline realm as already accepted");
      } else {
        realm.write(() => {
          if (submission.sync_data) {
            submission.sync_data.sync_status = false;
            submission.sync_data.sync_reason = "Rejected by the server";
            submission.sync_data.sync_attempts =
              (submission.sync_data.sync_attempts || 0) + 1;
            submission.sync_data.last_sync_attempt = new Date();
          }

          if (submission.form_data) {
            submission.form_data.form_status = "followup";
          }
        });
        console.log("Submission rejected by the server and offline");
      }
      return submission;
    } else if (error.message === "Network Error") {
      console.log("Network error for submission", submission._id);
      // Update sync status to network error
      realm.write(() => {
        if (submission.sync_data) {
          submission.sync_data.sync_status = false;
          submission.sync_data.sync_reason = "Network Error";
          submission.sync_data.sync_attempts =
            (submission.sync_data.sync_attempts || 0) + 1;
          submission.sync_data.last_sync_attempt = new Date();
        }
      });
      console.log("Submission updated in offline realm with network error");
      return submission;
    } else {
      console.log("Other error type:", error);
      // Update sync status to other error
      realm.write(() => {
        if (submission.sync_data) {
          submission.sync_data.sync_status = false;
          submission.sync_data.sync_reason = "Other error";
          submission.sync_data.sync_attempts =
            (submission.sync_data.sync_attempts || 0) + 1;
          submission.sync_data.last_sync_attempt = new Date();
        }
      });
      console.log("Submission updated in offline realm with other error");
      return submission;
    }
  }
};

export const syncPendingSubmissions = async (realm: Realm) => {
  const pendingSubmissions = realm
    .objects<ISurveySubmission>("SurveySubmission")
    .filtered("sync_data.sync_status == false");

  for (const submission of pendingSubmissions) {
    await syncWithRemote(submission, "/sendVisitData", realm);
  }
};

export const useGetAllSurveySubmissions = () => {
  const surveySubmissions = useQuery<ISurveySubmission>("SurveySubmission");
  const [refreshKey, setRefreshKey] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  // Set loading to false once the query has been executed
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 300);

    return () => clearTimeout(timer);
  }, [surveySubmissions, refreshKey]);

  const refresh = useCallback(() => {
    setRefreshKey((prev) => prev + 1);
    setIsLoading(true);
  }, []);

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
    isLoading,
    error: null,
    refresh,
  };
};
