import { Realm } from '@realm/react';

export class Family2 extends Realm.Object {
  id!: number;
  hh_id!: string;
  izu_id!: string;
  enrollment_date?: Date;
  district?: string;
  sector?: string;
  cell?: string;
  village?: string;
  village_id?: number;
  hh_head_fullname?: string;
  hh_head_phone?: string;
  family_structure?: string;
  health_center?: string;
  chw_name?: string;
  chw_phone?: string;
  
  // Dynamic person and child attributes
  p1_availability?: string;
  p1_names?: string;
  p1_initials?: string;
  p1_national_id?: string;
  p1_date_of_birth?: string;
  p1_occupation?: string;
  p1_relationship?: string;

  // Similar attributes for p2, p3, p4, c1, c2, c3, c4

  non_eligible_members?: string;
  reachable_contacts?: string;
  has_fam_hist_issue?: string;
  has_fam_hist_issue_details?: string;
  cohort?: string;
  notes?: string;
  status!: number;
  created_at!: Date;
  updated_at!: Date;

  static schema = {
    name: 'Family2',
    primaryKey: 'id',
    properties: {
      id: 'int',
      hh_id: 'string',
      izu_id: 'string',
      enrollment_date: 'date?',
      district: 'string?',
      sector: 'string?',
      cell: 'string?',
      village: 'string?',
      village_id: 'int?',
      hh_head_fullname: 'string?',
      hh_head_phone: 'string?',
      family_structure: 'string?',
      health_center: 'string?',
      chw_name: 'string?',
      chw_phone: 'string?',
      
      // Dynamic person attributes
      p1_availability: 'string?',
      p1_names: 'string?',
      p1_initials: 'string?',
      p1_national_id: 'string?',
      p1_date_of_birth: 'string?',
      p1_occupation: 'string?',
      p1_relationship: 'string?',
      
      // Add similar optional attributes for p2, p3, p4, c1, c2, c3, c4
      
      non_eligible_members: 'string?',
      reachable_contacts: 'string?',
      has_fam_hist_issue: 'string?',
      has_fam_hist_issue_details: 'string?',
      cohort: 'string?',
      notes: 'string?',
      status: 'int',
      created_at: 'date',
      updated_at: 'date'
    }
  };
}