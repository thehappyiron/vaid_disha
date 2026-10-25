import i18n from '../i18n';
import { getDepartment } from '../data/departments';
import { computeRoute } from './pathfindingService';
import type {
  Department,
  NavigationStep,
  PurposeOption,
  Slip,
  WayfindingResult,
  KnownLocation,
  PatientVisitData,
} from '../types';
import {
  DEPARTMENTS,
  PURPOSE_OPTIONS,
  KNOWN_LOCATIONS,
  SYMPTOM_DEPARTMENT_RULES,
} from '../data/hospitalData';
import { ensurePatientInQueue, getLiveStoreSnapshot } from './liveStore';
import { syncSlipToSupabase, syncVisitToSupabase } from './supabaseClient';

// ─── Utility ─────────────────────────────────────────────────────────────────
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function generateToken(prefix: string): Promise<string> {
  const issue = () => {
    const key = `vd-token-counter-${prefix}`;
    const saved = Number(localStorage.getItem(key));
    let counter = Number.isFinite(saved) ? Math.max(1000, saved) : 1000;
    const tokens = new Set(
      getLiveStoreSnapshot().queue.map((entry) => entry.token)
    );
    try {
      const slips = JSON.parse(
        localStorage.getItem('vd-patient-slips') || '[]'
      ) as Slip[];
      slips.forEach((slip) => tokens.add(slip.token));
    } catch {
      /* A corrupt history must not reuse an active queue token. */
    }
    let token: string;
    do {
      token = `${prefix}-${++counter}`;
    } while (tokens.has(token));
    localStorage.setItem(key, String(counter));
    return token;
  };
  // Reserve the display number before saving the slip; same-browser tabs
  // cannot issue the same token while the local demo is running.
  if (typeof navigator !== 'undefined' && navigator.locks) {
    return navigator.locks.request('vd-token-issuer', issue);
  }
  return issue();
}

function generateStepsFromEntrance(
  dept: Department,
  isAccessibleRoute = false
): NavigationStep[] {
  return stepsForRoute('entrance-main', dept, isAccessibleRoute);
}

function stepsForRoute(
  start: string,
  dept: Department,
  accessible = false
): NavigationStep[] {
  const route = computeRoute(start, dept.nodeId, { excludeStairs: accessible });
  return (route?.steps || []).map((step) => ({
    stepNumber: step.stepNumber,
    instructionKey: step.templateKey,
    instructionParams: step.params,
    landmark: step.toNode.landmark,
    directionIcon: step.icon,
  }));
}

function generateHumanReadableDirection(
  dept: Department,
  isAccessible: boolean
): string {
  const route = computeRoute('entrance-main', dept.nodeId, {
    excludeStairs: isAccessible,
  });
  if (!route) return '';
  const transfer = route.edges.find((edge) => edge.type !== 'corridor');
  const room = dept.roomNumbers[0];
  const destination =
    i18n.t(dept.nameKey) +
    (/^(\d+|G-\d+)$/.test(room)
      ? ` · ${i18n.t('hospital.map.room', { room })}`
      : '');
  return [
    i18n.t(`hospital.directions.${transfer?.type || 'same_floor'}`, {
      floor: i18n.t(`guidance.floor_${dept.floor}`),
    }),
    i18n.t('hospital.directions.destination', {
      destination,
      landmark: i18n.t(route.destinationNode.landmarkKey || '', {
        defaultValue: dept.landmark,
      }),
    }),
  ].join(' ');
}

function generateStepsFromLocation(
  from: KnownLocation,
  dept: Department
): NavigationStep[] {
  return stepsForRoute(from.id, dept);
}

/** Refresh stored demo metadata when the sample floor plan changes. */
export function normalizeSlip(slip: Slip): Slip {
  const department = getDepartment(slip.department?.id);
  if (!department) return slip;
  const accessible =
    slip.accessibilityNeeds?.some(
      (need) => need === 'wheelchair' || need === 'walking_difficulty'
    ) || false;
  return {
    ...slip,
    department,
    doctorName: department.doctorName,
    roomNumber: department.roomNumbers[0],
    floor: department.floor,
    wing: department.wing,
    steps: generateStepsFromEntrance(department, accessible),
    humanReadableDirection: generateHumanReadableDirection(
      department,
      accessible
    ),
  };
}

export interface SymptomMatchResult {
  department: Department;
  matchedKeyword: string;
  reason: string;
  confidence: 'high' | 'medium' | 'fallback';
}

/** Suggest an appropriate hospital department based on patient symptom description */
export async function suggestDepartmentFromSymptoms(
  symptoms: string
): Promise<SymptomMatchResult> {
  await sleep(250);
  const cleanInput = symptoms.toLowerCase().trim();

  for (const rule of SYMPTOM_DEPARTMENT_RULES) {
    const matched = rule.keywords.find((k) =>
      cleanInput.includes(k.toLowerCase())
    );
    if (matched) {
      const dept = DEPARTMENTS.find((d) => d.id === rule.departmentId);
      if (dept) {
        return {
          department: dept,
          matchedKeyword: matched,
          reason: rule.reason,
          confidence: 'high',
        };
      }
    }
  }

  // Fallback to General OPD Triage
  const fallbackDept =
    DEPARTMENTS.find((d) => d.id === 'opd-general') || DEPARTMENTS[0];
  return {
    department: fallbackDept,
    matchedKeyword: 'general health triage',
    reason:
      'General Medicine triage can examine your condition and refer you to specialized hospital wings as needed.',
    confidence: 'fallback',
  };
}

/** Get all available purpose options */
export async function getPurposeOptions(): Promise<PurposeOption[]> {
  await sleep(200);
  return PURPOSE_OPTIONS;
}

/** Search purpose options by query string */
export async function searchPurposes(query: string): Promise<PurposeOption[]> {
  await sleep(150);
  if (!query.trim()) return PURPOSE_OPTIONS;
  const q = query.toLowerCase();
  return PURPOSE_OPTIONS.filter(
    (p) =>
      p.keywords.some((k) => k.includes(q)) ||
      p.labelKey.toLowerCase().includes(q)
  );
}

/** Get departments by purpose */
export async function getDepartmentsByPurpose(
  purposeId: string
): Promise<Department[]> {
  await sleep(200);
  const purpose = PURPOSE_OPTIONS.find((p) => p.id === purposeId);
  if (!purpose) return [];
  return DEPARTMENTS.filter((d) => purpose.departmentIds.includes(d.id));
}

/** Get all departments */
export async function getAllDepartments(): Promise<Department[]> {
  await sleep(150);
  return DEPARTMENTS;
}

/**
 * Generate a patient slip.
 * Supports both modern PatientVisitData object and legacy (purposeId, departmentId) strings.
 */
export async function generateSlip(
  visitDataOrPurposeId: PatientVisitData | string,
  maybeDepartmentId?: string
): Promise<Slip> {
  await sleep(400);

  let departmentId: string;
  let purposeKey = 'purpose.new_opd';
  let patientName = 'Patient';
  let patientAge: number | undefined;
  let patientGender: string | undefined;
  let accessibilityNeeds: PatientVisitData['accessibilityNeeds'] = [];
  let patientEmail: string | undefined;

  if (typeof visitDataOrPurposeId === 'string') {
    const purpose = PURPOSE_OPTIONS.find((p) => p.id === visitDataOrPurposeId);
    purposeKey = purpose?.labelKey || 'purpose.new_opd';
    departmentId = maybeDepartmentId || 'opd-general';
  } else {
    const v = visitDataOrPurposeId;
    patientName = v.patientName || 'Patient';
    patientAge = v.patientAge ? Number(v.patientAge) : undefined;
    patientGender = v.patientGender;
    accessibilityNeeds = v.accessibilityNeeds || [];
    departmentId = v.departmentId || 'opd-general';
    patientEmail = v.email;

    const purposeMap: Record<string, string> = {
      consultation: 'purpose.new_opd',
      lab_test: 'purpose.blood_test',
      pharmacy: 'purpose.pharmacy',
      follow_up: 'purpose.followup',
      admission_visitor: 'purpose.admission',
      other: 'purpose.billing',
    };
    purposeKey = purposeMap[v.purposeId] || 'purpose.new_opd';
  }

  const department = getDepartment(departmentId) || DEPARTMENTS[0];

  const prefix = department.tokenPrefix;

  const waitMap: Record<string, number> = {
    emergency: 0,
    pharmacy: 5,
    diagnostics: 15,
    consultation: 25,
    support: 10,
    admission: 15,
    discharge: 15,
  };

  const isAccessible = accessibilityNeeds.some((need) =>
    ['wheelchair', 'walking_difficulty', 'elderly_assistance'].includes(need)
  );

  const humanDirection = generateHumanReadableDirection(
    department,
    isAccessible
  );
  const steps = generateStepsFromEntrance(department, isAccessible);

  const waitMinutes = waitMap[department.category] ?? 20;
  const peopleAhead =
    department.category === 'emergency'
      ? 0
      : Math.max(1, Math.round(waitMinutes / 5));
  const queueStatus =
    department.category === 'emergency'
      ? 'in_progress'
      : waitMinutes <= 5
        ? 'turn_soon'
        : 'waiting';

  const authRaw =
    typeof window !== 'undefined' ? localStorage.getItem('vd-auth-user') : null;
  const authUser = authRaw ? JSON.parse(authRaw) : null;
  const isGuest = authUser ? Boolean(authUser.isGuest) : true;

  const slip: Slip = {
    id: `slip-${crypto.randomUUID()}`,
    generatedAt: new Date().toISOString(),
    patientPurposeKey: purposeKey,
    department,
    token: await generateToken(prefix),
    estimatedWait: waitMinutes,
    peopleAhead,
    status: queueStatus,
    steps,
    doctorName: department.doctorName,
    roomNumber: department.roomNumbers[0],
    floor: department.floor,
    wing: department.wing,
    humanReadableDirection: humanDirection,
    patientName,
    patientAge,
    patientGender,
    accessibilityNeeds,
    isGuest,
    userId: authUser?.id,
    patientEmail: patientEmail || authUser?.email,
    additionalNoteKey:
      department.category === 'emergency' ? 'slip.note_emergency' : undefined,
  };

  await saveSlip(slip, isGuest);

  return slip;
}

const SLIPS_STORAGE_KEY = 'vd-patient-slips';
const LATEST_SLIP_KEY = 'vd-latest-slip';

/** Save or update a slip in persistent localStorage */
export async function saveSlip(slip: Slip, isGuest?: boolean): Promise<Slip> {
  try {
    const raw = localStorage.getItem(SLIPS_STORAGE_KEY);
    const list: Slip[] = raw ? JSON.parse(raw) : [];

    const authRaw = localStorage.getItem('vd-auth-user');
    const authUser = authRaw ? JSON.parse(authRaw) : null;
    const determinedIsGuest =
      isGuest ?? (authUser ? Boolean(authUser.isGuest) : true);

    const enrichedSlip: Slip = {
      ...normalizeSlip(slip),
      isGuest: determinedIsGuest,
      userId: authUser?.id,
      patientEmail: slip.patientEmail || authUser?.email,
    };

    const existingIndex = list.findIndex((s) => s.id === slip.id);
    if (existingIndex >= 0) {
      list[existingIndex] = enrichedSlip;
    } else {
      list.unshift(enrichedSlip);
    }

    localStorage.setItem(SLIPS_STORAGE_KEY, JSON.stringify(list));
    localStorage.setItem(LATEST_SLIP_KEY, JSON.stringify(enrichedSlip));

    // Persist slip to Supabase cloud database
    syncSlipToSupabase(enrichedSlip);

    // Register into reactive live queue store
    if (enrichedSlip.token && enrichedSlip.department?.id) {
      ensurePatientInQueue({
        token: enrichedSlip.token,
        patientName: enrichedSlip.patientName || 'Patient',
        departmentId: enrichedSlip.department.id,
        roomNumber:
          enrichedSlip.roomNumber || enrichedSlip.department.roomNumbers?.[0],
        email: enrichedSlip.patientEmail,
      }).catch((e) => console.warn('Failed to register slip in liveStore', e));
    }

    // Trigger OPD Slip confirmation email & schedule visit reminders
    const recipientEmail = enrichedSlip.patientEmail || authUser?.email;
    if (recipientEmail && enrichedSlip.token) {
      void import('./emailService').then((mail) => {
        const genDate = new Date(enrichedSlip.generatedAt);
        const etaStart = new Date(
          genDate.getTime() + (enrichedSlip.estimatedWait || 15) * 60 * 1000
        );
        const etaEnd = new Date(etaStart.getTime() + 15 * 60 * 1000);
        const deptLabel =
          enrichedSlip.department?.nameKey || 'General Consultation';
        const docLabel =
          enrichedSlip.doctorName ||
          enrichedSlip.department?.doctorName ||
          'Doctor on Duty';

        void mail.sendOpdSlipEmail({
          email: recipientEmail,
          patientName: enrichedSlip.patientName || 'Patient',
          token: enrichedSlip.token,
          department: deptLabel,
          doctorName: docLabel,
          room: enrichedSlip.roomNumber || 'Room 101',
          floor: mail.formatFloor(enrichedSlip.floor),
          date: mail.formatDate(genDate),
          etaStart: mail.formatClock(etaStart),
          etaEnd: mail.formatClock(etaEnd),
          routeText:
            enrichedSlip.humanReadableDirection ||
            'Follow hospital OPD wayfinding signs.',
          slipId: enrichedSlip.id,
        });

        mail.scheduleVisitReminders({
          token: enrichedSlip.token,
          email: recipientEmail,
          patientName: enrichedSlip.patientName || 'Patient',
          department: deptLabel,
          doctorName: docLabel,
          expectedAt: etaStart,
          slipId: enrichedSlip.id,
        });
      });
    }

    // If registered user, also append to visits in authUser
    if (authUser && !authUser.isGuest) {
      const existingVisits = authUser.visits || [];
      const hasVisit = existingVisits.some(
        (v: any) => v.id === slip.id || v.tokenNumber === slip.token
      );
      if (!hasVisit) {
        const newVisit = {
          id: slip.id,
          date: new Date(slip.generatedAt).toISOString().split('T')[0],
          departmentName: slip.department.nameKey,
          doctorName:
            slip.doctorName || slip.department.doctorName || 'Doctor on Duty',
          tokenNumber: slip.token,
          diagnosisSummary: `Outpatient consultation. Queue Token #${slip.token}. Room ${slip.roomNumber || slip.department.roomNumbers[0]}.`,
          status: 'in_progress' as const,
        };
        authUser.visits = [newVisit, ...existingVisits];
        localStorage.setItem('vd-auth-user', JSON.stringify(authUser));
        if (authUser.id) {
          syncVisitToSupabase(newVisit, authUser.id);
        }
      }
    }

    return enrichedSlip;
  } catch (err) {
    console.warn('Failed to save slip to localStorage', err);
    return slip;
  }
}

/** Retrieve a slip by ID or get the latest active slip */
export async function getSlipById(id: string): Promise<Slip | null> {
  await sleep(100);
  try {
    const raw = localStorage.getItem(SLIPS_STORAGE_KEY);
    const list: Slip[] = raw ? JSON.parse(raw) : [];
    const found = list.find((s) => s.id === id);
    if (found) return normalizeSlip(found);

    // Check latest slip
    const latestRaw = localStorage.getItem(LATEST_SLIP_KEY);
    if (latestRaw) {
      const latest: Slip = JSON.parse(latestRaw);
      if (latest.id === id || id === 'latest') return normalizeSlip(latest);
    }

    // The sample fallback uses the current hospital roster.
    const dept = DEPARTMENTS[1] || DEPARTMENTS[0];
    const fallbackSlip: Slip = {
      id: id || `slip-${Date.now()}`,
      generatedAt: new Date().toISOString(),
      patientPurposeKey: 'purpose.new_opd',
      department: dept,
      token: 'CARD-1042',
      estimatedWait: 15,
      peopleAhead: 3,
      status: 'waiting',
      steps: generateStepsFromEntrance(dept, false),
      doctorName: dept.doctorName,
      roomNumber: dept.roomNumbers[0],
      floor: dept.floor,
      wing: dept.wing,
      humanReadableDirection: generateHumanReadableDirection(dept, false),
      patientName: 'Ramesh Sharma',
      patientAge: 68,
      patientGender: 'Male',
      isGuest: false,
    };
    return normalizeSlip(fallbackSlip);
  } catch {
    return null;
  }
}

/** Get list of all previous slips for the patient */
export async function getPatientSlipHistory(userId?: string): Promise<Slip[]> {
  await sleep(150);
  try {
    const raw = localStorage.getItem(SLIPS_STORAGE_KEY);
    const list: Slip[] = raw
      ? (JSON.parse(raw) as Slip[]).map(normalizeSlip)
      : [];
    if (userId) {
      return list.filter((s) => s.userId === userId || !s.userId);
    }
    return list;
  } catch {
    return [];
  }
}

/** Get all known locations for wayfinding */
export async function getKnownLocations(): Promise<KnownLocation[]> {
  await sleep(150);
  return KNOWN_LOCATIONS;
}

/** Get wayfinding steps from a known location to a department */
export async function getWayfinding(
  fromLocationId: string,
  departmentId: string
): Promise<WayfindingResult> {
  await sleep(350);

  const location = KNOWN_LOCATIONS.find((l) => l.id === fromLocationId);
  const department = DEPARTMENTS.find((d) => d.id === departmentId);

  if (!location || !department) {
    throw new Error('Invalid location or department');
  }

  const steps = generateStepsFromLocation(location, department);
  const totalMinutes = Math.max(1, department.estimatedWalkMinutes - 2);

  return {
    fromLocation: location.labelKey,
    department,
    steps,
    totalEstimatedMinutes: totalMinutes,
  };
}

/** Search departments by name query */
export async function searchDepartments(query: string): Promise<Department[]> {
  await sleep(150);
  if (!query.trim()) return DEPARTMENTS;
  const q = query.toLowerCase();
  return DEPARTMENTS.filter(
    (d) =>
      d.name.toLowerCase().includes(q) ||
      d.roomNumbers.some((room) => room.toLowerCase().includes(q)) ||
      d.doctorName?.toLowerCase().includes(q) ||
      d.landmark.toLowerCase().includes(q) ||
      d.building.toLowerCase().includes(q)
  );
}
