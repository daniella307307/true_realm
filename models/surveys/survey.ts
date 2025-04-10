import { Realm } from '@realm/react';

export class Survey extends Realm.Object {
  _id!: Realm.BSON.ObjectId;
  id!: number;
  parent_id?: number;
  name!: string;
  name_kin?: string;
  slug?: string | null;
  json2: string | any;
  json2_bkp?: string | null;
  survey_status!: number;
  module_id?: number | null;
  is_primary!: number;
  table_name?: string;
  post_data?: string;
  fetch_data?: string | null;
  loads?: string | null;
  prev_id?: string | null;
  created_at?: string;
  updated_at?: string;
  order_list!: number;
  project_module_id!: number;
  project_id?: number;
  source_module_id?: number;

  static schema = {
    name: 'Survey',
    primaryKey: '_id',
    properties: {
      _id: 'objectId',
      id: 'int',
      parent_id: 'int?',
      name: 'string',
      name_kin: 'string?',
      slug: 'string?',
      json2: 'mixed',
      json2_bkp: 'string?',
      survey_status: 'int',
      module_id: 'int?',
      is_primary: 'int',
      table_name: 'string?',
      post_data: 'string?',
      fetch_data: 'string?',
      loads: 'string?',
      prev_id: 'string?',
      created_at: 'string?',
      updated_at: 'string?',
      order_list: 'int',
      project_module_id: 'int',
      project_id: 'int?',
      source_module_id: 'int?',
    },
  };
}
