import { getDepartment } from '../../data/departments';
import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import {
  Building2,
  Clock,
  DoorClosed,
  Stethoscope,
  ArrowLeft,
  Navigation,
  FileText,
  Volume2,
  VolumeX,
  AlertTriangle,
  TriangleAlert,
  UserCheck,
  BellRing,
  Coffee,
  Radio,
  Sparkles,
  Users,
  CheckCircle,
  FlaskConical,
} from 'lucide-react';
import { BaseLayout } from '../../components/layout';
import { Button, StatusBadge } from '../../components/ui';
import { usePatientLiveStatus, useLiveStore } from '../../services/liveStore';
import { getSlipById } from '../../services/hospitalService';
import type { Slip } from '../../types';

export function PatientLivePage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const tokenParam = searchParams.get('token') || '';
  const deptParam = searchParams.get('dept') || '';
  const slipIdParam = searchParams.get('slipId') || '';

  const [slip, setSlip] = useState<Slip | null>(null);
  const [isSpeaking, setIsSpeaking] = useState(false);

  // Load slip if slipId provided or fallback to latest
  useEffect(() => {
    async function fetchSlip() {
      try {
        const loaded = await getSlipById(slipIdParam || 'latest');
        if (loaded) {
          setSlip(loaded);
        }
      } catch (err) {
        console.warn('Could not fetch slip for live page', err);
      }
    }
    fetchSlip();
  }, [slipIdParam]);

  const activeToken = tokenParam || slip?.token || 'CARD-1042';
  const activeDeptId =
    getDepartment(deptParam || slip?.department?.id)?.id || 'opd-general-2';

  const liveData = usePatientLiveStatus(activeToken, activeDeptId);
  const { state: liveStoreState } = useLiveStore();

  const deptLive = liveData.department;
  const currentToken = liveData.nowServingToken;
  const myStatus = liveData.status;
  const peopleAhead = liveData.peopleAhead;
  const waitMinutes = liveData.estimatedWaitMinutes;
  const activeAlerts = liveData.activeAlerts;

  // Department Queue List for Visual Queue Stepper
  const deptQueue = liveStoreState.queue.filter(
    (q) => q.departmentId === activeDeptId && q.status !== 'cancelled'
  );

  // Status visual configurations (icon + text + colour)
  const getVisualStatus = () => {
    if (deptLive?.statusCode === 'emergency') {
      return {
        variant: 'danger' as const,
        icon: (
          <TriangleAlert
            size={32}
            className="text-red-600 animate-pulse shrink-0"
          />
        ),
        badgeText: 'Emergency Priority',
        title: deptLive?.statusMessage || 'Emergency Priority Active',
        description:
          'Doctors are currently attending urgent trauma and critical patients.',
        cardBg: 'bg-red-50 border-2 border-red-500 text-red-950',
        bannerIconBg: 'bg-red-100 text-red-700',
        waitDisplay: 'Immediate Attention',
      };
    }

    if (myStatus === 'in_progress') {
      return {
        variant: 'success' as const,
        icon: (
          <UserCheck
            size={32}
            className="text-emerald-700 animate-pulse shrink-0"
          />
        ),
        badgeText: 'Attending Now',
        title: `Doctor is attending your token (#${activeToken})`,
        description: `Please step inside Room ${deptLive?.roomNumber || slip?.roomNumber || '2'} now.`,
        cardBg: 'bg-emerald-50 border-2 border-emerald-500 text-emerald-950',
        bannerIconBg: 'bg-emerald-100 text-emerald-800',
        waitDisplay: 'No wait — enter room',
      };
    }

    if (myStatus === 'turn_soon') {
      return {
        variant: 'info' as const,
        icon: (
          <BellRing
            size={32}
            className="text-blue-700 animate-bounce shrink-0"
          />
        ),
        badgeText: 'Your Turn Soon',
        title: 'You are next in line!',
        description: `Please wait directly outside Room ${deptLive?.roomNumber || slip?.roomNumber || '2'}. The doctor will call you in a moment.`,
        cardBg: 'bg-blue-50 border-2 border-blue-500 text-blue-950',
        bannerIconBg: 'bg-blue-100 text-blue-800',
        waitDisplay: `~${waitMinutes} min`,
      };
    }

    if (deptLive?.statusCode === 'break') {
      return {
        variant: 'warning' as const,
        icon: <Coffee size={32} className="text-amber-700 shrink-0" />,
        badgeText: 'Doctor on Break',
        title:
          deptLive.statusMessage ||
          `Doctor on break until ${deptLive.breakUntil || 'shortly'}`,
        description:
          'Consultations are paused temporarily. Please take a seat in the waiting lounge.',
        cardBg: 'bg-amber-50 border-2 border-amber-500 text-amber-950',
        bannerIconBg: 'bg-amber-100 text-amber-800',
        waitDisplay: `~${waitMinutes} min`,
      };
    }

    if (deptLive?.statusCode === 'delayed') {
      return {
        variant: 'warning' as const,
        icon: <AlertTriangle size={32} className="text-orange-700 shrink-0" />,
        badgeText: 'Procedure Delayed',
        title:
          deptLive.statusMessage ||
          `Lab delayed by ${deptLive.delayMinutes || 20} min`,
        description:
          'Batch sample calibration in progress. Wait times have been automatically recalculated.',
        cardBg: 'bg-orange-50 border-2 border-orange-500 text-orange-950',
        bannerIconBg: 'bg-orange-100 text-orange-800',
        waitDisplay: `~${waitMinutes} min`,
      };
    }

    // Default: Doctor with another patient / normal
    return {
      variant: 'warning' as const,
      icon: <Stethoscope size={32} className="text-indigo-700 shrink-0" />,
      badgeText: 'In Consultation',
      title: deptLive?.statusMessage || 'Doctor with another patient',
      description: currentToken
        ? `The doctor is currently consulting with token #${currentToken} inside Room ${deptLive?.roomNumber || '2'}.`
        : 'Consultations are in progress. Queue is moving steadily.',
      cardBg: 'bg-indigo-50 border-2 border-indigo-400 text-indigo-950',
      bannerIconBg: 'bg-indigo-100 text-indigo-800',
      waitDisplay: `~${waitMinutes} min`,
    };
  };

  const visual = getVisualStatus();

  // TTS Read Aloud
  const handleSpeak = () => {
    if (!('speechSynthesis' in window)) return;

    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      return;
    }

    window.speechSynthesis.cancel();
    const text = `Hospital Destination Live Status. ${deptLive?.departmentName || 'Department'}, Room ${deptLive?.roomNumber || '101'}. ${visual.title}. Estimated wait is ${waitMinutes} minutes. There are ${peopleAhead} patients ahead of you. Currently serving token ${currentToken || 'none'}.`;
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.95;
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);
    window.speechSynthesis.speak(utterance);
    setIsSpeaking(true);
  };

  return (
    <BaseLayout showHome={true} headerTitle="Live Room Tracker">
      <div className="page-container gap-4 sm:gap-6">
        {/* Top Navigation & Status Bar */}
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <Button
            variant="ghost"
            size="sm"
            icon={<ArrowLeft size={18} />}
            onClick={() => {
              if (slip?.id) {
                navigate(`/patient/slip/${slip.id}`);
              } else {
                navigate(-1);
              }
            }}
          >
            Back to Slip
          </Button>

          {/* Multi-Tab Sync Indicator */}
          <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-300 text-emerald-900 text-xs font-bold">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <span>Multi-Tab Live Sync Active</span>
          </div>
        </div>

        {/* ══════════════════════════════════════════════════════════════════
            HERO CARD: WHAT'S HAPPENING AT THE DESTINATION RIGHT NOW
            ══════════════════════════════════════════════════════════════════ */}
        <div
          role="region"
          aria-live="polite"
          aria-atomic="true"
          aria-label="Destination live queue feed"
          className={`p-5 sm:p-6 rounded-3xl shadow-sm flex flex-col gap-4 ${visual.cardBg}`}
        >
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-white/90 shadow-2xs">
                <Radio size={14} className="text-red-500 animate-pulse" />
                Live Destination Feed
              </span>
            </div>

            <StatusBadge
              variant={visual.variant}
              label={visual.badgeText}
              icon={visual.icon}
            />
          </div>

          {/* Main Status Headline with Rich Icon */}
          <div className="flex items-start gap-4">
            <div
              className={`p-3.5 rounded-2xl ${visual.bannerIconBg} shrink-0 shadow-2xs`}
            >
              {visual.icon}
            </div>
            <div className="flex-1 min-w-0">
              <span className="text-xs font-extrabold uppercase tracking-wider opacity-75 block mb-0.5">
                Current Activity
              </span>
              <h1 className="text-2xl sm:text-3xl font-black leading-tight break-words">
                {visual.title}
              </h1>
              <p className="text-sm sm:text-base font-semibold opacity-90 mt-1.5 leading-relaxed">
                {visual.description}
              </p>
            </div>
          </div>

          {/* Audio TTS Announcement button */}
          <div className="pt-2 flex items-center justify-between gap-3 border-t border-current/15 flex-wrap">
            <button
              type="button"
              onClick={handleSpeak}
              className={[
                'btn btn-sm px-3.5 py-2 rounded-xl flex items-center gap-2 transition-all font-bold text-xs',
                isSpeaking
                  ? 'bg-black text-white animate-pulse'
                  : 'bg-white/90 text-current hover:bg-white border border-current/20 shadow-2xs',
              ].join(' ')}
            >
              {isSpeaking ? <VolumeX size={16} /> : <Volume2 size={16} />}
              <span>
                {isSpeaking
                  ? 'Stop Audio Announcement'
                  : 'Listen to Status Announcement'}
              </span>
            </button>

            <span className="text-xs font-mono opacity-75">
              Updated:{' '}
              {new Date(liveStoreState.lastUpdated).toLocaleTimeString()}
            </span>
          </div>
        </div>

        {/* ══════════════════════════════════════════════════════════════════
            DESTINATION ROOM & SPECIALIST DETAILS
            ══════════════════════════════════════════════════════════════════ */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Destination Details Card */}
          <div className="card p-5 rounded-2xl border-2 border-[var(--color-border)] bg-[var(--color-surface)] flex flex-col gap-3 shadow-2xs">
            <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-[var(--color-primary-700)]">
              <Building2 size={16} />
              Destination Information
            </div>

            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-[var(--color-primary-50)] text-[var(--color-primary-600)] flex items-center justify-center shrink-0">
                <DoorClosed size={26} />
              </div>
              <div>
                <span className="text-xs font-bold text-[var(--color-text-muted)] block">
                  Room & Location
                </span>
                <span className="text-lg font-black text-[var(--color-text)]">
                  Room {deptLive?.roomNumber || slip?.roomNumber || '2'}
                </span>
                <span className="text-xs text-[var(--color-text-muted)] block">
                  Floor {deptLive?.floor ?? slip?.floor ?? 2} •{' '}
                  {deptLive?.building || 'Main OPD Block'}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-3 pt-2 border-t border-[var(--color-border)]">
              <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center shrink-0">
                <Stethoscope size={22} />
              </div>
              <div>
                <span className="text-xs font-bold text-[var(--color-text-muted)] block">
                  Consulting Doctor
                </span>
                <span className="text-base font-extrabold text-[var(--color-text)]">
                  {deptLive?.activeDoctorName ||
                    slip?.doctorName ||
                    'Doctor on Duty'}
                </span>
                <span className="text-xs text-[var(--color-text-muted)] block">
                  {deptLive?.departmentName || 'Specialist Consultation'}
                </span>
              </div>
            </div>
          </div>

          {/* Real-time Wait & Queue Metrics Card */}
          <div className="card p-5 rounded-2xl border-2 border-[var(--color-border)] bg-[var(--color-surface)] flex flex-col justify-between gap-3 shadow-2xs">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-black uppercase tracking-wider text-[var(--color-primary-700)] flex items-center gap-1.5">
                <Clock size={16} />
                Live Wait Calculation
              </span>
              <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-[var(--color-surface-2)]">
                Dynamic
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-1">
              {/* Estimated Wait */}
              <div className="p-3.5 rounded-xl bg-[var(--color-surface-2)] border border-[var(--color-border)] flex flex-col justify-center">
                <span className="text-xs font-bold text-[var(--color-text-muted)] block mb-0.5">
                  Estimated Wait
                </span>
                <span className="text-2xl sm:text-3xl font-black text-[var(--color-primary-600)] leading-tight">
                  {visual.waitDisplay}
                </span>
                <span className="text-[11px] text-[var(--color-text-muted)] font-medium mt-1">
                  Adjusts automatically
                </span>
              </div>

              {/* People Ahead */}
              <div className="p-3.5 rounded-xl bg-[var(--color-surface-2)] border border-[var(--color-border)] flex flex-col justify-center">
                <span className="text-xs font-bold text-[var(--color-text-muted)] block mb-0.5">
                  Ahead of You
                </span>
                <span className="text-2xl sm:text-3xl font-black text-[var(--color-text)] leading-tight">
                  {peopleAhead} {peopleAhead === 1 ? 'patient' : 'patients'}
                </span>
                <span className="text-[11px] text-[var(--color-text-muted)] font-medium mt-1">
                  {peopleAhead === 0
                    ? 'You are up next!'
                    : 'In line before you'}
                </span>
              </div>
            </div>

            <div className="p-2.5 rounded-xl bg-[var(--color-primary-50)] text-xs text-[var(--color-primary-950)] font-semibold flex items-center gap-2">
              <Sparkles
                size={16}
                className="text-[var(--color-primary-600)] shrink-0"
              />
              <span>
                BroadcastChannel automatically updates this screen when the
                doctor advances the queue.
              </span>
            </div>
          </div>
        </div>

        {/* ══════════════════════════════════════════════════════════════════
            LIVE QUEUE PIPELINE TRACKER
            ══════════════════════════════════════════════════════════════════ */}
        <div className="card p-5 sm:p-6 rounded-2xl border-2 border-[var(--color-border)] bg-[var(--color-surface)] flex flex-col gap-4 shadow-2xs">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div>
              <h2 className="text-lg font-black text-[var(--color-text)] flex items-center gap-2">
                <Users size={20} className="text-[var(--color-primary-600)]" />
                Live Department Queue Board
              </h2>
              <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
                Current patient sequence for{' '}
                {deptLive?.departmentName || 'this room'}
              </p>
            </div>

            {/* Currently Calling Token */}
            <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-emerald-50 border-2 border-emerald-300 text-emerald-950">
              <span className="text-xs font-bold uppercase tracking-wider">
                Now Calling:
              </span>
              <span className="font-mono font-black text-base text-emerald-700">
                {currentToken || 'None'}
              </span>
            </div>
          </div>

          {/* Tokens list in queue */}
          <div className="flex flex-col gap-2 pt-2">
            {deptQueue.length === 0 ? (
              <p className="text-sm text-[var(--color-text-muted)] py-4 text-center">
                No active patients waiting in queue.
              </p>
            ) : (
              deptQueue.map((patient) => {
                const isMe =
                  patient.token.toUpperCase() === activeToken.toUpperCase();
                const isCurrent = patient.status === 'in_progress';
                const isCompleted = patient.status === 'completed';

                return (
                  <div
                    key={patient.id}
                    className={[
                      'p-3.5 rounded-xl border flex items-center justify-between gap-3 transition-all',
                      isMe
                        ? 'border-2 border-[var(--color-primary-500)] bg-[var(--color-primary-50)] shadow-xs'
                        : isCurrent
                          ? 'border-2 border-emerald-400 bg-emerald-50/70'
                          : isCompleted
                            ? 'border-[var(--color-border)] bg-[var(--color-surface-2)]/50 opacity-60'
                            : 'border-[var(--color-border)] bg-[var(--color-surface)]',
                    ].join(' ')}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      {/* Status Icon */}
                      <div className="shrink-0">
                        {isCurrent ? (
                          <span className="w-8 h-8 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold text-xs animate-pulse">
                            NOW
                          </span>
                        ) : isCompleted ? (
                          <span className="w-8 h-8 rounded-full bg-slate-300 text-slate-700 flex items-center justify-center">
                            <CheckCircle size={18} />
                          </span>
                        ) : (
                          <span className="w-8 h-8 rounded-full bg-[var(--color-surface-2)] border border-[var(--color-border)] flex items-center justify-center font-bold text-xs text-[var(--color-text-muted)]">
                            #{patient.position}
                          </span>
                        )}
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono font-black text-base sm:text-lg text-[var(--color-text)]">
                            {patient.token}
                          </span>
                          {isMe && (
                            <span className="px-2 py-0.5 rounded-full text-[11px] font-black bg-[var(--color-primary-500)] text-white">
                              YOU
                            </span>
                          )}
                          <span className="text-xs text-[var(--color-text-muted)] truncate">
                            {patient.patientName}
                          </span>
                        </div>
                        <span className="text-xs text-[var(--color-text-muted)] block mt-0.5">
                          {isCurrent
                            ? 'Inside consultation room right now'
                            : isCompleted
                              ? 'Consultation finished'
                              : patient.position === 1
                                ? 'Up next • Please stand near door'
                                : `Estimated wait: ~${patient.estimatedWaitMinutes} min`}
                        </span>
                      </div>
                    </div>

                    <div className="shrink-0 text-right">
                      {isCurrent ? (
                        <span className="px-2.5 py-1 rounded-full text-xs font-extrabold bg-emerald-200 text-emerald-900">
                          Active
                        </span>
                      ) : isCompleted ? (
                        <span className="text-xs font-semibold text-slate-500">
                          Done
                        </span>
                      ) : (
                        <span className="text-xs font-mono font-bold text-[var(--color-text-muted)]">
                          ~{patient.estimatedWaitMinutes}m
                        </span>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* ══════════════════════════════════════════════════════════════════
            HOSPITAL BROADCAST NOTICES & DELAYS
            ══════════════════════════════════════════════════════════════════ */}
        {activeAlerts.length > 0 && (
          <div className="flex flex-col gap-2.5">
            <h3 className="text-xs font-black uppercase tracking-wider text-[var(--color-text-muted)]">
              Live Department Broadcasts
            </h3>
            {activeAlerts.map((alert) => (
              <div
                key={alert.id}
                role="alert"
                className="p-4 rounded-2xl bg-amber-50 border-2 border-amber-300 text-amber-950 flex items-start gap-3 shadow-2xs"
              >
                <AlertTriangle
                  size={20}
                  className="text-amber-700 shrink-0 mt-0.5"
                />
                <div className="flex-1 min-w-0">
                  <h4 className="font-extrabold text-sm sm:text-base leading-snug">
                    {alert.title}
                  </h4>
                  <p className="text-xs sm:text-sm font-semibold opacity-90 mt-0.5">
                    {alert.message}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════════
            ACTION BUTTONS
            ══════════════════════════════════════════════════════════════════ */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
          {/* Navigate to room */}
          <Button
            variant="primary"
            size="lg"
            icon={<Navigation size={20} />}
            onClick={() =>
              navigate(`/patient/guidance/${slip?.id || 'latest'}`, {
                state: { departmentId: activeDeptId, slip },
              })
            }
          >
            Guide Me to Room {deptLive?.roomNumber || '2'}
          </Button>

          {/* View My Slip */}
          <Button
            variant="secondary"
            size="lg"
            icon={<FileText size={20} />}
            onClick={() => {
              if (slip?.id) {
                navigate(`/patient/slip/${slip.id}`);
              } else {
                navigate('/patient/slip');
              }
            }}
          >
            View Full Hospital Slip
          </Button>
        </div>

        {/* Developer shortcut link */}
        <div className="text-center pt-4 pb-2">
          <Link
            to="/dev/store"
            className="inline-flex items-center gap-1.5 text-xs text-[var(--color-text-muted)] hover:text-[var(--color-primary-600)] underline font-medium"
          >
            <FlaskConical size={14} aria-hidden="true" />
            <span>Developer Multi-Tab Testbench (/dev/store)</span>
          </Link>
        </div>
      </div>
    </BaseLayout>
  );
}
