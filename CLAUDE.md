# Second Brain React Native App

## Overview
Expo/React Native mobile app (iOS + Android) for the Second Brain personal growth tracking system. Consumes the Spring Boot backend API.

## Tech Stack
- **Framework:** Expo SDK 54, React Native 0.81.5, React 19.1
- **Navigation:** expo-router v6 (file-based routing)
- **HTTP:** axios with JWT interceptors
- **Auth Storage:** expo-secure-store
- **Animations:** react-native-reanimated
- **Icons:** @expo/vector-icons (Ionicons)
- **TypeScript:** strict mode

## Project Structure
```
src/
├── app/                    # Expo Router file-based navigation
│   ├── _layout.tsx         # Root layout (AuthProvider + auth routing)
│   ├── settings.tsx        # Settings screen (slide_from_right)
│   ├── log-modal.tsx       # Session log modal (from task cards)
│   ├── (auth)/             # Auth flow screens
│   │   ├── login.tsx
│   │   ├── register.tsx
│   │   ├── setup.tsx       # Domain onboarding
│   │   └── setup-review.tsx# AI plan review carousel
│   └── (tabs)/             # Main app (5-tab bottom nav)
│       ├── index.tsx       # Dashboard (fully built)
│       ├── domains.tsx     # Placeholder
│       ├── log.tsx         # Session logging form
│       ├── progress.tsx    # Placeholder
│       └── ai.tsx          # Placeholder
├── services/               # API call functions
│   ├── api.ts              # Axios instance + interceptors
│   ├── auth.ts             # Login/register
│   ├── dashboard.ts        # Dashboard data
│   ├── domains.ts          # Domain CRUD
│   ├── sessions.ts         # Session logging + metrics
│   ├── tasks.ts            # Task status + delete
│   └── user.ts             # Profile + logout
├── store/                  # State management
│   ├── auth-context.tsx    # Auth React Context (token, signIn, signOut)
│   └── log-prefill.ts     # (deprecated) Simple store for task→log prefill
├── types/                  # TypeScript interfaces
│   ├── auth.ts
│   ├── dashboard.ts
│   ├── domain.ts
│   └── session.ts
├── constants/              # Config + static data
│   ├── config.ts           # API_BASE_URL (local ngrok / production)
│   ├── endpoints.ts        # All API paths centralized
│   └── domains.ts          # Domain types + skill levels
├── hooks/                  # (empty, react-query planned)
├── components/             # (empty, inline for now)
└── utils/                  # (empty)
```

## Design System
- **Dark theme:** bg `#0f172a`, cards `#1e293b`, borders `#334155`
- **Primary:** `#3b82f6` (blue)
- **Text hierarchy:** `#f8fafc` > `#e2e8f0` > `#94a3b8` > `#64748b`
- **Border radius:** 12px cards, 20px pills, 8px inputs
- **All styles inline** in screen files (no shared component library yet)

## Key Patterns

### Auth Flow
1. JWT stored in expo-secure-store
2. axios interceptor attaches token to every request
3. On 401 response → interceptor calls `onTokenExpired` callback → auth context sets token to null → redirects to login
4. Root layout checks: no token → login, token + no domains → setup, else → tabs

### Session Logging (Two Entry Points)
1. **Log Tab** — standalone form: pick domain → fill metrics → save
2. **Log Modal** (`/log-modal`) — opened from dashboard task cards with domain + session type prefilled via route params. Fresh mount each time = no stale state.

### Dashboard Task Cards
- Flip card UX: tap card → shows "Log" | "Delete" | "Back"
- "Log" opens the log-modal with context prefilled
- "Delete" shows confirmation dialog, then removes task via API
- Tasks auto-complete on the server when a session is logged for that domain

### API Integration
- All endpoints centralized in `constants/endpoints.ts`
- Service files return typed responses
- Error handling via try/catch + Alert.alert

## Screens Status
| Screen | Status |
|--------|--------|
| Login / Register | ✅ Complete |
| Domain Setup + Review | ✅ Complete |
| Dashboard | ✅ Complete (tasks, streaks, stats, nudge, progress bars) |
| Log Tab | ✅ Complete |
| Log Modal (from tasks) | ✅ Complete |
| Settings | ✅ Complete |
| Domains tab | ✅ Complete |
| Progress tab | ✅ Complete (domain filter, metric chart, milestones, tasks) |
| AI tab | ✅ Complete (domain picker, mode selector, chat, action cards, 3/day limit) |

## Running
```bash
npx expo start --clear
```
Use `--clear` to bust Metro bundler cache after code changes.

## Important Notes
- Config toggle in `constants/config.ts`: switch between local (ngrok) and production URLs
- `expo-device` version mismatch warning is cosmetic, app works fine
- react-query v5 is installed but not yet used (useState + useEffect pattern currently)
- The `store/log-prefill.ts` file exists but is no longer used (replaced by log-modal approach)
- **Timezone:** All date comparisons use local device date (`getFullYear/getMonth/getDate`), NOT `toISOString()` which gives UTC

## Session Log — Aug 16, 2026

### Changes Made
- **Auth:** API interceptor now handles 401 → clears token → triggers `onTokenExpired` callback in AuthContext → auto-logout
- **Log tab:** Built full session logging form — domain grid selector (vertical when nothing selected, horizontal pills after), session type with domain-aware placeholders, duration, dynamic metric inputs, feel selector, notes, save with validation (domain + kind + duration + 1 metric + feel required)
- **Log modal:** Separate `/log-modal` screen for task card → log flow. Fresh mount each time (no stale state). Domain + session type prefilled via route params
- **Dashboard:** Task cards are now flip cards (tap → Log | Delete | Back). Tasks sorted by Pending → Todo → Upcoming with date-based status labels. Weekly snapshot is collapsible. Removed quick log button. Added confirmation dialog on delete
- **Domains tab:** Complete rebuild — rich list cards with status badge, plan summary, schedule frequency, streak, next milestone with progress %. Tap to open detail modal
- **Domain detail modal:** PRs grid, milestones with progress bars, plan + day tags, linked resource (tappable), completed milestones, Pause/Resume toggle, Delete, Edit plan with AI (placeholder)
- **Add domain modal:** 3x3 preset grid, custom text input, skill level selector, AI info card, create button with loading state
- **Timezone fix:** All `toISOString().split('T')[0]` replaced with local date construction to fix UTC vs IST mismatch in task status labels and logDate
- **Domain reload:** Log tab now reloads domains on focus (new domains appear immediately)

## Session Log — Aug 23, 2026

### Backend Changes (no app code changes needed)
- **Streak fix:** Server now correctly recalculates streaks using `StreakCalculator.compute()` instead of naive +1. Streaks reset when scheduled days are missed. Midnight cron recalculates all active domains. New `POST /api/domains/streaks/recalculate` endpoint available if manual trigger needed.

### App Changes
- **Progress tab:** Full build — domain filter pills (horizontal scroll, auto-selects first active domain), metric selector pills (filters PR-trackable/tracked-per-session metrics), bar chart via `react-native-chart-kit` (last 8 sessions with trend summary), PRs section (2-col grid with trophy icon, value, delta, date), milestones section with progress bars + status pills + current/target values, tasks section grouped by To Do / In Progress / Done with domain tags and due dates. Uses ALL progress APIs: getDomains, getMetricsForDomain, getMetricProgress, getMilestonesForDomain, getPRsForDomain, getTasks
- **New dependencies:** `react-native-chart-kit`, `react-native-svg`
- **New service:** `src/services/progress.ts` — `getChartData`, `getMetricProgress`, `getMilestonesForDomain`, `getTasks`, `getMetricsForDomain`
- **Endpoints updated:** Added `DOMAINS.CHART_DATA`, `TASKS.LIST`, `TASKS.UPCOMING`, `PROGRESS.METRIC` to `constants/endpoints.ts`
- **AI tab:** Full build — Step 1: domain picker pills. Step 2: mode selector (Adjust Plan / Ask About Data). Chat area with user/AI message bubbles. Action cards with Apply/Dismiss for proposed changes. Input with send button. Rate limit badge (X/3 remaining). Resets chat on domain/mode switch. KeyboardAvoidingView for input.
- **AI service:** `src/services/ai.ts` — `sendChatMessage`, `getRemainingMessages`, `getConversations`, `getMessages`, `applyAction`. AI endpoints added to `constants/endpoints.ts`.

## Session Log — Settings Data Export Wiring

### What
The settings "Export as JSON / CSV" buttons were stubs (`Alert('...coming soon')`) even though the backend endpoint `GET /api/users/export?format=json|csv` already existed. Wired them to the real endpoint.

### Changes
- **Deps:** added `expo-file-system` (~19, SDK 54 File/Paths API) and `expo-sharing` (~14).
- **services/user.ts `exportData(format)`:** GETs the export as raw text (auth header via api interceptor; `transformResponse` keeps it unparsed), writes to `Paths.cache/secondbrain_data.{json|csv}` via `new File(...).write(...)`, then opens the native share sheet with `Sharing.shareAsync`. Throws if sharing unavailable.
- **settings.tsx:** real `handleExport` with per-format `exporting` state (spinner in the row, both rows disabled during export) + error alert.

### Account API inventory (checked)
The only unwired account/user function was export. `UserController` exposes just `getProfile` + `exportData`; there is NO updateProfile / change-password / delete-account endpoint server-side, so nothing else to wire without new backend work. (The LLD previously listed an `updateProfile` that doesn't exist — corrected the LLD.)

### Verify
`tsc` clean on the edited files (`services/user.ts`, `settings.tsx`). Pre-existing unrelated errors remain in `setup-review.tsx` (dead linkedResource refs).
