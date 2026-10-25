import { DEPARTMENT_BY_ID } from '../../data/departments';
import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Clock,
  Radio,
  RotateCcw,
  BellRing,
  UserCheck,
  Coffee,
  AlertTriangle,
  TriangleAlert,
  Plus,
  Building2,
  Stethoscope,
  Trash2,
  Sparkles,
  Users,
  FileText,
  Mail,
  ExternalLink,
  Megaphone,
  Target,
  Bell,
  Play,
  Siren,
  Loader2,
} from 'lucide-react';
import { BaseLayout } from '../../components/layout';
import { Button, StatusBadge, Input } from '../../components/ui';
import {
  useLiveStore,
  useNotifications,
  ensurePatientInQueue,
  createEmergencyAlert,
  type DepartmentStatusCode,
  type QueueStatus,
} from '../../services/liveStore';
import {
  sendActivityEmail,
  sendVerificationEmail,
  type ActivityEmailEvent,
} from '../../services/emailService';

export function DevStorePage() {
  const navigate = useNavigate();
  const {
    state,
    setDepartmentWaitTime,
    setDepartmentCustomStatus,
    callNextPatient,
    updateQueueEntryStatus,
    publishLiveAlert,
    dismissLiveAlert,
    resetLiveStore,
  } = useLiveStore();

  const { sendTestNotification, requestPermission } = useNotifications();

  const [selectedDeptId, setSelectedDeptId] = useState<string>('opd-general-2');
  const [customWaitMinutes, setCustomWaitMinutes] = useState<number>(15);
  const [customStatusMsg, setCustomStatusMsg] = useState<string>('');
  const [customStatusCode, setCustomStatusCode] =
    useState<DepartmentStatusCode>('normal');
  const [newPatientName, setNewPatientName] = useState<string>('');
  const [feedbackToast, setFeedbackToast] = useState<string | null>(null);
  const [testEmail, setTestEmail] = useState<string>('loheprasanna@gmail.com');
  const [sendingEvent, setSendingEvent] = useState<string | null>(null);
  const [emailStatus, setEmailStatus] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setFeedbackToast(msg);
    setTimeout(() => setFeedbackToast(null), 3000);
  };

  const handleTestEmailEvent = async (
    event: ActivityEmailEvent | 'email_verification',
    label: string
  ) => {
    setSendingEvent(event);
    setEmailStatus(`Sending "${label}" to ${testEmail}...`);
    try {
      if (event === 'email_verification') {
        const res = (await sendVerificationEmail(
          testEmail,
          'Prasanna Lohe'
        )) as { id?: string };
        setEmailStatus(
          `Verification email dispatched to ${testEmail} via Resend (ID: ${res?.id || 'sent'})`
        );
      } else {
        const ok = await sendActivityEmail({
          event,
          to: testEmail,
          token: 'CARD-1042',
          idempotencyKey: `dev-test:${event}:${Date.now()}`,
          vars: {
            patient_name: 'Prasanna Lohe',
            token_no: 'CARD-1042',
            patient_id: 'PAT-88192',
            department: 'General Medicine',
            doctor_name: DEPARTMENT_BY_ID['opd-general-2'].doctorName,
            room: 'Room 2',
            floor: 'Floor 1',
            date: 'Today, 25 Oct',
            arrival_time: '10:30 AM',
            eta_start: '10:45 AM',
            eta_end: '11:00 AM',
            route_text:
              'Take the lift to the first floor. Room 2 is next to Room 1, opposite Room 6.',
            status_link: `${window.location.origin}/patient/live?token=CARD-1042`,
            cancel_link: `${window.location.origin}/patient/slip/latest?cancel=1`,
            patients_ahead: 5,
            minutes: 20,
            route_link: `${window.location.origin}/patient/guidance`,
            called_time: '10:42 AM',
            grace_minutes: '15',
            new_position: 1,
            delay_minutes: 25,
            reason_short: 'earlier consultations took longer than planned',
            new_eta: '11:15 AM',
            radius_minutes: '20',
            old_doctor: DEPARTMENT_BY_ID['opd-general-2'].doctorName,
            new_doctor: DEPARTMENT_BY_ID['opd-general'].doctorName,
            position: 2,
            reschedule_link: `${window.location.origin}/patient/visit`,
            old_room: 'Room 2',
            new_room: 'Room 1',
            location_name: DEPARTMENT_BY_ID['lab-blood'].name,
            new_token: 'LAB-502',
            wait_minutes: 18,
            pharmacy_counter: 'Pharmacy (G-04)',
            feedback_link: `${window.location.origin}/patient/completion?token=CARD-1042`,
            follow_up_date: '31 Oct 2026',
            booking_link: `${window.location.origin}/patient/visit`,
            time: '10:15 AM',
            action_taken:
              'provided immediate medical triage and stabilized your condition',
            emergency_number: '108',
          },
        });
        setEmailStatus(
          ok ? `Sent "${label}" successfully via Resend!` : `Sent "${label}"`
        );
      }
    } catch (err) {
      setEmailStatus(
        `Error: ${err instanceof Error ? err.message : String(err)}`
      );
    } finally {
      setSendingEvent(null);
    }
  };

  const currentDept = state.departments[selectedDeptId] || {
    departmentId: selectedDeptId,
    departmentName: selectedDeptId,
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

  const deptQueue = state.queue.filter(
    (q) => q.departmentId === selectedDeptId
  );

  // Quick preset actions
  const handleApplyPresetStatus = async (
    msg: string,
    code: DepartmentStatusCode,
    opts?: { breakUntil?: string; delayMinutes?: number }
  ) => {
    await setDepartmentCustomStatus(selectedDeptId, msg, code, opts);
    showToast(`Status updated: "${msg}" [${code}]`);
  };

  const handleAdjustWait = async (delta: number) => {
    const newWait = Math.max(
      0,
      currentDept.estimatedWaitPerPatientMinutes + delta
    );
    await setDepartmentWaitTime(selectedDeptId, newWait);
    showToast(`Wait time adjusted to ${newWait} min per patient`);
  };

  const handleSetExactWait = async (mins: number) => {
    await setDepartmentWaitTime(selectedDeptId, mins);
    showToast(`Wait time set to ${mins} min per patient`);
  };

  const handleCallNext = async () => {
    const res = await callNextPatient(selectedDeptId);
    if (res.nextToken) {
      showToast(
        `Called token ${res.nextToken} for ${currentDept.departmentName}`
      );
    } else {
      showToast(`No more waiting patients in ${currentDept.departmentName}`);
    }
  };

  const handleSetPatientStatus = async (token: string, status: QueueStatus) => {
    await updateQueueEntryStatus(token, status);
    showToast(`Set token ${token} to ${status}`);
  };

  const handleAddNewPatient = async () => {
    const name =
      newPatientName.trim() ||
      `Walk-in Patient #${Math.floor(100 + Math.random() * 900)}`;
    const prefix =
      selectedDeptId === 'opd-general-2'
        ? 'CARD'
        : selectedDeptId === 'lab-blood'
          ? 'LAB'
          : 'OPD';
    const token = `${prefix}-${Math.floor(1050 + Math.random() * 50)}`;

    await ensurePatientInQueue({
      token,
      patientName: name,
      departmentId: selectedDeptId,
      roomNumber: currentDept.roomNumber,
    });

    setNewPatientName('');
    showToast(`Added ${token} (${name}) to queue`);
  };

  const handleBroadcastAlert = async (
    type: 'emergency' | 'delay' | 'announcement'
  ) => {
    if (type === 'emergency') {
      await publishLiveAlert({
        type: 'emergency',
        title: 'Emergency Trauma Code Blue',
        message:
          'Critical emergency incoming. Priority triage enabled for ER Bay 1.',
        departmentId: selectedDeptId,
        active: true,
      });
      showToast('Emergency alert broadcasted!');
    } else if (type === 'delay') {
      await publishLiveAlert({
        type: 'delay',
        title: 'Department Operational Delay Notice',
        message:
          'Consultation schedule running with extended wait times due to complex cases.',
        departmentId: selectedDeptId,
        active: true,
      });
      showToast('Delay notice broadcasted!');
    } else {
      await publishLiveAlert({
        type: 'announcement',
        title: 'Hospital OPD Announcement',
        message: 'Please keep your OPD slip and ID handy at the counter.',
        active: true,
      });
      showToast('General announcement broadcasted!');
    }
  };

  const handleReset = async () => {
    if (
      window.confirm(
        'Reset all queues and department live statuses back to default mock data?'
      )
    ) {
      await resetLiveStore();
      showToast('Live store reset to default data');
    }
  };

  return (
    <BaseLayout showHome={true} headerTitle="Dev Store Testbench">
      <div className="page-container gap-5 max-w-4xl">
        {/* Toast */}
        {feedbackToast && (
          <div
            role="status"
            className="fixed top-20 right-4 z-50 p-4 bg-emerald-600 text-white rounded-2xl shadow-xl font-bold text-sm animate-bounce flex items-center gap-2"
          >
            <Sparkles size={18} />
            <span>{feedbackToast}</span>
          </div>
        )}

        {/* Instructions Banner */}
        <div className="p-4 sm:p-5 rounded-3xl bg-[var(--color-primary-50)] border-2 border-[var(--color-primary-300)] flex flex-col gap-2 shadow-2xs">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <span className="text-xs font-black uppercase tracking-wider text-[var(--color-primary-800)] flex items-center gap-1.5">
              <Radio size={16} className="text-red-500 animate-pulse" />
              Multi-Tab Live Testing Playground
            </span>
            <div className="flex items-center gap-2 flex-wrap">
              <Link
                to="/patient/slip"
                target="_blank"
                className="btn btn-sm btn-secondary text-xs font-bold bg-white inline-flex items-center gap-1.5"
              >
                <span>/patient/slip</span>
                <ExternalLink size={12} aria-hidden="true" />
              </Link>
              <Link
                to="/patient/live"
                target="_blank"
                className="btn btn-sm btn-primary text-xs font-bold inline-flex items-center gap-1.5"
              >
                <span>/patient/live</span>
                <ExternalLink size={12} aria-hidden="true" />
              </Link>
              <Link
                to="/patient/notifications"
                target="_blank"
                className="btn btn-sm btn-secondary text-xs font-bold bg-white inline-flex items-center gap-1.5"
              >
                <span>/patient/notifications</span>
                <ExternalLink size={12} aria-hidden="true" />
              </Link>
              <Link
                to="/patient/completion"
                target="_blank"
                className="btn btn-sm btn-secondary text-xs font-bold bg-white inline-flex items-center gap-1.5"
              >
                <span>/patient/completion</span>
                <ExternalLink size={12} aria-hidden="true" />
              </Link>
              <Link
                to="/patient/emergency"
                target="_blank"
                className="btn btn-sm btn-secondary text-xs font-bold text-red-600 bg-white inline-flex items-center gap-1.5"
              >
                <span>/patient/emergency</span>
                <ExternalLink size={12} aria-hidden="true" />
              </Link>
            </div>
          </div>
          <p className="text-sm font-semibold text-[var(--color-primary-950)] leading-relaxed">
            <strong>How to test real-time sync:</strong> Keep this tab open on{' '}
            <code>/dev/store</code>. Open <code>/patient/slip</code> or{' '}
            <code>/patient/live</code> in another browser tab. Click any button
            below to adjust wait times, call the next patient, or change doctor
            statuses. Watch the other tab update instantly via{' '}
            <strong>BroadcastChannel</strong> without page reload!
          </p>
        </div>

        {/* Department Switcher Tabs */}
        <div className="flex flex-col gap-2">
          <label className="text-xs font-black uppercase tracking-wider text-[var(--color-text-muted)]">
            Select Active Department to Control
          </label>
          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            {Object.keys(state.departments).map((deptId) => {
              const d = state.departments[deptId];
              const isSelected = deptId === selectedDeptId;
              return (
                <button
                  key={deptId}
                  type="button"
                  onClick={() => setSelectedDeptId(deptId)}
                  className={[
                    'btn btn-sm px-3.5 py-2 rounded-xl text-xs font-bold whitespace-normal break-words transition-all',
                    isSelected
                      ? 'btn-primary shadow-sm'
                      : 'btn-secondary bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-text)]',
                  ].join(' ')}
                >
                  {d.departmentName}
                </button>
              );
            })}
          </div>
        </div>

        {/* Current Department State Card */}
        <div className="card p-5 rounded-2xl border-2 border-[var(--color-border)] bg-[var(--color-surface)] flex flex-col gap-3 shadow-2xs">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-2.5">
              <Building2
                size={20}
                className="text-[var(--color-primary-600)]"
              />
              <h2 className="text-lg font-black text-[var(--color-text)]">
                {currentDept.departmentName}
                {currentDept.roomNumber
                  ? ` (Room ${currentDept.roomNumber})`
                  : ''}
              </h2>
            </div>
            <StatusBadge
              variant={
                currentDept.statusCode === 'emergency'
                  ? 'danger'
                  : currentDept.statusCode === 'busy'
                    ? 'warning'
                    : currentDept.statusCode === 'break'
                      ? 'warning'
                      : currentDept.statusCode === 'delayed'
                        ? 'warning'
                        : 'success'
              }
              label={currentDept.statusCode.toUpperCase()}
            />
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-1 text-xs">
            <div className="p-2.5 rounded-xl bg-[var(--color-surface-2)]">
              <span className="font-bold text-[var(--color-text-muted)] block">
                Now Serving Token
              </span>
              <span className="font-mono font-black text-base text-[var(--color-primary-600)]">
                {currentDept.currentToken || 'None'}
              </span>
            </div>
            <div className="p-2.5 rounded-xl bg-[var(--color-surface-2)]">
              <span className="font-bold text-[var(--color-text-muted)] block">
                Wait Per Patient
              </span>
              <span className="font-black text-base text-[var(--color-text)]">
                ~{currentDept.estimatedWaitPerPatientMinutes} min
              </span>
            </div>
            <div className="p-2.5 rounded-xl bg-[var(--color-surface-2)]">
              <span className="font-bold text-[var(--color-text-muted)] block">
                Doctor on Duty
              </span>
              <span className="font-extrabold text-sm text-[var(--color-text)] truncate block">
                {currentDept.activeDoctorName}
              </span>
            </div>
            <div className="p-2.5 rounded-xl bg-[var(--color-surface-2)]">
              <span className="font-bold text-[var(--color-text-muted)] block">
                Queue Length
              </span>
              <span className="font-black text-base text-[var(--color-text)]">
                {
                  deptQueue.filter(
                    (q) => q.status === 'waiting' || q.status === 'turn_soon'
                  ).length
                }{' '}
                waiting
              </span>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-[var(--color-surface-2)] border border-[var(--color-border)] text-xs font-semibold">
            <span className="text-[var(--color-text-muted)] font-bold">
              Current Broadcast Message:{' '}
            </span>
            <span className="text-[var(--color-text)] font-extrabold">
              "{currentDept.statusMessage}"
            </span>
          </div>
        </div>

        {/* ══════════════════════════════════════════════════════════════════
            CONTROLS SECTION 1: WAIT TIME ADJUSTMENT
            ══════════════════════════════════════════════════════════════════ */}
        <div className="card p-5 rounded-2xl border-2 border-[var(--color-border)] bg-[var(--color-surface)] flex flex-col gap-3 shadow-2xs">
          <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-[var(--color-primary-700)]">
            <Clock size={16} />
            Wait Time Controls (Adjusts Estimated Wait Times Live)
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => handleAdjustWait(-5)}
            >
              -5 min
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => handleAdjustWait(5)}
            >
              +5 min
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => handleAdjustWait(15)}
            >
              +15 min (Delay)
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => handleSetExactWait(0)}
            >
              Set 0 min (Immediate)
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => handleSetExactWait(10)}
            >
              Set 10 min
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => handleSetExactWait(25)}
            >
              Set 25 min
            </Button>
          </div>

          {/* Custom wait input */}
          <div className="flex items-center gap-2 pt-1">
            <input
              type="number"
              min={0}
              max={120}
              value={customWaitMinutes}
              onChange={(e) => setCustomWaitMinutes(Number(e.target.value))}
              className="input input-sm w-28 font-mono font-bold"
              placeholder="Minutes"
            />
            <Button
              variant="primary"
              size="sm"
              onClick={() => handleSetExactWait(customWaitMinutes)}
            >
              Apply Exact Wait
            </Button>
          </div>
        </div>

        {/* ══════════════════════════════════════════════════════════════════
            CONTROLS SECTION 2: DEPARTMENT STATUS PRESETS
            ══════════════════════════════════════════════════════════════════ */}
        <div className="card p-5 rounded-2xl border-2 border-[var(--color-border)] bg-[var(--color-surface)] flex flex-col gap-3 shadow-2xs">
          <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-[var(--color-primary-700)]">
            <Stethoscope size={16} />
            Department Status Presets
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {/* Busy: Doctor with another patient */}
            <button
              type="button"
              onClick={() =>
                handleApplyPresetStatus('Doctor with another patient', 'busy')
              }
              className="p-3 rounded-xl border border-indigo-300 bg-indigo-50/80 hover:bg-indigo-100 text-indigo-950 font-bold text-xs flex items-center gap-2.5 text-left transition-colors"
            >
              <Stethoscope size={18} className="text-indigo-700 shrink-0" />
              <div>
                <span className="block font-black">
                  "Doctor with another patient"
                </span>
                <span className="text-[11px] opacity-80">
                  Sets status code to Busy
                </span>
              </div>
            </button>

            {/* Break: Doctor on break */}
            <button
              type="button"
              onClick={() =>
                handleApplyPresetStatus(
                  'Doctor on break until 3:15 PM',
                  'break',
                  {
                    breakUntil: '3:15 PM',
                  }
                )
              }
              className="p-3 rounded-xl border border-amber-300 bg-amber-50/80 hover:bg-amber-100 text-amber-950 font-bold text-xs flex items-center gap-2.5 text-left transition-colors"
            >
              <Coffee size={18} className="text-amber-700 shrink-0" />
              <div>
                <span className="block font-black">
                  "Doctor on break until 3:15 PM"
                </span>
                <span className="text-[11px] opacity-80">
                  Sets status code to Break
                </span>
              </div>
            </button>

            {/* Delayed: Lab delayed */}
            <button
              type="button"
              onClick={() =>
                handleApplyPresetStatus('Lab delayed by 20 min', 'delayed', {
                  delayMinutes: 20,
                })
              }
              className="p-3 rounded-xl border border-orange-300 bg-orange-50/80 hover:bg-orange-100 text-orange-950 font-bold text-xs flex items-center gap-2.5 text-left transition-colors"
            >
              <AlertTriangle size={18} className="text-orange-700 shrink-0" />
              <div>
                <span className="block font-black">
                  "Lab delayed by 20 min"
                </span>
                <span className="text-[11px] opacity-80">
                  Sets status code to Delayed (+20m wait)
                </span>
              </div>
            </button>

            {/* Normal: Consultations running on time */}
            <button
              type="button"
              onClick={() =>
                handleApplyPresetStatus(
                  'Consultations running on time',
                  'normal'
                )
              }
              className="p-3 rounded-xl border border-emerald-300 bg-emerald-50/80 hover:bg-emerald-100 text-emerald-950 font-bold text-xs flex items-center gap-2.5 text-left transition-colors"
            >
              <UserCheck size={18} className="text-emerald-700 shrink-0" />
              <div>
                <span className="block font-black">
                  "Consultations running on time"
                </span>
                <span className="text-[11px] opacity-80">
                  Sets status code to Normal
                </span>
              </div>
            </button>
          </div>

          {/* Custom status message input */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 pt-2 border-t border-[var(--color-border)]">
            <input
              type="text"
              value={customStatusMsg}
              onChange={(e) => setCustomStatusMsg(e.target.value)}
              placeholder="Custom status message..."
              className="input input-sm flex-1 font-semibold text-xs"
            />
            <select
              value={customStatusCode}
              onChange={(e) =>
                setCustomStatusCode(e.target.value as DepartmentStatusCode)
              }
              className="input input-sm text-xs font-bold"
            >
              <option value="normal">Normal</option>
              <option value="busy">Busy</option>
              <option value="break">Break</option>
              <option value="delayed">Delayed</option>
              <option value="emergency">Emergency</option>
            </select>
            <Button
              variant="primary"
              size="sm"
              onClick={() => {
                if (customStatusMsg.trim()) {
                  handleApplyPresetStatus(customStatusMsg, customStatusCode);
                }
              }}
            >
              Apply Status
            </Button>
          </div>
        </div>

        {/* ══════════════════════════════════════════════════════════════════
            CONTROLS SECTION 3: QUEUE PROGRESSION & PATIENT TOKEN TRIGGER
            ══════════════════════════════════════════════════════════════════ */}
        <div className="card p-5 rounded-2xl border-2 border-[var(--color-border)] bg-[var(--color-surface)] flex flex-col gap-3 shadow-2xs">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-[var(--color-primary-700)]">
              <Users size={16} />
              Queue Progression & Patient Triggers
            </div>
            <Button
              variant="primary"
              size="sm"
              icon={<Megaphone size={16} />}
              onClick={handleCallNext}
            >
              Call Next Patient
            </Button>
          </div>

          <div className="flex flex-wrap gap-2 pt-1">
            {/* Quick 1-click trigger to make CARD-1042 In Consultation */}
            <Button
              variant="secondary"
              size="sm"
              icon={<Target size={15} />}
              onClick={() => handleSetPatientStatus('CARD-1042', 'in_progress')}
              className="bg-emerald-50 border-emerald-300 text-emerald-950 font-bold"
            >
              Set CARD-1042 to "Attending Now"
            </Button>

            {/* Quick 1-click trigger to make CARD-1042 Turn Soon */}
            <Button
              variant="secondary"
              size="sm"
              icon={<Bell size={15} />}
              onClick={() => handleSetPatientStatus('CARD-1042', 'turn_soon')}
              className="bg-blue-50 border-blue-300 text-blue-950 font-bold"
            >
              Set CARD-1042 to "Turn Soon"
            </Button>

            {/* Quick 1-click trigger to make CARD-1042 Waiting */}
            <Button
              variant="secondary"
              size="sm"
              icon={<Clock size={15} />}
              onClick={() => handleSetPatientStatus('CARD-1042', 'waiting')}
            >
              Set CARD-1042 to "Waiting"
            </Button>
          </div>

          {/* Current tokens in this department */}
          <div className="flex flex-col gap-2 pt-2 border-t border-[var(--color-border)]">
            <span className="text-xs font-bold text-[var(--color-text-muted)]">
              Active Tokens in Queue:
            </span>
            <div className="flex flex-wrap gap-2">
              {deptQueue.map((entry) => (
                <div
                  key={entry.id}
                  className="px-3 py-1.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-2)] text-xs flex items-center gap-2"
                >
                  <span className="font-mono font-black">{entry.token}</span>
                  <span className="font-semibold text-[var(--color-text-muted)]">
                    ({entry.patientName})
                  </span>
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-white">
                    {entry.status}
                  </span>
                  <button
                    type="button"
                    title="Advance to In Consultation"
                    onClick={() =>
                      handleSetPatientStatus(entry.token, 'in_progress')
                    }
                    className="text-emerald-600 hover:text-emerald-800 font-bold ml-1 inline-flex items-center gap-1"
                  >
                    <Play size={11} aria-hidden="true" />
                    <span>Call</span>
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Add walk-in patient */}
          <div className="flex items-center gap-2 pt-2">
            <input
              type="text"
              value={newPatientName}
              onChange={(e) => setNewPatientName(e.target.value)}
              placeholder="Add patient name..."
              className="input input-sm flex-1 font-semibold text-xs"
            />
            <Button
              variant="secondary"
              size="sm"
              icon={<Plus size={16} />}
              onClick={handleAddNewPatient}
            >
              Add to Queue
            </Button>
          </div>
        </div>

        {/* ══════════════════════════════════════════════════════════════════
            CONTROLS SECTION 4: BROADCAST HOSPITAL ALERTS
            ══════════════════════════════════════════════════════════════════ */}
        <div className="card p-5 rounded-2xl border-2 border-[var(--color-border)] bg-[var(--color-surface)] flex flex-col gap-3 shadow-2xs">
          <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-[var(--color-primary-700)]">
            <TriangleAlert size={16} />
            Emergency & Hospital Announcements
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              variant="secondary"
              size="sm"
              icon={<Siren size={15} />}
              className="bg-red-50 border-red-300 text-red-950 font-bold"
              onClick={() => handleBroadcastAlert('emergency')}
            >
              Broadcast Emergency Code
            </Button>

            <Button
              variant="secondary"
              size="sm"
              icon={<AlertTriangle size={15} />}
              className="bg-amber-50 border-amber-300 text-amber-950 font-bold"
              onClick={() => handleBroadcastAlert('delay')}
            >
              Broadcast Delay Alert
            </Button>

            <Button
              variant="secondary"
              size="sm"
              icon={<Megaphone size={15} />}
              onClick={() => handleBroadcastAlert('announcement')}
            >
              Broadcast Announcement
            </Button>
          </div>

          {/* Active alerts list */}
          {state.alerts.filter((a) => a.active).length > 0 && (
            <div className="flex flex-col gap-2 pt-2 border-t border-[var(--color-border)]">
              <span className="text-xs font-bold text-[var(--color-text-muted)]">
                Active Broadcasts:
              </span>
              {state.alerts
                .filter((a) => a.active)
                .map((alert) => (
                  <div
                    key={alert.id}
                    className="p-2.5 rounded-xl bg-amber-50 border border-amber-300 text-amber-950 text-xs flex items-center justify-between gap-2"
                  >
                    <div>
                      <span className="font-black mr-2">
                        [{alert.type.toUpperCase()}]
                      </span>
                      <span className="font-bold">{alert.title}:</span>{' '}
                      {alert.message}
                    </div>
                    <button
                      type="button"
                      onClick={() => dismissLiveAlert(alert.id)}
                      className="text-amber-800 hover:text-red-700 font-bold p-1"
                      title="Dismiss alert"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
            </div>
          )}
        </div>

        {/* ══════════════════════════════════════════════════════════════════
            CONTROLS SECTION 5: NOTIFICATIONS & EMERGENCY TRIGGERS
            ══════════════════════════════════════════════════════════════════ */}
        <div className="card p-5 rounded-2xl border-2 border-[var(--color-border)] bg-[var(--color-surface)] flex flex-col gap-3 shadow-2xs">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-[var(--color-primary-700)]">
              <BellRing size={16} />
              Simulate Notifications & Patient Emergency Triggers
            </div>
            <Button
              variant="secondary"
              size="sm"
              icon={<Bell size={15} />}
              onClick={async () => {
                const res = await requestPermission();
                showToast(`Browser permission status: ${res}`);
              }}
            >
              Request Browser Push Permission
            </Button>
          </div>

          <p className="text-xs font-medium text-[var(--color-text-muted)]">
            Click any button below to emit real-time in-page toast banners,
            browser notifications, and update the bell badge across open tabs:
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
            {/* Trigger 1: Your turn is coming */}
            <button
              type="button"
              onClick={() => {
                sendTestNotification('turn_soon');
                showToast('Triggered "Your turn is coming" notification!');
              }}
              className="p-3 rounded-xl border border-blue-300 bg-blue-50/80 hover:bg-blue-100 text-blue-950 font-bold text-xs flex items-center gap-2.5 text-left transition-colors"
            >
              <BellRing
                size={18}
                className="text-blue-700 shrink-0 animate-bounce"
              />
              <div>
                <span className="block font-black">
                  Trigger: "Your turn is coming"
                </span>
                <span className="text-[11px] opacity-80">
                  Emits toast banner & lock-screen push
                </span>
              </div>
            </button>

            {/* Trigger 2: Your consultation is complete */}
            <button
              type="button"
              onClick={() => {
                sendTestNotification('completed');
                showToast(
                  'Triggered "Your consultation is complete" notification!'
                );
              }}
              className="p-3 rounded-xl border border-emerald-300 bg-emerald-50/80 hover:bg-emerald-100 text-emerald-950 font-bold text-xs flex items-center gap-2.5 text-left transition-colors"
            >
              <UserCheck size={18} className="text-emerald-700 shrink-0" />
              <div>
                <span className="block font-black">
                  Trigger: "Your consultation is complete"
                </span>
                <span className="text-[11px] opacity-80">
                  Leads to /patient/completion screen
                </span>
              </div>
            </button>

            {/* Trigger 3: Your lab report is ready */}
            <button
              type="button"
              onClick={() => {
                sendTestNotification('report_ready');
                showToast('Triggered "Your lab report is ready" notification!');
              }}
              className="p-3 rounded-xl border border-indigo-300 bg-indigo-50/80 hover:bg-indigo-100 text-indigo-950 font-bold text-xs flex items-center gap-2.5 text-left transition-colors"
            >
              <FileText size={18} className="text-indigo-700 shrink-0" />
              <div>
                <span className="block font-black">
                  Trigger: "Your lab report is ready"
                </span>
                <span className="text-[11px] opacity-80">
                  Notification with link to view report
                </span>
              </div>
            </button>

            {/* Trigger 4: Simulate Emergency Alert */}
            <button
              type="button"
              onClick={async () => {
                await createEmergencyAlert({
                  symptoms: [
                    'Chest pain or heavy tightness',
                    'Difficulty breathing',
                  ],
                  landmark: 'Near Lift B & Washrooms (Ground Floor)',
                  patientToken: 'CARD-1042',
                  patientName: 'Ramesh Sharma',
                  note: 'Sitting on bench near water dispenser, feels dizzy',
                });
                showToast('Emergency alert written to live store!');
              }}
              className="p-3 rounded-xl border border-red-400 bg-red-50/80 hover:bg-red-100 text-red-950 font-bold text-xs flex items-center gap-2.5 text-left transition-colors"
            >
              <TriangleAlert
                size={18}
                className="text-red-600 shrink-0 animate-pulse"
              />
              <div>
                <span className="block font-black">
                  Simulate Emergency Alert (Lift B)
                </span>
                <span className="text-[11px] opacity-80">
                  Writes to liveStore.emergencyRequests
                </span>
              </div>
            </button>
          </div>

          <div className="flex items-center gap-2 pt-2 border-t border-[var(--color-border)]">
            <Link
              to="/patient/notifications"
              className="btn btn-sm btn-secondary text-xs font-bold"
            >
              View /patient/notifications Page →
            </Link>
            <Link
              to="/patient/completion"
              className="btn btn-sm btn-secondary text-xs font-bold"
            >
              View /patient/completion Page →
            </Link>
          </div>
        </div>

        {/* ══════════════════════════════════════════════════════════════════
            RESEND EMAIL SERVICE TESTBENCH (All 18 Activity Templates)
            ══════════════════════════════════════════════════════════════════ */}
        <div className="card p-5 sm:p-6 border-2 border-teal-500/30 bg-[var(--color-surface)] rounded-2xl flex flex-col gap-4 shadow-sm">
          <div className="flex items-center justify-between pb-3 border-b border-[var(--color-border)] flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <Mail size={22} className="text-teal-600" />
              <div>
                <h2 className="font-black text-lg text-[var(--color-text)]">
                  Resend Email Service Testbench (18 Activity Events)
                </h2>
                <p className="text-xs text-[var(--color-text-muted)]">
                  Test and trigger any real hospital activity email directly
                  with Resend API
                </p>
              </div>
            </div>
            <StatusBadge variant="success" label="Resend API Active" />
          </div>

          <div className="flex flex-col sm:flex-row gap-3 items-end">
            <div className="flex-1 w-full">
              <Input
                id="resend-test-email"
                type="email"
                label="Recipient Email Address"
                placeholder="loheprasanna@gmail.com"
                hint="Your Resend testing domain sends live emails to loheprasanna@gmail.com."
                value={testEmail}
                onChange={(e) => setTestEmail(e.target.value.trim())}
              />
            </div>
          </div>

          {emailStatus && (
            <div className="p-3 bg-teal-50 border border-teal-300 text-teal-950 rounded-xl text-xs font-bold animate-fadeIn flex items-center justify-between">
              <span>{emailStatus}</span>
              {sendingEvent && (
                <Loader2
                  size={16}
                  className="animate-spin text-teal-800 shrink-0"
                  aria-hidden="true"
                />
              )}
            </div>
          )}

          {/* All 18 events organized by section */}
          <div className="flex flex-col gap-4">
            {/* A. Account */}
            <div>
              <span className="text-xs font-black uppercase tracking-wider text-teal-800 dark:text-teal-400 block mb-2">
                A. Account (Sign-up & Registration)
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  loading={sendingEvent === 'email_verification'}
                  onClick={() =>
                    handleTestEmailEvent(
                      'email_verification',
                      '1. Email verification (OTP)'
                    )
                  }
                  className="text-xs font-bold text-left justify-start"
                >
                  1. Email verification (OTP: 6 digits)
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  loading={sendingEvent === 'registration_complete'}
                  onClick={() =>
                    handleTestEmailEvent(
                      'registration_complete',
                      '2. Registration complete'
                    )
                  }
                  className="text-xs font-bold text-left justify-start"
                >
                  2. Registration complete (Patient ID)
                </Button>
              </div>
            </div>

            {/* B. Before the visit */}
            <div>
              <span className="text-xs font-black uppercase tracking-wider text-teal-800 dark:text-teal-400 block mb-2">
                B. Before the visit
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  loading={sendingEvent === 'opd_slip_confirmation'}
                  onClick={() =>
                    handleTestEmailEvent(
                      'opd_slip_confirmation',
                      '3. OPD slip confirmation'
                    )
                  }
                  className="text-xs font-bold text-left justify-start"
                >
                  3. OPD slip confirmation
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  loading={sendingEvent === 'visit_reminder'}
                  onClick={() =>
                    handleTestEmailEvent('visit_reminder', '4. Visit reminder')
                  }
                  className="text-xs font-bold text-left justify-start"
                >
                  4. Visit reminder (2h / evening before)
                </Button>
              </div>
            </div>

            {/* C. During the visit */}
            <div>
              <span className="text-xs font-black uppercase tracking-wider text-teal-800 dark:text-teal-400 block mb-2">
                C. During the visit
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  loading={sendingEvent === 'turn_approaching'}
                  onClick={() =>
                    handleTestEmailEvent(
                      'turn_approaching',
                      '5. Turn approaching (5 ahead)'
                    )
                  }
                  className="text-xs font-bold text-left justify-start"
                >
                  5. Turn approaching (5 ahead)
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  loading={sendingEvent === 'turn_now'}
                  onClick={() =>
                    handleTestEmailEvent('turn_now', '6. Your turn now')
                  }
                  className="text-xs font-bold text-left justify-start"
                >
                  6. Your turn now (Called)
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  loading={sendingEvent === 'missed_turn'}
                  onClick={() =>
                    handleTestEmailEvent('missed_turn', '7. Missed turn')
                  }
                  className="text-xs font-bold text-left justify-start"
                >
                  7. Missed turn (Grace window)
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  loading={sendingEvent === 'priority_applied'}
                  onClick={() =>
                    handleTestEmailEvent(
                      'priority_applied',
                      '8. Priority applied'
                    )
                  }
                  className="text-xs font-bold text-left justify-start"
                >
                  8. Priority applied
                </Button>
              </div>
            </div>

            {/* D. Changes and delays */}
            <div>
              <span className="text-xs font-black uppercase tracking-wider text-teal-800 dark:text-teal-400 block mb-2">
                D. Changes and delays
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  loading={sendingEvent === 'delay'}
                  onClick={() =>
                    handleTestEmailEvent(
                      'delay',
                      '9. Delay in department (20+ min)'
                    )
                  }
                  className="text-xs font-bold text-left justify-start"
                >
                  9. Delay (20+ min)
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  loading={sendingEvent === 'doctor_unavailable'}
                  onClick={() =>
                    handleTestEmailEvent(
                      'doctor_unavailable',
                      '10. Doctor unavailable'
                    )
                  }
                  className="text-xs font-bold text-left justify-start"
                >
                  10. Change of doctor
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  loading={sendingEvent === 'room_change'}
                  onClick={() =>
                    handleTestEmailEvent('room_change', '11. Room change')
                  }
                  className="text-xs font-bold text-left justify-start"
                >
                  11. Room change
                </Button>
              </div>
            </div>

            {/* E. Multi-stop journey */}
            <div>
              <span className="text-xs font-black uppercase tracking-wider text-teal-800 dark:text-teal-400 block mb-2">
                E. Multi-stop journey
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  loading={sendingEvent === 'next_step'}
                  onClick={() =>
                    handleTestEmailEvent(
                      'next_step',
                      '12. Next step (Lab/X-ray/Pharmacy)'
                    )
                  }
                  className="text-xs font-bold text-left justify-start"
                >
                  12. Next step (Lab / Pharmacy)
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  loading={sendingEvent === 'reports_ready'}
                  onClick={() =>
                    handleTestEmailEvent('reports_ready', '13. Reports ready')
                  }
                  className="text-xs font-bold text-left justify-start"
                >
                  13. Reports ready (Return lane)
                </Button>
              </div>
            </div>

            {/* F. After the visit */}
            <div>
              <span className="text-xs font-black uppercase tracking-wider text-teal-800 dark:text-teal-400 block mb-2">
                F. After the visit
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  loading={sendingEvent === 'visit_completed'}
                  onClick={() =>
                    handleTestEmailEvent(
                      'visit_completed',
                      '14. Visit completed'
                    )
                  }
                  className="text-xs font-bold text-left justify-start"
                >
                  14. Visit completed (Feedback & Pharmacy)
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  loading={sendingEvent === 'follow_up_reminder'}
                  onClick={() =>
                    handleTestEmailEvent(
                      'follow_up_reminder',
                      '15. Follow-up reminder'
                    )
                  }
                  className="text-xs font-bold text-left justify-start"
                >
                  15. Follow-up reminder
                </Button>
              </div>
            </div>

            {/* G. Other events */}
            <div>
              <span className="text-xs font-black uppercase tracking-wider text-teal-800 dark:text-teal-400 block mb-2">
                G. Other events
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  loading={sendingEvent === 'cancellation_confirmed'}
                  onClick={() =>
                    handleTestEmailEvent(
                      'cancellation_confirmed',
                      '16. Cancellation confirmed'
                    )
                  }
                  className="text-xs font-bold text-left justify-start"
                >
                  16. Slip cancelled
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  loading={sendingEvent === 'token_shared'}
                  onClick={() =>
                    handleTestEmailEvent(
                      'token_shared',
                      '17. Token shared with attendant'
                    )
                  }
                  className="text-xs font-bold text-left justify-start"
                >
                  17. Token shared with attendant
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  loading={sendingEvent === 'urgent_visit_record'}
                  onClick={() =>
                    handleTestEmailEvent(
                      'urgent_visit_record',
                      '18. Urgent visit record'
                    )
                  }
                  className="text-xs font-bold text-left justify-start"
                >
                  18. Urgent visit record
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* ══════════════════════════════════════════════════════════════════
            GLOBAL CONTROLS
            ══════════════════════════════════════════════════════════════════ */}
        <div className="flex items-center justify-between gap-3 pt-2 flex-wrap">
          <Button
            variant="ghost"
            size="sm"
            icon={<RotateCcw size={16} />}
            onClick={handleReset}
            className="text-red-600 hover:bg-red-50"
          >
            Reset Store to Default Mock Data
          </Button>

          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => navigate('/patient/live')}
            >
              Go to /patient/live →
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={() => navigate('/patient/slip')}
            >
              Go to /patient/slip →
            </Button>
          </div>
        </div>
      </div>
    </BaseLayout>
  );
}
