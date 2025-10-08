export const CREATE_SECTOR_TABLE = `
  CREATE TABLE IF NOT EXISTS Sectors (
    _id TEXT PRIMARY KEY,
     id INTEGER NOT NULL,
    district_id TEXT NOT NULL,
    sector_code TEXT NOT NULL,
    sector_name TEXT NOT NULL,
    created_at TEXT NOT NULL,  
    updated_at TEXT NOT NULL   
  );
`;

export interface ISector {
  id: any;
  _id: string;           // primary key
  district_id: string;
  sector_code: string;
  sector_name: string;
  created_at: string;   // ISO date string
  updated_at: string;   // ISO date string
}