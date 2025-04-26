import { Realm } from "@realm/react";

export class SurveySubmission extends Realm.Object {
  _id!: Realm.BSON.ObjectId;
  answers!: { [key: string]: string | number | boolean | null };
  form_data!: { [key: string]: string | number | boolean | null };
  location!: { [key: string]: string | number | boolean | null };
  sync_data!: { [key: string]: string | number | boolean | null };

  static schema = {
    name: 'SurveySubmission',
    primaryKey: '_id',
    properties: {
      _id: 'objectId',
      answers: 'mixed{}',

      form_data: 'mixed{}',
      location: 'mixed{}',
      sync_data: 'mixed{}',
    },
  };
}
