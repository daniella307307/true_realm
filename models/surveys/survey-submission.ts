import { Realm } from "@realm/react";

export class SurveySubmission extends Realm.Object {
  id!: number;
  answers!: { [key: string]: string | number | boolean | null };
  form_data!: { [key: string]: string | number | boolean | null };
  location!: { [key: string]: string | number | boolean | null };
  sync_data!: { [key: string]: string | number | boolean | null | Date };

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
