import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { eventService } from "../../services";
import { useAuth } from "../../context/AuthContext";
import { toast } from "react-toastify";
import { format } from "date-fns";
import { Box, Card, Flex, Text, Button, Heading, Badge, Spinner, Select, Grid, Separator } from "@radix-ui/themes";
import { CalendarIcon, PersonIcon, BackpackIcon, ClockIcon, InfoCircledIcon, CheckCircledIcon, CrossCircledIcon, UploadIcon } from "@radix-ui/react-icons";
import api from "../../api/axios";

/* ── FormField lives OUTSIDE the component so React never remounts it ── */
const FormField = ({ field, value, onChange, onFileUpload }) => {
  const v = value || "";
  const common = { style: { width: "100%", padding: "8px 12px", borderRadius: 6, border: "1px solid var(--gray-6)", background: "var(--color-background)", color: "var(--gray-12)", fontSize: 14 } };

  switch (field.fieldType) {
    case "textarea":
      return <textarea {...common} rows={3} placeholder={field.placeholder} value={v} onChange={e => onChange(field.fieldName, e.target.value)} />;
    case "dropdown":
      return (
        <select {...common} value={v} onChange={e => onChange(field.fieldName, e.target.value)}>
          <option value="">{field.placeholder || "Select..."}</option>
          {field.options?.map(o => <option key={o} value={o}>{o}</option>)}
        </select>
      );
    case "checkbox":
      return (
        <Flex direction="column" gap="1">
          {field.options?.map(o => (
            <label key={o} style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <input type="checkbox" checked={Array.isArray(v) ? v.includes(o) : false}
                onChange={e => {
                  const cur = Array.isArray(v) ? [...v] : [];
                  onChange(field.fieldName, e.target.checked ? [...cur, o] : cur.filter(x => x !== o));
                }} />
              <Text size="2">{o}</Text>
            </label>
          ))}
        </Flex>
      );
    case "radio":
      return (
        <Flex direction="column" gap="1">
          {field.options?.map(o => (
            <label key={o} style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <input type="radio" name={field.fieldName} value={o} checked={v === o} onChange={() => onChange(field.fieldName, o)} />
              <Text size="2">{o}</Text>
            </label>
          ))}
        </Flex>
      );
    case "file":
      return <input type="file" onChange={e => onFileUpload(field.fieldName, e.target.files[0])} />;
    default:
      return <input {...common} type={field.fieldType || "text"} placeholder={field.placeholder} value={v} onChange={e => onChange(field.fieldName, e.target.value)} />;
  }
};

const statusColors = { confirmed: "green", pending: "orange", cancelled: "red", rejected: "red" };
const paymentColors = { approved: "green", pending: "orange", rejected: "red", "not-required": "gray" };

const EventDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [selectedVariant, setSelectedVariant] = useState("");
  const [formResponses, setFormResponses] = useState({});
  const [paymentProofUrl, setPaymentProofUrl] = useState("");
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const data = await eventService.getById(id);
        setEvent(data?.event || data);
      } catch {
        toast.error("Event not found");
        navigate("/events");
      } finally {
        setLoading(false);
      }
    })();
  }, [id, navigate]);

  const handleFieldChange = useCallback((name, value) => {
    setFormResponses(prev => ({ ...prev, [name]: value }));
  }, []);

  const handleFileUpload = useCallback(async (fieldName, file) => {
    if (!file) return;
    const fd = new FormData();
    fd.append("file", file);
    fd.append("upload_preset", "felicity_unsigned");
    try {
      const r = await fetch(`https://api.cloudinary.com/v1_1/${import.meta.env.VITE_CLOUDINARY_CLOUD_NAME || "felicity"}/auto/upload`, { method: "POST", body: fd });
      const d = await r.json();
      if (d.secure_url) {
        setFormResponses(prev => ({ ...prev, [fieldName]: d.secure_url }));
        toast.success("File uploaded!");
      }
    } catch {
      toast.error("File upload failed");
    }
  }, []);

  const uploadPaymentProof = async (file) => {
    if (!file) return;
    setUploading(true);
    const reader = new FileReader();
    reader.onloadend = () => {
      setPaymentProofUrl(reader.result);
      toast.success("Payment proof converted to base64!");
      setUploading(false);
    };
    reader.onerror = () => {
      toast.error("Payment proof conversion failed");
      setUploading(false);
    };
    reader.readAsDataURL(file);
  };

  const handleRegister = async () => {
    if (!user) return navigate("/login");
    setSubmitting(true);
    try {
      await eventService.register(id, formResponses);
      toast.success("Registration successful! Check your email for the ticket.");
      const data = await eventService.getById(id);
      setEvent(data?.event || data);
    } catch (e) {
      toast.error(e.response?.data?.message || "Registration failed");
    } finally {
      setSubmitting(false);
    }
  };

  const handlePurchase = async () => {
    if (!user) return navigate("/login");
    if (!selectedVariant) return toast.error("Please select a variant");
    if (!paymentProofUrl) return toast.error("Please upload payment proof");
    setSubmitting(true);
    try {
      await eventService.purchase(id, selectedVariant, 1, paymentProofUrl);
      toast.success("Order submitted! Awaiting organizer approval.");
      const data = await eventService.getById(id);
      setEvent(data?.event || data);
    } catch (e) {
      toast.error(e.response?.data?.message || "Purchase failed");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <Flex align="center" justify="center" style={{ minHeight: "50vh" }}><Spinner size="3" /></Flex>;
  if (!event) return null;

  const isMerch = event.eventType === "merchandise";
  const deadlinePassed = new Date() > new Date(event.registrationDeadline);
  const capacityFull = event.registrationLimit && event.registrationCount >= event.registrationLimit;
  const notOpen = event.status !== "published" && event.status !== "ongoing";
  const ticket = event.userTicket;
  const registered = event.userRegistered;

  const selectedVar = isMerch && selectedVariant ? event.variants?.find(v => v._id === selectedVariant) : null;

  return (
    <Box p="6" style={{ maxWidth: 1000, margin: "0 auto" }}>
      <Grid columns={{ initial: "1", md: "3" }} gap="6">
        {/* ── Main Content ── */}
        <Box style={{ gridColumn: "span 2" }}>
          <Flex align="center" gap="2" mb="2">
            <Badge color="purple" size="2">{event.eventType}</Badge>
            <Badge color={event.status === "published" ? "green" : event.status === "ongoing" ? "blue" : "gray"} size="2">{event.status}</Badge>
          </Flex>
          <Heading size="7" mb="3">{event.name}</Heading>

          {event.organizerId && (
            <Flex align="center" gap="2" mb="4">
              {event.organizerId.logo ? (
                <img src={event.organizerId.logo} alt={event.organizerId.name} style={{ width: 32, height: 32, borderRadius: "50%", objectFit: "cover" }} />
              ) : (
                <Flex align="center" justify="center" style={{ width: 32, height: 32, borderRadius: "50%", backgroundColor: "var(--blue-9)", color: "white", fontSize: 16 }}>{event.organizerId.name?.charAt(0) || "O"}</Flex>
              )}
              <Text size="2" color="gray">
                Organized by <Text weight="medium">{event.organizerId.name || event.organizerId}</Text>
              </Text>
            </Flex>
          )}

          <Card mb="4">
            <Heading size="4" mb="2">{isMerch ? "About this Merchandise" : "About this Event"}</Heading>
            <Text style={{ whiteSpace: "pre-wrap" }}>{event.description}</Text>
          </Card>

          <Card mb="4">
            <Heading size="4" mb="3">Details</Heading>
            <Grid columns="2" gap="3">
              <Flex align="center" gap="2"><CalendarIcon /><Text size="2"><Text weight="medium">Start:</Text> {event.startDate ? format(new Date(event.startDate), "MMM d, yyyy h:mm a") : "TBD"}</Text></Flex>
              <Flex align="center" gap="2"><CalendarIcon /><Text size="2"><Text weight="medium">End:</Text> {event.endDate ? format(new Date(event.endDate), "MMM d, yyyy h:mm a") : "TBD"}</Text></Flex>
              <Flex align="center" gap="2"><ClockIcon /><Text size="2"><Text weight="medium">Deadline:</Text> {event.registrationDeadline ? format(new Date(event.registrationDeadline), "MMM d, yyyy h:mm a") : "TBD"}</Text></Flex>
              {event.venue && <Flex align="center" gap="2"><InfoCircledIcon /><Text size="2"><Text weight="medium">Venue:</Text> {event.venue}</Text></Flex>}
              <Flex align="center" gap="2"><PersonIcon /><Text size="2"><Text weight="medium">{isMerch ? "Orders" : "Registrations"}:</Text> {event.registrationCount}{event.registrationLimit ? ` / ${event.registrationLimit}` : ""}</Text></Flex>
              <Flex align="center" gap="2"><InfoCircledIcon /><Text size="2"><Text weight="medium">Eligibility:</Text> {event.eligibility === "all" ? "Open to All" : event.eligibility}</Text></Flex>
            </Grid>
          </Card>

          {/* Custom form for normal events */}
          {!isMerch && event.customForm?.length > 0 && !registered && (
            <Card mb="4">
              <Heading size="4" mb="3">Registration Form</Heading>
              <Flex direction="column" gap="3">
                {event.customForm.sort((a, b) => a.order - b.order).map(field => (
                  <Box key={field._id || field.fieldName}>
                    <Text size="2" weight="medium" mb="1" style={{ display: "block" }}>{field.label}{field.required && <Text color="red"> *</Text>}</Text>
                    <FormField field={field} value={formResponses[field.fieldName]} onChange={handleFieldChange} onFileUpload={handleFileUpload} />
                  </Box>
                ))}
              </Flex>
            </Card>
          )}
        </Box>

        {/* ── Sidebar ── */}
        <Box>
          <Card>
            {isMerch ? (
              /* ── Merchandise Sidebar ── */
              <>
                <Flex align="center" gap="2" mb="3">
                  <BackpackIcon width="20" height="20" />
                  <Heading size="4">Order Merchandise</Heading>
                </Flex>

                {/* Already ordered – show status */}
                {registered && ticket ? (
                  <Box>
                    <Badge color={statusColors[ticket.status] || "gray"} size="2" mb="3" style={{ display: "block", textAlign: "center" }}>
                      Order {ticket.status === "confirmed" ? "Approved" : ticket.status === "pending" ? "Pending Approval" : ticket.status === "rejected" ? "Rejected" : ticket.status}
                    </Badge>
                    {ticket.variant && <Text size="2" color="gray" mb="1" style={{ display: "block" }}>Variant: {[ticket.variant.size, ticket.variant.color].filter(Boolean).join(" / ")}</Text>}
                    <Text size="2" color="gray" mb="1" style={{ display: "block" }}>Amount: ₹{ticket.amount}</Text>
                    <Text size="2" color="gray" mb="2" style={{ display: "block" }}>Ticket ID: {ticket.ticketId}</Text>
                    {ticket.status === "confirmed" && ticket.qrCode && (
                      <Box mt="2" style={{ textAlign: "center" }}>
                        <img src={ticket.qrCode} alt="QR Code" style={{ maxWidth: 180, borderRadius: 8 }} />
                        <Text size="1" color="gray" mt="1" style={{ display: "block" }}>Show this QR at pickup</Text>
                      </Box>
                    )}
                    {ticket.status === "rejected" && (
                      <Text size="2" color="red" mt="2">Your payment was rejected. You may try again or contact the organizer.</Text>
                    )}
                  </Box>
                ) : (
                  /* ── New order form ── */
                  <>
                    {event.variants?.length > 0 && (
                      <Box mb="3">
                        <Text size="2" weight="medium" mb="1" style={{ display: "block" }}>Select Variant</Text>
                        <Select.Root value={selectedVariant} onValueChange={setSelectedVariant}>
                          <Select.Trigger placeholder="Choose variant..." style={{ width: "100%" }} />
                          <Select.Content>
                            {event.variants.map(v => (
                              <Select.Item key={v._id} value={v._id} disabled={v.stock <= 0}>
                                {[v.size, v.color].filter(Boolean).join(" / ")} — ₹{v.price} {v.stock <= 0 ? "(Out of stock)" : `(${v.stock} left)`}
                              </Select.Item>
                            ))}
                          </Select.Content>
                        </Select.Root>
                      </Box>
                    )}

                    {selectedVar && (
                      <Text size="3" weight="bold" mb="3" style={{ display: "block" }}>
                        Total: ₹{selectedVar.price}
                      </Text>
                    )}

                    <Separator size="4" mb="3" />

                    <Box mb="3">
                      <Text size="2" weight="medium" mb="1" style={{ display: "block" }}>
                        Payment Proof <Text color="red">*</Text>
                      </Text>
                      <Text size="1" color="gray" mb="2" style={{ display: "block" }}>
                        Upload a screenshot of your payment (UPI, bank transfer, etc.)
                      </Text>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={e => uploadPaymentProof(e.target.files[0])}
                        disabled={uploading}
                        style={{ fontSize: 13 }}
                      />
                      {uploading && <Flex align="center" gap="2" mt="1"><Spinner size="1" /><Text size="1" color="gray">Uploading...</Text></Flex>}
                      {paymentProofUrl && (
                        <Box mt="2">
                          <img src={paymentProofUrl} alt="Payment proof" style={{ maxWidth: "100%", maxHeight: 150, borderRadius: 6, border: "1px solid var(--gray-6)" }} />
                          <Text size="1" color="green" mt="1" style={{ display: "block" }}><CheckCircledIcon style={{ display: "inline", verticalAlign: "middle" }} /> Uploaded</Text>
                        </Box>
                      )}
                    </Box>

                    <Button
                      onClick={handlePurchase}
                      disabled={submitting || !selectedVariant || !paymentProofUrl || deadlinePassed || notOpen || uploading}
                      style={{ width: "100%" }}
                      size="3"
                    >
                      {submitting ? <Spinner size="1" /> : null}
                      {deadlinePassed ? "Deadline Passed" : notOpen ? "Not Available" : "Submit Order"}
                    </Button>
                    {!user && <Text size="1" color="gray" mt="2" align="center" style={{ display: "block" }}>Please log in to order</Text>}
                  </>
                )}
              </>
            ) : (
              /* ── Normal Event Sidebar ── */
              <>
                <Heading size="4" mb="3">Registration</Heading>
                {event.registrationFee > 0 && <Text size="5" weight="bold" mb="3" color="green" style={{ display: "block" }}>₹{event.registrationFee}</Text>}
                {event.registrationFee === 0 && <Badge color="green" size="2" mb="3">Free</Badge>}

                {registered ? (
                  <Box>
                    <Badge color="green" size="2" mb="2" style={{ display: "block", textAlign: "center" }}>Registered</Badge>
                    {ticket?.ticketId && <Text size="2" color="gray" style={{ display: "block" }}>Ticket: {ticket.ticketId}</Text>}
                    {ticket?.qrCode && (
                      <Box mt="2" style={{ textAlign: "center" }}>
                        <img src={ticket.qrCode} alt="QR Code" style={{ maxWidth: 180, borderRadius: 8 }} />
                      </Box>
                    )}
                  </Box>
                ) : (
                  <Button
                    onClick={handleRegister}
                    disabled={submitting || deadlinePassed || capacityFull || notOpen}
                    style={{ width: "100%" }}
                    size="3"
                  >
                    {submitting ? <Spinner size="1" /> : null}
                    {deadlinePassed ? "Deadline Passed" : capacityFull ? "Capacity Full" : notOpen ? "Not Available" : "Register Now"}
                  </Button>
                )}
                {!user && <Text size="1" color="gray" mt="2" align="center" style={{ display: "block" }}>Please log in to register</Text>}
              </>
            )}
          </Card>

          {/* Tags */}
          {event.tags?.length > 0 && (
            <Card mt="4">
              <Heading size="3" mb="2">Tags</Heading>
              <Flex wrap="wrap" gap="2">
                {event.tags.map(t => <Badge key={t} variant="soft">{t}</Badge>)}
              </Flex>
            </Card>
          )}
        </Box>
      </Grid>
    </Box>
  );
};

export default EventDetails;
