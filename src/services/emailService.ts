export const HOSPITAL_EMAIL_DEFAULTS = {
  hospital_name: 'Civil Hospital Nagpur',
  helpline: '1800-123-4567',
  app_name: 'Vaid Disha',
  counter_location: 'Main OPD Registration Counter, Ground Floor',
  emergency_number: '108',
  pharmacy_counter: 'Pharmacy (G-04)',
  grace_minutes: '15',
  radius_minutes: '20',
};

export const TURN_AHEAD_THRESHOLD = 5;
export const DELAY_EMAIL_MINUTES = 20;

export type ActivityEmailEvent =
  | 'email_verification'
  | 'registration_complete'
  | 'opd_slip_confirmation'
  | 'visit_reminder'
  | 'turn_approaching'
  | 'turn_now'
  | 'missed_turn'
  | 'priority_applied'
  | 'delay'
  | 'doctor_unavailable'
  | 'room_change'
  | 'next_step'
  | 'reports_ready'
  | 'visit_completed'
  | 'follow_up_reminder'
  | 'cancellation_confirmed'
  | 'token_shared'
  | 'urgent_visit_record';

const CONTACTS_KEY = 'vd-token-contacts';
const SENT_KEY = 'vd-email-sent';
const REMINDERS_KEY = 'vd-email-reminders';
const AUTH_KEY = 'vd-auth-user';

import { logSupabaseAttendant, logSupabaseEmail } from './supabaseClient';

export interface TokenContact {
  email: string;
  patientName: string;
  token: string;
  department?: string;
  doctorName?: string;
  room?: string;
  floor?: string;
  slipId?: string;
  attendantEmails?: string[];
}

export interface ScheduledEmail {
  id: string;
  event: ActivityEmailEvent;
  fireAt: number;
  to: string;
  vars: Record<string, string>;
  idempotencyKey: string;
}

function apiBase() {
  const envUrl = (import.meta.env.VITE_API_BASE_URL || '').trim();
  if (!envUrl) return '/api';
  // If envUrl points directly to port 8787 but the page is served on localhost:5173,
  // route via relative /api so Vite's built-in email middleware handles it directly.
  if (
    typeof window !== 'undefined' &&
    window.location.hostname === 'localhost' &&
    envUrl.includes('localhost:8787')
  ) {
    return '/api';
  }
  return envUrl.replace(/\/$/, '');
}

export function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

function readJson<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function writeJson(key: string, value: unknown) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // ignore quota
  }
}

export function formatFloor(floor?: number | string | null): string {
  if (floor === 0 || floor === '0') return 'Ground Floor';
  if (floor === undefined || floor === null || floor === '')
    return 'Ground Floor';
  const asNumber = Number(floor);
  if (!Number.isNaN(asNumber) && asNumber === 0) return 'Ground Floor';
  return `Floor ${floor}`;
}

export function formatClock(date: Date): string {
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export function formatDate(date: Date): string {
  return date.toLocaleDateString([], {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export function appOrigin(): string {
  if (typeof window === 'undefined') return '';
  return window.location.origin;
}

export function getLoggedInPatientEmail(): string | null {
  const user = readJson<{ email?: string } | null>(AUTH_KEY, null);
  const email = user?.email?.trim().toLowerCase();
  return email && isValidEmail(email) ? email : null;
}

export function rememberTokenContact(contact: TokenContact) {
  const all = readJson<Record<string, TokenContact>>(CONTACTS_KEY, {});
  const key = contact.token.toUpperCase();
  const previous = all[key] || { attendantEmails: [] };
  all[key] = {
    ...previous,
    ...contact,
    token: key,
    email: contact.email.trim().toLowerCase(),
    attendantEmails: Array.from(
      new Set([
        ...(previous.attendantEmails || []),
        ...(contact.attendantEmails || []),
      ])
    ),
  };
  writeJson(CONTACTS_KEY, all);
}

export function getTokenContact(token?: string | null): TokenContact | null {
  if (!token) return null;
  const all = readJson<Record<string, TokenContact>>(CONTACTS_KEY, {});
  return all[token.toUpperCase()] || null;
}

export function addAttendantEmail(token: string, email: string) {
  const contact = getTokenContact(token);
  if (!contact) return;
  const cleanEmail = email.trim().toLowerCase();
  rememberTokenContact({
    ...contact,
    attendantEmails: [...(contact.attendantEmails || []), cleanEmail],
  });
  logSupabaseAttendant(token, contact.patientName, contact.email, cleanEmail);
}

function recipientsForToken(token?: string | null, extraTo?: string): string[] {
  const contact = getTokenContact(token);
  const emails = new Set<string>();
  if (extraTo && isValidEmail(extraTo))
    emails.add(extraTo.trim().toLowerCase());
  if (contact?.email && isValidEmail(contact.email)) emails.add(contact.email);
  for (const attendant of contact?.attendantEmails || []) {
    if (isValidEmail(attendant)) emails.add(attendant);
  }
  if (emails.size === 0) {
    const loggedIn = getLoggedInPatientEmail();
    if (loggedIn) emails.add(loggedIn);
  }
  return Array.from(emails);
}

function wasSent(key: string): boolean {
  const log = readJson<Record<string, number>>(SENT_KEY, {});
  return Boolean(log[key]);
}

function markSent(key: string) {
  const log = readJson<Record<string, number>>(SENT_KEY, {});
  log[key] = Date.now();
  writeJson(SENT_KEY, log);
}

async function postJson(path: string, body: unknown) {
  const response = await fetch(`${apiBase()}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.error || `Email request failed (${response.status}).`);
  }
  return data;
}

export async function sendVerificationEmail(
  email: string,
  patientName?: string
) {
  if (!isValidEmail(email)) {
    throw new Error('Please enter a valid email address.');
  }
  return postJson('/email/send-otp', {
    email: email.trim().toLowerCase(),
    patientName: patientName || 'Patient',
  });
}

export async function verifyEmailOtp(email: string, otp: string) {
  return postJson('/email/verify-otp', {
    email: email.trim().toLowerCase(),
    otp: otp.trim(),
  });
}

export async function sendActivityEmail(options: {
  event: ActivityEmailEvent;
  to?: string;
  token?: string;
  vars?: Record<string, string | number | undefined>;
  idempotencyKey?: string;
  includeAttendants?: boolean;
}): Promise<boolean> {
  const { event, token, includeAttendants = true } = options;
  const idempotencyKey =
    options.idempotencyKey || `${event}:${token || options.to || ''}`;
  if (wasSent(idempotencyKey)) return false;

  const vars: Record<string, string> = { ...HOSPITAL_EMAIL_DEFAULTS };
  const contact = getTokenContact(token);
  if (contact) {
    vars.patient_name = contact.patientName;
    vars.token_no = contact.token;
    if (contact.department) vars.department = contact.department;
    if (contact.doctorName) vars.doctor_name = contact.doctorName;
    if (contact.room) vars.room = contact.room;
    if (contact.floor) vars.floor = contact.floor;
  }
  for (const [key, value] of Object.entries(options.vars || {})) {
    if (value !== undefined && value !== null && String(value).length > 0) {
      vars[key] = String(value);
    }
  }
  if (!vars.patient_name) vars.patient_name = 'Patient';

  const targets = includeAttendants
    ? recipientsForToken(token, options.to)
    : options.to
      ? [options.to.trim().toLowerCase()]
      : recipientsForToken(token).slice(0, 1);

  if (targets.length === 0) return false;

  try {
    await Promise.all(
      targets.map(async (to) => {
        const res = await postJson('/email/activity', {
          event,
          to,
          vars,
        });
        logSupabaseEmail(event, to, token, res?.id);
      })
    );
    markSent(idempotencyKey);
    return true;
  } catch (error) {
    console.warn(
      'Activity email failed:',
      error instanceof Error ? error.message : error
    );
    return false;
  }
}

export function scheduleActivityEmail(
  job: Omit<ScheduledEmail, 'id'> & { id?: string }
) {
  const reminders = readJson<ScheduledEmail[]>(REMINDERS_KEY, []);
  const next: ScheduledEmail = {
    ...job,
    id: job.id || `job-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
  };
  const exists = reminders.some(
    (item) => item.idempotencyKey === next.idempotencyKey
  );
  if (exists) return;
  reminders.push(next);
  writeJson(REMINDERS_KEY, reminders);
}

export async function flushDueActivityEmails() {
  const now = Date.now();
  const reminders = readJson<ScheduledEmail[]>(REMINDERS_KEY, []);
  const due = reminders.filter((item) => item.fireAt <= now);
  const pending = reminders.filter((item) => item.fireAt > now);
  writeJson(REMINDERS_KEY, pending);
  for (const job of due) {
    await sendActivityEmail({
      event: job.event,
      to: job.to,
      vars: job.vars,
      idempotencyKey: job.idempotencyKey,
      includeAttendants: false,
    });
  }
}

let reminderTimer: number | null = null;

export function startEmailReminderScheduler() {
  if (typeof window === 'undefined' || reminderTimer !== null) return;
  void flushDueActivityEmails();
  reminderTimer = window.setInterval(() => {
    void flushDueActivityEmails();
  }, 30_000);
}

export function scheduleVisitReminders(input: {
  token: string;
  email?: string;
  patientName: string;
  department: string;
  doctorName: string;
  expectedAt: Date;
  slipId?: string;
}) {
  const to =
    input.email ||
    getTokenContact(input.token)?.email ||
    getLoggedInPatientEmail();
  if (!to) return;

  const arrival = new Date(input.expectedAt.getTime() - 15 * 60 * 1000);
  const vars = {
    ...HOSPITAL_EMAIL_DEFAULTS,
    patient_name: input.patientName,
    token_no: input.token,
    department: input.department,
    doctor_name: input.doctorName,
    arrival_time: formatClock(arrival),
    cancel_link: `${appOrigin()}/patient/slip/${input.slipId || 'latest'}?cancel=1`,
  };

  const twoHoursBefore = input.expectedAt.getTime() - 2 * 60 * 60 * 1000;
  if (twoHoursBefore > Date.now() + 15_000) {
    scheduleActivityEmail({
      event: 'visit_reminder',
      fireAt: twoHoursBefore,
      to,
      vars: { ...vars, day_label: 'today' },
      idempotencyKey: `visit_reminder:2h:${input.token}`,
    });
  }

  const visitDay = new Date(input.expectedAt);
  visitDay.setHours(0, 0, 0, 0);
  const eveningBefore = new Date(visitDay.getTime() - 6 * 60 * 60 * 1000); // 6 PM previous day
  eveningBefore.setHours(18, 0, 0, 0);
  if (eveningBefore.getTime() > Date.now() + 15_000) {
    scheduleActivityEmail({
      event: 'visit_reminder',
      fireAt: eveningBefore.getTime(),
      to,
      vars: { ...vars, day_label: 'tomorrow' },
      idempotencyKey: `visit_reminder:eve:${input.token}`,
    });
  }
}

export function scheduleFollowUpReminder(input: {
  email?: string;
  patientName: string;
  doctorName: string;
  followUpDate: Date;
  token?: string;
}) {
  const to = input.email || getLoggedInPatientEmail();
  if (!to) return;
  const fireAt = new Date(input.followUpDate);
  fireAt.setDate(fireAt.getDate() - 1);
  fireAt.setHours(9, 0, 0, 0);
  if (fireAt.getTime() <= Date.now()) return;
  scheduleActivityEmail({
    event: 'follow_up_reminder',
    fireAt: fireAt.getTime(),
    to,
    vars: {
      patient_name: input.patientName,
      doctor_name: input.doctorName,
      follow_up_date: formatDate(input.followUpDate),
      booking_link: `${appOrigin()}/patient/visit`,
    },
    idempotencyKey: `follow_up_reminder:${input.token || to}:${formatDate(input.followUpDate)}`,
  });
}

export async function sendRegistrationCompleteEmail(input: {
  email: string;
  patientName: string;
  patientId: string;
}) {
  return sendActivityEmail({
    event: 'registration_complete',
    to: input.email,
    includeAttendants: false,
    vars: {
      patient_name: input.patientName,
      patient_id: input.patientId,
    },
    idempotencyKey: `registration_complete:${input.patientId}`,
  });
}

export async function sendOpdSlipEmail(input: {
  email?: string;
  patientName: string;
  token: string;
  department: string;
  doctorName: string;
  room: string;
  floor: string;
  date: string;
  etaStart: string;
  etaEnd: string;
  routeText: string;
  slipId: string;
}) {
  const statusLink = `${appOrigin()}/patient/live?token=${encodeURIComponent(input.token)}`;
  const storedEmail = input.email || getLoggedInPatientEmail();
  if (storedEmail) {
    rememberTokenContact({
      email: storedEmail,
      patientName: input.patientName,
      token: input.token,
      department: input.department,
      doctorName: input.doctorName,
      room: input.room,
      floor: input.floor,
      slipId: input.slipId,
    });
  }
  if (!storedEmail) return false;
  return sendActivityEmail({
    event: 'opd_slip_confirmation',
    token: input.token,
    to: input.email,
    vars: {
      patient_name: input.patientName,
      token_no: input.token,
      department: input.department,
      doctor_name: input.doctorName,
      room: input.room,
      floor: input.floor,
      date: input.date,
      eta_start: input.etaStart,
      eta_end: input.etaEnd,
      route_text: input.routeText,
      status_link: statusLink,
    },
    idempotencyKey: `opd_slip_confirmation:${input.token}`,
  });
}

export async function sendCancellationEmail(input: {
  token: string;
  date: string;
  doctorName: string;
  patientName?: string;
}) {
  return sendActivityEmail({
    event: 'cancellation_confirmed',
    token: input.token,
    vars: {
      patient_name: input.patientName,
      token_no: input.token,
      date: input.date,
      doctor_name: input.doctorName,
      booking_link: `${appOrigin()}/patient/visit`,
    },
    idempotencyKey: `cancellation_confirmed:${input.token}`,
  });
}

export async function sendTokenSharedEmail(input: {
  token: string;
  attendantEmail: string;
  patientName: string;
  doctorName: string;
}) {
  if (!isValidEmail(input.attendantEmail)) {
    throw new Error('Enter a valid attendant email address.');
  }
  addAttendantEmail(input.token, input.attendantEmail);
  return sendActivityEmail({
    event: 'token_shared',
    to: input.attendantEmail.trim().toLowerCase(),
    includeAttendants: false,
    token: input.token,
    vars: {
      patient_name: input.patientName,
      token_no: input.token,
      doctor_name: input.doctorName,
      status_link: `${appOrigin()}/patient/live?token=${encodeURIComponent(input.token)}`,
    },
    idempotencyKey: `token_shared:${input.token}:${input.attendantEmail.trim().toLowerCase()}`,
  });
}

export interface QueueMailEntry {
  token: string;
  patientName: string;
  status: string;
  position: number;
  estimatedWaitMinutes: number;
  email?: string;
  roomNumber?: string;
  createdAt?: string;
}

export interface DeptMailContext {
  departmentName: string;
  roomNumber: string;
  floor: number | string;
  doctorName: string;
  delayMinutes?: number;
}

function roomLabel(room?: string) {
  if (!room) return 'the consultation room';
  return /^room\b/i.test(room) ? room : `Room ${room}`;
}

export function notifyTurnApproachingAndNow(
  previous: QueueMailEntry[],
  next: QueueMailEntry[],
  dept: DeptMailContext
) {
  for (const entry of next) {
    const before = previous.find(
      (item) => item.token.toUpperCase() === entry.token.toUpperCase()
    );
    const peopleAhead = Math.max(0, entry.position - 1);
    const prevAhead = before
      ? Math.max(0, before.position - 1)
      : Number.POSITIVE_INFINITY;
    const contactEmail = entry.email;
    if (contactEmail) {
      rememberTokenContact({
        email: contactEmail,
        patientName: entry.patientName,
        token: entry.token,
        department: dept.departmentName,
        doctorName: dept.doctorName,
        room: roomLabel(entry.roomNumber || dept.roomNumber),
        floor: formatFloor(dept.floor),
      });
    }

    if (
      (entry.status === 'waiting' || entry.status === 'turn_soon') &&
      peopleAhead === TURN_AHEAD_THRESHOLD &&
      prevAhead > TURN_AHEAD_THRESHOLD
    ) {
      void sendActivityEmail({
        event: 'turn_approaching',
        token: entry.token,
        vars: {
          patient_name: entry.patientName,
          token_no: entry.token,
          patients_ahead: peopleAhead,
          minutes: entry.estimatedWaitMinutes,
          room: roomLabel(entry.roomNumber || dept.roomNumber),
          floor: formatFloor(dept.floor),
          route_link: `${appOrigin()}/patient/guidance`,
        },
        idempotencyKey: `turn_approaching:${entry.token}:${peopleAhead}`,
      });
    }

    if (entry.status === 'in_progress' && before?.status !== 'in_progress') {
      void sendActivityEmail({
        event: 'turn_now',
        token: entry.token,
        vars: {
          patient_name: entry.patientName,
          token_no: entry.token,
          room: roomLabel(entry.roomNumber || dept.roomNumber),
          doctor_name: dept.doctorName,
        },
        idempotencyKey: `turn_now:${entry.token}`,
      });
    }
  }
}

export function notifyDepartmentDelay(
  entries: QueueMailEntry[],
  dept: DeptMailContext
) {
  const delayMinutes = dept.delayMinutes || 0;
  if (delayMinutes < DELAY_EMAIL_MINUTES) return;
  const newEta = formatClock(new Date(Date.now() + delayMinutes * 60 * 1000));
  for (const entry of entries) {
    if (
      entry.status === 'completed' ||
      entry.status === 'cancelled' ||
      entry.status === 'in_progress'
    )
      continue;
    void sendActivityEmail({
      event: 'delay',
      token: entry.token,
      vars: {
        patient_name: entry.patientName,
        department: dept.departmentName,
        doctor_name: dept.doctorName,
        delay_minutes: delayMinutes,
        reason_short: 'earlier consultations took longer than planned',
        new_eta: newEta,
      },
      idempotencyKey: `delay:${entry.token}:${delayMinutes}:${new Date().toDateString()}`,
    });
  }
}

export function notifyDoctorChange(
  entries: QueueMailEntry[],
  dept: DeptMailContext,
  oldDoctor: string
) {
  if (!oldDoctor || oldDoctor === dept.doctorName) return;
  for (const entry of entries) {
    if (entry.status === 'completed' || entry.status === 'cancelled') continue;
    void sendActivityEmail({
      event: 'doctor_unavailable',
      token: entry.token,
      vars: {
        patient_name: entry.patientName,
        token_no: entry.token,
        old_doctor: oldDoctor,
        new_doctor: dept.doctorName,
        room: roomLabel(entry.roomNumber || dept.roomNumber),
        position: entry.position || 1,
        reschedule_link: `${appOrigin()}/patient/visit`,
      },
      idempotencyKey: `doctor_unavailable:${entry.token}:${dept.doctorName}`,
    });
  }
}

export function notifyRoomChange(
  entries: QueueMailEntry[],
  dept: DeptMailContext,
  oldRoom: string
) {
  if (!oldRoom || oldRoom === dept.roomNumber) return;
  for (const entry of entries) {
    if (entry.status === 'completed' || entry.status === 'cancelled') continue;
    void sendActivityEmail({
      event: 'room_change',
      token: entry.token,
      vars: {
        patient_name: entry.patientName,
        token_no: entry.token,
        old_room: roomLabel(oldRoom),
        new_room: roomLabel(dept.roomNumber),
        floor: formatFloor(dept.floor),
        route_link: `${appOrigin()}/patient/guidance`,
      },
      idempotencyKey: `room_change:${entry.token}:${dept.roomNumber}`,
    });
  }
}

export function notifyVisitCompleted(
  entry: QueueMailEntry,
  dept: DeptMailContext
) {
  const created = entry.createdAt
    ? new Date(entry.createdAt).getTime()
    : Date.now() - 20 * 60 * 1000;
  const waitMinutes = Math.max(1, Math.round((Date.now() - created) / 60000));
  void sendActivityEmail({
    event: 'visit_completed',
    token: entry.token,
    vars: {
      patient_name: entry.patientName,
      token_no: entry.token,
      wait_minutes: waitMinutes,
      pharmacy_counter: HOSPITAL_EMAIL_DEFAULTS.pharmacy_counter,
      floor: formatFloor(dept.floor),
      feedback_link: `${appOrigin()}/patient/completion?token=${encodeURIComponent(entry.token)}`,
    },
    idempotencyKey: `visit_completed:${entry.token}`,
  });
  const followUp = new Date();
  followUp.setDate(followUp.getDate() + 7);
  scheduleFollowUpReminder({
    email: entry.email || getTokenContact(entry.token)?.email,
    patientName: entry.patientName,
    doctorName: dept.doctorName,
    followUpDate: followUp,
    token: entry.token,
  });
}

export function notifyMissedTurn(
  entry: QueueMailEntry,
  dept: DeptMailContext,
  calledAt?: string
) {
  void sendActivityEmail({
    event: 'missed_turn',
    token: entry.token,
    vars: {
      patient_name: entry.patientName,
      token_no: entry.token,
      called_time: calledAt
        ? formatClock(new Date(calledAt))
        : formatClock(new Date()),
      room: roomLabel(entry.roomNumber || dept.roomNumber),
    },
    idempotencyKey: `missed_turn:${entry.token}:${calledAt || 'now'}`,
  });
}

export function notifyPriorityApplied(entry: QueueMailEntry) {
  void sendActivityEmail({
    event: 'priority_applied',
    token: entry.token,
    vars: {
      patient_name: entry.patientName,
      token_no: entry.token,
      new_position: entry.position,
      minutes: entry.estimatedWaitMinutes,
    },
    idempotencyKey: `priority_applied:${entry.token}`,
  });
}

export function notifyNextStep(
  entry: QueueMailEntry,
  locationName: string,
  floor: string,
  doctorName: string,
  minutes: number
) {
  const newToken = `${entry.token}-N`;
  void sendActivityEmail({
    event: 'next_step',
    token: entry.token,
    vars: {
      patient_name: entry.patientName,
      location_name: locationName,
      floor,
      new_token: newToken,
      minutes,
      route_link: `${appOrigin()}/patient/guidance`,
      doctor_name: doctorName,
    },
    idempotencyKey: `next_step:${entry.token}:${locationName}`,
  });
}

export function notifyReportsReady(entry: {
  token: string;
  patientName: string;
  doctorName: string;
  room: string;
  floor: string;
  minutes?: number;
}) {
  void sendActivityEmail({
    event: 'reports_ready',
    token: entry.token,
    vars: {
      patient_name: entry.patientName,
      doctor_name: entry.doctorName,
      room: roomLabel(entry.room),
      floor: entry.floor,
      minutes: entry.minutes ?? 10,
      token_no: entry.token,
    },
    idempotencyKey: `reports_ready:${entry.token}`,
  });
}

export function notifyUrgentClosed(entry: {
  token?: string;
  patientName?: string;
  actionTaken: string;
  time?: string;
}) {
  void sendActivityEmail({
    event: 'urgent_visit_record',
    token: entry.token,
    vars: {
      patient_name: entry.patientName || 'Patient',
      time: entry.time || formatClock(new Date()),
      action_taken: entry.actionTaken,
    },
    idempotencyKey: `urgent_visit_record:${entry.token || entry.patientName || 'patient'}:${entry.time || 'now'}`,
  });
}
