export const CREATE_DISTRICT_TABLE = `
  CREATE TABLE IF NOT EXISTS Districts (
    _id TEXT PRIMARY KEY,
     id INTEGER NOT NULL,
    district_code TEXT NOT NULL,
    district_name TEXT NOT NULL,
    province_id TEXT NOT NULL,
    created_at TEXT NOT NULL,  
    updated_at TEXT NOT NULL   
  );
`;

export interface IDistrict {
  id: any;
  _id: string;           // primary key
  district_code: string;
  district_name: string;
  province_id: string;
  created_at: string;   // ISO date string
  updated_at: string;   // ISO date string
}
