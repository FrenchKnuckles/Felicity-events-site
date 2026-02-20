# Felicity Backend — API Server

Express.js REST API powering the Felicity Event Management System. Handles authentication, event management, team coordination, attendance tracking, and all business logic.

## File Structure

```
backend/
├── server.js                    # Application entry point
├── package.json                 # Dependencies & scripts
├── .env.example                 # Environment variable template
│
├── config/
│   └── db.js                    # MongoDB connection setup
│
├── controllers/
│   ├── authController.js        # Authentication & user management
│   ├── eventController.js       # Events, registration, merchandise
│   ├── organizerController.js   # Organizer profile & event ops
│   ├── adminController.js       # Admin panel operations
│   ├── teamController.js        # Hackathon team management
│   ├── teamChatController.js    # Team messaging system
│   └── attendanceController.js  # QR scanning & check-in
│
├── middleware/
│   ├── auth.js                  # JWT auth & role authorization
│   ├── error.js                 # Error handling & async wrapper
│   └── index.js                 # Barrel exports
│
├── models/
│   ├── User.js                  # User accounts (all roles)
│   ├── Event.js                 # Events with form builder schema
│   ├── Ticket.js                # Registration tickets & QR codes
│   ├── Organizer.js             # Club/organizer profiles
│   ├── Team.js                  # Hackathon teams & invites
│   ├── TeamChat.js              # Chat rooms & messages
│   ├── Attendance.js            # Check-in records & audit logs
│   └── PasswordResetRequest.js  # Organizer password reset queue
│
├── routes/
│   ├── auth.js                  # /api/auth/*
│   ├── events.js                # /api/events/*
│   ├── organizers.js            # /api/organizers/*
│   ├── admin.js                 # /api/admin/*
│   ├── teams.js                 # /api/teams/*
│   ├── teamChat.js              # /api/team-chat/*
│   ├── attendance.js            # /api/attendance/*
│   └── index.js                 # Barrel exports
│
├── utils/
│   ├── email.js                 # SMTP email sender (Nodemailer)
│   ├── ticket.js                # Ticket ID & QR code generation
│   ├── discord.js               # Discord webhook posting
│   ├── captcha.js               # CAPTCHA verification middleware
│   └── constants.js             # Predefined interest categories
│
└── scripts/
    └── seedAdmin.js             # One-time admin account creation
```

---

## File Descriptions

### Root Files

#### `server.js`
Application entry point. Initializes Express v5, connects to MongoDB via `config/db.js`, sets up CORS (restricts to `FRONTEND_URL`), JSON body parsing (10 MB limit), and mounts all 7 route groups under `/api`. Also contains an inline Cloudinary proxy endpoint (`POST /api/upload`) using Multer for memory-based file handling — the frontend sends files here, and the server forwards them to Cloudinary so that API keys stay server-side.

**Connects to:** `config/db.js`, all `routes/*.js`, `middleware/index.js`

#### `package.json`
ES module project (`"type": "module"`). Scripts: `start` (production), `dev` (nodemon auto-restart), `seed:admin` (initial admin setup).

---

### `config/`

#### `db.js`
Establishes MongoDB connection using Mongoose. Reads `MONGO_URI` from environment variables. Logs connection host on success, exits process on failure.

**Connects to:** `server.js` (imported at startup)

---

### `controllers/`

#### `authController.js`
Handles user registration, login, profile retrieval, preference updates, profile editing, and password changes.

- `registerParticipant` — Validates IIIT email domain (`@*.iiit.ac.in`), hashes password with bcrypt, creates User document, returns JWT
- `loginUser` — Authenticates against email/password, checks organizer active status, returns JWT + user data with role
- `getMe` — Returns authenticated user's profile (populates followed organizers)
- `updatePreferences` — Saves areas of interest and followed organizer selections (onboarding)
- `updateProfile` — Edits name, contact number, college (email & role are immutable)
- `changePassword` — Verifies current password before updating to new hashed password

**Uses:** `models/User.js`, `models/Organizer.js`, `middleware/auth.js` (generateToken), `utils/captcha.js`

#### `eventController.js`
Public event browsing, search, registration, merchandise purchase, and ticket management.

- `getEvents` — Paginated listing with text search (MongoDB `$text`), filters (type, eligibility, date range, followed organizers), preference-based sorting for authenticated users
- `getTrendingEvents` — Aggregates ticket counts from last 24 hours, returns top 5 events
- `getEventById` — Full event details with organizer name populated
- `registerForEvent` — Validates eligibility, deadline, capacity; processes custom form responses; generates ticket with QR code; sends confirmation email; increments registration count
- `purchaseMerchandise` — Validates variant stock; decrements stock atomically; generates ticket; sends email
- `getMyEvents` — All tickets for authenticated user (upcoming/past/cancelled)
- `getTicketById` — Single ticket details with event info
- `cancelRegistration` — Marks ticket cancelled, decrements registration count, restores merchandise stock

**Uses:** `models/Event.js`, `models/Ticket.js`, `models/User.js`, `models/Organizer.js`, `utils/ticket.js`, `utils/email.js`

#### `organizerController.js`
Organizer self-service: profile management, event CRUD, analytics, and public organizer listing.

- `getOrganizerProfile / updateOrganizerProfile` — Read/write organizer details (name, category, description, contact, Discord webhook)
- `getOrganizerEvents` — Lists all events by this organizer, filterable by status
- `getOngoingEvents` — Events with status "ongoing" (for nav quick-access)
- `createEvent` — Creates event as "draft" linked to organizer's ID
- `updateEvent` — Status-dependent editing rules: Draft (free edit), Published (limited to description/deadline/limit/status), Ongoing/Completed (status change only)
- `publishEvent` — Transitions draft → published, triggers Discord webhook post if configured
- `getEventParticipants` — Paginated participant list with search, populates user details and team info
- `exportParticipantsCSV` — Generates CSV with all ticket data including custom form responses
- `getOrganizerAnalytics` — Aggregate stats: total events by status, registrations, revenue, attendance rates
- `deleteEvent` — Removes draft events only
- `listOrganizers` — Public endpoint returning all active organizers with follower/event counts
- `getOrganizerById` — Public endpoint returning organizer details with upcoming and past events
- `toggleFollowOrganizer` — Adds/removes user from organizer's followers array and vice versa

**Uses:** `models/Organizer.js`, `models/Event.js`, `models/Ticket.js`, `models/User.js`, `models/PasswordResetRequest.js`, `utils/discord.js`

#### `adminController.js`
Admin-only operations: organizer account management, password reset processing, platform statistics.

- `createOrganizer` — Creates User (role: organizer) + Organizer profile, auto-generates password, returns credentials
- `getAllOrganizers` — Lists all organizers with event counts (aggregate pipeline)
- `updateOrganizer` — Updates organizer profile fields
- `removeOrganizer` — Soft disable (sets `isActive: false`) or hard delete (cascades to events, tickets)
- `enableOrganizer` — Reactivates disabled organizer
- `resetOrganizerPassword` — Admin sets new password for organizer
- `getPasswordResetRequests` — Queue of organizer-submitted reset requests
- `processPasswordResetRequest` — Approve (auto-generate password) or reject (with reason)
- `getAdminStats` — Platform-wide stats: user counts, event counts, revenue totals
- `getRecentEvents / getAllEventsAdmin` — Event listings for admin oversight
- `deleteEventAdmin` — Force-delete any event (cascades tickets)

**Uses:** `models/User.js`, `models/Organizer.js`, `models/Event.js`, `models/Ticket.js`, `models/PasswordResetRequest.js`

#### `teamController.js`
Hackathon team lifecycle: creation, joining, invitations, completion.

- `createTeam` — Creates team with auto-generated 8-char invite code, leader auto-joined, creates empty TeamChat room
- `joinTeam` — Join via invite code, validates team capacity and event eligibility
- `inviteMember` — Sends email invitation with invite code to specified email address
- `respondToInvite` — Accept or decline a pending team invitation
- `completeTeamRegistration` — Leader-only action; validates min team size; generates tickets + QR codes for all accepted members; sends confirmation emails
- `getTeam` — Team details with member info
- `getMyTeams` — All teams the authenticated user belongs to
- `leaveTeam` — Removes member; if leader leaves, oldest member becomes new leader; last member deletion cancels team

**Uses:** `models/Team.js`, `models/TeamChat.js`, `models/Event.js`, `models/Ticket.js`, `models/User.js`, `utils/ticket.js`, `utils/email.js`

#### `teamChatController.js`
Polling-based real-time messaging for hackathon teams.

- `getChatMessages` — Paginated message history, auto-marks as read
- `sendMessage` — Appends message to chat document, updates last activity timestamp
- `editMessage / deleteMessage` — Modify own messages only
- `markAsRead` — Marks all messages as read for the requesting user
- `getUnreadCount` — Count of messages not yet read by user
- `updateTypingStatus / getTypingUsers` — Typing indicator management
- `updateOnlineStatus / getOnlineUsers` — Presence tracking

**Uses:** `models/TeamChat.js`, `models/Team.js`

#### `attendanceController.js`
QR-based and manual check-in system with audit trail.

- `scanQRCheckIn` — Parses QR code JSON (ticketId, eventId, userId), validates ticket ownership, rejects duplicate scans (logs attempt count), creates Attendance record with audit entry
- `manualCheckIn` — Search-based check-in requiring a reason (min 10 characters) for audit trail
- `getAttendanceDashboard` — Real-time stats: total registered, checked-in count, percentage, hourly breakdown, recent check-ins
- `exportAttendanceCSV` — CSV with participant details, check-in time, method; optional inclusion of not-checked-in participants
- `getAuditLogs` — Paginated audit trail with action details
- `searchParticipant` — Find participants by name/email for manual check-in

**Uses:** `models/Attendance.js` (Attendance + AttendanceAudit), `models/Ticket.js`, `models/Event.js`, `models/User.js`

---

### `middleware/`

#### `auth.js`
JWT authentication and role-based authorization middleware.

- `protect` — Extracts JWT from `Authorization: Bearer <token>` header, verifies and decodes, attaches `req.user`
- `optionalAuth` — Same as protect but does not reject unauthenticated requests (used for preference-based sorting)
- `authorize(...roles)` — Role whitelist check (e.g., `authorize("admin")`)
- `authenticateParticipant` — Combines protect + participant role check
- `authenticateOrganizer` — Protect + organizer role check + verifies organizer profile exists and is active
- `generateToken(userId)` — Creates JWT with 30-day expiry

**Uses:** `models/User.js`, `models/Organizer.js`, `jsonwebtoken`

#### `error.js`
Error handling utilities.

- `wrap(fn)` — Async handler wrapper that catches rejected promises and forwards to Express error handler (removes need for try/catch in controllers)
- `errorHandler` — Centralized error middleware handling Mongoose CastError (invalid ObjectId), duplicate key errors (11000), and validation errors
- `notFound` — Catches unmatched routes and returns 404

#### `index.js`
Barrel file re-exporting `errorHandler` and `notFound` for clean imports in `server.js`.

---

### `models/`

#### `User.js`
User account for all three roles (participant, organizer, admin).

**Key Fields:** `firstName`, `lastName`, `email` (unique), `password` (bcrypt-hashed, excluded from queries by default via `select: false`), `role` (participant/organizer/admin), `participantType` (iiit/non-iiit), `collegeOrg`, `contactNumber`, `areasOfInterest[]`, `followedOrganizers[]` (refs Organizer), `organizerId` (ref Organizer — links organizer user to their profile)

**Pre-save Hook:** Automatically hashes password on change using bcrypt (salt rounds: 10).
**Instance Method:** `matchPassword(entered)` — Compares plaintext against stored hash.

#### `Event.js`
Event document supporting three types plus dynamic form builder.

**Key Fields:** `name`, `description`, `eventType` (normal/merchandise/hackathon), `eligibility` (all/iiit-only/non-iiit-only), `registrationDeadline`, `startDate`, `endDate`, `venue`, `registrationLimit`, `registrationFee`, `organizerId` (ref Organizer), `tags[]`, `status` (draft → published → ongoing → completed → closed)

**Team Settings:** `allowTeamRegistration`, `minTeamSize`, `maxTeamSize`, `registrationType` (individual/team/both)
**Form Builder:** `customForm[]` — embedded subdocuments with `fieldName`, `fieldType` (9 types: text, textarea, dropdown, checkbox, radio, file, number, email, date), `label`, `placeholder`, `required`, `options[]`, `order`. `formLocked` prevents edits after first registration.
**Merchandise:** `variants[]` (size, color, stock, price), `purchaseLimitPerUser`
**Analytics:** `registrationCount`, `revenue`, `last24hRegistrations`

**Indexes:** Text index on `name`, `description`, `tags` for full-text search.

#### `Ticket.js`
Registration/purchase records with QR codes.

**Key Fields:** `ticketId` (unique, format `FEL-<base36timestamp>-<random>`), `eventId`, `userId`, `teamId` (optional), `formResponses` (Map — stores custom form answers), `variant` (size/color for merchandise), `quantity`, `paymentStatus`, `status` (confirmed/pending/cancelled/rejected), `attended` (boolean), `attendanceTimestamp`, `qrCode` (base64 data URL), `amount`

#### `Organizer.js`
Club/organization profile linked to a User account.

**Key Fields:** `name`, `category` (cultural/technical/sports/other), `description`, `contactEmail`, `contactNumber`, `logo`, `discordWebhook`, `userId` (ref User), `isActive` (for soft-delete), `followers[]` (ref User)

#### `Team.js`
Hackathon team with invite-based member management.

**Key Fields:** `name`, `eventId`, `leaderId`, `members[]` (embedded: `userId`, `status` pending/accepted/rejected, `joinedAt`), `inviteCode` (unique 8-char alphanumeric), `maxSize`, `minSize`, `status` (forming/complete/incomplete/cancelled), `isRegistrationComplete`

**Static Method:** `generateInviteCode()` — Creates unique 8-character code with collision check.

#### `TeamChat.js`
Chat room per team with embedded messages.

**Key Fields:** `team` (ref, unique — one chat per team), `messages[]` (embedded: `sender`, `content`, `messageType` text/link/file, `fileUrl/fileName/fileSize`, `isEdited`, `readBy[]`), `lastActivity`, `typingUsers[]`, `onlineUsers[]`

**Instance Methods:** `addMessage()`, `markAsRead()`, `getUnreadCount(userId)`

#### `Attendance.js`
Check-in records with audit trail (two models in one file).

**Attendance Fields:** `event`, `ticket`, `participant`, `checkInTime`, `checkInMethod` (qr_scan/manual_override/file_upload), `scannedBy`, `overrideReason`, `deviceInfo`, `duplicateScanAttempts[]`
**Compound Unique Index:** `(event, ticket)` — prevents duplicate check-ins.
**Static Method:** `getEventStats(eventId)` — Returns aggregated check-in statistics.

**AttendanceAudit Fields:** `attendance`, `action`, `performedBy`, `details`, `ip`

#### `PasswordResetRequest.js`
Organizer password reset queue managed by admin.

**Key Fields:** `organizerId`, `userId`, `reason`, `status` (pending/approved/rejected), `adminComment`, `processedAt`, `processedBy`

---

### `routes/`

Each route file defines Express Router endpoints and applies appropriate middleware.

#### `auth.js`
| Method | Endpoint | Middleware | Handler |
|--------|----------|------------|---------|
| POST | `/register` | captcha | `registerParticipant` |
| POST | `/login` | captcha | `loginUser` |
| GET | `/me` | protect | `getMe` |
| PUT | `/preferences` | protect | `updatePreferences` |
| PUT | `/profile` | protect | `updateProfile` |
| PUT | `/password` | protect | `changePassword` |

#### `events.js`
| Method | Endpoint | Middleware | Handler |
|--------|----------|------------|---------|
| GET | `/interests` | — | `getInterestsOptions` |
| GET | `/trending` | — | `getTrendingEvents` |
| GET | `/user/my-events` | protect | `getMyEvents` |
| GET | `/tickets/:ticketId` | protect | `getTicketById` |
| GET | `/` | optionalAuth | `getEvents` |
| GET | `/:id` | optionalAuth | `getEventById` |
| POST | `/:id/register` | protect, participant | `registerForEvent` |
| POST | `/:id/purchase` | protect, participant | `purchaseMerchandise` |
| PUT | `/tickets/:ticketId/cancel` | protect | `cancelRegistration` |

#### `organizers.js`
| Method | Endpoint | Middleware | Handler |
|--------|----------|------------|---------|
| GET | `/me/profile` | protect, organizer | `getOrganizerProfile` |
| PUT | `/me/profile` | protect, organizer | `updateOrganizerProfile` |
| GET | `/me/events/ongoing` | protect, organizer | `getOngoingEvents` |
| GET | `/me/events` | protect, organizer | `getOrganizerEvents` |
| POST | `/me/events` | protect, organizer | `createEvent` |
| GET | `/me/events/:id` | protect, organizer | `getOrganizerEventById` |
| PUT | `/me/events/:id` | protect, organizer | `updateEvent` |
| DELETE | `/me/events/:id` | protect, organizer | `deleteEvent` |
| PUT | `/me/events/:id/publish` | protect, organizer | `publishEvent` |
| GET | `/me/events/:id/participants` | protect, organizer | `getEventParticipants` |
| GET | `/me/events/:id/export-csv` | protect, organizer | `exportParticipantsCSV` |
| GET | `/me/events/:id/analytics` | protect, organizer | `getEventAnalytics` |
| GET | `/me/analytics` | protect, organizer | `getOrganizerAnalytics` |
| POST | `/me/request-password-reset` | protect, organizer | `requestPasswordReset` |
| GET | `/` | optionalAuth | `listOrganizers` |
| GET | `/:id` | — | `getOrganizerById` |
| POST | `/:id/follow` | protect, participant | `toggleFollowOrganizer` |

#### `admin.js`
| Method | Endpoint | Middleware | Handler |
|--------|----------|------------|---------|
| GET | `/stats` | protect, admin | `getAdminStats` |
| GET | `/events/recent` | protect, admin | `getRecentEvents` |
| GET | `/events` | protect, admin | `getAllEventsAdmin` |
| DELETE | `/events/:id` | protect, admin | `deleteEventAdmin` |
| POST | `/organizers` | protect, admin | `createOrganizer` |
| GET | `/organizers` | protect, admin | `getAllOrganizers` |
| GET | `/organizers/:id` | protect, admin | `getOrganizerById` |
| PUT | `/organizers/:id` | protect, admin | `updateOrganizer` |
| DELETE | `/organizers/:id` | protect, admin | `removeOrganizer` |
| PUT | `/organizers/:id/enable` | protect, admin | `enableOrganizer` |
| PUT | `/organizers/:id/reset-password` | protect, admin | `resetOrganizerPassword` |
| GET | `/password-requests` | protect, admin | `getPasswordResetRequests` |
| PUT | `/password-requests/:id` | protect, admin | `processPasswordResetRequest` |

#### `teams.js`
| Method | Endpoint | Middleware | Handler |
|--------|----------|------------|---------|
| POST | `/` | protect, participant | `createTeam` |
| GET | `/my-teams` | protect, participant | `getMyTeams` |
| GET | `/invite/:inviteCode` | protect, participant | `getTeamByInviteCode` |
| POST | `/join/:inviteCode` | protect, participant | `joinTeam` |
| GET | `/:teamId` | protect, participant | `getTeam` |
| POST | `/:teamId/invite` | protect, participant | `inviteMember` |
| POST | `/:teamId/respond-invite` | protect, participant | `respondToInvite` |
| POST | `/:teamId/complete-registration` | protect, participant | `completeTeamRegistration` |
| DELETE | `/:teamId/leave` | protect, participant | `leaveTeam` |

#### `teamChat.js`
| Method | Endpoint | Middleware | Handler |
|--------|----------|------------|---------|
| GET | `/:teamId/messages` | protect, participant | `getChatMessages` |
| POST | `/:teamId/messages` | protect, participant | `sendMessage` |
| PUT | `/:teamId/messages/:messageId` | protect, participant | `editMessage` |
| DELETE | `/:teamId/messages/:messageId` | protect, participant | `deleteMessage` |
| POST | `/:teamId/mark-read` | protect, participant | `markAsRead` |
| GET | `/:teamId/unread-count` | protect, participant | `getUnreadCount` |
| POST | `/:teamId/typing` | protect, participant | `updateTypingStatus` |
| POST | `/:teamId/online` | protect, participant | `updateOnlineStatus` |
| GET | `/:teamId/online-users` | protect, participant | `getOnlineUsers` |
| GET | `/:teamId/typing-users` | protect, participant | `getTypingUsers` |

#### `attendance.js`
| Method | Endpoint | Middleware | Handler |
|--------|----------|------------|---------|
| POST | `/:eventId/scan` | protect, organizer | `scanQRCheckIn` |
| POST | `/:eventId/manual-checkin` | protect, organizer | `manualCheckIn` |
| GET | `/:eventId/dashboard` | protect, organizer | `getAttendanceDashboard` |
| GET | `/:eventId/export-csv` | protect, organizer | `exportAttendanceCSV` |
| GET | `/:eventId/audit-logs` | protect, organizer | `getAuditLogs` |
| GET | `/:eventId/search` | protect, organizer | `searchParticipant` |

#### `index.js`
Barrel export for all route modules — imported by `server.js`.

---

### `utils/`

#### `email.js`
Configures Nodemailer SMTP transporter using `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`. Exports `sendEmail(to, subject, html)` for generic emails and `sendTicketEmail(to, ticket, event)` for formatted ticket confirmations with embedded QR code image.

**Used by:** `eventController.js`, `teamController.js`

#### `ticket.js`
- `generateTicketId()` — Creates IDs in format `FEL-<base36-timestamp>-<random-chars>` for human readability
- `generateQRCode(data)` — Generates QR code as base64 data URL using `qrcode` library; encodes JSON payload containing `ticketId`, `eventId`, `userId`, and generation timestamp

**Used by:** `eventController.js`, `teamController.js`

#### `discord.js`
`postToDiscord(webhookUrl, event)` — Sends a rich embed to a Discord channel via webhook. Includes event name, type, date range, venue, registration deadline, and fee. Non-blocking: errors are logged but not thrown to avoid disrupting the publish flow.

**Used by:** `organizerController.js` (triggered on event publish)

#### `captcha.js`
Server-side CAPTCHA verification supporting both Google reCAPTCHA and hCaptcha. `verifyCaptchaMiddleware` auto-detects which provider is configured via environment variables (`RECAPTCHA_SECRET_KEY` or `HCAPTCHA_SECRET`). Skips verification entirely if neither is set (development mode).

**Used by:** `routes/auth.js` (applied to register and login endpoints)

#### `constants.js`
Exports `AREAS_OF_INTEREST` — an array of 24 predefined interest categories (programming, web development, music, dance, etc.) used for participant onboarding preferences and event matching.

**Used by:** `eventController.js` (getInterestsOptions endpoint)

---

### `scripts/`

#### `seedAdmin.js`
One-time setup script to create the admin user account. Reads `ADMIN_EMAIL` and `ADMIN_PASSWORD` from environment variables, checks for existing admin, and creates the account with role "admin". Run via `npm run seed:admin`.

**Uses:** `config/db.js`, `models/User.js`
