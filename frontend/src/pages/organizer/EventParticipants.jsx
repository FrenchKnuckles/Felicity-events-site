import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { organizerService, attendanceService } from "../../services";
import { toast } from "react-toastify";
import { Box, Card, Flex, Text, Button, Heading, Badge, TextField, Select, Table, Grid, Spinner, Code } from "@radix-ui/themes";
import { ArrowLeftIcon, DownloadIcon, MagnifyingGlassIcon, CheckCircledIcon, ClockIcon, PersonIcon, EnvelopeClosedIcon, MixerHorizontalIcon, BarChartIcon } from "@radix-ui/react-icons";
import { format } from "date-fns";

const EventParticipants = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [event, setEvent] = useState(null);
  const [participants, setParticipants] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusF, setStatusF] = useState("all");
  const [checkInF, setCheckInF] = useState("all");
  const [exporting, setExporting] = useState(false);

  const fetch = async () => {
    try {
      const r = await organizerService.getEventDetails(id);
      const ev = r?.event || r; setEvent(ev); setParticipants(ev.registrations || []);
    } catch { toast.error("Failed to fetch event details"); navigate("/organizer/dashboard"); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetch(); }, [id]);
  useEffect(() => {
    let f = [...participants];
    if (search) { const s = search.toLowerCase(); f = f.filter(p => p.participant?.name?.toLowerCase().includes(s) || p.participant?.email?.toLowerCase().includes(s) || p.ticketId?.toLowerCase().includes(s)); }
    if (statusF !== "all") f = f.filter(p => p.status === statusF);
    if (checkInF !== "all") f = f.filter(p => p.checkInStatus === checkInF);
    setFiltered(f);
  }, [participants, search, statusF, checkInF]);

  const exportCSV = async () => {
    setExporting(true);
    try {
      const r = await organizerService.exportParticipantsCSV(id);
      const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([r], { type: "text/csv" }));
      a.download = `${event?.name || "event"}_participants.csv`; document.body.appendChild(a); a.click(); document.body.removeChild(a); toast.success("CSV exported!");
    } catch { toast.error("Failed to export CSV"); } finally { setExporting(false); }
  };

  const checkIn = async (ticketId) => {
    try { await attendanceService.manualCheckIn(id, ticketId, "Manual check-in from participants page"); toast.success("Participant checked in!"); fetch(); }
    catch (e) { toast.error(e.response?.data?.message || "Failed to check in"); }
  };

  if (loading) return <Flex align="center" justify="center" style={{ minHeight: "50vh" }}><Spinner size="3" /></Flex>;

  const cnts = { total: participants.length, confirmed: participants.filter(p => p.status === "confirmed").length, checkedIn: participants.filter(p => p.checkInStatus === "checked-in").length, cancelled: participants.filter(p => p.status === "cancelled").length };

  return (
    <Box p="6">
      <Flex direction={{ initial: "column", md: "row" }} justify="between" align={{ md: "center" }} mb="6" gap="4">
        <Box>
          <Button variant="ghost" onClick={() => navigate(-1)} mb="2"><ArrowLeftIcon width="16" height="16" /><Text>Back</Text></Button>
          <Heading size="6">Participants</Heading><Text color="gray">{event?.name}</Text>
        </Box>
        <Flex gap="3">
          <Button variant="soft" onClick={() => navigate(`/organizer/events/${id}/check-in`)}><BarChartIcon width="16" height="16" /><Text>Check-in Scanner</Text></Button>
          <Button onClick={exportCSV} disabled={exporting}><DownloadIcon width="16" height="16" /><Text>{exporting ? "Exporting..." : "Export CSV"}</Text></Button>
        </Flex>
      </Flex>

      <Grid columns={{ initial: "2", md: "4" }} gap="4" mb="6">
        {[{ v: cnts.total, l: "Total", c: "blue" }, { v: cnts.confirmed, l: "Confirmed", c: "green" }, { v: cnts.checkedIn, l: "Checked In", c: "purple" }, { v: cnts.cancelled, l: "Cancelled", c: "red" }].map(s =>
          <Card key={s.l}><Flex direction="column" align="center"><Text size="6" weight="bold" color={s.c}>{s.v}</Text><Text size="2" color="gray">{s.l}</Text></Flex></Card>
        )}
      </Grid>

      <Card mb="6">
        <Flex direction={{ initial: "column", md: "row" }} gap="4" align={{ md: "center" }}>
          <Box style={{ flex: 1 }}><TextField.Root value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name, email, or ticket ID..."><TextField.Slot><MagnifyingGlassIcon width="16" height="16" /></TextField.Slot></TextField.Root></Box>
          <Flex gap="4" align="center">
            <MixerHorizontalIcon width="16" height="16" color="gray" />
            <Select.Root value={statusF} onValueChange={setStatusF}><Select.Trigger placeholder="All Status" /><Select.Content><Select.Item value="all">All Status</Select.Item><Select.Item value="confirmed">Confirmed</Select.Item><Select.Item value="pending">Pending</Select.Item><Select.Item value="cancelled">Cancelled</Select.Item></Select.Content></Select.Root>
            <Select.Root value={checkInF} onValueChange={setCheckInF}><Select.Trigger placeholder="All Check-in" /><Select.Content><Select.Item value="all">All Check-in</Select.Item><Select.Item value="checked-in">Checked In</Select.Item><Select.Item value="not-checked-in">Not Checked In</Select.Item></Select.Content></Select.Root>
          </Flex>
        </Flex>
      </Card>

      <Card>
        <Table.Root>
          <Table.Header><Table.Row><Table.ColumnHeaderCell>Participant</Table.ColumnHeaderCell><Table.ColumnHeaderCell>Ticket ID</Table.ColumnHeaderCell><Table.ColumnHeaderCell>Status</Table.ColumnHeaderCell><Table.ColumnHeaderCell>Check-in</Table.ColumnHeaderCell><Table.ColumnHeaderCell>Registered At</Table.ColumnHeaderCell><Table.ColumnHeaderCell>Actions</Table.ColumnHeaderCell></Table.Row></Table.Header>
          <Table.Body>
            {filtered.length > 0 ? filtered.map(r => (
              <Table.Row key={r._id}>
                <Table.Cell><Flex align="center" gap="3"><Flex align="center" justify="center" style={{ padding: "8px", backgroundColor: "var(--gray-3)", borderRadius: "50%" }}><PersonIcon width="20" height="20" color="gray" /></Flex><Box><Text weight="medium">{r.participant?.name || "Unknown"}</Text><Flex align="center" gap="1"><EnvelopeClosedIcon width="12" height="12" color="gray" /><Text size="1" color="gray">{r.participant?.email || "N/A"}</Text></Flex></Box></Flex></Table.Cell>
                <Table.Cell><Code size="1">{r.ticketId?.slice(0, 10) || "N/A"}...</Code></Table.Cell>
                <Table.Cell><Badge color={{ confirmed: "green", pending: "orange", cancelled: "red" }[r.status] || "gray"}>{r.status}</Badge></Table.Cell>
                <Table.Cell><Badge color={r.checkInStatus === "checked-in" ? "green" : "gray"}>{r.checkInStatus === "checked-in" ? <Flex align="center" gap="1"><CheckCircledIcon width="12" height="12" /><Text>Checked In</Text></Flex> : <Flex align="center" gap="1"><ClockIcon width="12" height="12" /><Text>Pending</Text></Flex>}</Badge></Table.Cell>
                <Table.Cell><Text size="2" color="gray">{r.registeredAt ? format(new Date(r.registeredAt), "MMM d, yyyy HH:mm") : "N/A"}</Text></Table.Cell>
                <Table.Cell>{r.status === "confirmed" && r.checkInStatus !== "checked-in" && <Button size="1" color="green" onClick={() => checkIn(r.ticketId)}>Check In</Button>}{r.checkInStatus === "checked-in" && <Flex align="center" gap="1"><CheckCircledIcon width="16" height="16" color="green" /><Text size="2" color="green">Done</Text></Flex>}</Table.Cell>
              </Table.Row>
            )) : <Table.Row><Table.Cell colSpan={6}><Flex justify="center" py="6"><Text color="gray">{participants.length === 0 ? "No participants registered yet" : "No participants match your filters"}</Text></Flex></Table.Cell></Table.Row>}
          </Table.Body>
        </Table.Root>
      </Card>
    </Box>
  );
};

export default EventParticipants;
