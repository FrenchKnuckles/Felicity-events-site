# Felicity Event Management System

A centralized platform for IIIT Hyderabad's annual fest **Felicity** that replaces the chaos of Google Forms, spreadsheets, and WhatsApp groups with a unified system where clubs can conduct events smoothly and participants can register, track, and attend them. Built as part of the Design & Analysis of Software Systems (DAAS) course — Assignment 1.

---

## Documentation Overview

This README has been carefully structured to satisfy the project requirements:

1. **Library & Framework Justification** – every frontend and backend dependency is listed with a rationale in the "Technology Stack" section below, and advanced features sections further explain major packages used for those features.
2. **Advanced Features (Tier A/B/C)** – the implementation of each required tier feature is documented with justification for its selection, design decisions, and technical approach under the corresponding headings later in this file.
3. **Setup & Installation Instructions** – step‑by‑step guidance for running the entire project locally is provided near the end of this document.

Refer to the `backend/README.md` and `frontend/README.md` files for additional file‑level details, but the core requirements above are covered right here.

---

---

## Technology Stack

The project is split into a backend API and a React frontend. Below are the principal libraries and frameworks used in each layer along with the rationale for their inclusion.

### Backend libraries (npm modules)

- **express** – lightweight web framework, version 5 gives native async error forwarding
- **mongoose** – MongoDB ODM for schema enforcement, population, and aggregation pipelines
- **bcryptjs** – pure-JS password hashing (avoids build issues with native bcrypt)
- **jsonwebtoken** – JWT creation/verification for stateless auth
- **cors** – enables CORS only for the frontend origin
- **dotenv** – environment variable loader for 12‑factor configuration
- **nodemailer** – SMTP client used to send ticket/notification emails
- **qrcode** – generates QR codes as data URLs embedded in tickets/emails
- **json2csv** – formats JSON to CSV for exports
- **axios** – HTTP client used in controllers (Discord webhooks, CAPTCHA verification)
- **multer** – handles multipart file uploads in the Cloudinary proxy
- **socket.io** – real‑time messaging infrastructure for the discussion forum
- **nodemon** (dev) – restarts server during development

### Frontend libraries (npm modules)

- **react** – component-based UI library
- **react-dom** – DOM renderer for React
- **react-router-dom** – client-side routing for SPA navigation
- **axios** – HTTP client with interceptors for JWT
- **@radix-ui/themes** – UI component library with built‑in theming
- **@radix-ui/react-icons** – SVG icons matching Radix design
- **html5-qrcode** – camera QR scanning for attendance dashboard
- **react-toastify** – toast notification system
- **date-fns** – lightweight date utility functions with tree-shaking
- **@hcaptcha/vanilla-hcaptcha** – web component for hCaptcha widget
- **socket.io-client** – client library to connect to backend Socket.IO server
- **vite** – build tool and dev server for frontend
- **@vitejs/plugin-react** – JSX transform and fast refresh support

(see backend/README.md and frontend/README.md for file‑level documentation and additional dependencies used by specific modules)

## Project Structure

```
├── backend/                 # Express REST API server
│   ├── config/              # Database connection
│   ├── controllers/         # Route handler logic (6 controllers)
│   ├── middleware/          # Auth guards, error handling
│   ├── models/              # Mongoose schemas (6 models)
│   ├── routes/              # API endpoint definitions (5 route files)
│   ├── utils/               # Email (lazy init), QR, Discord, CAPTCHA helpers
│   ├── scripts/             # Admin seed script
│   └── server.js            # Application entry point
│
├── frontend/                # React SPA (Vite)
│   └── src/
│       ├── api/             # Axios instance with auth interceptor
│       ├── components/      # Navbar, ProtectedRoute, CAPTCHA
│       ├── context/         # AuthContext, ThemeContext
│       ├── pages/           # 15 page components (auth/events/participant/organizer/admin)
│       └── services/        # API service abstractions (5 service files)
│
├── deployment.txt           # Production URLs
└── README.md                # This file
```

> Detailed file-level documentation with per-file descriptions, connections, and responsibilities is available in [`backend/README.md`](backend/README.md) and [`frontend/README.md`](frontend/README.md).

---

## Core Features Implemented (Part 1)

### Authentication & Security
- **Registration:** IIIT participants must use `@*.iiit.ac.in` emails (domain validated server-side). Non-IIIT participants register with any email. Organizer accounts are admin-provisioned only.
- **Password Security:** All passwords hashed with bcrypt (10 salt rounds) via a Mongoose pre-save hook. No plaintext storage.
- **JWT Authentication:** All protected routes require a valid JWT (30-day expiry) in the `Authorization` header. Token stored in localStorage for session persistence across browser restarts.

### Event Types
- **Normal Event:** Individual registration with optional custom form. Workshops, talks, competitions.
- **Merchandise Event:** Item purchase with variant support (size, color, stock). Payment proof upload required; orders enter "pending" state for organizer approval. Stock decremented only on approval. Configurable per-participant purchase limit.

## Advanced Features Implemented
### Tier A — Feature 1: QR Scanner & Attendance Tracking

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

### Tier A — Feature 2: Merchandise Payment Approval Workflow

**Why this feature:** Merchandise sales during a fest involve real money — teams selling t-shirts, hoodies, and accessories need to verify payments before committing stock. An auto-approve system would result in unpaid orders depleting inventory. This workflow gives organizers full control: participants upload payment proof, organizers verify and approve/reject, and stock is only decremented on approval.

**Key Files:**
- `backend/controllers/eventController.js` — `purchaseMerchandise` (creates pending order with payment proof)
- `backend/controllers/organizerController.js` — `getMerchandiseOrders`, `approveMerchandiseOrder`, `rejectMerchandiseOrder`
- `backend/routes/organizers.js` — 3 organizer-protected merchandise order endpoints
- `backend/models/Ticket.js` — `paymentStatus` (pending/approved/rejected/not-required), `paymentProofUrl`, `status` fields
- `frontend/src/pages/events/EventDetails.jsx` — Payment proof upload UI, order status display
- `frontend/src/pages/organizer/OrganizerEventDetail.jsx` — Merchandise Orders tab with approve/reject actions
- `frontend/src/services/organizerService.js` — Merchandise order API methods

**Implementation Details:**

1. **Participant Purchase Flow**
   - Participant selects a variant (size/color) and uploads a payment screenshot (UPI, bank transfer, etc.)
   - Image uploaded to Cloudinary; `paymentProofUrl` stored with the ticket
   - Ticket created with `status: "pending"` and `paymentStatus: "pending"` — no QR generated, no stock decremented
   - Participant sees "Order Pending Approval" badge on the event page

2. **Organizer Review Dashboard**
   - New "Merchandise Orders" tab in the organizer event detail page (only for merchandise events)
   - Summary cards showing counts: Pending, Approved, Rejected, Cancelled
   - Filterable order table with buyer info, variant, amount, payment proof thumbnail, status, and date
   - Each row has Approve/Reject action buttons (only for pending orders)

3. **Approval Flow**
   - Organizer clicks "Approve" → backend validates order is still pending
   - Stock decremented atomically for the selected variant (with insufficient stock check)
   - QR code generated with ticket data, `status` set to "confirmed", `paymentStatus` set to "approved"
   - Confirmation email sent to participant with ticket details and QR code
   - Revenue updated on the event

4. **Rejection Flow**
   - Organizer clicks "Reject" → `status` set to "rejected", `paymentStatus` set to "rejected"
   - `registrationCount` decremented on the event
   - Participant sees "Rejected" badge and message to contact organizer

5. **Stock Management**
   - Stock is NOT decremented at purchase time — only on organizer approval
   - Prevents stock depletion from unverified/fraudulent orders
   - If stock becomes insufficient between order and approval, the approve action fails with a clear error

**Design Decisions:**
- Payment proof as image upload (Cloudinary) rather than integrated payment gateway — most fest clubs use UPI/bank transfers, not card payments. Image proof is the standard verification method.
- Stock decrement deferred to approval — prevents race conditions where unpaid orders lock up inventory
- No auto-expiry on pending orders — organizers manually manage their queue, which matches the small-scale nature of fest merchandise

---

### Tier B — Feature 1: Organizer Password Reset Workflow

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

### Tier B — Feature 2: Real-Time Discussion Forum

**Why this feature:** Events often generate questions, clarifications, and informal discussion that isn't captured through registration data. A built‑in forum keeps participants engaged, allows organisers to moderate conversations, and replaces ad‑hoc group chats or external platforms. Implementing it as a Tier B feature ensures a usable base product while still demonstrating real‑time capabilities and moderation tools.

**Key Files:**
- `backend/models/Message.js` — Forum message schema with threading, reactions, attachments, and announcement flags
- `backend/controllers/forumController.js` — CRUD and moderation endpoints plus participant verification logic
- `backend/utils/socket.js` — Socket.IO setup handling room joins, typing, online users, and event broadcasting
- `frontend/src/pages/events/DiscussionForum.jsx` — React component rendering the forum on the Event Details page
- `frontend/src/services/eventService.js` — new service methods for the forum API
- `frontend/src/pages/events/EventDetails.jsx` — integrates the discussion component conditionally for registered users/organizers

**Implementation Details:**
1. **Access Control:** Participants must own a ticket for the event; organizers have full access. Middleware enforces on GET/POST. Messaging endpoints live under `/api/events/:id/forum`.
2. **Real-Time Delivery:** Socket.IO rooms named `event_<id>` broadcast events: `newMessage`, `messageDeleted`, `messagePinned`, `messageReacted`, `userTyping`, `userStopTyping`, and `onlineUsers`.
3. **Threading:** Messages can reference a `parentId`; replies are indented when rendered. Messages without parents are top-level.
4. **Moderation:** Organizers can pin/unpin and delete any message; participants may delete their own. Pinned messages render at the top and display a pin icon.
5. **Reactions & Notifications:** Users toggle a 👍 reaction; counts are shown and updated live. Incoming messages from others trigger toast notifications to keep users aware.
6. **Typing & Presence:** Typing indicators show the first names of users currently typing. An online count is displayed and kept in sync via server state.
7. **Attachments:** Users may upload a file via the Cloudinary proxy (`/api/upload`) or paste a URL; attachments display as clickable links below a message.

**Design Decisions:**
- Socket.IO chosen for real-time because it was already added for Tier A? (no, implementation added now), offers easy room management and fallback transports.
- A simple in-browser file upload suffices; further enhancements like image previews or size limits can be added later.
- Emoji reactions limited to thumbs-up to keep the interface lightweight; schema supports more in future.
- Using the existing Axios instance for uploads ensures auth token is sent.

---

### Tier C — Bot Protection (hCaptcha)

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