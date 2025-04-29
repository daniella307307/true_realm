import { Realm } from "@realm/react";

export class Izu extends Realm.Object {
  id!: number;
  name!: string;
  user_code!: string;
  villages_id!: number;
  score!: number;
  position!: number | null;

  meta!: { [key: string]: string | number | boolean | null; };
  form_data!: { [key: string]: string | number | boolean | null };
  location!: { [key: string]: string | number | boolean | null };
  sync_data!: { [key: string]: string | number | boolean | null };


  static schema = {
    name: "Izu",
    primaryKey: "id",
    properties: {
      id: "int",
      name: "string?",
      user_code: "string?",
      villages_id: "int?",
      score: "int?",
      position: "int?",
      meta: 'mixed{}',
      form_data: 'mixed{}',
      location: 'mixed{}',
      sync_data: 'mixed{}',
    },
  };
} 