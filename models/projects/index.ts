import { Realm } from '@realm/react';

export class ModuleSurvey extends Realm.Object {
  id!: number;
  survey_id!: string;
  modules_id!: number;
  created_at?: Date;
  updated_at?: Date;

  static schema = {
    name: 'ModuleSurvey',
    primaryKey: 'id',
    properties: {
      id: 'int',
      survey_id: 'string',
      modules_id: 'int',
      created_at: 'date?',
      updated_at: 'date?'
    }
  };
}