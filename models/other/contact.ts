export const CREATE_CONTACT_TABLE = `
  CREATE TABLE IF NOT EXISTS Contacts (
    id INTEGER PRIMARY KEY,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    email TEXT NOT NULL,
    role INTEGER NOT NULL,
    job_title TEXT NOT NULL,
    city TEXT NOT NULL,
    country TEXT NOT NULL,
    created_at TEXT,  
    updated_at TEXT   
  );
`;
