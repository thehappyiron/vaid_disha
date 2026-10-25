import { DEPARTMENT_BY_ID } from './departments';
/**
 * Lab Reports Mock Data & Types
 */

export type ReportStatus = 'ready' | 'in_progress' | 'pending';

export interface ReportParameter {
  name: string;
  value: string;
  unit: string;
  normalRange: string;
  isNormal: boolean;
  flag: 'normal' | 'high' | 'low';
}

export interface LabReport {
  id: string;
  testName: string;
  category: string;
  date: string;
  status: ReportStatus;
  doctorName: string;
  department: string;
  sampleId: string;
  slipToken?: string;
  summary: string;
  parameters: ReportParameter[];
}

export const MOCK_LAB_REPORTS: LabReport[] = [
  {
    id: 'rep-cbc-2026',
    testName: 'Complete Blood Count (CBC)',
    category: 'Hematology',
    date: '24 Oct 2026, 11:30 AM',
    status: 'ready',
    doctorName: DEPARTMENT_BY_ID['opd-general'].doctorName!,
    department: DEPARTMENT_BY_ID['lab-blood'].name,
    sampleId: 'SMP-84920',
    slipToken: 'CARD-1042',
    summary:
      'Complete Blood Count summary: Hemoglobin is 14.2 grams per deciliter, which is within the normal range. White Blood Cell count is 7,400 cells per microliter, within normal range. Platelet count is 250,000, within normal range. Overall blood cell morphology is normal.',
    parameters: [
      {
        name: 'Hemoglobin (Hb)',
        value: '14.2',
        unit: 'g/dL',
        normalRange: '13.0 - 17.0',
        isNormal: true,
        flag: 'normal',
      },
      {
        name: 'Total Leukocyte Count (WBC)',
        value: '7,400',
        unit: '/μL',
        normalRange: '4,000 - 11,000',
        isNormal: true,
        flag: 'normal',
      },
      {
        name: 'Platelet Count',
        value: '250,000',
        unit: '/μL',
        normalRange: '150,000 - 450,000',
        isNormal: true,
        flag: 'normal',
      },
      {
        name: 'RBC Count',
        value: '4.8',
        unit: 'million/μL',
        normalRange: '4.5 - 5.9',
        isNormal: true,
        flag: 'normal',
      },
      {
        name: 'Packed Cell Volume (PCV)',
        value: '43.0',
        unit: '%',
        normalRange: '40.0 - 50.0',
        isNormal: true,
        flag: 'normal',
      },
    ],
  },
  {
    id: 'rep-sugar-2026',
    testName: 'Fasting Blood Sugar & HbA1c',
    category: 'Biochemistry',
    date: '24 Oct 2026, 09:15 AM',
    status: 'ready',
    doctorName: DEPARTMENT_BY_ID['opd-general'].doctorName!,
    department: DEPARTMENT_BY_ID['lab-blood'].name,
    sampleId: 'SMP-84918',
    slipToken: 'CARD-1042',
    summary:
      'Blood sugar test summary: Fasting blood glucose is 108 milligrams per deciliter, which is slightly above normal fasting limits. HbA1c average blood glucose is 5.8 percent, which is within pre-diabetic monitoring range. Dietary follow-up is recommended.',
    parameters: [
      {
        name: 'Fasting Blood Glucose',
        value: '108',
        unit: 'mg/dL',
        normalRange: '70 - 99',
        isNormal: false,
        flag: 'high',
      },
      {
        name: 'Glycated Hemoglobin (HbA1c)',
        value: '5.8',
        unit: '%',
        normalRange: '4.0 - 5.6',
        isNormal: false,
        flag: 'high',
      },
      {
        name: 'Estimated Average Glucose (eAG)',
        value: '120',
        unit: 'mg/dL',
        normalRange: '90 - 115',
        isNormal: false,
        flag: 'high',
      },
    ],
  },
  {
    id: 'rep-lipid-2026',
    testName: 'Lipid Profile Panel',
    category: 'Biochemistry',
    date: '18 Oct 2026, 10:00 AM',
    status: 'ready',
    doctorName: DEPARTMENT_BY_ID['opd-general-2'].doctorName!,
    department: DEPARTMENT_BY_ID['lab-blood'].name,
    sampleId: 'SMP-83011',
    summary:
      'Lipid profile summary: Total cholesterol is 185 milligrams per deciliter, within normal range. HDL good cholesterol is 48 milligrams per deciliter, within normal range. LDL bad cholesterol is 112 milligrams per deciliter, within normal range. Triglycerides are 130 milligrams per deciliter.',
    parameters: [
      {
        name: 'Total Cholesterol',
        value: '185',
        unit: 'mg/dL',
        normalRange: '< 200',
        isNormal: true,
        flag: 'normal',
      },
      {
        name: 'HDL Cholesterol (Good)',
        value: '48',
        unit: 'mg/dL',
        normalRange: '> 40',
        isNormal: true,
        flag: 'normal',
      },
      {
        name: 'LDL Cholesterol (Calculated)',
        value: '112',
        unit: 'mg/dL',
        normalRange: '< 130',
        isNormal: true,
        flag: 'normal',
      },
      {
        name: 'Serum Triglycerides',
        value: '130',
        unit: 'mg/dL',
        normalRange: '< 150',
        isNormal: true,
        flag: 'normal',
      },
    ],
  },
  {
    id: 'rep-tsh-2026',
    testName: 'Thyroid Function Profile (TSH, T3, T4)',
    category: 'Endocrinology',
    date: '24 Oct 2026, 11:45 AM',
    status: 'in_progress',
    doctorName: DEPARTMENT_BY_ID['opd-general'].doctorName!,
    department: DEPARTMENT_BY_ID['lab-blood'].name,
    sampleId: 'SMP-84955',
    slipToken: 'CARD-1042',
    summary:
      'Thyroid profile sample is currently being processed in the lab. Expected completion in 45 minutes.',
    parameters: [],
  },
  {
    id: 'rep-urine-2026',
    testName: 'Urine Routine & Microscopic Examination',
    category: 'Clinical Pathology',
    date: '24 Oct 2026, 12:00 PM',
    status: 'pending',
    doctorName: DEPARTMENT_BY_ID['opd-general'].doctorName!,
    department: DEPARTMENT_BY_ID['lab-blood'].name,
    sampleId: 'SMP-84992',
    slipToken: 'CARD-1042',
    summary:
      'Urine routine examination sample received. Analysis pending sample queue turn.',
    parameters: [],
  },
];
