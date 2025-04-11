import { Realm } from "@realm/react";

export class Families extends Realm.Object {
  id!: number;
  hh_id!: string;
  hh_head_fullname!: string;
  village_name!: string;
  cohort!: string;
  created_at?: string;
  updated_at?: string;
  location?: string;

  static schema = {
    name: "Families",
    primaryKey: "id",
    properties: {
      id: "int",
      hh_id: "string",
      hh_head_fullname: "string",
      village_name: "string",
      cohort: "string",
      created_at: "string?",
      updated_at: "string?",
      location: "string?",
    },
  };
}
