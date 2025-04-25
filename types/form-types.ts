import { FormField } from "~/types";

export interface DynamicFieldProps {
  field: FormField;
  control: any;
  language?: string;
  type?: string;
} 