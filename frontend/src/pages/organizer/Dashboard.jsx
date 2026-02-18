import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { toast } from "react-toastify";
import { organizerService } from "../../services";
import { format } from "date-fns";
import { Box, Flex, Text, Heading, Button, Card, Badge, Grid, Spinner } from "@radix-ui/themes";
import {
  CalendarIcon,
  PersonIcon,
  PlusIcon,
  Pencil1Icon,
  EyeOpenIcon,
  DownloadIcon,
  BarChartIcon,
  ClockIcon,
  CheckCircledIcon,
  FileTextIcon,
  RocketIcon,
} from "@radix-ui/react-icons";

const OrganizerDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [events, setEvents] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("all");

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const [profileData, eventsData, analyticsData] = await Promise.all([
        organizerService.getProfile(),
        organizerService.getMyEvents(),
        organizerService.getAnalytics(),
      ]);
      setProfile(profileData || {});
      setEvents(Array.isArray(eventsData) ? eventsData : eventsData?.events || []);
      setAnalytics(analyticsData || {});
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
      setProfile((prev) => prev || {});
      setEvents((prev) => prev || []);
      setAnalytics((prev) => prev || {});
    } finally {
      setLoading(false);
    }
  };

  const getFilteredEvents = () => {
    if (activeTab === "all") return events;
    return events.filter((e) => e.status === activeTab);
  };

  const getStatusBadgeColor = (status) => {
    const colors = {
      draft: "gray",
      published: "green",
      ongoing: "blue",
      completed: "purple",
      closed: "red",
    };
    return colors[status] || "gray";
  };

  const handleExportCSV = async (eventId) => {
    try {
      const response = await organizerService.exportParticipantsCSV(eventId);
      const blob = new Blob([response], { type: "text/csv" });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `participants-${eventId}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Error exporting CSV:", error);
    }
  };

  if (loading) {
    return (
      <Flex align="center" justify="center" style={{ minHeight: "100vh" }}>
        <Spinner size="3" />
      </Flex>
    );
  }

  return (
    <Box p="6">
      {/* Header */}
      <Flex direction={{ initial: "column", md: "row" }} align={{ md: "center" }} justify="between" mb="6">
        <Box>
          <Heading size="8" weight="bold">
            Welcome, {profile?.name || user?.firstName}!
          </Heading>
          <Text color="gray" size="3" mt="2">
            Manage your events and track performance
          </Text>
        </Box>
        <Button asChild size="3" mt={{ initial: "4", md: "0" }}>
          <Link to="/organizer/events/create">
            <PlusIcon width="18" height="18" />
            Create Event
          </Link>
        </Button>
      </Flex>

      {/* Stats Cards */}
      <Grid columns={{ initial: "1", md: "2", lg: "4" }} gap="4" mb="6">
        <Card>
          <Flex align="center" gap="4">
            <Box p="3" style={{ backgroundColor: "var(--blue-3)", borderRadius: "var(--radius-3)" }}>
              <CalendarIcon width="24" height="24" color="var(--blue-9)" />
            </Box>
            <Box>
              <Text size="2" color="gray">Total Events</Text>
              <Text size="6" weight="bold">{analytics?.totalEvents ?? 0}</Text>
            </Box>
          </Flex>
        </Card>

        <Card>
          <Flex align="center" gap="4">
            <Box p="3" style={{ backgroundColor: "var(--green-3)", borderRadius: "var(--radius-3)" }}>
              <RocketIcon width="24" height="24" color="var(--green-9)" />
            </Box>
            <Box>
              <Text size="2" color="gray">Published Events</Text>
              <Text size="6" weight="bold">{analytics?.publishedEvents ?? 0}</Text>
            </Box>
          </Flex>
        </Card>

        <Card>
          <Flex align="center" gap="4">
            <Box p="3" style={{ backgroundColor: "var(--purple-3)", borderRadius: "var(--radius-3)" }}>
              <PersonIcon width="24" height="24" color="var(--purple-9)" />
            </Box>
            <Box>
              <Text size="2" color="gray">Total Registrations</Text>
              <Text size="6" weight="bold">{analytics?.totalRegistrations ?? 0}</Text>
            </Box>
          </Flex>
        </Card>

        <Card>
          <Flex align="center" gap="4">
            <Box p="3" style={{ backgroundColor: "var(--yellow-3)", borderRadius: "var(--radius-3)" }}>
              <Text size="5" weight="bold" color="yellow">₹</Text>
            </Box>
            <Box>
              <Text size="2" color="gray">Total Revenue</Text>
              <Text size="6" weight="bold">₹{analytics?.totalRevenue ?? 0}</Text>
            </Box>
          </Flex>
        </Card>
      </Grid>

      {/* Completed Events Analytics */}
      {analytics?.completedEvents > 0 && (
        <Card mb="6">
          <Heading size="5" mb="4">Completed Events Analytics</Heading>
          <Grid columns={{ initial: "2", md: "4" }} gap="4">
            <Box style={{ textAlign: "center" }}>
              <Text size="5" weight="bold" color="purple">{analytics.completedEvents}</Text>
              <Text size="2" color="gray" style={{ display: "block" }}>Completed Events</Text>
            </Box>
            <Box style={{ textAlign: "center" }}>
              <Text size="5" weight="bold" color="blue">{analytics.completedEventsStats?.totalRegistrations ?? 0}</Text>
              <Text size="2" color="gray" style={{ display: "block" }}>Registrations</Text>
            </Box>
            <Box style={{ textAlign: "center" }}>
              <Text size="5" weight="bold" color="yellow">₹{analytics.completedEventsStats?.totalRevenue ?? 0}</Text>
              <Text size="2" color="gray" style={{ display: "block" }}>Revenue</Text>
            </Box>
            <Box style={{ textAlign: "center" }}>
              <Text size="5" weight="bold" color="green">{analytics.completedEventsStats?.averageAttendanceRate ?? 0}%</Text>
              <Text size="2" color="gray" style={{ display: "block" }}>Avg. Attendance</Text>
            </Box>
          </Grid>
        </Card>
      )}

      {/* Events Section */}
      <Card>
        <Flex align="center" justify="between" mb="4">
          <Heading size="5">Your Events</Heading>
        </Flex>

        {/* Tabs */}
        <Flex gap="2" mb="4" wrap="wrap">
          {[
            { id: "all", label: "All", count: events.length },
            { id: "draft", label: "Drafts", count: events.filter((e) => e.status === "draft").length },
            { id: "published", label: "Published", count: events.filter((e) => e.status === "published").length },
            { id: "ongoing", label: "Ongoing", count: events.filter((e) => e.status === "ongoing").length },
            { id: "completed", label: "Completed", count: events.filter((e) => e.status === "completed").length },
          ].map((tab) => (
            <Button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              variant={activeTab === tab.id ? "solid" : "soft"}
              color={activeTab === tab.id ? "blue" : "gray"}
            >
              {tab.label} ({tab.count})
            </Button>
          ))}
        </Flex>

        {/* Events List */}
        {getFilteredEvents().length === 0 ? (
          <Flex direction="column" align="center" py="9">
            <CalendarIcon width="64" height="64" color="var(--gray-6)" style={{ marginBottom: "16px" }} />
            <Heading size="4" mb="2">No events found</Heading>
            <Text color="gray" mb="4">Create your first event to get started</Text>
            <Button asChild>
              <Link to="/organizer/events/create">
                <PlusIcon width="18" height="18" />
                Create Event
              </Link>
            </Button>
          </Flex>
        ) : (
          <Flex direction="column" gap="3">
            {getFilteredEvents().map((event) => (
              <Card key={event._id} variant="surface">
                <Flex direction={{ initial: "column", md: "row" }} align={{ md: "center" }} justify="between">
                  <Box style={{ flex: 1 }}>
                    <Flex align="center" gap="3" mb="2">
                      <Text weight="bold">{event.name}</Text>
                      <Badge color={getStatusBadgeColor(event.status)}>
                        {event.status}
                      </Badge>
                      <Badge color="blue">{event.eventType}</Badge>
                    </Flex>
                    <Flex wrap="wrap" align="center" gap="4">
                      <Flex align="center" gap="1">
                        <ClockIcon width="16" height="16" />
                        <Text size="2" color="gray">{format(new Date(event.startDate), "MMM d, yyyy h:mm a")}</Text>
                      </Flex>
                      <Flex align="center" gap="1">
                        <PersonIcon width="16" height="16" />
                        <Text size="2" color="gray">{event.registrationCount} registrations</Text>
                      </Flex>
                      <Flex align="center" gap="1">
                        <Text size="2" color="gray">₹{event.revenue || 0}</Text>
                      </Flex>
                    </Flex>
                  </Box>

                  <Flex align="center" gap="2" mt={{ initial: "3", md: "0" }}>
                    <Button asChild variant="ghost" size="2">
                      <Link to={`/organizer/events/${event._id}/detail`} title="View Details">
                        <EyeOpenIcon width="18" height="18" />
                      </Link>
                    </Button>
                    {(event.status === "draft" || event.status === "published") && (
                      <Button asChild variant="ghost" size="2" color="green">
                        <Link to={`/organizer/events/${event._id}/edit`} title="Edit">
                          <Pencil1Icon width="18" height="18" />
                        </Link>
                      </Button>
                    )}
                    {event.registrationCount > 0 && (
                      <Button
                        variant="ghost"
                        size="2"
                        color="purple"
                        onClick={() => handleExportCSV(event._id)}
                        title="Export CSV"
                      >
                        <DownloadIcon width="18" height="18" />
                      </Button>
                    )}
                    <Button asChild variant="ghost" size="2" color="yellow">
                      <Link to={`/organizer/events/${event._id}/attendance`} title="Attendance">
                        <BarChartIcon width="18" height="18" />
                      </Link>
                    </Button>
                  </Flex>
                </Flex>
              </Card>
            ))}
          </Flex>
        )}
      </Card>

      {/* Quick Actions */}
      <Grid columns={{ initial: "1", md: "3" }} gap="4" mt="6">
        <Card asChild>
          <Link to="/organizer/events/create" style={{ textDecoration: "none" }}>
            <Flex align="center" gap="4">
              <Box p="3" style={{ backgroundColor: "var(--blue-3)", borderRadius: "var(--radius-3)" }}>
                <PlusIcon width="24" height="24" color="var(--blue-9)" />
              </Box>
              <Box>
                <Text weight="bold">Create Event</Text>
                <Text size="2" color="gray">Add a new event</Text>
              </Box>
            </Flex>
          </Link>
        </Card>

        <Card asChild>
          <Link to="/organizer/profile" style={{ textDecoration: "none" }}>
            <Flex align="center" gap="4">
              <Box p="3" style={{ backgroundColor: "var(--green-3)", borderRadius: "var(--radius-3)" }}>
                <FileTextIcon width="24" height="24" color="var(--green-9)" />
              </Box>
              <Box>
                <Text weight="bold">Edit Profile</Text>
                <Text size="2" color="gray">Update organization info</Text>
              </Box>
            </Flex>
          </Link>
        </Card>

        <Card
          style={{ cursor: "pointer" }}
          onClick={() => {
            const activeEvent = events.find((e) => ["published", "ongoing"].includes(e.status));
            if (activeEvent) {
              navigate(`/organizer/events/${activeEvent._id}/attendance`);
            } else {
              toast.info("No active events for check-in. Publish an event first.");
            }
          }}
        >
            <Flex align="center" gap="4">
              <Box p="3" style={{ backgroundColor: "var(--purple-3)", borderRadius: "var(--radius-3)" }}>
                <CheckCircledIcon width="24" height="24" color="var(--purple-9)" />
              </Box>
              <Box>
                <Text weight="bold">QR Check-in</Text>
                <Text size="2" color="gray">Scan participant tickets</Text>
              </Box>
            </Flex>
        </Card>
      </Grid>
    </Box>
  );
};

export default OrganizerDashboard;
