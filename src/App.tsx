import { useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AccessibilityProvider } from './context/AccessibilityContext';
import { AuthProvider } from './context/AuthContext';
import { startEmailReminderScheduler } from './services/emailService';

// Pages
import { RoleSelectionPage } from './pages/RoleSelectionPage';
import {
  PatientStartPage,
  EmergencyPage,
  PatientVisitPage,
  PatientHistoryPage,
  PatientGuidancePage,
  PatientLivePage,
  PatientNotificationsPage,
  PatientCompletionPage,
  PatientFacilitiesPage,
  PatientReportsPage,
} from './pages/patient';
import { StaffLoginPage, StaffDashboardPage, StaffPatientsPage } from './pages/staff';
import { AdminComingSoonPage } from './pages/admin';
import { PurposePage } from './pages/PurposePage';
import { DepartmentPage } from './pages/DepartmentPage';
import { SlipPage } from './pages/SlipPage';
import { WayfindingPage } from './pages/WayfindingPage';
import { ComponentDemoPage } from './pages/ComponentDemoPage';
import { DevStorePage } from './pages/dev/DevStorePage';
import { NotFoundPage } from './pages/NotFoundPage';

export function App() {
  useEffect(() => {
    startEmailReminderScheduler();
  }, []);

  return (
    <AccessibilityProvider>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            {/* Entry flow: Screen A (Language selection) & Screen B (Role selection) */}
            <Route path="/" element={<RoleSelectionPage />} />

            {/* Patient entry with local demo sign-in or guest access */}
            <Route path="/patient/start" element={<PatientStartPage />} />
            <Route path="/patient/emergency" element={<EmergencyPage />} />
            <Route path="/patient/visit" element={<PatientVisitPage />} />
            <Route path="/patient/history" element={<PatientHistoryPage />} />

            {/* Facilities Directory & Map */}
            <Route path="/patient/facilities" element={<PatientFacilitiesPage />} />
            <Route path="/facilities" element={<PatientFacilitiesPage />} />

            {/* Diagnostic Lab Reports */}
            <Route path="/patient/reports" element={<PatientReportsPage />} />
            <Route path="/reports" element={<PatientReportsPage />} />

            {/* Real-time Notifications list */}
            <Route path="/patient/notifications" element={<PatientNotificationsPage />} />
            <Route path="/notifications" element={<PatientNotificationsPage />} />

            {/* Post-consultation Completion Screen */}
            <Route path="/patient/completion" element={<PatientCompletionPage />} />

            {/* Patient Guidance / Find My Way */}
            <Route path="/patient/guidance/:slipId" element={<PatientGuidancePage />} />
            <Route path="/patient/guidance" element={<PatientGuidancePage />} />
            <Route path="/wayfinding" element={<PatientGuidancePage />} />

            {/* Patient slip views: both /patient/slip/:id and legacy /slip */}
            <Route path="/patient/slip/:id" element={<SlipPage />} />
            <Route path="/patient/slip" element={<SlipPage />} />
            <Route path="/slip" element={<SlipPage />} />
            <Route path="/slip/:id" element={<SlipPage />} />

            {/* Real-time Destination Live Tracker */}
            <Route path="/patient/live" element={<PatientLivePage />} />

            {/* Temporary Developer Store Testbench */}
            <Route path="/dev/store" element={<DevStorePage />} />

            {/* Screen D: Staff login & Staff dashboard */}
            <Route path="/staff/login" element={<StaffLoginPage />} />
            <Route path="/staff/dashboard" element={<StaffDashboardPage />} />
            <Route path="/staff/patients" element={<StaffPatientsPage />} />

            {/* Hospital Admin Coming Soon */}
            <Route path="/admin/coming-soon" element={<AdminComingSoonPage />} />

            {/* Patient navigation & legacy route aliases */}
            <Route path="/purpose" element={<PurposePage />} />
            <Route path="/department" element={<DepartmentPage />} />
            <Route path="/wayfinding" element={<WayfindingPage />} />

            {/* UI Component Library Demo */}
            <Route path="/demo" element={<ComponentDemoPage />} />

            {/* Fallback */}
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </AccessibilityProvider>
  );
}
