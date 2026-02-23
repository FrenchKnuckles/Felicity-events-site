import { BrowserRouter, Routes, Route, Navigate, useParams } from "react-router-dom";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { Navbar, ProtectedRoute } from "./components";
import { Box, Flex, Spinner } from "@radix-ui/themes";
import {
  Login, Register, Onboarding, ParticipantDashboard, Profile,
  OrganizersListing, OrganizerDetail, BrowseEvents, EventDetails,
  OrganizerDashboard, EventForm, EventParticipants, AttendanceDashboard,
  OrganizerProfile, OngoingEvents, OrganizerEventDetail,
  AdminDashboard, ManageOrganizers, OrganizerForm, PasswordRequests,
} from "./pages";
import "./App.css";

const P = ({ roles, children }) => <ProtectedRoute allowedRoles={roles}>{children}</ProtectedRoute>;
const CheckInRedirect = () => { const { id } = useParams(); return <Navigate to={`/organizer/events/${id}/attendance`} replace />; };

function AppContent() {
  const { loading } = useAuth();
  if (loading) return <Flex align="center" justify="center" style={{ minHeight: "100vh" }}><Spinner size="3" /></Flex>;

  return (
    <Box style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <Navbar />
      <Box style={{ flex: 1 }}>
        <Routes>
          <Route path="/" element={<Navigate to="/events" replace />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/events" element={<BrowseEvents />} />
          <Route path="/events/:id" element={<EventDetails />} />
          <Route path="/organizers" element={<OrganizersListing />} />
          <Route path="/organizers/:id" element={<OrganizerDetail />} />
          <Route path="/onboarding" element={<P roles={["participant"]}><Onboarding /></P>} />
          <Route path="/dashboard" element={<P roles={["participant"]}><ParticipantDashboard /></P>} />
          <Route path="/profile" element={<P roles={["participant"]}><Profile /></P>} />

          <Route path="/organizer/dashboard" element={<P roles={["organizer"]}><OrganizerDashboard /></P>} />
          <Route path="/organizer/profile" element={<P roles={["organizer"]}><OrganizerProfile /></P>} />
          <Route path="/organizer/ongoing" element={<P roles={["organizer"]}><OngoingEvents /></P>} />
          <Route path="/organizer/events/:id/detail" element={<P roles={["organizer"]}><OrganizerEventDetail /></P>} />
          <Route path="/organizer/events/create" element={<P roles={["organizer"]}><EventForm mode="create" /></P>} />
          <Route path="/organizer/events/:id/edit" element={<P roles={["organizer"]}><EventForm mode="edit" /></P>} />
          <Route path="/organizer/events/:id/participants" element={<P roles={["organizer"]}><EventParticipants /></P>} />
          <Route path="/organizer/events/:id/check-in" element={<P roles={["organizer"]}><CheckInRedirect /></P>} />
          <Route path="/organizer/events/:eventId/attendance" element={<P roles={["organizer"]}><AttendanceDashboard /></P>} />
          <Route path="/admin/dashboard" element={<P roles={["admin"]}><AdminDashboard /></P>} />
          <Route path="/admin/organizers" element={<P roles={["admin"]}><ManageOrganizers /></P>} />
          <Route path="/admin/organizers/create" element={<P roles={["admin"]}><OrganizerForm mode="create" /></P>} />
          <Route path="/admin/organizers/:id/edit" element={<P roles={["admin"]}><OrganizerForm mode="edit" /></P>} />
          <Route path="/admin/password-requests" element={<P roles={["admin"]}><PasswordRequests /></P>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Box>
      <ToastContainer position="top-right" autoClose={3000} hideProgressBar={false} newestOnTop closeOnClick draggable pauseOnHover theme="colored" />
    </Box>
  );
}

export default function App() {
  return <AuthProvider><BrowserRouter><AppContent /></BrowserRouter></AuthProvider>;
}
