import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { eventService } from "../../services";
import { format } from "date-fns";
import { Box, Card, Flex, Text, Heading, Badge, Grid, Button, Tabs, Dialog } from "@radix-ui/themes";
import { 
  CalendarIcon, 
  BackpackIcon, 
  CheckCircledIcon, 
  CrossCircledIcon,
  ClockIcon,
  RocketIcon,
  ArrowRightIcon,
  StarIcon,
  BarChartIcon,
  Cross2Icon,
  CopyIcon,
} from "@radix-ui/react-icons";
import { toast } from "react-toastify";

const ParticipantDashboard = () => {
  const { user } = useAuth();
  const [events, setEvents] = useState({ upcoming: [], completed: [], cancelled: [], merchandise: [] });
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("normal");
  const [ticketModalOpen, setTicketModalOpen] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [ticketLoading, setTicketLoading] = useState(false);

  useEffect(() => {
    fetchMyEvents();
  }, []);

  const fetchMyEvents = async () => {
    try {
      const data = await eventService.getMyEvents();
      setEvents(data);
    } catch (error) {
      console.error("Error fetching events:", error);
    } finally {
      setLoading(false);
    }
  };

  const viewTicket = async (ticketId) => {
    setTicketLoading(true);
    setTicketModalOpen(true);
    try {
      const data = await eventService.getTicket(ticketId);
      setSelectedTicket(data.ticket || data);
    } catch (error) {
      toast.error("Failed to load ticket details");
      setTicketModalOpen(false);
    } finally {
      setTicketLoading(false);
    }
  };

  // Upcoming events = confirmed upcoming events (from all categories)
  const upcomingEvents = [...(events.upcoming || []), ...(events.merchandise || [])]
    .filter((t) => t.status === "confirmed" && t.eventId?.startDate && new Date(t.eventId.startDate) > new Date())
    .sort((a, b) => new Date(a.eventId.startDate) - new Date(b.eventId.startDate));

  // Normal tab = non-merchandise upcoming tickets
  const normalTickets = events.upcoming || [];

  const tabs = [
    { id: "normal", label: "Normal", icon: CalendarIcon, count: normalTickets.length },
    { id: "merchandise", label: "Merchandise", icon: BackpackIcon, count: events.merchandise?.length || 0 },
    { id: "completed", label: "Completed", icon: CheckCircledIcon, count: events.completed?.length || 0 },
    { id: "cancelled", label: "Cancelled/Rejected", icon: CrossCircledIcon, count: events.cancelled?.length || 0 },
  ];

  const getTabData = () => {
    switch (activeTab) {
      case "normal": return normalTickets;
      case "merchandise": return events.merchandise || [];
      case "completed": return events.completed || [];
      case "cancelled": return events.cancelled || [];
      default: return [];
    }
  };

  const getStatusBadgeColor = (status) => {
    const colors = {
      confirmed: "green",
      pending: "yellow",
      cancelled: "red",
      rejected: "red",
    };
    return colors[status] || "blue";
  };

  if (loading) {
    return (
      <Flex align="center" justify="center" style={{ minHeight: "100vh" }}>
        <Box style={{ textAlign: "center" }}>
          <Box
            style={{
              width: 48,
              height: 48,
              border: "2px solid var(--blue-6)",
              borderTopColor: "transparent",
              borderRadius: "50%",
              animation: "spin 1s linear infinite",
              margin: "0 auto"
            }}
          />
          <Text as="p" size="2" color="gray" style={{ marginTop: 16 }}>Loading your events...</Text>
        </Box>
      </Flex>
    );
  }

  return (
    <Box p="6" style={{ maxWidth: 1200, margin: "0 auto" }}>
      {/* Header */}
      <Box mb="6">
        <Heading size="7" weight="bold">
          Welcome back, {user?.firstName}!
        </Heading>
        <Text as="p" size="3" color="gray" mt="2">Here are your registered events and tickets</Text>
      </Box>

      {/* Quick Actions */}
      <Grid columns={{ initial: "1", md: "3" }} gap="4" mb="6">
        <Card asChild style={{ cursor: "pointer" }}>
          <Link to="/events" style={{ textDecoration: "none" }}>
            <Flex align="center" gap="4">
              <Box p="3" style={{ backgroundColor: "var(--blue-3)", borderRadius: 8 }}>
                <StarIcon width={24} height={24} color="var(--blue-9)" />
              </Box>
              <Box style={{ flex: 1 }}>
                <Text as="p" weight="medium" size="3">Browse Events</Text>
                <Text as="p" size="2" color="gray">Discover new events</Text>
              </Box>
              <ArrowRightIcon width={20} height={20} color="var(--gray-8)" />
            </Flex>
          </Link>
        </Card>
        
        <Card asChild style={{ cursor: "pointer" }}>
          <Link to="/organizers" style={{ textDecoration: "none" }}>
            <Flex align="center" gap="4">
              <Box p="3" style={{ backgroundColor: "var(--purple-3)", borderRadius: 8 }}>
                <RocketIcon width={24} height={24} color="var(--purple-9)" />
              </Box>
              <Box style={{ flex: 1 }}>
                <Text as="p" weight="medium" size="3">Clubs & Organizers</Text>
                <Text as="p" size="2" color="gray">Follow your favorites</Text>
              </Box>
              <ArrowRightIcon width={20} height={20} color="var(--gray-8)" />
            </Flex>
          </Link>
        </Card>

        <Card asChild style={{ cursor: "pointer" }}>
          <Link to="/profile" style={{ textDecoration: "none" }}>
            <Flex align="center" gap="4">
              <Box p="3" style={{ backgroundColor: "var(--green-3)", borderRadius: 8 }}>
                <CheckCircledIcon width={24} height={24} color="var(--green-9)" />
              </Box>
              <Box style={{ flex: 1 }}>
                <Text as="p" weight="medium" size="3">Edit Profile</Text>
                <Text as="p" size="2" color="gray">Update preferences</Text>
              </Box>
              <ArrowRightIcon width={20} height={20} color="var(--gray-8)" />
            </Flex>
          </Link>
        </Card>
      </Grid>

      {/* Upcoming Events Section */}
      {upcomingEvents.length > 0 && (
        <Box mb="6">
          <Flex align="center" gap="2" mb="4">
            <ClockIcon width={20} height={20} color="var(--blue-9)" />
            <Heading size="5">Upcoming Events</Heading>
            <Badge size="1" color="blue">{upcomingEvents.length}</Badge>
          </Flex>
          <Grid columns={{ initial: "1", md: "2", lg: "3" }} gap="4">
            {upcomingEvents.slice(0, 6).map((ticket) => (
              <Card key={ticket._id} style={{ cursor: "pointer" }} asChild>
                <Link to={`/events/${ticket.eventId?._id}`} style={{ textDecoration: "none" }}>
                  <Box>
                    <Flex align="center" gap="2" mb="2">
                      <Badge color={ticket.eventId?.eventType === "merchandise" ? "orange" : "blue"} size="1">
                        {ticket.eventId?.eventType === "merchandise" ? "Merchandise" : "Event"}
                      </Badge>
                      <Badge color="green" size="1">Confirmed</Badge>
                    </Flex>
                    <Text as="p" size="3" weight="bold" mb="1">{ticket.eventId?.name}</Text>
                    <Text as="p" size="2" color="gray" mb="2">by {ticket.eventId?.organizerId?.name}</Text>
                    <Flex align="center" gap="1">
                      <CalendarIcon width={14} height={14} />
                      <Text size="2" color="gray">{format(new Date(ticket.eventId.startDate), "PPp")}</Text>
                    </Flex>
                  </Box>
                </Link>
              </Card>
            ))}
          </Grid>
        </Box>
      )}

      {/* Participation History Header */}
      <Box mb="4">
        <Heading size="5">Participation History</Heading>
        <Text as="p" size="2" color="gray" mt="1">Your event registrations categorized by type and status</Text>
      </Box>

      {/* Tabs */}
      <Tabs.Root value={activeTab} onValueChange={setActiveTab}>
        <Tabs.List style={{ borderBottom: "1px solid var(--gray-5)", marginBottom: 24 }}>
          {tabs.map((tab) => (
            <Tabs.Trigger key={tab.id} value={tab.id}>
              <Flex align="center" gap="2">
                <tab.icon width={16} height={16} />
                <Text>{tab.label}</Text>
                <Badge size="1" color={activeTab === tab.id ? "blue" : "gray"}>
                  {tab.count}
                </Badge>
              </Flex>
            </Tabs.Trigger>
          ))}
        </Tabs.List>
      </Tabs.Root>

      {/* Events List */}
      <Flex direction="column" gap="4">
        {getTabData().length === 0 ? (
          <Card style={{ textAlign: "center", padding: 48 }}>
            <Box style={{ color: "var(--gray-8)", marginBottom: 16 }}>
              {activeTab === "normal" && <CalendarIcon width={64} height={64} style={{ margin: "0 auto" }} />}
              {activeTab === "merchandise" && <BackpackIcon width={64} height={64} style={{ margin: "0 auto" }} />}
              {activeTab === "completed" && <CheckCircledIcon width={64} height={64} style={{ margin: "0 auto" }} />}
              {activeTab === "cancelled" && <CrossCircledIcon width={64} height={64} style={{ margin: "0 auto" }} />}
            </Box>
            <Heading size="4" mb="2">No events here</Heading>
            <Text as="p" color="gray" mb="4">
              {activeTab === "normal" && "You have not registered for any normal events yet."}
              {activeTab === "merchandise" && "You have not purchased any merchandise yet."}
              {activeTab === "completed" && "You have not attended any events yet."}
              {activeTab === "cancelled" && "No cancelled or rejected registrations."}
            </Text>
            {activeTab === "normal" && (
              <Button asChild>
                <Link to="/events">Browse Events</Link>
              </Button>
            )}
          </Card>
        ) : (
          getTabData().map((ticket) => (
            <Card key={ticket._id}>
              <Flex direction={{ initial: "column", md: "row" }} align={{ md: "center" }} justify="between">
                <Box style={{ flex: 1 }}>
                  <Flex align="start" gap="4">
                    <Box p="3" style={{ backgroundColor: "var(--blue-3)", borderRadius: 8 }}>
                      {ticket.eventId?.eventType === "merchandise" ? (
                        <BackpackIcon width={24} height={24} color="var(--blue-9)" />
                      ) : (
                        <CalendarIcon width={24} height={24} color="var(--blue-9)" />
                      )}
                    </Box>
                    <Box>
                      <Link 
                        to={`/events/${ticket.eventId?._id}`}
                        style={{ textDecoration: "none" }}
                      >
                        <Text as="p" size="4" weight="medium" style={{ color: "var(--gray-12)" }}>
                          {ticket.eventId?.name}
                        </Text>
                      </Link>
                      <Flex align="center" gap="2" mt="1">
                        <Badge color={ticket.eventId?.eventType === "merchandise" ? "orange" : "blue"} size="1">
                          {ticket.eventId?.eventType === "merchandise" ? "Merchandise" : "Normal"}
                        </Badge>
                        <Text as="span" size="2" color="gray">
                          by {ticket.eventId?.organizerId?.name}
                        </Text>
                      </Flex>
                      
                      <Flex wrap="wrap" align="center" gap="4" mt="2">
                        {ticket.eventId?.startDate && (
                          <Flex align="center" gap="1">
                            <ClockIcon width={14} height={14} />
                            <Text size="2" color="gray">{format(new Date(ticket.eventId.startDate), "PPp")}</Text>
                          </Flex>
                        )}
                        {ticket.eventId?.venue && (
                          <Flex align="center" gap="1">
                            <BarChartIcon width={14} height={14} />
                            <Text size="2" color="gray">{ticket.eventId.venue}</Text>
                          </Flex>
                        )}
                      </Flex>
                    </Box>
                  </Flex>
                </Box>

                <Flex direction="column" align={{ initial: "start", md: "end" }} gap="2" mt={{ initial: "4", md: "0" }} ml={{ md: "4" }}>
                  <Badge color={getStatusBadgeColor(ticket.status)}>
                    {ticket.status.charAt(0).toUpperCase() + ticket.status.slice(1)}
                  </Badge>
                  <Flex align="center" gap="2">
                    <BarChartIcon width={14} height={14} />
                    <Text
                      size="2"
                      color="blue"
                      style={{ fontFamily: "monospace", cursor: "pointer", textDecoration: "underline" }}
                      onClick={() => viewTicket(ticket.ticketId)}
                    >
                      {ticket.ticketId}
                    </Text>
                  </Flex>
                  {ticket.teamId && (
                    <Text size="2" color="gray">Team: {ticket.teamId.name}</Text>
                  )}
                </Flex>
              </Flex>

              {/* QR Code Section (for confirmed tickets) */}
              {ticket.status === "confirmed" && ticket.qrCode && (
                <Flex align="center" justify="between" mt="4" pt="4" style={{ borderTop: "1px solid var(--gray-4)" }}>
                  <Text size="2" color="gray">
                    Show this QR code at the venue for check-in
                  </Text>
                  <Button variant="outline" size="2" onClick={() => viewTicket(ticket.ticketId)}>
                    View Ticket
                  </Button>
                </Flex>
              )}
            </Card>
          ))
        )}
      </Flex>

      {/* Ticket Detail Modal */}
      <Dialog.Root open={ticketModalOpen} onOpenChange={setTicketModalOpen}>
        <Dialog.Content maxWidth="480px">
          <Dialog.Title>
            <Flex align="center" justify="between">
              <Text>Ticket Details</Text>
              <Dialog.Close>
                <Button variant="ghost" color="gray" size="1"><Cross2Icon /></Button>
              </Dialog.Close>
            </Flex>
          </Dialog.Title>
          {ticketLoading ? (
            <Flex align="center" justify="center" py="6">
              <Box
                style={{
                  width: 36, height: 36,
                  border: "2px solid var(--blue-6)", borderTopColor: "transparent",
                  borderRadius: "50%", animation: "spin 1s linear infinite",
                }}
              />
            </Flex>
          ) : selectedTicket ? (
            <Flex direction="column" gap="4">
              {/* QR Code */}
              {selectedTicket.qrCode && (
                <Flex justify="center" py="2">
                  <Box style={{ background: "white", padding: 16, borderRadius: 12 }}>
                    <img
                      src={selectedTicket.qrCode}
                      alt="Ticket QR Code"
                      style={{ width: 200, height: 200, display: "block" }}
                    />
                  </Box>
                </Flex>
              )}

              {/* Ticket ID */}
              <Card>
                <Flex align="center" justify="between">
                  <Box>
                    <Text size="1" color="gray">Ticket ID</Text>
                    <Text as="p" weight="bold" style={{ fontFamily: "monospace" }}>{selectedTicket.ticketId}</Text>
                  </Box>
                  <Button
                    variant="ghost"
                    size="1"
                    onClick={() => {
                      navigator.clipboard.writeText(selectedTicket.ticketId);
                      toast.success("Ticket ID copied!");
                    }}
                  >
                    <CopyIcon />
                  </Button>
                </Flex>
              </Card>

              {/* Event Details */}
              <Card>
                <Flex direction="column" gap="2">
                  <Box>
                    <Text size="1" color="gray">Event</Text>
                    <Text as="p" weight="medium">{selectedTicket.eventId?.name || "N/A"}</Text>
                  </Box>
                  <Flex gap="4">
                    <Box>
                      <Text size="1" color="gray">Type</Text>
                      <Text as="p">
                        <Badge color={selectedTicket.eventId?.eventType === "merchandise" ? "orange" : "blue"} size="1">
                          {selectedTicket.eventId?.eventType === "merchandise" ? "Merchandise" : "Normal"}
                        </Badge>
                      </Text>
                    </Box>
                    <Box>
                      <Text size="1" color="gray">Status</Text>
                      <Text as="p">
                        <Badge color={getStatusBadgeColor(selectedTicket.status)} size="1">
                          {selectedTicket.status?.charAt(0).toUpperCase() + selectedTicket.status?.slice(1)}
                        </Badge>
                      </Text>
                    </Box>
                  </Flex>
                  {selectedTicket.eventId?.startDate && (
                    <Box>
                      <Text size="1" color="gray">Date & Time</Text>
                      <Text as="p">{format(new Date(selectedTicket.eventId.startDate), "PPPp")}</Text>
                    </Box>
                  )}
                  {selectedTicket.eventId?.venue && (
                    <Box>
                      <Text size="1" color="gray">Venue</Text>
                      <Text as="p">{selectedTicket.eventId.venue}</Text>
                    </Box>
                  )}
                </Flex>
              </Card>

              {/* Participant Details */}
              <Card>
                <Flex direction="column" gap="2">
                  <Box>
                    <Text size="1" color="gray">Participant</Text>
                    <Text as="p" weight="medium">{selectedTicket.userId?.firstName} {selectedTicket.userId?.lastName}</Text>
                  </Box>
                  <Box>
                    <Text size="1" color="gray">Email</Text>
                    <Text as="p">{selectedTicket.userId?.email}</Text>
                  </Box>
                  {selectedTicket.teamId && (
                    <Box>
                      <Text size="1" color="gray">Team</Text>
                      <Text as="p">{selectedTicket.teamId.name}</Text>
                    </Box>
                  )}
                  {selectedTicket.variant && (
                    <Box>
                      <Text size="1" color="gray">Variant</Text>
                      <Text as="p">{selectedTicket.variant}</Text>
                    </Box>
                  )}
                </Flex>
              </Card>
            </Flex>
          ) : null}
        </Dialog.Content>
      </Dialog.Root>
    </Box>
  );
};

export default ParticipantDashboard;
