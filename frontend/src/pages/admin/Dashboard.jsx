import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { adminService } from "../../services";
import { toast } from "react-toastify";
import { Box, Card, Flex, Text, Heading, Badge, Grid, Spinner, Button } from "@radix-ui/themes";
import { PersonIcon, AvatarIcon, CalendarIcon, CubeIcon, LockClosedIcon, CheckCircledIcon, ClockIcon, ArrowRightIcon, ReloadIcon, TrashIcon } from "@radix-ui/react-icons";
import { format } from "date-fns";

const AdminDashboard = () => {
  const [stats, setStats] = useState({ totalUsers: 0, totalOrganizers: 0, totalEvents: 0, totalRegistrations: 0, totalRevenue: 0, pendingPasswordRequests: 0 });
  const [recentEvents, setRecentEvents] = useState([]);
  const [pendingRequests, setPendingRequests] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    try {
      const [sr, er, pr] = await Promise.all([adminService.getStats(), adminService.getRecentEvents(), adminService.getPasswordRequests({ status: "pending", limit: 5 })]);
      setStats({ totalUsers: sr.totalUsers || 0, totalOrganizers: sr.totalOrganizers || 0, activeOrganizers: sr.activeOrganizers || 0, totalEvents: sr.totalEvents || 0, totalRegistrations: sr.totalRegistrations || 0, totalRevenue: sr.totalRevenue || 0, pendingPasswordRequests: sr.pendingRequests || 0 });
      setRecentEvents(Array.isArray(er) ? er : er.events || []);
      setPendingRequests(Array.isArray(pr) ? pr : pr.requests || []);
    } catch { toast.error("Failed to fetch dashboard data"); } finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, []);

  const deleteEvent = async (id) => { if (!window.confirm("Delete this event? This will also remove related tickets.")) return; try { await adminService.deleteEvent(id); toast.success("Event deleted"); fetchData(); } catch (e) { toast.error(e.response?.data?.message || "Failed to delete"); } };

  const cards = [
    { t: "Total Participants", v: stats.totalUsers, I: PersonIcon, c: "blue" },
    { t: "Total Organizers", v: stats.totalOrganizers, I: AvatarIcon, c: "purple", l: "/admin/organizers" },
    { t: "Total Events", v: stats.totalEvents, I: CalendarIcon, c: "green", l: "/admin/events" },
    { t: "Total Revenue", v: `₹${stats.totalRevenue?.toLocaleString() || 0}`, I: CubeIcon, c: "teal" },
  ];


  if (loading) return <Flex align="center" justify="center" style={{ minHeight: "50vh" }}><Spinner size="3" /></Flex>;

  return (
    <Box p="6">
      <Flex direction={{ initial: "column", md: "row" }} align={{ md: "center" }} justify="between" mb="6">
        <Box><Heading size="8" weight="bold" mb="1">Admin Dashboard</Heading><Text color="gray" size="2">Manage and monitor the platform</Text></Box>
        <Flex align="center" gap="2" mt={{ initial: "4", md: "0" }} onClick={fetchData} style={{ padding: "8px 16px", border: "1px solid var(--gray-6)", borderRadius: 8, cursor: "pointer", background: "var(--gray-2)" }}><ReloadIcon width={20} height={20} /><Text size="2">Refresh</Text></Flex>
      </Flex>

      <Grid columns={{ initial: "1", md: "2", lg: "3" }} gap="4" mb="6">
        {cards.map(s => { const Icon = s.I; const inner = <Card key={s.t} style={{ padding: 20, cursor: s.l ? "pointer" : "default", border: s.hi ? "2px solid var(--red-9)" : undefined }}>
          <Flex align="center" justify="between"><Box><Text color="gray" size="2">{s.t}</Text><Text size="7" weight="bold" style={{ display: "block", marginTop: 4 }}>{s.v}</Text></Box><Box style={{ padding: 12, borderRadius: "50%", backgroundColor: `var(--${s.c}-3)`, color: `var(--${s.c}-9)` }}><Icon width={24} height={24} /></Box></Flex>
          {s.l && <Flex align="center" gap="1" mt="4"><Text size="2" color="blue">View Details</Text><ArrowRightIcon width={16} height={16} color="var(--blue-9)" /></Flex>}
        </Card>; return s.l ? <Link key={s.t} to={s.l} style={{ textDecoration: "none" }}>{inner}</Link> : <Box key={s.t}>{inner}</Box>; })}
      </Grid>

      <Grid columns={{ initial: "1", lg: "2" }} gap="6">
        <Card style={{ padding: 20 }}>
          <Flex align="center" justify="between" mb="4"><Flex align="center" gap="2"><CalendarIcon width={24} height={24} color="var(--blue-9)" /><Heading size="4">Recent Events</Heading></Flex><Link to="/events" style={{ textDecoration: "none" }}><Text size="2" color="blue">View All</Text></Link></Flex>
          {recentEvents.length > 0 ? <Flex direction="column" gap="3">{recentEvents.map(e => <Flex key={e._id} align="center" justify="between" p="3" style={{ backgroundColor: "var(--gray-2)", borderRadius: 8 }}>
            <Box style={{ flex: 1, minWidth: 0 }}><Text weight="medium" style={{ display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{e.name}</Text><Text size="2" color="gray">By: {e.organizer?.name || "Unknown"}</Text></Box>
            <Box style={{ textAlign: "right", marginLeft: 16 }}><Badge color={e.status === "published" ? "green" : "yellow"}>{e.status}</Badge><Text size="1" color="gray" style={{ display: "block", marginTop: 4 }}>Registrations: {e.registrationCount || 0}</Text><Button size="1" variant="ghost" color="red" onClick={() => deleteEvent(e._id)} style={{ marginTop: 4 }}><TrashIcon width={14} height={14} /><span style={{ marginLeft: 6 }}>Delete</span></Button></Box>
          </Flex>)}</Flex> : <Flex direction="column" align="center" py="6"><CalendarIcon width={48} height={48} color="var(--gray-6)" /><Text color="gray" mt="2">No recent events</Text></Flex>}
        </Card>

        <Card style={{ padding: 20 }}>
          <Flex align="center" justify="between" mb="4"><Flex align="center" gap="2"><LockClosedIcon width={24} height={24} color="var(--red-9)" /><Heading size="4">Password Requests</Heading></Flex><Link to="/admin/password-requests" style={{ textDecoration: "none" }}><Text size="2" color="blue">View All</Text></Link></Flex>
          {pendingRequests.length > 0 ? <Flex direction="column" gap="3">{pendingRequests.map(r => <Flex key={r._id} align="center" justify="between" p="3" style={{ backgroundColor: "var(--yellow-3)", borderRadius: 8, border: "1px solid var(--yellow-6)" }}>
            <Flex align="center" gap="3"><Box style={{ padding: 8, backgroundColor: "var(--yellow-4)", borderRadius: "50%" }}><ClockIcon width={20} height={20} color="var(--yellow-9)" /></Box><Box><Text weight="medium" style={{ display: "block" }}>{r.organizerId?.name}</Text><Text size="2" color="gray">{r.userId?.email}</Text></Box></Flex>
            <Text size="2" color="gray">{r.createdAt && format(new Date(r.createdAt), "MMM d, HH:mm")}</Text>
          </Flex>)}</Flex> : <Flex direction="column" align="center" py="6"><CheckCircledIcon width={48} height={48} color="var(--green-6)" /><Text color="gray" mt="2">No pending requests</Text></Flex>}
        </Card>
      </Grid>


    </Box>
  );
};

export default AdminDashboard;
