import { ICohort, IFormSubmissionDetail, IFamilies, Izus } from "~/types";
import { IProvince } from "~/models/locations/province";
import { ISector } from "~/models/locations/sector";
import { IVillage } from "~/models/locations/village";
import { IDistrict } from "~/models/locations/district";
import { ICell } from "~/models/locations/cell";
export interface FormFlowManagerProps {
  form: any;
  fields: any[];
  formSubmissionMandatoryFields: IFormSubmissionDetail;
  isMonitoring?: boolean;
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
    izus?: Izus | null;
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

export interface ProcessedSubmission {
  _id: string;
  table_name?: string | null;
  sync_status: boolean;
  survey_id: number;
  source_module_id: number;
  submittedAt?: Date | null;
  family?: string | null;
  lastSyncAttempt?: Date | null;
  project_module_id: number;
}

export interface FormField {
  key: string;
  type: string;
  input: boolean;
  label: string;
  title: {
    en: string;
    kn: string;
    default: string;
  };
  tableView: boolean;
  fields?: {
    day?: {
      hide?: boolean;
      required?: boolean;
      placeholder?: string;
    };
    month?: {
      hide?: boolean;
      required?: boolean;
      placeholder?: string;
      type?: string;
    };
    year?: {
      hide?: boolean;
      required?: boolean;
      placeholder?: string;
    };
  };
  data?: {
    values: Array<{
      label: string;
      value: string;
    }>;
  };
  values?: Array<{
    kn?: string;
    label: string;
    value: string;
    title?: {
      en: string;
      kn: string;
      default: string;
    };
  }>;
  conditional?: {
    eq: string;
    show: boolean;
    when: string;
  };
  validate?: {
    required?: boolean;
    customMessage?: string;
    min?: number;
    max?: number;
    minLength?: number;
    maxLength?: number;
    minWords?: number;
    maxWords?: number;
  };
  validation?: {
    required?: boolean;
    customMessage?: string;
  };
  errorLabel?: string;
  validateWhenHidden?: boolean;
  dependsOn?: string;
  visibleIf?: string;
  minDate?: string;
  maxDate?: string;
  widget?: {
    type?: string;
    displayInTimezone?: string;
    locale?: string;
    useLocaleSettings?: boolean;
    allowInput?: boolean;
    mode?: string;
    enableTime?: boolean;
    noCalendar?: boolean;
    format?: string;
    hourIncrement?: number;
    minuteIncrement?: number;
    time_24hr?: boolean;
    minDate?: string;
    maxDate?: string;
    disableWeekends?: boolean;
    disableWeekdays?: boolean;
  };
}
