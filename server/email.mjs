const DEFAULT_VARS = {
  hospital_name: 'Civil Hospital Nagpur',
  helpline: '1800-123-4567',
  app_name: 'Vaid Disha',
  counter_location: 'Main OPD Registration Counter, Ground Floor',
  emergency_number: '108',
  pharmacy_counter: 'Pharmacy (G-04)',
  grace_minutes: '15',
  radius_minutes: '20',
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const EMAIL_EVENTS = {
  email_verification: {
    subject: 'Your verification code: {{otp}}',
    body: `Hello {{patient_name}},

Use this code to verify your email address:

{{otp}}

It is valid for 10 minutes. If you did not ask for this, you can ignore this email.`,
  },
  registration_complete: {
    subject: 'You are registered at {{hospital_name}}',
    body: `Hello {{patient_name}},

Your registration at {{hospital_name}} is complete.

Patient ID: {{patient_id}}

Please keep this ID with you when you visit. You can get an OPD slip from the app at any time. If you would like help, the registration counter at {{counter_location}} will assist you.`,
  },
  opd_slip_confirmation: {
    subject: 'Your OPD slip: Token {{token_no}}, {{date}}',
    body: `Hello {{patient_name}},

Your OPD slip is ready.

Token:        {{token_no}}
Department:   {{department}}
Doctor:       {{doctor_name}}
Room:         {{room}}, {{floor}}
Date:         {{date}}
Expected:     between {{eta_start}} and {{eta_end}}

This time is an estimate and may change during the day. We will let you know if it does.

How to reach the room:
{{route_text}}

Live queue status: {{status_link}}`,
  },
  visit_reminder: {
    subject: 'Reminder: your visit {{day_label}} at {{hospital_name}}',
    body: `Hello {{patient_name}},

This is a reminder about your visit {{day_label}}.

Token:       {{token_no}}
Department:  {{department}}
Please reach by: {{arrival_time}}

Please bring your ID and any earlier prescriptions or reports.
If you cannot come, you can cancel here so that someone else gets your slot: {{cancel_link}}`,
  },
  turn_approaching: {
    subject: 'Your turn is close: Token {{token_no}}',
    body: `Hello {{patient_name}},

About {{patients_ahead}} patients are ahead of you.
Estimated wait: {{minutes}} minutes.

Please start making your way to {{room}}, {{floor}}.
Directions: {{route_link}}`,
  },
  turn_now: {
    subject: 'It is your turn: Token {{token_no}}, {{room}}',
    body: `Hello {{patient_name}},

Please go to {{room}} now. {{doctor_name}} will see you next.
Show your token at the door. If you need help finding the room, ask any staff member or the help desk.`,
  },
  missed_turn: {
    subject: 'You missed your turn: Token {{token_no}}',
    body: `Hello {{patient_name}},

Your token was called at {{called_time}}, but we could not find you.

Your slip is still valid. If you reach {{room}} within {{grace_minutes}} minutes, you will be seen after the current patient. After that, please visit the counter and we will help you rebook.`,
  },
  priority_applied: {
    subject: 'Priority applied to Token {{token_no}}',
    body: `Hello {{patient_name}},

Your token has been moved to the priority queue based on the details given at registration.

New position: {{new_position}}
Estimated wait: {{minutes}} minutes

If this does not look right, please speak to the counter staff.`,
  },
  delay: {
    subject: 'Delay in {{department}}: new time {{new_eta}}',
    body: `Hello {{patient_name}},

{{doctor_name}} is running about {{delay_minutes}} minutes behind because {{reason_short}}.

Your new expected time: {{new_eta}}

You do not need to do anything. You may step out, but please stay within {{radius_minutes}} minutes of the hospital. We will write again when your turn is near.`,
  },
  doctor_unavailable: {
    subject: 'Change of doctor for Token {{token_no}}',
    body: `Hello {{patient_name}},

{{old_doctor}} is not available today. Your token has been moved to {{new_doctor}} in {{room}}. Your place in the queue is kept.

Current position: {{position}}

If you would rather come another day, you can reschedule here: {{reschedule_link}}`,
  },
  room_change: {
    subject: 'Room changed for Token {{token_no}}',
    body: `Hello {{patient_name}},

Your consultation has moved.

Earlier: {{old_room}}
Now:     {{new_room}}, {{floor}}

Directions: {{route_link}}`,
  },
  next_step: {
    subject: 'Next step: {{location_name}}',
    body: `Hello {{patient_name}},

Please go to {{location_name}}, {{floor}}.
Your token there is {{new_token}}. Estimated wait: {{minutes}} minutes.

Directions: {{route_link}}

After this step, come back to {{doctor_name}}. You will be seen in the return lane and will not need a new token.`,
  },
  reports_ready: {
    subject: 'Your reports are ready: return to {{doctor_name}}',
    body: `Hello {{patient_name}},

Your reports are ready. Please return to {{room}}, {{floor}}.
You will be seen in the return lane, usually within {{minutes}} minutes.
Show this email or token {{token_no}} at the door.`,
  },
  visit_completed: {
    subject: 'Your visit is complete: Token {{token_no}}',
    body: `Hello {{patient_name}},

Thank you for visiting {{hospital_name}} today.

Time from arrival to consultation: {{wait_minutes}} minutes
Medicines: collect from {{pharmacy_counter}}, {{floor}}

Would you tell us how the visit went? It takes about a minute:
{{feedback_link}}`,
  },
  follow_up_reminder: {
    subject: 'Follow-up visit on {{follow_up_date}}',
    body: `Hello {{patient_name}},

You have a follow-up visit on {{follow_up_date}} with {{doctor_name}}.
Please bring your earlier prescription and reports.

Book your slip in advance to avoid waiting at the counter:
{{booking_link}}`,
  },
  cancellation_confirmed: {
    subject: 'Slip cancelled: Token {{token_no}}',
    body: `Hello {{patient_name}},

Your slip for {{date}} with {{doctor_name}} has been cancelled.
You can book a new one any time: {{booking_link}}`,
  },
  token_shared: {
    subject: '{{patient_name}} shared a queue token with you',
    body: `Hello,

{{patient_name}} has shared their OPD token with you so you can follow the queue on their behalf.

Token:  {{token_no}}
Doctor: {{doctor_name}}
Status: {{status_link}}

You will receive updates until the visit is complete.`,
  },
  urgent_visit_record: {
    subject: 'Your visit was marked urgent',
    body: `Hello {{patient_name}},

At {{time}}, a staff member assessed your visit as urgent and {{action_taken}}.

If you or someone with you feels worse, tell the nearest staff member at once, or call {{emergency_number}}.`,
  },
};

function interpolate(template, vars) {
  return String(template).replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_, key) => {
    const value = vars[key];
    return value === undefined || value === null ? '' : String(value);
  });
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function toHtml(subject, body, vars) {
  const safeBody = escapeHtml(body).replace(/\n/g, '<br>');
  const footer = `${escapeHtml(vars.hospital_name)} OPD Helpdesk<br>Helpline: ${escapeHtml(vars.helpline)}<br>Sent through ${escapeHtml(vars.app_name)}. This is an automated message, please do not reply.`;
  return `<!DOCTYPE html>
<html><body style="margin:0;padding:0;background:#f4f6f8;">
  <div style="max-width:560px;margin:24px auto;background:#ffffff;border:1px solid #e5e7eb;border-radius:12px;padding:28px 24px;font-family:Georgia,'Times New Roman',serif;color:#111827;line-height:1.55;">
    <p style="margin:0 0 16px;font-size:13px;letter-spacing:0.04em;text-transform:uppercase;color:#0f766e;">${escapeHtml(vars.app_name)}</p>
    <h1 style="margin:0 0 20px;font-size:20px;line-height:1.3;">${escapeHtml(subject)}</h1>
    <div style="font-size:16px;">${safeBody}</div>
    <hr style="border:none;border-top:1px solid #e5e7eb;margin:28px 0 16px;">
    <p style="margin:0;font-size:12px;color:#6b7280;">${footer}</p>
  </div>
</body></html>`;
}

export function isValidEmail(value) {
  return EMAIL_RE.test(String(value || '').trim());
}

export function renderEmail(event, inputVars = {}) {
  const spec = EMAIL_EVENTS[event];
  if (!spec) throw new Error(`Unknown email event: ${event}`);
  const vars = { ...DEFAULT_VARS, ...inputVars };
  const subject = interpolate(spec.subject, vars);
  const textBody = interpolate(spec.body, vars);
  const footer = `${vars.hospital_name} OPD Helpdesk\nHelpline: ${vars.helpline}\nSent through ${vars.app_name}. This is an automated message, please do not reply.`;
  const text = `${textBody}\n\n${footer}`;
  return {
    subject,
    text,
    html: toHtml(subject, textBody, vars),
    vars,
  };
}

export async function sendWithResend({ to, subject, html, text, replyTo }) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    const error = new Error('Resend is not configured.');
    error.status = 503;
    throw error;
  }
  const from = process.env.RESEND_FROM_EMAIL || 'Vaid Disha <onboarding@resend.dev>';
  const recipients = Array.isArray(to) ? to : [to];
  const upstream = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from,
      to: recipients,
      subject,
      html,
      text,
      ...(replyTo ? { reply_to: replyTo } : {}),
    }),
  });
  const data = await upstream.json().catch(() => ({}));
  if (!upstream.ok) {
    const error = new Error(data.message || `Resend failed (${upstream.status}).`);
    error.status = upstream.status;
    error.details = data;
    throw error;
  }
  return data;
}

const otpStore = new Map();
const sendCounts = new Map();

function pruneMaps(now) {
  for (const [email, record] of otpStore) {
    if (record.expiresAt <= now) otpStore.delete(email);
  }
  for (const [key, record] of sendCounts) {
    if (record.resetAt <= now) sendCounts.delete(key);
  }
}

function assertRateLimit(key, max, windowMs) {
  const now = Date.now();
  pruneMaps(now);
  const current = sendCounts.get(key);
  if (!current || current.resetAt <= now) {
    sendCounts.set(key, { count: 1, resetAt: now + windowMs });
    return;
  }
  if (current.count >= max) {
    const error = new Error('Too many email requests. Please wait and try again.');
    error.status = 429;
    throw error;
  }
  current.count += 1;
}

function randomOtp() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

export async function sendVerificationOtp({ email, patientName }) {
  const to = String(email || '').trim().toLowerCase();
  if (!isValidEmail(to)) {
    const error = new Error('Enter a valid email address.');
    error.status = 400;
    throw error;
  }
  assertRateLimit(`otp:${to}`, 8, 60 * 60 * 1000);
  const otp = randomOtp();
  const rendered = renderEmail('email_verification', {
    patient_name: patientName || 'Patient',
    otp,
  });
  const result = await sendWithResend({ to, ...rendered });
  otpStore.set(to, {
    otp,
    expiresAt: Date.now() + 10 * 60 * 1000,
    attempts: 0,
  });
  return { id: result.id, email: to };
}

export function verifyOtp({ email, otp }) {
  const to = String(email || '').trim().toLowerCase();
  const code = String(otp || '').trim();
  const now = Date.now();
  pruneMaps(now);
  const record = otpStore.get(to);
  if (!record || record.expiresAt <= now) {
    const error = new Error('This code has expired. Please request a new one.');
    error.status = 400;
    throw error;
  }
  record.attempts += 1;
  if (record.attempts > 5) {
    otpStore.delete(to);
    const error = new Error('Too many incorrect attempts. Please request a new code.');
    error.status = 400;
    throw error;
  }
  if (record.otp !== code) {
    const error = new Error('That code is incorrect. Please try again.');
    error.status = 400;
    throw error;
  }
  otpStore.delete(to);
  return { email: to, verified: true };
}

export async function sendActivityEmail({ event, to, vars }) {
  if (!EMAIL_EVENTS[event]) {
    const error = new Error('Unknown email event.');
    error.status = 400;
    throw error;
  }
  const recipient = String(to || '').trim().toLowerCase();
  if (!isValidEmail(recipient)) {
    const error = new Error('A valid recipient email is required.');
    error.status = 400;
    throw error;
  }
  assertRateLimit(`activity:${recipient}`, 40, 60 * 60 * 1000);
  const rendered = renderEmail(event, vars || {});
  const result = await sendWithResend({ to: recipient, ...rendered });
  return { id: result.id, event, email: recipient };
}
