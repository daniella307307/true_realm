import { Realm } from '@realm/react';

export class Sector extends Realm.Object {
  id!: number;
  sector_code!: string;
  sector_name!: string;
  district_id!: number;
  created_at?: Date;
  updated_at?: Date;

  static schema = {
    name: 'Sector',
    primaryKey: 'id',
    properties: {
      id: 'int',
      sector_code: 'string',
      sector_name: 'string',
      district_id: 'int',
      created_at: 'date?',
      updated_at: 'date?'
    }
  };
}