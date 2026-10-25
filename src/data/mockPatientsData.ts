import { DEPARTMENT_BY_ID } from './departments';
/**
 * Mock Patient Records for Hospital Staff Portal (/staff/patients)
 * Includes both Registered Patients (with ABHA ID, past visits, and lab reports)
 * and Guest Patients (with "No saved history (Guest)").
 */

import { MOCK_LAB_REPORTS, type LabReport } from './labReportsData';

export interface PatientVisitRecord {
  id: string;
  date: string;
  departmentName: string;
  doctorName: string;
  tokenNumber: string;
  diagnosisSummary: string;
  status: 'completed' | 'scheduled' | 'cancelled';
  prescriptionSummary?: string;
}

export interface StaffPatientRecord {
  id: string;
  name: string; // Plain name without redundant (Guest) suffix in data
  isGuest: boolean;
  token: string;
  age: number;
  gender: 'Male' | 'Female' | 'Other';
  phone: string;
  bloodGroup?: string;
  abhaId?: string;
  uhid?: string;
  currentDepartment: string;
  currentDoctor: string;
  currentEncounterPurpose: string;
  accessibilityNeeds: string[];
  registeredDate?: string;
  emergencyContact?: string;
  allergies?: string[];
  previousVisits: PatientVisitRecord[];
  labReports: LabReport[];
}

export const MOCK_STAFF_PATIENTS: StaffPatientRecord[] = [
  {
    id: 'pat-98765',
    name: 'Ramesh Sharma',
    isGuest: false,
    token: 'CARD-102',
    age: 68,
    gender: 'Male',
    phone: '+91 98765 43210',
    bloodGroup: 'B+',
    abhaId: '12-3456-7890-1234',
    uhid: 'UHID-2024-8841',
    currentDepartment: DEPARTMENT_BY_ID['opd-general-2'].name,
    currentDoctor: DEPARTMENT_BY_ID['opd-general-2'].doctorName!,
    currentEncounterPurpose: 'Chest Tightness & Palpitations follow-up',
    accessibilityNeeds: ['wheelchair', 'walking_difficulty'],
    registeredDate: '12 Jan 2024',
    emergencyContact: 'Sunita Sharma (Spouse) - +91 98765 43211',
    allergies: ['Penicillin', 'Sulfa drugs'],
    previousVisits: [
      {
        id: 'vis-101',
        date: '15 Oct 2026',
        departmentName: DEPARTMENT_BY_ID['opd-general-2'].name,
        doctorName: DEPARTMENT_BY_ID['opd-general-2'].doctorName!,
        tokenNumber: 'CARD-102',
        diagnosisSummary:
          'Routine hypertension & mild angina follow-up. Blood pressure stabilized at 130/85 mmHg. Prescription renewed with Amlodipine 5mg.',
        status: 'completed',
        prescriptionSummary:
          'Tab Amlodipine 5mg (1-0-0), Tab Atorvastatin 10mg (0-0-1)',
      },
      {
        id: 'vis-102',
        date: '02 Sep 2026',
        departmentName: DEPARTMENT_BY_ID['lab-blood'].name,
        doctorName: DEPARTMENT_BY_ID['lab-blood'].doctorName!,
        tokenNumber: 'LAB-44',
        diagnosisSummary:
          'Complete Blood Count (CBC) and Lipid Profile. Parameters within target bounds.',
        status: 'completed',
      },
      {
        id: 'vis-103',
        date: '20 Jul 2026',
        departmentName: DEPARTMENT_BY_ID['opd-general'].name,
        doctorName: DEPARTMENT_BY_ID['opd-general'].doctorName!,
        tokenNumber: 'OPD-88',
        diagnosisSummary:
          'Seasonal viral fever treatment and multivitamin supplementation.',
        status: 'completed',
        prescriptionSummary: 'Tab Paracetamol 650mg SOS, Vitamin C 500mg OD',
      },
    ],
    labReports: [
      MOCK_LAB_REPORTS[0], // CBC
      MOCK_LAB_REPORTS[1], // Fasting Sugar & HbA1c
      MOCK_LAB_REPORTS[2], // Lipid Profile
    ],
  },
  {
    id: 'pat-guest-101',
    name: 'Priya Joshi',
    isGuest: true,
    token: 'OPD-101',
    age: 29,
    gender: 'Female',
    phone: '+91 94220 89123',
    bloodGroup: 'O+',
    currentDepartment: DEPARTMENT_BY_ID['opd-general'].name,
    currentDoctor: DEPARTMENT_BY_ID['opd-general'].doctorName!,
    currentEncounterPurpose: 'Acute Fever, Throat Irritation & Bodyache',
    accessibilityNeeds: [],
    previousVisits: [],
    labReports: [],
  },
  {
    id: 'pat-77412',
    name: 'Sunita Mehra',
    isGuest: false,
    token: 'ORTHO-204',
    age: 72,
    gender: 'Female',
    phone: '+91 98211 44556',
    bloodGroup: 'O+',
    abhaId: '98-7654-3210-9876',
    uhid: 'UHID-2023-4109',
    currentDepartment: DEPARTMENT_BY_ID['opd-ortho'].name,
    currentDoctor: DEPARTMENT_BY_ID['opd-ortho'].doctorName!,
    currentEncounterPurpose: 'Bilateral Knee Osteoarthritis Pain',
    accessibilityNeeds: ['wheelchair', 'low_vision'],
    registeredDate: '04 Mar 2023',
    emergencyContact: 'Amit Mehra (Son) - +91 98211 44558',
    allergies: ['NSAIDs / Ibuprofen'],
    previousVisits: [
      {
        id: 'vis-201',
        date: '10 Aug 2026',
        departmentName: DEPARTMENT_BY_ID['opd-ortho'].name,
        doctorName: DEPARTMENT_BY_ID['opd-ortho'].doctorName!,
        tokenNumber: 'ORTHO-180',
        diagnosisSummary:
          'Knee X-ray evaluation showing Grade 3 joint space reduction. Physiotherapy advised.',
        status: 'completed',
      },
      {
        id: 'vis-202',
        date: '14 May 2026',
        departmentName: 'Physiotherapy Center',
        doctorName: DEPARTMENT_BY_ID['opd-ortho'].doctorName!,
        tokenNumber: 'PT-019',
        diagnosisSummary:
          'Quadriceps strengthening exercises and ultrasound therapy session.',
        status: 'completed',
      },
    ],
    labReports: [
      MOCK_LAB_REPORTS[1], // Fasting Sugar
      MOCK_LAB_REPORTS[4], // Urine Routine
    ],
  },
  {
    id: 'pat-guest-102',
    name: 'Suresh Patel',
    isGuest: true,
    token: 'LAB-044',
    age: 54,
    gender: 'Male',
    phone: '+91 97665 12098',
    currentDepartment: DEPARTMENT_BY_ID['lab-blood'].name,
    currentDoctor: DEPARTMENT_BY_ID['lab-blood'].doctorName!,
    currentEncounterPurpose: 'Fasting Glucose & Routine Lipid Blood Draw',
    accessibilityNeeds: ['wheelchair'],
    previousVisits: [],
    labReports: [],
  },
  {
    id: 'pat-55231',
    name: 'Vikram Desai',
    isGuest: false,
    token: 'OPD-115',
    age: 45,
    gender: 'Male',
    phone: '+91 99300 88219',
    bloodGroup: 'A+',
    abhaId: '45-6789-0123-4567',
    uhid: 'UHID-2025-1092',
    currentDepartment: DEPARTMENT_BY_ID['opd-general'].name,
    currentDoctor: DEPARTMENT_BY_ID['opd-general'].doctorName!,
    currentEncounterPurpose: 'Routine health review',
    accessibilityNeeds: [],
    registeredDate: '18 Nov 2025',
    allergies: [],
    previousVisits: [
      {
        id: 'vis-301',
        date: '28 Feb 2026',
        departmentName: DEPARTMENT_BY_ID['opd-general'].name,
        doctorName: DEPARTMENT_BY_ID['opd-general'].doctorName!,
        tokenNumber: 'OPD-108',
        diagnosisSummary: 'Routine health review and follow-up advice.',
        status: 'completed',
      },
    ],
    labReports: [
      MOCK_LAB_REPORTS[0], // CBC
    ],
  },
  {
    id: 'pat-66890',
    name: 'Amina Sheikh',
    isGuest: false,
    token: 'CARD-103',
    age: 63,
    gender: 'Female',
    phone: '+91 98670 33412',
    bloodGroup: 'AB+',
    abhaId: '33-4455-6677-8899',
    uhid: 'UHID-2024-9182',
    currentDepartment: DEPARTMENT_BY_ID['opd-general-2'].name,
    currentDoctor: DEPARTMENT_BY_ID['opd-general-2'].doctorName!,
    currentEncounterPurpose: 'Post-CABG Routine Checkup & Medication Review',
    accessibilityNeeds: ['hearing_aid'],
    registeredDate: '09 Oct 2024',
    emergencyContact: 'Farhan Sheikh (Husband) - +91 98670 33414',
    allergies: [],
    previousVisits: [
      {
        id: 'vis-401',
        date: '12 Aug 2026',
        departmentName: DEPARTMENT_BY_ID['opd-general-2'].name,
        doctorName: DEPARTMENT_BY_ID['opd-general-2'].doctorName!,
        tokenNumber: 'CARD-091',
        diagnosisSummary: 'Stable cardiac recovery. Normal 12-lead ECG rhythm.',
        status: 'completed',
      },
      {
        id: 'vis-402',
        date: '10 Jun 2026',
        departmentName: 'Clinical Biochemistry Lab',
        doctorName: DEPARTMENT_BY_ID['lab-blood'].doctorName!,
        tokenNumber: 'LAB-102',
        diagnosisSummary:
          'Electrolytes and Serum Creatinine within normal range.',
        status: 'completed',
      },
    ],
    labReports: [
      MOCK_LAB_REPORTS[2], // Lipid Profile
      MOCK_LAB_REPORTS[3], // Thyroid Profile
    ],
  },
  {
    id: 'pat-guest-103',
    name: 'Deepak Verma',
    isGuest: true,
    token: 'OPD-105',
    age: 38,
    gender: 'Male',
    phone: '+91 91234 56789',
    currentDepartment: DEPARTMENT_BY_ID['opd-general'].name,
    currentDoctor: DEPARTMENT_BY_ID['opd-general'].doctorName!,
    currentEncounterPurpose: 'Sprained Ankle & Minor Contusion',
    accessibilityNeeds: ['crutches'],
    previousVisits: [],
    labReports: [],
  },
];
