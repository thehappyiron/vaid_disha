import type { PurposeOption, KnownLocation } from '../types';
import hospitalGraph from './hospitalGraph.json';
export { DEPARTMENTS } from './departments';

export interface SymptomRule {
  keywords: string[];
  departmentId: string;
  reason: string;
}

export const SYMPTOM_DEPARTMENT_RULES: SymptomRule[] = [
  {
    keywords: ['pregnancy', 'pregnant', 'women', 'gynaecology', 'antenatal'],
    departmentId: 'opd-women',
    reason: 'Women and pregnancy clinic',
  },
  {
    keywords: [
      'chest',
      'heart',
      'bp',
      'blood pressure',
      'palpitation',
      'breathless',
      'cardiac',
      'pulse',
      'angina',
    ],
    departmentId: 'opd-general-2',
    reason:
      'Symptoms relate to heart, blood pressure, or cardiovascular health',
  },
  {
    keywords: [
      'bone',
      'joint',
      'knee',
      'back',
      'spine',
      'fracture',
      'sprain',
      'walking',
      'ortho',
      'arthritis',
      'neck',
      'shoulder',
      'leg pain',
      'hip',
    ],
    departmentId: 'opd-ortho',
    reason: 'Symptoms relate to bones, joints, muscles, or movement difficulty',
  },
  {
    keywords: [
      'headache',
      'dizzy',
      'dizziness',
      'seizure',
      'nerve',
      'migraine',
      'stroke',
      'numb',
      'numbness',
      'tremor',
      'faint',
      'paralysis',
    ],
    departmentId: 'opd-general',
    reason:
      'Symptoms relate to nervous system, severe recurring headache, or balance',
  },
  {
    keywords: [
      'eye',
      'vision',
      'blur',
      'blind',
      'specs',
      'glasses',
      'cataract',
      'watering',
      'red eye',
      'sight',
    ],
    departmentId: 'opd-eye',
    reason: 'Symptoms relate to eyes, vision, or sight difficulties',
  },
  {
    keywords: [
      'ear',
      'nose',
      'throat',
      'hearing',
      'sinus',
      'tonsil',
      'earache',
      'hoarse',
      'voice',
      'nasal',
      'sneezing',
    ],
    departmentId: 'opd-ent',
    reason: 'Symptoms relate to ear, nose, throat, or hearing',
  },
  {
    keywords: [
      'skin',
      'rash',
      'itch',
      'itching',
      'allergy',
      'pimples',
      'eczema',
      'boil',
      'fungal',
      'scalp',
    ],
    departmentId: 'opd-derma',
    reason: 'Symptoms relate to skin, rash, allergy, or hair',
  },
  {
    keywords: [
      'child',
      'baby',
      'kid',
      'pediatric',
      'infant',
      'vaccination',
      'newborn',
    ],
    departmentId: 'opd-pediatrics',
    reason: 'Patient is a child or requires pediatric care',
  },
  {
    keywords: [
      'blood test',
      'lab',
      'urine',
      'sugar',
      'diabetes',
      'lipid',
      'thyroid',
      'cbc',
      'sample',
    ],
    departmentId: 'lab-blood',
    reason: 'Requires pathological laboratory tests or sample collection',
  },
  {
    keywords: [
      'x-ray',
      'xray',
      'mri',
      'ct scan',
      'ultrasound',
      'scan',
      'sonography',
    ],
    departmentId: 'lab-radiology',
    reason: 'Requires radiological imaging or diagnostic scans',
  },
  {
    keywords: [
      'medicine',
      'drugs',
      'tablet',
      'prescription',
      'pharmacy',
      'refill',
    ],
    departmentId: 'pharmacy',
    reason: 'Requires dispensary medicine collection or prescription refill',
  },
  {
    keywords: [
      'fever',
      'cough',
      'cold',
      'weakness',
      'vomit',
      'vomiting',
      'stomach',
      'diarrhea',
      'infection',
      'body ache',
      'flu',
    ],
    departmentId: 'opd-general',
    reason: 'General medical condition, fever, or viral illness',
  },
];

// ─── Purpose options for QR landing page ───────────────────────────────────
export const PURPOSE_OPTIONS: PurposeOption[] = [
  {
    id: 'new-opd',
    labelKey: 'purpose.new_opd',
    icon: 'stethoscope',
    departmentIds: ['opd-general'],
    keywords: ['opd', 'doctor', 'new patient', 'consult', 'checkup'],
  },
  {
    id: 'followup',
    labelKey: 'purpose.followup',
    icon: 'calendar-check',
    departmentIds: [
      'opd-general',
      'opd-general-2',
      'opd-ortho',
      'opd-pediatrics',
      'opd-women',
    ],
    keywords: ['follow up', 'follow-up', 'appointment', 'revisit'],
  },
  {
    id: 'blood-test',
    labelKey: 'purpose.blood_test',
    icon: 'flask-conical',
    departmentIds: ['lab-blood'],
    keywords: ['blood', 'lab', 'test', 'sample', 'cbc', 'report'],
  },
  {
    id: 'xray-scan',
    labelKey: 'purpose.xray_scan',
    icon: 'scan',
    departmentIds: ['lab-radiology'],
    keywords: [
      'xray',
      'x-ray',
      'mri',
      'ct scan',
      'ultrasound',
      'radiology',
      'scan',
    ],
  },
  {
    id: 'emergency',
    labelKey: 'purpose.emergency',
    icon: 'triangle-alert',
    departmentIds: ['emergency'],
    keywords: ['emergency', 'accident', 'urgent', 'casualty'],
  },
  {
    id: 'pharmacy',
    labelKey: 'purpose.pharmacy',
    icon: 'pill',
    departmentIds: ['pharmacy'],
    keywords: ['medicine', 'pharmacy', 'drugs', 'prescription', 'medicines'],
  },
  {
    id: 'admission',
    labelKey: 'purpose.admission',
    icon: 'bed',
    departmentIds: ['ward-4', 'ward-5', 'ward-6'],
    keywords: ['admission', 'admit', 'inpatient', 'ward', 'room'],
  },
  {
    id: 'discharge',
    labelKey: 'purpose.discharge',
    icon: 'door-open',
    departmentIds: ['billing'],
    keywords: ['discharge', 'checkout', 'going home', 'leave'],
  },
  {
    id: 'billing',
    labelKey: 'purpose.billing',
    icon: 'receipt',
    departmentIds: ['billing'],
    keywords: ['billing', 'payment', 'bill', 'invoice', 'insurance'],
  },
];

// ─── Known locations for wayfinding ─────────────────────────────────────────
export const KNOWN_LOCATIONS: KnownLocation[] = hospitalGraph.nodes
  .filter((node) => node.isLandmark)
  .map((node) => ({
    id: node.id,
    labelKey: node.nameKey,
    building: 'Main hospital',
    floor: node.floor,
  }));
