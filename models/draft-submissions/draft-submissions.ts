export const CREATE_DRAFT_SUBMISSIONS_TABLE = `
  CREATE TABLE IF NOT EXISTS DraftSubmissions (
    _id TEXT PRIMARY KEY,
    form_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    draft_data TEXT NOT NULL,
    last_saved_at TEXT NOT NULL,
    last_page INTEGER DEFAULT 0,
    progress_percentage INTEGER DEFAULT 0,
    metadata TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE INDEX IF NOT EXISTS idx_draft_form_user 
    ON DraftSubmissions(form_id, user_id);
  CREATE INDEX IF NOT EXISTS idx_draft_user 
    ON DraftSubmissions(user_id);
  CREATE INDEX IF NOT EXISTS idx_draft_updated 
    ON DraftSubmissions(updated_at);
`;

export interface DraftSubmission {
  _id: string;
  form_id: string;
  user_id: string;
  draft_data: Record<string, any>;
  last_saved_at: string;
  last_page: number;
  progress_percentage: number;
  metadata?: {
    form_name?: string;
    total_pages?: number;
    started_at?: string;
  };
  created_at: string;
  updated_at: string;
}