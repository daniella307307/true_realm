import { Realm } from "@realm/react";
import { ProjectData } from "../projects/embed";
import { string } from "zod";

export class Module extends Realm.Object<Module> {
  id!: number;
  project_id!: number;
  module_name!: string;
  module_description!: string;
  expected_duration?: string;
  module_status!: number;
  source_module_id!: number;
  kin?: string;
  kin_title?: string;
  kin_descriptions?: string;
  order_list!: number;
  created_at?: Date;
  updated_at?: Date;
  project?: string;

  static schema: Realm.ObjectSchema = {
    name: "Module",
    primaryKey: "id",
    properties: {
      id: "int",
      project_id: "int",
      module_name: "string",
      module_description: "string",
      expected_duration: "string?",
      module_status: "int",
      source_module_id: "int",
      kin: "string?",
      kin_title: "string?",
      kin_descriptions: "string?",
      order_list: "int",
      created_at: "date?",
      updated_at: "date?",
      project: "string?",
    },
  };
}
