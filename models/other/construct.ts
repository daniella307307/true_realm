import { Realm } from '@realm/react';

export class Construct extends Realm.Object {
  id!: number;
  name!: string;
  description!: string;
  status!: number;
  project_id!: number;
  created_at?: Date;
  updated_at?: Date;

  static schema = {
    name: 'Construct',
    primaryKey: 'id',
    properties: {
      id: 'int',
      name: 'string',
      description: 'string',
      status: 'int',
      project_id: 'int',
      created_at: 'date?',
      updated_at: 'date?'
    }
  };
}
