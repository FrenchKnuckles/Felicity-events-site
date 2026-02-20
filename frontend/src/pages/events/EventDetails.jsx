import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { eventService } from "../../services";
import API from "../../api/axios";
import { toast } from "react-toastify";
import { format } from "date-fns";
import { Box, Card, Flex, Text, Button, Heading, Badge, Grid, TextField, TextArea, Select, Callout, Spinner, Dialog, Checkbox } from "@radix-ui/themes";
import { CalendarIcon, PersonIcon, ClockIcon, CheckCircledIcon, ExclamationTriangleIcon, ArrowLeftIcon, BackpackIcon, InfoCircledIcon } from "@radix-ui/react-icons";

const EventDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [registering, setRegistering] = useState(false);
  const [formResp, setFormResp] = useState({});
  const [regModal, setRegModal] = useState(false);
  const [selVariant, setSelVariant] = useState(null);
  const [qty, setQty] = useState(1);

  const fetchEvent = async () => { try { const d = await eventService.getEventById(id); setEvent(d?.event || d); } catch { toast.error("Event not found"); navigate("/events"); } finally { setLoading(false); } };
  useEffect(() => { fetchEvent(); }, [id]);

  const canRegister = () => {
    if (!event || event.userRegistered || (event.status !== "published" && event.status !== "ongoing")) return false;
    if (new Date() > new Date(event.registrationDeadline)) return false;
    if (event.registrationLimit && event.registrationCount >= event.registrationLimit) return false;
    if (user) { if (event.eligibility === "iiit-only" && user.participantType !== "iiit") return false; if (event.eligibility === "non-iiit-only" && user.participantType === "iiit") return false; }
    return true;
  };

  const submitReg = async () => {
    setRegistering(true);
    try { await eventService.register(id, formResp); toast.success("Registration successful! Check your email for the ticket."); fetchEvent(); setRegModal(false); }
    catch (e) { toast.error(e.response?.data?.message || "Registration failed"); } finally { setRegistering(false); }
  };

  const handleRegister = () => { if (!user) { toast.info("Please login to register"); navigate("/login"); return; } if (event.customForm?.length > 0) { setRegModal(true); return; } submitReg(); };

  const handlePurchase = async () => {
    if (!user) { toast.info("Please login to purchase"); navigate("/login"); return; }
    if (!selVariant) { toast.warning("Please select a variant"); return; }
    setRegistering(true);
    try { await eventService.purchase(id, selVariant, qty); toast.success("Purchase successful!"); fetchEvent(); }
    catch (e) { toast.error(e.response?.data?.message || "Purchase failed"); } finally { setRegistering(false); }
  };

  const eligBadges = { all: { text: "Open to All", color: "green" }, "iiit-only": { text: "IIIT Only", color: "blue" }, "non-iiit-only": { text: "Non-IIIT Only", color: "orange" } };

  const FormField = ({ field }) => {
    const v = formResp[field.fieldName] || ""; const ch = val => setFormResp(p => ({ ...p, [field.fieldName]: val }));
    const uploadFile = async (e) => {
      const file = e.target.files?.[0]; if (!file) return;
      if (file.size > 10 * 1024 * 1024) { toast.error("File must be under 10MB"); return; }
      const fd = new FormData(); fd.append("file", file);
      try { const r = await API.post("/upload", fd, { headers: { "Content-Type": "multipart/form-data" } });
        if (r.data.url) { ch(r.data.url); toast.success("File uploaded"); } else { toast.error("Upload failed"); }
      } catch { toast.error("Upload failed"); }
    };
    return <Box><Text as="label" size="2" weight="medium" mb="1">{field.label}{field.required && <Text color="red" ml="1">*</Text>}</Text>
      {(field.fieldType === "text" || field.fieldType === "number" || field.fieldType === "email") && <TextField.Root type={field.fieldType} value={v} onChange={e => ch(e.target.value)} required={field.required} />}
      {field.fieldType === "date" && <TextField.Root type="date" value={v} onChange={e => ch(e.target.value)} required={field.required} />}
      {field.fieldType === "textarea" && <TextArea value={v} onChange={e => ch(e.target.value)} rows={3} required={field.required} />}
      {(field.fieldType === "select" || field.fieldType === "dropdown") && <Select.Root value={v} onValueChange={ch}><Select.Trigger placeholder="Select an option" style={{ width: "100%" }} /><Select.Content>{field.options?.map(o => <Select.Item key={o} value={o}>{o}</Select.Item>)}</Select.Content></Select.Root>}
      {field.fieldType === "radio" && <Flex direction="column" gap="2">{field.options?.map(o => <Flex key={o} align="center" gap="2" style={{ cursor: "pointer" }} onClick={() => ch(o)}><Box style={{ width: 16, height: 16, borderRadius: "50%", border: "2px solid var(--gray-8)", backgroundColor: v === o ? "var(--blue-9)" : "transparent" }} /><Text size="2">{o}</Text></Flex>)}</Flex>}
      {field.fieldType === "checkbox" && <Flex align="center" gap="2"><Checkbox id={field.fieldName} checked={v || false} onCheckedChange={ch} /><Text as="label" htmlFor={field.fieldName} color="gray">{field.label}</Text></Flex>}
      {field.fieldType === "file" && <Box><input type="file" onChange={uploadFile} style={{ marginTop: 4 }} />{v && <Text size="1" color="green" mt="1" style={{ display: "block", wordBreak: "break-all" }}>Uploaded: <a href={v} target="_blank" rel="noreferrer">{v.split("/").pop()}</a></Text>}</Box>}
    </Box>;
  };

  if (loading) return <Flex align="center" justify="center" style={{ minHeight: "100vh" }}><Spinner size="3" /></Flex>;
  if (!event) return <Box p="6" style={{ maxWidth: 1200, margin: "0 auto", textAlign: "center" }}><Heading size="6" mb="4">Event not found</Heading><Link to="/events"><Button>Browse Events</Button></Link></Box>;

  const elig = eligBadges[event.eligibility] || eligBadges.all;

  return (
    <Box p="6" style={{ maxWidth: 1200, margin: "0 auto" }}>
      <Button variant="ghost" onClick={() => navigate(-1)} mb="5"><ArrowLeftIcon width={16} height={16} />Back to Events</Button>

      <Grid columns={{ initial: "1", lg: "3" }} gap="6">
        <Box style={{ gridColumn: "span 2" }}><Flex direction="column" gap="5">
          <Card>
            <Flex align="start" justify="between" mb="4"><Box><Flex align="center" gap="2" mb="2">{event.eventType === "merchandise" ? <Badge color="orange"><Flex align="center" gap="1"><BackpackIcon width={14} height={14} /><span>Merchandise</span></Flex></Badge> : <Badge color="blue">Event</Badge>}<Badge color={elig.color}>{elig.text}</Badge></Flex><Heading size="7">{event.name}</Heading></Box></Flex>
            <Link to={`/organizers/${event.organizerId?._id}`} style={{ textDecoration: "none" }}><Text color="blue" weight="medium" mb="5" style={{ display: "inline-block" }}>{event.organizerId?.name}</Text></Link>
            <Grid columns={{ initial: "1", md: "2" }} gap="4" mb="5">
              {[[CalendarIcon, "Date", format(new Date(event.startDate), "EEEE, MMMM d, yyyy") + (event.endDate && event.endDate !== event.startDate ? ` - ${format(new Date(event.endDate), "MMMM d, yyyy")}` : "")],
               [ClockIcon, "Time", format(new Date(event.startDate), "h:mm a")],
               event.venue && [InfoCircledIcon, "Venue", event.venue],
               [PersonIcon, "Registrations", `${event.registrationCount}${event.registrationLimit ? ` / ${event.registrationLimit}` : ""}`]
              ].filter(Boolean).map(([I, t, v]) => <Flex key={t} align="center" gap="3"><I width={20} height={20} color="gray" /><Box><Text weight="medium">{t}: </Text><Text size="2" color="gray">{v}</Text></Box></Flex>)}
            </Grid>
            <Box><Heading size="4" mb="2">About this Event</Heading><Text color="gray" style={{ whiteSpace: "pre-wrap" }}>{event.description}</Text></Box>
          </Card>

          {event.customForm?.length > 0 && !event.userRegistered && <Card><Heading size="4" mb="3">Registration Form</Heading><Text size="2" color="gray" mb="4">Please fill out the following information to complete your registration.</Text><Flex direction="column" gap="4">{event.customForm.map(f => <FormField key={f.fieldName} field={f} />)}</Flex></Card>}

          {event.eventType === "merchandise" && event.variants?.length > 0 && <Card><Heading size="4" mb="4">Select Variant</Heading>
            <Grid columns={{ initial: "1", md: "2" }} gap="4">{event.variants.map(v => <Box key={v._id} onClick={() => v.stock > 0 && setSelVariant(v._id)} style={{ padding: 16, borderRadius: 8, border: selVariant === v._id ? "2px solid var(--blue-9)" : "2px solid var(--gray-a5)", backgroundColor: selVariant === v._id ? "var(--blue-2)" : v.stock > 0 ? "transparent" : "var(--gray-2)", cursor: v.stock > 0 ? "pointer" : "not-allowed", opacity: v.stock > 0 ? 1 : 0.5 }}>
              <Flex justify="between" align="start"><Box><Text weight="medium">Size: {v.size} {v.color && `- ${v.color}`}</Text><Text size="2" color="gray">{v.stock > 0 ? `${v.stock} in stock` : "Out of stock"}</Text></Box><Text weight="bold">₹{v.price}</Text></Flex>
            </Box>)}</Grid>
            {selVariant && <Flex align="center" gap="4" mt="4"><Text color="gray">Quantity:</Text><TextField.Root type="number" min="1" max={event.purchaseLimitPerUser || 5} value={qty} onChange={e => setQty(parseInt(e.target.value))} style={{ width: 96 }} /></Flex>}
          </Card>}
        </Flex></Box>

        <Box><Flex direction="column" gap="5">
          <Card style={{ position: "sticky", top: 96 }}>
            <Flex direction="column" align="center" mb="5"><Heading size="7" mb="2">{event.registrationFee > 0 ? `₹${event.registrationFee}` : "Free"}</Heading>{event.registrationFee > 0 && <Text size="2" color="gray">Registration Fee</Text>}</Flex>
            {event.userRegistered && <Callout.Root color="green" mb="4"><Callout.Icon><CheckCircledIcon /></Callout.Icon><Callout.Text>You are registered for this event!</Callout.Text></Callout.Root>}
            {!canRegister() && !event.userRegistered && <Callout.Root color="yellow" mb="4"><Callout.Icon><ExclamationTriangleIcon /></Callout.Icon><Callout.Text>
              {event.status !== "published" && event.status !== "ongoing" && "Event is not open for registration"}
              {new Date() > new Date(event.registrationDeadline) && "Registration deadline has passed"}
              {event.registrationLimit && event.registrationCount >= event.registrationLimit && "Registration is full"}
              {user && event.eligibility === "iiit-only" && user.participantType !== "iiit" && "This event is only for IIIT participants"}
              {user && event.eligibility === "non-iiit-only" && user.participantType === "iiit" && "This event is only for Non-IIIT participants"}
            </Callout.Text></Callout.Root>}
            {event.eventType === "merchandise"
              ? <Button size="3" style={{ width: "100%" }} onClick={handlePurchase} disabled={registering || !selVariant}>{registering ? <><Spinner size="1" /> Processing...</> : <><BackpackIcon width={16} height={16} /> Purchase</>}</Button>
              : <Button size="3" style={{ width: "100%" }} onClick={event.customForm?.length > 0 ? () => setRegModal(true) : submitReg} disabled={registering || !canRegister()}>{registering ? <><Spinner size="1" /> Registering...</> : event.userRegistered ? <><CheckCircledIcon width={16} height={16} /> Already Registered</> : <><PersonIcon width={16} height={16} /> Register Now</>}</Button>}
            <Flex align="center" justify="center" gap="2" mt="4"><ClockIcon width={14} height={14} color="gray" /><Text size="2" color="gray">Registration closes: {format(new Date(event.registrationDeadline), "MMM d, yyyy h:mm a")}</Text></Flex>
          </Card>
          <Card><Heading size="4" mb="4">Organized by</Heading><Link to={`/organizers/${event.organizerId?._id}`} style={{ textDecoration: "none" }}><Flex align="center" gap="3" p="2" style={{ borderRadius: 8, margin: -8 }}>
            <Flex align="center" justify="center" style={{ width: 48, height: 48, backgroundColor: "var(--blue-3)", borderRadius: "50%" }}><Text color="blue" weight="bold" size="5">{event.organizerId?.name?.charAt(0)}</Text></Flex>
            <Box><Text weight="medium">{event.organizerId?.name}</Text><Text size="2" color="gray">{event.organizerId?.category}</Text></Box>
          </Flex></Link></Card>
        </Flex></Box>
      </Grid>

      <Dialog.Root open={regModal} onOpenChange={setRegModal}><Dialog.Content style={{ maxWidth: 480 }}>
        <Dialog.Title>Complete Registration</Dialog.Title><Dialog.Description size="2" mb="4">Please fill out the form to complete your registration for {event.name}</Dialog.Description>
        <Flex direction="column" gap="4">{event.customForm?.map(f => <FormField key={f.fieldName} field={f} />)}</Flex>
        <Flex gap="4" mt="5"><Dialog.Close><Button variant="soft" style={{ flex: 1 }}>Cancel</Button></Dialog.Close><Button onClick={submitReg} disabled={registering} style={{ flex: 1 }}>{registering ? "Submitting..." : "Submit Registration"}</Button></Flex>
      </Dialog.Content></Dialog.Root>
    </Box>
  );
};

export default EventDetails;
