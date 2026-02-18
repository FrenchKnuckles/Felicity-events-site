import { useState, useEffect } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { organizerService } from "../../services";
import { toast } from "react-toastify";
import { Box, Card, Flex, Text, Button, Heading, Badge, TextField, TextArea, Select, Grid, Checkbox, Spinner, Tabs, Callout } from "@radix-ui/themes";
import { ArrowLeftIcon, PlusIcon, TrashIcon, CalendarIcon, GlobeIcon, FileTextIcon, ArchiveIcon, CheckIcon, EyeOpenIcon, Pencil1Icon, ArrowUpIcon, ArrowDownIcon, LockClosedIcon, InfoCircledIcon, ExclamationTriangleIcon } from "@radix-ui/react-icons";

const AREAS_OF_INTEREST = [
  "Competitive Programming", "Web Development", "Mobile App Development",
  "Machine Learning & AI", "Data Science", "Cybersecurity", "Cloud Computing",
  "DevOps", "Blockchain", "IoT", "Robotics", "Game Development",
  "UI/UX Design", "Open Source", "Research & Academia", "Entrepreneurship",
  "Finance & Trading", "Music & Arts", "Photography", "Dance",
  "Literary Arts", "Sports & Fitness", "Social Events",
];

const FIELD_TYPES = [
  { value: "text", label: "Text" },
  { value: "number", label: "Number" },
  { value: "email", label: "Email" },
  { value: "textarea", label: "Long Text" },
  { value: "dropdown", label: "Dropdown" },
  { value: "checkbox", label: "Checkbox" },
  { value: "radio", label: "Radio Buttons" },
  { value: "file", label: "File Upload" },
  { value: "date", label: "Date" },
];

const EventEdit = () => {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState(searchParams.get("tab") || "details");
  const [event, setEvent] = useState(null);
  const [eventData, setEventData] = useState({
    name: "",
    description: "",
    eventType: "normal",
    startDate: "",
    endDate: "",
    registrationDeadline: "",
    venue: "",
    registrationFee: 0,
    registrationLimit: "",
    eligibility: "all",
    areasOfInterest: [],
    customForm: [],
    variants: [],
    purchaseLimitPerUser: 5,
  });

  const splitDateTime = (value) => {
    if (!value) return { date: "", time: "" };
    const [date, time] = value.split("T");
    return { date: date || "", time: (time || "").slice(0, 5) };
  };

  const updateDatePart = (key, datePart) => {
    setEventData((prev) => {
      const { time } = splitDateTime(prev[key]);
      if (!datePart && !time) return { ...prev, [key]: "" };
      const next = datePart ? `${datePart}T${time || "00:00"}` : `T${time}`;
      return { ...prev, [key]: next };
    });
  };

  const updateTimePart = (key, timePart) => {
    setEventData((prev) => {
      const { date } = splitDateTime(prev[key]);
      if (!date && !timePart) return { ...prev, [key]: "" };
      if (!date) return { ...prev, [key]: timePart ? `T${timePart}` : "" };
      return { ...prev, [key]: `${date}T${timePart || "00:00"}` };
    });
  };

  useEffect(() => {
    fetchEvent();
  }, [id]);

  const fetchEvent = async () => {
    try {
      const response = await organizerService.getEventDetails(id);
      const eventDetails = response?.event || response;
      setEvent(eventDetails);
      
      const formatDate = (date) => {
        if (!date) return "";
        return new Date(date).toISOString().slice(0, 16);
      };

      setEventData({
        name: eventDetails.name || "",
        description: eventDetails.description || "",
        eventType: eventDetails.eventType || "normal",
        startDate: formatDate(eventDetails.startDate),
        endDate: formatDate(eventDetails.endDate),
        registrationDeadline: formatDate(eventDetails.registrationDeadline),
        venue: eventDetails.venue || "",
        registrationFee: eventDetails.registrationFee || 0,
        registrationLimit: eventDetails.registrationLimit || "",
        eligibility: eventDetails.eligibility || "all",
        areasOfInterest: eventDetails.areasOfInterest || [],
        customForm: eventDetails.customForm || [],
        variants: eventDetails.variants || [],
        purchaseLimitPerUser: eventDetails.purchaseLimitPerUser || 5,
      });
    } catch (error) {
      toast.error("Failed to fetch event details");
      navigate("/organizer/dashboard");
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value, type } = e.target;
    setEventData((prev) => ({
      ...prev,
      [name]: type === "number" ? (value === "" ? "" : parseFloat(value)) : value,
    }));
  };

  const toggleInterest = (interest) => {
    setEventData((prev) => ({
      ...prev,
      areasOfInterest: prev.areasOfInterest.includes(interest)
        ? prev.areasOfInterest.filter((i) => i !== interest)
        : [...prev.areasOfInterest, interest],
    }));
  };

  const addFormField = () => {
    setEventData((prev) => ({
      ...prev,
      customForm: [
        ...prev.customForm,
        {
          fieldName: `field_${Date.now()}`,
          label: "",
          fieldType: "text",
          required: false,
          options: [],
        },
      ],
    }));
  };

  const updateFormField = (index, field, value) => {
    setEventData((prev) => ({
      ...prev,
      customForm: prev.customForm.map((f, i) =>
        i === index ? { ...f, [field]: value } : f
      ),
    }));
  };

  const removeFormField = (index) => {
    setEventData((prev) => ({
      ...prev,
      customForm: prev.customForm.filter((_, i) => i !== index),
    }));
  };

  const addVariant = () => {
    setEventData((prev) => ({
      ...prev,
      variants: [
        ...prev.variants,
        { size: "", color: "", price: 0, stock: 0 },
      ],
    }));
  };

  const updateVariant = (index, field, value) => {
    setEventData((prev) => ({
      ...prev,
      variants: prev.variants.map((v, i) =>
        i === index ? { ...v, [field]: field === "price" || field === "stock" ? parseFloat(value) || 0 : value } : v
      ),
    }));
  };

  const removeVariant = (index) => {
    setEventData((prev) => ({
      ...prev,
      variants: prev.variants.filter((_, i) => i !== index),
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = {
        ...eventData,
        registrationFee: eventData.registrationFee === "" ? 0 : Number(eventData.registrationFee),
        registrationLimit: eventData.registrationLimit === "" ? undefined : Number(eventData.registrationLimit),
        purchaseLimitPerUser:
          eventData.purchaseLimitPerUser === "" ? undefined : Number(eventData.purchaseLimitPerUser),
      };

      await organizerService.updateEvent(id, payload);
      toast.success("Event updated successfully!");
      fetchEvent();
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to update event");
    } finally {
      setSaving(false);
    }
  };

  const handlePublish = async () => {
    try {
      await organizerService.publishEvent(id);
      toast.success("Event published!");
      fetchEvent();
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to publish event");
    }
  };

  const handleStatusChange = async (newStatus) => {
    try {
      await organizerService.updateEvent(id, { status: newStatus });
      toast.success(`Event marked as ${newStatus}!`);
      fetchEvent();
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to update status");
    }
  };

  // Field reordering
  const moveFieldUp = (index) => {
    if (index <= 0) return;
    setEventData((prev) => {
      const fields = [...prev.customForm];
      [fields[index - 1], fields[index]] = [fields[index], fields[index - 1]];
      return { ...prev, customForm: fields.map((f, i) => ({ ...f, order: i })) };
    });
  };

  const moveFieldDown = (index) => {
    setEventData((prev) => {
      if (index >= prev.customForm.length - 1) return prev;
      const fields = [...prev.customForm];
      [fields[index], fields[index + 1]] = [fields[index + 1], fields[index]];
      return { ...prev, customForm: fields.map((f, i) => ({ ...f, order: i })) };
    });
  };

  // Helpers for editing rules
  const isDraft = event?.status === "draft";
  const isPublished = event?.status === "published";
  const isOngoingOrCompleted = event?.status === "ongoing" || event?.status === "completed";
  const isFormLocked = event?.formLocked;

  if (loading) {
    return (
      <Flex align="center" justify="center" style={{ minHeight: "50vh" }}>
        <Spinner size="3" />
      </Flex>
    );
  }

  return (
    <Box p="6">
      {/* Header */}
      <Flex direction={{ initial: "column", md: "row" }} justify="between" align={{ md: "center" }} mb="6" gap="4">
        <Box>
          <Button variant="ghost" onClick={() => navigate(-1)} mb="2">
            <ArrowLeftIcon width="16" height="16" />
            <Text>Back</Text>
          </Button>
          <Heading size="6">Edit Event</Heading>
          <Flex align="center" gap="2" mt="1">
            <Badge color={
              isDraft ? "orange" : isPublished ? "green" : event?.status === "ongoing" ? "blue" : "purple"
            }>
              {event?.status}
            </Badge>
            {isFormLocked && (
              <Badge color="red" variant="soft">
                <LockClosedIcon width="12" height="12" />
                Form Locked
              </Badge>
            )}
            <Text color="gray">•</Text>
            <Text color="gray">{event?.registrationCount || 0} registrations</Text>
          </Flex>
        </Box>

        <Flex gap="3" wrap="wrap">
          {isDraft && (
            <Button color="green" onClick={handlePublish}>
              <EyeOpenIcon width="16" height="16" />
              <Text>Publish</Text>
            </Button>
          )}
          {isPublished && (
            <>
              <Button variant="soft" color="blue" onClick={() => handleStatusChange("ongoing")}>
                <Text>Mark Ongoing</Text>
              </Button>
              <Button variant="soft" color="red" onClick={() => handleStatusChange("closed")}>
                <Text>Close Registrations</Text>
              </Button>
            </>
          )}
          {event?.status === "ongoing" && (
            <>
              <Button variant="soft" color="purple" onClick={() => handleStatusChange("completed")}>
                <Text>Mark Completed</Text>
              </Button>
              <Button variant="soft" color="red" onClick={() => handleStatusChange("closed")}>
                <Text>Close</Text>
              </Button>
            </>
          )}
          {(isDraft || isPublished) && (
            <Button onClick={handleSave} disabled={saving}>
              <CheckIcon width="16" height="16" />
              <Text>{saving ? "Saving..." : "Save Changes"}</Text>
            </Button>
          )}
        </Flex>
      </Flex>

      {/* Editing Rules Info */}
      {isPublished && (
        <Callout.Root color="blue" mb="4">
          <Callout.Icon><InfoCircledIcon /></Callout.Icon>
          <Callout.Text>
            Published event: Only description, extending the deadline, and increasing the registration limit can be edited.
          </Callout.Text>
        </Callout.Root>
      )}
      {isOngoingOrCompleted && (
        <Callout.Root color="orange" mb="4">
          <Callout.Icon><ExclamationTriangleIcon /></Callout.Icon>
          <Callout.Text>
            This event is {event?.status}. Only status changes are allowed — no field edits.
          </Callout.Text>
        </Callout.Root>
      )}

      {/* Tabs */}
      <Tabs.Root value={activeTab} onValueChange={setActiveTab}>
        <Tabs.List mb="6">
          <Tabs.Trigger value="details">Details</Tabs.Trigger>
          <Tabs.Trigger value="form">Registration Form</Tabs.Trigger>
          <Tabs.Trigger value="variants">Variants</Tabs.Trigger>
        </Tabs.List>

        {/* Details Tab */}
        <Tabs.Content value="details">
          <Flex direction="column" gap="6" style={{ maxWidth: "768px" }}>
            <Card>
              <Flex direction="column" gap="5">
                <Flex align="center" gap="2">
                  <FileTextIcon width="24" height="24" color="var(--blue-9)" />
                  <Heading size="4">Basic Information</Heading>
                </Flex>

                <Box>
                  <Text as="label" size="2" weight="medium" mb="2">Event Type</Text>
                  <Grid columns="2" gap="4" mt="2">
                    <Button
                      variant={eventData.eventType === "normal" ? "solid" : "outline"}
                      onClick={() => setEventData((prev) => ({ ...prev, eventType: "normal" }))}
                      style={{ padding: "24px", height: "auto" }}
                      disabled={!isDraft}
                    >
                      <Flex direction="column" align="center" gap="2">
                        <CalendarIcon width="32" height="32" />
                        <Text weight="medium">Normal Event</Text>
                      </Flex>
                    </Button>
                    <Button
                      variant={eventData.eventType === "merchandise" ? "solid" : "outline"}
                      color="purple"
                      onClick={() => setEventData((prev) => ({ ...prev, eventType: "merchandise" }))}
                      style={{ padding: "24px", height: "auto" }}
                      disabled={!isDraft}
                    >
                      <Flex direction="column" align="center" gap="2">
                        <ArchiveIcon width="32" height="32" />
                        <Text weight="medium">Merchandise</Text>
                      </Flex>
                    </Button>
                  </Grid>
                </Box>

                <Box>
                  <Text as="label" size="2" weight="medium" mb="2">Event Name *</Text>
                  <TextField.Root
                    name="name"
                    value={eventData.name}
                    onChange={handleChange}
                    disabled={!isDraft}
                  />
                </Box>

                <Box>
                  <Text as="label" size="2" weight="medium" mb="2">Description *</Text>
                  <TextArea
                    name="description"
                    value={eventData.description}
                    onChange={handleChange}
                    rows={4}
                    disabled={isOngoingOrCompleted}
                  />
                </Box>

                <Box>
                  <Text as="label" size="2" weight="medium" mb="2">Eligibility</Text>
                  <Select.Root
                    value={eventData.eligibility}
                    onValueChange={(value) => setEventData((prev) => ({ ...prev, eligibility: value }))}
                    disabled={!isDraft}
                  >
                    <Select.Trigger style={{ width: "100%" }} />
                    <Select.Content>
                      <Select.Item value="all">Open to All</Select.Item>
                      <Select.Item value="iiit-only">IIIT Students Only</Select.Item>
                      <Select.Item value="non-iiit-only">Non-IIIT Only</Select.Item>
                    </Select.Content>
                  </Select.Root>
                </Box>

                <Box>
                  <Text as="label" size="2" weight="medium" mb="2">Areas of Interest</Text>
                  <Flex wrap="wrap" gap="2" mt="2">
                    {AREAS_OF_INTEREST.map((interest) => (
                      <Button
                        key={interest}
                        size="1"
                        variant={eventData.areasOfInterest.includes(interest) ? "solid" : "soft"}
                        onClick={() => toggleInterest(interest)}
                        style={{ borderRadius: "9999px" }}
                        disabled={!isDraft}
                      >
                        {interest}
                      </Button>
                    ))}
                  </Flex>
                </Box>
              </Flex>
            </Card>

            <Card>
              <Flex direction="column" gap="5">
                <Flex align="center" gap="2">
                  <CalendarIcon width="24" height="24" color="var(--blue-9)" />
                  <Heading size="4">Date & Location</Heading>
                </Flex>

                <Grid columns={{ initial: "1", md: "2" }} gap="4">
                  <Box>
                    <Text as="label" size="2" weight="medium" mb="2">Start Date & Time *</Text>
                    <Flex gap="3">
                      <TextField.Root
                        type="date"
                        value={splitDateTime(eventData.startDate).date}
                        onChange={(e) => updateDatePart("startDate", e.target.value)}
                        disabled={!isDraft}
                      />
                      <TextField.Root
                        type="time"
                        value={splitDateTime(eventData.startDate).time}
                        onChange={(e) => updateTimePart("startDate", e.target.value)}
                        disabled={!isDraft}
                      />
                    </Flex>
                  </Box>
                  <Box>
                    <Text as="label" size="2" weight="medium" mb="2">End Date & Time</Text>
                    <Flex gap="3">
                      <TextField.Root
                        type="date"
                        value={splitDateTime(eventData.endDate).date}
                        onChange={(e) => updateDatePart("endDate", e.target.value)}
                        disabled={!isDraft}
                      />
                      <TextField.Root
                        type="time"
                        value={splitDateTime(eventData.endDate).time}
                        onChange={(e) => updateTimePart("endDate", e.target.value)}
                        disabled={!isDraft}
                      />
                    </Flex>
                  </Box>
                </Grid>

                <Box>
                  <Flex justify="between" align="center" mb="2">
                    <Text as="label" size="2" weight="medium">Registration Deadline *</Text>
                    {isPublished && (
                      <Text size="1" color="blue">Can only extend to a later date</Text>
                    )}
                  </Flex>
                  <Flex gap="3">
                    <TextField.Root
                      type="date"
                      value={splitDateTime(eventData.registrationDeadline).date}
                      onChange={(e) => updateDatePart("registrationDeadline", e.target.value)}
                      disabled={isOngoingOrCompleted}
                    />
                    <TextField.Root
                      type="time"
                      value={splitDateTime(eventData.registrationDeadline).time}
                      onChange={(e) => updateTimePart("registrationDeadline", e.target.value)}
                      disabled={isOngoingOrCompleted}
                    />
                  </Flex>
                </Box>

                <Box>
                  <Flex align="center" gap="1" mb="2">
                    <GlobeIcon width="14" height="14" />
                    <Text as="label" size="2" weight="medium">Venue</Text>
                  </Flex>
                  <TextField.Root
                    name="venue"
                    value={eventData.venue}
                    onChange={handleChange}
                    disabled={!isDraft}
                  />
                </Box>

                <Grid columns={{ initial: "1", md: "2" }} gap="4">
                  <Box>
                    <Text as="label" size="2" weight="medium" mb="2">Registration Fee (₹)</Text>
                    <TextField.Root
                      type="number"
                      name="registrationFee"
                      value={eventData.registrationFee}
                      onChange={handleChange}
                      min="0"
                      disabled={!isDraft}
                    />
                  </Box>
                  <Box>
                    <Flex justify="between" align="center" mb="2">
                      <Text as="label" size="2" weight="medium">Registration Limit</Text>
                      {isPublished && (
                        <Text size="1" color="blue">Can only increase</Text>
                      )}
                    </Flex>
                    <TextField.Root
                      type="number"
                      name="registrationLimit"
                      value={eventData.registrationLimit}
                      onChange={handleChange}
                      min="0"
                      disabled={isOngoingOrCompleted}
                    />
                  </Box>
                </Grid>
              </Flex>
            </Card>
          </Flex>
        </Tabs.Content>

        {/* Form Tab */}
        <Tabs.Content value="form">
          <Card style={{ maxWidth: "768px" }}>
            <Flex direction="column" gap="5">
              <Flex align="center" justify="between">
                <Flex align="center" gap="2">
                  <FileTextIcon width="24" height="24" color="var(--blue-9)" />
                  <Heading size="4">Registration Form Builder</Heading>
                </Flex>
                {isFormLocked && (
                  <Badge color="red" variant="soft">
                    <LockClosedIcon width="12" height="12" />
                    Locked — registrations received
                  </Badge>
                )}
              </Flex>

              {isFormLocked && (
                <Callout.Root color="red" mb="2">
                  <Callout.Icon><LockClosedIcon /></Callout.Icon>
                  <Callout.Text>
                    The registration form is locked because participants have already registered. Form fields cannot be changed.
                  </Callout.Text>
                </Callout.Root>
              )}

              {!isDraft && !isFormLocked && (
                <Callout.Root color="orange" mb="2">
                  <Callout.Icon><ExclamationTriangleIcon /></Callout.Icon>
                  <Callout.Text>
                    Form editing is only available for draft events.
                  </Callout.Text>
                </Callout.Root>
              )}

              <Text color="gray">
                Add custom fields to collect additional information from participants.
                Supported types: text, number, email, long text, dropdown, checkbox, radio, file upload, date.
              </Text>

              <Flex direction="column" gap="4">
                {eventData.customForm.map((field, index) => (
                  <Card key={index} variant="surface">
                    <Flex justify="between" align="center" mb="4">
                      <Text weight="medium">Field {index + 1}</Text>
                      <Flex gap="1">
                        <Button
                          variant="ghost"
                          size="1"
                          onClick={() => moveFieldUp(index)}
                          disabled={index === 0 || isFormLocked || !isDraft}
                          title="Move up"
                        >
                          <ArrowUpIcon width="14" height="14" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="1"
                          onClick={() => moveFieldDown(index)}
                          disabled={index === eventData.customForm.length - 1 || isFormLocked || !isDraft}
                          title="Move down"
                        >
                          <ArrowDownIcon width="14" height="14" />
                        </Button>
                        <Button
                          variant="ghost"
                          color="red"
                          onClick={() => removeFormField(index)}
                          disabled={isFormLocked || !isDraft}
                        >
                          <TrashIcon width="16" height="16" />
                        </Button>
                      </Flex>
                    </Flex>
                    <Grid columns={{ initial: "1", md: "3" }} gap="4">
                      <Box>
                        <Text as="label" size="2" weight="medium" mb="2">Label</Text>
                        <TextField.Root
                          value={field.label}
                          onChange={(e) => updateFormField(index, "label", e.target.value)}
                          placeholder="Field label"
                          disabled={isFormLocked || !isDraft}
                        />
                      </Box>
                      <Box>
                        <Text as="label" size="2" weight="medium" mb="2">Type</Text>
                        <Select.Root
                          value={field.fieldType}
                          onValueChange={(value) => updateFormField(index, "fieldType", value)}
                          disabled={isFormLocked || !isDraft}
                        >
                          <Select.Trigger style={{ width: "100%" }} />
                          <Select.Content>
                            {FIELD_TYPES.map((type) => (
                              <Select.Item key={type.value} value={type.value}>
                                {type.label}
                              </Select.Item>
                            ))}
                          </Select.Content>
                        </Select.Root>
                      </Box>
                      <Flex align="end">
                        <Flex align="center" gap="2">
                          <Checkbox
                            checked={field.required}
                            onCheckedChange={(checked) => updateFormField(index, "required", checked)}
                            disabled={isFormLocked || !isDraft}
                          />
                          <Text size="2">Required</Text>
                        </Flex>
                      </Flex>
                    </Grid>
                    {(field.fieldType === "dropdown" || field.fieldType === "select" || field.fieldType === "radio") && (
                      <Box mt="4">
                        <Text as="label" size="2" weight="medium" mb="2">Options (comma-separated)</Text>
                        <TextField.Root
                          value={field.options?.join(", ")}
                          onChange={(e) =>
                            updateFormField(
                              index,
                              "options",
                              e.target.value.split(",").map((o) => o.trim())
                            )
                          }
                          placeholder="Option 1, Option 2, Option 3"
                          disabled={isFormLocked || !isDraft}
                        />
                      </Box>
                    )}
                  </Card>
                ))}

                <Button variant="soft" onClick={addFormField} disabled={isFormLocked || !isDraft}>
                  <PlusIcon width="16" height="16" />
                  <Text>Add Field</Text>
                </Button>
              </Flex>
            </Flex>
          </Card>
        </Tabs.Content>

        {/* Variants Tab */}
        <Tabs.Content value="variants">
          <Card style={{ maxWidth: "768px" }}>
            <Flex direction="column" gap="5">
              <Flex align="center" gap="2">
                <ArchiveIcon width="24" height="24" color="var(--purple-9)" />
                <Heading size="4">Merchandise Variants</Heading>
              </Flex>

              {eventData.eventType !== "merchandise" && (
                <Card variant="surface" style={{ backgroundColor: "var(--yellow-3)" }}>
                  <Text color="yellow">
                    Switch to merchandise event type in the Details tab to manage variants.
                  </Text>
                </Card>
              )}

              {eventData.eventType === "merchandise" && (
                <>
                  <Box>
                    <Text as="label" size="2" weight="medium" mb="2">Purchase Limit Per User</Text>
                    <TextField.Root
                      type="number"
                      name="purchaseLimitPerUser"
                      value={eventData.purchaseLimitPerUser}
                      onChange={handleChange}
                      min="1"
                      style={{ width: "128px" }}
                      disabled={!isDraft}
                    />
                  </Box>

                  <Flex direction="column" gap="4">
                    {eventData.variants.map((variant, index) => (
                      <Card key={index} variant="surface">
                        <Flex justify="between" align="center" mb="4">
                          <Text weight="medium">Variant {index + 1}</Text>
                          <Button
                            variant="ghost"
                            color="red"
                            onClick={() => removeVariant(index)}
                            disabled={!isDraft}
                          >
                            <TrashIcon width="16" height="16" />
                          </Button>
                        </Flex>
                        <Grid columns={{ initial: "2", md: "4" }} gap="4">
                          <Box>
                            <Text as="label" size="2" weight="medium" mb="2">Size</Text>
                            <TextField.Root
                              value={variant.size}
                              onChange={(e) => updateVariant(index, "size", e.target.value)}
                              disabled={!isDraft}
                            />
                          </Box>
                          <Box>
                            <Text as="label" size="2" weight="medium" mb="2">Color</Text>
                            <TextField.Root
                              value={variant.color}
                              onChange={(e) => updateVariant(index, "color", e.target.value)}
                              disabled={!isDraft}
                            />
                          </Box>
                          <Box>
                            <Text as="label" size="2" weight="medium" mb="2">Price (₹)</Text>
                            <TextField.Root
                              type="number"
                              value={variant.price}
                              onChange={(e) => updateVariant(index, "price", e.target.value)}
                              min="0"
                              disabled={!isDraft}
                            />
                          </Box>
                          <Box>
                            <Text as="label" size="2" weight="medium" mb="2">Stock</Text>
                            <TextField.Root
                              type="number"
                              value={variant.stock}
                              onChange={(e) => updateVariant(index, "stock", e.target.value)}
                              min="0"
                              disabled={!isDraft}
                            />
                          </Box>
                        </Grid>
                      </Card>
                    ))}

                    <Button variant="soft" onClick={addVariant} disabled={!isDraft}>
                      <PlusIcon width="16" height="16" />
                      <Text>Add Variant</Text>
                    </Button>
                  </Flex>
                </>
              )}
            </Flex>
          </Card>
        </Tabs.Content>
      </Tabs.Root>
    </Box>
  );
};

export default EventEdit;
