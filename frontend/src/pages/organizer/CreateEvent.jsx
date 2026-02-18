import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { organizerService } from "../../services";
import { toast } from "react-toastify";
import { Box, Flex, Text, Heading, Button, Card, Grid, TextField, TextArea, Select, Checkbox } from "@radix-ui/themes";
import {
  ArrowLeftIcon,
  PlusIcon,
  TrashIcon,
  CalendarIcon,
  ChevronRightIcon,
  ChevronLeftIcon,
  FileTextIcon,
  CubeIcon,
  ArrowUpIcon,
  ArrowDownIcon,
} from "@radix-ui/react-icons";

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

const CreateEvent = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
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

  // Custom Form Management
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

  const moveFormFieldUp = (index) => {
    if (index <= 0) return;
    setEventData((prev) => {
      const fields = [...prev.customForm];
      [fields[index - 1], fields[index]] = [fields[index], fields[index - 1]];
      return { ...prev, customForm: fields.map((f, i) => ({ ...f, order: i })) };
    });
  };

  const moveFormFieldDown = (index) => {
    setEventData((prev) => {
      if (index >= prev.customForm.length - 1) return prev;
      const fields = [...prev.customForm];
      [fields[index], fields[index + 1]] = [fields[index + 1], fields[index]];
      return { ...prev, customForm: fields.map((f, i) => ({ ...f, order: i })) };
    });
  };

  // Variant Management (for merchandise)
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

  const validateStep = () => {
    if (step === 1) {
      if (!eventData.name || !eventData.description) {
        toast.warning("Please fill in all required fields");
        return false;
      }
    }
    if (step === 2) {
      if (!eventData.startDate || !eventData.registrationDeadline) {
        toast.warning("Please fill in all required date fields");
        return false;
      }
      const start = new Date(eventData.startDate);
      const regDeadline = new Date(eventData.registrationDeadline);
      if (Number.isNaN(start.getTime()) || Number.isNaN(regDeadline.getTime())) {
        toast.warning("Please provide valid date and time");
        return false;
      }
      if (regDeadline > start) {
        toast.warning("Registration deadline must be before the event start date");
        return false;
      }
    }
    if (step === 3 && eventData.eventType === "merchandise") {
      if (eventData.variants.length === 0) {
        toast.warning("Please add at least one variant for merchandise");
        return false;
      }
    }
    return true;
  };

  const handleNext = () => {
    if (validateStep()) {
      setStep((prev) => prev + 1);
    }
  };

  const handleBack = () => {
    setStep((prev) => prev - 1);
  };

  const handleSubmit = async (publish = false) => {
    if (!validateStep()) return;

    setLoading(true);
    try {
      const payload = {
        ...eventData,
        registrationFee: eventData.registrationFee === "" ? 0 : Number(eventData.registrationFee),
        registrationLimit: eventData.registrationLimit === "" ? undefined : Number(eventData.registrationLimit),
        purchaseLimitPerUser:
          eventData.purchaseLimitPerUser === "" ? undefined : Number(eventData.purchaseLimitPerUser),
      };

      const response = await organizerService.createEvent(payload);
      
      if (publish && response?.event?._id) {
        await organizerService.publishEvent(response.event._id);
        toast.success("Event created and published!");
      } else if (publish) {
        toast.success("Event created as draft (auto-publish failed)");
      } else {
        toast.success("Event saved as draft!");
      }
      
      navigate("/organizer/dashboard");
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to create event");
    } finally {
      setLoading(false);
    }
  };

  const renderStepIndicator = () => (
    <Flex align="center" justify="center" mb="6">
      {[1, 2, 3, 4].map((s) => (
        <Flex key={s} align="center">
          <Flex
            align="center"
            justify="center"
            style={{
              width: 40,
              height: 40,
              borderRadius: "50%",
              backgroundColor: s <= step ? "var(--blue-9)" : "var(--gray-4)",
              color: s <= step ? "white" : "var(--gray-9)",
              fontWeight: 500,
            }}
          >
            {s}
          </Flex>
          {s < 4 && (
            <Box
              style={{
                width: 64,
                height: 4,
                margin: "0 8px",
                backgroundColor: s < step ? "var(--blue-9)" : "var(--gray-4)",
              }}
            />
          )}
        </Flex>
      ))}
    </Flex>
  );

  return (
    <Box p="6">
      {/* Header */}
      <Button variant="ghost" onClick={() => navigate(-1)} mb="4">
        <ArrowLeftIcon width="18" height="18" />
        Back
      </Button>

      <Heading size="8" weight="bold" mb="2">Create New Event</Heading>
      <Text color="gray" size="3" mb="6">Fill in the details to create your event</Text>

      {renderStepIndicator()}

      <Box style={{ maxWidth: 768, margin: "0 auto" }}>
        {/* Step 1: Basic Info */}
        {step === 1 && (
          <Card>
            <Flex direction="column" gap="5">
              <Flex align="center" gap="2">
                <FileTextIcon width="24" height="24" color="var(--blue-9)" />
                <Heading size="5">Basic Information</Heading>
              </Flex>

              <Box>
                <Text as="label" size="2" weight="medium" mb="1">Event Type *</Text>
                <Grid columns="2" gap="4" mt="2">
                  <Box
                    onClick={() => setEventData((prev) => ({ ...prev, eventType: "normal" }))}
                    style={{
                      padding: 16,
                      borderRadius: "var(--radius-3)",
                      border: `2px solid ${eventData.eventType === "normal" ? "var(--blue-9)" : "var(--gray-5)"}`,
                      backgroundColor: eventData.eventType === "normal" ? "var(--blue-2)" : "transparent",
                      cursor: "pointer",
                      textAlign: "center",
                    }}
                  >
                    <CalendarIcon width="32" height="32" color="var(--blue-9)" style={{ margin: "0 auto 8px" }} />
                    <Text weight="medium">Normal Event</Text>
                    <Text size="1" color="gray">Workshop, Competition, etc.</Text>
                  </Box>
                  <Box
                    onClick={() => setEventData((prev) => ({ ...prev, eventType: "merchandise" }))}
                    style={{
                      padding: 16,
                      borderRadius: "var(--radius-3)",
                      border: `2px solid ${eventData.eventType === "merchandise" ? "var(--blue-9)" : "var(--gray-5)"}`,
                      backgroundColor: eventData.eventType === "merchandise" ? "var(--blue-2)" : "transparent",
                      cursor: "pointer",
                      textAlign: "center",
                    }}
                  >
                    <CubeIcon width="32" height="32" color="var(--purple-9)" style={{ margin: "0 auto 8px" }} />
                    <Text weight="medium">Merchandise</Text>
                    <Text size="1" color="gray">T-shirts, Goodies, etc.</Text>
                  </Box>
                </Grid>
              </Box>

              <Box>
                <Text as="label" size="2" weight="medium" mb="1">Event Name *</Text>
                <TextField.Root
                  name="name"
                  value={eventData.name}
                  onChange={handleChange}
                  placeholder="Enter event name"
                  size="3"
                  mt="1"
                />
              </Box>

              <Box>
                <Text as="label" size="2" weight="medium" mb="1">Description *</Text>
                <TextArea
                  name="description"
                  value={eventData.description}
                  onChange={handleChange}
                  placeholder="Describe your event..."
                  rows={4}
                  size="3"
                  style={{ marginTop: 4 }}
                />
              </Box>

              <Box>
                <Text as="label" size="2" weight="medium" mb="1">Eligibility *</Text>
                <Select.Root
                  value={eventData.eligibility}
                  onValueChange={(value) => setEventData((prev) => ({ ...prev, eligibility: value }))}
                >
                  <Select.Trigger style={{ width: "100%", marginTop: 4 }} />
                  <Select.Content>
                    <Select.Item value="all">Open to All</Select.Item>
                    <Select.Item value="iiit-only">IIIT Students Only</Select.Item>
                    <Select.Item value="non-iiit-only">Non-IIIT Only</Select.Item>
                  </Select.Content>
                </Select.Root>
              </Box>

              <Box>
                <Text as="label" size="2" weight="medium">Areas of Interest</Text>
                <Text size="1" color="gray" mb="2">
                  Select categories to help users discover your event
                </Text>
                <Flex wrap="wrap" gap="2" mt="2">
                  {AREAS_OF_INTEREST.map((interest) => (
                    <Button
                      key={interest}
                      type="button"
                      onClick={() => toggleInterest(interest)}
                      variant={eventData.areasOfInterest.includes(interest) ? "solid" : "soft"}
                      color={eventData.areasOfInterest.includes(interest) ? "blue" : "gray"}
                      size="1"
                      radius="full"
                    >
                      {interest}
                    </Button>
                  ))}
                </Flex>
              </Box>
            </Flex>
          </Card>
        )}

        {/* Step 2: Date & Location */}
        {step === 2 && (
          <Card>
            <Flex direction="column" gap="5">
              <Flex align="center" gap="2">
                <CalendarIcon width="24" height="24" color="var(--blue-9)" />
                <Heading size="5">Date & Location</Heading>
              </Flex>

              <Grid columns={{ initial: "1", md: "2" }} gap="4">
                <Box>
                  <Text as="label" size="2" weight="medium">Start Date & Time *</Text>
                  <Flex gap="3" mt="1">
                    <TextField.Root
                      type="date"
                      value={splitDateTime(eventData.startDate).date}
                      onChange={(e) => updateDatePart("startDate", e.target.value)}
                      size="3"
                    />
                    <TextField.Root
                      type="time"
                      value={splitDateTime(eventData.startDate).time}
                      onChange={(e) => updateTimePart("startDate", e.target.value)}
                      size="3"
                    />
                  </Flex>
                </Box>
                <Box>
                  <Text as="label" size="2" weight="medium">End Date & Time</Text>
                  <Flex gap="3" mt="1">
                    <TextField.Root
                      type="date"
                      value={splitDateTime(eventData.endDate).date}
                      onChange={(e) => updateDatePart("endDate", e.target.value)}
                      size="3"
                    />
                    <TextField.Root
                      type="time"
                      value={splitDateTime(eventData.endDate).time}
                      onChange={(e) => updateTimePart("endDate", e.target.value)}
                      size="3"
                    />
                  </Flex>
                </Box>
              </Grid>

              <Box>
                <Text as="label" size="2" weight="medium">Registration Deadline *</Text>
                <Flex gap="3" mt="1">
                  <TextField.Root
                    type="date"
                    value={splitDateTime(eventData.registrationDeadline).date}
                    onChange={(e) => updateDatePart("registrationDeadline", e.target.value)}
                    size="3"
                  />
                  <TextField.Root
                    type="time"
                    value={splitDateTime(eventData.registrationDeadline).time}
                    onChange={(e) => updateTimePart("registrationDeadline", e.target.value)}
                    size="3"
                  />
                </Flex>
              </Box>

              <Box>
                <Text as="label" size="2" weight="medium">📍 Venue</Text>
                <TextField.Root
                  type="text"
                  name="venue"
                  value={eventData.venue}
                  onChange={handleChange}
                  placeholder="Enter venue or location"
                  size="3"
                  mt="1"
                />
              </Box>

              <Grid columns={{ initial: "1", md: "2" }} gap="4">
                <Box>
                  <Text as="label" size="2" weight="medium">₹ Registration Fee</Text>
                  <TextField.Root
                    type="number"
                    name="registrationFee"
                    value={eventData.registrationFee}
                    onChange={handleChange}
                    min="0"
                    placeholder="0 for free"
                    size="3"
                    mt="1"
                  />
                </Box>
                <Box>
                  <Text as="label" size="2" weight="medium">👥 Registration Limit</Text>
                  <TextField.Root
                    type="number"
                    name="registrationLimit"
                    value={eventData.registrationLimit}
                    onChange={handleChange}
                    min="0"
                    placeholder="Leave empty for unlimited"
                    size="3"
                    mt="1"
                  />
                </Box>
              </Grid>
            </Flex>
          </Card>
        )}

        {/* Step 3: Form Builder / Variants */}
        {step === 3 && (
          <Card>
            <Flex direction="column" gap="5">
              {eventData.eventType === "merchandise" ? (
                <>
                  <Flex align="center" gap="2">
                    <CubeIcon width="24" height="24" color="var(--purple-9)" />
                    <Heading size="5">Merchandise Variants</Heading>
                  </Flex>

                  <Box>
                    <Text as="label" size="2" weight="medium">Purchase Limit Per User</Text>
                    <TextField.Root
                      type="number"
                      name="purchaseLimitPerUser"
                      value={eventData.purchaseLimitPerUser}
                      onChange={handleChange}
                      min="1"
                      size="3"
                      mt="1"
                      style={{ width: 128 }}
                    />
                  </Box>

                  <Flex direction="column" gap="4">
                    {eventData.variants.map((variant, index) => (
                      <Card key={index} variant="surface">
                        <Flex justify="between" align="center" mb="3">
                          <Text weight="medium">Variant {index + 1}</Text>
                          <Button
                            type="button"
                            variant="ghost"
                            color="red"
                            onClick={() => removeVariant(index)}
                          >
                            <TrashIcon width="18" height="18" />
                          </Button>
                        </Flex>
                        <Grid columns={{ initial: "2", md: "4" }} gap="4">
                          <Box>
                            <Text as="label" size="1" weight="medium">Size</Text>
                            <TextField.Root
                              type="text"
                              value={variant.size}
                              onChange={(e) => updateVariant(index, "size", e.target.value)}
                              placeholder="S, M, L, XL"
                              size="2"
                              mt="1"
                            />
                          </Box>
                          <Box>
                            <Text as="label" size="1" weight="medium">Color</Text>
                            <TextField.Root
                              type="text"
                              value={variant.color}
                              onChange={(e) => updateVariant(index, "color", e.target.value)}
                              placeholder="Black, White"
                              size="2"
                              mt="1"
                            />
                          </Box>
                          <Box>
                            <Text as="label" size="1" weight="medium">Price (₹)</Text>
                            <TextField.Root
                              type="number"
                              value={variant.price}
                              onChange={(e) => updateVariant(index, "price", e.target.value)}
                              min="0"
                              size="2"
                              mt="1"
                            />
                          </Box>
                          <Box>
                            <Text as="label" size="1" weight="medium">Stock</Text>
                            <TextField.Root
                              type="number"
                              value={variant.stock}
                              onChange={(e) => updateVariant(index, "stock", e.target.value)}
                              min="0"
                              size="2"
                              mt="1"
                            />
                          </Box>
                        </Grid>
                      </Card>
                    ))}

                    <Button type="button" variant="outline" onClick={addVariant}>
                      <PlusIcon width="18" height="18" />
                      Add Variant
                    </Button>
                  </Flex>
                </>
              ) : (
                <>
                  <Flex align="center" gap="2">
                    <FileTextIcon width="24" height="24" color="var(--blue-9)" />
                    <Heading size="5">Registration Form Builder</Heading>
                  </Flex>
                  <Text color="gray" size="2">
                    Add custom fields to collect additional information from participants
                  </Text>

                  <Flex direction="column" gap="4">
                    {eventData.customForm.map((field, index) => (
                      <Card key={index} variant="surface">
                        <Flex justify="between" align="center" mb="3">
                          <Text weight="medium">Field {index + 1}</Text>
                          <Flex gap="1">
                            <Button
                              type="button"
                              variant="ghost"
                              size="1"
                              onClick={() => moveFormFieldUp(index)}
                              disabled={index === 0}
                              title="Move up"
                            >
                              <ArrowUpIcon width="14" height="14" />
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="1"
                              onClick={() => moveFormFieldDown(index)}
                              disabled={index === eventData.customForm.length - 1}
                              title="Move down"
                            >
                              <ArrowDownIcon width="14" height="14" />
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              color="red"
                              onClick={() => removeFormField(index)}
                            >
                              <TrashIcon width="18" height="18" />
                            </Button>
                          </Flex>
                        </Flex>
                        <Grid columns={{ initial: "1", md: "3" }} gap="4">
                          <Box>
                            <Text as="label" size="1" weight="medium">Label</Text>
                            <TextField.Root
                              type="text"
                              value={field.label}
                              onChange={(e) => updateFormField(index, "label", e.target.value)}
                              placeholder="Field label"
                              size="2"
                              mt="1"
                            />
                          </Box>
                          <Box>
                            <Text as="label" size="1" weight="medium">Type</Text>
                            <Select.Root
                              value={field.fieldType}
                              onValueChange={(value) => updateFormField(index, "fieldType", value)}
                            >
                              <Select.Trigger style={{ width: "100%", marginTop: 4 }} />
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
                            <Text as="label" size="2">
                              <Flex gap="2" align="center">
                                <Checkbox
                                  checked={field.required}
                                  onCheckedChange={(checked) => updateFormField(index, "required", checked)}
                                />
                                Required
                              </Flex>
                            </Text>
                          </Flex>
                        </Grid>
                        {(field.fieldType === "dropdown" || field.fieldType === "select" || field.fieldType === "radio") && (
                          <Box mt="4">
                            <Text as="label" size="1" weight="medium">Options (comma-separated)</Text>
                            <TextField.Root
                              type="text"
                              value={field.options?.join(", ")}
                              onChange={(e) =>
                                updateFormField(
                                  index,
                                  "options",
                                  e.target.value.split(",").map((o) => o.trim())
                                )
                              }
                              placeholder="Option 1, Option 2, Option 3"
                              size="2"
                              mt="1"
                            />
                          </Box>
                        )}
                      </Card>
                    ))}

                    <Button type="button" variant="outline" onClick={addFormField}>
                      <PlusIcon width="18" height="18" />
                      Add Field
                    </Button>
                  </Flex>
                </>
              )}
            </Flex>
          </Card>
        )}

        {/* Step 4: Review */}
        {step === 4 && (
          <Card>
            <Flex direction="column" gap="5">
              <Heading size="5">Review & Submit</Heading>

              <Card variant="surface" style={{ backgroundColor: "var(--gray-2)" }}>
                <Text weight="medium" mb="2">Event Details</Text>
                <Grid columns="2" gap="3">
                  <Text size="2"><Text color="gray">Name:</Text> {eventData.name}</Text>
                  <Text size="2"><Text color="gray">Type:</Text> {eventData.eventType}</Text>
                  <Text size="2"><Text color="gray">Eligibility:</Text> {eventData.eligibility}</Text>
                  <Text size="2"><Text color="gray">Fee:</Text> ₹{eventData.registrationFee}</Text>
                  <Text size="2"><Text color="gray">Venue:</Text> {eventData.venue || "Not specified"}</Text>
                  <Text size="2"><Text color="gray">Limit:</Text> {eventData.registrationLimit || "Unlimited"}</Text>
                </Grid>
              </Card>

              <Card variant="surface" style={{ backgroundColor: "var(--gray-2)" }}>
                <Text weight="medium" mb="2">Dates</Text>
                <Grid columns="2" gap="3">
                  <Text size="2"><Text color="gray">Start:</Text> {new Date(eventData.startDate).toLocaleString()}</Text>
                  <Text size="2"><Text color="gray">End:</Text> {eventData.endDate ? new Date(eventData.endDate).toLocaleString() : "Same day"}</Text>
                  <Text size="2"><Text color="gray">Registration Deadline:</Text> {new Date(eventData.registrationDeadline).toLocaleString()}</Text>
                </Grid>
              </Card>

              {eventData.eventType === "merchandise" && eventData.variants.length > 0 && (
                <Card variant="surface" style={{ backgroundColor: "var(--gray-2)" }}>
                  <Text weight="medium" mb="2">Variants ({eventData.variants.length})</Text>
                  <Flex direction="column" gap="2">
                    {eventData.variants.map((v, i) => (
                      <Text size="2" key={i}>
                        Size: {v.size}, Color: {v.color}, Price: ₹{v.price}, Stock: {v.stock}
                      </Text>
                    ))}
                  </Flex>
                </Card>
              )}

              {eventData.customForm.length > 0 && (
                <Card variant="surface" style={{ backgroundColor: "var(--gray-2)" }}>
                  <Text weight="medium" mb="2">Custom Form Fields ({eventData.customForm.length})</Text>
                  <Flex direction="column" gap="1">
                    {eventData.customForm.map((f, i) => (
                      <Text size="2" key={i}>
                        {f.label} ({f.fieldType}) {f.required && <Text color="red">*</Text>}
                      </Text>
                    ))}
                  </Flex>
                </Card>
              )}
            </Flex>
          </Card>
        )}

        {/* Navigation Buttons */}
        <Flex justify="between" mt="6">
          {step > 1 ? (
            <Button variant="outline" onClick={handleBack}>
              <ChevronLeftIcon width="18" height="18" />
              Back
            </Button>
          ) : (
            <Box />
          )}

          {step < 4 ? (
            <Button onClick={handleNext}>
              Next
              <ChevronRightIcon width="18" height="18" />
            </Button>
          ) : (
            <Flex gap="4">
              <Button
                variant="outline"
                onClick={() => handleSubmit(false)}
                disabled={loading}
              >
                {loading ? "Saving..." : "Save as Draft"}
              </Button>
              <Button
                onClick={() => handleSubmit(true)}
                disabled={loading}
              >
                {loading ? "Publishing..." : "Publish Event"}
              </Button>
            </Flex>
          )}
        </Flex>
      </Box>
    </Box>
  );
};

export default CreateEvent;
