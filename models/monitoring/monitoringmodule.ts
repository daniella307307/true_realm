import { Realm } from "@realm/react";

export class MonitoringModules extends Realm.Object {
  id!: number;
  monitoring_id!: number;

  form_data!: { [key: string]: string | number | boolean | null };
  createdAt!: Date;
  updatedAt!: Date;

  static schema = {
    name: "MonitoringModules",
    primaryKey: "id",
    properties: {
      id: "int",
      monitoring_id: "int",
      form_data: 'mixed{}',
      createdAt: 'date',
      updatedAt: 'date',
    },
  };
} 