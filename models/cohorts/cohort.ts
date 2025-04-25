import { Realm } from "@realm/react";

export class Cohort extends Realm.Object {
  _id!: Realm.BSON.ObjectId;
  cohort!: string;

  static schema = {
    name: "Cohort",
    primaryKey: '_id',
    properties: {
      _id: 'objectId',
      cohort: "string",
    },
  };
} 