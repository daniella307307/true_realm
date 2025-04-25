import { Realm } from "@realm/react";

export class Families extends Realm.Object {
  id!: number;
  hh_id!: string;
  hh_head_fullname!: string | null;
  village_name!: string | null;
  cohort!: string | null;
  created_at?: string;
  updated_at?: string;
  location?: string | null;
  meta!: { [key: string]: string | number | boolean | null };

  constructor(realm: Realm, {
    id,
    hh_id,
    hh_head_fullname,
    village_name,
    cohort,
    created_at,
    updated_at,
    location,
    meta = {} // Default to empty object if not provided
  }: {
    id: number;
    hh_id: string;
    hh_head_fullname: string | null;
    village_name: string | null;
    cohort: string | null;
    created_at?: string;
    updated_at?: string;
    location?: string | null;
    meta?: { [key: string]: string | number | boolean | null };
  }) {
    super(realm, {
      id,
      hh_id,
      hh_head_fullname,
      village_name,
      cohort,
      created_at,
      updated_at,
      location,
      meta: meta || {} // Ensure meta is never undefined or null
    });
  }

  static schema = {
    name: "Families",
    primaryKey: "id",
    properties: {
      id: "int",
      hh_id: "string",
      hh_head_fullname: "string?",
      village_name: "string?",
      cohort: "string?",
      created_at: "string?",
      updated_at: "string?",
      location: "string?",
      meta: "mixed{}",
    },
  };
}
