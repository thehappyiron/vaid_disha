# Chatbot Integration Guide

This guide details the contract, architectural flow, and integration steps for connecting the frontend patient assistant to a production AI backend (e.g., Sarvam AI, FastAPI proxy, or LLM pipeline).

---

## 1. Architecture Overview

```
┌─────────────────────────────────┐
│     Patient Frontend (React)    │
│  - FloatingChatButton           │
│  - ChatbotModal                 │
└────────────────┬────────────────┘
                 │ ChatRequest (TypeScript)
                 ▼
┌─────────────────────────────────┐
│       ChatProvider Interface    │
│   src/services/chatbot/provider │
└────────┬───────────────┬────────┘
         │               │
  VITE_CHAT_PROVIDER   VITE_CHAT_PROVIDER
      = "mock"            = "http"
         │               │
         ▼               ▼
┌─────────────────┐  ┌─────────────────────────────────┐
│ MockChatProvider│  │        HttpChatProvider         │
│ (Offline demo   │  │   POST ${VITE_API_BASE_URL}/chat│
│  with liveStore)│  └────────────────┬────────────────┘
└─────────────────┘                   │
                                      ▼
                     ┌─────────────────────────────────┐
                     │   Backend Proxy / Server        │
                     │  - Holds Sarvam API Key securely│
                     │  - Injects hospital prompt      │
                     │  - Formats ChatResponse         │
                     └────────────────┬────────────────┘
                                      │
                                      ▼
                     ┌─────────────────────────────────┐
                     │  Sarvam AI / LLM / Vector RAG   │
                     └─────────────────────────────────┘
```

---

## 2. Environment Variables

To switch from the local mock provider to the live backend:

```env
# .env or .env.production
VITE_CHAT_PROVIDER=http
VITE_API_BASE_URL=https://api.yourhospital.org/v1
```

- When `VITE_CHAT_PROVIDER` is set to `http`, `HttpChatProvider` will execute a `POST` request to `${VITE_API_BASE_URL}/chat`.
- When set to `mock` (default), `MockChatProvider` runs locally with intelligent multilingual intent matching, slip awareness, and live queue integration.

---

## 3. Data Contracts

### 3.1. Request Contract (`ChatRequest`)

The frontend sends the following JSON payload on each message:

```typescript
export interface ChatRequest {
  message: string;             // User's input text
  language: string;            // 'en' | 'hi' | 'mr'
  context: {
    userType: 'guest' | 'registered' | 'staff';
    slipId?: string;           // Active visit slip ID if generated
    currentLocation?: string;  // Landmark or node ID (e.g. 'entrance-main')
    department?: string;       // Assigned department ID
    accessibilityNeeds?: string[]; // e.g. ['wheelchair', 'walking_difficulty']
  };
  history: Array<{
    role: 'user' | 'assistant';
    text: string;
    timestamp?: number;
  }>;
}
```

#### Example JSON Request

```json
{
  "message": "Where is my doctor's room?",
  "language": "en",
  "context": {
    "userType": "registered",
    "slipId": "slip-1729765200000",
    "currentLocation": "reception",
    "department": "opd-general-2",
    "accessibilityNeeds": ["wheelchair"]
  },
  "history": [
    {
      "role": "assistant",
      "text": "Hello! I am your Vaid Disha hospital assistant. How can I assist you today?",
      "timestamp": 1729765205000
    }
  ]
}
```

---

### 3.2. Response Contract (`ChatResponse`)

The backend must respond with HTTP `200 OK` and the following JSON schema:

```typescript
export interface ChatResponse {
  text: string;                // Assistant reply message to display and read aloud
  language: string;            // 'en' | 'hi' | 'mr'
  actions?: Array<{            // Interactive action buttons rendered below reply
    label: string;             // User-facing button label
    route: string;             // In-app destination route (e.g. /patient/guidance/slip-123)
  }>;
  suggestedReplies?: string[]; // Quick-reply pill suggestions for follow-up queries
}
```

#### Example JSON Response

```json
{
  "text": "Your consultation is in Room 2 (General Medicine) on Floor 1. An elevator is available near the Central Junction.",
  "language": "en",
  "actions": [
    {
      "label": "Help me find the way",
      "route": "/patient/guidance/slip-1729765200000"
    },
    {
      "label": "Show my slip",
      "route": "/patient/slip/slip-1729765200000"
    }
  ],
  "suggestedReplies": [
    "How long is the wait?",
    "Nearest washroom",
    "My reports"
  ]
}
```

---

## 4. Frontend Navigation Action Routes

When returning `actions` in `ChatResponse`, use any of the standard patient routes supported by Vaid Disha:

| Route | Description |
| :--- | :--- |
| `/patient/guidance/:slipId` | Step-by-step turn-by-turn navigation route to destination |
| `/patient/facilities?filter=washroom` | Nearby facilities page filtered to washrooms |
| `/patient/facilities` | Full hospital facilities map (wheelchairs, lifts, water, prayer) |
| `/patient/slip/:slipId` | Digital patient visit slip with QR code and live queue token |
| `/patient/live` | Real-time destination queue monitor |
| `/patient/reports` | Diagnostic lab test reports list and detail viewer |
| `/patient/emergency` | Immediate hospital rapid response emergency alert trigger |
| `/patient/visit` | New visit registration & symptom intake flow |

---

## 5. Security & Secret Handling

1. **Never commit API keys in frontend code:**
   Do NOT place `SARVAM_API_KEY`, OpenAI keys, or credentials in client `.env` or repository files.
2. **Backend Proxy Pattern:**
   The backend service (e.g. Node.js/Express, Python/FastAPI) must keep secrets in server environment variables and validate all requests.
3. **Frontend Client Validation:**
   The frontend only talks to `/chat` on your secure domain or API gateway.
