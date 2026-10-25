import { getDepartment, DEPARTMENTS } from '../data/departments';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { UserProfile, Slip, VisitRecord, MedicalReport } from '../types';

const SUPABASE_URL = (
  import.meta.env.VITE_SUPABASE_URL ||
  'https://ebbuihktuumeazkyuscg.supabase.co'
).trim();
const SUPABASE_ANON_KEY = (
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImViYnVpaGt0dXVtZWF6a3l1c2NnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTI4NjUwODIsImV4cCI6MjEwODQ0MTA4Mn0.i0Yycc1NWNNznpXgtshK5ZXcOUCbLzw8ger1uQ7s7aE'
).trim();

export let supabase: SupabaseClient | null = null;

try {
  if (SUPABASE_URL && SUPABASE_ANON_KEY) {
    supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: { persistSession: false },
    });
  }
} catch (err) {
  console.warn('[Supabase] Failed to initialize Supabase client:', err);
}

// ─── USER PROFILES ──────────────────────────────────────────────────────────

export async function syncUserProfileToSupabase(
  user: UserProfile
): Promise<boolean> {
  if (!supabase || !user?.id) return false;
  try {
    const payload = {
      id: user.id,
      name: user.name || 'Patient',
      phone: user.phone || null,
      email: user.email || null,
      email_verified: Boolean(user.emailVerified),
      role: user.role || 'registered',
      is_guest: Boolean(user.isGuest),
      age: user.age ? Number(user.age) : null,
      gender: user.gender || null,
      blood_group: user.bloodGroup || null,
      abha_id: user.abhaId || null,
      staff_id: user.staffId || null,
      designation: user.designation || null,
      department: user.department || null,
      updated_at: new Date().toISOString(),
    };

    const { error } = await supabase
      .from('users')
      .upsert(payload, { onConflict: 'id' });

    if (error) {
      console.warn('[Supabase] Error upserting user:', error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.warn('[Supabase] Failed to sync user to Supabase:', err);
    return false;
  }
}

export async function fetchSupabaseUser(
  idOrPhone: string
): Promise<UserProfile | null> {
  if (!supabase || !idOrPhone) return null;
  try {
    const isPhone = /^\d{10}$/.test(idOrPhone.trim());
    const query = supabase.from('users').select('*');
    const { data, error } = isPhone
      ? await query.eq('phone', idOrPhone.trim()).limit(1).maybeSingle()
      : await query.eq('id', idOrPhone.trim()).limit(1).maybeSingle();

    if (error || !data) return null;

    return {
      id: data.id,
      name: data.name,
      phone: data.phone || undefined,
      email: data.email || undefined,
      emailVerified: Boolean(data.email_verified),
      role: data.role || 'registered',
      isGuest: Boolean(data.is_guest),
      age: data.age || undefined,
      gender: data.gender || undefined,
      bloodGroup: data.blood_group || undefined,
      abhaId: data.abha_id || undefined,
      staffId: data.staff_id || undefined,
      designation: data.designation || undefined,
      department: data.department || undefined,
    };
  } catch (err) {
    console.warn('[Supabase] Failed to fetch user from Supabase:', err);
    return null;
  }
}

export async function checkEmailRegistered(
  email: string
): Promise<UserProfile | null> {
  const cleanEmail = email.trim().toLowerCase();
  if (!cleanEmail) return null;

  // 1. Check Supabase cloud database
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('email', cleanEmail)
        .limit(1)
        .maybeSingle();

      if (!error && data) {
        return {
          id: data.id,
          name: data.name,
          phone: data.phone || undefined,
          email: data.email || undefined,
          emailVerified: Boolean(data.email_verified),
          role: data.role || 'registered',
          isGuest: Boolean(data.is_guest),
          age: data.age || undefined,
          gender: data.gender || undefined,
          bloodGroup: data.blood_group || undefined,
          abhaId: data.abha_id || undefined,
        };
      }
    } catch (err) {
      console.warn('[Supabase] Error checking email registration:', err);
    }
  }

  // 2. Check locally cached registered user
  try {
    const raw =
      typeof window !== 'undefined'
        ? localStorage.getItem('vd-auth-user')
        : null;
    if (raw) {
      const cached = JSON.parse(raw);
      if (
        cached?.email &&
        cached.email.trim().toLowerCase() === cleanEmail &&
        !cached.isGuest
      ) {
        return cached;
      }
    }
  } catch {
    // ignore
  }

  return null;
}

// ─── OPD SLIPS ──────────────────────────────────────────────────────────────

export async function syncSlipToSupabase(slip: Slip): Promise<boolean> {
  if (!supabase || !slip?.id) return false;
  try {
    const payload = {
      id: slip.id,
      user_id: slip.userId || null,
      token: slip.token,
      patient_name: slip.patientName || 'Patient',
      patient_age: slip.patientAge ? Number(slip.patientAge) : null,
      patient_gender: slip.patientGender || null,
      patient_email: slip.patientEmail || null,
      department_id: slip.department?.id || null,
      department_name:
        slip.department?.nameKey || slip.patientPurposeKey || null,
      doctor_name: slip.doctorName || slip.department?.doctorName || null,
      room_number:
        slip.roomNumber || (slip.department?.roomNumbers?.[0] ?? null),
      floor:
        slip.floor !== undefined
          ? Number(slip.floor)
          : (slip.department?.floor ?? 0),
      wing: slip.wing || slip.department?.wing || null,
      purpose_id: slip.patientPurposeKey || null,
      status: slip.status || 'waiting',
      estimated_wait: slip.estimatedWait || 15,
      people_ahead:
        slip.peopleAhead !== undefined ? Number(slip.peopleAhead) : 3,
      accessibility_needs: slip.accessibilityNeeds || [],
      navigation_steps: slip.steps || [],
      human_readable_direction: slip.humanReadableDirection || null,
      is_guest: Boolean(slip.isGuest),
      generated_at: slip.generatedAt || new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const { error } = await supabase
      .from('slips')
      .upsert(payload, { onConflict: 'id' });

    if (error) {
      console.warn('[Supabase] Error upserting slip:', error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.warn('[Supabase] Failed to sync slip to Supabase:', err);
    return false;
  }
}

export async function fetchSupabaseSlips(userId?: string): Promise<Slip[]> {
  if (!supabase) return [];
  try {
    let query = supabase
      .from('slips')
      .select('*')
      .order('generated_at', { ascending: false });
    if (userId) {
      query = query.eq('user_id', userId);
    }
    const { data, error } = await query;
    if (error || !data) return [];

    return data.map((row) => ({
      id: row.id,
      generatedAt: row.generated_at,
      patientPurposeKey: row.purpose_id || 'consultation',
      token: row.token,
      estimatedWait: row.estimated_wait || 15,
      peopleAhead: row.people_ahead,
      status: row.status,
      doctorName: (getDepartment(row.department_id) || DEPARTMENTS[0])
        .doctorName,
      roomNumber: (getDepartment(row.department_id) || DEPARTMENTS[0])
        .roomNumbers[0],
      floor: (getDepartment(row.department_id) || DEPARTMENTS[0]).floor,
      wing: (getDepartment(row.department_id) || DEPARTMENTS[0]).wing,
      humanReadableDirection: row.human_readable_direction,
      patientName: row.patient_name,
      patientAge: row.patient_age,
      patientGender: row.patient_gender,
      patientEmail: row.patient_email,
      accessibilityNeeds: row.accessibility_needs || [],
      isGuest: Boolean(row.is_guest),
      userId: row.user_id,
      steps: Array.isArray(row.navigation_steps) ? row.navigation_steps : [],
      department: getDepartment(row.department_id) || DEPARTMENTS[0],
    }));
  } catch (err) {
    console.warn('[Supabase] Failed to fetch slips from Supabase:', err);
    return [];
  }
}

// ─── VISITS & REPORTS ───────────────────────────────────────────────────────

export async function fetchSupabaseVisits(
  userId?: string
): Promise<VisitRecord[]> {
  if (!supabase) return [];
  try {
    let query = supabase
      .from('visits')
      .select('*')
      .order('created_at', { ascending: false });
    if (userId) {
      query = query.eq('user_id', userId);
    }
    const { data, error } = await query;
    if (error || !data) return [];

    return data.map((row) => ({
      id: row.id,
      date: row.date,
      departmentName: row.department_name,
      doctorName: row.doctor_name,
      tokenNumber: row.token_number,
      diagnosisSummary: row.diagnosis_summary,
      status: row.status as 'completed' | 'in_progress' | 'cancelled',
    }));
  } catch (err) {
    console.warn('[Supabase] Failed to fetch visits from Supabase:', err);
    return [];
  }
}

export async function syncVisitToSupabase(
  visit: VisitRecord,
  userId: string
): Promise<boolean> {
  if (!supabase || !visit?.id) return false;
  try {
    const { error } = await supabase.from('visits').upsert(
      {
        id: visit.id,
        user_id: userId,
        token_number: visit.tokenNumber,
        department_name: visit.departmentName,
        doctor_name: visit.doctorName,
        date: visit.date,
        diagnosis_summary: visit.diagnosisSummary,
        status: visit.status,
      },
      { onConflict: 'id' }
    );
    return !error;
  } catch {
    return false;
  }
}

export async function fetchSupabaseReports(
  userId?: string
): Promise<MedicalReport[]> {
  if (!supabase) return [];
  try {
    let query = supabase
      .from('medical_reports')
      .select('*')
      .order('created_at', { ascending: false });
    if (userId) {
      query = query.eq('user_id', userId);
    }
    const { data, error } = await query;
    if (error || !data) return [];

    return data.map((row) => ({
      id: row.id,
      title: row.title,
      date: row.date,
      department: row.department,
      fileSize: row.file_size || '1.0 MB',
    }));
  } catch (err) {
    console.warn('[Supabase] Failed to fetch reports from Supabase:', err);
    return [];
  }
}

// ─── ATTENDANT & EMAIL LOGS ─────────────────────────────────────────────────

export async function logSupabaseAttendant(
  token: string,
  patientName: string,
  patientEmail: string,
  attendantEmail: string
): Promise<boolean> {
  if (!supabase) return false;
  try {
    const { error } = await supabase.from('attendant_contacts').insert({
      token,
      patient_name: patientName,
      patient_email: patientEmail,
      attendant_email: attendantEmail,
    });
    return !error;
  } catch {
    return false;
  }
}

export async function logSupabaseEmail(
  event: string,
  recipient: string,
  token?: string,
  resendId?: string
): Promise<boolean> {
  if (!supabase) return false;
  try {
    const { error } = await supabase.from('email_notifications').insert({
      event,
      recipient_email: recipient,
      token: token || null,
      resend_id: resendId || null,
      status: 'sent',
    });
    return !error;
  } catch {
    return false;
  }
}
