import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { eventService } from "../../services";
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
  TextField,
  TextArea,
  Select,
  Callout,
  Spinner,
  Dialog,
  Checkbox,
} from "@radix-ui/themes";
import {
  CalendarIcon,
  PersonIcon,
  ClockIcon,
  CheckCircledIcon,
  ExclamationTriangleIcon,
  ArrowLeftIcon,
  BackpackIcon,
  InfoCircledIcon,
} from "@radix-ui/react-icons";

const EventDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [registering, setRegistering] = useState(false);
  const [formResponses, setFormResponses] = useState({});
  const [showRegistrationModal, setShowRegistrationModal] = useState(false);
  const [selectedVariant, setSelectedVariant] = useState(null);
  const [quantity, setQuantity] = useState(1);

  useEffect(() => {
    fetchEventDetails();
  }, [id]);

  const fetchEventDetails = async () => {
    try {
      const data = await eventService.getEventById(id);
      setEvent(data?.event || data);
    } catch (error) {
      console.error("Error fetching event:", error);
      toast.error("Event not found");
      navigate("/events");
    } finally {
      setLoading(false);
    }
  };

  const handleFormChange = (fieldName, value) => {
    setFormResponses((prev) => ({ ...prev, [fieldName]: value }));
  };

  const handleRegister = async () => {
    if (!user) {
      toast.info("Please login to register");
      navigate("/login");
      return;
    }

    if (event.customForm && event.customForm.length > 0) {
      setShowRegistrationModal(true);
      return;
    }

    await submitRegistration();
  };

  const submitRegistration = async () => {
    setRegistering(true);
    try {
      await eventService.register(id, formResponses);
      toast.success("Registration successful! Check your email for the ticket.");
      fetchEventDetails();
      setShowRegistrationModal(false);
    } catch (error) {
      toast.error(error.response?.data?.message || "Registration failed");
    } finally {
      setRegistering(false);
    }
  };

  const handlePurchase = async () => {
    if (!user) {
      toast.info("Please login to purchase");
      navigate("/login");
      return;
    }

    if (!selectedVariant) {
      toast.warning("Please select a variant");
      return;
    }

    setRegistering(true);
    try {
      await eventService.purchase(id, selectedVariant, quantity);
      toast.success("Purchase successful!");
      fetchEventDetails();
    } catch (error) {
      toast.error(error.response?.data?.message || "Purchase failed");
    } finally {
      setRegistering(false);
    }
  };

  const getEligibilityBadge = () => {
    const badges = {
      all: { text: "Open to All", color: "green" },
      "iiit-only": { text: "IIIT Only", color: "blue" },
      "non-iiit-only": { text: "Non-IIIT Only", color: "orange" },
    };
    return badges[event?.eligibility] || badges.all;
  };

  const canRegister = () => {
    if (!event) return false;
    if (event.userRegistered) return false;
    if (event.status !== "published" && event.status !== "ongoing") return false;
    if (new Date() > new Date(event.registrationDeadline)) return false;
    if (event.registrationLimit && event.registrationCount >= event.registrationLimit) return false;
    
    // Check eligibility
    if (user) {
      if (event.eligibility === "iiit-only" && user.participantType !== "iiit") return false;
      if (event.eligibility === "non-iiit-only" && user.participantType === "iiit") return false;
    }
    
    return true;
  };

  if (loading) {
    return (
      <Flex align="center" justify="center" style={{ minHeight: "100vh" }}>
        <Spinner size="3" />
      </Flex>
    );
  }

  if (!event) {
    return (
      <Box p="6" style={{ maxWidth: "1200px", margin: "0 auto", textAlign: "center" }}>
        <Heading size="6" mb="4">Event not found</Heading>
        <Link to="/events">
          <Button>Browse Events</Button>
        </Link>
      </Box>
    );
  }

  const eligibility = getEligibilityBadge();

  return (
    <Box p="6" style={{ maxWidth: "1200px", margin: "0 auto" }}>
      {/* Back Button */}
      <Button
        variant="ghost"
        onClick={() => navigate(-1)}
        mb="5"
      >
        <ArrowLeftIcon width={16} height={16} />
        Back to Events
      </Button>

      <Grid columns={{ initial: "1", lg: "3" }} gap="6">
        {/* Main Content */}
        <Box style={{ gridColumn: "span 2" }}>
          <Flex direction="column" gap="5">
            {/* Event Header */}
            <Card>
              <Flex align="start" justify="between" mb="4">
                <Box>
                  <Flex align="center" gap="2" mb="2">
                    {event.eventType === "merchandise" ? (
                      <Badge color="orange">
                        <Flex align="center" gap="1">
                          <BackpackIcon width={14} height={14} />
                          <span>Merchandise</span>
                        </Flex>
                      </Badge>
                    ) : (
                      <Badge color="blue">Event</Badge>
                    )}
                    <Badge color={eligibility.color}>{eligibility.text}</Badge>
                  </Flex>
                  <Heading size="7">{event.name}</Heading>
                </Box>
              </Flex>

              <Link
                to={`/organizers/${event.organizerId?._id}`}
                style={{ textDecoration: "none" }}
              >
                <Text color="blue" weight="medium" mb="5" style={{ display: "inline-block" }}>
                  {event.organizerId?.name}
                </Text>
              </Link>

              {/* Event Details */}
              <Grid columns={{ initial: "1", md: "2" }} gap="4" mb="5">
                <Flex align="center" gap="3">
                  <CalendarIcon width={20} height={20} color="gray" />
                  <Box>
                    <Text weight="medium">Date</Text>
                    <Text size="2" color="gray">
                      {format(new Date(event.startDate), "EEEE, MMMM d, yyyy")}
                      {event.endDate && event.endDate !== event.startDate && (
                        <> - {format(new Date(event.endDate), "MMMM d, yyyy")}</>
                      )}
                    </Text>
                  </Box>
                </Flex>

                <Flex align="center" gap="3">
                  <ClockIcon width={20} height={20} color="gray" />
                  <Box>
                    <Text weight="medium">Time</Text>
                    <Text size="2" color="gray">{format(new Date(event.startDate), "h:mm a")}</Text>
                  </Box>
                </Flex>

                {event.venue && (
                  <Flex align="center" gap="3">
                    <InfoCircledIcon width={20} height={20} color="gray" />
                    <Box>
                      <Text weight="medium">Venue</Text>
                      <Text size="2" color="gray">{event.venue}</Text>
                    </Box>
                  </Flex>
                )}

                <Flex align="center" gap="3">
                  <PersonIcon width={20} height={20} color="gray" />
                  <Box>
                    <Text weight="medium">Registrations</Text>
                    <Text size="2" color="gray">
                      {event.registrationCount}
                      {event.registrationLimit && ` / ${event.registrationLimit}`}
                    </Text>
                  </Box>
                </Flex>
              </Grid>

              {/* Description */}
              <Box>
                <Heading size="4" mb="2">About this Event</Heading>
                <Text color="gray" style={{ whiteSpace: "pre-wrap" }}>{event.description}</Text>
              </Box>
            </Card>

            {/* Registration Form (for events with custom form) */}
            {event.customForm && event.customForm.length > 0 && !event.userRegistered && (
              <Card>
                <Heading size="4" mb="3">Registration Form</Heading>
                <Text size="2" color="gray" mb="4">
                  Please fill out the following information to complete your registration.
                </Text>
                <Flex direction="column" gap="4">
                  {event.customForm.map((field) => (
                    <Box key={field.fieldName}>
                      <Text as="label" size="2" weight="medium" mb="1">
                        {field.label}
                        {field.required && <Text color="red" ml="1">*</Text>}
                      </Text>
                      {field.fieldType === "text" && (
                        <TextField.Root
                          value={formResponses[field.fieldName] || ""}
                          onChange={(e) => handleFormChange(field.fieldName, e.target.value)}
                          required={field.required}
                        />
                      )}
                      {field.fieldType === "number" && (
                        <TextField.Root
                          type="number"
                          value={formResponses[field.fieldName] || ""}
                          onChange={(e) => handleFormChange(field.fieldName, e.target.value)}
                          required={field.required}
                        />
                      )}
                      {field.fieldType === "email" && (
                        <TextField.Root
                          type="email"
                          value={formResponses[field.fieldName] || ""}
                          onChange={(e) => handleFormChange(field.fieldName, e.target.value)}
                          required={field.required}
                        />
                      )}
                      {field.fieldType === "textarea" && (
                        <TextArea
                          value={formResponses[field.fieldName] || ""}
                          onChange={(e) => handleFormChange(field.fieldName, e.target.value)}
                          rows={3}
                          required={field.required}
                        />
                      )}
                      {field.fieldType === "select" && (
                        <Select.Root
                          value={formResponses[field.fieldName] || ""}
                          onValueChange={(value) => handleFormChange(field.fieldName, value)}
                        >
                          <Select.Trigger placeholder="Select an option" style={{ width: "100%" }} />
                          <Select.Content>
                            {field.options?.map((opt) => (
                              <Select.Item key={opt} value={opt}>
                                {opt}
                              </Select.Item>
                            ))}
                          </Select.Content>
                        </Select.Root>
                      )}
                      {field.fieldType === "checkbox" && (
                        <Flex align="center" gap="2">
                          <Checkbox
                            id={field.fieldName}
                            checked={formResponses[field.fieldName] || false}
                            onCheckedChange={(checked) => handleFormChange(field.fieldName, checked)}
                          />
                          <Text as="label" htmlFor={field.fieldName} color="gray">
                            {field.label}
                          </Text>
                        </Flex>
                      )}
                    </Box>
                  ))}
                </Flex>
              </Card>
            )}

            {/* Merchandise Variants */}
            {event.eventType === "merchandise" && event.variants && event.variants.length > 0 && (
              <Card>
                <Heading size="4" mb="4">Select Variant</Heading>
                <Grid columns={{ initial: "1", md: "2" }} gap="4">
                  {event.variants.map((variant) => (
                    <Box
                      key={variant._id}
                      onClick={() => variant.stock > 0 && setSelectedVariant(variant._id)}
                      style={{
                        padding: "16px",
                        borderRadius: "8px",
                        border: selectedVariant === variant._id
                          ? "2px solid var(--blue-9)"
                          : "2px solid var(--gray-a5)",
                        backgroundColor: selectedVariant === variant._id
                          ? "var(--blue-2)"
                          : variant.stock > 0
                          ? "transparent"
                          : "var(--gray-2)",
                        cursor: variant.stock > 0 ? "pointer" : "not-allowed",
                        opacity: variant.stock > 0 ? 1 : 0.5,
                      }}
                    >
                      <Flex justify="between" align="start">
                        <Box>
                          <Text weight="medium">
                            Size: {variant.size} {variant.color && `- ${variant.color}`}
                          </Text>
                          <Text size="2" color="gray">
                            {variant.stock > 0 ? `${variant.stock} in stock` : "Out of stock"}
                          </Text>
                        </Box>
                        <Text weight="bold">₹{variant.price}</Text>
                      </Flex>
                    </Box>
                  ))}
                </Grid>

                {selectedVariant && (
                  <Flex align="center" gap="4" mt="4">
                    <Text color="gray">Quantity:</Text>
                    <TextField.Root
                      type="number"
                      min="1"
                      max={event.purchaseLimitPerUser || 5}
                      value={quantity}
                      onChange={(e) => setQuantity(parseInt(e.target.value))}
                      style={{ width: "96px" }}
                    />
                  </Flex>
                )}
              </Card>
            )}
          </Flex>
        </Box>

        {/* Sidebar */}
        <Box>
          <Flex direction="column" gap="5">
            {/* Registration Card */}
            <Card style={{ position: "sticky", top: "96px" }}>
              <Flex direction="column" align="center" mb="5">
                <Heading size="7" mb="2">
                  {event.registrationFee > 0 ? `₹${event.registrationFee}` : "Free"}
                </Heading>
                {event.registrationFee > 0 && (
                  <Text size="2" color="gray">Registration Fee</Text>
                )}
              </Flex>

              {/* Status Messages */}
              {event.userRegistered && (
                <Callout.Root color="green" mb="4">
                  <Callout.Icon>
                    <CheckCircledIcon />
                  </Callout.Icon>
                  <Callout.Text>You are registered for this event!</Callout.Text>
                </Callout.Root>
              )}

              {!canRegister() && !event.userRegistered && (
                <Callout.Root color="yellow" mb="4">
                  <Callout.Icon>
                    <ExclamationTriangleIcon />
                  </Callout.Icon>
                  <Callout.Text>
                    {event.status !== "published" && event.status !== "ongoing" && "Event is not open for registration"}
                    {new Date() > new Date(event.registrationDeadline) && "Registration deadline has passed"}
                    {event.registrationLimit && event.registrationCount >= event.registrationLimit && "Registration is full"}
                    {user && event.eligibility === "iiit-only" && user.participantType !== "iiit" && "This event is only for IIIT participants"}
                    {user && event.eligibility === "non-iiit-only" && user.participantType === "iiit" && "This event is only for Non-IIIT participants"}
                  </Callout.Text>
                </Callout.Root>
              )}

              {/* Registration Button */}
              {event.eventType === "merchandise" ? (
                <Button
                  size="3"
                  style={{ width: "100%" }}
                  onClick={handlePurchase}
                  disabled={registering || !selectedVariant}
                >
                  {registering ? (
                    <Flex align="center" gap="2">
                      <Spinner size="1" />
                      <span>Processing...</span>
                    </Flex>
                  ) : (
                    <Flex align="center" gap="2">
                      <BackpackIcon width={16} height={16} />
                      <span>Purchase</span>
                    </Flex>
                  )}
                </Button>
              ) : (
                <Button
                  size="3"
                  style={{ width: "100%" }}
                  onClick={event.customForm?.length > 0 ? () => setShowRegistrationModal(true) : submitRegistration}
                  disabled={registering || !canRegister()}
                >
                  {registering ? (
                    <Flex align="center" gap="2">
                      <Spinner size="1" />
                      <span>Registering...</span>
                    </Flex>
                  ) : event.userRegistered ? (
                    <Flex align="center" gap="2">
                      <CheckCircledIcon width={16} height={16} />
                      <span>Already Registered</span>
                    </Flex>
                  ) : (
                    <Flex align="center" gap="2">
                      <PersonIcon width={16} height={16} />
                      <span>Register Now</span>
                    </Flex>
                  )}
                </Button>
              )}

              {/* Registration Deadline */}
              <Flex align="center" justify="center" gap="2" mt="4">
                <ClockIcon width={14} height={14} color="gray" />
                <Text size="2" color="gray">
                  Registration closes: {format(new Date(event.registrationDeadline), "MMM d, yyyy h:mm a")}
                </Text>
              </Flex>
            </Card>

            {/* Organizer Info */}
            <Card>
              <Heading size="4" mb="4">Organized by</Heading>
              <Link
                to={`/organizers/${event.organizerId?._id}`}
                style={{ textDecoration: "none" }}
              >
                <Flex
                  align="center"
                  gap="3"
                  p="2"
                  style={{
                    borderRadius: "8px",
                    margin: "-8px",
                  }}
                >
                  <Flex
                    align="center"
                    justify="center"
                    style={{
                      width: "48px",
                      height: "48px",
                      backgroundColor: "var(--blue-3)",
                      borderRadius: "50%",
                    }}
                  >
                    <Text color="blue" weight="bold" size="5">
                      {event.organizerId?.name?.charAt(0)}
                    </Text>
                  </Flex>
                  <Box>
                    <Text weight="medium">{event.organizerId?.name}</Text>
                    <Text size="2" color="gray">{event.organizerId?.category}</Text>
                  </Box>
                </Flex>
              </Link>
            </Card>
          </Flex>
        </Box>
      </Grid>

      {/* Registration Modal */}
      <Dialog.Root open={showRegistrationModal} onOpenChange={setShowRegistrationModal}>
        <Dialog.Content style={{ maxWidth: "480px" }}>
          <Dialog.Title>Complete Registration</Dialog.Title>
          <Dialog.Description size="2" mb="4">
            Please fill out the form to complete your registration for {event.name}
          </Dialog.Description>

          <Flex direction="column" gap="4">
            {event.customForm?.map((field) => (
              <Box key={field.fieldName}>
                <Text as="label" size="2" weight="medium" mb="1">
                  {field.label}
                  {field.required && <Text color="red" ml="1">*</Text>}
                </Text>
                {field.fieldType === "text" && (
                  <TextField.Root
                    value={formResponses[field.fieldName] || ""}
                    onChange={(e) => handleFormChange(field.fieldName, e.target.value)}
                    required={field.required}
                  />
                )}
                {field.fieldType === "textarea" && (
                  <TextArea
                    value={formResponses[field.fieldName] || ""}
                    onChange={(e) => handleFormChange(field.fieldName, e.target.value)}
                    rows={3}
                    required={field.required}
                  />
                )}
                {field.fieldType === "select" && (
                  <Select.Root
                    value={formResponses[field.fieldName] || ""}
                    onValueChange={(value) => handleFormChange(field.fieldName, value)}
                  >
                    <Select.Trigger placeholder="Select an option" style={{ width: "100%" }} />
                    <Select.Content>
                      {field.options?.map((opt) => (
                        <Select.Item key={opt} value={opt}>
                          {opt}
                        </Select.Item>
                      ))}
                    </Select.Content>
                  </Select.Root>
                )}
              </Box>
            ))}
          </Flex>

          <Flex gap="4" mt="5">
            <Dialog.Close>
              <Button variant="soft" style={{ flex: 1 }}>
                Cancel
              </Button>
            </Dialog.Close>
            <Button
              onClick={submitRegistration}
              disabled={registering}
              style={{ flex: 1 }}
            >
              {registering ? "Submitting..." : "Submit Registration"}
            </Button>
          </Flex>
        </Dialog.Content>
      </Dialog.Root>
    </Box>
  );
};

export default EventDetails;
