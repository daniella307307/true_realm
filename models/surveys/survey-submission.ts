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
  sync_status!: boolean;
  syncStatus!: string;
  lastSyncAttempt!: Date;
  province!: number | null;
  district!: number | null;
  sector!: number | null;
  cell!: number | null;
  village!: number | null;
  izucode!: string | null;
  family!: number | null;
  cohort!: number | null;
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
      sync_status: 'bool',
      syncStatus: 'string',
      lastSyncAttempt: 'date',
      // New properties
      table_name: 'string',
      project_module_id: 'int',
      source_module_id: 'int',
      project_id: 'int',
      survey_id: 'int',
      post_data: 'string',
      province: 'int?',
      district: 'int?',
      sector: 'int?',
      cell: 'int?',
      cohort: 'int?',
      village: 'int?',
      izucode: 'string?',
      family: 'int?',
    }
  };
}
