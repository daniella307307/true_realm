import { Realm } from '@realm/react';

export class Report extends Realm.Object {
  id!: number;
  title!: string;
  description!: string;
  reportquery!: string;
  modules!: string;
  selected_surveys!: string;
  selected_questions!: string;
  selected_projects!: string;
  villages_id?: string;
  cells_id?: string;
  sector_id?: string;
  district_id?: string;
  province_id!: string;
  fields?: string;
  conditions!: string;
  surveys!: string;
  access_type!: string;
  access_target!: string;
  createdbyuser_id?: number;
  created_at!: Date;
  updated_at!: Date;

  static schema = {
    name: 'Report',
    primaryKey: 'id',
    properties: {
      id: 'int',
      title: 'string',
      description: 'string',
      reportquery: 'string',
      modules: 'string',
      selected_surveys: 'string',
      selected_questions: 'string',
      selected_projects: 'string',
      villages_id: 'string?',
      cells_id: 'string?',
      sector_id: 'string?',
      district_id: 'string?',
      province_id: 'string',
      fields: 'string?',
      conditions: 'string',
      surveys: 'string',
      access_type: 'string',
      access_target: 'string',
      createdbyuser_id: 'int?',
      created_at: 'date',
      updated_at: 'date'
    }
  };
}