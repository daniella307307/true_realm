import { Realm } from '@realm/react';

export class Survey extends Realm.Object {
  id!: number;
  parent_id?: number;
  name!: string;
  name_kin?: string;
  slug?: string | null;
  json?: string | null;
  json2!: string;
  json2_bkp?: string | null;
  survey_status!: number;
  module_id?: number | null;
  is_primary!: number;
  table_name?: string;
  post_data?: string;
  fetch_data?: string | null;
  loads?: string | null;
  prev_id?: string | null;
  created_at!: string;
  updated_at!: string;
  order_list!: number;
  project_module_id!: number;

  static schema = {
    name: 'Survey',
    primaryKey: 'id',
    properties: {
      id: 'int',
      parent_id: 'int?',
      name: 'string',
      name_kin: 'string?',
      slug: 'string?',
      json: 'string?',
      json2: 'string',
      json2_bkp: 'string?',
      survey_status: 'int',
      module_id: 'int?',
      is_primary: 'int',
      table_name: 'string?',
      post_data: 'string?',
      fetch_data: 'string?',
      loads: 'string?',
      prev_id: 'string?',
      created_at: 'string',
      updated_at: 'string',
      order_list: 'int',
      project_module_id: 'int',
    },
  };
}
