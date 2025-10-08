export const CREATE_COMMENT_TABLE = `
  CREATE TABLE IF NOT EXISTS Comments (
    id INTEGER PRIMARY KEY,
    module_id TEXT NOT NULL,
    family_id TEXT NOT NULL,
    form_id TEXT NOT NULL,
    question_id TEXT NOT NULL,
    comment TEXT NOT NULL,
    created_at TEXT,
    updated_at TEXT
  );
`;
