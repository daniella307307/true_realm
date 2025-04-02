export class SurveySubmission extends Realm.Object {
  _id!: Realm.BSON.ObjectId;
  submittedAt!: Date;
  timeSpentFormatted!: string;
  answers!: { [key: string]: string | number | boolean | null };
  userId?: number;
  metadata?: { [key: string]: string | number | null };
  table_name!: string;
  project_module_id!: number;
  source_module_id!: number;
  project_id!: number;
  survey_id!: number;
  post_data!: string;
  province!: number;
  district!: number;
  sector!: number;
  cell!: number;
  village!: number;
  izucode!: string;
  family!: number;

  static schema = {
    name: 'SurveySubmission',
    primaryKey: '_id',
    properties: {
      _id: 'objectId',
      submittedAt: 'date',
      timeSpentFormatted: 'string',
      answers: 'mixed{}', // Allows flexible answer types
      userId: 'int',
      metadata: 'mixed{}', // Allows mixed metadata types

      // New properties
      table_name: 'string',
      project_module_id: 'int',
      source_module_id: 'int',
      project_id: 'int',
      survey_id: 'int',
      post_data: 'string',
      province: 'int',
      district: 'int',
      sector: 'int',
      cell: 'int',
      village: 'int',
      izucode: 'string',
      family: 'int',
    }
  };
}
