import hospitalGraph from './hospitalGraph.json';
import type { Department } from '../types';

export const HOSPITAL_NAME = hospitalGraph.hospitalName;
export const SAMPLE_LAYOUT_VERSION = hospitalGraph.layoutVersion;

// Rooms, floors, names and landmarks come from the floor plan. These are
// fictional demo staff; every patient/staff view uses this same roster.
const roster: {
  id: string;
  nodeId?: string;
  category: Department['category'];
  doctorName: string;
  averageConsultationMinutes: number;
  tokenPrefix: string;
}[] = [
  {
    id: 'opd-general',
    category: 'consultation',
    doctorName: 'Dr. A. Verma',
    averageConsultationMinutes: 12,
    tokenPrefix: 'OPD',
  },
  {
    id: 'opd-general-2',
    category: 'consultation',
    doctorName: 'Dr. S. Sharma',
    averageConsultationMinutes: 10,
    tokenPrefix: 'OPD',
  },
  {
    id: 'opd-pediatrics',
    category: 'consultation',
    doctorName: 'Dr. S. Gupta',
    averageConsultationMinutes: 15,
    tokenPrefix: 'PED',
  },
  {
    id: 'opd-women',
    category: 'consultation',
    doctorName: 'Dr. M. Kulkarni',
    averageConsultationMinutes: 15,
    tokenPrefix: 'WOM',
  },
  {
    id: 'opd-ortho',
    category: 'consultation',
    doctorName: 'Dr. R. Patel',
    averageConsultationMinutes: 12,
    tokenPrefix: 'ORTH',
  },
  {
    id: 'opd-ent',
    category: 'consultation',
    doctorName: 'Dr. P. Joshi',
    averageConsultationMinutes: 10,
    tokenPrefix: 'ENT',
  },
  {
    id: 'opd-eye',
    category: 'consultation',
    doctorName: 'Dr. N. Mehta',
    averageConsultationMinutes: 10,
    tokenPrefix: 'EYE',
  },
  {
    id: 'opd-derma',
    category: 'consultation',
    doctorName: 'Dr. K. Saxena',
    averageConsultationMinutes: 10,
    tokenPrefix: 'SKIN',
  },
  {
    id: 'lab-blood',
    category: 'diagnostics',
    doctorName: 'Dr. V. Rao',
    averageConsultationMinutes: 8,
    tokenPrefix: 'LAB',
  },
  {
    id: 'lab-radiology',
    nodeId: 'radiology',
    category: 'diagnostics',
    doctorName: 'Dr. H. Balsara',
    averageConsultationMinutes: 12,
    tokenPrefix: 'XRAY',
  },
  {
    id: 'emergency',
    nodeId: 'emergency-dept',
    category: 'emergency',
    doctorName: 'Dr. K. Deshmukh',
    averageConsultationMinutes: 0,
    tokenPrefix: 'EMG',
  },
  {
    id: 'pharmacy',
    category: 'pharmacy',
    doctorName: 'K. Sen (Chief Pharmacist)',
    averageConsultationMinutes: 5,
    tokenPrefix: 'PHR',
  },
  {
    id: 'billing',
    nodeId: 'registration',
    category: 'support',
    doctorName: 'D. Jadhav (Registration team)',
    averageConsultationMinutes: 5,
    tokenPrefix: 'REG',
  },
  {
    id: 'ward-4',
    category: 'admission',
    doctorName: 'Dr. A. Verma',
    averageConsultationMinutes: 12,
    tokenPrefix: 'W4',
  },
  {
    id: 'ward-5',
    category: 'admission',
    doctorName: 'Dr. K. Deshmukh',
    averageConsultationMinutes: 15,
    tokenPrefix: 'W5',
  },
  {
    id: 'ward-6',
    category: 'admission',
    doctorName: 'Dr. S. Gupta',
    averageConsultationMinutes: 15,
    tokenPrefix: 'W6',
  },
];

export const DEPARTMENTS: Department[] = roster.map((entry) => {
  const place = hospitalGraph.nodes.find(
    (node) => node.id === (entry.nodeId || entry.id)
  );
  if (!place || !('roomNumber' in place))
    throw new Error(
      `Department ${entry.id} has no room in the sample floor plan.`
    );
  const key = entry.id.replaceAll('-', '_');
  return {
    ...entry,
    nodeId: place.id,
    name: place.name,
    nameKey: `dept.${key}.name`,
    descriptionKey: `dept.${key}.desc`,
    building: 'Main hospital',
    floor: place.floor,
    roomNumbers: [place.roomNumber!],
    landmark: place.landmark,
    estimatedWalkMinutes: place.floor === 0 ? 2 : place.floor === 1 ? 3 : 4,
    wing:
      place.floor === 0
        ? 'Ground floor services'
        : place.floor === 1
          ? 'OPD floor'
          : 'Ward floor',
    opdHours: '09:00–14:00',
  };
});

export const DEPARTMENT_BY_ID = Object.fromEntries(
  DEPARTMENTS.map((dept) => [dept.id, dept])
);

// Resolve old demo URLs and stored visits without keeping obsolete clinics
// or a second, conflicting hospital layout in the visible directory.
export const LEGACY_DEPARTMENT_IDS: Record<string, string> = {
  'opd-cardio': 'opd-general-2',
  'opd-cardiology': 'opd-general-2',
  'opd-neuro': 'opd-general',
  'lab-path': 'lab-blood',
  admission: 'ward-4',
  discharge: 'billing',
  canteen: 'billing',
};
export function getDepartment(id: string | undefined): Department | undefined {
  return id ? DEPARTMENT_BY_ID[LEGACY_DEPARTMENT_IDS[id] || id] : undefined;
}

export function findDepartmentByName(
  name: string,
  doctorName?: string
): Department | undefined {
  const direct = getDepartment(name);
  if (direct) return direct;
  const normalized = name.toLowerCase();
  const exact = DEPARTMENTS.filter(
    (dept) => dept.name.toLowerCase() === normalized || dept.nameKey === name
  );
  if (exact.length)
    return exact.find((dept) => dept.doctorName === doctorName) || exact[0];
  if (/cardio|heart/.test(normalized)) return DEPARTMENT_BY_ID['opd-general-2'];
  if (/general|medicine|neuro/.test(normalized))
    return DEPARTMENT_BY_ID['opd-general'];
  if (/blood|patholog|laboratory/.test(normalized))
    return DEPARTMENT_BY_ID['lab-blood'];
  if (/x-ray|radiolog|imaging/.test(normalized))
    return DEPARTMENT_BY_ID['lab-radiology'];
  if (/ortho|bone|joint/.test(normalized)) return DEPARTMENT_BY_ID['opd-ortho'];
  if (/pediatr|paediatr|child/.test(normalized))
    return DEPARTMENT_BY_ID['opd-pediatrics'];
  if (/women|pregnan|gynaec/.test(normalized))
    return DEPARTMENT_BY_ID['opd-women'];
  if (/ear|nose|throat|^ent/.test(normalized))
    return DEPARTMENT_BY_ID['opd-ent'];
  if (/eye|ophthal/.test(normalized)) return DEPARTMENT_BY_ID['opd-eye'];
  if (/skin|derma/.test(normalized)) return DEPARTMENT_BY_ID['opd-derma'];
  if (/pharmacy/.test(normalized)) return DEPARTMENT_BY_ID.pharmacy;
  return DEPARTMENTS.find((dept) => dept.name.toLowerCase() === normalized);
}
