import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { eventService } from "../../services";
import { format } from "date-fns";
import {
  Box,
  Card,
  Flex,
  Text,
  Button,
  Heading,
  Badge,
  Grid,
  TextField,
  Select,
  Spinner,
} from "@radix-ui/themes";
import {
  MagnifyingGlassIcon,
  MixerHorizontalIcon,
  CalendarIcon,
  PersonIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  StarIcon,
  BackpackIcon,
  HeartFilledIcon,
} from "@radix-ui/react-icons";

const BrowseEvents = () => {
  const [events, setEvents] = useState([]);
  const [trending, setTrending] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    search: "",
    eventType: "",
    eligibility: "",
    startDate: "",
    endDate: "",
    areaOfInterest: "",
    followed: "",
  });
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });

  useEffect(() => {
    fetchEvents();
    fetchTrending();
  }, []);

  const fetchEvents = async (page = 1) => {
    try {
      setLoading(true);
      const params = { ...filters, page };
      Object.keys(params).forEach((key) => !params[key] && delete params[key]);

      const data = await eventService.getEvents(params);
      setEvents(data.events);
      setPagination({ page: data.page, pages: data.pages, total: data.total });
    } catch (error) {
      console.error("Error fetching events:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchTrending = async () => {
    try {
      const data = await eventService.getTrending();
      setTrending(data);
    } catch (error) {
      console.error("Error fetching trending:", error);
    }
  };

  const handleFilterChange = (name, value) => {
    setFilters((prev) => ({ ...prev, [name]: value }));
  };

  const handleSearch = (e) => {
    e.preventDefault();
    fetchEvents(1);
  };

  const clearFilters = () => {
    setFilters({
      search: "",
      eventType: "",
      eligibility: "",
      startDate: "",
      endDate: "",
      areaOfInterest: "",
      followed: "",
    });
    fetchEvents(1);
  };

  const getEventTypeBadge = (type) => {
    if (type === "merchandise") {
      return (
        <Badge color="orange">
          <Flex align="center" gap="1">
            <BackpackIcon width={12} height={12} />
            <span>Merchandise</span>
          </Flex>
        </Badge>
      );
    }
    return <Badge color="blue">Event</Badge>;
  };

  return (
    <Box p="6" style={{ maxWidth: "1200px", margin: "0 auto" }}>
      {/* Header */}
      <Box mb="6">
        <Heading size="8" mb="2">Browse Events</Heading>
        <Text color="gray" size="3">Discover and register for events at Felicity</Text>
      </Box>

      {/* Trending Section */}
      {trending.length > 0 && (
        <Box mb="6">
          <Flex align="center" gap="2" mb="4">
            <StarIcon width={24} height={24} color="orange" />
            <Heading size="5">Trending Now</Heading>
          </Flex>
          <Grid columns={{ initial: "1", sm: "2", md: "3", lg: "5" }} gap="4">
            {trending.slice(0, 5).map((event, index) => (
              <Link
                key={event._id}
                to={`/events/${event._id}`}
                style={{ textDecoration: "none" }}
              >
                <Card style={{ position: "relative", overflow: "hidden", cursor: "pointer" }}>
                  <Box style={{ position: "absolute", top: "8px", left: "8px" }}>
                    <Badge color="orange" size="1">
                      #{index + 1} Trending
                    </Badge>
                  </Box>
                  <Box pt="6">
                    <Heading size="4" mb="1">{event.name}</Heading>
                    <Text size="2" color="gray">{event.organizerId?.name}</Text>
                    <Flex align="center" gap="4" mt="3">
                      <Flex align="center" gap="1">
                        <CalendarIcon width={14} height={14} />
                        <Text size="2" color="gray">{format(new Date(event.startDate), "MMM d")}</Text>
                      </Flex>
                      <Flex align="center" gap="1">
                        <PersonIcon width={14} height={14} />
                        <Text size="2" color="gray">{event.registrationCount} registered</Text>
                      </Flex>
                    </Flex>
                  </Box>
                </Card>
              </Link>
            ))}
          </Grid>
        </Box>
      )}

      {/* Search and Filters */}
      <Card mb="6">
        <form onSubmit={handleSearch}>
          <Flex direction={{ initial: "column", md: "row" }} gap="4">
            <Box style={{ flex: 1 }}>
              <TextField.Root
                placeholder="Search events by name, organizer, or keyword..."
                value={filters.search}
                onChange={(e) => handleFilterChange("search", e.target.value)}
                size="3"
              >
                <TextField.Slot>
                  <MagnifyingGlassIcon height="16" width="16" />
                </TextField.Slot>
              </TextField.Root>
            </Box>
            <Button
              type="button"
              variant="soft"
              onClick={() => setShowFilters(!showFilters)}
            >
              <MixerHorizontalIcon width={16} height={16} />
              Filters
            </Button>
            <Button type="submit">Search</Button>
          </Flex>

          {/* Advanced Filters */}
          {showFilters && (
            <Box mt="4" pt="4" style={{ borderTop: "1px solid var(--gray-a5)" }}>
              <Grid columns={{ initial: "1", md: "4" }} gap="4">
                <Box>
                  <Text as="label" size="2" weight="medium" mb="1">Event Type</Text>
                  <Select.Root
                    value={filters.eventType}
                    onValueChange={(value) => handleFilterChange("eventType", value)}
                  >
                    <Select.Trigger placeholder="All Types" style={{ width: "100%" }} />
                    <Select.Content>
                      <Select.Item value="">All Types</Select.Item>
                      <Select.Item value="normal">Normal Event</Select.Item>
                      <Select.Item value="merchandise">Merchandise</Select.Item>
                    </Select.Content>
                  </Select.Root>
                </Box>
                <Box>
                  <Text as="label" size="2" weight="medium" mb="1">Eligibility</Text>
                  <Select.Root
                    value={filters.eligibility}
                    onValueChange={(value) => handleFilterChange("eligibility", value)}
                  >
                    <Select.Trigger placeholder="All" style={{ width: "100%" }} />
                    <Select.Content>
                      <Select.Item value="">All</Select.Item>
                      <Select.Item value="all">Open to All</Select.Item>
                      <Select.Item value="iiit-only">IIIT Only</Select.Item>
                      <Select.Item value="non-iiit-only">Non-IIIT Only</Select.Item>
                    </Select.Content>
                  </Select.Root>
                </Box>
                <Box>
                  <Text as="label" size="2" weight="medium" mb="1">From Date</Text>
                  <input
                    type="date"
                    value={filters.startDate}
                    onChange={(e) => handleFilterChange("startDate", e.target.value)}
                    style={{
                      width: "100%",
                      padding: "8px 12px",
                      borderRadius: "6px",
                      border: "1px solid var(--gray-a7)",
                      backgroundColor: "var(--color-background)",
                    }}
                  />
                </Box>
                <Box>
                  <Text as="label" size="2" weight="medium" mb="1">To Date</Text>
                  <input
                    type="date"
                    value={filters.endDate}
                    onChange={(e) => handleFilterChange("endDate", e.target.value)}
                    style={{
                      width: "100%",
                      padding: "8px 12px",
                      borderRadius: "6px",
                      border: "1px solid var(--gray-a7)",
                      backgroundColor: "var(--color-background)",
                    }}
                  />
                </Box>
              </Grid>
              <Flex align="center" justify="between" mt="4">
                <Flex align="center" gap="2">
                  <Button
                    type="button"
                    variant={filters.followed === "true" ? "solid" : "outline"}
                    size="2"
                    onClick={() => {
                      handleFilterChange("followed", filters.followed === "true" ? "" : "true");
                    }}
                  >
                    <HeartFilledIcon width={14} height={14} />
                    Followed Clubs Only
                  </Button>
                </Flex>
                <Button type="button" variant="ghost" onClick={clearFilters}>
                  Clear all filters
                </Button>
              </Flex>
            </Box>
          )}
        </form>
      </Card>

      {/* Results Info */}
      <Flex align="center" justify="between" mb="4">
        <Text color="gray">
          {pagination.total > 0
            ? `Showing ${events.length} of ${pagination.total} events`
            : "No events found"}
        </Text>
      </Flex>

      {/* Events Grid */}
      {loading ? (
        <Flex align="center" justify="center" py="9">
          <Spinner size="3" />
        </Flex>
      ) : events.length === 0 ? (
        <Card>
          <Flex direction="column" align="center" py="9">
            <StarIcon width={64} height={64} color="gray" style={{ marginBottom: "16px" }} />
            <Heading size="4" mb="2">No events found</Heading>
            <Text color="gray">Try adjusting your search or filters</Text>
          </Flex>
        </Card>
      ) : (
        <Grid columns={{ initial: "1", md: "2", lg: "3" }} gap="5">
          {events.map((event) => (
            <Link
              key={event._id}
              to={`/events/${event._id}`}
              style={{ textDecoration: "none" }}
            >
              <Card style={{ cursor: "pointer", height: "100%" }}>
                {/* Event Image Placeholder */}
                <Flex
                  align="center"
                  justify="center"
                  mb="4"
                  style={{
                    height: "160px",
                    background: "linear-gradient(135deg, var(--blue-3), var(--purple-3))",
                    borderRadius: "8px",
                  }}
                >
                  {event.eventType === "merchandise" ? (
                    <BackpackIcon width={48} height={48} color="var(--blue-6)" />
                  ) : (
                    <StarIcon width={48} height={48} color="var(--blue-6)" />
                  )}
                </Flex>

                <Flex align="start" justify="between" mb="2">
                  <Heading size="3" style={{ lineHeight: 1.4 }}>
                    {event.name}
                  </Heading>
                  {getEventTypeBadge(event.eventType)}
                </Flex>

                <Text size="2" color="gray" mb="3">{event.organizerId?.name}</Text>

                <Flex direction="column" gap="2">
                  <Flex align="center" gap="2">
                    <CalendarIcon width={14} height={14} color="gray" />
                    <Text size="2" color="gray">{format(new Date(event.startDate), "EEEE, MMMM d, yyyy")}</Text>
                  </Flex>
                  {event.venue && (
                    <Flex align="center" gap="2">
                      <PersonIcon width={14} height={14} color="gray" />
                      <Text size="2" color="gray" style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {event.venue}
                      </Text>
                    </Flex>
                  )}
                </Flex>

                <Box mt="4" pt="4" style={{ borderTop: "1px solid var(--gray-a5)" }}>
                  <Flex align="center" justify="between">
                    <Text weight="bold">
                      {event.registrationFee > 0 ? `₹${event.registrationFee}` : "Free"}
                    </Text>
                    <Flex align="center" gap="1">
                      <PersonIcon width={14} height={14} />
                      <Text size="2" color="gray">{event.registrationCount || 0} registered</Text>
                    </Flex>
                  </Flex>
                </Box>
              </Card>
            </Link>
          ))}
        </Grid>
      )}

      {/* Pagination */}
      {pagination.pages > 1 && (
        <Flex align="center" justify="center" gap="4" mt="6">
          <Button
            variant="soft"
            onClick={() => fetchEvents(pagination.page - 1)}
            disabled={pagination.page === 1}
          >
            <ChevronLeftIcon width={16} height={16} />
            Previous
          </Button>
          <Text color="gray">
            Page {pagination.page} of {pagination.pages}
          </Text>
          <Button
            variant="soft"
            onClick={() => fetchEvents(pagination.page + 1)}
            disabled={pagination.page === pagination.pages}
          >
            Next
            <ChevronRightIcon width={16} height={16} />
          </Button>
        </Flex>
      )}
    </Box>
  );
};

export default BrowseEvents;
