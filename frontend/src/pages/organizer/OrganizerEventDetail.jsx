import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { organizerService } from "../../services";
import { toast } from "react-toastify";
import { format } from "date-fns";
import {
  Box, Card, Flex, Text, Button, Heading, Badge, Grid, Spinner, Tabs, Table, TextField, Select, Code,
} from "@radix-ui/themes";
import {
  ArrowLeftIcon, DownloadIcon, MagnifyingGlassIcon, CheckCircledIcon, CrossCircledIcon,
  ClockIcon, PersonIcon, EnvelopeClosedIcon, MixerHorizontalIcon, BarChartIcon,
  Pencil1Icon, CalendarIcon, GlobeIcon,
} from "@radix-ui/react-icons";

const OrganizerEventDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [event, setEvent] = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [participants, setParticipants] = useState([]);
  const [filteredParticipants, setFilteredParticipants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [checkInFilter, setCheckInFilter] = useState("all");
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    fetchAll();
  }, [id]);

  useEffect(() => {
    filterParticipants();
  }, [participants, search, statusFilter, checkInFilter]);

  const fetchAll = async () => {
    try {
      const [eventRes, analyticsRes] = await Promise.all([
        organizerService.getEventDetails(id),
        organizerService.getEventAnalytics(id).catch(() => null),
      ]);
      const eventData = eventRes?.event || eventRes;
      setEvent(eventData);
      setAnalytics(analyticsRes);

      // Also fetch participants
      try {
        const partRes = await organizerService.getParticipants(id);
        setParticipants(partRes?.participants || []);
      } catch {
        setParticipants([]);
      }
    } catch (error) {
      toast.error("Failed to fetch event details");
      navigate("/organizer/dashboard");
    } finally {
      setLoading(false);
    }
  };

  const filterParticipants = () => {
    let filtered = [...participants];
    if (search) {
      const s = search.toLowerCase();
      filtered = filtered.filter(
        (p) =>
          (p.userId?.firstName + " " + p.userId?.lastName).toLowerCase().includes(s) ||
          p.userId?.email?.toLowerCase().includes(s) ||
          p.ticketId?.toLowerCase().includes(s)
      );
    }
    if (statusFilter !== "all") filtered = filtered.filter((p) => p.status === statusFilter);
    if (checkInFilter !== "all") {
      filtered = filtered.filter((p) =>
        checkInFilter === "checked-in" ? p.attended : !p.attended
      );
    }
    setFilteredParticipants(filtered);
  };

  const handleExportCSV = async () => {
    setExporting(true);
    try {
      const response = await organizerService.exportParticipantsCSV(id);
      const blob = new Blob([response], { type: "text/csv" });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${event?.name || "event"}_participants.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast.success("CSV exported successfully!");
    } catch {
      toast.error("Failed to export CSV");
    } finally {
      setExporting(false);
    }
  };

  const getStatusColor = (status) =>
    ({ draft: "gray", published: "green", ongoing: "blue", completed: "purple", closed: "red" }[status] || "gray");

  if (loading) {
    return (
      <Flex align="center" justify="center" style={{ minHeight: "50vh" }}>
        <Spinner size="3" />
      </Flex>
    );
  }

  if (!event) return null;

  const stats = analytics?.stats || {};
  const teamStats = analytics?.teamStats;

  return (
    <Box p="6">
      {/* Header */}
      <Flex direction={{ initial: "column", md: "row" }} justify="between" align={{ md: "center" }} mb="6" gap="4">
        <Box>
          <Button variant="ghost" onClick={() => navigate("/organizer/dashboard")} mb="2">
            <ArrowLeftIcon width="16" height="16" />
            <Text>Back to Dashboard</Text>
          </Button>
          <Heading size="7">{event.name}</Heading>
          <Flex align="center" gap="2" mt="1">
            <Badge color={getStatusColor(event.status)} size="2">{event.status}</Badge>
            <Badge color="purple" variant="soft">{event.eventType}</Badge>
          </Flex>
        </Box>
        <Flex gap="2">
          {(event.status === "draft" || event.status === "published") && (
            <Button asChild variant="soft">
              <Link to={`/organizer/events/${id}/edit`}>
                <Pencil1Icon width="16" height="16" />
                <Text>Edit</Text>
              </Link>
            </Button>
          )}
          <Button asChild variant="soft" color="green">
            <Link to={`/organizer/events/${id}/attendance`}>
              <CheckCircledIcon width="16" height="16" />
              <Text>QR Check-in</Text>
            </Link>
          </Button>
          <Button onClick={handleExportCSV} disabled={exporting} variant="soft" color="purple">
            <DownloadIcon width="16" height="16" />
            <Text>{exporting ? "Exporting..." : "Export CSV"}</Text>
          </Button>
        </Flex>
      </Flex>

      <Tabs.Root defaultValue="overview">
        <Tabs.List mb="6">
          <Tabs.Trigger value="overview">Overview</Tabs.Trigger>
          <Tabs.Trigger value="analytics">Analytics</Tabs.Trigger>
          <Tabs.Trigger value="participants">Participants ({participants.length})</Tabs.Trigger>
        </Tabs.List>

        {/* ===== OVERVIEW TAB ===== */}
        <Tabs.Content value="overview">
          <Grid columns={{ initial: "1", md: "2" }} gap="6">
            <Card>
              <Heading size="4" mb="4">Event Details</Heading>
              <Flex direction="column" gap="3">
                <Flex justify="between">
                  <Text color="gray" size="2">Name</Text>
                  <Text weight="medium">{event.name}</Text>
                </Flex>
                <Flex justify="between">
                  <Text color="gray" size="2">Type</Text>
                  <Badge color="purple">{event.eventType}</Badge>
                </Flex>
                <Flex justify="between">
                  <Text color="gray" size="2">Status</Text>
                  <Badge color={getStatusColor(event.status)}>{event.status}</Badge>
                </Flex>
                <Flex justify="between">
                  <Text color="gray" size="2">Eligibility</Text>
                  <Text>{event.eligibility === "all" ? "Open to All" : event.eligibility}</Text>
                </Flex>
                <Flex justify="between">
                  <Text color="gray" size="2">Registration Fee</Text>
                  <Text weight="medium">{event.registrationFee > 0 ? `₹${event.registrationFee}` : "Free"}</Text>
                </Flex>
                <Flex justify="between">
                  <Text color="gray" size="2">Registration Limit</Text>
                  <Text>{event.registrationLimit || "Unlimited"}</Text>
                </Flex>
              </Flex>
            </Card>

            <Card>
              <Heading size="4" mb="4">Dates & Venue</Heading>
              <Flex direction="column" gap="3">
                <Flex justify="between">
                  <Flex align="center" gap="1">
                    <CalendarIcon width="14" height="14" />
                    <Text color="gray" size="2">Start Date</Text>
                  </Flex>
                  <Text>{event.startDate ? format(new Date(event.startDate), "MMM d, yyyy h:mm a") : "N/A"}</Text>
                </Flex>
                <Flex justify="between">
                  <Flex align="center" gap="1">
                    <CalendarIcon width="14" height="14" />
                    <Text color="gray" size="2">End Date</Text>
                  </Flex>
                  <Text>{event.endDate ? format(new Date(event.endDate), "MMM d, yyyy h:mm a") : "N/A"}</Text>
                </Flex>
                <Flex justify="between">
                  <Flex align="center" gap="1">
                    <ClockIcon width="14" height="14" />
                    <Text color="gray" size="2">Reg. Deadline</Text>
                  </Flex>
                  <Text>{event.registrationDeadline ? format(new Date(event.registrationDeadline), "MMM d, yyyy h:mm a") : "N/A"}</Text>
                </Flex>
                <Flex justify="between">
                  <Flex align="center" gap="1">
                    <GlobeIcon width="14" height="14" />
                    <Text color="gray" size="2">Venue</Text>
                  </Flex>
                  <Text>{event.venue || "Not specified"}</Text>
                </Flex>
              </Flex>
            </Card>

            {event.description && (
              <Card style={{ gridColumn: "1 / -1" }}>
                <Heading size="4" mb="2">Description</Heading>
                <Text color="gray" style={{ whiteSpace: "pre-wrap" }}>{event.description}</Text>
              </Card>
            )}
          </Grid>
        </Tabs.Content>

        {/* ===== ANALYTICS TAB ===== */}
        <Tabs.Content value="analytics">
          {/* Key Metrics */}
          <Grid columns={{ initial: "2", md: "4" }} gap="4" mb="6">
            <Card>
              <Flex direction="column" align="center">
                <Text size="6" weight="bold" color="blue">{stats.totalRegistrations ?? event.registrationCount ?? 0}</Text>
                <Text size="2" color="gray">Total Registrations</Text>
              </Flex>
            </Card>
            <Card>
              <Flex direction="column" align="center">
                <Text size="6" weight="bold" color="green">{stats.confirmed ?? 0}</Text>
                <Text size="2" color="gray">Confirmed</Text>
              </Flex>
            </Card>
            <Card>
              <Flex direction="column" align="center">
                <Text size="6" weight="bold" color="purple">{stats.attended ?? 0}</Text>
                <Text size="2" color="gray">Attended</Text>
              </Flex>
            </Card>
            <Card>
              <Flex direction="column" align="center">
                <Text size="6" weight="bold" color="yellow">₹{stats.revenue ?? event.revenue ?? 0}</Text>
                <Text size="2" color="gray">Revenue</Text>
              </Flex>
            </Card>
          </Grid>

          <Grid columns={{ initial: "1", md: "2" }} gap="4" mb="6">
            {/* Attendance */}
            <Card>
              <Heading size="4" mb="4">Attendance</Heading>
              <Flex direction="column" gap="3">
                <Flex justify="between">
                  <Text color="gray">Attendance Rate</Text>
                  <Text weight="bold">{stats.attendanceRate ?? 0}%</Text>
                </Flex>
                <Flex justify="between">
                  <Text color="gray">Attended</Text>
                  <Text>{stats.attended ?? 0}</Text>
                </Flex>
                <Flex justify="between">
                  <Text color="gray">Cancelled</Text>
                  <Text color="red">{stats.cancelled ?? 0}</Text>
                </Flex>
              </Flex>
            </Card>

            {/* Team Stats */}
            <Card>
              <Heading size="4" mb="4">Team Completion</Heading>
              {teamStats ? (
                <Flex direction="column" gap="3">
                  <Flex justify="between">
                    <Text color="gray">Total Teams</Text>
                    <Text weight="bold">{teamStats.totalTeams}</Text>
                  </Flex>
                  <Flex justify="between">
                    <Text color="gray">Complete Teams</Text>
                    <Text color="green">{teamStats.completeTeams}</Text>
                  </Flex>
                  <Flex justify="between">
                    <Text color="gray">Incomplete Teams</Text>
                    <Text color="orange">{teamStats.incompleteTeams}</Text>
                  </Flex>
                  <Flex justify="between">
                    <Text color="gray">Completion Rate</Text>
                    <Text weight="bold">{teamStats.completionRate}%</Text>
                  </Flex>
                </Flex>
              ) : (
                <Text color="gray" size="2">No team data for this event</Text>
              )}
            </Card>
          </Grid>

          {/* Registration Trend */}
          {analytics?.registrationTrend && analytics.registrationTrend.length > 0 && (
            <Card mb="6">
              <Heading size="4" mb="4">Registration Trend (Last 7 Days)</Heading>
              <Flex gap="2" align="end" style={{ height: 120 }}>
                {analytics.registrationTrend.map((d) => {
                  const maxCount = Math.max(...analytics.registrationTrend.map((x) => x.count), 1);
                  return (
                    <Flex key={d._id} direction="column" align="center" gap="1" style={{ flex: 1 }}>
                      <Text size="1" weight="bold">{d.count}</Text>
                      <Box
                        style={{
                          width: "100%",
                          height: `${(d.count / maxCount) * 80}px`,
                          backgroundColor: "var(--blue-9)",
                          borderRadius: "var(--radius-1)",
                          minHeight: 4,
                        }}
                      />
                      <Text size="1" color="gray">{d._id.slice(5)}</Text>
                    </Flex>
                  );
                })}
              </Flex>
            </Card>
          )}
        </Tabs.Content>

        {/* ===== PARTICIPANTS TAB ===== */}
        <Tabs.Content value="participants">
          {/* Filters */}
          <Card mb="4">
            <Flex direction={{ initial: "column", md: "row" }} gap="4" align={{ md: "center" }}>
              <Box style={{ flex: 1 }}>
                <TextField.Root
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search by name, email, or ticket ID..."
                >
                  <TextField.Slot>
                    <MagnifyingGlassIcon width="16" height="16" />
                  </TextField.Slot>
                </TextField.Root>
              </Box>
              <Flex gap="3" align="center">
                <MixerHorizontalIcon width="16" height="16" color="gray" />
                <Select.Root value={statusFilter} onValueChange={setStatusFilter}>
                  <Select.Trigger placeholder="Status" />
                  <Select.Content>
                    <Select.Item value="all">All Status</Select.Item>
                    <Select.Item value="confirmed">Confirmed</Select.Item>
                    <Select.Item value="pending">Pending</Select.Item>
                    <Select.Item value="cancelled">Cancelled</Select.Item>
                  </Select.Content>
                </Select.Root>
                <Select.Root value={checkInFilter} onValueChange={setCheckInFilter}>
                  <Select.Trigger placeholder="Check-in" />
                  <Select.Content>
                    <Select.Item value="all">All Check-in</Select.Item>
                    <Select.Item value="checked-in">Checked In</Select.Item>
                    <Select.Item value="not-checked-in">Not Checked In</Select.Item>
                  </Select.Content>
                </Select.Root>
              </Flex>
            </Flex>
          </Card>

          {/* Participants Table */}
          <Card>
            <Table.Root>
              <Table.Header>
                <Table.Row>
                  <Table.ColumnHeaderCell>Participant</Table.ColumnHeaderCell>
                  <Table.ColumnHeaderCell>Ticket ID</Table.ColumnHeaderCell>
                  <Table.ColumnHeaderCell>Reg Date</Table.ColumnHeaderCell>
                  <Table.ColumnHeaderCell>Payment</Table.ColumnHeaderCell>
                  <Table.ColumnHeaderCell>Team</Table.ColumnHeaderCell>
                  <Table.ColumnHeaderCell>Attendance</Table.ColumnHeaderCell>
                </Table.Row>
              </Table.Header>
              <Table.Body>
                {filteredParticipants.length > 0 ? (
                  filteredParticipants.map((p) => (
                    <Table.Row key={p._id}>
                      <Table.Cell>
                        <Box>
                          <Text weight="medium" size="2">
                            {p.userId?.firstName} {p.userId?.lastName}
                          </Text>
                          <Flex align="center" gap="1">
                            <EnvelopeClosedIcon width="12" height="12" color="gray" />
                            <Text size="1" color="gray">{p.userId?.email || "N/A"}</Text>
                          </Flex>
                        </Box>
                      </Table.Cell>
                      <Table.Cell>
                        <Code size="1">{p.ticketId?.slice(0, 12) || "N/A"}</Code>
                      </Table.Cell>
                      <Table.Cell>
                        <Text size="2" color="gray">
                          {p.createdAt ? format(new Date(p.createdAt), "MMM d, yyyy") : "N/A"}
                        </Text>
                      </Table.Cell>
                      <Table.Cell>
                        <Badge
                          color={
                            p.paymentStatus === "paid" ? "green" :
                            p.paymentStatus === "pending" ? "orange" :
                            p.amount === 0 || event.registrationFee === 0 ? "green" : "gray"
                          }
                        >
                          {p.paymentStatus === "paid" || p.amount === 0 || event.registrationFee === 0
                            ? "Paid"
                            : p.paymentStatus || "N/A"}
                          {(p.amount > 0) && ` ₹${p.amount}`}
                        </Badge>
                      </Table.Cell>
                      <Table.Cell>
                        {p.teamId?.name ? (
                          <Badge variant="soft" color="blue">{p.teamId.name}</Badge>
                        ) : (
                          <Text size="2" color="gray">—</Text>
                        )}
                      </Table.Cell>
                      <Table.Cell>
                        {p.attended ? (
                          <Badge color="green">
                            <CheckCircledIcon width="12" height="12" />
                            Checked In
                          </Badge>
                        ) : (
                          <Badge color="gray">
                            <ClockIcon width="12" height="12" />
                            Pending
                          </Badge>
                        )}
                      </Table.Cell>
                    </Table.Row>
                  ))
                ) : (
                  <Table.Row>
                    <Table.Cell colSpan={6}>
                      <Flex justify="center" py="6">
                        <Text color="gray">
                          {participants.length === 0
                            ? "No participants registered yet"
                            : "No participants match your filters"}
                        </Text>
                      </Flex>
                    </Table.Cell>
                  </Table.Row>
                )}
              </Table.Body>
            </Table.Root>
          </Card>
        </Tabs.Content>
      </Tabs.Root>
    </Box>
  );
};

export default OrganizerEventDetail;
