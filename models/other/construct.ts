export const CREATE_CONSTRUCT_TABLE = `
  CREATE TABLE IF NOT EXISTS Constructs (
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT NOT NULL,
    status INTEGER NOT NULL,
    project_id INTEGER NOT NULL,
    created_at TEXT,  
    updated_at TEXT  
  );
`;
