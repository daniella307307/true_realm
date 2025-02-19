import { Realm } from '@realm/react';

export class SurveyResult extends Realm.Object {
  id!: number;
  survey_id!: number;
  module_id!: string;
  form_id!: string;
  families_id?: string;
  user_id?: number;
  recorded_on?: Date;
  json!: string;
  cohort?: string;
  created_at?: Date;
  updated_at?: Date;

  static schema = {
    name: 'SurveyResult',
    primaryKey: 'id',
    properties: {
      id: 'int',
      survey_id: 'int',
      module_id: 'string',
      form_id: 'string',
      families_id: 'string?',
      user_id: 'int?',
      recorded_on: 'date?',
      json: 'string',
      cohort: 'string?',
      created_at: 'date?',
      updated_at: 'date?'
    }
  };
}