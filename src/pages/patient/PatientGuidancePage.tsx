import { useState, useEffect, useRef } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  RotateCcw,
  Volume2,
  VolumeX,
  MapPin,
  QrCode,
  Search,
  CheckCircle2,
  AlertTriangle,
  HelpCircle,
  Building2,
  Layers,
  PhoneCall,
  X,
  Compass,
  Footprints,
  Languages,
} from 'lucide-react';
import { BaseLayout } from '../../components/layout';
import {
  PageHeader,
  Button,
  Card,
  OptionCard,
} from '../../components/ui';
import { HospitalFloorMap } from '../../components/guidance/HospitalFloorMap';
import { voiceService } from '../../services/voice';
import {
  computeRoute,
  getLandmarksGrouped,
  findNodeByPillarCode,
  findNodeByDepartmentId,
  getNodeById,
  type GraphNode,
  type RouteResult,
  type GuidanceStep,
} from '../../services/pathfindingService';
import { getSlipById } from '../../services/hospitalService';
import type { Slip } from '../../types';

export function PatientGuidancePage() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const { slipId } = useParams<{ slipId?: string }>();

  // Slip context
  const [slip, setSlip] = useState<Slip | null>((location.state as { slip?: Slip })?.slip || null);

  // Guidance state
  const [startNode, setStartNode] = useState<GraphNode | null>(null);
  const [destinationNode, setDestinationNode] = useState<GraphNode | null>(null);
  const [routeResult, setRouteResult] = useState<RouteResult | null>(null);

  // Step 1: Location picker state
  const [activeStepTab, setActiveStepTab] = useState<'landmark' | 'qr'>('landmark');
  const [searchQuery, setSearchQuery] = useState('');
  const [customPillarInput, setCustomPillarInput] = useState('');
  const [cameraMockActive, setCameraMockActive] = useState(false);

  // Step 2: Route navigation state
  const [activeStepIndex, setActiveStepIndex] = useState(0);
  const [viewMode, setViewMode] = useState<'card' | 'map'>('card');
  const [selectedMapFloor, setSelectedMapFloor] = useState(0);
  const [autoVoice, setAutoVoice] = useState(true);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isArrived, setIsArrived] = useState(false);
  const [voiceError, setVoiceError] = useState<string | null>(null);

  // Modals
  const [showStaffModal, setShowStaffModal] = useState(false);

  const stepCardRef = useRef<HTMLDivElement>(null);

  // Check mobility/wheelchair needs
  const hasMobilityNeeds =
    slip?.accessibilityNeeds?.includes('wheelchair') ||
    slip?.accessibilityNeeds?.includes('walking_difficulty');

  const destinationName = destinationNode ? t(destinationNode.nameKey, destinationNode.name) : '';
  const isFacilityDestination = destinationNode?.category === 'facility';

  // Load slip if provided via ID
  useEffect(() => {
    async function fetchSlip() {
      if (!slip && slipId) {
        try {
          const found = await getSlipById(slipId);
          if (found) setSlip(found);
        } catch (err) {
          console.warn('Failed to load slip', err);
        }
      }
    }
    fetchSlip();
  }, [slip, slipId]);

  // Set destination and start node from location state or URL params or slip
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const destParam = params.get('dest') || (location.state as { destinationNodeId?: string })?.destinationNodeId;
    const startParam = params.get('start') || (location.state as { startNodeId?: string })?.startNodeId;

    if (startParam) {
      const sNode = getNodeById(startParam);
      if (sNode) setStartNode(sNode);
    } else {
      const storedLast = localStorage.getItem('vd-last-location');
      if (storedLast) {
        const sNode = getNodeById(storedLast);
        if (sNode) setStartNode(sNode);
      }
    }

    if (destParam) {
      const dNode = getNodeById(destParam);
      if (dNode) {
        setDestinationNode(dNode);
        return;
      }
    }

    if (slip) {
      let dest = findNodeByDepartmentId(slip.department.id);
      if (!dest && slip.roomNumber) {
        dest = findNodeByPillarCode(slip.roomNumber);
      }
      if (!dest) {
        // Fallback destination based on floor
        dest = getNodeById('opd-cardiology') || getNodeById('opd-general')!;
      }
      setDestinationNode(dest);
    } else {
      // Default sample destination (Cardiology Room B-201)
      const defaultDest = getNodeById('opd-cardiology')!;
      setDestinationNode(defaultDest);
    }
  }, [slip, location.search, location.state]);

  // Compute route when startNode or destinationNode changes
  useEffect(() => {
    if (startNode && destinationNode) {
      const result = computeRoute(startNode.id, destinationNode.id, {
        excludeStairs: hasMobilityNeeds,
      });
      setRouteResult(result);
      setActiveStepIndex(0);
      setIsArrived(false);
      if (result && result.steps.length > 0) {
        setSelectedMapFloor(result.steps[0].floor);
      }
    }
  }, [startNode, destinationNode, hasMobilityNeeds]);

  // Helper: Format instruction text using i18n template
  const getStepInstructionText = (step: GuidanceStep): string => {
    const { templateKey, params } = step;
    const directionWord = params.direction
      ? t(`guidance.direction_${params.direction}`, params.direction)
      : '';

    if (templateKey === 'guidance.step_arrive') {
      const roomVal = params.room;
      if (!roomVal || roomVal === 'Counter' || roomVal === 'undefined') {
        return t('guidance.step_arrive_simple', {
          defaultValue: `You have reached ${params.landmark}.`,
          landmark: params.landmark,
        });
      }
    }

    return t(templateKey, {
      ...params,
      direction: directionWord,
    });
  };

  // Speak current instruction
  const speakCurrentStep = (stepText: string) => {
    if (!voiceService.isSupported()) {
      setVoiceError('Voice temporarily unavailable. Continue using the on-screen directions.');
      return;
    }
    setVoiceError(null);
    setIsSpeaking(true);
    voiceService.speak(stepText, {
      lang: i18n.language,
      onStart: () => setIsSpeaking(true),
      onEnd: () => setIsSpeaking(false),
      onError: () => {
        setIsSpeaking(false);
        setVoiceError('Voice temporarily unavailable. Continue using the on-screen directions.');
      },
    });
  };

  const handleToggleAudio = () => {
    if (isSpeaking) {
      voiceService.stop();
      setIsSpeaking(false);
    } else if (routeResult && routeResult.steps[activeStepIndex]) {
      const currentStep = routeResult.steps[activeStepIndex];
      speakCurrentStep(getStepInstructionText(currentStep));
    }
  };

  // Auto-speak on step transition if enabled
  useEffect(() => {
    if (routeResult && routeResult.steps[activeStepIndex] && autoVoice && !isArrived) {
      const currentStep = routeResult.steps[activeStepIndex];
      const text = getStepInstructionText(currentStep);
      speakCurrentStep(text);
      // Auto-switch map floor to active step floor
      setSelectedMapFloor(currentStep.floor);
    }
    // Focus step card for screen readers
    stepCardRef.current?.focus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeStepIndex, autoVoice]);

  // Stop voice on component unmount
  useEffect(() => {
    return () => {
      voiceService.stop();
    };
  }, []);

  const handleNextStep = () => {
    if (!routeResult) return;
    if (activeStepIndex < routeResult.steps.length - 1) {
      setActiveStepIndex((prev) => prev + 1);
    } else {
      setIsArrived(true);
      if (autoVoice) {
        const arrivalText = t('guidance.arrival_title', {
          room: destinationNode?.roomNumber || destinationName,
        });
        speakCurrentStep(arrivalText);
      }
    }
  };

  const handlePrevStep = () => {
    if (activeStepIndex > 0) {
      setActiveStepIndex((prev) => prev - 1);
      setIsArrived(false);
    }
  };

  // Select location from landmark list
  const handleSelectLandmark = (node: GraphNode) => {
    setStartNode(node);
  };

  // Select location from pillar code
  const handlePillarSubmit = (code: string) => {
    const found = findNodeByPillarCode(code);
    if (found) {
      setStartNode(found);
      setCustomPillarInput('');
    } else {
      alert(`Pillar code "${code}" not found. Please try F0-P1, F0-P2, F1-P3, or F2-P7.`);
    }
  };

  // Reset location (I'm lost again)
  const handleUpdateLocation = () => {
    voiceService.stop();
    setIsSpeaking(false);
    setStartNode(null);
    setRouteResult(null);
    setIsArrived(false);
  };

  const currentStep = routeResult?.steps[activeStepIndex];
  const activeNodeOnFloor = currentStep?.fromNode || startNode;

  return (
    <BaseLayout showHome={true} headerTitle={t('app.name')}>
      <div className="page-container gap-4">
        {/* Page Header */}
        <PageHeader
          title={t('guidance.page_title')}
          showBack={Boolean(slip)}
          subtitle={
            destinationNode
              ? t('guidance.route_title', {
                  department: destinationName,
                })
              : t('guidance.step1_subtitle')
          }
          onBack={() => {
            if (slip) {
              navigate(`/patient/slip/${slip.id}`, { state: { slip } });
            } else {
              navigate('/');
            }
          }}
        />

        {/* Mobility warning badge */}
        {hasMobilityNeeds && (
          <div className="flex items-center gap-2 p-3 bg-blue-50 border border-blue-300 rounded-xl text-blue-900 text-xs sm:text-sm font-semibold">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-600 shrink-0" />
            <span>Accessible route active: Step-free path using elevators only.</span>
          </div>
        )}

        {/* ═════════════════════════════════════════════════════════════════════
            STEP 1: WHERE ARE YOU RIGHT NOW? (No GPS - Indoor entry)
            ═════════════════════════════════════════════════════════════════════ */}
        {!startNode && (
          <div className="flex flex-col gap-4 animate-fadeIn">
            <Card className="p-5 border-2 border-[var(--color-primary-500)] bg-[var(--color-surface)] shadow-md">
              <div className="grid grid-cols-[auto_minmax(0,1fr)] items-start gap-3">
                <div className="w-12 h-12 rounded-2xl bg-[var(--color-primary-50)] text-[var(--color-primary-500)] flex items-center justify-center shrink-0">
                  <Compass size={28} aria-hidden="true" />
                </div>
                <div>
                  <h2 className="text-xl sm:text-2xl font-black text-[var(--color-text)]">
                    {t('guidance.step1_title')}
                  </h2>
                  <p className="text-sm font-medium text-[var(--color-text-muted)] mt-1">
                    {t('guidance.step1_subtitle')}
                  </p>
                </div>
              </div>

              {/* Mode Tabs: Select Landmark vs Scan / Pillar Code */}
              <div className="grid grid-cols-2 gap-2 mt-5 p-1 bg-[var(--color-surface-2)] rounded-xl border border-[var(--color-border)]">
                <button
                  type="button"
                  onClick={() => setActiveStepTab('landmark')}
                  className={[
                    'py-2.5 px-3 rounded-lg font-bold text-xs sm:text-sm transition-all flex items-center justify-center gap-1.5',
                    activeStepTab === 'landmark'
                      ? 'bg-[var(--color-primary-500)] text-white shadow-xs'
                      : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)]',
                  ].join(' ')}
                >
                  <MapPin size={16} />
                  <span>{t('guidance.tab_landmarks')}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveStepTab('qr')}
                  className={[
                    'py-2.5 px-3 rounded-lg font-bold text-xs sm:text-sm transition-all flex items-center justify-center gap-1.5',
                    activeStepTab === 'qr'
                      ? 'bg-[var(--color-primary-500)] text-white shadow-xs'
                      : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)]',
                  ].join(' ')}
                >
                  <QrCode size={16} />
                  <span>{t('guidance.tab_qr')}</span>
                </button>
              </div>

              {/* TAB A: CHOOSE FROM LANDMARK LIST */}
              {activeStepTab === 'landmark' && (
                <div className="flex flex-col gap-4 mt-4">
                  {/* Search box */}
                  <div className="relative">
                    <Search
                      size={18}
                      className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]"
                      aria-hidden="true"
                    />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder={t('guidance.search_landmarks')}
                      className="input pl-10 w-full font-medium"
                      aria-label={t('guidance.search_landmarks')}
                    />
                    {searchQuery && (
                      <button
                        type="button"
                        onClick={() => setSearchQuery('')}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-500"
                      >
                        Clear
                      </button>
                    )}
                  </div>

                  {/* Grouped Landmarks by Floor */}
                  <div className="flex flex-col gap-4 max-h-[50vh] overflow-y-auto pr-1">
                    {getLandmarksGrouped(searchQuery).map((group) => {
                      if (group.landmarks.length === 0) return null;
                      return (
                        <div key={group.floor} className="flex flex-col gap-2">
                          <div className="flex items-center gap-2 px-1">
                            <Layers size={15} className="text-[var(--color-primary-500)]" />
                            <h3 className="text-xs font-black uppercase tracking-wider text-[var(--color-text-muted)]">
                              {t(`guidance.floor_${group.floor}`)}
                            </h3>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                            {group.landmarks.map((landmark) => (
                              <OptionCard
                                key={landmark.id}
                                onClick={() => handleSelectLandmark(landmark)}
                                icon={<MapPin size={22} />}
                                title={landmark.name}
                                description={landmark.roomNumber ? `Room ${landmark.roomNumber}` : undefined}
                                chevron={true}
                                badge={
                                  landmark.pillarCode ? (
                                    <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-slate-100 text-slate-700 border border-slate-300">
                                      {landmark.pillarCode}
                                    </span>
                                  ) : undefined
                                }
                              />
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* TAB B: SCAN NEAREST QR CODE / PILLAR */}
              {activeStepTab === 'qr' && (
                <div className="flex flex-col gap-4 mt-4">
                  <div className="p-4 rounded-xl bg-amber-50/70 border border-amber-300 text-amber-950 flex flex-col gap-2">
                    <div className="flex items-center gap-2">
                      <QrCode size={20} className="text-amber-800 shrink-0" />
                      <h4 className="font-bold text-sm">{t('guidance.qr_title')}</h4>
                    </div>
                    <p className="text-xs font-medium leading-relaxed">
                      {t('guidance.qr_desc')}
                    </p>
                  </div>

                  {/* QR Camera Mockup */}
                  <div className="relative rounded-2xl border-2 border-dashed border-[var(--color-primary-400)] bg-slate-900 text-white p-6 text-center flex flex-col items-center justify-center gap-3">
                    <div className="w-28 h-28 border-2 border-emerald-400 rounded-xl relative flex items-center justify-center">
                      <span className="absolute -top-1 -left-1 w-4 h-4 border-t-2 border-l-2 border-emerald-400" />
                      <span className="absolute -top-1 -right-1 w-4 h-4 border-t-2 border-r-2 border-emerald-400" />
                      <span className="absolute -bottom-1 -left-1 w-4 h-4 border-b-2 border-l-2 border-emerald-400" />
                      <span className="absolute -bottom-1 -right-1 w-4 h-4 border-b-2 border-r-2 border-emerald-400" />
                      <QrCode size={48} className="text-emerald-400/80 animate-pulse" />
                    </div>
                    <div>
                      <p className="font-bold text-sm text-slate-200">
                        {cameraMockActive ? 'Camera scanner active…' : 'Position pillar QR code in frame'}
                      </p>
                      <button
                        type="button"
                        onClick={() => {
                          setCameraMockActive(true);
                          setTimeout(() => {
                            handlePillarSubmit('F0-P1');
                          }, 600);
                        }}
                        className="btn btn-sm btn-secondary mt-2 text-xs"
                      >
                        {t('guidance.qr_camera_mock')}
                      </button>
                    </div>
                  </div>

                  {/* Manual Pillar Code Entry */}
                  <div className="flex flex-col gap-2 pt-1">
                    <label htmlFor="pillar-input" className="text-xs font-bold text-[var(--color-text)]">
                      {t('guidance.qr_simulate')}
                    </label>
                    <div className="flex gap-2">
                      <input
                        id="pillar-input"
                        type="text"
                        value={customPillarInput}
                        onChange={(e) => setCustomPillarInput(e.target.value)}
                        placeholder={t('guidance.qr_placeholder')}
                        className="input font-mono uppercase font-bold text-base flex-1"
                      />
                      <Button
                        variant="primary"
                        onClick={() => handlePillarSubmit(customPillarInput)}
                        disabled={!customPillarInput.trim()}
                      >
                        {t('guidance.qr_btn')}
                      </Button>
                    </div>
                  </div>

                  {/* Common Quick Pillar Code Buttons */}
                  <div className="flex flex-col gap-2 pt-1">
                    <span className="text-xs font-bold text-[var(--color-text-muted)]">
                      {t('guidance.qr_quick_select')}
                    </span>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {[
                        { code: 'F0-P1', label: 'Entrance' },
                        { code: 'F0-P2', label: 'Reception' },
                        { code: 'F1-P1', label: 'Floor 1 Waiting' },
                        { code: 'F2-P7', label: 'Floor 2 Pillar' },
                      ].map((item) => (
                        <button
                          key={item.code}
                          type="button"
                          onClick={() => handlePillarSubmit(item.code)}
                          className="p-2.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-left hover:border-[var(--color-primary-500)] transition-all"
                        >
                          <span className="font-mono font-black text-xs text-[var(--color-primary-600)] block">
                            {item.code}
                          </span>
                          <span className="text-xs font-semibold text-[var(--color-text)] truncate block">
                            {item.label}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </Card>
          </div>
        )}

        {/* ═════════════════════════════════════════════════════════════════════
            STEP 2: ROUTE NAVIGATION DISPLAY
            ═════════════════════════════════════════════════════════════════════ */}
        {startNode && destinationNode && !routeResult && (
          <div role="alert" className="p-4 rounded-xl border-2 border-amber-300 bg-amber-50 text-amber-950 font-semibold">
            {hasMobilityNeeds ? 'No step-free route is available for this destination.' : 'No route is available between these locations.'}
          </div>
        )}
        {startNode && routeResult && (
          <div className="flex flex-col gap-4 animate-fadeIn">
            {/* Route Summary Bar */}
            <div className="p-3.5 bg-[var(--color-surface)] border-2 border-[var(--color-border)] rounded-2xl flex items-center justify-between gap-3 shadow-xs flex-wrap">
              <div className="flex items-center gap-2.5 flex-1">
                <Footprints size={20} className="text-[var(--color-primary-500)] shrink-0" />
                <div>
                  <span className="text-xs font-bold text-[var(--color-text-muted)] block">
                    Starting from: <strong className="text-[var(--color-text)]">{startNode.name}</strong>
                  </span>
                  <span className="text-xs font-bold text-[var(--color-text-muted)] block">
                    Destination: <strong className="text-[var(--color-primary-600)]">{destinationName}</strong>{destinationNode?.roomNumber ? ` (Room ${destinationNode.roomNumber})` : ''}
                  </span>
                </div>
              </div>

              {/* View Mode Toggle: Card View vs 2D Map (Mobile only) */}
              <div className="flex md:hidden items-center gap-1.5 p-1 bg-[var(--color-surface-2)] rounded-xl border border-[var(--color-border)]">
                <button
                  type="button"
                  onClick={() => setViewMode('card')}
                  className={[
                    'px-3 py-1.5 rounded-lg text-xs font-bold transition-all',
                    viewMode === 'card'
                      ? 'bg-[var(--color-primary-500)] text-white shadow-xs'
                      : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)]',
                  ].join(' ')}
                >
                  {t('guidance.toggle_card_view')}
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('map')}
                  className={[
                    'px-3 py-1.5 rounded-lg text-xs font-bold transition-all',
                    viewMode === 'map'
                      ? 'bg-[var(--color-primary-500)] text-white shadow-xs'
                      : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)]',
                  ].join(' ')}
                >
                  {t('guidance.toggle_map_view')}
                </button>
              </div>
            </div>

            {/* ── ARRIVAL SUCCESS SCREEN ─────────────────────────────────── */}
            {isArrived ? (
              <Card className="p-6 sm:p-8 border-4 border-emerald-500 bg-emerald-50/70 text-center flex flex-col items-center gap-4 rounded-3xl shadow-lg">
                <div className="w-20 h-20 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow-md animate-bounce">
                  <CheckCircle2 size={48} aria-hidden="true" />
                </div>

                <div>
                  <span className="text-xs font-black uppercase tracking-widest text-emerald-800 block mb-1">
                    DESTINATION REACHED
                  </span>
                  <h2 className="text-3xl sm:text-4xl font-black text-emerald-950">
                    {t('guidance.arrival_title', {
                      room: destinationNode?.roomNumber || destinationName,
                    })}
                  </h2>
                  <p className="text-base sm:text-lg font-bold text-emerald-900 mt-1">
                    {t('guidance.arrival_subtitle', {
                      department: destinationName,
                    })}
                  </p>
                </div>

                {!isFacilityDestination && (
                  <div className="p-4 bg-white/90 border border-emerald-300 rounded-2xl max-w-sm w-full">
                    <p className="text-sm font-extrabold text-emerald-950">
                      {t('guidance.arrival_action')}
                    </p>
                    {slip && (
                      <div className="mt-2 pt-2 border-t border-emerald-200 flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-600">Your Token:</span>
                        <span className="text-lg font-mono font-black text-[var(--color-primary-600)]">
                          {slip.token}
                        </span>
                      </div>
                    )}
                  </div>
                )}

                <div className="flex flex-col sm:flex-row gap-3 w-full max-w-sm pt-2">
                  {slip && (
                    <Button
                      variant="primary"
                      fullWidth
                      onClick={() => navigate(`/patient/slip/${slip.id}`, { state: { slip } })}
                    >
                      {t('guidance.arrival_view_slip')}
                    </Button>
                  )}
                  <Button
                    variant="secondary"
                    fullWidth
                    onClick={() => navigate('/')}
                  >
                    {t('guidance.arrival_done')}
                  </Button>
                </div>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start w-full">
                {/* ── COLUMN 1 (Left on desktop): STEP-BY-STEP GUIDANCE CARDS ──────────────── */}
                <div className={`${viewMode === 'map' ? 'hidden md:flex' : 'flex'} flex-col gap-4 min-w-0`}>
                  {currentStep && (
                    <>
                      {/* Step progress & voice toggle */}
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <span className="text-xs font-black uppercase tracking-wider text-[var(--color-text-muted)]">
                          {t('guidance.step_counter', {
                            current: activeStepIndex + 1,
                            total: routeResult.steps.length,
                          })}
                        </span>

                        {/* Auto voice guidance toggle */}
                        <button
                          type="button"
                          onClick={() => setAutoVoice(!autoVoice)}
                          className={[
                            'btn btn-sm px-3 rounded-full flex items-center gap-1.5 transition-all',
                            autoVoice
                              ? 'btn-secondary bg-emerald-50 text-emerald-900 border-emerald-300'
                              : 'btn-ghost text-slate-500',
                          ].join(' ')}
                        >
                          <Volume2 size={16} />
                          <span className="text-xs font-bold">
                            {autoVoice ? t('guidance.auto_voice_on') : t('guidance.auto_voice_off')}
                          </span>
                        </button>
                      </div>

                      {/* Step Progress Bar */}
                      <div className="w-full bg-slate-200 h-2.5 rounded-full overflow-hidden">
                        <div
                          className="bg-[var(--color-primary-500)] h-full transition-all duration-300"
                          style={{
                            width: `${((activeStepIndex + 1) / routeResult.steps.length) * 100}%`,
                          }}
                        />
                      </div>

                      {/* MAIN INSTRUCTION CARD (Large text, Large icon, Clear speech) */}
                      <div ref={stepCardRef} tabIndex={-1} className="outline-none">
                        <Card className="p-6 sm:p-8 border-3 border-[var(--color-primary-500)] bg-[var(--color-surface)] shadow-md flex flex-col gap-5 rounded-3xl">
                          <div className="flex items-start justify-between gap-4">
                            {/* Direction Icon Box */}
                            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-[var(--color-primary-50)] text-[var(--color-primary-600)] flex items-center justify-center shrink-0 shadow-inner">
                              {currentStep.icon === 'arrow-left' && <ArrowLeft size={38} />}
                              {currentStep.icon === 'arrow-right' && <ArrowRight size={38} />}
                              {currentStep.icon === 'arrow-up' && <ArrowUp size={38} />}
                              {currentStep.icon === 'elevator' && <Building2 size={38} />}
                              {currentStep.icon === 'stairs' && <Layers size={38} />}
                              {currentStep.icon === 'map-pin' && <MapPin size={38} />}
                            </div>

                            {/* Read aloud button for this step */}
                            <button
                              type="button"
                              onClick={handleToggleAudio}
                              className={[
                                'btn btn-sm px-3 rounded-full flex items-center gap-1.5 transition-all',
                                isSpeaking
                                  ? 'btn-primary animate-pulse'
                                  : 'btn-secondary bg-white text-[var(--color-primary-600)] border border-[var(--color-primary-400)]',
                              ].join(' ')}
                              aria-label={isSpeaking ? t('guidance.stop_audio') : t('guidance.read_aloud')}
                            >
                              {isSpeaking ? (
                                <>
                                  <VolumeX size={16} />
                                  <span className="text-xs font-bold">{t('guidance.stop_audio')}</span>
                                </>
                              ) : (
                                <>
                                  <Volume2 size={16} />
                                  <span className="text-xs font-bold">{t('guidance.read_aloud')}</span>
                                </>
                              )}
                            </button>
                          </div>

                          {/* Instruction text with i18n params */}
                          <div>
                            <h3 className="text-2xl sm:text-3xl font-black text-[var(--color-text)] leading-snug break-words">
                              {getStepInstructionText(currentStep)}
                            </h3>

                            {voiceError && (
                              <p role="status" className="mt-3 text-sm font-semibold text-amber-800">
                                {voiceError}
                              </p>
                            )}
                          </div>

                          {/* Floor Indicator */}
                          <div className="pt-2 border-t border-[var(--color-border)] flex items-center justify-between text-xs text-[var(--color-text-muted)] font-bold">
                            <span>
                              Current Location: <strong>Floor {currentStep.floor}</strong>
                            </span>
                            <span>
                              Target: <strong>Floor {destinationNode?.floor}</strong>
                            </span>
                          </div>
                        </Card>
                      </div>

                      {/* Step Action Buttons */}
                      <div className="grid grid-cols-2 gap-3 pt-1">
                        <Button
                          variant="secondary"
                          size="lg"
                          icon={<ArrowLeft size={20} />}
                          onClick={handlePrevStep}
                          disabled={activeStepIndex === 0}
                        >
                          {t('guidance.prev_step')}
                        </Button>

                        <Button
                          variant="primary"
                          size="lg"
                          icon={<ArrowRight size={20} />}
                          onClick={handleNextStep}
                        >
                          {activeStepIndex === routeResult.steps.length - 1
                            ? t('guidance.finish_step')
                            : t('guidance.next_step')}
                        </Button>
                      </div>
                    </>
                  )}
                </div>

                {/* ── COLUMN 2 (Right on desktop): 2D FLOOR PLAN SVG MAP ────────────────────── */}
                <div className={`${viewMode === 'card' ? 'hidden md:flex' : 'flex'} flex-col gap-4 min-w-0 md:sticky md:top-20`}>
                  <HospitalFloorMap
                    currentFloor={selectedMapFloor}
                    onSelectFloor={(fl) => setSelectedMapFloor(fl)}
                    startNode={startNode}
                    destinationNode={destinationNode}
                    activeNode={activeNodeOnFloor}
                    pathNodes={routeResult.nodes}
                    pathEdges={routeResult.edges}
                  />

                  {/* Floating Step bar under map (mobile only) */}
                  {currentStep && (
                    <div className="md:hidden p-4 bg-[var(--color-surface)] border-2 border-[var(--color-border)] rounded-2xl shadow-sm flex items-center justify-between gap-3 flex-wrap">
                      <div className="flex-1">
                        <span className="text-xs font-bold text-[var(--color-text-muted)] block">
                          {t('guidance.step_counter', {
                            current: activeStepIndex + 1,
                            total: routeResult.steps.length,
                          })}
                        </span>
                        <p className="font-extrabold text-sm sm:text-base text-[var(--color-text)] leading-snug">
                          {getStepInstructionText(currentStep)}
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={handlePrevStep}
                          disabled={activeStepIndex === 0}
                        >
                          ←
                        </Button>
                        <Button
                          variant="primary"
                          size="sm"
                          onClick={handleNextStep}
                        >
                          {activeStepIndex === routeResult.steps.length - 1 ? 'Arrived ✓' : 'Next →'}
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ═════════════════════════════════════════════════════════════════
                PERSISTENT ACTIONS: "I'm lost again" & "Ask staff for help"
                ═════════════════════════════════════════════════════════════════ */}
            <div className="flex flex-col gap-2.5 pt-3 w-full">
              {/* I'm lost again / Update my location */}
              <Button
                variant="secondary"
                fullWidth
                icon={<RotateCcw size={18} />}
                onClick={handleUpdateLocation}
                className="flex items-center justify-center gap-2 text-center whitespace-normal break-words min-h-14 px-4 py-3 w-full text-sm sm:text-base font-bold"
              >
                {t('guidance.lost_again')}
              </Button>

              {/* Ask staff for help */}
              <Button
                variant="ghost"
                fullWidth
                icon={<HelpCircle size={18} />}
                onClick={() => setShowStaffModal(true)}
                className="flex items-center justify-center gap-2 text-center whitespace-normal break-words min-h-14 px-4 py-3 w-full border border-[var(--color-border)] bg-[var(--color-surface)] text-sm sm:text-base font-bold"
              >
                {t('guidance.ask_staff')}
              </Button>
            </div>
          </div>
        )}

        {/* ── MODAL: ASK STAFF FOR HELP (Emergency Patient Screen) ─────── */}
        {showStaffModal && (
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="staff-modal-title"
            className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-3 sm:p-5 animate-fadeIn"
          >
            <div className="bg-[var(--color-surface)] border-4 border-[var(--color-danger-500)] rounded-3xl w-full max-w-lg p-5 sm:p-6 shadow-2xl flex flex-col gap-4">
              <div className="flex items-center justify-between pb-3 border-b border-[var(--color-border)]">
                <div className="flex items-center gap-2">
                  <AlertTriangle size={24} className="text-[var(--color-danger-500)]" />
                  <h3 id="staff-modal-title" className="font-black text-lg text-[var(--color-text)]">
                    {t('guidance.staff_modal_title')}
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setShowStaffModal(false)}
                  className="btn btn-ghost btn-sm btn-icon rounded-full"
                  aria-label={t('common.close')}
                >
                  <X size={20} />
                </button>
              </div>

              <div className="p-5 rounded-2xl bg-[var(--color-danger-50)] border-2 border-[var(--color-danger-300)] flex flex-col gap-3">
                <span className="text-xs font-black uppercase tracking-wider text-[var(--color-danger-900)]">
                  {t('guidance.staff_modal_help_text')}
                </span>

                <div className="p-4 bg-white rounded-xl border border-red-200">
                  <span className="text-xs font-bold text-slate-500 block">
                    {t('guidance.staff_modal_patient_needs')}
                  </span>
                  <span className="text-2xl font-black text-red-950 block mt-0.5">
                    {destinationNode?.name}
                  </span>
                  <span className="text-base font-extrabold text-slate-800 block">
                    {destinationNode?.roomNumber ? `Room ${destinationNode.roomNumber} • ` : ''}Floor {destinationNode?.floor}
                  </span>
                </div>

                {/* Bilingual staff helper phrases */}
                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-500 pt-1">
                  <Languages size={14} className="text-slate-400" aria-hidden="true" />
                  <span>Regional Translations:</span>
                </div>
                <div className="flex flex-col gap-2">
                  <p className="text-base font-bold text-slate-900 leading-snug flex items-center gap-2">
                    <span className="text-[11px] font-black uppercase px-2 py-0.5 rounded bg-amber-100 text-amber-900 border border-amber-300">
                      HI
                    </span>
                    <span>
                      {t('guidance.staff_modal_bilingual_hi', {
                        room: destinationNode?.roomNumber ? `कमरा ${destinationNode.roomNumber}` : 'विभाग',
                        dept: destinationNode?.name || 'विभाग',
                      })}
                    </span>
                  </p>
                  <p className="text-base font-bold text-slate-900 leading-snug flex items-center gap-2">
                    <span className="text-[11px] font-black uppercase px-2 py-0.5 rounded bg-orange-100 text-orange-900 border border-orange-300">
                      MR
                    </span>
                    <span>
                      {t('guidance.staff_modal_bilingual_mr', {
                        room: destinationNode?.roomNumber ? `खोली क्र. ${destinationNode.roomNumber}` : 'विभाग',
                        dept: destinationNode?.name || 'विभाग',
                      })}
                    </span>
                  </p>
                </div>
              </div>

              {/* Call Helpdesk & Close */}
              <div className="flex flex-col sm:flex-row gap-2 pt-2">
                <a
                  href="tel:104"
                  className="btn btn-primary flex-1 flex items-center justify-center gap-2"
                >
                  <PhoneCall size={18} />
                  <span>{t('guidance.staff_modal_call_helpdesk')}</span>
                </a>
                <Button
                  variant="secondary"
                  onClick={() => setShowStaffModal(false)}
                >
                  {t('guidance.staff_modal_close')}
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </BaseLayout>
  );
}
