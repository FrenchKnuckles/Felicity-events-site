import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { organizerService } from "../../services";
import { toast } from "react-toastify";
import { format } from "date-fns";
import { Box, Flex, Text, Heading, Button, Card, Badge, Grid, Spinner } from "@radix-ui/themes";
import {
  CalendarIcon,
  PersonIcon,
  EyeOpenIcon,
  BarChartIcon,
  CheckCircledIcon,
} from "@radix-ui/react-icons";

const OngoingEvents = () => {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchOngoing = async () => {
      try {
        const data = await organizerService.getOngoingEvents();
        setEvents(Array.isArray(data) ? data : []);
      } catch (error) {
        toast.error("Failed to fetch ongoing events");
      } finally {
        setLoading(false);
      }
    };
    fetchOngoing();
  }, []);

  if (loading) {
    return (
      <Flex align="center" justify="center" style={{ minHeight: "50vh" }}>
        <Spinner size="3" />
      </Flex>
    );
  }

  return (
    <Box p="6">
      <Box mb="6">
        <Heading size="7" weight="bold">Ongoing Events</Heading>
        <Text color="gray" size="3" mt="1">Events that are currently running</Text>
      </Box>

      {events.length === 0 ? (
        <Card>
          <Flex direction="column" align="center" py="9">
            <CalendarIcon width="64" height="64" color="var(--gray-6)" style={{ marginBottom: "16px" }} />
            <Heading size="4" mb="2">No ongoing events</Heading>
            <Text color="gray" mb="4">You don't have any events running right now</Text>
            <Button asChild>
              <Link to="/organizer/events/create">Create Event</Link>
            </Button>
          </Flex>
        </Card>
      ) : (
        <Grid columns={{ initial: "1", md: "2", lg: "3" }} gap="4">
          {events.map((event) => (
            <Card key={event._id}>
              <Flex direction="column" gap="3">
                <Flex justify="between" align="center">
                  <Text weight="bold" size="4">{event.name}</Text>
                  <Badge color="blue">Ongoing</Badge>
                </Flex>
                <Badge color="purple" variant="soft" style={{ alignSelf: "flex-start" }}>
                  {event.eventType}
                </Badge>
                <Flex direction="column" gap="1">
                  <Flex align="center" gap="1">
                    <CalendarIcon width="14" height="14" />
                    <Text size="2" color="gray">
                      {format(new Date(event.startDate), "MMM d, yyyy h:mm a")}
                      {event.endDate && ` — ${format(new Date(event.endDate), "MMM d, yyyy h:mm a")}`}
                    </Text>
                  </Flex>
                  <Flex align="center" gap="1">
                    <PersonIcon width="14" height="14" />
                    <Text size="2" color="gray">{event.registrationCount || 0} registrations</Text>
                  </Flex>
                </Flex>
                <Flex gap="2" mt="2">
                  <Button asChild variant="soft" size="2" style={{ flex: 1 }}>
                    <Link to={`/organizer/events/${event._id}/detail`}>
                      <EyeOpenIcon width="14" height="14" />
                      Details
                    </Link>
                  </Button>
                  <Button asChild variant="soft" size="2" color="green" style={{ flex: 1 }}>
                    <Link to={`/organizer/events/${event._id}/attendance`}>
                      <CheckCircledIcon width="14" height="14" />
                      Check-in
                    </Link>
                  </Button>
                  <Button asChild variant="soft" size="2" color="purple">
                    <Link to={`/organizer/events/${event._id}/attendance`}>
                      <BarChartIcon width="14" height="14" />
                    </Link>
                  </Button>
                </Flex>
              </Flex>
            </Card>
          ))}
        </Grid>
      )}
    </Box>
  );
};

export default OngoingEvents;
