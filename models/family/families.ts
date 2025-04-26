import { Realm } from "@realm/react";

export class Families extends Realm.Object {
  id!: number;
  hh_id!: string | null;
  hh_head_fullname!: string | null;
  village_name!: string | null;
  village_id!: number | null;

  meta!: { [key: string]: string | number | boolean | null; };
  form_data!: { [key: string]: string | number | boolean | null };
  location!: { [key: string]: string | number | boolean | null };
  sync_data!: { [key: string]: string | number | boolean | null };

  static schema = {
    name: "Families",
    primaryKey: "id",
    properties: {
      id: "int",
      hh_id: "string?",
      hh_head_fullname: "string?",
      village_name: "string?",
      village_id: "int?",

      meta: 'mixed{}',
      form_data: 'mixed{}',
      location: 'mixed{}',
      sync_data: 'mixed{}',
    },
  };
}
