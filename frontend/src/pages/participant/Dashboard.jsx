import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { eventService } from "../../services";
import { format } from "date-fns";
import { Box, Card, Flex, Text, Heading, Badge, Grid, Button, Tabs, Dialog } from "@radix-ui/themes";
import { CalendarIcon, BackpackIcon, CheckCircledIcon, CrossCircledIcon, ClockIcon, RocketIcon, ArrowRightIcon, StarIcon, BarChartIcon, Cross2Icon, CopyIcon } from "@radix-ui/react-icons";
import { toast } from "react-toastify";

const statusColors = { confirmed: "green", pending: "yellow", cancelled: "red", rejected: "red" };

const ParticipantDashboard = () => {
  const { user } = useAuth();
  const [events, setEvents] = useState({ upcoming: [], completed: [], cancelled: [], merchandise: [] });
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("normal");
  const [ticketOpen, setTicketOpen] = useState(false);
  const [ticket, setTicket] = useState(null);
  const [ticketLoading, setTicketLoading] = useState(false);

  useEffect(() => { (async () => { try { setEvents(await eventService.getMyEvents()); } catch (e) { console.error(e); } finally { setLoading(false); } })(); }, []);

  const viewTicket = async (id) => {
    setTicketLoading(true); setTicketOpen(true);
    try { const d = await eventService.getTicket(id); setTicket(d.ticket || d); }
    catch { toast.error("Failed to load ticket details"); setTicketOpen(false); }
    finally { setTicketLoading(false); }
  };

  const upcoming = [...(events.upcoming || []), ...(events.merchandise || [])].filter(t => t.status === "confirmed" && t.eventId?.startDate && new Date(t.eventId.startDate) > new Date()).sort((a, b) => new Date(a.eventId.startDate) - new Date(b.eventId.startDate));
  const normalTickets = events.upcoming || [];
  const tabs = [
    { id: "normal", label: "Normal", icon: CalendarIcon, data: normalTickets },
    { id: "merchandise", label: "Merchandise", icon: BackpackIcon, data: events.merchandise || [] },
    { id: "completed", label: "Completed", icon: CheckCircledIcon, data: events.completed || [] },
    { id: "cancelled", label: "Cancelled/Rejected", icon: CrossCircledIcon, data: events.cancelled || [] },
  ];
  const tabData = tabs.find(t => t.id === activeTab)?.data || [];

  if (loading) return <Flex align="center" justify="center" style={{ minHeight: "100vh" }}><Box style={{ textAlign: "center" }}><Box style={{ width: 48, height: 48, border: "2px solid var(--blue-6)", borderTopColor: "transparent", borderRadius: "50%", animation: "spin 1s linear infinite", margin: "0 auto" }} /><Text as="p" size="2" color="gray" style={{ marginTop: 16 }}>Loading your events...</Text></Box></Flex>;

  const actions = [
    { to: "/events", bg: "blue", icon: <StarIcon width={24} height={24} color="var(--blue-9)" />, title: "Browse Events", sub: "Discover new events" },
    { to: "/organizers", bg: "purple", icon: <RocketIcon width={24} height={24} color="var(--purple-9)" />, title: "Clubs & Organizers", sub: "Follow your favorites" },
    { to: "/profile", bg: "green", icon: <CheckCircledIcon width={24} height={24} color="var(--green-9)" />, title: "Edit Profile", sub: "Update preferences" },
  ];

  return (
    <Box p="6" style={{ maxWidth: 1200, margin: "0 auto" }}>
      <Box mb="6"><Heading size="7" weight="bold">Welcome back, {user?.firstName}!</Heading><Text as="p" size="3" color="gray" mt="2">Here are your registered events and tickets</Text></Box>

      <Grid columns={{ initial: "1", md: "3" }} gap="4" mb="6">
        {actions.map(a => <Card key={a.to} asChild style={{ cursor: "pointer" }}><Link to={a.to} style={{ textDecoration: "none" }}><Flex align="center" gap="4"><Box p="3" style={{ backgroundColor: `var(--${a.bg}-3)`, borderRadius: 8 }}>{a.icon}</Box><Box style={{ flex: 1 }}><Text as="p" weight="medium" size="3">{a.title}</Text><Text as="p" size="2" color="gray">{a.sub}</Text></Box><ArrowRightIcon width={20} height={20} color="var(--gray-8)" /></Flex></Link></Card>)}
      </Grid>

      {upcoming.length > 0 && (
        <Box mb="6">
          <Flex align="center" gap="2" mb="4"><ClockIcon width={20} height={20} color="var(--blue-9)" /><Heading size="5">Upcoming Events</Heading><Badge size="1" color="blue">{upcoming.length}</Badge></Flex>
          <Grid columns={{ initial: "1", md: "2", lg: "3" }} gap="4">
            {upcoming.slice(0, 6).map(t => (
              <Card key={t._id} asChild style={{ cursor: "pointer" }}><Link to={`/events/${t.eventId?._id}`} style={{ textDecoration: "none" }}><Box>
                <Flex align="center" gap="2" mb="2"><Badge color={t.eventId?.eventType === "merchandise" ? "orange" : "blue"} size="1">{t.eventId?.eventType === "merchandise" ? "Merchandise" : "Event"}</Badge><Badge color="green" size="1">Confirmed</Badge></Flex>
                <Text as="p" size="3" weight="bold" mb="1">{t.eventId?.name}</Text><Text as="p" size="2" color="gray" mb="2">By: {t.eventId?.organizerId?.name}</Text>
                <Flex align="center" gap="1"><CalendarIcon width={14} height={14} /><Text size="2" color="gray">{format(new Date(t.eventId.startDate), "PPp")}</Text></Flex>
              </Box></Link></Card>
            ))}
          </Grid>
        </Box>
      )}

      <Box mb="4"><Heading size="5">Participation History</Heading><Text as="p" size="2" color="gray" mt="1">Your event registrations categorized by type and status</Text></Box>

      <Tabs.Root value={activeTab} onValueChange={setActiveTab}>
        <Tabs.List style={{ borderBottom: "1px solid var(--gray-5)", marginBottom: 24 }}>
          {tabs.map(t => <Tabs.Trigger key={t.id} value={t.id}><Flex align="center" gap="2"><t.icon width={16} height={16} /><Text>{t.label}</Text><Badge size="1" color={activeTab === t.id ? "blue" : "gray"}>{t.data.length}</Badge></Flex></Tabs.Trigger>)}
        </Tabs.List>
      </Tabs.Root>

      <Flex direction="column" gap="4">
        {tabData.length === 0 ? (
          <Card style={{ textAlign: "center", padding: 48 }}>
            <Box style={{ color: "var(--gray-8)", marginBottom: 16 }}>{activeTab === "normal" ? <CalendarIcon width={64} height={64} style={{ margin: "0 auto" }} /> : activeTab === "merchandise" ? <BackpackIcon width={64} height={64} style={{ margin: "0 auto" }} /> : activeTab === "completed" ? <CheckCircledIcon width={64} height={64} style={{ margin: "0 auto" }} /> : <CrossCircledIcon width={64} height={64} style={{ margin: "0 auto" }} />}</Box>
            <Heading size="4" mb="2">No events here</Heading>
            <Text as="p" color="gray" mb="4">{activeTab === "normal" ? "You have not registered for any normal events yet." : activeTab === "merchandise" ? "You have not purchased any merchandise yet." : activeTab === "completed" ? "You have not attended any events yet." : "No cancelled or rejected registrations."}</Text>
            {activeTab === "normal" && <Button asChild><Link to="/events">Browse Events</Link></Button>}
          </Card>
        ) : tabData.map(t => (
          <Card key={t._id}>
            <Flex direction={{ initial: "column", md: "row" }} align={{ md: "center" }} justify="between">
              <Box style={{ flex: 1 }}>
                <Flex align="start" gap="4">
                  <Box p="3" style={{ backgroundColor: "var(--blue-3)", borderRadius: 8 }}>{t.eventId?.eventType === "merchandise" ? <BackpackIcon width={24} height={24} color="var(--blue-9)" /> : <CalendarIcon width={24} height={24} color="var(--blue-9)" />}</Box>
                  <Box>
                    <Link to={`/events/${t.eventId?._id}`} style={{ textDecoration: "none" }}><Text as="p" size="4" weight="medium" style={{ color: "var(--gray-12)" }}>{t.eventId?.name}</Text></Link>
                    <Flex align="center" gap="2" mt="1"><Badge color={t.eventId?.eventType === "merchandise" ? "orange" : "blue"} size="1">{t.eventId?.eventType === "merchandise" ? "Merchandise" : "Normal"}</Badge><Text as="span" size="2" color="gray">By: {t.eventId?.organizerId?.name}</Text></Flex>
                    <Flex wrap="wrap" align="center" gap="4" mt="2">
                      {t.eventId?.startDate && <Flex align="center" gap="1"><ClockIcon width={14} height={14} /><Text size="2" color="gray">{format(new Date(t.eventId.startDate), "PPp")}</Text></Flex>}
                      {t.eventId?.venue && <Flex align="center" gap="1"><BarChartIcon width={14} height={14} /><Text size="2" color="gray">Venue: {t.eventId.venue}</Text></Flex>}
                    </Flex>
                  </Box>
                </Flex>
              </Box>
              <Flex direction="column" align={{ initial: "start", md: "end" }} gap="2" mt={{ initial: "4", md: "0" }} ml={{ md: "4" }}>
                <Badge color={statusColors[t.status] || "blue"}>{t.status.charAt(0).toUpperCase() + t.status.slice(1)}</Badge>
                <Flex align="center" gap="2"><BarChartIcon width={14} height={14} /><Text size="2" color="blue" style={{ fontFamily: "monospace", cursor: "pointer", textDecoration: "underline" }} onClick={() => viewTicket(t.ticketId)}>{t.ticketId}</Text></Flex>
                {t.teamId && <Text size="2" color="gray">Team: {t.teamId.name}</Text>}
              </Flex>
            </Flex>
            {t.status === "confirmed" && t.qrCode && <Flex align="center" justify="between" mt="4" pt="4" style={{ borderTop: "1px solid var(--gray-4)" }}><Text size="2" color="gray">Show this QR code at the venue for check-in</Text><Button variant="outline" size="2" onClick={() => viewTicket(t.ticketId)}>View Ticket</Button></Flex>}
          </Card>
        ))}
      </Flex>

      <Dialog.Root open={ticketOpen} onOpenChange={setTicketOpen}>
        <Dialog.Content maxWidth="480px">
          <Dialog.Title><Flex align="center" justify="between"><Text>Ticket Details</Text><Dialog.Close><Button variant="ghost" color="gray" size="1"><Cross2Icon /></Button></Dialog.Close></Flex></Dialog.Title>
          {ticketLoading ? <Flex align="center" justify="center" py="6"><Box style={{ width: 36, height: 36, border: "2px solid var(--blue-6)", borderTopColor: "transparent", borderRadius: "50%", animation: "spin 1s linear infinite" }} /></Flex> : ticket ? (
            <Flex direction="column" gap="4">
              {ticket.qrCode && <Flex justify="center" py="2"><Box style={{ background: "white", padding: 16, borderRadius: 12 }}><img src={ticket.qrCode} alt="QR" style={{ width: 200, height: 200, display: "block" }} /></Box></Flex>}
              <Card><Flex align="center" justify="between"><Box><Text size="1" color="gray">Ticket ID: </Text><Text as="p" weight="bold" style={{ fontFamily: "monospace" }}>{ticket.ticketId}</Text></Box><Button variant="ghost" size="1" onClick={() => { navigator.clipboard.writeText(ticket.ticketId); toast.success("Ticket ID copied!"); }}><CopyIcon /></Button></Flex></Card>
              <Card><Flex direction="column" gap="2">
                <Box><Text size="1" color="gray">Event: </Text><Text as="p" weight="medium">{ticket.eventId?.name || "N/A"}</Text></Box>
                <Flex gap="4"><Box><Text size="1" color="gray">Type: </Text><Badge color={ticket.eventId?.eventType === "merchandise" ? "orange" : "blue"} size="1">{ticket.eventId?.eventType === "merchandise" ? "Merchandise" : "Normal"}</Badge></Box><Box><Text size="1" color="gray">Status: </Text><Badge color={statusColors[ticket.status] || "blue"} size="1">{ticket.status?.charAt(0).toUpperCase() + ticket.status?.slice(1)}</Badge></Box></Flex>
                {ticket.eventId?.startDate && <Box><Text size="1" color="gray">Date & Time: </Text><Text as="p">{format(new Date(ticket.eventId.startDate), "PPPp")}</Text></Box>}
                {ticket.eventId?.venue && <Box><Text size="1" color="gray">Venue: </Text><Text as="p">{ticket.eventId.venue}</Text></Box>}
              </Flex></Card>
              <Card><Flex direction="column" gap="2">
                <Box><Text size="1" color="gray">Participant: </Text><Text as="p" weight="medium">{ticket.userId?.firstName} {ticket.userId?.lastName}</Text></Box>
                <Box><Text size="1" color="gray">Email: </Text><Text as="p">{ticket.userId?.email}</Text></Box>
                {ticket.teamId && <Box><Text size="1" color="gray">Team: </Text><Text as="p">{ticket.teamId.name}</Text></Box>}
                {ticket.variant && <Box><Text size="1" color="gray">Variant: </Text><Text as="p">{ticket.variant}</Text></Box>}
              </Flex></Card>
            </Flex>
          ) : null}
        </Dialog.Content>
      </Dialog.Root>
    </Box>
  );
};

export default ParticipantDashboard;
