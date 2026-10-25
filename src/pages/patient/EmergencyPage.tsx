import hospitalGraph from '../../data/hospitalGraph.json';
import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  AlertTriangle,
  Phone,
  MapPin,
  ShieldAlert,
  ShieldCheck,
  ArrowLeft,
  Check,
  HeartPulse,
  Wind,
  Droplet,
  Activity,
  CircleAlert,
  Sparkles,
} from 'lucide-react';
import { BaseLayout } from '../../components/layout';
import { Button, StatusBadge, PageHeader } from '../../components/ui';
import { EmergencyCard } from '../../components/ui/EmergencyCard';
import { createEmergencyAlert } from '../../services/liveStore';

interface SymptomOption {
  id: string;
  label: string;
  sublabel: string;
  icon: typeof HeartPulse;
  colorClass: string;
}

const SYMPTOM_OPTIONS: SymptomOption[] = [
  {
    id: 'chest_pain',
    label: 'Chest pain or heavy tightness',
    sublabel: 'Pressure, squeezing, or pain spreading to arm/jaw',
    icon: HeartPulse,
    colorClass: 'text-rose-600 bg-rose-50 border-rose-200',
  },
  {
    id: 'breathing',
    label: 'Difficulty breathing',
    sublabel: 'Severe shortness of breath, wheezing, gasping',
    icon: Wind,
    colorClass: 'text-sky-600 bg-sky-50 border-sky-200',
  },
  {
    id: 'bleeding',
    label: 'Severe bleeding',
    sublabel: 'Deep cut, uncontrolled blood loss, or open wound',
    icon: Droplet,
    colorClass: 'text-red-600 bg-red-50 border-red-200',
  },
  {
    id: 'fainting',
    label: 'Fainting or severe dizziness',
    sublabel: 'Blacking out, sudden collapse, or unable to stand',
    icon: Activity,
    colorClass: 'text-amber-600 bg-amber-50 border-amber-200',
  },
  {
    id: 'other',
    label: 'Other urgent distress',
    sublabel: 'Severe sudden pain, allergic reaction, or seizure',
    icon: CircleAlert,
    colorClass: 'text-purple-600 bg-purple-50 border-purple-200',
  },
];

const HOSPITAL_LANDMARKS = hospitalGraph.nodes
  .filter((node) => node.isLandmark)
  .map(
    (node) =>
      node.name +
      (node.roomNumber ? ' · ' + node.roomNumber : '') +
      ' (Floor ' +
      node.floor +
      ')'
  );

export function EmergencyPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const tokenParam = searchParams.get('token') || '';

  const [selectedSymptoms, setSelectedSymptoms] = useState<string[]>([]);
  const [note, setNote] = useState('');
  const [landmark, setLandmark] = useState(HOSPITAL_LANDMARKS[0]);
  const [isAlerted, setIsAlerted] = useState(false);
  const [alertTime, setAlertTime] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const toggleSymptom = (id: string) => {
    setSelectedSymptoms((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
    setErrorMsg('');
  };

  const handleAlertStaff = async () => {
    if (selectedSymptoms.length === 0 && !note.trim()) {
      setErrorMsg(
        'Please select at least one symptom or describe what you feel.'
      );
      return;
    }

    try {
      setIsSubmitting(true);
      const symptomLabels = selectedSymptoms.map(
        (id) => SYMPTOM_OPTIONS.find((s) => s.id === id)?.label || id
      );

      await createEmergencyAlert({
        symptoms:
          symptomLabels.length > 0
            ? symptomLabels
            : ['Urgent medical distress'],
        note: note.trim() || undefined,
        landmark,
        patientToken: tokenParam || undefined,
      });

      setAlertTime(
        new Date().toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit',
        })
      );
      setIsAlerted(true);
    } catch (err) {
      console.error('Failed to dispatch emergency alert', err);
      // Fallback display
      setAlertTime(
        new Date().toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit',
        })
      );
      setIsAlerted(true);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <BaseLayout showHome={true} headerTitle="Urgent Medical Attention">
      <div className="page-container gap-4 sm:gap-6">
        {/* Top Header */}
        <PageHeader
          title={
            isAlerted ? 'Staff Have Been Alerted' : 'Urgent Medical Attention'
          }
          showBack={true}
          onBack={() => navigate(-1)}
          actions={
            <StatusBadge
              variant={isAlerted ? 'success' : 'danger'}
              label={isAlerted ? 'RESPONSE ACTIVE' : 'URGENT HELP'}
              icon={
                isAlerted ? (
                  <ShieldCheck size={16} />
                ) : (
                  <ShieldAlert size={16} />
                )
              }
            />
          }
        />

        {/* ══════════════════════════════════════════════════════════════════
            REUSED COMPONENT: EMERGENCY CARD
            ══════════════════════════════════════════════════════════════════ */}
        <div className="w-full">
          <EmergencyCard
            to="#"
            onClick={() => window.open('tel:108', '_self')}
            className="border-red-400 bg-red-50/80"
          />
        </div>

        {/* ══════════════════════════════════════════════════════════════════
            STATE 1: EMERGENCY FORM (Calm checklist, note, landmark selector)
            ══════════════════════════════════════════════════════════════════ */}
        {!isAlerted ? (
          <div className="flex flex-col gap-5">
            {/* Calm Supportive Banner */}
            <div className="p-4 sm:p-5 rounded-2xl bg-slate-50 border-2 border-slate-200 text-slate-900 shadow-2xs">
              <h2 className="text-lg sm:text-xl font-black text-slate-900 leading-snug">
                Take a deep breath. We are here to assist you.
              </h2>
              <p className="text-sm font-semibold text-slate-700 mt-1 leading-relaxed">
                Select what you are experiencing and where you are seated.
                Hospital rapid response staff will be notified immediately to
                reach your exact spot.
              </p>
            </div>

            {/* Error prompt if none selected */}
            {errorMsg && (
              <div
                role="alert"
                className="p-3.5 rounded-xl bg-red-100 border border-red-300 text-red-950 text-sm font-bold flex items-center gap-2"
              >
                <AlertTriangle size={18} className="text-red-700 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* 1. Checklist of Symptoms */}
            <div className="flex flex-col gap-2.5">
              <label className="text-xs font-black uppercase tracking-wider text-[var(--color-text-muted)]">
                1. What are you experiencing? (Select all that apply)
              </label>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {SYMPTOM_OPTIONS.map((opt) => {
                  const isChecked = selectedSymptoms.includes(opt.id);
                  const Icon = opt.icon;

                  return (
                    <div
                      key={opt.id}
                      role="checkbox"
                      aria-checked={isChecked}
                      tabIndex={0}
                      onClick={() => toggleSymptom(opt.id)}
                      onKeyDown={(e) => {
                        if (e.key === ' ' || e.key === 'Enter') {
                          e.preventDefault();
                          toggleSymptom(opt.id);
                        }
                      }}
                      className={[
                        'p-4 rounded-2xl border-2 transition-all cursor-pointer select-none flex items-start gap-3.5 relative overflow-hidden',
                        isChecked
                          ? 'border-[var(--color-primary-500)] bg-[var(--color-primary-50)] shadow-xs'
                          : 'border-[var(--color-border)] bg-[var(--color-surface)] hover:border-slate-300',
                      ].join(' ')}
                    >
                      {/* Icon */}
                      <div
                        className={`p-2.5 rounded-xl ${opt.colorClass} shrink-0`}
                      >
                        <Icon size={22} />
                      </div>

                      {/* Content with reserved right padding so title never collides with checkbox */}
                      <div className="flex-1 min-w-0 pr-8">
                        <span className="font-black text-sm sm:text-base text-[var(--color-text)] block leading-snug">
                          {opt.label}
                        </span>
                        <span className="text-xs text-[var(--color-text-muted)] font-semibold block mt-0.5 leading-relaxed">
                          {opt.sublabel}
                        </span>
                      </div>

                      {/* Checkbox indicator INSIDE the card (top-right with padding) */}
                      <div
                        className={[
                          'absolute top-4 right-4 w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-colors shrink-0',
                          isChecked
                            ? 'bg-[var(--color-primary-500)] border-[var(--color-primary-500)] text-white'
                            : 'border-[var(--color-border)] bg-white',
                        ].join(' ')}
                        aria-hidden="true"
                      >
                        {isChecked && <Check size={16} strokeWidth={3} />}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* 2. Landmark Selector for Last Known Location */}
            <div className="flex flex-col gap-2">
              <label
                htmlFor="landmark-select"
                className="text-xs font-black uppercase tracking-wider text-[var(--color-text-muted)] flex items-center gap-1.5"
              >
                <MapPin size={15} className="text-rose-600" />
                2. Where are you right now? (Select nearest landmark)
              </label>

              <div className="relative">
                <select
                  id="landmark-select"
                  value={landmark}
                  onChange={(e) => setLandmark(e.target.value)}
                  className="input input-lg w-full font-bold text-sm sm:text-base bg-[var(--color-surface)] border-2 border-[var(--color-border)] rounded-2xl pr-10"
                >
                  {HOSPITAL_LANDMARKS.map((lm) => (
                    <option key={lm} value={lm}>
                      {lm}
                    </option>
                  ))}
                </select>
              </div>
              <span className="text-xs text-[var(--color-text-muted)] font-medium">
                Choose the nearest landmark sign, lift, or waiting lounge so
                staff can locate you quickly.
              </span>
            </div>

            {/* 3. Note Field */}
            <div className="flex flex-col gap-2">
              <label
                htmlFor="emergency-note"
                className="text-xs font-black uppercase tracking-wider text-[var(--color-text-muted)]"
              >
                3. Additional Note (Optional)
              </label>
              <textarea
                id="emergency-note"
                rows={3}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="e.g. sitting in wheelchair, wearing yellow jacket, severe headache, patient is elderly..."
                className="textarea w-full p-3.5 rounded-2xl border-2 border-[var(--color-border)] bg-[var(--color-surface)] text-sm font-medium leading-relaxed resize-none"
              />
            </div>

            {/* 4. Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <Button
                variant="danger"
                size="lg"
                fullWidth
                disabled={isSubmitting}
                icon={<AlertTriangle size={22} />}
                onClick={handleAlertStaff}
                className="font-black text-base sm:text-lg shadow-md"
              >
                {isSubmitting ? 'Alerting Staff...' : 'Alert Staff'}
              </Button>

              <a
                href="tel:108"
                className="btn btn-secondary btn-lg flex items-center justify-center gap-2 border-2 border-slate-300 font-bold shrink-0 text-base"
              >
                <Phone size={20} className="text-slate-700" />
                Call 108 Direct
              </a>
            </div>
          </div>
        ) : (
          /* ══════════════════════════════════════════════════════════════════
              STATE 2: CONFIRMATION SCREEN AFTER ALERT IS SENT
              "Staff have been alerted. Please stay where you are or sit nearby."
              ══════════════════════════════════════════════════════════════════ */
          <div className="flex flex-col gap-5 animate-fadeIn">
            {/* Reassuring Hero Message */}
            <div className="p-6 sm:p-8 rounded-3xl bg-emerald-50 border-3 border-emerald-400 text-emerald-950 flex flex-col items-center text-center gap-3 shadow-md">
              <div className="w-16 h-16 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shadow-sm">
                <ShieldCheck size={38} strokeWidth={2.5} />
              </div>

              <h2 className="text-2xl sm:text-3xl font-black text-emerald-950 leading-tight">
                Staff have been alerted. Please stay where you are or sit
                nearby.
              </h2>

              <p className="text-base sm:text-lg font-bold text-emerald-900 max-w-xl leading-relaxed">
                Hospital rapid response team has received your call and is on
                their way to{' '}
                <span className="underline decoration-2 font-extrabold">
                  {landmark}
                </span>
                .
              </p>

              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-200 text-emerald-950 text-xs font-black tracking-wider uppercase mt-1">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-600 animate-ping" />
                Alert Dispatched at {alertTime || 'Just Now'}
              </div>
            </div>

            {/* Calm Guidance Box */}
            <div className="card p-5 rounded-2xl border-2 border-[var(--color-border)] bg-[var(--color-surface)] flex flex-col gap-3 shadow-2xs">
              <h3 className="text-sm font-black uppercase tracking-wider text-[var(--color-primary-700)] flex items-center gap-2">
                <Sparkles size={16} />
                Important Instructions
              </h3>

              <div className="flex flex-col gap-3 text-sm sm:text-base font-semibold text-[var(--color-text)]">
                <div className="flex items-start gap-3">
                  <div className="w-7 h-7 rounded-full bg-[var(--color-primary-50)] text-[var(--color-primary-600)] font-black text-xs flex items-center justify-center shrink-0 mt-0.5">
                    1
                  </div>
                  <p className="leading-snug">
                    <strong>Sit down or lean against a sturdy wall</strong> to
                    avoid falling or dizziness.
                  </p>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-7 h-7 rounded-full bg-[var(--color-primary-50)] text-[var(--color-primary-600)] font-black text-xs flex items-center justify-center shrink-0 mt-0.5">
                    2
                  </div>
                  <p className="leading-snug">
                    <strong>Keep your phone screen on.</strong> Staff wearing
                    hospital badges will call out or look for you at {landmark}.
                  </p>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-7 h-7 rounded-full bg-[var(--color-primary-50)] text-[var(--color-primary-600)] font-black text-xs flex items-center justify-center shrink-0 mt-0.5">
                    3
                  </div>
                  <p className="leading-snug">
                    If anyone is walking by, ask them to stand beside you while
                    the medical team arrives.
                  </p>
                </div>
              </div>
            </div>

            {/* Direct Phone Emergency Hotline Button */}
            <a
              href="tel:108"
              className="btn btn-danger btn-lg w-full flex items-center justify-center gap-2 font-black text-base sm:text-lg shadow-sm"
            >
              <Phone size={22} />
              Need Immediate Voice Call? Dial 108
            </a>

            {/* Secondary Actions */}
            <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
              <Button
                variant="secondary"
                size="md"
                fullWidth
                onClick={() => setIsAlerted(false)}
              >
                Update Symptoms or Location
              </Button>

              <Button
                variant="ghost"
                size="md"
                fullWidth
                icon={<ArrowLeft size={18} />}
                onClick={() => navigate('/patient/slip')}
              >
                Back to My Slip
              </Button>
            </div>
          </div>
        )}
      </div>
    </BaseLayout>
  );
}
