import { findDepartmentByName } from '../../data/departments';
import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  X,
  AlertTriangle,
  CheckCircle2,
  Accessibility,
  ChevronRight,
  Printer,
  Download,
  Info,
  Mail,
} from 'lucide-react';
import { BaseLayout } from '../../components/layout';
import { PageHeader } from '../../components/ui';
import {
  MOCK_STAFF_PATIENTS,
  type StaffPatientRecord,
} from '../../data/mockPatientsData';
import type { LabReport } from '../../data/labReportsData';

export function StaffPatientsPage() {
  const navigate = useNavigate();

  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'registered' | 'guest'>(
    'all'
  );
  const [selectedPatient, setSelectedPatient] =
    useState<StaffPatientRecord | null>(null);
  const [activeTab, setActiveTab] = useState<'details' | 'visits' | 'reports'>(
    'details'
  );
  const [selectedReport, setSelectedReport] = useState<LabReport | null>(null);

  // Filter and search logic
  const filteredPatients = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return MOCK_STAFF_PATIENTS.filter((patient) => {
      // Type filter
      if (filterType === 'registered' && patient.isGuest) return false;
      if (filterType === 'guest' && !patient.isGuest) return false;

      // Query filter
      if (!q) return true;
      const matchName = patient.name.toLowerCase().includes(q);
      const matchToken = patient.token.toLowerCase().includes(q);
      const matchPhone = patient.phone.toLowerCase().includes(q);
      const matchAbha = patient.abhaId?.toLowerCase().includes(q) || false;
      const matchUhid = patient.uhid?.toLowerCase().includes(q) || false;
      const matchDept = patient.currentDepartment.toLowerCase().includes(q);

      return (
        matchName ||
        matchToken ||
        matchPhone ||
        matchAbha ||
        matchUhid ||
        matchDept
      );
    });
  }, [searchQuery, filterType]);

  const handleOpenPatient = (patient: StaffPatientRecord) => {
    setSelectedPatient(patient);
    setActiveTab(patient.isGuest ? 'details' : 'visits');
    setSelectedReport(
      patient.labReports.length > 0 ? patient.labReports[0] : null
    );
  };

  const handleClosePatient = () => {
    setSelectedPatient(null);
    setSelectedReport(null);
  };

  return (
    <BaseLayout isStaff={true} headerTitle="Staff Portal">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* Full-width PageHeader */}
        <PageHeader
          title="Patient Records"
          subtitle="Search and review clinical histories, past department visits, and diagnostic lab reports"
          showBack={true}
          onBack={() => navigate('/staff/dashboard')}
        />

        {/* Search & Filter Controls */}
        <div className="bg-[var(--color-surface)] border-2 border-[var(--color-border)] rounded-2xl p-4 sm:p-5 shadow-xs space-y-4">
          <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search
                size={18}
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)] pointer-events-none"
                aria-hidden="true"
              />
              <label htmlFor="staff-patient-search" className="sr-only">
                Search patient records
              </label>
              <input
                id="staff-patient-search"
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by Patient Name, Token (e.g. CARD-102), Phone, or UHID / ABHA..."
                className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-2)] text-[var(--color-text-main)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary-500)]"
                aria-label="Search patient records"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)] hover:text-[var(--color-text-main)]"
                  aria-label="Clear search"
                >
                  <X size={16} />
                </button>
              )}
            </div>

            {/* Filter Pills */}
            <div className="flex items-center gap-2 overflow-x-auto py-1">
              <button
                type="button"
                onClick={() => setFilterType('all')}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-colors ${
                  filterType === 'all'
                    ? 'bg-[var(--color-primary-500)] text-white shadow-xs'
                    : 'bg-[var(--color-surface-2)] text-[var(--color-text-muted)] border border-[var(--color-border)] hover:bg-[var(--color-surface)]'
                }`}
              >
                All Records ({MOCK_STAFF_PATIENTS.length})
              </button>
              <button
                type="button"
                onClick={() => setFilterType('registered')}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-colors ${
                  filterType === 'registered'
                    ? 'bg-[var(--color-primary-500)] text-white shadow-xs'
                    : 'bg-[var(--color-surface-2)] text-[var(--color-text-muted)] border border-[var(--color-border)] hover:bg-[var(--color-surface)]'
                }`}
              >
                Registered (
                {MOCK_STAFF_PATIENTS.filter((p) => !p.isGuest).length})
              </button>
              <button
                type="button"
                onClick={() => setFilterType('guest')}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-colors ${
                  filterType === 'guest'
                    ? 'bg-[var(--color-primary-500)] text-white shadow-xs'
                    : 'bg-[var(--color-surface-2)] text-[var(--color-text-muted)] border border-[var(--color-border)] hover:bg-[var(--color-surface)]'
                }`}
              >
                Guests ({MOCK_STAFF_PATIENTS.filter((p) => p.isGuest).length})
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between text-xs text-[var(--color-text-muted)] pt-1 border-t border-[var(--color-border)]">
            <span>
              Showing{' '}
              <strong className="text-[var(--color-text-main)]">
                {filteredPatients.length}
              </strong>{' '}
              matching {filteredPatients.length === 1 ? 'patient' : 'patients'}
            </span>
            <span>Click any record to inspect clinical details</span>
          </div>
        </div>

        {/* Desktop Table View (md and above) */}
        <div className="hidden md:block bg-[var(--color-surface)] border-2 border-[var(--color-border)] rounded-2xl shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table
              className="w-full text-left border-collapse"
              aria-label="Hospital Patients List"
            >
              <thead>
                <tr className="bg-[var(--color-surface-2)] border-b-2 border-[var(--color-border)] text-xs uppercase font-bold text-[var(--color-text-muted)] tracking-wider">
                  <th scope="col" className="px-4 py-3">
                    Token
                  </th>
                  <th scope="col" className="px-4 py-3">
                    Patient Name
                  </th>
                  <th scope="col" className="px-4 py-3">
                    Age / Gender
                  </th>
                  <th scope="col" className="px-4 py-3">
                    Current Dept & Purpose
                  </th>
                  <th scope="col" className="px-4 py-3">
                    Accessibility
                  </th>
                  <th scope="col" className="px-4 py-3">
                    Medical History
                  </th>
                  <th scope="col" className="px-4 py-3 text-right">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-border)] text-sm">
                {filteredPatients.map((patient) => {
                  // Show (Guest) ONCE, never duplicated with an extra tag
                  const displayName = patient.isGuest
                    ? patient.name.includes('(Guest)')
                      ? patient.name
                      : `${patient.name} (Guest)`
                    : patient.name;

                  return (
                    <tr
                      key={patient.id}
                      className="hover:bg-[var(--color-surface-2)]/60 transition-colors cursor-pointer group"
                      onClick={() => handleOpenPatient(patient)}
                    >
                      {/* Token */}
                      <td className="px-4 py-3 font-mono font-bold text-[var(--color-primary-500)] whitespace-nowrap">
                        {patient.token}
                      </td>

                      {/* Patient Name */}
                      <td className="px-4 py-3">
                        <div className="font-bold text-[var(--color-text-main)] group-hover:text-[var(--color-primary-500)] transition-colors">
                          {displayName}
                        </div>
                        {patient.abhaId && (
                          <div className="text-[11px] text-[var(--color-text-muted)] font-mono">
                            ABHA: {patient.abhaId}
                          </div>
                        )}
                      </td>

                      {/* Age / Gender */}
                      <td className="px-4 py-3 text-[var(--color-text-main)] whitespace-nowrap">
                        {patient.age} yrs • {patient.gender}
                        {patient.bloodGroup && (
                          <span className="ml-1 text-xs text-[var(--color-text-muted)]">
                            ({patient.bloodGroup})
                          </span>
                        )}
                      </td>

                      {/* Current Dept & Purpose */}
                      <td className="px-4 py-3 max-w-xs">
                        <div className="font-semibold text-xs text-[var(--color-text-main)] truncate">
                          {patient.currentDepartment}
                        </div>
                        <div className="text-xs text-[var(--color-text-muted)] truncate">
                          {patient.currentEncounterPurpose}
                        </div>
                      </td>

                      {/* Accessibility */}
                      <td className="px-4 py-3">
                        {patient.accessibilityNeeds.length > 0 ? (
                          <div className="flex items-center gap-1.5 flex-wrap">
                            {patient.accessibilityNeeds.map((need) => (
                              <span
                                key={need}
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 text-[11px] font-bold border border-blue-200 dark:border-blue-800"
                              >
                                <Accessibility size={12} />
                                {need.replace('_', ' ')}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-xs text-[var(--color-text-muted)]">
                            —
                          </span>
                        )}
                      </td>

                      {/* Medical History */}
                      <td className="px-4 py-3">
                        {patient.isGuest ? (
                          <span className="text-xs font-semibold text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 px-2 py-1 rounded-md border border-amber-200 dark:border-amber-800">
                            No saved history (Guest)
                          </span>
                        ) : (
                          <div className="text-xs space-y-0.5">
                            <span className="font-semibold text-emerald-700 dark:text-emerald-400">
                              {patient.previousVisits.length} visits
                            </span>
                            <span className="text-[var(--color-text-muted)]">
                              {' '}
                              •{' '}
                            </span>
                            <span className="font-semibold text-sky-700 dark:text-sky-400">
                              {patient.labReports.length} lab reports
                            </span>
                          </div>
                        )}
                      </td>

                      {/* Action */}
                      <td className="px-4 py-3 text-right">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenPatient(patient);
                          }}
                          className="btn btn-ghost btn-sm px-3 py-1.5 rounded-xl border border-[var(--color-border)] text-xs font-bold text-[var(--color-primary-500)] hover:bg-[var(--color-surface-2)] inline-flex items-center gap-1"
                        >
                          <span>View Record</span>
                          <ChevronRight size={14} />
                        </button>
                      </td>
                    </tr>
                  );
                })}

                {filteredPatients.length === 0 && (
                  <tr>
                    <td
                      colSpan={7}
                      className="px-4 py-12 text-center text-[var(--color-text-muted)]"
                    >
                      <p className="font-bold text-base text-[var(--color-text-main)] mb-1">
                        No patient records found
                      </p>
                      <p className="text-xs">
                        Try adjusting your search query or filter settings
                      </p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Mobile Stacked Cards (< md) */}
        <div className="md:hidden space-y-3">
          {filteredPatients.map((patient) => {
            const displayName = patient.isGuest
              ? patient.name.includes('(Guest)')
                ? patient.name
                : `${patient.name} (Guest)`
              : patient.name;

            return (
              <div
                key={patient.id}
                onClick={() => handleOpenPatient(patient)}
                className="bg-[var(--color-surface)] border-2 border-[var(--color-border)] rounded-2xl p-4 shadow-xs space-y-3 active:bg-[var(--color-surface-2)] transition-colors cursor-pointer"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="font-mono text-xs font-bold text-[var(--color-primary-500)] bg-[var(--color-primary-50)] dark:bg-[var(--color-primary-950)] px-2 py-0.5 rounded-md border border-[var(--color-primary-200)]">
                      {patient.token}
                    </span>
                    <h3 className="font-bold text-base text-[var(--color-text-main)] mt-1.5 leading-tight">
                      {displayName}
                    </h3>
                    <p className="text-xs text-[var(--color-text-muted)]">
                      {patient.age} yrs • {patient.gender}
                      {patient.bloodGroup ? ` • ${patient.bloodGroup}` : ''}
                    </p>
                  </div>

                  {patient.isGuest ? (
                    <span className="text-[11px] font-bold text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 px-2 py-1 rounded-md border border-amber-200 dark:border-amber-800 shrink-0">
                      Guest
                    </span>
                  ) : (
                    <span className="text-[11px] font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-1 rounded-md border border-emerald-200 dark:border-emerald-800 shrink-0">
                      Registered
                    </span>
                  )}
                </div>

                <div className="text-xs bg-[var(--color-surface-2)] p-2.5 rounded-xl border border-[var(--color-border)] space-y-1">
                  <div className="font-bold text-[var(--color-text-main)]">
                    {patient.currentDepartment}
                  </div>
                  <div className="text-[var(--color-text-muted)] line-clamp-2">
                    {patient.currentEncounterPurpose}
                  </div>
                </div>

                {patient.accessibilityNeeds.length > 0 && (
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {patient.accessibilityNeeds.map((need) => (
                      <span
                        key={need}
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 text-[11px] font-bold border border-blue-200 dark:border-blue-800"
                      >
                        <Accessibility size={12} />
                        {need.replace('_', ' ')}
                      </span>
                    ))}
                  </div>
                )}

                <div className="flex items-center justify-between pt-2 border-t border-[var(--color-border)]">
                  {patient.isGuest ? (
                    <span className="text-xs font-semibold text-amber-700 dark:text-amber-400">
                      No saved history (Guest)
                    </span>
                  ) : (
                    <span className="text-xs font-medium text-[var(--color-text-muted)]">
                      <strong className="text-emerald-600">
                        {patient.previousVisits.length}
                      </strong>{' '}
                      visits •{' '}
                      <strong className="text-sky-600">
                        {patient.labReports.length}
                      </strong>{' '}
                      reports
                    </span>
                  )}

                  <button
                    type="button"
                    className="btn btn-ghost btn-sm px-3 py-1.5 rounded-xl text-xs font-bold text-[var(--color-primary-500)] flex items-center gap-1"
                  >
                    <span>View</span>
                    <ChevronRight size={14} />
                  </button>
                </div>
              </div>
            );
          })}

          {filteredPatients.length === 0 && (
            <div className="bg-[var(--color-surface)] border-2 border-[var(--color-border)] rounded-2xl p-8 text-center text-[var(--color-text-muted)]">
              <p className="font-bold text-sm text-[var(--color-text-main)] mb-1">
                No patient records found
              </p>
              <p className="text-xs">Adjust your search or clear filters</p>
            </div>
          )}
        </div>

        {/* Selected Patient Record Modal / Slide-over */}
        {selectedPatient && (
          <div
            className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-6 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200"
            role="dialog"
            aria-modal="true"
            aria-labelledby="patient-modal-title"
            onClick={handleClosePatient}
          >
            <div
              className="bg-[var(--color-surface)] border-2 border-[var(--color-border)] rounded-3xl w-full max-w-4xl max-h-[90vh] shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className="px-5 sm:px-6 py-4 border-b-2 border-[var(--color-border)] bg-[var(--color-surface-2)] flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono text-xs font-black text-white bg-[var(--color-primary-500)] px-2.5 py-0.5 rounded-md">
                      {selectedPatient.token}
                    </span>
                    {selectedPatient.isGuest ? (
                      <span className="text-xs font-bold text-amber-800 dark:text-amber-300 bg-amber-100 dark:bg-amber-950 px-2 py-0.5 rounded-md border border-amber-300 dark:border-amber-800">
                        Guest Visitor
                      </span>
                    ) : (
                      <span className="text-xs font-bold text-emerald-800 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-950 px-2 py-0.5 rounded-md border border-emerald-300 dark:border-emerald-800">
                        ABHA Verified
                      </span>
                    )}
                  </div>

                  <h2
                    id="patient-modal-title"
                    className="text-xl sm:text-2xl font-black text-[var(--color-text-main)] mt-1 truncate"
                  >
                    {selectedPatient.isGuest
                      ? selectedPatient.name.includes('(Guest)')
                        ? selectedPatient.name
                        : `${selectedPatient.name} (Guest)`
                      : selectedPatient.name}
                  </h2>
                  <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
                    {selectedPatient.age} yrs • {selectedPatient.gender} • Blood
                    Group: {selectedPatient.bloodGroup || 'Not specified'}
                    {selectedPatient.phone &&
                      ` • Phone: ${selectedPatient.phone}`}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleClosePatient}
                  className="btn btn-ghost btn-icon btn-sm min-h-[44px] min-w-[44px] rounded-xl border border-[var(--color-border)] text-[var(--color-text-muted)] hover:text-[var(--color-text-main)] shrink-0"
                  aria-label="Close patient details modal"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Navigation Tabs */}
              <div className="flex items-center px-5 sm:px-6 border-b border-[var(--color-border)] bg-[var(--color-surface)] overflow-x-auto">
                <button
                  type="button"
                  onClick={() => setActiveTab('details')}
                  className={`py-3 px-3 text-xs sm:text-sm font-bold border-b-2 transition-colors whitespace-nowrap ${
                    activeTab === 'details'
                      ? 'border-[var(--color-primary-500)] text-[var(--color-primary-500)]'
                      : 'border-transparent text-[var(--color-text-muted)] hover:text-[var(--color-text-main)]'
                  }`}
                >
                  Current Encounter & Details
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('visits')}
                  className={`py-3 px-3 text-xs sm:text-sm font-bold border-b-2 transition-colors whitespace-nowrap flex items-center gap-1.5 ${
                    activeTab === 'visits'
                      ? 'border-[var(--color-primary-500)] text-[var(--color-primary-500)]'
                      : 'border-transparent text-[var(--color-text-muted)] hover:text-[var(--color-text-main)]'
                  }`}
                >
                  <span>Previous Visits</span>
                  <span className="text-[11px] font-mono px-1.5 py-0.2 rounded-full bg-[var(--color-surface-2)] border border-[var(--color-border)]">
                    {selectedPatient.previousVisits.length}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('reports')}
                  className={`py-3 px-3 text-xs sm:text-sm font-bold border-b-2 transition-colors whitespace-nowrap flex items-center gap-1.5 ${
                    activeTab === 'reports'
                      ? 'border-[var(--color-primary-500)] text-[var(--color-primary-500)]'
                      : 'border-transparent text-[var(--color-text-muted)] hover:text-[var(--color-text-main)]'
                  }`}
                >
                  <span>Diagnostic Lab Reports</span>
                  <span className="text-[11px] font-mono px-1.5 py-0.2 rounded-full bg-[var(--color-surface-2)] border border-[var(--color-border)]">
                    {selectedPatient.labReports.length}
                  </span>
                </button>
              </div>

              {/* Modal Body (Scrollable) */}
              <div className="p-5 sm:p-6 overflow-y-auto space-y-6 flex-1">
                {/* TAB 1: DETAILS & ACCESSIBILITY */}
                {activeTab === 'details' && (
                  <div className="space-y-6">
                    {/* Guest banner if guest */}
                    {selectedPatient.isGuest && (
                      <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border-2 border-amber-200 dark:border-amber-800 flex items-start gap-3">
                        <Info
                          size={20}
                          className="text-amber-600 dark:text-amber-400 shrink-0 mt-0.5"
                        />
                        <div className="space-y-1 text-xs">
                          <h4 className="font-bold text-sm text-amber-900 dark:text-amber-200">
                            No saved history (Guest)
                          </h4>
                          <p className="text-amber-800/90 dark:text-amber-300/90 leading-relaxed">
                            This patient visited as an unregistered Guest.
                            Historical clinical records, past prescriptions, and
                            lab diagnostics are not linked to a hospital UHID or
                            ABHA ID. Only current encounter details are tracked.
                          </p>
                          <p className="text-amber-800/70 dark:text-amber-300/70 pt-1">
                            Tip: To persist longitudinal records, the patient
                            can complete ABHA linking at Central Registration
                            Counter 1 before discharge.
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Basic Details Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                      <div className="p-3.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-2)] space-y-1">
                        <div className="text-[11px] font-bold uppercase text-[var(--color-text-muted)]">
                          Current Department
                        </div>
                        <div className="font-bold text-sm text-[var(--color-text-main)]">
                          {selectedPatient.currentDepartment}
                        </div>
                        <div className="text-xs text-[var(--color-text-muted)]">
                          Attending: {selectedPatient.currentDoctor}
                        </div>
                      </div>

                      <div className="p-3.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-2)] space-y-1">
                        <div className="text-[11px] font-bold uppercase text-[var(--color-text-muted)]">
                          Encounter Purpose
                        </div>
                        <div className="font-semibold text-sm text-[var(--color-text-main)] leading-snug">
                          {selectedPatient.currentEncounterPurpose}
                        </div>
                      </div>

                      <div className="p-3.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-2)] space-y-1">
                        <div className="text-[11px] font-bold uppercase text-[var(--color-text-muted)]">
                          Identity & ABHA
                        </div>
                        <div className="font-mono text-xs font-bold text-[var(--color-text-main)]">
                          {selectedPatient.abhaId
                            ? selectedPatient.abhaId
                            : 'None (Guest Mode)'}
                        </div>
                        {selectedPatient.uhid && (
                          <div className="text-xs font-mono text-[var(--color-text-muted)]">
                            UHID: {selectedPatient.uhid}
                          </div>
                        )}
                      </div>

                      <div className="p-3.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-2)] space-y-1">
                        <div className="text-[11px] font-bold uppercase text-[var(--color-text-muted)]">
                          Contact Phone
                        </div>
                        <div className="font-medium text-sm text-[var(--color-text-main)]">
                          {selectedPatient.phone}
                        </div>
                        {selectedPatient.emergencyContact && (
                          <div
                            className="text-xs text-[var(--color-text-muted)] truncate"
                            title={selectedPatient.emergencyContact}
                          >
                            ICE: {selectedPatient.emergencyContact}
                          </div>
                        )}
                      </div>

                      <div className="p-3.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-2)] space-y-1">
                        <div className="text-[11px] font-bold uppercase text-[var(--color-text-muted)]">
                          Registration Date
                        </div>
                        <div className="font-medium text-sm text-[var(--color-text-main)]">
                          {selectedPatient.registeredDate ||
                            'Today (Walk-in Guest)'}
                        </div>
                      </div>

                      <div className="p-3.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-2)] space-y-1">
                        <div className="text-[11px] font-bold uppercase text-[var(--color-text-muted)]">
                          Clinical Allergies
                        </div>
                        {selectedPatient.allergies &&
                        selectedPatient.allergies.length > 0 ? (
                          <div className="text-xs font-bold text-red-600 dark:text-red-400">
                            {selectedPatient.allergies.join(', ')}
                          </div>
                        ) : (
                          <div className="text-xs text-[var(--color-text-muted)]">
                            No known drug allergies
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Accessibility Needs Panel */}
                    <div className="p-4 sm:p-5 rounded-2xl border-2 border-[var(--color-border)] bg-[var(--color-surface)] space-y-3">
                      <div className="flex items-center gap-2">
                        <Accessibility
                          size={20}
                          className="text-[var(--color-primary-500)]"
                        />
                        <h4 className="font-bold text-base text-[var(--color-text-main)]">
                          Accessibility & Triage Needs
                        </h4>
                      </div>

                      {selectedPatient.accessibilityNeeds.length > 0 ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                          {selectedPatient.accessibilityNeeds.map((need) => (
                            <div
                              key={need}
                              className="p-3 rounded-xl border border-blue-200 dark:border-blue-800 bg-blue-50/60 dark:bg-blue-950/30 flex items-center gap-2.5"
                            >
                              <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 flex items-center justify-center shrink-0">
                                <Accessibility size={16} />
                              </div>
                              <div>
                                <span className="font-bold text-xs capitalize text-blue-900 dark:text-blue-200 block">
                                  {need.replace('_', ' ')}
                                </span>
                                <span className="text-[11px] text-blue-800/80 dark:text-blue-300/80 block">
                                  Prioritized in queue & hospital wayfinding
                                  route
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs text-[var(--color-text-muted)]">
                          No special accessibility accommodations declared by
                          patient during registration.
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {/* TAB 2: PREVIOUS VISITS */}
                {activeTab === 'visits' && (
                  <div className="space-y-4">
                    {selectedPatient.isGuest ? (
                      <div className="p-8 text-center rounded-2xl border-2 border-dashed border-amber-300 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-950/20 space-y-2">
                        <AlertTriangle
                          size={32}
                          className="mx-auto text-amber-600 dark:text-amber-400"
                        />
                        <h4 className="font-bold text-base text-[var(--color-text-main)]">
                          No saved history (Guest)
                        </h4>
                        <p className="text-xs text-[var(--color-text-muted)] max-w-md mx-auto leading-relaxed">
                          Previous consultations are not retained for Guest
                          patient profiles. This visitor is registered under an
                          ephemeral session for today's encounter only.
                        </p>
                      </div>
                    ) : selectedPatient.previousVisits.length > 0 ? (
                      <div className="space-y-3">
                        {selectedPatient.previousVisits.map((visit) => (
                          <div
                            key={visit.id}
                            className="p-4 sm:p-5 rounded-2xl border-2 border-[var(--color-border)] bg-[var(--color-surface)] space-y-2.5 hover:border-[var(--color-primary-300)] transition-colors"
                          >
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 border-b border-[var(--color-border)] pb-2.5">
                              <div>
                                <div className="font-bold text-base text-[var(--color-text-main)]">
                                  {visit.departmentName}
                                </div>
                                <div className="text-xs text-[var(--color-text-muted)]">
                                  Attending: <strong>{visit.doctorName}</strong>{' '}
                                  • Token: {visit.tokenNumber}
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-mono font-semibold text-[var(--color-text-muted)] bg-[var(--color-surface-2)] px-2.5 py-1 rounded-md border border-[var(--color-border)]">
                                  {visit.date}
                                </span>
                                <span className="text-[11px] font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950 px-2 py-0.5 rounded-md border border-emerald-200 dark:border-emerald-800">
                                  Completed
                                </span>
                              </div>
                            </div>

                            <div className="text-xs text-[var(--color-text-main)] space-y-1">
                              <span className="font-bold uppercase text-[10px] tracking-wider text-[var(--color-text-muted)] block">
                                Clinical Summary & Notes
                              </span>
                              <p className="leading-relaxed bg-[var(--color-surface-2)] p-3 rounded-xl border border-[var(--color-border)]">
                                {visit.diagnosisSummary}
                              </p>
                            </div>

                            {visit.prescriptionSummary && (
                              <div className="text-xs text-[var(--color-text-main)] space-y-1 pt-1">
                                <span className="font-bold uppercase text-[10px] tracking-wider text-[var(--color-text-muted)] block">
                                  Prescribed Regimen
                                </span>
                                <div className="font-mono text-xs text-[var(--color-primary-600)] dark:text-[var(--color-primary-400)] bg-[var(--color-primary-50)] dark:bg-[var(--color-primary-950)] p-2.5 rounded-xl border border-[var(--color-primary-200)]">
                                  {visit.prescriptionSummary}
                                </div>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="p-8 text-center text-[var(--color-text-muted)]">
                        No previous visits recorded for this patient.
                      </div>
                    )}
                  </div>
                )}

                {/* TAB 3: DIAGNOSTIC LAB REPORTS */}
                {activeTab === 'reports' && (
                  <div className="space-y-4">
                    {selectedPatient.isGuest ? (
                      <div className="p-8 text-center rounded-2xl border-2 border-dashed border-amber-300 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-950/20 space-y-2">
                        <AlertTriangle
                          size={32}
                          className="mx-auto text-amber-600 dark:text-amber-400"
                        />
                        <h4 className="font-bold text-base text-[var(--color-text-main)]">
                          No saved history (Guest)
                        </h4>
                        <p className="text-xs text-[var(--color-text-muted)] max-w-md mx-auto leading-relaxed">
                          Laboratory diagnostics from previous visits are not
                          linked to Guest accounts. Any tests ordered during
                          today's visit can be viewed at the Pathology
                          collection desk with token #{selectedPatient.token}.
                        </p>
                      </div>
                    ) : selectedPatient.labReports.length > 0 ? (
                      <div className="space-y-4">
                        {/* Report selection buttons */}
                        <div className="flex items-center gap-2 overflow-x-auto pb-1">
                          {selectedPatient.labReports.map((report) => (
                            <button
                              key={report.id}
                              type="button"
                              onClick={() => setSelectedReport(report)}
                              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all shrink-0 border ${
                                selectedReport?.id === report.id
                                  ? 'bg-[var(--color-primary-500)] text-white border-[var(--color-primary-600)] shadow-xs'
                                  : 'bg-[var(--color-surface-2)] text-[var(--color-text-main)] border-[var(--color-border)] hover:bg-[var(--color-surface)]'
                              }`}
                            >
                              {report.testName}
                            </button>
                          ))}
                        </div>

                        {/* Selected Report Viewer */}
                        {selectedReport && (
                          <div className="p-4 sm:p-5 rounded-2xl border-2 border-[var(--color-border)] bg-[var(--color-surface)] space-y-4">
                            {/* Report Header */}
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[var(--color-border)] pb-3">
                              <div>
                                <h4 className="font-bold text-lg text-[var(--color-text-main)]">
                                  {selectedReport.testName}
                                </h4>
                                <p className="text-xs text-[var(--color-text-muted)]">
                                  {selectedReport.department} • Sample #
                                  {selectedReport.sampleId}
                                </p>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950 px-2.5 py-1 rounded-md border border-emerald-200 dark:border-emerald-800 flex items-center gap-1">
                                  <CheckCircle2 size={13} />
                                  Ready
                                </span>
                                <span className="text-xs text-[var(--color-text-muted)] font-mono">
                                  {selectedReport.date}
                                </span>
                              </div>
                            </div>

                            {/* Clinical Summary */}
                            <div className="text-xs bg-[var(--color-surface-2)] p-3 rounded-xl border border-[var(--color-border)] space-y-1">
                              <span className="font-bold uppercase text-[10px] tracking-wider text-[var(--color-text-muted)] block">
                                Clinical Pathology Note
                              </span>
                              <p className="text-[var(--color-text-main)] leading-relaxed">
                                {selectedReport.summary}
                              </p>
                            </div>

                            {/* Parameters Table */}
                            {selectedReport.parameters.length > 0 && (
                              <div className="overflow-x-auto rounded-xl border border-[var(--color-border)]">
                                <table className="w-full text-left border-collapse text-xs">
                                  <thead>
                                    <tr className="bg-[var(--color-surface-2)] border-b border-[var(--color-border)] font-bold text-[var(--color-text-muted)] uppercase">
                                      <th className="px-3 py-2.5">Parameter</th>
                                      <th className="px-3 py-2.5">
                                        Measured Value
                                      </th>
                                      <th className="px-3 py-2.5">
                                        Normal Reference Range
                                      </th>
                                      <th className="px-3 py-2.5">
                                        Status Flag
                                      </th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-[var(--color-border)]">
                                    {selectedReport.parameters.map(
                                      (param, idx) => (
                                        <tr
                                          key={idx}
                                          className="hover:bg-[var(--color-surface-2)]/50"
                                        >
                                          <td className="px-3 py-2.5 font-semibold text-[var(--color-text-main)]">
                                            {param.name}
                                          </td>
                                          <td className="px-3 py-2.5 font-bold font-mono text-[var(--color-text-main)]">
                                            {param.value} {param.unit}
                                          </td>
                                          <td className="px-3 py-2.5 text-[var(--color-text-muted)] font-mono">
                                            {param.normalRange} {param.unit}
                                          </td>
                                          <td className="px-3 py-2.5">
                                            {param.isNormal ? (
                                              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-md border border-emerald-200 dark:border-emerald-800">
                                                <CheckCircle2 size={12} />
                                                Within normal range
                                              </span>
                                            ) : (
                                              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 px-2 py-0.5 rounded-md border border-amber-200 dark:border-amber-800">
                                                <AlertTriangle size={12} />
                                                Outside normal range (
                                                {param.flag.toUpperCase()})
                                              </span>
                                            )}
                                          </td>
                                        </tr>
                                      )
                                    )}
                                  </tbody>
                                </table>
                              </div>
                            )}

                            {/* Report Actions */}
                            <div className="flex items-center gap-2 pt-2 border-t border-[var(--color-border)]">
                              <button
                                type="button"
                                onClick={() =>
                                  alert(
                                    'Diagnostic Report print preview initialized.'
                                  )
                                }
                                className="btn btn-ghost btn-sm px-3 py-1.5 rounded-xl border border-[var(--color-border)] text-xs font-bold flex items-center gap-1.5"
                              >
                                <Printer size={14} />
                                <span>Print Report</span>
                              </button>
                              <button
                                type="button"
                                onClick={() =>
                                  alert('Report PDF download complete.')
                                }
                                className="btn btn-ghost btn-sm px-3 py-1.5 rounded-xl border border-[var(--color-border)] text-xs font-bold flex items-center gap-1.5"
                              >
                                <Download size={14} />
                                <span>Download PDF</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  void import('../../services/emailService').then(
                                    (mail) => {
                                      mail.notifyReportsReady({
                                        token:
                                          selectedPatient.token || 'CARD-102',
                                        patientName: selectedPatient.name,
                                        doctorName:
                                          selectedPatient.currentDoctor ||
                                          'Dr. Sharma',
                                        room:
                                          findDepartmentByName(
                                            selectedPatient.currentDepartment,
                                            selectedPatient.currentDoctor
                                          )?.roomNumbers[0] || '1',
                                        floor: String(
                                          findDepartmentByName(
                                            selectedPatient.currentDepartment,
                                            selectedPatient.currentDoctor
                                          )?.floor ?? 1
                                        ),
                                        minutes: 10,
                                      });
                                      alert(
                                        `Email notification sent to ${selectedPatient.name}: Reports ready to return to ${selectedPatient.currentDoctor || 'the doctor'}.`
                                      );
                                    }
                                  );
                                }}
                                className="btn btn-primary btn-sm px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 ml-auto bg-[var(--color-primary-500)] text-white hover:brightness-105"
                              >
                                <Mail size={14} />
                                <span>Notify Patient (Email)</span>
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="p-8 text-center text-[var(--color-text-muted)]">
                        No lab reports on file for this patient.
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Modal Footer */}
              <div className="px-5 sm:px-6 py-3 border-t-2 border-[var(--color-border)] bg-[var(--color-surface-2)] flex items-center justify-between">
                <span className="text-xs text-[var(--color-text-muted)]">
                  Hospital EMR • Read-only clinical view
                </span>
                <button
                  type="button"
                  onClick={handleClosePatient}
                  className="btn btn-primary btn-sm px-4 py-2 rounded-xl text-xs font-bold"
                >
                  Close Record
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </BaseLayout>
  );
}
