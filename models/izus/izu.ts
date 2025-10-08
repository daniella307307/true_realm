export const CREATE_IZU_TABLE = `
  CREATE TABLE IF NOT EXISTS Users (
    _id TEXT PRIMARY KEY,
    id INTEGER,
    name TEXT,
    izucode TEXT,
    villages_id INTEGER,
    position INTEGER,
    meta TEXT,      
    form_data TEXT,  
    location TEXT,   
    sync_data TEXT,
    sync_status BOOLEAN,
    sync_reason TEXT,
    sync_attempts INTEGER,
    sync_type TEXT,
    created_by_user_id TEXT
  );
`;
