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

    // Helper method to get the user ID consistently
    getUserId(): number | null {
      if (this.user_id !== undefined) {
        return typeof this.user_id === 'string'
          ? parseInt(this.user_id, 10)
          : this.user_id;
      }
      return null;
    }

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
