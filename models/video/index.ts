export const CREATE_VIDEO_HELP_TABLE = `
  CREATE TABLE IF NOT EXISTS VideoHelp (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT,
    file_path TEXT,
    description TEXT,
    created_at DATETIME,
    updated_at DATETIME
  );
`;
