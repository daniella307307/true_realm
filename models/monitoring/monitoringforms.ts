export const CREATE_MONITORING_FORMS_TABLE = `
  CREATE TABLE IF NOT EXISTS  MonitoringForms (
    _id INTEGER,
    id INTEGER,
    form_id INTEGER,
    module_id INTEGER,
    project_id INTEGER,
    name TEXT NOT NULL,
    name_kin TEXT,
    json2 TEXT NOT NULL,
    post_data TEXT NOT NULL,
    table_name TEXT,
    single_page TEXT,
    created_at TEXT,
    updated_at TEXT,
    status TEXT,
    source_module_id INTEGER,
    project_module_id INTEGER
  );
`;
