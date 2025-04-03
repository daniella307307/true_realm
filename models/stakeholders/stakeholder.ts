import { Realm } from "@realm/react";

export interface IStakeholder {
  id: number;
  name: string;
  guard_name: string;
  is_stakeholder: number;
  json: string | null;
  created_at: string;
  updated_at?: string;
}

export class Stakeholder extends Realm.Object {
  id!: number;
  name!: string;
  guard_name!: string;
  is_stakeholder!: number;
  json!: string | null;
  created_at!: string;
  updated_at?: string;

  static schema = {
    name: 'Stakeholder',
    primaryKey: 'id',
    properties: {
      id: 'int',
      name: 'string',
      guard_name: 'string',
      is_stakeholder: 'int',
      json: 'string?',
      created_at: 'string',
      updated_at: 'string?',
    }
  };
} 