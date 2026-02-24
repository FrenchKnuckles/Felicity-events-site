import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import organizerService from "../../services/organizerService";
import { Box, Card, Flex, Text, Button, Heading, Spinner, Badge, Grid } from "@radix-ui/themes";
import { PersonIcon, EnvelopeClosedIcon, CalendarIcon, ArrowLeftIcon } from "@radix-ui/react-icons";

const catColors = { cultural: "blue", technical: "purple", sports: "green", other: "orange" };

const OrganizerDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [org, setOrg] = useState(null);
  const [loading, setLoading] = useState(true);
  const [following, setFollowing] = useState(false);
  const [toggling, setToggling] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        if (!id || id === "undefined" || id === "null") throw new Error("Invalid Organizer ID");
        const r = await organizerService.getById(id);
        setOrg({ ...(r.organizer || r), upcomingEvents: r.upcomingEvents, pastEvents: r.pastEvents });
        setFollowing(r.isFollowing || false);
      } catch (err) {
        console.error("Load org error:", err);
        const msg = err.response?.data?.message || err.message || "Failed to load organizer";
        toast.error(msg);
        setOrg(null);
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  const toggleFollow = async () => {
    try {
      setToggling(true);
      const r = await organizerService.toggleFollow(id);
      console.log("toggleFollow response", r);
      // backend should send { isFollowing: boolean }, but if not, flip locally
      const newFollowState = typeof r.isFollowing === "boolean" ? r.isFollowing : !following;
      setFollowing(newFollowState);
      toast.success(newFollowState ? "Following!" : "Unfollowed");
    } catch (err) {
      console.error("toggleFollow error", err);
      toast.error("Failed to update follow");
    } finally {
      setToggling(false);
    }
  };

  if (loading) return <Flex align="center" justify="center" style={{ minHeight: "100vh", backgroundColor: "var(--gray-1)" }}><Spinner size="3" /></Flex>;
  if (!org) return <Flex align="center" justify="center" style={{ minHeight: "100vh" }}><Text>Organizer not found</Text></Flex>;

  const upcoming = org.upcomingEvents || [];
  const past = org.pastEvents || [];
  const events = [...upcoming, ...past];

  const EventCard = ({ ev }) => (
    <Card style={{ cursor: "pointer" }} onClick={() => navigate(`/events/${ev._id}`)}>
      <Heading size="3" mb="1">{ev.name}</Heading>
      <Flex gap="2" mb="2"><Badge color="blue" size="1"><CalendarIcon width={12} height={12} /> {new Date(ev.startDate).toLocaleDateString()}</Badge>{ev.category && <Badge color={catColors[ev.category] || "gray"} size="1">{ev.category}</Badge>}</Flex>
      <Text size="2" color="gray" style={{ display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{ev.description}</Text>
    </Card>
  );

  return (
    <Box style={{ minHeight: "100vh", backgroundColor: "var(--gray-1)" }} py="6">
      <Box style={{ maxWidth: 896, margin: "0 auto" }} px="4">
        <Button variant="ghost" mb="4" onClick={() => navigate(-1)}><ArrowLeftIcon /> Back</Button>

        <Card mb="5"><Flex gap="5" align="start" wrap="wrap">
          {org.logo ? (
            <img src={org.logo} alt={org.name} style={{ width: 80, height: 80, borderRadius: "50%", objectFit: "cover" }} />
          ) : (
            <Flex align="center" justify="center" style={{ width: 80, height: 80, borderRadius: "50%", backgroundColor: "var(--blue-9)", color: "white", fontSize: 32 }}>{org.name?.charAt(0) || "O"}</Flex>
          )}
          <Box style={{ flex: 1 }}>
            <Flex justify="between" align="start"><Box><Heading size="6">{org.name}</Heading><Badge color={catColors[org.category] || "gray"} mt="1">{org.category || "Organization"}</Badge></Box>
              <Button onClick={toggleFollow} disabled={toggling} variant={following ? "soft" : "solid"} color={following ? "gray" : "blue"}>{following ? "Following" : "Follow"}</Button>
            </Flex>
            {org.description && <Text size="3" color="gray" mt="3" as="p">{org.description}</Text>}
            <Flex gap="4" mt="3" wrap="wrap">
              {org.email && <Flex align="center" gap="1"><EnvelopeClosedIcon /><Text size="2">{org.email}</Text></Flex>}
              {org.phone && <Flex align="center" gap="1"><PersonIcon /><Text size="2">{org.phone}</Text></Flex>}
              {org.followerCount != null && <Badge variant="soft" color="blue"><PersonIcon width={12} height={12} /> Followers: {org.followerCount}</Badge>}
            </Flex>
          </Box>
        </Flex></Card>

        {upcoming.length > 0 && <Box mb="5"><Heading size="5" mb="3">Upcoming Events ({upcoming.length})</Heading><Grid columns={{ initial: "1", sm: "2" }} gap="4">{upcoming.map(e => <EventCard key={e._id} ev={e} />)}</Grid></Box>}
        {past.length > 0 && <Box><Heading size="5" mb="3">Past Events ({past.length})</Heading><Grid columns={{ initial: "1", sm: "2" }} gap="4">{past.map(e => <EventCard key={e._id} ev={e} />)}</Grid></Box>}
        {events.length === 0 && <Card><Flex align="center" justify="center" py="6"><Text color="gray">No events yet</Text></Flex></Card>}
      </Box>
    </Box>
  );
};

export default OrganizerDetail;
