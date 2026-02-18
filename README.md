# Felicity Event Management System

A centralized platform for IIIT Hyderabad's fest (Felicity) that enables clubs to conduct events smoothly and participants to register, track, and attend them.

## Technology Stack

- **MongoDB** – Database (MongoDB Atlas)
- **Express.js** – Backend framework implementing REST APIs
- **React** – Frontend (with Vite)
- **Node.js** – Runtime
- **Radix UI Themes** – Component library & styling

## Project Structure

```
├── backend/
│   ├── config/          # Database configuration
│   ├── controllers/     # Route handlers
│   ├── middleware/      # Auth & error handling
│   ├── models/          # Mongoose schemas
│   ├── routes/          # API routes
│   ├── scripts/         # Utility scripts (admin seeding)
│   ├── utils/           # Helper functions (email, QR, Discord)
│   └── server.js        # Entry point
├── frontend/
│   ├── src/
│   │   ├── api/         # Axios instance
│   │   ├── components/  # Reusable components
│   │   ├── context/     # Auth & Theme context
│   │   ├── pages/       # Page components
│   │   └── services/    # API service functions
│   └── ...
├── deployment.txt       # Deployment URLs
└── README.md
```

## Features Implemented

### Core Features (Part 1) - 70 Marks
- [x] User Authentication (JWT-based, bcrypt hashing)
- [x] Role-based Access Control (Participant, Organizer, Admin)
- [x] IIIT Email Domain Validation
- [x] Participant Registration & Login
- [x] User Onboarding & Preferences
- [x] Event Creation (4-step wizard: Draft → Publish)
- [x] Event Types: Normal, Team-based, Merchandise
- [x] Custom Form Builder for Events
- [x] Event Registration & Ticket Generation
- [x] QR Code Generation for Tickets
- [x] Browse Events with Search, Filters, Trending
- [x] Participant Dashboard (My Events)
- [x] Organizer Dashboard with Analytics
- [x] Admin Dashboard (Organizer Management)
- [x] Follow/Unfollow Organizers
- [x] Email Notifications (Nodemailer)
- [x] Dark/Light Theme Toggle

---

### Advanced Features (Part 2) - 30 Marks

#### Tier A: Core Advanced Features [16 Marks Total]

##### 1. QR Scanner & Attendance Tracking [8 Marks] ✅
**Files:** 
- `backend/controllers/attendanceController.js`
- `backend/models/Attendance.js`
- `frontend/src/pages/organizer/AttendanceDashboard.jsx`

**Features Implemented:**
- ✅ Real-time QR scanning using device camera (html5-qrcode library)
- ✅ Instant check-in confirmation with participant details display
- ✅ Duplicate scan detection with timestamp logging
- ✅ Live attendance dashboard with:
  - Total registered vs checked-in count
  - Real-time check-in percentage
  - Recent check-ins feed (auto-refresh every 10s)
  - Hourly check-in rate statistics
- ✅ Manual override check-in with mandatory reason logging
- ✅ Comprehensive audit trail (AttendanceAudit model)
- ✅ CSV export functionality (checked-in + optionally not-checked-in)
- ✅ Participant search for manual check-in

**Implementation Justification:**
- **html5-qrcode** chosen for cross-browser camera support without external SDK
- **Audit logging** ensures accountability and compliance for manual overrides
- **Real-time dashboard** (10s polling) helps organizers monitor event progress
- **CSV export** enables post-event analysis and reporting to stakeholders
- **Dual check-in methods** (QR + manual) handle edge cases like damaged screens

##### 2. Hackathon Team Registration [8 Marks] ✅
**Files:**
- `backend/models/Team.js`
- `backend/controllers/teamController.js`
- `backend/routes/teams.js`
- `frontend/src/pages/participant/TeamRegistration.jsx`
- `frontend/src/services/teamService.js`

**Features Implemented:**
- ✅ Team creation with unique 8-character alphanumeric invite codes
- ✅ Join team via invite code (simple shareable mechanism)
- ✅ Email invitations to team members (via Nodemailer)
- ✅ Team size validation (min/max based on event settings)
- ✅ Team leader role with elevated permissions
- ✅ Member status tracking (pending, confirmed, declined)
- ✅ Complete team registration generates tickets for ALL members
- ✅ Leave team functionality with automatic leader succession
- ✅ View team details and member list

**Implementation Justification:**
- **Invite codes** provide a simple, offline-shareable way to form teams
- **Email invitations** reach team members not yet registered on platform
- **Automatic ticket generation** ensures all team members get valid entry
- **Leader succession** (oldest member becomes leader) prevents orphaned teams
- **Status tracking** allows incomplete teams to still coordinate

---

#### Tier B: Real-time & Communication Features [12 Marks Total]

##### 1. Team Chat [6 Marks] ✅
**Files:**
- `backend/models/TeamChat.js`
- `backend/controllers/teamChatController.js`
- `backend/routes/teamChat.js`
- `frontend/src/pages/participant/TeamChat.jsx`
- `frontend/src/services/teamChatService.js`

**Features Implemented:**
- ✅ Real-time messaging with 3-second polling intervals
- ✅ Online/offline status indicators for team members
- ✅ Typing indicators when members compose messages
- ✅ Message editing and deletion (own messages only)
- ✅ Read receipts with unread count tracking
- ✅ Link/file sharing support (messageType: link/file)
- ✅ Clean chat UI with message bubbles and timestamps
- ✅ Participant avatars with initials

**Implementation Justification:**
- **Polling approach** (3s intervals) chosen over WebSockets for simplicity and reliability
- **Typing indicators** enhance the real-time feel without full socket complexity
- **Message edit/delete** gives users control, important for coordination
- **Read receipts** help team leaders know who has seen important updates
- **3-second interval** balances responsiveness with server load

##### 2. Organizer Password Reset Workflow [6 Marks] ✅
**Files:**
- `backend/controllers/adminController.js` (existing, enhanced)
- `frontend/src/pages/admin/PasswordRequests.jsx`
- `backend/models/Organizer.js` (passwordResetRequest field)

**Features Implemented:**
- ✅ Request submission by organizers (from login page or dashboard)
- ✅ Admin review queue with pending requests
- ✅ Approve request with admin-set new password
- ✅ Reject request with mandatory reason
- ✅ Email notifications to organizers on approval/rejection
- ✅ Request timestamps and status tracking

**Implementation Justification:**
- **Admin-controlled resets** prevent unauthorized password changes
- **Queue system** allows batch processing during admin work hours
- **Mandatory rejection reasons** provide feedback to organizers
- **Email notifications** ensure organizers know their request status
- **No self-service reset** is a security feature (organizers handle sensitive data)

---

#### Tier C: Integration & Enhancement Features [4 Marks Total]

##### 1. Bot Protection (CAPTCHA) [2 Marks] ✅
**Files:**
- `frontend/src/components/SimpleCaptcha.jsx`
- `frontend/src/pages/auth/Login.jsx` (integrated)
- `frontend/src/pages/auth/Register.jsx` (integrated)

**Features Implemented:**
- ✅ Math-based CAPTCHA (addition, subtraction, multiplication)
- ✅ Random problem generation with varying difficulty
- ✅ Auto-refresh after 3 failed attempts
- ✅ 2-minute verification timeout (auto-expires)
- ✅ Visual feedback on verification success
- ✅ Submit button disabled until CAPTCHA verified

**Implementation Justification:**
- **Math CAPTCHA** chosen over Google reCAPTCHA to avoid external dependencies and privacy concerns
- **Varying operators** (×, +, −) prevent simple pattern memorization
- **Auto-regeneration** after failed attempts thwarts brute force
- **2-minute timeout** balances security with user convenience
- **Simple design** maintains good UX while effectively blocking bots
- **No external API calls** means faster page loads and no third-party tracking

##### 2. Discord Webhook Integration [2 Marks] ✅
**Files:**
- `backend/utils/discord.js`
- `backend/controllers/organizerController.js` (integrated)

**Features Implemented:**
- ✅ Automatic event posting to Discord channel on publish
- ✅ Rich embed formatting with event details
- ✅ Event type, date, venue, and registration info
- ✅ Direct link to event page

**Implementation Justification:**
- **Webhook-based** approach requires no bot or OAuth — simple HTTP POST
- **Auto-triggered** on event publish ensures consistent promotion
- **Rich embeds** provide a polished appearance in Discord channels
- **Zero user action required** — seamless integration

---

## Libraries & Frameworks

### Backend
| Library | Purpose |
|---------|---------|
| express v5 | Web framework for REST APIs |
| mongoose | MongoDB ODM for data modeling |
| bcryptjs | Password hashing (security requirement) |
| jsonwebtoken | JWT authentication |
| cors | Cross-origin resource sharing |
| dotenv | Environment variable management |
| nodemailer | Sending ticket/notification emails |
| qrcode | QR code generation for tickets |
| json2csv | CSV export for attendance reports |
| axios | HTTP requests (Discord webhook, CAPTCHA verification) |

### Frontend
| Library | Purpose |
|---------|---------|
| react 18 | UI library |
| react-router-dom v6 | Client-side routing |
| axios | HTTP client for API calls |
| vite | Build tool & dev server |
| @radix-ui/themes | Component library & design system |
| @radix-ui/react-icons | Icon library |
| html5-qrcode | QR code scanner for check-in |
| react-toastify | Toast notifications |
| date-fns | Date formatting utilities |

---

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register participant
- `POST /api/auth/login` - Login (participant/admin)
- `POST /api/auth/organizer/login` - Organizer login
- `GET /api/auth/me` - Get current user

### Events
- `GET /api/events` - List events (with pagination, search, filters)
- `GET /api/events/trending` - Get trending events
- `GET /api/events/:id` - Get event details
- `POST /api/events` - Create event (organizer only)
- `PUT /api/events/:id` - Update event
- `POST /api/events/:id/register` - Register for event
- `DELETE /api/events/:id/cancel-registration` - Cancel registration

### Organizers
- `GET /api/organizers` - List all active organizers
- `GET /api/organizers/:id` - Get organizer details
- `POST /api/organizers/:id/follow` - Toggle follow organizer

### Teams (Advanced Feature)
- `POST /api/teams` - Create team
- `GET /api/teams/my-teams` - Get user's teams
- `GET /api/teams/invite/:code` - Get team by invite code
- `POST /api/teams/join` - Join team via code
- `POST /api/teams/:id/invite` - Invite member by email
- `POST /api/teams/:id/respond-invite` - Accept/decline invite
- `POST /api/teams/:id/complete-registration` - Complete registration
- `DELETE /api/teams/:id/leave` - Leave team

### Team Chat (Advanced Feature)
- `GET /api/team-chat/:teamId/messages` - Get messages (paginated)
- `POST /api/team-chat/:teamId/messages` - Send message
- `PUT /api/team-chat/:teamId/messages/:id` - Edit message
- `DELETE /api/team-chat/:teamId/messages/:id` - Delete message
- `POST /api/team-chat/:teamId/mark-read` - Mark as read
- `GET /api/team-chat/:teamId/unread-count` - Get unread count
- `POST /api/team-chat/:teamId/typing` - Update typing status
- `GET /api/team-chat/:teamId/online-users` - Get online users

### Attendance (Advanced Feature)
- `POST /api/attendance/:eventId/scan` - QR check-in
- `POST /api/attendance/:eventId/manual-checkin` - Manual check-in
- `GET /api/attendance/:eventId/dashboard` - Live dashboard data
- `GET /api/attendance/:eventId/export-csv` - Export CSV
- `GET /api/attendance/:eventId/audit-logs` - Get audit logs
- `GET /api/attendance/:eventId/search` - Search participants

### Admin
- `GET /api/admin/dashboard` - Platform statistics
- `GET /api/admin/organizers` - List all organizers
- `POST /api/admin/organizers` - Create organizer
- `PUT /api/admin/organizers/:id/status` - Update status
- `GET /api/admin/password-requests` - Get reset requests
- `POST /api/admin/password-requests/:id/approve` - Approve reset
- `POST /api/admin/password-requests/:id/reject` - Reject reset

---

## Setup Instructions

### Prerequisites
- Node.js (v18+)
- MongoDB Atlas account
- npm

### Backend Setup

```bash
cd backend
npm install
cp .env.example .env
# Edit .env with your credentials
npm run seed:admin
npm run dev
```

### Frontend Setup

```bash
cd frontend
npm install
cp .env.example .env
# Edit VITE_API_URL if needed
npm run dev
```

### Default Admin Credentials
- **Email:** admin@felicity.iiit.ac.in
- **Password:** admin123

---

## Marks Summary

| Feature | Marks | Status |
|---------|-------|--------|
| Part 1: Core Features | 70 | ✅ Complete |
| Tier A: QR Attendance | 8 | ✅ Complete |
| Tier A: Team Registration | 8 | ✅ Complete |
| Tier B: Team Chat | 6 | ✅ Complete |
| Tier B: Password Reset | 6 | ✅ Complete |
| Tier C: Bot Protection | 2 | ✅ Complete |
| Tier C: Discord Integration | 2 | ✅ Complete |
| **Total** | **100** | **✅** |

---

## License

ISC - Created for DAAS Assignment 1 at IIIT Hyderabad
