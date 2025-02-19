import { Realm } from '@realm/react';

export class ModuleMonitoring extends Realm.Object {
  id!: number;
  monitoring_id!: number;
  modules_id!: number;
  createdAt!: Date;
  updatedAt!: Date;

  static schema = {
    name: 'ModuleMonitoring',
    primaryKey: 'id',
    properties: {
      id: 'int',
      monitoring_id: 'int',
      modules_id: 'int',
      createdAt: 'date',
      updatedAt: 'date'
    }
  };
}