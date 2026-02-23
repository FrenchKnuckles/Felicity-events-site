# Felicity Frontend — React Application

React single-page application built with Vite and Radix UI Themes. Provides role-based interfaces for participants, organizers, and admins of the Felicity Event Management System.

## File Structure

```
frontend/
├── index.html                   # HTML entry point (Vite SPA root)
├── package.json                 # Dependencies & scripts
├── vite.config.js               # Vite build configuration
├── eslint.config.js             # ESLint rules
├── .env.example                 # Environment variable template
│
├── public/                      # Static assets (served as-is)
│
└── src/
    ├── main.jsx                 # React DOM render entry
    ├── App.jsx                  # Router & route definitions
    ├── App.css                  # Global responsive utilities & animations
    ├── index.css                # CSS reset & Radix theme overrides
    │
    ├── api/
    │   └── axios.js             # Axios instance (base URL, auth interceptor)
    │
    ├── context/
    │   ├── AuthContext.jsx       # Authentication state management
    │   └── ThemeContext.jsx      # Dark/light theme toggle
    │
    ├── components/
    │   ├── Navbar.jsx            # Role-based navigation bar
    │   ├── ProtectedRoute.jsx    # Route guard (auth + role check)
    │   ├── SimpleCaptcha.jsx     # hCaptcha widget wrapper
    │   └── index.js              # Barrel exports
    │
    ├── services/
    │   ├── eventService.js       # Event API calls
    │   ├── organizerService.js   # Organizer API calls (incl. merchandise order management)
    │   ├── adminService.js       # Admin API calls
    │   ├── attendanceService.js  # Attendance/check-in API calls
    │   └── index.js              # Barrel exports
    │
    ├── pages/
    │   ├── auth/
    │   │   ├── Login.jsx         # Login form (all roles)
    │   │   ├── Register.jsx      # Participant registration
    │   │   └── Onboarding.jsx    # Post-signup preference wizard
    │   │
    │   ├── events/
    │   │   ├── BrowseEvents.jsx  # Event listing with search & filters
    │   │   └── EventDetails.jsx  # Event info, registration, purchase
    │   │
    │   ├── participant/
    │   │   ├── Dashboard.jsx          # My events & tickets
    │   │   ├── Profile.jsx            # Edit profile & preferences
    │   │   ├── OrganizersListing.jsx  # Browse & follow organizers
    │   │   └── OrganizerDetail.jsx    # Single organizer view
    │   │
    │   ├── organizer/
    │   │   ├── Dashboard.jsx              # Event carousel & analytics
    │   │   ├── EventForm.jsx              # 4-step event creation wizard
    │   │   ├── OrganizerEventDetail.jsx   # Event detail + merchandise orders tab
    │   │   ├── EventParticipants.jsx      # Participant list & CSV export
    │   │   ├── AttendanceDashboard.jsx    # QR scanner & check-in
    │   │   ├── OrganizerProfile.jsx       # Edit organizer profile
    │   │   └── OngoingEvents.jsx          # Currently active events
    │   │
    │   └── admin/
    │       ├── Dashboard.jsx          # Platform stats & overview
    │       ├── ManageOrganizers.jsx    # Organizer CRUD
    │       ├── OrganizerForm.jsx       # Create/edit organizer
    │       └── PasswordRequests.jsx    # Password reset queue
    │
    └── assets/                  # Static assets (images, icons)
```

---

## File Descriptions

### Root Files

#### `index.html`
Standard Vite SPA entry point. Contains `<div id="root">` mount point. Title set to "Felicity Events".

#### `vite.config.js`
Vite configuration with `@vitejs/plugin-react` for JSX/Fast Refresh support.

#### `package.json`
Scripts: `dev` (Vite dev server), `build` (production build), `lint` (ESLint), `preview` (preview production build).

---

### `src/`

#### `main.jsx`
Application bootstrap. Wraps `<App />` in `ThemeProvider` (from `context/ThemeContext.jsx`) and Radix UI `<Theme>` component with indigo accent color, slate gray, and support for dark/light appearance switching.

**Connects to:** `App.jsx`, `context/ThemeContext.jsx`, Radix UI `<Theme>`

#### `App.jsx`
Router setup using `react-router-dom` `BrowserRouter`. Defines 24+ routes organized by role. Wraps everything in `AuthProvider` for global auth state. Renders `Navbar` and `ToastContainer` on all pages. Uses `<ProtectedRoute>` wrapper for role-specific route protection. Root `/` redirects to `/events`.

**Route Layout:**
- Public: `/login`, `/register`, `/events`, `/events/:id`, `/organizers`, `/organizers/:id`
- Participant: `/dashboard`, `/profile`, `/onboarding`
- Organizer: `/organizer/*` (dashboard, events, profile, attendance)
- Admin: `/admin/*` (dashboard, manage organizers, password requests)

**Connects to:** All page components, `components/Navbar.jsx`, `components/ProtectedRoute.jsx`, `context/AuthContext.jsx`

#### `App.css`
Responsive utility classes (`.desktop-nav`, `.mobile-only`), keyframe animations (`bounce`, `spin`, `fadeIn`, `shimmer`).

#### `index.css`
Global CSS reset, custom scrollbar styling, uses Radix UI CSS custom properties for theming.

---

### `src/api/`

#### `axios.js`
Creates a configured Axios instance used by all service files.

- **Base URL:** Set from `VITE_API_URL` environment variable (defaults to `http://localhost:5000`), with `/api` appended
- **Request Interceptor:** Attaches JWT token from `localStorage` as `Authorization: Bearer <token>` header on every request
- **Response Interceptor:** On 401 responses, clears localStorage and redirects to `/login` (session expiry handling)

**Used by:** All files in `services/`

---

### `src/context/`

#### `AuthContext.jsx`
React Context providing global authentication state and actions.

**State:** `user` (current user object), `loading` (auth check in progress)
**Actions:**
- `login(email, password, captchaToken)` — Calls `POST /auth/login`, stores token + user in localStorage
- `register(userData)` — Calls `POST /auth/register`, stores token + user
- `logout()` — Clears localStorage, resets state
- `updateUser(userData)` — Updates user object in state and localStorage
- `refreshUser()` — Re-fetches user from `GET /auth/me` (syncs after preference changes)

**Persistence:** Token and user JSON stored in localStorage, restored on mount — sessions survive browser restarts.

**Used by:** `App.jsx` (provider), `Navbar.jsx`, `Login.jsx`, `Register.jsx`, `Profile.jsx`, `ProtectedRoute.jsx`

#### `ThemeContext.jsx`
React Context for dark/light mode toggle.

**State:** `appearance` ("light" or "dark")
**Actions:** `toggleTheme()` — Switches between light and dark
**Persistence:** Preference saved in localStorage, restored on mount.

**Used by:** `main.jsx` (provider), `Navbar.jsx` (toggle button)

---

### `src/components/`

#### `Navbar.jsx`
Responsive sticky navigation bar with role-based link rendering.

- **Participant Links:** Dashboard, Browse Events, Clubs/Organizers, Profile
- **Organizer Links:** Dashboard, Create Event, Ongoing Events, Profile
- **Admin Links:** Dashboard, Manage Clubs, Password Requests
- **Features:** Gradient "Felicity" branding, dark/light theme toggle button, mobile hamburger via Radix `DropdownMenu`, logout button with role badge display

**Connects to:** `context/AuthContext.jsx` (user role, logout), `context/ThemeContext.jsx` (toggle), `react-router-dom` (navigation)

#### `ProtectedRoute.jsx`
Route guard HOC wrapping protected page components.

- Redirects unauthenticated users to `/login`
- Redirects users with wrong role to their appropriate dashboard (e.g., participant trying to access `/admin/*` gets sent to `/dashboard`)
- Shows loading spinner while auth state initializes

**Connects to:** `context/AuthContext.jsx`

#### `SimpleCaptcha.jsx`
hCaptcha widget integration using `@hcaptcha/vanilla-hcaptcha` web component.

- Renders hCaptcha challenge using site key from `VITE_HCAPTCHA_SITE_KEY` environment variable
- Emits verification token via `onTokenChange` callback prop
- Shows warning message if site key is not configured

**Used by:** `Login.jsx`, `Register.jsx`

#### `index.js`
Barrel export file for `Navbar`, `ProtectedRoute`, and `SimpleCaptcha`.

---

### `src/services/`

Service files abstract all API calls. Each function calls the Axios instance from `api/axios.js` and returns `response.data`.

#### `eventService.js`
| Function | Method | Backend Endpoint | Purpose |
|----------|--------|------------------|---------|
| `getEvents(params)` | GET | `/events` | Paginated event list with search/filter params |
| `getTrending()` | GET | `/events/trending` | Top 5 events by 24h registrations |
| `getEventById(id)` | GET | `/events/:id` | Full event details |
| `register(id, formData)` | POST | `/events/:id/register` | Register for normal event (with custom form) |
| `purchase(id, variantId, qty, paymentProofUrl)` | POST | `/events/:id/purchase` | Purchase merchandise (with payment proof) |
| `getMyEvents()` | GET | `/events/user/my-events` | User's registered events/tickets |
| `getTicket(ticketId)` | GET | `/events/tickets/:id` | Single ticket with QR |
| `cancelRegistration(ticketId)` | PUT | `/events/tickets/:id/cancel` | Cancel a registration |
| `getInterests()` | GET | `/events/interests` | Available interest categories |

**Used by:** `BrowseEvents.jsx`, `EventDetails.jsx`, `participant/Dashboard.jsx`

#### `organizerService.js`
| Function | Method | Backend Endpoint | Purpose |
|----------|--------|------------------|---------|
| `getAll()` | GET | `/organizers` | List all active organizers |
| `getById(id)` | GET | `/organizers/:id` | Organizer detail with events |
| `toggleFollow(id)` | POST | `/organizers/:id/follow` | Follow/unfollow |
| `getProfile()` | GET | `/organizers/me/profile` | Own profile (organizer) |
| `updateProfile(data)` | PUT | `/organizers/me/profile` | Update own profile |
| `getMyEvents(params)` | GET | `/organizers/me/events` | Organizer's events list |
| `getOngoingEvents()` | GET | `/organizers/me/events/ongoing` | Currently active events |
| `createEvent(data)` | POST | `/organizers/me/events` | Create draft event |
| `getEventDetails(id)` | GET | `/organizers/me/events/:id` | Event detail (organizer view) |
| `updateEvent(id, data)` | PUT | `/organizers/me/events/:id` | Update event |
| `deleteEvent(id)` | DELETE | `/organizers/me/events/:id` | Delete draft event |
| `publishEvent(id)` | PUT | `/organizers/me/events/:id/publish` | Publish draft |
| `getParticipants(id, params)` | GET | `/organizers/me/events/:id/participants` | Participant list |
| `exportCSV(id)` | GET | `/organizers/me/events/:id/export-csv` | CSV download |
| `getEventAnalytics(id)` | GET | `/organizers/me/events/:id/analytics` | Event-specific stats |
| `getAnalytics()` | GET | `/organizers/me/analytics` | Overall organizer stats |
| `requestPasswordReset(data)` | POST | `/organizers/me/request-password-reset` | Request password reset |
| `getMerchandiseOrders(id, params)` | GET | `/organizers/me/events/:id/merchandise-orders` | List merchandise orders |
| `approveMerchandiseOrder(id, ticketId)` | PUT | `/organizers/me/events/:id/merchandise-orders/:ticketId/approve` | Approve pending order |
| `rejectMerchandiseOrder(id, ticketId)` | PUT | `/organizers/me/events/:id/merchandise-orders/:ticketId/reject` | Reject pending order |

**Used by:** `OrganizersListing.jsx`, `OrganizerDetail.jsx`, `organizer/Dashboard.jsx`, `EventForm.jsx`, `OrganizerEventDetail.jsx`, `EventParticipants.jsx`, `OrganizerProfile.jsx`, `OngoingEvents.jsx`, `Onboarding.jsx`, `participant/Profile.jsx`

#### `adminService.js`
| Function | Method | Backend Endpoint | Purpose |
|----------|--------|------------------|---------|
| `getStats()` | GET | `/admin/stats` | Platform-wide statistics |
| `getRecentEvents()` | GET | `/admin/events/recent` | Latest events |
| `getAllEvents()` | GET | `/admin/events` | All events |
| `deleteEvent(id)` | DELETE | `/admin/events/:id` | Force-delete event |
| `getOrganizers()` | GET | `/admin/organizers` | All organizers |
| `getOrganizer(id)` | GET | `/admin/organizers/:id` | Single organizer |
| `createOrganizer(data)` | POST | `/admin/organizers` | Create organizer account |
| `updateOrganizer(id, data)` | PUT | `/admin/organizers/:id` | Update organizer |
| `disableOrganizer(id)` | DELETE | `/admin/organizers/:id` | Disable/delete organizer |
| `enableOrganizer(id)` | PUT | `/admin/organizers/:id/enable` | Re-enable organizer |
| `deleteOrganizer(id)` | DELETE | `/admin/organizers/:id?permanent=true` | Permanently delete |
| `resetPassword(id)` | PUT | `/admin/organizers/:id/reset-password` | Admin password reset |
| `getPasswordRequests()` | GET | `/admin/password-requests` | Reset request queue |
| `handlePasswordRequest(id, data)` | PUT | `/admin/password-requests/:id` | Approve/reject request |

**Used by:** `admin/Dashboard.jsx`, `ManageOrganizers.jsx`, `OrganizerForm.jsx`, `PasswordRequests.jsx`

#### `attendanceService.js`
| Function | Method | Backend Endpoint | Purpose |
|----------|--------|------------------|---------|
| `scanQR(eventId, data)` | POST | `/attendance/:eventId/scan` | QR code check-in |
| `manualCheckIn(eventId, data)` | POST | `/attendance/:eventId/manual-checkin` | Manual check-in |
| `getDashboard(eventId)` | GET | `/attendance/:eventId/dashboard` | Live stats |
| `exportCSV(eventId, params)` | GET | `/attendance/:eventId/export-csv` | CSV download (blob) |
| `getAuditLogs(eventId, params)` | GET | `/attendance/:eventId/audit-logs` | Audit trail |
| `searchParticipant(eventId, params)` | GET | `/attendance/:eventId/search` | Find participant |

**Used by:** `AttendanceDashboard.jsx`

#### `index.js`
Barrel export for `eventService`, `organizerService`, `adminService`, `attendanceService`.

---

### `src/pages/auth/`

#### `Login.jsx`
Login form supporting all three roles (participant, organizer, admin).

- Email and password fields with show/hide toggle
- hCaptcha integration (optional, based on env config)
- On successful login, redirects based on role: admin → `/admin`, organizer → `/organizer`, new participant → `/onboarding`, returning participant → `/dashboard`
- Displays toast errors for invalid credentials or disabled accounts

**Connects to:** `context/AuthContext.jsx` (login action), `components/SimpleCaptcha.jsx`, backend `POST /api/auth/login`

#### `Register.jsx`
Participant registration form with 7 fields.

- Participant type selector (IIIT Student / Non-IIIT)
- IIIT email domain validation (must end in `@*.iiit.ac.in`)
- Fields: First Name, Last Name, Email, Password, Confirm Password, College/Org, Contact Number
- hCaptcha integration
- Redirects to `/onboarding` on success

**Connects to:** `context/AuthContext.jsx` (register action), `components/SimpleCaptcha.jsx`, backend `POST /api/auth/register`

#### `Onboarding.jsx`
Two-step post-registration wizard for setting participant preferences.

- **Step 1:** Select areas of interest from 23 predefined categories (chip-based multi-select)
- **Step 2:** Browse and follow organizers (fetched from API)
- Progress indicator dots
- Skip button available on each step
- Saves preferences via `PUT /api/auth/preferences`

**Connects to:** `api/axios.js` (direct calls to `/auth/preferences` and `/organizers`), `context/AuthContext.jsx` (refreshUser)

---

### `src/pages/events/`

#### `BrowseEvents.jsx`
Main event discovery page with search, filters, and trending section.

- **Trending Section:** Top 5 events by 24-hour registration count, displayed as highlighted cards
- **Search Bar:** Partial/fuzzy text matching on event and organizer names
- **Collapsible Filter Panel:** Event type (normal/merchandise/hackathon), eligibility (all/IIIT-only/non-IIIT-only), date range, followed clubs only toggle
- **Event Grid:** Paginated card layout with event name, type badge, organizer name, date, fee, registration count
- **Pagination:** Page controls with total count

**Connects to:** `services/eventService.js` (getEvents, getTrending), navigates to `EventDetails.jsx` on card click

#### `EventDetails.jsx`
Full event information page with registration/purchase actions. `FormField` component is defined outside the main component to prevent focus loss on re-render.

- **Info Display:** Name, description, type indicator, organizer, dates, venue, eligibility, fee, registration count/limit
- **Registration (Normal):** Custom form fields rendered dynamically (text, dropdown, checkbox, radio, file, etc.)
- **Purchase (Merchandise):** Variant selector (size/color), payment proof upload to Cloudinary, order submission. Shows order status (pending/approved/rejected) with QR code on approval.
- **Ticket View:** If already registered, displays ticket with QR code
- **Blocking:** Disables actions when deadline passed, limit reached, or stock exhausted

**Connects to:** `services/eventService.js` (getEventById, register, purchase), Cloudinary API (payment proof upload)

---

### `src/pages/participant/`

#### `Dashboard.jsx`
Participant home page showing registered events and tickets.

- **Upcoming Events:** Cards for events not yet started
- **Participation History:** Tabbed view — Normal, Merchandise, Completed, Cancelled/Rejected
- **Ticket Records:** Event name, type, organizer, status badge, clickable ticket ID
- **Ticket Detail Modal:** Full ticket info with QR code display, event details
- **Cancel Action:** Cancel registration directly from dashboard

**Connects to:** `services/eventService.js` (getMyEvents, getTicket), navigates to `EventDetails.jsx`

#### `Profile.jsx`
Profile management page for participants.

- **Editable Fields:** First Name, Last Name, Contact Number, College/Organization Name
- **Non-Editable Fields:** Email Address, Participant Type (shown but disabled)
- **Areas of Interest:** Chip-based toggle selection (23 categories)
- **Followed Organizers:** List with unfollow buttons
- **Password Change:** Current password + new password + confirmation
- **Security:** Requires current password verification for password changes

**Connects to:** `api/axios.js` (PUT /auth/profile, PUT /auth/password, PUT /auth/preferences), `services/organizerService.js` (toggleFollow), `context/AuthContext.jsx` (updateUser)

#### `OrganizersListing.jsx`
Browse all approved organizers with follow functionality.

- **Search:** Filter organizers by name
- **Stats Bar:** Total organizers count, currently following count
- **Organizer Cards:** Name, category badge (color-coded), description, event count, follower count
- **Follow/Unfollow Toggle:** Instant follow state change with toast feedback
- **Navigation:** Click card to view organizer detail page

**Connects to:** `services/organizerService.js` (getAll, toggleFollow), navigates to `OrganizerDetail.jsx`

#### `OrganizerDetail.jsx`
Single organizer profile page (participant view).

- **Profile Header:** Name, category badge, description, contact email, phone, follower count, avatar initial
- **Follow Button:** Toggle follow/unfollow
- **Upcoming Events Section:** Grid of events with future start dates
- **Past Events Section:** Grid of completed events
- **Event Cards:** Name, date, category badge, description preview, clickable to event detail

**Connects to:** `services/organizerService.js` (getById, toggleFollow), navigates to `EventDetails.jsx`

---

### `src/pages/organizer/`

#### `Dashboard.jsx`
Organizer home page with event overview and analytics.

- **Analytics Cards:** Total events, total registrations, total revenue, overall attendance rate
- **Event Listing:** Cards showing all organizer events with status tabs (All/Draft/Published/Ongoing/Completed/Closed)
- **Event Cards:** Name, type badge, status badge (color-coded), creation date, registration count
- **Password Reset Request:** Dialog to request password reset from admin (with reason field)
- **Quick Actions:** Links to event detail, edit, create new event

**Connects to:** `services/organizerService.js` (getProfile, getMyEvents, getAnalytics, requestPasswordReset), navigates to `EventForm.jsx`, `OrganizerEventDetail.jsx`

#### `EventForm.jsx`
Four-step event creation and editing wizard.

- **Step 1 — Basic Info:** Event name, type (normal/merchandise/hackathon), description, start/end dates, venue, registration deadline, fee, registration limit
- **Step 2 — Configuration:** Eligibility (all/IIIT-only/non-IIIT-only), tags (text input), team settings (if hackathon: min/max team size, registration type), merchandise variants (if merchandise: size/color/stock/price grid)
- **Step 3 — Custom Form Builder:** Add fields with 9 supported types (text, textarea, dropdown, checkbox, radio, file, number, email, date), set labels/placeholders, mark as required, define options for select types, drag-to-reorder fields
- **Step 4 — Review:** Summary of all entered data, confirm and save as draft
- **Edit Mode:** Loads existing event data, respects status-dependent editing restrictions (draft: free edit; published: limited fields)

**Connects to:** `services/organizerService.js` (createEvent, updateEvent, getEventDetails), navigates back to dashboard on save

#### `OrganizerEventDetail.jsx`
Event detail page from the organizer's perspective.

- **Overview:** Event name, type, status (with color-coded badge), dates, eligibility, pricing, venue
- **Analytics Cards:** Total registrations, revenue, attendance rate
- **Participant Table:** Name, email, registration date, payment status, attendance mark — with search and filters (status, check-in status, institution type)
- **Merchandise Orders Tab (merchandise events only):** Summary cards (pending/approved/rejected/cancelled counts), filterable order table with buyer info, variant, amount, payment proof thumbnail, order status, and approve/reject action buttons for pending orders
- **CSV Export:** Download participant data
- **Actions:** Edit event (→ EventForm), publish draft, change status (close/complete), view attendance dashboard

**Connects to:** `services/organizerService.js` (getEventDetails, getEventAnalytics, getParticipants, publishEvent, updateEvent, exportCSV, getMerchandiseOrders, approveMerchandiseOrder, rejectMerchandiseOrder), navigates to `EventForm.jsx`, `AttendanceDashboard.jsx`, `EventParticipants.jsx`

#### `EventParticipants.jsx`
Dedicated participant list view for an event.

- **Search:** Filter by name or email
- **Filters:** Status (confirmed/pending/cancelled), check-in status (checked-in/not)
- **Table Columns:** Ticket ID, first name, last name, email, contact number, college/org, participant type, team name, status, attendance, registration date
- **Custom Form Responses:** Displays responses for each custom form field
- **CSV Export:** Full participant data export

**Connects to:** `services/organizerService.js` (getEventDetails, getParticipants, exportCSV)

#### `AttendanceDashboard.jsx`
QR scanner and live attendance tracking system.

- **Scanner Tab:** Camera-based QR scanning using `html5-qrcode` library; scans QR code JSON, sends to backend for validation, shows success/error with participant details
- **Dashboard Tab:** Real-time statistics — total registered vs checked-in (with percentage), hourly check-in rate chart, recent check-ins feed (auto-refreshes every 10 seconds)
- **Manual Check-in Tab:** Search participant by name/email, select from results, mandatory reason field (min 10 chars) for audit compliance
- **Audit Logs Tab:** Complete history of all check-in actions (QR scans, manual overrides) with timestamps, performer, and details
- **CSV Export:** Download attendance data (option to include not-checked-in participants)

**Connects to:** `services/attendanceService.js` (scanQR, manualCheckIn, getDashboard, exportCSV, getAuditLogs, searchParticipant), uses `html5-qrcode` library for camera access

#### `OrganizerProfile.jsx`
Organizer self-service profile editing page.

- **Editable Fields:** Organization name, category (cultural/technical/sports/other), description, contact email, contact number, logo URL
- **Discord Webhook:** URL field for auto-posting published events to a Discord channel
- **Non-Editable:** Login email (shown, disabled)
- **Password Reset Request:** Dialog to submit a reset request to admin with a reason

**Connects to:** `services/organizerService.js` (getProfile, updateProfile, requestPasswordReset)

#### `OngoingEvents.jsx`
Filtered view showing only events with "ongoing" status.

- **Event Cards:** Name, type, start/end dates, registration count
- **Quick Links:** View event details, go to attendance check-in page

**Connects to:** `services/organizerService.js` (getOngoingEvents), navigates to `OrganizerEventDetail.jsx`, `AttendanceDashboard.jsx`

---

### `src/pages/admin/`

#### `Dashboard.jsx`
Admin home page with platform-wide overview.

- **Stats Cards:** Total participants, total organizers, total events, total revenue
- **Recent Events Table:** Latest events with name, organizer, type, status, date — with delete action
- **Pending Password Requests:** Preview of queue with count badge, links to full requests page

**Connects to:** `services/adminService.js` (getStats, getRecentEvents, getPasswordRequests, deleteEvent), navigates to `ManageOrganizers.jsx`, `PasswordRequests.jsx`

#### `ManageOrganizers.jsx`
Full CRUD interface for organizer/club accounts.

- **Search:** Filter organizers by name or email
- **Status Filter:** Active, disabled, or all organizers
- **Organizer Table:** Name, email, category, status badge, event count, actions
- **Actions:** Edit (→ OrganizerForm), disable/enable toggle, reset password (generates new credentials), permanently delete (with confirmation dialog cascade warning)
- **Create New:** Button linking to OrganizerForm in create mode

**Connects to:** `services/adminService.js` (getOrganizers, disableOrganizer, enableOrganizer, deleteOrganizer, resetPassword), navigates to `OrganizerForm.jsx`

#### `OrganizerForm.jsx`
Create or edit organizer account (admin view).

- **Fields:** Organization name, login email, category selector, description, contact email, contact number, logo URL, Discord webhook URL
- **Create Mode:** On submission, system auto-generates a password; displays credentials in a modal with copy-to-clipboard functionality for the admin to share with the organizer
- **Edit Mode:** Pre-fills existing data, updates on submit

**Connects to:** `services/adminService.js` (createOrganizer, getOrganizer, updateOrganizer), navigates back to `ManageOrganizers.jsx` on save

#### `PasswordRequests.jsx`
Admin queue for organizer password reset requests.

- **Status Filter Tabs:** All, Pending, Approved, Rejected
- **Request Cards:** Organizer name, email, reason, submission date, current status
- **Approve Action:** Opens dialog, on confirm generates new password, displays credentials for admin to share
- **Reject Action:** Opens dialog with mandatory comment field explaining rejection reason
- **Status Badges:** Color-coded (yellow = pending, green = approved, red = rejected)

**Connects to:** `services/adminService.js` (getPasswordRequests, handlePasswordRequest)
