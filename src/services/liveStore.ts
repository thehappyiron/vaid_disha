import {
  DEPARTMENTS,
  getDepartment,
  SAMPLE_LAYOUT_VERSION,
} from '../data/departments';
import { useState, useEffect, useCallback } from 'react';

// ─── TYPES ───────────────────────────────────────────────────────────────────

export type QueueStatus =
  'waiting' | 'turn_soon' | 'in_progress' | 'completed' | 'cancelled';

export type DepartmentStatusCode =
  | 'normal' // On time / operating normally
  | 'busy' // Doctor with another patient
  | 'break' // Doctor on break until __
  | 'delayed' // Lab or department delayed by __ min
  | 'emergency'; // Emergency case priority

export interface QueueEntry {
  id: string;
  token: string;
  patientName: string;
  departmentId: string;
  roomNumber?: string;
  status: QueueStatus;
  position: number; // Position among waiting patients (0 if in_progress or completed)
  estimatedWaitMinutes: number; // Specific estimated wait for this patient
  calledAt?: string;
  createdAt: string;
  isGuest?: boolean;
  purpose?: string;
  accessibilityNeeds?: string[];
  age?: number;
  isElderly?: boolean;
  isEmergency?: boolean;
  scheduledTime?: string;
  email?: string;
}

export interface DepartmentLiveStatus {
  departmentId: string;
  departmentName: string;
  roomNumber: string;
  floor: number;
  building: string;
  activeDoctorName: string;
  currentToken: string | null; // e.g. "CARD-1041"
  statusMessage: string; // e.g. "Doctor with another patient", "Doctor on break until 3:15 PM"
  statusCode: DepartmentStatusCode;
  breakUntil?: string; // e.g. "3:15 PM"
  delayMinutes?: number; // e.g. 20
  estimatedWaitPerPatientMinutes: number; // e.g. 10
  lastUpdated: string;
}

export interface LiveAlert {
  id: string;
  type: 'emergency' | 'delay' | 'announcement' | 'info';
  title: string;
  message: string;
  departmentId?: string;
  active: boolean;
  timestamp: string;
}

export interface EmergencyRequest {
  id: string;
  symptoms: string[];
  note?: string;
  landmark: string;
  patientToken?: string;
  patientName?: string;
  status: 'alerted' | 'responding' | 'resolved';
  timestamp: string;
}

export type NotificationTriggerType =
  'turn_soon' | 'completed' | 'report_ready' | 'emergency' | 'general';

export interface PatientNotification {
  id: string;
  type: NotificationTriggerType;
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  actionUrl?: string;
  actionLabel?: string;
  token?: string;
  departmentId?: string;
}

export interface LiveStoreState {
  layoutVersion?: number;
  queue: QueueEntry[];
  departments: Record<string, DepartmentLiveStatus>;
  alerts: LiveAlert[];
  emergencyRequests: EmergencyRequest[];
  notifications: PatientNotification[];
  lastUpdated: string;
}

// ─── INITIAL MOCK DATA ───────────────────────────────────────────────────────

const INITIAL_DEPARTMENTS: Record<string, DepartmentLiveStatus> =
  Object.fromEntries(
    DEPARTMENTS.map((dept) => [
      dept.id,
      {
        departmentId: dept.id,
        departmentName: dept.name,
        roomNumber: dept.roomNumbers[0],
        floor: dept.floor,
        building: dept.building,
        activeDoctorName: dept.doctorName || 'Care team',
        currentToken: null,
        statusMessage: 'Consultations running on time',
        statusCode: 'normal' as const,
        estimatedWaitPerPatientMinutes: dept.averageConsultationMinutes,
        lastUpdated: new Date().toISOString(),
      },
    ])
  );

const INITIAL_QUEUE: QueueEntry[] = (
  [
    // General Medicine Queue
    {
      id: 'q-card-1',
      token: 'CARD-1041',
      patientName: 'Sunita Mehra',
      departmentId: 'opd-general-2',
      roomNumber: '2',
      status: 'in_progress',
      position: 0,
      estimatedWaitMinutes: 0,
      purpose: 'General Medicine follow-up (Hypertension)',
      isGuest: false,
      age: 58,
      scheduledTime: '10:00 AM',
      calledAt: new Date(Date.now() - 5 * 60000).toISOString(),
      createdAt: new Date(Date.now() - 30 * 60000).toISOString(),
    },
    {
      id: 'q-card-2',
      token: 'CARD-1042',
      patientName: 'Ramesh Sharma',
      departmentId: 'opd-general-2',
      roomNumber: '2',
      status: 'turn_soon',
      position: 1,
      estimatedWaitMinutes: 10,
      purpose: 'Chest Tightness & Palpitations',
      isGuest: false,
      age: 68,
      isElderly: true,
      accessibilityNeeds: ['walking_difficulty'],
      scheduledTime: '10:15 AM',
      createdAt: new Date(Date.now() - 25 * 60000).toISOString(),
    },
    {
      id: 'q-card-3',
      token: 'CARD-1043',
      patientName: 'Priya Joshi (Guest)',
      departmentId: 'opd-general-2',
      roomNumber: '2',
      status: 'waiting',
      position: 2,
      estimatedWaitMinutes: 20,
      purpose: 'ECG Screening & Chest Discomfort',
      isGuest: true,
      age: 34,
      scheduledTime: '10:30 AM',
      createdAt: new Date(Date.now() - 20 * 60000).toISOString(),
    },
    {
      id: 'q-card-4',
      token: 'CARD-1044',
      patientName: 'Amit Verma (Guest)',
      departmentId: 'opd-general-2',
      roomNumber: '2',
      status: 'waiting',
      position: 3,
      estimatedWaitMinutes: 30,
      purpose: 'Post-surgery Valve Checkup',
      isGuest: true,
      age: 72,
      isElderly: true,
      accessibilityNeeds: ['wheelchair'],
      scheduledTime: '10:45 AM',
      createdAt: new Date(Date.now() - 15 * 60000).toISOString(),
    },

    // General OPD Queue
    {
      id: 'q-opd-1',
      token: 'OPD-101',
      patientName: 'Geeta Devi',
      departmentId: 'opd-general',
      roomNumber: '1',
      status: 'completed',
      position: 0,
      estimatedWaitMinutes: 0,
      purpose: 'Diabetes Management Review',
      isGuest: false,
      age: 62,
      scheduledTime: '09:30 AM',
      calledAt: new Date(Date.now() - 25 * 60000).toISOString(),
      createdAt: new Date(Date.now() - 40 * 60000).toISOString(),
    },
    {
      id: 'q-opd-2',
      token: 'OPD-102',
      patientName: 'Suresh Patel (Guest)',
      departmentId: 'opd-general',
      roomNumber: '1',
      status: 'in_progress',
      position: 0,
      estimatedWaitMinutes: 0,
      purpose: 'Persistent High Fever & Weakness',
      isGuest: true,
      age: 45,
      scheduledTime: '10:00 AM',
      calledAt: new Date(Date.now() - 10 * 60000).toISOString(),
      createdAt: new Date(Date.now() - 35 * 60000).toISOString(),
    },
    {
      id: 'q-opd-3',
      token: 'OPD-103',
      patientName: 'Kavita Joshi',
      departmentId: 'opd-general',
      roomNumber: '1',
      status: 'waiting',
      position: 1,
      estimatedWaitMinutes: 25,
      purpose: 'Severe Joint Pain & Mobility Issue',
      isGuest: false,
      age: 69,
      isElderly: true,
      accessibilityNeeds: ['wheelchair'],
      scheduledTime: '10:20 AM',
      createdAt: new Date(Date.now() - 20 * 60000).toISOString(),
    },
    {
      id: 'q-opd-4',
      token: 'OPD-104',
      patientName: 'Mohit Deshmukh',
      departmentId: 'opd-general',
      roomNumber: '1',
      status: 'waiting',
      position: 2,
      estimatedWaitMinutes: 37,
      purpose: 'Stomach Cramps & Nausea',
      isGuest: false,
      age: 28,
      scheduledTime: '10:40 AM',
      createdAt: new Date(Date.now() - 12 * 60000).toISOString(),
    },

    // Emergency Triage Queue
    {
      id: 'q-emg-1',
      token: 'EMG-08',
      patientName: 'Harish Chandra (Guest)',
      departmentId: 'emergency',
      roomNumber: 'G-03',
      status: 'in_progress',
      position: 0,
      estimatedWaitMinutes: 0,
      purpose: 'Acute Chest Pain & Severe Dizziness',
      isGuest: true,
      isEmergency: true,
      age: 54,
      scheduledTime: 'Immediate',
      calledAt: new Date(Date.now() - 2 * 60000).toISOString(),
      createdAt: new Date(Date.now() - 5 * 60000).toISOString(),
    },

    // Blood Lab Queue
    {
      id: 'q-lab-1',
      token: 'LAB-48',
      patientName: 'Mohd. Salim',
      departmentId: 'lab-blood',
      roomNumber: 'G-01',
      status: 'in_progress',
      position: 0,
      estimatedWaitMinutes: 0,
      purpose: 'Fasting Blood Sugar & CBC Profile',
      isGuest: false,
      age: 50,
      scheduledTime: '10:15 AM',
      calledAt: new Date(Date.now() - 4 * 60000).toISOString(),
      createdAt: new Date(Date.now() - 25 * 60000).toISOString(),
    },
    {
      id: 'q-lab-2',
      token: 'LAB-49',
      patientName: 'Anil Deshmukh (Guest)',
      departmentId: 'lab-blood',
      roomNumber: 'G-01',
      status: 'waiting',
      position: 1,
      estimatedWaitMinutes: 28, // 8 min wait + 20 min lab delay
      purpose: 'Kidney Function Test (KFT)',
      isGuest: true,
      age: 66,
      isElderly: true,
      accessibilityNeeds: ['walking_difficulty'],
      scheduledTime: '10:30 AM',
      createdAt: new Date(Date.now() - 15 * 60000).toISOString(),
    },
  ] as QueueEntry[]
).map((entry) => {
  const dept = getDepartment(entry.departmentId);
  return dept
    ? { ...entry, departmentId: dept.id, roomNumber: dept.roomNumbers[0] }
    : entry;
});

const INITIAL_ALERTS: LiveAlert[] = [
  {
    id: 'alert-initial-1',
    type: 'emergency',
    title: 'ACTIVE EMERGENCY ALERT: Ground floor lift',
    message:
      'Patient at Ground floor lift reported chest pain and severe shortness of breath.',
    departmentId: 'emergency',
    active: true,
    timestamp: new Date(Date.now() - 2 * 60000).toISOString(),
  },
  {
    id: 'alert-initial-2',
    type: 'info',
    title: 'Real-Time Hospital Queue Connected',
    message:
      'Live status and wait times sync automatically between department counters and patient slips.',
    active: true,
    timestamp: new Date().toISOString(),
  },
];

const INITIAL_EMERGENCY_REQUESTS: EmergencyRequest[] = [
  {
    id: 'emg-init-1',
    symptoms: ['Chest pain', 'Difficulty breathing'],
    note: 'Sitting on bench right outside lift, feeling very dizzy.',
    landmark: 'Ground floor lift lobby',
    patientToken: 'CARD-1042',
    patientName: 'Ramesh Sharma',
    status: 'alerted',
    timestamp: new Date(Date.now() - 2 * 60000).toISOString(),
  },
];

const INITIAL_NOTIFICATIONS: PatientNotification[] = [
  {
    id: 'notif-1',
    type: 'turn_soon',
    title: 'Your turn is coming',
    message:
      'Token CARD-1042: You are next in line for General Medicine (Room 2). Please proceed near the door.',
    timestamp: new Date(Date.now() - 3 * 60000).toISOString(),
    read: false,
    actionUrl: '/patient/live?token=CARD-1042&dept=opd-general-2',
    actionLabel: 'View Live Room Status',
    token: 'CARD-1042',
    departmentId: 'opd-general-2',
  },
  {
    id: 'notif-2',
    type: 'report_ready',
    title: 'Your lab report is ready',
    message:
      'Pathology Lab: Complete Blood Count (CBC) and Lipid Profile reports have been processed.',
    timestamp: new Date(Date.now() - 45 * 60000).toISOString(),
    read: false,
    actionUrl: '/patient/history',
    actionLabel: 'View Report',
  },
  {
    id: 'notif-3',
    type: 'completed',
    title: 'Your consultation is complete',
    message:
      'Consultation with General OPD is marked done. Next steps: collect prescribed medicines at Pharmacy.',
    timestamp: new Date(Date.now() - 120 * 60000).toISOString(),
    read: true,
    actionUrl: '/patient/completion',
    actionLabel: 'View Next Steps',
    token: 'OPD-101',
    departmentId: 'opd-general',
  },
];

function normalizeHospitalState(state: LiveStoreState): LiveStoreState {
  if (state.layoutVersion === SAMPLE_LAYOUT_VERSION) return state;
  const departments = Object.fromEntries(
    Object.entries(INITIAL_DEPARTMENTS).map(([id, department]) => [
      id,
      { ...department },
    ])
  );
  for (const entry of Object.values(state.departments)) {
    const dept = getDepartment(entry.departmentId);
    if (!dept) continue;
    departments[dept.id] = {
      ...entry,
      departmentId: dept.id,
      departmentName: dept.name,
      roomNumber: dept.roomNumbers[0],
      floor: dept.floor,
      building: dept.building,
      activeDoctorName: dept.doctorName || 'Care team',
      estimatedWaitPerPatientMinutes: dept.averageConsultationMinutes,
    };
  }
  const queue = state.queue.map((entry) => {
    const dept = getDepartment(entry.departmentId);
    return dept
      ? { ...entry, departmentId: dept.id, roomNumber: dept.roomNumbers[0] }
      : entry;
  });
  for (const dept of Object.values(departments)) {
    dept.currentToken =
      queue.find(
        (entry) =>
          entry.departmentId === dept.departmentId &&
          entry.status === 'in_progress'
      )?.token || null;
  }
  return { ...state, departments, queue, layoutVersion: SAMPLE_LAYOUT_VERSION };
}

// ─── STORAGE & BROADCAST SYNC CORE ──────────────────────────────────────────

const STORAGE_KEY = 'vd_live_store_v1';
const BROADCAST_CHANNEL_NAME = 'vd_live_store_sync_channel';

type Subscriber = (state: LiveStoreState) => void;
const subscribers = new Set<Subscriber>();

let broadcastChannel: BroadcastChannel | null = null;

// Initialize BroadcastChannel safely in browser
if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
  try {
    broadcastChannel = new BroadcastChannel(BROADCAST_CHANNEL_NAME);
    broadcastChannel.onmessage = (event) => {
      if (
        event.data &&
        event.data.type === 'LIVE_STORE_SYNC' &&
        event.data.payload
      ) {
        memoryState = normalizeHospitalState(event.data.payload);
        notifySubscribers();
      }
    };
  } catch (err) {
    console.warn(
      'Could not initialize BroadcastChannel for live store sync',
      err
    );
  }
}

// Fallback storage event listener for cross-tab sync
if (typeof window !== 'undefined') {
  window.addEventListener('storage', (event) => {
    if (event.key === STORAGE_KEY && event.newValue) {
      try {
        const parsed: LiveStoreState = JSON.parse(event.newValue);
        memoryState = normalizeHospitalState(parsed);
        notifySubscribers();
      } catch {
        // ignore parse error
      }
    }
  });
}

function loadFromStorage(): LiveStoreState {
  if (typeof window === 'undefined') {
    return {
      queue: INITIAL_QUEUE,
      departments: INITIAL_DEPARTMENTS,
      alerts: INITIAL_ALERTS,
      emergencyRequests: INITIAL_EMERGENCY_REQUESTS,
      notifications: INITIAL_NOTIFICATIONS,
      lastUpdated: new Date().toISOString(),
    };
  }

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed: LiveStoreState = JSON.parse(raw);
      // Ensure essential fields exist
      if (parsed.queue && parsed.departments) {
        return normalizeHospitalState({
          ...parsed,
          alerts: parsed.alerts || INITIAL_ALERTS,
          emergencyRequests:
            parsed.emergencyRequests || INITIAL_EMERGENCY_REQUESTS,
          notifications: parsed.notifications || INITIAL_NOTIFICATIONS,
        });
      }
    }
  } catch (err) {
    console.warn(
      'Failed to parse live store from localStorage, using initial mock data',
      err
    );
  }

  const initial: LiveStoreState = normalizeHospitalState({
    queue: INITIAL_QUEUE,
    departments: INITIAL_DEPARTMENTS,
    alerts: INITIAL_ALERTS,
    emergencyRequests: INITIAL_EMERGENCY_REQUESTS,
    notifications: INITIAL_NOTIFICATIONS,
    lastUpdated: new Date().toISOString(),
  });

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(initial));
  } catch {
    // ignore
  }

  return initial;
}

// In-memory cache for fast, synchronous reads
let memoryState: LiveStoreState = loadFromStorage();

function notifySubscribers() {
  subscribers.forEach((callback) => {
    try {
      callback(memoryState);
    } catch (err) {
      console.error('Error in live store subscriber', err);
    }
  });
}

/** Commit state to memory, localStorage, and broadcast across tabs */
function deptMailContext(dept: DepartmentLiveStatus) {
  return {
    departmentName: dept.departmentName,
    roomNumber: dept.roomNumber,
    floor: dept.floor,
    doctorName: dept.activeDoctorName,
    delayMinutes: dept.delayMinutes,
  };
}

function fireQueueActivityEmails(
  previousQueue: QueueEntry[],
  departmentId: string
) {
  const dept = memoryState.departments[departmentId];
  if (!dept) return;
  const prev = previousQueue.filter((q) => q.departmentId === departmentId);
  const next = memoryState.queue.filter((q) => q.departmentId === departmentId);
  void import('./emailService').then((mail) => {
    mail.notifyTurnApproachingAndNow(prev, next, deptMailContext(dept));
  });
}

function commitState(newState: LiveStoreState) {
  newState.lastUpdated = new Date().toISOString();
  memoryState = newState;

  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newState));
    } catch (err) {
      console.warn('Failed to persist live store to localStorage', err);
    }
  }

  if (broadcastChannel) {
    try {
      broadcastChannel.postMessage({
        type: 'LIVE_STORE_SYNC',
        payload: newState,
      });
    } catch (err) {
      console.warn('BroadcastChannel postMessage failed', err);
    }
  }

  notifySubscribers();
}

/** Helper: recompute queue positions and estimated wait times for a department */
function recomputeDepartmentQueue(
  state: LiveStoreState,
  departmentId: string
): LiveStoreState {
  const dept = state.departments[departmentId];
  const waitPerPatient = dept ? dept.estimatedWaitPerPatientMinutes : 10;
  const delayMinutes =
    dept && dept.statusCode === 'delayed' ? dept.delayMinutes || 0 : 0;
  const isBreak = dept && dept.statusCode === 'break';

  let position = 1;
  const updatedQueue = state.queue.map((entry) => {
    if (entry.departmentId !== departmentId) return entry;

    if (entry.status === 'in_progress') {
      return {
        ...entry,
        position: 0,
        estimatedWaitMinutes: 0,
      };
    }

    if (entry.status === 'completed' || entry.status === 'cancelled') {
      return {
        ...entry,
        position: 0,
        estimatedWaitMinutes: 0,
      };
    }

    // Is waiting or turn_soon
    const myPos = position++;
    const isNext = myPos === 1;
    const baseWait = myPos * waitPerPatient;
    const totalWait = baseWait + delayMinutes + (isBreak ? 10 : 0);

    return {
      ...entry,
      position: myPos,
      status: isNext
        ? ('turn_soon' as QueueStatus)
        : ('waiting' as QueueStatus),
      estimatedWaitMinutes: totalWait,
    };
  });

  return {
    ...state,
    queue: updatedQueue,
  };
}

// ─── PUBLIC ASYNC API (Ready for future REST / WebSocket replacement) ─────────

/** Subscribe to all live store updates (BroadcastChannel + LocalStorage) */
export function subscribeToLiveStore(listener: Subscriber): () => void {
  subscribers.add(listener);
  // Send current state immediately on subscription
  listener(memoryState);
  return () => {
    subscribers.delete(listener);
  };
}

/** Get snapshot of complete live store state */
export async function getLiveStoreState(): Promise<LiveStoreState> {
  return memoryState;
}

/** Synchronous snapshot reader */
export function getLiveStoreSnapshot(): LiveStoreState {
  return memoryState;
}

/** Get live status for a specific department */
export async function getDepartmentLiveStatus(
  departmentId: string
): Promise<DepartmentLiveStatus | null> {
  return memoryState.departments[departmentId] || null;
}

/** Get all queue entries for a specific department */
export async function getDepartmentQueue(
  departmentId: string
): Promise<QueueEntry[]> {
  return memoryState.queue.filter((q) => q.departmentId === departmentId);
}

/** Get live status and queue details for a specific patient token or slip ID */
export async function getPatientLiveDetails(
  tokenOrSlipId: string,
  departmentId?: string
): Promise<{
  queueEntry: QueueEntry | null;
  department: DepartmentLiveStatus | null;
  peopleAhead: number;
  estimatedWaitMinutes: number;
  status: QueueStatus;
  nowServingToken: string | null;
  activeAlerts: LiveAlert[];
}> {
  const norm = tokenOrSlipId.trim().toUpperCase();
  const queueEntry =
    memoryState.queue.find(
      (q) => q.token.toUpperCase() === norm || q.id === tokenOrSlipId
    ) || null;

  const targetDeptId =
    getDepartment(queueEntry?.departmentId || departmentId)?.id ||
    'opd-general-2';
  const dept = memoryState.departments[targetDeptId] || null;

  let peopleAhead = 0;
  let estimatedWaitMinutes = 15;
  let status: QueueStatus = 'waiting';

  if (queueEntry) {
    status = queueEntry.status;
    peopleAhead = Math.max(0, queueEntry.position - 1);
    estimatedWaitMinutes = queueEntry.estimatedWaitMinutes;
  } else if (dept) {
    peopleAhead = 1;
    estimatedWaitMinutes = dept.estimatedWaitPerPatientMinutes;
  }

  const activeAlerts = memoryState.alerts.filter(
    (a) => a.active && (!a.departmentId || a.departmentId === targetDeptId)
  );

  return {
    queueEntry,
    department: dept,
    peopleAhead,
    estimatedWaitMinutes,
    status,
    nowServingToken: dept?.currentToken || null,
    activeAlerts,
  };
}

/** Ensure a patient exists in the live queue (creates entry if missing) */
export async function ensurePatientInQueue(params: {
  token: string;
  patientName: string;
  departmentId: string;
  roomNumber?: string;
  email?: string;
  age?: number;
  accessibilityNeeds?: string[];
  isEmergency?: boolean;
}): Promise<QueueEntry> {
  const existing = memoryState.queue.find(
    (q) => q.token.toUpperCase() === params.token.toUpperCase()
  );
  if (existing) {
    return existing;
  }

  const previousQueue = memoryState.queue;
  const dept = memoryState.departments[params.departmentId];
  const waitPerPatient = dept ? dept.estimatedWaitPerPatientMinutes : 10;
  const currentWaitingCount = memoryState.queue.filter(
    (q) =>
      q.departmentId === params.departmentId &&
      (q.status === 'waiting' || q.status === 'turn_soon')
  ).length;

  const isPriority =
    Boolean(params.isEmergency) ||
    (typeof params.age === 'number' && params.age >= 65) ||
    Boolean(
      params.accessibilityNeeds &&
      params.accessibilityNeeds.filter((n) => n !== 'none').length > 0
    );

  const newPosition = isPriority ? 1 : currentWaitingCount + 1;
  const newEntry: QueueEntry = {
    id: `q-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    token: params.token,
    patientName: params.patientName,
    departmentId: params.departmentId,
    roomNumber: params.roomNumber || dept?.roomNumber || 'Room 1',
    status: newPosition === 1 ? 'turn_soon' : 'waiting',
    position: newPosition,
    estimatedWaitMinutes: newPosition * waitPerPatient,
    createdAt: new Date().toISOString(),
    email: params.email,
    age: params.age,
    accessibilityNeeds: params.accessibilityNeeds,
    isEmergency: params.isEmergency,
    isElderly: typeof params.age === 'number' ? params.age >= 65 : undefined,
  };

  const withoutDeptWaiting = memoryState.queue.filter(
    (q) =>
      q.departmentId !== params.departmentId ||
      (q.status !== 'waiting' && q.status !== 'turn_soon')
  );
  const deptWaiting = memoryState.queue.filter(
    (q) =>
      q.departmentId === params.departmentId &&
      (q.status === 'waiting' || q.status === 'turn_soon')
  );
  const inserted = isPriority
    ? [newEntry, ...deptWaiting]
    : [...deptWaiting, newEntry];

  let nextState: LiveStoreState = {
    ...memoryState,
    queue: [...withoutDeptWaiting, ...inserted],
  };

  nextState = recomputeDepartmentQueue(nextState, params.departmentId);
  commitState(nextState);
  fireQueueActivityEmails(previousQueue, params.departmentId);

  const saved =
    nextState.queue.find((q) => q.token === params.token) || newEntry;
  if (isPriority) {
    void import('./emailService').then((mail) =>
      mail.notifyPriorityApplied(saved)
    );
  }
  return saved;
}

/** Add multiple random walk-in guest patients to the live queue */
export async function addRandomGuestPatients(
  count: number = 3
): Promise<QueueEntry[]> {
  const depts = ['opd-general', 'opd-general-2', 'opd-ortho', 'lab-blood'];
  const firstNames = [
    'Aarav',
    'Meera',
    'Kiran',
    'Deepak',
    'Anita',
    'Sunil',
    'Pooja',
    'Rohan',
  ];
  const lastNames = [
    'Sharma',
    'Joshi',
    'Patel',
    'Kulkarni',
    'Deshmukh',
    'Verma',
    'Nair',
  ];
  const purposes = [
    'Viral Fever & Chills',
    'Routine Blood Test & Glucose',
    'Follow-up Consultation',
    'Chest Discomfort Screening',
    'Knee Joint Pain Review',
  ];

  let nextState: LiveStoreState = { ...memoryState };
  const added: QueueEntry[] = [];

  for (let i = 0; i < count; i++) {
    const randNum = Math.floor(100 + Math.random() * 900);
    const deptId = depts[Math.floor(Math.random() * depts.length)];
    const dept = nextState.departments[deptId];
    const prefix = deptId.includes('cardio')
      ? 'CARD'
      : deptId.includes('ortho')
        ? 'ORTHO'
        : deptId.includes('lab')
          ? 'LAB'
          : 'OPD';
    const token = `${prefix}-${randNum}`;
    const name = `${firstNames[Math.floor(Math.random() * firstNames.length)]} ${lastNames[Math.floor(Math.random() * lastNames.length)]} (Guest)`;
    const purpose = purposes[Math.floor(Math.random() * purposes.length)];

    const currentWaiting = nextState.queue.filter(
      (q) =>
        q.departmentId === deptId &&
        (q.status === 'waiting' || q.status === 'turn_soon')
    ).length;

    const waitPerPatient = dept ? dept.estimatedWaitPerPatientMinutes : 10;
    const newPos = currentWaiting + 1;

    const entry: QueueEntry = {
      id: `q-guest-${Date.now()}-${i}-${randNum}`,
      token,
      patientName: name,
      departmentId: deptId,
      roomNumber: dept?.roomNumber || 'Room 1',
      status: 'waiting',
      position: newPos,
      estimatedWaitMinutes: newPos * waitPerPatient,
      isGuest: true,
      purpose,
      createdAt: new Date().toISOString(),
    };

    nextState = {
      ...nextState,
      queue: [...nextState.queue, entry],
    };
    nextState = recomputeDepartmentQueue(nextState, deptId);
    added.push(entry);
  }

  commitState(nextState);
  return added;
}

/** Update department live status message, code, doctor, or token */
export async function updateDepartmentStatus(
  departmentId: string,
  updates: Partial<DepartmentLiveStatus>
): Promise<DepartmentLiveStatus> {
  const current = memoryState.departments[departmentId] || {
    departmentId,
    departmentName: departmentId,
    roomNumber: '1',
    floor: 0,
    building: 'Main Block',
    activeDoctorName: 'Doctor on Duty',
    currentToken: null,
    statusMessage: 'Operational',
    statusCode: 'normal' as DepartmentStatusCode,
    estimatedWaitPerPatientMinutes: 10,
    lastUpdated: new Date().toISOString(),
  };

  const updatedDept: DepartmentLiveStatus = {
    ...current,
    ...updates,
    lastUpdated: new Date().toISOString(),
  };

  let nextState: LiveStoreState = {
    ...memoryState,
    departments: {
      ...memoryState.departments,
      [departmentId]: updatedDept,
    },
  };

  nextState = recomputeDepartmentQueue(nextState, departmentId);
  commitState(nextState);

  const waiting = memoryState.queue.filter(
    (q) => q.departmentId === departmentId
  );
  void import('./emailService').then((mail) => {
    if (
      updates.activeDoctorName &&
      current.activeDoctorName !== updatedDept.activeDoctorName
    ) {
      mail.notifyDoctorChange(
        waiting,
        deptMailContext(updatedDept),
        current.activeDoctorName
      );
    }
    if (updates.roomNumber && current.roomNumber !== updatedDept.roomNumber) {
      mail.notifyRoomChange(
        waiting,
        deptMailContext(updatedDept),
        current.roomNumber
      );
    }
    if (
      updatedDept.statusCode === 'delayed' &&
      (updatedDept.delayMinutes || 0) >= 20 &&
      (current.delayMinutes !== updatedDept.delayMinutes ||
        current.statusCode !== 'delayed')
    ) {
      mail.notifyDepartmentDelay(waiting, deptMailContext(updatedDept));
    }
  });

  return updatedDept;
}

/** Set department estimated wait time per patient or delay */
export async function setDepartmentWaitTime(
  departmentId: string,
  waitPerPatientMinutes: number,
  delayMinutes?: number
): Promise<void> {
  await updateDepartmentStatus(departmentId, {
    estimatedWaitPerPatientMinutes: Math.max(0, waitPerPatientMinutes),
    delayMinutes:
      delayMinutes !== undefined ? Math.max(0, delayMinutes) : undefined,
  });
}

/** Set custom status message and status code (break, delayed, busy, normal, emergency) */
export async function setDepartmentCustomStatus(
  departmentId: string,
  statusMessage: string,
  statusCode: DepartmentStatusCode,
  options?: { breakUntil?: string; delayMinutes?: number }
): Promise<void> {
  await updateDepartmentStatus(departmentId, {
    statusMessage,
    statusCode,
    breakUntil: options?.breakUntil,
    delayMinutes: options?.delayMinutes,
  });
}

/** Advance queue: complete current token and call the next waiting patient */
export async function callNextPatient(
  departmentId: string
): Promise<{ completedToken: string | null; nextToken: string | null }> {
  const previousQueue = memoryState.queue;
  const dept = memoryState.departments[departmentId];
  const currentToken = dept?.currentToken || null;

  // Find next waiting patient
  const waitingPatients = memoryState.queue.filter(
    (q) =>
      q.departmentId === departmentId &&
      (q.status === 'waiting' || q.status === 'turn_soon')
  );

  const nextPatient = waitingPatients[0] || null;

  const updatedQueue = memoryState.queue.map((entry) => {
    if (entry.departmentId !== departmentId) return entry;

    // Complete the previous in_progress patient
    if (entry.token === currentToken && entry.status === 'in_progress') {
      return {
        ...entry,
        status: 'completed' as QueueStatus,
        position: 0,
        estimatedWaitMinutes: 0,
      };
    }

    // Mark next patient as in_progress
    if (nextPatient && entry.id === nextPatient.id) {
      return {
        ...entry,
        status: 'in_progress' as QueueStatus,
        position: 0,
        estimatedWaitMinutes: 0,
        calledAt: new Date().toISOString(),
      };
    }

    return entry;
  });

  const updatedDept: DepartmentLiveStatus = {
    ...(dept || {
      departmentId,
      departmentName: departmentId,
      roomNumber: '1',
      floor: 0,
      building: 'Main',
      activeDoctorName: 'Doctor on Duty',
      estimatedWaitPerPatientMinutes: 10,
      lastUpdated: new Date().toISOString(),
    }),
    currentToken: nextPatient ? nextPatient.token : null,
    statusMessage: nextPatient
      ? 'Doctor with another patient'
      : 'Consultations running on time',
    statusCode: nextPatient ? 'busy' : 'normal',
    lastUpdated: new Date().toISOString(),
  };

  let nextState: LiveStoreState = {
    ...memoryState,
    departments: {
      ...memoryState.departments,
      [departmentId]: updatedDept,
    },
    queue: updatedQueue,
  };

  nextState = recomputeDepartmentQueue(nextState, departmentId);
  commitState(nextState);
  fireQueueActivityEmails(previousQueue, departmentId);

  // Trigger notification if consultation completed
  if (currentToken) {
    addNotification({
      type: 'completed',
      title: 'Your consultation is complete',
      message: `Consultation for token ${currentToken} is marked done. Next steps: collect medicines and lab reports.`,
      actionUrl: '/patient/completion',
      actionLabel: 'View Next Steps',
      token: currentToken,
      departmentId,
    });
    const completedEntry = previousQueue.find((q) => q.token === currentToken);
    const liveDept = memoryState.departments[departmentId];
    if (completedEntry && liveDept) {
      void import('./emailService').then((mail) =>
        mail.notifyVisitCompleted(completedEntry, deptMailContext(liveDept))
      );
    }
  }

  // Trigger notification if a waiting patient is now next in line (turn_soon)
  const upNextPatient = nextState.queue.find(
    (q) =>
      q.departmentId === departmentId &&
      q.position === 1 &&
      q.status === 'turn_soon'
  );
  if (upNextPatient) {
    const roomTarget = updatedDept.roomNumber
      ? updatedDept.roomNumber.toLowerCase().startsWith('room')
        ? updatedDept.roomNumber
        : `Room ${updatedDept.roomNumber}`
      : 'the consultation room';
    addNotification({
      type: 'turn_soon',
      title: 'Your turn is coming',
      message: `Token ${upNextPatient.token}: You are next in line! Please wait near ${roomTarget}.`,
      actionUrl: `/patient/live?token=${upNextPatient.token}&dept=${departmentId}`,
      actionLabel: 'View Live Room Status',
      token: upNextPatient.token,
      departmentId,
    });
  }

  return {
    completedToken: currentToken,
    nextToken: nextPatient ? nextPatient.token : null,
  };
}

/** Set an individual queue entry status directly */
export async function updateQueueEntryStatus(
  token: string,
  status: QueueStatus
): Promise<QueueEntry | null> {
  const entry = memoryState.queue.find(
    (q) => q.token.toUpperCase() === token.toUpperCase()
  );
  if (!entry) return null;
  const previousQueue = memoryState.queue;

  const updatedQueue = memoryState.queue.map((q) => {
    if (q.token.toUpperCase() === token.toUpperCase()) {
      return {
        ...q,
        status,
        position:
          status === 'in_progress' || status === 'completed' ? 0 : q.position,
        estimatedWaitMinutes:
          status === 'in_progress' || status === 'completed'
            ? 0
            : q.estimatedWaitMinutes,
      };
    }
    return q;
  });

  let nextState: LiveStoreState = {
    ...memoryState,
    queue: updatedQueue,
  };

  nextState = recomputeDepartmentQueue(nextState, entry.departmentId);
  commitState(nextState);
  fireQueueActivityEmails(previousQueue, entry.departmentId);

  // Trigger relevant notification on status update
  if (status === 'completed') {
    addNotification({
      type: 'completed',
      title: 'Your consultation is complete',
      message: `Consultation for token ${token} is marked done. Next steps: collect medicines and lab reports.`,
      actionUrl: '/patient/completion',
      actionLabel: 'View Next Steps',
      token,
      departmentId: entry.departmentId,
    });
    const liveDept = memoryState.departments[entry.departmentId];
    if (liveDept) {
      void import('./emailService').then((mail) =>
        mail.notifyVisitCompleted(entry, deptMailContext(liveDept))
      );
    }
  } else if (status === 'turn_soon') {
    addNotification({
      type: 'turn_soon',
      title: 'Your turn is coming',
      message: `Token ${token}: You are next in line! Please wait near the consultation room.`,
      actionUrl: `/patient/live?token=${token}&dept=${entry.departmentId}`,
      actionLabel: 'View Live Status',
      token,
      departmentId: entry.departmentId,
    });
  }

  return (
    nextState.queue.find(
      (q) => q.token.toUpperCase() === token.toUpperCase()
    ) || null
  );
}

/** Start a patient consultation directly (marks in_progress, updates dept token & status) */
export async function startPatientConsultation(token: string): Promise<void> {
  const norm = token.toUpperCase();
  const entry = memoryState.queue.find((q) => q.token.toUpperCase() === norm);
  if (!entry) return;
  const previousQueue = memoryState.queue;

  const dept = memoryState.departments[entry.departmentId];
  const prevCurrentToken = dept?.currentToken;

  const updatedQueue = memoryState.queue.map((q) => {
    if (q.departmentId !== entry.departmentId) return q;

    // Previous in_progress patient is completed
    if (
      prevCurrentToken &&
      q.token.toUpperCase() === prevCurrentToken.toUpperCase() &&
      q.status === 'in_progress'
    ) {
      return {
        ...q,
        status: 'completed' as QueueStatus,
        position: 0,
        estimatedWaitMinutes: 0,
      };
    }

    // Target patient becomes in_progress
    if (q.token.toUpperCase() === norm) {
      return {
        ...q,
        status: 'in_progress' as QueueStatus,
        position: 0,
        estimatedWaitMinutes: 0,
        calledAt: new Date().toISOString(),
      };
    }

    return q;
  });

  const updatedDept: DepartmentLiveStatus = {
    ...(dept || {
      departmentId: entry.departmentId,
      departmentName: entry.departmentId,
      roomNumber: entry.roomNumber || '101',
      floor: 0,
      building: 'Main Block',
      activeDoctorName: 'Doctor on Duty',
      estimatedWaitPerPatientMinutes: 10,
      lastUpdated: new Date().toISOString(),
    }),
    currentToken: entry.token,
    statusMessage: 'Doctor with another patient',
    statusCode: 'busy',
    lastUpdated: new Date().toISOString(),
  };

  let nextState: LiveStoreState = {
    ...memoryState,
    departments: {
      ...memoryState.departments,
      [entry.departmentId]: updatedDept,
    },
    queue: updatedQueue,
  };

  nextState = recomputeDepartmentQueue(nextState, entry.departmentId);
  commitState(nextState);
  fireQueueActivityEmails(previousQueue, entry.departmentId);

  // Send completed notification for previous patient if any
  if (prevCurrentToken && prevCurrentToken.toUpperCase() !== norm) {
    addNotification({
      type: 'completed',
      title: 'Your consultation is complete',
      message: `Consultation for token ${prevCurrentToken} is marked done. Next steps: collect medicines and lab reports.`,
      actionUrl: '/patient/completion',
      actionLabel: 'View Next Steps',
      token: prevCurrentToken,
      departmentId: entry.departmentId,
    });
    const prevEntry = previousQueue.find(
      (q) => q.token.toUpperCase() === prevCurrentToken.toUpperCase()
    );
    const liveDept = memoryState.departments[entry.departmentId];
    if (prevEntry && liveDept) {
      void import('./emailService').then((mail) =>
        mail.notifyVisitCompleted(prevEntry, deptMailContext(liveDept))
      );
    }
  }
}

/** Complete a patient consultation (marks completed, triggers completion notification) */
export async function completePatientConsultation(
  token: string
): Promise<void> {
  const norm = token.toUpperCase();
  const entry = memoryState.queue.find((q) => q.token.toUpperCase() === norm);
  if (!entry) return;
  const previousQueue = memoryState.queue;

  const dept = memoryState.departments[entry.departmentId];
  const isCurrentToken = dept?.currentToken?.toUpperCase() === norm;

  const updatedQueue = memoryState.queue.map((q) => {
    if (q.token.toUpperCase() === norm) {
      return {
        ...q,
        status: 'completed' as QueueStatus,
        position: 0,
        estimatedWaitMinutes: 0,
      };
    }
    return q;
  });

  const updatedDept: DepartmentLiveStatus = {
    ...(dept || {
      departmentId: entry.departmentId,
      departmentName: entry.departmentId,
      roomNumber: '1',
      floor: 0,
      building: 'Main Block',
      activeDoctorName: 'Doctor on Duty',
      estimatedWaitPerPatientMinutes: 10,
      lastUpdated: new Date().toISOString(),
    }),
    currentToken: isCurrentToken ? null : dept?.currentToken || null,
    statusMessage: isCurrentToken
      ? 'Consultations running on schedule'
      : dept?.statusMessage || 'Operational',
    statusCode: isCurrentToken ? 'normal' : dept?.statusCode || 'normal',
    lastUpdated: new Date().toISOString(),
  };

  let nextState: LiveStoreState = {
    ...memoryState,
    departments: {
      ...memoryState.departments,
      [entry.departmentId]: updatedDept,
    },
    queue: updatedQueue,
  };

  nextState = recomputeDepartmentQueue(nextState, entry.departmentId);
  commitState(nextState);
  fireQueueActivityEmails(previousQueue, entry.departmentId);

  // Trigger patient completion notification
  addNotification({
    type: 'completed',
    title: 'Your consultation is complete',
    message: `Consultation for token ${entry.token} is marked done. Next steps: pharmacy & test reports.`,
    actionUrl: '/patient/completion',
    actionLabel: 'View Next Steps',
    token: entry.token,
    departmentId: entry.departmentId,
  });
  const liveDept = memoryState.departments[entry.departmentId];
  if (liveDept) {
    void import('./emailService').then((mail) =>
      mail.notifyVisitCompleted(entry, deptMailContext(liveDept))
    );
  }
}

/** Postpone a patient in the queue */
export async function postponePatient(
  token: string,
  spotsDown: number = 2
): Promise<void> {
  const norm = token.toUpperCase();
  const entry = memoryState.queue.find((q) => q.token.toUpperCase() === norm);
  if (!entry || entry.status === 'in_progress' || entry.status === 'completed')
    return;
  const previousQueue = memoryState.queue;

  const deptWaiting = memoryState.queue.filter(
    (q) =>
      q.departmentId === entry.departmentId &&
      (q.status === 'waiting' || q.status === 'turn_soon')
  );

  const currentIndex = deptWaiting.findIndex(
    (q) => q.token.toUpperCase() === norm
  );
  if (currentIndex === -1 || currentIndex === deptWaiting.length - 1) return;

  const targetIndex = Math.min(
    deptWaiting.length - 1,
    currentIndex + spotsDown
  );
  const reordered = [...deptWaiting];
  const [removed] = reordered.splice(currentIndex, 1);
  reordered.splice(targetIndex, 0, removed);

  const otherEntries = memoryState.queue.filter(
    (q) =>
      q.departmentId !== entry.departmentId ||
      (q.status !== 'waiting' && q.status !== 'turn_soon')
  );

  let nextState: LiveStoreState = {
    ...memoryState,
    queue: [...otherEntries, ...reordered],
  };

  nextState = recomputeDepartmentQueue(nextState, entry.departmentId);
  commitState(nextState);
  fireQueueActivityEmails(previousQueue, entry.departmentId);
}

/** Move a patient up or down by 1 in the waiting queue */
export async function movePatientQueue(
  token: string,
  direction: 'up' | 'down'
): Promise<void> {
  const norm = token.toUpperCase();
  const entry = memoryState.queue.find((q) => q.token.toUpperCase() === norm);
  if (!entry || entry.status === 'in_progress' || entry.status === 'completed')
    return;
  const previousQueue = memoryState.queue;

  const deptWaiting = memoryState.queue.filter(
    (q) =>
      q.departmentId === entry.departmentId &&
      (q.status === 'waiting' || q.status === 'turn_soon')
  );

  const idx = deptWaiting.findIndex((q) => q.token.toUpperCase() === norm);
  if (idx === -1) return;
  if (direction === 'up' && idx === 0) return;
  if (direction === 'down' && idx === deptWaiting.length - 1) return;

  const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
  const reordered = [...deptWaiting];
  const temp = reordered[idx];
  reordered[idx] = reordered[targetIdx];
  reordered[targetIdx] = temp;

  const otherEntries = memoryState.queue.filter(
    (q) =>
      q.departmentId !== entry.departmentId ||
      (q.status !== 'waiting' && q.status !== 'turn_soon')
  );

  let nextState: LiveStoreState = {
    ...memoryState,
    queue: [...otherEntries, ...reordered],
  };

  nextState = recomputeDepartmentQueue(nextState, entry.departmentId);
  commitState(nextState);
  fireQueueActivityEmails(previousQueue, entry.departmentId);
  if (direction === 'up') {
    const moved = memoryState.queue.find((q) => q.token.toUpperCase() === norm);
    if (moved) {
      void import('./emailService').then((mail) =>
        mail.notifyPriorityApplied(moved)
      );
    }
  }
}

/** Mark a called patient as not present and keep the slip valid */
export async function markPatientMissed(token: string): Promise<void> {
  const norm = token.toUpperCase();
  const entry = memoryState.queue.find((q) => q.token.toUpperCase() === norm);
  if (!entry || entry.status !== 'in_progress') return;
  const previousQueue = memoryState.queue;
  const dept = memoryState.departments[entry.departmentId];
  const calledAt = entry.calledAt;

  const waiting = memoryState.queue.filter(
    (q) =>
      q.departmentId === entry.departmentId &&
      (q.status === 'waiting' || q.status === 'turn_soon') &&
      q.token.toUpperCase() !== norm
  );
  const nextPatient = waiting[0];
  const others = memoryState.queue.filter(
    (q) =>
      q.departmentId !== entry.departmentId && q.token.toUpperCase() !== norm
  );

  const missedEntry: QueueEntry = {
    ...entry,
    status: 'waiting',
    position: 2,
  };

  const startedNext = nextPatient
    ? {
        ...nextPatient,
        status: 'in_progress' as QueueStatus,
        position: 0,
        estimatedWaitMinutes: 0,
        calledAt: new Date().toISOString(),
      }
    : null;

  const remainingWaiting = nextPatient ? waiting.slice(1) : waiting;

  let nextState: LiveStoreState = {
    ...memoryState,
    queue: [
      ...others.filter((q) => q.departmentId !== entry.departmentId),
      ...memoryState.queue.filter(
        (q) =>
          q.departmentId === entry.departmentId &&
          q.status !== 'waiting' &&
          q.status !== 'turn_soon' &&
          q.status !== 'in_progress'
      ),
      ...(startedNext ? [startedNext] : []),
      missedEntry,
      ...remainingWaiting,
    ],
    departments: dept
      ? {
          ...memoryState.departments,
          [entry.departmentId]: {
            ...dept,
            currentToken: startedNext ? startedNext.token : null,
            statusMessage: startedNext
              ? 'Doctor with another patient'
              : 'Consultations running on time',
            statusCode: startedNext ? 'busy' : 'normal',
            lastUpdated: new Date().toISOString(),
          },
        }
      : memoryState.departments,
  };

  nextState = recomputeDepartmentQueue(nextState, entry.departmentId);
  commitState(nextState);
  fireQueueActivityEmails(previousQueue, entry.departmentId);
  if (dept) {
    void import('./emailService').then((mail) =>
      mail.notifyMissedTurn(entry, deptMailContext(dept), calledAt)
    );
  }
}

/** Route a patient to lab, X-ray, or pharmacy during the visit */
export async function routePatientOnward(
  token: string,
  locationName: string
): Promise<void> {
  const entry = memoryState.queue.find(
    (q) => q.token.toUpperCase() === token.toUpperCase()
  );
  if (!entry) return;
  const dept = memoryState.departments[entry.departmentId];
  const floor = /lab|pathology/i.test(locationName)
    ? 'Basement'
    : /x-ray|radiology|scan/i.test(locationName)
      ? 'Floor 1'
      : 'Ground Floor';
  void import('./emailService').then((mail) =>
    mail.notifyNextStep(
      entry,
      locationName,
      floor,
      dept?.activeDoctorName || 'your doctor',
      12
    )
  );
}

/** Cancel a token and keep a record of the cancellation */
export async function cancelPatientToken(
  token: string
): Promise<QueueEntry | null> {
  const updated = await updateQueueEntryStatus(token, 'cancelled');
  return updated;
}

/** Acknowledge an emergency alert */
export async function acknowledgeEmergencyAlert(
  alertIdOrReqId: string
): Promise<void> {
  const nextState: LiveStoreState = {
    ...memoryState,
    emergencyRequests: (memoryState.emergencyRequests || []).map((req) =>
      req.id === alertIdOrReqId || alertIdOrReqId.includes(req.id)
        ? { ...req, status: 'responding' }
        : req
    ),
  };
  commitState(nextState);
}

/** Mark emergency alert as attended / resolved */
export async function resolveEmergencyAlert(
  alertIdOrReqId: string,
  actionTaken: string = 'provided emergency medical triage and stabilization'
): Promise<void> {
  const targetReq = (memoryState.emergencyRequests || []).find(
    (req) => req.id === alertIdOrReqId || alertIdOrReqId.includes(req.id)
  );

  const nextState: LiveStoreState = {
    ...memoryState,
    emergencyRequests: (memoryState.emergencyRequests || []).map((req) =>
      req.id === alertIdOrReqId || alertIdOrReqId.includes(req.id)
        ? { ...req, status: 'resolved' }
        : req
    ),
    alerts: (memoryState.alerts || []).map((a) =>
      a.id === alertIdOrReqId ||
      a.id.includes(alertIdOrReqId) ||
      a.type === 'emergency'
        ? { ...a, active: false }
        : a
    ),
  };
  commitState(nextState);

  if (targetReq) {
    void import('./emailService').then((mail) =>
      mail.notifyUrgentClosed({
        token: targetReq.patientToken,
        patientName: targetReq.patientName,
        actionTaken,
      })
    );
  }
}

/** Publish a live hospital alert (emergency, delay, announcement) */
export async function publishLiveAlert(
  alert: Omit<LiveAlert, 'id' | 'timestamp'>
): Promise<LiveAlert> {
  const newAlert: LiveAlert = {
    ...alert,
    id: `alert-${Date.now()}`,
    timestamp: new Date().toISOString(),
  };

  const nextState: LiveStoreState = {
    ...memoryState,
    alerts: [newAlert, ...memoryState.alerts],
  };

  commitState(nextState);
  return newAlert;
}

/** Dismiss an active alert */
export async function dismissLiveAlert(alertId: string): Promise<void> {
  const nextState: LiveStoreState = {
    ...memoryState,
    alerts: memoryState.alerts.map((a) =>
      a.id === alertId ? { ...a, active: false } : a
    ),
  };
  commitState(nextState);
}

// ─── NOTIFICATION & EMERGENCY HELPERS ────────────────────────────────────────

/** Browser Notification API helper */
export function sendBrowserNotification(
  title: string,
  options?: { body?: string; icon?: string }
) {
  if (
    typeof window !== 'undefined' &&
    'Notification' in window &&
    Notification.permission === 'granted'
  ) {
    try {
      new Notification(title, {
        body: options?.body,
        icon: options?.icon || '/favicon.ico',
      });
    } catch (err) {
      console.warn('Failed to display browser notification', err);
    }
  }
}

/** In-page Toast Event Emitter */
export function emitNotificationToast(notification: PatientNotification) {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent('vd_toast_notification', { detail: notification })
    );
  }
}

/** Request Browser Notification Permission */
export async function requestBrowserNotificationPermission(): Promise<
  NotificationPermission | 'unsupported'
> {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'unsupported';
  }
  try {
    const perm = await Notification.requestPermission();
    return perm;
  } catch {
    return 'denied';
  }
}

/** Add a new notification, dispatching toast and browser push if enabled */
export async function addNotification(
  params: Omit<PatientNotification, 'id' | 'timestamp' | 'read'>
): Promise<PatientNotification> {
  const notif: PatientNotification = {
    ...params,
    id: `notif-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    timestamp: new Date().toISOString(),
    read: false,
  };

  const nextState: LiveStoreState = {
    ...memoryState,
    notifications: [notif, ...(memoryState.notifications || [])],
  };

  commitState(nextState);

  // Trigger in-app toast & browser push notification
  emitNotificationToast(notif);
  sendBrowserNotification(notif.title, { body: notif.message });

  return notif;
}

/** Mark notification as read */
export async function markNotificationAsRead(id: string): Promise<void> {
  const nextState: LiveStoreState = {
    ...memoryState,
    notifications: (memoryState.notifications || []).map((n) =>
      n.id === id ? { ...n, read: true } : n
    ),
  };
  commitState(nextState);
}

/** Mark all notifications as read */
export async function markAllNotificationsAsRead(): Promise<void> {
  const nextState: LiveStoreState = {
    ...memoryState,
    notifications: (memoryState.notifications || []).map((n) => ({
      ...n,
      read: true,
    })),
  };
  commitState(nextState);
}

/** Clear all notifications */
export async function clearAllNotifications(): Promise<void> {
  const nextState: LiveStoreState = {
    ...memoryState,
    notifications: [],
  };
  commitState(nextState);
}

/** Create and record an emergency request from patient */
export async function createEmergencyAlert(params: {
  symptoms: string[];
  note?: string;
  landmark: string;
  patientToken?: string;
  patientName?: string;
}): Promise<EmergencyRequest> {
  const newReq: EmergencyRequest = {
    id: `emg-${Date.now()}`,
    symptoms: params.symptoms,
    note: params.note,
    landmark: params.landmark,
    patientToken: params.patientToken,
    patientName: params.patientName,
    status: 'alerted',
    timestamp: new Date().toISOString(),
  };

  const symptomList =
    params.symptoms.length > 0
      ? params.symptoms.join(', ')
      : 'Urgent medical distress';
  const alertTitle = `URGENT PATIENT ALERT: ${params.landmark}`;
  const alertMsg = `Patient ${params.patientName || params.patientToken || 'in distress'} at ${params.landmark}: ${symptomList}.${params.note ? ` Note: "${params.note}"` : ''}`;

  const newAlert: LiveAlert = {
    id: `alert-emg-${Date.now()}`,
    type: 'emergency',
    title: alertTitle,
    message: alertMsg,
    active: true,
    timestamp: new Date().toISOString(),
  };

  const notif: PatientNotification = {
    id: `notif-emg-${Date.now()}`,
    type: 'emergency',
    title: 'Staff have been alerted',
    message: `Hospital rapid response notified for ${params.landmark}. Please stay where you are or sit nearby.`,
    timestamp: new Date().toISOString(),
    read: false,
    actionUrl: '/patient/emergency',
    actionLabel: 'View Emergency Status',
  };

  const nextState: LiveStoreState = {
    ...memoryState,
    emergencyRequests: [newReq, ...(memoryState.emergencyRequests || [])],
    alerts: [newAlert, ...memoryState.alerts],
    notifications: [notif, ...(memoryState.notifications || [])],
  };

  commitState(nextState);
  emitNotificationToast(notif);
  sendBrowserNotification('Staff Alerted: Immediate Response Dispatched', {
    body: 'Medical staff have been alerted to your location. Please stay where you are.',
  });

  return newReq;
}

/** Reset live store back to default mock data */
export async function resetLiveStore(): Promise<LiveStoreState> {
  const defaultState: LiveStoreState = normalizeHospitalState({
    queue: INITIAL_QUEUE,
    departments: INITIAL_DEPARTMENTS,
    alerts: INITIAL_ALERTS,
    emergencyRequests: INITIAL_EMERGENCY_REQUESTS,
    notifications: INITIAL_NOTIFICATIONS,
    lastUpdated: new Date().toISOString(),
  });

  commitState(defaultState);
  return defaultState;
}

// ─── REACT HOOKS ─────────────────────────────────────────────────────────────

/**
 * useLiveStore: Main hook that subscribes to real-time changes
 * across tabs via BroadcastChannel & localStorage
 */
export function useLiveStore() {
  const [state, setState] = useState<LiveStoreState>(() => memoryState);

  useEffect(() => {
    setState(memoryState);
    const unsubscribe = subscribeToLiveStore((newState) => {
      setState(newState);
    });
    return unsubscribe;
  }, []);

  const updateDept = useCallback(
    (deptId: string, updates: Partial<DepartmentLiveStatus>) =>
      updateDepartmentStatus(deptId, updates),
    []
  );

  const setWaitTime = useCallback(
    (deptId: string, wait: number, delay?: number) =>
      setDepartmentWaitTime(deptId, wait, delay),
    []
  );

  const setCustomStatus = useCallback(
    (
      deptId: string,
      msg: string,
      code: DepartmentStatusCode,
      opts?: { breakUntil?: string; delayMinutes?: number }
    ) => setDepartmentCustomStatus(deptId, msg, code, opts),
    []
  );

  const callNext = useCallback((deptId: string) => callNextPatient(deptId), []);

  const updateEntry = useCallback(
    (token: string, status: QueueStatus) =>
      updateQueueEntryStatus(token, status),
    []
  );

  const publishAlert = useCallback(
    (alert: Omit<LiveAlert, 'id' | 'timestamp'>) => publishLiveAlert(alert),
    []
  );

  const dismissAlert = useCallback((id: string) => dismissLiveAlert(id), []);

  const startConsult = useCallback(
    (token: string) => startPatientConsultation(token),
    []
  );
  const completeConsult = useCallback(
    (token: string) => completePatientConsultation(token),
    []
  );
  const postpone = useCallback(
    (token: string, spots?: number) => postponePatient(token, spots),
    []
  );
  const moveQueue = useCallback(
    (token: string, dir: 'up' | 'down') => movePatientQueue(token, dir),
    []
  );
  const markMissed = useCallback(
    (token: string) => markPatientMissed(token),
    []
  );
  const routeOnward = useCallback(
    (token: string, loc: string) => routePatientOnward(token, loc),
    []
  );
  const cancelToken = useCallback(
    (token: string) => cancelPatientToken(token),
    []
  );
  const ackEmergency = useCallback(
    (id: string) => acknowledgeEmergencyAlert(id),
    []
  );
  const resEmergency = useCallback(
    (id: string, action?: string) => resolveEmergencyAlert(id, action),
    []
  );

  const reset = useCallback(() => resetLiveStore(), []);

  return {
    state,
    updateDepartmentStatus: updateDept,
    setDepartmentWaitTime: setWaitTime,
    setDepartmentCustomStatus: setCustomStatus,
    callNextPatient: callNext,
    updateQueueEntryStatus: updateEntry,
    startPatientConsultation: startConsult,
    completePatientConsultation: completeConsult,
    postponePatient: postpone,
    movePatientQueue: moveQueue,
    markPatientMissed: markMissed,
    routePatientOnward: routeOnward,
    cancelPatientToken: cancelToken,
    acknowledgeEmergencyAlert: ackEmergency,
    resolveEmergencyAlert: resEmergency,
    publishLiveAlert: publishAlert,
    dismissLiveAlert: dismissAlert,
    resetLiveStore: reset,
  };
}

/**
 * usePatientLiveStatus: Specialized hook for patient view (SlipPage, PatientLivePage).
 * Subscribes to real-time updates for a specific token and department.
 */
export function usePatientLiveStatus(token?: string, departmentId?: string) {
  const [liveData, setLiveData] = useState(() => ({
    queueEntry: null as QueueEntry | null,
    department: null as DepartmentLiveStatus | null,
    peopleAhead: 1,
    estimatedWaitMinutes: 15,
    status: 'waiting' as QueueStatus,
    nowServingToken: null as string | null,
    activeAlerts: [] as LiveAlert[],
    lastUpdated: memoryState.lastUpdated,
  }));

  const evaluateStatus = useCallback(() => {
    if (!token && !departmentId) return;

    const norm = token ? token.trim().toUpperCase() : '';
    const queueEntry =
      memoryState.queue.find((q) => q.token.toUpperCase() === norm) || null;

    const targetDeptId =
      getDepartment(queueEntry?.departmentId || departmentId)?.id ||
      'opd-general-2';
    const dept = memoryState.departments[targetDeptId] || null;

    let peopleAhead = 0;
    let estimatedWaitMinutes = 15;
    let status: QueueStatus = 'waiting';

    if (queueEntry) {
      status = queueEntry.status;
      peopleAhead = Math.max(0, queueEntry.position - 1);
      estimatedWaitMinutes = queueEntry.estimatedWaitMinutes;
    } else if (dept) {
      peopleAhead = 1;
      estimatedWaitMinutes =
        dept.estimatedWaitPerPatientMinutes + (dept.delayMinutes || 0);
      if (dept.statusCode === 'emergency') {
        estimatedWaitMinutes = 0;
        status = 'in_progress';
      }
    }

    const activeAlerts = memoryState.alerts.filter(
      (a) => a.active && (!a.departmentId || a.departmentId === targetDeptId)
    );

    setLiveData({
      queueEntry,
      department: dept,
      peopleAhead,
      estimatedWaitMinutes,
      status,
      nowServingToken: dept?.currentToken || null,
      activeAlerts,
      lastUpdated: memoryState.lastUpdated,
    });
  }, [token, departmentId]);

  useEffect(() => {
    evaluateStatus();
    const unsubscribe = subscribeToLiveStore(() => {
      evaluateStatus();
    });
    return unsubscribe;
  }, [evaluateStatus]);

  return liveData;
}

/**
 * useNotifications: Hook to access live notification state,
 * unread count, mark as read, and browser push permission.
 */
export function useNotifications() {
  const [notifications, setNotifications] = useState<PatientNotification[]>(
    () => memoryState.notifications || []
  );

  useEffect(() => {
    setNotifications(memoryState.notifications || []);
    const unsubscribe = subscribeToLiveStore((newState) => {
      setNotifications(newState.notifications || []);
    });
    return unsubscribe;
  }, []);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const markAsRead = useCallback(
    (id: string) => markNotificationAsRead(id),
    []
  );

  const markAllAsRead = useCallback(() => markAllNotificationsAsRead(), []);

  const clearAll = useCallback(() => clearAllNotifications(), []);

  const requestPermission = useCallback(
    () => requestBrowserNotificationPermission(),
    []
  );

  const sendTest = useCallback((type: NotificationTriggerType) => {
    if (type === 'turn_soon') {
      return addNotification({
        type: 'turn_soon',
        title: 'Your turn is coming',
        message:
          'Token CARD-1042: You are next in line! Please proceed to Room 2 (General Medicine).',
        actionUrl: '/patient/live?token=CARD-1042&dept=opd-general-2',
        actionLabel: 'View Live Room Status',
        token: 'CARD-1042',
      });
    } else if (type === 'completed') {
      return addNotification({
        type: 'completed',
        title: 'Your consultation is complete',
        message:
          'Your consultation with Dr. S. Sharma is complete. Next steps: collect medicines and reports.',
        actionUrl: '/patient/completion',
        actionLabel: 'View Next Steps',
        token: 'CARD-1042',
      });
    } else {
      return addNotification({
        type: 'report_ready',
        title: 'Your lab report is ready',
        message:
          'Pathology Lab: Complete Blood Count & Lipid Profile report is ready for download.',
        actionUrl: '/patient/history',
        actionLabel: 'View Report',
      });
    }
  }, []);

  return {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    clearAll,
    requestPermission,
    sendTestNotification: sendTest,
  };
}
