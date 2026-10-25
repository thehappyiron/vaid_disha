import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useLocation, useParams, Link } from 'react-router-dom';
import {
  Building2,
  Clock,
  Printer,
  Navigation,
  CheckCircle,
  TriangleAlert,
  Stethoscope,
  Volume2,
  VolumeX,
  Share2,
  Download,
  AlertTriangle,
  FileText,
  Accessibility,
  X,
  Layers,
  DoorClosed,
  BellRing,
  UserCheck,
  Sparkles,
  Coffee,
  Radio,
  Mail,
} from 'lucide-react';
import { BaseLayout } from '../components/layout';
import {
  Button,
  StatusBadge,
  OptionCard,
  Input,
} from '../components/ui';
import { useAuth } from '../context/AuthContext';
import { getSlipById } from '../services/hospitalService';
import { usePatientLiveStatus, cancelPatientToken } from '../services/liveStore';
import { sendTokenSharedEmail, sendCancellationEmail, isValidEmail } from '../services/emailService';
import { textToSpeech } from '../services/voice';
import type { Slip } from '../types';

function formatTime(iso: string): string {
  try {
    return new Date(iso).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString([], {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return iso;
  }
}

function floorLabel(floor?: number, t?: (key: string, opts?: any) => string): string {
  if (floor === undefined) return '';
  if (floor === 0) return t ? t('common.ground_floor') : 'Ground Floor';
  if (floor < 0) return `Floor B${Math.abs(floor)}`;
  return `Floor ${floor}`;
}

export function SlipPage() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();

  const [slip, setSlip] = useState<Slip | null>(
    (location.state as { slip?: Slip })?.slip || null
  );
  const liveStatus = usePatientLiveStatus(slip?.token, slip?.department?.id);
  const [loading, setLoading] = useState(!slip);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [copiedToast, setCopiedToast] = useState(false);

  // Modals state
  const [showReportsModal, setShowReportsModal] = useState(false);
  const [showAmenitiesModal, setShowAmenitiesModal] = useState(false);
  const [showAttendantModal, setShowAttendantModal] = useState(false);
  const [attendantEmail, setAttendantEmail] = useState('');
  const [attendantSending, setAttendantSending] = useState(false);
  const [attendantFeedback, setAttendantFeedback] = useState<string | null>(null);

  const [showCancelModal, setShowCancelModal] = useState(() =>
    location.search.includes('cancel=1')
  );
  const [isCancelled, setIsCancelled] = useState(false);

  const headingRef = useRef<HTMLHeadingElement>(null);

  // Load slip if not passed via location state
  useEffect(() => {
    async function fetchSlip() {
      if (!slip) {
        try {
          setLoading(true);
          const loaded = await getSlipById(id || 'latest');
          if (loaded) {
            setSlip(loaded);
          } else {
            navigate('/', { replace: true });
          }
        } catch {
          navigate('/', { replace: true });
        } finally {
          setLoading(false);
        }
      }
    }
    fetchSlip();
  }, [id, slip, navigate]);

  // Focus heading on mount
  useEffect(() => {
    if (slip) {
      headingRef.current?.focus();
    }
  }, [slip]);

  // Cleanup speech synthesis on unmount
  useEffect(() => {
    return () => {
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  const handlePrint = () => {
    window.print();
  };

  const handleShareWithAttendant = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!slip || !isValidEmail(attendantEmail)) {
      setAttendantFeedback('Please enter a valid email address.');
      return;
    }
    setAttendantSending(true);
    setAttendantFeedback(null);
    try {
      await sendTokenSharedEmail({
        token: slip.token,
        attendantEmail,
        patientName: slip.patientName || 'Patient',
        doctorName: slip.doctorName || slip.department.doctorName || 'Doctor on Duty',
      });
      setAttendantFeedback('Token shared successfully! They will receive live queue updates.');
      setTimeout(() => {
        setShowAttendantModal(false);
        setAttendantEmail('');
        setAttendantFeedback(null);
      }, 2500);
    } catch (err) {
      setAttendantFeedback(err instanceof Error ? err.message : 'Failed to share token.');
    } finally {
      setAttendantSending(false);
    }
  };

  const handleConfirmCancelSlip = async () => {
    if (!slip) return;
    try {
      await cancelPatientToken(slip.token);
      await sendCancellationEmail({
        token: slip.token,
        date: formatDate(slip.generatedAt),
        doctorName: slip.doctorName || slip.department.doctorName || 'Doctor on Duty',
        patientName: slip.patientName,
      });
      setIsCancelled(true);
      setShowCancelModal(false);
    } catch {
      alert('Unable to cancel slip. Please contact the helpdesk.');
    }
  };

  const handleSpeakDirections = () => {
    if (!textToSpeech.isSupported()) return;
    if (isSpeaking) {
      textToSpeech.stop();
      setIsSpeaking(false);
      return;
    }
    const text = slip?.humanReadableDirection || '';
    if (!text) return;

    setIsSpeaking(true);
    textToSpeech.speak(text, i18n.language, {
      rate: 0.9,
      onEnd: () => setIsSpeaking(false),
      onError: () => setIsSpeaking(false),
    });
  };

  const handleShare = async () => {
    if (!slip) return;
    const shareText = `Vaid Disha Hospital Slip\nToken: ${slip.token}\nPatient: ${slip.patientName || 'Patient'}${slip.isGuest ? ' (Guest)' : ''}\nDepartment: ${t(slip.department.nameKey)}\nDoctor: ${slip.doctorName || ''}\nRoom: ${slip.roomNumber || ''}, ${floorLabel(slip.floor, t)}\nDirection: ${slip.humanReadableDirection || ''}`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: `Hospital Slip - ${slip.token}`,
          text: shareText,
          url: window.location.href,
        });
        return;
      } catch {
        // User cancelled or unsupported
      }
    }

    try {
      await navigator.clipboard.writeText(`${shareText}\n${window.location.href}`);
      setCopiedToast(true);
      setTimeout(() => setCopiedToast(false), 3000);
    } catch {
      alert(shareText);
    }
  };

  const handleDownloadImage = () => {
    if (!slip) return;
    const canvas = document.createElement('canvas');
    canvas.width = 800;
    canvas.height = 1050;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // White paper background
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, 800, 1050);

    // Border
    ctx.strokeStyle = '#0072B2';
    ctx.lineWidth = 6;
    ctx.strokeRect(20, 20, 760, 1010);

    // Header band
    ctx.fillStyle = '#0072B2';
    ctx.fillRect(20, 20, 760, 100);

    // Hospital header
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 26px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('VAID DISHA HOSPITAL', 400, 60);
    ctx.font = '16px sans-serif';
    ctx.fillText('OUTPATIENT APPOINTMENT SLIP', 400, 95);

    // Token Section
    ctx.textAlign = 'left';
    ctx.fillStyle = '#6c757d';
    ctx.font = 'bold 16px sans-serif';
    ctx.fillText('TOKEN NUMBER', 50, 165);

    ctx.fillStyle = '#0072B2';
    ctx.font = 'bold 52px monospace';
    ctx.fillText(slip.token, 50, 225);

    // Patient Name
    ctx.fillStyle = '#212529';
    ctx.font = 'bold 26px sans-serif';
    const guestLabel = slip.isGuest ? ' (Guest)' : '';
    ctx.fillText(`${slip.patientName || 'Patient'}${guestLabel}`, 50, 275);

    ctx.fillStyle = '#6c757d';
    ctx.font = '16px sans-serif';
    ctx.fillText(
      `Date: ${formatDate(slip.generatedAt)} at ${formatTime(slip.generatedAt)}`,
      50,
      305
    );

    // Divider line
    ctx.strokeStyle = '#dee2e6';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(50, 335);
    ctx.lineTo(750, 335);
    ctx.stroke();

    // Key details
    ctx.fillStyle = '#212529';
    ctx.font = 'bold 22px sans-serif';
    ctx.fillText(`Department: ${t(slip.department.nameKey)}`, 50, 385);

    ctx.font = '19px sans-serif';
    ctx.fillText(`Doctor: ${slip.doctorName || 'Doctor on Duty'}`, 50, 425);
    ctx.fillText(`Room: ${slip.roomNumber || '101'}`, 50, 465);
    ctx.fillText(
      `Floor: ${floorLabel(slip.floor, t)} (${slip.wing || slip.department.wing || 'Main Wing'}, Building ${slip.department.building})`,
      50,
      505
    );

    // Queue status
    ctx.beginPath();
    ctx.moveTo(50, 535);
    ctx.lineTo(750, 535);
    ctx.stroke();

    ctx.font = 'bold 20px sans-serif';
    ctx.fillStyle = '#E69F00';
    const effectiveStatus = liveStatus.status || slip.status;
    const effectiveWait = liveStatus.estimatedWaitMinutes ?? slip.estimatedWait;
    const effectivePeopleAhead = liveStatus.peopleAhead ?? slip.peopleAhead ?? 1;

    const statusText =
      effectiveStatus === 'in_progress'
        ? 'In Consultation'
        : effectiveStatus === 'turn_soon'
          ? 'Your Turn Soon'
          : 'Waiting in Queue';
    ctx.fillText(`Queue Status: ${statusText}`, 50, 575);

    ctx.fillStyle = '#212529';
    ctx.fillText(`Estimated Wait: ~${effectiveWait} minutes`, 50, 615);
    ctx.fillText(`People ahead of you: ${effectivePeopleAhead}`, 50, 655);

    // Direction box
    ctx.beginPath();
    ctx.moveTo(50, 690);
    ctx.lineTo(750, 690);
    ctx.stroke();

    ctx.font = 'bold 18px sans-serif';
    ctx.fillStyle = '#0072B2';
    ctx.fillText('HOW TO REACH FROM ENTRANCE:', 50, 730);

    ctx.font = '18px sans-serif';
    ctx.fillStyle = '#212529';
    const dirText = slip.humanReadableDirection || 'Proceed from main entrance to the counter.';
    const words = dirText.split(' ');
    let line = '';
    let y = 765;
    for (let n = 0; n < words.length; n++) {
      const testLine = line + words[n] + ' ';
      const metrics = ctx.measureText(testLine);
      if (metrics.width > 680 && n > 0) {
        ctx.fillText(line, 50, y);
        line = words[n] + ' ';
        y += 28;
      } else {
        line = testLine;
      }
    }
    ctx.fillText(line, 50, y);

    // Printable footer
    ctx.fillStyle = '#6c757d';
    ctx.font = 'italic 16px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Please show this slip at the department counter upon arrival.', 400, 980);

    const link = document.createElement('a');
    link.download = `VaidDisha-Slip-${slip.token}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  };

  if (loading || !slip) {
    return (
      <BaseLayout showHome={true} headerTitle={t('app.name')}>
        <div className="page-container text-center py-16">
          <p className="text-base text-[var(--color-text-muted)] font-medium">
            {t('common.loading')}
          </p>
        </div>
      </BaseLayout>
    );
  }

  const isEmergency = slip.department.category === 'emergency';
  const isGuestUser = slip.isGuest ?? (user ? user.isGuest : true);

  const effectiveStatus = liveStatus.status || slip.status || 'waiting';
  const effectiveWait = liveStatus.estimatedWaitMinutes ?? slip.estimatedWait ?? 15;
  const effectivePeopleAhead = liveStatus.peopleAhead ?? slip.peopleAhead ?? 1;
  const nowServingToken = liveStatus.nowServingToken;
  const deptLive = liveStatus.department;
  const activeAlerts = liveStatus.activeAlerts;

  // Live status badge & card styling (icon + text + colour)
  const getLiveConfig = () => {
    if (deptLive?.statusCode === 'emergency' || isEmergency) {
      return {
        variant: 'danger' as const,
        icon: <TriangleAlert size={18} className="text-red-600 shrink-0" aria-hidden="true" />,
        badgeLabel: 'Emergency Priority',
        headline: deptLive?.statusMessage || 'Emergency Priority — Immediate Care',
        subtext: 'Proceed directly to the triage desk.',
        cardClass: 'bg-red-50 border-2 border-red-400 text-red-950',
        clockColor: 'text-red-700',
        waitText: 'Immediate (No Wait)',
      };
    }

    if (effectiveStatus === 'in_progress') {
      const activeRoom = slip.roomNumber || deptLive?.roomNumber;
      return {
        variant: 'success' as const,
        icon: <UserCheck size={18} className="text-emerald-700 shrink-0 animate-pulse" aria-hidden="true" />,
        badgeLabel: t('slip.status_in_progress'),
        headline: activeRoom ? `Attending Now in Room ${activeRoom.replace(/^Room\s*/i, '')}` : 'Attending Now in Consultation Room',
        subtext: 'Please enter the room now. The specialist is attending to you.',
        cardClass: 'bg-emerald-50 border-2 border-emerald-400 text-emerald-950',
        clockColor: 'text-emerald-700',
        waitText: t('slip.no_wait'),
      };
    }

    if (effectiveStatus === 'turn_soon') {
      const activeRoom = slip.roomNumber || deptLive?.roomNumber;
      return {
        variant: 'info' as const,
        icon: <BellRing size={18} className="text-blue-700 shrink-0 animate-bounce" aria-hidden="true" />,
        badgeLabel: t('slip.status_turn_soon'),
        headline: 'Your Turn Soon! (Next in line)',
        subtext: activeRoom
          ? `Please stay directly outside Room ${activeRoom.replace(/^Room\s*/i, '')}.`
          : 'Please stay directly outside the consultation room.',
        cardClass: 'bg-blue-50 border-2 border-blue-400 text-blue-950',
        clockColor: 'text-blue-700',
        waitText: effectiveWait === 0 ? t('slip.no_wait') : t('slip.minutes_wait', { minutes: effectiveWait }),
      };
    }

    if (deptLive?.statusCode === 'break') {
      return {
        variant: 'warning' as const,
        icon: <Coffee size={18} className="text-amber-700 shrink-0" aria-hidden="true" />,
        badgeLabel: 'Doctor on Break',
        headline: deptLive.statusMessage || `Doctor on break until ${deptLive.breakUntil || 'shortly'}`,
        subtext: 'Consultations will resume shortly. Please relax in the waiting lounge.',
        cardClass: 'bg-amber-50 border-2 border-amber-400 text-amber-950',
        clockColor: 'text-amber-700',
        waitText: t('slip.minutes_wait', { minutes: effectiveWait }),
      };
    }

    if (deptLive?.statusCode === 'delayed') {
      return {
        variant: 'warning' as const,
        icon: <AlertTriangle size={18} className="text-orange-700 shrink-0" aria-hidden="true" />,
        badgeLabel: 'Department Delayed',
        headline: deptLive.statusMessage || `Lab delayed by ${deptLive.delayMinutes || 20} min`,
        subtext: 'Estimated wait times have been adjusted automatically based on batch workload.',
        cardClass: 'bg-orange-50 border-2 border-orange-400 text-orange-950',
        clockColor: 'text-orange-700',
        waitText: t('slip.minutes_wait', { minutes: effectiveWait }),
      };
    }

    // Default waiting
    return {
      variant: 'warning' as const,
      icon: <Clock size={18} className="text-amber-700 shrink-0" aria-hidden="true" />,
      badgeLabel: deptLive?.statusMessage || t('slip.status_waiting'),
      headline: deptLive?.statusMessage || 'Doctor with another patient',
      subtext: nowServingToken ? `Currently attending token #${nowServingToken}` : 'Queue is advancing normally.',
      cardClass: 'bg-[var(--color-warning-50)] border-2 border-[var(--color-warning-300)] text-[var(--color-warning-950)]',
      clockColor: 'text-[var(--color-warning-700)]',
      waitText: effectiveWait === 0 ? t('slip.no_wait') : t('slip.minutes_wait', { minutes: effectiveWait }),
    };
  };

  const statusConfig = getLiveConfig();

  return (
    <BaseLayout showHome={true} headerTitle={t('app.name')}>
      <article className="slip-print" aria-label={t('slip.page_title')}>
        <header className="slip-print-header">
          <p>{t('slip.hospital_title')}</p>
          <h1>{t('slip.slip_subtitle')}</h1>
          <span>
            {t('slip.generated_at')}: {formatDate(slip.generatedAt)} · {formatTime(slip.generatedAt)}
          </span>
        </header>

        <div className="slip-print-identity">
          <div>
            <p>{t('slip.your_token')}</p>
            <strong className="slip-print-token">{slip.token}</strong>
          </div>
          <div>
            <p>{t('slip.patient_label')}</p>
            <strong>{slip.patientName || user?.name || t('slip.patient_label')}</strong>
            <p>{isGuestUser ? t('slip.guest_badge') : t('slip.registered_badge')}</p>
          </div>
        </div>

        <dl className="slip-print-details">
          <div>
            <dt>{t('slip.department')}</dt>
            <dd>{t(slip.department.nameKey)}</dd>
          </div>
          <div>
            <dt>{t('slip.doctor')}</dt>
            <dd>{slip.doctorName || slip.department.doctorName || '—'}</dd>
          </div>
          <div>
            <dt>{t('slip.room')}</dt>
            <dd>{slip.roomNumber || slip.department.roomNumbers?.[0] || '—'}</dd>
          </div>
          <div>
            <dt>{t('slip.floor')}</dt>
            <dd>
              {floorLabel(slip.floor ?? slip.department.floor, t)}
              {(slip.wing || slip.department.wing) && ` · ${slip.wing || slip.department.wing}`}
            </dd>
          </div>
        </dl>

        {slip.humanReadableDirection && (
          <section className="slip-print-directions">
            <h2>{t('slip.how_to_reach_title')}</h2>
            <p>{slip.humanReadableDirection}</p>
          </section>
        )}

        <footer className="slip-print-footer">
          <p>{t('slip.print_instructions')}</p>
          <p>{slip.id}</p>
        </footer>
      </article>

      <div className="slip-screen page-container gap-4">
        {/* Emergency Alert Banner if Emergency */}
        {isEmergency && (
          <div
            role="alert"
            aria-live="assertive"
            className="grid grid-cols-[auto_minmax(0,1fr)] items-start gap-3 bg-[var(--color-danger-50)] border-2 border-[var(--color-danger-500)] rounded-2xl p-4 shadow-sm"
          >
            <TriangleAlert
              size={24}
              className="text-[var(--color-danger-500)] shrink-0 mt-0.5"
              aria-hidden="true"
            />
            <p className="font-bold text-[var(--color-danger-900)] text-base break-words">
              {t('slip.note_emergency')}
            </p>
          </div>
        )}

        {/* Copy toast feedback */}
        {copiedToast && (
          <div
            role="status"
            className="p-3 bg-emerald-100 border border-emerald-400 text-emerald-950 rounded-xl text-sm font-bold text-center animate-fadeIn"
          >
            {t('slip.link_copied')}
          </div>
        )}

        {/* Cancelled slip notice */}
        {isCancelled && (
          <div
            role="alert"
            className="p-4 bg-red-100 border-2 border-red-400 text-red-950 rounded-2xl text-sm font-bold text-center"
          >
            Slip #{slip?.token} has been cancelled. A cancellation confirmation was sent to your email.
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════════
            THE PRINTABLE HOSPITAL SLIP (Heart of the App)
            ══════════════════════════════════════════════════════════════════ */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start w-full">
          {/* ══════════════════════════════════════════════════════════════════
              COLUMN 1 (Left on desktop): THE PRINTABLE HOSPITAL SLIP DETAILS
              ══════════════════════════════════════════════════════════════════ */}
          <div className="flex flex-col gap-4">
            <article
              id="hospital-printable-slip"
              aria-label={t('slip.page_title')}
              className={[
                'card border-2 border-[var(--color-primary-500)] bg-[var(--color-surface)] shadow-md rounded-2xl',
                'p-5 sm:p-6 flex flex-col gap-4 relative overflow-hidden',
                // Printable paper effect styling
                'print:border-2 print:border-black print:shadow-none print:p-4',
              ].join(' ')}
            >
              {/* Hospital Header & Subtitle */}
              <div className="border-b-2 border-dashed border-[var(--color-border)] pb-3 text-center sm:text-left flex flex-col sm:flex-row items-center justify-between gap-2">
                <div>
                  <span className="text-xs font-black uppercase tracking-widest text-[var(--color-primary-700)] block">
                    {t('slip.hospital_title')}
                  </span>
                  <span className="text-xs font-bold text-[var(--color-text-muted)] tracking-wider">
                    {t('slip.slip_subtitle')}
                  </span>
                </div>
                <span className="text-xs text-[var(--color-text-muted)] font-mono">
                  {formatDate(slip.generatedAt)} • {formatTime(slip.generatedAt)}
                </span>
              </div>

              {/* 1. Large Token Number & Patient Name (with Guest badge if guest) */}
              <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 pt-1">
                <div>
                  <span className="text-xs uppercase font-extrabold tracking-wider text-[var(--color-text-muted)] block mb-0.5">
                    {t('slip.your_token')}
                  </span>
                  <h1
                    ref={headingRef}
                    tabIndex={-1}
                    className="text-4xl sm:text-5xl font-black font-mono tracking-tight text-[var(--color-primary-500)] leading-none"
                    aria-label={t('a11y.token_label', { token: slip.token })}
                  >
                    {slip.token}
                  </h1>
                </div>

                <div className="flex flex-col sm:items-end">
                  <span className="text-xs uppercase font-bold text-[var(--color-text-muted)]">
                    {t('slip.patient_label')}
                  </span>
                  <span className="font-extrabold text-xl sm:text-2xl text-[var(--color-text)]">
                    {slip.patientName || 'Patient'}
                  </span>
                  <div className="mt-1">
                    {isGuestUser ? (
                      <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-900 border border-amber-300">
                        {t('slip.guest_badge')}
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-blue-100 text-blue-900 border border-blue-300">
                        {t('slip.registered_badge')}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <hr className="divider border-t-2 border-[var(--color-border)] my-1" />

              {/* 2. Department, Doctor, Room, Floor – Large and clear with icons */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-1">
                {/* Department */}
                <OptionCard
                  as="div"
                  icon={<Building2 size={22} aria-hidden="true" />}
                  iconBgClass="bg-[var(--color-primary-50)] text-[var(--color-primary-500)]"
                  title={t('slip.department')}
                  description={t(slip.department.nameKey)}
                  className="p-3 bg-[var(--color-surface-2)] border-[var(--color-border)]"
                />

                {/* Doctor */}
                <OptionCard
                  as="div"
                  icon={<Stethoscope size={22} aria-hidden="true" />}
                  iconBgClass="bg-[var(--color-primary-50)] text-[var(--color-primary-500)]"
                  title={t('slip.doctor')}
                  description={slip.doctorName || slip.department.doctorName || 'Doctor on Duty'}
                  className="p-3 bg-[var(--color-surface-2)] border-[var(--color-border)]"
                />

                {/* Room */}
                <OptionCard
                  as="div"
                  icon={<DoorClosed size={22} aria-hidden="true" />}
                  iconBgClass="bg-[var(--color-primary-50)] text-[var(--color-primary-500)]"
                  title={t('slip.room')}
                  description={
                    slip.roomNumber || slip.department.roomNumbers?.[0]
                      ? `Room ${(slip.roomNumber || slip.department.roomNumbers[0]).replace(/^Room\s*/i, '')}`
                      : t('slip.unassigned_room', 'Assigned at counter')
                  }
                  className="p-3 bg-[var(--color-surface-2)] border-[var(--color-border)]"
                />

                {/* Floor & Wing */}
                <OptionCard
                  as="div"
                  icon={<Layers size={22} aria-hidden="true" />}
                  iconBgClass="bg-[var(--color-primary-50)] text-[var(--color-primary-500)]"
                  title={t('slip.floor')}
                  description={`${floorLabel(slip.floor, t)} • ${slip.wing || slip.department.wing || 'West Wing'} (Bldg ${slip.department.building})`}
                  className="p-3 bg-[var(--color-surface-2)] border-[var(--color-border)]"
                />
              </div>

              <hr className="divider border-t-2 border-[var(--color-border)] my-1" />

              {/* 3. Live Status Card (Icon + Text + Colour with adjusting wait time & multi-tab sync) */}
              <div className="flex flex-col gap-2.5">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-[var(--color-text-muted)]">
                      {t('slip.live_status')}
                    </span>
                    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-black bg-emerald-100 text-emerald-800 border border-emerald-300">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                      Live Sync
                    </span>
                  </div>
                  <StatusBadge
                    variant={statusConfig.variant}
                    icon={statusConfig.icon}
                    label={statusConfig.badgeLabel}
                  />
                </div>

                {/* Main Live Card with Icon, Text, Color, and Dynamic Wait */}
                <div
                  role="region"
                  aria-live="polite"
                  aria-atomic="true"
                  aria-label="Destination live queue status"
                  className={`p-4 rounded-2xl flex flex-col gap-3 transition-colors ${statusConfig.cardClass}`}
                >
                  {/* Status Headline & Description */}
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-xl bg-white/85 shrink-0 shadow-xs mt-0.5">
                      {statusConfig.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-base sm:text-lg font-black leading-snug">
                        {statusConfig.headline}
                      </h3>
                      <p className="text-xs sm:text-sm font-semibold opacity-90 mt-0.5">
                        {statusConfig.subtext}
                      </p>
                    </div>
                  </div>

                  {/* Dynamic Metrics Row: Wait Time & Queue Position */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1 border-t border-current/15">
                    {/* Wait Time */}
                    <div className="p-2.5 rounded-xl bg-white/75 flex items-center gap-2.5">
                      <Clock size={20} className={`${statusConfig.clockColor} shrink-0`} />
                      <div>
                        <span className="text-[11px] font-bold uppercase tracking-wider block opacity-80">
                          {t('slip.estimated_wait')}
                        </span>
                        <span className="text-base sm:text-lg font-black">
                          {statusConfig.waitText}
                        </span>
                      </div>
                    </div>

                    {/* Queue Position & Now Serving */}
                    <div className="p-2.5 rounded-xl bg-white/75 flex items-center justify-between gap-2">
                      <div>
                        <span className="text-[11px] font-bold uppercase tracking-wider block opacity-80">
                          Queue Position
                        </span>
                        <span className="text-base font-extrabold">
                          {effectivePeopleAhead > 0
                            ? t('slip.people_ahead', { count: effectivePeopleAhead })
                            : t('slip.people_ahead_zero')}
                        </span>
                      </div>
                      {nowServingToken && (
                        <div className="text-right">
                          <span className="text-[10px] font-bold uppercase tracking-wider block opacity-70">
                            Now Serving
                          </span>
                          <span className="font-mono font-black text-sm px-2 py-0.5 rounded bg-black/10">
                            {nowServingToken}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Active Hospital Announcement / Delay Alert if any */}
                  {activeAlerts.length > 0 && (
                    <div className="p-2.5 rounded-xl bg-white/90 border border-current/20 text-xs font-semibold flex items-center gap-2">
                      <AlertTriangle size={15} className="shrink-0 text-amber-600" />
                      <span className="truncate">{activeAlerts[0].title}: {activeAlerts[0].message}</span>
                    </div>
                  )}

                  {/* Live Room Status link */}
                  <Link
                    to={`/patient/live?token=${slip.token}&dept=${slip.department.id}&slipId=${slip.id}`}
                    className="flex items-center justify-between p-2.5 rounded-xl bg-white/90 hover:bg-white text-xs sm:text-sm font-bold text-[var(--color-primary-800)] border border-[var(--color-primary-300)] transition-all shadow-xs group"
                  >
                    <span className="flex items-center gap-2">
                      <Radio size={16} className="text-[var(--color-primary-600)] animate-pulse" />
                      What's happening at destination right now?
                    </span>
                    <span className="text-[var(--color-primary-600)] group-hover:translate-x-1 transition-transform font-extrabold shrink-0">
                      View Live Tracker →
                    </span>
                  </Link>
                </div>
              </div>

              {/* Save slip status indicator */}
              {!isGuestUser ? (
                <div className="flex items-center gap-2 p-3 bg-emerald-50 border border-emerald-300 rounded-xl text-emerald-900 text-xs sm:text-sm font-semibold">
                  <CheckCircle size={18} className="text-emerald-600 shrink-0" />
                  <span>{t('slip.auto_saved_notice')}</span>
                  <Link to="/patient/history" className="ml-auto underline font-bold text-xs sm:text-sm shrink-0">
                    {t('slip.view_history_btn')} →
                  </Link>
                </div>
              ) : (
                <div className="flex items-center justify-between gap-2 p-3 bg-amber-50 border border-amber-300 rounded-xl text-amber-900 text-xs font-medium flex-wrap">
                  <span>{t('history.guest_desc')}</span>
                  <Link to="/patient/start" className="underline font-bold text-xs shrink-0 text-amber-950">
                    {t('history.guest_login_btn')}
                  </Link>
                </div>
              )}
            </article>
          </div>

          {/* ══════════════════════════════════════════════════════════════════
              COLUMN 2 (Right on desktop): "HOW TO REACH" + ACTION BUTTONS
              ══════════════════════════════════════════════════════════════════ */}
          <div className="flex flex-col gap-4">
            {/* 5. A short "How to reach" text box with speaker button */}
            <div className="p-4 rounded-2xl bg-[var(--color-primary-50)]/70 border-2 border-[var(--color-primary-300)] flex flex-col gap-2.5 shadow-sm">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-black uppercase tracking-wider text-[var(--color-primary-800)] flex items-center gap-1.5">
                  <Sparkles size={15} aria-hidden="true" />
                  {t('slip.how_to_reach_title')}
                </span>

                {/* TTS Speaker Button */}
                <button
                  type="button"
                  onClick={handleSpeakDirections}
                  className={[
                    'btn btn-sm px-3 rounded-full flex items-center gap-1.5 transition-all',
                    isSpeaking
                      ? 'btn-primary animate-pulse'
                      : 'btn-secondary bg-white text-[var(--color-primary-600)] border border-[var(--color-primary-400)]',
                  ].join(' ')}
                  aria-label={isSpeaking ? t('slip.stop_listening') : t('slip.listen_directions')}
                  title={isSpeaking ? t('slip.stop_listening') : t('slip.listen_directions')}
                >
                  {isSpeaking ? (
                    <>
                      <VolumeX size={16} />
                      <span className="text-xs font-bold">{t('slip.stop_listening')}</span>
                    </>
                  ) : (
                    <>
                      <Volume2 size={16} />
                      <span className="text-xs font-bold">{t('slip.listen_directions')}</span>
                    </>
                  )}
                </button>
              </div>

              <p className="text-base font-bold text-[var(--color-primary-950)] leading-relaxed break-words">
                "{slip.humanReadableDirection || 'Follow the hospital main corridor to the department counter.'}"
              </p>
            </div>

            {/* 6. PRIMARY BUTTON: "Help me find the way" */}
            <div>
              <Button
                variant="primary"
                size="lg"
                fullWidth
                icon={<Navigation size={22} />}
                onClick={() =>
                  navigate(`/patient/guidance/${slip.id}`, {
                    state: { departmentId: slip.department.id, slip },
                  })
                }
              >
                {t('slip.help_find_way')}
              </Button>
            </div>

            {/* 7. SECONDARY BUTTONS */}
            <div className="flex flex-col gap-2.5">
              {/* I need urgent attention */}
              <Button
                variant="danger"
                fullWidth
                icon={<AlertTriangle size={18} />}
                onClick={() => navigate('/patient/emergency')}
              >
                {t('slip.urgent_attention')}
              </Button>

              {/* View lab reports */}
              <Button
                variant="secondary"
                fullWidth
                icon={<FileText size={18} />}
                onClick={() => setShowReportsModal(true)}
              >
                {t('slip.view_reports')}
              </Button>

              {/* Show nearest washroom / wheelchair point */}
              <Button
                variant="secondary"
                fullWidth
                icon={<Accessibility size={18} />}
                onClick={() => setShowAmenitiesModal(true)}
              >
                {t('slip.nearest_amenities')}
              </Button>
            </div>

            {/* 8. SAVE SLIP ACTIONS (Download as image, Share, Print/Save PDF) */}
            <div className="p-4 rounded-2xl border-2 border-[var(--color-border)] bg-[var(--color-surface)] flex flex-col gap-3 shadow-xs">
              <span className="text-xs font-bold uppercase tracking-wider text-[var(--color-text-muted)]">
                Save & Share Slip
              </span>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  icon={<Download size={16} />}
                  onClick={handleDownloadImage}
                  className="border border-[var(--color-border)]"
                >
                  {t('slip.download_image')}
                </Button>

                <Button
                  variant="ghost"
                  size="sm"
                  icon={<Share2 size={16} />}
                  onClick={handleShare}
                  className="border border-[var(--color-border)]"
                >
                  {t('slip.share_slip')}
                </Button>

                <Button
                  variant="ghost"
                  size="sm"
                  icon={<Printer size={16} />}
                  onClick={handlePrint}
                  className="border border-[var(--color-border)]"
                >
                  {t('slip.print_slip')}
                </Button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2 border-t border-[var(--color-border)]">
                <Button
                  variant="secondary"
                  size="sm"
                  icon={<Mail size={16} />}
                  onClick={() => setShowAttendantModal(true)}
                  className="border border-[var(--color-primary-300)] bg-[var(--color-primary-50)] text-[var(--color-primary-800)] font-bold text-xs"
                >
                  Share with Attendant (Email)
                </Button>

                <Button
                  variant="ghost"
                  size="sm"
                  icon={<X size={16} />}
                  onClick={() => setShowCancelModal(true)}
                  className="border border-red-300 bg-red-50 text-red-800 hover:bg-red-100 font-bold text-xs"
                >
                  Cancel Visit Slip
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* ── MODAL 1: VIEW LAB REPORTS ──────────────────────────────── */}
        {showReportsModal && (
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="reports-modal-title"
            className="fixed inset-0 z-50 bg-black/60 flex items-end sm:items-center justify-center p-3 sm:p-5"
          >
            <div className="bg-[var(--color-surface)] border-2 border-[var(--color-border)] rounded-2xl w-full max-w-md p-5 shadow-2xl max-h-[85vh] overflow-y-auto">
              <div className="flex items-center justify-between pb-3 border-b border-[var(--color-border)] mb-3">
                <div className="flex items-center gap-2">
                  <FileText size={22} className="text-[var(--color-primary-500)]" />
                  <h3 id="reports-modal-title" className="font-extrabold text-lg text-[var(--color-text)]">
                    {t('slip.view_reports')}
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setShowReportsModal(false)}
                  className="btn btn-ghost btn-sm btn-icon rounded-full"
                  aria-label={t('common.close')}
                >
                  <X size={20} />
                </button>
              </div>

              <div className="flex flex-col gap-3">
                {[
                  { title: 'Lipid Profile & Serum Creatinine', dept: 'Pathology Lab', date: '2026-09-03', size: '1.2 MB' },
                  { title: 'Chest X-Ray Digital', dept: 'Radiology', date: '2026-07-21', size: '3.4 MB' },
                  { title: 'ECG Report (12-Lead)', dept: 'Cardiology', date: '2026-10-15', size: '850 KB' },
                ].map((rep, idx) => (
                  <div key={idx} className="p-3.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-2)] flex items-center justify-between gap-3">
                    <div>
                      <h4 className="font-bold text-sm text-[var(--color-text)]">{rep.title}</h4>
                      <p className="text-xs text-[var(--color-text-muted)] mt-0.5">{rep.dept} • {rep.date} • {rep.size}</p>
                    </div>
                    <Button
                      variant="secondary"
                      size="sm"
                      icon={<Download size={14} />}
                      onClick={() => alert(`Simulated download for ${rep.title}`)}
                    >
                      Download
                    </Button>
                  </div>
                ))}
              </div>

              <div className="pt-4 mt-2">
                <Button variant="ghost" fullWidth onClick={() => setShowReportsModal(false)}>
                  {t('common.close')}
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* ── MODAL 2: NEAREST AMENITIES & ACCESSIBILITY POINTS ──────── */}
        {showAmenitiesModal && (
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="amenities-modal-title"
            className="fixed inset-0 z-50 bg-black/60 flex items-end sm:items-center justify-center p-3 sm:p-5"
          >
            <div className="bg-[var(--color-surface)] border-2 border-[var(--color-border)] rounded-2xl w-full max-w-md p-5 shadow-2xl max-h-[85vh] overflow-y-auto">
              <div className="flex items-center justify-between pb-3 border-b border-[var(--color-border)] mb-3">
                <div className="flex items-center gap-2">
                  <Accessibility size={22} className="text-[var(--color-primary-500)]" />
                  <h3 id="amenities-modal-title" className="font-extrabold text-lg text-[var(--color-text)]">
                    {t('slip.amenities_title')}
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setShowAmenitiesModal(false)}
                  className="btn btn-ghost btn-sm btn-icon rounded-full"
                  aria-label={t('common.close')}
                >
                  <X size={20} />
                </button>
              </div>

              <div className="flex flex-col gap-3">
                {/* Accessible Washroom */}
                <div className="p-3.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-2)] flex items-start gap-3">
                  <div className="w-10 h-10 rounded-lg bg-teal-100 text-teal-800 flex items-center justify-center shrink-0">
                    <Accessibility size={22} />
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-[var(--color-text)]">{t('slip.washroom_label')}</h4>
                    <p className="text-xs text-[var(--color-text-muted)] mt-1">{t('slip.washroom_desc')}</p>
                  </div>
                </div>

                {/* Wheelchair Point */}
                <div className="p-3.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-2)] flex items-start gap-3">
                  <div className="w-10 h-10 rounded-lg bg-blue-100 text-blue-800 flex items-center justify-center shrink-0">
                    <Accessibility size={22} />
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-[var(--color-text)]">{t('slip.wheelchair_label')}</h4>
                    <p className="text-xs text-[var(--color-text-muted)] mt-1">{t('slip.wheelchair_desc')}</p>
                  </div>
                </div>

                {/* Drinking Water */}
                <div className="p-3.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-2)] flex items-start gap-3">
                  <div className="w-10 h-10 rounded-lg bg-cyan-100 text-cyan-800 flex items-center justify-center shrink-0">
                    <Building2 size={22} />
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-[var(--color-text)]">{t('slip.drinking_water')}</h4>
                    <p className="text-xs text-[var(--color-text-muted)] mt-1">{t('slip.drinking_water_desc')}</p>
                  </div>
                </div>
              </div>

              <div className="pt-4 mt-2">
                <Button variant="ghost" fullWidth onClick={() => setShowAmenitiesModal(false)}>
                  {t('common.close')}
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* ── MODAL 3: SHARE WITH ATTENDANT (EMAIL) ──────────────────── */}
        {showAttendantModal && (
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="attendant-modal-title"
            className="fixed inset-0 z-50 bg-black/60 flex items-end sm:items-center justify-center p-3 sm:p-5"
          >
            <div className="bg-[var(--color-surface)] border-2 border-[var(--color-border)] rounded-2xl w-full max-w-md p-5 shadow-2xl">
              <div className="flex items-center justify-between pb-3 border-b border-[var(--color-border)] mb-3">
                <div className="flex items-center gap-2">
                  <Mail size={22} className="text-[var(--color-primary-500)]" />
                  <h3 id="attendant-modal-title" className="font-extrabold text-lg text-[var(--color-text)]">
                    Share with Attendant
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setShowAttendantModal(false)}
                  className="btn btn-ghost btn-sm btn-icon rounded-full"
                  aria-label={t('common.close')}
                >
                  <X size={20} />
                </button>
              </div>

              <p className="text-xs sm:text-sm text-[var(--color-text-muted)] mb-4">
                Share your OPD token with a family member or attendant so they can follow queue progress on your behalf.
              </p>

              {attendantFeedback && (
                <div
                  className={`p-3 mb-4 rounded-xl text-xs font-bold border ${
                    attendantFeedback.includes('successfully')
                      ? 'bg-emerald-50 text-emerald-900 border-emerald-300'
                      : 'bg-red-50 text-red-900 border-red-300'
                  }`}
                >
                  {attendantFeedback}
                </div>
              )}

              <form onSubmit={handleShareWithAttendant} className="flex flex-col gap-3">
                <Input
                  id="attendant-email-input"
                  type="email"
                  label="Attendant's Email Address"
                  placeholder="family@example.com"
                  hint="They will receive queue status link and live updates until consultation completes."
                  value={attendantEmail}
                  onChange={(e) => setAttendantEmail(e.target.value.trim())}
                  required
                />

                <div className="flex gap-2 pt-2">
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => setShowAttendantModal(false)}
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    variant="primary"
                    loading={attendantSending}
                    icon={<Mail size={16} />}
                    className="flex-1"
                  >
                    Send Token
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ── MODAL 4: CANCEL OPD SLIP CONFIRMATION ───────────────────── */}
        {showCancelModal && (
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="cancel-modal-title"
            className="fixed inset-0 z-50 bg-black/60 flex items-end sm:items-center justify-center p-3 sm:p-5"
          >
            <div className="bg-[var(--color-surface)] border-2 border-red-300 rounded-2xl w-full max-w-md p-5 shadow-2xl">
              <div className="flex items-center justify-between pb-3 border-b border-[var(--color-border)] mb-3">
                <div className="flex items-center gap-2">
                  <AlertTriangle size={22} className="text-red-600" />
                  <h3 id="cancel-modal-title" className="font-extrabold text-lg text-red-900 dark:text-red-200">
                    Cancel OPD Visit Slip?
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setShowCancelModal(false)}
                  className="btn btn-ghost btn-sm btn-icon rounded-full"
                  aria-label={t('common.close')}
                >
                  <X size={20} />
                </button>
              </div>

              <p className="text-xs sm:text-sm text-[var(--color-text-muted)] mb-4">
                Are you sure you want to cancel token <strong>{slip?.token}</strong>? Your queue slot will be released for other patients, and a cancellation confirmation email will be sent.
              </p>

              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setShowCancelModal(false)}
                  className="flex-1"
                >
                  Keep Slip
                </Button>
                <Button
                  type="button"
                  variant="danger"
                  onClick={handleConfirmCancelSlip}
                  className="flex-1"
                >
                  Confirm Cancellation
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </BaseLayout>
  );
}
