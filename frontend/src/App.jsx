import { BrowserRouter, Routes, Route, Navigate, useParams } from "react-router-dom";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { Navbar, ProtectedRoute } from "./components";
import { Box, Flex, Spinner } from "@radix-ui/themes";
import {
  Login,
  Register,
  Onboarding,
  ParticipantDashboard,
  Profile,
  OrganizersListing,
  OrganizerDetail,
  BrowseEvents,
  EventDetails,
  OrganizerDashboard,
  CreateEvent,
  EventEdit,
  EventParticipants,
  AttendanceDashboard,
  OrganizerProfile,
  OngoingEvents,
  OrganizerEventDetail,
  AdminDashboard,
  ManageOrganizers,
  CreateOrganizer,
  EditOrganizer,
  PasswordRequests,
  TeamRegistration,
  TeamChat,
} from "./pages";
import "./App.css";

// Redirect /check-in to /attendance preserving the event id param
function CheckInRedirect() {
  const { id } = useParams();
  return <Navigate to={`/organizer/events/${id}/attendance`} replace />;
}

// Wrapper to handle auth loading state
function AppContent() {
  const { loading } = useAuth();

  if (loading) {
    return (
      <Flex align="center" justify="center" style={{ minHeight: "100vh" }}>
        <Spinner size="3" />
      </Flex>
    );
  }

  return (
    <Box style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <Navbar />
      <Box style={{ flex: 1 }}>
        <Routes>
              {/* Public Routes */}
              <Route path="/" element={<Navigate to="/events" replace />} />
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/events" element={<BrowseEvents />} />
              <Route path="/events/:id" element={<EventDetails />} />
              <Route path="/organizers" element={<OrganizersListing />} />
              <Route path="/organizers/:id" element={<OrganizerDetail />} />

              {/* Participant Routes */}
              <Route
                path="/onboarding"
                element={
                  <ProtectedRoute allowedRoles={["participant"]}>
                    <Onboarding />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/dashboard"
                element={
                  <ProtectedRoute allowedRoles={["participant"]}>
                    <ParticipantDashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/profile"
                element={
                  <ProtectedRoute allowedRoles={["participant"]}>
                    <Profile />
                  </ProtectedRoute>
                }
              />

              {/* Organizer Routes */}
              <Route
                path="/organizer/dashboard"
                element={
                  <ProtectedRoute allowedRoles={["organizer"]}>
                    <OrganizerDashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/organizer/profile"
                element={
                  <ProtectedRoute allowedRoles={["organizer"]}>
                    <OrganizerProfile />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/organizer/ongoing"
                element={
                  <ProtectedRoute allowedRoles={["organizer"]}>
                    <OngoingEvents />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/organizer/events/:id/detail"
                element={
                  <ProtectedRoute allowedRoles={["organizer"]}>
                    <OrganizerEventDetail />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/organizer/events/create"
                element={
                  <ProtectedRoute allowedRoles={["organizer"]}>
                    <CreateEvent />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/organizer/events/:id/edit"
                element={
                  <ProtectedRoute allowedRoles={["organizer"]}>
                    <EventEdit />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/organizer/events/:id/participants"
                element={
                  <ProtectedRoute allowedRoles={["organizer"]}>
                    <EventParticipants />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/organizer/events/:id/check-in"
                element={
                  <ProtectedRoute allowedRoles={["organizer"]}>
                    <CheckInRedirect />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/organizer/events/:eventId/attendance"
                element={
                  <ProtectedRoute allowedRoles={["organizer"]}>
                    <AttendanceDashboard />
                  </ProtectedRoute>
                }
              />

              {/* Team Routes (Participant) */}
              <Route
                path="/events/:eventId/team"
                element={
                  <ProtectedRoute allowedRoles={["participant"]}>
                    <TeamRegistration />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/team-chat/:teamId"
                element={
                  <ProtectedRoute allowedRoles={["participant"]}>
                    <TeamChat />
                  </ProtectedRoute>
                }
              />

              {/* Admin Routes */}
              <Route
                path="/admin/dashboard"
                element={
                  <ProtectedRoute allowedRoles={["admin"]}>
                    <AdminDashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/organizers"
                element={
                  <ProtectedRoute allowedRoles={["admin"]}>
                    <ManageOrganizers />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/organizers/create"
                element={
                  <ProtectedRoute allowedRoles={["admin"]}>
                    <CreateOrganizer />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/organizers/:id/edit"
                element={
                  <ProtectedRoute allowedRoles={["admin"]}>
                    <EditOrganizer />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/password-requests"
                element={
                  <ProtectedRoute allowedRoles={["admin"]}>
                    <PasswordRequests />
                  </ProtectedRoute>
                }
              />

              {/* Catch all */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Box>
          <ToastContainer
            position="top-right"
            autoClose={3000}
            hideProgressBar={false}
            newestOnTop
            closeOnClick
            rtl={false}
            pauseOnFocusLoss
            draggable
            pauseOnHover
            theme="colored"
          />
        </Box>
  );
}

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppContent />
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
