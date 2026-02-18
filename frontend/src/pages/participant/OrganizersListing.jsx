import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { organizerService } from "../../services";
import { toast } from "react-toastify";
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
  Spinner,
  IconButton,
} from "@radix-ui/themes";
import {
  MagnifyingGlassIcon,
  HeartIcon,
  HeartFilledIcon,
  EnvelopeClosedIcon,
  StarIcon,
  PersonIcon,
} from "@radix-ui/react-icons";

const OrganizersListing = () => {
  const { user, updateUser } = useAuth();
  const [organizers, setOrganizers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [followedIds, setFollowedIds] = useState([]);

  useEffect(() => {
    fetchOrganizers();
    if (user) {
      setFollowedIds(user.followedOrganizers?.map((o) => o._id || o) || []);
    }
  }, [user]);

  const fetchOrganizers = async () => {
    try {
      const data = await organizerService.getAll();
      setOrganizers(data);
    } catch (error) {
      console.error("Error fetching organizers:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleFollow = async (organizerId) => {
    if (!user) {
      toast.info("Please login to follow organizers");
      return;
    }

    try {
      const { isFollowing, followedOrganizers } = await organizerService.toggleFollow(organizerId);
      if (isFollowing) {
        setFollowedIds((prev) => [...prev, organizerId]);
        toast.success("Following!");
      } else {
        setFollowedIds((prev) => prev.filter((id) => id !== organizerId));
        toast.success("Unfollowed");
      }
      updateUser({ followedOrganizers });
    } catch (error) {
      toast.error("Failed to update follow status");
    }
  };

  const filteredOrganizers = organizers.filter(
    (org) =>
      org.name.toLowerCase().includes(search.toLowerCase()) ||
      org.category?.toLowerCase().includes(search.toLowerCase())
  );

  const getCategoryColor = (category) => {
    const colors = {
      club: "blue",
      committee: "purple",
      department: "green",
      external: "orange",
    };
    return colors[category?.toLowerCase()] || "gray";
  };

  if (loading) {
    return (
      <Flex align="center" justify="center" style={{ minHeight: "100vh" }}>
        <Spinner size="3" />
      </Flex>
    );
  }

  return (
    <Box p="6" style={{ maxWidth: "1200px", margin: "0 auto" }}>
      {/* Header */}
      <Box mb="6">
        <Heading size="8" mb="2">Clubs & Organizers</Heading>
        <Text color="gray" size="3">
          Follow your favorite clubs to get notified about their events
        </Text>
      </Box>

      {/* Search */}
      <Card mb="6">
        <TextField.Root
          placeholder="Search clubs and organizers..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          size="3"
        >
          <TextField.Slot>
            <MagnifyingGlassIcon height="16" width="16" />
          </TextField.Slot>
        </TextField.Root>
      </Card>

      {/* Stats */}
      <Grid columns={{ initial: "1", md: "3" }} gap="4" mb="6">
        <Card>
          <Flex direction="column" align="center" py="2">
            <PersonIcon width={32} height={32} color="var(--blue-9)" style={{ marginBottom: "8px" }} />
            <Text size="6" weight="bold">{organizers.length}</Text>
            <Text size="2" color="gray">Total Organizers</Text>
          </Flex>
        </Card>
        <Card>
          <Flex direction="column" align="center" py="2">
            <HeartFilledIcon width={32} height={32} color="var(--red-9)" style={{ marginBottom: "8px" }} />
            <Text size="6" weight="bold">{followedIds.length}</Text>
            <Text size="2" color="gray">Following</Text>
          </Flex>
        </Card>
        <Card>
          <Flex direction="column" align="center" py="2">
            <StarIcon width={32} height={32} color="var(--yellow-9)" style={{ marginBottom: "8px" }} />
            <Text size="6" weight="bold">
              {organizers.filter((o) => o.category === "club").length}
            </Text>
            <Text size="2" color="gray">Student Clubs</Text>
          </Flex>
        </Card>
      </Grid>

      {/* Organizers Grid */}
      {filteredOrganizers.length === 0 ? (
        <Card>
          <Flex direction="column" align="center" py="9">
            <PersonIcon width={64} height={64} color="var(--gray-6)" style={{ marginBottom: "16px" }} />
            <Heading size="4" mb="2">No organizers found</Heading>
            <Text color="gray">Try adjusting your search</Text>
          </Flex>
        </Card>
      ) : (
        <Grid columns={{ initial: "1", md: "2", lg: "3" }} gap="5">
          {filteredOrganizers.map((org) => (
            <Card key={org._id}>
              <Flex justify="between" align="start" mb="4">
                <Flex align="center" gap="3">
                  <Flex
                    align="center"
                    justify="center"
                    style={{
                      width: "56px",
                      height: "56px",
                      background: "linear-gradient(135deg, var(--blue-9), var(--purple-9))",
                      borderRadius: "50%",
                    }}
                  >
                    <Text size="5" weight="bold" style={{ color: "white" }}>
                      {org.name?.charAt(0)}
                    </Text>
                  </Flex>
                  <Box>
                    <Link to={`/organizers/${org._id}`} style={{ textDecoration: "none" }}>
                      <Text weight="bold" size="3" style={{ cursor: "pointer" }}>
                        {org.name}
                      </Text>
                    </Link>
                    <Box mt="1">
                      <Badge color={getCategoryColor(org.category)} size="1">
                        {org.category}
                      </Badge>
                    </Box>
                  </Box>
                </Flex>
                <IconButton
                  variant="ghost"
                  color={followedIds.includes(org._id) ? "red" : "gray"}
                  onClick={() => handleFollow(org._id)}
                  radius="full"
                >
                  {followedIds.includes(org._id) ? (
                    <HeartFilledIcon width={20} height={20} />
                  ) : (
                    <HeartIcon width={20} height={20} />
                  )}
                </IconButton>
              </Flex>

              {org.description && (
                <Text
                  size="2"
                  color="gray"
                  mb="3"
                  style={{
                    display: "-webkit-box",
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: "vertical",
                    overflow: "hidden",
                  }}
                >
                  {org.description}
                </Text>
              )}

              {org.contactEmail && (
                <Flex align="center" gap="2" mb="3">
                  <EnvelopeClosedIcon width={14} height={14} color="var(--gray-9)" />
                  <Text size="2" color="gray" style={{ overflow: "hidden", textOverflow: "ellipsis" }}>
                    {org.contactEmail}
                  </Text>
                </Flex>
              )}

              <Box pt="3" style={{ borderTop: "1px solid var(--gray-a5)" }}>
                <Link to={`/organizers/${org._id}`} style={{ textDecoration: "none" }}>
                  <Text size="2" color="blue" weight="medium">
                    View Events →
                  </Text>
                </Link>
              </Box>
            </Card>
          ))}
        </Grid>
      )}
    </Box>
  );
};

export default OrganizersListing;
