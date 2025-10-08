export const CREATE_VILLAGE_TABLE = `
  CREATE TABLE IF NOT EXISTS Villages (
    _id TEXT PRIMARY KEY,
     id INTEGER NOT NULL,
    village_code TEXT NOT NULL,
    village_name TEXT NOT NULL,
    cells_id TEXT NOT NULL,
    created_at TEXT NOT NULL,  
    updated_at TEXT NOT NULL   
  );
`;


export interface IVillage {
  id: any;
  _id: string;           // primary key
  village_code: string;
  village_name: string;
  cells_id: string;
  created_at: string;   // ISO date string
  updated_at: string;   // ISO date string
}