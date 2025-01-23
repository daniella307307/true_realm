import { Realm } from '@realm/react';

export class Village extends Realm.Object {
  id!: number;
  village_code!: string;
  village_name!: string;
  cells_id!: number;
  created_at?: Date;
  updated_at?: Date;

  static schema = {
    name: 'Village',
    primaryKey: 'id',
    properties: {
      id: 'int',
      village_code: 'string',
      village_name: 'string',
      cells_id: 'int',
      created_at: 'date?',
      updated_at: 'date?'
    }
  };
}