
export interface IStakeholder {
  _id:string,
  id: number;
  name: string;
  guard_name: string;
  is_stakeholder: number;
  json: string | null;
  created_at: string;
  updated_at?: string;
}

export const CREATE_STAKEHOLDER_TABLE = `
  CREATE TABLE IF NOT EXISTS Stakeholders (
    _id TEXT PRIMARY KEY,
    id INTEGER,
    name TEXT NOT NULL,
    guard_name TEXT NOT NULL,
    is_stakeholder INTEGER NOT NULL,
    json TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT
  );
`;