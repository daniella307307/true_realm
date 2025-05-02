import { createRealmContext, RealmProvider } from "@realm/react";
import { Families } from "~/models/family/families";
import * as FileSystem from "expo-file-system";
import { Module } from "~/models/modules/module";
import { Project } from "~/models/projects/project";
import { Survey } from "~/models/surveys/survey";
import { SurveySubmission } from "~/models/surveys/survey-submission";
import { Izu } from "~/models/izus/izu";
import { Cohort } from "~/models/cohorts/cohort";
import { Province } from "~/models/locations/province";
import { District } from "~/models/locations/district";
import { Sector } from "~/models/locations/sector";
import { Cell } from "~/models/locations/cell";
import { Village } from "~/models/locations/village";
import { Stakeholder } from "~/models/stakeholders/stakeholder";
import { Post } from "~/models/posts/post";
import { Statistics } from "~/models/statistics/statistics";

const realmPath = `${FileSystem.documentDirectory}sugiramuryango-offline-db.realm`;

const schemas = [
  Families,
  Module,
  Project,
  Survey,
  SurveySubmission,
  Izu,
  Cohort,
  Province,
  District,
  Sector,
  Cell,
  Village,
  Stakeholder,
  Post,
  Statistics
];
export const RealmContext = createRealmContext({
  schema: schemas,
  path: realmPath,
});

// console.log("Realm Path", realmPath);