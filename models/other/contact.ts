import { Realm } from '@realm/react';

export class Contact extends Realm.Object {
  id!: number;
  first_name!: string;
  last_name!: string;
  email!: string;
  role!: number;
  job_title!: string;
  city!: string;
  country!: string;
  created_at?: Date;
  updated_at?: Date;

  static schema = {
    name: 'Contact',
    primaryKey: 'id',
    properties: {
      id: 'int',
      first_name: 'string',
      last_name: 'string',
      email: 'string',
      role: 'int',
      job_title: 'string',
      city: 'string',
      country: 'string',
      created_at: 'date?',
      updated_at: 'date?'
    }
  };
}