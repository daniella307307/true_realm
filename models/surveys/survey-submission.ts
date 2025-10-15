// survey-submission.ts

export interface SurveySubmission {
  _id?: string; // Primary key - consistent with SQLiteProvider
  answers: { [key: string]: string | number | boolean | null };
  form_data: { [key: string]: string | number | boolean | null };
  location: { [key: string]: string | number | boolean | null };
  sync_data: { [key: string]: string | number | boolean | null | Date };
  
  // Optional fields
  name?: string;
  name_kin?: string;
  slug?: string;
  json2?: string;
  post_data?: string;
  loads?: string;
  is_primary?: boolean;
  table_name?: string;
  survey_status?: string;
  created_by_user_id?: number;
  sync_status?: boolean;
  sync_reason?: string;
  sync_attempts?: number;
  sync_type?: string;
  created_at?: string;
  updated_at?: string;
}

// Single, consistent table definition
export const CREATE_SURVEY_SUBMISSIONS_TABLE = `
  CREATE TABLE IF NOT EXISTS SurveySubmissions (
    _id TEXT PRIMARY KEY,
    id INTEGER,
    answers TEXT NOT NULL,
    form_data TEXT NOT NULL,
    location TEXT NOT NULL,
    sync_data TEXT NOT NULL,
    name TEXT,
    project_id INTEGER,
    name_kin TEXT,
    slug TEXT,
    json2 TEXT,
    post_data TEXT,
    loads TEXT,
    fetch_data TEXT,
    is_primary BOOLEAN,
    table_name TEXT,
    survey_status TEXT,
    created_by_user_id INTEGER,
    sync_status BOOLEAN,
    sync_reason TEXT,
    sync_attempts INTEGER,
    sync_type TEXT,
    created_at TEXT,
    updated_at TEXT
  );
`;

// Helper functions for working with SurveySubmissions
export const SurveySubmissionHelpers = {
  // Parse stringified JSON fields when reading from DB
  parseFromDb(row: any): SurveySubmission {
    return {
      ...row,
      answers: typeof row.answers === 'string' ? JSON.parse(row.answers) : row.answers,
      form_data: typeof row.form_data === 'string' ? JSON.parse(row.form_data) : row.form_data,
      location: typeof row.location === 'string' ? JSON.parse(row.location) : row.location,
      sync_data: typeof row.sync_data === 'string' ? JSON.parse(row.sync_data) : row.sync_data,
    };
  },

  // Prepare data for DB insertion (stringify JSON fields)
  prepareForDb(submission: Partial<SurveySubmission>): any {
    const prepared = { ...submission };
    
    if (prepared.answers && typeof prepared.answers === 'object') {
      prepared.answers = JSON.stringify(prepared.answers) as any;
    }
    if (prepared.form_data && typeof prepared.form_data === 'object') {
      prepared.form_data = JSON.stringify(prepared.form_data) as any;
    }
    if (prepared.location && typeof prepared.location === 'object') {
      prepared.location = JSON.stringify(prepared.location) as any;
    }
    if (prepared.sync_data && typeof prepared.sync_data === 'object') {
      prepared.sync_data = JSON.stringify(prepared.sync_data) as any;
    }
    
    return prepared;
  },

  // Get user ID from submission
  getUserId(submission: SurveySubmission): number | null {
    if (submission.created_by_user_id !== undefined) {
      return submission.created_by_user_id;
    }
    if (submission.form_data && submission.form_data.user_id !== undefined) {
      return typeof submission.form_data.user_id === 'string'
        ? parseInt(submission.form_data.user_id, 10)
        : (submission.form_data.user_id as number);
    }
    return null;
  },
};