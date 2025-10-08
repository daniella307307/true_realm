export const CREATE_COHORT_TABLE = `
  CREATE TABLE IF NOT EXISTS Cohorts (
    _id TEXT PRIMARY KEY,   
    cohort TEXT NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );
`;
