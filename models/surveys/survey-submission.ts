import { Realm } from "@realm/react";

export class SurveySubmission extends Realm.Object {
  id!: number;
  answers!: { [key: string]: string | number | boolean | null };
  form_data!: { [key: string]: string | number | boolean | null };
  location!: { [key: string]: string | number | boolean | null };
  sync_data!: { [key: string]: string | number | boolean | null | Date };

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
    name: 'SurveySubmission',
    primaryKey: 'id',
    properties: {
      id: 'int',
      answers: 'mixed{}',
      form_data: 'mixed{}',
      location: 'mixed{}',
      sync_data: 'mixed{}',
    },
  };
}
