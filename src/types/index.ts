// ─── Core domain types ─────────────────────────────────────────────────────

export type DepartmentCategory =
  | 'consultation'
  | 'diagnostics'
  | 'emergency'
  | 'pharmacy'
  | 'admission'
  | 'discharge'
  | 'support';

export interface Department {
  id: string;
  name: string;
  nodeId: string;
  nameKey: string; // i18n key
  descriptionKey: string; // i18n key
  category: DepartmentCategory;
  building: string;
  floor: number;
  roomNumbers: string[];
  landmark: string; // plain-language landmark
  estimatedWalkMinutes: number;
  doctorName?: string; // Assigned specialist
  wing?: string; // Wing descriptor (e.g. "West Wing", "Main OPD Wing")
  opdHours: string;
  averageConsultationMinutes: number;
  tokenPrefix: string;
}

export type AccessibilityNeedId =
  | 'wheelchair'
  | 'walking_difficulty'
  | 'vision_impairment'
  | 'hearing_impairment'
  | 'elderly_assistance'
  | 'none';

export type VisitPurposeId =
  | 'consultation'
  | 'lab_test'
  | 'pharmacy'
  | 'follow_up'
  | 'admission_visitor'
  | 'other';

export interface PatientVisitData {
  patientName: string;
  patientAge?: number | '';
  patientGender?: 'male' | 'female' | 'other' | '';
  accessibilityNeeds: AccessibilityNeedId[];
  purposeId: VisitPurposeId;
  departmentId?: string;
  doctorName?: string;
  symptoms?: string;
  email?: string;
}

export interface PurposeOption {
  id: string;
  labelKey: string; // i18n key
  icon: string; // lucide icon name
  departmentIds: string[]; // which departments to suggest
  keywords: string[]; // for search matching
}

export interface NavigationStep {
  stepNumber: number;
  instructionKey: string; // i18n key
  instructionParams?: Record<string, string | number>;
  landmark?: string;
  directionIcon:
    | 'arrow-up'
    | 'arrow-right'
    | 'arrow-left'
    | 'corner-right-up'
    | 'map-pin'
    | 'elevator'
    | 'stairs';
}

export type SlipStatus = 'waiting' | 'turn_soon' | 'in_progress' | 'completed';

export interface Slip {
  id: string;
  generatedAt: string; // ISO timestamp
  patientPurposeKey: string;
  department: Department;
  token: string; // e.g. "OPD-1042"
  estimatedWait: number; // minutes
  peopleAhead?: number; // Patients ahead in queue
  status?: SlipStatus; // Live queue status
  steps: NavigationStep[];
  additionalNoteKey?: string;
  doctorName?: string;
  roomNumber?: string;
  floor?: number;
  wing?: string;
  humanReadableDirection?: string;
  patientName?: string;
  patientAge?: number;
  patientGender?: string;
  accessibilityNeeds?: AccessibilityNeedId[];
  isGuest?: boolean;
  userId?: string;
  patientEmail?: string;
}

export interface WayfindingResult {
  fromLocation: string;
  department: Department;
  steps: NavigationStep[];
  totalEstimatedMinutes: number;
}

export interface KnownLocation {
  id: string;
  labelKey: string;
  building: string;
  floor: number;
}

// ─── Authentication & User Profiles ─────────────────────────────────────────

export type UserRole = 'registered' | 'guest' | 'staff';

export interface VisitRecord {
  id: string;
  date: string;
  departmentName: string;
  doctorName: string;
  tokenNumber: string;
  diagnosisSummary: string;
  status: 'completed' | 'in_progress' | 'cancelled';
}

export interface MedicalReport {
  id: string;
  title: string;
  date: string;
  department: string;
  fileSize: string;
}

export interface UserProfile {
  id: string;
  name: string;
  phone?: string;
  email?: string;
  emailVerified?: boolean;
  role: UserRole;
  isGuest: boolean;
  age?: number;
  gender?: string;
  bloodGroup?: string;
  abhaId?: string;
  staffId?: string;
  designation?: string;
  department?: string;
  visits?: VisitRecord[];
  reports?: MedicalReport[];
}
