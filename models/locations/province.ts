import { Realm } from "@realm/react";

export interface IProvince {
  id: string;
  province_code: string;
  province_name: string;
  province_name_english: string;
  created_at: string;
  updated_at: string;
}

export class Province extends Realm.Object {
  id!: string;
  province_code!: string;
  province_name!: string;
  province_name_english!: string;
  created_at!: string;
  updated_at!: string;

  static schema = {
    name: "Province",
    primaryKey: "id",
    properties: {
      id: "string",
      province_code: "string",
      province_name: "string",
      province_name_english: "string",
      created_at: "string",
      updated_at: "string",
    },
  };
} 