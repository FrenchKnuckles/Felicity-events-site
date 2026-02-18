import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { organizerService } from "../../services";
import { toast } from "react-toastify";
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
  Spinner,
} from "@radix-ui/themes";
import {
  ArrowLeftIcon,
  HeartIcon,
  HeartFilledIcon,
  EnvelopeClosedIcon,
  MobileIcon,
  CalendarIcon,
  ClockIcon,
  StarIcon,
} from "@radix-ui/react-icons";

const OrganizerDetail = () => {
  const { id } = useParams();
  const { user, updateUser } = useAuth();
  const [organizer, setOrganizer] = useState(null);
  const [upcomingEvents, setUpcomingEvents] = useState([]);
  const [pastEvents, setPastEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isFollowing, setIsFollowing] = useState(false);

  useEffect(() => {
    fetchOrganizerDetails();
  }, [id]);

  useEffect(() => {
    if (user && organizer) {
      const followedIds = user.followedOrganizers?.map((o) => o._id || o) || [];
      setIsFollowing(followedIds.includes(organizer._id));
    }
  }, [user, organizer]);

  const fetchOrganizerDetails = async () => {
    try {
      const data = await organizerService.getById(id);
      setOrganizer(data.organizer);
      setUpcomingEvents(data.upcomingEvents || []);
      setPastEvents(data.pastEvents || []);
    } catch (error) {
      console.error("Error fetching organizer:", error);
      toast.error("Organizer not found");
    } finally {
      setLoading(false);
    }
  };

  const handleFollow = async () => {
    if (!user) {
      toast.info("Please login to follow organizers");
      return;
    }

    try {
      const { isFollowing: newFollowing, followedOrganizers } = await organizerService.toggleFollow(id);
      setIsFollowing(newFollowing);
      updateUser({ followedOrganizers });
      toast.success(newFollowing ? "Following!" : "Unfollowed");
    } catch (error) {
      toast.error("Failed to update follow status");
    }
  };

  if (loading) {
    return (
      <Flex align="center" justify="center" style={{ minHeight: "100vh" }}>
        <Spinner size="3" />
      </Flex>
    );
  }

  if (!organizer) {
    return (
      <Box p="6" style={{ maxWidth: "1200px", margin: "0 auto", textAlign: "center" }} py="9">
        <Heading size="6" mb="4">Organizer not found</Heading>
        <Link to="/organizers" style={{ textDecoration: "none" }}>
          <Button>Browse Organizers</Button>
        </Link>
      </Box>
    );
  }

  return (
    <Box p="6" style={{ maxWidth: "1200px", margin: "0 auto" }}>
      {/* Back Button */}
      <Link to="/organizers" style={{ textDecoration: "none" }}>
        <Button variant="ghost" color="gray" mb="5">
          <ArrowLeftIcon width={20} height={20} />
          Back to Organizers
        </Button>
      </Link>

      {/* Organizer Header */}
      <Card mb="6">
        <Flex
          direction={{ initial: "column", md: "row" }}
          justify="between"
          align={{ initial: "start", md: "center" }}
          gap="4"
        >
          <Flex align="center" gap="4">
            <Flex
              align="center"
              justify="center"
              style={{
                width: "80px",
                height: "80px",
                background: "linear-gradient(135deg, var(--blue-9), var(--purple-9))",
                borderRadius: "50%",
              }}
            >
              <Text size="8" weight="bold" style={{ color: "white" }}>
                {organizer.name?.charAt(0)}
              </Text>
            </Flex>
            <Box>
              <Heading size="6" mb="2">{organizer.name}</Heading>
              <Badge color="blue" size="2">{organizer.category}</Badge>
            </Box>
          </Flex>

          <Button
            onClick={handleFollow}
            color={isFollowing ? "red" : "blue"}
            variant={isFollowing ? "soft" : "solid"}
            style={{ borderRadius: "9999px" }}
            size="3"
          >
            {isFollowing ? (
              <>
                <HeartFilledIcon width={20} height={20} />
                Following
              </>
            ) : (
              <>
                <HeartIcon width={20} height={20} />
                Follow
              </>
            )}
          </Button>
        </Flex>

        {organizer.description && (
          <Text color="gray" mt="5" size="3" as="p">
            {organizer.description}
          </Text>
        )}

        {/* Contact Info */}
        <Flex wrap="wrap" gap="5" mt="5">
          {organizer.contactEmail && (
            <a
              href={`mailto:${organizer.contactEmail}`}
              style={{ textDecoration: "none" }}
            >
              <Flex align="center" gap="2">
                <EnvelopeClosedIcon width={20} height={20} color="var(--gray-9)" />
                <Text color="gray" size="3">{organizer.contactEmail}</Text>
              </Flex>
            </a>
          )}
          {organizer.contactNumber && (
            <Flex align="center" gap="2">
              <MobileIcon width={20} height={20} color="var(--gray-9)" />
              <Text color="gray" size="3">{organizer.contactNumber}</Text>
            </Flex>
          )}
        </Flex>
      </Card>

      {/* Upcoming Events */}
      <Box mb="6">
        <Flex align="center" gap="2" mb="4">
          <StarIcon width={24} height={24} color="var(--yellow-9)" />
          <Heading size="5">Upcoming Events</Heading>
        </Flex>

        {upcomingEvents.length === 0 ? (
          <Card>
            <Flex direction="column" align="center" py="6">
              <CalendarIcon width={48} height={48} color="var(--gray-6)" style={{ marginBottom: "12px" }} />
              <Text color="gray">No upcoming events</Text>
            </Flex>
          </Card>
        ) : (
          <Grid columns={{ initial: "1", md: "2", lg: "3" }} gap="4">
            {upcomingEvents.map((event) => (
              <Link
                key={event._id}
                to={`/events/${event._id}`}
                style={{ textDecoration: "none" }}
              >
                <Card style={{ cursor: "pointer" }}>
                  <Text weight="bold" size="3" mb="2">{event.name}</Text>
                  <Flex align="center" gap="4">
                    <Flex align="center" gap="1">
                      <CalendarIcon width={14} height={14} />
                      <Text size="2" color="gray">
                        {format(new Date(event.startDate), "MMM d, yyyy")}
                      </Text>
                    </Flex>
                    <Badge color="blue" size="1">{event.eventType}</Badge>
                  </Flex>
                </Card>
              </Link>
            ))}
          </Grid>
        )}
      </Box>

      {/* Past Events */}
      <Box>
        <Flex align="center" gap="2" mb="4">
          <ClockIcon width={24} height={24} color="var(--gray-9)" />
          <Heading size="5">Past Events</Heading>
        </Flex>

        {pastEvents.length === 0 ? (
          <Card>
            <Flex direction="column" align="center" py="6">
              <ClockIcon width={48} height={48} color="var(--gray-6)" style={{ marginBottom: "12px" }} />
              <Text color="gray">No past events</Text>
            </Flex>
          </Card>
        ) : (
          <Grid columns={{ initial: "1", md: "2", lg: "3" }} gap="4">
            {pastEvents.map((event) => (
              <Card key={event._id} style={{ opacity: 0.75 }}>
                <Text weight="bold" size="3" mb="2">{event.name}</Text>
                <Flex align="center" gap="4">
                  <Flex align="center" gap="1">
                    <CalendarIcon width={14} height={14} />
                    <Text size="2" color="gray">
                      {format(new Date(event.startDate), "MMM d, yyyy")}
                    </Text>
                  </Flex>
                  <Badge color="green" size="1">Completed</Badge>
                </Flex>
              </Card>
            ))}
          </Grid>
        )}
      </Box>
    </Box>
  );
};

export default OrganizerDetail;
