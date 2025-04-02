import { Realm } from "@realm/react";
export class Project extends Realm.Object {
  id!: number;
  name!: string;
  duration!: string | null;
  progress!: string | null;
  description!: string | null;
  status!: number;
  beneficiary?: string | null;
  projectlead?: string | null;
  has_modules!: number;
  kin_name?: string;
  kin_descriptions?: string;
  created_at?: string;
  updated_at?: string;
  project_modules!: Realm.List<string>; 

  static schema: Realm.ObjectSchema = {
    name: "Project",
    primaryKey: "id",
    properties: {
      id: "int",
      name: "string",
      duration: "string?",
      progress: "string?",
      description: "string?",
      status: "int",
      beneficiary: "string?",
      projectlead: "string?",
      has_modules: "int",
      kin_name: "string?",
      kin_descriptions: "string?",  
      created_at: "string?",
      updated_at: "string?",
      project_modules: {
        type: "list",
        objectType: "string",
        optional: false,
      },
    },
  };  
}
