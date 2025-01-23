import { Realm } from '@realm/react';

export class Province extends Realm.Object {
  id!: number;
  province_code!: string;
  province_name!: string;
  province_name_english?: string;
  created_at?: Date;
  updated_at?: Date;

  static schema = {
    name: 'Province',
    primaryKey: 'id',
    properties: {
      id: 'int',
      province_code: 'string',
      province_name: 'string',
      province_name_english: 'string?',
      created_at: 'date?',
      updated_at: 'date?'
    }
  };
}