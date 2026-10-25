import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  RotateCcw,
  Bell,
  CheckCircle2,
  FileCheck,
  Coffee,
  AlertTriangle,
  UserPlus,
  ExternalLink,
  Laptop,
  Check,
  Zap,
} from 'lucide-react';
import { BaseLayout } from '../components/layout';
import { PageHeader } from '../components/ui';
import {
  useLiveStore,
  resetLiveStore,
  addNotification,
  completePatientConsultation,
  setDepartmentCustomStatus,
  createEmergencyAlert,
  addRandomGuestPatients,
  updateQueueEntryStatus,
} from '../services/liveStore';

export function ComponentDemoPage() {
  const { state } = useLiveStore();
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((current) => (current === msg ? null : current));
    }, 4000);
  };

  // 1. Reset all mock data
  const handleResetData = async () => {
    await resetLiveStore();
    showToast(
      'Reset all mock data: Queue, departments, alerts, and notifications restored to initial state.'
    );
  };

  // 2. Simulate "Your turn is coming soon"
  const handleSimulateTurnSoon = async () => {
    const targetToken = 'CARD-1042';
    await updateQueueEntryStatus(targetToken, 'turn_soon');
    await addNotification({
      type: 'turn_soon',
      title: 'Your turn is coming',
      message: `Token ${targetToken}: You are next in line for General Medicine (Room 2). Please proceed near the door.`,
      actionUrl: `/patient/live?token=${targetToken}&dept=opd-general-2`,
      actionLabel: 'View Live Room Status',
      token: targetToken,
      departmentId: 'opd-general-2',
    });
    showToast(
      `Simulated: "Your turn is coming soon" triggered for ${targetToken}. Live countdown updated.`
    );
  };

  // 3. Simulate "Consultation complete"
  const handleSimulateConsultComplete = async () => {
    const targetToken = 'CARD-1042';
    await completePatientConsultation(targetToken);
    showToast(
      `Simulated: Consultation marked complete for ${targetToken}. Next steps notification broadcast.`
    );
  };

  // 4. Simulate "Lab report ready"
  const handleSimulateReportReady = async () => {
    await addNotification({
      type: 'report_ready',
      title: 'Your lab report is ready',
      message:
        'Central Pathology Laboratory: Complete Blood Count (CBC) and Lipid Profile reports have been processed.',
      actionUrl: '/patient/reports',
      actionLabel: 'View Diagnostic Reports',
    });
    showToast(
      'Simulated: "Your lab report is ready" alert sent to patient notification tray.'
    );
  };

  // 5. Simulate "Doctor on break (back at 11:30)"
  const handleSimulateDoctorBreak = async () => {
    await setDepartmentCustomStatus(
      'opd-general-2',
      'Doctor on break (back at 11:30 AM)',
      'break',
      { breakUntil: '11:30 AM' }
    );
    showToast(
      'Simulated: General Medicine status updated to "Doctor on break (back at 11:30 AM)". Patient status card updated.'
    );
  };

  // 6. Simulate "New emergency alert from patient"
  const handleSimulateEmergency = async () => {
    await createEmergencyAlert({
      patientToken: 'EMG-88',
      patientName: 'Meera Rao',
      landmark: '2nd Floor Near Lift B',
      symptoms: ['Chest pain or heavy tightness', 'Difficulty breathing'],
      note: 'Sudden dizziness and severe tightness while walking near Lift B',
    });
    showToast(
      'Simulated: Critical Emergency Alert dispatched at 2nd Floor Near Lift B. Staff siren triggered.'
    );
  };

  // 7. Add 3 random walk-in guest patients
  const handleAddRandomGuests = async () => {
    const added = await addRandomGuestPatients(3);
    const tokens = added.map((p) => p.token).join(', ');
    showToast(
      `Added 3 walk-in guest patients to queue: ${tokens}. Recalculated queue positions.`
    );
  };

  return (
    <BaseLayout showHome={true} headerTitle="Live Sync Demo Panel">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* Page Header */}
        <PageHeader
          title="Interactive Live Sync Demo Panel"
          subtitle="Simulate real-time hospital events, trigger patient notifications, and test cross-tab synchronization"
          showBack={true}
          onBack={() => window.history.back()}
        />

        {/* Floating / In-page Confirmation Toast */}
        {toastMessage && (
          <div
            role="status"
            aria-live="polite"
            className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/80 border-2 border-emerald-400 text-emerald-900 dark:text-emerald-100 shadow-md flex items-center justify-between gap-3 animate-in fade-in"
          >
            <div className="flex items-center gap-2.5 text-sm font-bold">
              <Check className="text-emerald-600 shrink-0" size={20} />
              <span>{toastMessage}</span>
            </div>
            <button
              type="button"
              onClick={() => setToastMessage(null)}
              className="text-xs font-bold text-emerald-700 underline"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Two-tab notice card */}
        <div className="p-4 sm:p-5 rounded-2xl bg-[var(--color-primary-50)] dark:bg-[var(--color-primary-950)] border-2 border-[var(--color-primary-300)] dark:border-[var(--color-primary-800)] flex items-start gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-[var(--color-primary-500)] text-white flex items-center justify-center shrink-0 shadow-xs">
            <Laptop size={20} />
          </div>
          <div className="space-y-1 text-xs sm:text-sm">
            <h2 className="font-black text-[var(--color-primary-900)] dark:text-[var(--color-primary-100)] text-sm sm:text-base">
              Dual-Tab Testing Recommendation
            </h2>
            <p className="text-[var(--color-text-main)] leading-relaxed">
              Open <strong>/patient/slip</strong> or{' '}
              <strong>/patient/live</strong> in one tab and{' '}
              <strong>/staff/dashboard</strong> in a second tab of the{' '}
              <strong>SAME browser</strong> to watch live sync via
              BroadcastChannel. Sync between completely different physical
              devices requires the production backend.
            </p>
          </div>
        </div>

        {/* Control Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* 1. Reset all mock data */}
          <button
            type="button"
            onClick={handleResetData}
            className="p-5 rounded-2xl border-2 border-[var(--color-border)] bg-[var(--color-surface)] hover:bg-[var(--color-surface-2)] text-left shadow-xs transition-all flex items-start gap-4 group"
          >
            <div className="w-12 h-12 rounded-xl bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
              <RotateCcw size={24} />
            </div>
            <div className="space-y-1">
              <span className="font-black text-base text-[var(--color-text-main)] block">
                Reset All Mock Data
              </span>
              <p className="text-xs text-[var(--color-text-muted)] leading-relaxed">
                Clears custom entries and restores default patient queues,
                department delays, and demo alerts.
              </p>
            </div>
          </button>

          {/* 2. Simulate "Your turn is coming soon" */}
          <button
            type="button"
            onClick={handleSimulateTurnSoon}
            className="p-5 rounded-2xl border-2 border-[var(--color-border)] bg-[var(--color-surface)] hover:bg-[var(--color-surface-2)] text-left shadow-xs transition-all flex items-start gap-4 group"
          >
            <div className="w-12 h-12 rounded-xl bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-200 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
              <Bell size={24} />
            </div>
            <div className="space-y-1">
              <span className="font-black text-base text-[var(--color-text-main)] block">
                Simulate: "Your turn is coming soon"
              </span>
              <p className="text-xs text-[var(--color-text-muted)] leading-relaxed">
                Broadcasts turn alert for CARD-1042, moves patient to position
                1, and updates live room card.
              </p>
            </div>
          </button>

          {/* 3. Simulate "Consultation complete" */}
          <button
            type="button"
            onClick={handleSimulateConsultComplete}
            className="p-5 rounded-2xl border-2 border-[var(--color-border)] bg-[var(--color-surface)] hover:bg-[var(--color-surface-2)] text-left shadow-xs transition-all flex items-start gap-4 group"
          >
            <div className="w-12 h-12 rounded-xl bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
              <CheckCircle2 size={24} />
            </div>
            <div className="space-y-1">
              <span className="font-black text-base text-[var(--color-text-main)] block">
                Simulate: "Consultation complete"
              </span>
              <p className="text-xs text-[var(--color-text-muted)] leading-relaxed">
                Marks consultation done, increments completed count, and pushes
                link to post-visit completion guide.
              </p>
            </div>
          </button>

          {/* 4. Simulate "Lab report ready" */}
          <button
            type="button"
            onClick={handleSimulateReportReady}
            className="p-5 rounded-2xl border-2 border-[var(--color-border)] bg-[var(--color-surface)] hover:bg-[var(--color-surface-2)] text-left shadow-xs transition-all flex items-start gap-4 group"
          >
            <div className="w-12 h-12 rounded-xl bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-200 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
              <FileCheck size={24} />
            </div>
            <div className="space-y-1">
              <span className="font-black text-base text-[var(--color-text-main)] block">
                Simulate: "Lab report ready"
              </span>
              <p className="text-xs text-[var(--color-text-muted)] leading-relaxed">
                Dispatches pathology lab readiness notification leading to
                diagnostic reports viewer.
              </p>
            </div>
          </button>

          {/* 5. Simulate "Doctor on break (back at 11:30)" */}
          <button
            type="button"
            onClick={handleSimulateDoctorBreak}
            className="p-5 rounded-2xl border-2 border-[var(--color-border)] bg-[var(--color-surface)] hover:bg-[var(--color-surface-2)] text-left shadow-xs transition-all flex items-start gap-4 group"
          >
            <div className="w-12 h-12 rounded-xl bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-200 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
              <Coffee size={24} />
            </div>
            <div className="space-y-1">
              <span className="font-black text-base text-[var(--color-text-main)] block">
                Simulate: "Doctor on break (back at 11:30)"
              </span>
              <p className="text-xs text-[var(--color-text-muted)] leading-relaxed">
                Sets department status to doctor break with 11:30 AM resume
                time, updating patient tracker.
              </p>
            </div>
          </button>

          {/* 6. Simulate "New emergency alert from patient" */}
          <button
            type="button"
            onClick={handleSimulateEmergency}
            className="p-5 rounded-2xl border-2 text-left shadow-xs transition-all flex items-start gap-4 group border-[#D55E00]"
            style={{
              backgroundColor: 'var(--color-emergency-bg)',
              color: 'var(--color-emergency-text)',
            }}
          >
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform"
              style={{
                backgroundColor: 'var(--color-emergency-btn-bg)',
                color: 'var(--color-emergency-icon)',
                border: '2px solid var(--color-emergency-border)',
              }}
            >
              <AlertTriangle size={24} />
            </div>
            <div className="space-y-1">
              <span
                className="font-black text-base block"
                style={{ color: 'var(--color-emergency-text)' }}
              >
                Simulate: Patient Emergency Alert
              </span>
              <p className="text-xs leading-relaxed opacity-90">
                Fires rapid response alert for Meera Rao near Lift B with siren
                and pinned staff dashboard banner.
              </p>
            </div>
          </button>

          {/* 7. Add 3 random walk-in guest patients */}
          <button
            type="button"
            onClick={handleAddRandomGuests}
            className="p-5 rounded-2xl border-2 border-[var(--color-border)] bg-[var(--color-surface)] hover:bg-[var(--color-surface-2)] text-left shadow-xs transition-all flex items-start gap-4 group"
          >
            <div className="w-12 h-12 rounded-xl bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
              <UserPlus size={24} />
            </div>
            <div className="space-y-1">
              <span className="font-black text-base text-[var(--color-text-main)] block">
                Add 3 Random Walk-in Guests
              </span>
              <p className="text-xs text-[var(--color-text-muted)] leading-relaxed">
                Appends 3 guest patients to the live queue with simulated
                clinical triage needs.
              </p>
            </div>
          </button>

          {/* 8. Link to /dev/store */}
          <Link
            to="/dev/store"
            className="p-5 rounded-2xl border-2 border-[var(--color-border)] bg-[var(--color-surface)] hover:bg-[var(--color-surface-2)] text-left shadow-xs transition-all flex items-start gap-4 group"
          >
            <div className="w-12 h-12 rounded-xl bg-[var(--color-primary-50)] text-[var(--color-primary-600)] dark:bg-[var(--color-primary-950)] dark:text-[var(--color-primary-300)] flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
              <Zap size={24} />
            </div>
            <div className="space-y-1 flex-1">
              <div className="flex items-center justify-between">
                <span className="font-black text-base text-[var(--color-text-main)] block">
                  Advanced Store Inspector (/dev/store)
                </span>
                <ExternalLink
                  size={16}
                  className="text-[var(--color-text-muted)]"
                />
              </div>
              <p className="text-xs text-[var(--color-text-muted)] leading-relaxed">
                Direct raw store state visualizer with raw JSON inspector and
                granular department controls.
              </p>
            </div>
          </Link>
        </div>

        {/* Live Store Stats Snapshot */}
        <div className="p-4 sm:p-5 rounded-2xl border-2 border-[var(--color-border)] bg-[var(--color-surface-2)] space-y-3">
          <h2 className="font-bold text-sm text-[var(--color-text-main)]">
            Current Live Store Status (Synchronized across tabs)
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div className="p-3 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)]">
              <span className="text-[var(--color-text-muted)] block">
                Queue Length
              </span>
              <strong className="text-base text-[var(--color-text-main)]">
                {state.queue.length} patients
              </strong>
            </div>
            <div className="p-3 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)]">
              <span className="text-[var(--color-text-muted)] block">
                Active Emergencies
              </span>
              <strong className="text-base text-red-600">
                {
                  (state.emergencyRequests || []).filter(
                    (e) => e.status !== 'resolved'
                  ).length
                }
              </strong>
            </div>
            <div className="p-3 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)]">
              <span className="text-[var(--color-text-muted)] block">
                Notifications
              </span>
              <strong className="text-base text-[var(--color-text-main)]">
                {state.notifications?.length || 0}
              </strong>
            </div>
            <div className="p-3 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)]">
              <span className="text-[var(--color-text-muted)] block">
                Departments
              </span>
              <strong className="text-base text-[var(--color-text-main)]">
                {Object.keys(state.departments).length} active
              </strong>
            </div>
          </div>
        </div>
      </div>
    </BaseLayout>
  );
}
