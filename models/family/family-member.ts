import { Realm } from '@realm/react';


export class FamilyMember extends Realm.Object {
  id!: number;
  families_id!: number;
  member_names!: string;
  gender!: string;
  DOB!: string;
  profession!: string;
  telephone?: string;
  status!: number;
  whothepersonis!: string;
  created_at?: Date;
  updated_at?: Date;

  static schema = {
    name: 'FamilyMember',
    primaryKey: 'id',
    properties: {
      id: 'int',
      families_id: 'int',
      member_names: 'string',
      gender: 'string',
      DOB: 'string',
      profession: 'string',
      telephone: 'string?',
      status: 'int',
      whothepersonis: 'string',
      created_at: 'date?',
      updated_at: 'date?'
    }
  };
}