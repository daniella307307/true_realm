import { Realm } from "@realm/react";

export interface IDistrict {
  id: string;
  district_code: string;
  district_name: string;
  province_id: string;
  created_at: string;
  updated_at: string;
}

export class District extends Realm.Object {
  id!: string;
  district_code!: string;
  district_name!: string;
  province_id!: string;
  created_at!: string;
  updated_at!: string;

  static schema = {
    name: "District",
    primaryKey: "id",
    properties: {
      id: "string",
      district_code: "string",
      district_name: "string",
      province_id: "string",
      created_at: "string",
      updated_at: "string",
    },
  };
} 