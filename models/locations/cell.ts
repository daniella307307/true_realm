import { Realm } from "@realm/react";

export interface ICell {
  id: string;
  cell_code: string;
  cell_name: string;
  sector_id: string;
  created_at: string;
  updated_at: string;
}

export class Cell extends Realm.Object {
  id!: string;
  cell_code!: string;
  cell_name!: string;
  sector_id!: string;
  created_at!: string;
  updated_at!: string;

  static schema = {
    name: "Cell",
    primaryKey: "id",
    properties: {
      id: "string",
      cell_code: "string",
      cell_name: "string",
      sector_id: "string",
      created_at: "string",
      updated_at: "string",
    },
  };
} 