export const CREATE_FOLLOWUPS_TABLE = `
  CREATE TABLE IF NOT EXISTS FollowUps (
    _id TEXT PRIMARY KEY,
    followup_date TEXT,
    status TEXT,
    comment TEXT,
    form_data TEXT,      
    sync_data TEXT,      
    user TEXT,           
    survey TEXT,         
    survey_result TEXT,  
    sync_status BOOLEAN,
    sync_reason TEXT,
    sync_attempts INTEGER,
    sync_type TEXT,
    last_sync_attempt TEXT,
    created_by_user_id INTEGER,
    timestamp TEXT,
    created_at TEXT,     
    updated_at TEXT     
  );
`;
