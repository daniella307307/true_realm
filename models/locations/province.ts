export const CREATE_PROVINCE_TABLE = `
  CREATE TABLE IF NOT EXISTS Provinces (
    _id TEXT PRIMARY KEY,
     id INTEGER NOT NULL,
    province_code TEXT NOT NULL,
    province_name TEXT NOT NULL,
    province_name_english TEXT NOT NULL,
    created_at TEXT NOT NULL,  
    updated_at TEXT NOT NULL   
  );
`;

export interface IProvince{
  id: any;
  _id: string;           // primary key
  province_code: string;
  province_name: string;
  province_name_english: string;
  created_at: string;   // ISO date string
  updated_at: string;   // ISO date string
}