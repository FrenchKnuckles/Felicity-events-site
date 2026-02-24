import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { eventService } from "../../services";
import { fuzzySearch } from "../../utils/fuzzy";
import { format } from "date-fns";
import { Box, Card, Flex, Text, Button, Heading, Badge, Grid, TextField, Select, Spinner } from "@radix-ui/themes";
import { MagnifyingGlassIcon, MixerHorizontalIcon, CalendarIcon, PersonIcon, ChevronLeftIcon, ChevronRightIcon, StarIcon, BackpackIcon, HeartFilledIcon } from "@radix-ui/react-icons";

const BrowseEvents = () => {
  const [events, setEvents] = useState([]);
  const [trending, setTrending] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({ search: "", eventType: "", eligibility: "", startDate: "", endDate: "", areaOfInterest: "", followed: "" });
  const [pg, setPg] = useState({ page: 1, pages: 1, total: 0 });

  const fetchEvents = async (page = 1) => {
    try {
      setLoading(true);
      let p = { ...filters, page };
      // do not send search parameter to backend; we handle fuzzy locally
      delete p.search;
      if (filters.search) {
        // when searching, fetch a large batch to allow local fuzzy filtering
        p.limit = 1000;
        p.page = 1;
      }
      Object.keys(p).forEach(k => {
        if (p[k] === "" || p[k] === "all") delete p[k];
      });
      const d = await eventService.getEvents(p);
      let evts = d.events;
      if (filters.search) {
        evts = fuzzySearch(evts, filters.search, ["name", "organizerId.name"]);
      }
      setEvents(evts);
      // when local filtering, pagination info is less accurate. we still update page/pages/total from server.
      setPg({ page: d.page, pages: d.pages, total: d.total });
    } catch (e) {
      console.error("Error fetching events:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchEvents(); (async () => { try { setTrending(await eventService.getTrending()); } catch {} })(); }, []);

  const handleSearch = e => { e.preventDefault(); fetchEvents(1); };
  const clearFilters = () => { setFilters({ search: "", eventType: "", eligibility: "", startDate: "", endDate: "", areaOfInterest: "", followed: "" }); fetchEvents(1); };
  const set = (k, v) => setFilters(p => ({ ...p, [k]: v }));

  return (
    <Box p="6" style={{ maxWidth: 1200, margin: "0 auto" }}>
      <Box mb="6"><Heading size="8" mb="2">Browse Events</Heading><Text color="gray" size="3">Discover and register for events at Felicity</Text></Box>

      {trending.length > 0 && <Box mb="6"><Flex align="center" gap="2" mb="4"><StarIcon width={24} height={24} color="orange" /><Heading size="5">Trending Now</Heading></Flex>
        <Grid columns={{ initial: "1", sm: "2", md: "3", lg: "5" }} gap="4">{trending.slice(0, 5).map((e, i) => <Link key={e._id} to={`/events/${e._id}`} style={{ textDecoration: "none" }}>
          <Card style={{ position: "relative", overflow: "hidden", cursor: "pointer" }}><Box style={{ position: "absolute", top: 8, left: 8 }}><Badge color="orange" size="1">#{i + 1} Trending</Badge></Box><Box pt="6"><Heading size="4" mb="1">{e.name}</Heading><Text size="2" color="gray">{e.organizerId?.name}</Text>
            <Flex align="center" gap="4" mt="3">
              <Flex align="center" gap="1">
                <CalendarIcon width={14} height={14} />
                <Text size="2" color="gray">
                  {e.eventType === "merchandise"
                    ? (e.registrationDeadline && !isNaN(new Date(e.registrationDeadline))
                        ? `Reg. Deadline: ${format(new Date(e.registrationDeadline), "MMM d")}`
                        : "No deadline")
                    : (e.startDate && !isNaN(new Date(e.startDate))
                        ? format(new Date(e.startDate), "MMM d")
                        : "Invalid date")}
                </Text>
              </Flex>
              <Flex align="center" gap="1"><PersonIcon width={14} height={14} /><Text size="2" color="gray">Registered: {e.registrationCount}</Text></Flex>
            </Flex></Box></Card>
        </Link>)}</Grid></Box>}

      <Card mb="6"><form onSubmit={handleSearch}>
        <Flex direction={{ initial: "column", md: "row" }} gap="4">
          <Box style={{ flex: 1 }}><TextField.Root placeholder="Search events by name, organizer, or keyword..." value={filters.search} onChange={e => set("search", e.target.value)} size="3"><TextField.Slot><MagnifyingGlassIcon height="16" width="16" /></TextField.Slot></TextField.Root></Box>
          <Button type="button" variant="soft" onClick={() => setShowFilters(!showFilters)}><MixerHorizontalIcon width={16} height={16} />Filters</Button>
          <Button type="submit">Search</Button>
        </Flex>
        {showFilters && <Box mt="4" pt="4" style={{ borderTop: "1px solid var(--gray-a5)" }}>
          <Grid columns={{ initial: "1", md: "4" }} gap="4">
            {[["Event Type", "eventType", [["normal", "Normal Event"], ["merchandise", "Merchandise"]]],
              ["Eligibility", "eligibility", [["all", "Open to All"], ["iiit-only", "IIIT Only"], ["non-iiit-only", "Non-IIIT Only"]]]
            ].map(([label, key, opts]) => <Box key={key}><Text as="label" size="2" weight="medium" mb="1">{label}</Text><Select.Root value={filters[key]} onValueChange={v => set(key, v)}><Select.Trigger placeholder={label === "Event Type" ? "All Types" : "All"} style={{ width: "100%" }} /><Select.Content>{opts.map(([v, l]) => <Select.Item key={v} value={v}>{l}</Select.Item>)}</Select.Content></Select.Root></Box>)}
            {[["From Date", "startDate"], ["To Date", "endDate"]].map(([label, key]) => <Box key={key}><Text as="label" size="2" weight="medium" mb="1">{label}</Text><input type="date" value={filters[key]} onChange={e => set(key, e.target.value)} style={{ width: "100%", padding: "8px 12px", borderRadius: 6, border: "1px solid var(--gray-a7)", backgroundColor: "var(--color-background)" }} /></Box>)}
          </Grid>
          <Flex align="center" justify="between" mt="4"><Button type="button" variant={filters.followed === "true" ? "solid" : "outline"} size="2" onClick={() => set("followed", filters.followed === "true" ? "" : "true")}><HeartFilledIcon width={14} height={14} />Followed Clubs Only</Button><Button type="button" variant="ghost" onClick={clearFilters}>Clear all filters</Button></Flex>
        </Box>}
      </form></Card>

      <Flex align="center" justify="between" mb="4"><Text color="gray">{pg.total > 0 ? `Showing ${events.length} of ${pg.total} events` : "No events found"}</Text></Flex>

      {loading ? <Flex align="center" justify="center" py="9"><Spinner size="3" /></Flex>
      : events.length === 0 ? <Card><Flex direction="column" align="center" py="9"><StarIcon width={64} height={64} color="gray" style={{ marginBottom: 16 }} /><Heading size="4" mb="2">No events found</Heading><Text color="gray">Try adjusting your search or filters</Text></Flex></Card>
      : <Grid columns={{ initial: "1", md: "2", lg: "3" }} gap="5">{events.map(e => <Link key={e._id} to={`/events/${e._id}`} style={{ textDecoration: "none" }}>
        <Card style={{ cursor: "pointer", height: "100%" }}>
          <Flex align="center" justify="center" mb="4" style={{ height: 160, background: "linear-gradient(135deg, var(--blue-3), var(--purple-3))", borderRadius: 8 }}>{e.eventType === "merchandise" ? <BackpackIcon width={48} height={48} color="var(--blue-6)" /> : <StarIcon width={48} height={48} color="var(--blue-6)" />}</Flex>
          <Flex align="start" justify="between" mb="2"><Heading size="3" style={{ lineHeight: 1.4 }}>{e.name}</Heading>{e.eventType === "merchandise" ? <Badge color="orange"><Flex align="center" gap="1"><BackpackIcon width={12} height={12} /><span>Merchandise</span></Flex></Badge> : <Badge color="blue">Event</Badge>}</Flex>
          <Text size="2" color="gray" mb="3">{e.organizerId?.name}</Text>
          <Flex direction="column" gap="2">
            <Flex align="center" gap="2">
              <CalendarIcon width={14} height={14} color="gray" />
              <Text size="2" color="gray">
                {e.eventType === "merchandise"
                  ? (e.registrationDeadline && !isNaN(new Date(e.registrationDeadline))
                      ? `Reg. Deadline: ${format(new Date(e.registrationDeadline), "EEEE, MMMM d, yyyy")}`
                      : "No deadline")
                  : (e.startDate && !isNaN(new Date(e.startDate))
                      ? format(new Date(e.startDate), "EEEE, MMMM d, yyyy")
                      : "Invalid date")}
              </Text>
            </Flex>
            {e.venue && <Flex align="center" gap="2"><PersonIcon width={14} height={14} color="gray" /><Text size="2" color="gray" style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>Venue: {e.venue}</Text></Flex>}</Flex>
          <Box mt="4" pt="4" style={{ borderTop: "1px solid var(--gray-a5)" }}><Flex align="center" justify="between"><Text weight="bold">{e.registrationFee > 0 ? `₹${e.registrationFee}` : "Free"}</Text><Flex align="center" gap="1"><PersonIcon width={14} height={14} /><Text size="2" color="gray">Registered: {e.registrationCount || 0}</Text></Flex></Flex></Box>
        </Card></Link>)}</Grid>}

      {pg.pages > 1 && <Flex align="center" justify="center" gap="4" mt="6">
        <Button variant="soft" onClick={() => fetchEvents(pg.page - 1)} disabled={pg.page === 1}><ChevronLeftIcon width={16} height={16} />Previous</Button>
        <Text color="gray">Page {pg.page} of {pg.pages}</Text>
        <Button variant="soft" onClick={() => fetchEvents(pg.page + 1)} disabled={pg.page === pg.pages}>Next<ChevronRightIcon width={16} height={16} /></Button>
      </Flex>}
    </Box>
  );
};

export default BrowseEvents;
