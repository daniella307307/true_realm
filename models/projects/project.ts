// db/schema.ts
export const CREATE_PROJECT_TABLE = `
  CREATE TABLE IF NOT EXISTS Projects (
    id INTEGER,
    _id INTEGER PRIMARY KEY,
    name TEXT NOT NULL,
    duration TEXT,
    progress TEXT,
    description TEXT,
    status INTEGER NOT NULL,
    beneficiary TEXT,
    projectlead TEXT,
    has_modules INTEGER NOT NULL,
    kin_name TEXT,
    kin_descriptions TEXT,
    created_at TEXT,
    updated_at TEXT,
    project_modules TEXT 
  );
`;
