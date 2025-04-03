import { Realm } from "@realm/react";

export interface IIzu {
  id: number;
  name: string;
  user_code: string;
  villages_id: number;
}

export class Izu extends Realm.Object {
  id!: number;
  name!: string;
  user_code!: string;
  villages_id!: number;

  static schema = {
    name: "Izu",
    primaryKey: "id",
    properties: {
      id: "int",
      name: "string",
      user_code: "string",
      villages_id: "int",
    },
  };
} 