export const CREATE_NOTIFICATIONS_TABLE = `
  CREATE TABLE IF NOT EXISTS Notifications (
    _id TEXT PRIMARY KEY,
    followup_date TEXT,
    status TEXT,
    comment TEXT,
    form_data TEXT,       
    user TEXT,            
    survey TEXT,          
    survey_result TEXT,   
    created_at TEXT,
    updated_at TEXT
  );
`;
