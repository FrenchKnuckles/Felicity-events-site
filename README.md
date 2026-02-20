# Felicity Event Management System

A centralized platform for IIIT Hyderabad's annual fest **Felicity** that replaces the chaos of Google Forms, spreadsheets, and WhatsApp groups with a unified system where clubs can conduct events smoothly and participants can register, track, and attend them. Built as part of the Design & Analysis of Software Systems (DAAS) course — Assignment 1.

---

## Technology Stack

| Layer | Technology | Justification |
|-------|-----------|---------------|
| **Database** | MongoDB (Atlas) | Document-oriented storage naturally fits the varied event schemas (normal, merchandise, hackathon) without rigid relational constraints. Atlas provides managed hosting with automatic backups. |
| **Backend** | Express.js v5 (Node.js) | Lightweight, unopinionated framework for building REST APIs. v5 adds native async/await error forwarding. Node.js enables JavaScript across the full stack. |
| **Frontend** | React 19 (Vite) | Component-based architecture with hooks for state management. Vite provides near-instant HMR during development and optimized production builds. |
| **UI Library** | Radix UI Themes | Accessible, unstyled primitives with a cohesive theme system. Provides dark/light mode support out of the box without CSS-in-JS overhead. |

## Project Structure

```
├── backend/                 # Express REST API server
│   ├── config/              # Database connection
│   ├── controllers/         # Route handler logic (7 controllers)
│   ├── middleware/          # Auth guards, error handling
│   ├── models/              # Mongoose schemas (8 models)
│   ├── routes/              # API endpoint definitions (7 route files)
│   ├── utils/               # Email, QR, Discord, CAPTCHA helpers
│   ├── scripts/             # Admin seed script
│   └── server.js            # Application entry point
│
├── frontend/                # React SPA (Vite)
│   └── src/
│       ├── api/             # Axios instance with auth interceptor
│       ├── components/      # Navbar, ProtectedRoute, CAPTCHA
│       ├── context/         # AuthContext, ThemeContext
│       ├── pages/           # 17 page components (auth/events/participant/organizer/admin)
│       └── services/        # API service abstractions (7 service files)
│
├── deployment.txt           # Production URLs
└── README.md                # This file
```

> Detailed file-level documentation with per-file descriptions, connections, and responsibilities is available in [`backend/README.md`](backend/README.md) and [`frontend/README.md`](frontend/README.md).

---

## Core Features Implemented (Part 1)

### Authentication & Security [8 Marks]
- **Registration:** IIIT participants must use `@*.iiit.ac.in` emails (domain validated server-side). Non-IIIT participants register with any email. Organizer accounts are admin-provisioned only.
- **Password Security:** All passwords hashed with bcrypt (10 salt rounds) via a Mongoose pre-save hook. No plaintext storage.
- **JWT Authentication:** All protected routes require a valid JWT (30-day expiry) in the `Authorization` header. Token stored in localStorage for session persistence across browser restarts.
- **Role-Based Access Control:** Three roles (participant, organizer, admin) with middleware-enforced authorization on every protected endpoint. Frontend uses `<ProtectedRoute>` to gate pages by role.
- **Session Management:** Login redirects to role-appropriate dashboard. Sessions persist via localStorage until explicit logout, which clears all tokens.

### User Onboarding & Preferences [3 Marks]
- Two-step post-registration wizard: (1) select areas of interest from 24 categories, (2) follow organizers
- Preferences stored in the User model and influence event browse ordering (preference-matched events surfaced first via scoring in the query pipeline)
- Skip option available; preferences editable from the Profile page at any time

### User Data Models [2 Marks]
- **Participant:** firstName, lastName, email (unique), participantType (iiit/non-iiit), collegeOrg, contactNumber, password (hashed), areasOfInterest[], followedOrganizers[]
- **Organizer:** name, category (cultural/technical/sports/other), description, contactEmail, contactNumber, discordWebhook, logo, followers[], isActive

### Event Types [2 Marks]
- **Normal Event:** Individual registration with optional custom form. Workshops, talks, competitions.
- **Merchandise Event:** Item purchase with variant support (size, color, stock). Stock decremented atomically on purchase. Configurable per-participant purchase limit.
- **Hackathon Event:** Team-based registration (see Tier A advanced feature). Supports individual, team, or both registration types.

### Event Attributes [2 Marks]
Core fields: name, description, eventType, eligibility (all/iiit-only/non-iiit-only), registrationDeadline, startDate, endDate, registrationLimit, registrationFee, organizerId, tags[], status (draft/published/ongoing/completed/closed).
- **Normal Events:** Dynamic custom registration form via form builder (9 field types, required/optional toggle, reorderable). Form locks after first registration.
- **Merchandise Events:** variants[] (size, color, stock, price), purchaseLimitPerUser.
- **Hackathon Events:** allowTeamRegistration, minTeamSize, maxTeamSize, registrationType.

### Participant Features [22 Marks]

| Feature | Implementation |
|---------|---------------|
| **Navigation** | Role-aware Navbar with Dashboard, Browse Events, Clubs/Organizers, Profile, Logout. Mobile-responsive hamburger menu. |
| **Dashboard** | Upcoming events section. Tabbed participation history (Normal, Merchandise, Completed, Cancelled). Each record shows event name, type, organizer, status, team, clickable ticket ID. Ticket modal with QR code. |
| **Browse Events** | Trending section (top 5 by 24h registrations via aggregation pipeline). Text search (MongoDB `$text` index). Filters: event type, eligibility, date range, followed clubs only. Paginated grid. |
| **Event Details** | Full event info with registration/purchase buttons. Dynamic custom form modal for normal events. Variant/quantity picker for merchandise. Team registration link for hackathons. Deadline/capacity/stock blocking. |
| **Registration** | Normal: form submission → ticket with QR generated → confirmation email sent. Merchandise: variant selected → stock decremented → ticket + QR → email. Ticket format: `FEL-<timestamp>-<random>`. |
| **Profile** | Editable: name, contact, college, interests, followed clubs. Non-editable: email, participant type. Password change with current password verification. |
| **Organizer Listing** | All active organizers with search, follow/unfollow toggle, follower and event counts. |
| **Organizer Detail** | Profile info, follow button, upcoming events grid, past events grid. |

### Organizer Features [18 Marks]

| Feature | Implementation |
|---------|---------------|
| **Navigation** | Dashboard, Create Event, Ongoing Events, Profile, Logout. |
| **Dashboard** | Event cards with status tabs (All/Draft/Published/Ongoing/Completed/Closed). Analytics: total events, registrations, revenue, attendance rate. |
| **Event Detail** | Overview with analytics cards. Participant table with search/filter by status, check-in, institution type. CSV export. Status management actions. |
| **Event Creation** | 4-step wizard: (1) Basic info, (2) Configuration (eligibility, tags, team/merch settings), (3) Custom form builder (drag-to-reorder, 9 field types), (4) Review & save as draft. Edit mode respects status-dependent rules. |
| **Profile** | Editable fields including Discord webhook URL for auto-posting events. Password reset request to admin. |
| **Discord Webhook** | On event publish, auto-sends rich embed to configured Discord channel with event details, dates, and registration info. |

### Admin Features [6 Marks]

| Feature | Implementation |
|---------|---------------|
| **Navigation** | Dashboard, Manage Clubs/Organizers, Password Requests, Logout. |
| **Dashboard** | Platform stats (participants, organizers, events, revenue). Recent events with delete. Pending password request preview. |
| **Club Management** | Create organizer (auto-generates password, displays credentials with copy button). Edit, disable/enable, permanently delete (cascades to events/tickets). Search and status filter. |

### Deployment [5 Marks]
- **Frontend:** Deployed to Vercel (static hosting)
- **Backend:** Deployed to Render (managed Node.js hosting)
- **Database:** MongoDB Atlas (connection via `MONGO_URI` environment variable)
- **URLs:** See `deployment.txt` in project root

---

## Advanced Features Implemented (Part 2) — 30 Marks

### Feature Selection Summary

| Tier | Feature | Marks |
|------|---------|-------|
| **A** | QR Scanner & Attendance Tracking | 8 |
| **A** | Hackathon Team Registration | 8 |
| **B** | Team Chat | 6 |
| **B** | Organizer Password Reset Workflow | 6 |
| **C** | Bot Protection (hCaptcha) | 2 |
| | **Total** | **30** |

---

### Tier A — Feature 1: QR Scanner & Attendance Tracking [8 Marks]

**Why this feature:** Attendance tracking is the most critical operational need during a fest. Without it, organizers cannot verify who actually attended vs who merely registered, making post-event analysis and resource planning impossible. The QR-based approach eliminates manual roll calls and provides real-time visibility.

**Key Files:**
- `backend/controllers/attendanceController.js` — Scan validation, manual check-in, dashboard aggregation, CSV export, audit logs
- `backend/models/Attendance.js` — Attendance records (compound unique index on event+ticket) + AttendanceAudit model for audit trail
- `backend/routes/attendance.js` — 6 organizer-protected endpoints
- `frontend/src/pages/organizer/AttendanceDashboard.jsx` — Camera QR scanner, live dashboard, manual check-in, audit viewer
- `frontend/src/services/attendanceService.js` — API abstraction layer

**Implementation Details:**

1. **QR Code Scanning (Camera-based)**
   - Uses `html5-qrcode` library for cross-browser camera access without external SDKs
   - QR codes contain JSON: `{ ticketId, eventId, userId, timestamp }`
   - Backend parses and validates: ticket exists, belongs to correct event, participant matches, not already checked in

2. **Duplicate Scan Detection**
   - Compound unique index `(event, ticket)` on Attendance model prevents duplicate records at the database level
   - On duplicate attempt: logs the attempt in `duplicateScanAttempts[]` array with timestamp, returns clear error message
   - Organizers see total duplicate attempt counts in the dashboard

3. **Live Attendance Dashboard (10-second auto-refresh)**
   - Real-time stats: total registered, checked-in count, check-in percentage
   - Hourly breakdown: aggregation pipeline groups check-ins by hour for rate visualization
   - Recent check-ins feed: shows latest 10 check-ins with participant name, time, and method

4. **Manual Override Check-in**
   - Search participant by name or email
   - Mandatory reason field (minimum 10 characters) — required for audit compliance
   - Used for edge cases: damaged phone screens, QR display issues, VIP entries

5. **Audit Trail**
   - Every check-in (QR or manual) creates an `AttendanceAudit` record
   - Fields: action type, performer (organizer), timestamp, details, IP address
   - Paginated audit log viewer in the dashboard

6. **CSV Export**
   - Exports all checked-in participants with details (name, email, time, method)
   - Optional flag to include not-checked-in participants for gap analysis
   - Uses `json2csv` library for proper CSV formatting

**Design Decisions:**
- Polling (10s) over WebSockets for the dashboard — simpler deployment, sufficient for attendance use case where seconds-level latency is acceptable
- QR data is JSON rather than a URL — allows offline validation of data structure before API call
- Audit logging is mandatory for manual overrides to prevent abuse while still allowing legitimate exceptions

---

### Tier A — Feature 2: Hackathon Team Registration [8 Marks]

**Why this feature:** Hackathons are a cornerstone of Felicity, and team formation is inherently complex — leaders need to find members, members need to coordinate, and the system must ensure complete teams before generating tickets. This feature automates the entire lifecycle.

**Key Files:**
- `backend/models/Team.js` — Team schema with invite code generation, member status tracking
- `backend/controllers/teamController.js` — Create, join, invite, respond, complete registration, leave
- `backend/routes/teams.js` — 9 participant-protected endpoints
- `frontend/src/pages/participant/TeamRegistration.jsx` — Create/join/manage team UI
- `frontend/src/services/teamService.js` — API abstraction layer

**Implementation Details:**

1. **Team Creation**
   - Leader creates team with a name, linked to a specific hackathon event
   - System auto-generates a unique 8-character alphanumeric invite code (collision-checked via static method on Team model)
   - TeamChat room automatically created for the team (enables Tier B Team Chat feature)
   - Leader is auto-added as first member with status "accepted"

2. **Joining & Invitations**
   - **Invite Code:** Shareable offline — paste code in the "Join Team" tab to join instantly
   - **Email Invitation:** Leader enters email → system sends invite email with the code via Nodemailer
   - **Join Validation:** Checks team capacity (maxSize), event eligibility, and prevents duplicate membership

3. **Member Status Tracking**
   - Each member has a status: `pending` (invited but not responded), `accepted`, `rejected`
   - Team status: `forming` (accepting members), `complete` (all slots filled), `incomplete` (below min size)
   - Real-time member list in the Manage Team tab shows each member's status

4. **Complete Team Registration**
   - Leader-only action — validates minimum team size is met (all accepted members ≥ minTeamSize)
   - On completion: generates individual tickets with QR codes for ALL accepted team members
   - Confirmation emails sent to every team member with their personal ticket
   - Team status set to `complete`, `isRegistrationComplete` flag set

5. **Leave Team with Leader Succession**
   - Any member can leave a team before registration is complete
   - If the leader leaves, the oldest remaining member (by joinedAt timestamp) automatically becomes the new leader
   - If the last member leaves, team status is set to `cancelled`

**Design Decisions:**
- Invite codes (8 chars) over invitation links — simpler for in-person sharing during fest, works offline, no URL parsing needed
- Auto-creating TeamChat on team creation ensures the chat room is ready before members even join
- Leader succession prevents orphaned teams requiring admin intervention

---

### Tier B — Feature 1: Team Chat [6 Marks]

**Why this feature:** Team coordination is essential for hackathons, and forcing teams to use external platforms (WhatsApp, Discord) fractures the user experience. An integrated chat keeps all team communication within the platform alongside registration status, member list, and event details.

**Key Files:**
- `backend/models/TeamChat.js` — Chat room with embedded messages, typing/online tracking
- `backend/controllers/teamChatController.js` — Message CRUD, read receipts, presence management
- `backend/routes/teamChat.js` — 10 participant-protected endpoints
- `frontend/src/pages/participant/TeamChat.jsx` — Chat UI with message bubbles, typing indicators
- `frontend/src/services/teamChatService.js` — API abstraction layer

**Implementation Details:**

1. **Real-Time Messaging (3-second polling)**
   - Frontend polls `GET /messages` every 3 seconds for new messages
   - Messages stored as embedded subdocuments in the TeamChat document (single-document reads are fast)
   - Paginated history loaded on scroll-up

2. **Online Status & Typing Indicators**
   - Users send heartbeat to `POST /online` endpoint; backend tracks `onlineUsers[]` with timestamps
   - Typing status via `POST /typing` endpoint; frontend shows "X is typing..." indicator
   - Both implemented without WebSockets using short-poll endpoints

3. **Message Features**
   - Edit own messages (sets `isEdited` flag, shows "edited" label)
   - Delete own messages (removes from array)
   - Support for text, link, and file message types
   - Message bubbles styled by sender (own = right-aligned blue, others = left-aligned)
   - User avatars with colored initials

4. **Read Receipts & Unread Count**
   - `markAsRead()` method adds userId to each message's `readBy[]` array
   - `getUnreadCount(userId)` counts messages where userId is not in readBy
   - Unread count displayed in team navigation

**Design Decisions:**
- **Polling over WebSockets:** Eliminates the need for a WebSocket server (additional infrastructure, sticky sessions, reconnection logic). For a team of 2-6 people, 3-second polling is indistinguishable from real-time. Simpler deployment on Render (no WebSocket support needed).
- **Embedded messages in single document:** Teams are small (2-6 members, ~100s of messages during a hackathon). Single-document storage avoids joins and simplifies read/write. If messages grew to thousands, a separate collection with pagination would be warranted.
- **3-second interval:** Empirically chosen — 1s feels wasteful for a team chat, 5s feels sluggish. 3s balances responsiveness with server load.

---

### Tier B — Feature 2: Organizer Password Reset Workflow [6 Marks]

**Why this feature:** Organizer accounts handle sensitive event data (participant info, payments, attendance). Self-service password resets would be a security risk. An admin-mediated workflow ensures accountability while providing a structured process for organizers who lose access.

**Key Files:**
- `backend/models/PasswordResetRequest.js` — Request schema with status lifecycle tracking  
- `backend/controllers/adminController.js` — `getPasswordResetRequests`, `processPasswordResetRequest`
- `backend/controllers/organizerController.js` — `requestPasswordReset`
- `frontend/src/pages/admin/PasswordRequests.jsx` — Admin review queue UI
- `frontend/src/pages/organizer/OrganizerProfile.jsx` — Request submission dialog
- `frontend/src/pages/organizer/Dashboard.jsx` — Request submission dialog (also accessible from dashboard)

**Implementation Details:**

1. **Request Submission**
   - Organizers submit requests from their profile page or dashboard
   - Must provide a reason for the reset (stored in the request record)
   - System prevents duplicate pending requests from the same organizer

2. **Admin Review Queue**
   - Filterable by status: Pending, Approved, Rejected, All
   - Each request shows: organizer name, email, reason, submission date, current status
   - Paginated list sorted by newest first

3. **Approval Flow**
   - Admin clicks "Approve" → system auto-generates a new secure password
   - Password is hashed and saved to the organizer's User record
   - Admin sees the new credentials in a modal with copy-to-clipboard
   - Admin shares the new password with the organizer out-of-band (email, in-person, etc.)
   - Request status updated to "approved" with timestamp and admin ID

4. **Rejection Flow**
   - Admin clicks "Reject" → must enter a mandatory comment explaining why
   - Request status updated to "rejected" with the comment
   - Organizer can see their request status

5. **Status Tracking**
   - Full lifecycle: Pending → Approved/Rejected
   - Timestamps recorded: `createdAt` (request submission), `processedAt` (admin action)
   - `processedBy` field links to the admin who handled the request

**Design Decisions:**
- Admin-mediated over self-service (email link) — aligns with the assignment requirement that "Password resets must be requested and handled by the Admin"
- Auto-generated passwords prevent admins from choosing weak passwords
- Mandatory rejection comments prevent unexplained denials and give organizers actionable feedback

---

### Tier C — Bot Protection (hCaptcha) [2 Marks]

**Why this feature:** Registration and login endpoints are the primary attack surface for automated bots. Without CAPTCHA, bots could mass-register fake accounts, brute-force passwords, or create spam registrations for events. hCaptcha was chosen over Google reCAPTCHA for better privacy practices and no Google dependency.

**Key Files:**
- `frontend/src/components/SimpleCaptcha.jsx` — hCaptcha widget wrapper using `@hcaptcha/vanilla-hcaptcha` web component
- `backend/utils/captcha.js` — Server-side verification middleware (supports both reCAPTCHA and hCaptcha, auto-detects from env vars)
- `frontend/src/pages/auth/Login.jsx` — CAPTCHA integrated into login form
- `frontend/src/pages/auth/Register.jsx` — CAPTCHA integrated into registration form

**Implementation Details:**
- Frontend renders hCaptcha challenge; on completion, token is sent with the login/register request
- Backend middleware `verifyCaptchaMiddleware` validates the token against hCaptcha's API (`https://api.hcaptcha.com/siteverify`)
- If neither `HCAPTCHA_SECRET` nor `RECAPTCHA_SECRET_KEY` is configured in env, the middleware skips verification (development mode convenience)
- Submit button is disabled until CAPTCHA is verified, preventing form submission without completion

**Design Decisions:**
- **hCaptcha over reCAPTCHA:** Privacy-first (doesn't track users for ad profiling), GDPR-compliant, free tier sufficient
- **Server-side verification mandatory:** Client-side CAPTCHA alone is bypassable; the backend re-validates every token
- **Graceful degradation:** If CAPTCHA is not configured (dev environment), the system works normally without it

---

## Libraries & Frameworks — Full Justification

### Backend Dependencies

| Library | Version | Why It's Used |
|---------|---------|---------------|
| `express` | 5.2.1 | Core web framework. v5 chosen for native async error handling — eliminates the need for `express-async-errors` and simplifies controller code. Mature ecosystem with extensive middleware support. |
| `mongoose` | 9.2.1 | MongoDB ODM providing schema validation, middleware hooks (pre-save password hashing), population (joining references), and aggregation pipeline support. Alternatives like raw MongoDB driver lack schema enforcement. |
| `bcryptjs` | 3.0.3 | Pure JavaScript bcrypt implementation for password hashing. Chosen over `bcrypt` (native C++ bindings) to avoid platform-specific build issues on deployment (Render, Vercel). Security requirement mandated by the assignment. |
| `jsonwebtoken` | 9.0.3 | Industry-standard JWT creation and verification. Used for stateless authentication — the server doesn't store sessions, making horizontal scaling trivial. 30-day token expiry balances security with UX. |
| `cors` | 2.8.6 | CORS middleware restricting API access to the frontend origin (`FRONTEND_URL`). Prevents unauthorized cross-origin requests in production while allowing the Vite dev server during development. |
| `dotenv` | 17.3.1 | Loads environment variables from `.env` file. Keeps secrets (MongoDB URI, JWT secret, SMTP credentials, Cloudinary keys) out of source code. Standard practice for 12-factor app configuration. |
| `nodemailer` | 8.0.1 | SMTP email client for sending ticket confirmations, team invitations, and notification emails. Configured with Gmail SMTP (App Passwords). Alternatives like SendGrid/Mailgun add external service dependency. |
| `qrcode` | 1.5.4 | Generates QR code images as base64 data URLs. Each ticket gets a unique QR encoding `{ ticketId, eventId, userId, timestamp }` as JSON. Data URL format allows embedding directly in emails and UI without file storage. |
| `json2csv` | 6.0.0-alpha.2 | Converts JSON arrays to CSV format for participant and attendance exports. Handles edge cases like commas in values, proper quoting, and custom field headers. |
| `axios` | 1.13.5 | HTTP client used server-side for two purposes: (1) Discord webhook POST requests, (2) CAPTCHA token verification against hCaptcha/reCAPTCHA APIs. Consistent API with the frontend's Axios usage. |
| `multer` | 2.0.2 | Multipart form-data middleware for file uploads. Configured with memory storage (files stored in buffer, not disk) and 10MB size limit. Used for the Cloudinary proxy endpoint. |
| `nodemon` | 3.1.11 | Dev dependency — auto-restarts the server on file changes during development. |

### Frontend Dependencies

| Library | Version | Why It's Used |
|---------|---------|---------------|
| `react` | 19.2.0 | UI library. Component-based architecture with hooks provides clean state management without class components. React 19 chosen for improved concurrent rendering and automatic batching. |
| `react-dom` | 19.2.0 | React DOM renderer — required companion to React for web applications. |
| `react-router-dom` | 7.13.0 | Client-side routing with `BrowserRouter`. Provides `<Routes>`, `<Route>`, `useNavigate`, `useParams` for SPA navigation. 24+ routes defined, nested by role. |
| `axios` | 1.13.5 | HTTP client with interceptor support. Request interceptor auto-attaches JWT token to every API call. Response interceptor handles 401 (session expiry → redirect to login). Cleaner API than native fetch for setting headers and handling errors. |
| `@radix-ui/themes` | 3.3.0 | Pre-built, accessible component library (Dialog, DropdownMenu, Badge, Card, Table, etc.) with built-in dark/light theme support. Chosen over Material UI (smaller bundle, no CSS-in-JS runtime) and Tailwind (provides complete components, not just utilities). |
| `@radix-ui/react-icons` | 1.3.2 | SVG icon set matching Radix design language. Lightweight (tree-shakeable), consistent visual style with Radix Themes components. |
| `html5-qrcode` | 2.3.8 | Camera-based QR code scanning for the attendance dashboard. Uses the browser's `getUserMedia` API. Chosen over `react-qr-reader` (unmaintained) and `zxing` (heavier bundle). Supports both rear and front cameras. |
| `react-toastify` | 11.0.5 | Toast notification system for success/error feedback on user actions (registration, follow, password change, etc.). Auto-dismiss, stackable, and customizable positioning. |
| `date-fns` | 4.1.0 | Lightweight date formatting utilities (tree-shakeable). Used for displaying event dates in human-readable format. Chosen over Moment.js (deprecated, large bundle) and Day.js (date-fns has better tree-shaking). |
| `@hcaptcha/vanilla-hcaptcha` | 1.1.4 | Official hCaptcha web component. Renders the CAPTCHA challenge widget. Vanilla (framework-agnostic) version chosen over React-specific wrappers for smaller bundle and simpler integration. |
| `vite` | 7.3.1 | Build tool and dev server. Near-instant HMR via native ES modules during development. Optimized production builds with Rollup. Chosen over Create React App (deprecated) and Webpack (slower, more config). |
| `@vitejs/plugin-react` | 5.1.1 | Vite plugin enabling JSX transform and React Fast Refresh (HMR for React components). |

---

## Setup & Installation Instructions

### Prerequisites
- **Node.js** v18 or higher
- **npm** (comes with Node.js)
- **MongoDB Atlas** account (free tier sufficient)
- **Gmail Account** with App Password (for email sending)

### 1. Clone & Install

```bash
# Install root dependencies (concurrently for running both servers)
npm install

# Install backend dependencies
cd backend
npm install

# Install frontend dependencies
cd ../frontend
npm install
```

### 2. Backend Configuration

```bash
cd backend
cp .env.example .env
```

Edit `backend/.env` with your values:

```env
PORT=5000
MONGO_URI=mongodb+srv://<user>:<pass>@<cluster>.mongodb.net/<dbname>
JWT_SECRET=<random-64-char-string>
ADMIN_EMAIL=admin@felicity.iiit.ac.in
ADMIN_PASSWORD=<strong-password>
FRONTEND_URL=http://localhost:5173

# Cloudinary (for file uploads)
CLOUDINARY_CLOUD_NAME=<your-cloud-name>
CLOUDINARY_API_KEY=<your-api-key>
CLOUDINARY_API_SECRET=<your-api-secret>

# SMTP (Gmail with App Password)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=<your-email>@gmail.com
SMTP_PASS=<your-app-password>
SMTP_FROM=noreply@felicity.com

# Optional: hCaptcha (skip for development)
HCAPTCHA_SECRET=<your-hcaptcha-secret>
```

### 3. Seed Admin Account

```bash
cd backend
npm run seed:admin
```

This creates the admin user with the email/password from `.env`. Must be run once before first use.

### 4. Frontend Configuration

```bash
cd frontend
cp .env.example .env
```

Edit `frontend/.env`:

```env
VITE_API_URL=http://localhost:5000
# Optional: hCaptcha site key
VITE_HCAPTCHA_SITE_KEY=<your-site-key>
```

### 5. Run Development Servers

```bash
# From the project root — starts both backend and frontend
npm run dev

# Or individually:
cd backend && npm run dev    # Backend on http://localhost:5000
cd frontend && npm run dev   # Frontend on http://localhost:5173
```

### Default Admin Credentials
- **Email:** `admin@felicity.iiit.ac.in`
- **Password:** As set in `ADMIN_PASSWORD` env variable during seeding

---

## Deployment

| Component | Platform | URL |
|-----------|----------|-----|
| Frontend | Vercel | See `deployment.txt` |
| Backend | Render | See `deployment.txt` |
| Database | MongoDB Atlas | Via `MONGO_URI` env var |

Environment variables are configured in each platform's dashboard (not committed to source).

---

## Marks Breakdown

| Section | Feature | Marks |
|---------|---------|-------|
| **Part 1** | Authentication & Security | 8 |
| | User Onboarding & Preferences | 3 |
| | User Data Models | 2 |
| | Event Types | 2 |
| | Event Attributes | 2 |
| | Participant Features & Navigation | 22 |
| | Organizer Features & Navigation | 18 |
| | Admin Features & Navigation | 6 |
| | Deployment | 5 |
| | **Subtotal** | **68** |
| **Part 2 — Tier A** | QR Scanner & Attendance Tracking | 8 |
| | Hackathon Team Registration | 8 |
| **Part 2 — Tier B** | Team Chat | 6 |
| | Organizer Password Reset Workflow | 6 |
| **Part 2 — Tier C** | Bot Protection (hCaptcha) | 2 |
| | **Subtotal** | **30** |
| | **Total** | **98** |
