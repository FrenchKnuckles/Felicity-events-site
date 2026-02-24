import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { toast } from "react-toastify";
import { organizerService } from "../../services";
import { format } from "date-fns";
import { Box, Flex, Text, Heading, Button, Card, Badge, Grid, Spinner, Dialog, TextArea } from "@radix-ui/themes";
import { CalendarIcon, PersonIcon, PlusIcon, Pencil1Icon, EyeOpenIcon, DownloadIcon, BarChartIcon, ClockIcon, CheckCircledIcon, FileTextIcon, RocketIcon, LockClosedIcon } from "@radix-ui/react-icons";

const statusColors = { draft: "gray", published: "green", ongoing: "blue", completed: "purple", closed: "red" };

const OrganizerDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [events, setEvents] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [eventAnalytics, setEventAnalytics] = useState({}); // keyed by eventId
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("all");
  const [resetReason, setResetReason] = useState("");
  const [resetOpen, setResetOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const [p, e, a] = await Promise.all([organizerService.getProfile(), organizerService.getMyEvents(), organizerService.getAnalytics()]);
        setProfile(p || {});
        const evts = Array.isArray(e) ? e : e?.events || [];
        setEvents(evts);
        setAnalytics(a || {});
        // fetch analytics for each completed event
        const completed = evts.filter(ev => ev.status === "completed");
        const statsObj = {};
        await Promise.all(completed.map(async ev => {
          try {
            const res = await organizerService.getEventAnalytics(ev._id);
            statsObj[ev._id] = res.stats || {};
          } catch {
            statsObj[ev._id] = {};
          }
        }));
        setEventAnalytics(statsObj);
      } catch {
        setProfile(v => v || {});
        setEvents(v => v || []);
        setAnalytics(v => v || {});
      }
      finally { setLoading(false); }
    })();
  }, []);

  const filtered = activeTab === "all" ? events : events.filter(e => e.status === activeTab);

  const requestReset = async () => {
    if (!resetReason.trim() || resetReason.trim().length < 5) { toast.error("Please provide a reason (at least 5 characters)"); return; }
    setSubmitting(true);
    try { await organizerService.requestPasswordReset(resetReason.trim()); toast.success("Password reset request submitted! An admin will review it."); setResetOpen(false); setResetReason(""); }
    catch (err) { toast.error(err.response?.data?.message || "Failed to submit request"); }
    finally { setSubmitting(false); }
  };

  const exportCSV = async (eventId) => {
    try {
      const r = await organizerService.exportParticipantsCSV(eventId);
      const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([r], { type: "text/csv" }));
      a.download = `participants-${eventId}.csv`; document.body.appendChild(a); a.click(); document.body.removeChild(a);
    } catch (e) { console.error(e); }
  };

  if (loading) return <Flex align="center" justify="center" style={{ minHeight: "100vh" }}><Spinner size="3" /></Flex>;

  const stats = [
    { label: "Total Events: ", value: analytics?.totalEvents ?? 0, bg: "blue", icon: <CalendarIcon width="24" height="24" color="var(--blue-9)" /> },
    { label: "Published Events: ", value: analytics?.publishedEvents ?? 0, bg: "green", icon: <RocketIcon width="24" height="24" color="var(--green-9)" /> },
    { label: "Total Registrations: ", value: analytics?.totalRegistrations ?? 0, bg: "purple", icon: <PersonIcon width="24" height="24" color="var(--purple-9)" /> },
    { label: "Total Revenue: ", value: `₹${analytics?.totalRevenue ?? 0}`, bg: "yellow", icon: <Text size="5" weight="bold" color="yellow">₹</Text> },
  ];

  const tabs = [
    { id: "all", label: "All", count: events.length },
    { id: "draft", label: "Drafts", count: events.filter(e => e.status === "draft").length },
    { id: "published", label: "Published", count: events.filter(e => e.status === "published").length },
    { id: "ongoing", label: "Ongoing", count: events.filter(e => e.status === "ongoing").length },
    { id: "completed", label: "Completed", count: events.filter(e => e.status === "completed").length },
  ];

  return (
    <Box p="6">
      <Flex direction={{ initial: "column", md: "row" }} align={{ md: "center" }} justify="between" mb="6">
        <Box>
          <Heading size="8" weight="bold">Welcome, {profile?.name || user?.firstName}!</Heading>
          <Text color="gray" size="3" mt="2">Manage your events and track performance</Text>
        </Box>
        <Button asChild size="3" mt={{ initial: "4", md: "0" }}><Link to="/organizer/events/create"><PlusIcon width="18" height="18" />Create Event</Link></Button>
      </Flex>

      <Grid columns={{ initial: "1", md: "2", lg: "4" }} gap="4" mb="6">
        {stats.map(s => (
          <Card key={s.label}><Flex align="center" gap="4">
            <Box p="3" style={{ backgroundColor: `var(--${s.bg}-3)`, borderRadius: "var(--radius-3)" }}>{s.icon}</Box>
            <Box><Text size="2" color="gray">{s.label}</Text><Text size="6" weight="bold">{s.value}</Text></Box>
          </Flex></Card>
        ))}
      </Grid>

      {analytics?.completedEvents > 0 && (
        <Card mb="6">
          <Heading size="5" mb="4">Completed Events Analytics</Heading>
          <Grid columns={{ initial: "2", md: "4" }} gap="4">
            {[
              { v: analytics.completedEvents, l: "Completed Events", c: "purple" },
              { v: analytics.completedEventsStats?.totalRegistrations ?? 0, l: "Registrations", c: "blue" },
              { v: `₹${analytics.completedEventsStats?.totalRevenue ?? 0}`, l: "Revenue", c: "yellow" },
              { v: `${analytics.completedEventsStats?.averageAttendanceRate ?? 0}%`, l: "Avg. Attendance", c: "green" },
            ].map(s => (
              <Box key={s.l} style={{ textAlign: "center" }}>
                <Text size="5" weight="bold" color={s.c}>{s.v}</Text>
                <Text size="2" color="gray" style={{ display: "block" }}>{s.l}</Text>
              </Box>
            ))}
          </Grid>          {/* per-event breakdown table */}
          {events.filter(ev => ev.status === "completed").length > 0 && (
            <Box mt="6">
              <Text weight="medium" mb="2">Completed events breakdown</Text>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr>
                    <th style={{ textAlign: "left", padding: 8 }}>Event</th>
                    <th style={{ textAlign: "right", padding: 8 }}>Registrations</th>
                    <th style={{ textAlign: "right", padding: 8 }}>Revenue</th>
                    <th style={{ textAlign: "right", padding: 8 }}>Attendance %</th>
                  </tr>
                </thead>
                <tbody>
                  {events.filter(ev => ev.status === "completed").map(ev => {
                    const st = eventAnalytics[ev._id] || {};
                    return (
                      <tr key={ev._id}>
                        <td style={{ padding: 8 }}>{ev.name}</td>
                        <td style={{ padding: 8, textAlign: "right" }}>{st.totalRegistrations ?? ev.registrationCount}</td>
                        <td style={{ padding: 8, textAlign: "right" }}>₹{st.totalRevenue ?? ev.revenue}</td>
                        <td style={{ padding: 8, textAlign: "right" }}>{st.attendanceRate != null ? `${st.attendanceRate}%` : "-"}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </Box>
          )}        </Card>
      )}

      <Card>
        <Flex align="center" justify="between" mb="4"><Heading size="5">Your Events</Heading></Flex>
        <Flex gap="2" mb="4" wrap="wrap">
          {tabs.map(t => (
            <Button key={t.id} onClick={() => setActiveTab(t.id)} variant={activeTab === t.id ? "solid" : "soft"} color={activeTab === t.id ? "blue" : "gray"}>
              {t.label} ({t.count})
            </Button>
          ))}
        </Flex>

        {filtered.length === 0 ? (
          <Flex direction="column" align="center" py="9">
            <CalendarIcon width="64" height="64" color="var(--gray-6)" style={{ marginBottom: "16px" }} />
            <Heading size="4" mb="2">No events found</Heading>
            <Text color="gray" mb="4">Create your first event to get started</Text>
            <Button asChild><Link to="/organizer/events/create"><PlusIcon width="18" height="18" />Create Event</Link></Button>
          </Flex>
        ) : (
          <Flex direction="column" gap="3">
            {filtered.map(ev => (
              <Card key={ev._id} variant="surface">
                <Flex direction={{ initial: "column", md: "row" }} align={{ md: "center" }} justify="between">
                  <Box style={{ flex: 1 }}>
                    <Flex align="center" gap="3" mb="2">
                      <Text weight="bold">{ev.name}</Text>
                      <Badge color={statusColors[ev.status] || "gray"}>{ev.status}</Badge>
                      <Badge color="blue">{ev.eventType}</Badge>
                    </Flex>
                    <Flex wrap="wrap" align="center" gap="4">
                      <Flex align="center" gap="1"><ClockIcon width="16" height="16" />
                        <Text size="2" color="gray">
                          {ev.eventType === "merchandise"
                            ? (ev.registrationDeadline && !isNaN(new Date(ev.registrationDeadline))
                                ? `Reg. Deadline: ${format(new Date(ev.registrationDeadline), "MMM d, yyyy h:mm a")}`
                                : "No deadline")
                            : (ev.startDate && !isNaN(new Date(ev.startDate))
                                ? format(new Date(ev.startDate), "MMM d, yyyy h:mm a")
                                : "Invalid date")}
                        </Text>
                      </Flex>
                      <Flex align="center" gap="1"><PersonIcon width="16" height="16" /><Text size="2" color="gray">Registrations: {ev.registrationCount}</Text></Flex>
                      <Text size="2" color="gray">Revenue: ₹{ev.revenue || 0}</Text>
                    </Flex>
                  </Box>
                  <Flex align="center" gap="2" mt={{ initial: "3", md: "0" }}>
                    <Button asChild variant="ghost" size="2"><Link to={`/organizer/events/${ev._id}/detail`} title="View Details"><EyeOpenIcon width="18" height="18" /></Link></Button>
                    {(ev.status === "draft" || ev.status === "published") && <Button asChild variant="ghost" size="2" color="green"><Link to={`/organizer/events/${ev._id}/edit`} title="Edit"><Pencil1Icon width="18" height="18" /></Link></Button>}
                    {ev.registrationCount > 0 && <Button variant="ghost" size="2" color="purple" onClick={() => exportCSV(ev._id)} title="Export CSV"><DownloadIcon width="18" height="18" /></Button>}
                    {/* analytics/attendance button only for non-merchandise events */}
                    {ev.eventType !== "merchandise" && (
                      <Button asChild variant="ghost" size="2" color="yellow">
                        <Link to={`/organizer/events/${ev._id}/attendance`} title="Attendance">
                          <BarChartIcon width="18" height="18" />
                        </Link>
                      </Button>
                    )}
                  </Flex>
                </Flex>
              </Card>
            ))}
          </Flex>
        )}
      </Card>

      <Grid columns={{ initial: "1", md: "2", lg: "4" }} gap="4" mt="6">
        {[
          { to: "/organizer/events/create", bg: "blue", icon: <PlusIcon width="24" height="24" color="var(--blue-9)" />, title: "Create Event: ", sub: "Add a new event" },
          { to: "/organizer/profile", bg: "green", icon: <FileTextIcon width="24" height="24" color="var(--green-9)" />, title: "Edit Profile: ", sub: "Update organization info" },
        ].map(q => (
          <Card key={q.to} asChild><Link to={q.to} style={{ textDecoration: "none" }}>
            <Flex align="center" gap="4">
              <Box p="3" style={{ backgroundColor: `var(--${q.bg}-3)`, borderRadius: "var(--radius-3)" }}>{q.icon}</Box>
              <Box><Text weight="bold">{q.title}</Text><Text size="2" color="gray">{q.sub}</Text></Box>
            </Flex>
          </Link></Card>
        ))}
        <Card style={{ cursor: "pointer" }} onClick={() => {
          const ae = events.find(e => ["published", "ongoing"].includes(e.status));
          ae ? navigate(`/organizer/events/${ae._id}/attendance`) : toast.info("No active events for check-in. Publish an event first.");
        }}>
          <Flex align="center" gap="4">
            <Box p="3" style={{ backgroundColor: "var(--purple-3)", borderRadius: "var(--radius-3)" }}><CheckCircledIcon width="24" height="24" color="var(--purple-9)" /></Box>
            <Box><Text weight="bold">QR Check-in: </Text><Text size="2" color="gray">Scan participant tickets</Text></Box>
          </Flex>
        </Card>
        <Dialog.Root open={resetOpen} onOpenChange={setResetOpen}>
          <Dialog.Trigger>
            <Card style={{ cursor: "pointer", border: "1px solid var(--red-6)" }}>
              <Flex align="center" gap="4">
                <Box p="3" style={{ backgroundColor: "var(--red-3)", borderRadius: "var(--radius-3)" }}><LockClosedIcon width="24" height="24" color="var(--red-9)" /></Box>
                <Box><Text weight="bold">Password Reset: </Text><br /><Text size="2" color="gray">Request a password change</Text></Box>
              </Flex>
            </Card>
          </Dialog.Trigger>
          <Dialog.Content style={{ maxWidth: 450 }}>
            <Dialog.Title>Request Password Reset</Dialog.Title>
            <Dialog.Description size="2" mb="4">Provide a reason for your password reset request. An admin will review and approve it.</Dialog.Description>
            <Box>
              <Text as="label" size="2" weight="medium" mb="1" style={{ display: "block" }}>Reason *</Text>
              <TextArea value={resetReason} onChange={e => setResetReason(e.target.value)} placeholder="Explain why you need a password reset (min 5 characters)..." rows={3} />
              <Text size="1" color={resetReason.trim().length >= 5 ? "green" : "gray"} mt="1">{resetReason.trim().length}/5 characters minimum</Text>
            </Box>
            <Flex gap="3" mt="4" justify="end">
              <Dialog.Close><Button variant="soft" color="gray">Cancel</Button></Dialog.Close>
              <Button color="red" onClick={requestReset} disabled={submitting || resetReason.trim().length < 5}>{submitting ? "Submitting..." : "Submit Request"}</Button>
            </Flex>
          </Dialog.Content>
        </Dialog.Root>
      </Grid>
    </Box>
  );
};

export default OrganizerDashboard;
