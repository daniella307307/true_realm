import { Realm } from "@realm/react";

export class Families extends Realm.Object {
  id!: number;
  hh_id!: string | null;
  hh_head_fullname!: string | null;
  village_name!: string | null;
  village_id!: number | null;
  izucode!: string | null;
  meta!: { [key: string]: string | number | boolean | null; };
  form_data!: { [key: string]: string | number | boolean | null };
  location!: { [key: string]: string | number | boolean | null };
  sync_data!: { [key: string]: string | number | boolean | null };

  // Helper method to get the user ID consistently
  getUserId(): number | null {
    if (this.form_data && this.form_data.user_id !== undefined) {
      return typeof this.form_data.user_id === 'string' 
        ? parseInt(this.form_data.user_id, 10) 
        : this.form_data.user_id as number;
    }
    return null;
  }

  static schema = {
    name: "Families",
    primaryKey: "id",
    properties: {
      id: "int",
      hh_id: "string?",
      hh_head_fullname: "string?",
      village_name: "string?",
      village_id: "int?",
      izucode: "string?",
      meta: 'mixed{}',
      form_data: 'mixed{}',
      location: 'mixed{}',
      sync_data: 'mixed{}',
    },
  };
}
