import { Realm } from '@realm/react';

export class Cell extends Realm.Object {
  id!: number;
  cell_code!: string;
  cell_name!: string;
  sector_id!: number;
  created_at?: Date;
  updated_at?: Date;

  static schema = {
    name: 'Cell',
    primaryKey: 'id',
    properties: {
      id: 'int',
      cell_code: 'string',
      cell_name: 'string',
      sector_id: 'int',
      created_at: 'date?',
      updated_at: 'date?'
    }
  };
}