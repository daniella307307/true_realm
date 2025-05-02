import { Realm } from "@realm/react";

export class Izu extends Realm.Object {
  id!: number;
  name!: string;
  izucode!: string;
  villages_id!: number;
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
      izucode: "string?",
      villages_id: "int?",
      position: "int?",
      meta: 'mixed{}',
      form_data: 'mixed{}',
      location: 'mixed{}',
      sync_data: 'mixed{}',
    },
  };
} 