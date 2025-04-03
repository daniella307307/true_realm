import { Realm } from "@realm/react";

export interface ICohort {
  id: number;
  cohort: string;
}

export class Cohort extends Realm.Object {
  id!: number;
  cohort!: string;

  static schema = {
    name: "Cohort",
    primaryKey: "id",
    properties: {
      id: "int",
      cohort: "string",
    },
  };
} 