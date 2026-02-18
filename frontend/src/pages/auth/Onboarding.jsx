import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { toast } from "react-toastify";
import api from "../../api/axios";
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
  CheckIcon,
  ArrowRightIcon,
  StarIcon,
} from "@radix-ui/react-icons";

const AREAS_OF_INTEREST = [
  "Competitive Programming",
  "Web Development",
  "Mobile App Development",
  "Machine Learning & AI",
  "Data Science",
  "Cybersecurity",
  "Cloud Computing",
  "DevOps",
  "Blockchain",
  "IoT",
  "Robotics",
  "Game Development",
  "UI/UX Design",
  "Open Source",
  "Research & Academia",
  "Entrepreneurship",
  "Finance & Trading",
  "Music & Arts",
  "Photography",
  "Dance",
  "Literary Arts",
  "Sports & Fitness",
  "Social Events",
];

const Onboarding = () => {
  const [step, setStep] = useState(1);
  const [selectedInterests, setSelectedInterests] = useState([]);
  const [organizers, setOrganizers] = useState([]);
  const [followedOrganizers, setFollowedOrganizers] = useState([]);
  const [loading, setLoading] = useState(false);

  const { user, updateUser } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    fetchOrganizers();
  }, []);

  const fetchOrganizers = async () => {
    try {
      const { data } = await api.get("/organizers");
      setOrganizers(data);
    } catch (error) {
      console.error("Error fetching organizers:", error);
    }
  };

  const toggleInterest = (interest) => {
    setSelectedInterests((prev) =>
      prev.includes(interest)
        ? prev.filter((i) => i !== interest)
        : [...prev, interest]
    );
  };

  const toggleFollowOrganizer = (organizerId) => {
    setFollowedOrganizers((prev) =>
      prev.includes(organizerId)
        ? prev.filter((id) => id !== organizerId)
        : [...prev, organizerId]
    );
  };

  const handleNext = () => {
    setStep(2);
  };

  const handleComplete = async () => {
    setLoading(true);
    try {
      const { data } = await api.put("/auth/preferences", {
        areasOfInterest: selectedInterests,
        followedOrganizers,
      });
      
      updateUser({
        ...user,
        areasOfInterest: selectedInterests,
        followedOrganizers,
      });
      
      toast.success("Preferences saved! Welcome to Felicity!");
      navigate("/dashboard");
    } catch (error) {
      toast.error("Failed to save preferences");
    } finally {
      setLoading(false);
    }
  };

  const handleSkip = () => {
    navigate("/dashboard");
  };

  return (
    <Box
      p="4"
      style={{
        minHeight: "100vh",
        background: "linear-gradient(135deg, var(--blue-2), var(--purple-2))",
      }}
    >
      <Box style={{ maxWidth: "768px", margin: "0 auto" }} py="6">
        {/* Progress Steps */}
        <Flex align="center" justify="center" mb="6">
          <Flex align="center" gap="2">
            <Flex
              align="center"
              justify="center"
              style={{
                width: "40px",
                height: "40px",
                borderRadius: "50%",
                backgroundColor: step >= 1 ? "var(--blue-9)" : "var(--gray-4)",
                color: step >= 1 ? "white" : "var(--gray-11)",
              }}
            >
              {step > 1 ? <CheckIcon width={24} height={24} /> : "1"}
            </Flex>
            <Box
              style={{
                width: "96px",
                height: "4px",
                backgroundColor: step > 1 ? "var(--blue-9)" : "var(--gray-4)",
              }}
            />
            <Flex
              align="center"
              justify="center"
              style={{
                width: "40px",
                height: "40px",
                borderRadius: "50%",
                backgroundColor: step >= 2 ? "var(--blue-9)" : "var(--gray-4)",
                color: step >= 2 ? "white" : "var(--gray-11)",
              }}
            >
              2
            </Flex>
          </Flex>
        </Flex>

        <Card size="3">
          {step === 1 && (
            <>
              <Box style={{ textAlign: "center" }} mb="6">
                <StarIcon
                  width={48}
                  height={48}
                  color="var(--yellow-9)"
                  style={{ margin: "0 auto 16px" }}
                />
                <Heading size="6" mb="2">What interests you?</Heading>
                <Text color="gray" size="3">
                  Select your areas of interest to get personalized event recommendations
                </Text>
              </Box>

              <Flex wrap="wrap" gap="3" justify="center" mb="6">
                {AREAS_OF_INTEREST.map((interest) => (
                  <Button
                    key={interest}
                    variant={selectedInterests.includes(interest) ? "solid" : "outline"}
                    color={selectedInterests.includes(interest) ? "blue" : "gray"}
                    onClick={() => toggleInterest(interest)}
                    style={{ borderRadius: "9999px" }}
                  >
                    {selectedInterests.includes(interest) && (
                      <CheckIcon width={16} height={16} />
                    )}
                    {interest}
                  </Button>
                ))}
              </Flex>

              <Flex justify="between" align="center">
                <Button variant="ghost" color="gray" onClick={handleSkip}>
                  Skip for now
                </Button>
                <Button onClick={handleNext}>
                  Next
                  <ArrowRightIcon width={20} height={20} />
                </Button>
              </Flex>
            </>
          )}

          {step === 2 && (
            <>
              <Box style={{ textAlign: "center" }} mb="6">
                <Heading size="6" mb="2">Follow Clubs & Organizers</Heading>
                <Text color="gray" size="3">
                  Follow clubs to get notified about their events
                </Text>
              </Box>

              {organizers.length === 0 ? (
                <Text align="center" color="gray" style={{ display: "block", padding: "32px 0" }}>
                  No clubs/organizers available yet
                </Text>
              ) : (
                <Grid columns={{ initial: "1", md: "2" }} gap="4" mb="6">
                  {organizers.map((org) => (
                    <Card
                      key={org._id}
                      onClick={() => toggleFollowOrganizer(org._id)}
                      style={{
                        cursor: "pointer",
                        border: followedOrganizers.includes(org._id)
                          ? "2px solid var(--blue-9)"
                          : "2px solid var(--gray-5)",
                        backgroundColor: followedOrganizers.includes(org._id)
                          ? "var(--blue-2)"
                          : undefined,
                      }}
                    >
                      <Flex justify="between" align="center">
                        <Box>
                          <Text weight="bold" size="3">{org.name}</Text>
                          <Text size="2" color="gray">{org.category}</Text>
                        </Box>
                        {followedOrganizers.includes(org._id) && (
                          <CheckIcon width={24} height={24} color="var(--blue-9)" />
                        )}
                      </Flex>
                      {org.description && (
                        <Text
                          size="2"
                          color="gray"
                          mt="2"
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
                    </Card>
                  ))}
                </Grid>
              )}

              <Flex justify="between" align="center">
                <Button variant="ghost" color="gray" onClick={() => setStep(1)}>
                  Back
                </Button>
                <Button onClick={handleComplete} disabled={loading}>
                  {loading ? <><Spinner size="1" /> Saving...</> : "Complete Setup"}
                </Button>
              </Flex>
            </>
          )}
        </Card>
      </Box>
    </Box>
  );
};

export default Onboarding;
