import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { organizerService } from "../../services";
import { toast } from "react-toastify";
import { format } from "date-fns";
import { Box, Card, Flex, Text, Button, Heading, Badge, Grid, Spinner, Tabs, Table, TextField, Select, Code } from "@radix-ui/themes";
import { ArrowLeftIcon, DownloadIcon, MagnifyingGlassIcon, CheckCircledIcon, CrossCircledIcon, ClockIcon, PersonIcon, EnvelopeClosedIcon, MixerHorizontalIcon, Pencil1Icon, CalendarIcon, GlobeIcon } from "@radix-ui/react-icons";

const sc = s => ({ draft: "gray", published: "green", ongoing: "blue", completed: "purple", closed: "red" }[s] || "gray");
const orderStatusColor = s => ({ pending: "orange", confirmed: "green", rejected: "red", cancelled: "gray" }[s] || "gray");

const OrganizerEventDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [event, setEvent] = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [participants, setParticipants] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusF, setStatusF] = useState("all");
  const [checkInF, setCheckInF] = useState("all");
  const [instF, setInstF] = useState("all");
  const [exporting, setExporting] = useState(false);

  // Merchandise orders state
  const [merchOrders, setMerchOrders] = useState([]);
  const [merchLoading, setMerchLoading] = useState(false);
  const [merchStatusFilter, setMerchStatusFilter] = useState("all");
  const [merchCounts, setMerchCounts] = useState({});
  const [actioningId, setActioningId] = useState(null);

  useEffect(() => { fetchAll(); }, [id]);
  useEffect(() => {
    let f = [...participants];
    if (search) { const s = search.toLowerCase(); f = f.filter(p => (`${p.userId?.firstName} ${p.userId?.lastName}`).toLowerCase().includes(s) || p.userId?.email?.toLowerCase().includes(s) || p.ticketId?.toLowerCase().includes(s)); }
    if (statusF !== "all") f = f.filter(p => p.status === statusF);
    if (checkInF !== "all") f = f.filter(p => checkInF === "checked-in" ? p.attended : !p.attended);
    if (instF !== "all") f = f.filter(p => instF === "iiit" ? p.userId?.participantType === "iiit" : p.userId?.participantType !== "iiit");
    setFiltered(f);
  }, [participants, search, statusF, checkInF, instF]);

  const fetchAll = async () => {
    try {
      const [eRes, aRes] = await Promise.all([organizerService.getEventDetails(id), organizerService.getEventAnalytics(id).catch(() => null)]);
      const ev = eRes?.event || eRes; setEvent(ev); setAnalytics(aRes);
      try { const pRes = await organizerService.getParticipants(id); setParticipants(pRes?.participants || []); } catch { setParticipants([]); }
      if (ev?.eventType === "merchandise") fetchMerchOrders();
    } catch { toast.error("Failed to fetch event details"); navigate("/organizer/dashboard"); }
    finally { setLoading(false); }
  };

  const fetchMerchOrders = async (statusFilter) => {
    setMerchLoading(true);
    try {
      const params = {};
      if (statusFilter && statusFilter !== "all") params.status = statusFilter;
      const res = await organizerService.getMerchandiseOrders(id, params);
      setMerchOrders(res?.orders || []);
      setMerchCounts(res?.counts || {});
    } catch { toast.error("Failed to fetch merchandise orders"); }
    finally { setMerchLoading(false); }
  };

  const handleApprove = async (ticketId) => {
    setActioningId(ticketId);
    try {
      await organizerService.approveMerchandiseOrder(id, ticketId);
      toast.success("Order approved! Ticket generated & email sent.");
      fetchMerchOrders(merchStatusFilter);
    } catch (e) { toast.error(e.response?.data?.message || "Failed to approve order"); }
    finally { setActioningId(null); }
  };

  const handleReject = async (ticketId) => {
    setActioningId(ticketId);
    try {
      await organizerService.rejectMerchandiseOrder(id, ticketId);
      toast.success("Order rejected.");
      fetchMerchOrders(merchStatusFilter);
    } catch (e) { toast.error(e.response?.data?.message || "Failed to reject order"); }
    finally { setActioningId(null); }
  };

  const exportCSV = async () => {
    setExporting(true);
    try {
      const r = await organizerService.exportParticipantsCSV(id);
      const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([r], { type: "text/csv" }));
      a.download = `${event?.name || "event"}_participants.csv`; document.body.appendChild(a); a.click(); document.body.removeChild(a); toast.success("CSV exported!");
    } catch { toast.error("Failed to export CSV"); } finally { setExporting(false); }
  };

  if (loading) return <Flex align="center" justify="center" style={{ minHeight: "50vh" }}><Spinner size="3" /></Flex>;
  if (!event) return null;

  const stats = analytics?.stats || {};
  const ts = analytics?.teamStats;
  const Row = ({ l, v }) => <Flex justify="between"><Text color="gray" size="2">{l}:</Text>{typeof v === "string" ? <Text weight="medium">{v}</Text> : v}</Flex>;

  return (
    <Box p="6">
      <Flex direction={{ initial: "column", md: "row" }} justify="between" align={{ md: "center" }} mb="6" gap="4">
        <Box>
          <Button variant="ghost" onClick={() => navigate("/organizer/dashboard")} mb="2"><ArrowLeftIcon width="16" height="16" /><Text>Back to Dashboard</Text></Button>
          <Heading size="7">{event.name}</Heading>
          <Flex align="center" gap="2" mt="1"><Badge color={sc(event.status)} size="2">{event.status}</Badge><Badge color="purple" variant="soft">{event.eventType}</Badge></Flex>
        </Box>
        <Flex gap="2">
          {(event.status === "draft" || event.status === "published") && <Button asChild variant="soft"><Link to={`/organizer/events/${id}/edit`}><Pencil1Icon width="16" height="16" /><Text>Edit</Text></Link></Button>}
          <Button asChild variant="soft" color="green"><Link to={`/organizer/events/${id}/attendance`}><CheckCircledIcon width="16" height="16" /><Text>QR Check-in</Text></Link></Button>
          <Button onClick={exportCSV} disabled={exporting} variant="soft" color="purple"><DownloadIcon width="16" height="16" /><Text>{exporting ? "Exporting..." : "Export CSV"}</Text></Button>
        </Flex>
      </Flex>

      <Tabs.Root defaultValue="overview">
        <Tabs.List mb="6"><Tabs.Trigger value="overview">Overview</Tabs.Trigger><Tabs.Trigger value="analytics">Analytics</Tabs.Trigger><Tabs.Trigger value="participants">Participants ({participants.length})</Tabs.Trigger>{event.eventType === "merchandise" && <Tabs.Trigger value="orders">Merchandise Orders</Tabs.Trigger>}</Tabs.List>

        <Tabs.Content value="overview">
          <Grid columns={{ initial: "1", md: "2" }} gap="6">
            <Card>
              <Heading size="4" mb="4">Event Details</Heading>
              <Flex direction="column" gap="3">
                <Row l="Name" v={event.name} /><Row l="Type" v={<Badge color="purple">{event.eventType}</Badge>} /><Row l="Status" v={<Badge color={sc(event.status)}>{event.status}</Badge>} />
                <Row l="Eligibility" v={event.eligibility === "all" ? "Open to All" : event.eligibility} />
                <Row l="Registration Fee" v={event.registrationFee > 0 ? `₹${event.registrationFee}` : "Free"} />
                <Row l="Registration Limit" v={String(event.registrationLimit || "Unlimited")} />
              </Flex>
            </Card>
            <Card>
              <Heading size="4" mb="4">Dates & Venue</Heading>
              <Flex direction="column" gap="3">
                <Row l={event.eventType === "merchandise" ? "Reg. Deadline" : "Start Date"}
                  v={event.eventType === "merchandise"
                    ? (event.registrationDeadline ? format(new Date(event.registrationDeadline), "MMM d, yyyy h:mm a") : "No deadline")
                    : (event.startDate ? format(new Date(event.startDate), "MMM d, yyyy h:mm a") : "N/A")}
                />
                <Row l="End Date" v={event.endDate ? format(new Date(event.endDate), "MMM d, yyyy h:mm a") : "N/A"} />
                <Row l="Reg. Deadline" v={event.registrationDeadline ? format(new Date(event.registrationDeadline), "MMM d, yyyy h:mm a") : "N/A"} />
                <Row l="Venue" v={event.venue || "Not specified"} />
              </Flex>
            </Card>
            {event.description && <Card style={{ gridColumn: "1 / -1" }}><Heading size="4" mb="2">Description</Heading><Text color="gray" style={{ whiteSpace: "pre-wrap" }}>{event.description}</Text></Card>}
          </Grid>
        </Tabs.Content>

        <Tabs.Content value="analytics">
          <Grid columns={{ initial: "2", md: "4" }} gap="4" mb="6">
            {[
              { v: stats.totalRegistrations ?? event.registrationCount ?? 0, l: "Total Registrations", c: "blue" },
              { v: stats.confirmed ?? 0, l: "Confirmed", c: "green" },
              { v: stats.attended ?? 0, l: "Attended", c: "purple" },
              { v: `₹${stats.revenue ?? event.revenue ?? 0}`, l: "Revenue", c: "yellow" },
            ].map(s => <Card key={s.l}><Flex direction="column" align="center"><Text size="6" weight="bold" color={s.c}>{s.v}</Text><Text size="2" color="gray">{s.l}</Text></Flex></Card>)}
          </Grid>
          <Grid columns={{ initial: "1", md: "2" }} gap="4" mb="6">
            <Card>
              <Heading size="4" mb="4">Attendance</Heading>
              <Flex direction="column" gap="3">
                <Row l="Attendance Rate" v={`${stats.attendanceRate ?? 0}%`} /><Row l="Attended" v={String(stats.attended ?? 0)} /><Row l="Cancelled" v={<Text color="red">{stats.cancelled ?? 0}</Text>} />
              </Flex>
            </Card>
            <Card>
              <Heading size="4" mb="4">Team Completion</Heading>
              {ts ? <Flex direction="column" gap="3"><Row l="Total Teams" v={String(ts.totalTeams)} /><Row l="Complete Teams" v={<Text color="green">{ts.completeTeams}</Text>} /><Row l="Incomplete Teams" v={<Text color="orange">{ts.incompleteTeams}</Text>} /><Row l="Completion Rate" v={`${ts.completionRate}%`} /></Flex> : <Text color="gray" size="2">No team data for this event</Text>}
            </Card>
          </Grid>
          {analytics?.registrationTrend?.length > 0 && (
            <Card mb="6">
              <Heading size="4" mb="4">Registration Trend (Last 7 Days)</Heading>
              <Flex gap="2" align="end" style={{ height: 120 }}>
                {analytics.registrationTrend.map(d => {
                  const mx = Math.max(...analytics.registrationTrend.map(x => x.count), 1);
                  return <Flex key={d._id} direction="column" align="center" gap="1" style={{ flex: 1 }}><Text size="1" weight="bold">{d.count}</Text><Box style={{ width: "100%", height: `${(d.count/mx)*80}px`, backgroundColor: "var(--blue-9)", borderRadius: "var(--radius-1)", minHeight: 4 }} /><Text size="1" color="gray">{d._id.slice(5)}</Text></Flex>;
                })}
              </Flex>
            </Card>
          )}
        </Tabs.Content>

        <Tabs.Content value="participants">
          <Card mb="4">
            <Flex direction={{ initial: "column", md: "row" }} gap="4" align={{ md: "center" }}>
              <Box style={{ flex: 1 }}><TextField.Root value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name, email, or ticket ID..."><TextField.Slot><MagnifyingGlassIcon width="16" height="16" /></TextField.Slot></TextField.Root></Box>
              <Flex gap="3" align="center">
                <MixerHorizontalIcon width="16" height="16" color="gray" />
                <Select.Root value={statusF} onValueChange={setStatusF}><Select.Trigger placeholder="Status" /><Select.Content><Select.Item value="all">All Status</Select.Item><Select.Item value="confirmed">Confirmed</Select.Item><Select.Item value="pending">Pending</Select.Item><Select.Item value="cancelled">Cancelled</Select.Item></Select.Content></Select.Root>
                <Select.Root value={checkInF} onValueChange={setCheckInF}><Select.Trigger placeholder="Check-in" /><Select.Content><Select.Item value="all">All Check-in</Select.Item><Select.Item value="checked-in">Checked In</Select.Item><Select.Item value="not-checked-in">Not Checked In</Select.Item></Select.Content></Select.Root>
                <Select.Root value={instF} onValueChange={setInstF}><Select.Trigger placeholder="Institution" /><Select.Content><Select.Item value="all">All Institutions</Select.Item><Select.Item value="iiit">IIIT</Select.Item><Select.Item value="non-iiit">Non-IIIT</Select.Item></Select.Content></Select.Root>
              </Flex>
            </Flex>
          </Card>
          <Card>
            <Table.Root>
              <Table.Header><Table.Row><Table.ColumnHeaderCell>Participant</Table.ColumnHeaderCell><Table.ColumnHeaderCell>Ticket ID</Table.ColumnHeaderCell><Table.ColumnHeaderCell>Reg Date</Table.ColumnHeaderCell><Table.ColumnHeaderCell>Payment</Table.ColumnHeaderCell><Table.ColumnHeaderCell>Team</Table.ColumnHeaderCell><Table.ColumnHeaderCell>Attendance</Table.ColumnHeaderCell></Table.Row></Table.Header>
              <Table.Body>
                {filtered.length > 0 ? filtered.map(p => (
                  <Table.Row key={p._id}>
                    <Table.Cell><Box><Text weight="medium" size="2">{p.userId?.firstName} {p.userId?.lastName}</Text><Flex align="center" gap="1"><EnvelopeClosedIcon width="12" height="12" color="gray" /><Text size="1" color="gray">{p.userId?.email || "N/A"}</Text></Flex></Box></Table.Cell>
                    <Table.Cell><Code size="1">{p.ticketId?.slice(0, 12) || "N/A"}</Code></Table.Cell>
                    <Table.Cell><Text size="2" color="gray">{p.createdAt ? format(new Date(p.createdAt), "MMM d, yyyy") : "N/A"}</Text></Table.Cell>
                    <Table.Cell><Badge color={p.paymentStatus === "paid" ? "green" : p.paymentStatus === "pending" ? "orange" : p.amount === 0 || event.registrationFee === 0 ? "green" : "gray"}>{p.paymentStatus === "paid" || p.amount === 0 || event.registrationFee === 0 ? "Paid" : p.paymentStatus || "N/A"}{p.amount > 0 && ` ₹${p.amount}`}</Badge></Table.Cell>
                    <Table.Cell>{p.teamId?.name ? <Badge variant="soft" color="blue">{p.teamId.name}</Badge> : <Text size="2" color="gray">—</Text>}</Table.Cell>
                    <Table.Cell>{p.attended ? <Badge color="green"><CheckCircledIcon width="12" height="12" />Checked In</Badge> : <Badge color="gray"><ClockIcon width="12" height="12" />Pending</Badge>}</Table.Cell>
                  </Table.Row>
                )) : <Table.Row><Table.Cell colSpan={6}><Flex justify="center" py="6"><Text color="gray">{participants.length === 0 ? "No participants registered yet" : "No participants match your filters"}</Text></Flex></Table.Cell></Table.Row>}
              </Table.Body>
            </Table.Root>
          </Card>
        </Tabs.Content>

        {event.eventType === "merchandise" && (
          <Tabs.Content value="orders">
            {/* Summary counts */}
            <Grid columns={{ initial: "2", md: "4" }} gap="4" mb="4">
              {[
                { l: "Pending", v: merchCounts.pending ?? 0, c: "orange" },
                { l: "Approved", v: merchCounts.confirmed ?? 0, c: "green" },
                { l: "Rejected", v: merchCounts.rejected ?? 0, c: "red" },
                { l: "Cancelled", v: merchCounts.cancelled ?? 0, c: "gray" },
              ].map(s => (
                <Card key={s.l}><Flex direction="column" align="center"><Text size="5" weight="bold" color={s.c}>{s.v}</Text><Text size="2" color="gray">{s.l}</Text></Flex></Card>
              ))}
            </Grid>

            {/* Filter */}
            <Card mb="4">
              <Flex align="center" gap="3">
                <MixerHorizontalIcon width="16" height="16" color="gray" />
                <Select.Root value={merchStatusFilter} onValueChange={v => { setMerchStatusFilter(v); fetchMerchOrders(v); }}>
                  <Select.Trigger placeholder="Filter by status" />
                  <Select.Content>
                    <Select.Item value="all">All Orders</Select.Item>
                    <Select.Item value="pending">Pending</Select.Item>
                    <Select.Item value="confirmed">Approved</Select.Item>
                    <Select.Item value="rejected">Rejected</Select.Item>
                    <Select.Item value="cancelled">Cancelled</Select.Item>
                  </Select.Content>
                </Select.Root>
                <Button variant="soft" size="1" onClick={() => fetchMerchOrders(merchStatusFilter)}>Refresh</Button>
              </Flex>
            </Card>

            {/* Orders table */}
            <Card>
              {merchLoading ? (
                <Flex align="center" justify="center" py="6"><Spinner size="2" /></Flex>
              ) : (
                <Table.Root>
                  <Table.Header>
                    <Table.Row>
                      <Table.ColumnHeaderCell>Buyer</Table.ColumnHeaderCell>
                      <Table.ColumnHeaderCell>Variant</Table.ColumnHeaderCell>
                      <Table.ColumnHeaderCell>Amount</Table.ColumnHeaderCell>
                      <Table.ColumnHeaderCell>Payment Proof</Table.ColumnHeaderCell>
                      <Table.ColumnHeaderCell>Status</Table.ColumnHeaderCell>
                      <Table.ColumnHeaderCell>Date</Table.ColumnHeaderCell>
                      <Table.ColumnHeaderCell>Actions</Table.ColumnHeaderCell>
                    </Table.Row>
                  </Table.Header>
                  <Table.Body>
                    {merchOrders.length > 0 ? merchOrders.map(o => (
                      <Table.Row key={o._id}>
                        <Table.Cell>
                          <Box>
                            <Text weight="medium" size="2">{o.userId?.firstName} {o.userId?.lastName}</Text>
                            <Flex align="center" gap="1"><EnvelopeClosedIcon width="12" height="12" color="gray" /><Text size="1" color="gray">{o.userId?.email || "N/A"}</Text></Flex>
                          </Box>
                        </Table.Cell>
                        <Table.Cell><Text size="2">{o.variant?.size} {o.variant?.color}</Text></Table.Cell>
                        <Table.Cell><Text size="2" weight="medium">₹{o.amount}</Text></Table.Cell>
                        <Table.Cell>
                          {o.paymentProofUrl ? (
                            <a href={o.paymentProofUrl} target="_blank" rel="noopener noreferrer">
                              <img src={o.paymentProofUrl} alt="Proof" style={{ width: 48, height: 48, objectFit: "cover", borderRadius: 4, border: "1px solid var(--gray-6)", cursor: "pointer" }} />
                            </a>
                          ) : <Text size="1" color="gray">None</Text>}
                        </Table.Cell>
                        <Table.Cell><Badge color={orderStatusColor(o.status)} size="1">{o.status === "confirmed" ? "Approved" : o.status}</Badge></Table.Cell>
                        <Table.Cell><Text size="1" color="gray">{o.createdAt ? format(new Date(o.createdAt), "MMM d, h:mm a") : ""}</Text></Table.Cell>
                        <Table.Cell>
                          {o.status === "pending" ? (
                            <Flex gap="2">
                              <Button size="1" color="green" variant="soft" disabled={actioningId === o._id} onClick={() => handleApprove(o._id)}>
                                <CheckCircledIcon width="14" height="14" /> Approve
                              </Button>
                              <Button size="1" color="red" variant="soft" disabled={actioningId === o._id} onClick={() => handleReject(o._id)}>
                                <CrossCircledIcon width="14" height="14" /> Reject
                              </Button>
                            </Flex>
                          ) : <Text size="1" color="gray">—</Text>}
                        </Table.Cell>
                      </Table.Row>
                    )) : (
                      <Table.Row>
                        <Table.Cell colSpan={7}><Flex justify="center" py="6"><Text color="gray">No merchandise orders found</Text></Flex></Table.Cell>
                      </Table.Row>
                    )}
                  </Table.Body>
                </Table.Root>
              )}
            </Card>
          </Tabs.Content>
        )}
      </Tabs.Root>
    </Box>
  );
};

export default OrganizerEventDetail;
