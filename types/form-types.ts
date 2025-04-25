import { FormField, ICohort, IFormSubmissionDetail, IFamilies } from "~/types";
import { IProvince } from "~/models/locations/province";
import { ISector } from "~/models/locations/sector";
import { IVillage } from "~/models/locations/village";
import { IDistrict } from "~/models/locations/district";
import { ICell } from "~/models/locations/cell";
import { IIzu } from "~/models/izus/izu";
export interface FormFlowManagerProps {
  form: any;
  fields: any[];
  formSubmissionMandatoryFields: IFormSubmissionDetail;
}

export type FlowStepKey =
  | "cohorts"
  | "izus"
  | "families"
  | "locations"
  | "stakeholders"
  | "onPhone";

export interface FlowState {
  [key: string]: any;
  currentStep: number;
  selectedValues: {
    izus?: IIzu | null;
    cohorts?: ICohort | null;
    families?: IFamilies | null;
    locations?: {
      province?: IProvince | null;
      district?: IDistrict | null;
      sector?: ISector | null;
      cell?: ICell | null;
      village?: IVillage | null;
    };
    stakeholders?: any[] | null;
  };
}
export interface DynamicFieldProps {
  field: FormField;
  control: any;
  language?: string;
  type?: string;
}
export interface DynamicFormProps {
  fields: FormField[];
  wholeComponent?: boolean;
  language?: string;
  flowState: FlowState;
  formSubmissionMandatoryFields: IFormSubmissionDetail;
  timeSpent: number;
  onEditFlowState: (step: string) => void;
}
