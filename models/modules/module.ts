import { Realm } from '@realm/react';

export class Module extends Realm.Object {
  id!: number;
  module_name!: string;
  module_description!: string;
  expected_duration!: string;
  module_status!: number;
  project_id!: number;
  created_at?: Date;
  updated_at?: Date;

  static schema = {
    name: 'Module',
    primaryKey: 'id',
    properties: {
      id: 'int',
      module_name: 'string',
      module_description: 'string',
      expected_duration: 'string',
      module_status: 'int',
      project_id: 'int',
      created_at: 'date?',
      updated_at: 'date?'
    }
  };
}