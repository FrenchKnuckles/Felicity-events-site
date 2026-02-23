import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import organizerService from "../../services/organizerService";
import { Box, Card, Flex, Text, Button, Heading, Spinner, Badge, Grid, TextField } from "@radix-ui/themes";
import { MagnifyingGlassIcon, PersonIcon, StarIcon } from "@radix-ui/react-icons";

const catColors = { cultural: "blue", technical: "purple", sports: "green", other: "orange" };

const OrganizersListing = () => {
  const navigate = useNavigate();
  const [orgs, setOrgs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [toggling, setToggling] = useState({});

  useEffect(() => { (async () => { try { const r = await organizerService.getAll(); setOrgs(Array.isArray(r) ? r : r.organizers || []); } catch { toast.error("Failed to load organizers"); } finally { setLoading(false); } })(); }, []);

  const toggleFollow = async (id) => {
    try { setToggling(p => ({ ...p, [id]: true })); const r = await organizerService.toggleFollow(id);
      setOrgs(orgs.map(o => o._id === id ? { ...o, isFollowing: r.isFollowing, followerCount: r.isFollowing ? (o.followerCount || 0) + 1 : Math.max(0, (o.followerCount || 0) - 1) } : o));
    } catch { toast.error("Failed to update follow"); } finally { setToggling(p => ({ ...p, [id]: false })); }
  };

  const filtered = orgs.filter(o => !search || o.name?.toLowerCase().includes(search.toLowerCase()) || o.category?.toLowerCase().includes(search.toLowerCase()));
  const followCount = orgs.filter(o => o.isFollowing).length;
  const stats = [{ label: "Total", value: orgs.length, color: "blue" }, { label: "Following", value: followCount, color: "green" }];

  if (loading) return <Flex align="center" justify="center" style={{ minHeight: "100vh", backgroundColor: "var(--gray-1)" }}><Spinner size="3" /></Flex>;

  return (
    <Box style={{ minHeight: "100vh", backgroundColor: "var(--gray-1)" }} py="6">
      <Box style={{ maxWidth: 1024, margin: "0 auto" }} px="4">
        <Heading size="7" mb="5">Organizers</Heading>

        <Grid columns="3" gap="4" mb="5">{stats.map(s => <Card key={s.label}><Flex direction="column" align="center" py="2"><Text size="6" weight="bold" color={s.color}>{s.value}</Text><Text size="2" color="gray">{s.label}</Text></Flex></Card>)}</Grid>

        <Box mb="5"><TextField.Root value={search} onChange={e => setSearch(e.target.value)} placeholder="Search organizers..." size="3"><TextField.Slot><MagnifyingGlassIcon /></TextField.Slot></TextField.Root></Box>

        {filtered.length === 0 ? <Card><Flex align="center" justify="center" py="6"><Text color="gray">{search ? "No organizers match your search" : "No organizers found"}</Text></Flex></Card>
        : <Grid columns={{ initial: "1", sm: "2", md: "3" }} gap="4">{filtered.map(o => (
          <Card key={o._id} style={{ cursor: "pointer" }} onClick={() => navigate(`/organizers/${o._id}`)}>
            <Flex direction="column" align="center" py="3">
              {o.logo ? (
                <img src={o.logo} alt={o.name} style={{ width: 64, height: 64, borderRadius: "50%", objectFit: "cover", marginBottom: 12 }} />
              ) : (
                <Flex align="center" justify="center" style={{ width: 64, height: 64, borderRadius: "50%", backgroundColor: "var(--blue-9)", color: "white", fontSize: 24, marginBottom: 12 }}>{o.name?.charAt(0) || "O"}</Flex>
              )}
              <Heading size="4" mb="1" align="center">{o.name}</Heading>
              <Badge color={catColors[o.category] || "gray"} mb="2">{o.category || "Organization"}</Badge>
              {o.description && <Text size="2" color="gray" align="center" mb="3" style={{ display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{o.description}</Text>}
              <Flex gap="3" align="center" mb="3"><Badge variant="soft"><PersonIcon width={12} height={12} /> Followers: {o.followerCount || 0}</Badge>{o.eventCount != null && <Badge variant="soft"><StarIcon width={12} height={12} /> Events: {o.eventCount}</Badge>}</Flex>
              <Button onClick={e => { e.stopPropagation(); toggleFollow(o._id); }} disabled={toggling[o._id]} variant={o.isFollowing ? "soft" : "solid"} color={o.isFollowing ? "gray" : "blue"} size="2">{o.isFollowing ? "Following" : "Follow"}</Button>
            </Flex>
          </Card>
        ))}</Grid>}
      </Box>
    </Box>
  );
};

export default OrganizersListing;
