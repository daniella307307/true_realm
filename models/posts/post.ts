export const CREATE_POST_TABLE = `
  CREATE TABLE IF NOT EXISTS Posts (
    id INTEGER PRIMARY KEY,
    user_id INTEGER NOT NULL,
    status INTEGER NOT NULL,
    title TEXT NOT NULL,
    body TEXT NOT NULL,
    flagged INTEGER NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT,
    user TEXT NOT NULL,
    comments TEXT NOT NULL,
    likes TEXT NOT NULL
  );
`;
