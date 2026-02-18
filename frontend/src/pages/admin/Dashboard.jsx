import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { adminService } from "../../services";
import { toast } from "react-toastify";
import { Box, Card, Flex, Text, Heading, Badge, Grid, Spinner, Button } from "@radix-ui/themes";
import {
  PersonIcon,
  AvatarIcon,
  CalendarIcon,
  IdCardIcon,
  CubeIcon,
  LockClosedIcon,
  CheckCircledIcon,
  ClockIcon,
  ArrowRightIcon,
  ReloadIcon,
  TrashIcon,
} from "@radix-ui/react-icons";
import { format } from "date-fns";

const AdminDashboard = () => {
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalOrganizers: 0,
    totalEvents: 0,
    totalRegistrations: 0,
    totalRevenue: 0,
    pendingPasswordRequests: 0,
  });
  const [recentEvents, setRecentEvents] = useState([]);
  const [pendingRequests, setPendingRequests] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const [statsRes, eventsRes, requestsRes] = await Promise.all([
        adminService.getStats(),
        adminService.getRecentEvents(),
        adminService.getPasswordRequests({ status: "pending", limit: 5 }),
      ]);

      setStats({
        totalUsers: statsRes.totalUsers || 0,
        totalOrganizers: statsRes.totalOrganizers || 0,
        activeOrganizers: statsRes.activeOrganizers || 0,
        totalEvents: statsRes.totalEvents || 0,
        totalRegistrations: statsRes.totalRegistrations || 0,
        totalRevenue: statsRes.totalRevenue || 0,
        pendingPasswordRequests: statsRes.pendingRequests || 0,
      });
      setRecentEvents(Array.isArray(eventsRes) ? eventsRes : eventsRes.events || []);
      setPendingRequests(Array.isArray(requestsRes) ? requestsRes : requestsRes.requests || []);
    } catch (error) {
      toast.error("Failed to fetch dashboard data");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteEvent = async (eventId) => {
    const confirmed = window.confirm("Delete this event? This will also remove related tickets.");
    if (!confirmed) return;

    try {
      await adminService.deleteEvent(eventId);
      toast.success("Event deleted");
      fetchDashboardData();
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to delete event");
    }
  };

  const statCards = [
    {
      title: "Total Participants",
      value: stats.totalUsers,
      icon: PersonIcon,
      color: "blue",
      link: "/admin/users",
    },
    {
      title: "Total Organizers",
      value: stats.totalOrganizers,
      icon: AvatarIcon,
      color: "purple",
      link: "/admin/organizers",
    },
    {
      title: "Total Events",
      value: stats.totalEvents,
      icon: CalendarIcon,
      color: "green",
      link: "/admin/events",
    },
    {
      title: "Total Registrations",
      value: stats.totalRegistrations,
      icon: IdCardIcon,
      color: "yellow",
    },
    {
      title: "Total Revenue",
      value: `₹${stats.totalRevenue?.toLocaleString() || 0}`,
      icon: CubeIcon,
      color: "teal",
    },
    {
      title: "Password Requests",
      value: stats.pendingPasswordRequests,
      icon: LockClosedIcon,
      color: "red",
      link: "/admin/password-requests",
      highlight: stats.pendingPasswordRequests > 0,
    },
  ];

  if (loading) {
    return (
      <Flex align="center" justify="center" style={{ minHeight: "50vh" }}>
        <Spinner size="3" />
      </Flex>
    );
  }

  return (
    <Box p="6">
      {/* Header */}
      <Flex direction={{ initial: "column", md: "row" }} align={{ md: "center" }} justify="between" mb="6">
        <Box>
          <Heading size="8" weight="bold" mb="1">Admin Dashboard</Heading>
          <Text color="gray" size="2">Manage and monitor the platform</Text>
        </Box>

        <Flex
          align="center"
          gap="2"
          mt={{ initial: "4", md: "0" }}
          onClick={fetchDashboardData}
          style={{
            padding: "8px 16px",
            border: "1px solid var(--gray-6)",
            borderRadius: "8px",
            cursor: "pointer",
            background: "var(--gray-2)",
          }}
        >
          <ReloadIcon width={20} height={20} />
          <Text size="2">Refresh</Text>
        </Flex>
      </Flex>

      {/* Stats Grid */}
      <Grid columns={{ initial: "1", md: "2", lg: "3" }} gap="4" mb="6">
        {statCards.map((stat) => {
          const Icon = stat.icon;

          const CardContent = (
            <Card
              key={stat.title}
              style={{
                padding: "20px",
                cursor: stat.link ? "pointer" : "default",
                border: stat.highlight ? "2px solid var(--red-9)" : undefined,
              }}
            >
              <Flex align="center" justify="between">
                <Box>
                  <Text color="gray" size="2">{stat.title}</Text>
                  <Text size="7" weight="bold" style={{ display: "block", marginTop: "4px" }}>
                    {stat.value}
                  </Text>
                </Box>
                <Box
                  style={{
                    padding: "12px",
                    borderRadius: "50%",
                    backgroundColor: `var(--${stat.color}-3)`,
                    color: `var(--${stat.color}-9)`,
                  }}
                >
                  <Icon width={24} height={24} />
                </Box>
              </Flex>
              {stat.link && (
                <Flex align="center" gap="1" mt="4">
                  <Text size="2" color="blue">View Details</Text>
                  <ArrowRightIcon width={16} height={16} color="var(--blue-9)" />
                </Flex>
              )}
            </Card>
          );

          return stat.link ? (
            <Link key={stat.title} to={stat.link} style={{ textDecoration: "none" }}>
              {CardContent}
            </Link>
          ) : (
            <Box key={stat.title}>{CardContent}</Box>
          );
        })}
      </Grid>

      <Grid columns={{ initial: "1", lg: "2" }} gap="6">
        {/* Recent Events */}
        <Card style={{ padding: "20px" }}>
          <Flex align="center" justify="between" mb="4">
            <Flex align="center" gap="2">
              <CalendarIcon width={24} height={24} color="var(--blue-9)" />
              <Heading size="4">Recent Events</Heading>
            </Flex>
            <Link to="/events" style={{ textDecoration: "none" }}>
              <Text size="2" color="blue">View All</Text>
            </Link>
          </Flex>

          {recentEvents.length > 0 ? (
            <Flex direction="column" gap="3">
              {recentEvents.map((event) => (
                <Flex
                  key={event._id}
                  align="center"
                  justify="between"
                  p="3"
                  style={{ backgroundColor: "var(--gray-2)", borderRadius: "8px" }}
                >
                  <Box style={{ flex: 1, minWidth: 0 }}>
                    <Text weight="medium" style={{ display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {event.name}
                    </Text>
                    <Text size="2" color="gray">
                      By {event.organizer?.name || "Unknown"}
                    </Text>
                  </Box>
                  <Box style={{ textAlign: "right", marginLeft: "16px" }}>
                    <Badge color={event.status === "published" ? "green" : "yellow"}>
                      {event.status}
                    </Badge>
                    <Text size="1" color="gray" style={{ display: "block", marginTop: "4px" }}>
                      {event.registrations?.length || 0} registrations
                    </Text>
                    <Button
                      size="1"
                      variant="ghost"
                      color="red"
                      onClick={() => handleDeleteEvent(event._id)}
                      style={{ marginTop: "4px" }}
                    >
                      <TrashIcon width={14} height={14} />
                      <span style={{ marginLeft: 6 }}>Delete</span>
                    </Button>
                  </Box>
                </Flex>
              ))}
            </Flex>
          ) : (
            <Flex direction="column" align="center" py="6">
              <CalendarIcon width={48} height={48} color="var(--gray-6)" />
              <Text color="gray" mt="2">No recent events</Text>
            </Flex>
          )}
        </Card>

        {/* Pending Password Requests */}
        <Card style={{ padding: "20px" }}>
          <Flex align="center" justify="between" mb="4">
            <Flex align="center" gap="2">
              <LockClosedIcon width={24} height={24} color="var(--red-9)" />
              <Heading size="4">Password Requests</Heading>
            </Flex>
            <Link to="/admin/password-requests" style={{ textDecoration: "none" }}>
              <Text size="2" color="blue">View All</Text>
            </Link>
          </Flex>

          {pendingRequests.length > 0 ? (
            <Flex direction="column" gap="3">
              {pendingRequests.map((request) => (
                <Flex
                  key={request._id}
                  align="center"
                  justify="between"
                  p="3"
                  style={{
                    backgroundColor: "var(--yellow-3)",
                    borderRadius: "8px",
                    border: "1px solid var(--yellow-6)",
                  }}
                >
                  <Flex align="center" gap="3">
                    <Box
                      style={{
                        padding: "8px",
                        backgroundColor: "var(--yellow-4)",
                        borderRadius: "50%",
                      }}
                    >
                      <ClockIcon width={20} height={20} color="var(--yellow-9)" />
                    </Box>
                    <Box>
                      <Text weight="medium" style={{ display: "block" }}>{request.user?.name}</Text>
                      <Text size="2" color="gray">{request.user?.email}</Text>
                    </Box>
                  </Flex>
                  <Text size="2" color="gray">
                    {request.createdAt &&
                      format(new Date(request.createdAt), "MMM d, HH:mm")}
                  </Text>
                </Flex>
              ))}
            </Flex>
          ) : (
            <Flex direction="column" align="center" py="6">
              <CheckCircledIcon width={48} height={48} color="var(--green-6)" />
              <Text color="gray" mt="2">No pending requests</Text>
            </Flex>
          )}
        </Card>
      </Grid>

      {/* Quick Actions */}
      <Box mt="6">
        <Heading size="4" mb="4">Quick Actions</Heading>
        <Grid columns={{ initial: "1", md: "4" }} gap="4">
          <Link to="/admin/organizers/create" style={{ textDecoration: "none" }}>
            <Card style={{ padding: "16px", cursor: "pointer" }}>
              <Flex align="center" gap="3">
                <Box
                  style={{
                    padding: "8px",
                    backgroundColor: "var(--purple-3)",
                    borderRadius: "50%",
                  }}
                >
                  <AvatarIcon width={20} height={20} color="var(--purple-9)" />
                </Box>
                <Text weight="medium">Create Organizer</Text>
              </Flex>
            </Card>
          </Link>

          <Link to="/admin/password-requests" style={{ textDecoration: "none" }}>
            <Card style={{ padding: "16px", cursor: "pointer" }}>
              <Flex align="center" gap="3">
                <Box
                  style={{
                    padding: "8px",
                    backgroundColor: "var(--red-3)",
                    borderRadius: "50%",
                  }}
                >
                  <LockClosedIcon width={20} height={20} color="var(--red-9)" />
                </Box>
                <Text weight="medium">Handle Requests</Text>
              </Flex>
            </Card>
          </Link>

          <Link to="/events" style={{ textDecoration: "none" }}>
            <Card style={{ padding: "16px", cursor: "pointer" }}>
              <Flex align="center" gap="3">
                <Box
                  style={{
                    padding: "8px",
                    backgroundColor: "var(--green-3)",
                    borderRadius: "50%",
                  }}
                >
                  <CalendarIcon width={20} height={20} color="var(--green-9)" />
                </Box>
                <Text weight="medium">Manage Events</Text>
              </Flex>
            </Card>
          </Link>

          <Link to="/admin/organizers" style={{ textDecoration: "none" }}>
            <Card style={{ padding: "16px", cursor: "pointer" }}>
              <Flex align="center" gap="3">
                <Box
                  style={{
                    padding: "8px",
                    backgroundColor: "var(--blue-3)",
                    borderRadius: "50%",
                  }}
                >
                  <PersonIcon width={20} height={20} color="var(--blue-9)" />
                </Box>
                <Text weight="medium">View Organizers</Text>
              </Flex>
            </Card>
          </Link>
        </Grid>
      </Box>
    </Box>
  );
};

export default AdminDashboard;
