import { Realm } from "@realm/react";

export interface ISector {
  id: string;
  district_id: string;
  sector_code: string;
  sector_name: string;
  created_at: string;
  updated_at: string;
}

export class Sector extends Realm.Object {
  id!: string;
  district_id!: string;
  sector_code!: string;
  sector_name!: string;
  created_at!: string;
  updated_at!: string;

  static schema = {
    name: "Sector",
    primaryKey: "id",
    properties: {
      id: "string",
      district_id: "string",
      sector_code: "string",
      sector_name: "string",
      created_at: "string",
      updated_at: "string",
    },
  };
} 