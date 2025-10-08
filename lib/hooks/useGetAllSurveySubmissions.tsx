import { useEffect, useState } from "react";
import { useSQLite } from "~/providers/RealContextProvider";
import { ISurveySubmission } from "~/types"; // Make sure this type matches your SQLite SurveySubmission

// Convert SQLite row to submission object
function sqliteRowToSubmission(row: any): ISurveySubmission {
return {
  id: row.id,
  survey_id: row.survey_id,
  user_id: row.user_id,
  responses: row.responses ? JSON.parse(row.responses) : {},
  status: row.status,
  created_at: row.created_at,
  updated_at: row.updated_at,
  answers: {},
  form_data: {},
  location: {},
  sync_data: {}
};
}

// Convert submission object to SQLite row
function submissionToSQLiteRow(submission: ISurveySubmission) {
  return {
    id: submission.id,
    survey_id: submission.survey_id,
    user_id: submission.user_id,
    responses: JSON.stringify(submission.responses || {}),
    status: submission.status || 0,
    created_at: submission.created_at || new Date().toISOString(),
    updated_at: submission.updated_at || new Date().toISOString(),
  };
}

export const useGetAllSurveySubmissions = () => {
  const { getAll } = useSQLite();
  const [submissions, setSubmissions] = useState<ISurveySubmission[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadSubmissions = async () => {
    setIsLoading(true);
    try {
      const rows = await getAll<any>("SurveySubmissions"); // Table name
      const loaded = rows.map(sqliteRowToSubmission);
      setSubmissions(loaded);
    } catch (error) {
      console.error("Error loading survey submissions:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadSubmissions();
  }, []);

  return { submissions, isLoading, refresh: loadSubmissions };
};
