import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { organizerService, attendanceService } from "../../services";
import { toast } from "react-toastify";
import { Box, Card, Flex, Text, Button, Heading, Badge, TextField, Select, Table, Grid, Spinner, Code } from "@radix-ui/themes";
import { ArrowLeftIcon, DownloadIcon, MagnifyingGlassIcon, CheckCircledIcon, CrossCircledIcon, ClockIcon, PersonIcon, EnvelopeClosedIcon, MixerHorizontalIcon, BarChartIcon } from "@radix-ui/react-icons";
import { format } from "date-fns";

const EventParticipants = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [event, setEvent] = useState(null);
  const [participants, setParticipants] = useState([]);
  const [filteredParticipants, setFilteredParticipants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [checkInFilter, setCheckInFilter] = useState("all");
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    fetchEventDetails();
  }, [id]);

  useEffect(() => {
    filterParticipants();
  }, [participants, search, statusFilter, checkInFilter]);

  const fetchEventDetails = async () => {
    try {
      const response = await organizerService.getEventDetails(id);
      const eventData = response?.event || response;
      setEvent(eventData);
      setParticipants(eventData.registrations || []);
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
      const searchLower = search.toLowerCase();
      filtered = filtered.filter(
        (p) =>
          p.participant?.name?.toLowerCase().includes(searchLower) ||
          p.participant?.email?.toLowerCase().includes(searchLower) ||
          p.ticketId?.toLowerCase().includes(searchLower)
      );
    }

    if (statusFilter !== "all") {
      filtered = filtered.filter((p) => p.status === statusFilter);
    }

    if (checkInFilter !== "all") {
      filtered = filtered.filter((p) => p.checkInStatus === checkInFilter);
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
    } catch (error) {
      toast.error("Failed to export CSV");
    } finally {
      setExporting(false);
    }
  };

  const handleCheckIn = async (ticketId) => {
    try {
      await attendanceService.manualCheckIn(id, ticketId, "Manual check-in from participants page");
      toast.success("Participant checked in!");
      fetchEventDetails();
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to check in");
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      confirmed: "green",
      pending: "orange",
      cancelled: "red",
    };
    return colors[status] || "gray";
  };

  const getCheckInColor = (status) => {
    const colors = {
      "checked-in": "green",
      "not-checked-in": "gray",
    };
    return colors[status] || "gray";
  };

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
      <Flex direction={{ initial: "column", md: "row" }} justify="between" align={{ md: "center" }} mb="6" gap="4">
        <Box>
          <Button variant="ghost" onClick={() => navigate(-1)} mb="2">
            <ArrowLeftIcon width="16" height="16" />
            <Text>Back</Text>
          </Button>
          <Heading size="6">Participants</Heading>
          <Text color="gray">{event?.name}</Text>
        </Box>

        <Flex gap="3">
          <Button variant="soft" onClick={() => navigate(`/organizer/events/${id}/check-in`)}>
            <BarChartIcon width="16" height="16" />
            <Text>Check-in Scanner</Text>
          </Button>
          <Button onClick={handleExportCSV} disabled={exporting}>
            <DownloadIcon width="16" height="16" />
            <Text>{exporting ? "Exporting..." : "Export CSV"}</Text>
          </Button>
        </Flex>
      </Flex>

      {/* Stats */}
      <Grid columns={{ initial: "2", md: "4" }} gap="4" mb="6">
        <Card>
          <Flex direction="column" align="center">
            <Text size="6" weight="bold" color="blue">{participants.length}</Text>
            <Text size="2" color="gray">Total</Text>
          </Flex>
        </Card>
        <Card>
          <Flex direction="column" align="center">
            <Text size="6" weight="bold" color="green">
              {participants.filter((p) => p.status === "confirmed").length}
            </Text>
            <Text size="2" color="gray">Confirmed</Text>
          </Flex>
        </Card>
        <Card>
          <Flex direction="column" align="center">
            <Text size="6" weight="bold" color="purple">
              {participants.filter((p) => p.checkInStatus === "checked-in").length}
            </Text>
            <Text size="2" color="gray">Checked In</Text>
          </Flex>
        </Card>
        <Card>
          <Flex direction="column" align="center">
            <Text size="6" weight="bold" color="red">
              {participants.filter((p) => p.status === "cancelled").length}
            </Text>
            <Text size="2" color="gray">Cancelled</Text>
          </Flex>
        </Card>
      </Grid>

      {/* Filters */}
      <Card mb="6">
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

          <Flex gap="4" align="center">
            <Flex align="center" gap="2">
              <MixerHorizontalIcon width="16" height="16" color="gray" />
              <Select.Root value={statusFilter} onValueChange={setStatusFilter}>
                <Select.Trigger placeholder="All Status" />
                <Select.Content>
                  <Select.Item value="all">All Status</Select.Item>
                  <Select.Item value="confirmed">Confirmed</Select.Item>
                  <Select.Item value="pending">Pending</Select.Item>
                  <Select.Item value="cancelled">Cancelled</Select.Item>
                </Select.Content>
              </Select.Root>
            </Flex>

            <Select.Root value={checkInFilter} onValueChange={setCheckInFilter}>
              <Select.Trigger placeholder="All Check-in" />
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
              <Table.ColumnHeaderCell>Status</Table.ColumnHeaderCell>
              <Table.ColumnHeaderCell>Check-in</Table.ColumnHeaderCell>
              <Table.ColumnHeaderCell>Registered At</Table.ColumnHeaderCell>
              <Table.ColumnHeaderCell>Actions</Table.ColumnHeaderCell>
            </Table.Row>
          </Table.Header>

          <Table.Body>
            {filteredParticipants.length > 0 ? (
              filteredParticipants.map((registration) => (
                <Table.Row key={registration._id}>
                  <Table.Cell>
                    <Flex align="center" gap="3">
                      <Flex
                        align="center"
                        justify="center"
                        style={{
                          padding: "8px",
                          backgroundColor: "var(--gray-3)",
                          borderRadius: "50%",
                        }}
                      >
                        <PersonIcon width="20" height="20" color="gray" />
                      </Flex>
                      <Box>
                        <Text weight="medium">
                          {registration.participant?.name || "Unknown"}
                        </Text>
                        <Flex align="center" gap="1">
                          <EnvelopeClosedIcon width="12" height="12" color="gray" />
                          <Text size="1" color="gray">
                            {registration.participant?.email || "N/A"}
                          </Text>
                        </Flex>
                      </Box>
                    </Flex>
                  </Table.Cell>
                  <Table.Cell>
                    <Code size="1">
                      {registration.ticketId?.slice(0, 10) || "N/A"}...
                    </Code>
                  </Table.Cell>
                  <Table.Cell>
                    <Badge color={getStatusColor(registration.status)}>
                      {registration.status}
                    </Badge>
                  </Table.Cell>
                  <Table.Cell>
                    <Badge color={getCheckInColor(registration.checkInStatus)}>
                      {registration.checkInStatus === "checked-in" ? (
                        <Flex align="center" gap="1">
                          <CheckCircledIcon width="12" height="12" />
                          <Text>Checked In</Text>
                        </Flex>
                      ) : (
                        <Flex align="center" gap="1">
                          <ClockIcon width="12" height="12" />
                          <Text>Pending</Text>
                        </Flex>
                      )}
                    </Badge>
                  </Table.Cell>
                  <Table.Cell>
                    <Text size="2" color="gray">
                      {registration.registeredAt
                        ? format(new Date(registration.registeredAt), "MMM d, yyyy HH:mm")
                        : "N/A"}
                    </Text>
                  </Table.Cell>
                  <Table.Cell>
                    {registration.status === "confirmed" &&
                      registration.checkInStatus !== "checked-in" && (
                        <Button
                          size="1"
                          color="green"
                          onClick={() => handleCheckIn(registration.ticketId)}
                        >
                          Check In
                        </Button>
                      )}
                    {registration.checkInStatus === "checked-in" && (
                      <Flex align="center" gap="1">
                        <CheckCircledIcon width="16" height="16" color="green" />
                        <Text size="2" color="green">Done</Text>
                      </Flex>
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
    </Box>
  );
};

export default EventParticipants;
