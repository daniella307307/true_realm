import { Realm } from "@realm/react";

export class MonitoringResponses extends Realm.Object {
  id!: number;
  family_id!: string;
  module_id!: string;
  form_id!: string;
  project_id!: number;
  date_recorded!: string;
  type!: string;
  cohort!: string;
  user_id!: number;
  score_data!: { [key: string]: number | string | null };
  json!: string;
  sync_data!: { [key: string]: string | number | boolean | null };

  static schema = {
    name: "MonitoringResponses",
    primaryKey: "id",
    properties: {
      id: "int",
      family_id: "string",
      module_id: "string",
      form_id: "string",
      project_id: "int",
      date_recorded: "string",
      type: "string",
      cohort: "string",
      user_id: "int?",
      score_data: 'mixed{}',
      json: "string",
      sync_data: 'mixed{}',
    },
  };
}
