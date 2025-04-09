import { Realm } from "@realm/react";

export interface IVillage {
  id: string;
  village_code: string;
  village_name: string;
  cells_id: string;
  created_at: string;
  updated_at: string;
}

export class Village extends Realm.Object {
  id!: string;
  village_code!: string;
  village_name!: string;
  cells_id!: string;
  created_at!: string;
  updated_at!: string;

  static schema = {
    name: "Village",
    primaryKey: "id",
    properties: {
      id: "string",
      village_code: "string",
      village_name: "string",
      cells_id: "string",
      created_at: "string",
      updated_at: "string",
    },
  };
} 