import { Realm } from '@realm/react';

export class Survey extends Realm.Object {
  id!: string | number;
  name!: string;
  slug!: string;
  json!: string;
  survey_status!: number;
  module_id!: number;
  created_at?: Date;
  updated_at?: Date;

  static schema = {
    name: 'Survey',
    primaryKey: 'id',
    properties: {
      id: 'string',
      name: 'string',
      slug: 'string',
      json: 'string',
      survey_status: 'int',
      module_id: 'int',
      created_at: 'date?',
      updated_at: 'date?'
    }
  };
}