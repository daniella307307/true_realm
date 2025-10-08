export const CREATE_CELL_TABLE = `
  CREATE TABLE IF NOT EXISTS Cells (
    _id TEXT PRIMARY KEY,
    cell_code TEXT NOT NULL,
    cell_name TEXT NOT NULL,
    sector_id TEXT NOT NULL,
    created_at TEXT NOT NULL, 
    id INTEGER NOT NULL,
    updated_at TEXT NOT NULL   
  );
`;
export interface ICell {
  id: any;
  _id: string;           // primary key
  cell_code: string;
  cell_name: string;
  sector_id: string;
  created_at: string;   // ISO date string
  updated_at: string;   // ISO date string
}
