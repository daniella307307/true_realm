export const CREATE_APPMETADATA_TABLE_SQL = `
  CREATE TABLE IF NOT EXISTS AppMetadata (
    id TEXT PRIMARY KEY NOT NULL,
    data TEXT,
    created_at TEXT,
    updated_at TEXT
    );
`;
