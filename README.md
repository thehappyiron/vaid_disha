# Vaid Disha (वैद्य दिशा)
### Intelligent Multilingual Healthcare Wayfinding & Real-time Queue Management System

Vaid Disha is an accessible, human-centered hospital navigation and outpatient queue system designed for Indian public and private hospitals. It eliminates confusion, language barriers, and accessibility bottlenecks for patients, visitors, and clinical staff.

---

## 🚀 Quick Start & How to Run

### Prerequisites
- **Node.js**: v18.0.0 or higher
- **npm**: v9.0.0 or higher

### Installation & Development Server
```bash
# Clone repository
git clone https://github.com/thehappyiron/vaid_disha.git
cd vaid_disha

# Install dependencies
npm install

# Start development server with network host exposure
npm run dev -- --host
```
Open **[http://localhost:5173](http://localhost:5173)** in your browser.

### Type-Check & Production Build
```bash
# Type check and build optimized bundle
npm run build

# Preview production build locally
npm run preview
```

---

## 🛠 Tech Stack

- **Core**: React 19, TypeScript 5.7, Vite 6
- **Styling**: Tailwind CSS v4 (Colorblind-safe Okabe-Ito / Bang Wong palette, dark mode, high contrast, and custom CSS design tokens)
- **Internationalization (i18n)**: `i18next` & `react-i18next` supporting **English**, **हिन्दी (Hindi)**, and **मराठी (Marathi)** with 100% key parity
- **Icons**: Lucide React
- **Voice & Speech**: Web Speech API (`SpeechSynthesis` & `SpeechRecognition`) with Sarvam AI TTS/STT provider abstraction
- **Real-time Live Sync**: In-browser `BroadcastChannel` (`vd_live_store_sync_channel`) + `localStorage` multi-tab synchronization engine
- **Accessibility (a11y)**: WCAG 2.1 AAA target, skip-to-content, keyboard focus trapping, visible focus rings, ARIA live regions, text resizing (18px base / 21px / 24px), and colorblind assist patterns

---

## 📂 Folder Structure

```
vaid_disha/
├── docs/                           # Architectural specs & teammate handoff guides
│   ├── backend-handoff.md          # REST / WebSocket API specification for backend team
│   └── chatbot-integration.md      # Sarvam AI & fallback LLM provider integration guide
├── scripts/                        # Codebase audit & validation tools
│   └── check-i18n.mjs              # Automated 3-language translation key parity auditor
├── src/
│   ├── components/                 # Reusable UI component library
│   │   ├── chat/                   # Floating multilingual AI Help chatbot modal
│   │   ├── guidance/               # 2D Hospital SVG floor maps, nodes & pathfinding
│   │   ├── layout/                 # BaseLayout, AppHeader, StaffHeader, StaffSidebar, A11y panel
│   │   ├── notifications/          # Real-time floating toast container
│   │   └── ui/                     # Accessible buttons, cards, status badges, inputs, OptionCard
│   ├── context/                    # React Contexts (AccessibilityContext, AuthContext)
│   ├── data/                       # Mock clinical datasets (facilities, lab reports, patient records)
│   ├── i18n/                       # Translation dictionaries (en.json, hi.json, mr.json)
│   ├── pages/
│   │   ├── admin/                  # Admin portal teaser
│   │   ├── dev/                    # Developer store testbench (/dev/store)
│   │   ├── patient/                # Patient journey screens (Start, Visit, Slip, Guidance, Reports, Facilities, Emergency, Completion)
│   │   ├── staff/                  # Staff portal screens (Login, Dashboard, Patient Records)
│   │   ├── ComponentDemoPage.tsx   # Interactive live sync simulation control panel (/demo)
│   │   └── RoleSelectionPage.tsx   # Language & role entry point (/)
│   └── services/                   # Business logic, wayfinding algorithms & mock stores
│       ├── chatbot/                # Chatbot provider interface (Sarvam AI, Mock)
│       ├── hospitalService.ts      # Hospital graph routing, Dijkstra wayfinding, slips
│       ├── liveStore.ts            # Reactive BroadcastChannel live queue & alerts store
│       ├── queueEngine.ts          # Smart triage priority sorting engine
│       └── voice/                  # Multilingual Web Speech & Sarvam Voice synthesis
```

---

## 🎯 Step-by-Step Demo Script for Judges

To experience live cross-tab synchronization:
> **Tip**: Open two tabs side-by-side in the **same browser**:
> - **Tab 1**: Patient View (`http://localhost:5173/`)
> - **Tab 2**: Staff View (`http://localhost:5173/staff/dashboard`)

### 1. Landing & Language Choice (`/`)
- Choose your preferred language: **English**, **हिन्दी**, or **मराठी**.
- Tap Accessibility in the header to preview **Text Size (Normal / Large / Extra Large)**, **High Contrast**, or **Colorblind Assist**.
- Click **"Patient / Visitor"**.

### 2. Zero-Friction Patient Entry (`/patient/start`)
- Enter your name and any 10-digit mobile number, then select **"Continue to demo"**. Email is optional; no verification code, email service, or backend is required for demo sign-in. The profile is saved in this browser. Phone `9876543210` loads the sample patient's demo history.
- Select **"Continue as Guest"** to proceed without a phone number.

### 3. Purpose & Accessibility Accommodations (`/patient/visit`)
- Pick visit reason: e.g., *"Chest tightness & heart checkup"* $\to$ routes to **General Medicine (Room 2)**.
- Declare accessibility accommodations (e.g., *Wheelchair assistance*, *Low vision support*).

### 4. Digital Appointment Slip (`/patient/slip/:id`)
- View generated digital token (e.g. `OPD-1042`), attending doctor, room number, and floor.
- Observe the **Live Destination Status Card**: shows real-time estimated wait time and live room status.
- Tap **"Read directions aloud"** to hear spoken route instructions.

### 5. "Find My Way" Navigation & Facilities (`/patient/guidance` & `/patient/facilities`)
- View the 2D architectural floor plan with turn-by-turn landmark directions (*"Pass Lift Lobby B, turn right at Pharmacy"*).
- Check **Nearby Facilities**: filter pins for wheelchair stands, accessible washrooms, lifts, and drinking water. Tap *"Guide me here"* to compute shortest path.

### 6. Emergency Flow (`/patient/emergency`)
- Tap **"I need urgent attention"** on any patient screen.
- Select symptoms (*Chest pain*, *Difficulty breathing*), pick landmark (*"2nd Floor Near Lift B"*), and tap **"Alert Staff"**.
- Patient screen displays: *"Staff have been alerted. Please stay where you are or sit nearby."*

### 7. Staff Duty Desk Reacts Instantly (`/staff/dashboard`)
- Look at **Tab 2 (Staff Dashboard)**:
  - An audible chime alerts the staff.
  - The pinned **CRITICAL PATIENT ALERTS** panel displays the patient name, token, reported symptoms, landmark, and elapsed time.
  - Staff clicks **"Acknowledge"** $\to$ changes status to *"Attending Now"*.
  - Staff clicks **"Mark Attended"** $\to$ emergency resolves.

### 8. Live Queue Management & Doctor Break
- In the Staff Queue table, adjust General Medicine wait time (`+5m` or `-5m`) or click **"Doctor Break (3:15 PM)"**.
- **Switch back to Tab 1 (Patient Slip)**: Notice the Live Card updates instantly without any page refresh!

### 9. Consultation Complete & Discharge (`/patient/completion`)
- On Staff Dashboard, click **"Mark Completed"** for the active patient.
- Patient tab instantly receives an in-app toast: *"Your consultation is complete"*.
- Patient navigates to **Completion Screen** (`/patient/completion`): step-by-step next actions for Medicine Collection at Pharmacy (G-04), Diagnostic Lab collection, and Feedback.

### 10. Multilingual AI Assistant (Floating Chatbot)
- Click the floating **Help** button on any patient page.
- Type or speak: *"Where is Room 2?"* or *"Nearest washroom"*.
- Assistant replies with contextual directions and clickable deep links. Toggle voice to have replies spoken aloud.

---

## 🎮 Interactive Simulation Testbench (`/demo`)

Navigate directly to **`/demo`** for single-click simulation buttons:
- **Reset all mock data**
- **Simulate "Your turn is coming soon"**
- **Simulate "Consultation complete"**
- **Simulate "Lab report ready"**
- **Simulate "Doctor on break (back at 11:30 AM)"**
- **Simulate "New emergency alert from patient"**
- **Add 3 random walk-in guest patients to queue**
- Link to **`/dev/store`** (raw state inspector)

---

## ⚠️ Known Limitations

1. **Mock Data Layer**:
   - Out-of-the-box data runs on an in-memory client store (`src/services/liveStore.ts`) pre-seeded with realistic OPD and clinical diagnostic records.
2. **Cross-Tab vs. Cross-Device Sync**:
   - Real-time synchronization is currently established across tabs of the **same browser** using the HTML5 `BroadcastChannel` API and `localStorage`.
   - Synchronizing between separate physical smartphones and hospital desktop machines requires connecting to a backend server using WebSockets or Server-Sent Events (SSE) as detailed in `docs/backend-handoff.md`.

## Sample hospital layout

The floor plan in `src/data/hospitalGraph.json` is the source of truth for names, positions, visible landmarks, corridors and distances. `src/data/departments.ts` derives room/floor metadata from that plan and defines the fictional doctor roster, OPD hours (09:00–14:00) and sample consultation times. Facility pins, patient slips and staff queue defaults use those sources.

- Ground: entrance, registration, help desk, Emergency, Pharmacy, blood laboratory, X-ray, drinking water, toilets, wheelchair point, lift, stairs and ramp.
- First: General Medicine rooms 1–2; Children 3; Women and pregnancy 4; Bones and joints 5; ENT 6; Eyes 7; Skin 8; Waiting hall A, lift, stairs and toilets.
- Second: Ward 4 (Medicine), Ward 5 (Surgery), Ward 6 (Children), nurses’ station, lift and stairs.

The illustrative map borrows floor-switching and navigation conventions from [Google indoor maps](https://www.google.com/maps/about/partners/indoormaps/). It uses local SVG geometry and requires no Google API key or map server. Distances are sample walking distances, not a surveyed hospital plan.

Run `npm run check:hospital` to check the room/doctor roster, facility pins, sample records, translated names, corridor geometry and every normal/step-free route.
