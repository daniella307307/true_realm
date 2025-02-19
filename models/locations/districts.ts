import { Realm } from '@realm/react';

export class District extends Realm.Object {
  id!: number;
  district_code!: string;
  district_name!: string;
  province_id!: number;
  created_at?: Date;
  updated_at?: Date;

  static schema = {
    name: 'District',
    primaryKey: 'id',
    properties: {
      id: 'int',
      district_code: 'string',
      district_name: 'string',
      province_id: 'int',
      created_at: 'date?',
      updated_at: 'date?'
    }
  };
}