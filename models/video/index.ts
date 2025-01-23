import { Realm } from '@realm/react';

export class VideoHelp extends Realm.Object {
  id!: number;
  name?: string;
  file_path?: string;
  description?: string;
  created_at?: Date;
  updated_at?: Date;

  static schema = {
    name: 'VideoHelp',
    primaryKey: 'id',
    properties: {
      id: 'int',
      name: 'string?',
      file_path: 'string?',
      description: 'string?',
      created_at: 'date?',
      updated_at: 'date?'
    }
  };
}