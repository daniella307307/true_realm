export const CREATE_FAMILIES_TABLE = `
  CREATE TABLE IF NOT EXISTS Families (
    _id TEXT PRIMARY KEY,
    hh_id TEXT,
    hh_head_fullname TEXT,
    village_name TEXT,
    village_id INTEGER,
    izucode TEXT,
    meta TEXT,
    form_data TEXT,
    location TEXT,
    sync_status BOOLEAN,
    sync_reason TEXT,
    sync_attempts INTEGER,
    sync_type TEXT,
    last_sync_attempt TEXT,
    submitted_at TEXT,
    created_by_user_id INTEGER
  );
`;
