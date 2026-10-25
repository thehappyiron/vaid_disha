import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Clock,
  UserCheck,
  CheckCircle2,
  AlertTriangle,
  Volume2,
  VolumeX,
  Play,
  Check,
  ArrowUp,
  ArrowDown,
  Info,
  MapPin,
  Building2,
  Sliders,
  HelpCircle,
  Coffee,
  X,
  Accessibility,
} from 'lucide-react';
import { BaseLayout } from '../../components/layout';
import { Button, PageHeader, StatusBadge } from '../../components/ui';
import {
  useLiveStore,
  type QueueEntry,
  type DepartmentLiveStatus,
  type EmergencyRequest,
} from '../../services/liveStore';
import {
  sortQueueWithEngine,
  getPatientPriorityExplanation,
  type SmartQueueSettings,
  DEFAULT_SMART_QUEUE_SETTINGS,
} from '../../services/queueEngine';

export function StaffDashboardPage() {
  const navigate = useNavigate();
  const {
    state,
    setDepartmentWaitTime,
    setDepartmentCustomStatus,
    startPatientConsultation,
    completePatientConsultation,
    postponePatient,
    movePatientQueue,
    markPatientMissed,
    routePatientOnward,
    acknowledgeEmergencyAlert,
    resolveEmergencyAlert,
  } = useLiveStore();

  const [selectedDeptId, setSelectedDeptId] = useState<string>('all');
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [smartSettings, setSmartSettings] = useState<SmartQueueSettings>(
    DEFAULT_SMART_QUEUE_SETTINGS
  );
  const [activeWhyPopover, setActiveWhyPopover] = useState<string | null>(null);
  const [customWaitInput, setCustomWaitInput] = useState<string>('');
  const prevEmergencyCountRef = useRef<number>(0);

  // Play audio chime for new emergency alerts if sound is enabled
  useEffect(() => {
    const activeAlertsCount =
      state.emergencyRequests?.filter((e) => e.status === 'alerted').length ||
      0;
    if (activeAlertsCount > prevEmergencyCountRef.current && soundEnabled) {
      try {
        const audioCtx = new (
          window.AudioContext ||
          (window as unknown as { webkitAudioContext: typeof AudioContext })
            .webkitAudioContext
        )();
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(880, audioCtx.currentTime); // A5
        osc.frequency.setValueAtTime(659.25, audioCtx.currentTime + 0.15); // E5
        gain.gain.setValueAtTime(0.3, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(
          0.01,
          audioCtx.currentTime + 0.5
        );
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.5);
      } catch {
        // AudioContext not allowed or not supported
      }
    }
    prevEmergencyCountRef.current = activeAlertsCount;
  }, [state.emergencyRequests, soundEnabled]);

  // Department list
  const departments = Object.values(state.departments);
  const activeDept: DepartmentLiveStatus | undefined =
    selectedDeptId === 'all'
      ? departments[0]
      : state.departments[selectedDeptId];

  // Filter and sort queue
  const rawQueue = state.queue.filter(
    (q) => selectedDeptId === 'all' || q.departmentId === selectedDeptId
  );
  const queueEntries = sortQueueWithEngine(rawQueue, smartSettings);

  // Summary counts
  const totalWaiting = state.queue.filter(
    (q) => q.status === 'waiting' || q.status === 'turn_soon'
  ).length;
  const totalInProgress = state.queue.filter(
    (q) => q.status === 'in_progress'
  ).length;
  const totalCompleted = state.queue.filter(
    (q) => q.status === 'completed'
  ).length;
  const activeEmergencies = (state.emergencyRequests || []).filter(
    (e) => e.status !== 'resolved'
  );

  // Format time ago
  const formatTimeAgo = (isoString: string) => {
    const diff = Math.floor(
      (Date.now() - new Date(isoString).getTime()) / 60000
    );
    if (diff < 1) return 'Just now';
    if (diff === 1) return '1 min ago';
    if (diff < 60) return `${diff} mins ago`;
    return `${Math.floor(diff / 60)}h ago`;
  };

  // Helper to format patient name showing (Guest) ONCE, never duplicated
  const renderPatientName = (patient: QueueEntry) => {
    const rawName = patient.patientName || 'Patient';
    const isGuest = patient.isGuest || rawName.includes('(Guest)');
    const cleanName = rawName.replace(/\s*\(Guest\)\s*/gi, '').trim();

    return (
      <span className="font-bold text-[var(--color-text)] break-words">
        {cleanName}
        {isGuest && (
          <span className="font-extrabold text-amber-700 dark:text-amber-400 ml-1.5 text-xs">
            (Guest)
          </span>
        )}
      </span>
    );
  };

  return (
    <BaseLayout
      showHome={true}
      headerTitle="Staff Queue Management"
      isStaff={true}
    >
      <div className="w-full max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-6 flex flex-col gap-5 sm:gap-6">
        {/* ── 1. PAGE TITLE & HEADER (Exact title on full row layout) ───────── */}
        <PageHeader
          title="Clinical Queue & Duty Desk"
          subtitle="Real-time patient intake, smart priority dispatch & room status"
          showBack={true}
          onBack={() => navigate('/')}
          actions={
            <div className="flex items-center gap-2">
              <Button
                variant="secondary"
                size="sm"
                icon={<Building2 size={16} />}
                onClick={() => navigate('/staff/patients')}
                className="whitespace-normal break-words font-bold"
              >
                Patient Records
              </Button>
            </div>
          }
        />

        {/* ── 2. SUMMARY METRICS ROW (Waiting, In Progress, Completed, Emergencies) ── */}
        <section
          aria-label="Queue Summary Statistics"
          className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4"
        >
          {/* Waiting Card */}
          <div className="p-4 sm:p-5 rounded-2xl bg-[var(--color-surface)] border-2 border-[var(--color-border)] shadow-xs flex flex-col gap-2">
            <div>
              <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300 flex items-center justify-center shrink-0">
                <Clock size={22} aria-hidden="true" />
              </div>
            </div>
            <div className="text-3xl font-black text-[var(--color-text)]">
              {totalWaiting}
            </div>
            <div className="w-full text-sm sm:text-base font-bold text-[var(--color-text-muted)] break-words leading-tight">
              Waiting
            </div>
          </div>

          {/* In Progress Card */}
          <div className="p-4 sm:p-5 rounded-2xl bg-[var(--color-surface)] border-2 border-[var(--color-border)] shadow-xs flex flex-col gap-2">
            <div>
              <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300 flex items-center justify-center shrink-0">
                <UserCheck size={22} aria-hidden="true" />
              </div>
            </div>
            <div className="text-3xl font-black text-[var(--color-text)]">
              {totalInProgress}
            </div>
            <div className="w-full text-sm sm:text-base font-bold text-[var(--color-text-muted)] break-words leading-tight">
              In progress
            </div>
          </div>

          {/* Completed Today Card */}
          <div className="p-4 sm:p-5 rounded-2xl bg-[var(--color-surface)] border-2 border-[var(--color-border)] shadow-xs flex flex-col gap-2">
            <div>
              <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 flex items-center justify-center shrink-0">
                <CheckCircle2 size={22} aria-hidden="true" />
              </div>
            </div>
            <div className="text-3xl font-black text-[var(--color-text)]">
              {totalCompleted}
            </div>
            <div className="w-full text-sm sm:text-base font-bold text-[var(--color-text-muted)] break-words leading-tight">
              Completed today
            </div>
          </div>

          {/* Active Emergencies Card with SOLID tokens */}
          <div
            className="p-4 sm:p-5 rounded-2xl shadow-xs flex flex-col gap-2 transition-colors border-[3px]"
            style={{
              backgroundColor:
                activeEmergencies.length > 0
                  ? 'var(--color-emergency-bg)'
                  : 'var(--color-surface)',
              borderColor:
                activeEmergencies.length > 0
                  ? 'var(--color-emergency-border)'
                  : 'var(--color-border)',
              color:
                activeEmergencies.length > 0
                  ? 'var(--color-emergency-text)'
                  : 'inherit',
            }}
          >
            <div>
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                style={{
                  backgroundColor:
                    activeEmergencies.length > 0
                      ? 'var(--color-emergency-btn-bg)'
                      : 'var(--color-surface-2)',
                  color:
                    activeEmergencies.length > 0
                      ? 'var(--color-emergency-icon)'
                      : 'var(--color-text-muted)',
                  border:
                    activeEmergencies.length > 0
                      ? '2px solid var(--color-emergency-border)'
                      : 'none',
                }}
              >
                <AlertTriangle size={22} aria-hidden="true" />
              </div>
            </div>
            <div
              className="text-3xl font-black"
              style={{
                color:
                  activeEmergencies.length > 0
                    ? 'var(--color-emergency-text)'
                    : 'inherit',
              }}
            >
              {activeEmergencies.length}
            </div>
            <div
              className="w-full text-sm sm:text-base font-bold break-words leading-tight"
              style={{
                color:
                  activeEmergencies.length > 0
                    ? 'var(--color-emergency-text)'
                    : 'var(--color-text-muted)',
              }}
            >
              Active emergencies
            </div>
          </div>
        </section>

        {/* ── 3. PINNED EMERGENCY ALERTS PANEL (Solid Tokens, id="emergencies") ── */}
        {activeEmergencies.length > 0 && (
          <section
            id="emergencies"
            role="alert"
            aria-live="assertive"
            aria-labelledby="emergency-panel-title"
            className="p-4 sm:p-5 rounded-2xl shadow-md flex flex-col gap-3"
            style={{
              backgroundColor: 'var(--color-emergency-bg)',
              border: '3px solid var(--color-emergency-border)',
              color: 'var(--color-emergency-text)',
            }}
          >
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-2.5">
                <AlertTriangle
                  size={24}
                  className="shrink-0"
                  style={{ color: 'var(--color-emergency-icon)' }}
                  aria-hidden="true"
                />
                <h2
                  id="emergency-panel-title"
                  className="text-base sm:text-lg font-black"
                  style={{ color: 'var(--color-emergency-text)' }}
                >
                  CRITICAL PATIENT ALERTS ({activeEmergencies.length})
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setSoundEnabled((prev) => !prev)}
                className="btn btn-sm flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black"
                style={{
                  backgroundColor: 'var(--color-emergency-btn-bg)',
                  border: '2px solid var(--color-emergency-border)',
                  color: 'var(--color-emergency-text)',
                }}
                aria-label={
                  soundEnabled ? 'Mute alert sounds' : 'Enable alert sounds'
                }
              >
                {soundEnabled ? (
                  <Volume2
                    size={16}
                    aria-hidden="true"
                    style={{ color: 'var(--color-emergency-icon)' }}
                  />
                ) : (
                  <VolumeX
                    size={16}
                    aria-hidden="true"
                    style={{ color: 'var(--color-emergency-icon)' }}
                  />
                )}
                <span>Sound: {soundEnabled ? 'ON' : 'OFF'}</span>
              </button>
            </div>

            <div className="flex flex-col gap-2.5">
              {activeEmergencies.map((emg: EmergencyRequest) => {
                const isResponding = emg.status === 'responding';

                return (
                  <div
                    key={emg.id}
                    className="p-3.5 sm:p-4 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs"
                    style={{
                      backgroundColor: 'var(--color-emergency-btn-bg)',
                      border: '2px solid var(--color-emergency-border)',
                      color: 'var(--color-emergency-text)',
                    }}
                  >
                    <div className="flex flex-col gap-1 flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span
                          className="font-mono font-black text-sm px-2.5 py-0.5 rounded-md"
                          style={{
                            backgroundColor: 'var(--color-emergency-bg)',
                            border: '1.5px solid var(--color-emergency-border)',
                            color: 'var(--color-emergency-text)',
                          }}
                        >
                          {emg.patientToken || 'EMG'}
                        </span>
                        <span
                          className="font-black text-base"
                          style={{ color: 'var(--color-emergency-text)' }}
                        >
                          {emg.patientName || 'Patient in Distress'}
                        </span>
                        <span
                          className="text-xs font-bold ml-auto sm:ml-0 font-mono"
                          style={{ color: 'var(--color-emergency-icon)' }}
                        >
                          • {formatTimeAgo(emg.timestamp)}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 text-xs sm:text-sm font-semibold flex-wrap">
                        <span
                          className="inline-flex items-center gap-1 font-bold"
                          style={{ color: 'var(--color-emergency-icon)' }}
                        >
                          <MapPin size={15} />
                          {emg.landmark}
                        </span>
                        {emg.symptoms?.length > 0 && (
                          <span
                            className="font-bold"
                            style={{ color: 'var(--color-emergency-text)' }}
                          >
                            [{emg.symptoms.join(', ')}]
                          </span>
                        )}
                      </div>

                      {emg.note && (
                        <p className="text-xs italic opacity-90">
                          "{emg.note}"
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {!isResponding ? (
                        <button
                          type="button"
                          onClick={() => acknowledgeEmergencyAlert(emg.id)}
                          className="px-3 py-1.5 rounded-xl text-xs font-black transition-all"
                          style={{
                            backgroundColor: 'var(--color-emergency-bg)',
                            border: '2px solid var(--color-emergency-border)',
                            color: 'var(--color-emergency-text)',
                          }}
                        >
                          Acknowledge
                        </button>
                      ) : (
                        <span
                          className="text-xs font-black px-2.5 py-1 rounded-lg"
                          style={{
                            backgroundColor: 'var(--color-emergency-bg)',
                            border: '1.5px solid var(--color-emergency-border)',
                            color: 'var(--color-emergency-text)',
                          }}
                        >
                          Attending Now
                        </span>
                      )}
                      <button
                        type="button"
                        onClick={() => resolveEmergencyAlert(emg.id)}
                        className="px-3.5 py-1.5 rounded-xl text-xs font-black text-white bg-emerald-700 hover:bg-emerald-800 border-2 border-emerald-900 transition-all shadow-xs"
                      >
                        Mark Attended
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* ── 4. DEPARTMENT FILTER & STATUS CONTROLS ──────────────────────────── */}
        <section
          aria-labelledby="dept-controls-title"
          className="p-4 sm:p-5 rounded-2xl bg-[var(--color-surface)] border-2 border-[var(--color-border)] shadow-xs flex flex-col gap-4"
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[var(--color-border)] pb-3.5">
            <div>
              <h2
                id="dept-controls-title"
                className="text-lg font-black text-[var(--color-text)]"
              >
                Department Wait Times & Status
              </h2>
              <p className="text-xs sm:text-sm text-[var(--color-text-muted)]">
                Changes persist to live store and sync instantly to open patient
                tabs
              </p>
            </div>

            {/* Department selector */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-thin">
              <button
                type="button"
                onClick={() => setSelectedDeptId('all')}
                className={[
                  'btn btn-sm px-3 py-1.5 rounded-xl text-xs font-bold whitespace-normal break-words transition-all shrink-0',
                  selectedDeptId === 'all'
                    ? 'btn-primary shadow-xs'
                    : 'btn-ghost border border-[var(--color-border)] text-[var(--color-text)]',
                ].join(' ')}
              >
                All Departments
              </button>
              {departments.map((dept) => (
                <button
                  key={dept.departmentId}
                  type="button"
                  onClick={() => setSelectedDeptId(dept.departmentId)}
                  className={[
                    'btn btn-sm px-3 py-1.5 rounded-xl text-xs font-bold whitespace-normal break-words transition-all shrink-0',
                    selectedDeptId === dept.departmentId
                      ? 'btn-primary shadow-xs'
                      : 'btn-ghost border border-[var(--color-border)] text-[var(--color-text)]',
                  ].join(' ')}
                >
                  {dept.departmentName}
                </button>
              ))}
            </div>
          </div>

          {/* Active department controls (when a specific dept or first is selected) */}
          {activeDept && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Wait Time Inline Adjuster */}
              <div className="p-3.5 rounded-xl bg-[var(--color-surface-2)] border border-[var(--color-border)] flex flex-col gap-2.5">
                <span className="text-xs font-black uppercase tracking-wider text-[var(--color-text-muted)]">
                  Estimated Wait per Patient: {activeDept.departmentName}
                </span>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      setDepartmentWaitTime(
                        activeDept.departmentId,
                        Math.max(
                          2,
                          activeDept.estimatedWaitPerPatientMinutes - 5
                        )
                      )
                    }
                    className="btn btn-secondary min-h-12 w-14 rounded-xl font-black text-lg p-0"
                    aria-label="Decrease wait time by 5 minutes"
                  >
                    −5m
                  </button>

                  <div className="flex-1 text-center py-2 px-3 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl">
                    <span className="text-2xl font-black text-[var(--color-text)]">
                      {activeDept.estimatedWaitPerPatientMinutes}
                    </span>
                    <span className="text-xs font-bold text-[var(--color-text-muted)] ml-1">
                      mins / patient
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      setDepartmentWaitTime(
                        activeDept.departmentId,
                        activeDept.estimatedWaitPerPatientMinutes + 5
                      )
                    }
                    className="btn btn-secondary min-h-12 w-14 rounded-xl font-black text-lg p-0"
                    aria-label="Increase wait time by 5 minutes"
                  >
                    +5m
                  </button>
                </div>

                {/* Custom wait entry */}
                <div className="flex items-center gap-2 pt-1">
                  <label htmlFor="custom-wait-input" className="sr-only">
                    Custom wait time in minutes
                  </label>
                  <input
                    id="custom-wait-input"
                    type="number"
                    min="1"
                    max="120"
                    placeholder="Custom mins"
                    aria-label="Custom wait time in minutes"
                    value={customWaitInput}
                    onChange={(e) => setCustomWaitInput(e.target.value)}
                    className="input input-sm flex-1 text-sm rounded-xl py-2 px-3 border border-[var(--color-border)] bg-[var(--color-surface)]"
                  />
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => {
                      const val = parseInt(customWaitInput, 10);
                      if (!isNaN(val) && val > 0) {
                        setDepartmentWaitTime(activeDept.departmentId, val);
                        setCustomWaitInput('');
                      }
                    }}
                    className="font-bold whitespace-normal break-words shrink-0"
                  >
                    Set Time
                  </Button>
                </div>
              </div>

              {/* Status Preset Setters */}
              <div className="p-3.5 rounded-xl bg-[var(--color-surface-2)] border border-[var(--color-border)] flex flex-col gap-2.5">
                <span className="text-xs font-black uppercase tracking-wider text-[var(--color-text-muted)]">
                  Quick Status Setters (Broadcasts live alert)
                </span>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      setDepartmentCustomStatus(
                        activeDept.departmentId,
                        'Consultations running on schedule',
                        'normal'
                      )
                    }
                    className="btn btn-secondary min-h-12 text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 p-2 bg-emerald-50 text-emerald-950 border border-emerald-300 hover:bg-emerald-100"
                  >
                    <CheckCircle2 size={16} className="shrink-0" />
                    <span>On Schedule</span>
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      setDepartmentCustomStatus(
                        activeDept.departmentId,
                        'Lab delayed by 20 min',
                        'delayed',
                        { delayMinutes: 20 }
                      )
                    }
                    className="btn btn-secondary min-h-12 text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 p-2 bg-amber-50 text-amber-950 border border-amber-300 hover:bg-amber-100"
                  >
                    <Clock size={16} className="shrink-0" />
                    <span>Lab Delayed (+20m)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      setDepartmentCustomStatus(
                        activeDept.departmentId,
                        'Doctor on break until 3:15 PM',
                        'break',
                        { breakUntil: '3:15 PM' }
                      )
                    }
                    className="btn btn-secondary min-h-12 text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 p-2 bg-purple-50 text-purple-950 border border-purple-300 hover:bg-purple-100"
                  >
                    <Coffee size={16} className="shrink-0" />
                    <span>Doctor Break (3:15 PM)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      setDepartmentCustomStatus(
                        activeDept.departmentId,
                        'Emergency Cases Prioritized',
                        'emergency'
                      )
                    }
                    className="btn btn-secondary min-h-12 text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 p-2 bg-red-50 text-red-950 border border-red-300 hover:bg-red-100"
                  >
                    <AlertTriangle size={16} className="shrink-0" />
                    <span>Emergency Priority</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </section>

        {/* ── 5. SMART QUEUE PANEL (Priority Settings & Toggles) ──────────────── */}
        <section
          aria-labelledby="smart-queue-title"
          className="p-4 sm:p-5 rounded-2xl bg-[var(--color-surface)] border-2 border-[var(--color-border)] shadow-xs flex flex-col gap-3"
        >
          <div className="flex items-center gap-2">
            <Sliders
              size={20}
              className="text-[var(--color-primary-500)]"
              aria-hidden="true"
            />
            <h2
              id="smart-queue-title"
              className="text-base sm:text-lg font-black text-[var(--color-text)]"
            >
              Smart Triage & Priority Rules Engine
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <label className="flex items-center gap-3 p-3 rounded-xl bg-[var(--color-surface-2)] border border-[var(--color-border)] cursor-pointer">
              <input
                type="checkbox"
                checked={smartSettings.prioritizeEmergency}
                onChange={(e) =>
                  setSmartSettings({
                    ...smartSettings,
                    prioritizeEmergency: e.target.checked,
                  })
                }
                className="w-5 h-5 text-[var(--color-primary-500)] rounded-md cursor-pointer shrink-0"
              />
              <div>
                <span className="font-bold text-sm text-[var(--color-text)] block">
                  Prioritise emergency
                </span>
                <span className="text-xs text-[var(--color-text-muted)] block">
                  Acute symptoms automatically triage to the top
                </span>
              </div>
            </label>

            <label className="flex items-center gap-3 p-3 rounded-xl bg-[var(--color-surface-2)] border border-[var(--color-border)] cursor-pointer">
              <input
                type="checkbox"
                checked={smartSettings.prioritizeElderlyDisabled}
                onChange={(e) =>
                  setSmartSettings({
                    ...smartSettings,
                    prioritizeElderlyDisabled: e.target.checked,
                  })
                }
                className="w-5 h-5 text-[var(--color-primary-500)] rounded-md cursor-pointer shrink-0"
              />
              <div>
                <span className="font-bold text-sm text-[var(--color-text)] block">
                  Prioritise elderly & disabled
                </span>
                <span className="text-xs text-[var(--color-text-muted)] block">
                  Age 65+ and wheelchair/mobility needs next
                </span>
              </div>
            </label>

            <label className="flex items-center gap-3 p-3 rounded-xl bg-[var(--color-surface-2)] border border-[var(--color-border)] cursor-pointer">
              <input
                type="checkbox"
                checked={smartSettings.autoRecalculateWaitTimes}
                onChange={(e) =>
                  setSmartSettings({
                    ...smartSettings,
                    autoRecalculateWaitTimes: e.target.checked,
                  })
                }
                className="w-5 h-5 text-[var(--color-primary-500)] rounded-md cursor-pointer shrink-0"
              />
              <div>
                <span className="font-bold text-sm text-[var(--color-text)] block">
                  Auto-recalculate wait times
                </span>
                <span className="text-xs text-[var(--color-text-muted)] block">
                  Dynamically adjust patient countdowns
                </span>
              </div>
            </label>
          </div>
        </section>

        {/* ── 6. QUEUE TABLE & ACTIONS ────────────────────────────────────────── */}
        <section
          aria-labelledby="queue-table-title"
          className="flex flex-col gap-3"
        >
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div>
              <h2
                id="queue-table-title"
                className="text-xl sm:text-2xl font-black text-[var(--color-text)]"
              >
                Live Queue Roster ({queueEntries.length})
              </h2>
              <p className="text-xs sm:text-sm text-[var(--color-text-muted)]">
                Select patient actions to update live consultations and notify
                patients
              </p>
            </div>
          </div>

          {/* ── DESKTOP TABLE (md: and above, max-w-7xl) ─────────────────────── */}
          <div className="hidden md:block w-full overflow-hidden rounded-2xl border-2 border-[var(--color-border)] bg-[var(--color-surface)] shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-[var(--color-surface-2)] border-b-2 border-[var(--color-border)] text-xs font-black uppercase tracking-wider text-[var(--color-text-muted)]">
                    <th scope="col" className="px-4 py-3.5">
                      Token
                    </th>
                    <th scope="col" className="px-4 py-3.5">
                      Patient Name
                    </th>
                    <th scope="col" className="px-4 py-3.5">
                      Purpose
                    </th>
                    <th scope="col" className="px-4 py-3.5">
                      A11y Needs
                    </th>
                    <th scope="col" className="px-4 py-3.5">
                      Status
                    </th>
                    <th scope="col" className="px-4 py-3.5">
                      Wait Time
                    </th>
                    <th scope="col" className="px-4 py-3.5">
                      Priority Logic
                    </th>
                    <th scope="col" className="px-4 py-3.5 text-right">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--color-border)] text-sm">
                  {queueEntries.map((patient) => {
                    const isInConsult = patient.status === 'in_progress';
                    const isTurnSoon = patient.status === 'turn_soon';
                    const isCompleted = patient.status === 'completed';
                    const explanation = getPatientPriorityExplanation(
                      patient,
                      smartSettings
                    );

                    return (
                      <tr
                        key={patient.id}
                        className={[
                          'transition-colors hover:bg-[var(--color-surface-2)]',
                          patient.isEmergency
                            ? 'border-2 border-[var(--color-emergency-border)] bg-[var(--color-emergency-bg)] text-[var(--color-emergency-text)]'
                            : '',
                          isInConsult
                            ? 'bg-[var(--color-primary-50)] dark:bg-[var(--color-primary-950)] font-semibold'
                            : '',
                        ].join(' ')}
                      >
                        {/* Token */}
                        <td className="px-4 py-3.5">
                          <span className="font-mono font-black text-sm px-2.5 py-1 rounded-lg bg-[var(--color-surface-2)] border border-[var(--color-border)] text-[var(--color-text)]">
                            {patient.token}
                          </span>
                        </td>

                        {/* Patient Name (single '(Guest)' tag, not duplicated) */}
                        <td className="px-4 py-3.5">
                          {renderPatientName(patient)}
                          {patient.age && (
                            <span className="text-xs text-[var(--color-text-muted)] ml-1">
                              ({patient.age}y)
                            </span>
                          )}
                        </td>

                        {/* Purpose */}
                        <td className="px-4 py-3.5 text-[var(--color-text-muted)] max-w-xs break-words">
                          {patient.purpose || 'General Consultation'}
                        </td>

                        {/* Accessibility Needs */}
                        <td className="px-4 py-3.5">
                          {patient.accessibilityNeeds &&
                          patient.accessibilityNeeds.length > 0 ? (
                            <div className="flex items-center gap-1.5 flex-wrap">
                              {patient.accessibilityNeeds.map((need, idx) => (
                                <span
                                  key={idx}
                                  className="inline-flex items-center gap-1.5 text-[11px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-900 border border-blue-300"
                                >
                                  <Accessibility
                                    size={12}
                                    className="shrink-0"
                                    aria-hidden="true"
                                  />
                                  <span>{need.replace('_', ' ')}</span>
                                </span>
                              ))}
                            </div>
                          ) : (
                            <span className="text-xs text-[var(--color-text-muted)] font-mono">
                              —
                            </span>
                          )}
                        </td>

                        {/* Live Status */}
                        <td className="px-4 py-3.5">
                          <StatusBadge
                            variant={
                              patient.isEmergency
                                ? 'danger'
                                : isInConsult
                                  ? 'success'
                                  : isTurnSoon
                                    ? 'info'
                                    : isCompleted
                                      ? 'neutral'
                                      : 'warning'
                            }
                            label={
                              patient.isEmergency
                                ? 'Emergency'
                                : isInConsult
                                  ? 'In Consultation'
                                  : isTurnSoon
                                    ? 'Next in Line'
                                    : isCompleted
                                      ? 'Completed'
                                      : 'Waiting'
                            }
                          />
                        </td>

                        {/* Wait Time */}
                        <td className="px-4 py-3.5 font-bold text-[var(--color-text)]">
                          {isInConsult || isCompleted ? (
                            <span className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold">
                              —
                            </span>
                          ) : (
                            `${patient.estimatedWaitMinutes} min`
                          )}
                        </td>

                        {/* Priority Explanation ("Why is this patient here?") */}
                        <td className="px-4 py-3.5">
                          <div className="relative inline-block">
                            <button
                              type="button"
                              onClick={() =>
                                setActiveWhyPopover(
                                  activeWhyPopover === patient.id
                                    ? null
                                    : patient.id
                                )
                              }
                              className={[
                                'inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-lg border transition-all cursor-pointer',
                                explanation.level === 'emergency'
                                  ? 'bg-red-100 text-red-900 border-red-300'
                                  : explanation.level === 'priority'
                                    ? 'bg-purple-100 text-purple-900 border-purple-300'
                                    : 'bg-[var(--color-surface-2)] text-[var(--color-text-muted)] border-[var(--color-border)]',
                              ].join(' ')}
                              aria-label={`Why is patient ${patient.token} in this position?`}
                            >
                              <HelpCircle size={13} />
                              <span>{explanation.badge}</span>
                            </button>

                            {/* Tooltip / Popover */}
                            {activeWhyPopover === patient.id && (
                              <div className="absolute left-0 top-full mt-1.5 z-30 w-64 p-3 bg-[var(--color-surface)] border-2 border-[var(--color-border)] rounded-xl shadow-xl text-xs text-[var(--color-text)] animate-in fade-in zoom-in-95 duration-150">
                                <div className="flex items-center justify-between pb-1.5 mb-1.5 border-b border-[var(--color-border)]">
                                  <span className="font-black text-[var(--color-primary-600)]">
                                    Priority Breakdown
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => setActiveWhyPopover(null)}
                                    className="text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
                                  >
                                    <X size={14} />
                                  </button>
                                </div>
                                <p className="leading-snug">
                                  {explanation.reason}
                                </p>
                              </div>
                            )}
                          </div>
                        </td>

                        {/* Row Actions */}
                        <td className="px-4 py-3.5 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {isInConsult ? (
                              <div className="flex items-center gap-1.5 flex-wrap justify-end">
                                <Button
                                  variant="secondary"
                                  size="sm"
                                  icon={<Check size={14} />}
                                  onClick={() =>
                                    completePatientConsultation(patient.token)
                                  }
                                  className="font-bold bg-emerald-50 text-emerald-950 border-emerald-300 hover:bg-emerald-100 whitespace-normal break-words"
                                >
                                  Completed
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() =>
                                    markPatientMissed(patient.token)
                                  }
                                  className="font-bold text-amber-800 bg-amber-50 border border-amber-300 hover:bg-amber-100 whitespace-normal break-words text-xs"
                                  title="Patient called but not present"
                                >
                                  Missed Turn
                                </Button>
                                <div className="relative group">
                                  <button
                                    type="button"
                                    className="px-2 py-1 text-xs font-bold rounded-lg border border-[var(--color-primary-300)] bg-[var(--color-primary-50)] text-[var(--color-primary-700)] hover:bg-[var(--color-primary-100)]"
                                  >
                                    Next Step ▾
                                  </button>
                                  <div className="hidden group-hover:flex group-focus-within:flex flex-col absolute right-0 top-full mt-1 z-30 bg-white border border-slate-200 shadow-xl rounded-xl p-1.5 text-xs min-w-36 text-left">
                                    <button
                                      type="button"
                                      onClick={() =>
                                        routePatientOnward(
                                          patient.token,
                                          'Central Pathology Lab'
                                        )
                                      }
                                      className="px-2.5 py-1.5 text-left rounded-lg hover:bg-slate-100 font-medium text-slate-800"
                                    >
                                      → Route to Lab
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() =>
                                        routePatientOnward(
                                          patient.token,
                                          'Radiology & X-Ray Wing'
                                        )
                                      }
                                      className="px-2.5 py-1.5 text-left rounded-lg hover:bg-slate-100 font-medium text-slate-800"
                                    >
                                      → Route to X-Ray
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() =>
                                        routePatientOnward(
                                          patient.token,
                                          'Pharmacy (G-04)'
                                        )
                                      }
                                      className="px-2.5 py-1.5 text-left rounded-lg hover:bg-slate-100 font-medium text-slate-800"
                                    >
                                      → Route to Pharmacy
                                    </button>
                                  </div>
                                </div>
                              </div>
                            ) : !isCompleted ? (
                              <>
                                <Button
                                  variant="primary"
                                  size="sm"
                                  icon={<Play size={13} />}
                                  onClick={() =>
                                    startPatientConsultation(patient.token)
                                  }
                                  className="font-bold whitespace-normal break-words"
                                >
                                  Start
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => postponePatient(patient.token)}
                                  className="border border-[var(--color-border)] font-bold whitespace-normal break-words"
                                  title="Postpone patient"
                                >
                                  Postpone
                                </Button>
                                <div className="flex flex-col gap-0.5">
                                  <button
                                    type="button"
                                    onClick={() =>
                                      movePatientQueue(patient.token, 'up')
                                    }
                                    className="p-1 rounded bg-[var(--color-surface-2)] hover:bg-[var(--color-border)] text-[var(--color-text)]"
                                    aria-label="Move patient up in queue"
                                  >
                                    <ArrowUp size={12} />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      movePatientQueue(patient.token, 'down')
                                    }
                                    className="p-1 rounded bg-[var(--color-surface-2)] hover:bg-[var(--color-border)] text-[var(--color-text)]"
                                    aria-label="Move patient down in queue"
                                  >
                                    <ArrowDown size={12} />
                                  </button>
                                </div>
                              </>
                            ) : (
                              <span className="text-xs font-bold text-slate-400">
                                Archived
                              </span>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* ── MOBILE STACKED CARDS (under md) ──────────────────────────────── */}
          <div className="flex md:hidden flex-col gap-3">
            {queueEntries.map((patient) => {
              const isInConsult = patient.status === 'in_progress';
              const isTurnSoon = patient.status === 'turn_soon';
              const isCompleted = patient.status === 'completed';
              const explanation = getPatientPriorityExplanation(
                patient,
                smartSettings
              );

              return (
                <div
                  key={patient.id}
                  className={[
                    'p-4 rounded-2xl border-2 bg-[var(--color-surface)] shadow-xs flex flex-col gap-3',
                    patient.isEmergency
                      ? 'border-[3px] border-[var(--color-emergency-border)] bg-[var(--color-emergency-bg)] text-[var(--color-emergency-text)]'
                      : isInConsult
                        ? 'border-2 border-[var(--color-primary-500)] bg-[var(--color-primary-50)] dark:bg-[var(--color-primary-950)]'
                        : 'border-[var(--color-border)]',
                  ].join(' ')}
                >
                  {/* Token and Name */}
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono font-black text-sm px-2.5 py-1 rounded-lg bg-[var(--color-surface-2)] border border-[var(--color-border)] text-[var(--color-text)]">
                        {patient.token}
                      </span>
                      <div className="font-bold text-base text-[var(--color-text)]">
                        {renderPatientName(patient)}
                      </div>
                    </div>
                  </div>

                  {/* Badges in a wrapping row */}
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {/* Status Badge */}
                    <StatusBadge
                      variant={
                        patient.isEmergency
                          ? 'danger'
                          : isInConsult
                            ? 'success'
                            : isTurnSoon
                              ? 'info'
                              : isCompleted
                                ? 'neutral'
                                : 'warning'
                      }
                      label={
                        patient.isEmergency
                          ? 'Emergency'
                          : isInConsult
                            ? 'In Consultation'
                            : isTurnSoon
                              ? 'Next in Line'
                              : isCompleted
                                ? 'Completed'
                                : 'Waiting'
                      }
                    />

                    {/* Wait Time Badge */}
                    {!isCompleted && (
                      <span className="inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-lg bg-[var(--color-surface-2)] border border-[var(--color-border)] text-[var(--color-text)]">
                        <Clock size={12} aria-hidden="true" />
                        {isInConsult
                          ? 'Attending now'
                          : `Wait: ${patient.estimatedWaitMinutes}m`}
                      </span>
                    )}

                    {/* Department / Purpose Badge */}
                    <span className="inline-flex items-center text-xs font-semibold px-2 py-0.5 rounded-lg bg-[var(--color-surface-2)] border border-[var(--color-border)] text-[var(--color-text-muted)] truncate max-w-[200px]">
                      {patient.purpose || 'General Consultation'}
                    </span>

                    {/* Accessibility Badges */}
                    {patient.accessibilityNeeds &&
                      patient.accessibilityNeeds.length > 0 && (
                        <>
                          {patient.accessibilityNeeds.map((need, idx) => (
                            <span
                              key={idx}
                              className="inline-flex items-center gap-1.5 text-[11px] font-bold px-2 py-0.5 rounded-lg bg-blue-100 text-blue-900 dark:bg-blue-950 dark:text-blue-200 border border-blue-300 dark:border-blue-800"
                            >
                              <Accessibility
                                size={12}
                                className="shrink-0"
                                aria-hidden="true"
                              />
                              <span>{need.replace('_', ' ')}</span>
                            </span>
                          ))}
                        </>
                      )}

                    {/* Priority Tag */}
                    <span className="text-[11px] font-bold px-2 py-0.5 rounded-lg bg-purple-100 text-purple-900 dark:bg-purple-950 dark:text-purple-200 border border-purple-300 dark:border-purple-800">
                      {explanation.badge}
                    </span>
                  </div>

                  {/* Plain language priority explanation */}
                  <div className="p-2.5 rounded-xl bg-[var(--color-surface-2)] text-xs text-[var(--color-text)] leading-snug flex items-start gap-1.5">
                    <Info
                      size={15}
                      className="shrink-0 text-[var(--color-primary-500)] mt-0.5"
                    />
                    <span>{explanation.reason}</span>
                  </div>

                  {/* Action buttons full width */}
                  <div className="flex flex-col gap-2 pt-2 border-t border-[var(--color-border)]">
                    {isInConsult ? (
                      <div className="flex flex-col gap-2">
                        <Button
                          variant="secondary"
                          fullWidth
                          icon={<Check size={16} />}
                          onClick={() =>
                            completePatientConsultation(patient.token)
                          }
                          className="font-bold min-h-12 bg-emerald-700 hover:bg-emerald-800 text-white border-2 border-emerald-900 whitespace-normal break-words"
                        >
                          Mark Consultation Complete
                        </Button>
                        <div className="grid grid-cols-2 gap-2">
                          <Button
                            variant="ghost"
                            onClick={() => markPatientMissed(patient.token)}
                            className="font-bold min-h-11 border border-amber-300 bg-amber-50 text-amber-900 text-xs"
                          >
                            Missed Turn
                          </Button>
                          <Button
                            variant="ghost"
                            onClick={() =>
                              routePatientOnward(
                                patient.token,
                                'Central Pathology Lab'
                              )
                            }
                            className="font-bold min-h-11 border border-blue-300 bg-blue-50 text-blue-900 text-xs"
                          >
                            Route to Lab →
                          </Button>
                        </div>
                      </div>
                    ) : !isCompleted ? (
                      <>
                        <Button
                          variant="primary"
                          fullWidth
                          icon={<Play size={15} />}
                          onClick={() =>
                            startPatientConsultation(patient.token)
                          }
                          className="font-bold min-h-12 whitespace-normal break-words"
                        >
                          Start Consultation
                        </Button>
                        <div className="grid grid-cols-2 gap-2">
                          <Button
                            variant="ghost"
                            onClick={() => postponePatient(patient.token)}
                            className="font-bold min-h-12 border border-[var(--color-border)] whitespace-normal break-words"
                          >
                            Postpone
                          </Button>
                          <div className="grid grid-cols-2 gap-1">
                            <button
                              type="button"
                              onClick={() =>
                                movePatientQueue(patient.token, 'up')
                              }
                              className="min-h-12 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-2)] text-[var(--color-text)] font-bold text-xs flex items-center justify-center gap-1"
                              aria-label="Move up"
                            >
                              <ArrowUp size={14} />
                              <span>Up</span>
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                movePatientQueue(patient.token, 'down')
                              }
                              className="min-h-12 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-2)] text-[var(--color-text)] font-bold text-xs flex items-center justify-center gap-1"
                              aria-label="Move down"
                            >
                              <ArrowDown size={14} />
                              <span>Down</span>
                            </button>
                          </div>
                        </div>
                      </>
                    ) : (
                      <div className="text-center py-1 text-xs font-bold text-[var(--color-text-muted)]">
                        Consultation Completed & Archived
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </div>
    </BaseLayout>
  );
}
