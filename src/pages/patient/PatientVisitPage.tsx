import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Volume2,
  VolumeX,
  ArrowRight,
  ArrowLeft,
  User,
  Heart,
  Accessibility,
  Footprints,
  Eye,
  Ear,
  HeartHandshake,
  CheckCircle2,
  Stethoscope,
  FlaskConical,
  Pill,
  CalendarCheck,
  Building,
  HelpCircle,
  Search,
  Sparkles,
  Ticket,
  Edit2,
  ShieldCheck,
  Check,
  Lightbulb,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { BaseLayout } from '../../components/layout';
import {
  Button,
  Card,
  Input,
  StatusBadge,
  EmergencyCard,
  OptionCard,
} from '../../components/ui';
import {
  getAllDepartments,
  generateSlip,
  suggestDepartmentFromSymptoms,
  type SymptomMatchResult,
} from '../../services/hospitalService';
import { syncSlipToSupabase } from '../../services/supabaseClient';
import type {
  Department,
  PatientVisitData,
  AccessibilityNeedId,
  VisitPurposeId,
} from '../../types';

// Speech synthesis helper
function speakText(text: string, langCode: string, onEnd?: () => void) {
  if (!('speechSynthesis' in window)) return null;
  try {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang =
      langCode === 'hi' ? 'hi-IN' : langCode === 'mr' ? 'mr-IN' : 'en-US';
    utterance.rate = 0.88;
    if (onEnd) {
      utterance.onend = onEnd;
      utterance.onerror = onEnd;
    }
    window.speechSynthesis.speak(utterance);
    return utterance;
  } catch {
    if (onEnd) onEnd();
    return null;
  }
}

export function PatientVisitPage() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { user, updateUserProfile } = useAuth();

  // All departments from mock service
  const [departments, setDepartments] = useState<Department[]>([]);

  // Form State
  const [visitData, setVisitData] = useState<PatientVisitData>(() => {
    // Auto-fill from registered profile if available
    const isRegistered = user && !user.isGuest;
    return {
      patientName: isRegistered ? user.name : '',
      patientAge: isRegistered && user.age ? user.age : '',
      patientGender: (isRegistered && user.gender
        ? user.gender.toLowerCase()
        : '') as any,
      accessibilityNeeds: ['none'],
      purposeId: 'consultation',
      departmentId: 'opd-general',
      symptoms: '',
      email: isRegistered && user?.email ? user.email : '',
    };
  });

  // Flow Step: 1 = Basic Details, 2 = Accessibility, 3 = Purpose, 4 = Department, 5 = Review
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [speaking, setSpeaking] = useState(false);
  const [generating, setGenerating] = useState(false);

  // Step 4 state
  const [searchQuery, setSearchQuery] = useState('');
  const [showSymptomHelper, setShowSymptomHelper] = useState(false);
  const [symptomInput, setSymptomInput] = useState('');
  const [symptomResult, setSymptomResult] = useState<SymptomMatchResult | null>(
    null
  );
  const [analyzingSymptoms, setAnalyzingSymptoms] = useState(false);

  // Load departments
  useEffect(() => {
    let isMounted = true;
    getAllDepartments()
      .then((data) => {
        if (isMounted) {
          setDepartments(data);
        }
      })
      .catch(() => {});
    return () => {
      isMounted = false;
    };
  }, []);

  // Stop text-to-speech on unmount or step change
  useEffect(() => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      setSpeaking(false);
    }
  }, [currentStep, i18n.language]);

  // Determine whether department selection step is needed
  // (Always needed for consultation and follow_up; for others, default department matches)
  const isDepartmentStepNeeded = useMemo(() => {
    return (
      visitData.purposeId === 'consultation' ||
      visitData.purposeId === 'follow_up'
    );
  }, [visitData.purposeId]);

  // Calculate dynamic steps
  const totalSteps = isDepartmentStepNeeded ? 5 : 4;
  const displayStepNumber = useMemo(() => {
    if (!isDepartmentStepNeeded && currentStep === 5) {
      return 4; // Review is step 4 of 4
    }
    return currentStep;
  }, [currentStep, isDepartmentStepNeeded]);

  // Voice narration for current screen
  const handleReadAloud = () => {
    if (speaking) {
      window.speechSynthesis.cancel();
      setSpeaking(false);
      return;
    }

    let speechPrompt = '';
    const lang = i18n.language;

    if (currentStep === 1) {
      speechPrompt = `${t('patient_visit.step1_title')}. ${t('patient_visit.step1_subtitle')}. ${t('patient_visit.name_label')}, ${t('patient_visit.age_label')}, ${t('patient_visit.gender_label')}.`;
    } else if (currentStep === 2) {
      speechPrompt = `${t('patient_visit.step2_title')}. ${t('patient_visit.step2_subtitle')}. ${t('patient_visit.a11y_wheelchair')}, ${t('patient_visit.a11y_walking')}, ${t('patient_visit.a11y_vision')}, ${t('patient_visit.a11y_hearing')}, ${t('patient_visit.a11y_elderly')}, ${t('patient_visit.a11y_none')}.`;
    } else if (currentStep === 3) {
      speechPrompt = `${t('patient_visit.step3_title')}. ${t('patient_visit.step3_subtitle')}. ${t('patient_visit.purpose_consultation')}, ${t('patient_visit.purpose_lab')}, ${t('patient_visit.purpose_pharmacy')}, ${t('patient_visit.purpose_followup')}, ${t('patient_visit.purpose_admission')}, ${t('patient_visit.purpose_other')}.`;
    } else if (currentStep === 4) {
      speechPrompt = `${t('patient_visit.step4_title')}. ${t('patient_visit.step4_subtitle')}. ${t('patient_visit.help_choose_btn')}.`;
    } else if (currentStep === 5) {
      speechPrompt = `${t('patient_visit.step5_title')}. ${t('patient_visit.step5_subtitle')}. ${t('patient_visit.generate_slip_btn')}.`;
    }

    setSpeaking(true);
    speakText(speechPrompt, lang, () => setSpeaking(false));
  };

  // Step 2 Accessibility handler
  const toggleAccessibilityNeed = (id: AccessibilityNeedId) => {
    setVisitData((prev) => {
      let nextNeeds: AccessibilityNeedId[] = [...prev.accessibilityNeeds];
      if (id === 'none') {
        nextNeeds = ['none'];
      } else {
        nextNeeds = nextNeeds.filter((n) => n !== 'none');
        if (nextNeeds.includes(id)) {
          nextNeeds = nextNeeds.filter((n) => n !== id);
          if (nextNeeds.length === 0) nextNeeds = ['none'];
        } else {
          nextNeeds.push(id);
        }
      }
      return { ...prev, accessibilityNeeds: nextNeeds };
    });
  };

  // Step 3 Purpose handler
  const handleSelectPurpose = (purposeId: VisitPurposeId) => {
    // Automatically preset reasonable default department
    let defaultDept = 'opd-general';
    if (purposeId === 'lab_test') defaultDept = 'lab-blood';
    if (purposeId === 'pharmacy') defaultDept = 'pharmacy';
    if (purposeId === 'admission_visitor') defaultDept = 'admission';
    if (purposeId === 'other') defaultDept = 'billing';

    setVisitData((prev) => ({
      ...prev,
      purposeId,
      departmentId: defaultDept,
    }));
  };

  // Step 4 Symptom Analysis
  const handleAnalyzeSymptoms = async (inputQuery?: string) => {
    const textToAnalyze = inputQuery || symptomInput;
    if (!textToAnalyze.trim()) return;
    setAnalyzingSymptoms(true);
    try {
      const match = await suggestDepartmentFromSymptoms(textToAnalyze);
      setSymptomResult(match);
    } finally {
      setAnalyzingSymptoms(false);
    }
  };

  const handleApplySymptomDepartment = (dept: Department) => {
    setVisitData((prev) => ({
      ...prev,
      departmentId: dept.id,
      doctorName: dept.doctorName,
    }));
    setShowSymptomHelper(false);
    // Proceed to Review
    setCurrentStep(5);
  };

  // Navigation handlers
  const handleNext = () => {
    if (currentStep === 1) {
      // Basic validation: default name if empty for guest
      if (!visitData.patientName.trim()) {
        setVisitData((prev) => ({ ...prev, patientName: 'Guest Patient' }));
      }
      setCurrentStep(2);
    } else if (currentStep === 2) {
      setCurrentStep(3);
    } else if (currentStep === 3) {
      if (isDepartmentStepNeeded) {
        setCurrentStep(4);
      } else {
        setCurrentStep(5); // Skip directly to review
      }
    } else if (currentStep === 4) {
      setCurrentStep(5);
    }
  };

  const handleBack = () => {
    if (currentStep === 1) {
      navigate('/patient/start');
    } else if (currentStep === 2) {
      setCurrentStep(1);
    } else if (currentStep === 3) {
      setCurrentStep(2);
    } else if (currentStep === 4) {
      setCurrentStep(3);
    } else if (currentStep === 5) {
      if (isDepartmentStepNeeded) {
        setCurrentStep(4);
      } else {
        setCurrentStep(3);
      }
    }
  };

  // Generate slip
  const handleGenerateSlip = async () => {
    try {
      setGenerating(true);
      if (
        visitData.patientName?.trim() &&
        (!user?.name ||
          user.name === 'Patient' ||
          user.name === 'Registered Patient')
      ) {
        updateUserProfile({ name: visitData.patientName.trim() });
      }
      const slip = await generateSlip(visitData);
      syncSlipToSupabase(slip);
      navigate(`/patient/slip/${slip.id}`, { state: { slip } });
    } catch {
      alert('Unable to generate slip. Please try again.');
    } finally {
      setGenerating(false);
    }
  };

  // Filtered departments for Step 4
  const filteredDepartments = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    const consultationDepts = departments.filter(
      (d) => d.category === 'consultation'
    );
    if (!q) return consultationDepts;
    return consultationDepts.filter((d) => {
      const name = t(d.nameKey).toLowerCase();
      const desc = t(d.descriptionKey).toLowerCase();
      const doc = (d.doctorName || '').toLowerCase();
      return name.includes(q) || desc.includes(q) || doc.includes(q);
    });
  }, [departments, searchQuery, t]);

  // Current department object
  const selectedDepartmentObj = useMemo(() => {
    return (
      departments.find((d) => d.id === visitData.departmentId) || departments[0]
    );
  }, [departments, visitData.departmentId]);

  return (
    <BaseLayout showHome={true} headerTitle={t('app.name')}>
      <div className="page-container gap-4 sm:gap-5 min-w-0 pb-10">
        {/* Progress Bar & Header */}
        <div className="flex flex-col gap-2 min-w-0">
          <div className="flex items-center justify-between gap-3 min-w-0">
            <span className="text-xs sm:text-sm font-bold uppercase tracking-wider text-[var(--color-primary-600)]">
              {t('patient_visit.progress_step', {
                current: displayStepNumber,
                total: totalSteps,
              })}
            </span>

            {/* Read Aloud Button */}
            <button
              type="button"
              onClick={handleReadAloud}
              className={[
                'btn btn-sm btn-ghost px-2.5 py-1 text-xs font-bold rounded-full flex items-center gap-1.5 transition-all',
                speaking
                  ? 'btn-primary animate-pulse text-white'
                  : 'text-[var(--color-primary-600)] hover:bg-[var(--color-primary-50)] border border-[var(--color-primary-200)]',
              ].join(' ')}
              aria-label={t('patient_visit.listen_button')}
              title={t('patient_visit.listen_button')}
            >
              {speaking ? (
                <>
                  <VolumeX size={16} aria-hidden="true" />
                  <span>Stop</span>
                </>
              ) : (
                <>
                  <Volume2 size={16} aria-hidden="true" />
                  <span>{t('patient_visit.listen_button')}</span>
                </>
              )}
            </button>
          </div>

          {/* Visual Progress Bar */}
          <div
            className="w-full bg-[var(--color-surface-2)] h-2 rounded-full overflow-hidden border border-[var(--color-border)]"
            role="progressbar"
            aria-valuenow={displayStepNumber}
            aria-valuemin={1}
            aria-valuemax={totalSteps}
          >
            <div
              className="bg-[var(--color-primary-500)] h-full transition-all duration-300 rounded-full"
              style={{ width: `${(displayStepNumber / totalSteps) * 100}%` }}
            />
          </div>
        </div>

        {/* ══════════════════════════════════════════════════════════════════
            STEP 1: Basic Details (Name, Age, Gender)
            ══════════════════════════════════════════════════════════════════ */}
        {currentStep === 1 && (
          <section
            aria-labelledby="step1-heading"
            className="w-full max-w-2xl mx-auto flex flex-col gap-5 min-w-0"
          >
            <div>
              <h1
                id="step1-heading"
                className="text-2xl sm:text-3xl font-extrabold text-[var(--color-text)] leading-tight break-words"
              >
                {t('patient_visit.step1_title')}
              </h1>
              <p className="text-sm sm:text-base text-[var(--color-text-muted)] mt-1 break-words">
                {t('patient_visit.step1_subtitle')}
              </p>
            </div>

            {/* Registered user pre-filled banner */}
            {user && !user.isGuest && (
              <OptionCard
                as="div"
                icon={
                  <ShieldCheck
                    size={22}
                    className="text-[var(--color-primary-500)]"
                    aria-hidden="true"
                  />
                }
                iconBgClass="bg-blue-100 text-blue-800"
                title={t('patient_visit.registered_prefilled', {
                  name: user.name,
                })}
                description="You can edit these details or tap Next to keep them."
                className="bg-blue-50 border-2 border-blue-200"
              />
            )}

            <Card className="p-4 sm:p-6 border-2 border-[var(--color-border)] min-w-0 shadow-sm">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleNext();
                }}
                className="flex flex-col gap-4 min-w-0"
              >
                {/* Name */}
                <Input
                  id="visit-patient-name"
                  label={t('patient_visit.name_label')}
                  placeholder={t('patient_visit.name_placeholder')}
                  hint={t('patient_visit.name_hint')}
                  value={visitData.patientName}
                  onChange={(e) =>
                    setVisitData({ ...visitData, patientName: e.target.value })
                  }
                  required={false}
                />

                {/* Age & Gender in responsive grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 min-w-0">
                  <Input
                    id="visit-patient-age"
                    type="number"
                    min={1}
                    max={125}
                    label={t('patient_visit.age_label')}
                    placeholder={t('patient_visit.age_placeholder')}
                    value={
                      visitData.patientAge === ''
                        ? ''
                        : String(visitData.patientAge)
                    }
                    onChange={(e) =>
                      setVisitData({
                        ...visitData,
                        patientAge: e.target.value
                          ? Number(e.target.value)
                          : '',
                      })
                    }
                  />

                  {/* Gender Selector */}
                  <div className="min-w-0">
                    <label className="block font-semibold mb-2 text-sm sm:text-base text-[var(--color-text)]">
                      {t('patient_visit.gender_label')}
                    </label>
                    <div
                      className="grid grid-cols-3 gap-2 min-w-0"
                      role="group"
                    >
                      {(['male', 'female', 'other'] as const).map(
                        (genderOption) => {
                          const isSelected =
                            visitData.patientGender === genderOption;
                          return (
                            <button
                              key={genderOption}
                              type="button"
                              onClick={() =>
                                setVisitData({
                                  ...visitData,
                                  patientGender: genderOption,
                                })
                              }
                              className={[
                                'btn btn-sm py-2.5 h-auto min-h-[3rem] text-xs sm:text-sm font-bold min-w-0',
                                isSelected
                                  ? 'btn-primary shadow-sm'
                                  : 'btn-ghost border border-[var(--color-border)]',
                              ].join(' ')}
                              aria-pressed={isSelected}
                            >
                              <span className="truncate">
                                {t(`patient_visit.gender_${genderOption}`)}
                              </span>
                            </button>
                          );
                        }
                      )}
                    </div>
                  </div>
                </div>

                {/* Email Address for OPD Slip & Live Queue Notifications */}
                <Input
                  id="visit-patient-email"
                  type="email"
                  label={t('patient_entry.email_label') || 'Email Address'}
                  placeholder={
                    t('patient_entry.email_placeholder') || 'Enter your email'
                  }
                  hint="We will send your OPD slip confirmation, live queue alerts, and visit reminders to this email."
                  value={visitData.email || ''}
                  onChange={(e) =>
                    setVisitData({ ...visitData, email: e.target.value.trim() })
                  }
                  required={false}
                />
              </form>
            </Card>
          </section>
        )}

        {/* ══════════════════════════════════════════════════════════════════
            STEP 2: Accessibility Needs (Multi-select)
            ══════════════════════════════════════════════════════════════════ */}
        {currentStep === 2 && (
          <section
            aria-labelledby="step2-heading"
            className="flex flex-col gap-4 min-w-0"
          >
            <div>
              <h1
                id="step2-heading"
                className="text-2xl sm:text-3xl font-extrabold text-[var(--color-text)] leading-tight break-words"
              >
                {t('patient_visit.step2_title')}
              </h1>
              <p className="text-sm sm:text-base text-[var(--color-text-muted)] mt-1 break-words">
                {t('patient_visit.step2_subtitle')}
              </p>
            </div>

            <div
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 min-w-0"
              role="group"
            >
              {[
                {
                  id: 'wheelchair' as const,
                  label: t('patient_visit.a11y_wheelchair'),
                  desc: t('patient_visit.a11y_wheelchair_desc'),
                  icon: <Accessibility size={24} aria-hidden="true" />,
                },
                {
                  id: 'walking_difficulty' as const,
                  label: t('patient_visit.a11y_walking'),
                  desc: t('patient_visit.a11y_walking_desc'),
                  icon: <Footprints size={24} aria-hidden="true" />,
                },
                {
                  id: 'vision_impairment' as const,
                  label: t('patient_visit.a11y_vision'),
                  desc: t('patient_visit.a11y_vision_desc'),
                  icon: <Eye size={24} aria-hidden="true" />,
                },
                {
                  id: 'hearing_impairment' as const,
                  label: t('patient_visit.a11y_hearing'),
                  desc: t('patient_visit.a11y_hearing_desc'),
                  icon: <Ear size={24} aria-hidden="true" />,
                },
                {
                  id: 'elderly_assistance' as const,
                  label: t('patient_visit.a11y_elderly'),
                  desc: t('patient_visit.a11y_elderly_desc'),
                  icon: <HeartHandshake size={24} aria-hidden="true" />,
                },
                {
                  id: 'none' as const,
                  label: t('patient_visit.a11y_none'),
                  desc: t('patient_visit.a11y_none_desc'),
                  icon: <CheckCircle2 size={24} aria-hidden="true" />,
                },
              ].map(({ id, label, desc, icon }) => {
                const isChecked = visitData.accessibilityNeeds.includes(id);

                return (
                  <OptionCard
                    key={id}
                    role="checkbox"
                    ariaChecked={isChecked}
                    selected={isChecked}
                    onClick={() => toggleAccessibilityNeed(id)}
                    icon={icon}
                    title={label}
                    description={desc}
                    rightSlot={
                      <div
                        className={[
                          'w-6 h-6 rounded-md border-2 flex items-center justify-center shrink-0',
                          isChecked
                            ? 'bg-[var(--color-primary-500)] border-[var(--color-primary-500)] text-white'
                            : 'border-[var(--color-neutral-400)] bg-white',
                        ].join(' ')}
                        aria-hidden="true"
                      >
                        {isChecked && <Check size={16} strokeWidth={3} />}
                      </div>
                    }
                  />
                );
              })}
            </div>
          </section>
        )}

        {/* ══════════════════════════════════════════════════════════════════
            STEP 3: Purpose of Visit
            ══════════════════════════════════════════════════════════════════ */}
        {currentStep === 3 && (
          <section
            aria-labelledby="step3-heading"
            className="flex flex-col gap-4 min-w-0"
          >
            <div>
              <h1
                id="step3-heading"
                className="text-2xl sm:text-3xl font-extrabold text-[var(--color-text)] leading-tight break-words"
              >
                {t('patient_visit.step3_title')}
              </h1>
              <p className="text-sm sm:text-base text-[var(--color-text-muted)] mt-1 break-words">
                {t('patient_visit.step3_subtitle')}
              </p>
            </div>

            {/* Pinned Emergency Card */}
            <EmergencyCard to="/patient/emergency" />

            <div
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 min-w-0"
              role="radiogroup"
            >
              {[
                {
                  id: 'consultation' as const,
                  title: t('patient_visit.purpose_consultation'),
                  desc: t('patient_visit.purpose_consultation_desc'),
                  icon: <Stethoscope size={26} aria-hidden="true" />,
                },
                {
                  id: 'lab_test' as const,
                  title: t('patient_visit.purpose_lab'),
                  desc: t('patient_visit.purpose_lab_desc'),
                  icon: <FlaskConical size={26} aria-hidden="true" />,
                },
                {
                  id: 'pharmacy' as const,
                  title: t('patient_visit.purpose_pharmacy'),
                  desc: t('patient_visit.purpose_pharmacy_desc'),
                  icon: <Pill size={26} aria-hidden="true" />,
                },
                {
                  id: 'follow_up' as const,
                  title: t('patient_visit.purpose_followup'),
                  desc: t('patient_visit.purpose_followup_desc'),
                  icon: <CalendarCheck size={26} aria-hidden="true" />,
                },
                {
                  id: 'admission_visitor' as const,
                  title: t('patient_visit.purpose_admission'),
                  desc: t('patient_visit.purpose_admission_desc'),
                  icon: <Building size={26} aria-hidden="true" />,
                },
                {
                  id: 'other' as const,
                  title: t('patient_visit.purpose_other'),
                  desc: t('patient_visit.purpose_other_desc'),
                  icon: <HelpCircle size={26} aria-hidden="true" />,
                },
              ].map(({ id, title, desc, icon }) => {
                const isSelected = visitData.purposeId === id;

                return (
                  <OptionCard
                    key={id}
                    role="radio"
                    ariaChecked={isSelected}
                    selected={isSelected}
                    onClick={() => handleSelectPurpose(id)}
                    icon={icon}
                    title={title}
                    description={desc}
                    rightSlot={
                      <div
                        className={[
                          'w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0',
                          isSelected
                            ? 'bg-[var(--color-primary-500)] border-[var(--color-primary-500)] text-white'
                            : 'border-[var(--color-neutral-400)] bg-white',
                        ].join(' ')}
                        aria-hidden="true"
                      >
                        {isSelected && <Check size={14} strokeWidth={3} />}
                      </div>
                    }
                  />
                );
              })}
            </div>
          </section>
        )}

        {/* ══════════════════════════════════════════════════════════════════
            STEP 4: Department / Speciality (with symptom keyword matcher)
            ══════════════════════════════════════════════════════════════════ */}
        {currentStep === 4 && (
          <section
            aria-labelledby="step4-heading"
            className="flex flex-col gap-4 min-w-0"
          >
            <div>
              <h1
                id="step4-heading"
                className="text-2xl sm:text-3xl font-extrabold text-[var(--color-text)] leading-tight break-words"
              >
                {t('patient_visit.step4_title')}
              </h1>
              <p className="text-sm sm:text-base text-[var(--color-text-muted)] mt-1 break-words">
                {t('patient_visit.step4_subtitle')}
              </p>
            </div>

            {/* "I don't know – help me choose" Card / CTA */}
            <OptionCard
              onClick={() => setShowSymptomHelper(!showSymptomHelper)}
              icon={<Sparkles size={22} aria-hidden="true" />}
              iconBgClass="bg-[var(--color-accent-500)] text-white shadow-sm"
              title={t('patient_visit.help_choose_btn')}
              description={t('patient_visit.help_choose_desc')}
              className="border-[var(--color-accent-500)] bg-[var(--color-accent-50)]"
              rightSlot={
                <Button
                  variant="secondary"
                  size="sm"
                  className="shrink-0 text-xs"
                >
                  {showSymptomHelper ? t('common.close') : t('common.select')}
                </Button>
              }
            />

            {/* Inline Symptom Matching Tool */}
            {showSymptomHelper && (
              <Card className="p-4 sm:p-5 border-2 border-[var(--color-accent-400)] bg-[var(--color-surface)] shadow-md min-w-0">
                <h3 className="font-bold text-base text-[var(--color-text)] mb-1">
                  {t('patient_visit.help_choose_title')}
                </h3>
                <p className="text-xs sm:text-sm text-[var(--color-text-muted)] mb-3">
                  {t('patient_visit.help_choose_desc')}
                </p>

                {/* Quick Chips */}
                <div className="mb-3 min-w-0">
                  <span className="text-xs font-bold text-[var(--color-text-muted)] block mb-1.5">
                    {t('patient_visit.quick_symptom_chips')}
                  </span>
                  <div className="flex flex-wrap gap-1.5 min-w-0">
                    {[
                      'Chest pain & heart palpitations',
                      'Knee / bone joint pain',
                      'Blurred eye vision',
                      'Earache & sore throat',
                      'Skin rash & itching',
                      'Fever, cough & cold',
                    ].map((chip) => (
                      <button
                        key={chip}
                        type="button"
                        onClick={() => {
                          setSymptomInput(chip);
                          handleAnalyzeSymptoms(chip);
                        }}
                        className="btn btn-ghost btn-sm text-xs py-1 px-2.5 h-auto rounded-full border border-[var(--color-border)] bg-[var(--color-surface-2)]"
                      >
                        {chip}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex gap-2 min-w-0">
                  <input
                    type="text"
                    value={symptomInput}
                    onChange={(e) => setSymptomInput(e.target.value)}
                    placeholder={t('patient_visit.symptom_placeholder')}
                    className="input text-sm flex-1 min-w-0"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAnalyzeSymptoms();
                      }
                    }}
                  />
                  <Button
                    variant="primary"
                    size="sm"
                    loading={analyzingSymptoms}
                    onClick={() => handleAnalyzeSymptoms()}
                    className="shrink-0"
                  >
                    {t('patient_visit.symptom_analyze_btn')}
                  </Button>
                </div>

                {/* Symptom Result Card */}
                {symptomResult && (
                  <div className="mt-4 p-4 rounded-xl bg-blue-50 border-2 border-[var(--color-primary-300)] flex flex-col gap-2 min-w-0 animate-fadeIn">
                    <div className="flex items-center gap-2">
                      <Sparkles
                        size={18}
                        className="text-[var(--color-primary-500)] shrink-0"
                      />
                      <span className="text-xs font-bold uppercase tracking-wider text-[var(--color-primary-700)]">
                        {t('patient_visit.symptom_suggestion_title')}
                      </span>
                    </div>

                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 min-w-0">
                      <div>
                        <h4 className="font-extrabold text-base sm:text-lg text-[var(--color-primary-950)] leading-tight">
                          {t(symptomResult.department.nameKey)}
                        </h4>
                        <p className="text-xs text-[var(--color-primary-900)] mt-0.5">
                          {symptomResult.department.doctorName} •{' '}
                          {symptomResult.reason}
                        </p>
                      </div>

                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() =>
                          handleApplySymptomDepartment(symptomResult.department)
                        }
                        className="shrink-0 self-start sm:self-auto"
                      >
                        {t('patient_visit.symptom_select_btn')}
                      </Button>
                    </div>
                  </div>
                )}
              </Card>
            )}

            {/* Department Search Box */}
            <div className="relative min-w-0">
              <span
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)] pointer-events-none"
                aria-hidden="true"
              >
                <Search size={18} />
              </span>
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t('patient_visit.search_placeholder')}
                className="input pl-10 text-sm w-full min-w-0"
              />
            </div>

            {/* Department Card List */}
            <div
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 min-w-0"
              role="radiogroup"
            >
              {filteredDepartments.length === 0 ? (
                <div className="col-span-full card p-6 text-center text-sm text-[var(--color-text-muted)]">
                  {t('patient_visit.no_dept_found')}
                </div>
              ) : (
                filteredDepartments.map((dept) => {
                  const isSelected = visitData.departmentId === dept.id;

                  return (
                    <OptionCard
                      key={dept.id}
                      role="radio"
                      ariaChecked={isSelected}
                      selected={isSelected}
                      onClick={() =>
                        setVisitData({
                          ...visitData,
                          departmentId: dept.id,
                          doctorName: dept.doctorName,
                        })
                      }
                      icon={<Stethoscope size={24} aria-hidden="true" />}
                      title={t(dept.nameKey)}
                      description={dept.doctorName}
                      badges={[
                        <div
                          key="loc"
                          className="flex flex-wrap items-center gap-1.5 text-xs text-[var(--color-text-muted)] font-medium pt-0.5"
                        >
                          <span>
                            {t('common.building')} {dept.building}
                          </span>
                          <span>•</span>
                          <span>
                            {t('common.floor')} {dept.floor}
                          </span>
                          <span>•</span>
                          <span>
                            Room {dept.roomNumbers[0]} ({dept.wing})
                          </span>
                        </div>,
                        <div
                          key="hours"
                          className="text-xs text-[var(--color-text-muted)]"
                        >
                          {dept.category === 'consultation' && (
                            <span>
                              {t('hospital.map.hours')}: {dept.opdHours} ·{' '}
                              {t('hospital.map.average')}:{' '}
                              {t('hospital.map.minutes', {
                                count: dept.averageConsultationMinutes,
                              })}
                            </span>
                          )}
                        </div>,
                      ]}
                      rightSlot={
                        <div
                          className={[
                            'w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0',
                            isSelected
                              ? 'bg-[var(--color-primary-500)] border-[var(--color-primary-500)] text-white'
                              : 'border-[var(--color-neutral-400)] bg-white',
                          ].join(' ')}
                          aria-hidden="true"
                        >
                          {isSelected && <Check size={14} strokeWidth={3} />}
                        </div>
                      }
                    />
                  );
                })
              )}
            </div>
          </section>
        )}

        {/* ══════════════════════════════════════════════════════════════════
            STEP 5: Review & Generate Slip Screen
            ══════════════════════════════════════════════════════════════════ */}
        {currentStep === 5 && (
          <section
            aria-labelledby="step5-heading"
            className="w-full max-w-2xl mx-auto flex flex-col gap-4 min-w-0"
          >
            <div>
              <h1
                id="step5-heading"
                className="text-2xl sm:text-3xl font-extrabold text-[var(--color-text)] leading-tight break-words"
              >
                {t('patient_visit.step5_title')}
              </h1>
              <p className="text-sm sm:text-base text-[var(--color-text-muted)] mt-1 break-words">
                {t('patient_visit.step5_subtitle')}
              </p>
            </div>

            <div className="flex flex-col gap-3">
              {/* Review Item 1: Patient Details */}
              <OptionCard
                as="div"
                icon={
                  <User size={22} className="text-[var(--color-primary-500)]" />
                }
                iconBgClass="bg-[var(--color-primary-50)]"
                title={
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-bold text-sm uppercase tracking-wide text-[var(--color-text-muted)]">
                      {t('patient_visit.review_patient')}
                    </span>
                    <button
                      type="button"
                      onClick={() => setCurrentStep(1)}
                      className="btn btn-ghost btn-sm text-xs font-bold text-[var(--color-primary-600)] flex items-center gap-1 shrink-0 p-1"
                      aria-label={`Edit ${t('patient_visit.review_patient')}`}
                    >
                      <Edit2 size={14} />
                      <span>{t('patient_visit.edit')}</span>
                    </button>
                  </div>
                }
                description={
                  <div>
                    <p className="font-bold text-base sm:text-lg text-[var(--color-text)]">
                      {visitData.patientName || 'Guest Patient'}
                    </p>
                    <p className="text-xs sm:text-sm text-[var(--color-text-muted)] mt-0.5">
                      {visitData.patientAge
                        ? `${visitData.patientAge} years`
                        : 'Age: Not specified'}{' '}
                      •{' '}
                      {visitData.patientGender
                        ? t(`patient_visit.gender_${visitData.patientGender}`)
                        : 'Gender: Not specified'}
                      {visitData.email ? ` • ${visitData.email}` : ''}
                    </p>
                  </div>
                }
              />

              {/* Review Item 2: Accessibility Needs */}
              <OptionCard
                as="div"
                icon={
                  <Accessibility
                    size={22}
                    className="text-[var(--color-primary-500)]"
                  />
                }
                iconBgClass="bg-[var(--color-primary-50)]"
                title={
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-bold text-sm uppercase tracking-wide text-[var(--color-text-muted)]">
                      {t('patient_visit.review_accessibility')}
                    </span>
                    <button
                      type="button"
                      onClick={() => setCurrentStep(2)}
                      className="btn btn-ghost btn-sm text-xs font-bold text-[var(--color-primary-600)] flex items-center gap-1 shrink-0 p-1"
                      aria-label={`Edit ${t('patient_visit.review_accessibility')}`}
                    >
                      <Edit2 size={14} />
                      <span>{t('patient_visit.edit')}</span>
                    </button>
                  </div>
                }
                badge={
                  <div className="flex flex-wrap gap-1.5 pt-0.5">
                    {visitData.accessibilityNeeds.map((need) => (
                      <StatusBadge
                        key={need}
                        variant={need === 'none' ? 'neutral' : 'info'}
                        label={t(`patient_visit.a11y_${need}`)}
                      />
                    ))}
                  </div>
                }
              />

              {/* Review Item 3: Purpose of Visit */}
              <OptionCard
                as="div"
                icon={
                  <Heart
                    size={22}
                    className="text-[var(--color-primary-500)]"
                  />
                }
                iconBgClass="bg-[var(--color-primary-50)]"
                title={
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-bold text-sm uppercase tracking-wide text-[var(--color-text-muted)]">
                      {t('patient_visit.review_purpose')}
                    </span>
                    <button
                      type="button"
                      onClick={() => setCurrentStep(3)}
                      className="btn btn-ghost btn-sm text-xs font-bold text-[var(--color-primary-600)] flex items-center gap-1 shrink-0 p-1"
                      aria-label={`Edit ${t('patient_visit.review_purpose')}`}
                    >
                      <Edit2 size={14} />
                      <span>{t('patient_visit.edit')}</span>
                    </button>
                  </div>
                }
                description={
                  <div>
                    <p className="font-bold text-base sm:text-lg text-[var(--color-text)]">
                      {t(`patient_visit.purpose_${visitData.purposeId}`)}
                    </p>
                    <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
                      {t(`patient_visit.purpose_${visitData.purposeId}_desc`)}
                    </p>
                  </div>
                }
              />

              {/* Review Item 4: Department & Doctor */}
              <OptionCard
                as="div"
                highlighted
                icon={
                  <Stethoscope
                    size={22}
                    className="text-[var(--color-primary-500)]"
                  />
                }
                iconBgClass="bg-[var(--color-primary-50)]"
                title={
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-bold text-sm uppercase tracking-wide text-[var(--color-primary-800)]">
                      {t('patient_visit.review_department')}
                    </span>
                    {isDepartmentStepNeeded && (
                      <button
                        type="button"
                        onClick={() => setCurrentStep(4)}
                        className="btn btn-ghost btn-sm text-xs font-bold text-[var(--color-primary-600)] flex items-center gap-1 shrink-0 p-1"
                        aria-label={`Edit ${t('patient_visit.review_department')}`}
                      >
                        <Edit2 size={14} />
                        <span>{t('patient_visit.edit')}</span>
                      </button>
                    )}
                  </div>
                }
                description={
                  <div>
                    <p className="font-extrabold text-base sm:text-lg text-[var(--color-text)]">
                      {t(selectedDepartmentObj.nameKey)}
                    </p>
                    <p className="text-sm font-semibold text-[var(--color-primary-700)] mt-0.5">
                      {selectedDepartmentObj.doctorName}
                    </p>
                    <p className="text-xs text-[var(--color-text-muted)] mt-1">
                      Building {selectedDepartmentObj.building}, Floor{' '}
                      {selectedDepartmentObj.floor} — Room{' '}
                      {selectedDepartmentObj.roomNumbers[0]} (
                      {selectedDepartmentObj.wing})
                    </p>
                  </div>
                }
              />

              {/* Notice */}
              <div className="text-xs text-[var(--color-text-muted)] p-3 bg-[var(--color-surface-2)] rounded-xl border border-[var(--color-border)] flex items-center gap-2">
                <Lightbulb
                  size={16}
                  className="text-amber-500 shrink-0"
                  aria-hidden="true"
                />
                <span>{t('patient_visit.review_route_hint')}</span>
              </div>
            </div>
          </section>
        )}

        {/* ══════════════════════════════════════════════════════════════════
            BIG NEXT / BACK / GENERATE ACTIONS (Fixed or Sticky bottom bar)
            ══════════════════════════════════════════════════════════════════ */}
        <div
          className={`flex flex-col sm:flex-row gap-3 pt-3 border-t border-[var(--color-border)] mt-2 min-w-0 w-full ${currentStep === 1 || currentStep === 5 ? 'max-w-2xl mx-auto' : ''}`}
        >
          <Button
            type="button"
            variant="ghost"
            size="lg"
            icon={<ArrowLeft size={20} />}
            onClick={handleBack}
            className="sm:w-1/3 min-w-0 min-h-[3.5rem] text-base font-bold"
          >
            {t('patient_visit.back_btn')}
          </Button>

          {currentStep < 5 ? (
            <Button
              type="button"
              variant="primary"
              size="lg"
              icon={<ArrowRight size={20} />}
              iconPosition="right"
              onClick={handleNext}
              className="sm:w-2/3 min-w-0 min-h-[3.5rem] text-base sm:text-lg font-extrabold shadow-md"
            >
              {t('patient_visit.next_btn')}
            </Button>
          ) : (
            <Button
              type="button"
              variant="primary"
              size="lg"
              loading={generating}
              icon={<Ticket size={22} />}
              iconPosition="right"
              onClick={handleGenerateSlip}
              className="sm:w-2/3 min-w-0 min-h-[3.75rem] text-lg font-black bg-[var(--color-primary-500)] shadow-lg hover:brightness-105"
            >
              {generating
                ? t('patient_visit.generating_slip')
                : t('patient_visit.generate_slip_btn')}
            </Button>
          )}
        </div>
      </div>
    </BaseLayout>
  );
}
