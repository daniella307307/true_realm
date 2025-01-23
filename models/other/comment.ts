import { Realm } from '@realm/react';


export class Comment extends Realm.Object {
  id!: number;
  module_id!: string;
  family_id!: string;
  form_id!: string;
  question_id!: string;
  comment!: string;
  created_at?: Date;
  updated_at?: Date;

  static schema = {
    name: 'Comment',
    primaryKey: 'id',
    properties: {
      id: 'int',
      module_id: 'string',
      family_id: 'string',
      form_id: 'string',
      question_id: 'string',
      comment: 'string',
      created_at: 'date?',
      updated_at: 'date?'
    }
  };
}
