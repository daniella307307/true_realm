import { Realm } from "@realm/react";

export class MonitoringForms extends Realm.Object {
  id!: number;
  name!: string;
  name_kin!: string;

  json2!: string;
  post_data!: string;
  table_name!: string;
  single_page!: string;
  status!: string;

  static schema = {
    name: "MonitoringForms",
    primaryKey: "id",
    properties: {
      id: "int",
      name: "string",
      name_kin: "string?",
      json2: "string",
      post_data: "string",
      table_name: "string?",
      single_page: "string?",
      status: "string?",
    },
  };
} 