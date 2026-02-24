import { useState, useEffect } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { organizerService } from "../../services";
import { toast } from "react-toastify";
import { Box, Card, Flex, Text, Heading, Button, Badge, TextField, TextArea, Select, Grid, Checkbox, Spinner, Tabs, Callout } from "@radix-ui/themes";
import { ArrowLeftIcon, PlusIcon, TrashIcon, CalendarIcon, ChevronRightIcon, ChevronLeftIcon, FileTextIcon, CubeIcon, ArrowUpIcon, ArrowDownIcon, CheckIcon, InfoCircledIcon, ExclamationTriangleIcon } from "@radix-ui/react-icons";

const AREAS = [
  "Competitive Programming", "Web Development", "Mobile App Development",
  "Machine Learning & AI", "Data Science", "Cybersecurity", "Cloud Computing",
  "Robotics", "IoT", "Game Development",
  "UI/UX Design", "Open Source", "Music", "Dance",
  "Drama & Theatre", "Art & Design", "Photography", "Literature",
  "Debating & Quiz", "Sports & Fitness", "Entrepreneurship",
  "Finance & Trading", "Social Events", "Environment", "Merchandise"
];
const FIELD_TYPES = [
  { value: "text", label: "Text" }, { value: "number", label: "Number" },
  { value: "email", label: "Email" }, { value: "textarea", label: "Long Text" },
  { value: "dropdown", label: "Dropdown" }, { value: "checkbox", label: "Checkbox" },
  { value: "radio", label: "Radio Buttons" }, { value: "file", label: "File Upload" },
  { value: "date", label: "Date" },
];

const INIT_DATA = {
  name: "", description: "", eventType: "normal", startDate: "", endDate: "",
  registrationDeadline: "", venue: "", registrationFee: 0, registrationLimit: "",
  eligibility: "all", areasOfInterest: [], customForm: [], variants: [],
  purchaseLimitPerUser: 1, minTeamSize: "", maxTeamSize: "",
};

const splitDT = (v) => {
  if (!v) return { date: "", time: "" };
  const [d, t] = v.split("T");
  return { date: d || "", time: (t || "").slice(0, 5) };
};

// FIX: Merchandise component with improved labels
const MerchandiseFields = ({ ed, onChange, addVariant, updVariant, rmVariant, canEditField }) => (
  <>
    <Flex align="center" gap="2" mb="2"><CubeIcon width="20" height="20" /><Heading size="4">Merchandise Variants</Heading></Flex>
    <Box mb="3">
      <Text as="label" size="2" weight="medium">Purchase Limit Per User *</Text>
      <TextField.Root type="number" name="purchaseLimitPerUser" value={ed.purchaseLimitPerUser} onChange={onChange} min="1" size="3" mt="1" style={{ width: 128 }} disabled={!canEditField("variants")} />
    </Box>
    {ed.variants.map((v, i) => (
      <Card key={i} variant="surface" mb="2">
        <Flex justify="between" align="center" mb="2">
          <Text weight="medium" size="2">Variant {i + 1}</Text>
          <Button type="button" variant="ghost" color="red" size="1" onClick={() => canEditField("variants") && rmVariant(i)} title="Delete variant" disabled={!canEditField("variants")}><TrashIcon /></Button>
        </Flex>
        <Grid columns={{ initial: "2", md: "4" }} gap="3">
          {[['Size', 'size', 'S, M, L'], ['Color', 'color', 'Black'], ['Price (₹)', 'price', '0'], ['Stock', 'stock', '0']].map(([l, f, ph]) => (
            <Box key={f}>
              <Text as="label" size="1" weight="medium">{l} *</Text>
              <TextField.Root type={f === 'price' || f === 'stock' ? 'number' : 'text'} value={v[f] ?? ""} onChange={(e) => canEditField("variants") && updVariant(i, f, e.target.value)} placeholder={ph} size="2" mt="1" min={f === 'price' || f === 'stock' ? "0" : undefined} disabled={!canEditField("variants")} />
            </Box>
          ))}
        </Grid>
      </Card>
    ))}
    <Button type="button" variant="outline" onClick={addVariant} mb="4" disabled={!canEditField("variants")}><PlusIcon /> Add Variant</Button>
  </>
);

const EventForm = ({ mode = "create" }) => {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const isEdit = mode === "edit";
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(isEdit);

  // status flags (values undefined until event fetched)
  const [event, setEvent] = useState(null);

  const isDraft = event?.status === "draft";
  const isPublished = event?.status === "published";
  const isLocked = isEdit && !isDraft && !isPublished; // ongoing/completed/closed

  const canEditField = (field) => {
    if (!isEdit) return true; // create mode
    if (isDraft) return true;
    if (isPublished) {
      // only description, registrationDeadline, registrationLimit are modifiable after publish
      return ["description", "registrationDeadline", "registrationLimit"].includes(field);
    }
    return false;
  };
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState(searchParams?.get("tab") || "details");
  const [ed, setEd] = useState({ ...INIT_DATA });

  useEffect(() => { if (isEdit && id) fetchEvent(); }, [id, isEdit]);

  const fetchEvent = async () => {
    try {
      const res = await organizerService.getEventDetails(id);
      const e = res?.event || res;
      setEvent(e);
      const fmt = (d) => d ? new Date(d).toISOString().slice(0, 16) : "";
      // use tags from backend (schema field) as areasOfInterest for UI
      const interests = e.tags || e.areasOfInterest || [];
      setEd({
        name: e.name || "", description: e.description || "", eventType: e.eventType || "normal",
        startDate: fmt(e.startDate), endDate: fmt(e.endDate), registrationDeadline: fmt(e.registrationDeadline),
        venue: e.venue || "", registrationFee: e.registrationFee || 0,
        registrationLimit: e.registrationLimit || "", eligibility: e.eligibility || "all",
        areasOfInterest: interests, customForm: e.customForm || [],
        variants: e.variants || [], purchaseLimitPerUser: e.purchaseLimitPerUser || 1,
        minTeamSize: e.minTeamSize || "", maxTeamSize: e.maxTeamSize || "",
      });
    } catch { toast.error("Failed to fetch event"); navigate("/organizer/dashboard"); }
    finally { setLoading(false); }
  };

  // FIX #1: Improved date handling - prevents invalid ISO format
  const updDate = (key, dp) => setEd((p) => {
    const { time } = splitDT(p[key]);
    if (!dp && !time) return { ...p, [key]: "" };
    if (!dp) return { ...p, [key]: "" }; // Don't save time-only (invalid ISO)
    return { ...p, [key]: `${dp}T${time || "00:00"}` };
  });

  const updTime = (key, tp) => setEd((p) => {
    const { date } = splitDT(p[key]);
    if (!date && !tp) return { ...p, [key]: "" };
    if (!date) return { ...p, [key]: "" }; // Don't save time-only (invalid ISO)
    return { ...p, [key]: `${date}T${tp || "00:00"}` };
  });

  // FIX #2: Better number handling - safer type coercion
  const onChange = (e) => {
    const { name, value, type } = e.target;
    setEd((p) => ({ ...p, [name]: type === "number" ? (value === "" ? "" : Number(value)) : value }));
  };

  const toggleInterest = (i) => setEd((p) => ({
    ...p, areasOfInterest: p.areasOfInterest.includes(i) ? p.areasOfInterest.filter((x) => x !== i) : [...p.areasOfInterest, i],
  }));

  const addField = () => setEd((p) => ({ ...p, customForm: [...p.customForm, { fieldName: `field_${Date.now()}`, label: "", fieldType: "text", required: false, options: [] }] }));
  const updField = (i, f, v) => setEd((p) => ({ ...p, customForm: p.customForm.map((x, j) => j === i ? { ...x, [f]: v } : x) }));
  const rmField = (i) => setEd((p) => ({ ...p, customForm: p.customForm.filter((_, j) => j !== i) }));
  const moveField = (i, dir) => setEd((p) => {
    const t = i + dir;
    if (t < 0 || t >= p.customForm.length) return p;
    const f = [...p.customForm]; [f[i], f[t]] = [f[t], f[i]];
    return { ...p, customForm: f.map((x, j) => ({ ...x, order: j })) };
  });

  const addVariant = () => setEd((p) => ({ ...p, variants: [...p.variants, { size: "", color: "", price: 0, stock: 0 }] }));
  
  // FIX #6: Type conversion in variant update
  const updVariant = (i, f, v) => setEd((p) => ({
    ...p, variants: p.variants.map((x, j) => j === i ? { ...x, [f]: (f === 'price' || f === 'stock') ? (v === "" ? 0 : Number(v)) : v } : x)
  }));
  
  const rmVariant = (i) => setEd((p) => ({ ...p, variants: p.variants.filter((_, j) => j !== i) }));

  // FIX #3: Improved validation with correct tab checks
  const validate = () => {
    if ((!isEdit && step === 1) || (isEdit && activeTab === "details")) {
      if (!ed.name || !ed.description) { toast.warning("Event name and description are required"); return false; }
    }
    if ((!isEdit && step === 2) || (isEdit && activeTab === "dates")) {
      if (ed.eventType === "merchandise") {
        if (!ed.registrationDeadline) { toast.warning("Please set a registration deadline"); return false; }
      } else {
        if (!ed.startDate || !ed.registrationDeadline) { toast.warning("Please fill in start date and registration deadline"); return false; }
        const s = new Date(ed.startDate), r = new Date(ed.registrationDeadline);
        if (isNaN(s.getTime()) || isNaN(r.getTime())) { toast.warning("Invalid date format"); return false; }
        if (r > s) { toast.warning("Registration deadline must be before event start"); return false; }
      }
    }
    // FIX #4: Check for complete variant data
    if (ed.eventType === "merchandise") {
      if (ed.variants.length === 0 && ((!isEdit && step === 3) || isEdit)) { toast.warning("Add at least one merchandise variant"); return false; }
      const incompleteVariants = ed.variants.filter((v) => !v.size || !v.color || v.price === "" || v.stock === "");
      if (incompleteVariants.length > 0) { toast.warning("All variants must have size, color, price, and stock"); return false; }
    }
    return true;
  };

  const handleSubmit = async (publish = false) => {
    if (!validate()) return;
    setSaving(true);
    try {
      const payload = {
        ...ed,
        // only send tags to backend; areasOfInterest is UI-only
        tags: [...ed.areasOfInterest],
        registrationFee: ed.registrationFee === "" ? 0 : Number(ed.registrationFee),
        registrationLimit: ed.registrationLimit === "" ? undefined : Number(ed.registrationLimit),
        purchaseLimitPerUser: ed.purchaseLimitPerUser === "" ? 1 : Number(ed.purchaseLimitPerUser),
        minTeamSize: ed.minTeamSize === "" ? undefined : Number(ed.minTeamSize),
        maxTeamSize: ed.maxTeamSize === "" ? undefined : Number(ed.maxTeamSize),
        variants: ed.variants.map(v => ({
          ...v,
          price: v.price === "" ? 0 : Number(v.price),
          stock: v.stock === "" ? 0 : Number(v.stock),
        })),
      };
      if (!payload.tags || !Array.isArray(payload.tags)) payload.tags = [];
      if (isEdit) {
        await organizerService.updateEvent(id, payload);
        toast.success("Event updated successfully!");
        navigate(`/organizer/events/${id}`);
      } else {
        const res = await organizerService.createEvent(payload);
        if (publish && res?.event?._id) {
          await organizerService.publishEvent(res.event._id);
          toast.success("Event created and published!");
        } else toast.success("Event saved as draft");
        navigate("/organizer/dashboard");
      }
    } catch (err) { toast.error(err.response?.data?.message || `Failed to ${isEdit ? "update" : "create"} event`); }
    finally { setSaving(false); }
  };

  const handlePublishToggle = async () => {
    if (!event) return;
    setSaving(true);
    try {
      if (event.status === "published") {
        await organizerService.unpublishEvent(id);
        setEvent((p) => ({ ...p, status: "draft" }));
        toast.success("Event unpublished");
      } else {
        await organizerService.publishEvent(id);
        setEvent((p) => ({ ...p, status: "published" }));
        toast.success("Event published!");
      }
    } catch (err) { toast.error(err.response?.data?.message || "Failed to update status"); }
    finally { setSaving(false); }
  };

  const basicInfoFields = (
    <Flex direction="column" gap="4">
      <Box>
        <Text as="label" size="2" weight="medium">Event Type *</Text>
        <Grid columns="2" gap="3" mt="2">
          {[["normal", "Normal Event", "Workshop, Competition", CalendarIcon, "blue"], ["merchandise", "Merchandise", "T-shirts, Goodies", CubeIcon, "purple"]].map(([val, title, sub, Icon, color]) => (
            <Box key={val} role="button" tabIndex={0} onClick={() => canEditField("eventType") && setEd((p) => ({ ...p, eventType: val }))} onKeyDown={(e) => { if ((e.key === "Enter" || e.key === " ") && canEditField("eventType")) setEd((p) => ({ ...p, eventType: val })); }} style={{ padding: 12, borderRadius: 8, border: `2px solid ${ed.eventType === val ? `var(--${color}-9)` : "var(--gray-5)"}`, backgroundColor: ed.eventType === val ? `var(--${color}-2)` : "transparent", cursor: canEditField("eventType") ? "pointer" : "not-allowed", textAlign: "center", transition: "all 200ms ease", opacity: canEditField("eventType") ? 1 : 0.5 }}>
              <Icon width="28" height="28" color={`var(--${color}-9)`} style={{ margin: "0 auto 6px" }} />
              <Text weight="medium" size="2">{title}</Text>
              <Text size="1" color="gray">{sub}</Text>
            </Box>
          ))}
        </Grid>
        {ed.eventType === "merchandise" && <Box mt="4"><MerchandiseFields ed={ed} onChange={onChange} addVariant={addVariant} updVariant={updVariant} rmVariant={rmVariant} canEditField={canEditField} /></Box>}
      </Box>
      <Box>
        <Text as="label" size="2" weight="medium">Event Name *</Text>
        <TextField.Root name="name" value={ed.name} onChange={onChange} placeholder="Enter event name" size="3" mt="1" disabled={!canEditField("name")} />
      </Box>
      <Box>
        <Text as="label" size="2" weight="medium">Description *</Text>
        <TextArea name="description" value={ed.description} onChange={onChange} placeholder="Describe your event..." rows={4} size="3" style={{ marginTop: 4 }} disabled={!canEditField("description")} />
      </Box>
      <Box>
        <Text as="label" size="2" weight="medium">Eligibility *</Text>
        <Select.Root value={ed.eligibility} onValueChange={(v) => canEditField("eligibility") && setEd((p) => ({ ...p, eligibility: v }))}>
          <Select.Trigger style={{ width: "100%", marginTop: 4 }} disabled={!canEditField("eligibility")} />
          <Select.Content>
            <Select.Item value="all">Open to All</Select.Item>
            <Select.Item value="iiit-only">IIIT Students Only</Select.Item>
            <Select.Item value="non-iiit-only">Non-IIIT Only</Select.Item>
          </Select.Content>
        </Select.Root>
      </Box>
      <Box>
        <Text as="label" size="2" weight="medium">Areas of Interest</Text>
        <Flex wrap="wrap" gap="2" mt="2">
          {AREAS.map((a) => (
            <Button key={a} type="button" onClick={() => canEditField("areasOfInterest") && toggleInterest(a)} variant={ed.areasOfInterest.includes(a) ? "solid" : "soft"} color={ed.areasOfInterest.includes(a) ? "blue" : "gray"} size="1" radius="full" disabled={!canEditField("areasOfInterest")} style={{ opacity: canEditField("areasOfInterest") ? 1 : 0.5 }}>{a}</Button>
          ))}
        </Flex>
      </Box>
    </Flex>
  );

  const dateFields = (
    <Flex direction="column" gap="4">
      {ed.eventType !== "merchandise" && (
        <Grid columns={{ initial: "1", md: "2" }} gap="4">
          {[["Start Date & Time *", "startDate"], ["End Date & Time", "endDate"]].map(([label, key]) => (
            <Box key={key}>
              <Text as="label" size="2" weight="medium">{label}</Text>
              <Flex gap="3" mt="1">
                <TextField.Root type="date" value={splitDT(ed[key]).date} onChange={(e) => updDate(key, e.target.value)} size="3" />
                <TextField.Root type="time" value={splitDT(ed[key]).time} onChange={(e) => updTime(key, e.target.value)} size="3" />
              </Flex>
            </Box>
          ))}
        </Grid>
      )}
      <Box>
        <Text as="label" size="2" weight="medium">Registration Deadline *</Text>
        <Flex gap="3" mt="1">
          <TextField.Root type="date" value={splitDT(ed.registrationDeadline).date} onChange={(e) => canEditField("registrationDeadline") && updDate("registrationDeadline", e.target.value)} size="3" disabled={!canEditField("registrationDeadline")} />
          <TextField.Root type="time" value={splitDT(ed.registrationDeadline).time} onChange={(e) => canEditField("registrationDeadline") && updTime("registrationDeadline", e.target.value)} size="3" disabled={!canEditField("registrationDeadline")} />
        </Flex>
      </Box>
      {ed.eventType !== "merchandise" && (
        <>
          <Box>
            <Text as="label" size="2" weight="medium">📍 Venue</Text>
            <TextField.Root type="text" name="venue" value={ed.venue} onChange={onChange} placeholder="Enter venue" size="3" mt="1" disabled={!canEditField("venue")} />
          </Box>
          <Grid columns={{ initial: "1", md: "2" }} gap="4">
            <Box>
              <Text as="label" size="2" weight="medium">₹ Registration Fee</Text>
              <TextField.Root type="number" name="registrationFee" value={ed.registrationFee} onChange={onChange} min="0" placeholder="0 for free" size="3" mt="1" disabled={!canEditField("registrationFee")} />
            </Box>
            <Box>
              <Text as="label" size="2" weight="medium">👥 Registration Limit</Text>
              <TextField.Root type="number" name="registrationLimit" value={ed.registrationLimit} onChange={onChange} min="0" placeholder="Unlimited" size="3" mt="1" disabled={!canEditField("registrationLimit")} />
            </Box>
          </Grid>
        </>
      )}
      {isEdit && (
        <Grid columns={{ initial: "1", md: "2" }} gap="4">
          <Box>
            <Text as="label" size="2" weight="medium">Min Team Size</Text>
            <TextField.Root type="number" name="minTeamSize" value={ed.minTeamSize} onChange={onChange} min="1" placeholder="Min members" size="3" mt="1" disabled={!canEditField("minTeamSize")} />
          </Box>
          <Box>
            <Text as="label" size="2" weight="medium">Max Team Size</Text>
            <TextField.Root type="number" name="maxTeamSize" value={ed.maxTeamSize} onChange={onChange} min="1" placeholder="Max members" size="3" mt="1" disabled={!canEditField("maxTeamSize")} />
          </Box>
        </Grid>
      )}
    </Flex>
  );

  const formBuilderFields = (
    <Flex direction="column" gap="4">
      {ed.eventType === "merchandise" ? (
        <>
          <Text color="gray" size="2" mb="2">Add all available variants (size, color, price, stock) for this merchandise item. Stock will decrement only on payment approval. Set a purchase limit per participant if needed.</Text>
          <MerchandiseFields ed={ed} onChange={onChange} addVariant={addVariant} updVariant={updVariant} rmVariant={rmVariant} canEditField={canEditField} />
        </>
      ) : (
        <>
          <Flex align="center" gap="2"><FileTextIcon width="20" height="20" /><Heading size="4">Registration Form Builder</Heading></Flex>
          <Text color="gray" size="2">Add custom fields for participant registration</Text>
          {ed.customForm.map((f, i) => (
            <Card key={i} variant="surface">
              <Flex justify="between" align="center" mb="2">
                <Text weight="medium" size="2">Field {i + 1}</Text>
                <Flex gap="1">
                  <Button type="button" variant="ghost" size="1" onClick={() => canEditField("customForm") && moveField(i, -1)} disabled={i === 0 || !canEditField("customForm")} title="Move up"><ArrowUpIcon width="14" height="14" /></Button>
                  <Button type="button" variant="ghost" size="1" onClick={() => canEditField("customForm") && moveField(i, 1)} disabled={i === ed.customForm.length - 1 || !canEditField("customForm")} title="Move down"><ArrowDownIcon width="14" height="14" /></Button>
                  <Button type="button" variant="ghost" color="red" size="1" onClick={() => canEditField("customForm") && rmField(i)} disabled={!canEditField("customForm")} title="Delete field"><TrashIcon /></Button>
                </Flex>
              </Flex>
              <Grid columns={{ initial: "1", md: "3" }} gap="3">
                <Box>
                  <Text as="label" size="1" weight="medium">Label</Text>
                  <TextField.Root value={f.label} onChange={(e) => updField(i, "label", e.target.value)} placeholder="Field label" size="2" mt="1" />
                </Box>
                <Box>
                  <Text as="label" size="1" weight="medium">Type</Text>
                  <Select.Root value={f.fieldType} onValueChange={(v) => updField(i, "fieldType", v)}>
                    <Select.Trigger style={{ width: "100%", marginTop: 4 }} />
                    <Select.Content>{FIELD_TYPES.map((t) => <Select.Item key={t.value} value={t.value}>{t.label}</Select.Item>)}</Select.Content>
                  </Select.Root>
                </Box>
                <Flex align="end">
                  <Text as="label" size="2"><Flex gap="2" align="center"><Checkbox checked={f.required} onCheckedChange={(c) => updField(i, "required", c)} />Required</Flex></Text>
                </Flex>
              </Grid>
              {["dropdown", "radio"].includes(f.fieldType) && (
                <Box mt="3">
                  <Text as="label" size="1" weight="medium">Options (comma-separated) *</Text>
                  <TextField.Root value={f.options?.join(", ") || ""} onChange={(e) => updField(i, "options", e.target.value.split(",").map((o) => o.trim()).filter((o) => o))} placeholder="Option 1, Option 2" size="2" mt="1" />
                </Box>
              )}
            </Card>
          ))}
          <Button type="button" variant="outline" onClick={addField} disabled={!canEditField("customForm")}><PlusIcon /> Add Field</Button>
        </>
      )}
    </Flex>
  );

  // FIX #9: Fixed review section syntax error
  const reviewSection = (
    <Flex direction="column" gap="4">
      <Heading size="4">Review & Submit</Heading>
      <Card variant="surface" style={{ backgroundColor: "var(--gray-2)" }}>
        <Text weight="medium" mb="2">Event Details</Text>
        <Grid columns="2" gap="2">
          <Text size="2"><Text color="gray">Name:</Text> {ed.name}</Text>
          <Text size="2"><Text color="gray">Type:</Text> {ed.eventType}</Text>
          <Text size="2"><Text color="gray">Eligibility:</Text> {ed.eligibility}</Text>
          {ed.eventType !== "merchandise" && (
            <>
              <Text size="2"><Text color="gray">Fee:</Text> ₹{ed.registrationFee}</Text>
              <Text size="2"><Text color="gray">Venue:</Text> {ed.venue || "N/A"}</Text>
              <Text size="2"><Text color="gray">Limit:</Text> {ed.registrationLimit || "Unlimited"}</Text>
            </>
          )}
        </Grid>
      </Card>
      <Card variant="surface" style={{ backgroundColor: "var(--gray-2)" }}>
        <Text weight="medium" mb="2">Dates</Text>
        <Grid columns="2" gap="2">
          {ed.eventType !== "merchandise" && ed.startDate && (
            <>
              <Text size="2"><Text color="gray">Start:</Text> {new Date(ed.startDate).toLocaleString()}</Text>
              {ed.endDate && <Text size="2"><Text color="gray">End:</Text> {new Date(ed.endDate).toLocaleString()}</Text>}
            </>
          )}
          {ed.registrationDeadline && <Text size="2"><Text color="gray">Deadline:</Text> {new Date(ed.registrationDeadline).toLocaleString()}</Text>}
        </Grid>
      </Card>
      {ed.eventType === "merchandise" && ed.variants.length > 0 && (
        <Card variant="surface" style={{ backgroundColor: "var(--gray-2)" }}>
          <Text weight="medium" mb="2">Variants ({ed.variants.length})</Text>
          {ed.variants.map((v, i) => <Text size="2" key={i}> <br />Size: {v.size}, Color: {v.color}, ₹{v.price}, Stock: {v.stock}</Text>)}
        </Card>
      )}
      {ed.customForm.length > 0 && (
        <Card variant="surface" style={{ backgroundColor: "var(--gray-2)" }}>
          <Text weight="medium" mb="2">Custom Fields ({ed.customForm.length})</Text>
          {ed.customForm.map((f, i) => <Text size="2" key={i}>{f.label} ({f.fieldType}) {f.required && <Text color="red">*</Text>}</Text>)}
        </Card>
      )}
    </Flex>
  );

  if (loading) return <Box p="6"><Flex justify="center" align="center" style={{ minHeight: "50vh" }}><Spinner size="3" /></Flex></Box>;

  // CREATE MODE — step wizard
  if (!isEdit) return (
    <Box p="6">
      <Button variant="ghost" onClick={() => navigate(-1)} mb="4"><ArrowLeftIcon width="18" height="18" /> Back</Button>
      <Heading size="8" weight="bold" mb="2">Create New Event</Heading>
      <Text color="gray" size="3" mb="6">Fill in the details to create your event</Text>
      <Flex align="center" justify="center" mb="6">
        {[1, 2, 3, 4].map((s) => (
          <Flex key={s} align="center">
            <Flex align="center" justify="center" style={{ width: 36, height: 36, borderRadius: "50%", backgroundColor: s <= step ? "var(--blue-9)" : "var(--gray-4)", color: s <= step ? "white" : "var(--gray-9)", fontWeight: 500 }}>{s <= step ? <CheckIcon /> : s}</Flex>
            {s < 4 && <Box style={{ width: 48, height: 3, margin: "0 6px", backgroundColor: s < step ? "var(--blue-9)" : "var(--gray-4)" }} />}
          </Flex>
        ))}
      </Flex>
      <Box style={{ maxWidth: 768, margin: "0 auto" }}>
        <Card>
          {step === 1 && basicInfoFields}
          {step === 2 && dateFields}
          {step === 3 && formBuilderFields}
          {step === 4 && reviewSection}
        </Card>
        <Flex justify="between" mt="6">
          {step > 1 ? <Button variant="outline" onClick={() => setStep((p) => p - 1)}><ChevronLeftIcon /> Back</Button> : <Box />}
          {step < 4 ? (
            <Button onClick={() => { if (validate()) setStep((p) => p + 1); }}>Next <ChevronRightIcon /></Button>
          ) : (
            <Flex gap="3">
              <Button variant="outline" onClick={() => handleSubmit(false)} disabled={saving}>{saving ? "Saving..." : "Save as Draft"}</Button>
              <Button onClick={() => handleSubmit(true)} disabled={saving}>{saving ? "Publishing..." : "Publish Event"}</Button>
            </Flex>
          )}
        </Flex>
      </Box>
    </Box>
  );

  // EDIT MODE — tab layout
  return (
    <Box p="6">
      <Button variant="ghost" onClick={() => navigate(`/organizer/events/${id}`)} mb="4"><ArrowLeftIcon /> Back to Event</Button>
      <Flex justify="between" align="start" mb="6" wrap="wrap" gap="3">
        <Box>
          <Heading size="7" weight="bold">{event?.name || "Edit Event"}</Heading>
          <Flex gap="2" mt="1">
            <Badge color={event?.status === "published" ? "green" : "orange"}>{event?.status}</Badge>
            <Badge variant="outline">{event?.eventType}</Badge>
          </Flex>
        </Box>
        <Flex gap="2">
          <Button variant={event?.status === "published" ? "outline" : "solid"} color={event?.status === "published" ? "orange" : "green"} onClick={handlePublishToggle} disabled={saving}>
            {event?.status === "published" ? "Unpublish" : "Publish"}
          </Button>
        </Flex>
      </Flex>
      {event?.status === "published" && (
        <Callout.Root color="blue" mb="4"><Callout.Icon><InfoCircledIcon /></Callout.Icon><Callout.Text>Changes to published events are applied immediately.</Callout.Text></Callout.Root>
      )}
      {isLocked && (
        <Callout.Root color="red" mb="4"><Callout.Icon><ExclamationTriangleIcon /></Callout.Icon><Callout.Text>This event is {event?.status} and cannot be edited except for status change.</Callout.Text></Callout.Root>
      )}
      <Tabs.Root value={activeTab} onValueChange={setActiveTab}>
        <Tabs.List>
          <Tabs.Trigger value="details">Details</Tabs.Trigger>
          <Tabs.Trigger value="dates">Dates & Location</Tabs.Trigger>
          <Tabs.Trigger value="form">Form / Variants</Tabs.Trigger>
        </Tabs.List>
        <Box pt="4">
          <Tabs.Content value="details"><Card>{basicInfoFields}</Card></Tabs.Content>
          <Tabs.Content value="dates"><Card>{dateFields}</Card></Tabs.Content>
          <Tabs.Content value="form"><Card>{formBuilderFields}</Card></Tabs.Content>
        </Box>
      </Tabs.Root>
      <Flex justify="end" mt="6" gap="3">
        <Button variant="outline" onClick={() => navigate(`/organizer/events/${id}`)}>Cancel</Button>
        <Button onClick={() => handleSubmit()} disabled={saving || isLocked}>{saving ? "Saving..." : "Save Changes"}</Button>
      </Flex>
    </Box>
  );
};

export default EventForm;