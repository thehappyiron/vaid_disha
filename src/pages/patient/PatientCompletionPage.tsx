import { findDepartmentByName, DEPARTMENT_BY_ID } from '../../data/departments';
import { useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import {
  CheckCircle2,
  Navigation,
  FileText,
  Star,
  Sparkles,
  Ticket,
  Home,
  Building2,
  Stethoscope,
  Pill,
} from 'lucide-react';
import { BaseLayout } from '../../components/layout';
import { Button, StatusBadge, PageHeader } from '../../components/ui';

interface FeedbackData {
  rating: number;
  tags: string[];
  comment: string;
}

const FEEDBACK_TAGS = [
  'Doctor was helpful',
  'Clear wayfinding directions',
  'Short wait time',
  'Clean hospital facilities',
  'Courteous staff',
  'Easy to find room',
];

export function PatientCompletionPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const tokenParam = searchParams.get('token') || 'CARD-1042';
  const department =
    findDepartmentByName(searchParams.get('dept') || '') ||
    DEPARTMENT_BY_ID['opd-general-2'];
  const doctorParam = department.doctorName;
  const deptParam = department.name;

  // Feedback state
  const [rating, setRating] = useState<number>(5);
  const [hoverRating, setHoverRating] = useState<number>(0);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [comment, setComment] = useState('');
  const [feedbackSubmitted, setFeedbackSubmitted] = useState(false);

  // Reports modal / toast
  const [showReportsToast, setShowReportsToast] = useState(false);

  const toggleTag = (tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  const handleFeedbackSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const feedback: FeedbackData = {
      rating,
      tags: selectedTags,
      comment: comment.trim(),
    };

    try {
      const existing = localStorage.getItem('vd-patient-feedback');
      const list = existing ? JSON.parse(existing) : [];
      list.unshift({
        ...feedback,
        token: tokenParam,
        timestamp: new Date().toISOString(),
      });
      localStorage.setItem('vd-patient-feedback', JSON.stringify(list));
    } catch {
      // ignore
    }

    setFeedbackSubmitted(true);
  };

  const starLabels = ['', 'Poor', 'Fair', 'Good', 'Very Good', 'Excellent!'];

  return (
    <BaseLayout showHome={true} headerTitle="Consultation Complete">
      <div className="page-container gap-4 sm:gap-6">
        {/* Page Header */}
        <PageHeader
          title="Consultation Complete"
          subtitle="Your specialist visit is complete. Please review your next steps below."
          showBack={true}
          onBack={() => navigate('/')}
          actions={
            <StatusBadge
              variant="success"
              label="VISIT CONCLUDED"
              icon={<CheckCircle2 size={14} />}
            />
          }
        />

        {/* ══════════════════════════════════════════════════════════════════
            HERO CARD: CELEBRATORY VISIT COMPLETION NOTICE
            ══════════════════════════════════════════════════════════════════ */}
        <div className="p-6 sm:p-7 rounded-3xl bg-emerald-50 border-3 border-emerald-400 text-emerald-950 flex flex-col gap-4 shadow-sm">
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-3.5">
              <div className="w-14 h-14 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-sm">
                <CheckCircle2 size={34} strokeWidth={2.5} />
              </div>
              <div>
                <span className="text-xs uppercase font-black tracking-wider text-emerald-800 block">
                  Outpatient Consultation Concluded
                </span>
                <h1 className="text-xl sm:text-2xl font-black text-emerald-950 leading-tight">
                  Consultation with {doctorParam} Complete
                </h1>
              </div>
            </div>

            <div className="p-2.5 px-3.5 rounded-xl bg-white/90 border border-emerald-300 flex items-center gap-2">
              <span className="text-xs font-bold text-emerald-800">Token:</span>
              <span className="font-mono font-black text-base text-emerald-700">
                {tokenParam}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-emerald-200 text-xs sm:text-sm font-semibold">
            <div className="flex items-center gap-2 text-emerald-900">
              <Building2 size={16} className="text-emerald-700 shrink-0" />
              <span>
                Department: <strong>{deptParam}</strong>
              </span>
            </div>
            <div className="flex items-center gap-2 text-emerald-900">
              <Stethoscope size={16} className="text-emerald-700 shrink-0" />
              <span>
                Attending Specialist: <strong>{doctorParam}</strong>
              </span>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-white/80 text-xs font-semibold text-emerald-900 flex items-center gap-2">
            <Sparkles size={16} className="text-emerald-600 shrink-0" />
            <span>
              Digital prescription and diagnostic orders have been saved to your
              health profile.
            </span>
          </div>
        </div>

        {/* ══════════════════════════════════════════════════════════════════
            NEXT STEPS SECTION
            ══════════════════════════════════════════════════════════════════ */}
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-lg font-black text-[var(--color-text)] flex items-center gap-2">
              <span>Next Steps Following Consultation</span>
            </h2>
            <span className="text-xs font-bold text-[var(--color-text-muted)]">
              3 Steps Recommended
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* NEXT STEP 1: PHARMACY */}
            <div className="card p-5 rounded-2xl border-2 border-[var(--color-border)] bg-[var(--color-surface)] flex flex-col justify-between gap-4 shadow-2xs">
              <div className="flex items-start gap-3.5">
                <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-700 border border-amber-200 flex items-center justify-center shrink-0">
                  <Pill size={24} />
                </div>
                <div>
                  <span className="text-xs font-black uppercase tracking-wider text-amber-700 block mb-0.5">
                    Step 1 • Medication Collection
                  </span>
                  <h3 className="font-black text-base sm:text-lg text-[var(--color-text)] leading-snug">
                    Collect Prescribed Medicines
                  </h3>
                  <p className="text-xs sm:text-sm font-medium text-[var(--color-text-muted)] mt-1 leading-relaxed">
                    Prescribed medicines have been routed to{' '}
                    <strong>Pharmacy (G-04)</strong> (Ground Floor, Main
                    hospital).
                  </p>
                </div>
              </div>

              <div className="pt-2 border-t border-[var(--color-border)] flex flex-col gap-2">
                <div className="flex items-center justify-between text-xs text-[var(--color-text-muted)] font-semibold">
                  <span>Estimated Pharmacy Wait:</span>
                  <span className="font-bold text-emerald-600">~5 mins</span>
                </div>

                <Button
                  variant="primary"
                  size="md"
                  fullWidth
                  icon={<Navigation size={18} />}
                  onClick={() =>
                    navigate('/patient/guidance', {
                      state: { destinationNodeId: 'pharmacy' },
                    })
                  }
                >
                  Guide Me to Pharmacy →
                </Button>
              </div>
            </div>

            {/* NEXT STEP 2: COLLECT LAB / DIAGNOSTIC REPORTS */}
            <div className="card p-5 rounded-2xl border-2 border-[var(--color-border)] bg-[var(--color-surface)] flex flex-col justify-between gap-4 shadow-2xs">
              <div className="flex items-start gap-3.5">
                <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-700 border border-indigo-200 flex items-center justify-center shrink-0">
                  <FileText size={24} />
                </div>
                <div>
                  <span className="text-xs font-black uppercase tracking-wider text-indigo-700 block mb-0.5">
                    Step 2 • Diagnostics & Pathology
                  </span>
                  <h3 className="font-black text-base sm:text-lg text-[var(--color-text)] leading-snug">
                    Lab & Radiology Reports
                  </h3>
                  <p className="text-xs sm:text-sm font-medium text-[var(--color-text-muted)] mt-1 leading-relaxed">
                    View test results digitally or pick up printed reports at
                    the <strong>Diagnostics Wing Reception</strong>.
                  </p>
                </div>
              </div>

              <div className="pt-2 border-t border-[var(--color-border)] flex flex-col gap-2">
                <div className="flex items-center justify-between text-xs text-[var(--color-text-muted)] font-semibold">
                  <span>Digital Report Status:</span>
                  <span className="font-bold text-emerald-600">
                    Ready for Download
                  </span>
                </div>

                <Button
                  variant="secondary"
                  size="md"
                  fullWidth
                  icon={<FileText size={18} />}
                  onClick={() => {
                    setShowReportsToast(true);
                    setTimeout(() => setShowReportsToast(false), 4000);
                  }}
                >
                  View Digital Reports →
                </Button>
              </div>
            </div>
          </div>

          {/* Report download feedback toast */}
          {showReportsToast && (
            <div className="p-3.5 rounded-xl bg-indigo-50 border border-indigo-300 text-indigo-950 text-xs sm:text-sm font-bold flex items-center justify-between gap-2 animate-fadeIn">
              <span>
                Diagnostic report downloaded to your device & saved to Visit
                History!
              </span>
              <Link
                to="/patient/history"
                className="underline font-black text-indigo-700"
              >
                Open History
              </Link>
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════════════
              NEXT STEP 3: PATIENT FEEDBACK
              ══════════════════════════════════════════════════════════════════ */}
          <div className="card p-5 sm:p-6 rounded-2xl border-2 border-[var(--color-border)] bg-[var(--color-surface)] flex flex-col gap-4 shadow-2xs">
            <div className="flex items-center justify-between gap-2">
              <div>
                <span className="text-xs font-black uppercase tracking-wider text-[var(--color-primary-700)] block">
                  Step 3 • Patient Experience
                </span>
                <h3 className="text-lg font-black text-[var(--color-text)]">
                  How was your hospital visit today?
                </h3>
              </div>

              <span className="text-xs text-[var(--color-text-muted)] font-semibold">
                1 minute
              </span>
            </div>

            {!feedbackSubmitted ? (
              <form
                onSubmit={handleFeedbackSubmit}
                className="flex flex-col gap-4"
              >
                {/* Star Rating */}
                <div className="flex flex-col items-center gap-1.5 p-4 rounded-xl bg-[var(--color-surface-2)]">
                  <span className="text-xs font-bold text-[var(--color-text-muted)]">
                    Tap to rate your consultation experience:
                  </span>

                  <div className="flex items-center gap-2">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        onClick={() => setRating(star)}
                        onMouseEnter={() => setHoverRating(star)}
                        onMouseLeave={() => setHoverRating(0)}
                        aria-label={`Rate ${star} star`}
                        className="p-1 text-amber-400 hover:scale-115 transition-transform"
                      >
                        <Star
                          size={32}
                          className={[
                            'transition-colors',
                            star <= (hoverRating || rating)
                              ? 'fill-amber-400 text-amber-400'
                              : 'text-slate-300',
                          ].join(' ')}
                        />
                      </button>
                    ))}
                  </div>

                  <span className="text-sm font-black text-[var(--color-text)] mt-1">
                    {starLabels[hoverRating || rating]}
                  </span>
                </div>

                {/* Feedback tags */}
                <div className="flex flex-col gap-2">
                  <label className="text-xs font-bold text-[var(--color-text-muted)]">
                    What went well during your visit?
                  </label>

                  <div className="flex flex-wrap gap-2">
                    {FEEDBACK_TAGS.map((tag) => {
                      const isSelected = selectedTags.includes(tag);
                      return (
                        <button
                          key={tag}
                          type="button"
                          onClick={() => toggleTag(tag)}
                          className={[
                            'px-3 py-1.5 rounded-xl text-xs font-bold transition-all border',
                            isSelected
                              ? 'bg-[var(--color-primary-500)] text-white border-[var(--color-primary-500)] shadow-2xs'
                              : 'bg-[var(--color-surface-2)] text-[var(--color-text)] border-[var(--color-border)] hover:border-slate-300',
                          ].join(' ')}
                        >
                          {isSelected && '✓ '}
                          {tag}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Comment box */}
                <div className="flex flex-col gap-1.5">
                  <label
                    htmlFor="feedback-comment"
                    className="text-xs font-bold text-[var(--color-text-muted)]"
                  >
                    Additional Comments or Suggestions (Optional)
                  </label>
                  <textarea
                    id="feedback-comment"
                    rows={2}
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    placeholder="Tell us what you liked or how we can improve navigation..."
                    className="textarea w-full p-3 rounded-xl border-2 border-[var(--color-border)] bg-[var(--color-surface)] text-xs font-medium resize-none"
                  />
                </div>

                <Button
                  type="submit"
                  variant="primary"
                  size="md"
                  className="font-bold"
                >
                  Submit Feedback
                </Button>
              </form>
            ) : (
              <div className="p-5 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-950 flex flex-col items-center text-center gap-2">
                <CheckCircle2 size={32} className="text-emerald-600" />
                <h4 className="font-black text-base">
                  Thank you for your feedback!
                </h4>
                <p className="text-xs font-semibold text-emerald-900 max-w-sm">
                  Your review has been submitted to hospital quality management
                  to ensure prompt care for every patient.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* ══════════════════════════════════════════════════════════════════
            BOTTOM ACTIONS
            ══════════════════════════════════════════════════════════════════ */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
          <Button
            variant="secondary"
            size="lg"
            fullWidth
            icon={<Ticket size={20} />}
            onClick={() => navigate('/patient/history')}
          >
            View Visit History & Slips
          </Button>

          <Button
            variant="ghost"
            size="lg"
            fullWidth
            icon={<Home size={20} />}
            onClick={() => navigate('/')}
          >
            Return to Home
          </Button>
        </div>
      </div>
    </BaseLayout>
  );
}
