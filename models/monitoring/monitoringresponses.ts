export const CREATE_MONITORING_RESPONSES_TABLE = `
  CREATE TABLE IF NOT EXISTS MonitoringResponses (
    _id INTEGER,
    id INTEGER,
    family_id TEXT,
    module_id TEXT,
    form_id TEXT,
    project_id INTEGER,
    date_recorded TEXT,  
    type TEXT,
    cohort TEXT,
    user_id INTEGER,
    score_data TEXT,
    json TEXT,
    sync_data TEXT   ,
    sync_data_created_by_user_id TEXT,
    sync_status BOOLEAN,
    sync_reason TEXT,
    sync_attempts INTEGER,
    sync_type TEXT,
    last_sync_attempt TEXT,
    submitted_at TEXT,
    created_at TEXT,
    updated_at TEXT,
    answer TEXT,
    created_by_user_id INTEGER,
    timestamp TEXT
  );
`;
